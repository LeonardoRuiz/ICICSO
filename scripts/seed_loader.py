from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_registry(base_dir: str | Path) -> dict[str, Any]:
    base_path = Path(base_dir)
    manifest_path = base_path / "source-manifest.json"
    with manifest_path.open(encoding="utf-8-sig") as handle:
        return json.load(handle)


def load_repo_seed(base_dir: str | Path) -> dict[str, Any]:
    base_path = Path(base_dir)
    repo_seed_path = base_path / "repo-seed.json"
    with repo_seed_path.open(encoding="utf-8-sig") as handle:
        return json.load(handle)


def list_enabled_sources(base_dir: str | Path) -> list[dict[str, Any]]:
    registry = load_repo_seed(base_dir)
    return [
        source
        for source in registry["registries"]
        if source["ingest"]["enabled_by_default"]
    ]


def list_restricted_sources(base_dir: str | Path) -> list[dict[str, Any]]:
    registry = load_repo_seed(base_dir)
    return [
        source
        for source in registry["registries"]
        if source["compliance"]["access_type"] == "restricted"
    ]


if __name__ == "__main__":
    package_dir = Path(__file__).resolve().parent.parent / "ICICSO_TERMINOLOGIAS" / "00_METADATA" / "00_METADATA"
    print(json.dumps(
        {
            "enabled": [item["key"] for item in list_enabled_sources(package_dir)],
            "restricted": [item["key"] for item in list_restricted_sources(package_dir)],
        },
        ensure_ascii=False,
        indent=2,
    ))



