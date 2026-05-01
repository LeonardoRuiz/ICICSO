import json
from datetime import UTC, datetime

from app.persistence.database import get_connection, initialize_database
from app.services.manifest_loader import ManifestLoader


class ManifestImportService:
    def __init__(self) -> None:
        self._loader = ManifestLoader()

    def import_manifest(self) -> dict[str, int | str]:
        initialize_database()
        payload = self._loader.load_payload()

        with get_connection() as connection:
            for document in payload["documents"]:
                connection.execute(
                    """
                    INSERT OR REPLACE INTO source_documents (
                        document_id,
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
                        derived_artifacts_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        document["document_id"],
                        document["file_name"],
                        document["absolute_path"],
                        document["relative_path"],
                        document.get("extension"),
                        document["document_type"],
                        document["layer"],
                        document["category"],
                        document["document_group"],
                        document["language"],
                        document.get("version_detected"),
                        document["size_bytes"],
                        document["last_write_time_utc"],
                        document["ingestion_timestamp_utc"],
                        document["hash_sha256"],
                        document["source_status"],
                        json.dumps(document.get("derived_artifacts", [])),
                    ),
                )

            imported_at_utc = datetime.now(UTC).isoformat()
            connection.execute(
                """
                INSERT INTO manifest_import_runs (
                    imported_at_utc,
                    manifest_name,
                    manifest_generated_at_utc,
                    total_documents
                ) VALUES (?, ?, ?, ?)
                """,
                (
                    imported_at_utc,
                    payload["manifest_name"],
                    payload["generated_at_utc"],
                    payload["total_documents"],
                ),
            )

        return {
            "manifest_name": payload["manifest_name"],
            "imported_documents": payload["total_documents"],
            "imported_at_utc": imported_at_utc,
        }
