# Rotation and Revocation

## Rotación sugerida

### JWT

1. generar nuevo secreto
2. actualizar `config/env/.env.local` o secret manager del entorno
3. regenerar secretos K8s
4. reiniciar API, parser y engine

### Postgres

1. crear password nueva
2. actualizar usuario en Postgres
3. actualizar `POSTGRES_PASSWORD` y `DATABASE_URL`
4. regenerar secretos
5. reiniciar despliegues dependientes

### MinIO

1. rotar access key y secret key
2. actualizar `.env.local`
3. regenerar secretos
4. reiniciar parser/API si aplican

### Grafana

1. actualizar `OBSERVABILITY_GRAFANA_ADMIN_PASSWORD`
2. regenerar `infra/observability/.env`
3. recrear stack de observabilidad

## Revocación ante exposición

1. confirmar alcance
2. invalidar secreto comprometido
3. rotar credenciales relacionadas
4. revisar logs, CI y artefactos
5. ejecutar `secrets-scan`
6. regenerar compatibilidad local

## Checklist de incidente

- [ ] secreto identificado
- [ ] secreto invalidado
- [ ] secreto reemplazado
- [ ] workloads reiniciados
- [ ] historial revisado
- [ ] incident log documentado
