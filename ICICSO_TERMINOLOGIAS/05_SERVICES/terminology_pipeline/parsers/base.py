from __future__ import annotations

import csv
import logging
from pathlib import Path

from config import PipelinePaths
from io_utils import canonical_id
from models import ConceptRecord, DescriptionRecord, MappingRecord, ParseResult, RelationshipRecord


class BaseParser:
    system_name = ""
    file_extensions: tuple[str, ...] = ()

    def discover_input_files(self, paths: PipelinePaths) -> list[Path]:
        source_dir = paths.raw_dir / self.system_name
        if not source_dir.exists():
            return []
        matches: list[Path] = []
        for extension in self.file_extensions:
            matches.extend(sorted(source_dir.rglob(f"*{extension}")))
        return [path for path in matches if path.is_file()]

    def parse(self, paths: PipelinePaths, version: str, logger: logging.Logger) -> ParseResult:
        raise NotImplementedError

    @staticmethod
    def guess_language(*values: str) -> str:
        joined = " ".join(value.lower() for value in values if value)
        if "spanish" in joined or "(es)" in joined or "[es]" in joined:
            return "es"
        return "en"

    @staticmethod
    def relationship_id(system: str, source_id: str, target_id: str, rel_type: str) -> str:
        return canonical_id(system, "rel", source_id, rel_type, target_id)

    @staticmethod
    def mapping_id(system: str, source_id: str, target_system: str, target_code: str, mapping_type: str) -> str:
        return canonical_id(system, "map", source_id, target_system, target_code, mapping_type)

    @staticmethod
    def concept_id(system: str, version: str, code: str) -> str:
        return canonical_id(system, version, code)

    @staticmethod
    def description_id(system: str, concept_id: str, term: str, lang: str, desc_type: str) -> str:
        return canonical_id(system, "desc", concept_id, lang, desc_type, term)

    @staticmethod
    def read_csv(path: Path, delimiter: str = ",") -> list[dict[str, str]]:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle, delimiter=delimiter)
            return [{str(k): str(v or "").strip() for k, v in row.items()} for row in reader]

    @staticmethod
    def first_non_empty(row: dict[str, str], *candidates: str) -> str:
        for candidate in candidates:
            value = row.get(candidate, "").strip()
            if value:
                return value
        return ""

    @staticmethod
    def add_relationship(items: list[RelationshipRecord], system: str, source_concept_id: str, target_concept_id: str, relationship_type: str) -> None:
        if not source_concept_id or not target_concept_id:
            return
        items.append(
            RelationshipRecord(
                id=BaseParser.relationship_id(system, source_concept_id, target_concept_id, relationship_type),
                source_concept_id=source_concept_id,
                target_concept_id=target_concept_id,
                relationship_type=relationship_type,
                system=system,
            )
        )

    @staticmethod
    def add_mapping(items: list[MappingRecord], system: str, source_concept_id: str, target_system: str, target_code: str, mapping_type: str) -> None:
        if not source_concept_id or not target_code or not target_system:
            return
        items.append(
            MappingRecord(
                id=BaseParser.mapping_id(system, source_concept_id, target_system, target_code, mapping_type),
                source_concept_id=source_concept_id,
                target_code=target_code,
                target_system=target_system,
                mapping_type=mapping_type,
                system=system,
            )
        )

    @staticmethod
    def add_concept_with_description(
        concepts: list[ConceptRecord],
        descriptions: list[DescriptionRecord],
        system: str,
        version: str,
        code: str,
        term: str,
        language: str = "en",
        desc_type: str = "preferred",
    ) -> str:
        concept_id = BaseParser.concept_id(system, version, code)
        concepts.append(ConceptRecord(id=concept_id, code=code, system=system, version=version))
        if term:
            descriptions.append(
                DescriptionRecord(
                    id=BaseParser.description_id(system, concept_id, term, language, desc_type),
                    concept_id=concept_id,
                    term=term,
                    language=language,
                    type=desc_type,
                    system=system,
                )
            )
        return concept_id
