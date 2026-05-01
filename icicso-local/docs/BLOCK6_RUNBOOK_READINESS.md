# Bloque 6 - Runbook / Readiness

## Estado del bloque

Bloque 6 ya participa en el runtime demo local y se visualiza en el emulador como `Readiness`.

Su papel actual es traducir el `Clinical Pathway Object (CPO)` en preparación concreta y verificable.

No activa ejecución clínica real.

## Rol en la arquitectura

Flujo vigente:

`Clinical Pathway Object (CPO) -> Runbook / Bill of Materials (BOM) / Temporal Activation Model (TAM) / Event Trigger (EVT) -> Readiness Gates -> Readiness Snapshot`

Este bloque convierte pathway en preparación operativa.

## Objetos funcionales

### Runbook

- `runbook`
- `runbook_step`
- `actor_matrix`

Actores demo:

- cirujano cardiovascular
- anestesiólogo
- intensivista
- enfermería quirófano
- enfermería UCI

### Preparación operativa

- `Bill of Materials (BOM)` con recursos clínicos, quirófano, UCI, equipamiento y humanos
- `Temporal Activation Model (TAM)` con fases `preop`, `intraop`, `icu`, `piso`, `follow-up`
- `Event Trigger (EVT)` con `lactato alto`, `sangrado alto`, `creatinina en ascenso`, `FA`, `hipotensión`

### Readiness

- `readiness_gate`
- `readiness_snapshot`
- `blocking_reason`

Checks demo:

- consentimiento
- crossmatch
- antiagregante suspendido
- recurso quirófano
- cama UCI
- Dependencias de Datos Mínimas Obligatorias (DDMO) completo

## Endpoints

### Runbook

- `POST /runbook/generate?caseId=CASE-CABG3-2026-00014`
- `GET /runbook?caseId=CASE-CABG3-2026-00014`
- `GET /bom?caseId=CASE-CABG3-2026-00014`
- `GET /tam?caseId=CASE-CABG3-2026-00014`
- `GET /evt?caseId=CASE-CABG3-2026-00014`
- `GET /summary?caseId=CASE-CABG3-2026-00014`

### Readiness

- `POST /readiness/evaluate?caseId=CASE-CABG3-2026-00014`
- `GET /readiness/snapshot?caseId=CASE-CABG3-2026-00014`
- `GET /summary?caseId=CASE-CABG3-2026-00014`

### Gateway

- `GET /block6/readiness/summary`
- proxy `/runbook/*`
- proxy `/readiness/*`

## Superficie visible

Cuando el runtime está arriba, este bloque se ve en:

- emulador HTML: `http://127.0.0.1:8090/index.html`
- workspace: `Readiness`

Lo que debe verse:

- snapshot `PASS/FAIL`
- checklist por actor
- recursos requeridos
- `Temporal Activation Model (TAM)`
- `Event Trigger (EVT)`
- bloqueos si existen

## Cómo correr el bloque

### Opción preferida

Levantar el runtime completo:

```powershell
.\scripts\start-icicso-mockup.ps1
```

### Opción de bloque

Desde `icicso-local/`:

```powershell
pnpm build:block6
.\scripts\Start-Block6-Services.ps1
```

## Cómo probar readiness

```powershell
Invoke-RestMethod -Method Post "http://127.0.0.1:3111/runbook/generate?caseId=CASE-CABG3-2026-00014"
Invoke-RestMethod -Method Post "http://127.0.0.1:3112/readiness/evaluate?caseId=CASE-CABG3-2026-00014"
Invoke-RestMethod "http://127.0.0.1:3100/block6/readiness/summary"
```

## Límites actuales

- el readiness demo sigue apoyándose en condiciones simplificadas
- no equivale a coordinación hospitalaria real
- el snapshot operativo sirve para demo y trazabilidad, no para orden clínica automática

## Contrato con Bloque 7

Bloque 6 habilita a Bloque 7:

- activación formal del caso
- transiciones válidas en la state machine
- trazabilidad de readiness previa a `activate case`
