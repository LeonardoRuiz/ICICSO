import json
from pathlib import Path

from app.core.config import get_settings
from app.domain.models import ManifestSummary, SourceDocument


class ManifestRepository:
    def __init__(self, manifest_path: Path | None = None) -> None:
        settings = get_settings()
        self._manifest_path = manifest_path or settings.manifest_path

    def load_summary(self) -> ManifestSummary:
        payload = self.load_manifest_payload()
        return ManifestSummary(
            manifest_name=payload["manifest_name"],
            generated_at_utc=payload["generated_at_utc"],
            root_path=payload["root_path"],
            total_documents=payload["total_documents"],
            catalog_roots=payload["catalog_roots"],
        )

    def list_documents(
        self,
        *,
        layer: str | None = None,
        category: str | None = None,
    ) -> list[SourceDocument]:
        documents = [
            SourceDocument.model_validate(item)
            for item in self.load_manifest_payload()["documents"]
        ]

        if layer is not None:
            documents = [
                item for item in documents if item.layer.lower() == layer.lower()
            ]

        if category is not None:
            documents = [
                item for item in documents if item.category.lower() == category.lower()
            ]

        return documents

    def get_document(self, document_id: str) -> SourceDocument | None:
        for document in self.list_documents():
            if document.document_id == document_id:
                return document

        return None

    def _load_manifest_payload(self) -> dict:
        if not self._manifest_path.exists():
            raise FileNotFoundError(f"Manifest file not found: {self._manifest_path}")

        return json.loads(self._manifest_path.read_text(encoding="utf-8-sig"))

    def load_manifest_payload(self) -> dict:
        return self._load_manifest_payload()
