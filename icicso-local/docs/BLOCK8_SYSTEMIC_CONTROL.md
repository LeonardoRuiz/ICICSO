# Bloque 8 - Systemic Control / DTQ / CQOI / Drift

## Estado del bloque

Bloque 8 ya participa en el runtime demo local y se visualiza en el emulador como `Systemic`.

Es una capa de lectura institucional. No hace write-back sobre el caso clínico.

## Rol en la arquitectura

Flujo vigente:

`State Transition Capture (STC) + Evidence Snapshot Legal (ESL) + overrides + outcomes demo + timing/complicaciones -> systemic-risk-service -> cqoi-service -> gateway/emulador`

Este bloque agrega trazabilidad, calidad de dato, outcomes y drift por encima del caso.

## Qué está real y qué está derivado

### Real

- `State Transition Capture (STC)` desde `case-control-service`
- `Evidence Snapshot Legal (ESL)` desde `case-control-service`
- overrides desde `case-control-service`
- estado final del caso
- cobertura de trazabilidad y snapshots legales

### Derivado demo

- `outcomeAggregate`
- estancia UCI agregada
- AKI stage 1
- FA postoperatoria
- drift PBM y drift documental

Los outcomes derivados se señalan en `Data Trust & Quality (DTQ)` con `outcome_fixture_derived`.

## Fórmulas simplificadas

- `stcCoverage = min(100, STC * 16)`
- `eslCoverage = min(100, ESL * 25)`
- `overrideTransparency = 100` si todos los overrides tienen firma y justificación
- `documentationCompleteness = 78` para el caso demo cerrado
- `overallScore = promedio simple`

Señales demo:

- AKI si `creatinina delta >= 0.3`
- FA si hay FA postoperatoria
- prolonged ICU si `icuLengthHours >= 48`
- documentation issue si `documentationCompleteness < 90`
- PBM drift si `transfusionUnits > 2`

## Endpoints

### systemic-risk-service

- `GET /health`
- `GET /signals?caseId=CASE-CABG3-2026-00014`
- `GET /dtq?caseId=CASE-CABG3-2026-00014`
- `GET /summary?caseId=CASE-CABG3-2026-00014`

### cqoi-service

- `GET /health`
- `GET /metrics?caseId=CASE-CABG3-2026-00014`
- `GET /drift?caseId=CASE-CABG3-2026-00014`
- `GET /summary?caseId=CASE-CABG3-2026-00014`

### Gateway

- `GET /block8/systemic-control/summary`
- proxy `/systemic-risk/*`
- proxy `/cqoi/*`

## Superficie visible

Cuando el runtime está arriba, este bloque se ve en:

- emulador HTML: `http://127.0.0.1:8090/index.html`
- workspace: `Systemic`

Lo que debe verse:

- señales sistémicas
- score de trazabilidad `Data Trust & Quality (DTQ)`
- calidad de dato
- métricas `CQOI`
- drift candidates y drift records

## Cómo correr el bloque

### Opción preferida

Levantar el runtime completo:

```powershell
.\scripts\start-icicso-mockup.ps1
```

### Opción de bloque

Desde `icicso-local/`:

```powershell
pnpm build:block8
.\scripts\Start-Block8-Services.ps1
```

## Límites actuales

- outcomes reales todavía no sustituyen del todo a fixtures derivados
- ventanas temporales siguen simplificadas
- cohortes multi-caso siguen incompletas
- persistencia sigue siendo menos dura que un sistema institucional final

## Regla

Bloque 8 es:

- lectura agregada
- control institucional
- calidad y drift

Bloque 8 no es:

- write-back clínico
- mutación de readiness
- cambio de transición del caso
- sustitución del control longitudinal del Bloque 7
