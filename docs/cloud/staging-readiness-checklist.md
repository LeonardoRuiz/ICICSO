# Staging Readiness Checklist

- [ ] `docker`, `kubectl`, `aws` y `python` disponibles
- [ ] cuenta AWS con permisos EKS/ECR/IAM/ELB mínimos
- [ ] clúster EKS creado y accesible
- [ ] AWS Load Balancer Controller operativo
- [ ] EBS CSI Driver operativo
- [ ] secretos reales de staging fuera de Git
- [ ] overlay `infra/k8s/overlays/staging` revisado
- [ ] dominio de staging decidido
- [ ] repositorios ECR disponibles
- [ ] imágenes construyen localmente
- [ ] health endpoints del stack responden en local
- [ ] rollback manual entendido por el equipo
