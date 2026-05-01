# Disaster Recovery Local

## Escenarios cubiertos

1. Pérdida del PVC o volumen de Postgres.
2. Corrupción o borrado accidental de `icicso-local/.data/`.
3. Reset del entorno local de Docker Desktop.

## Estrategia

- Restaurar primero configuración local no sensible.
- Levantar infraestructura base.
- Restaurar Postgres.
- Restaurar `icicso-local/.data/`.
- Validar endpoints de health y smoke tests del stack.

## Dependencias

- Docker Desktop operativo.
- Kubernetes local operativo si se va a restaurar sobre K8s.
- Backups generados previamente bajo `backups/local/`.

## Gaps actuales

- MinIO sigue fuera del flujo automático de backup/restore.
- Redis no se restaura porque se clasifica como cache.
- Observabilidad local no tiene DR persistente completo en esta fase.
