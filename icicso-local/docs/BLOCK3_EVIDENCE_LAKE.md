# Bloque 3 - Evidence Lake

## Estado del bloque

Bloque 3 ya participa en el runtime demo local y se visualiza en el emulador como `Evidence Lake`.

Su papel actual es consolidar activos científicos y divergencias relevantes para el caso demo, con snapshot utilizable por la siguiente capa.

No debe leerse como lakehouse científico completo ni como motor final de síntesis epistemológica.

## Rol en la arquitectura

Flujo vigente:

`dataset certificado + caso demo -> source_evidence_record -> evidence_object -> icdr_record -> evidence_snapshot`

Este bloque transforma material científico y reglas de armonización básica en un snapshot clínico trazable sobre el cual puede compilarse el pathway.

## Objetos funcionales

### Activos del lake

- `source_evidence_record`
- `evidence_object`
- `icdr_record`
- `evidence_snapshot`

### Seeds demo

Source Evidence Record (SER):

- `SER-REVASC-ACC-2021`
- `SER-REVASC-ESC-2018`
- `SER-DM-ADA-2024`
- `SER-AKI-KDIGO-2012`
- `SER-CKD-KDIGO-2023`
- `SER-ERAS-CARDIAC-2022`
- `SER-PBM-STS-2022`

Evidence Object (EO):

- `EO-REVASC-002`
- `EO-REVASC-007`
- `EO-ACS-003`
- `EO-AKI-001`
- `EO-ERAS-003`
- `EO-PBM-003`
- `EO-CKD-002`
- `EO-REVASC-003`

Inter-Guideline Conflict / Divergence Record (ICDR):

- `ICDR-REVASC-DM2-SYNTAX-001`

Snapshot demo:

- `SNAPSHOT-CABG3-EL-0001`

## Reglas operativas

- la persistencia vigente es append-only para demo local
- no hay delete ni edición destructiva de activos base
- cada activo expone `status`, `hash` y `vrn`
- una divergencia abierta en `ICDR` no impide ver el snapshot, pero sí debe propagarse como bandera aguas abajo
- Bloque 3 organiza evidencia utilizable; no decide ejecución clínica por sí mismo

## Endpoints

### Evidence Lake Service

- `GET /health`
- `GET /ser`
- `GET /eo`
- `GET /eo?domain=revascularization`
- `GET /icdr`
- `GET /snapshot?caseId=CASE-CABG3-2026-00014`
- `GET /summary?caseId=CASE-CABG3-2026-00014`

### Gateway

- `GET /block3/evidence-lake/summary`
- proxy `GET /evidence-lake/ser`
- proxy `GET /evidence-lake/eo`
- proxy `GET /evidence-lake/icdr`
- proxy `GET /evidence-lake/snapshot`

## Superficie visible

Cuando el runtime está arriba, este bloque se ve en:

- emulador HTML: `http://127.0.0.1:8090/index.html`
- workspace: `Knowledge` / `Evidence Lake`
- gateway: `http://127.0.0.1:3100/block3/evidence-lake/summary`

Lo que debe verse:

- Source Evidence Record (SER) activos
- Evidence Object (EO) activos
- Inter-Guideline Conflict / Divergence Record (ICDR) abiertos
- snapshot científico del caso
- `hash` y `vrn` del snapshot

## Cómo correr el bloque

### Opción preferida

Levantar el runtime completo:

```powershell
.\scripts\start-icicso-mockup.ps1
```

### Opción de bloque

Desde `icicso-local/`:

```powershell
pnpm build:block3
.\scripts\Start-Block3-Services.ps1
```

## Cómo probar el bloque

```powershell
Invoke-RestMethod http://127.0.0.1:3104/ser

Invoke-RestMethod "http://127.0.0.1:3104/eo?domain=revascularization"

Invoke-RestMethod http://127.0.0.1:3104/icdr

Invoke-RestMethod "http://127.0.0.1:3100/block3/evidence-lake/summary"
```

## Límites actuales

- sigue apoyándose en seeds y snapshot demo controlado
- la evolución de evidencia y versionado profundo todavía es parcial
- no reemplaza un repositorio científico institucional completo
- la gestión de divergencias es visible, pero aún simplificada

## Contrato con Bloque 5

Bloque 3 entrega a Bloque 5:

- snapshot científico actual del caso
- `Source Evidence Record (SER)` y `Evidence Object (EO)` activos
- divergencias abiertas en `Inter-Guideline Conflict / Divergence Record (ICDR)`
- contexto suficiente para `Guideline Package / Clinical Pathway Object (GP / CPO)`
