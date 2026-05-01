from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse


REPO_ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = REPO_ROOT / "config" / "schemas" / "config.schema.json"
PLACEHOLDER_RE = re.compile(r"(replace-|change-me|your-super-secret|set-only-if)", re.IGNORECASE)


def load_schema() -> dict:
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def parse_env_file(path: Path) -> dict[str, str]:
    data: dict[str, str] = {}
    if not path.exists():
        raise FileNotFoundError(f"Missing env file: {path}")
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        data[key.strip()] = value.strip()
    return data


def required_keys(schema: dict, environment: str) -> list[str]:
    output: list[str] = []
    for key, meta in schema["properties"].items():
        if environment in meta.get("x-requiredIn", []):
            output.append(key)
    return sorted(set(output))


def validate_env_values(env_map: dict[str, str], schema: dict, environment: str, allow_placeholders: bool) -> list[str]:
    errors: list[str] = []
    props = schema["properties"]

    for key in required_keys(schema, environment):
        value = env_map.get(key)
        if value is None or value == "":
            errors.append(f"Missing required variable: {key}")
            continue
        if not allow_placeholders and PLACEHOLDER_RE.search(value):
            errors.append(f"Variable still uses placeholder value: {key}")

    for key, meta in props.items():
        value = env_map.get(key)
        if value is None or value == "":
            continue
        if meta.get("type") == "string" and "minLength" in meta and len(value) < meta["minLength"]:
            errors.append(f"{key} shorter than minLength={meta['minLength']}")
        pattern = meta.get("pattern")
        if pattern and not re.match(pattern, value):
            errors.append(f"{key} does not match required format")
        enum = meta.get("enum")
        if enum and value not in enum:
            errors.append(f"{key} must be one of: {', '.join(enum)}")
        if meta.get("format") == "email" and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", value):
            errors.append(f"{key} must be a valid email address")

    database_url = env_map.get("DATABASE_URL")
    if database_url:
        parsed = urlparse(database_url)
        postgres_host = env_map.get("POSTGRES_HOST")
        postgres_port = env_map.get("POSTGRES_PORT")
        postgres_db = env_map.get("POSTGRES_DB")
        postgres_user = env_map.get("POSTGRES_USER")
        if postgres_host and parsed.hostname and parsed.hostname != postgres_host:
            errors.append("DATABASE_URL host does not match POSTGRES_HOST")
        if postgres_port and parsed.port and str(parsed.port) != postgres_port:
            errors.append("DATABASE_URL port does not match POSTGRES_PORT")
        if postgres_db and parsed.path.lstrip("/") != postgres_db:
            errors.append("DATABASE_URL database name does not match POSTGRES_DB")
        if postgres_user and parsed.username != postgres_user:
            errors.append("DATABASE_URL username does not match POSTGRES_USER")

    redis_url = env_map.get("REDIS_URL")
    if redis_url:
        parsed = urlparse(redis_url)
        if env_map.get("REDIS_HOST") and parsed.hostname and parsed.hostname != env_map["REDIS_HOST"]:
            errors.append("REDIS_URL host does not match REDIS_HOST")
        if env_map.get("REDIS_PORT") and parsed.port and str(parsed.port) != env_map["REDIS_PORT"]:
            errors.append("REDIS_URL port does not match REDIS_PORT")

    if env_map.get("MINIO_ROOT_USER") and env_map.get("MINIO_ACCESS_KEY") and env_map["MINIO_ROOT_USER"] != env_map["MINIO_ACCESS_KEY"]:
        errors.append("MINIO_ROOT_USER must match MINIO_ACCESS_KEY in local compose")
    if env_map.get("MINIO_ROOT_PASSWORD") and env_map.get("MINIO_SECRET_KEY") and env_map["MINIO_ROOT_PASSWORD"] != env_map["MINIO_SECRET_KEY"]:
        errors.append("MINIO_ROOT_PASSWORD must match MINIO_SECRET_KEY in local compose")

    return errors


def render_env(env_map: dict[str, str]) -> str:
    keys = sorted(env_map.keys())
    return "\n".join(f"{key}={env_map[key]}" for key in keys) + "\n"


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def sync_outputs(env_map: dict[str, str]) -> None:
    write_file(REPO_ROOT / "icicso-local" / ".env", render_env(env_map))

    observability_env = {
        "OBSERVABILITY_GRAFANA_ADMIN_USER": env_map["OBSERVABILITY_GRAFANA_ADMIN_USER"],
        "OBSERVABILITY_GRAFANA_ADMIN_PASSWORD": env_map["OBSERVABILITY_GRAFANA_ADMIN_PASSWORD"],
        "OBSERVABILITY_POSTGRES_EXPORTER_DSN": env_map["OBSERVABILITY_POSTGRES_EXPORTER_DSN"],
        "OBSERVABILITY_REDIS_EXPORTER_ADDR": env_map["OBSERVABILITY_REDIS_EXPORTER_ADDR"],
        "OBSERVABILITY_PROMETHEUS_PORT": env_map.get("OBSERVABILITY_PROMETHEUS_PORT", "9091"),
        "OBSERVABILITY_GRAFANA_PORT": env_map.get("OBSERVABILITY_GRAFANA_PORT", "3300"),
        "OBSERVABILITY_LOKI_PORT": env_map.get("OBSERVABILITY_LOKI_PORT", "3310"),
        "OBSERVABILITY_TEMPO_PORT": env_map.get("OBSERVABILITY_TEMPO_PORT", "3320"),
    }
    write_file(REPO_ROOT / "infra" / "observability" / ".env", render_env(observability_env))

    app_secret = f"""apiVersion: v1
kind: Secret
metadata:
  name: icicso-app-secret
  namespace: icicso-local
  labels:
    app.kubernetes.io/part-of: icicso
type: Opaque
stringData:
  DATABASE_URL: {env_map['DATABASE_URL']}
  JWT_SECRET: {env_map['JWT_SECRET']}
  INTERNAL_SERVICE_TOKEN: {env_map['INTERNAL_SERVICE_TOKEN']}
  MINIO_ACCESS_KEY: {env_map['MINIO_ACCESS_KEY']}
  MINIO_SECRET_KEY: {env_map['MINIO_SECRET_KEY']}
"""
    write_file(REPO_ROOT / "infra" / "k8s" / "secret-app.yaml", app_secret)

    postgres_secret = f"""apiVersion: v1
kind: Secret
metadata:
  name: icicso-postgres-secret
  namespace: icicso-local
  labels:
    app.kubernetes.io/part-of: icicso
type: Opaque
stringData:
  POSTGRES_PASSWORD: {env_map['POSTGRES_PASSWORD']}
"""
    write_file(REPO_ROOT / "infra" / "k8s" / "secret-postgres.yaml", postgres_secret)

    if env_map.get("REDIS_PASSWORD"):
        redis_secret = f"""apiVersion: v1
kind: Secret
metadata:
  name: icicso-redis-secret
  namespace: icicso-local
  labels:
    app.kubernetes.io/part-of: icicso
type: Opaque
stringData:
  REDIS_PASSWORD: {env_map['REDIS_PASSWORD']}
"""
        write_file(REPO_ROOT / "infra" / "k8s" / "secret-redis.yaml", redis_secret)


def scan_repo_for_used_vars() -> set[str]:
    pattern = re.compile(r"(?:process\.env\.|env\(\"|env\('|\$\{)([A-Z][A-Z0-9_]+)")
    used: set[str] = set()
    tracked = tracked_files()
    for path in tracked:
        if any(part in {"node_modules", ".git", ".turbo", ".pnpm-store", "dist", "build"} for part in path.parts):
            continue
        if path.suffix.lower() not in {".ts", ".js", ".py", ".yml", ".yaml", ".json", ".ps1", ".sh", ".env", ".example"}:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for match in pattern.finditer(text):
            used.add(match.group(1))
    return used


def tracked_files() -> list[Path]:
    output = subprocess.check_output(
        [
            "git",
            "-C",
            str(REPO_ROOT),
            "ls-files",
            "icicso-local",
            "infra",
            "scripts",
            ".github",
            "config",
        ],
        text=True,
    )
    return [REPO_ROOT / line.strip() for line in output.splitlines() if line.strip()]


def parse_yaml_stringdata_keys(path: Path) -> set[str]:
    keys: set[str] = set()
    if not path.exists():
        return keys
    in_string_data = False
    in_data = False
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if stripped.startswith("stringData:"):
            in_string_data = True
            in_data = False
            continue
        if stripped.startswith("data:"):
            in_data = True
            in_string_data = False
            continue
        if not raw_line.startswith("  ") and stripped:
            in_string_data = False
            in_data = False
        if (in_string_data or in_data) and re.match(r"^\s{2,}[A-Z0-9_]+:", raw_line):
            keys.add(raw_line.split(":", 1)[0].strip())
    return keys


def cmd_validate(args: argparse.Namespace) -> int:
    schema = load_schema()
    env_file = REPO_ROOT / "config" / "env" / f".env.{args.environment}"
    if not env_file.exists() and args.allow_placeholders:
        env_file = REPO_ROOT / "config" / "env" / f".env.{args.environment}.example"
    env_map = parse_env_file(env_file)
    errors = validate_env_values(env_map, schema, args.environment, allow_placeholders=args.allow_placeholders)
    if errors:
        for error in errors:
            print(f"[config] {error}", file=sys.stderr)
        return 1
    if args.sync:
        sync_outputs(env_map)
        print("[config] compatibility files synced")
    print("[config] validation passed")
    return 0


def cmd_sync_check(_: argparse.Namespace) -> int:
    schema = load_schema()
    schema_keys = set(schema["properties"].keys())
    errors: list[str] = []

    for env_name in ("local", "dev", "staging", "prod"):
        example_path = REPO_ROOT / "config" / "env" / f".env.{env_name}.example"
        example_keys = set(parse_env_file(example_path).keys())
        missing = sorted(key for key in required_keys(schema, env_name) if key not in example_keys)
        if missing:
            errors.append(f"{example_path.name} missing keys: {', '.join(missing)}")

    used_vars = scan_repo_for_used_vars()
    unmanaged = sorted(key for key in used_vars if key not in schema_keys)
    if unmanaged:
        errors.append(f"Variables used in repo but absent from schema: {', '.join(unmanaged)}")

    configmap_keys = parse_yaml_stringdata_keys(REPO_ROOT / "infra" / "k8s" / "configmap-app.yaml")
    secret_example_keys = parse_yaml_stringdata_keys(REPO_ROOT / "infra" / "k8s" / "secret-app.example.yaml")
    postgres_secret_keys = parse_yaml_stringdata_keys(REPO_ROOT / "infra" / "k8s" / "secret-postgres.example.yaml")
    redis_secret_keys = parse_yaml_stringdata_keys(REPO_ROOT / "infra" / "k8s" / "secret-redis.example.yaml")

    for key in sorted(configmap_keys | secret_example_keys | postgres_secret_keys | redis_secret_keys):
        if key not in schema_keys:
            errors.append(f"Kubernetes manifest key missing from schema: {key}")

    if errors:
        for error in errors:
            print(f"[sync] {error}", file=sys.stderr)
        return 1

    print("[sync] schema, examples and manifests are aligned")
    return 0


def should_scan(path: Path) -> bool:
    relative = path.relative_to(REPO_ROOT)
    if relative in {
        Path("config/env/.env.local"),
        Path("config/env/.env.dev"),
        Path("config/env/.env.staging"),
        Path("config/env/.env.prod"),
        Path("icicso-local/.env"),
        Path("infra/observability/.env"),
        Path("infra/k8s/secret-app.yaml"),
        Path("infra/k8s/secret-postgres.yaml"),
        Path("infra/k8s/secret-redis.yaml"),
    }:
        return False
    if any(part in {"node_modules", ".git", ".turbo", ".pnpm-store", "dist", "build", "docs"} for part in path.parts):
        return False
    if path.name.endswith(".example") or ".example." in path.name:
        return False
    if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".ico", ".sqlite"}:
        return False
    return path.suffix.lower() in {".env", ".yml", ".yaml", ".ts", ".js", ".py", ".ps1", ".sh", ".json"}


def cmd_secret_scan(_: argparse.Namespace) -> int:
    findings: list[str] = []
    literal_patterns = [
        re.compile(r"POSTGRES_PASSWORD\s*[:=]\s*(?!\$\{)(?!replace-)(?!change-me)(?!set-only-if)(\S+)", re.IGNORECASE),
        re.compile(r"MINIO_(?:SECRET_KEY|ROOT_PASSWORD)\s*[:=]\s*(?!\$\{)(?!replace-)(?!change-me)(?!set-only-if)(\S+)", re.IGNORECASE),
        re.compile(r"JWT_SECRET\s*[:=]\s*(?!\$\{)(?!replace-)(?!change-me)(?!your-super-secret)(\S+)", re.IGNORECASE),
        re.compile(r"GF_SECURITY_ADMIN_PASSWORD\s*[:=]\s*(?!\$\{)(?!replace-)(\S+)", re.IGNORECASE),
        re.compile(r"postgresql://[^\\s:]+:([^@\\s]+)@", re.IGNORECASE),
    ]

    for path in tracked_files():
        if not path.is_file() or not should_scan(path):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pattern in literal_patterns:
            if pattern.search(text):
                findings.append(str(path.relative_to(REPO_ROOT)))
                break
        if path.suffix == ".env" and "example" not in path.name.lower():
            findings.append(str(path.relative_to(REPO_ROOT)))
        if path.name.startswith("secret-") and path.suffix in {".yaml", ".yml"} and "example" not in path.name:
            findings.append(str(path.relative_to(REPO_ROOT)))

    findings = sorted(set(findings))
    if findings:
        for finding in findings:
            print(f"[secrets] potential secret exposure: {finding}", file=sys.stderr)
        return 1

    print("[secrets] no tracked secret exposures detected")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate_parser = subparsers.add_parser("validate")
    validate_parser.add_argument("--environment", default="local", choices=["local", "dev", "staging", "prod"])
    validate_parser.add_argument("--allow-placeholders", action="store_true")
    validate_parser.add_argument("--sync", action="store_true")
    validate_parser.set_defaults(func=cmd_validate)

    sync_parser = subparsers.add_parser("sync-check")
    sync_parser.set_defaults(func=cmd_sync_check)

    secret_parser = subparsers.add_parser("secret-scan")
    secret_parser.set_defaults(func=cmd_secret_scan)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
