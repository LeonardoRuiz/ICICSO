import json

from app.domain.models import ManifestSummary, SourceDocument
from app.persistence.database import get_connection


class SourceDocumentRepository:
    def load_summary(self) -> ManifestSummary:
        with get_connection() as connection:
            run = connection.execute(
                """
                SELECT imported_at_utc, manifest_name, manifest_generated_at_utc, total_documents
                FROM manifest_import_runs
                ORDER BY import_id DESC
                LIMIT 1
                """
            ).fetchone()

            if run is None:
                return ManifestSummary(
                    manifest_name="ICICSO Local Source Manifest",
                    generated_at_utc="",
                    root_path="",
                    total_documents=0,
                    catalog_roots=[],
                    imported_at_utc=None,
                )

            first_document = connection.execute(
                """
                SELECT absolute_path
                FROM source_documents
                ORDER BY document_id
                LIMIT 1
                """
            ).fetchone()
            uploaded_total = connection.execute(
                "SELECT COUNT(*) AS total FROM uploaded_source_documents"
            ).fetchone()["total"]

        root_path = ""
        if first_document is not None:
            root_path = first_document["absolute_path"]

        return ManifestSummary(
            manifest_name=run["manifest_name"],
            generated_at_utc=run["manifest_generated_at_utc"],
            root_path=root_path,
            total_documents=run["total_documents"] + uploaded_total,
            catalog_roots=[
                "01_Arquitectura_Base",
                "02_Capas",
                "03_Outputs",
                "04_Referencias_Externas",
                "05_Catalogos_Listados",
                "06_Trabajo_Colaborativo",
                "99_Archivo_Historico",
            ],
            imported_at_utc=run["imported_at_utc"],
            uploaded_documents=uploaded_total,
            continuum_ready_documents=uploaded_total,
        )

    def list_documents(
        self,
        *,
        layer: str | None = None,
        category: str | None = None,
    ) -> list[SourceDocument]:
        with get_connection() as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM source_documents
                WHERE (? IS NULL OR LOWER(layer) = LOWER(?))
                  AND (? IS NULL OR LOWER(category) = LOWER(?))
                ORDER BY document_id
                """,
                (layer, layer, category, category),
            ).fetchall()

        return [self._row_to_model(row) for row in rows]

    def get_document(self, document_id: str) -> SourceDocument | None:
        with get_connection() as connection:
            row = connection.execute(
                "SELECT * FROM source_documents WHERE document_id = ?",
                (document_id,),
            ).fetchone()

        if row is None:
            return None

        return self._row_to_model(row)

    @staticmethod
    def _row_to_model(row) -> SourceDocument:
        return SourceDocument(
            document_id=row["document_id"],
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
            derived_artifacts=json.loads(row["derived_artifacts_json"]),
        )
