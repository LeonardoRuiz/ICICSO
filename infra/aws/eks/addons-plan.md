# Addons Plan

## Add-ons obligatorios

- `aws-ebs-csi-driver`
- `aws-load-balancer-controller`

## Add-ons nativos de EKS

- VPC CNI
- CoreDNS
- kube-proxy

## Add-ons opcionales de esta fase

- Secrets Store CSI Driver + AWS provider
- CloudWatch Observability add-on si se decide sacar logs y métricas mínimas sin Prometheus completo

## Orden recomendado

1. OIDC provider para el clúster
2. EBS CSI Driver
3. AWS Load Balancer Controller
4. Secrets/observability opcionales
