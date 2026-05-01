from __future__ import annotations

import json
import sys
from pathlib import Path


TESTS_DIR = Path(__file__).resolve().parent
DOWNLOADER_DIR = TESTS_DIR.parent
if str(DOWNLOADER_DIR) not in sys.path:
    sys.path.insert(0, str(DOWNLOADER_DIR))

import downloader  # noqa: E402


def test_run_manifest_entry_manual_records_state(tmp_path, monkeypatch) -> None:
    metadata_dir = tmp_path / "00_METADATA"
    data_root = tmp_path / "01_RAW"
    logs_dir = tmp_path / "logs"
    snomed_dir = data_root / "SNOMED_CT"
    snomed_dir.mkdir(parents=True)
    metadata_dir.mkdir(parents=True)
    logs_dir.mkdir(parents=True)

    monkeypatch.setattr(downloader, "METADATA_DIR", metadata_dir)
    monkeypatch.setattr(downloader, "STATE_PATH", metadata_dir / "download_state.json")
    monkeypatch.setattr(downloader, "MANIFEST_PATH", metadata_dir / "download_manifest.json")
    monkeypatch.setattr(downloader, "LOGS_DIR", logs_dir)
    monkeypatch.setattr(downloader, "DOWNLOAD_LOG", logs_dir / "download_log.tsv")
    monkeypatch.setattr(downloader, "ERROR_LOG", logs_dir / "error_log.tsv")
    monkeypatch.setitem(downloader.DATASET_DIRS, "SNOMED_CT", snomed_dir)

    downloader.ensure_directories()
    result = downloader.run_manifest_entry(
        {
            "dataset": "SNOMED_CT",
            "mode": "manual",
            "handler": "create_snomed_placeholder",
            "notes": "licencia requerida",
        }
    )

    assert result["status"] == "manual_required"
    state = json.loads((metadata_dir / "download_state.json").read_text(encoding="utf-8"))
    assert state["datasets"]["SNOMED_CT"]["status"] == "manual_required"
    assert "licencia requerida" in (snomed_dir / "README.txt").read_text(encoding="utf-8")


def test_download_file_preserves_existing_destination_on_failure(tmp_path, monkeypatch) -> None:
    destination = tmp_path / "rxnorm.zip"
    destination.write_bytes(b"PK\x03\x04existing-valid-zip")
    part_path = destination.with_suffix(".zip.part")
    part_path.write_text("<html>error page</html>", encoding="utf-8")

    class FakeResponse:
        status_code = 200
        headers = {"Content-Length": "23"}

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def raise_for_status(self) -> None:
            return None

        def iter_content(self, chunk_size: int = 0):
            yield b"<html>error page</html>"

    class FakeSession:
        def get(self, url: str, stream: bool, timeout: int, headers: dict[str, str]):
            return FakeResponse()

    monkeypatch.setattr(downloader, "log_error", lambda *args, **kwargs: None)
    monkeypatch.setattr(downloader, "log_download", lambda *args, **kwargs: None)

    result = downloader.download_file(
        "RXNORM",
        "https://example.invalid/rxnorm.zip",
        destination,
        session=FakeSession(),
        retries=1,
    )

    assert result["status"] == "failed"
    assert destination.read_bytes() == b"PK\x03\x04existing-valid-zip"
    assert part_path.exists()


def test_download_loinc_non_interactive_without_credentials_is_pending(tmp_path, monkeypatch) -> None:
    loinc_dir = tmp_path / "LOINC"
    loinc_dir.mkdir(parents=True)
    monkeypatch.setitem(downloader.DATASET_DIRS, "LOINC", loinc_dir)
    monkeypatch.delenv("LOINC_USERNAME", raising=False)
    monkeypatch.delenv("LOINC_PASSWORD", raising=False)
    monkeypatch.setattr(downloader, "log_download", lambda *args, **kwargs: None)

    result = downloader.download_loinc({}, allow_prompt=False)

    assert result["status"] == "awaiting_credentials"
    assert "LOINC_USERNAME" in result["message"]


def test_discover_hl7_fhir_r5_url_prefers_definitions_xml_zip(monkeypatch) -> None:
    html = """
    <html><body>
      <a href="definitions.json.zip">JSON</a>
      <a href="definitions.xml.zip">XML</a>
    </body></html>
    """

    class FakeResponse:
      def __init__(self):
        self.text = html
        self.url = "https://www.hl7.org/fhir/R5/downloads.html"

    monkeypatch.setattr(downloader, "_request_with_retries", lambda *args, **kwargs: FakeResponse())

    url = downloader._discover_hl7_fhir_r5_url(object())

    assert url == "https://www.hl7.org/fhir/R5/definitions.xml.zip"


def test_discover_mesh_xml_url_follows_current_year_link(monkeypatch) -> None:
    landing_html = """
    <html><body>
      <a href="https://example.org/current-mesh-xml">Download Current Production Year MeSH in XML format</a>
    </body></html>
    """
    detail_html = """
    <html><body>
      <a href="/xmlmesh/desc2026.xml">Descriptor XML</a>
    </body></html>
    """

    class FakeResponse:
      def __init__(self, text: str, url: str):
        self.text = text
        self.url = url

    calls = {"count": 0}

    def fake_request(*args, **kwargs):
      calls["count"] += 1
      if calls["count"] == 1:
        return FakeResponse(landing_html, "https://www.nlm.nih.gov/databases/download/mesh.html")
      return FakeResponse(detail_html, "https://example.org/current-mesh-xml")

    monkeypatch.setattr(downloader, "_request_with_retries", fake_request)

    url = downloader._discover_mesh_xml_url(object())

    assert url == "https://example.org/xmlmesh/desc2026.xml"
