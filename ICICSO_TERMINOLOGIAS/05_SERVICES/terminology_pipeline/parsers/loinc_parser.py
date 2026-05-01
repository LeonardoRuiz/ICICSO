from __future__ import annotations

import logging

from config import PipelinePaths
from models import ParseResult
from parsers.base import BaseParser


class LoincParser(BaseParser):
    system_name = "LOINC"
    file_extensions = (".csv",)

    def parse(self, paths: PipelinePaths, version: str, logger: logging.Logger) -> ParseResult:
        result = ParseResult.empty()
        for file_path in self.discover_input_files(paths):
            rows = self.read_csv(file_path)
            result.files_processed += 1
            for row in rows:
                code = self.first_non_empty(row, "LOINC_NUM", "LOINC_NUMBER", "CODE")
                term = self.first_non_empty(row, "LONG_COMMON_NAME", "COMPONENT", "DISPLAY_NAME")
                if not code:
                    continue
                concept_id = self.add_concept_with_description(
                    result.concepts,
                    result.descriptions,
                    self.system_name,
                    version,
                    code,
                    term,
                )
                class_name = self.first_non_empty(row, "CLASS", "CLASS_TYPE")
                if class_name:
                    class_id = self.concept_id(self.system_name, version, f"CLASS:{class_name}")
                    self.add_relationship(result.relationships, self.system_name, concept_id, class_id, "part-of")
                map_to = self.first_non_empty(row, "EXTERNAL_COPYRIGHT_NOTICE", "RELATEDNAMES2")
                if map_to.startswith("SNOMED"):
                    maybe_code = map_to.split(":")[-1].strip()
                    self.add_mapping(result.mappings, self.system_name, concept_id, "SNOMED_CT", maybe_code, "related-to")
                result.rows_processed += 1
            logger.info("Parsed LOINC file %s", file_path.name)
        return result
