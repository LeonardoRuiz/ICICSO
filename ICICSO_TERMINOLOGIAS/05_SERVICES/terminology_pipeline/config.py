from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PipelinePaths:
    root: Path
    raw_dir: Path
    staging_dir: Path
    normalized_dir: Path
    metadata_dir: Path
    docs_dir: Path
    pipeline_dir: Path
    parsers_dir: Path
    concepts_file: Path
    descriptions_file: Path
    relationships_file: Path
    mappings_file: Path
    ingestion_log_file: Path
    error_log_file: Path
    version_control_file: Path
    sources_catalog_file: Path

    @classmethod
    def discover(cls, start: Path | None = None) -> "PipelinePaths":
        base = (start or Path(__file__).resolve()).resolve()
        root = base.parents[2]
        normalized_dir = root / "03_NORMALIZED"
        metadata_dir = root / "00_METADATA"
        pipeline_dir = root / "05_SERVICES" / "terminology_pipeline"
        return cls(
            root=root,
            raw_dir=root / "01_RAW",
            staging_dir=root / "02_STAGING",
            normalized_dir=normalized_dir,
            metadata_dir=metadata_dir,
            docs_dir=root / "06_DOCS",
            pipeline_dir=pipeline_dir,
            parsers_dir=pipeline_dir / "parsers",
            concepts_file=normalized_dir / "concepts.tsv",
            descriptions_file=normalized_dir / "descriptions.tsv",
            relationships_file=normalized_dir / "relationships.tsv",
            mappings_file=normalized_dir / "mappings.tsv",
            ingestion_log_file=normalized_dir / "ingestion_log.tsv",
            error_log_file=normalized_dir / "error_log.tsv",
            version_control_file=metadata_dir / "version_control.tsv",
            sources_catalog_file=metadata_dir / "sources_catalog.tsv",
        )


FORMATS_BY_SYSTEM = {
    "ICD10": "ClaML",
    "LOINC": "CSV",
    "RXNORM": "RRF",
    "SNOMED_CT": "RF2",
    "UCUM": "XML",
}
