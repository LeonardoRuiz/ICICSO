from app.services.manifest_repository import ManifestRepository


def test_manifest_repository_loads_summary() -> None:
    repository = ManifestRepository()

    summary = repository.load_summary()

    assert summary.total_documents > 0
    assert summary.manifest_name == "ICICSO Local Source Manifest"


def test_manifest_repository_finds_known_document() -> None:
    repository = ManifestRepository()

    document = repository.get_document("DOC-E05B0B4CE5A0")

    assert document is not None
    assert document.file_name == "Arquitectura - Documentos Inputs Outputs.docx"
