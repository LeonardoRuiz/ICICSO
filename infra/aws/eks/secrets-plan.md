# Secrets Plan

## Secretos de staging

- `DATABASE_URL`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `INTERNAL_SERVICE_TOKEN`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`

## Estado de esta fase

- el repo versiona solo ejemplos
- el deploy exige `infra/k8s/overlays/staging/secrets.yaml` o equivalente fuera de Git
- destino recomendado para secretos reales: AWS Secrets Manager

## Inyección

Fase inicial:

- secreto Kubernetes aplicado desde archivo operativo fuera de Git

Fase siguiente:

- Secrets Manager + CSI Driver o External Secrets

## Reglas

- nunca imprimir secretos en scripts
- nunca versionar `secrets.yaml`
- nunca usar valores reales en workflows
