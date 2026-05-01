# Smoke Tests Staging

## Objetivos

- frontend responde `200`
- API responde `200` en `/api/health/ready`
- `block1/overview` responde
- `block2/overview` responde
- pods críticos están `Ready`
- ingress publica hostname o address

## Validación manual mínima

- abrir `http://<staging-domain>/`
- abrir `http://<staging-domain>/api/health/ready`
- revisar `kubectl get pods -n icicso-staging`
- revisar `kubectl get ingress -n icicso-staging`
