"""
Repository layer for terminology data access.
"""

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import structlog

from ..domain.models import TerminologySystem
from .models import TerminologyMapping, TerminologySet

logger = structlog.get_logger(__name__)


class TerminologyRepository:
    """Repository for terminology data operations."""

    def __init__(self, session: AsyncSession):
        """Initialize repository with database session."""
        self.session = session

    async def get_terminology_set(self, system: TerminologySystem, version: Optional[str] = None) -> Optional[TerminologySet]:
        """Get a terminology set by system and version."""
        query = select(TerminologySet).where(
            TerminologySet.system == system.value,
            TerminologySet.is_active == 1
        )

        if version:
            query = query.where(TerminologySet.version == version)

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_mapping_by_source_code(self, source_code: str, terminology_set_id: int) -> Optional[TerminologyMapping]:
        """Get mapping by source code."""
        query = select(TerminologyMapping).where(
            TerminologyMapping.source_code == source_code,
            TerminologyMapping.terminology_set_id == terminology_set_id
        )

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_mapping_by_canonical_code(self, canonical_code: str, terminology_set_id: int) -> Optional[TerminologyMapping]:
        """Get mapping by canonical code."""
        query = select(TerminologyMapping).where(
            TerminologyMapping.canonical_code == canonical_code,
            TerminologyMapping.terminology_set_id == terminology_set_id
        )

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def search_mappings(self, search_term: str, terminology_set_id: int, limit: int = 50) -> List[TerminologyMapping]:
        """Search mappings by display name or code."""
        # Note: This is a simplified search. In production, you'd want full-text search
        query = select(TerminologyMapping).where(
            TerminologyMapping.terminology_set_id == terminology_set_id,
            (TerminologyMapping.display_name.contains(search_term) |
             TerminologyMapping.source_code.contains(search_term) |
             TerminologyMapping.canonical_code.contains(search_term))
        ).limit(limit)

        result = await self.session.execute(query)
        return result.scalars().all()

    async def create_mapping(self, mapping: TerminologyMapping) -> TerminologyMapping:
        """Create a new terminology mapping."""
        self.session.add(mapping)
        await self.session.commit()
        await self.session.refresh(mapping)
        logger.info("Created terminology mapping", mapping_id=mapping.id)
        return mapping

    async def get_all_active_sets(self) -> List[TerminologySet]:
        """Get all active terminology sets."""
        query = select(TerminologySet).where(TerminologySet.is_active == 1)
        result = await self.session.execute(query)
        return result.scalars().all()

    async def validate_code_exists(self, code: str, system: TerminologySystem) -> bool:
        """Check if a code exists in the given terminology system."""
        terminology_set = await self.get_terminology_set(system)
        if not terminology_set:
            return False

        mapping = await self.get_mapping_by_source_code(code, terminology_set.id)
        return mapping is not None