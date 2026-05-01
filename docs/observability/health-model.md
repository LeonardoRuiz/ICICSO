# Health Model

## Endpoints estándar

- `/health/live`
- `/health/ready`
- `/health/startup`
- `/metrics`

## Definiciones

### Liveness

El proceso está vivo y responde. No valida dependencias externas.

### Readiness

El servicio puede recibir tráfico sin provocar fallo funcional inmediato.

### Degraded

El servicio responde y puede aceptar parte del tráfico, pero una dependencia no crítica está fallando o con riesgo.

## Dependencias críticas por servicio

| servicio | críticas | degradan pero no bloquean |
| --- | --- | --- |
| `desktop-emulator` | ninguna | ninguna |
| `gateway-api` | `auth-service`, `identity-service`, `ingestion-service`, `terminology-service` | `audit`, `storage`, `data-governance`, `evidence-lake`, `ghl`, `kbol`, `runbook`, `readiness`, `case-control`, `systemic-risk`, `cqoi`, `semantic-engine` |
| `ingestion-service` | `postgres` | `audit-service` |
| `semantic-terminology-engine` | `postgres` | `redis` |
| `postgres` | proceso de base | n/a |
| `redis` | proceso redis | n/a |

## Qué bloquea tráfico

- gateway sin dependencias críticas
- parser sin Postgres
- engine sin Postgres
- frontend sólo bloquea si el proceso no responde

## Qué sólo degrada

- gateway sin dependencias analíticas o auxiliares
- engine sin Redis
- parser si falla escritura de audit
