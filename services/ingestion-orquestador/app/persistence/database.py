import sqlite3
from pathlib import Path

from app.core.config import get_settings


def get_connection(database_path: Path | None = None) -> sqlite3.Connection:
    settings = get_settings()
    db_path = database_path or settings.sqlite_path
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database(database_path: Path | None = None) -> Path:
    db_path = (database_path or get_settings().sqlite_path).resolve()

    with get_connection(database_path) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS source_documents (
                document_id TEXT PRIMARY KEY,
                file_name TEXT NOT NULL,
                absolute_path TEXT NOT NULL,
                relative_path TEXT NOT NULL,
                extension TEXT NOT NULL,
                document_type TEXT NOT NULL,
                layer TEXT NOT NULL,
                category TEXT NOT NULL,
                document_group TEXT NOT NULL,
                language TEXT NOT NULL,
                version_detected TEXT NULL,
                size_bytes INTEGER NOT NULL,
                last_write_time_utc TEXT NOT NULL,
                ingestion_timestamp_utc TEXT NOT NULL,
                hash_sha256 TEXT NOT NULL,
                source_status TEXT NOT NULL,
                derived_artifacts_json TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_source_documents_layer
            ON source_documents(layer)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_source_documents_category
            ON source_documents(category)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_source_documents_group
            ON source_documents(document_group)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS manifest_import_runs (
                import_id INTEGER PRIMARY KEY AUTOINCREMENT,
                imported_at_utc TEXT NOT NULL,
                manifest_name TEXT NOT NULL,
                manifest_generated_at_utc TEXT NOT NULL,
                total_documents INTEGER NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS uploaded_source_documents (
                document_id TEXT PRIMARY KEY,
                lineage_id TEXT,
                lineage_key TEXT,
                source_vrn TEXT NOT NULL,
                vrn_policy_id TEXT,
                version_number INTEGER,
                institutional_version TEXT,
                previous_document_id TEXT,
                vrn_status TEXT,
                ingest_artifact_id TEXT NOT NULL,
                ser_artifact_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                absolute_path TEXT NOT NULL,
                relative_path TEXT NOT NULL,
                extension TEXT NOT NULL,
                document_type TEXT NOT NULL,
                layer TEXT NOT NULL,
                category TEXT NOT NULL,
                document_group TEXT NOT NULL,
                language TEXT NOT NULL,
                version_detected TEXT NULL,
                size_bytes INTEGER NOT NULL,
                last_write_time_utc TEXT NOT NULL,
                ingestion_timestamp_utc TEXT NOT NULL,
                hash_sha256 TEXT NOT NULL UNIQUE,
                source_status TEXT NOT NULL,
                source_origin TEXT NOT NULL,
                continuum_stage TEXT NOT NULL,
                ingestion_notes TEXT NULL,
                derived_artifacts_json TEXT NOT NULL
            )
            """
        )
        for statement in [
            "ALTER TABLE uploaded_source_documents ADD COLUMN lineage_id TEXT",
            "ALTER TABLE uploaded_source_documents ADD COLUMN lineage_key TEXT",
            "ALTER TABLE uploaded_source_documents ADD COLUMN source_vrn TEXT",
            "ALTER TABLE uploaded_source_documents ADD COLUMN vrn_policy_id TEXT",
            "ALTER TABLE uploaded_source_documents ADD COLUMN version_number INTEGER",
            "ALTER TABLE uploaded_source_documents ADD COLUMN institutional_version TEXT",
            "ALTER TABLE uploaded_source_documents ADD COLUMN previous_document_id TEXT",
            "ALTER TABLE uploaded_source_documents ADD COLUMN vrn_status TEXT",
            "ALTER TABLE uploaded_source_documents ADD COLUMN ingest_artifact_id TEXT",
            "ALTER TABLE uploaded_source_documents ADD COLUMN ser_artifact_id TEXT",
        ]:
            try:
                connection.execute(statement)
            except sqlite3.OperationalError:
                pass
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_uploaded_source_documents_layer
            ON uploaded_source_documents(layer)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_uploaded_source_documents_category
            ON uploaded_source_documents(category)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_uploaded_source_documents_lineage
            ON uploaded_source_documents(lineage_id, version_number)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS document_lineages (
                lineage_id TEXT PRIMARY KEY,
                lineage_key TEXT NOT NULL UNIQUE,
                current_version_number INTEGER NOT NULL,
                current_document_id TEXT NULL,
                created_at TEXT NOT NULL,
                created_by TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS document_versions (
                version_id TEXT PRIMARY KEY,
                lineage_id TEXT NOT NULL,
                lineage_key TEXT NOT NULL,
                document_id TEXT NOT NULL UNIQUE,
                version_number INTEGER NOT NULL,
                institutional_version TEXT NOT NULL,
                previous_document_id TEXT NULL,
                vrn TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                issued_at TEXT NOT NULL,
                issued_by TEXT NOT NULL,
                change_reason TEXT NOT NULL,
                FOREIGN KEY(lineage_id) REFERENCES document_lineages(lineage_id)
            )
            """
        )
        connection.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_document_versions_lineage_version
            ON document_versions(lineage_id, version_number)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS source_evidence_records (
                source_id TEXT PRIMARY KEY,
                artifact_id TEXT NOT NULL,
                vrn TEXT NOT NULL,
                artifact_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS evidence_objects (
                source_id TEXT PRIMARY KEY,
                artifact_id TEXT NOT NULL,
                vrn TEXT NOT NULL,
                artifact_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS eo_candidates (
                candidate_id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                ser_artifact_id TEXT NOT NULL,
                primary_eo_artifact_id TEXT NOT NULL,
                statement_key TEXT NOT NULL,
                statement_text TEXT NOT NULL,
                canonical_title TEXT NOT NULL,
                domain TEXT NOT NULL,
                recommendation_class TEXT NULL,
                level_of_evidence TEXT NULL,
                eo_type TEXT NULL,
                eo_subtype TEXT NULL,
                source_excerpt TEXT NULL,
                completion_level TEXT NOT NULL,
                review_state TEXT NOT NULL,
                clinical_audit_state TEXT NOT NULL,
                surgical_audit_state TEXT NOT NULL,
                finalization_status TEXT NOT NULL,
                evidence_strength TEXT NULL,
                information_weight TEXT NULL,
                weight_score REAL NULL,
                weight_rationale TEXT NULL,
                source_locator TEXT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS guideline_recommendations (
                recommendation_id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                ser_artifact_id TEXT NOT NULL,
                statement_key TEXT NOT NULL,
                canonical_title TEXT NOT NULL,
                recommendation_text TEXT NOT NULL,
                recommendation_class TEXT NULL,
                level_of_evidence TEXT NULL,
                document_family TEXT NULL,
                clinical_topic TEXT NULL,
                population TEXT NULL,
                intervention TEXT NULL,
                comparator TEXT NULL,
                outcome TEXT NULL,
                conditions_json TEXT NOT NULL,
                exclusions_json TEXT NOT NULL,
                clinical_state TEXT NULL,
                disease TEXT NULL,
                severity TEXT NULL,
                time_window TEXT NULL,
                event_anchor TEXT NULL,
                numeric_thresholds_json TEXT NOT NULL DEFAULT '[]',
                care_phase TEXT NULL,
                clinical_temporality TEXT NULL,
                temporal_qualifiers_json TEXT NOT NULL,
                guidance_temporality TEXT NULL,
                care_setting TEXT NULL,
                specialty TEXT NULL,
                sub_specialty TEXT NULL,
                source_excerpt TEXT NULL,
                source_locator TEXT NULL,
                information_weight TEXT NULL,
                weight_score REAL NULL,
                weight_rationale TEXT NULL,
                extraction_confidence REAL NULL,
                confidence_rationale_json TEXT NOT NULL DEFAULT '[]',
                clinical_entities_json TEXT NOT NULL DEFAULT '[]',
                execution_model_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_guideline_recommendations_document_id
            ON guideline_recommendations(document_id, created_at DESC)
            """
        )
        for statement in [
            "ALTER TABLE eo_candidates ADD COLUMN recommendation_class TEXT",
            "ALTER TABLE eo_candidates ADD COLUMN level_of_evidence TEXT",
            "ALTER TABLE eo_candidates ADD COLUMN eo_type TEXT",
            "ALTER TABLE eo_candidates ADD COLUMN eo_subtype TEXT",
            "ALTER TABLE eo_candidates ADD COLUMN information_weight TEXT",
            "ALTER TABLE eo_candidates ADD COLUMN weight_score REAL",
            "ALTER TABLE eo_candidates ADD COLUMN weight_rationale TEXT",
            "ALTER TABLE eo_candidates ADD COLUMN source_locator TEXT",
            "ALTER TABLE guideline_recommendations ADD COLUMN extraction_confidence REAL",
            "ALTER TABLE guideline_recommendations ADD COLUMN confidence_rationale_json TEXT NOT NULL DEFAULT '[]'",
            "ALTER TABLE guideline_recommendations ADD COLUMN clinical_entities_json TEXT NOT NULL DEFAULT '[]'",
            "ALTER TABLE guideline_recommendations ADD COLUMN execution_model_json TEXT NOT NULL DEFAULT '{}'",
            "ALTER TABLE guideline_recommendations ADD COLUMN clinical_state TEXT",
            "ALTER TABLE guideline_recommendations ADD COLUMN disease TEXT",
            "ALTER TABLE guideline_recommendations ADD COLUMN severity TEXT",
            "ALTER TABLE guideline_recommendations ADD COLUMN time_window TEXT",
            "ALTER TABLE guideline_recommendations ADD COLUMN event_anchor TEXT",
            "ALTER TABLE guideline_recommendations ADD COLUMN numeric_thresholds_json TEXT NOT NULL DEFAULT '[]'",
            "ALTER TABLE guideline_recommendations ADD COLUMN care_phase TEXT",
            "ALTER TABLE guideline_recommendations ADD COLUMN document_family TEXT",
            "ALTER TABLE guideline_recommendations ADD COLUMN clinical_topic TEXT",
        ]:
            try:
                connection.execute(statement)
            except sqlite3.OperationalError:
                pass
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_eo_candidates_document_id
            ON eo_candidates(document_id, updated_at DESC)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS eo_candidate_audits (
                audit_id TEXT PRIMARY KEY,
                candidate_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                audit_kind TEXT NOT NULL,
                decision TEXT NOT NULL,
                comments TEXT NULL,
                requested_changes_json TEXT NOT NULL,
                signed_by TEXT NOT NULL,
                signed_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_eo_candidate_audits_candidate_id
            ON eo_candidate_audits(candidate_id, signed_at DESC)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS evidence_lake_records (
                source_id TEXT PRIMARY KEY,
                artifact_id TEXT NOT NULL,
                vrn TEXT NOT NULL,
                artifact_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS governance_records (
                governance_record_id TEXT PRIMARY KEY,
                record_type TEXT NOT NULL,
                vrn TEXT NOT NULL,
                severity TEXT NOT NULL,
                description TEXT NOT NULL,
                source_domain TEXT NOT NULL,
                affected_entities_json TEXT NOT NULL,
                effective_from TEXT NOT NULL,
                effective_to TEXT NULL,
                append_only_flag INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                created_by TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS document_audit_events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NULL,
                vrn TEXT NULL,
                event_type TEXT NOT NULL,
                stage TEXT NULL,
                actor TEXT NOT NULL,
                summary TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                related_record_id TEXT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_document_audit_events_document_id
            ON document_audit_events(document_id, created_at)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS document_classifications (
                document_id TEXT PRIMARY KEY,
                specialty TEXT NOT NULL,
                sub_specialty TEXT NOT NULL,
                epidemic_focus TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                updated_by TEXT NOT NULL
            )
            """
        )
        connection.commit()

    return db_path
