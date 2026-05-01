# Restore Policy

## Principios

- Ningún restore destructivo debe ejecutarse sin confirmación explícita (`--force` o `-Force`).
- Todo restore debe validar la existencia del origen antes de modificar el destino.
- Si existe data local previa, se crea un snapshot de seguridad en `backups/local/restore-safety/`.

## Restore de Postgres

- Requiere dump SQL generado por `backup-postgres`.
- El restore se ejecuta contra:
  - Kubernetes local si `icicso-postgres` está desplegado.
  - Docker Compose si existe un contenedor `postgres` activo.
- Validación posterior mínima:
  - conectividad `SELECT 1`
  - archivo de dump no vacío

## Restore de documentos

- El restore documental reemplaza `icicso-local/.data/` desde un `.zip`.
- Si `icicso-local/.data/` ya existe y contiene archivos, se copia primero a `restore-safety`.

## Restore completo local

- Orquesta restore de Postgres y restore documental.
- Requiere un backup completo generado por `backup-full-local`.
- La validación final incluye:
  - inventario cargado
  - SQL presente
  - `.data/` restaurado
  - checksums de integridad del backup
