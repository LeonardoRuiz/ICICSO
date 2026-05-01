from __future__ import annotations

import csv
import hashlib
import re
import tarfile
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from bs4 import BeautifulSoup
from requests import Response, Session
import requests

USER_AGENT = "ICICSO-Papers/1.0 (local-clinical-research-pipeline; legally-compliant)"
REQUEST_TIMEOUT = 45
MAX_RETRIES = 3
BACKOFF_SECONDS = 1.5
PMC_OA_URL = "https://pmc.ncbi.nlm.nih.gov/utils/oa/oa.fcgi"


def create_session() -> Session:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept": "*/*"})
    return session


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _request(
    session: Session,
    method: str,
    url: str,
    *,
    params: dict[str, Any] | None = None,
    stream: bool = False,
) -> Response:
    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = session.request(
                method=method,
                url=url,
                params=params,
                timeout=REQUEST_TIMEOUT,
                stream=stream,
                allow_redirects=True,
            )
            if response.status_code in {429, 500, 502, 503, 504} and attempt < MAX_RETRIES:
                time.sleep(BACKOFF_SECONDS ** attempt)
                continue
            response.raise_for_status()
            return response
        except requests.HTTPError as exc:
            last_error = exc
            status_code = exc.response.status_code if exc.response is not None else None
            if status_code in {403, 404}:
                raise
            if attempt < MAX_RETRIES:
                time.sleep(BACKOFF_SECONDS ** attempt)
                continue
            raise
        except requests.RequestException as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                time.sleep(BACKOFF_SECONDS ** attempt)
                continue
            raise
    if last_error is not None:
        raise last_error
    raise RuntimeError(f"Request failed for {url}")


def _request_text(session: Session, url: str, params: dict[str, Any] | None = None) -> str:
    response = _request(session, "GET", url, params=params)
    return response.text


def _request_head(session: Session, url: str) -> Response:
    return _request(session, "HEAD", url)


def _normalize_token(text: str) -> str:
    text = re.sub(r"\s+", "_", text.strip().lower())
    text = re.sub(r"[^a-z0-9_]+", "", text)
    return text[:50] or "unknown"


def _first_author_slug(record: dict[str, Any]) -> str:
    authors = record.get("authors") or []
    if authors and authors[0].get("name"):
        return _normalize_token(authors[0]["name"].split()[-1])
    return "unknown_author"


def _short_title_slug(record: dict[str, Any]) -> str:
    title = record.get("title") or "untitled"
    words = re.findall(r"[A-Za-z0-9]+", title.lower())[:8]
    return _normalize_token("_".join(words))


def _identifier_slug(record: dict[str, Any]) -> str:
    for value in [record.get("doi"), record.get("pmid"), record.get("pmcid"), record.get("internal_paper_id")]:
        if value:
            return _normalize_token(str(value).replace("/", "_"))
    return "no_id"


def deterministic_filename(record: dict[str, Any], extension: str) -> str:
    year = str(record.get("year") or record.get("publication_year") or "unknown_year")
    return f"{year}_{_first_author_slug(record)}_{_short_title_slug(record)}_{_identifier_slug(record)}.{extension}"


def _checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _append_tsv(path: Path, columns: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t")
        writer.writerow(columns)


def log_download(log_path: Path, internal_paper_id: str, source: str, file_type: str, url: str, destination: str, status: str) -> None:
    _append_tsv(log_path, [utc_now(), internal_paper_id, source, file_type, url, destination, status])


def _allowed_download(record: dict[str, Any], candidate: dict[str, str]) -> bool:
    status = (record.get("open_access_status") or "").lower()
    license_name = (record.get("license") or "").lower()
    source = (candidate.get("source") or "").lower()
    url = candidate.get("url") or ""

    if source in {"europepmc", "pmc_oa"}:
        return True
    if status == "open":
        return True
    if "creativecommons.org" in license_name:
        return True
    if url.lower().startswith("https://ftp.ncbi.nlm.nih.gov/pub/pmc/"):
        return True
    return False


def _canonical_candidate_key(candidate: dict[str, str]) -> tuple[str, str]:
    return (candidate.get("file_type", ""), candidate.get("url", ""))


def discover_pmc_oa_assets(
    session: Session,
    pmcid: str | None,
    error_logger: Callable[[str, str, str, str, str], None] | None = None,
) -> list[dict[str, str]]:
    if not pmcid:
        return []
    try:
        xml_payload = _request_text(session, PMC_OA_URL, {"id": pmcid})
    except Exception as exc:
        if error_logger:
            error_logger("discover", "pmc_oa", pmcid, type(exc).__name__, str(exc))
        return []

    soup = BeautifulSoup(xml_payload, "xml")
    candidates: list[dict[str, str]] = []
    for link in soup.find_all("link"):
        href = link.get("href")
        format_name = (link.get("format") or "").lower()
        if not href:
            continue
        normalized_url = href.replace("ftp://ftp.ncbi.nlm.nih.gov/", "https://ftp.ncbi.nlm.nih.gov/")
        if format_name == "pdf":
            candidates.append({"file_type": "pdf", "url": normalized_url, "source": "pmc_oa"})
        elif format_name in {"tgz", "xml"}:
            candidates.append({"file_type": "xml", "url": normalized_url, "source": "pmc_oa"})
    return candidates


def _write_stream_to_path(session: Session, url: str, destination: Path) -> None:
    response = _request(session, "GET", url, stream=True)
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as handle:
        for chunk in response.iter_content(chunk_size=1024 * 64):
            if chunk:
                handle.write(chunk)


def _extract_xml_from_tgz(archive_path: Path, destination: Path) -> Path | None:
    with tarfile.open(archive_path, "r:gz") as archive:
        xml_members = [member for member in archive.getmembers() if member.isfile() and member.name.lower().endswith((".nxml", ".xml"))]
        if not xml_members:
            return None
        member = xml_members[0]
        extracted = archive.extractfile(member)
        if extracted is None:
            return None
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("wb") as handle:
            handle.write(extracted.read())
    return destination


def _candidate_targets(record: dict[str, Any], root_dir: Path) -> dict[str, Path]:
    raw_root = root_dir / "01_RAW"
    return {
        "pdf": raw_root / "pdf" / deterministic_filename(record, "pdf"),
        "xml": raw_root / "xml" / deterministic_filename(record, "xml"),
    }


def _download_xml_candidate(
    session: Session,
    record: dict[str, Any],
    candidate: dict[str, str],
    destination: Path,
    error_logger: Callable[[str, str, str, str, str], None] | None = None,
) -> tuple[str, Path | None]:
    url = candidate["url"]
    try:
        if url.lower().endswith(".tgz") or url.lower().endswith(".tar.gz"):
            with tempfile.TemporaryDirectory() as temp_dir:
                archive_path = Path(temp_dir) / "article.tgz"
                _write_stream_to_path(session, url, archive_path)
                extracted = _extract_xml_from_tgz(archive_path, destination)
                if extracted is None:
                    return "failed", None
                return "downloaded", extracted
        _write_stream_to_path(session, url, destination)
        return "downloaded", destination
    except Exception as exc:
        if error_logger:
            error_logger("download", candidate.get("source", "unknown"), record["internal_paper_id"], type(exc).__name__, str(exc))
        return "failed", None


def _download_pdf_candidate(
    session: Session,
    record: dict[str, Any],
    candidate: dict[str, str],
    destination: Path,
    error_logger: Callable[[str, str, str, str, str], None] | None = None,
) -> tuple[str, Path | None]:
    url = candidate["url"]
    try:
        try:
            head = _request_head(session, url)
            content_type = (head.headers.get("Content-Type") or "").lower()
            if content_type and "pdf" not in content_type and not url.lower().endswith(".pdf"):
                return "skipped", None
        except Exception:
            pass
        _write_stream_to_path(session, url, destination)
        return "downloaded", destination
    except Exception as exc:
        if error_logger:
            error_logger("download", candidate.get("source", "unknown"), record["internal_paper_id"], type(exc).__name__, str(exc))
        return "failed", None


def acquire_full_texts(
    session: Session,
    records: list[dict[str, Any]],
    root_dir: Path,
    download_log_path: Path,
    skipped_log_path: Path,
    error_logger: Callable[[str, str, str, str, str], None] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, str]], dict[str, int]]:
    files_rows: list[dict[str, str]] = []
    stats = {"downloaded_pdf": 0, "downloaded_xml": 0, "metadata_only": 0, "failed": 0, "skipped": 0}

    for record in records:
        targets = _candidate_targets(record, root_dir)
        candidates = list(record.get("download_candidates") or [])
        candidates.extend(discover_pmc_oa_assets(session, record.get("pmcid"), error_logger))

        unique_candidates: list[dict[str, str]] = []
        seen: set[tuple[str, str]] = set()
        for candidate in candidates:
            if not candidate.get("url"):
                continue
            key = _canonical_candidate_key(candidate)
            if key not in seen:
                seen.add(key)
                unique_candidates.append(candidate)

        downloaded_any = False
        downloaded_types: set[str] = set()

        for candidate in unique_candidates:
            file_type = candidate.get("file_type")
            if file_type not in {"pdf", "xml"}:
                continue
            if not _allowed_download(record, candidate):
                _append_tsv(skipped_log_path, [utc_now(), record["internal_paper_id"], f"candidate_not_oa:{candidate.get('url', '')}"])
                stats["skipped"] += 1
                continue

            destination = targets[file_type]
            if destination.exists():
                checksum = _checksum(destination)
                files_rows.append(
                    {
                        "internal_paper_id": record["internal_paper_id"],
                        "file_type": file_type,
                        "local_path": str(destination),
                        "download_url": candidate["url"],
                        "checksum": checksum,
                        "status": "exists",
                    }
                )
                log_download(download_log_path, record["internal_paper_id"], candidate.get("source", "unknown"), file_type, candidate["url"], str(destination), "exists")
                downloaded_any = True
                downloaded_types.add(file_type)
                continue

            if file_type == "xml":
                status, saved_path = _download_xml_candidate(session, record, candidate, destination, error_logger)
            else:
                status, saved_path = _download_pdf_candidate(session, record, candidate, destination, error_logger)

            if status == "downloaded" and saved_path is not None:
                checksum = _checksum(saved_path)
                files_rows.append(
                    {
                        "internal_paper_id": record["internal_paper_id"],
                        "file_type": file_type,
                        "local_path": str(saved_path),
                        "download_url": candidate["url"],
                        "checksum": checksum,
                        "status": "downloaded",
                    }
                )
                log_download(download_log_path, record["internal_paper_id"], candidate.get("source", "unknown"), file_type, candidate["url"], str(saved_path), "downloaded")
                downloaded_any = True
                downloaded_types.add(file_type)
                stats[f"downloaded_{file_type}"] += 1
            elif status == "skipped":
                files_rows.append(
                    {
                        "internal_paper_id": record["internal_paper_id"],
                        "file_type": file_type,
                        "local_path": "",
                        "download_url": candidate["url"],
                        "checksum": "",
                        "status": "skipped_non_pdf_response",
                    }
                )
                log_download(download_log_path, record["internal_paper_id"], candidate.get("source", "unknown"), file_type, candidate["url"], "", "skipped_non_pdf_response")
                stats["skipped"] += 1
            else:
                files_rows.append(
                    {
                        "internal_paper_id": record["internal_paper_id"],
                        "file_type": file_type,
                        "local_path": "",
                        "download_url": candidate["url"],
                        "checksum": "",
                        "status": "failed",
                    }
                )
                log_download(download_log_path, record["internal_paper_id"], candidate.get("source", "unknown"), file_type, candidate["url"], "", "failed")
                stats["failed"] += 1

        if "xml" in downloaded_types:
            record["full_text_status"] = "xml_downloaded"
        elif "pdf" in downloaded_types:
            record["full_text_status"] = "pdf_downloaded"
        elif unique_candidates and not downloaded_any:
            record["full_text_status"] = "restricted_or_unavailable"
        else:
            record["full_text_status"] = "restricted"

        if not downloaded_any:
            stats["metadata_only"] += 1

    return records, files_rows, stats
