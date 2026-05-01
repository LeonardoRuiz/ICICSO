from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.services.catalog_repository import CatalogRepository
from app.services.document_ingestion_service import DocumentIngestionService
from app.services.governance_record_service import GovernanceRecordService
from app.services.audit_report_service import AuditReportService


settings = get_settings()
catalog_repository = CatalogRepository()
document_ingestion_service = DocumentIngestionService()
governance_record_service = GovernanceRecordService()
audit_report_service = AuditReportService()


@asynccontextmanager
async def lifespan(_: FastAPI):
    catalog_repository.ensure_catalog_ready()
    document_ingestion_service.ensure_exports_ready()
    governance_record_service.write_feed_exports()
    audit_report_service.write_feed_exports()
    yield

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Base inicial del backend ICICSO para exponer el corpus documental "
        "gobernado y preparar la futura orquestacion clinica."
    ),
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_prefix)


@app.get("/", tags=["root"])
def read_root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs_url": f"{settings.api_prefix}/docs-context",
    }
