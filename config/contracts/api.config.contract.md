# API Config Contract

| variable | descripción | obligatoria | default permitido | ejemplo | sensible | entornos | impacto si falta | validación |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GATEWAY_API_PORT` | puerto HTTP del gateway | sí | sí | `3100` | no | local/dev/staging/prod | el gateway no expone tráfico | puerto |
| `JWT_SECRET` | firma de tokens | sí | no | `replace-with-long-jwt-secret` | sí | local/dev/staging/prod | autenticación inválida | longitud mínima 24 |
| `DATABASE_URL` | conexión a Postgres | sí | no | `postgresql://...` | sí | local/dev/staging/prod | el API no puede consultar ni seedear datos | URL PostgreSQL |
| `AUTH_SERVICE_URL` | URL del servicio auth | sí | sí | `http://icicso-engine:3101` | no | local/dev/staging/prod | health y proxy rotos | URL http(s) |
| `IDENTITY_SERVICE_URL` | URL del servicio identity | sí | sí | `http://icicso-engine:3102` | no | local/dev/staging/prod | bloque 1 roto | URL http(s) |
| `INGESTION_SERVICE_URL` | URL del parser | sí | sí | `http://icicso-parser:3108` | no | local/dev/staging/prod | ingest y bloque 2 rotos | URL http(s) |
| `TERMINOLOGY_ENGINE_URL` | URL del engine clínico | sí | sí | `http://icicso-engine:8000` | no | local/dev/staging/prod | health agregado incompleto | URL http(s) |
| `LOG_LEVEL` | nivel de log | sí | sí | `info` | no | local/dev/staging/prod | menor auditabilidad | enum |
| `BUILD_ID` | versión o tag | no | sí | `release-2026.04.04` | no | local/dev/staging/prod | menor trazabilidad | string |
