# ICICSO CI/CD Overview

## Auditoría operativa del repo

El pipeline se construye sobre el runtime real de `icicso-local`, que hoy concentra:

- monorepo `pnpm` + `turbo` para servicios Node/TypeScript
- engine Python `icicso-local/engines/13_semantic_terminology_engine`
- Dockerfiles locales en `infra/docker` y en el engine Python
- despliegue local Kubernetes en `infra/k8s`
- operación local sobre Docker Desktop + Kubernetes

## Lenguajes y toolchain detectados

| Área | Lenguaje | Tooling |
| --- | --- | --- |
| `icicso-local/apps/*` | TypeScript / Node 20 | `pnpm`, `turbo`, `tsc`, `eslint` |
| `icicso-local/packages/*` | TypeScript / Node 20 | `pnpm`, `turbo`, `prisma`, `eslint` |
| `icicso-local/engines/13_semantic_terminology_engine` | Python 3.11 | `pytest`, `pytest-asyncio`, `pydantic`, `fastapi` |
| `infra/k8s` | YAML / Kustomize | `kubectl kustomize`, parseo YAML |
| `scripts` | PowerShell / Bash | operación local y smoke tests |

## Servicios incluidos desde ya en pipeline

- frontend: `icicso-local/apps/desktop-emulator`
- api principal: `icicso-local/apps/gateway-api`
- parser/ingest: `icicso-local/apps/ingestion-service`
- engine clínico: `icicso-local/engines/13_semantic_terminology_engine`
- servicios clínicos internos del gateway incluidos en build `block8`

## Gaps reales detectados

1. No existían workflows GitHub Actions.
2. No existían scripts CI/CD locales unificados.
3. El lint TypeScript no estaba cableado a nivel repo; se añadió `eslint.config.mjs`.
4. La suite de tests Node no tiene casos reales visibles hoy. El pipeline ejecuta tests Python reales del engine y documenta el gap.
5. La validación Kubernetes no tenía contrato reproducible; ahora usa `kubectl kustomize` + parseo estructural de YAML renderizado.
6. El engine Python fallaba al cargar `.env` con claves extra; se corrigió para que CI sea estable.

## Pipeline resultante

### CI

Objetivo:

- validar estructura
- instalar dependencias
- lint
- typecheck
- tests reales
- build de servicios
- build de imágenes
- validar manifests Kubernetes
- producir artefactos trazables

Entrada:

- push o pull request

Salida:

- `dist/cicd/ci-summary.txt`
- `dist/cicd/image-tags.txt`
- `dist/cicd/k8s-rendered.yaml`

### CD local

Objetivo:

- construir imágenes locales
- desplegar en Docker Desktop Kubernetes
- esperar readiness
- ejecutar smoke tests
- publicar endpoints y artefactos

Entrada:

- ejecución manual local o `workflow_dispatch` sobre runner self-hosted Windows

Salida:

- stack local desplegado
- `dist/cicd/smoke-summary.txt`

## Relación con evolución futura a AWS/EKS

La base queda separada en tres capas:

1. scripts locales ejecutables por personas
2. workflows GitHub Actions que llaman esos scripts
3. manifests Kubernetes renderizables sin Helm ni cloud coupling

Eso permite cambiar después:

- runner local -> runner GitHub / self-hosted Linux
- Docker Desktop -> EKS
- tags locales -> registry remoto
- `kubectl apply -k` local -> despliegue a cluster remoto

sin rediseñar el contrato de pipeline.
