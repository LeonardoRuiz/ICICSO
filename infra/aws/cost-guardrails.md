# Cost Guardrails

## Costos dominantes

- EKS control plane
- nodos EC2 del managed node group
- ALB
- volúmenes EBS `gp3`
- almacenamiento ECR si no se limpia

## Guardrails concretos

- un solo clúster staging
- un solo node group administrado
- 2 nodos pequeños como base
- `postgres` y `redis` temporales en-cluster
- 1 réplica para `engine`, `postgres`, `redis`
- retención corta de imágenes ECR
- destruir namespace o clúster fuera de horario si staging no se usa

## Qué no dejar encendido por descuido

- ALB sin tráfico
- nodos de EKS fuera de uso
- PVCs olvidados tras borrar workloads
- secretos antiguos en Secrets Manager
- imágenes viejas en ECR

## Recomendación operativa

- revisar costo semanal por servicio
- destruir staging completo cuando haya pausas largas
