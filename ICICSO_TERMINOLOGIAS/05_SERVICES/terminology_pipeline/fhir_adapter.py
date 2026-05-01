from __future__ import annotations

from pathlib import Path

from models import ConceptRecord, DescriptionRecord, MappingRecord, RelationshipRecord


def code_system_bundle(concepts: list[ConceptRecord], descriptions: list[DescriptionRecord], system: str, version: str) -> dict[str, object]:
    concept_terms = {
        description.concept_id: description.term
        for description in descriptions
        if description.system == system and description.type == "preferred"
    }
    return {
        "resourceType": "CodeSystem",
        "url": f"https://icicso.local/fhir/CodeSystem/{system.lower()}",
        "version": version,
        "status": "draft",
        "content": "complete",
        "concept": [
            {"code": concept.code, "display": concept_terms.get(concept.id, concept.code)}
            for concept in concepts
            if concept.system == system and concept.version == version
        ],
    }


def concept_map_bundle(mappings: list[MappingRecord], system: str, version: str) -> dict[str, object]:
    return {
        "resourceType": "ConceptMap",
        "url": f"https://icicso.local/fhir/ConceptMap/{system.lower()}-{version}",
        "status": "draft",
        "group": [
            {
                "source": system,
                "target": mapping.target_system,
                "element": [{"code": mapping.source_concept_id, "target": [{"code": mapping.target_code, "equivalence": mapping.mapping_type}]}],
            }
            for mapping in mappings
            if mapping.system == system
        ],
    }
