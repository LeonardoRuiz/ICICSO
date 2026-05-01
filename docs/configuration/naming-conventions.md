# Naming Conventions

## Reglas

- mantener nombres explícitos por dominio: `GATEWAY_API_URL`, `POSTGRES_PASSWORD`, `OBSERVABILITY_GRAFANA_ADMIN_PASSWORD`
- reservar nombres genéricos sólo para convenciones estándar del runtime: `NODE_ENV`
- usar sufijos consistentes:
  - `_URL` para URLs completas
  - `_HOST` para hostnames
  - `_PORT` para puertos
  - `_USER` para usuarios
  - `_PASSWORD` para passwords
  - `_SECRET` para secretos arbitrarios

## Reglas de sensibilidad

- si la variable contiene credenciales, usar nombre explícito sensible
- no esconder secretos en variables aparentemente inocuas
- si una URL embebe credenciales, tratarla como secreta

## Reglas entre entornos

- el nombre no cambia entre local/dev/staging/prod
- cambia sólo el valor y la fuente
- los ejemplos usan placeholders explícitos `replace-with-*`

## Excepciones controladas

- `POSTGRES_*` y `MINIO_ROOT_*` se conservan para compatibilidad con imágenes oficiales
- `DATABASE_URL` se conserva porque Prisma y los servicios actuales ya lo consumen
