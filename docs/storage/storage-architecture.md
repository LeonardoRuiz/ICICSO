# Storage Architecture

## Resumen

El stack local de ICICSO tiene hoy dos planos de estado:

1. Infra stateful clásica:
   - Postgres
   - Redis
   - MinIO en Compose
2. Persistencia aplicada por la demo:
   - `icicso-local/.data/*.json`
   - `logs/observability/*.log`

## Mapa por servicio

| servicio/componente | storage usado hoy | ubicación | ownership | source-of-truth |
| --- | --- | --- | --- | --- |
| `icicso-postgres` | PVC / volume Docker | `/var/lib/postgresql/data` | Postgres | sí para el engine y flujos relacionales |
| `icicso-redis` | PVC / volume Docker | `/data` | Redis | no, cache |
| `minio` en Compose | volume Docker | `/data` | MinIO | preparado, no principal en el demo actual |
| `@icicso/database` | host path | `icicso-local/.data/` | apps Node del mock | sí para el mock integral |
| observability logs | host path | `logs/observability/` | scripts de observability | no, soporte operativo |

## Paths locales críticos

- `icicso-local/.data/`
- `logs/observability/`
- `backups/local/`

## Volúmenes Docker detectados

- `postgres_data`
- `redis_data`
- `minio_data`

## PVC Kubernetes detectados y preparados

- Actuales en `infra/k8s/`:
  - `icicso-postgres-data`
  - `icicso-redis-data`
- Preparados en `infra/storage/k8s/` para evolución:
  - `icicso-documents-data`
  - `icicso-observability-data`

## Qué se monta y por qué

- Postgres: persistir base relacional entre reinicios del clúster local.
- Redis: continuidad local y depuración; no como fuente primaria.
- Documents PVC: reservado para cuando parser/ingest deje de serializar únicamente a `.data/`.
- Observability PVC: reservado para una futura ejecución de Grafana/Loki/Tempo dentro de Kubernetes.

## Qué no debe persistirse

- `node_modules/`
- artefactos de build (`dist/`, `build/`, `.turbo/`)
- caches de package managers
- temporales de restore o dumps intermedios no inventariados

## Nota de arquitectura

`postgres` y `redis` siguen como `Deployment` en la base local actual. Para producción o staging serio conviene migrarlos a `StatefulSet`, pero no lo cambio aquí para no romper el stack local ya construido.
