# INVENTORY INDEX

## 1. Árboles principales

### Código y runtime

- `icicso/`
- `icicso-local/`
- `services/ingestion-orquestador/`
- `08_Plataforma_Digital/icicso-foundation/`
- `domain/`
- `packages/`

### Infraestructura y operación

- `infra/`
- `config/`
- `scripts/`
- `.github/workflows/`
- `tools/desktop-launcher/`

### Documentación y corpus

- `docs/`
- `services/ingestion-orquestador/docs/`
- `icicso-local/docs/`
- `ICICSO_PAPERS/`
- `ICICSO_TERMINOLOGIAS/`
- `evidence/`
- `03_Outputs/`

### Residuos / cachés / artefactos

- `logs/`
- `dist/`
- `_quarantine/`
- `.pnpm-store/`
- `.venv/`
- `node_modules/`
- `.pytest_cache` en subárboles Python

## 2. package.json / pyproject.toml detectados

- `package.json`
- `icicso/package.json`
- `icicso-local/package.json`
- `08_Plataforma_Digital/icicso-foundation/package.json`
- `packages/evidence-intelligence/package.json`
- `packages/contracts/package.json`
- `domain/contracts/package.json`
- `domain/evidence-translation/package.json`
- `domain/cpo/operative-compiler/package.json`
- `domain/case-control/case-control/package.json`
- `domain/ingest/evidence-ingestion/package.json`
- `domain/shared-kernel/shared-kernel/package.json`
- `services/ingestion-orquestador/pyproject.toml`
- `icicso-local/engines/13_semantic_terminology_engine/pyproject.toml`

## 3. Workspaces

### Root

- `pnpm-workspace.yaml`
- declara:
  - `apps/*`
  - `packages/*`
- problema:
  - hoy esos árboles root están vacíos o subpoblados; no representan la topología principal del proyecto.

### `icicso-local`

- `icicso-local/pnpm-workspace.yaml`
- declara:
  - `packages/*`
  - `engines/*`
  - `apps/*`

### `icicso-foundation`

- `08_Plataforma_Digital/icicso-foundation/pnpm-workspace.yaml`
- declara:
  - `apps/*`
  - `contracts`
  - `domains/*`
  - `packages/*`
  - `packages/domains/*`
  - `state-machines/*`

## 4. Apps / servicios / emuladores

### `icicso-local/apps`

- `gateway-api`
- `auth-service`
- `identity-service`
- `audit-service`
- `storage-service`
- `ingestion-service`
- `terminology-service`
- `data-governance-service`
- `evidence-lake-service`
- `ghl-service`
- `kbol-service`
- `runbook-service`
- `readiness-service`
- `case-control-service`
- `systemic-risk-service`
- `cqoi-service`
- `desktop-emulator`

### `icicso/apps`

- `emulator`
- `api` placeholder

### `08_Plataforma_Digital/icicso-foundation/apps`

- `api`
- `web`

### Python service

- `services/ingestion-orquestador`

## 5. Endpoints principales detectados

### `icicso-local`

- `gateway-api`
  - `/health/live`
  - `/health/startup`
  - `/health/ready`
  - `/metrics`
  - `/block1/overview`
  - `/block2/overview`
  - `/block2/dataset-status`
  - `/block3/evidence-lake/summary`
  - `/block5/gp-cpo/summary`
  - `/block6/readiness/summary`
  - `/block7/case-control/summary`
  - `/block8/systemic-control/summary`
  - proxies `/auth`, `/identity`, `/audit`, `/storage`, `/ingestion`, `/terminology`, `/governance`, `/evidence-lake`, `/ghl`, `/kbol`, `/runbook`, `/readiness`, `/case-control`, `/systemic-risk`, `/cqoi`
- `auth-service`
  - `/health`
  - `/login`
  - `/me`
- `identity-service`
  - `/health`
  - `/identities`
  - `/episodes`
  - `/cases`
  - `/cases/:id`
- `audit-service`
  - `/health`
  - `/events`
- `storage-service`
  - `/health`
  - `/documents/metadata`
  - `/cases/:caseId/documents`
- `ingestion-service`
  - `/health/live`
  - `/health/startup`
  - `/health/ready`
  - `/metrics`
  - `/ingestions/structured`
- `terminology-service`
  - `/health`
  - `/catalog`
  - `/lookup`
  - `/mapping`
- `data-governance-service`
  - `/health`
  - `/parsed-variables`
  - `/provenance`
  - `/terminology-mappings`
  - `/certification-records`
  - `/dataset-status`
  - `/certify`
  - `/overview`
- `evidence-lake-service`
  - `/health`
  - `/ser`
  - `/eo`
  - `/icdr`
  - `/snapshot`
  - `/summary`
- `ghl-service`
  - `/health`
  - `/domains`
  - `/packages/publish`
  - `/domains/:id/packages`
  - `/packages/:id`
  - `/summary`
- `kbol-service`
  - `/health`
  - `/frameworks`
  - `/frameworks/dependencies`
  - `/cpo/generate`
  - `/cpo`
  - `/summary`
- `runbook-service`
  - `/health`
  - `/runbook/generate`
  - `/runbook`
  - `/bom`
  - `/tam`
  - `/evt`
  - `/summary`
- `readiness-service`
  - `/health`
  - `/readiness/evaluate`
  - `/readiness/snapshot`
  - `/summary`
- `case-control-service`
  - `/health`
  - `/activate`
  - `/transition`
  - `/timeline`
  - `/esl`
  - `/overrides`
  - `/summary`
- `systemic-risk-service`
  - `/health`
  - `/signals`
  - `/dtq`
  - `/summary`
- `cqoi-service`
  - `/health`
  - `/metrics`
  - `/drift`
  - `/summary`

### `icicso-foundation`

- `apps/api`
  - `/health`
  - `/auth/*`
  - `/patients/*`
  - `/cases/*`
  - `/catalogs/*`

## 6. Docker / compose / env / workflows

### Compose files

- `icicso-local/docker-compose.yml`
- `08_Plataforma_Digital/icicso-foundation/docker-compose.yml`
- `infra/observability/docker-compose.yml`

### Dockerfiles

- `icicso-local/engines/13_semantic_terminology_engine/Dockerfile`
- `08_Plataforma_Digital/icicso-foundation/apps/api/Dockerfile`
- `08_Plataforma_Digital/icicso-foundation/apps/web/Dockerfile`

### Env examples

- `config/env/.env.dev.example`
- `config/env/.env.local.example`
- `config/env/.env.prod.example`
- `config/env/.env.staging.example`
- `icicso-local/.env.example`
- `08_Plataforma_Digital/icicso-foundation/.env.example`

### Workflows

- `.github/workflows/ci.yml`
- `.github/workflows/cd-local.yml`
- `.github/workflows/validate-k8s.yml`

## 7. Launchers y accesos

### En repo

- `Launch-ICICSO-Continuum.cmd`
- `scripts/start-icicso-mockup.bat`
- `scripts/start-icicso-mockup.ps1`
- `scripts/start-icicso-canon-emulator.bat`
- `scripts/start-icicso-canon-emulator.ps1`
- `tools/desktop-launcher/Activar-ICICSO-Local.bat`
- `tools/desktop-launcher/ICICSO-Local.html`

### En carpeta externa `C:\Users\leona\OneDrive\Desktop\ICICSO Local`

- `Abrir ICICSO Mockup Local.cmd`
- `Abrir ICICSO Canon Emulator.cmd`
- `Abrir Portada ICICSO Local.cmd`
- `Detener ICICSO Mockup Local.cmd`
- `Detener ICICSO Canon Emulator.cmd`
- `LEEME - ICICSO Local.txt`

## 8. Vacíos, placeholders y residuos notables

### Directorios vacíos

- `00_Inbox/`
- `analytics/`
- `apps/`
- `client-ops/`
- `integrations/`
- `legal/`
- `simulation/`
- `icicso-local/infrastructure/`
- `icicso-local/shared/`

### Placeholders claros

- `icicso/apps/api/src/index.ts`
- muchos `domain/*/index.ts` de una sola línea
- `icicso-local/packages/event-bus` sin `src/`

### Logs / outputs

- `logs/` contiene 39 archivos
- `dist/` contiene 47 archivos
- `03_Outputs/` contiene 6 archivos

## 9. Carpeta espejo / desalineación entre repo e “ICICSO Local”

Estado real:

- `C:\Users\leona\OneDrive\Desktop\ICICSO Local` no es mirror de `icicso-local/`.
- Es solo una carpeta de acceso rápido.
- El código real vive en `ICICSO\icicso-local\`.

Desalineación:

- documentación externa presenta la carpeta como punto de entrada del sistema;
- pero no contiene código, configs ni estado propio.
