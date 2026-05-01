#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-local}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

ARGS=("$REPO_ROOT/scripts/config_tools.py" "validate" "--environment" "$ENVIRONMENT")
if [[ "${SYNC:-0}" == "1" ]]; then
  ARGS+=("--sync")
fi
if [[ "${ALLOW_PLACEHOLDERS:-0}" == "1" ]]; then
  ARGS+=("--allow-placeholders")
fi

python "${ARGS[@]}"
