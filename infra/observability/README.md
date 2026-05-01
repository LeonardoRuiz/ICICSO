# ICICSO Observability Local

Esta carpeta levanta una base de observabilidad local alrededor del stack ICICSO que ya corre en Docker Desktop Kubernetes.

## Arquitectura local

- Aplicaciones ICICSO: siguen corriendo en Kubernetes local.
- Observabilidad: corre en `docker compose` local con Prometheus, Grafana, Loki, Promtail, Tempo y OpenTelemetry Collector.
- Puente de métricas: `kubectl port-forward` expone `frontend`, `api`, `parser`, `engine`, `postgres` y `redis` a puertos locales estables.
- Puente de logs: `kubectl logs -f` escribe logs JSON a `logs/observability/*.log`, y Promtail los envía a Loki.

## Endpoints esperados

- Grafana: [http://localhost:3300](http://localhost:3300) con credenciales definidas en `config/env/.env.local`
- Prometheus: [http://localhost:9091](http://localhost:9091)
- Loki: [http://localhost:3310](http://localhost:3310)
- Tempo: [http://localhost:3320](http://localhost:3320)
- OTEL Collector gRPC: `localhost:14417`
- OTEL Collector HTTP: `localhost:14418`

## Requisitos

- Docker Desktop abierto
- Kubernetes habilitado en Docker Desktop
- Contexto `kubectl` apuntando a `docker-desktop`
- Stack ICICSO ya desplegado con [k8s-up.ps1](C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO\scripts\k8s-up.ps1) o equivalente

## Uso rápido

PowerShell:

```powershell
.\scripts\config-validate.ps1 -Environment local -Sync
.\scripts\observability-up.ps1
.\scripts\observability-status.ps1
.\scripts\observability-down.ps1
```

Shell Unix:

```bash
./scripts/observability-up.sh
./scripts/observability-status.sh
./scripts/observability-down.sh
```

## Puertos puente

- `18080` -> `svc/icicso-frontend:80`
- `13100` -> `svc/icicso-api:3100`
- `13108` -> `svc/icicso-parser:3108`
- `18000` -> `svc/icicso-engine:8000`
- `15432` -> `svc/icicso-postgres:5432`
- `16379` -> `svc/icicso-redis:6379`

## Limitaciones actuales

- Frontend, API y parser ya publican métricas Prometheus y headers de correlación.
- El engine clínico ya expone métricas y health checks reales, pero el tracing OTLP todavía queda preparado más que poblado.
- Los demás microservicios Node del pod `icicso-engine` mantienen su `/health` existente; aún no publican `/metrics`.
- `infra/observability/.env` es generado por `config-validate` y no se versiona.
