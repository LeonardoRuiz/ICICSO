# ICICSO Semantic Terminology Engine

A Python-based service for canonical terminology normalization and cross-mapping between healthcare coding systems.

## Overview

This engine provides:
- **Terminology Normalization**: Standardize codes across SNOMED CT, ICD-10, LOINC, RxNorm, ATC, UDI
- **Cross-Mapping**: Bidirectional translation between coding systems
- **Version Management**: Track terminology versions with VRN (Versioning Record Numbers)
- **Validation**: Ensure code validity and semantic consistency

## Architecture

- **FastAPI** web framework for REST API
- **PostgreSQL** for terminology storage and mapping tables
- **Pydantic** for data validation and serialization
- **Redis** for caching frequent lookups

## API Endpoints

- `GET /terminology/translate/{code}` - Translate code to canonical form
- `POST /terminology/validate` - Validate code against terminology
- `GET /terminology/systems` - List supported coding systems
- `POST /terminology/batch-translate` - Bulk translation operations

## Supported Systems

| System | Description | Use Case |
|--------|-------------|----------|
| SNOMED CT | Clinical terminology | Diagnoses, procedures, findings |
| ICD-10 | International classification | Billing, epidemiology |
| LOINC | Laboratory observations | Lab test results |
| RxNorm | Drug terminology | Medications |
| ATC | Anatomical classification | Drug classification |
| UDI | Unique device identifiers | Medical devices |

## Development

```bash
# Install dependencies
pip install -e .

# Run development server
uvicorn semantic_terminology_engine.main:app --reload

# Run tests
pytest
```

## Data Sources

Terminology data is loaded from:
- Official SNOMED CT release files
- WHO ICD-10 mappings
- LOINC database exports
- RxNorm data dumps
- ATC classification tables
- FDA UDI database