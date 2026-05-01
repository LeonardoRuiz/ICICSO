# ICICSO local sobre Kubernetes en Docker Desktop

Esta base Kubernetes traduce el runtime local de `icicso-local` a un entorno reproducible en Docker Desktop sin tocar `docker-compose.yml`.

## Auditoría resumida

### Servicios detectados

| Servicio repo | Tipo actual | Puerto | Dependencias observables | Estado en K8s |
| --- | --- | --- | --- | --- |
| `apps/desktop-emulator` | HTML/CSS/JS estático | 80 en K8s | `gateway-api` | Incluido |
| `apps/gateway-api` | Node HTTP | 3100 | auth, identity, audit, storage, ingestion, terminology, governance, evidence-lake, ghl, kbol, runbook, readiness, case-control, systemic-risk, cqoi | Incluido |
| `apps/ingestion-service` | Node HTTP | 3108 | Postgres | Incluido |
| `apps/auth-service` a `apps/cqoi-service` | Node HTTP | 3101-3115 | Postgres | Incluidos dentro de `engine` |
| `engines/13_semantic_terminology_engine` | FastAPI | 8000 | Postgres, Redis | Incluido dentro de `engine` |
| `postgres` | Compose | 5432 | volumen persistente | Incluido |
| `redis` | Compose | 6379 | volumen persistente | Incluido |
| `kafka`, `zookeeper`, `minio`, `pgadmin`, `kafka-ui` | Compose | varios | infra opcional | Fuera de K8s por ahora |

### Hallazgos relevantes

- `icicso-local/docker-compose.yml` sólo levanta infraestructura; las apps Node no tienen Dockerfiles propios.
- Se agregaron `infra/docker/node-runtime.Dockerfile` y `infra/docker/frontend.Dockerfile` para construir imágenes locales.
- `icicso-local/infrastructure/docker/postgres/init.sql` es referenciado por Compose pero no existe en el repo.
- En Kubernetes la inicialización de DB se reemplaza con `pnpm --filter @icicso/database db:push && pnpm --filter @icicso/database db:seed`.
- `storage-service` expone metadatos de MinIO, pero el código actual no hace IO duro a MinIO; por eso MinIO queda fuera de esta primera base K8s.
- `engine-deployment` agrupa microservicios clínicos en un solo pod multi-contenedor para desarrollo local. Es una decisión operativa de Docker Desktop, no la topología objetivo de producción.

## Archivos

```text
infra/
  docker/
    frontend.Dockerfile
    node-runtime.Dockerfile
  k8s/
    README.md
    api-deployment.yaml
    api-service.yaml
    configmap-app.yaml
    engine-deployment.yaml
    engine-service.yaml
    frontend-deployment.yaml
    frontend-service.yaml
    ingress.yaml
    kustomization.yaml
    namespace.yaml
    parser-deployment.yaml
    parser-service.yaml
    postgres-deployment.yaml
    postgres-pvc.yaml
    postgres-service.yaml
    redis-deployment.yaml
    redis-pvc.yaml
    redis-service.yaml
    secret-app.example.yaml
    secret-postgres.example.yaml
    secret-redis.example.yaml
```

## Prerrequisitos

- Docker Desktop abierto
- Kubernetes habilitado en Docker Desktop
- `kubectl` disponible
- `config/env/.env.local` completado
- build local de:
  - `icicso/node-runtime:dev`
  - `icicso/frontend-local:dev`
  - `icicso/semantic-terminology-engine:dev`

## Cómo habilitar Kubernetes en Docker Desktop

1. Abre Docker Desktop.
2. Ve a `Settings > Kubernetes`.
3. Activa `Enable Kubernetes`.
4. Espera a que el clúster quede en `Running`.

## Cómo validar contexto `kubectl`

```powershell
kubectl config current-context
kubectl cluster-info
kubectl get nodes
```

## Build de imágenes locales

```powershell
docker build -f infra/docker/node-runtime.Dockerfile -t icicso/node-runtime:dev .
docker build -f infra/docker/frontend.Dockerfile -t icicso/frontend-local:dev .
docker build -f icicso-local/engines/13_semantic_terminology_engine/Dockerfile -t icicso/semantic-terminology-engine:dev icicso-local/engines/13_semantic_terminology_engine
```

## Scripts operativos

Se agregaron scripts listos para Docker Desktop en [k8s-up.ps1](C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO\scripts\k8s-up.ps1), [k8s-down.ps1](C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO\scripts\k8s-down.ps1), [k8s-restart.ps1](C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO\scripts\k8s-restart.ps1) y [k8s-status.ps1](C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO\scripts\k8s-status.ps1).

Uso recomendado:

```powershell
.\scripts\k8s-up.ps1
.\scripts\k8s-status.ps1
.\scripts\k8s-restart.ps1
.\scripts\k8s-down.ps1
.\scripts\k8s-down.ps1 -DeleteData
```

`k8s-up.ps1` valida Docker Desktop, valida Kubernetes en `docker-desktop`, valida configuración local, genera secretos K8s ignorados por Git, construye las imágenes locales necesarias, aplica `infra/k8s`, espera readiness y luego imprime pods, services, ingress y endpoints.

## Cómo aplicar namespace

```powershell
kubectl apply -f infra/k8s/namespace.yaml
```

## Cómo aplicar todo el directorio

```powershell
.\scripts\config-validate.ps1 -Environment local -Sync
kubectl apply -k infra/k8s
```

## Cómo verificar pods, services e ingress

```powershell
kubectl get pods -n icicso-local
kubectl get services -n icicso-local
kubectl get ingress -n icicso-local
kubectl logs deployment/icicso-api -n icicso-local
kubectl logs deployment/icicso-parser -n icicso-local
kubectl logs deployment/icicso-engine -n icicso-local --all-containers=true
```

## Endpoint esperado

Si Docker Desktop tiene un controlador Ingress compatible con clase `nginx`:

- frontend: `http://icicso.localtest.me/`
- api: `http://icicso.localtest.me/api/health`
- bloque 1: `http://icicso.localtest.me/api/block1/overview`
- ingestión: `http://icicso.localtest.me/api/ingestion/ingestions/structured`

`localtest.me` resuelve a `127.0.0.1`.

## Port-forward si Ingress no queda listo

```powershell
kubectl port-forward -n icicso-local service/icicso-frontend 8080:80
kubectl port-forward -n icicso-local service/icicso-api 3100:3100
```

Con ese fallback:

- frontend: `http://127.0.0.1:8080`
- api: `http://127.0.0.1:3100`

Si abres el frontend por port-forward directo, cambia el campo `Gateway base` del emulador a `http://127.0.0.1:3100`.

## Cómo reiniciar deployments

```powershell
kubectl rollout restart deployment/icicso-frontend -n icicso-local
kubectl rollout restart deployment/icicso-api -n icicso-local
kubectl rollout restart deployment/icicso-parser -n icicso-local
kubectl rollout restart deployment/icicso-engine -n icicso-local
kubectl rollout restart deployment/icicso-postgres -n icicso-local
kubectl rollout restart deployment/icicso-redis -n icicso-local
```

## Cómo borrar todo sin dejar basura

```powershell
kubectl delete -k infra/k8s
kubectl delete pvc icicso-postgres-data -n icicso-local
kubectl delete pvc icicso-redis-data -n icicso-local
```

## Tabla operativa final

| Servicio | Tipo Kubernetes | Imagen | Puerto interno | Endpoint esperado | Dependencia |
| --- | --- | --- | --- | --- | --- |
| `icicso-frontend` | Deployment + Service | `icicso/frontend-local:dev` | 80 | `http://icicso.localtest.me/` | `icicso-api` |
| `icicso-api` | Deployment + Service | `icicso/node-runtime:dev` | 3100 | `http://icicso.localtest.me/api/health` | `icicso-engine`, `icicso-parser` |
| `icicso-parser` | Deployment + Service | `icicso/node-runtime:dev` | 3108 | `http://icicso.localtest.me/api/ingestion/...` | `icicso-postgres` |
| `icicso-engine` | Deployment + Service | `icicso/node-runtime:dev`, `icicso/semantic-terminology-engine:dev` | 3101-3115, 8000 | acceso interno desde gateway | `icicso-postgres`, `icicso-redis` |
| `icicso-postgres` | Deployment + Service + PVC | `postgres:16-alpine` | 5432 | `postgresql://icicso-postgres:5432/icicso_local` | PVC |
| `icicso-redis` | Deployment + Service + PVC | `redis:7-alpine` | 6379 | `redis://icicso-redis:6379` | PVC |

## Checklist final de validación

- [ ] Docker Desktop abierto
- [ ] Kubernetes activo
- [ ] `kubectl config current-context` apunta a `docker-desktop`
- [ ] Las tres imágenes locales fueron construidas
- [ ] `kubectl apply -k infra/k8s` terminó sin errores
- [ ] `kubectl get pods -n icicso-local` muestra los pods `Running`
- [ ] `http://icicso.localtest.me/` abre el emulador, o responde el port-forward
- [ ] `http://icicso.localtest.me/api/health` responde, o responde el port-forward de API
- [ ] `http://icicso.localtest.me/api/block1/overview` devuelve el caso demo
- [ ] `POST /api/ingestion/ingestions/structured` responde vía gateway
- [ ] `GET /api/block7/case-control/summary` devuelve el estado del caso

## Pendientes críticos

1. `docker-compose.yml` referencia `icicso-local/infrastructure/docker/postgres/init.sql`, pero ese archivo no existe en el repo.
2. Kafka, Zookeeper y MinIO siguen fuera del baseline K8s.
3. La build monorepo completa (`pnpm build`) debe ejecutarse localmente al menos una vez por cambio fuerte antes del `kubectl apply`.
