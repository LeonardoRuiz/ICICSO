import json
from pathlib import Path

from app.core.config import get_settings


class ManifestLoader:
    def __init__(self, manifest_path: Path | None = None) -> None:
        settings = get_settings()
        self._manifest_path = manifest_path or settings.manifest_path

    def load_payload(self) -> dict:
        if not self._manifest_path.exists():
            raise FileNotFoundError(f"Manifest file not found: {self._manifest_path}")

        return json.loads(self._manifest_path.read_text(encoding="utf-8-sig"))
