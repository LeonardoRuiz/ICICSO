import base64
import json
from pathlib import Path
import shutil
import uuid

import fitz

from app.core.config import Settings
from app.domain.models import DocumentIngestionRequest
from app.domain.models import GovernanceRecordRequest
from app.domain.models import DocumentClassificationUpdate
from app.domain.models import EvidenceObjectAuditRequest
from app.engines.evidence_object_extraction_engine import EvidenceObjectExtractionEngine
from app.persistence.database import get_connection, initialize_database
from app.services.document_ingestion_service import DocumentIngestionService
from app.services.document_ingestion_service import _finalize_recommendation_statement
from app.services.document_ingestion_service import _build_guideline_recommendations
from app.services.document_ingestion_service import _build_ser_artifact
from app.services.document_ingestion_service import _build_ingest_artifact
from app.services.document_ingestion_service import _extract_line_structured_guideline_recommendations
from app.services.document_ingestion_service import _is_recommendation_like
from app.services.document_ingestion_service import _looks_like_nonclinical_sentence
from app.services.document_ingestion_service import _normalize_cor_token
from app.services.document_ingestion_service import _normalize_loe_token
from app.services.governance_record_service import GovernanceRecordService
from app.services.audit_report_service import AuditReportService


def build_settings(tmp_path: Path) -> Settings:
    workspace_root = tmp_path / "workspace"
    project_root = workspace_root / "services" / "ingestion-orquestador"
    manifest_path = project_root / "manifest" / "icicso_manifest.json"
    data_dir = project_root / "data"

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    (workspace_root / "config" / "runtime").mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps(
            {
                "manifest_name": "Test Manifest",
                "generated_at_utc": "2026-04-11T00:00:00+00:00",
                "root_path": str(workspace_root),
                "total_documents": 0,
                "catalog_roots": [],
                "documents": [],
            }
        ),
        encoding="utf-8",
    )
    (workspace_root / "config" / "runtime" / "vrn-policy.json").write_text(
        json.dumps(
            {
                "policy_id": "vrn-l0-governance-2026-04-12",
                "institution_code": "ICICSO",
                "governance_layer": "L0",
                "default_scope": "CONTINUUM",
                "active_status": "ACTIVE",
                "version_prefix": "V",
                "version_width": 3,
                "hash_length": 8,
                "segments": [
                    "VRN",
                    "institution_code",
                    "governance_layer",
                    "layer",
                    "continuum_stage",
                    "category",
                    "date",
                    "hash",
                    "version",
                ],
                "notes": [
                    "All executable structural artifacts must inherit an active VRN."
                ],
            }
        ),
        encoding="utf-8",
    )
    (workspace_root / "config" / "runtime" / "ingestion-nomenclature.json").write_text(
        json.dumps(
            {
                "specialties": ["General", "Cardiologia"],
                "sub_specialties": {
                    "General": ["General"],
                    "Cardiologia": ["General", "Arritmias"],
                },
                "epidemics": ["N/A"],
                "defaults": {
                    "specialty": "General",
                    "sub_specialty": "General",
                    "epidemic": "N/A",
                },
            }
        ),
        encoding="utf-8",
    )

    return Settings(
        project_root=project_root,
        workspace_root=workspace_root,
        manifest_path=manifest_path,
        data_dir=data_dir,
        sqlite_path=data_dir / "icicso_catalog.db",
        uploaded_documents_dir=data_dir / "uploaded_documents",
        vrn_policy_path=workspace_root / "config" / "runtime" / "vrn-policy.json",
        runtime_feed_path=workspace_root / "config" / "runtime" / "document-ingestion-feed.json",
        dashboard_feed_path=workspace_root / "dashboard" / "data" / "document-ingestion-feed.json",
        emulator_feed_path=workspace_root / "icicso" / "apps" / "emulator" / "src" / "data" / "documentIngestionFeed.generated.js",
        gcl_runtime_feed_path=workspace_root / "config" / "runtime" / "gcl-ledger-feed.json",
        gcl_dashboard_feed_path=workspace_root / "dashboard" / "data" / "gcl-ledger-feed.json",
        gcl_emulator_feed_path=workspace_root / "icicso" / "apps" / "emulator" / "src" / "data" / "gclLedgerFeed.generated.js",
        audit_runtime_feed_path=workspace_root / "config" / "runtime" / "document-audit-feed.json",
        audit_dashboard_feed_path=workspace_root / "dashboard" / "data" / "document-audit-feed.json",
        audit_emulator_feed_path=workspace_root / "icicso" / "apps" / "emulator" / "src" / "data" / "documentAuditFeed.generated.js",
        nomenclature_path=workspace_root / "config" / "runtime" / "ingestion-nomenclature.json",
    )


def run_in_workspace_temp(test_logic) -> None:
    temp_root = Path(__file__).resolve().parent / "_tmp" / uuid.uuid4().hex
    temp_root.mkdir(parents=True, exist_ok=True)
    try:
        test_logic(temp_root)
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)


def test_document_ingestion_creates_storage_and_feed_exports() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        payload = base64.b64encode(b"ICICSO continuum evidence").decode("ascii")
        result = service.ingest_document(
            DocumentIngestionRequest(
                file_name="continuum-intake.txt",
                content_base64=payload,
                ingestion_notes="Documento base para VRN.",
            )
        )

        assert result.duplicate_detected is False
        assert result.document.source_origin == "workspace-upload"
        assert Path(result.document.absolute_path).exists()
        assert result.document.vrn.startswith("VRN-ICICSO-L0-ING-ING-USER-UPLOAD-")
        assert result.document.vrn_policy_id == "vrn-l0-governance-2026-04-12"
        assert result.document.institutional_version == "V001"
        assert result.document.vrn_status == "ACTIVE"
        assert settings.runtime_feed_path.exists()
        assert settings.dashboard_feed_path.exists()
        assert settings.emulator_feed_path.exists()

    run_in_workspace_temp(scenario)


def test_document_ingestion_deduplicates_by_hash() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        payload = base64.b64encode(b"same-document").decode("ascii")
        first = service.ingest_document(
            DocumentIngestionRequest(file_name="first.txt", content_base64=payload)
        )
        second = service.ingest_document(
            DocumentIngestionRequest(
                file_name="second.txt",
                content_base64=payload,
                document_type="guideline",
                document_group="ACC-AHA",
                specialty="Cardiologia",
                sub_specialty="Arritmias",
                epidemic_focus="N/A",
            )
        )

        assert first.document.document_id == second.document.document_id
        assert second.duplicate_detected is True
        assert second.document.document_type == "guideline"
        assert second.document.document_group == "ACC-AHA"
        assert second.document.specialty == "Cardiologia"
        assert second.document.sub_specialty == "Arritmias"

    run_in_workspace_temp(scenario)


def test_document_ingestion_feed_reports_latest_documents() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        for index in range(2):
            payload = base64.b64encode(f"document-{index}".encode("utf-8")).decode("ascii")
            service.ingest_document(
                DocumentIngestionRequest(
                    file_name=f"document-{index}.txt",
                    content_base64=payload,
                    layer="ING",
                    continuum_stage="ING",
                )
            )

        feed = service.get_feed(limit=10)

        assert feed.uploaded_documents == 2
        assert feed.continuum_ready_documents == 2
        assert len(feed.latest_documents) == 2
        assert "ING" in feed.layers

    run_in_workspace_temp(scenario)


def test_document_ingestion_issues_consecutive_versions_per_lineage() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        first_payload = base64.b64encode(b"version one payload").decode("ascii")
        second_payload = base64.b64encode(b"version two payload").decode("ascii")

        first = service.ingest_document(
            DocumentIngestionRequest(
                file_name="cabg-guideline-v1.txt",
                content_base64=first_payload,
                document_type="guideline",
                document_group="ACC-AHA",
                lineage_key="CABG-ACC-AHA-GUIDELINE",
                ingestion_notes="Primera emision institucional.",
            )
        )
        second = service.ingest_document(
            DocumentIngestionRequest(
                file_name="cabg-guideline-v2.txt",
                content_base64=second_payload,
                document_type="guideline",
                document_group="ACC-AHA",
                lineage_key="CABG-ACC-AHA-GUIDELINE",
                ingestion_notes="Segunda emision institucional.",
            )
        )

        assert first.document.lineage_id == second.document.lineage_id
        assert first.document.lineage_key == "CABG-ACC-AHA-GUIDELINE"
        assert second.document.lineage_key == "CABG-ACC-AHA-GUIDELINE"
        assert first.document.version_number == 1
        assert second.document.version_number == 2
        assert first.document.institutional_version == "V001"
        assert second.document.institutional_version == "V002"
        assert second.document.previous_document_id == first.document.document_id
        assert second.document.vrn.endswith("-V002")

    run_in_workspace_temp(scenario)


def test_document_version_history_returns_lineage_timeline() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        first = service.ingest_document(
            DocumentIngestionRequest(
                file_name="history-v1.txt",
                content_base64=base64.b64encode(b"history version one").decode("ascii"),
                lineage_key="CABG-HISTORY",
                ingestion_notes="Version uno.",
            )
        )
        second = service.ingest_document(
            DocumentIngestionRequest(
                file_name="history-v2.txt",
                content_base64=base64.b64encode(b"history version two").decode("ascii"),
                lineage_key="CABG-HISTORY",
                ingestion_notes="Version dos.",
            )
        )

        history = service.get_version_history(second.document.document_id)

        assert history is not None
        assert history.lineage_id == second.document.lineage_id
        assert history.lineage_key == "CABG-HISTORY"
        assert history.current_document_id == second.document.document_id
        assert history.current_version_number == 2
        assert [item.version_number for item in history.versions] == [2, 1]
        assert history.versions[0].document_id == second.document.document_id
        assert history.versions[0].previous_document_id == first.document.document_id
        assert history.versions[1].document_id == first.document.document_id

    run_in_workspace_temp(scenario)


def test_document_ingestion_builds_continuum_preparation() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        payload = base64.b64encode(b"clinical evidence line 1\nline 2").decode("ascii")
        ingested = service.ingest_document(
            DocumentIngestionRequest(
                file_name="vrn-ser-ready.txt",
                content_base64=payload,
                ingestion_notes="Preparar para VRN y SER.",
            )
        )

        preparation = service.get_continuum_preparation(ingested.document.document_id)

        assert preparation is not None
        assert preparation.document.vrn.startswith("VRN-")
        assert preparation.ingest_artifact.id.startswith("ING-")
        assert preparation.ser_artifact_preview.id.startswith("SER-")
        assert (
            preparation.ser_artifact_preview.integrity.previous_hash
            == preparation.ingest_artifact.integrity.hash
        )
        assert preparation.ser_artifact_preview.payload.source_document_id == preparation.ingest_artifact.id

    run_in_workspace_temp(scenario)


def test_document_ingestion_materializes_ser_eo_el() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        payload = base64.b64encode(
            b"CABG should be considered for left main disease. Surgical review is required for complex anatomy."
        ).decode("ascii")
        ingested = service.ingest_document(
            DocumentIngestionRequest(
                file_name="acc-guideline-review.txt",
                content_base64=payload,
                document_type="guideline-review",
                document_group="ACC",
                ingestion_notes="Materializar hasta Evidence Lake.",
            )
        )

        materialized = service.materialize_continuum(ingested.document.document_id)

        assert materialized is not None
        assert materialized.ser_artifact.id.startswith("SER-")
        assert materialized.eo_artifact.id.startswith("EO-")
        assert materialized.el_artifact.id.startswith("EL-")
        assert materialized.eo_artifact.payload.source_record_id == materialized.ser_artifact.id
        assert materialized.el_artifact.payload.source_object_id == materialized.eo_artifact.id
        assert "guideline" in materialized.eo_artifact.payload.domain_tags
        assert materialized.el_artifact.integrity.previous_hash == materialized.eo_artifact.integrity.hash
        assert len(materialized.guideline_recommendations) == 2
        assert materialized.guideline_recommendations[0].recommendation_text
        assert materialized.guideline_recommendations[0].guidance_temporality is not None
        assert len(materialized.eo_candidates) == 2
        assert materialized.eo_candidates[0].statement_key.endswith("S001")
        assert materialized.eo_candidates[0].completion_level == "L1_structured"
        assert len(service.list_materialized_records()) == 1

    run_in_workspace_temp(scenario)


def test_eo_candidate_audits_promote_completion_level() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        payload = base64.b64encode(
            b"CABG should be considered for left main disease. Heart team review should confirm surgical feasibility."
        ).decode("ascii")
        ingested = service.ingest_document(
            DocumentIngestionRequest(
                file_name="eo-audit.txt",
                content_base64=payload,
                document_type="guideline",
                document_group="ACC-AHA",
            )
        )
        materialized = service.materialize_continuum(ingested.document.document_id)
        candidate = materialized.eo_candidates[0]

        clinical_audit = service.record_eo_candidate_audit(
            document_id=ingested.document.document_id,
            candidate_id=candidate.candidate_id,
            request=EvidenceObjectAuditRequest(
                audit_kind="clinical",
                decision="approved",
                comments="Clinicamente consistente.",
                signed_by="clinician-1",
            ),
        )
        assert clinical_audit.audit_kind == "clinical"

        surgical_audit = service.record_eo_candidate_audit(
            document_id=ingested.document.document_id,
            candidate_id=candidate.candidate_id,
            request=EvidenceObjectAuditRequest(
                audit_kind="surgical",
                decision="approved",
                comments="Aprobado para conversion ejecutable.",
                signed_by="surgeon-1",
            ),
        )
        assert surgical_audit.audit_kind == "surgical"

        updated_candidate = next(
            item
            for item in service.list_eo_candidates(ingested.document.document_id)
            if item.candidate_id == candidate.candidate_id
        )
        assert updated_candidate.clinical_audit_state == "approved"
        assert updated_candidate.surgical_audit_state == "approved"
        assert updated_candidate.completion_level == "L5_executable"
        assert updated_candidate.review_state == "approved"
        assert updated_candidate.finalization_status == "ready_for_execution"

    run_in_workspace_temp(scenario)


def test_pdf_ingestion_extracts_recommendation_like_candidates() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        pdf_path = temp_root / "cabg-guideline.pdf"
        doc = fitz.open()
        page1 = doc.new_page()
        page1.insert_text(
            (72, 72),
            "3.1. The Heart Team Recommendation for the Heart Team\n"
            "COR LOE Recommendation\n"
            "1 B-NR 1. In patients for whom the optimal treatment strategy is unclear, a Heart Team approach is recommended to improve patient outcomes.\n"
            "Synopsis",
        )
        page2 = doc.new_page()
        page2.insert_text(
            (72, 72),
            "4.1. Diabetes Recommendations\n"
            "COR LOE Recommendation\n"
            "2A B-R 1. In patients with diabetes and multivessel disease, CABG should be considered when anatomy is complex.\n"
            "3: Harm C-EO 2. PCI should not be performed in asymptomatic stable patients without severe ischemia.\n"
            "Recommendation-Specific Supporting Text",
        )
        doc.save(pdf_path)
        doc.close()

        payload = base64.b64encode(pdf_path.read_bytes()).decode("ascii")
        ingested = service.ingest_document(
            DocumentIngestionRequest(
                file_name=pdf_path.name,
                content_base64=payload,
                document_type="guideline",
                document_group="ACC-AHA",
            )
        )

        materialized = service.materialize_continuum(ingested.document.document_id)

        assert len(materialized.eo_candidates) >= 2
        assert any("should" in item.statement_text.lower() for item in materialized.eo_candidates)
        assert any("should not be performed" in item.statement_text.lower() for item in materialized.eo_candidates)
        assert any(item.recommendation_class == "2A" and item.level_of_evidence == "B-R" for item in materialized.eo_candidates)
        assert any(item.recommendation_class == "3: HARM" and item.level_of_evidence == "C-EO" for item in materialized.eo_candidates)
        assert all(
            "class of recommendation and level of evidence" not in item.statement_text.lower()
            for item in materialized.eo_candidates
        )
        assert all(
            "recommendation for the heart team" not in item.statement_text.lower()
            for item in materialized.eo_candidates
        )
        assert all(
            "recommendation-specific supporting text" not in item.statement_text.lower()
            for item in materialized.eo_candidates
        )
        assert all(item.source_locator for item in materialized.eo_candidates)
        assert all(item.information_weight in {"high", "critical"} for item in materialized.eo_candidates)

    run_in_workspace_temp(scenario)


def test_structured_guideline_parser_does_not_truncate_large_guidelines() -> None:
    def alpha_label(number: int) -> str:
        value = number
        label = ""
        while value > 0:
            value, remainder = divmod(value - 1, 26)
            label = chr(65 + remainder) + label
        return label.lower()

    recommendation_count = 120
    per_page = 10
    pages: list[tuple[int, list[str]]] = []

    for page_index in range((recommendation_count + per_page - 1) // per_page):
        lines = [
            "5.1. Large Guideline Section",
            "Recommendations for Synthetic Guideline",
            "COR",
            "LOE",
            "Recommendations",
        ]
        start = page_index * per_page + 1
        end = min(start + per_page - 1, recommendation_count)
        for number in range(start, end + 1):
            condition_label = f"condition-{alpha_label(number)}"
            lines.extend(
                [
                    "1",
                    "A",
                    f"{number}. In patients with synthetic {condition_label}, PCI should be performed to improve survival.",
                ]
            )
        lines.append("Synopsis")
        pages.append((page_index + 1, lines))

    extracted = _extract_line_structured_guideline_recommendations(pages, max_candidates=240)

    assert len(extracted) == recommendation_count


def test_eo_extraction_engine_combines_structured_rows_and_narrative_sentences() -> None:
    def scenario(temp_root: Path) -> None:
        pdf_path = temp_root / "mixed-guideline.pdf"
        doc = fitz.open()
        page = doc.new_page()
        page.insert_textbox(
            fitz.Rect(72, 72, 520, 760),
            "TABLE 1 Updated Recommendations\n"
            "Class IIA, Level A Minimization of phlebotomy through a reduction in blood sampling volumes is a reasonable means of blood conservation.\n"
            "Patients presenting for urgent surgery should undergo careful assessment of valvular lesions and perivalvular complications.\n"
            "Do we still need De Bakey or should we remain with type, entry, malperfusion classification?\n"
            "Internal thoracic arteries should be used to bypass the left anterior descending artery (COR I, LOE B).\n",
        )
        doc.save(pdf_path)
        doc.close()

        engine = EvidenceObjectExtractionEngine(
            finalize_statement=_finalize_recommendation_statement,
            is_recommendation_like=_is_recommendation_like,
            looks_like_nonclinical_sentence=_looks_like_nonclinical_sentence,
            normalize_cor_token=_normalize_cor_token,
            normalize_loe_token=_normalize_loe_token,
        )

        extracted = engine.extract_pdf_recommendations(pdf_path, max_candidates=20)
        texts = [item.statement_text for item in extracted]

        assert len(extracted) >= 3
        assert any("phlebotomy" in text for text in texts)
        assert any("urgent surgery should undergo careful assessment" in text for text in texts)
        assert any("Internal thoracic arteries should be used" in text for text in texts)
        assert not any("De Bakey" in text for text in texts)
        assert any(item.recommendation_class == "2A" and item.level_of_evidence == "A" for item in extracted)
        assert any(item.recommendation_class == "1" and item.level_of_evidence == "B" for item in extracted)

    run_in_workspace_temp(scenario)


def test_guideline_recommendations_preserve_temporal_thresholds() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        payload = base64.b64encode(
            (
                b"In patients with STEMI and ischemic symptoms for <12 hours, PCI should be performed to improve survival. "
                b"In asymptomatic stable patients with STEMI who have a totally occluded infarct artery >24 hours after symptom onset, PCI should not be performed. "
                b"In stable patients with angiographically intermediate stenoses and FFR >0.80 or iFR >0.89, PCI should not be performed."
            )
        ).decode("ascii")
        ingested = service.ingest_document(
            DocumentIngestionRequest(
                file_name="thresholds.txt",
                content_base64=payload,
                document_type="guideline",
                document_group="ACC-AHA",
            )
        )
        document = service.get_uploaded_document(ingested.document.document_id)
        assert document is not None

        ingest_artifact = _build_ingest_artifact(document)
        ser_artifact = _build_ser_artifact(document, ingest_artifact=ingest_artifact)
        recommendations = _build_guideline_recommendations(document, ser_artifact=ser_artifact)
        texts = [item.recommendation_text for item in recommendations]
        temporal_strings = ["; ".join(item.temporal_qualifiers) for item in recommendations]
        numeric_threshold_strings = ["; ".join(threshold.label for threshold in item.numeric_thresholds) for item in recommendations]
        time_windows = [item.time_window for item in recommendations if item.time_window]

        assert any("<12 hours" in text for text in texts)
        assert any(">24 hours" in text for text in texts)
        assert any("FFR >0.80" in text or "iFR >0.89" in text for text in texts)
        assert any("<12 hours" in value for value in temporal_strings)
        assert not any("FFR >0.80" in value or "iFR >0.89" in value for value in temporal_strings)
        assert any("FFR >0.80" in value or "iFR >0.89" in value for value in numeric_threshold_strings)
        assert any(">24 hours" in value for value in time_windows)

    run_in_workspace_temp(scenario)


def test_finalize_recommendation_statement_strips_citation_tails_without_losing_thresholds() -> None:
    statement = (
        "In stable patients with angiographically intermediate stenoses and FFR >0.80 or iFR >0.89, "
        "PCI should not be performed.7-10 ological methods of assessing lesion significance"
    )

    cleaned = _finalize_recommendation_statement(statement)

    assert cleaned == (
        "In stable patients with angiographically intermediate stenoses and FFR >0.80 or iFR >0.89, "
        "PCI should not be performed"
    )


def test_guideline_recommendations_extract_population_conditions_and_exclusions_cleanly() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        payload = base64.b64encode(
            (
                b"In stable patients with angiographically intermediate stenoses and FFR >0.80 or iFR >0.89, PCI should not be performed. "
                b"In patients with SIHD who have >=1 coronary arteries that are not anatomically or functionally significant (<70% diameter of non-left main coronary artery stenosis, FFR >0.80), coronary revascularization should not be performed with the primary or sole intent to improve survival. "
                b"In asymptomatic stable patients with STEMI who have a totally occluded infarct artery >24 hours after symptom onset and are without evidence of severe ischemia, PCI should not be performed."
            )
        ).decode("ascii")
        ingested = service.ingest_document(
            DocumentIngestionRequest(
                file_name="semantic-fields.txt",
                content_base64=payload,
                document_type="guideline",
                document_group="ACC-AHA",
            )
        )
        document = service.get_uploaded_document(ingested.document.document_id)
        assert document is not None

        ingest_artifact = _build_ingest_artifact(document)
        ser_artifact = _build_ser_artifact(document, ingest_artifact=ingest_artifact)
        recommendations = _build_guideline_recommendations(document, ser_artifact=ser_artifact)

        ffr_row = next(item for item in recommendations if "FFR >0.80 or iFR >0.89" in item.recommendation_text)
        sihd_row = next(item for item in recommendations if "SIHD" in item.recommendation_text)
        exclusion_row = next(item for item in recommendations if ">24 hours after symptom onset" in item.recommendation_text)

        assert ffr_row.population == "stable"
        assert ffr_row.clinical_state == "stable"
        assert ffr_row.clinical_topic == "Physiology and Complexity Assessment"
        assert ffr_row.document_family == "guideline_acc_aha_scai" or ffr_row.document_family == "guideline_generic"
        assert any(threshold.label == "FFR >0.80" for threshold in ffr_row.numeric_thresholds)
        assert "FFR >0.80" not in (ffr_row.time_window or "")
        assert any(entity.entity_type == "numeric_threshold" and entity.label == "FFR >0.80" for entity in ffr_row.clinical_entities)
        assert "angiographically intermediate stenoses and FFR >0.80 or iFR >0.89" in ffr_row.conditions

        assert sihd_row.population == "SIHD"
        assert sihd_row.disease == "SIHD"
        assert sihd_row.clinical_topic == "SIHD"
        assert sihd_row.intervention == "coronary revascularization"
        assert any(">=1 coronary arteries" in condition for condition in sihd_row.conditions)
        assert sihd_row.outcome == "improve survival"
        assert sihd_row.extraction_confidence is not None and sihd_row.extraction_confidence >= 0.70
        assert "population-extracted" in sihd_row.confidence_rationale
        assert any(entity.entity_type == "population" and entity.label == "SIHD" for entity in sihd_row.clinical_entities)
        assert sihd_row.execution_model.action == "coronary revascularization should not be performed"
        assert sihd_row.execution_model.intended_outcome == "improve survival"
        assert sihd_row.execution_model.trigger_model.population == "SIHD"
        assert any(
            constraint.constraint_type == "population" and constraint.label == "SIHD"
            for constraint in sihd_row.execution_model.trigger_model.constraints
        )

        assert exclusion_row.population == "STEMI"
        assert exclusion_row.disease == "STEMI"
        assert exclusion_row.clinical_topic == "STEMI"
        assert exclusion_row.clinical_state == "asymptomatic stable"
        assert exclusion_row.time_window == ">24 hours"
        assert exclusion_row.event_anchor == "symptom onset"
        assert exclusion_row.execution_model.trigger_model.population == "STEMI"
        assert exclusion_row.execution_model.trigger_model.time_constraint == ">24 hours"
        assert exclusion_row.execution_model.trigger_model.event_anchor == "symptom onset"
        assert exclusion_row.execution_model.trigger_model.exclusions == ["evidence of severe ischemia"]
        assert any(
            constraint.constraint_type == "time_window"
            and constraint.label == ">24 hours"
            and constraint.operator == "within"
            for constraint in exclusion_row.execution_model.trigger_model.constraints
        )
        assert any(
            constraint.constraint_type == "exclusion"
            and constraint.label == "evidence of severe ischemia"
            and constraint.operator == "absent"
            for constraint in exclusion_row.execution_model.trigger_model.constraints
        )
        assert any(">24 hours after symptom onset" in condition for condition in exclusion_row.conditions)
        assert exclusion_row.exclusions == ["evidence of severe ischemia"]
        assert any(
            constraint.constraint_type == "numeric_threshold"
            and constraint.label == "FFR >0.80"
            and constraint.operator == ">"
            and constraint.value == "0.80"
            for constraint in ffr_row.execution_model.trigger_model.constraints
        )
        assert any(
            constraint.constraint_type == "numeric_threshold"
            and constraint.label == "iFR >0.89"
            and constraint.operator == ">"
            and constraint.value == "0.89"
            for constraint in ffr_row.execution_model.trigger_model.constraints
        )

    run_in_workspace_temp(scenario)


def test_document_classification_weighting_changes_candidate_priority() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        guideline_statement = b"CABG should be considered for left main disease according to guideline context."
        operative_statement = b"CABG should be considered for left main disease documented in operative context."
        guideline = service.ingest_document(
            DocumentIngestionRequest(
                file_name="guideline.txt",
                content_base64=base64.b64encode(guideline_statement).decode("ascii"),
                document_type="guideline",
                document_group="ACC-AHA",
                specialty="Cirugia Cardiovascular",
                sub_specialty="CABG",
            )
        )
        operative = service.ingest_document(
            DocumentIngestionRequest(
                file_name="operative-note.txt",
                content_base64=base64.b64encode(operative_statement).decode("ascii"),
                document_type="operative-note",
                document_group="Local-OR",
                specialty="Cirugia Cardiovascular",
                sub_specialty="CABG",
            )
        )

        guideline_candidate = service.materialize_continuum(guideline.document.document_id).eo_candidates[0]
        operative_candidate = service.materialize_continuum(operative.document.document_id).eo_candidates[0]

        assert guideline_candidate.weight_score is not None
        assert operative_candidate.weight_score is not None
        assert guideline_candidate.weight_score > operative_candidate.weight_score
        assert guideline_candidate.information_weight in {"high", "critical"}
        assert operative_candidate.information_weight in {"moderate", "emerging", "high"}
        assert guideline_candidate.eo_type == "recommendation"

    run_in_workspace_temp(scenario)


def test_eo_candidate_types_are_classified_from_guideline_semantics() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        payload = base64.b64encode(
            (
                b"In stable patients with angiographically intermediate stenoses and FFR >0.80 or iFR >0.89, PCI should not be performed. "
                b"In asymptomatic stable patients with STEMI who have a totally occluded infarct artery >24 hours after symptom onset and are without evidence of severe ischemia, PCI should not be performed. "
                b"In patients for whom the optimal treatment strategy is unclear, a Heart Team approach is recommended to improve patient outcomes."
            )
        ).decode("ascii")
        ingested = service.ingest_document(
            DocumentIngestionRequest(
                file_name="eo-types.txt",
                content_base64=payload,
                document_type="guideline",
                document_group="ACC-AHA",
            )
        )

        materialized = service.materialize_continuum(ingested.document.document_id)
        threshold_candidate = next(item for item in materialized.eo_candidates if "FFR >0.80" in item.statement_text)
        timing_candidate = next(item for item in materialized.eo_candidates if ">24 hours after symptom onset" in item.statement_text)
        team_candidate = next(item for item in materialized.eo_candidates if "Heart Team approach" in item.statement_text)

        assert threshold_candidate.eo_type == "diagnostic_threshold"
        assert threshold_candidate.eo_subtype == "physiology_gated_action"
        assert timing_candidate.eo_type == "timing_rule"
        assert timing_candidate.eo_subtype == "time_window_action"
        assert team_candidate.eo_type == "team_decision"
        assert team_candidate.eo_subtype == "multidisciplinary_review"

    run_in_workspace_temp(scenario)


def test_clinical_topic_ranking_reconciles_multiple_documents() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        stemi_primary = service.ingest_document(
            DocumentIngestionRequest(
                file_name="stemi-primary.txt",
                content_base64=base64.b64encode(
                    b"In patients with STEMI and ischemic symptoms for <12 hours, PCI should be performed to improve survival."
                ).decode("ascii"),
                document_type="guideline",
                document_group="ACC-AHA",
            )
        )
        stemi_secondary = service.ingest_document(
            DocumentIngestionRequest(
                file_name="stemi-secondary.txt",
                content_base64=base64.b64encode(
                    b"In asymptomatic stable patients with STEMI who have a totally occluded infarct artery >24 hours after symptom onset and are without evidence of severe ischemia, PCI should not be performed."
                ).decode("ascii"),
                document_type="guideline",
                document_group="ESC",
            )
        )

        service.materialize_continuum(stemi_primary.document.document_id)
        service.materialize_continuum(stemi_secondary.document.document_id)

        ranking = service.build_clinical_topic_ranking(stemi_primary.document.document_id)
        stemi_entries = [entry for entry in ranking if entry.clinical_topic == "STEMI"]

        assert len(stemi_entries) >= 2
        assert any(entry.document_id == stemi_primary.document.document_id for entry in stemi_entries)
        assert any(entry.document_id == stemi_secondary.document.document_id for entry in stemi_entries)
        assert all(entry.recommendation_count >= 1 for entry in stemi_entries)
        assert any("timing_rule" in ";".join(entry.eo_type_summary) or "recommendation" in ";".join(entry.eo_type_summary) for entry in stemi_entries)

    run_in_workspace_temp(scenario)


def test_clinical_topic_conflicts_detect_opposed_document_stances() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        service = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        supportive = service.ingest_document(
            DocumentIngestionRequest(
                file_name="stemi-supportive.txt",
                content_base64=base64.b64encode(
                    b"In patients with STEMI and ischemic symptoms for <12 hours, PCI should be performed to improve survival."
                ).decode("ascii"),
                document_type="guideline",
                document_group="ACC-AHA",
            )
        )
        restrictive = service.ingest_document(
            DocumentIngestionRequest(
                file_name="stemi-restrictive.txt",
                content_base64=base64.b64encode(
                    b"In asymptomatic stable patients with STEMI who have a totally occluded infarct artery >24 hours after symptom onset and are without evidence of severe ischemia, PCI should not be performed."
                ).decode("ascii"),
                document_type="guideline",
                document_group="ESC",
            )
        )

        service.materialize_continuum(supportive.document.document_id)
        service.materialize_continuum(restrictive.document.document_id)

        conflicts = service.build_clinical_topic_conflicts(supportive.document.document_id)
        stemi_conflicts = [entry for entry in conflicts if entry.clinical_topic == "STEMI"]

        assert stemi_conflicts
        assert all(entry.conflict_level == "conflict" for entry in stemi_conflicts)
        all_stances = {
            entry.preferred_stance for entry in stemi_conflicts
        } | {
            entry.challenger_stance for entry in stemi_conflicts
        }
        assert "supportive" in all_stances
        assert "restrictive" in all_stances
        assert any(entry.preferred_document_id == supportive.document.document_id or entry.challenger_document_id == supportive.document.document_id for entry in stemi_conflicts)
        assert any(entry.preferred_document_id == restrictive.document.document_id or entry.challenger_document_id == restrictive.document.document_id for entry in stemi_conflicts)

    run_in_workspace_temp(scenario)


def test_governance_record_activation_updates_vrn_status() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        ingestion = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)
        governance = GovernanceRecordService(settings=settings)

        payload = base64.b64encode(b"governance record input").decode("ascii")
        ingested = ingestion.ingest_document(
            DocumentIngestionRequest(
                file_name="governance.txt",
                content_base64=payload,
                ingestion_notes="GCL activation.",
            )
        )

        record = governance.create_record(
            document=ingested.document,
            request=GovernanceRecordRequest(
                description="Activation record.",
                record_type="CR",
                source_domain="GCL",
                activate_vrn=True,
                vrn_status="ACTIVE",
            ),
        )

        updated = ingestion.get_uploaded_document(ingested.document.document_id)

        assert record.governance_record_id.startswith("GOV-")
        assert updated is not None
        assert updated.vrn_status == "ACTIVE"

    run_in_workspace_temp(scenario)


def test_materialization_requires_active_vrn() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        ingestion = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        payload = base64.b64encode(b"pending vrn doc").decode("ascii")
        ingested = ingestion.ingest_document(
            DocumentIngestionRequest(
                file_name="pending-vrn.txt",
                content_base64=payload,
            )
        )
        ingestion.activate_vrn_status(ingested.document.document_id, status="PENDING")

        try:
            ingestion.materialize_continuum(ingested.document.document_id)
            assert False, "Expected materialization to fail when VRN is not ACTIVE"
        except ValueError as error:
            assert "VRN must be ACTIVE" in str(error)

    run_in_workspace_temp(scenario)


def test_governance_feed_exports() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        ingestion = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)
        governance = GovernanceRecordService(settings=settings)

        payload = base64.b64encode(b"gcl feed record").decode("ascii")
        ingested = ingestion.ingest_document(
            DocumentIngestionRequest(
                file_name="gcl-feed.txt",
                content_base64=payload,
                ingestion_notes="Ledger feed test.",
            )
        )

        governance.create_record(
            document=ingested.document,
            request=GovernanceRecordRequest(
                description="Ledger entry test.",
                record_type="CR",
                source_domain="GCL",
                activate_vrn=True,
            ),
        )

        feed = governance.build_feed(limit=10)

        assert settings.gcl_runtime_feed_path.exists()
        assert settings.gcl_dashboard_feed_path.exists()
        assert settings.gcl_emulator_feed_path.exists()
        assert feed.records[0].source_document_id == ingested.document.document_id
        assert feed.records[0].source_file_name == ingested.document.file_name
        assert feed.records[0].source_absolute_path == ingested.document.absolute_path

    run_in_workspace_temp(scenario)


def test_audit_report_persists_document_timeline() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        ingestion = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)
        governance = GovernanceRecordService(settings=settings)
        audit = AuditReportService(settings=settings, database_path=settings.sqlite_path)

        payload = base64.b64encode(
            b"In patients with left main disease, CABG is recommended to improve survival."
        ).decode("ascii")
        ingested = ingestion.ingest_document(
            DocumentIngestionRequest(
                file_name="audit.txt",
                content_base64=payload,
                document_type="guideline",
                ingestion_notes="Audit baseline.",
            )
        )

        ingestion.materialize_continuum(ingested.document.document_id)
        governance.create_record(
            document=ingested.document,
            request=GovernanceRecordRequest(
                description="Audit governance record.",
                record_type="CR",
                source_domain="GCL",
                activate_vrn=True,
            ),
        )

        report = audit.get_report(ingested.document.document_id)

        assert report.document_present is True
        assert report.audit_status == "valid"
        assert report.file_exists is True
        assert report.materialized_artifacts.ingest_artifact_id == ingested.document.ingest_artifact_id
        assert report.materialized_artifacts.ser_artifact_id is not None
        assert report.materialized_artifacts.eo_artifact_id is not None
        assert report.materialized_artifacts.el_artifact_id is not None
        assert len(report.guideline_recommendations) >= 1
        assert report.guideline_recommendations[0].guidance_temporality is not None
        assert len(report.eo_candidates) >= 1
        assert report.eo_candidates[0].completion_level == "L1_structured"
        assert report.governance_records[0].source_document_id == ingested.document.document_id
        assert report.governance_records[0].source_file_name == ingested.document.file_name
        assert report.governance_records[0].source_absolute_path == ingested.document.absolute_path
        assert report.governance_records[0].source_relative_path == ingested.document.relative_path
        assert any(event.event_type == "DOCUMENT_INGESTED" for event in report.events)
        assert any(event.event_type == "CONTINUUM_MATERIALIZED" for event in report.events)
        assert any(event.event_type == "GOVERNANCE_RECORDED" for event in report.events)

        audit.write_feed_exports()
        assert settings.audit_runtime_feed_path.exists()
        assert settings.audit_dashboard_feed_path.exists()
        assert settings.audit_emulator_feed_path.exists()

    run_in_workspace_temp(scenario)


def test_audit_report_marks_orphaned_governance_records() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        ingestion = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)
        governance = GovernanceRecordService(settings=settings)
        audit = AuditReportService(settings=settings, database_path=settings.sqlite_path)

        payload = base64.b64encode(b"orphan governance record").decode("ascii")
        ingested = ingestion.ingest_document(
            DocumentIngestionRequest(
                file_name="orphan.txt",
                content_base64=payload,
            )
        )

        governance.create_record(
            document=ingested.document,
            request=GovernanceRecordRequest(
                description="Orphan governance record.",
                record_type="CR",
                source_domain="GCL",
                activate_vrn=True,
            ),
        )

        with get_connection(settings.sqlite_path) as connection:
            connection.execute(
                "DELETE FROM uploaded_source_documents WHERE document_id = ?",
                (ingested.document.document_id,),
            )
            connection.commit()

        report = audit.get_report(ingested.document.document_id)

        assert report.audit_status == "orphaned"
        assert report.document_present is False
        assert any("gobernanza sin documento fuente" in warning.lower() for warning in report.warnings)

    run_in_workspace_temp(scenario)


def test_audit_report_includes_eo_candidate_audits() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        ingestion = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)
        audit = AuditReportService(settings=settings, database_path=settings.sqlite_path)

        payload = base64.b64encode(
            b"CABG should be considered for left main disease. Surgical review should confirm feasibility."
        ).decode("ascii")
        ingested = ingestion.ingest_document(
            DocumentIngestionRequest(
                file_name="audit-eo-candidate.txt",
                content_base64=payload,
                document_type="guideline",
            )
        )
        materialized = ingestion.materialize_continuum(ingested.document.document_id)
        candidate = materialized.eo_candidates[0]

        ingestion.record_eo_candidate_audit(
            document_id=ingested.document.document_id,
            candidate_id=candidate.candidate_id,
            request=EvidenceObjectAuditRequest(
                audit_kind="clinical",
                decision="approved",
                signed_by="clinician-2",
            ),
        )

        report = audit.get_report(ingested.document.document_id)

        assert len(report.guideline_recommendations) >= 1
        assert report.guideline_recommendations[0].statement_key == candidate.statement_key
        assert len(report.eo_candidates) >= 1
        audited_candidate = next(item for item in report.eo_candidates if item.candidate_id == candidate.candidate_id)
        assert audited_candidate.clinical_audit_state == "approved"
        assert len(report.eo_candidate_audits) == 1
        assert report.eo_candidate_audits[0].candidate_id == candidate.candidate_id
        assert report.eo_candidate_audits[0].audit_kind == "clinical"

    run_in_workspace_temp(scenario)


def test_deprecation_blocks_reactivation() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        ingestion = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)
        governance = GovernanceRecordService(settings=settings)

        payload = base64.b64encode(b"sunset then active").decode("ascii")
        ingested = ingestion.ingest_document(
            DocumentIngestionRequest(file_name="sunset.txt", content_base64=payload)
        )

        governance.create_record(
            document=ingested.document,
            request=GovernanceRecordRequest(
                description="Sunset record.",
                record_type="deprecation",
                source_domain="GCL",
                activate_vrn=True,
                vrn_status="SUNSET",
            ),
        )

        try:
            governance.create_record(
                document=ingested.document,
                request=GovernanceRecordRequest(
                    description="Attempt reactivation.",
                    record_type="CR",
                    source_domain="GCL",
                    activate_vrn=True,
                    vrn_status="ACTIVE",
                    allow_reactivate=False,
                ),
            )
            assert False, "Expected VRN reactivation to be blocked by deprecation"
        except ValueError as error:
            assert "reactivation is blocked" in str(error)

    run_in_workspace_temp(scenario)


def test_document_classification_update_persists() -> None:
    def scenario(temp_root: Path) -> None:
        settings = build_settings(temp_root)
        initialize_database(settings.sqlite_path)
        ingestion = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)

        payload = base64.b64encode(b"classification doc").decode("ascii")
        ingested = ingestion.ingest_document(
            DocumentIngestionRequest(file_name="classify.txt", content_base64=payload)
        )

        updated = ingestion.update_classification(
            ingested.document.document_id,
            DocumentClassificationUpdate(
                specialty="Cardiologia",
                sub_specialty="Arritmias",
                epidemic_focus="N/A",
            ),
        )

        assert updated is not None
        assert updated.specialty == "Cardiologia"
        assert updated.sub_specialty == "Arritmias"
        assert updated.epidemic_focus == "N/A"

    run_in_workspace_temp(scenario)
