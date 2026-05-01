# Postgres Config Contract

| variable | descripción | obligatoria | default permitido | ejemplo | sensible | entornos | impacto si falta | validación |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `POSTGRES_HOST` | hostname de Postgres | sí | sí | `icicso-postgres` | no | local/dev/staging/prod | servicios no conectan | string |
| `POSTGRES_PORT` | puerto de Postgres | sí | sí | `5432` | no | local/dev/staging/prod | servicios no conectan | puerto |
| `POSTGRES_DB` | nombre de base | sí | sí | `icicso_local` | no | local/dev/staging/prod | init y probes fallan | string |
| `POSTGRES_USER` | usuario de aplicación | sí | sí | `icicso` | no | local/dev/staging/prod | autenticación falla | string |
| `POSTGRES_PASSWORD` | password de Postgres | sí | no | `replace-with-postgres-password` | sí | local/dev/staging/prod | base inaccesible | longitud mínima 12 |
| `DATABASE_URL` | DSN canónico para apps | sí | no | `postgresql://...` | sí | local/dev/staging/prod | clientes no arrancan | URL PostgreSQL |
