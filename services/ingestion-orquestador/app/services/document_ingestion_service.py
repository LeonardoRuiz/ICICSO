import base64
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path

import fitz

from app.core.config import Settings, get_settings
from app.engines.evidence_object_extraction_engine import EvidenceObjectExtractionEngine
from app.domain.models import (
    AuditMetadata,
    ClinicalTopicConflictEntry,
    ClinicalTopicRankingEntry,
    ClinicalEntity,
    ContinuumPreparation,
    DocumentIngestionFeed,
    DocumentIngestionRequest,
    DocumentIngestionResponse,
    DocumentVersionHistory,
    DocumentVersionRecord,
    EvidenceLakeRecordArtifact,
    EvidenceLakeRecordPayload,
    EvidenceObjectAuditRecord,
    EvidenceObjectAuditRequest,
    EvidenceObjectArtifact,
    EvidenceObjectCandidate,
    EvidenceObjectPayload,
    GuidelineRecommendation,
    HashMetadata,
    IngestArtifact,
    IngestedDocumentPayload,
    NumericThreshold,
    ProvenanceMetadata,
    RecommendationExecutionModel,
    RecommendationExecutionTrigger,
    SourceDocument,
    SourceEvidenceRecordArtifact,
    SourceEvidenceRecordPayload,
    TriggerConstraint,
    ContinuumMaterializationResult,
    DocumentClassificationUpdate,
    DocumentMetadataUpdate,
    NomenclatureCatalog,
)
from app.persistence.database import get_connection
from app.services.audit_report_service import AuditReportService
from app.services.vrn_policy_service import VrnPolicyService
from app.services.nomenclature_service import NomenclatureService


@dataclass(frozen=True)
class ExtractedRecommendation:
    statement_text: str
    source_excerpt: str
    source_locator: str | None = None
    recommendation_class: str | None = None
    level_of_evidence: str | None = None


DEFAULT_MAX_GUIDELINE_RECOMMENDATIONS = 800


class DocumentIngestionService:
    def __init__(
        self,
        *,
        settings: Settings | None = None,
        database_path: Path | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._database_path = database_path
        self._vrn_policy_service = VrnPolicyService(settings=self._settings)
        self._nomenclature_service = NomenclatureService(settings=self._settings)
        self._audit_report_service = AuditReportService(
            settings=self._settings,
            database_path=self._database_path,
        )

    def ingest_document(
        self, request: DocumentIngestionRequest
    ) -> DocumentIngestionResponse:
        content = base64.b64decode(request.content_base64)
        content_hash = sha256(content).hexdigest()

        duplicate = self._find_by_hash(content_hash)
        if duplicate is not None:
            current_duplicate = self.get_uploaded_document(duplicate.document_id) or duplicate
            self._refresh_duplicate_document(current_duplicate, request)
            duplicate = self.get_uploaded_document(duplicate.document_id) or duplicate
            sync_artifacts = self.write_feed_exports()
            self._audit_report_service.append_event(
                document_id=duplicate.document_id,
                vrn=duplicate.vrn,
                event_type="DUPLICATE_REUSED",
                stage="ING",
                actor="icicso-document-ingestion-console",
                summary="Se reutilizo un documento existente por hash duplicado.",
                payload={
                    "hash_sha256": content_hash,
                    "file_name": request.file_name,
                    "document_type": request.document_type,
                    "document_group": request.document_group,
                    "specialty": request.specialty,
                    "sub_specialty": request.sub_specialty,
                    "epidemic_focus": request.epidemic_focus,
                },
            )
            self._audit_report_service.write_feed_exports()
            return DocumentIngestionResponse(
                document=duplicate,
                duplicate_detected=True,
                sync_artifacts=sync_artifacts,
            )

        now = datetime.now(UTC).isoformat()
        file_name = Path(request.file_name).name
        extension = Path(file_name).suffix.lower() or ".bin"
        document_id = f"UPL-{content_hash[:12].upper()}"
        safe_name = _slugify_filename(file_name)
        lineage_key = self._build_lineage_key(request=request, file_name=file_name)

        storage_dir = self._settings.uploaded_documents_dir / datetime.now(UTC).strftime(
            "%Y/%m/%d"
        )
        storage_dir.mkdir(parents=True, exist_ok=True)
        absolute_path = storage_dir / f"{document_id}_{safe_name}"
        absolute_path.write_bytes(content)

        relative_path = absolute_path.relative_to(self._settings.workspace_root).as_posix()
        document_type = request.document_type or _infer_document_type(extension)
        derived_artifacts = [
            str(self._settings.runtime_feed_path.relative_to(self._settings.workspace_root).as_posix()),
            str(self._settings.dashboard_feed_path.relative_to(self._settings.workspace_root).as_posix()),
            str(self._settings.emulator_feed_path.relative_to(self._settings.workspace_root).as_posix()),
        ]

        with get_connection(self._database_path) as connection:
            lineage_row = connection.execute(
                """
                SELECT *
                FROM document_lineages
                WHERE lineage_key = ?
                LIMIT 1
                """,
                (lineage_key,),
            ).fetchone()
            if lineage_row is None:
                lineage_id = f"LIN-{sha256(lineage_key.encode('utf-8')).hexdigest()[:12].upper()}"
                version_number = 1
                previous_document_id = None
                connection.execute(
                    """
                    INSERT INTO document_lineages (
                        lineage_id,
                        lineage_key,
                        current_version_number,
                        current_document_id,
                        created_at,
                        created_by
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        lineage_id,
                        lineage_key,
                        0,
                        None,
                        now,
                        "icicso-document-ingestion-console",
                    ),
                )
            else:
                lineage_id = lineage_row["lineage_id"]
                version_number = int(lineage_row["current_version_number"]) + 1
                previous_document_id = lineage_row["current_document_id"]

            vrn, policy, institutional_version = self._vrn_policy_service.build_vrn(
                content_hash=content_hash,
                layer=request.layer.upper(),
                continuum_stage=request.continuum_stage.upper(),
                category=request.category,
                ingestion_timestamp_utc=now,
                institutional_version=version_number,
            )
            version_id = f"VER-{lineage_id.split('-', 1)[1]}-{version_number:03d}"

            connection.execute(
                """
                INSERT INTO uploaded_source_documents (
                    document_id,
                    lineage_id,
                    lineage_key,
                    source_vrn,
                    vrn_policy_id,
                    version_number,
                    institutional_version,
                    previous_document_id,
                    vrn_status,
                    ingest_artifact_id,
                    ser_artifact_id,
                    file_name,
                    absolute_path,
                    relative_path,
                    extension,
                    document_type,
                    layer,
                    category,
                    document_group,
                    language,
                    version_detected,
                    size_bytes,
                    last_write_time_utc,
                    ingestion_timestamp_utc,
                    hash_sha256,
                    source_status,
                    source_origin,
                    continuum_stage,
                    ingestion_notes,
                    derived_artifacts_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    document_id,
                    lineage_id,
                    lineage_key,
                    vrn,
                    policy.policy_id,
                    version_number,
                    institutional_version,
                    previous_document_id,
                    policy.active_status,
                    _build_artifact_id("ING", content_hash),
                    _build_artifact_id("SER", content_hash),
                    file_name,
                    str(absolute_path.resolve()),
                    relative_path,
                    extension,
                    document_type,
                    request.layer.upper(),
                    request.category,
                    request.document_group,
                    request.language,
                    None,
                    len(content),
                    now,
                    now,
                    content_hash,
                    "uploaded",
                    "workspace-upload",
                    request.continuum_stage.upper(),
                    request.ingestion_notes,
                    json.dumps(derived_artifacts),
                ),
            )
            connection.execute(
                """
                INSERT INTO document_versions (
                    version_id,
                    lineage_id,
                    lineage_key,
                    document_id,
                    version_number,
                    institutional_version,
                    previous_document_id,
                    vrn,
                    content_hash,
                    issued_at,
                    issued_by,
                    change_reason
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    version_id,
                    lineage_id,
                    lineage_key,
                    document_id,
                    version_number,
                    institutional_version,
                    previous_document_id,
                    vrn,
                    content_hash,
                    now,
                    "icicso-document-ingestion-console",
                    request.ingestion_notes or "Documento emitido desde ingesta.",
                ),
            )
            connection.execute(
                """
                UPDATE document_lineages
                SET current_version_number = ?,
                    current_document_id = ?
                WHERE lineage_id = ?
                """,
                (
                    version_number,
                    document_id,
                    lineage_id,
                ),
            )
            connection.commit()

        document = self.get_uploaded_document(document_id)
        if document is None:
            raise RuntimeError("Uploaded source document could not be reloaded after insert.")

        self._upsert_classification(
            document_id=document.document_id,
            specialty=request.specialty,
            sub_specialty=request.sub_specialty,
            epidemic_focus=request.epidemic_focus,
            updated_by="icicso-document-ingestion-console",
        )
        self._audit_report_service.append_event(
            document_id=document.document_id,
            vrn=document.vrn,
            event_type="DOCUMENT_INGESTED",
            stage=document.continuum_stage,
            actor="icicso-document-ingestion-console",
            summary="Documento cargado y persistido en uploaded_source_documents.",
                payload={
                    "file_name": document.file_name,
                    "absolute_path": document.absolute_path,
                "relative_path": document.relative_path,
                "hash_sha256": document.hash_sha256,
                "vrn": document.vrn,
                    "classification": {
                        "specialty": document.specialty,
                        "sub_specialty": document.sub_specialty,
                        "epidemic_focus": document.epidemic_focus,
                    },
                    "lineage_id": document.lineage_id,
                    "lineage_key": document.lineage_key,
                    "version_number": document.version_number,
                    "institutional_version": document.institutional_version,
                    "previous_document_id": document.previous_document_id,
                },
            )
        self._audit_report_service.append_event(
            document_id=document.document_id,
            vrn=document.vrn,
            event_type="VERSION_ISSUED",
            stage=document.continuum_stage,
            actor="icicso-document-ingestion-console",
            summary=f"Version institucional {document.institutional_version} emitida para lineage {document.lineage_key}.",
            payload={
                "lineage_id": document.lineage_id,
                "lineage_key": document.lineage_key,
                "version_number": document.version_number,
                "institutional_version": document.institutional_version,
                "previous_document_id": document.previous_document_id,
            },
        )

        sync_artifacts = self.write_feed_exports()
        self._audit_report_service.write_feed_exports()
        return DocumentIngestionResponse(
            document=document,
            duplicate_detected=False,
            sync_artifacts=sync_artifacts,
        )

    def list_uploaded_documents(self, *, limit: int = 25) -> list[SourceDocument]:
        with get_connection(self._database_path) as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM uploaded_source_documents
                ORDER BY ingestion_timestamp_utc DESC
                LIMIT ?
                """,
                [limit],
            ).fetchall()
            classification_rows = connection.execute(
                """
                SELECT document_id, specialty, sub_specialty, epidemic_focus
                FROM document_classifications
                """
            ).fetchall()

        classification_map = {
            row["document_id"]: row for row in classification_rows
        }
        documents = [_row_to_document(row) for row in rows]
        for document in documents:
            classification = classification_map.get(document.document_id)
            if classification is not None:
                document.specialty = classification["specialty"]
                document.sub_specialty = classification["sub_specialty"]
                document.epidemic_focus = classification["epidemic_focus"]

        return documents

    def get_feed(self, *, limit: int = 10) -> DocumentIngestionFeed:
        documents = self.list_uploaded_documents(limit=limit)
        all_documents = self.list_uploaded_documents(limit=500)
        layers: dict[str, int] = {}
        for document in all_documents:
            layers[document.layer] = layers.get(document.layer, 0) + 1

        sync_artifacts = [
            self._settings.runtime_feed_path.relative_to(self._settings.workspace_root).as_posix(),
            self._settings.dashboard_feed_path.relative_to(self._settings.workspace_root).as_posix(),
            self._settings.emulator_feed_path.relative_to(self._settings.workspace_root).as_posix(),
        ]

        return DocumentIngestionFeed(
            generated_at_utc=datetime.now(UTC).isoformat(),
            uploaded_documents=sum(layers.values()),
            continuum_ready_documents=sum(1 for item in all_documents if item.continuum_stage),
            layers=layers,
            sync_artifacts=sync_artifacts,
            latest_documents=documents,
        )

    def get_continuum_preparation(self, document_id: str) -> ContinuumPreparation | None:
        document = self.get_uploaded_document(document_id)
        if document is None:
            return None

        return ContinuumPreparation(
            document=document,
            ingest_artifact=_build_ingest_artifact(document),
            ser_artifact_preview=_build_ser_artifact(document),
        )

    def materialize_continuum(self, document_id: str) -> ContinuumMaterializationResult | None:
        document = self.get_uploaded_document(document_id)
        if document is None:
            return None
        if document.vrn_status != "ACTIVE":
            raise ValueError("VRN must be ACTIVE before materialization.")

        ingest_artifact = _build_ingest_artifact(document)
        ser_artifact = _build_ser_artifact(document, ingest_artifact=ingest_artifact)
        eo_artifact = _build_eo_artifact(document, ser_artifact=ser_artifact)
        el_artifact = _build_el_artifact(document, eo_artifact=eo_artifact)
        guideline_recommendations = _build_guideline_recommendations(
            document,
            ser_artifact=ser_artifact,
        )
        eo_candidates = _build_eo_candidates(
            document,
            ser_artifact=ser_artifact,
            primary_eo_artifact=eo_artifact,
            guideline_recommendations=guideline_recommendations,
        )

        with get_connection(self._database_path) as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO source_evidence_records (source_id, artifact_id, vrn, artifact_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    document.document_id,
                    ser_artifact.id,
                    ser_artifact.vrn,
                    ser_artifact.model_dump_json(),
                    ser_artifact.created_at,
                ],
            )
            connection.execute(
                """
                INSERT OR REPLACE INTO evidence_objects (source_id, artifact_id, vrn, artifact_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    document.document_id,
                    eo_artifact.id,
                    eo_artifact.vrn,
                    eo_artifact.model_dump_json(),
                    eo_artifact.created_at,
                ],
            )
            connection.execute(
                """
                INSERT OR REPLACE INTO evidence_lake_records (source_id, artifact_id, vrn, artifact_json, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                [
                    document.document_id,
                    el_artifact.id,
                    el_artifact.vrn,
                    el_artifact.model_dump_json(),
                    el_artifact.created_at,
                ],
            )
            connection.execute(
                "DELETE FROM guideline_recommendations WHERE document_id = ?",
                [document.document_id],
            )
            for recommendation in guideline_recommendations:
                connection.execute(
                    """
                    INSERT INTO guideline_recommendations (
                        recommendation_id,
                        document_id,
                        ser_artifact_id,
                        statement_key,
                        canonical_title,
                        recommendation_text,
                        recommendation_class,
                        level_of_evidence,
                        document_family,
                        clinical_topic,
                        population,
                        intervention,
                        comparator,
                        outcome,
                        conditions_json,
                        exclusions_json,
                        clinical_state,
                        disease,
                        severity,
                        time_window,
                        event_anchor,
                        numeric_thresholds_json,
                        care_phase,
                        clinical_temporality,
                        temporal_qualifiers_json,
                        guidance_temporality,
                        care_setting,
                        specialty,
                        sub_specialty,
                        source_excerpt,
                        source_locator,
                        information_weight,
                        weight_score,
                        weight_rationale,
                        extraction_confidence,
                        confidence_rationale_json,
                        clinical_entities_json,
                        execution_model_json,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    [
                        recommendation.recommendation_id,
                        recommendation.document_id,
                        recommendation.ser_artifact_id,
                        recommendation.statement_key,
                        recommendation.canonical_title,
                        recommendation.recommendation_text,
                        recommendation.recommendation_class,
                        recommendation.level_of_evidence,
                        recommendation.document_family,
                        recommendation.clinical_topic,
                        recommendation.population,
                        recommendation.intervention,
                        recommendation.comparator,
                        recommendation.outcome,
                        json.dumps(recommendation.conditions, ensure_ascii=True),
                        json.dumps(recommendation.exclusions, ensure_ascii=True),
                        recommendation.clinical_state,
                        recommendation.disease,
                        recommendation.severity,
                        recommendation.time_window,
                        recommendation.event_anchor,
                        json.dumps([threshold.model_dump(mode="json") for threshold in recommendation.numeric_thresholds], ensure_ascii=True),
                        recommendation.care_phase,
                        recommendation.clinical_temporality,
                        json.dumps(recommendation.temporal_qualifiers, ensure_ascii=True),
                        recommendation.guidance_temporality,
                        recommendation.care_setting,
                        recommendation.specialty,
                        recommendation.sub_specialty,
                        recommendation.source_excerpt,
                        recommendation.source_locator,
                        recommendation.information_weight,
                        recommendation.weight_score,
                        recommendation.weight_rationale,
                        recommendation.extraction_confidence,
                        json.dumps(recommendation.confidence_rationale, ensure_ascii=True),
                        json.dumps([entity.model_dump(mode="json") for entity in recommendation.clinical_entities], ensure_ascii=True),
                        json.dumps(recommendation.execution_model.model_dump(mode="json"), ensure_ascii=True),
                        recommendation.created_at,
                        recommendation.updated_at,
                    ],
                )
            connection.execute(
                "DELETE FROM eo_candidates WHERE document_id = ?",
                [document.document_id],
            )
            for candidate in eo_candidates:
                connection.execute(
                    """
                    INSERT INTO eo_candidates (
                        candidate_id,
                        document_id,
                        ser_artifact_id,
                        primary_eo_artifact_id,
                        statement_key,
                        statement_text,
                        canonical_title,
                        domain,
                        recommendation_class,
                        level_of_evidence,
                        eo_type,
                        eo_subtype,
                        source_excerpt,
                        completion_level,
                        review_state,
                        clinical_audit_state,
                        surgical_audit_state,
                        finalization_status,
                        evidence_strength,
                        information_weight,
                        weight_score,
                        weight_rationale,
                        source_locator,
                        created_at,
                        updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    [
                        candidate.candidate_id,
                        candidate.document_id,
                        candidate.ser_artifact_id,
                        candidate.primary_eo_artifact_id,
                        candidate.statement_key,
                        candidate.statement_text,
                        candidate.canonical_title,
                        candidate.domain,
                        candidate.recommendation_class,
                        candidate.level_of_evidence,
                        candidate.eo_type,
                        candidate.eo_subtype,
                        candidate.source_excerpt,
                        candidate.completion_level,
                        candidate.review_state,
                        candidate.clinical_audit_state,
                        candidate.surgical_audit_state,
                        candidate.finalization_status,
                        candidate.evidence_strength,
                        candidate.information_weight,
                        candidate.weight_score,
                        candidate.weight_rationale,
                        candidate.source_locator,
                        candidate.created_at,
                        candidate.updated_at,
                    ],
                )
            connection.commit()

        self.write_feed_exports()
        self._audit_report_service.append_event(
            document_id=document.document_id,
            vrn=document.vrn,
            event_type="CONTINUUM_MATERIALIZED",
            stage=document.continuum_stage,
            actor="icicso-document-ingestion-console",
            summary="SER, EO y EL materializados y persistidos.",
            payload={
                "ingest_artifact_id": ingest_artifact.id,
                "ser_artifact_id": ser_artifact.id,
                "eo_artifact_id": eo_artifact.id,
                "el_artifact_id": el_artifact.id,
                "guideline_recommendation_ids": [
                    recommendation.recommendation_id for recommendation in guideline_recommendations
                ],
                "guideline_recommendations_count": len(guideline_recommendations),
                "eo_candidate_ids": [candidate.candidate_id for candidate in eo_candidates],
                "eo_candidates_count": len(eo_candidates),
            },
        )
        self._audit_report_service.write_feed_exports()
        return ContinuumMaterializationResult(
            document=document,
            ingest_artifact=ingest_artifact,
            ser_artifact=ser_artifact,
            eo_artifact=eo_artifact,
            el_artifact=el_artifact,
            guideline_recommendations=guideline_recommendations,
            eo_candidates=eo_candidates,
        )

    def list_materialized_records(self) -> list[dict[str, str]]:
        with get_connection(self._database_path) as connection:
            rows = connection.execute(
                """
                SELECT
                    u.document_id,
                    u.file_name,
                    s.artifact_id AS ser_artifact_id,
                    eo.artifact_id AS eo_artifact_id,
                    el.artifact_id AS el_artifact_id
                FROM uploaded_source_documents u
                LEFT JOIN source_evidence_records s ON s.source_id = u.document_id
                LEFT JOIN evidence_objects eo ON eo.source_id = u.document_id
                LEFT JOIN evidence_lake_records el ON el.source_id = u.document_id
                WHERE s.source_id IS NOT NULL
                ORDER BY u.ingestion_timestamp_utc DESC
                """
            ).fetchall()

        return [dict(row) for row in rows]

    def list_eo_candidates(self, document_id: str) -> list[EvidenceObjectCandidate]:
        with get_connection(self._database_path) as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM eo_candidates
                WHERE document_id = ?
                ORDER BY created_at ASC, candidate_id ASC
                """,
                (document_id,),
            ).fetchall()

        return [_row_to_eo_candidate(row) for row in rows]

    def list_guideline_recommendations(self, document_id: str) -> list[GuidelineRecommendation]:
        with get_connection(self._database_path) as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM guideline_recommendations
                WHERE document_id = ?
                ORDER BY created_at ASC, recommendation_id ASC
                """,
                (document_id,),
            ).fetchall()

        return [_row_to_guideline_recommendation(row) for row in rows]

    def build_clinical_topic_ranking(
        self,
        document_id: str,
        *,
        limit_per_topic: int = 5,
    ) -> list[ClinicalTopicRankingEntry]:
        recommendations = self.list_guideline_recommendations(document_id)
        topics = sorted(
            {
                recommendation.clinical_topic
                for recommendation in recommendations
                if recommendation.clinical_topic
            }
        )
        if not topics:
            return []

        topic_placeholders = ", ".join("?" for _ in topics)
        with get_connection(self._database_path) as connection:
            rows = connection.execute(
                f"""
                SELECT
                    gr.clinical_topic,
                    gr.document_id,
                    u.file_name,
                    u.document_group,
                    u.document_type,
                    u.source_vrn,
                    dc.specialty,
                    COUNT(gr.recommendation_id) AS recommendation_count,
                    AVG(gr.weight_score) AS average_weight_score,
                    AVG(gr.extraction_confidence) AS average_confidence
                FROM guideline_recommendations gr
                LEFT JOIN uploaded_source_documents u ON u.document_id = gr.document_id
                LEFT JOIN document_classifications dc ON dc.document_id = gr.document_id
                WHERE gr.clinical_topic IN ({topic_placeholders})
                GROUP BY
                    gr.clinical_topic,
                    gr.document_id,
                    u.file_name,
                    u.document_group,
                    u.document_type,
                    u.source_vrn,
                    dc.specialty
                ORDER BY
                    gr.clinical_topic ASC,
                    recommendation_count DESC,
                    average_weight_score DESC,
                    average_confidence DESC
                """,
                topics,
            ).fetchall()

            eo_rows = connection.execute(
                f"""
                SELECT
                    gr.clinical_topic,
                    eoc.document_id,
                    eoc.eo_type,
                    COUNT(*) AS eo_type_count
                FROM guideline_recommendations gr
                INNER JOIN eo_candidates eoc
                    ON eoc.document_id = gr.document_id
                    AND eoc.statement_key = gr.statement_key
                WHERE gr.clinical_topic IN ({topic_placeholders})
                GROUP BY gr.clinical_topic, eoc.document_id, eoc.eo_type
                ORDER BY gr.clinical_topic ASC, eoc.document_id ASC, eo_type_count DESC, eoc.eo_type ASC
                """,
                topics,
            ).fetchall()

        eo_summary_map: dict[tuple[str, str], list[str]] = {}
        for row in eo_rows:
            key = (row["clinical_topic"], row["document_id"])
            eo_summary_map.setdefault(key, []).append(f'{row["eo_type"]}:{row["eo_type_count"]}')

        grouped_entries: dict[str, list[ClinicalTopicRankingEntry]] = {}
        for row in rows:
            entry = ClinicalTopicRankingEntry(
                clinical_topic=row["clinical_topic"],
                document_id=row["document_id"],
                file_name=row["file_name"],
                document_group=row["document_group"],
                document_type=row["document_type"],
                specialty=row["specialty"],
                vrn=row["source_vrn"],
                recommendation_count=int(row["recommendation_count"] or 0),
                average_weight_score=(
                    round(float(row["average_weight_score"]), 3)
                    if row["average_weight_score"] is not None
                    else None
                ),
                average_confidence=(
                    round(float(row["average_confidence"]), 3)
                    if row["average_confidence"] is not None
                    else None
                ),
                eo_type_summary=eo_summary_map.get((row["clinical_topic"], row["document_id"]), [])[:4],
            )
            grouped_entries.setdefault(entry.clinical_topic, []).append(entry)

        ranked: list[ClinicalTopicRankingEntry] = []
        for topic in topics:
            ranked.extend(grouped_entries.get(topic, [])[:limit_per_topic])
        return ranked

    def build_clinical_topic_conflicts(
        self,
        document_id: str,
        *,
        limit_per_topic: int = 3,
    ) -> list[ClinicalTopicConflictEntry]:
        recommendations = self.list_guideline_recommendations(document_id)
        topics = sorted({item.clinical_topic for item in recommendations if item.clinical_topic})
        if not topics:
            return []

        topic_placeholders = ", ".join("?" for _ in topics)
        with get_connection(self._database_path) as connection:
            rows = connection.execute(
                f"""
                SELECT
                    gr.clinical_topic,
                    gr.document_id,
                    u.file_name,
                    u.document_type,
                    u.document_group,
                    SUM(CASE
                        WHEN lower(gr.recommendation_text) LIKE '%should not be performed%'
                          OR lower(gr.recommendation_text) LIKE '%is not recommended%'
                          OR lower(gr.recommendation_text) LIKE '%harm%'
                        THEN 1 ELSE 0 END) AS negative_count,
                    SUM(CASE
                        WHEN lower(gr.recommendation_text) LIKE '%should be performed%'
                          OR lower(gr.recommendation_text) LIKE '%is recommended%'
                          OR lower(gr.recommendation_text) LIKE '%is indicated%'
                          OR lower(gr.recommendation_text) LIKE '%should be considered%'
                          OR lower(gr.recommendation_text) LIKE '%is reasonable%'
                          OR lower(gr.recommendation_text) LIKE '%may be considered%'
                        THEN 1 ELSE 0 END) AS positive_count,
                    AVG(gr.weight_score) AS average_weight_score,
                    AVG(gr.extraction_confidence) AS average_confidence
                FROM guideline_recommendations gr
                LEFT JOIN uploaded_source_documents u ON u.document_id = gr.document_id
                WHERE gr.clinical_topic IN ({topic_placeholders})
                GROUP BY gr.clinical_topic, gr.document_id, u.file_name, u.document_type, u.document_group
                ORDER BY gr.clinical_topic ASC, gr.document_id ASC
                """,
                topics,
            ).fetchall()

        by_topic: dict[str, list[dict[str, object]]] = {}
        for row in rows:
            positive_count = int(row["positive_count"] or 0)
            negative_count = int(row["negative_count"] or 0)
            stance = "mixed"
            if positive_count > 0 and negative_count == 0:
                stance = "supportive"
            elif negative_count > 0 and positive_count == 0:
                stance = "restrictive"

            document_type = (row["document_type"] or "").lower()
            type_score = 1.0
            if "guideline" in document_type:
                type_score = 4.0
            elif "meta" in document_type:
                type_score = 3.0
            elif "trial" in document_type or "rct" in document_type:
                type_score = 2.5
            elif "consensus" in document_type:
                type_score = 2.2

            weight_score = float(row["average_weight_score"] or 0.0)
            confidence_score = float(row["average_confidence"] or 0.0)
            precedence_score = round(type_score + weight_score + confidence_score, 3)
            by_topic.setdefault(row["clinical_topic"], []).append(
                {
                    "clinical_topic": row["clinical_topic"],
                    "document_id": row["document_id"],
                    "file_name": row["file_name"],
                    "document_type": row["document_type"],
                    "document_group": row["document_group"],
                    "stance": stance,
                    "precedence_score": precedence_score,
                    "positive_count": positive_count,
                    "negative_count": negative_count,
                }
            )

        conflicts: list[ClinicalTopicConflictEntry] = []
        for topic in topics:
            items = by_topic.get(topic, [])
            stances = {item["stance"] for item in items if item["stance"] != "mixed"}
            if len(stances) < 2:
                continue
            ordered = sorted(
                items,
                key=lambda item: (
                    -float(item["precedence_score"]),
                    str(item["document_id"]),
                ),
            )
            preferred = ordered[0]
            challengers = [
                item for item in ordered[1:]
                if item["stance"] != preferred["stance"]
            ][:limit_per_topic]
            for challenger in challengers:
                conflicts.append(
                    ClinicalTopicConflictEntry(
                        clinical_topic=topic,
                        conflict_level="conflict",
                        preferred_document_id=str(preferred["document_id"]),
                        preferred_file_name=preferred["file_name"],
                        preferred_stance=str(preferred["stance"]),
                        preferred_score=float(preferred["precedence_score"]),
                        challenger_document_id=str(challenger["document_id"]),
                        challenger_file_name=challenger["file_name"],
                        challenger_stance=str(challenger["stance"]),
                        challenger_score=float(challenger["precedence_score"]),
                        rationale=(
                            f'preferred:{preferred["document_type"]} '
                            f'positive={preferred["positive_count"]} negative={preferred["negative_count"]}; '
                            f'challenger:{challenger["document_type"]} '
                            f'positive={challenger["positive_count"]} negative={challenger["negative_count"]}'
                        ),
                    )
                )
        return conflicts

    def record_eo_candidate_audit(
        self,
        *,
        document_id: str,
        candidate_id: str,
        request: EvidenceObjectAuditRequest,
    ) -> EvidenceObjectAuditRecord:
        audit_kind = request.audit_kind.strip().lower()
        decision = request.decision.strip().lower()
        if audit_kind not in {"clinical", "surgical"}:
            raise ValueError("audit_kind must be clinical or surgical.")
        if decision not in {"approved", "rejected", "changes_requested"}:
            raise ValueError("decision must be approved, rejected or changes_requested.")

        now = datetime.now(UTC).isoformat()
        audit_id = f"AUD-{sha256(f'{candidate_id}:{audit_kind}:{now}'.encode('utf-8')).hexdigest()[:12].upper()}"

        with get_connection(self._database_path) as connection:
            row = connection.execute(
                """
                SELECT *
                FROM eo_candidates
                WHERE candidate_id = ? AND document_id = ?
                LIMIT 1
                """,
                (candidate_id, document_id),
            ).fetchone()
            if row is None:
                raise LookupError("EO candidate not found for document.")

            connection.execute(
                """
                INSERT INTO eo_candidate_audits (
                    audit_id,
                    candidate_id,
                    document_id,
                    audit_kind,
                    decision,
                    comments,
                    requested_changes_json,
                    signed_by,
                    signed_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    audit_id,
                    candidate_id,
                    document_id,
                    audit_kind,
                    decision,
                    request.comments,
                    json.dumps(request.requested_changes, ensure_ascii=True),
                    request.signed_by,
                    now,
                ),
            )

            clinical_state = row["clinical_audit_state"]
            surgical_state = row["surgical_audit_state"]
            if audit_kind == "clinical":
                clinical_state = decision
            else:
                surgical_state = decision

            completion_level, review_state, finalization_status = _resolve_candidate_state(
                clinical_state=clinical_state,
                surgical_state=surgical_state,
            )

            connection.execute(
                """
                UPDATE eo_candidates
                SET clinical_audit_state = ?,
                    surgical_audit_state = ?,
                    completion_level = ?,
                    review_state = ?,
                    finalization_status = ?,
                    updated_at = ?
                WHERE candidate_id = ?
                """,
                (
                    clinical_state,
                    surgical_state,
                    completion_level,
                    review_state,
                    finalization_status,
                    now,
                    candidate_id,
                ),
            )
            connection.commit()

        self._audit_report_service.append_event(
            document_id=document_id,
            vrn=self.get_uploaded_document(document_id).vrn if self.get_uploaded_document(document_id) is not None else None,
            event_type="EO_AUDIT_RECORDED",
            stage="EO",
            actor=request.signed_by,
            summary=f"Auditoria {audit_kind} registrada para {candidate_id} con decision {decision}.",
            payload={
                "candidate_id": candidate_id,
                "audit_kind": audit_kind,
                "decision": decision,
                "completion_level": completion_level,
                "review_state": review_state,
                "requested_changes": request.requested_changes,
            },
            related_record_id=audit_id,
        )
        self._audit_report_service.write_feed_exports()

        return EvidenceObjectAuditRecord(
            audit_id=audit_id,
            candidate_id=candidate_id,
            document_id=document_id,
            audit_kind=audit_kind,
            decision=decision,
            comments=request.comments,
            requested_changes=request.requested_changes,
            signed_by=request.signed_by,
            signed_at=now,
        )

    def update_classification(
        self, document_id: str, update: DocumentClassificationUpdate
    ) -> SourceDocument | None:
        self._upsert_classification(
            document_id=document_id,
            specialty=update.specialty,
            sub_specialty=update.sub_specialty,
            epidemic_focus=update.epidemic_focus,
            updated_by=update.updated_by,
        )
        updated = self.get_uploaded_document(document_id)
        if updated is not None:
            self._audit_report_service.append_event(
                document_id=document_id,
                vrn=updated.vrn,
                event_type="CLASSIFICATION_UPDATED",
                stage=updated.continuum_stage,
                actor=update.updated_by,
                summary="Clasificacion del documento actualizada.",
                payload=update.model_dump(mode="json"),
            )
            self._audit_report_service.write_feed_exports()
        return updated

    def update_metadata(
        self, document_id: str, update: DocumentMetadataUpdate
    ) -> SourceDocument | None:
        document = self.get_uploaded_document(document_id)
        if document is None:
            return None

        current_path = Path(document.absolute_path)
        if not current_path.exists():
            raise FileNotFoundError(f"Documento no encontrado en disco: {current_path}")

        target_dir = current_path.parent
        if update.move_to:
            safe_move = _safe_relative_path(update.move_to)
            target_dir = (self._settings.uploaded_documents_dir / safe_move).resolve()
            if self._settings.uploaded_documents_dir not in target_dir.parents and target_dir != self._settings.uploaded_documents_dir:
                raise ValueError("move_to debe estar dentro de uploaded_documents.")
            target_dir.mkdir(parents=True, exist_ok=True)

        target_name = update.file_name or current_path.name
        target_name = _slugify_filename(target_name)
        target_path = target_dir / target_name
        if target_path != current_path:
            current_path.replace(target_path)

        relative_path = target_path.relative_to(self._settings.workspace_root).as_posix()
        updated_at = datetime.now(UTC).isoformat()

        with get_connection(self._database_path) as connection:
            connection.execute(
                """
                UPDATE uploaded_source_documents
                SET file_name = ?,
                    absolute_path = ?,
                    relative_path = ?,
                    category = COALESCE(?, category),
                    document_group = COALESCE(?, document_group),
                    language = COALESCE(?, language),
                    ingestion_notes = COALESCE(?, ingestion_notes),
                    last_write_time_utc = ?
                WHERE document_id = ?
                """,
                (
                    target_path.name,
                    str(target_path.resolve()),
                    relative_path,
                    update.category,
                    update.document_group,
                    update.language,
                    update.ingestion_notes,
                    updated_at,
                    document_id,
                ),
            )
            connection.commit()

        updated = self.get_uploaded_document(document_id)
        if updated is not None:
            self._audit_report_service.append_event(
                document_id=document_id,
                vrn=updated.vrn,
                event_type="METADATA_UPDATED",
                stage=updated.continuum_stage,
                actor="icicso-document-ingestion-console",
                summary="Metadata o ubicacion del documento actualizada.",
                payload={
                    "previous_absolute_path": document.absolute_path,
                    "previous_relative_path": document.relative_path,
                    "new_absolute_path": updated.absolute_path,
                    "new_relative_path": updated.relative_path,
                    "category": updated.category,
                    "document_group": updated.document_group,
                    "language": updated.language,
                    "ingestion_notes": updated.ingestion_notes,
                },
            )
            self.write_feed_exports()
            self._audit_report_service.write_feed_exports()
        return updated

    def load_nomenclature(self) -> NomenclatureCatalog:
        return self._nomenclature_service.load_catalog()

    def write_feed_exports(self) -> list[str]:
        feed = self.get_feed(limit=12)
        runtime_json = json.dumps(feed.model_dump(mode="json"), ensure_ascii=True, indent=2)

        self._settings.runtime_feed_path.parent.mkdir(parents=True, exist_ok=True)
        self._settings.dashboard_feed_path.parent.mkdir(parents=True, exist_ok=True)
        self._settings.emulator_feed_path.parent.mkdir(parents=True, exist_ok=True)

        self._settings.runtime_feed_path.write_text(runtime_json, encoding="utf-8")
        self._settings.dashboard_feed_path.write_text(runtime_json, encoding="utf-8")
        self._settings.emulator_feed_path.write_text(
            "export const documentIngestionFeed = "
            f"{runtime_json};\n",
            encoding="utf-8",
        )

        return feed.sync_artifacts

    def ensure_exports_ready(self) -> None:
        self.write_feed_exports()

    def get_uploaded_document(self, document_id: str) -> SourceDocument | None:
        with get_connection(self._database_path) as connection:
            row = connection.execute(
                """
                SELECT *
                FROM uploaded_source_documents
                WHERE document_id = ?
                """,
                [document_id],
            ).fetchone()
            classification = connection.execute(
                """
                SELECT specialty, sub_specialty, epidemic_focus
                FROM document_classifications
                WHERE document_id = ?
                """,
                [document_id],
            ).fetchone()

        if row is None:
            return None

        document = _row_to_document(row)
        if classification is not None:
            document.specialty = classification["specialty"]
            document.sub_specialty = classification["sub_specialty"]
            document.epidemic_focus = classification["epidemic_focus"]

        return document

    def get_version_history(self, document_id: str) -> DocumentVersionHistory | None:
        document = self.get_uploaded_document(document_id)
        if document is None or document.lineage_id is None or document.lineage_key is None:
            return None

        with get_connection(self._database_path) as connection:
            lineage_row = connection.execute(
                """
                SELECT *
                FROM document_lineages
                WHERE lineage_id = ?
                LIMIT 1
                """,
                (document.lineage_id,),
            ).fetchone()
            version_rows = connection.execute(
                """
                SELECT *
                FROM document_versions
                WHERE lineage_id = ?
                ORDER BY version_number DESC
                """,
                (document.lineage_id,),
            ).fetchall()

        if lineage_row is None:
            return None

        versions = [
            DocumentVersionRecord(
                version_id=row["version_id"],
                lineage_id=row["lineage_id"],
                lineage_key=row["lineage_key"],
                document_id=row["document_id"],
                version_number=row["version_number"],
                institutional_version=row["institutional_version"],
                previous_document_id=row["previous_document_id"],
                vrn=row["vrn"],
                content_hash=row["content_hash"],
                issued_at=row["issued_at"],
                issued_by=row["issued_by"],
                change_reason=row["change_reason"],
            )
            for row in version_rows
        ]
        return DocumentVersionHistory(
            lineage_id=lineage_row["lineage_id"],
            lineage_key=lineage_row["lineage_key"],
            current_document_id=lineage_row["current_document_id"],
            current_version_number=lineage_row["current_version_number"],
            versions=versions,
        )

    def activate_vrn_status(self, document_id: str, status: str = "ACTIVE") -> None:
        with get_connection(self._database_path) as connection:
            connection.execute(
                """
                UPDATE uploaded_source_documents
                SET vrn_status = ?
                WHERE document_id = ?
                """,
                (status, document_id),
            )
            connection.commit()
        document = self.get_uploaded_document(document_id)
        self._audit_report_service.append_event(
            document_id=document_id,
            vrn=document.vrn if document is not None else None,
            event_type="VRN_STATUS_CHANGED",
            stage=document.continuum_stage if document is not None else "ING",
            actor="icicso-document-ingestion-service",
            summary="Estado VRN actualizado.",
            payload={"vrn_status": status},
        )
        self._audit_report_service.write_feed_exports()

    def _upsert_classification(
        self,
        *,
        document_id: str,
        specialty: str | None,
        sub_specialty: str | None,
        epidemic_focus: str | None,
        updated_by: str,
    ) -> None:
        catalog = self._nomenclature_service.load_catalog()
        defaults = catalog.defaults
        specialty_value = specialty or defaults.get("specialty", "General")
        sub_specialty_value = sub_specialty or defaults.get("sub_specialty", "General")
        epidemic_value = epidemic_focus or defaults.get("epidemic", "N/A")

        with get_connection(self._database_path) as connection:
            connection.execute(
                """
                INSERT OR REPLACE INTO document_classifications (
                    document_id,
                    specialty,
                    sub_specialty,
                    epidemic_focus,
                    updated_at,
                    updated_by
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    document_id,
                    specialty_value,
                    sub_specialty_value,
                    epidemic_value,
                    datetime.now(UTC).isoformat(),
                    updated_by,
                ),
            )
            connection.commit()

    def _refresh_duplicate_document(
        self,
        document: SourceDocument,
        request: DocumentIngestionRequest,
    ) -> None:
        with get_connection(self._database_path) as connection:
            connection.execute(
                """
                UPDATE uploaded_source_documents
                SET document_type = COALESCE(?, document_type),
                    document_group = COALESCE(?, document_group),
                    language = COALESCE(?, language),
                    ingestion_notes = COALESCE(?, ingestion_notes),
                    last_write_time_utc = ?
                WHERE document_id = ?
                """,
                (
                    request.document_type,
                    request.document_group,
                    request.language,
                    request.ingestion_notes,
                    datetime.now(UTC).isoformat(),
                    document.document_id,
                ),
            )
            connection.commit()

        if any(
            value is not None
            for value in (request.specialty, request.sub_specialty, request.epidemic_focus)
        ):
            self._upsert_classification(
                document_id=document.document_id,
                specialty=request.specialty or document.specialty,
                sub_specialty=request.sub_specialty or document.sub_specialty,
                epidemic_focus=request.epidemic_focus or document.epidemic_focus,
                updated_by="icicso-document-ingestion-console",
            )

    def _find_by_hash(self, content_hash: str) -> SourceDocument | None:
        with get_connection(self._database_path) as connection:
            row = connection.execute(
                """
                SELECT *
                FROM uploaded_source_documents
                WHERE hash_sha256 = ?
                """,
                [content_hash],
            ).fetchone()

        if row is None:
            return None

        return _row_to_document(row)

    def _build_lineage_key(self, *, request: DocumentIngestionRequest, file_name: str) -> str:
        if request.lineage_key:
            return _slugify_lineage_key(request.lineage_key)
        normalized_title = _normalize_title(file_name)
        return _slugify_lineage_key(
            f"{request.document_group}::{request.document_type or Path(file_name).suffix.lower() or 'binary-source'}::{normalized_title}"
        )


def _infer_document_type(extension: str) -> str:
    mapping = {
        ".pdf": "pdf-source",
        ".doc": "word-source",
        ".docx": "word-source",
        ".txt": "text-source",
        ".md": "markdown-source",
        ".csv": "tabular-source",
        ".xlsx": "spreadsheet-source",
        ".json": "json-source",
    }
    return mapping.get(extension, "binary-source")


def _slugify_filename(file_name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", file_name).strip("-")
    return cleaned or "document.bin"


def _slugify_lineage_key(value: str) -> str:
    compact = re.sub(r"[^A-Za-z0-9]+", "-", value.strip().upper()).strip("-")
    return compact or "UNSPECIFIED-LINEAGE"


def _safe_relative_path(path_value: str) -> str:
    cleaned = path_value.replace("\\", "/").strip("/")
    if ".." in cleaned:
        raise ValueError("move_to no permite rutas ascendentes.")
    return cleaned


def _build_artifact_id(prefix: str, content_hash: str) -> str:
    return f"{prefix}-{content_hash[:12].upper()}"


def _build_canonical_source(payload: object) -> str:
    if payload is None or not isinstance(payload, (dict, list)):
        return json.dumps(payload, ensure_ascii=True)
    if isinstance(payload, list):
        return "[" + ",".join(_build_canonical_source(item) for item in payload) + "]"
    items = []
    for key in sorted(payload):
        items.append(f"{json.dumps(key, ensure_ascii=True)}:{_build_canonical_source(payload[key])}")
    return "{" + ",".join(items) + "}"


def _build_hash_metadata(payload: object, previous_hash: str | None = None) -> HashMetadata:
    canonical_source = _build_canonical_source(payload)
    return HashMetadata(
        algorithm="sha256",
        hash=sha256(canonical_source.encode("utf-8")).hexdigest(),
        canonical_source=canonical_source,
        previous_hash=previous_hash,
    )


def _extract_publication_year(timestamp: str) -> int:
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00")).year


def _read_document_excerpt(document: SourceDocument, max_chars: int = 1200) -> str:
    path = Path(document.absolute_path)
    if document.extension in {".txt", ".md", ".json", ".csv"}:
        return path.read_text(encoding="utf-8", errors="ignore")[:max_chars].strip()
    if document.extension == ".pdf":
        return _extract_pdf_excerpt(path, max_chars=max_chars)
    return f"[binary-document:{document.file_name}]"


def _build_audit(document: SourceDocument) -> AuditMetadata:
    return AuditMetadata(
        created_at=document.ingestion_timestamp_utc,
        created_by="icicso-document-ingestion-console",
        created_by_type="system",
    )


def _build_provenance(document: SourceDocument) -> ProvenanceMetadata:
    notes = [document.ingestion_notes] if document.ingestion_notes else []
    return ProvenanceMetadata(
        source_type="document",
        source_id=document.document_id,
        captured_at=document.ingestion_timestamp_utc,
        location=document.relative_path,
        chain_of_custody=[document.source_origin, document.absolute_path],
        notes=notes,
    )


def _normalize_title(file_name: str) -> str:
    stem = Path(file_name).stem.replace("_", " ").replace("-", " ").strip()
    return stem or file_name


def _shorten_title(title: str) -> str:
    return title if len(title) <= 48 else f"{title[:45].rstrip()}..."


def _build_ingest_artifact(document: SourceDocument) -> IngestArtifact:
    payload = IngestedDocumentPayload(
        source_id=document.document_id,
        canonical_title=_normalize_title(document.file_name),
        document_type=document.document_type,
        issuing_body=document.document_group,
        publication_date=document.last_write_time_utc,
        publication_year=_extract_publication_year(document.last_write_time_utc),
        source_url_reference=None,
        content=_read_document_excerpt(document),
    )
    integrity = _build_hash_metadata(payload.model_dump(mode="json"))
    return IngestArtifact(
        id=document.ingest_artifact_id or _build_artifact_id("ING", document.hash_sha256),
        vrn=document.vrn or "",
        created_at=document.ingestion_timestamp_utc,
        payload=payload,
        audit=_build_audit(document),
        provenance=[_build_provenance(document)],
        integrity=integrity,
        maturity="implemented",
    )


def _build_ser_artifact(
    document: SourceDocument,
    *,
    ingest_artifact: IngestArtifact | None = None,
) -> SourceEvidenceRecordArtifact:
    ingest_artifact = ingest_artifact or _build_ingest_artifact(document)
    payload = SourceEvidenceRecordPayload(
        source_document_id=ingest_artifact.id,
        source_id=ingest_artifact.payload.source_id,
        canonical_title=ingest_artifact.payload.canonical_title,
        short_title=_shorten_title(ingest_artifact.payload.canonical_title),
        document_type=ingest_artifact.payload.document_type,
        issuing_body=ingest_artifact.payload.issuing_body,
        publication_date=ingest_artifact.payload.publication_date,
        publication_year=ingest_artifact.payload.publication_year,
        source_url_reference=ingest_artifact.payload.source_url_reference,
        source_hash=ingest_artifact.integrity.hash,
        lifecycle_status="validated",
    )
    integrity = _build_hash_metadata(
        payload.model_dump(mode="json"),
        previous_hash=ingest_artifact.integrity.hash,
    )
    return SourceEvidenceRecordArtifact(
        id=document.ser_artifact_id or _build_artifact_id("SER", document.hash_sha256),
        vrn=document.vrn or "",
        created_at=document.ingestion_timestamp_utc,
        payload=payload,
        audit=_build_audit(document),
        provenance=[_build_provenance(document)],
        integrity=integrity,
        maturity="implemented",
    )


def _infer_domain_tags(document_type: str, issuing_body: str) -> list[str]:
    tags = {"evidence-object"}
    normalized_type = document_type.strip().lower()
    normalized_authority = issuing_body.strip().lower()

    if normalized_type:
        tags.add(normalized_type)
    if "acc" in normalized_authority:
        tags.add("acc")
    if "aha" in normalized_authority:
        tags.add("aha")
    if "esc" in normalized_authority:
        tags.add("esc")
    if "guideline" in normalized_type:
        tags.update({"guideline", "recommendation"})
    if "trial" in normalized_type:
        tags.add("trial")
    if "review" in normalized_type:
        tags.add("review")
    return sorted(tags)


def _derive_canonical_claims(title: str, document_type: str, issuing_body: str) -> list[str]:
    return [
        f"{document_type} canonicalizado",
        f"fuente emisora {issuing_body}",
        "Evidence Object derivado desde SER",
        _shorten_title(title),
    ]


def _build_eo_artifact(
    document: SourceDocument,
    *,
    ser_artifact: SourceEvidenceRecordArtifact,
) -> EvidenceObjectArtifact:
    payload = EvidenceObjectPayload(
        source_record_id=ser_artifact.id,
        source_id=ser_artifact.payload.source_id,
        canonical_title=ser_artifact.payload.canonical_title,
        evidence_synopsis=(
            f"{ser_artifact.payload.short_title} · "
            f"{ser_artifact.payload.issuing_body} {ser_artifact.payload.publication_year}"
        ),
        document_type=ser_artifact.payload.document_type,
        issuing_body=ser_artifact.payload.issuing_body,
        publication_date=ser_artifact.payload.publication_date,
        publication_year=ser_artifact.payload.publication_year,
        source_url_reference=ser_artifact.payload.source_url_reference,
        source_hash=ser_artifact.payload.source_hash,
        evidence_status="Active",
        canonical_claims=_derive_canonical_claims(
            ser_artifact.payload.canonical_title,
            ser_artifact.payload.document_type,
            ser_artifact.payload.issuing_body,
        ),
        domain_tags=_infer_domain_tags(
            ser_artifact.payload.document_type,
            ser_artifact.payload.issuing_body,
        ),
    )
    integrity = _build_hash_metadata(
        payload.model_dump(mode="json"),
        previous_hash=ser_artifact.integrity.hash,
    )
    return EvidenceObjectArtifact(
        id=_build_artifact_id("EO", integrity.hash),
        vrn=document.vrn or "",
        created_at=document.ingestion_timestamp_utc,
        payload=payload,
        audit=_build_audit(document),
        provenance=[_build_provenance(document)],
        integrity=integrity,
        maturity="implemented",
    )


def _build_indexing_key(source_id: str, title: str) -> str:
    slug = re.sub(r"\s+", "-", title.strip().lower())
    return f"{source_id}::{slug}"


def _clean_statement_text(text: str) -> str:
    cleaned = text.replace("|", " ")
    cleaned = re.sub(r"(\w)-\s+(\w)", r"\1\2", cleaned)
    cleaned = re.sub(r"(?<=[A-Za-z])\.(?=\d)", ". ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ;,.-")
    cleaned = re.sub(r"[\x00-\x08\x0b-\x1f]", " ", cleaned)
    cleaned = cleaned.replace("\ufffd", " ")
    cleaned = re.sub(r"^(?:NR|R|LD|EO|LM)\s+(?=[A-Z])", "", cleaned)
    cleaned = re.sub(r"\b(?:table|figure|fig)\s+\d+[a-z]?\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\(\s*\d+(?:\s*,\s*\d+)*\s*\)", "", cleaned)
    # Strip trailing bibliographic citations without removing clinical thresholds such as <12 hours or FFR >0.80.
    cleaned = re.sub(
        r"(?<=[A-Za-z\)])\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*(?=(?:[.;,:)]|\s*$))",
        "",
        cleaned,
    )
    cleaned = re.sub(
        r"(?<=\s)\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*(?=(?:[.;,:)]|\s*$))",
        "",
        cleaned,
    )
    cleaned = re.sub(r"^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*\s+", "", cleaned)
    cleaned = re.sub(r"\bDownloaded from .*?$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\b(?:COR|LOE)\b", "", cleaned)
    cleaned = re.sub(r"\b(?:A|B-R|B-NR|C-LD|C-EO|C-LM|C)\b\s*$", "", cleaned)
    cleaned = re.sub(r"\s+\d+\s*$", "", cleaned)
    cleaned = re.sub(r"([<>])\s+", r"\1", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def _finalize_recommendation_statement(text: str) -> str:
    cleaned = _clean_statement_text(text)
    if not cleaned:
        return cleaned

    # Drop obvious supportive-text tails that were concatenated after the actual recommendation.
    tail_markers = [
        r"\bA routine invasive approach\b",
        r"\bPooled trial data\b",
        r"\bThere are no randomized\b",
        r"\bObservational studies\b",
        r"\bThe STS risk score\b",
        r"\bThe multidisciplinary Heart Team\b",
        r"\bIn the [A-Z][A-Za-z0-9\-]+ trial\b",
        r"\bIn the [A-Z][A-Za-z0-9\-\(\)\s]+ trial\b",
    ]
    for marker in tail_markers:
        match = re.search(marker, cleaned)
        if match and match.start() > 40:
            cleaned = cleaned[: match.start()].strip(" ;,.-")
            break

    sentences = [segment.strip(" ;,.-") for segment in re.split(r"(?<=[\.\?\!])\s+", cleaned) if segment.strip()]
    if not sentences:
        return cleaned

    if _is_recommendation_like(sentences[0]):
        return _clean_statement_text(sentences[0])

    for sentence in sentences[1:]:
        if _is_recommendation_like(sentence):
            return _clean_statement_text(sentence)

    return _clean_statement_text(sentences[0])


def _has_actionable_recommendation_language(text: str) -> bool:
    return bool(
        re.search(
            r"\b("
            r"must|"
            r"should(?:\s+not)?|"
            r"(?:is|are)\s+(?:an?\s+)?(?:advised|contraindicated|indicated|required|recommended|reasonable|useful|preferred|warranted)|"
            r"(?:can|may)\s+be\s+(?:beneficial|useful|considered|reasonable)|"
            r"(?:recommend|recommends|recommended)\s+that|"
            r"(?:is|are)\s+recommended\s+in\s+preference\s+to|"
            r"it\s+is\s+(?:recommended|reasonable|indicated)"
            r")\b",
            text,
            re.IGNORECASE,
        )
    )


def _looks_like_heading_or_title(text: str) -> bool:
    lower = text.lower().strip(" ;,.-")
    if not lower:
        return True
    if "recommendation-specific supporting text" in lower or "referenced studies" in lower:
        return True
    if any(
        lower.startswith(prefix)
        for prefix in (
            "class of recommendation and level of evidence",
            "factors for consideration by",
            "defining coronary artery lesion complexity",
            "preprocedural assessment and the heart team",
            "revascularization in ",
            "revascularization of ",
            "predicting patient risk of death",
            "dapt adherence",
        )
    ):
        return True
    if " recommendation for " in lower and not _has_actionable_recommendation_language(text):
        return True
    if lower.endswith(" recommendation") or lower.endswith(" recommendations"):
        return not _has_actionable_recommendation_language(text)
    if re.fullmatch(r"[A-Z][A-Za-z0-9/&,\-:\(\)\s]{8,}", text.strip()) and not _has_actionable_recommendation_language(text):
        return True
    return False


def _is_recommendation_like(text: str) -> bool:
    if _looks_like_heading_or_title(text):
        return False
    return _has_actionable_recommendation_language(text)


def _split_post_versioned_statements(content: str) -> list[str]:
    compact = re.sub(r"\s+", " ", content).strip()
    if not compact:
        return ["No statement extracted from post-versioned document."]
    parts = re.split(r"(?<=[\.\!\?;])\s+", compact)
    statements = [_finalize_recommendation_statement(part) for part in parts if part.strip()]
    recommendation_like = [statement for statement in statements if _is_recommendation_like(statement)]
    if recommendation_like:
        return recommendation_like[:24]
    return statements[:5] or [compact[:240]]


def _extract_pdf_excerpt(path: Path, max_chars: int = 1200) -> str:
    extracted = _extract_pdf_recommendations(path, max_candidates=48)
    if extracted:
        joined = " ".join(item.statement_text for item in extracted)
        return joined[:max_chars].strip()
    try:
        with fitz.open(path) as document:
            snippets = []
            for page in document[: min(12, len(document))]:
                text = re.sub(r"\s+", " ", page.get_text("text")).strip()
                if text:
                    snippets.append(text)
                if len(" ".join(snippets)) >= max_chars * 2:
                    break
    except Exception:
        return f"[binary-document:{path.name}]"
    return " ".join(snippets)[:max_chars].strip() if snippets else f"[binary-document:{path.name}]"


def _extract_pdf_page_texts(path: Path) -> list[tuple[int, str]]:
    page_lines = _extract_pdf_page_lines(path)
    return [(page_number, " | ".join(lines)) for page_number, lines in page_lines]


def _extract_pdf_page_lines(path: Path) -> list[tuple[int, list[str]]]:
    try:
        with fitz.open(path) as document:
            pages_raw: list[tuple[int, list[str]]] = []
            line_counts: dict[str, int] = {}
            for page_index in range(len(document)):
                page = document[page_index]
                lines = [_normalize_pdf_line(line) for line in page.get_text("text").splitlines()]
                cleaned_lines = [line for line in lines if line]
                pages_raw.append((page_index + 1, cleaned_lines))
                for line in set(cleaned_lines):
                    line_counts[line] = line_counts.get(line, 0) + 1

            repeated_threshold = max(3, len(document) // 6) if len(document) >= 6 else 99
            pages: list[tuple[int, list[str]]] = []
            for page_number, lines in pages_raw:
                kept_lines: list[str] = []
                for line in lines:
                    if _is_structural_guideline_line(line):
                        kept_lines.append(line)
                        continue
                    if line_counts.get(line, 0) >= repeated_threshold:
                        continue
                    if _is_noise_line(line):
                        continue
                    kept_lines.append(line)
                if kept_lines:
                    pages.append((page_number, kept_lines))
            return pages
    except Exception:
        return []


def _normalize_pdf_line(line: str) -> str:
    line = line.replace("\u2020", " ").replace("\u2021", " ").replace("\uf0b7", " ")
    line = re.sub(r"\s+", " ", line)
    line = re.sub(r"^[\-\*\u2022•]+\s*", "", line)
    return line.strip()


def _is_structural_guideline_line(line: str) -> bool:
    normalized = re.sub(r"\s+", " ", line).strip().upper()
    if normalized in {"COR", "LOE", "RECOMMENDATION", "RECOMMENDATIONS"}:
        return True
    if _normalize_cor_token(normalized) is not None:
        return True
    if _normalize_loe_token(normalized) is not None:
        return True
    if re.fullmatch(r"\d+\.", normalized) or re.fullmatch(r"\d+", normalized):
        return True
    return False


def _is_noise_line(line: str) -> bool:
    lower = line.lower()
    if len(lower) < 3:
        return True
    if re.fullmatch(r"\d+", lower):
        return True
    if "doi:" in lower or lower.startswith("http"):
        return True
    if lower.startswith("downloaded from"):
        return True
    if any(token in lower for token in ["copyright", "permissions", "supplement", "appendix", "disclosures", "author affiliations"]):
        return True
    if re.search(r"\b(j am coll cardiol|circulation|aha/acc|american heart association|american college of cardiology)\b", lower):
        return True
    if re.search(r"\b(representative|writing committee|task force|chair|vice chair)\b", lower) and "recommended" not in lower and "should" not in lower:
        return True
    if _looks_like_heading_or_title(line):
        return True
    return False


def _extract_pdf_recommendations(
    path: Path,
    max_candidates: int = DEFAULT_MAX_GUIDELINE_RECOMMENDATIONS,
) -> list[ExtractedRecommendation]:
    engine = EvidenceObjectExtractionEngine(
        finalize_statement=_finalize_recommendation_statement,
        is_recommendation_like=_is_recommendation_like,
        looks_like_nonclinical_sentence=_looks_like_nonclinical_sentence,
        normalize_cor_token=_normalize_cor_token,
        normalize_loe_token=_normalize_loe_token,
    )
    return engine.extract_pdf_recommendations(path, max_candidates=max_candidates)


def _normalize_cor_token(text: str) -> str | None:
    token = re.sub(r"\s+", " ", text).strip(" ,.;").upper()
    token = re.sub(r"^(?:COR|CLASS)\s+", "", token)
    token = token.replace("NO  BENEFIT", "NO BENEFIT")
    roman_map = {
        "I": "1",
        "IIA": "2A",
        "II B": "2B",
        "IIB": "2B",
        "III": "3",
        "III: HARM": "3: HARM",
        "III:HARM": "3: HARM",
        "III: NO BENEFIT": "3: NO BENEFIT",
        "III:NO BENEFIT": "3: NO BENEFIT",
    }
    token = roman_map.get(token, token)
    if token in {"1", "2A", "2B", "3"}:
        return token
    if token in {"3: HARM", "3:HARM"}:
        return "3: HARM"
    if token in {"3: NO BENEFIT", "3:NO BENEFIT"}:
        return "3: NO BENEFIT"
    return None


def _normalize_loe_token(text: str) -> str | None:
    token = re.sub(r"\s+", "", text).strip(" ,.;").upper()
    token = re.sub(r"^(?:LOE|LEVEL(?:OFEVIDENCE)?)", "", token)
    valid = {"A", "B-R", "B-NR", "B", "C-LD", "C-EO", "C-LM", "C"}
    return token if token in valid else None


def _extract_line_structured_guideline_recommendations(
    pages: list[tuple[int, list[str]]],
    max_candidates: int = DEFAULT_MAX_GUIDELINE_RECOMMENDATIONS,
) -> list[ExtractedRecommendation]:
    recommendations: list[ExtractedRecommendation] = []
    seen: set[str] = set()

    for page_number, lines in pages:
        if not any("recommendation" in line.lower() for line in lines):
            continue

        in_recommendation_block = False
        index = 0
        while index < len(lines):
            line = lines[index]
            lower = line.lower()
            if lower.startswith("recommendation for ") or lower.startswith("recommendations for "):
                in_recommendation_block = True
                index += 1
                continue
            if lower in {"cor", "loe", "recommendation", "recommendations"}:
                in_recommendation_block = True
                index += 1
                continue
            if lower.startswith("synopsis") or lower.startswith("recommendation-specific"):
                in_recommendation_block = False
                index += 1
                continue
            if not in_recommendation_block:
                index += 1
                continue

            cor = _normalize_cor_token(line)
            consumed = 1
            if cor is None and index + 1 < len(lines):
                cor = _normalize_cor_token(f"{line} {lines[index + 1]}")
                if cor is not None:
                    consumed = 2
            if cor is None:
                index += 1
                continue

            index += consumed
            if index >= len(lines):
                break

            loe = _normalize_loe_token(lines[index])
            if loe is None and index + 1 < len(lines):
                loe = _normalize_loe_token(f"{lines[index]} {lines[index + 1]}")
                if loe is not None:
                    index += 1
            if loe is None:
                continue
            index += 1
            if index >= len(lines):
                break

            number_match = re.match(r"(?P<num>\d+)\.\s*(?P<body>.*)", lines[index])
            if number_match is None:
                continue

            body_parts = [number_match.group("body").strip()]
            index += 1
            while index < len(lines):
                next_line = lines[index]
                next_lower = next_line.lower()
                if next_lower.startswith("synopsis") or next_lower.startswith("recommendation-specific"):
                    break
                next_cor = _normalize_cor_token(next_line)
                if next_cor is None and index + 1 < len(lines):
                    next_cor = _normalize_cor_token(f"{next_line} {lines[index + 1]}")
                if next_cor is not None:
                    break
                if re.match(r"^\d+\.\d+", next_line):
                    break
                body_parts.append(next_line.strip())
                index += 1

            statement_text = _finalize_recommendation_statement(" ".join(part for part in body_parts if part))
            if len(statement_text) < 24 or _looks_like_nonclinical_sentence(statement_text):
                continue
            if not _is_recommendation_like(statement_text):
                continue

            normalized = re.sub(r"[^a-z0-9]+", "", statement_text.lower())
            if normalized in seen:
                continue
            seen.add(normalized)
            recommendations.append(
                ExtractedRecommendation(
                    statement_text=statement_text,
                    source_excerpt=statement_text[:280],
                    source_locator=f"p.{page_number} COR {cor} LOE {loe}",
                    recommendation_class=cor,
                    level_of_evidence=loe,
                )
            )
            if len(recommendations) >= max_candidates:
                return recommendations

        if len(recommendations) >= max_candidates:
            return recommendations

    return recommendations


def _extract_numbered_guideline_recommendations(
    paragraphs: list[tuple[int, str]],
    max_candidates: int = DEFAULT_MAX_GUIDELINE_RECOMMENDATIONS,
) -> list[ExtractedRecommendation]:
    recommendations: list[ExtractedRecommendation] = []
    seen: set[str] = set()
    cor_pattern = re.compile(r"(1|2a|2b|3(?::\s*(?:harm|no\s+benefit))?)", re.IGNORECASE)
    loe_pattern = re.compile(r"(A|B-NR|B-R|B|C-LD|C-EO|C-LM|C)", re.IGNORECASE)

    for page_number, text in paragraphs:
        if "Recommendation" not in text:
            continue
        for match in re.finditer(
            r"(?P<num>\d+)\.\s+(?P<text>.+?)(?=(?:\|\s*\d+\.\s+)|(?:\|\s*Recommendation-Specific)|(?:\|\s*Referenced studies)|$)",
            text,
            re.IGNORECASE,
        ):
            statement_text = _finalize_recommendation_statement(match.group("text"))
            if len(statement_text) < 24 or _looks_like_nonclinical_sentence(statement_text):
                continue
            if not _is_recommendation_like(statement_text):
                continue
            normalized = re.sub(r"[^a-z0-9]+", "", statement_text.lower())
            if normalized in seen:
                continue
            seen.add(normalized)

            prefix = text[max(0, match.start() - 32): match.start()]
            cor_match = list(cor_pattern.finditer(prefix))
            loe_match = list(loe_pattern.finditer(prefix))
            cor = cor_match[-1].group(1).upper() if cor_match else None
            loe = loe_match[-1].group(1).upper() if loe_match else None

            recommendations.append(
                ExtractedRecommendation(
                    statement_text=statement_text,
                    source_excerpt=statement_text[:280],
                    source_locator=f"p.{page_number}" + (f" COR {cor}" if cor else "") + (f" LOE {loe}" if loe else ""),
                    recommendation_class=cor,
                    level_of_evidence=loe,
                )
            )
            if len(recommendations) >= max_candidates:
                return recommendations

    return recommendations


def _extract_structured_guideline_recommendations(
    paragraphs: list[tuple[int, str]],
    max_candidates: int = DEFAULT_MAX_GUIDELINE_RECOMMENDATIONS,
) -> list[ExtractedRecommendation]:
    recommendations: list[ExtractedRecommendation] = []
    seen: set[str] = set()
    cor_pattern = re.compile(r"^(1|2a|2b|3(?::\s*(?:harm|no\s+benefit))?)$", re.IGNORECASE)
    loe_pattern = re.compile(r"^(A|B-NR|B-R|B|C-LD|C-EO|C-LM|C)$", re.IGNORECASE)
    recommendation_token_pattern = re.compile(r"^\d+\.\s+")

    for page_number, text in paragraphs:
        page_joined = re.sub(r"\s+", " ", text).strip()
        if "COR" not in page_joined or "LOE" not in page_joined or "Recommendation" not in page_joined:
            continue
        tokens = [token.strip() for token in page_joined.split("|") if token.strip()]
        index = 0
        while index < len(tokens) - 2:
            cor = tokens[index]
            loe = tokens[index + 1]
            head = tokens[index + 2]
            if not (cor_pattern.match(cor) and loe_pattern.match(loe) and recommendation_token_pattern.match(head)):
                index += 1
                continue

            body_parts = [re.sub(r"^\d+\.\s*", "", head).strip()]
            cursor = index + 3
            while cursor < len(tokens):
                token = tokens[cursor]
                if cursor < len(tokens) - 2 and cor_pattern.match(tokens[cursor]) and loe_pattern.match(tokens[cursor + 1]) and recommendation_token_pattern.match(tokens[cursor + 2]):
                    break
                if re.search(r"Recommendation-Specific (?:Supportive|Supporting) Text", token, re.IGNORECASE):
                    break
                if re.search(r"Referenced studies that support the recommendation", token, re.IGNORECASE):
                    cursor += 1
                    continue
                if re.search(r"^[A-Z][A-Za-z\s]{4,}Recommendation(?:s)?$", token):
                    break
                body_parts.append(token)
                cursor += 1

            statement_text = _finalize_recommendation_statement(" ".join(body_parts))
            if len(statement_text) < 24 or _looks_like_nonclinical_sentence(statement_text):
                index = cursor
                continue
            if not _is_recommendation_like(statement_text):
                index = cursor
                continue
            normalized = re.sub(r"[^a-z0-9]+", "", statement_text.lower())
            if normalized not in seen:
                seen.add(normalized)
                recommendations.append(
                    ExtractedRecommendation(
                        statement_text=statement_text,
                        source_excerpt=statement_text[:280],
                        source_locator=f"p.{page_number} COR {cor.upper()} LOE {loe.upper()}",
                        recommendation_class=cor.upper(),
                        level_of_evidence=loe.upper(),
                    )
                )
                if len(recommendations) >= max_candidates:
                    return recommendations
            index = cursor

    if recommendations:
        return recommendations

    page_chunks = [f"<<PAGE:{page}>> {re.sub(r'\\s+', ' ', text).strip()}" for page, text in paragraphs]
    combined = " ".join(page_chunks)
    pattern = re.compile(
        r"(?P<cor>1|2a|2b|3(?::\s*(?:harm|no\s+benefit))?)\s+"
        r"(?P<loe>A|B-NR|B-R|B|C-LD|C-EO|C-LM|C)\s+"
        r"(?P<num>\d+)\.\s+"
        r"(?P<text>.+?)"
        r"(?=(?:\s+(?:1|2a|2b|3(?::\s*(?:harm|no\s+benefit))?)\s+(?:A|B-NR|B-R|B|C-LD|C-EO|C-LM|C)\s+\d+\.\s)|"
        r"(?:\s+Synopsis\b)|"
        r"(?:\s+Recommendation-Specific\b)|"
        r"(?:\s+\d+\.\d+(?:\.\d+)?\.\s+[A-Z])|"
        r"(?:\s+[A-Z][A-Za-z\s]+Recommendation(?:s)?\b)|"
        r"$)",
        re.IGNORECASE,
    )
    for match in pattern.finditer(combined):
        raw_text = match.group("text")
        locator_pages = re.findall(r"<<PAGE:(\d+)>>", combined[: match.start("text") + len(raw_text)])
        start_page = locator_pages[-1] if locator_pages else None
        end_pages = re.findall(r"<<PAGE:(\d+)>>", raw_text)
        end_page = end_pages[-1] if end_pages else start_page
        text = re.sub(r"<<PAGE:\d+>>", " ", raw_text)
        text = _finalize_recommendation_statement(text)
        if len(text) < 24 or _looks_like_nonclinical_sentence(text):
            continue
        if not _is_recommendation_like(text):
            continue
        normalized = re.sub(r"[^a-z0-9]+", "", text.lower())
        if normalized in seen:
            continue
        seen.add(normalized)
        locator = f"p.{start_page}" if start_page and start_page == end_page else f"p.{start_page}-{end_page}" if start_page and end_page else None
        recommendations.append(
            ExtractedRecommendation(
                statement_text=text,
                source_excerpt=text[:280],
                source_locator=locator,
                recommendation_class=match.group("cor").upper(),
                level_of_evidence=match.group("loe").upper(),
            )
        )
        if len(recommendations) >= max_candidates:
            break
    return recommendations


def _looks_like_nonclinical_sentence(text: str) -> bool:
    lower = text.lower()
    if _looks_like_heading_or_title(text):
        return True
    if any(token in lower for token in ["representative", "committee", "chair", "vice chair", "writing group"]):
        return True
    if lower.startswith("the online version") or lower.startswith("this article"):
        return True
    if lower.startswith("there are no ") or lower.startswith("observational studies") or lower.startswith("the benefit of"):
        return True
    if lower.startswith("the sts risk score") or lower.startswith("the multidisciplinary heart team"):
        return True
    if lower.startswith("multiple rcts") or lower.startswith("with the exception of") or lower.startswith("an earlier meta-analysis"):
        return True
    return False


def _infer_evidence_strength(document_type: str, statement_text: str) -> str:
    normalized_type = document_type.lower()
    normalized_text = statement_text.lower()
    if "guideline" in normalized_type:
        return "high"
    if "meta" in normalized_type or "systematic" in normalized_type:
        return "high"
    if "trial" in normalized_type:
        return "moderate"
    if any(token in normalized_text for token in ("recommend", "should", "must")):
        return "moderate"
    return "emerging"


def _classification_weight(
    document: SourceDocument,
    statement_text: str,
    recommendation_class: str | None = None,
    level_of_evidence: str | None = None,
) -> tuple[str, float, str]:
    normalized_type = document.document_type.lower()
    specialty = (document.specialty or "").lower()
    group = (document.document_group or "").lower()
    score = 0.45
    rationale: list[str] = []

    if "guideline" in normalized_type:
        score += 0.35
        rationale.append("guideline")
    elif "meta-analysis" in normalized_type or "systematic-review" in normalized_type:
        score += 0.3
        rationale.append("synthesis")
    elif "trial" in normalized_type or "registry" in normalized_type:
        score += 0.2
        rationale.append("study-design")
    elif "operative-note" in normalized_type or "surgical-report" in normalized_type:
        score -= 0.1
        rationale.append("local-operative-context")

    if specialty in {"cirugia cardiovascular", "cardiologia", "cardiologia intervencionista"}:
        score += 0.1
        rationale.append("specialty-aligned")
    if any(token in group for token in ["acc", "aha", "scai", "esc", "sts"]):
        score += 0.08
        rationale.append("society-issued")
    if _is_recommendation_like(statement_text):
        score += 0.07
        rationale.append("recommendation-language")
    if recommendation_class:
        normalized_cor = recommendation_class.strip().lower()
        if normalized_cor == "1":
            score += 0.12
            rationale.append("cor-1")
        elif normalized_cor == "2a":
            score += 0.08
            rationale.append("cor-2a")
        elif normalized_cor == "2b":
            score += 0.04
            rationale.append("cor-2b")
        elif normalized_cor.startswith("3"):
            score += 0.02
            rationale.append("cor-3")
    if level_of_evidence:
        normalized_loe = level_of_evidence.strip().upper()
        if normalized_loe == "A":
            score += 0.1
            rationale.append("loe-a")
        elif normalized_loe in {"B-R", "B-NR", "B"}:
            score += 0.06
            rationale.append("loe-b")
        elif normalized_loe in {"C-LD", "C-EO", "C-LM", "C"}:
            score += 0.02
            rationale.append("loe-c")

    score = max(0.05, min(1.0, round(score, 2)))
    label = "critical" if score >= 0.85 else "high" if score >= 0.7 else "moderate" if score >= 0.5 else "emerging"
    return label, score, ", ".join(rationale) or "baseline"


def _normalize_temporal_expression(value: str) -> str:
    normalized = re.sub(r"\s+", " ", value).strip(" ,.;")
    normalized = re.sub(r"(?i)\b(\d+)\s+to\s+(\d+)\s+hour\b", r"\1 to \2 hours", normalized)
    normalized = re.sub(r"(?i)\b(\d+)\s+to\s+(\d+)\s+day\b", r"\1 to \2 days", normalized)
    normalized = re.sub(r"(?i)\b(\d+)\s+to\s+(\d+)\s+week\b", r"\1 to \2 weeks", normalized)
    normalized = re.sub(r"(?i)\b(\d+)\s+to\s+(\d+)\s+month\b", r"\1 to \2 months", normalized)
    normalized = re.sub(r"(?i)\b(\d+)\s+hour\b", r"\1 hours", normalized)
    normalized = re.sub(r"(?i)\b(\d+)\s+day\b", r"\1 days", normalized)
    normalized = re.sub(r"(?i)\b(\d+)\s+week\b", r"\1 weeks", normalized)
    normalized = re.sub(r"(?i)\b(\d+)\s+month\b", r"\1 months", normalized)
    return normalized


def _extract_temporal_qualifiers(statement_text: str) -> list[str]:
    qualifiers: list[str] = []
    patterns = [
        r"within\s+\d+\s+(?:hour|hours|day|days|week|weeks|month|months)",
        r"\b(?:<|>|<=|>=)\s*\d+\s+(?:hour|hours|day|days|week|weeks|month|months)",
        r"\b\d+\s+to\s+\d+\s+(?:hour|hours|day|days|week|weeks|month|months)",
        r"before\s+hospital\s+discharge",
        r"after\s+successful\s+primary\s+pci",
        r"after\s+failed\s+primary\s+pci",
        r"irrespective\s+of\s+the\s+time\s+delay\s+from\s+mi\s+onset",
        r"for\s*<\s*\d+\s+hours",
        r"for\s*>\s*\d+\s+minutes",
        r"acute|urgent|emergency|elective|stable|chronic",
    ]
    lowered = statement_text.lower()
    for pattern in patterns:
        for match in re.finditer(pattern, lowered, re.IGNORECASE):
            qualifier = _normalize_temporal_expression(statement_text[match.start():match.end()].strip(" ,.;"))
            if qualifier and qualifier not in qualifiers:
                qualifiers.append(qualifier)
    return qualifiers


def _extract_clinical_temporality(statement_text: str) -> str | None:
    lowered = statement_text.lower()
    mapping = [
        ("emergency", "emergency"),
        ("urgent", "urgent"),
        ("before hospital discharge", "before-discharge"),
        ("within 24 hours", "within-24-hours"),
        ("acute", "acute"),
        ("stable", "chronic-stable"),
        ("chronic", "chronic"),
        ("elective", "elective"),
    ]
    for token, label in mapping:
        if token in lowered:
            return label
    return None


def _extract_care_setting(statement_text: str) -> str | None:
    lowered = statement_text.lower()
    mapping = [
        ("stemi", "acute-mi"),
        ("nste-acs", "nste-acs"),
        ("sihd", "stable-ischemic-heart-disease"),
        ("cardiogenic shock", "critical-care"),
        ("hospital discharge", "inpatient"),
        ("pregnant", "special-population"),
    ]
    for token, label in mapping:
        if token in lowered:
            return label
    return None


def _extract_patient_intro_clause(statement_text: str) -> str | None:
    match = re.search(
        r"^\s*(?:in|for)\s+(?P<prefix>(?:(?:acute|chronic|stable|unstable|symptomatic|asymptomatic|pregnant|elderly|younger)\s+){0,3})patients?\s+(?P<clause>.+?)(?:,\s+|(?=\s+(?:cabg|pci|coronary\s+revascularization|surgical\s+revascularization|revascularization|the\s+use\s+of|an\s+assessment\s+of|a\s+multidisciplinary\s+heart\s+team\s+approach)\b))",
        statement_text,
        re.IGNORECASE,
    )
    if not match:
        return None
    clause = f"{match.group('prefix') or ''}{match.group('clause')}".strip(" ,.;")
    clause = re.sub(r"\s+", " ", clause)
    return clause or None


def _trim_population_phrase(clause: str) -> str | None:
    population = clause.strip(" ,.;")
    adjective_with_match = re.match(
        r"^(?P<prefix>(?:(?:acute|chronic|stable|unstable|symptomatic|asymptomatic|pregnant|elderly|younger)\s+)+)with\s+(?P<rest>.+)$",
        population,
        re.IGNORECASE,
    )
    if adjective_with_match:
        rest = adjective_with_match.group("rest").strip(" ,.;")
        if re.match(r"^[A-Z][A-Z0-9\-]+(?:\b|[\s,.;])", rest):
            population = rest
        else:
            population = adjective_with_match.group("prefix").strip(" ,.;")
    population = re.sub(r"^\s*(?:who|with)\s+", "", population, flags=re.IGNORECASE).strip(" ,.;")
    split_patterns = [
        r"\s+who\s+(?:have|are)\b",
        r"\s+with\b",
        r"\s+for\s+<\d+\s+\w+",
        r"\s+for\s+>\d+\s+\w+",
        r"\s+without\b",
        r"\s+in\s+the\s+absence\s+of\b",
    ]
    cut_positions = [match.start() for pattern in split_patterns for match in [re.search(pattern, population, re.IGNORECASE)] if match]
    if cut_positions:
        population = population[: min(cut_positions)].strip(" ,.;")
    population = re.sub(r"\s+", " ", population)
    return population or None


def _extract_population(statement_text: str) -> str | None:
    clause = _extract_patient_intro_clause(statement_text)
    if not clause:
        return None
    return _trim_population_phrase(clause)


def _extract_intervention(statement_text: str) -> str | None:
    match = re.search(
        r"(?:,\s+|^)(?P<intervention>(?:cabg|pci|surgical revascularization|revascularization|the use of [^,.;]+|an assessment of [^,.;]+|a multidisciplinary heart team approach)[^,.;]*?)\s+(?:should|is|are|may|can)\b",
        statement_text,
        re.IGNORECASE,
    )
    if match:
        return match.group("intervention").strip(" ,.;")
    match = re.search(
        r",\s+(?P<intervention>coronary revascularization|cabg|pci|surgical revascularization|revascularization)\s+(?:should|is|are|may|can)\b",
        statement_text,
        re.IGNORECASE,
    )
    if match:
        return match.group("intervention").strip(" ,.;")
    if statement_text.lower().startswith("the use of "):
        return statement_text.split(" is ", 1)[0].strip(" ,.;")
    return None


def _extract_comparator(statement_text: str) -> str | None:
    match = re.search(r"\b(?:versus|over|in preference to|compared with)\s+([^.;]+)", statement_text, re.IGNORECASE)
    if match:
        return match.group(1).strip(" ,.;")
    return None


def _extract_outcome(statement_text: str) -> str | None:
    match = re.search(r"\bto\s+(improve|reduce|lower|guide|stratify)\s+([^.;]+)", statement_text, re.IGNORECASE)
    if match:
        return f"{match.group(1).lower()} {match.group(2).strip(' ,.;')}"
    return None


def _normalize_condition_value(
    value: str,
    *,
    population: str | None,
    disease: str | None,
    clinical_state: str | None,
) -> str | None:
    normalized = re.sub(r"\s+", " ", value).strip(" ,.;")
    normalized = re.sub(r"\band\s+are\s+without\s+.+$", "", normalized, flags=re.IGNORECASE).strip(" ,.;")
    normalized = re.sub(r"\bwithout\s+.+$", "", normalized, flags=re.IGNORECASE).strip(" ,.;")
    normalized = re.sub(r"\band\s+are\b$", "", normalized, flags=re.IGNORECASE).strip(" ,.;")
    normalized = re.sub(r"^with\s+", "", normalized, flags=re.IGNORECASE).strip(" ,.;")
    if clinical_state:
        normalized = re.sub(rf"^{re.escape(clinical_state)}\s+", "", normalized, flags=re.IGNORECASE).strip(" ,.;")
    if disease:
        normalized = re.sub(rf"^with\s+{re.escape(disease)}\s+who\s+(?:have|are)\s+", "", normalized, flags=re.IGNORECASE).strip(" ,.;")
        normalized = re.sub(rf"^with\s+{re.escape(disease)}\s+", "", normalized, flags=re.IGNORECASE).strip(" ,.;")
        normalized = re.sub(rf"^{re.escape(disease)}\s+who\s+(?:have|are)\s+", "", normalized, flags=re.IGNORECASE).strip(" ,.;")
        normalized = re.sub(rf"^{re.escape(disease)}\s+and\s+", "", normalized, flags=re.IGNORECASE).strip(" ,.;")
    if population and normalized.lower().startswith(population.lower()):
        normalized = normalized[len(population):].strip(" ,.;")
        normalized = re.sub(r"^(?:who\s+(?:have|are)|with)\s+", "", normalized, flags=re.IGNORECASE).strip(" ,.;")
    normalized = re.sub(r"^with\s+", "", normalized, flags=re.IGNORECASE).strip(" ,.;")
    if normalized.lower().endswith(" after") and "after symptom onset" in value.lower():
        normalized = f"{normalized} symptom onset"
    normalized = re.sub(r"\b(?:after|before|following)\b$", "", normalized, flags=re.IGNORECASE).strip(" ,.;")
    normalized = re.sub(r"\s+", " ", normalized).strip(" ,.;")
    return normalized or None


def _extract_conditions(statement_text: str) -> list[str]:
    conditions: list[str] = []
    population = _extract_population(statement_text)
    disease = _extract_disease(statement_text)
    clinical_state = _extract_clinical_state(statement_text)
    intro_clause = _extract_patient_intro_clause(statement_text)
    if intro_clause:
        lowered = intro_clause.lower()
        exclusion_markers = [" without ", " in the absence of ", " except ", " excluding "]
        split_index = min([lowered.find(marker) for marker in exclusion_markers if marker in lowered], default=-1)
        condition_clause = intro_clause[:split_index].strip(" ,.;") if split_index >= 0 else intro_clause
        if condition_clause:
            condition_clause = re.sub(r"^\s*(?:who|with)\s+", "", condition_clause, flags=re.IGNORECASE).strip(" ,.;")
            condition_clause = re.sub(r"\s+and\s+are\s*$", "", condition_clause, flags=re.IGNORECASE).strip(" ,.;")
            condition_clause = _normalize_condition_value(
                condition_clause,
                population=population,
                disease=disease,
                clinical_state=clinical_state,
            )
            if condition_clause and condition_clause != population and condition_clause not in conditions:
                conditions.append(condition_clause)
    for match in re.finditer(r"\b(?:when|following|for whom)\s+([^,.;]+)", statement_text, re.IGNORECASE):
        value = _normalize_condition_value(
            match.group(1).strip(" ,.;"),
            population=population,
            disease=disease,
            clinical_state=clinical_state,
        )
        if value == "symptom onset":
            continue
        if value and value not in conditions:
            conditions.append(value)
    return conditions[:8]


def _extract_exclusions(statement_text: str) -> list[str]:
    exclusions: list[str] = []
    for match in re.finditer(r"\b(?:without|excluding|except|in the absence of)\s+([^,.;]+)", statement_text, re.IGNORECASE):
        value = match.group(1).strip(" ,.;")
        value = re.sub(r"\s+", " ", value)
        if value and value not in exclusions:
            exclusions.append(value)
    return exclusions[:6]


def _extract_clinical_state(statement_text: str) -> str | None:
    lowered = statement_text.lower()
    states = [
        "asymptomatic stable",
        "symptomatic",
        "asymptomatic",
        "stable",
        "unstable",
        "cardiogenic shock",
        "hemodynamic instability",
        "ongoing ischemia",
        "refractory angina",
        "acute coronary syndrome",
    ]
    for state in states:
        if state in lowered:
            return state
    return None


def _detect_document_family(document: SourceDocument) -> str:
    normalized_type = (document.document_type or "").lower()
    normalized_group = (document.document_group or "").lower()
    if "guideline" in normalized_type:
        if any(token in normalized_group for token in ("acc", "aha", "scai")):
            return "guideline_acc_aha_scai"
        if "esc" in normalized_group:
            return "guideline_esc"
        return "guideline_generic"
    if any(token in normalized_type for token in ("meta-analysis", "systematic-review")):
        return "meta_analysis"
    if any(token in normalized_type for token in ("randomized", "trial", "rct")):
        return "rct_article"
    if "operative" in normalized_type:
        return "operative_note"
    if "protocol" in normalized_type:
        return "local_protocol"
    return "general_clinical_document"


def _extract_disease(statement_text: str) -> str | None:
    patterns = [
        r"\b(STEMI|NSTE-ACS|SIHD|CAD|left main disease|multivessel CAD|angina)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, statement_text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def _extract_severity(statement_text: str) -> str | None:
    lowered = statement_text.lower()
    candidates = [
        "significant",
        "intermediate",
        "severe",
        "totally occluded",
        "multivessel",
        "high risk",
        "low risk",
        "intermediate risk",
    ]
    for candidate in candidates:
        if candidate in lowered:
            return candidate
    return None


def _extract_time_window(statement_text: str, temporal_qualifiers: list[str]) -> str | None:
    for qualifier in temporal_qualifiers:
        if re.search(r"\d+\s*(?:to\s+\d+)?\s*(?:hour|hours|day|days|week|weeks|month|months)", qualifier, re.IGNORECASE):
            return qualifier
    match = re.search(
        r"((?:<|>|<=|>=)\s*\d+\s+(?:hour|hours|day|days|week|weeks|month|months))",
        statement_text,
        re.IGNORECASE,
    )
    if match:
        return _normalize_temporal_expression(re.sub(r"\s+", " ", match.group(1)).strip(" ,.;"))
    match = re.search(
        r"(\d+\s+to\s+\d+\s+(?:hour|hours|day|days|week|weeks|month|months))",
        statement_text,
        re.IGNORECASE,
    )
    if match:
        return _normalize_temporal_expression(re.sub(r"\s+", " ", match.group(1)).strip(" ,.;"))
    return None


def _extract_event_anchor(statement_text: str) -> str | None:
    patterns = [
        r"after\s+(symptom onset)",
        r"from\s+(mi onset)",
        r"after\s+(successful primary pci)",
        r"after\s+(failed primary pci)",
        r"before\s+(hospital discharge)",
        r"after\s+(fibrinolytic therapy)",
    ]
    for pattern in patterns:
        match = re.search(pattern, statement_text, re.IGNORECASE)
        if match:
            return re.sub(r"\s+", " ", match.group(1)).strip(" ,.;")
    return None


def _extract_numeric_thresholds(statement_text: str) -> list[NumericThreshold]:
    thresholds: list[NumericThreshold] = []
    seen: set[str] = set()
    for match in re.finditer(
        r"\b(?P<metric>FFR|iFR|SYNTAX score|ejection fraction|LVEF)\s*(?P<comparator><=|>=|<|>)\s*(?P<value>\d+(?:\.\d+)?)\b",
        statement_text,
        re.IGNORECASE,
    ):
        label = re.sub(r"\s+", " ", match.group(0)).strip()
        key = label.lower()
        if key in seen:
            continue
        seen.add(key)
        thresholds.append(
            NumericThreshold(
                label=label,
                metric=match.group("metric"),
                comparator=match.group("comparator"),
                value=match.group("value"),
                unit=None,
            )
        )
    for match in re.finditer(
        r"\b(?P<comparator><=|>=|<|>)\s*(?P<value>\d+)%\b",
        statement_text,
        re.IGNORECASE,
    ):
        label = re.sub(r"\s+", " ", match.group(0)).strip()
        key = label.lower()
        if key in seen:
            continue
        seen.add(key)
        thresholds.append(
            NumericThreshold(
                label=label,
                metric="percentage-threshold",
                comparator=match.group("comparator"),
                value=match.group("value"),
                unit="percent",
            )
        )
    return thresholds


def _extract_care_phase(statement_text: str) -> str | None:
    lowered = statement_text.lower()
    mapping = [
        ("before hospital discharge", "pre-discharge"),
        ("after failed primary pci", "post-failed-primary-pci"),
        ("after successful primary pci", "post-primary-pci"),
        ("preprocedural", "pre-procedural"),
        ("postoperative", "post-operative"),
        ("intraoperative", "intra-operative"),
    ]
    for token, label in mapping:
        if token in lowered:
            return label
    return None


def _build_clinical_entities(
    statement_text: str,
    *,
    population: str | None,
    intervention: str | None,
    comparator: str | None,
    outcome: str | None,
    conditions: list[str],
    exclusions: list[str],
    temporal_qualifiers: list[str],
    numeric_thresholds: list[NumericThreshold],
) -> list[ClinicalEntity]:
    entities: list[ClinicalEntity] = []
    seen: set[tuple[str, str]] = set()

    def add_entity(label: str | None, entity_type: str) -> None:
        if not label:
            return
        normalized = re.sub(r"\s+", " ", label).strip(" ,.;")
        key = (entity_type, normalized.lower())
        if not normalized or key in seen:
            return
        seen.add(key)
        entities.append(
            ClinicalEntity(
                label=normalized,
                entity_type=entity_type,
                normalized_term=normalized.lower(),
                source_text=normalized,
            )
        )

    add_entity(population, "population")
    add_entity(intervention, "intervention")
    add_entity(comparator, "comparator")
    add_entity(outcome, "outcome")
    for value in conditions:
        add_entity(value, "condition")
    for value in exclusions:
        add_entity(value, "exclusion")
    for value in temporal_qualifiers:
        add_entity(value, "temporal_qualifier")
    for threshold in numeric_thresholds:
        add_entity(threshold.label, "numeric_threshold")

    if not entities:
        add_entity(statement_text[:120], "statement")
    return entities


def _build_trigger_constraints(
    *,
    population: str | None,
    clinical_state: str | None,
    disease: str | None,
    time_window: str | None,
    event_anchor: str | None,
    exclusions: list[str],
    conditions: list[str],
    numeric_thresholds: list[NumericThreshold],
) -> list[TriggerConstraint]:
    constraints: list[TriggerConstraint] = []
    seen: set[tuple[str, str, str, str]] = set()

    def add_constraint(
        constraint_type: str,
        label: str | None,
        *,
        operator: str = "eq",
        value: str | None = None,
        unit: str | None = None,
        source: str | None = None,
    ) -> None:
        if not label:
            return
        normalized_label = re.sub(r"\s+", " ", label).strip(" ,.;")
        normalized_value = re.sub(r"\s+", " ", value).strip(" ,.;") if value else normalized_label
        key = (constraint_type, operator, normalized_label.lower(), (normalized_value or "").lower())
        if not normalized_label or key in seen:
            return
        seen.add(key)
        constraints.append(
            TriggerConstraint(
                constraint_type=constraint_type,
                label=normalized_label,
                operator=operator,
                value=normalized_value,
                unit=unit,
                source=source,
            )
        )

    add_constraint("population", population, source="population")
    add_constraint("clinical_state", clinical_state, source="clinical_state")
    add_constraint("disease", disease, source="disease")
    add_constraint("time_window", time_window, operator="within", source="time_window")
    add_constraint("event_anchor", event_anchor, source="event_anchor")

    for exclusion in exclusions:
        add_constraint("exclusion", exclusion, operator="absent", source="exclusions")
    for condition in conditions[:3]:
        add_constraint("condition", condition, operator="contains", source="conditions")
    for threshold in numeric_thresholds:
        add_constraint(
            "numeric_threshold",
            threshold.label,
            operator=threshold.comparator or "eq",
            value=threshold.value or threshold.label,
            unit=threshold.unit,
            source=threshold.metric,
        )

    return constraints


def _build_execution_model(
    statement_text: str,
    *,
    population: str | None,
    clinical_state: str | None,
    disease: str | None,
    time_window: str | None,
    event_anchor: str | None,
    intervention: str | None,
    outcome: str | None,
    conditions: list[str],
    exclusions: list[str],
    temporal_qualifiers: list[str],
    numeric_thresholds: list[NumericThreshold],
) -> RecommendationExecutionModel:
    lowered = statement_text.lower()
    modality = None
    if "should not be performed" in lowered:
        modality = "should not be performed"
    elif "should be performed" in lowered:
        modality = "should be performed"
    elif "is recommended" in lowered:
        modality = "is recommended"
    elif "is indicated" in lowered:
        modality = "is indicated"
    elif "may be considered" in lowered:
        modality = "may be considered"
    elif "is reasonable" in lowered:
        modality = "is reasonable"

    action = intervention
    if modality and intervention:
        action = f"{intervention} {modality}"
    elif modality:
        action = modality

    prerequisites = list(dict.fromkeys([value for value in temporal_qualifiers if value] + conditions[:2]))
    trigger_parts = [part for part in [population] + conditions[:2] if part]
    trigger = "; ".join(dict.fromkeys(trigger_parts)) if trigger_parts else population
    trigger_constraints = _build_trigger_constraints(
        population=population,
        clinical_state=clinical_state,
        disease=disease,
        time_window=time_window,
        event_anchor=event_anchor,
        exclusions=exclusions,
        conditions=conditions,
        numeric_thresholds=numeric_thresholds,
    )

    return RecommendationExecutionModel(
        trigger=trigger,
        trigger_model=RecommendationExecutionTrigger(
            population=population,
            clinical_state=clinical_state,
            disease=disease,
            time_constraint=time_window,
            event_anchor=event_anchor,
            exclusions=list(dict.fromkeys(exclusions)),
            numeric_constraints=numeric_thresholds,
            qualifiers=conditions[:3],
            constraints=trigger_constraints,
        ),
        action=action,
        contraindications=list(dict.fromkeys(exclusions)),
        prerequisites=prerequisites[:4],
        intended_outcome=outcome,
    )


def _score_recommendation_extraction(
    statement_text: str,
    *,
    recommendation_class: str | None,
    level_of_evidence: str | None,
    population: str | None,
    intervention: str | None,
    source_locator: str | None,
    temporal_qualifiers: list[str],
    clinical_entities: list[ClinicalEntity],
) -> tuple[float, list[str]]:
    score = 0.35
    rationale: list[str] = []
    if _is_recommendation_like(statement_text):
        score += 0.15
        rationale.append("recommendation-language")
    if recommendation_class:
        score += 0.12
        rationale.append(f"cor:{recommendation_class.lower()}")
    if level_of_evidence:
        score += 0.08
        rationale.append(f"loe:{level_of_evidence.lower()}")
    if population:
        score += 0.08
        rationale.append("population-extracted")
    if intervention:
        score += 0.08
        rationale.append("intervention-extracted")
    if source_locator:
        score += 0.04
        rationale.append("source-locator")
    if temporal_qualifiers:
        score += 0.04
        rationale.append("temporal-qualifiers")
    if len(clinical_entities) >= 3:
        score += 0.04
        rationale.append("clinical-entities")
    return (min(round(score, 3), 0.99), rationale)


def _infer_clinical_topic(
    *,
    disease: str | None,
    intervention: str | None,
    recommendation_text: str,
) -> str:
    lowered = " ".join(filter(None, [disease, intervention, recommendation_text])).lower()
    if "heart team" in lowered:
        return "Heart Team"
    if "sihd" in lowered or "stable ischemic" in lowered:
        return "SIHD"
    if "stemi" in lowered:
        return "STEMI"
    if "nste-acs" in lowered or "acs" in lowered:
        return "Acute Coronary Syndromes"
    if "ffr" in lowered or "ifr" in lowered or "syntax" in lowered:
        return "Physiology and Complexity Assessment"
    if "left main" in lowered:
        return "Left Main Disease"
    if "cabg" in lowered:
        return "CABG Strategy"
    if "pci" in lowered:
        return "PCI Strategy"
    if "revascularization" in lowered:
        return "Revascularization Strategy"
    return "General Coronary Revascularization"


def _build_guideline_recommendations(
    document: SourceDocument,
    *,
    ser_artifact: SourceEvidenceRecordArtifact,
) -> list[GuidelineRecommendation]:
    extracted_candidates: list[ExtractedRecommendation]
    if document.extension == ".pdf":
        extracted_candidates = _extract_pdf_recommendations(
            Path(document.absolute_path),
            max_candidates=DEFAULT_MAX_GUIDELINE_RECOMMENDATIONS,
        )
    else:
        excerpt = _read_document_excerpt(document, max_chars=8000)
        extracted_candidates = [
            ExtractedRecommendation(statement_text=statement, source_excerpt=statement[:280])
            for statement in _split_post_versioned_statements(excerpt)
        ]

    recommendations: list[GuidelineRecommendation] = []
    document_family = _detect_document_family(document)
    for index, extracted in enumerate(extracted_candidates, start=1):
        statement_text = extracted.statement_text
        population = _extract_population(statement_text)
        intervention = _extract_intervention(statement_text)
        comparator = _extract_comparator(statement_text)
        outcome = _extract_outcome(statement_text)
        conditions = _extract_conditions(statement_text)
        exclusions = _extract_exclusions(statement_text)
        temporal_qualifiers = _extract_temporal_qualifiers(statement_text)
        clinical_state = _extract_clinical_state(statement_text)
        disease = _extract_disease(statement_text)
        severity = _extract_severity(statement_text)
        time_window = _extract_time_window(statement_text, temporal_qualifiers)
        event_anchor = _extract_event_anchor(statement_text)
        numeric_thresholds = _extract_numeric_thresholds(statement_text)
        care_phase = _extract_care_phase(statement_text)
        clinical_entities = _build_clinical_entities(
            statement_text,
            population=population,
            intervention=intervention,
            comparator=comparator,
            outcome=outcome,
            conditions=conditions,
            exclusions=exclusions,
            temporal_qualifiers=temporal_qualifiers,
            numeric_thresholds=numeric_thresholds,
        )
        execution_model = _build_execution_model(
            statement_text,
            population=population,
            clinical_state=clinical_state,
            disease=disease,
            time_window=time_window,
            event_anchor=event_anchor,
            intervention=intervention,
            outcome=outcome,
            conditions=conditions,
            exclusions=exclusions,
            temporal_qualifiers=temporal_qualifiers,
            numeric_thresholds=numeric_thresholds,
        )
        extraction_confidence, confidence_rationale = _score_recommendation_extraction(
            statement_text,
            recommendation_class=extracted.recommendation_class,
            level_of_evidence=extracted.level_of_evidence,
            population=population,
            intervention=intervention,
            source_locator=extracted.source_locator,
            temporal_qualifiers=temporal_qualifiers,
            clinical_entities=clinical_entities,
        )
        statement_key = f"{document.lineage_key or document.document_id}:S{index:03d}"
        recommendation_hash = sha256(
            f"{document.document_id}:{ser_artifact.id}:{statement_key}:{statement_text}".encode("utf-8")
        ).hexdigest()
        information_weight, weight_score, weight_rationale = _classification_weight(
            document,
            statement_text,
            recommendation_class=extracted.recommendation_class,
            level_of_evidence=extracted.level_of_evidence,
        )
        clinical_topic = _infer_clinical_topic(
            disease=disease,
            intervention=intervention,
            recommendation_text=statement_text,
        )
        created_at = document.ingestion_timestamp_utc
        recommendations.append(
            GuidelineRecommendation(
                recommendation_id=f"GR-{recommendation_hash[:12].upper()}",
                document_id=document.document_id,
                ser_artifact_id=ser_artifact.id,
                statement_key=statement_key,
                canonical_title=ser_artifact.payload.canonical_title,
                recommendation_text=statement_text,
                recommendation_class=extracted.recommendation_class,
                level_of_evidence=extracted.level_of_evidence,
                document_family=document_family,
                clinical_topic=clinical_topic,
                population=population,
                intervention=intervention,
                comparator=comparator,
                outcome=outcome,
                conditions=conditions,
                exclusions=exclusions,
                clinical_state=clinical_state,
                disease=disease,
                severity=severity,
                time_window=time_window,
                event_anchor=event_anchor,
                numeric_thresholds=numeric_thresholds,
                care_phase=care_phase,
                clinical_temporality=_extract_clinical_temporality(statement_text),
                temporal_qualifiers=temporal_qualifiers,
                guidance_temporality=ser_artifact.payload.publication_date,
                care_setting=_extract_care_setting(statement_text),
                specialty=document.specialty,
                sub_specialty=document.sub_specialty,
                source_excerpt=extracted.source_excerpt,
                source_locator=extracted.source_locator,
                information_weight=information_weight,
                weight_score=weight_score,
                weight_rationale=weight_rationale,
                extraction_confidence=extraction_confidence,
                confidence_rationale=confidence_rationale,
                clinical_entities=clinical_entities,
                execution_model=execution_model,
                created_at=created_at,
                updated_at=created_at,
            )
        )
    return recommendations


def _build_eo_candidates(
    document: SourceDocument,
    *,
    ser_artifact: SourceEvidenceRecordArtifact,
    primary_eo_artifact: EvidenceObjectArtifact,
    guideline_recommendations: list[GuidelineRecommendation] | None = None,
) -> list[EvidenceObjectCandidate]:
    candidates: list[EvidenceObjectCandidate] = []
    recommendations = guideline_recommendations or _build_guideline_recommendations(
        document,
        ser_artifact=ser_artifact,
    )

    for recommendation in recommendations:
        statement_text = recommendation.recommendation_text
        statement_key = recommendation.statement_key
        eo_type, eo_subtype = _classify_eo_candidate_type(recommendation)
        candidate_hash = sha256(
            f"{document.document_id}:{ser_artifact.id}:{statement_key}:{statement_text}".encode("utf-8")
        ).hexdigest()
        created_at = document.ingestion_timestamp_utc
        candidates.append(
            EvidenceObjectCandidate(
                candidate_id=f"EOC-{candidate_hash[:12].upper()}",
                document_id=document.document_id,
                ser_artifact_id=ser_artifact.id,
                primary_eo_artifact_id=primary_eo_artifact.id,
                statement_key=statement_key,
                statement_text=statement_text,
                canonical_title=ser_artifact.payload.canonical_title,
                domain=document.specialty or document.document_group or document.document_type,
                recommendation_class=recommendation.recommendation_class,
                level_of_evidence=recommendation.level_of_evidence,
                eo_type=eo_type,
                eo_subtype=eo_subtype,
                source_excerpt=recommendation.source_excerpt,
                completion_level="L1_structured",
                review_state="pending",
                clinical_audit_state="pending",
                surgical_audit_state="pending",
                finalization_status="candidate",
                evidence_strength=_infer_evidence_strength(document.document_type, statement_text),
                information_weight=recommendation.information_weight,
                weight_score=recommendation.weight_score,
                weight_rationale=recommendation.weight_rationale,
                source_locator=recommendation.source_locator,
                created_at=created_at,
                updated_at=created_at,
            )
        )

    return candidates


def _classify_eo_candidate_type(recommendation: GuidelineRecommendation) -> tuple[str, str | None]:
    lowered = recommendation.recommendation_text.lower()
    action = (recommendation.execution_model.action or "").lower()
    trigger = recommendation.execution_model.trigger_model

    if "heart team" in lowered:
        return ("team_decision", "multidisciplinary_review")
    if recommendation.numeric_thresholds and ("should not be performed" in lowered or "should be performed" in lowered):
        return ("diagnostic_threshold", "physiology_gated_action")
    if trigger.time_constraint:
        if "should not be performed" in lowered or "should be performed" in lowered:
            return ("timing_rule", "time_window_action")
        return ("timing_rule", "time_window_context")
    if "should not be performed" in lowered or "is not recommended" in lowered:
        return ("contraindication", "negative_recommendation")
    if "recommended" in lowered or "is indicated" in lowered or "should be performed" in lowered or "should be considered" in lowered or "is reasonable" in lowered or "may be considered" in lowered:
        if "pathway" in lowered or "approach" in lowered:
            return ("care_pathway", "workflow_recommendation")
        if action:
            return ("recommendation", "therapeutic_action")
        return ("recommendation", "general_recommendation")
    return ("recommendation", "contextual_statement")


def _resolve_candidate_state(
    *,
    clinical_state: str,
    surgical_state: str,
) -> tuple[str, str, str]:
    if clinical_state == "approved" and surgical_state == "approved":
        return ("L5_executable", "approved", "ready_for_execution")
    if "rejected" in {clinical_state, surgical_state}:
        return ("L2_audited_clinical" if clinical_state == "rejected" else "L3_audited_surgical", "rejected", "returned_for_rework")
    if clinical_state == "approved" and surgical_state == "pending":
        return ("L2_audited_clinical", "under_surgical_review", "candidate")
    if surgical_state == "approved" and clinical_state == "pending":
        return ("L3_audited_surgical", "under_clinical_review", "candidate")
    if "changes_requested" in {clinical_state, surgical_state}:
        return ("L1_structured", "changes_requested", "returned_for_rework")
    return ("L1_structured", "pending", "candidate")


def _build_el_artifact(
    document: SourceDocument,
    *,
    eo_artifact: EvidenceObjectArtifact,
) -> EvidenceLakeRecordArtifact:
    payload = EvidenceLakeRecordPayload(
        source_object_id=eo_artifact.id,
        source_record_id=eo_artifact.payload.source_record_id,
        source_id=eo_artifact.payload.source_id,
        canonical_title=eo_artifact.payload.canonical_title,
        evidence_synopsis=eo_artifact.payload.evidence_synopsis,
        lake_status="indexed",
        indexing_key=_build_indexing_key(
            eo_artifact.payload.source_id,
            eo_artifact.payload.canonical_title,
        ),
        domain_tags=list(eo_artifact.payload.domain_tags),
        canonical_claims=list(eo_artifact.payload.canonical_claims),
        evidence_hash=eo_artifact.integrity.hash,
        snapshot_summary=(
            f"{eo_artifact.payload.evidence_status} · "
            f"{eo_artifact.payload.issuing_body} {eo_artifact.payload.publication_year}"
        ),
    )
    integrity = _build_hash_metadata(
        payload.model_dump(mode="json"),
        previous_hash=eo_artifact.integrity.hash,
    )
    return EvidenceLakeRecordArtifact(
        id=_build_artifact_id("EL", integrity.hash),
        vrn=document.vrn or "",
        created_at=document.ingestion_timestamp_utc,
        payload=payload,
        audit=_build_audit(document),
        provenance=[_build_provenance(document)],
        integrity=integrity,
        maturity="implemented",
    )


def _row_to_eo_candidate(row) -> EvidenceObjectCandidate:
    return EvidenceObjectCandidate(
        candidate_id=row["candidate_id"],
        document_id=row["document_id"],
        ser_artifact_id=row["ser_artifact_id"],
        primary_eo_artifact_id=row["primary_eo_artifact_id"],
        statement_key=row["statement_key"],
        statement_text=row["statement_text"],
        canonical_title=row["canonical_title"],
        domain=row["domain"],
        recommendation_class=row["recommendation_class"] if "recommendation_class" in row.keys() else None,
        level_of_evidence=row["level_of_evidence"] if "level_of_evidence" in row.keys() else None,
        eo_type=row["eo_type"] if "eo_type" in row.keys() else None,
        eo_subtype=row["eo_subtype"] if "eo_subtype" in row.keys() else None,
        source_excerpt=row["source_excerpt"],
        completion_level=row["completion_level"],
        review_state=row["review_state"],
        clinical_audit_state=row["clinical_audit_state"],
        surgical_audit_state=row["surgical_audit_state"],
        finalization_status=row["finalization_status"],
        evidence_strength=row["evidence_strength"],
        information_weight=row["information_weight"] if "information_weight" in row.keys() else None,
        weight_score=row["weight_score"] if "weight_score" in row.keys() else None,
        weight_rationale=row["weight_rationale"] if "weight_rationale" in row.keys() else None,
        source_locator=row["source_locator"] if "source_locator" in row.keys() else None,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _row_to_guideline_recommendation(row) -> GuidelineRecommendation:
    return GuidelineRecommendation(
        recommendation_id=row["recommendation_id"],
        document_id=row["document_id"],
        ser_artifact_id=row["ser_artifact_id"],
        statement_key=row["statement_key"],
        canonical_title=row["canonical_title"],
        recommendation_text=row["recommendation_text"],
        recommendation_class=row["recommendation_class"],
        level_of_evidence=row["level_of_evidence"],
        document_family=row["document_family"] if "document_family" in row.keys() else None,
        clinical_topic=row["clinical_topic"] if "clinical_topic" in row.keys() else None,
        population=row["population"],
        intervention=row["intervention"],
        comparator=row["comparator"],
        outcome=row["outcome"],
        conditions=json.loads(row["conditions_json"] or "[]"),
        exclusions=json.loads(row["exclusions_json"] or "[]"),
        clinical_state=row["clinical_state"] if "clinical_state" in row.keys() else None,
        disease=row["disease"] if "disease" in row.keys() else None,
        severity=row["severity"] if "severity" in row.keys() else None,
        time_window=row["time_window"] if "time_window" in row.keys() else None,
        event_anchor=row["event_anchor"] if "event_anchor" in row.keys() else None,
        numeric_thresholds=[
            NumericThreshold.model_validate(item)
            for item in json.loads(row["numeric_thresholds_json"] or "[]")
        ] if "numeric_thresholds_json" in row.keys() else [],
        care_phase=row["care_phase"] if "care_phase" in row.keys() else None,
        clinical_temporality=row["clinical_temporality"],
        temporal_qualifiers=json.loads(row["temporal_qualifiers_json"] or "[]"),
        guidance_temporality=row["guidance_temporality"],
        care_setting=row["care_setting"],
        specialty=row["specialty"],
        sub_specialty=row["sub_specialty"],
        source_excerpt=row["source_excerpt"],
        source_locator=row["source_locator"],
        information_weight=row["information_weight"],
        weight_score=row["weight_score"],
        weight_rationale=row["weight_rationale"],
        extraction_confidence=row["extraction_confidence"] if "extraction_confidence" in row.keys() else None,
        confidence_rationale=json.loads(row["confidence_rationale_json"] or "[]") if "confidence_rationale_json" in row.keys() else [],
        clinical_entities=[
            ClinicalEntity.model_validate(item)
            for item in json.loads(row["clinical_entities_json"] or "[]")
        ] if "clinical_entities_json" in row.keys() else [],
        execution_model=RecommendationExecutionModel.model_validate(
            json.loads(row["execution_model_json"] or "{}")
        ) if "execution_model_json" in row.keys() else RecommendationExecutionModel(),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _row_to_document(row) -> SourceDocument:
    return SourceDocument(
        document_id=row["document_id"],
        lineage_id=row["lineage_id"] if "lineage_id" in row.keys() else None,
        lineage_key=row["lineage_key"] if "lineage_key" in row.keys() else None,
        vrn=row["source_vrn"] if "source_vrn" in row.keys() else None,
        vrn_policy_id=row["vrn_policy_id"] if "vrn_policy_id" in row.keys() else None,
        version_number=row["version_number"] if "version_number" in row.keys() else None,
        institutional_version=(
            row["institutional_version"] if "institutional_version" in row.keys() else None
        ),
        previous_document_id=(
            row["previous_document_id"] if "previous_document_id" in row.keys() else None
        ),
        vrn_status=row["vrn_status"] if "vrn_status" in row.keys() else "ACTIVE",
        ingest_artifact_id=(
            row["ingest_artifact_id"]
            if "ingest_artifact_id" in row.keys()
            else _build_artifact_id("ING", row["hash_sha256"])
        ),
        ser_artifact_id=(
            row["ser_artifact_id"]
            if "ser_artifact_id" in row.keys()
            else _build_artifact_id("SER", row["hash_sha256"])
        ),
        file_name=row["file_name"],
        absolute_path=row["absolute_path"],
        relative_path=row["relative_path"],
        extension=row["extension"],
        document_type=row["document_type"],
        layer=row["layer"],
        category=row["category"],
        document_group=row["document_group"],
        language=row["language"],
        version_detected=row["version_detected"],
        size_bytes=row["size_bytes"],
        last_write_time_utc=row["last_write_time_utc"],
        ingestion_timestamp_utc=row["ingestion_timestamp_utc"],
        hash_sha256=row["hash_sha256"],
        source_status=row["source_status"],
        source_origin=row["source_origin"],
        continuum_stage=row["continuum_stage"],
        ingestion_notes=row["ingestion_notes"],
        derived_artifacts=json.loads(row["derived_artifacts_json"]),
    )
