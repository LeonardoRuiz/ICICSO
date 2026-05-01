# Pipeline Contract

## Etapas y contrato

### 1. Estructura

Valida:

- existencia de `icicso-local`
- existencia de `infra/docker`
- existencia de `infra/k8s`
- existencia de scripts críticos

Bloquea merge:

- sí

Fallo crítico:

- path operativo faltante

Artefactos:

- ninguno

### 2. Lint

Valida:

- TypeScript en `apps/*/src/**/*.ts`
- TypeScript en `packages/*/src/**/*.ts`
- JavaScript del frontend estático `apps/desktop-emulator/**/*.js`

Bloquea merge:

- sí

Fallo crítico:

- error de ESLint

Artefactos:

- reflejo en `ci-summary.txt`

### 3. Typecheck

Valida:

- typecheck monorepo con `pnpm typecheck:repo`

Bloquea merge:

- sí

Fallo crítico:

- error de `tsc` o pipeline `turbo`

Artefactos:

- reflejo en `ci-summary.txt`

### 4. Tests

Valida:

- suite real Python del engine clínico

Bloquea merge:

- sí

Fallo crítico:

- cualquier test fallido o error de colección

Artefactos:

- reflejo en `ci-summary.txt`

### 5. Build

Valida:

- Prisma generate
- compilación `build:block8`

Bloquea merge:

- sí

Fallo crítico:

- build fallida en servicios incluidos

Artefactos:

- binarios `dist/**` del monorepo

### 6. Docker Image Build

Valida:

- construcción de:
  - `icicso/node-runtime`
  - `icicso/frontend-local`
  - `icicso/semantic-terminology-engine`

Bloquea merge:

- sí en `ci.yml`

Fallo crítico:

- `docker build` fallido

Artefactos:

- `dist/cicd/image-tags.txt`

### 7. Kubernetes Validation

Valida:

- render de `infra/k8s` vía `kubectl kustomize`
- parseo YAML
- unicidad de recursos
- consistencia básica de selectors en Deployments y Services

Bloquea merge:

- sí

Fallo crítico:

- YAML inválido
- kustomization inválida
- selector inconsistente

Artefactos:

- `dist/cicd/k8s-rendered.yaml`

### 8. Local CD

Valida:

- build de imágenes
- apply de manifests
- rollout de deployments
- smoke tests de frontend, api, parser y engine

Bloquea merge:

- no aplica a merge automático; bloquea el deploy local

Fallo crítico:

- rollout incompleto
- smoke test fallido

Artefactos:

- `dist/cicd/smoke-summary.txt`

## Qué bloquea merge

Bloquean merge:

- estructura inválida
- lint fallido
- typecheck fallido
- tests fallidos
- build fallida
- imágenes no construibles
- manifests Kubernetes inválidos

## Qué se considera fallo crítico

- un servicio objetivo no compila
- el engine no pasa tests
- un manifest renderizado no parsea
- el deploy local no alcanza readiness
- un smoke test de frontend, api, parser o engine falla

## Evolución a staging y producción

La evolución prevista es:

1. mantener `ci.yml` como contrato de calidad
2. reemplazar `cd-local.yml` por `cd-staging.yml` con registry remoto
3. sustituir tags locales por tags semánticos + SHA
4. mantener `validate-k8s.yml` como gate previo a cualquier apply
5. mover el destino de `kubectl apply -k` desde Docker Desktop a EKS sin cambiar el layout de manifests
