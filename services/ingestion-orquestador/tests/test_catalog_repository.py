from app.services.catalog_repository import CatalogRepository


def test_catalog_repository_imports_manifest() -> None:
    repository = CatalogRepository()

    result = repository.import_manifest()

    assert result.imported_documents > 0
    assert result.imported_at_utc


def test_catalog_repository_lists_documents_from_sqlite() -> None:
    repository = CatalogRepository()
    repository.import_manifest()

    page = repository.list_documents(layer="ARCH", limit=5, offset=0)

    assert page.total > 0
    assert len(page.items) > 0
    assert all(item.layer == "ARCH" for item in page.items)


def test_catalog_repository_summary_includes_last_import_timestamp() -> None:
    repository = CatalogRepository()

    repository.import_manifest()
    summary = repository.load_summary()

    assert summary.total_documents > 0
    assert summary.imported_at_utc is not None


def test_catalog_repository_exposes_import_history() -> None:
    repository = CatalogRepository()

    repository.import_manifest()
    runs = repository.list_import_runs(limit=1)

    assert len(runs) == 1
    assert runs[0].total_documents > 0
