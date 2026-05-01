from __future__ import annotations

import argparse
import hashlib
import logging
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path

from config import FORMATS_BY_SYSTEM, PipelinePaths
from io_utils import append_tsv, file_sha256, read_delimited_rows, write_tsv
from models import ParseResult
from registry import build_parser_registry


CONCEPT_FIELDS = ["id", "code", "system", "version"]
DESCRIPTION_FIELDS = ["id", "concept_id", "term", "language", "type", "system"]
RELATIONSHIP_FIELDS = ["id", "source_concept_id", "target_concept_id", "relationship_type", "system"]
MAPPING_FIELDS = ["id", "source_concept_id", "target_code", "target_system", "mapping_type", "system"]
INGESTION_LOG_FIELDS = [
    "run_id",
    "timestamp_utc",
    "system",
    "version",
    "status",
    "files_processed",
    "rows_processed",
    "content_hash",
    "notes",
]
ERROR_LOG_FIELDS = ["run_id", "timestamp_utc", "system", "file", "error_type", "message"]
VERSION_CONTROL_FIELDS = [
    "system_name",
    "version",
    "run_id",
    "last_ingested_at_utc",
    "content_hash",
    "status",
]


def configure_logger() -> logging.Logger:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    return logging.getLogger("terminology_ingestion")


def load_source_versions(paths: PipelinePaths) -> dict[str, str]:
    if not paths.sources_catalog_file.exists() or paths.sources_catalog_file.stat().st_size == 0:
        return {}
    rows = read_delimited_rows(paths.sources_catalog_file)
    return {row.get("system_name", ""): row.get("version", "unknown") for row in rows if row.get("system_name")}


def compute_system_hash(files: list[Path]) -> str:
    if not files:
        return ""
    digest = hashlib.sha256()
    for path in sorted(files):
        digest.update(path.name.encode("utf-8"))
        digest.update(file_sha256(path).encode("utf-8"))
    return digest.hexdigest()


def unique_sorted(rows: list[dict[str, str]], key_fields: list[str]) -> list[dict[str, str]]:
    seen: set[tuple[str, ...]] = set()
    unique_rows: list[dict[str, str]] = []
    for row in rows:
        key = tuple(str(row.get(field, "")).strip() for field in key_fields)
        if key in seen:
            continue
        seen.add(key)
        unique_rows.append(row)
    return sorted(unique_rows, key=lambda row: tuple(str(row.get(field, "")) for field in key_fields))


def write_outputs(paths: PipelinePaths, aggregate: ParseResult) -> None:
    concepts = unique_sorted([asdict(item) for item in aggregate.concepts], CONCEPT_FIELDS)
    descriptions = unique_sorted([asdict(item) for item in aggregate.descriptions], DESCRIPTION_FIELDS)
    relationships = unique_sorted([asdict(item) for item in aggregate.relationships], RELATIONSHIP_FIELDS)
    mappings = unique_sorted([asdict(item) for item in aggregate.mappings], MAPPING_FIELDS)
    write_tsv(paths.concepts_file, CONCEPT_FIELDS, concepts)
    write_tsv(paths.descriptions_file, DESCRIPTION_FIELDS, descriptions)
    write_tsv(paths.relationships_file, RELATIONSHIP_FIELDS, relationships)
    write_tsv(paths.mappings_file, MAPPING_FIELDS, mappings)


def load_existing_version_control(paths: PipelinePaths) -> dict[str, dict[str, str]]:
    if not paths.version_control_file.exists() or paths.version_control_file.stat().st_size == 0:
        return {}
    rows = read_delimited_rows(paths.version_control_file)
    return {row["system_name"]: row for row in rows if row.get("system_name")}


def write_version_control(paths: PipelinePaths, entries: dict[str, dict[str, str]]) -> None:
    rows = [entries[key] for key in sorted(entries)]
    write_tsv(paths.version_control_file, VERSION_CONTROL_FIELDS, rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run local clinical terminology ingestion")
    parser.add_argument("--system", action="append", help="Only ingest the selected system(s)")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    logger = configure_logger()
    paths = PipelinePaths.discover()
    run_id = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    timestamp = datetime.now(UTC).isoformat()
    selected = {item.upper() for item in args.system or []}
    source_versions = load_source_versions(paths)
    version_control = load_existing_version_control(paths)
    aggregate = ParseResult.empty()
    ingestion_rows: list[dict[str, str]] = []
    error_rows: list[dict[str, str]] = []

    for parser in build_parser_registry():
        if selected and parser.system_name.upper() not in selected:
            continue
        version = source_versions.get(parser.system_name, "unknown")
        files = parser.discover_input_files(paths)
        content_hash = compute_system_hash(files)
        previous_hash = version_control.get(parser.system_name, {}).get("content_hash", "")
        if not files:
            ingestion_rows.append(
                {
                    "run_id": run_id,
                    "timestamp_utc": timestamp,
                    "system": parser.system_name,
                    "version": version,
                    "status": "SKIPPED",
                    "files_processed": "0",
                    "rows_processed": "0",
                    "content_hash": "",
                    "notes": "No raw files found",
                }
            )
            continue

        status = "UNCHANGED" if content_hash and previous_hash == content_hash else "PROCESSED"
        try:
            parsed = parser.parse(paths, version, logger)
            aggregate.extend(parsed)
            ingestion_rows.append(
                {
                    "run_id": run_id,
                    "timestamp_utc": timestamp,
                    "system": parser.system_name,
                    "version": version,
                    "status": status,
                    "files_processed": str(parsed.files_processed),
                    "rows_processed": str(parsed.rows_processed),
                    "content_hash": content_hash,
                    "notes": FORMATS_BY_SYSTEM.get(parser.system_name, "unknown"),
                }
            )
            version_control[parser.system_name] = {
                "system_name": parser.system_name,
                "version": version,
                "run_id": run_id,
                "last_ingested_at_utc": timestamp,
                "content_hash": content_hash,
                "status": status,
            }
        except Exception as exc:
            logger.exception("Failed to process %s", parser.system_name)
            ingestion_rows.append(
                {
                    "run_id": run_id,
                    "timestamp_utc": timestamp,
                    "system": parser.system_name,
                    "version": version,
                    "status": "ERROR",
                    "files_processed": str(len(files)),
                    "rows_processed": "0",
                    "content_hash": content_hash,
                    "notes": str(exc),
                }
            )
            error_rows.append(
                {
                    "run_id": run_id,
                    "timestamp_utc": timestamp,
                    "system": parser.system_name,
                    "file": ";".join(path.name for path in files),
                    "error_type": exc.__class__.__name__,
                    "message": str(exc),
                }
            )

    write_outputs(paths, aggregate)
    append_tsv(paths.ingestion_log_file, INGESTION_LOG_FIELDS, ingestion_rows)
    if error_rows:
        append_tsv(paths.error_log_file, ERROR_LOG_FIELDS, error_rows)
    elif not paths.error_log_file.exists():
        write_tsv(paths.error_log_file, ERROR_LOG_FIELDS, [])
    write_version_control(paths, version_control)
    logger.info("Ingestion finished. Concepts=%s", len(aggregate.concepts))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
