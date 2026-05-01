# Parser Config Contract

| variable | descripción | obligatoria | default permitido | ejemplo | sensible | entornos | impacto si falta | validación |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `INGESTION_SERVICE_PORT` | puerto del parser | sí | sí | `3108` | no | local/dev/staging/prod | no recibe documentos | puerto |
| `DATABASE_URL` | conexión a Postgres | sí | no | `postgresql://...` | sí | local/dev/staging/prod | no persiste documentos | URL PostgreSQL |
| `POSTGRES_HOST` | host de Postgres | sí | sí | `icicso-postgres` | no | local/dev/staging/prod | readiness inválida | string |
| `POSTGRES_PORT` | puerto de Postgres | sí | sí | `5432` | no | local/dev/staging/prod | readiness inválida | puerto |
| `AUDIT_SERVICE_URL` | URL del audit service | sí | sí | `http://icicso-engine:3103` | no | local/dev/staging/prod | auditoría degradada | URL http(s) |
| `MINIO_ENDPOINT` | endpoint de objetos | sí | sí | `http://127.0.0.1:9000` | no | local/dev/staging/prod | metadata de almacenamiento inconsistente | URL http(s) |
| `MINIO_BUCKET` | bucket usado en ingest | sí | sí | `icicso-block2` | no | local/dev/staging/prod | objetos mal direccionados | string |
| `MINIO_ACCESS_KEY` | credencial de MinIO | sí | no | `replace-with-access-key` | sí | local/dev/staging/prod | storage future-proof roto | string |
| `MINIO_SECRET_KEY` | credencial de MinIO | sí | no | `replace-with-secret-key` | sí | local/dev/staging/prod | storage future-proof roto | string |
| `LOG_LEVEL` | nivel de log | sí | sí | `info` | no | local/dev/staging/prod | menor trazabilidad | enum |
