"""
FastAPI routes for the Semantic Terminology Engine.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

import structlog

from ..core.database import get_db
from ..domain.models import (
    BatchTranslationRequest,
    BatchTranslationResponse,
    TerminologyInfo,
    TerminologySystem,
    TranslationRequest,
    TranslationResponse,
    ValidationRequest,
    ValidationResponse,
)
from ..domain.terminology_service import TerminologyService

logger = structlog.get_logger(__name__)

router = APIRouter()
terminology_service = TerminologyService()


@router.get("/systems", response_model=List[TerminologyInfo])
async def get_terminology_systems():
    """Get information about all supported terminology systems."""
    logger.info("Getting terminology systems")
    return await terminology_service.get_terminology_info()


@router.get("/systems/{system}", response_model=TerminologyInfo)
async def get_terminology_system(system: TerminologySystem):
    """Get information about a specific terminology system."""
    logger.info("Getting terminology system", system=system)
    systems = await terminology_service.get_terminology_info(system)
    if not systems:
        raise HTTPException(status_code=404, detail=f"Terminology system {system} not found")
    return systems[0]


@router.post("/translate", response_model=TranslationResponse)
async def translate_code(request: TranslationRequest):
    """Translate a code from one terminology system to another."""
    try:
        logger.info(
            "API translate request",
            source_system=request.source_code.system,
            source_code=request.source_code.code,
            target_system=request.target_system,
        )
        return await terminology_service.translate_code(request)
    except Exception as e:
        logger.error("Translation failed", error=str(e), request=request.dict())
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")


@router.post("/validate", response_model=ValidationResponse)
async def validate_code(request: ValidationRequest):
    """Validate a terminology code."""
    try:
        logger.info(
            "API validate request",
            system=request.code.system,
            code=request.code.code,
        )
        return await terminology_service.validate_code(request)
    except Exception as e:
        logger.error("Validation failed", error=str(e), request=request.dict())
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.post("/batch-translate", response_model=BatchTranslationResponse)
async def batch_translate_codes(request: BatchTranslationRequest):
    """Perform batch code translation."""
    try:
        logger.info("API batch translate request", batch_size=len(request.requests))
        return await terminology_service.batch_translate(request)
    except Exception as e:
        logger.error("Batch translation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Batch translation failed: {str(e)}")


@router.get("/search/{system}/{query}")
async def search_codes(system: TerminologySystem, query: str, limit: int = 50):
    """Search for codes in a terminology system."""
    try:
        logger.info("API search request", system=system, query=query, limit=limit)

        # For now, return mock results
        # In a real implementation, this would use the repository
        mock_results = [
            {
                "system": system,
                "code": f"MOCK-{i}",
                "display": f"Mock result {i} for {query}",
                "score": 0.9 - (i * 0.1)
            }
            for i in range(min(limit, 5))
        ]

        return {
            "query": query,
            "system": system,
            "results": mock_results,
            "total_found": len(mock_results)
        }

    except Exception as e:
        logger.error("Search failed", error=str(e), system=system, query=query)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")