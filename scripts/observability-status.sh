#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$REPO_ROOT/scripts/.observability"
COMPOSE_FILE="$REPO_ROOT/infra/observability/docker-compose.yml"
COMPOSE_ENV_FILE="$REPO_ROOT/infra/observability/.env"
NAMESPACE="icicso-local"

echo "Contexto kubectl: $(kubectl config current-context)"
echo
kubectl get pods,svc,ingress -n "$NAMESPACE"
echo
docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" ps
echo
echo "Procesos puente:"
if [[ -d "$STATE_DIR" ]]; then
  for pid_file in "$STATE_DIR"/*.pid; do
    [[ -f "$pid_file" ]] || continue
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" >/dev/null 2>&1; then
      echo "$(basename "$pid_file" .pid): running"
    else
      echo "$(basename "$pid_file" .pid): stopped"
    fi
  done
fi
echo
echo "Grafana:    http://localhost:3300"
echo "Prometheus: http://localhost:9091"
echo "Loki:       http://localhost:3310"
echo "Tempo:      http://localhost:3320"
