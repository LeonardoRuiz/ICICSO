#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACTS_DIR="$REPO_ROOT/dist/cicd"
SUMMARY_FILE="$ARTIFACTS_DIR/smoke-summary.txt"
NAMESPACE="icicso-local"
PIDS=()

step() {
  echo
  echo "==> $1"
}

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

cleanup() {
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" >/dev/null 2>&1 || true
  done
}

trap cleanup EXIT

start_port_forward() {
  local service="$1"
  local local_port="$2"
  local remote_port="$3"
  kubectl port-forward -n "$NAMESPACE" "service/$service" "${local_port}:${remote_port}" >/tmp/"$service-$local_port".out 2>/tmp/"$service-$local_port".err &
  PIDS+=("$!")
}

wait_http() {
  local url="$1"
  local timeout="${2:-40}"
  local start
  start="$(date +%s)"
  while true; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return
    fi
    if (( $(date +%s) - start >= timeout )); then
      fail "Timeout esperando $url"
    fi
    sleep 2
  done
}

assert_json() {
  local url="$1"
  local expr="$2"
  local message="$3"
  python3 - "$url" "$expr" "$message" <<'PY'
import json
import sys
from urllib.request import urlopen

url, expr, message = sys.argv[1:4]
payload = json.load(urlopen(url, timeout=10))
if not eval(expr, {"payload": payload}):
    raise SystemExit(message)
PY
}

mkdir -p "$ARTIFACTS_DIR"

step "Abriendo port-forward para smoke tests"
start_port_forward icicso-frontend 18080 80
start_port_forward icicso-api 13100 3100
start_port_forward icicso-parser 13108 3108
start_port_forward icicso-engine 18000 8000

wait_http "http://127.0.0.1:18080/"
wait_http "http://127.0.0.1:13100/health"
wait_http "http://127.0.0.1:13108/health"
wait_http "http://127.0.0.1:18000/health"

step "Validando frontend"
curl -fsS "http://127.0.0.1:18080/" >/dev/null

step "Validando API principal"
assert_json "http://127.0.0.1:13100/health" "payload.get('service') == 'gateway-api' and payload.get('upstream') is not None" "La API principal no respondió como gateway-api"

step "Validando parser/ingest"
assert_json "http://127.0.0.1:13108/health" "payload.get('service') == 'ingestion-service'" "El parser no respondió como ingestion-service"

step "Validando engine clínico"
assert_json "http://127.0.0.1:18000/health" "payload.get('service') == 'semantic-terminology-engine' or payload.get('status') == 'healthy'" "El engine clínico no respondió correctamente"

step "Validando comunicación entre servicios"
assert_json "http://127.0.0.1:13100/block1/overview" "payload.get('demoCase') and payload['demoCase'].get('caseId')" "block1/overview no devolvió demoCase"
assert_json "http://127.0.0.1:13100/block2/overview" "payload.get('services') and len(payload['services']) >= 1" "block2/overview no devolvió servicios del bloque 2"
assert_json "http://127.0.0.1:13100/block7/case-control/summary" "payload.get('caseControl') is not None" "block7/case-control/summary no devolvió caseControl"

cat >"$SUMMARY_FILE" <<EOF
Smoke tests OK
Frontend: http://127.0.0.1:18080/
API: http://127.0.0.1:13100/health
Parser: http://127.0.0.1:13108/health
Engine: http://127.0.0.1:18000/health
EOF

step "Smoke tests completados"
echo "$SUMMARY_FILE"
