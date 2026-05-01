# Bloque 7 - Case Control / State Machine

## Estado del bloque

Bloque 7 ya participa en el runtime demo local y se visualiza en el emulador como `State`.

Su papel actual es activar formalmente el caso y controlar la trazabilidad de ejecución.

## Rol en la arquitectura

Flujo vigente:

`Readiness PASS -> activate case -> state transitions -> State Transition Capture (STC) -> Evidence Snapshot Legal (ESL) -> close case`

Este bloque no implementa control sistémico ni downstream. Su responsabilidad es el control longitudinal del caso.

## Objetos funcionales

- `case_control`
- `case_state_transition`
- `state_transition_capture`
- `legal_snapshot`
- `override_record`

## State machine demo

- `PRE-OP`
- `INTRA-OP`
- `ICU`
- `FLOOR`
- `FOLLOW-UP`
- `CLOSED`

## Reglas

- no permite saltos inválidos por default
- requiere readiness `PASS` para activar
- override requiere `signedBy` y `justification`
- overrides demo: `clinical`, `logistical`, `emergent`

## Evidence Snapshot Legal (ESL) demo

Se generan snapshots legales al menos en:

- activación `PRE-OP`
- salida de `INTRA-OP`
- ingreso `ICU`
- cierre de caso

## Endpoints

- `POST /activate?caseId=CASE-CABG3-2026-00014&actorRole=case-controller`
- `POST /transition?caseId=CASE-CABG3-2026-00014`
- `GET /timeline?caseId=CASE-CABG3-2026-00014`
- `GET /esl?caseId=CASE-CABG3-2026-00014`
- `POST /overrides?caseId=CASE-CABG3-2026-00014`
- `GET /overrides?caseId=CASE-CABG3-2026-00014`
- `GET /summary?caseId=CASE-CABG3-2026-00014`

### Gateway

- `GET /block7/case-control/summary`
- proxy `/case-control/*`

## Superficie visible

Cuando el runtime está arriba, este bloque se ve en:

- emulador HTML: `http://127.0.0.1:8090/index.html`
- workspace: `State`
- operator rail: `Actions` y `Audit`

Lo que debe verse:

- estado actual del caso
- timeline de estados
- `State Transition Capture (STC)`
- `Evidence Snapshot Legal (ESL)`
- overrides
- logs de dominio

## Cómo correr el bloque

### Opción preferida

Levantar el runtime completo:

```powershell
.\scripts\start-icicso-mockup.ps1
```

### Opción de bloque

Desde `icicso-local/`:

```powershell
pnpm build:block7
.\scripts\Start-Block7-Services.ps1
```

## Cómo activar el caso

```powershell
Invoke-RestMethod -Method Post "http://127.0.0.1:3113/activate?caseId=CASE-CABG3-2026-00014&actorRole=case-controller"
```

## Cómo moverlo por estados

```powershell
Invoke-RestMethod -Method Post "http://127.0.0.1:3113/transition?caseId=CASE-CABG3-2026-00014" `
  -ContentType "application/json" `
  -Body '{"toState":"INTRA-OP","reason":"Ingreso a sala y tiempo operatorio","actorRole":"cirujano cardiovascular"}'
```

## Cómo probar override

```powershell
Invoke-RestMethod -Method Post "http://127.0.0.1:3113/overrides?caseId=CASE-CABG3-2026-00014" `
  -ContentType "application/json" `
  -Body '{"overrideType":"emergent","justification":"Necesidad de salto excepcional por emergencia clínica","signedBy":"USR-CLINICIAN-0001"}'
```

Luego usar el `overrideId` devuelto en `/transition`.

## Límites actuales

- la state machine es de demo, no de cobertura clínica total
- los snapshots legales siguen acotados al caso controlado
- el bloque no debe confundirse con observabilidad sistémica ni outcomes institucionales

## Contrato con Bloque 8

Bloque 7 alimenta a Bloque 8 con:

- `State Transition Capture (STC)`
- `Evidence Snapshot Legal (ESL)`
- overrides
- estado final y secuencia de transición del caso
