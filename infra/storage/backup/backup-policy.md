# Backup Policy

## Alcance inicial

La base local de backup cubre:

- Postgres en Kubernetes o Docker Compose.
- Persistencia local del mock integral en `icicso-local/.data/`.
- Configuración no sensible y manifests necesarios para reconstrucción local.

## Frecuencia sugerida

- Antes de cambios estructurales de esquema o reset de entorno: `backup-full-local`.
- Antes de `k8s-down -DeleteData`: `backup-full-local`.
- Antes de pruebas destructivas de restore: `backup-postgres` y `backup-documents`.

## Ubicación

- Todos los backups se guardan bajo `backups/local/`.
- Estructura principal:
  - `backups/local/postgres/`
  - `backups/local/documents/`
  - `backups/local/full/`
  - `backups/local/restore-safety/`

## Formatos

- Postgres: dump SQL plano con `--clean --if-exists --no-owner`.
- Documentos y stores locales: `.zip` con checksums SHA-256.
- Backup completo: directorio timestamped con inventario JSON y subcarpetas.

## Exclusiones deliberadas

- `redis` no se respalda como fuente primaria.
- artefactos temporales de build, caches de package manager y `node_modules` no se respaldan.
- storage efímero de observabilidad no se respalda en esta fase.
