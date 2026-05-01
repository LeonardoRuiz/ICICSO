from __future__ import annotations

import csv
import logging
import zipfile
from io import TextIOWrapper

from config import PipelinePaths
from models import ParseResult
from parsers.base import BaseParser


class RxNormParser(BaseParser):
    system_name = "RXNORM"
    file_extensions = (".rrf", ".zip")

    def _parse_reader(
        self,
        reader: csv.reader,
        name: str,
        version: str,
        result: ParseResult,
        atoms_by_rxcui: dict[str, str],
    ) -> None:
        upper_name = name.upper()
        if "RXNCONSO" in upper_name:
            for row in reader:
                if len(row) < 15:
                    continue
                rxcui = row[0].strip()
                lat = row[1].strip() or "ENG"
                tty = row[12].strip() or "preferred"
                term = row[14].strip()
                if not rxcui:
                    continue
                concept_id = self.add_concept_with_description(
                    result.concepts,
                    result.descriptions,
                    self.system_name,
                    version,
                    rxcui,
                    term,
                    language=lat.lower()[0:2],
                    desc_type=tty.lower(),
                )
                atoms_by_rxcui[rxcui] = concept_id
                result.rows_processed += 1
        elif "RXNREL" in upper_name:
            for row in reader:
                if len(row) < 8:
                    continue
                source = row[0].strip()
                target = row[4].strip()
                rel = (row[3].strip() or row[7].strip() or "related-to").lower()
                source_id = atoms_by_rxcui.get(source) or self.concept_id(self.system_name, version, source)
                target_id = atoms_by_rxcui.get(target) or self.concept_id(self.system_name, version, target)
                normalized_rel = "is-a" if rel in {"isa", "has_ingredient"} else rel.replace("_", "-")
                self.add_relationship(result.relationships, self.system_name, source_id, target_id, normalized_rel)
                result.rows_processed += 1
        elif "RXNSAT" in upper_name:
            for row in reader:
                if len(row) < 11:
                    continue
                rxcui = row[0].strip()
                atn = row[8].strip().upper()
                atv = row[10].strip()
                if atn in {"ATC", "ATC_CODE"} and rxcui and atv:
                    source_id = atoms_by_rxcui.get(rxcui) or self.concept_id(self.system_name, version, rxcui)
                    self.add_mapping(result.mappings, self.system_name, source_id, "ATC_DDD", atv, "exact")
                    result.rows_processed += 1

    def parse(self, paths: PipelinePaths, version: str, logger: logging.Logger) -> ParseResult:
        result = ParseResult.empty()
        atoms_by_rxcui: dict[str, str] = {}

        for file_path in self.discover_input_files(paths):
            result.files_processed += 1
            if file_path.suffix.lower() == ".zip":
                try:
                    with zipfile.ZipFile(file_path, "r") as archive:
                        for entry in archive.infolist():
                            if not entry.filename.lower().endswith(".rrf"):
                                continue
                            with archive.open(entry, "r") as raw_handle:
                                text_handle = TextIOWrapper(raw_handle, encoding="utf-8", newline="")
                                reader = csv.reader(text_handle, delimiter="|")
                                self._parse_reader(reader, entry.filename, version, result, atoms_by_rxcui)
                except zipfile.BadZipFile as exc:
                    raise ValueError(f"Invalid RxNorm ZIP package: {file_path.name}") from exc
            else:
                with file_path.open("r", encoding="utf-8", newline="") as handle:
                    reader = csv.reader(handle, delimiter="|")
                    self._parse_reader(reader, file_path.name, version, result, atoms_by_rxcui)
            logger.info("Parsed RxNorm file %s", file_path.name)
        return result
