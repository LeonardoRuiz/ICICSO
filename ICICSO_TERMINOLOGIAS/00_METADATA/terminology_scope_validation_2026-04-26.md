# Validacion De Alcance Terminologico

Fecha: 2026-04-26

## Lista objetivo validada

Cobertura pedida por usuario:

- `LOINC`
- `SNOMED CT International Edition`
- `SNOMED CT Spanish Edition`
- `ICD-11 MMS`
- `ICD-10 a ICD-11`
- `RxNorm Full Monthly Release`
- `RxNorm Prescribable Content`
- `HL7 FHIR R5 Definitions`
- `ICD-10-CM`
- `ICD-10-PCS`
- `HCPCS Level II`
- `CPT`
- `MeSH`
- `ATC/DDD`
- `UNII / GSRS`

## Estado en ICICSO

Ya implementado operativamente:

- `LOINC`
- `ICD11`
- `ICD10`
- `RXNORM` legado
- `UCUM`
- `HL7_THO`
- `ATC_DDD`
- `SNOMED_CT` legado

Ya trazado formalmente en manifiesto aunque todavia no con downloader especifico:

- `SNOMED_CT_INTERNATIONAL`
- `SNOMED_CT_SPANISH`
- `ICD10_TO_ICD11`
- `RXNORM_FULL`
- `RXNORM_PRESCRIBABLE`
- `HL7_FHIR_R5`
- `ICD10_CM`
- `ICD10_PCS`
- `HCPCS_LEVEL_II`
- `CPT`
- `MESH`
- `UNII_GSRS`

## Validacion de necesidad

Conclusion:

- Si el objetivo es interoperabilidad clinica general, observacionales, diagnosticos, medicacion y semantica base, la lista del usuario es valida y suficiente como baseline serio.
- `UCUM` debe mantenerse obligatoriamente aunque no aparecio en la lista, porque sin unidades observacionales `LOINC` queda cojo.
- `HL7_THO` y `HL7 FHIR R5 Definitions` no se duplican: uno cubre artefactos terminologicos compartidos, el otro cubre definiciones nucleares del estandar FHIR.

## Extras recomendados pero no obligatorios todavia

Agregar solo si el alcance funcional realmente lo requiere:

- `CVX` y `MVX`
  - Recomendado si habra inmunizaciones.
- `NDC`
  - Recomendado si habra dispensacion, facturacion farmaceutica o cruce fino con producto comercial.
- `ICF` e `ICHI`
  - Recomendado si el programa se extiende a funcionamiento, discapacidad o intervenciones WHO.

## Fuentes oficiales usadas para la validacion

- WHO ICD-11 releases y soporte de idiomas/API
  - `https://icd.who.int/docs/icd-api/SupportedClassifications/`
  - `https://icd.who.int/browse11/lm/en`
- SNOMED International releases
  - `https://www.snomed.org/releases`
- RxNorm y RxNorm Prescribable
  - `https://www.nlm.nih.gov/research/umls/rxnorm/overview.html`
  - `https://www.nlm.nih.gov/research/umls/rxnorm/docs/prescribe.html`
- HL7 FHIR R5 downloads
  - `https://hl7.org/fhir/R5/downloads.html`
- ICD-10-CM e ICD-10-PCS
  - `https://www.cdc.gov/nchs/icd/icd-10-cm/files.html`
  - `https://www.cms.gov/medicare/coding-billing/icd-10-codes`
- HCPCS y CPT
  - `https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system`
  - `https://www.ama-assn.org/practice-management/cpt/cpt-code-set-basics-and-resources`
- MeSH
  - `https://www.nlm.nih.gov/databases/download/mesh.html`
- UNII / GSRS
  - `https://www.fda.gov/industry/fda-data-standards-advisory-board/fdas-global-substance-registration-system`
  - `https://precision.fda.gov/uniisearch/learn`
