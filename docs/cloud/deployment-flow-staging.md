# Deployment Flow Staging

1. commit en rama validada
2. build de imágenes
3. push a ECR
4. `aws eks update-kubeconfig`
5. aplicar secreto de staging
6. aplicar overlay staging
7. esperar rollouts
8. correr smoke tests
9. validar frontend y `/api/health/ready`
10. si falla, `aws-staging-rollback`
