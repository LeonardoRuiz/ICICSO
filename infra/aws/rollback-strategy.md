# Rollback Strategy

## Rollback de release

- usar `kubectl rollout undo` sobre:
  - `icicso-frontend`
  - `icicso-api`
  - `icicso-parser`
  - `icicso-engine`

## Rollback de imagen

- redeploy con el tag anterior en ECR
- reaplicar overlay staging con el tag conocido bueno

## Rollback de configuración

- restaurar `secrets.yaml` y `configmap.yaml` validados
- reaplicar overlay
- reiniciar deployments afectados

## Validación post-rollback

- ingress responde
- `health/ready` responde
- smoke tests mínimos pasan

## Límite de esta fase

No hay canary, progressive delivery ni rollback automático. El modelo es deliberadamente manual y trazable.
