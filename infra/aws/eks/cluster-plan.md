# EKS Cluster Plan

## Versión objetivo

- EKS/Kubernetes `1.32`

## Diseño inicial

- 1 clúster dedicado de staging
- 1 managed node group
- 2 nodos base
- escalado mínimo 2, deseado 2, máximo 4

## Namespaces

- `icicso-staging`
- `kube-system`
- `aws-observability` si luego se añade collector remoto

## Add-ons mínimos

- VPC CNI
- CoreDNS
- kube-proxy
- EBS CSI Driver
- AWS Load Balancer Controller
- Secrets Store CSI Driver con proveedor AWS solo si se decide montar secretos desde Secrets Manager en esta fase

## Por qué basta para staging

- soporta ingress real, PVCs reales y workloads reales
- mantiene operación simple
- permite validar despliegue multi-servicio sin sobrediseño

## Riesgos conocidos

- sin separación por availability zones a nivel de stateful components
- `engine` multi-contenedor concentra demasiados microservicios
- PostgreSQL en-cluster no tiene resiliencia administrada

## Qué no se incluye todavía

- Fargate
- service mesh
- node groups especializados
- autoscaling sofisticado
