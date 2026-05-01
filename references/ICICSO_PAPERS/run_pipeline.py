from __future__ import annotations

import csv
from pathlib import Path
from typing import Any

import yaml
from tqdm import tqdm

from downloader import acquire_full_texts, create_session as create_download_session, utc_now
from normalize_records import deduplicate_records, persist_raw_record_artifacts, write_normalized_outputs
from search_sources import create_session as create_search_session, run_all_searches

PROJECT_ROOT = Path(__file__).resolve().parent


def ensure_project_structure(root_dir: Path) -> None:
    directories = [
        root_dir / "00_CONFIG",
        root_dir / "01_RAW" / "metadata",
        root_dir / "01_RAW" / "abstracts",
        root_dir / "01_RAW" / "pdf",
        root_dir / "01_RAW" / "xml",
        root_dir / "02_STAGING" / "pubmed",
        root_dir / "02_STAGING" / "europepmc",
        root_dir / "02_STAGING" / "openalex",
        root_dir / "02_STAGING" / "crossref",
        root_dir / "03_NORMALIZED",
        root_dir / "04_COLLECTIONS" / "by_topic",
        root_dir / "04_COLLECTIONS" / "by_domain",
        root_dir / "04_COLLECTIONS" / "by_year",
        root_dir / "04_COLLECTIONS" / "by_study_type",
        root_dir / "05_LOGS",
        root_dir / "06_DOCS",
    ]
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)

    initialize_tsv(
        root_dir / "05_LOGS" / "download_log.tsv",
        ["timestamp", "internal_paper_id", "source", "file_type", "url", "destination", "status"],
    )
    initialize_tsv(
        root_dir / "05_LOGS" / "error_log.tsv",
        ["timestamp", "stage", "source", "identifier", "error_type", "error_message"],
    )
    initialize_tsv(root_dir / "05_LOGS" / "skipped_log.tsv", ["timestamp", "identifier", "reason"])


def initialize_tsv(path: Path, headers: list[str]) -> None:
    if path.exists():
        return
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t")
        writer.writerow(headers)


def append_error_log(path: Path, stage: str, source: str, identifier: str, error_type: str, error_message: str) -> None:
    with path.open("a", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t")
        writer.writerow([utc_now(), stage, source, identifier, error_type, error_message])


def load_queries(config_path: Path) -> list[dict[str, Any]]:
    if not config_path.exists():
        raise FileNotFoundError(f"Missing configuration file: {config_path}")
    payload = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    queries = payload.get("collections") or []
    if not queries:
        raise ValueError(f"No query collections found in {config_path}")
    return queries


def main() -> int:
    ensure_project_structure(PROJECT_ROOT)
    config_path = PROJECT_ROOT / "00_CONFIG" / "queries.yaml"
    if not config_path.exists():
        example_path = PROJECT_ROOT / "00_CONFIG" / "queries.yaml.example"
        if example_path.exists():
            config_path = example_path

    error_log_path = PROJECT_ROOT / "05_LOGS" / "error_log.tsv"
    download_log_path = PROJECT_ROOT / "05_LOGS" / "download_log.tsv"
    skipped_log_path = PROJECT_ROOT / "05_LOGS" / "skipped_log.tsv"

    query_configs = load_queries(config_path)
    search_session = create_search_session()
    all_records: list[dict[str, Any]] = []

    for query_config in tqdm(query_configs, desc="Searching collections", unit="collection"):
        records = run_all_searches(
            session=search_session,
            query_config=query_config,
            project_root=PROJECT_ROOT,
            error_logger=lambda stage, source, identifier, error_type, message: append_error_log(
                error_log_path,
                stage,
                source,
                identifier,
                error_type,
                message,
            ),
        )
        all_records.extend(records)

    searched_count = len(all_records)
    unique_records = deduplicate_records(all_records)
    persist_raw_record_artifacts(unique_records, PROJECT_ROOT)

    download_session = create_download_session()
    updated_records, files_rows, download_stats = acquire_full_texts(
        session=download_session,
        records=unique_records,
        root_dir=PROJECT_ROOT,
        download_log_path=download_log_path,
        skipped_log_path=skipped_log_path,
        error_logger=lambda stage, source, identifier, error_type, message: append_error_log(
            error_log_path,
            stage,
            source,
            identifier,
            error_type,
            message,
        ),
    )

    write_normalized_outputs(updated_records, files_rows, PROJECT_ROOT)

    summary = {
        "searched": searched_count,
        "unique": len(updated_records),
        "downloaded_pdf": download_stats["downloaded_pdf"],
        "downloaded_xml": download_stats["downloaded_xml"],
        "metadata_only": download_stats["metadata_only"],
        "failed": download_stats["failed"],
        "skipped": download_stats["skipped"],
    }
    print(
        " / ".join(
            [
                f"searched={summary['searched']}",
                f"unique={summary['unique']}",
                f"downloaded_pdf={summary['downloaded_pdf']}",
                f"downloaded_xml={summary['downloaded_xml']}",
                f"metadata_only={summary['metadata_only']}",
                f"failed={summary['failed']}",
                f"skipped={summary['skipped']}",
            ]
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
