import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from app.domain.models import (
    CatalogImportResult,
    ManifestImportRun,
    ManifestSummary,
    SourceDocument,
    SourceDocumentPage,
)
from app.persistence.database import get_connection, initialize_database
from app.services.document_ingestion_service import _row_to_document
from app.services.manifest_repository import ManifestRepository


class CatalogRepository:
    def __init__(
        self,
        *,
        manifest_repository: ManifestRepository | None = None,
        database_path: Path | None = None,
    ) -> None:
        self._manifest_repository = manifest_repository or ManifestRepository()
        self._database_path = database_path
        initialize_database(self._database_path)

    @property
    def database_path(self) -> Path:
        if self._database_path is not None:
            return self._database_path.resolve()

        with get_connection(self._database_path) as connection:
            row = connection.execute("PRAGMA database_list").fetchone()
        return Path(row["file"]).resolve()

    def import_manifest(self) -> CatalogImportResult:
        payload = self._manifest_repository.load_manifest_payload()
        documents = payload["documents"]
        imported_at_utc = datetime.now(UTC).isoformat()

        with get_connection(self._database_path) as connection:
            connection.execute("DELETE FROM source_documents")
            connection.executemany(
                """
                INSERT INTO source_documents (
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
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [self._to_record(document) for document in documents],
            )
            connection.execute(
                """
                INSERT INTO manifest_import_runs (
                    imported_at_utc,
                    manifest_name,
                    manifest_generated_at_utc,
                    total_documents
                )
                VALUES (?, ?, ?, ?)
                """,
                (
                    imported_at_utc,
                    payload["manifest_name"],
                    payload["generated_at_utc"],
                    len(documents),
                ),
            )
            connection.commit()

        return CatalogImportResult(
            manifest_name=payload["manifest_name"],
            imported_documents=len(documents),
            sqlite_path=str(self.database_path),
            imported_at_utc=imported_at_utc,
        )

    def ensure_catalog_ready(self) -> None:
        with get_connection(self._database_path) as connection:
            total = connection.execute(
                "SELECT COUNT(*) AS total FROM source_documents"
            ).fetchone()["total"]

        if total == 0:
            self.import_manifest()

    def load_summary(self) -> ManifestSummary:
        payload = self._manifest_repository.load_manifest_payload()

        with get_connection(self._database_path) as connection:
            run = connection.execute(
                """
                SELECT imported_at_utc
                FROM manifest_import_runs
                ORDER BY import_id DESC
                LIMIT 1
                """
            ).fetchone()
            uploaded_total = connection.execute(
                "SELECT COUNT(*) AS total FROM uploaded_source_documents"
            ).fetchone()["total"]

        return ManifestSummary(
            manifest_name=payload["manifest_name"],
            generated_at_utc=payload["generated_at_utc"],
            root_path=payload["root_path"],
            total_documents=payload["total_documents"] + uploaded_total,
            catalog_roots=payload["catalog_roots"],
            imported_at_utc=run["imported_at_utc"] if run is not None else None,
            uploaded_documents=uploaded_total,
            continuum_ready_documents=uploaded_total,
        )

    def list_import_runs(self, *, limit: int = 10) -> list[ManifestImportRun]:
        with get_connection(self._database_path) as connection:
            rows = connection.execute(
                """
                SELECT import_id, imported_at_utc, manifest_name, manifest_generated_at_utc, total_documents
                FROM manifest_import_runs
                ORDER BY import_id DESC
                LIMIT ?
                """,
                [limit],
            ).fetchall()

        return [
            ManifestImportRun(
                import_id=row["import_id"],
                imported_at_utc=row["imported_at_utc"],
                manifest_name=row["manifest_name"],
                manifest_generated_at_utc=row["manifest_generated_at_utc"],
                total_documents=row["total_documents"],
            )
            for row in rows
        ]

    def list_documents(
        self,
        *,
        layer: str | None = None,
        category: str | None = None,
        document_group: str | None = None,
        language: str | None = None,
        specialty: str | None = None,
        sub_specialty: str | None = None,
        epidemic_focus: str | None = None,
        query: str | None = None,
        limit: int = 25,
        offset: int = 0,
    ) -> SourceDocumentPage:
        filters: list[str] = []
        params: list[object] = []

        if layer:
            filters.append("LOWER(layer) = LOWER(?)")
            params.append(layer)
        if category:
            filters.append("LOWER(category) = LOWER(?)")
            params.append(category)
        if document_group:
            filters.append("LOWER(document_group) = LOWER(?)")
            params.append(document_group)
        if language:
            filters.append("LOWER(language) = LOWER(?)")
            params.append(language)
        if query:
            filters.append(
                "(LOWER(file_name) LIKE LOWER(?) OR LOWER(relative_path) LIKE LOWER(?) OR LOWER(category) LIKE LOWER(?))"
            )
            like = f"%{query}%"
            params.extend([like, like, like])

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

        with get_connection(self._database_path) as connection:
            manifest_rows = connection.execute(
                f"SELECT * FROM source_documents {where_clause}",
                params,
            ).fetchall()
            uploaded_rows = connection.execute(
                f"SELECT * FROM uploaded_source_documents {where_clause}",
                params,
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

        documents = [self._row_to_document(row) for row in manifest_rows] + [
            _row_to_document(row) for row in uploaded_rows
        ]
        for document in documents:
            classification = classification_map.get(document.document_id)
            if classification is not None:
                document.specialty = classification["specialty"]
                document.sub_specialty = classification["sub_specialty"]
                document.epidemic_focus = classification["epidemic_focus"]

        if specialty:
            documents = [
                document
                for document in documents
                if (document.specialty or "").lower() == specialty.lower()
            ]
        if sub_specialty:
            documents = [
                document
                for document in documents
                if (document.sub_specialty or "").lower() == sub_specialty.lower()
            ]
        if epidemic_focus:
            documents = [
                document
                for document in documents
                if (document.epidemic_focus or "").lower() == epidemic_focus.lower()
            ]
        documents.sort(key=lambda item: item.relative_path.lower())
        total = len(documents)
        page_items = documents[offset : offset + limit]

        return SourceDocumentPage(
            items=page_items,
            total=total,
            limit=limit,
            offset=offset,
        )

    def get_document(self, document_id: str) -> SourceDocument | None:
        with get_connection(self._database_path) as connection:
            row = connection.execute(
                "SELECT * FROM source_documents WHERE document_id = ?",
                [document_id],
            ).fetchone()
            if row is None:
                row = connection.execute(
                    "SELECT * FROM uploaded_source_documents WHERE document_id = ?",
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

        document = _row_to_document(row) if "source_origin" in row.keys() else self._row_to_document(row)
        if classification is not None:
            document.specialty = classification["specialty"]
            document.sub_specialty = classification["sub_specialty"]
            document.epidemic_focus = classification["epidemic_focus"]

        return document

    @staticmethod
    def _to_record(document: dict) -> tuple[object, ...]:
        return (
            document["document_id"],
            document["file_name"],
            document["absolute_path"],
            document["relative_path"],
            document["extension"],
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
        )

    @staticmethod
    def _row_to_document(row: sqlite3.Row) -> SourceDocument:
        return SourceDocument(
            document_id=row["document_id"],
            lineage_id=row["lineage_id"] if "lineage_id" in row.keys() else None,
            lineage_key=row["lineage_key"] if "lineage_key" in row.keys() else None,
            version_number=row["version_number"] if "version_number" in row.keys() else None,
            institutional_version=row["institutional_version"] if "institutional_version" in row.keys() else None,
            previous_document_id=row["previous_document_id"] if "previous_document_id" in row.keys() else None,
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
