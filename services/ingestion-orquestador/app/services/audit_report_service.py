import json
from datetime import UTC, datetime
from pathlib import Path

from app.core.config import Settings, get_settings
from app.domain.models import (
    ClinicalEntity,
    DocumentAuditArtifacts,
    DocumentAuditEvent,
    DocumentAuditFeed,
    DocumentAuditReport,
    EvidenceObjectAuditRecord,
    EvidenceObjectCandidate,
    GuidelineRecommendation,
    GovernanceRecord,
    NumericThreshold,
    RecommendationExecutionModel,
)
from app.persistence.database import get_connection, initialize_database


class AuditReportService:
    def __init__(
        self,
        *,
        settings: Settings | None = None,
        database_path: Path | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._database_path = database_path or self._settings.sqlite_path
        initialize_database(self._database_path)

    def append_event(
        self,
        *,
        document_id: str | None,
        vrn: str | None,
        event_type: str,
        actor: str,
        summary: str,
        payload: dict[str, object] | None = None,
        stage: str | None = None,
        related_record_id: str | None = None,
    ) -> None:
        with get_connection(self._database_path) as connection:
            connection.execute(
                """
                INSERT INTO document_audit_events (
                    document_id,
                    vrn,
                    event_type,
                    stage,
                    actor,
                    summary,
                    payload_json,
                    related_record_id,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    document_id,
                    vrn,
                    event_type,
                    stage,
                    actor,
                    summary,
                    json.dumps(payload or {}, ensure_ascii=True),
                    related_record_id,
                    datetime.now(UTC).isoformat(),
                ),
            )
            connection.commit()

    def get_report(self, document_id: str) -> DocumentAuditReport:
        with get_connection(self._database_path) as connection:
            document_row = connection.execute(
                """
                SELECT *
                FROM uploaded_source_documents
                WHERE document_id = ?
                """,
                (document_id,),
            ).fetchone()
            classification_row = connection.execute(
                """
                SELECT specialty, sub_specialty, epidemic_focus
                FROM document_classifications
                WHERE document_id = ?
                """,
                (document_id,),
            ).fetchone()
            ser_row = connection.execute(
                "SELECT artifact_id FROM source_evidence_records WHERE source_id = ?",
                (document_id,),
            ).fetchone()
            eo_row = connection.execute(
                "SELECT artifact_id FROM evidence_objects WHERE source_id = ?",
                (document_id,),
            ).fetchone()
            el_row = connection.execute(
                "SELECT artifact_id FROM evidence_lake_records WHERE source_id = ?",
                (document_id,),
            ).fetchone()
            eo_candidate_rows = connection.execute(
                """
                SELECT *
                FROM eo_candidates
                WHERE document_id = ?
                ORDER BY created_at ASC, candidate_id ASC
                """,
                (document_id,),
            ).fetchall()
            guideline_recommendation_rows = connection.execute(
                """
                SELECT *
                FROM guideline_recommendations
                WHERE document_id = ?
                ORDER BY created_at ASC, recommendation_id ASC
                """,
                (document_id,),
            ).fetchall()
            eo_candidate_audit_rows = connection.execute(
                """
                SELECT *
                FROM eo_candidate_audits
                WHERE document_id = ?
                ORDER BY signed_at ASC, audit_id ASC
                """,
                (document_id,),
            ).fetchall()
            event_rows = connection.execute(
                """
                SELECT *
                FROM document_audit_events
                WHERE document_id = ?
                ORDER BY created_at ASC, event_id ASC
                """,
                (document_id,),
            ).fetchall()
            governance_rows = connection.execute(
                """
                SELECT *
                FROM governance_records
                ORDER BY created_at DESC
                """
            ).fetchall()

        governance_records: list[GovernanceRecord] = []
        for row in governance_rows:
            affected_entities = json.loads(row["affected_entities_json"])
            if document_id not in affected_entities:
                continue
            source_document = self._resolve_source_document(
                document_row=document_row,
                document_id=document_id,
                affected_entities=affected_entities,
            )
            governance_records.append(
                GovernanceRecord(
                    governance_record_id=row["governance_record_id"],
                    record_type=row["record_type"],
                    vrn=row["vrn"],
                    severity=row["severity"],
                    description=row["description"],
                    source_domain=row["source_domain"],
                    affected_entities=affected_entities,
                    effective_from=row["effective_from"],
                    effective_to=row["effective_to"],
                    append_only_flag=bool(row["append_only_flag"]),
                    created_at=row["created_at"],
                    created_by=row["created_by"],
                    source_document_id=source_document["document_id"] if source_document is not None else None,
                    source_file_name=source_document["file_name"] if source_document is not None else None,
                    source_absolute_path=source_document["absolute_path"] if source_document is not None else None,
                    source_relative_path=source_document["relative_path"] if source_document is not None else None,
                )
            )

        events = [
            DocumentAuditEvent(
                event_id=row["event_id"],
                document_id=row["document_id"],
                vrn=row["vrn"],
                event_type=row["event_type"],
                stage=row["stage"],
                actor=row["actor"],
                summary=row["summary"],
                payload=json.loads(row["payload_json"] or "{}"),
                related_record_id=row["related_record_id"],
                created_at=row["created_at"],
            )
            for row in event_rows
        ]
        eo_candidates = [
            EvidenceObjectCandidate(
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
            for row in eo_candidate_rows
        ]
        guideline_recommendations = [
            GuidelineRecommendation(
                recommendation_id=row["recommendation_id"],
                document_id=row["document_id"],
                ser_artifact_id=row["ser_artifact_id"],
                statement_key=row["statement_key"],
                canonical_title=row["canonical_title"],
                recommendation_text=row["recommendation_text"],
                recommendation_class=row["recommendation_class"],
                level_of_evidence=row["level_of_evidence"],
                document_family=row["document_family"] if "document_family" in row.keys() else None,
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
            for row in guideline_recommendation_rows
        ]
        eo_candidate_audits = [
            EvidenceObjectAuditRecord(
                audit_id=row["audit_id"],
                candidate_id=row["candidate_id"],
                document_id=row["document_id"],
                audit_kind=row["audit_kind"],
                decision=row["decision"],
                comments=row["comments"],
                requested_changes=json.loads(row["requested_changes_json"] or "[]"),
                signed_by=row["signed_by"],
                signed_at=row["signed_at"],
            )
            for row in eo_candidate_audit_rows
        ]

        if not events and document_row is not None:
            events.append(
                DocumentAuditEvent(
                    event_id=None,
                    document_id=document_id,
                    vrn=document_row["source_vrn"],
                    event_type="DOCUMENT_SNAPSHOT",
                    stage=document_row["continuum_stage"],
                    actor="icicso-audit-report-service",
                    summary="Snapshot reconstruido desde uploaded_source_documents.",
                    payload={
                        "file_name": document_row["file_name"],
                        "relative_path": document_row["relative_path"],
                        "hash_sha256": document_row["hash_sha256"],
                        "vrn_status": document_row["vrn_status"],
                    },
                    related_record_id=None,
                    created_at=document_row["ingestion_timestamp_utc"],
                )
            )
        if governance_records and not any(event.event_type in {"GOVERNANCE_RECORDED", "GOVERNANCE_SNAPSHOT"} for event in events):
            for governance_record in reversed(governance_records):
                events.append(
                    DocumentAuditEvent(
                        event_id=None,
                        document_id=document_id,
                        vrn=governance_record.vrn,
                        event_type="GOVERNANCE_SNAPSHOT",
                        stage="GCL",
                        actor="icicso-audit-report-service",
                        summary=f"Snapshot reconstruido de {governance_record.governance_record_id}.",
                        payload={
                            "governance_record_id": governance_record.governance_record_id,
                            "record_type": governance_record.record_type,
                            "severity": governance_record.severity,
                            "description": governance_record.description,
                        },
                        related_record_id=governance_record.governance_record_id,
                        created_at=governance_record.created_at,
                    )
                )

        warnings: list[str] = []
        if document_row is None:
            warnings.append("No existe el source document en uploaded_source_documents.")
        persisted_event_count = len(event_rows)
        if persisted_event_count == 0:
            warnings.append("No hay eventos auditables registrados para este documento.")

        file_exists = False
        if document_row is not None:
            file_exists = Path(document_row["absolute_path"]).exists()
            if not file_exists:
                warnings.append("El archivo fuente ya no existe en disco.")

        if governance_records and document_row is None:
            warnings.append("Existe gobernanza sin documento fuente persistido.")

        if classification_row is not None:
            classification_payload = {
                "specialty": classification_row["specialty"],
                "sub_specialty": classification_row["sub_specialty"],
                "epidemic_focus": classification_row["epidemic_focus"],
            }
            if not events or events[-1].payload.get("classification") != classification_payload:
                events.append(
                    DocumentAuditEvent(
                        event_id=None,
                        document_id=document_id,
                        vrn=document_row["source_vrn"] if document_row is not None else None,
                        event_type="CLASSIFICATION_SNAPSHOT",
                        stage="ING",
                        actor="icicso-audit-report-service",
                        summary="Estado actual de clasificación.",
                        payload={"classification": classification_payload},
                        related_record_id=None,
                        created_at=datetime.now(UTC).isoformat(),
                    )
                )

        return DocumentAuditReport(
            document_id=document_id,
            audit_status="orphaned" if governance_records and document_row is None else "valid",
            vrn=document_row["source_vrn"] if document_row is not None else (governance_records[0].vrn if governance_records else None),
            vrn_status=document_row["vrn_status"] if document_row is not None else None,
            file_name=document_row["file_name"] if document_row is not None else None,
            absolute_path=document_row["absolute_path"] if document_row is not None else None,
            relative_path=document_row["relative_path"] if document_row is not None else None,
            hash_sha256=document_row["hash_sha256"] if document_row is not None else None,
            source_origin=document_row["source_origin"] if document_row is not None else None,
            document_present=document_row is not None,
            file_exists=file_exists,
            database_path=str(Path(self._database_path).resolve()),
            report_generated_at_utc=datetime.now(UTC).isoformat(),
            materialized_artifacts=DocumentAuditArtifacts(
                ingest_artifact_id=document_row["ingest_artifact_id"] if document_row is not None else None,
                ser_artifact_id=ser_row["artifact_id"] if ser_row is not None else None,
                eo_artifact_id=eo_row["artifact_id"] if eo_row is not None else None,
                el_artifact_id=el_row["artifact_id"] if el_row is not None else None,
            ),
            guideline_recommendations=guideline_recommendations,
            eo_candidates=eo_candidates,
            eo_candidate_audits=eo_candidate_audits,
            governance_records=governance_records,
            events=events,
            warnings=warnings,
        )

    def _resolve_source_document(
        self,
        *,
        document_row,
        document_id: str,
        affected_entities: list[str],
    ):
        if document_row is not None and document_id in affected_entities:
            return document_row
        return None

    def build_feed(self, *, limit: int = 50) -> DocumentAuditFeed:
        with get_connection(self._database_path) as connection:
            document_ids = {
                row["document_id"]
                for row in connection.execute(
                    """
                    SELECT document_id
                    FROM uploaded_source_documents
                    ORDER BY ingestion_timestamp_utc DESC
                    LIMIT ?
                    """,
                    (limit,),
                ).fetchall()
            }
            governance_rows = connection.execute(
                """
                SELECT affected_entities_json
                FROM governance_records
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        for row in governance_rows:
            for document_id in json.loads(row["affected_entities_json"]):
                document_ids.add(document_id)

        reports = [self.get_report(document_id) for document_id in sorted(document_ids)]
        return DocumentAuditFeed(
            generated_at_utc=datetime.now(UTC).isoformat(),
            database_path=str(Path(self._database_path).resolve()),
            reports=reports,
        )

    def write_feed_exports(self) -> None:
        feed = self.build_feed(limit=50)
        runtime_json = json.dumps(feed.model_dump(mode="json"), ensure_ascii=True, indent=2)

        self._settings.audit_runtime_feed_path.parent.mkdir(parents=True, exist_ok=True)
        self._settings.audit_dashboard_feed_path.parent.mkdir(parents=True, exist_ok=True)
        self._settings.audit_emulator_feed_path.parent.mkdir(parents=True, exist_ok=True)

        self._settings.audit_runtime_feed_path.write_text(runtime_json, encoding="utf-8")
        self._settings.audit_dashboard_feed_path.write_text(runtime_json, encoding="utf-8")
        self._settings.audit_emulator_feed_path.write_text(
            "export const documentAuditFeed = "
            f"{runtime_json};\n",
            encoding="utf-8",
        )
