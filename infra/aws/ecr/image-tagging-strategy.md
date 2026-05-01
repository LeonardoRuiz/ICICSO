# Image Tagging Strategy

## Tags obligatorios

- `git-sha` corto para trazabilidad

## Tags opcionales

- `branch-name` saneado para previews
- `release-x.y.z` para hitos

## Regla de deploy

- staging debe desplegar por tag inmutable derivado de commit
- evitar `latest` como referencia operativa del overlay

## Limpieza

- conservar últimas 20 imágenes por repositorio
- conservar imágenes referenciadas por releases activas
