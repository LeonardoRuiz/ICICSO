# Observability Architecture

## Objetivo

ICICSO local queda observable en cuatro capas:

1. Health checks estandarizados
2. Logs JSON estructurados
3. Métricas Prometheus
4. Tracing distribuido preparado con OpenTelemetry + Tempo

## Topología local

- `desktop-emulator`: sirve estáticos con un servidor Node mínimo y expone `/health/*` y `/metrics`
- `gateway-api`: agrega health de dependencias, métricas HTTP y propagación `traceparent`
- `ingestion-service`: expone health real contra Postgres, métricas de parseo y propaga correlación a audit
- `semantic-terminology-engine`: expone health real contra Postgres/Redis, métricas Prometheus y headers de correlación
- `postgres` y `redis`: se observan vía exporters en `docker compose`
- `Prometheus`: scrapea métricas vía `host.docker.internal` sobre puertos publicados por `kubectl port-forward`
- `Loki + Promtail`: centralizan logs JSON capturados desde `kubectl logs -f`
- `Tempo + OTEL Collector`: reciben trazas OTLP cuando los servicios se conecten directamente al collector

## Decisión de despliegue

La observabilidad no se mete al clúster todavía. Se deja fuera por tres razones:

- evita complejidad adicional en Docker Desktop
- mantiene visible y auditable la configuración local
- no toca la topología base de `infra/k8s`

## Gaps reales

- Los microservicios Node adicionales dentro de `icicso-engine` siguen sólo con `/health`
- Aún no hay exportación OTLP activa desde Node/FastAPI al collector; sí hay propagación de `trace_id` en headers y logs
- Loki depende de `kubectl logs -f`; no hay sidecars ni DaemonSet todavía
