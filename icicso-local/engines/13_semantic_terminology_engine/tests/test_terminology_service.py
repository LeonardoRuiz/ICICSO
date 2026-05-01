"""
Tests for the Semantic Terminology Engine.
"""

import asyncio

import pytest
from semantic_terminology_engine.domain.models import (
    BatchTranslationRequest,
    TerminologyCode,
    TerminologyInfo,
    TerminologySystem,
    TranslationRequest,
    ValidationRequest,
)
from semantic_terminology_engine.domain.terminology_service import TerminologyService


class TestTerminologyService:
    """Test cases for the TerminologyService."""

    @pytest.fixture
    def service(self):
        """Create a terminology service instance."""
        return TerminologyService()

    async def _test_translate_code_basic(self, service: TerminologyService):
        """Test basic code translation."""
        request = TranslationRequest(
            source_code=TerminologyCode(
                system=TerminologySystem.SNOMED_CT,
                code="123456789",
                display="Test condition"
            ),
            target_system=TerminologySystem.ICD_10
        )

        response = await service.translate_code(request)

        assert response.source_code == request.source_code
        assert isinstance(response.confidence_score, float)
        assert 0.0 <= response.confidence_score <= 1.0

    async def _test_validate_code_valid(self, service: TerminologyService):
        """Test validation of a valid code."""
        request = ValidationRequest(
            code=TerminologyCode(
                system=TerminologySystem.SNOMED_CT,
                code="123456789",
                display="Valid condition"
            )
        )

        response = await service.validate_code(request)

        assert response.is_valid is True
        assert response.code == request.code
        assert response.error_message is None

    async def _test_validate_code_invalid(self, service: TerminologyService):
        """Test validation of an invalid code."""
        request = ValidationRequest(
            code=TerminologyCode(
                system=TerminologySystem.SNOMED_CT,
                code="",  # Empty code
                display="Invalid condition"
            )
        )

        response = await service.validate_code(request)

        assert response.is_valid is False
        assert response.error_message is not None

    async def _test_get_terminology_info(self, service: TerminologyService):
        """Test getting terminology system information."""
        systems = await service.get_terminology_info()

        assert len(systems) > 0
        assert all(isinstance(system, TerminologyInfo) for system in systems)

        # Check that SNOMED CT is included
        snomed_systems = [s for s in systems if s.system == TerminologySystem.SNOMED_CT]
        assert len(snomed_systems) == 1
        assert snomed_systems[0].name == "SNOMED CT"

    async def _test_batch_translate(self, service: TerminologyService):
        """Test batch code translation."""
        requests = [
            TranslationRequest(
                source_code=TerminologyCode(
                    system=TerminologySystem.SNOMED_CT,
                    code=f"12345678{i}"
                ),
                target_system=TerminologySystem.ICD_10
            )
            for i in range(3)
        ]

        batch_request = BatchTranslationRequest(requests=requests)
        response = await service.batch_translate(batch_request)

        assert len(response.results) == len(requests)
        assert response.total_processed == len(requests)
        assert len(response.errors) == 0

    def test_translate_code_basic_sync(self, service: TerminologyService):
        asyncio.run(self._test_translate_code_basic(service))

    def test_validate_code_valid_sync(self, service: TerminologyService):
        asyncio.run(self._test_validate_code_valid(service))

    def test_validate_code_invalid_sync(self, service: TerminologyService):
        asyncio.run(self._test_validate_code_invalid(service))

    def test_get_terminology_info_sync(self, service: TerminologyService):
        asyncio.run(self._test_get_terminology_info(service))

    def test_batch_translate_sync(self, service: TerminologyService):
        asyncio.run(self._test_batch_translate(service))
