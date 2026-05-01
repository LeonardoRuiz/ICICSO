from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
OVERLAY_DIR = REPO_ROOT / "infra" / "k8s" / "overlays" / "staging"
DEPLOYMENTS = [
    "icicso-postgres",
    "icicso-redis",
    "icicso-engine",
    "icicso-parser",
    "icicso-api",
    "icicso-frontend",
]


def fail(message: str) -> int:
    print(f"[aws-staging] {message}", file=sys.stderr)
    return 1


def run(command: list[str], *, check: bool = True, capture: bool = False) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, cwd=REPO_ROOT, text=True, capture_output=capture)
    if check and result.returncode != 0:
        detail = (result.stderr or result.stdout or f"exit={result.returncode}").strip()
        raise RuntimeError(f"Command failed: {' '.join(command)} :: {detail}")
    return result


def env(name: str, default: str | None = None, *, required: bool = False) -> str:
    value = os.getenv(name, default)
    if required and (value is None or value.strip() == ""):
      raise RuntimeError(f"Missing required environment variable: {name}")
    return (value or "").strip()


def resolve_context() -> dict[str, str]:
    region = env("AWS_REGION", required=True)
    account_id = env("AWS_ACCOUNT_ID")
    cluster = env("ICICSO_STAGING_CLUSTER", required=True)
    namespace = env("ICICSO_STAGING_NAMESPACE", "icicso-staging")
    domain = env("ICICSO_STAGING_DOMAIN", required=True)
    ecr_prefix = env("ICICSO_ECR_PREFIX", "icicso-staging")
    secret_file = env("ICICSO_STAGING_SECRET_FILE", str(OVERLAY_DIR / "secrets.yaml"))
    image_tag = env("ICICSO_IMAGE_TAG", "")
    return {
        "region": region,
        "account_id": account_id,
        "cluster": cluster,
        "namespace": namespace,
        "domain": domain,
        "ecr_prefix": ecr_prefix,
        "secret_file": secret_file,
        "image_tag": image_tag,
    }


def ensure_command(command: str) -> None:
    if shutil.which(command) is None:
        raise RuntimeError(f"Required command not found in PATH: {command}")


def get_account_id() -> str:
    result = run(["aws", "sts", "get-caller-identity", "--output", "json"], capture=True)
    return json.loads(result.stdout)["Account"]


def ecr_repo_uri(account_id: str, region: str, repo_name: str) -> str:
    return f"{account_id}.dkr.ecr.{region}.amazonaws.com/{repo_name}"


def ensure_ecr_repo(name: str) -> None:
    result = run(["aws", "ecr", "describe-repositories", "--repository-names", name], check=False, capture=True)
    if result.returncode == 0:
        return
    run(["aws", "ecr", "create-repository", "--repository-name", name, "--image-tag-mutability", "MUTABLE"])


def detect_image_tag() -> str:
    sha = run(["git", "rev-parse", "--short", "HEAD"], check=False, capture=True)
    if sha.returncode == 0 and sha.stdout.strip():
        return sha.stdout.strip()
    return "manual"


def aws_login(account_id: str, region: str) -> None:
    password = run(["aws", "ecr", "get-login-password", "--region", region], capture=True).stdout
    process = subprocess.run(
        ["docker", "login", "--username", "AWS", "--password-stdin", f"{account_id}.dkr.ecr.{region}.amazonaws.com"],
        input=password,
        text=True,
        cwd=REPO_ROOT,
    )
    if process.returncode != 0:
        raise RuntimeError("docker login to ECR failed")


def build_and_push_images(context: dict[str, str], image_tag: str) -> dict[str, str]:
    account_id = context["account_id"] or get_account_id()
    context["account_id"] = account_id
    region = context["region"]
    prefix = context["ecr_prefix"]
    repos = {
        "frontend": f"{prefix}/frontend",
        "node-runtime": f"{prefix}/node-runtime",
        "semantic-terminology-engine": f"{prefix}/semantic-terminology-engine",
    }
    for repo in repos.values():
        ensure_ecr_repo(repo)
    aws_login(account_id, region)

    node_uri = ecr_repo_uri(account_id, region, repos["node-runtime"])
    frontend_uri = ecr_repo_uri(account_id, region, repos["frontend"])
    engine_uri = ecr_repo_uri(account_id, region, repos["semantic-terminology-engine"])

    run(["docker", "build", "-f", str(REPO_ROOT / "infra" / "docker" / "node-runtime.Dockerfile"), "-t", f"{node_uri}:{image_tag}", "."])
    run(["docker", "build", "-f", str(REPO_ROOT / "infra" / "docker" / "frontend.Dockerfile"), "-t", f"{frontend_uri}:{image_tag}", "."])
    run([
        "docker",
        "build",
        "-f",
        str(REPO_ROOT / "icicso-local" / "engines" / "13_semantic_terminology_engine" / "Dockerfile"),
        "-t",
        f"{engine_uri}:{image_tag}",
        str(REPO_ROOT / "icicso-local" / "engines" / "13_semantic_terminology_engine"),
    ])

    run(["docker", "push", f"{node_uri}:{image_tag}"])
    run(["docker", "push", f"{frontend_uri}:{image_tag}"])
    run(["docker", "push", f"{engine_uri}:{image_tag}"])

    return {
        "icicso/frontend-local:dev": f"{frontend_uri}:{image_tag}",
        "icicso/node-runtime:dev": f"{node_uri}:{image_tag}",
        "icicso/semantic-terminology-engine:dev": f"{engine_uri}:{image_tag}",
    }


def update_kubeconfig(context: dict[str, str]) -> None:
    run(["aws", "eks", "update-kubeconfig", "--region", context["region"], "--name", context["cluster"]])


def render_overlay(context: dict[str, str], image_map: dict[str, str]) -> Path:
    temp_dir = Path(tempfile.mkdtemp(prefix="icicso-staging-overlay-"))
    shutil.copytree(OVERLAY_DIR, temp_dir / "overlay", dirs_exist_ok=True)
    overlay = temp_dir / "overlay"
    kustomization = (overlay / "kustomization.yaml").read_text(encoding="utf-8")
    for source, target in image_map.items():
        name, tag = target.split(":")
        kustomization = kustomization.replace(f"newName: 123456789012.dkr.ecr.us-east-1.amazonaws.com/{name.split('.amazonaws.com/')[1]}", f"newName: {name}")
        kustomization = kustomization.replace("newTag: replace-with-image-tag", f"newTag: {tag}")
    (overlay / "kustomization.yaml").write_text(kustomization, encoding="utf-8")

    configmap = (overlay / "configmap.yaml").read_text(encoding="utf-8")
    configmap = configmap.replace("staging.icicso.example.internal", context["domain"])
    configmap = configmap.replace("namespace: icicso-staging", f"namespace: {context['namespace']}")
    (overlay / "configmap.yaml").write_text(configmap, encoding="utf-8")

    ingress = (overlay / "ingress.yaml").read_text(encoding="utf-8")
    ingress = ingress.replace("staging.icicso.example.internal", context["domain"])
    ingress = ingress.replace("namespace: icicso-staging", f"namespace: {context['namespace']}")
    (overlay / "ingress.yaml").write_text(ingress, encoding="utf-8")

    namespace = (overlay / "namespace.yaml").read_text(encoding="utf-8").replace("name: icicso-staging", f"name: {context['namespace']}")
    (overlay / "namespace.yaml").write_text(namespace, encoding="utf-8")
    return overlay


def ensure_secret_file(secret_file: str) -> None:
    if not Path(secret_file).exists():
        raise RuntimeError(f"Missing staging secret manifest: {secret_file}. Copy secrets.example.yaml to secrets.yaml and fill real values.")


def wait_rollouts(namespace: str) -> None:
    for deployment in DEPLOYMENTS:
        run(["kubectl", "rollout", "status", f"deployment/{deployment}", "-n", namespace, "--timeout=600s"])


def smoke(namespace: str, domain: str) -> None:
    run(["kubectl", "get", "pods", "-n", namespace], capture=True)
    for url in [
        f"http://{domain}/",
        f"http://{domain}/api/health/ready",
        f"http://{domain}/api/block1/overview",
        f"http://{domain}/api/block2/overview",
    ]:
        result = run(["python", "-c", f"import urllib.request; urllib.request.urlopen('{url}', timeout=20).read(); print('ok')"], check=False, capture=True)
        if result.returncode != 0:
            raise RuntimeError(f"Smoke test failed for {url}")


def cmd_precheck(_: argparse.Namespace) -> int:
    try:
        context = resolve_context()
        for command in ("aws", "kubectl", "docker", "python"):
            ensure_command(command)
        if not context["account_id"]:
            context["account_id"] = get_account_id()
        run(["aws", "eks", "describe-cluster", "--name", context["cluster"], "--region", context["region"]], capture=True)
        print(f"[aws-staging] account={context['account_id']} region={context['region']} cluster={context['cluster']}")
        print(f"[aws-staging] namespace={context['namespace']} domain={context['domain']}")
        return 0
    except Exception as exc:
        return fail(str(exc))


def cmd_status(_: argparse.Namespace) -> int:
    try:
        context = resolve_context()
        update_kubeconfig(context)
        namespace = context["namespace"]
        print(run(["kubectl", "get", "pods", "-n", namespace, "-o", "wide"], capture=True).stdout)
        print(run(["kubectl", "get", "svc", "-n", namespace], capture=True).stdout)
        print(run(["kubectl", "get", "ingress", "-n", namespace], capture=True).stdout)
        return 0
    except Exception as exc:
        return fail(str(exc))


def cmd_deploy(_: argparse.Namespace) -> int:
    try:
        context = resolve_context()
        ensure_secret_file(context["secret_file"])
        update_kubeconfig(context)
        image_tag = context["image_tag"] or detect_image_tag()
        image_map = build_and_push_images(context, image_tag)
        overlay = render_overlay(context, image_map)
        run(["kubectl", "apply", "-f", context["secret_file"]])
        run(["kubectl", "apply", "-k", str(overlay)])
        wait_rollouts(context["namespace"])
        smoke(context["namespace"], context["domain"])
        print(f"[aws-staging] deploy completed for domain http://{context['domain']}/")
        return 0
    except Exception as exc:
        return fail(str(exc))


def cmd_rollback(_: argparse.Namespace) -> int:
    try:
        context = resolve_context()
        update_kubeconfig(context)
        for deployment in ("icicso-frontend", "icicso-api", "icicso-parser", "icicso-engine"):
            run(["kubectl", "rollout", "undo", f"deployment/{deployment}", "-n", context["namespace"]])
            run(["kubectl", "rollout", "status", f"deployment/{deployment}", "-n", context["namespace"], "--timeout=600s"])
        print(f"[aws-staging] rollout undo completed in namespace {context['namespace']}")
        return 0
    except Exception as exc:
        return fail(str(exc))


def cmd_destroy(args: argparse.Namespace) -> int:
    try:
        if not args.force:
            return fail("Destroy requires --force.")
        context = resolve_context()
        update_kubeconfig(context)
        run(["kubectl", "delete", "namespace", context["namespace"], "--ignore-not-found=true"])
        print(f"[aws-staging] namespace {context['namespace']} deleted")
        print("[aws-staging] manual cleanup still required for ECR images, Secrets Manager entries and ALB residues if they remain.")
        return 0
    except Exception as exc:
        return fail(str(exc))


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    precheck = subparsers.add_parser("precheck")
    precheck.set_defaults(func=cmd_precheck)

    deploy = subparsers.add_parser("deploy")
    deploy.set_defaults(func=cmd_deploy)

    status = subparsers.add_parser("status")
    status.set_defaults(func=cmd_status)

    rollback = subparsers.add_parser("rollback")
    rollback.set_defaults(func=cmd_rollback)

    destroy = subparsers.add_parser("destroy")
    destroy.add_argument("--force", action="store_true")
    destroy.set_defaults(func=cmd_destroy)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
