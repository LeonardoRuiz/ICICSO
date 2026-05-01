# Incident Basics Staging

## Si el deploy falla

1. revisar `kubectl rollout status`
2. revisar pods `CrashLoopBackOff`
3. revisar logs del deployment afectado
4. ejecutar rollback si el issue es del release

## Si el ingress falla

1. revisar `kubectl get ingress -n icicso-staging`
2. revisar eventos del ingress
3. validar AWS Load Balancer Controller
4. validar subnets y SGs etiquetados

## Si faltan secretos

1. revisar `secrets.yaml`
2. revisar `envFrom`
3. revisar logs del pod afectado
