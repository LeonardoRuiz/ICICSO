# DNS Plan

## Recomendación

- subdominio dedicado: `staging.icicso.<dominio-controlado>`
- registro `A/ALIAS` en Route 53 apuntando al ALB

## Validación

- frontend resuelve
- `api/health/ready` resuelve

## Qué no se publica en DNS

- parser
- engine internos
- postgres
- redis
