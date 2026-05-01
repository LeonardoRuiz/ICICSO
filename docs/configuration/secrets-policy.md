# Secrets Policy

## Qué se considera secreto

- `DATABASE_URL`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `OBSERVABILITY_GRAFANA_ADMIN_PASSWORD`
- cualquier DSN con credenciales embebidas

## Qué jamás entra al repo

- archivos `.env` reales
- `secret-*.yaml` reales
- tokens de CI/CD
- passwords de Grafana, Postgres, MinIO o JWT válidas

## Manejo local

- usar `config/env/.env.local`
- generar artefactos de compatibilidad con `config-validate -Sync`
- no compartir `config/env/.env.local` por chat, commits o screenshots

## Manejo en Kubernetes

- no sensible en ConfigMap
- sensible en Secret generado localmente
- ejemplos sólo en `*.example.yaml`

## Manejo en CI/CD

- workflows no deben imprimir variables sensibles
- si un pipeline necesita secretos, deben venir del runner o del proveedor de secretos del entorno
- los scripts de validación sólo reportan nombres de variables, no valores

## Logging prohibido

- valores completos de secretos
- headers `Authorization`
- DSN completas si contienen password
- payloads clínicos completos que expongan PII

## Revocación inmediata si hay exposición

1. invalidar credencial
2. reemplazarla en `.env.local` o secret store
3. regenerar secretos K8s
4. reiniciar workloads dependientes
5. revisar historial de commits y artefactos
