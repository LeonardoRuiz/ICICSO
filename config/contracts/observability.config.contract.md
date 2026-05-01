# Observability Config Contract

| variable | descripción | obligatoria | default permitido | ejemplo | sensible | entornos | impacto si falta | validación |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `OBSERVABILITY_GRAFANA_ADMIN_USER` | usuario admin de Grafana | sí | sí | `admin` | no | local/dev | acceso a Grafana inconsistente | string |
| `OBSERVABILITY_GRAFANA_ADMIN_PASSWORD` | password admin de Grafana | sí | no | `replace-with-local-grafana-password` | sí | local/dev/staging/prod | Grafana insegura o inaccesible | longitud mínima 12 |
| `OBSERVABILITY_POSTGRES_EXPORTER_DSN` | DSN del exporter postgres | sí | no | `postgresql://...` | sí | local/dev/staging/prod | Prometheus pierde métricas DB | URL PostgreSQL |
| `OBSERVABILITY_REDIS_EXPORTER_ADDR` | endpoint del exporter redis | sí | sí | `redis://host.docker.internal:16379` | no | local/dev/staging/prod | Prometheus pierde métricas Redis | URL redis |
| `OBSERVABILITY_PROMETHEUS_PORT` | puerto publicado Prometheus | sí | sí | `9091` | no | local/dev | acceso local roto | puerto |
| `OBSERVABILITY_GRAFANA_PORT` | puerto publicado Grafana | sí | sí | `3300` | no | local/dev | acceso local roto | puerto |
| `OBSERVABILITY_LOKI_PORT` | puerto publicado Loki | sí | sí | `3310` | no | local/dev | acceso local roto | puerto |
| `OBSERVABILITY_TEMPO_PORT` | puerto publicado Tempo | sí | sí | `3320` | no | local/dev | acceso local roto | puerto |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | endpoint OTLP futuro | no | sí | `http://localhost:14418` | no | local/dev/staging/prod | tracing incompleto | URL http(s) |
