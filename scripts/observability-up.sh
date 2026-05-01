#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$REPO_ROOT/scripts/.observability"
LOG_DIR="$REPO_ROOT/logs/observability"
COMPOSE_FILE="$REPO_ROOT/infra/observability/docker-compose.yml"
COMPOSE_ENV_FILE="$REPO_ROOT/infra/observability/.env"
NAMESPACE="icicso-local"

mkdir -p "$STATE_DIR" "$LOG_DIR"

command -v docker >/dev/null || { echo "docker no disponible"; exit 1; }
command -v kubectl >/dev/null || { echo "kubectl no disponible"; exit 1; }

docker info >/dev/null
[[ "$(kubectl config current-context)" == "docker-desktop" ]] || { echo "kubectl no apunta a docker-desktop"; exit 1; }
kubectl cluster-info >/dev/null

python "$REPO_ROOT/scripts/config_tools.py" validate --environment local --sync

start_bg() {
  local name="$1"
  shift
  nohup "$@" >"$LOG_DIR/${name}.out.log" 2>"$LOG_DIR/${name}.err.log" &
  echo $! >"$STATE_DIR/${name}.pid"
}

wait_http() {
  local url="$1"
  for _ in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "No quedo listo: $url"
  exit 1
}

for svc in icicso-frontend icicso-api icicso-parser icicso-engine icicso-postgres icicso-redis; do
  kubectl get service "$svc" -n "$NAMESPACE" >/dev/null
done

docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true

start_bg pf-frontend kubectl port-forward -n "$NAMESPACE" svc/icicso-frontend 18080:80
start_bg pf-api kubectl port-forward -n "$NAMESPACE" svc/icicso-api 13100:3100
start_bg pf-parser kubectl port-forward -n "$NAMESPACE" svc/icicso-parser 13108:3108
start_bg pf-engine kubectl port-forward -n "$NAMESPACE" svc/icicso-engine 18000:8000
start_bg pf-postgres kubectl port-forward -n "$NAMESPACE" svc/icicso-postgres 15432:5432
start_bg pf-redis kubectl port-forward -n "$NAMESPACE" svc/icicso-redis 16379:6379

start_bg logs-frontend kubectl logs -n "$NAMESPACE" deploy/icicso-frontend -f --all-containers=true
start_bg logs-api kubectl logs -n "$NAMESPACE" deploy/icicso-api -f --all-containers=true
start_bg logs-parser kubectl logs -n "$NAMESPACE" deploy/icicso-parser -f --all-containers=true
start_bg logs-engine kubectl logs -n "$NAMESPACE" deploy/icicso-engine -f --all-containers=true
start_bg logs-postgres kubectl logs -n "$NAMESPACE" deploy/icicso-postgres -f
start_bg logs-redis kubectl logs -n "$NAMESPACE" deploy/icicso-redis -f

sleep 5
docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" up -d

wait_http http://localhost:18080/health/ready
wait_http http://localhost:13100/health/ready
wait_http http://localhost:13108/health/ready
wait_http http://localhost:18000/health/ready
wait_http http://localhost:9091/-/ready
wait_http http://localhost:3300/api/health

echo "Observabilidad ICICSO lista."
echo "Grafana:    http://localhost:3300"
echo "Prometheus: http://localhost:9091"
echo "Loki:       http://localhost:3310"
echo "Tempo:      http://localhost:3320"
