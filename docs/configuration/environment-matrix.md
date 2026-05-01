# Environment Matrix

| variable | local | dev | staging | prod | sensible | default permitido | fuente prevista |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `NODE_ENV` | `development` | `development` | `staging` | `production` | no | no | env file / runtime |
| `LOG_LEVEL` | `info` | `info` | `info` | `warn` | no | sí | env file |
| `DATABASE_URL` | local DB | dev DB | staging DB | prod DB | sí | no | secret env / secret manager |
| `POSTGRES_HOST` | `localhost` o `icicso-postgres` | host dev | host staging | host prod | no | sí | env file / ConfigMap |
| `POSTGRES_PORT` | `5432` | `5432` | `5432` | `5432` | no | sí | env file / ConfigMap |
| `POSTGRES_DB` | `icicso_local` | `icicso_dev` | `icicso_staging` | `icicso` | no | sí | env file / ConfigMap |
| `POSTGRES_USER` | `icicso` | `icicso_app` | `icicso_app` | `icicso_app` | no | sí | env file / ConfigMap |
| `POSTGRES_PASSWORD` | local secret | dev secret | staging secret | prod secret | sí | no | secret env / secret manager |
| `REDIS_URL` | `redis://localhost:6379` | dev redis | staging redis | prod redis | no hoy | sí | env file |
| `JWT_SECRET` | local secret | dev secret | staging secret | prod secret | sí | no | secret env / secret manager |
| `MINIO_ENDPOINT` | local MinIO | dev object store | staging object store | prod object store | no | sí | env file |
| `MINIO_BUCKET` | `icicso-block2` | `icicso-dev` | `icicso-staging` | `icicso-prod` | no | sí | env file / ConfigMap |
| `MINIO_ACCESS_KEY` | local secret | dev secret | staging secret | prod secret | sí | no | secret env / secret manager |
| `MINIO_SECRET_KEY` | local secret | dev secret | staging secret | prod secret | sí | no | secret env / secret manager |
| `GATEWAY_API_URL` | localhost / ingress | dev URL | staging URL | prod URL | no | sí | env file / ConfigMap |
| `INGESTION_SERVICE_URL` | localhost / cluster | dev URL | staging URL | prod URL | no | sí | env file / ConfigMap |
| `TERMINOLOGY_ENGINE_URL` | localhost / cluster | dev URL | staging URL | prod URL | no | sí | env file / ConfigMap |
| `INGRESS_HOST` | `icicso.localtest.me` | dev host | staging host | prod host | no | sí | env file / ConfigMap |
| `OBSERVABILITY_GRAFANA_ADMIN_PASSWORD` | local secret | dev secret | staging secret | prod secret | sí | no | secret env / secret manager |
| `OBSERVABILITY_POSTGRES_EXPORTER_DSN` | local DSN | dev DSN | staging DSN | prod DSN | sí | no | secret env / secret manager |
| `OBSERVABILITY_REDIS_EXPORTER_ADDR` | local redis | dev redis | staging redis | prod redis | no | sí | env file |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | local collector | dev collector | staging collector | prod collector | no | sí | env file / runtime |
