from fastapi import HTTPException

from app.api.routes.source_documents import require_import_api_key
from app.persistence.database import initialize_database
from app.services.source_document_repository import SourceDocumentRepository


def test_database_initializes() -> None:
    path = initialize_database()
    assert path.name == "icicso_catalog.db"


def test_empty_repository_summary_is_safe() -> None:
    initialize_database()
    summary = SourceDocumentRepository().load_summary()

    assert summary.total_documents >= 0
    assert summary.manifest_name == "ICICSO Local Source Manifest"
    assert summary.imported_at_utc is not None


def test_import_requires_matching_api_key(monkeypatch) -> None:
    monkeypatch.setenv("INGESTION_IMPORT_API_KEY", "super-secret-import-key")
    from app.core.config import get_settings

    get_settings.cache_clear()

    try:
        require_import_api_key("super-secret-import-key")
    finally:
        get_settings.cache_clear()


def test_import_rejects_missing_or_invalid_api_key(monkeypatch) -> None:
    from app.core.config import get_settings

    monkeypatch.delenv("INGESTION_IMPORT_API_KEY", raising=False)
    get_settings.cache_clear()

    try:
        try:
            require_import_api_key(None)
            assert False, "Expected import endpoint to be disabled without API key"
        except HTTPException as error:
            assert error.status_code == 503
    finally:
        get_settings.cache_clear()

    monkeypatch.setenv("INGESTION_IMPORT_API_KEY", "super-secret-import-key")
    get_settings.cache_clear()

    try:
        try:
            require_import_api_key("wrong-key")
            assert False, "Expected invalid API key to be rejected"
        except HTTPException as error:
            assert error.status_code == 401
    finally:
        get_settings.cache_clear()
