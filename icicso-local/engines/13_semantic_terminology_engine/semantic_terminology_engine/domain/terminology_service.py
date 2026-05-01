"""
Terminology service for code translation and validation.
"""

from typing import List, Optional

import structlog

from ..core.database import get_db
from .models import (
    BatchTranslationRequest,
    BatchTranslationResponse,
    CodeMapping,
    TerminologyCode,
    TerminologyInfo,
    TerminologySystem,
    TranslationRequest,
    TranslationResponse,
    ValidationRequest,
    ValidationResponse,
)

logger = structlog.get_logger(__name__)


class TerminologyService:
    """Service for terminology operations."""

    def __init__(self):
        """Initialize the terminology service."""
        self._terminology_info = {
            TerminologySystem.SNOMED_CT: TerminologyInfo(
                system=TerminologySystem.SNOMED_CT,
                name="SNOMED CT",
                description="Systematized Nomenclature of Medicine Clinical Terms",
                version="International monthly; Spanish edition scheduled 2026-04-30",
            ),
            TerminologySystem.ICD_10: TerminologyInfo(
                system=TerminologySystem.ICD_10,
                name="ICD-10",
                description="International Classification of Diseases, 10th Revision",
                version="WHO 2019 ClaML local baseline",
            ),
            TerminologySystem.ICD_11: TerminologyInfo(
                system=TerminologySystem.ICD_11,
                name="ICD-11 MMS",
                description="International Classification of Diseases, 11th Revision MMS",
                version="2026-01",
            ),
            TerminologySystem.ICD_10_CM: TerminologyInfo(
                system=TerminologySystem.ICD_10_CM,
                name="ICD-10-CM",
                description="Clinical Modification of ICD-10 for United States diagnosis coding",
                version="FY 2026 / April 2026 update",
            ),
            TerminologySystem.ICD_10_PCS: TerminologyInfo(
                system=TerminologySystem.ICD_10_PCS,
                name="ICD-10-PCS",
                description="United States inpatient procedure coding system",
                version="FY 2026 / April 1 2026",
            ),
            TerminologySystem.LOINC: TerminologyInfo(
                system=TerminologySystem.LOINC,
                name="LOINC",
                description="Logical Observation Identifiers Names and Codes",
                version="2.82",
            ),
            TerminologySystem.RXNORM: TerminologyInfo(
                system=TerminologySystem.RXNORM,
                name="RxNorm",
                description="Normalized names for clinical drugs",
                version="2026-04-06",
            ),
            TerminologySystem.RXNORM_PRESCRIBABLE: TerminologyInfo(
                system=TerminologySystem.RXNORM_PRESCRIBABLE,
                name="RxNorm Prescribable Content",
                description="Prescribable subset of RxNorm",
                version="2026-04-06",
            ),
            TerminologySystem.ATC: TerminologyInfo(
                system=TerminologySystem.ATC,
                name="ATC",
                description="Anatomical Therapeutic Chemical Classification",
                version="2026",
            ),
            TerminologySystem.UCUM: TerminologyInfo(
                system=TerminologySystem.UCUM,
                name="UCUM",
                description="Unified Code for Units of Measure",
                version="latest local essence",
            ),
            TerminologySystem.HL7_THO: TerminologyInfo(
                system=TerminologySystem.HL7_THO,
                name="HL7 Terminology",
                description="HL7 CodeSystems, ValueSets, ConceptMaps and NamingSystems",
                version="7.1.0",
            ),
            TerminologySystem.HL7_FHIR_R5: TerminologyInfo(
                system=TerminologySystem.HL7_FHIR_R5,
                name="HL7 FHIR R5 Definitions",
                description="FHIR R5 resource, profile and terminology definitions",
                version="5.0.0",
            ),
            TerminologySystem.HCPCS_LEVEL_II: TerminologyInfo(
                system=TerminologySystem.HCPCS_LEVEL_II,
                name="HCPCS Level II",
                description="CMS alphanumeric procedure, supplies and services coding",
                version="April 2026",
            ),
            TerminologySystem.CPT: TerminologyInfo(
                system=TerminologySystem.CPT,
                name="CPT",
                description="AMA procedure and service terminology",
                version="2026",
            ),
            TerminologySystem.MESH: TerminologyInfo(
                system=TerminologySystem.MESH,
                name="MeSH",
                description="NLM biomedical thesaurus for indexing and discovery",
                version="2026",
            ),
            TerminologySystem.UNII_GSRS: TerminologyInfo(
                system=TerminologySystem.UNII_GSRS,
                name="UNII / GSRS",
                description="Unique substance identifiers and Global Substance Registration System",
                version="2026-04-13",
            ),
            TerminologySystem.UDI: TerminologyInfo(
                system=TerminologySystem.UDI,
                name="UDI",
                description="Unique Device Identification",
                version="2023",
            ),
        }

    async def translate_code(self, request: TranslationRequest) -> TranslationResponse:
        """Translate a code from one terminology system to another."""
        logger.info(
            "Translating code",
            source_system=request.source_code.system,
            source_code=request.source_code.code,
            target_system=request.target_system,
        )

        # For now, return a mock response
        # In a real implementation, this would query the database
        target_codes = []
        mappings = []

        # Mock translation logic - replace with actual database queries
        if request.source_code.system == TerminologySystem.SNOMED_CT:
            if request.target_system == TerminologySystem.ICD_10:
                # Mock SNOMED to ICD-10 mapping
                target_codes.append(TerminologyCode(
                    system=TerminologySystem.ICD_10,
                    code="I10",
                    display="Essential (primary) hypertension",
                ))
                mappings.append(CodeMapping(
                    source_system=request.source_code.system,
                    source_code=request.source_code.code,
                    target_system=request.target_system,
                    target_code="I10",
                    relationship_type="equivalent",
                    confidence_score=0.95,
                ))

        response = TranslationResponse(
            source_code=request.source_code,
            target_codes=target_codes,
            mappings=mappings if request.include_mappings else [],
            confidence_score=0.95 if target_codes else 0.0,
        )

        logger.info(
            "Translation completed",
            target_codes_found=len(target_codes),
            confidence_score=response.confidence_score,
        )

        return response

    async def validate_code(self, request: ValidationRequest) -> ValidationResponse:
        """Validate a terminology code."""
        logger.info(
            "Validating code",
            system=request.code.system,
            code=request.code.code,
        )

        # For now, basic validation - replace with actual database checks
        is_valid = True
        error_message = None
        suggestions = []

        # Mock validation logic
        if not request.code.code or len(request.code.code.strip()) == 0:
            is_valid = False
            error_message = "Code cannot be empty"

        # Add more validation rules based on terminology system
        if request.code.system == TerminologySystem.SNOMED_CT:
            if not request.code.code.isdigit():
                is_valid = False
                error_message = "SNOMED CT codes must be numeric"
                suggestions.append(TerminologyCode(
                    system=TerminologySystem.SNOMED_CT,
                    code="73211009",
                    display="Diabetes mellitus (disorder)",
                ))

        response = ValidationResponse(
            is_valid=is_valid,
            code=request.code,
            error_message=error_message,
            suggestions=suggestions,
        )

        logger.info(
            "Validation completed",
            is_valid=is_valid,
            has_suggestions=len(suggestions) > 0,
        )

        return response

    async def get_terminology_info(self, system: Optional[TerminologySystem] = None) -> List[TerminologyInfo]:
        """Get information about terminology systems."""
        if system:
            info = self._terminology_info.get(system)
            return [info] if info else []

        return list(self._terminology_info.values())

    async def batch_translate(self, request: BatchTranslationRequest) -> BatchTranslationResponse:
        """Perform batch code translation."""
        logger.info("Starting batch translation", batch_size=len(request.requests))

        results = []
        errors = []

        for i, translation_request in enumerate(request.requests):
            try:
                result = await self.translate_code(translation_request)
                results.append(result)
            except Exception as e:
                logger.error(
                    "Batch translation error",
                    index=i,
                    error=str(e),
                    source_code=translation_request.source_code.code,
                )
                errors.append({
                    "index": i,
                    "error": str(e),
                    "source_code": translation_request.source_code.code,
                })

        response = BatchTranslationResponse(
            results=results,
            total_processed=len(request.requests),
            errors=errors,
        )

        logger.info(
            "Batch translation completed",
            successful=len(results),
            errors=len(errors),
        )

        return response
