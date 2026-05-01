# Environment Staging

## Namespace

- `icicso-staging`

## Dominio sugerido

- `staging.icicso.<dominio-controlado>`

## Variables operativas esperadas

- `AWS_REGION`
- `AWS_ACCOUNT_ID`
- `ICICSO_STAGING_CLUSTER`
- `ICICSO_STAGING_NAMESPACE`
- `ICICSO_STAGING_DOMAIN`
- `ICICSO_ECR_PREFIX`
- `ICICSO_IMAGE_TAG`
- `ICICSO_STAGING_SECRET_FILE`

## Secretos mínimos de staging

- `DATABASE_URL`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `INTERNAL_SERVICE_TOKEN`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`

## Validación de salida

- `kubectl get pods -n icicso-staging`
- `kubectl get ingress -n icicso-staging`
- `http://<staging-domain>/`
- `http://<staging-domain>/api/health/ready`
