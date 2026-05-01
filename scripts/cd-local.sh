#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAMESPACE="icicso-local"

docker build -f "$REPO_ROOT/infra/docker/node-runtime.Dockerfile" -t icicso/node-runtime:dev "$REPO_ROOT"
docker build -f "$REPO_ROOT/infra/docker/frontend.Dockerfile" -t icicso/frontend-local:dev "$REPO_ROOT"
docker build -f "$REPO_ROOT/icicso-local/engines/13_semantic_terminology_engine/Dockerfile" -t icicso/semantic-terminology-engine:dev "$REPO_ROOT/icicso-local/engines/13_semantic_terminology_engine"

kubectl apply -k "$REPO_ROOT/infra/k8s"
for deployment in icicso-postgres icicso-redis icicso-engine icicso-parser icicso-api icicso-frontend; do
  kubectl rollout status "deployment/$deployment" -n "$NAMESPACE" --timeout=240s
done

"$REPO_ROOT/scripts/smoke-test.sh"
