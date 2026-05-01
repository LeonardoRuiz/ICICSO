from fastapi import APIRouter

from app.core.config import get_settings


router = APIRouter()


@router.get("/health")
def read_health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
    }


@router.get("/docs-context")
def read_docs_context() -> dict[str, str]:
    settings = get_settings()
    return {
        "manifest_path": str(settings.manifest_path),
        "catalog_root": str(settings.project_root),
    }
