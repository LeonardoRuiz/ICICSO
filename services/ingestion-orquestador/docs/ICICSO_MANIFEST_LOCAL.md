# ICICSO: Manifest Local de Documentos Base

## Proposito

Este manifest organiza los archivos ya presentes en esta carpeta como corpus local inicial para el futuro software orquestador. No mueve ni altera los originales; solo define como deben entenderse dentro del pipeline de carga.

## Estado actual

Los archivos fuente ya estan localmente disponibles y organizados dentro de:

- `01_Arquitectura_Base`
- `02_Capas`
- `03_Outputs`
- `04_Referencias_Externas`
- `05_Catalogos_Listados`
- `06_Trabajo_Colaborativo`
- `99_Archivo_Historico`

El script `scripts/generar_manifest.ps1` recorre estas carpetas para construir el corpus local gobernado.

## Clasificacion sugerida para carga

### 1. Arquitectura madre

- `Arquitectura Integral ICICSO.docx`
- `Institutional Cognitive Infrastructure For Clinical And Surgical Orchestration.docx`
- `Arquitectura - Documentos Inputs Outputs.docx`
- `Inputs & Outputs.docx`
- `Listado Documentos Inputs Outputs.docx`
- `Arbol Documental.pdf`

Uso:

- definir ontologia,
- bounded contexts,
- fronteras de capas,
- mapa maestro de artefactos.

### 2. Outputs nucleares por capa

- `1 Output SER EO ICDR.docx`
- `2 Output Evidence translation Engine.docx`
- `3 Output Epistemic Uncertainty Layer.docx`
- `4 Output Guideline Harmonization Layer ICDR.docx`
- `5 Output Knowledge Base Operative Layer KBOL.docx`
- `6 Outputo Governance & Consensus Ledger (GCL).docx`

Uso:

- extraer contratos funcionales,
- identificar inputs, outputs y restricciones,
- definir APIs y artefactos centrales.

### 3. Fundacion y gobernanza L0

- `L0-STR-*`

Uso:

- principios no negociables,
- versionado,
- append-only,
- alcance y limites del sistema.

### 4. Evidencia y gobernanza cientifica L1

- `L1-EVD-*`

Uso:

- SER,
- EO,
- Evidence Lake,
- ICDR,
- GP,
- reappraisal,
- audit.

### 5. Traduccion algoritmica L2

- `L2-ALG-*`

Uso:

- ECS,
- UCI,
- MAC,
- DDMO,
- gobierno del ETE.

### 6. Incertidumbre epistemica L3

- `L3-UNC-*`

Uso:

- clasificacion EUL,
- thresholds,
- drift cientifico,
- validacion reforzada.

### 7. Orquestacion operativa L4

- `L4-ORQ-*`

Uso:

- CPO,
- Runbook,
- BOM,
- TAM,
- EVT,
- RDY-G,
- CAE,
- modulos de adaptacion.

### 8. Runtime y control del caso L5

- `L5-CAS-*`

Uso:

- instanciacion,
- estados,
- transiciones,
- snapshots,
- cierre y reconciliacion.

### 9. Gobernanza y consenso L6

- `L6-GOV-*`

Uso:

- CR,
- voting,
- escalation,
- drift de gobernanza,
- oversight institucional.

### 10. Material complementario

- `BP ICICSO 2026.docx`
- `WP ICICSO.docx`
- `catalogo de guias y terminologias.docx`
- `Cirugias CV.xlsx`
- `Listado arquitectura documental.xlsx`
- `ICICSO_Cognitive_Infrastructure.pdf`
- `ICICSO_Surgical_Command_Interface.pdf`
- `ICICSO-de la evidencia cientifica a la ejecucion quirúrgica.pdf`
- `ICICSO-El Cerebro de la cirugia compleja.pdf`
- `El_cerebro_digital_que_orquesta_el_quirófano.m4a`

Uso:

- validacion narrativa,
- presentacion ejecutiva,
- apoyo al modelado del dominio,
- apoyo a demos y alineacion institucional.

## Orden recomendado de carga al software

1. Arquitectura madre.
2. Outputs nucleares.
3. L0.
4. L1.
5. L2.
6. L3.
7. L4.
8. L5.
9. L6.
10. Complementarios.

## Reglas de carga

- Nunca sobrescribir el archivo original.
- Generar hash de cada archivo al ingreso.
- Registrar fecha de carga local.
- Mantener categoria estructural.
- Vincular cada derivado con su fuente.
- Separar documento fuente de objeto computable derivado.

## Resultado esperado del pipeline de carga

Por cada archivo cargado, el sistema futuro debe poder registrar:

- `document_id`
- `file_name`
- `absolute_path`
- `layer`
- `document_type`
- `language`
- `version_detected`
- `hash_sha256`
- `ingestion_timestamp`
- `source_status`
- `derived_artifacts[]`

## Nota operativa

Los archivos ya quedaron organizados por capa y tipo documental dentro del proyecto. El trabajo correcto aqui es tratarlos como corpus local gobernado y preparar su ingestion estructurada para el software sin alterar los originales.
