from __future__ import annotations

from parsers.base import BaseParser
from parsers.icd10_parser import ICD10Parser
from parsers.loinc_parser import LoincParser
from parsers.rxnorm_parser import RxNormParser
from parsers.snomed_parser import SnomedParser
from parsers.ucum_parser import UcumParser


def build_parser_registry() -> list[BaseParser]:
    return [
        ICD10Parser(),
        LoincParser(),
        RxNormParser(),
        SnomedParser(),
        UcumParser(),
    ]
