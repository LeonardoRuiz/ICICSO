# Terminology Repository Audit - 2026-04-26

## Scope

This audit updates the ICICSO terminology lane after expanding the official source registry to cover diagnostic, procedure, medication, substance, interoperability and document-architecture terminology assets.

## Canonical Files

- `ICICSO_TERMINOLOGIAS/00_METADATA/sources_catalog.tsv`: official source/version/license registry.
- `ICICSO_TERMINOLOGIAS/00_METADATA/licenses.tsv`: access and automation policy by dataset.
- `ICICSO_TERMINOLOGIAS/00_METADATA/download_manifest.json`: executable downloader manifest.
- `ICICSO_TERMINOLOGIAS/00_METADATA/download_state.json`: latest local operational state.
- `dashboard/generated/terminology_sync_report_latest.html`: generated operational report.
- `dashboard/generated/terminology_console_data.js`: data used by the terminology console/searcher.

## Current Coverage

| Class | Datasets |
| --- | --- |
| Local/downloaded or navigable | `ICD10`, `ICD10_PCS`, `UCUM`, `HL7_THO`, `HL7_FHIR_R5`, `ATC_DDD` |
| Credentialed or licensed | `LOINC`, `SNOMED_CT`, `SNOMED_CT_INTERNATIONAL`, `SNOMED_CT_SPANISH`, `RXNORM`, `RXNORM_FULL`, `CPT` |
| Public but pending downloader/parser validation | `ICD11`, `ICD10_TO_ICD11`, `ICD10_CM`, `RXNORM_PRESCRIBABLE`, `HCPCS_LEVEL_II`, `MESH`, `UNII_GSRS` |
| Web registry / IG reference | `FHIR_IMPLEMENTATION_REGISTRY`, `CDA_R2_CORE`, `CDA_VALUE_SETS`, `CCDA_ON_FHIR`, `US_CORE`, `SMART_APP_LAUNCH` |

## Integration Updates

- Downloader manifest now targets ICD-11 release `2026-01` instead of the older `2025-01` release.
- The downloader can track the whole registry without writing text placeholders into fake ZIP/XML files.
- The terminology console receives enriched source metadata from `sources_catalog.tsv`.
- The local `terminology-service` exposes the official source registry through `/sources` and `/source-lookup?query=...`.
- The semantic terminology engine system registry was updated with the newly tracked systems and 2026 target versions.

## Open Risks

- Licensed sources must be supplied through approved accounts or manual drop-in: SNOMED CT, CPT, LOINC, RxNorm full.
- Several public binaries still need runtime network validation in the local environment: ICD-11 MMS, ICD-10 to ICD-11 mapping, ICD-10-CM, HCPCS Level II, MeSH, RxNorm Prescribable.
- Parsers exist for `ICD10`, `LOINC`, `RXNORM`, `SNOMED_CT`, and `UCUM`; new datasets need parsers before they become normalized TSV/database tables.

## Next Actions

1. Run `python ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_downloader/run_all.py --non-interactive` from the repo root.
2. Add authorized credentials only where legally available in `ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_downloader/.env`.
3. Implement parsers in priority order: `ICD11`, `ICD10_CM`, `ICD10_PCS`, `HCPCS_LEVEL_II`, `MESH`, `RXNORM_PRESCRIBABLE`.
4. Regenerate `dashboard/generated/terminology_console_data.js` and `dashboard/generated/terminology_sync_report_latest.html` after every sync.
