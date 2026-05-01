# Staging Architecture

## Objetivo

Validar el flujo real de entrega cloud de ICICSO:

1. build local o CI
2. push a ECR
3. deploy a EKS
4. exposición HTTP por ALB
5. health checks y smoke tests
6. rollback básico

## Topología inicial

- VPC simple en una sola región
- 2 subnets públicas y 2 privadas
- EKS con node group administrado pequeño
- workloads ICICSO en `icicso-staging`
- ALB internet-facing para `frontend` y `api`
- servicios internos como `ClusterIP`
- `postgres` y `redis` temporales dentro del clúster con volúmenes EBS `gp3`

## Por qué esta topología basta para staging

- replica el camino de producción de imágenes y Kubernetes
- mantiene costo contenido
- evita introducir RDS, mesh, GitOps o multi-account demasiado pronto
- deja separación clara entre networking, imágenes, configuración y secretos

## Gaps conocidos

- `engine` sigue empaquetado como pod multi-contenedor, válido para staging inicial pero no ideal a medio plazo
- observabilidad remota queda mínima; no se sube stack completo de Grafana/Loki/Tempo al clúster
- no se automatiza creación/destrucción completa de EKS porque todavía no se adopta Terraform
