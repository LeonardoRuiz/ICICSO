# Local Terminology Ingestion Pipeline

## Scope

This pipeline ingests local raw clinical terminologies from `01_RAW/*`, normalizes them into a shared TSV model, and records operational metadata for reproducible re-runs.

## Components

- `05_SERVICES/terminology_pipeline/run_ingestion.py`: master runner
- `05_SERVICES/terminology_downloader/run_all.py`: raw downloader runner
- `05_SERVICES/terminology_downloader/manual_ingest.py`: manual drop-in with trace logs
- `00_METADATA/sources_catalog.tsv`: official source/version/license registry used by reports and source lookup
- `00_METADATA/download_manifest.json`: executable downloader manifest
- `05_SERVICES/terminology_pipeline/parsers/icd10_parser.py`
- `05_SERVICES/terminology_pipeline/parsers/loinc_parser.py`
- `05_SERVICES/terminology_pipeline/parsers/rxnorm_parser.py`
- `05_SERVICES/terminology_pipeline/parsers/snomed_parser.py`
- `05_SERVICES/terminology_pipeline/parsers/ucum_parser.py`

## Outputs

- `03_NORMALIZED/concepts.tsv`
- `03_NORMALIZED/descriptions.tsv`
- `03_NORMALIZED/relationships.tsv`
- `03_NORMALIZED/mappings.tsv`
- `03_NORMALIZED/ingestion_log.tsv`
- `03_NORMALIZED/error_log.tsv`

## Idempotency

The runner rewrites normalized outputs deterministically on each execution and tracks per-system content hashes in `00_METADATA/version_control.tsv`. If the raw-file hash for a system matches the prior run, the run is marked `UNCHANGED`.

## Future FHIR Integration

The normalized layer preserves `system`, `version`, semantic relationships, and cross-system mappings so it can later back a FHIR `CodeSystem`, `ValueSet`, and `ConceptMap` publishing workflow.

## Downloader coverage as of 2026-04-26

- Automated/public: `ICD10`, `ICD11` release ZIP, `ICD10_TO_ICD11`, `ICD10_CM`, `ICD10_PCS`, `RXNORM_PRESCRIBABLE`, `UCUM`, `HL7_THO`, `HL7_FHIR_R5`, `ATC_DDD`, `HCPCS_LEVEL_II`, `MESH` where network/source validation allows it.
- Credentialed/manual: `LOINC`, `SNOMED_CT`, `SNOMED_CT_INTERNATIONAL`, `SNOMED_CT_SPANISH`, `RXNORM`, `RXNORM_FULL`, `CPT`.
- Tracked as web references/IGs: `FHIR_IMPLEMENTATION_REGISTRY`, `CDA_R2_CORE`, `CDA_VALUE_SETS`, `CCDA_ON_FHIR`, `US_CORE`, `SMART_APP_LAUNCH`.

The downloader records blocked access as `awaiting_credentials` or `manual_required`; it should not turn license barriers into technical failures.

## Usage

```bash
python ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_downloader/run_all.py
python ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_downloader/manual_ingest.py --dataset ICD11 --source /path/icd11_mms.json
python ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_pipeline/run_ingestion.py
python ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_pipeline/run_ingestion.py --system LOINC --system RXNORM
```
