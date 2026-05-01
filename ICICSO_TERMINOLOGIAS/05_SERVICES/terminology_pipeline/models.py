from __future__ import annotations

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class ConceptRecord:
    id: str
    code: str
    system: str
    version: str

    def as_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class DescriptionRecord:
    id: str
    concept_id: str
    term: str
    language: str
    type: str
    system: str

    def as_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class RelationshipRecord:
    id: str
    source_concept_id: str
    target_concept_id: str
    relationship_type: str
    system: str

    def as_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class MappingRecord:
    id: str
    source_concept_id: str
    target_code: str
    target_system: str
    mapping_type: str
    system: str

    def as_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass
class ParseResult:
    concepts: list[ConceptRecord]
    descriptions: list[DescriptionRecord]
    relationships: list[RelationshipRecord]
    mappings: list[MappingRecord]
    files_processed: int = 0
    rows_processed: int = 0

    @classmethod
    def empty(cls) -> "ParseResult":
        return cls([], [], [], [])

    def extend(self, other: "ParseResult") -> None:
        self.concepts.extend(other.concepts)
        self.descriptions.extend(other.descriptions)
        self.relationships.extend(other.relationships)
        self.mappings.extend(other.mappings)
        self.files_processed += other.files_processed
        self.rows_processed += other.rows_processed
