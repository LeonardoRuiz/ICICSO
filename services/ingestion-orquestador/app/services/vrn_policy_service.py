import json
import re

from app.core.config import Settings, get_settings
from app.domain.models import SourceDocument, VrnPolicy


class VrnPolicyService:
    def __init__(self, *, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    def load_policy(self) -> VrnPolicy:
        payload = json.loads(self._settings.vrn_policy_path.read_text(encoding="utf-8"))
        return VrnPolicy.model_validate(payload)

    def build_vrn(
        self,
        *,
        content_hash: str,
        layer: str,
        continuum_stage: str,
        category: str,
        ingestion_timestamp_utc: str,
        institutional_version: int = 1,
    ) -> tuple[str, VrnPolicy, str]:
        policy = self.load_policy()
        date_segment = ingestion_timestamp_utc[:10].replace("-", "")
        hash_segment = content_hash[: policy.hash_length].upper()
        version_segment = (
            f"{policy.version_prefix}{institutional_version:0{policy.version_width}d}"
        )

        segment_map = {
            "VRN": "VRN",
            "institution_code": _slug(policy.institution_code),
            "governance_layer": _slug(policy.governance_layer),
            "layer": _slug(layer),
            "continuum_stage": _slug(continuum_stage),
            "category": _slug(category),
            "date": date_segment,
            "hash": hash_segment,
            "version": version_segment,
            "default_scope": _slug(policy.default_scope),
        }

        segments = [segment_map[segment] for segment in policy.segments if segment in segment_map]
        return "-".join(filter(None, segments)), policy, version_segment

    def build_active_vrn_metadata(self, document: SourceDocument) -> dict[str, str]:
        policy = self.load_policy()
        return {
            "active_vrn": document.vrn or "",
            "vrn_policy_id": document.vrn_policy_id or policy.policy_id,
            "institutional_version": document.institutional_version or f"{policy.version_prefix}{1:0{policy.version_width}d}",
            "vrn_status": document.vrn_status or policy.active_status,
        }


def _slug(value: str) -> str:
    compact = re.sub(r"[^A-Za-z0-9]+", "-", value.strip().upper()).strip("-")
    return compact or "NA"
