from dataclasses import dataclass
from functools import lru_cache
import os
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_name: str = "ICICSO Software Orquestador API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api"
    project_root: Path = Path(__file__).resolve().parents[2]
    workspace_root: Path = Path(__file__).resolve().parents[4]
    manifest_path: Path = project_root / "manifest" / "icicso_manifest.json"
    data_dir: Path = project_root / "data"
    sqlite_path: Path = data_dir / "icicso_catalog.db"
    uploaded_documents_dir: Path = data_dir / "uploaded_documents"
    vrn_policy_path: Path = workspace_root / "config" / "runtime" / "vrn-policy.json"
    runtime_feed_path: Path = workspace_root / "config" / "runtime" / "document-ingestion-feed.json"
    dashboard_feed_path: Path = workspace_root / "dashboard" / "data" / "document-ingestion-feed.json"
    emulator_feed_path: Path = (
        workspace_root / "icicso" / "apps" / "emulator" / "src" / "data" / "documentIngestionFeed.generated.js"
    )
    gcl_runtime_feed_path: Path = workspace_root / "config" / "runtime" / "gcl-ledger-feed.json"
    gcl_dashboard_feed_path: Path = workspace_root / "dashboard" / "data" / "gcl-ledger-feed.json"
    gcl_emulator_feed_path: Path = (
        workspace_root / "icicso" / "apps" / "emulator" / "src" / "data" / "gclLedgerFeed.generated.js"
    )
    audit_runtime_feed_path: Path = workspace_root / "config" / "runtime" / "document-audit-feed.json"
    audit_dashboard_feed_path: Path = workspace_root / "dashboard" / "data" / "document-audit-feed.json"
    audit_emulator_feed_path: Path = (
        workspace_root / "icicso" / "apps" / "emulator" / "src" / "data" / "documentAuditFeed.generated.js"
    )
    nomenclature_path: Path = workspace_root / "config" / "runtime" / "ingestion-nomenclature.json"
    import_api_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings(import_api_key=os.getenv("INGESTION_IMPORT_API_KEY"))
