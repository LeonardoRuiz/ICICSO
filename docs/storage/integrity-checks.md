# Integrity Checks

## Verificación post-backup

- El archivo de salida debe existir.
- El archivo de salida no debe quedar vacío.
- Se calcula SHA-256 para dumps y zips.
- El backup completo genera `inventory.json` con checksums y tamaños.

## Verificación post-restore

- Restore de Postgres:
  - `SELECT 1`
  - ejecución exitosa de `psql`
- Restore documental:
  - `.data/` reconstruido
  - presencia de archivos JSON esperados

## Riesgos conocidos

- `pg_dump` SQL plano no captura roles globales ni configuraciones externas al schema.
- El restore documental reemplaza el directorio `.data/`; por eso siempre exige confirmación.
- MinIO aún no forma parte de la cadena de integridad automática.
