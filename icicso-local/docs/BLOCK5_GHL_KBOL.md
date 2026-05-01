# Bloque 5 - GHL / KBOL / Clinical Pathway Object

## Estado del bloque

Bloque 5 ya participa en el runtime demo local y se visualiza en el emulador como `Pathway`.

No debe leerse como motor clínico final cerrado. Debe leerse como:

- compilación operativa de `Guideline Package`
- armonización de frameworks
- emisión de `Clinical Pathway Object (CPO)`
- puente entre `Evidence Lake` y `Runbook / Readiness`

## Rol en la arquitectura

Flujo vigente:

`Evidence Lake activo + caso demo + dataset suficiente -> Guideline Harmonization Layer (GHL) -> KBOL -> Clinical Pathway Object (CPO)`

Este bloque convierte activos científicos y reglas armonizadas en un pathway operativo legible por el runtime local.

## Objetos funcionales

### GHL

- `guideline_domain`
- `guideline_package`
- `package_eo_link`
- `sunset_policy`
- `neutrality_declaration`

Dominio demo:

- `DOM-REVASC-CABG`

Guideline Package demo:

- `GP-REVASC-CABG-v3`

### KBOL

- `operative_framework`
- `framework_dependency`
- `clinical_pathway_object`
- `rollback_record`

Frameworks demo:

- `FW-ERAS-CARD`
- `FW-GLYCEMIC`
- `FW-AKI`
- `FW-AF`
- `FW-PBM`

CPO demo:

- `CPO-CABG3-DM2-NSTEMI-FEVI35-ERC3-v1`

## Reglas operativas

- el `Clinical Pathway Object (CPO)` es `notAutoExecutable = true`
- solo se emite si el gate de datos permite `ddmoGateStatus = pass`
- `reviewFlag = true` si persisten divergencias abiertas en `Inter-Guideline Conflict / Divergence Record (ICDR)`
- `freezeFlag` y `rollback_record` siguen modelados aunque el demo no los active
- Bloque 5 no ejecuta clínica real; emite objeto operativo y dependencias

## Endpoints

### GHL

- `POST /packages/publish?caseId=CASE-CABG3-2026-00014`
- `GET /domains`
- `GET /domains/DOM-REVASC-CABG/packages`
- `GET /packages/GP-REVASC-CABG-v3`
- `GET /summary?caseId=CASE-CABG3-2026-00014`

### KBOL

- `POST /cpo/generate?caseId=CASE-CABG3-2026-00014`
- `GET /cpo?caseId=CASE-CABG3-2026-00014`
- `GET /frameworks`
- `GET /frameworks/dependencies`
- `GET /summary?caseId=CASE-CABG3-2026-00014`

### Gateway

- `GET /block5/gp-cpo/summary`
- proxy `/ghl/*`
- proxy `/kbol/*`

## Superficie visible

Cuando el runtime está arriba, este bloque se ve en:

- emulador HTML: `http://127.0.0.1:8090/index.html`
- workspace: `Pathway`

Lo que debe verse:

- `Guideline Package / Clinical Pathway Object (GP / CPO)`
- pathway object emitido
- frameworks activos
- dependencias
- flags operativas

## Cómo correr el bloque

### Opción preferida

Levantar el runtime completo:

```powershell
.\scripts\start-icicso-mockup.ps1
```

### Opción de bloque

Desde `icicso-local/`:

```powershell
pnpm build:block5
.\scripts\Start-Block5-Services.ps1
```

## Límites actuales

- todavía depende de un caso demo controlado
- no reemplaza salidas completas de `Evidence Translation Engine (ETE)` ni de `Epistemic Uncertainty Layer (EUL)`
- rollback/freeze siguen simplificados
- la compilación multi-dominio sigue siendo parcial

## Contrato con Bloque 6

Bloque 5 entrega a Bloque 6:

- `Clinical Pathway Object (CPO)`
- frameworks y dependencias activas
- gate operativo mínimo
- contexto suficiente para materializar `Runbook Object / Readiness (RO)`
