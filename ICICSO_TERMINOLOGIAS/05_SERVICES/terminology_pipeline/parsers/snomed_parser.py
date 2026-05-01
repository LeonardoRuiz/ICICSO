from __future__ import annotations

import csv
import logging
from pathlib import Path

from config import PipelinePaths
from models import ConceptRecord, DescriptionRecord, ParseResult
from parsers.base import BaseParser


class SnomedParser(BaseParser):
    system_name = "SNOMED_CT"
    file_extensions = (".txt",)

    def discover_input_files(self, paths: PipelinePaths) -> list[Path]:
        candidates = super().discover_input_files(paths)
        allowed_tokens = ("concept", "description", "relationship", "association", "map")
        return [path for path in candidates if any(token in path.name.lower() for token in allowed_tokens)]

    def parse(self, paths: PipelinePaths, version: str, logger: logging.Logger) -> ParseResult:
        result = ParseResult.empty()

        for file_path in self.discover_input_files(paths):
            result.files_processed += 1
            name = file_path.name.lower()
            with file_path.open("r", encoding="utf-8-sig", newline="") as handle:
                reader = csv.DictReader(handle, delimiter="\t")
                if "concept" in name:
                    for row in reader:
                        if row.get("active", "") != "1":
                            continue
                        code = row.get("id", "").strip()
                        if not code:
                            continue
                        concept_id = self.concept_id(self.system_name, version, code)
                        result.concepts.append(
                            ConceptRecord(id=concept_id, code=code, system=self.system_name, version=version)
                        )
                        result.rows_processed += 1
                elif "description" in name:
                    for row in reader:
                        if row.get("active", "") != "1":
                            continue
                        concept_code = row.get("conceptId", "").strip()
                        if not concept_code:
                            continue
                        concept_id = self.concept_id(self.system_name, version, concept_code)
                        term = row.get("term", "").strip()
                        desc_type = "preferred" if row.get("typeId", "").strip() == "900000000000003001" else "synonym"
                        result.descriptions.append(
                            DescriptionRecord(
                                id=self.description_id(self.system_name, concept_id, term, "en", desc_type),
                                concept_id=concept_id,
                                term=term,
                                language="en",
                                type=desc_type,
                                system=self.system_name,
                            )
                        )
                        result.rows_processed += 1
                elif "relationship" in name:
                    for row in reader:
                        if row.get("active", "") != "1":
                            continue
                        source = row.get("sourceId", "").strip()
                        target = row.get("destinationId", "").strip()
                        type_id = row.get("typeId", "").strip()
                        rel = "is-a" if type_id == "116680003" else "part-of"
                        source_id = self.concept_id(self.system_name, version, source)
                        target_id = self.concept_id(self.system_name, version, target)
                        self.add_relationship(result.relationships, self.system_name, source_id, target_id, rel)
                        result.rows_processed += 1
                elif "association" in name or "map" in name:
                    for row in reader:
                        if row.get("active", "") != "1":
                            continue
                        source = row.get("referencedComponentId", "").strip() or row.get("sourceId", "").strip()
                        target = row.get("mapTarget", "").strip() or row.get("targetComponentId", "").strip()
                        if source and target:
                            source_id = self.concept_id(self.system_name, version, source)
                            self.add_mapping(result.mappings, self.system_name, source_id, "EXTERNAL", target, "related-to")
                            result.rows_processed += 1
            logger.info("Parsed SNOMED file %s", file_path.name)
        return result
