from __future__ import annotations

import logging
import xml.etree.ElementTree as ET

from config import PipelinePaths
from models import ParseResult
from parsers.base import BaseParser


class ICD10Parser(BaseParser):
    system_name = "ICD10"
    file_extensions = (".xml", ".claml")

    def parse(self, paths: PipelinePaths, version: str, logger: logging.Logger) -> ParseResult:
        result = ParseResult.empty()
        for file_path in self.discover_input_files(paths):
            result.files_processed += 1
            tree = ET.parse(file_path)
            root = tree.getroot()
            for cls in root.findall(".//{*}Class"):
                code = (cls.attrib.get("code") or "").strip()
                if not code:
                    continue
                preferred = ""
                for rub in cls.findall(".//{*}Rubric"):
                    kind = (rub.attrib.get("kind") or "").lower()
                    label = "".join(rub.itertext()).strip()
                    if kind in {"preferred", "definition"} and label:
                        preferred = label
                        break
                concept_id = self.add_concept_with_description(
                    result.concepts,
                    result.descriptions,
                    self.system_name,
                    version,
                    code,
                    preferred,
                    language=self.guess_language(preferred),
                )
                parent = (cls.attrib.get("superclass") or "").strip()
                if parent:
                    parent_id = self.concept_id(self.system_name, version, parent)
                    self.add_relationship(result.relationships, self.system_name, concept_id, parent_id, "is-a")
                result.rows_processed += 1
            logger.info("Parsed ICD10 file %s", file_path.name)
        return result
