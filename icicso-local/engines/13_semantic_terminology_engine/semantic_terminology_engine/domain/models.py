"""
Domain models for the Semantic Terminology Engine.
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class TerminologySystem(str, Enum):
    """Supported healthcare terminology systems."""

    SNOMED_CT = "SNOMED_CT"
    ICD_10 = "ICD_10"
    ICD_11 = "ICD_11"
    ICD_10_CM = "ICD_10_CM"
    ICD_10_PCS = "ICD_10_PCS"
    LOINC = "LOINC"
    RXNORM = "RXNORM"
    RXNORM_PRESCRIBABLE = "RXNORM_PRESCRIBABLE"
    ATC = "ATC"
    UCUM = "UCUM"
    HL7_THO = "HL7_THO"
    HL7_FHIR_R5 = "HL7_FHIR_R5"
    HCPCS_LEVEL_II = "HCPCS_LEVEL_II"
    CPT = "CPT"
    MESH = "MESH"
    UNII_GSRS = "UNII_GSRS"
    UDI = "UDI"


class CodeMapping(BaseModel):
    """A mapping between terminology codes."""

    source_system: TerminologySystem
    source_code: str
    target_system: TerminologySystem
    target_code: str
    relationship_type: str = Field(default="equivalent", description="Type of mapping relationship")
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence in the mapping")
    version: Optional[str] = Field(default=None, description="Terminology version this mapping applies to")


class TerminologyCode(BaseModel):
    """A code in a specific terminology system."""

    system: TerminologySystem
    code: str
    display: Optional[str] = Field(default=None, description="Human-readable display name")
    version: Optional[str] = Field(default=None, description="Terminology version")


class TranslationRequest(BaseModel):
    """Request to translate a code to another terminology system."""

    source_code: TerminologyCode
    target_system: TerminologySystem
    include_mappings: bool = Field(default=True, description="Include detailed mapping information")


class TranslationResponse(BaseModel):
    """Response from a terminology translation."""

    source_code: TerminologyCode
    target_codes: list[TerminologyCode] = Field(default_factory=list)
    mappings: list[CodeMapping] = Field(default_factory=list)
    confidence_score: float = Field(default=0.0, ge=0.0, le=1.0)


class ValidationRequest(BaseModel):
    """Request to validate a terminology code."""

    code: TerminologyCode


class ValidationResponse(BaseModel):
    """Response from code validation."""

    is_valid: bool
    code: TerminologyCode
    error_message: Optional[str] = None
    suggestions: list[TerminologyCode] = Field(default_factory=list)


class TerminologyInfo(BaseModel):
    """Information about a terminology system."""

    system: TerminologySystem
    name: str
    description: str
    version: Optional[str] = None
    total_codes: Optional[int] = None
    last_updated: Optional[str] = None


class BatchTranslationRequest(BaseModel):
    """Request for batch code translation."""

    requests: list[TranslationRequest] = Field(default_factory=list, max_length=1000)


class BatchTranslationResponse(BaseModel):
    """Response from batch translation."""

    results: list[TranslationResponse]
    total_processed: int
    errors: list[dict] = Field(default_factory=list)
