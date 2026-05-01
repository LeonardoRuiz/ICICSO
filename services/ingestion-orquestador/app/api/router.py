from fastapi import APIRouter

from app.api.routes import health, source_documents


api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(
    source_documents.router, prefix="/source-documents", tags=["source-documents"]
)
