# Volumes Docker del Stack ICICSO Local

## Volúmenes detectados

| volumen | servicio | mount path | tipo de dato | persistente | regenerable | criticidad |
| --- | --- | --- | --- | --- | --- | --- |
| `postgres_data` | `postgres` | `/var/lib/postgresql/data` | datos relacionales operativos | sí | no | alta |
| `redis_data` | `redis` | `/data` | cache y estructuras temporales | sí en local, no como source-of-truth | sí | media |
| `minio_data` | `minio` | `/data` | object storage preparado para documentos | sí | depende del uso real | alta cuando se use como fuente |

## Observaciones operativas

- `postgres_data` es el volumen más crítico del `docker-compose` actual.
- `redis_data` ayuda a continuidad local, pero debe tratarse como cache restaurable.
- `minio_data` existe en Compose, pero el flujo activo del demo aún persiste metadatos y artefactos derivados principalmente en `icicso-local/.data/`.
- El repo también usa persistencia host-path fuera de Docker:
  - `icicso-local/.data/`
  - `logs/observability/`

## Riesgos actuales

- Si se elimina `icicso-local/.data/`, se pierde la fuente operativa del mock integrado aunque Postgres siga vivo.
- `minio_data` hoy no tiene procedimiento de backup dedicado en el stack existente.
- Los volúmenes Docker no deben asumirse equivalentes a los PVC de Kubernetes; son estrategias paralelas para local.
