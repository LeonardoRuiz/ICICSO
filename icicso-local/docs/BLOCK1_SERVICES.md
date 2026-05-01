# Bloque 1 - Services / Gateway / Identity / Audit

## Estado del bloque

Bloque 1 ya participa en el runtime demo local y se visualiza en el emulador como base de `Continuum`, `Case Workspace` y `Timeline`.

Su papel actual es sostener la frontera institucional del caso:

- autenticación local
- identidad clínica mínima
- caso demo
- auditoría append-only
- gateway de composición para superficies superiores

No debe leerse como IAM hospitalario final ni como bus de integración completo.

## Rol en la arquitectura

Flujo vigente:

`usuario local -> auth-service -> identity-service -> audit-service -> gateway-api -> overview del caso`

Este bloque no produce conocimiento clínico. Produce identidad, trazabilidad y composición básica para que los bloques siguientes operen sobre un caso consistente.

## Objetos funcionales

### Auth / acceso

- `local_user`
- `local_role`
- `session_context`
- `correlation_id`

Usuarios demo:

- `admin@icicso.local`
- `clinician@icicso.local`
- `governance@icicso.local`

Roles demo:

- `admin`
- `clinician`
- `governance`

### Identidad / episodio / caso

- `identity`
- `clinical_episode`
- `case_record`

Caso demo seed:

- `ILC-MX-CIH-2026-0004821`
- `EPI-ACS-2026-02-15`
- `CASE-CABG3-2026-00014`

### Auditoría

- `audit_event`
- `previous_hash`
- `hash`
- `timestamp`

Eventos mínimos:

- `login`
- `create_case`
- `read_case`

## Reglas operativas

- `gateway-api` compone superficies para el emulador y expone `GET /block1/overview`
- cada request relevante debe transportar `X-Correlation-Id`
- la auditoría es append-only en el runtime demo
- la persistencia local de desarrollo puede vivir en archivo mientras no haya base relacional activa
- Bloque 1 no intenta modelar RBAC institucional completo, consentimiento empresarial ni federación externa

## Endpoints

### Gateway

- `GET /health`
- `GET /block1/overview`
- proxy `/auth/*`
- proxy `/identity/*`
- proxy `/audit/*`

### Auth

- `GET /health`
- `POST /login`
- `GET /me`

### Identity

- `GET /health`
- `POST /identities`
- `POST /episodes`
- `POST /cases`
- `GET /cases/:caseId`

### Audit

- `GET /health`
- `POST /events`
- `GET /events`

## Superficie visible

Cuando el runtime está arriba, este bloque se ve en:

- emulador HTML: `http://127.0.0.1:8090/index.html`
- workspaces: `Continuum`, `Case`, `Timeline`
- gateway health: `http://127.0.0.1:3100/health`
- overview del caso: `http://127.0.0.1:3100/block1/overview`

Lo que debe verse:

- estado vivo de `auth-service`, `identity-service` y `audit-service`
- identidad del caso demo
- resumen del episodio
- timeline auditable base

## Cómo correr el bloque

### Opción preferida

Levantar el runtime completo:

```powershell
.\scripts\start-icicso-mockup.ps1
```

### Opción de bloque

Desde `icicso-local/`:

```powershell
pnpm build:block1
.\scripts\Start-Block1-Services.ps1
```

## Cómo probar el bloque

```powershell
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3100/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"admin@icicso.local","password":"Admin123!"}'

Invoke-RestMethod http://127.0.0.1:3100/identity/cases/CASE-CABG3-2026-00014

Invoke-RestMethod http://127.0.0.1:3100/audit/events?caseId=CASE-CABG3-2026-00014

Invoke-RestMethod http://127.0.0.1:3100/block1/overview
```

## Límites actuales

- la identidad clínica está simplificada para demo local
- no hay integración con directorio empresarial ni con MPI hospitalario real
- la persistencia puede ser local en archivo durante desarrollo
- la auditoría sirve para trazabilidad demo, no como ledger institucional certificado

## Contrato con Bloque 2

Bloque 1 entrega a Bloque 2:

- `caseId` estable
- contexto institucional mínimo
- correlación y trazabilidad base
- gateway capaz de componer el overview de ingestión y gobernanza
