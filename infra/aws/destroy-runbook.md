# Destroy Runbook

## Alcance del script

`aws-staging-destroy` borra el namespace de aplicación. No destruye el clúster EKS completo ni la VPC.

## Destroy completo recomendado

1. borrar namespace `icicso-staging`
2. confirmar eliminación de ingress y ALB
3. confirmar eliminación de PVCs/PVs si no se van a conservar
4. revisar ECR y borrar imágenes viejas si staging se va a recrear
5. revisar Secrets Manager y limpiar secretos de staging obsoletos
6. si el clúster solo servía para staging, borrar EKS y node groups
7. validar que no queden ALB, target groups, EBS y ENIs huérfanos

## Residuos a vigilar

- Load Balancers
- Target Groups
- Security Groups creados por ALB o nodos
- volúmenes EBS
- log groups
- secretos de staging
