# Observability Plan

## Cobertura mínima de staging

- health endpoints públicos y privados
- logs de contenedor vía `kubectl logs` y/o CloudWatch
- métricas básicas de aplicación

## Lo que no se despliega en esta fase

- stack completo Prometheus + Grafana + Loki + Tempo dentro de EKS

## Recomendación

- mantener métricas `/metrics` disponibles
- usar scraping mínimo o collector remoto después
- si se usa CloudWatch, limitar retención para no disparar costo

## Objetivo

Detectar rápidamente:

- deploy roto
- ingress roto
- dependencia caída
- release que necesita rollback
