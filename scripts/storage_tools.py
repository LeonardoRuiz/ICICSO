from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
BACKUP_ROOT = REPO_ROOT / "backups" / "local"
DATA_DIR = REPO_ROOT / "icicso-local" / ".data"
OBSERVABILITY_LOG_DIR = REPO_ROOT / "logs" / "observability"
FULL_CONFIG_SNAPSHOT = [
    REPO_ROOT / "config" / "env" / ".env.local.example",
    REPO_ROOT / "config" / "env" / ".env.dev.example",
    REPO_ROOT / "config" / "env" / ".env.staging.example",
    REPO_ROOT / "config" / "env" / ".env.prod.example",
    REPO_ROOT / "config" / "schemas" / "config.schema.json",
    REPO_ROOT / "infra" / "k8s" / "kustomization.yaml",
    REPO_ROOT / "infra" / "storage" / "k8s" / "kustomization.yaml",
]
NAMESPACE = "icicso-local"
POSTGRES_LABEL = "app.kubernetes.io/name=icicso-postgres"


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fail(message: str) -> int:
    print(f"[storage] {message}", file=sys.stderr)
    return 1


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def run(command: list[str], *, check: bool = True, capture: bool = False, input_text: str | None = None) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        command,
        cwd=REPO_ROOT,
        text=True,
        input=input_text,
        capture_output=capture,
    )
    if check and result.returncode != 0:
        stderr = result.stderr.strip() if result.stderr else ""
        stdout = result.stdout.strip() if result.stdout else ""
        detail = stderr or stdout or f"exit={result.returncode}"
        raise RuntimeError(f"Command failed: {' '.join(command)} :: {detail}")
    return result


def command_exists(command: str) -> bool:
    return shutil.which(command) is not None


def detect_k8s_postgres_pod() -> str | None:
    if not command_exists("kubectl"):
        return None
    result = run(
        [
            "kubectl",
            "get",
            "pods",
            "-n",
            NAMESPACE,
            "-l",
            POSTGRES_LABEL,
            "-o",
            "jsonpath={.items[0].metadata.name}",
        ],
        check=False,
        capture=True,
    )
    pod = (result.stdout or "").strip()
    return pod or None


def detect_docker_postgres_container() -> str | None:
    if not command_exists("docker"):
        return None
    result = run(
        [
            "docker",
            "ps",
            "--filter",
            "label=com.docker.compose.service=postgres",
            "--format",
            "{{.Names}}",
        ],
        check=False,
        capture=True,
    )
    lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    if lines:
        return lines[0]
    fallback = run(["docker", "ps", "--format", "{{.Names}}"], check=False, capture=True)
    for line in fallback.stdout.splitlines():
        name = line.strip()
        if "postgres" in name.lower():
            return name
    return None


def export_postgres_dump() -> tuple[str, str]:
    pod = detect_k8s_postgres_pod()
    if pod:
        result = run(
            [
                "kubectl",
                "exec",
                "-n",
                NAMESPACE,
                pod,
                "--",
                "sh",
                "-lc",
                'export PGPASSWORD="$POSTGRES_PASSWORD"; pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --format=plain',
            ],
            capture=True,
        )
        return "k8s", result.stdout

    container = detect_docker_postgres_container()
    if container:
        result = run(
            [
                "docker",
                "exec",
                container,
                "sh",
                "-lc",
                'export PGPASSWORD="$POSTGRES_PASSWORD"; pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --format=plain',
            ],
            capture=True,
        )
        return "docker", result.stdout

    raise RuntimeError("No se detectó Postgres ni en Kubernetes ni en Docker Compose.")


def restore_postgres_dump(sql_text: str) -> str:
    pod = detect_k8s_postgres_pod()
    if pod:
        run(
            [
                "kubectl",
                "exec",
                "-i",
                "-n",
                NAMESPACE,
                pod,
                "--",
                "sh",
                "-lc",
                'export PGPASSWORD="$POSTGRES_PASSWORD"; psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
            ],
            input_text=sql_text,
        )
        verify = run(
            [
                "kubectl",
                "exec",
                "-n",
                NAMESPACE,
                pod,
                "--",
                "sh",
                "-lc",
                'export PGPASSWORD="$POSTGRES_PASSWORD"; psql -tAc "SELECT 1" -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
            ],
            capture=True,
        )
        if "1" not in verify.stdout:
            raise RuntimeError("Validación posterior al restore de Postgres falló en Kubernetes.")
        return "k8s"

    container = detect_docker_postgres_container()
    if container:
        run(
            [
                "docker",
                "exec",
                "-i",
                container,
                "sh",
                "-lc",
                'export PGPASSWORD="$POSTGRES_PASSWORD"; psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
            ],
            input_text=sql_text,
        )
        verify = run(
            [
                "docker",
                "exec",
                container,
                "sh",
                "-lc",
                'export PGPASSWORD="$POSTGRES_PASSWORD"; psql -tAc "SELECT 1" -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
            ],
            capture=True,
        )
        if "1" not in verify.stdout:
            raise RuntimeError("Validación posterior al restore de Postgres falló en Docker.")
        return "docker"

    raise RuntimeError("No se detectó Postgres activo para restore.")


def zip_directory(source_dir: Path, destination_zip: Path) -> dict[str, object]:
    ensure_dir(destination_zip.parent)
    with zipfile.ZipFile(destination_zip, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(source_dir.rglob("*")):
            if path.is_dir():
                continue
            archive.write(path, path.relative_to(source_dir))
    return {
        "path": str(destination_zip),
        "sha256": sha256_file(destination_zip),
        "size_bytes": destination_zip.stat().st_size,
    }


def snapshot_directory(path: Path) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    if not path.exists():
        return rows
    for entry in sorted(path.rglob("*")):
        if entry.is_file():
            rows.append(
                {
                    "path": str(entry.relative_to(path)),
                    "size_bytes": entry.stat().st_size,
                    "sha256": sha256_file(entry),
                }
            )
    return rows


def cmd_backup_postgres(_: argparse.Namespace) -> int:
    try:
        target_dir = ensure_dir(BACKUP_ROOT / "postgres" / now_stamp())
        output_file = target_dir / "postgres.sql"
        source, sql_text = export_postgres_dump()
        if not sql_text.strip():
            return fail("El dump SQL de Postgres quedó vacío.")
        output_file.write_text(sql_text, encoding="utf-8")
        manifest = {
            "type": "postgres",
            "source": source,
            "generated_at": datetime.now().isoformat(),
            "file": {
                "path": str(output_file),
                "sha256": sha256_file(output_file),
                "size_bytes": output_file.stat().st_size,
            },
        }
        (target_dir / "inventory.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        print(f"[storage] Postgres backup listo: {output_file}")
        return 0
    except Exception as exc:
        return fail(str(exc))


def cmd_restore_postgres(args: argparse.Namespace) -> int:
    dump_path = Path(args.input).resolve()
    if not dump_path.exists():
        return fail(f"Dump no encontrado: {dump_path}")
    if not args.force:
        return fail("Restore de Postgres requiere --force.")
    try:
        sql_text = dump_path.read_text(encoding="utf-8")
        if not sql_text.strip():
            return fail("El dump indicado está vacío.")
        mode = restore_postgres_dump(sql_text)
        print(f"[storage] Postgres restaurado desde {dump_path} usando modo {mode}")
        return 0
    except Exception as exc:
        return fail(str(exc))


def cmd_backup_documents(_: argparse.Namespace) -> int:
    if not DATA_DIR.exists():
        return fail(f"No existe el directorio de documentos/stores locales: {DATA_DIR}")
    try:
        target_dir = ensure_dir(BACKUP_ROOT / "documents" / now_stamp())
        zip_path = target_dir / "documents.zip"
        archive_info = zip_directory(DATA_DIR, zip_path)
        inventory = {
            "type": "documents",
            "generated_at": datetime.now().isoformat(),
            "source": str(DATA_DIR),
            "archive": archive_info,
            "contents": snapshot_directory(DATA_DIR),
        }
        (target_dir / "inventory.json").write_text(json.dumps(inventory, indent=2), encoding="utf-8")
        print(f"[storage] Backup documental listo: {zip_path}")
        return 0
    except Exception as exc:
        return fail(str(exc))


def cmd_restore_documents(args: argparse.Namespace) -> int:
    zip_path = Path(args.input).resolve()
    if not zip_path.exists():
        return fail(f"Archivo no encontrado: {zip_path}")
    if zip_path.suffix.lower() != ".zip":
        return fail("El restore documental espera un archivo .zip.")
    if not args.force:
        return fail("Restore documental requiere --force.")

    try:
        safety_dir = ensure_dir(BACKUP_ROOT / "restore-safety" / f"documents-{now_stamp()}")
        if DATA_DIR.exists() and any(DATA_DIR.iterdir()):
            shutil.copytree(DATA_DIR, safety_dir / ".data", dirs_exist_ok=True)
        if DATA_DIR.exists():
            shutil.rmtree(DATA_DIR)
        ensure_dir(DATA_DIR)
        with zipfile.ZipFile(zip_path, "r") as archive:
            archive.extractall(DATA_DIR)
        restored = list(DATA_DIR.rglob("*.json"))
        if not restored:
            return fail("El restore documental no produjo archivos JSON en .data.")
        print(f"[storage] Documentos restaurados en {DATA_DIR}")
        print(f"[storage] Snapshot de seguridad: {safety_dir}")
        return 0
    except Exception as exc:
        return fail(str(exc))


def copy_if_exists(source: Path, destination_root: Path) -> None:
    if not source.exists():
        return
    destination = destination_root / source.relative_to(REPO_ROOT)
    ensure_dir(destination.parent)
    shutil.copy2(source, destination)


def cmd_backup_full(_: argparse.Namespace) -> int:
    try:
        stamp = now_stamp()
        full_dir = ensure_dir(BACKUP_ROOT / "full" / stamp)
        postgres_dir = ensure_dir(full_dir / "postgres")
        documents_dir = ensure_dir(full_dir / "documents")
        config_dir = ensure_dir(full_dir / "config-snapshot")

        source, sql_text = export_postgres_dump()
        postgres_file = postgres_dir / "postgres.sql"
        postgres_file.write_text(sql_text, encoding="utf-8")

        documents_info = None
        if DATA_DIR.exists():
            documents_zip = documents_dir / "documents.zip"
            documents_info = zip_directory(DATA_DIR, documents_zip)

        for file_path in FULL_CONFIG_SNAPSHOT:
            copy_if_exists(file_path, config_dir)
        for file_path in (REPO_ROOT / "infra" / "storage").rglob("*.md"):
            copy_if_exists(file_path, config_dir)
        for file_path in (REPO_ROOT / "docs" / "storage").rglob("*.md"):
            copy_if_exists(file_path, config_dir)

        inventory = {
            "type": "full-local",
            "generated_at": datetime.now().isoformat(),
            "postgres_source": source,
            "postgres": {
                "path": str(postgres_file),
                "sha256": sha256_file(postgres_file),
                "size_bytes": postgres_file.stat().st_size,
            },
            "documents": documents_info,
            "config_snapshot_files": snapshot_directory(config_dir),
        }
        (full_dir / "inventory.json").write_text(json.dumps(inventory, indent=2), encoding="utf-8")
        print(f"[storage] Backup full local listo: {full_dir}")
        return 0
    except Exception as exc:
        return fail(str(exc))


def cmd_restore_full(args: argparse.Namespace) -> int:
    backup_dir = Path(args.input).resolve()
    if not backup_dir.exists() or not backup_dir.is_dir():
        return fail(f"Backup full no encontrado: {backup_dir}")
    if not args.force:
        return fail("Restore full requiere --force.")

    inventory = backup_dir / "inventory.json"
    postgres_file = backup_dir / "postgres" / "postgres.sql"
    documents_zip = backup_dir / "documents" / "documents.zip"

    if not inventory.exists():
        return fail(f"Inventario faltante: {inventory}")
    if not postgres_file.exists():
        return fail(f"Dump faltante: {postgres_file}")

    try:
        restore_postgres_dump(postgres_file.read_text(encoding="utf-8"))
        if documents_zip.exists():
            result = cmd_restore_documents(argparse.Namespace(input=str(documents_zip), force=True))
            if result != 0:
                return result
        print(f"[storage] Restore full local completado desde {backup_dir}")
        return 0
    except Exception as exc:
        return fail(str(exc))


def dir_size(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(item.stat().st_size for item in path.rglob("*") if item.is_file())


def cmd_status(_: argparse.Namespace) -> int:
    print("[storage] Estado local de persistencia")
    print(f"[storage] .data path: {DATA_DIR}")
    print(f"[storage] .data exists: {'yes' if DATA_DIR.exists() else 'no'}")
    print(f"[storage] .data size bytes: {dir_size(DATA_DIR)}")
    if DATA_DIR.exists():
        for item in sorted(DATA_DIR.glob('*.json')):
            print(f"[storage]   data file: {item.name} ({item.stat().st_size} bytes)")

    print(f"[storage] observability logs path: {OBSERVABILITY_LOG_DIR}")
    print(f"[storage] observability logs exists: {'yes' if OBSERVABILITY_LOG_DIR.exists() else 'no'}")
    print(f"[storage] observability logs size bytes: {dir_size(OBSERVABILITY_LOG_DIR)}")

    print(f"[storage] backups root: {BACKUP_ROOT}")
    for category in ("postgres", "documents", "full", "restore-safety"):
        category_dir = BACKUP_ROOT / category
        count = len(list(category_dir.iterdir())) if category_dir.exists() else 0
        print(f"[storage]   {category}: {count}")

    pod = detect_k8s_postgres_pod()
    print(f"[storage] k8s postgres detected: {'yes' if pod else 'no'}")
    if command_exists("kubectl"):
        result = run(["kubectl", "get", "pvc", "-n", NAMESPACE], check=False, capture=True)
        if result.returncode == 0 and result.stdout.strip():
            print("[storage] PVCs:")
            print(result.stdout.strip())

    if command_exists("docker"):
        result = run(["docker", "volume", "ls", "--format", "{{.Name}}"], check=False, capture=True)
        if result.returncode == 0:
            relevant = [line for line in result.stdout.splitlines() if any(token in line for token in ("postgres", "redis", "minio"))]
            print(f"[storage] docker volumes detected: {', '.join(relevant) if relevant else 'none'}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    backup_postgres = subparsers.add_parser("backup-postgres")
    backup_postgres.set_defaults(func=cmd_backup_postgres)

    restore_postgres = subparsers.add_parser("restore-postgres")
    restore_postgres.add_argument("--input", required=True)
    restore_postgres.add_argument("--force", action="store_true")
    restore_postgres.set_defaults(func=cmd_restore_postgres)

    backup_documents = subparsers.add_parser("backup-documents")
    backup_documents.set_defaults(func=cmd_backup_documents)

    restore_documents = subparsers.add_parser("restore-documents")
    restore_documents.add_argument("--input", required=True)
    restore_documents.add_argument("--force", action="store_true")
    restore_documents.set_defaults(func=cmd_restore_documents)

    backup_full = subparsers.add_parser("backup-full")
    backup_full.set_defaults(func=cmd_backup_full)

    restore_full = subparsers.add_parser("restore-full")
    restore_full.add_argument("--input", required=True)
    restore_full.add_argument("--force", action="store_true")
    restore_full.set_defaults(func=cmd_restore_full)

    status = subparsers.add_parser("status")
    status.set_defaults(func=cmd_status)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
