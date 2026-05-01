# Retention And Purge

## Qué se guarda

- Dumps SQL de Postgres.
- Backup zip de `icicso-local/.data/`.
- Backups completos con inventario.

## Qué se rota

- Backups antiguos cuando excedan la retención sugerida documentada en `infra/storage/backup/retention-policy.md`.
- Snapshots de seguridad de restore.

## Qué no se purga automáticamente

- El backup full más reciente.
- El dump más reciente de Postgres.
- Cualquier backup marcado para análisis de incidente.

## Qué no debe crecer sin control

- `backups/local/`
- `logs/observability/`
- `icicso-local/.data/` si se empieza a cargar data real y no solo fixtures
