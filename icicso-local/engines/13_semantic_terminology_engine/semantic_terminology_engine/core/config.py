"""
Core configuration for the Semantic Terminology Engine.
"""

import os
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = Field(
        default="postgresql://icicso:password@localhost:5432/icicso_local"
    )

    # Redis
    redis_url: str = Field(
        default="redis://localhost:6379"
    )

    # API
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=8000)

    # Environment
    environment: str = Field(default="development")
    log_level: str = Field(default="INFO")

    # Terminology settings
    supported_systems: list[str] = [
        "SNOMED_CT",
        "ICD_10",
        "ICD_11",
        "ICD_10_CM",
        "ICD_10_PCS",
        "LOINC",
        "RXNORM",
        "RXNORM_PRESCRIBABLE",
        "ATC",
        "UCUM",
        "HL7_THO",
        "HL7_FHIR_R5",
        "HCPCS_LEVEL_II",
        "CPT",
        "MESH",
        "UNII_GSRS",
        "UDI"
    ]

    # Cache settings
    cache_ttl_seconds: int = Field(default=3600)  # 1 hour

    # External services (for future integration)
    snomed_api_url: Optional[str] = Field(default=None)
    loinc_api_url: Optional[str] = Field(default=None)

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )


# Global settings instance
settings = Settings()
