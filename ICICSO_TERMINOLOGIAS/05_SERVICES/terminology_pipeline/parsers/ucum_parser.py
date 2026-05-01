from __future__ import annotations

import logging
import re
import xml.etree.ElementTree as ET

from config import PipelinePaths
from models import ParseResult
from parsers.base import BaseParser


class UcumParser(BaseParser):
    system_name = "UCUM"
    file_extensions = (".xml",)

    def parse(self, paths: PipelinePaths, version: str, logger: logging.Logger) -> ParseResult:
        result = ParseResult.empty()
        for file_path in self.discover_input_files(paths):
            result.files_processed += 1
            raw_text = file_path.read_text(encoding="utf-8-sig")
            if "<html" in raw_text.lower():
                raise ValueError(f"UCUM source is HTML, not XML terminology content: {file_path.name}")
            sanitized = re.sub(r"&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)", "&amp;", raw_text)
            tree = ET.ElementTree(ET.fromstring(sanitized))
            root = tree.getroot()
            for unit in root.findall(".//{*}unit"):
                code = (unit.attrib.get("Code") or unit.attrib.get("CODE") or "").strip()
                term = (unit.attrib.get("printSymbol") or unit.attrib.get("name") or "").strip()
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
                class_code = (unit.attrib.get("class") or "").strip()
                if class_code:
                    target_id = self.concept_id(self.system_name, version, f"CLASS:{class_code}")
                    self.add_relationship(result.relationships, self.system_name, concept_id, target_id, "part-of")
                result.rows_processed += 1
            logger.info("Parsed UCUM file %s", file_path.name)
        return result
