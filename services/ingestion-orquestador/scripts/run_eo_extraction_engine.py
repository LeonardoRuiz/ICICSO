from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.core.config import get_settings
from app.persistence.database import get_connection, initialize_database
from app.services.audit_report_service import AuditReportService
from app.services.document_ingestion_service import DocumentIngestionService
from scripts.export_post_ingestion_report import build_html, export_csv


def _load_default_document_ids(database_path: Path) -> list[str]:
    with get_connection(database_path) as connection:
        rows = connection.execute(
            """
            SELECT document_id
            FROM uploaded_source_documents
            WHERE lower(extension) = '.pdf'
              AND lower(document_type) LIKE '%guideline%'
            ORDER BY ingestion_timestamp_utc ASC, document_id ASC
            """
        ).fetchall()
    return [row["document_id"] for row in rows]


def run_engine(document_ids: list[str], output_dir: Path, summary_name: str) -> dict[str, object]:
    settings = get_settings()
    initialize_database(settings.sqlite_path)
    ingestion = DocumentIngestionService(settings=settings, database_path=settings.sqlite_path)
    audit = AuditReportService(settings=settings, database_path=settings.sqlite_path)

    if not document_ids:
        document_ids = _load_default_document_ids(settings.sqlite_path)

    output_dir.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, object]] = []

    for document_id in document_ids:
        document = ingestion.get_uploaded_document(document_id)
        if document is None:
            results.append({"document_id": document_id, "status": "missing"})
            continue

        materialized = ingestion.materialize_continuum(document_id)
        if materialized is None:
            results.append({"document_id": document_id, "status": "missing"})
            continue

        html_doc, recommendation_count, candidate_count = build_html(document_id)
        html_path = output_dir / f"post_ingesta_{document_id.lower()}.html"
        csv_path = output_dir / f"post_ingesta_{document_id.lower()}.csv"
        html_path.write_text(html_doc, encoding="utf-8")
        export_csv(document_id, csv_path)
        report = audit.get_report(document_id)

        results.append(
            {
                "document_id": document_id,
                "status": "materialized",
                "file_name": document.file_name,
                "vrn": document.vrn,
                "document_group": document.document_group,
                "document_type": document.document_type,
                "specialty": document.specialty,
                "sub_specialty": document.sub_specialty,
                "recommendations": recommendation_count,
                "eo_candidates": candidate_count,
                "html": str(html_path.relative_to(REPO_ROOT)),
                "csv": str(csv_path.relative_to(REPO_ROOT)),
                "warnings": report.warnings,
            }
        )

    ingestion.write_feed_exports()
    audit.write_feed_exports()

    summary = {
        "engine": "evidence-object-extraction-engine",
        "generated_at_utc": datetime.now(UTC).isoformat(),
        "sqlite_path": str(settings.sqlite_path),
        "documents_total": len(results),
        "documents_materialized": sum(1 for item in results if item.get("status") == "materialized"),
        "recommendations_total": sum(int(item.get("recommendations") or 0) for item in results),
        "eo_candidates_total": sum(int(item.get("eo_candidates") or 0) for item in results),
        "results": results,
    }
    summary_path = output_dir / summary_name
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    summary["summary_path"] = str(summary_path.relative_to(REPO_ROOT))
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the ICICSO EO extraction engine over uploaded PDF guidelines.")
    parser.add_argument(
        "--document-id",
        action="append",
        default=[],
        help="Document ID to re-materialize. Repeat the flag for multiple documents. Defaults to all uploaded guideline PDFs.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(REPO_ROOT / "dashboard" / "generated"),
        help="Output directory for post-ingestion HTML/CSV reports and summary JSON.",
    )
    parser.add_argument(
        "--summary-name",
        default="eo_extraction_engine_summary.json",
        help="Summary JSON filename.",
    )
    args = parser.parse_args()

    summary = run_engine(args.document_id, Path(args.output_dir), args.summary_name)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
