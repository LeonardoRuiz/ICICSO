# ICICSO Terminologias

Esta carpeta concentra la ingesta local de terminologias clinicas y su normalizacion a un modelo comun orientado a interoperabilidad, trazabilidad de version y futura publicacion FHIR.

## Estructura

| Ruta | Funcion |
| --- | --- |
| `00_METADATA/` | catalogos de fuentes, licencias y control de version |
| `01_RAW/` | insumos crudos por terminologia |
| `02_STAGING/` | espacio intermedio para transformaciones futuras |
| `03_NORMALIZED/` | salidas TSV normalizadas y logs |
| `04_CROSSMAPS/` | crossmaps derivados o curados |
| `05_SERVICES/terminology_pipeline/` | pipeline Python modular |
| `06_DOCS/` | diccionario de datos y guia operativa |

## Modelo normalizado

- `concepts.tsv`: `id`, `code`, `system`, `version`
- `descriptions.tsv`: terminos y lenguaje
- `relationships.tsv`: relaciones como `is-a` y `part-of`
- `mappings.tsv`: mapeos entre sistemas

## Parsers actuales

- `ICD10` por `ClaML`
- `LOINC` por `CSV`
- `RXNORM` por `RRF` o paquete `.zip` cuando el contenido interno trae archivos `.RRF`
- `SNOMED_CT` por `RF2`
- `UCUM` por `XML`

## Catalogo oficial y estado

El registro maestro de fuentes vive en `00_METADATA/sources_catalog.tsv`. Ese TSV cruza cada fuente oficial con:

- version o fecha objetivo
- licencia/acceso
- URL oficial
- estado operativo local
- observacion de descarga
- destino esperado para base utilizable (`raw_zip`, `raw_xml`, `raw_package`, `normalized_tsv`, `web_reference`, `manual_drop`)
- estrategia de ingestion (`parser_supported`, `parser_pending`, `license_required`, `ig_artifacts`, `no_binary`)

El reporte operativo se genera desde `scripts/export_terminology_console_data.py` y queda en `dashboard/generated/terminology_sync_report_latest.html`. La consola/buscador usa `dashboard/generated/terminology_console_data.js`.

## Cobertura actual

- Descargadas o con contenido local navegable: `ICD10`, `ICD10_PCS`, `UCUM`, `HL7_THO`, `HL7_FHIR_R5`, `ATC_DDD`.
- Pendientes por credenciales o licencia: `LOINC`, `SNOMED_CT`, `SNOMED_CT_INTERNATIONAL`, `SNOMED_CT_SPANISH`, `RXNORM`, `RXNORM_FULL`, `CPT`.
- Trazadas/publicas con parser o downloader pendiente: `ICD11`, `ICD10_TO_ICD11`, `ICD10_CM`, `RXNORM_PRESCRIBABLE`, `HCPCS_LEVEL_II`, `MESH`, `UNII_GSRS`.
- Referencias web/IG sin binario unico: `FHIR_IMPLEMENTATION_REGISTRY`, `CDA_R2_CORE`, `CDA_VALUE_SETS`, `CCDA_ON_FHIR`, `US_CORE`, `SMART_APP_LAUNCH`.

## Ejecucion

```bash
python ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_downloader/run_all.py --non-interactive
python ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_pipeline/run_ingestion.py
python ICICSO_TERMINOLOGIAS/05_SERVICES/terminology_pipeline/run_ingestion.py --system UCUM
python scripts/export_terminology_console_data.py
```

## Convenciones operativas

- `01_RAW/` debe tratarse como entrada local y potencialmente licenciada
- `03_NORMALIZED/` se recompone de manera determinista en cada corrida
- `00_METADATA/version_control.tsv` registra hash y ultima corrida por sistema
- `03_NORMALIZED/ingestion_log.tsv` y `error_log.tsv` son la bitacora operativa

## FHIR

El archivo `05_SERVICES/terminology_pipeline/fhir_adapter.py` deja preparada una capa minima para proyectar el modelo normalizado hacia `CodeSystem` y `ConceptMap`.
