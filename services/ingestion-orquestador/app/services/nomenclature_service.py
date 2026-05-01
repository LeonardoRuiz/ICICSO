import json

from app.core.config import Settings, get_settings
from app.domain.models import NomenclatureCatalog


class NomenclatureService:
    def __init__(self, *, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    def load_catalog(self) -> NomenclatureCatalog:
        payload = json.loads(self._settings.nomenclature_path.read_text(encoding="utf-8"))
        return NomenclatureCatalog.model_validate(payload)
