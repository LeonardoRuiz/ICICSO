#!/usr/bin/env bash
set -euo pipefail

VALIDATE_ONLY=0
SKIP_DOCKER_BUILD=0

for arg in "$@"; do
  case "$arg" in
    --validate-only) VALIDATE_ONLY=1 ;;
    --skip-docker-build) SKIP_DOCKER_BUILD=1 ;;
    *) echo "Argumento no soportado: $arg" >&2; exit 1 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ICICSO_LOCAL_ROOT="$REPO_ROOT/icicso-local"
ENGINE_ROOT="$ICICSO_LOCAL_ROOT/engines/13_semantic_terminology_engine"
ENGINE_VENV="$ENGINE_ROOT/.venv-cicd"
K8S_DIR="$REPO_ROOT/infra/k8s"
ARTIFACTS_DIR="$REPO_ROOT/dist/cicd"
RENDERED_MANIFEST="$ARTIFACTS_DIR/k8s-rendered.yaml"
IMAGE_TAGS_FILE="$ARTIFACTS_DIR/image-tags.txt"
SUMMARY_FILE="$ARTIFACTS_DIR/ci-summary.txt"
export TURBO_DAEMON=false

step() {
  echo
  echo "==> $1"
}

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

assert_path() {
  [[ -e "$1" ]] || fail "Ruta requerida no encontrada: $1"
}

python_cmd() {
  if command -v python3 >/dev/null 2>&1; then
    echo python3
    return
  fi
  if command -v python >/dev/null 2>&1; then
    echo python
    return
  fi
  fail "No se encontró Python en PATH."
}

ensure_python_module() {
  local module_name="$1"
  local package_name="$2"
  local py
  py="$(python_cmd)"
  if ! "$py" -c "import $module_name" >/dev/null 2>&1; then
    "$py" -m pip install "$package_name"
  fi
}

run() {
  local cwd="$1"
  shift
  (
    cd "$cwd"
    "$@"
  )
}

validate_structure() {
  step "Validando estructura del repo"
  assert_path "$ICICSO_LOCAL_ROOT"
  assert_path "$ENGINE_ROOT"
  assert_path "$REPO_ROOT/infra/docker/node-runtime.Dockerfile"
  assert_path "$REPO_ROOT/infra/docker/frontend.Dockerfile"
  assert_path "$REPO_ROOT/icicso-local/engines/13_semantic_terminology_engine/Dockerfile"
  assert_path "$REPO_ROOT/scripts/k8s-up.ps1"
  assert_path "$K8S_DIR"
}

validate_configuration_contracts() {
  step "Validando contratos, ejemplos y exposicion de secretos"
  "$(python_cmd)" "$REPO_ROOT/scripts/config_tools.py" sync-check
  "$(python_cmd)" "$REPO_ROOT/scripts/config_tools.py" secret-scan
}

install_dependencies() {
  step "Instalando dependencias Node del monorepo"
  run "$ICICSO_LOCAL_ROOT" corepack enable
  run "$ICICSO_LOCAL_ROOT" pnpm install --frozen-lockfile

  step "Instalando dependencias Python del engine"
  local py
  py="$(python_cmd)"
  if [[ ! -d "$ENGINE_VENV" ]]; then
    run "$ENGINE_ROOT" "$py" -m venv "$ENGINE_VENV"
  fi
  local engine_python="$ENGINE_VENV/bin/python"
  if [[ ! -x "$engine_python" ]]; then
    fail "No se encontró el python del virtualenv en $ENGINE_VENV"
  fi
  run "$ENGINE_ROOT" "$engine_python" -m pip install --upgrade pip
  run "$ENGINE_ROOT" "$engine_python" -m pip install -e .[dev]
}

run_lint() {
  step "Ejecutando lint"
  run "$ICICSO_LOCAL_ROOT" pnpm lint:repo
}

run_typecheck() {
  step "Ejecutando typecheck"
  run "$ICICSO_LOCAL_ROOT" pnpm typecheck:repo
}

run_tests() {
  step "Ejecutando tests reales del repo"
  local engine_python="$ENGINE_VENV/bin/python"
  [[ -x "$engine_python" ]] || fail "Virtualenv del engine no disponible en $ENGINE_VENV"
  run "$ENGINE_ROOT" "$engine_python" -m pytest tests -q
}

run_build() {
  step "Generando Prisma client"
  run "$ICICSO_LOCAL_ROOT" pnpm --filter @icicso/database db:generate

  step "Compilando servicios requeridos"
  run "$ICICSO_LOCAL_ROOT" pnpm build:block8
}

short_sha() {
  if git -C "$REPO_ROOT" rev-parse --short HEAD >/dev/null 2>&1; then
    git -C "$REPO_ROOT" rev-parse --short HEAD
  else
    echo local
  fi
}

build_images() {
  if [[ "$SKIP_DOCKER_BUILD" -eq 1 || "$VALIDATE_ONLY" -eq 1 ]]; then
    return
  fi

  local sha
  sha="$(short_sha)"
  mkdir -p "$ARTIFACTS_DIR"
  cat >"$IMAGE_TAGS_FILE" <<EOF
icicso/node-runtime:dev
icicso/node-runtime:$sha
icicso/frontend-local:dev
icicso/frontend-local:$sha
icicso/semantic-terminology-engine:dev
icicso/semantic-terminology-engine:$sha
EOF

  step "Construyendo imagen icicso/node-runtime"
  run "$REPO_ROOT" docker build -f "$REPO_ROOT/infra/docker/node-runtime.Dockerfile" -t "icicso/node-runtime:dev" -t "icicso/node-runtime:$sha" .

  step "Construyendo imagen icicso/frontend-local"
  run "$REPO_ROOT" docker build -f "$REPO_ROOT/infra/docker/frontend.Dockerfile" -t "icicso/frontend-local:dev" -t "icicso/frontend-local:$sha" .

  step "Construyendo imagen icicso/semantic-terminology-engine"
  run "$REPO_ROOT" docker build -f "$REPO_ROOT/icicso-local/engines/13_semantic_terminology_engine/Dockerfile" -t "icicso/semantic-terminology-engine:dev" -t "icicso/semantic-terminology-engine:$sha" "$REPO_ROOT/icicso-local/engines/13_semantic_terminology_engine"
}

validate_k8s() {
  step "Validando manifests Kubernetes"
  kubectl version --client --output=yaml >/dev/null
  ensure_python_module yaml pyyaml
  "$(python_cmd)" "$REPO_ROOT/scripts/config_tools.py" validate --environment local --allow-placeholders --sync
  mkdir -p "$ARTIFACTS_DIR"
  kubectl kustomize "$K8S_DIR" > "$RENDERED_MANIFEST"
  "$(python_cmd)" - "$RENDERED_MANIFEST" <<'PY'
import sys
from pathlib import Path
import yaml

rendered = Path(sys.argv[1])
docs = [doc for doc in yaml.safe_load_all(rendered.read_text(encoding="utf-8")) if doc]
if not docs:
    raise SystemExit("No Kubernetes documents were rendered")

names = set()
for doc in docs:
    api_version = doc.get("apiVersion")
    kind = doc.get("kind")
    metadata = doc.get("metadata") or {}
    name = metadata.get("name")
    namespace = metadata.get("namespace", "")
    if not api_version or not kind or not name:
        raise SystemExit(f"Manifest incompleto: {doc}")
    key = (kind, namespace, name)
    if key in names:
        raise SystemExit(f"Recurso duplicado: {kind}/{name} namespace={namespace}")
    names.add(key)
    if kind == "Deployment":
        selector = (((doc.get("spec") or {}).get("selector") or {}).get("matchLabels") or {})
        template_labels = ((((doc.get("spec") or {}).get("template") or {}).get("metadata") or {}).get("labels") or {})
        if not selector:
            raise SystemExit(f"Deployment sin selector: {name}")
        for label_key, label_value in selector.items():
            if template_labels.get(label_key) != label_value:
                raise SystemExit(f"Selector inconsistente en deployment {name}: {label_key}")
    if kind == "Service":
        selector = ((doc.get("spec") or {}).get("selector") or {})
        if not selector:
            raise SystemExit(f"Service sin selector: {name}")
print(f"Validated {len(docs)} rendered Kubernetes resources")
PY
}

write_summary() {
  mkdir -p "$ARTIFACTS_DIR"
  printf '%s\n' "$@" > "$SUMMARY_FILE"
}

validate_structure
validate_configuration_contracts
validate_k8s

if [[ "$VALIDATE_ONLY" -eq 0 ]]; then
  install_dependencies
  run_lint
  run_typecheck
  run_tests
  run_build
  build_images
  write_summary \
    "CI local completada" \
    "Lint: OK" \
    "Typecheck: OK" \
    "Tests: OK (engine Python)" \
    "Build: OK" \
    "Rendered manifests: $RENDERED_MANIFEST" \
    "Image tags: $IMAGE_TAGS_FILE"
else
  write_summary \
    "Validacion de manifests completada" \
    "Rendered manifests: $RENDERED_MANIFEST"
fi

step "Artefactos"
echo "$SUMMARY_FILE"
[[ -f "$IMAGE_TAGS_FILE" ]] && echo "$IMAGE_TAGS_FILE"
[[ -f "$RENDERED_MANIFEST" ]] && echo "$RENDERED_MANIFEST"
