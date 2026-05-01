# ICICSO Canonical Continuum

Version: draft-3
Status: canonical working specification

## 1. Purpose

This document defines the canonical ICICSO continuum that must govern software design, bounded contexts, contracts, state machines, and implementation sequencing.

ICICSO is an institutional orchestration layer. It is not an `EHR`, not an autonomous ordering system, and not a financial decision system.

## 2. Canonical Continuum

### L0 Foundation / Governance

- ontology
- clinical supremacy
- science/operations/logistics/finance separation
- `VRN`
- append-only
- `GCL` arbitration

### L1 Scientific intake

- `SER`
- `EO`
- `EL`

### L2 Evidence translation

- `ETE -> ECS, UCI, contextual applicability, minimum dependencies`

### L3 Uncertainty

- `EUL -> Level I-IV + reinforced validation requirement`

### L4 Harmonization

- `GHL -> Guideline Package + coexistence map + neutrality declaration + scope + update triggers`

### L5 Operative compilation

- `KBOL -> CPO, RO, BO/BOM, TAM, EVT, RDY-G, CAE, CAE-CTX, SRM hooks`
- `KBOL` remains pre-executable and cannot ingest dynamic patient payloads as structural inputs.

### L6 Case activation

- requires:
  1. medical order in `EHR`
  2. formal medical validation
  3. active `VRN`
  4. minimum dependencies complete

### L7 Case runtime

- `CCCL` case state machine
- transition log
- `EVT` evaluation
- `RDY-G` evaluation
- overrides
- consent integration
- timestamp
- structured references only

### L8 Legal/clinical outputs

- Decision Card
- `ESL`
- Medication & Device Safety
- `PRI` firewall outputs

### L9 Systemic models

- `SRM`
- `DTQ`
- `SVP`
- `CQOI`
- drift detection

### L10 Hospital operations

- `LCCB`
- `OR` scheduling
- `ICU` capacity
- critical inventory
- contingencies
- no modification of clinical indication

### L11 Technology / interoperability

- `FHIR/HL7/DICOM`
- terminology server
- API versioning
- hash chain
- signatures
- access control

### L12 Ethics / downstream / federation

- `BEG`
- `EEM`
- `CML`
- `OPL`
- `SIM`
- `ANON`
- `EXPORT`
- `FCI`
- aggregate-only
- no upstream influence

## 3. Bloque 9 aplicado al continuum

`Bloque 9` no agrega una capa nueva al continuum. Es la agrupacion de implementacion que conecta:

- ejecucion clinica certificada desde `L7-L8`
- inteligencia sistemica desde `L9`
- planeacion hospitalaria desde `L10`
- economia, comercial, simulacion y exportacion en `L12`

Regla fundamental:

- downstream = `read-only + agregado + anonimizado`

Restricciones obligatorias:

- no write-back hacia `EL`, `ETE`, `GHL`, `KBOL`, `CCCL` o `ESL`
- no recalculo de `EO`, `EUL`, `GP`, `CPO` o snapshots legales
- no influencia en tiempo real sobre la decision clinica individual
- toda salida economica o comercial basada en casos debe pasar por `ANON`

## 4. Software Rule

All ICICSO software artifacts must map explicitly to one canonical layer `L0-L12`. No module may violate the separation defined by this continuum.

For implementation planning, a software module may formar parte de `Bloque 9` solo si mantiene la separacion de capas y el caracter observacional downstream.

## 5. Implementation Order

1. `L0-L1`
2. `L2-L3`
3. `L4-L5`
4. `L6-L8`
5. `L9-L12`
