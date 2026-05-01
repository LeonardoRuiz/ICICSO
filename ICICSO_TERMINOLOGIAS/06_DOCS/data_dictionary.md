# Normalized Data Dictionary

## 00_METADATA/sources_catalog.tsv

- `source_id`: Stable source row identifier.
- `dataset_id`: Local dataset key used by downloader, report, source lookup and raw folder.
- `familia`, `especialidad`, `subtema`: Functional classification of the terminology source.
- `estandar`: Official terminology, standard, IG or registry name.
- `archivo_principal`: Expected release file or web artifact.
- `version_o_fecha`: Target release/version/date.
- `formato`: Source format.
- `fuente_oficial`: Maintainer or publisher.
- `enlace_oficial`: Official source URL.
- `acceso_o_licencia`: Public, credentialed, account-gated or proprietary access notes.
- `prioridad`: Operational priority.
- `notas`: Clinical/interoperability relevance.
- `estado_operativo`: Verified/downloaded/tracked status.
- `observacion_de_descarga`: Current local download blocker or outcome.
- `db_target`: Intended local usable-database target.
- `ingest_strategy`: Parser/downloader strategy or reason for manual/web-only handling.

## concepts.tsv

- `id`: Canonical concept identifier composed as `system::version::code`
- `code`: Source terminology code
- `system`: Source terminology name
- `version`: Source release version

## descriptions.tsv

- `id`: Canonical description identifier
- `concept_id`: Foreign key to `concepts.tsv`
- `term`: Human-readable term
- `language`: Language code such as `en` or `es`
- `type`: Description type such as `preferred` or `synonym`
- `system`: Source terminology name

## relationships.tsv

- `id`: Canonical relationship identifier
- `source_concept_id`: Origin concept identifier
- `target_concept_id`: Destination concept identifier
- `relationship_type`: Semantic link such as `is-a` or `part-of`
- `system`: Source terminology name

## mappings.tsv

- `id`: Canonical mapping identifier
- `source_concept_id`: Origin concept identifier
- `target_code`: Mapped code in another code system
- `target_system`: Destination terminology
- `mapping_type`: Mapping semantic such as `exact` or `related-to`
- `system`: Source terminology name
