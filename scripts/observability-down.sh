#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$REPO_ROOT/scripts/.observability"
COMPOSE_FILE="$REPO_ROOT/infra/observability/docker-compose.yml"
COMPOSE_ENV_FILE="$REPO_ROOT/infra/observability/.env"

docker compose --env-file "$COMPOSE_ENV_FILE" -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true

if [[ -d "$STATE_DIR" ]]; then
  for pid_file in "$STATE_DIR"/*.pid; do
    [[ -f "$pid_file" ]] || continue
    pid="$(cat "$pid_file")"
    kill "$pid" >/dev/null 2>&1 || true
    rm -f "$pid_file"
  done
fi

echo "Observabilidad ICICSO detenida."
