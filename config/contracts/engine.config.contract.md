# Engine Config Contract

| variable | descripción | obligatoria | default permitido | ejemplo | sensible | entornos | impacto si falta | validación |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TERMINOLOGY_ENGINE_URL` | URL pública/interna del engine | sí | sí | `http://icicso-engine:8000` | no | local/dev/staging/prod | API no puede checar health ni enrutar | URL http(s) |
| `DATABASE_URL` | conexión del engine a Postgres | sí | no | `postgresql://...` | sí | local/dev/staging/prod | engine no arranca o no persiste | URL PostgreSQL |
| `REDIS_URL` | conexión a Redis | sí | sí en local | `redis://icicso-redis:6379` | no en local | local/dev/staging/prod | readiness degradada o cache caída | URL redis |
| `POSTGRES_HOST` | host de Postgres | sí | sí | `icicso-postgres` | no | local/dev/staging/prod | readiness inválida | string |
| `REDIS_HOST` | host de Redis | sí | sí | `icicso-redis` | no | local/dev/staging/prod | readiness inválida | string |
| `JWT_SECRET` | secreto de firma compartido | sí | no | `replace-with-long-jwt-secret` | sí | local/dev/staging/prod | auth inconsistente entre servicios | longitud mínima 24 |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | endpoint OTLP futuro | no | sí | `http://localhost:14418` | no | local/dev/staging/prod | tracing incompleto | URL http(s) |
| `BUILD_ID` | build/tag del engine | no | sí | `release-2026.04.04` | no | local/dev/staging/prod | menor trazabilidad | string |
