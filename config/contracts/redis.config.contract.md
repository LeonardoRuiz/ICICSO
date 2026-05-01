# Redis Config Contract

| variable | descripción | obligatoria | default permitido | ejemplo | sensible | entornos | impacto si falta | validación |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `REDIS_HOST` | hostname de Redis | sí | sí | `icicso-redis` | no | local/dev/staging/prod | health degradado | string |
| `REDIS_PORT` | puerto de Redis | sí | sí | `6379` | no | local/dev/staging/prod | health degradado | puerto |
| `REDIS_URL` | URL de conexión | sí | sí en local | `redis://icicso-redis:6379` | no en local | local/dev/staging/prod | engine no puede usar cache | URL redis |
| `REDIS_PASSWORD` | password si se habilita auth | no hoy | no | `replace-when-auth-is-enabled` | sí | staging/prod | redis no autentica clientes | string |
