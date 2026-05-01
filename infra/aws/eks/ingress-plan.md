# Ingress Plan

## Mecanismo

- AWS Load Balancer Controller
- ALB internet-facing
- target type `ip`

## Exposición pública

- frontend `/`
- api `/api`

## Qué no va público

- parser
- engine internos
- postgres
- redis
- audit-service

## Certificados

- en esta fase puede arrancar HTTP
- para endurecer staging, adjuntar ACM y pasar a HTTPS cuanto antes
