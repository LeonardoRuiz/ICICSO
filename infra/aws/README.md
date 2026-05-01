# ICICSO AWS Staging

Esta carpeta describe la primera versión seria de staging cloud para ICICSO sobre AWS sin saltar todavía a producción.

## Principios

- staging pequeño y reemplazable
- EKS como clúster objetivo
- ECR por servicio base
- ALB para frontend y API
- secretos reales fuera de Git
- rollback por release de Kubernetes
- destroy explícito y sin automatismos peligrosos

## Componentes de esta fase

- `infra/aws/eks/`: plan de clúster, add-ons, ingress, node groups, secretos, storage y observabilidad
- `infra/aws/ecr/`: repositorios y tagging
- `infra/aws/network/`: VPC, subnets, security groups y DNS
- `infra/k8s/overlays/staging/`: overlay Kustomize para staging
- `scripts/aws-staging-*.ps1|sh`: operación básica de precheck, deploy, status, rollback y destroy

## Decisión principal

Para esta fase, `postgres` y `redis` siguen dentro del clúster para reducir fricción y costo. La recomendación futura es mover PostgreSQL a RDS antes de endurecer producción.
