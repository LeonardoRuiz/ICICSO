# ICICSO Evidence Intelligence

Evidence Intelligence is the canonical bounded context for clinical and surgical evidence inside ICICSO.

It resolves:

- evidence domain normalization
- ontology and controlled vocabulary publication
- artifact validation for intake and downstream use
- transformation from `StructuredEvidenceRecord` (`SER`) to executable `EvidenceObject` (`EO`)
- conflict signaling, confidence shaping and review escalation

## What goes in

Primary inputs:

- external interchange artifacts in `snake_case` for ingestion/parsing boundaries
- normalized runtime `EvidenceDocument`
- `EvidenceSource`
- `EvidenceClassification`
- `StructuredEvidenceRecord`
- ontology catalogs and controlled classification values

Upstream producers expected by the architecture:

- document ingestion
- parsing / extraction
- evidence classification
- terminology services

## What comes out

Primary outputs:

- validated evidence artifacts
- executable `EvidenceObject`
- inference traces
- evidence support bundles
- operational constraint bundles
- review escalation signals for admin governance

## What the module validates

The module validates:

- interchange artifacts at the boundary: `snake_case`
- `EvidenceDocument`
- `EvidenceSource`
- `EvidenceClassification`
- `SER`
- `EO`
- `Provenance`
- `Applicability`
- `OperationalContext`
- `ConflictRule`
- `ReviewMetadata`
- ontology catalog consistency

## Public import surface

Recommended imports:

```ts
import { evidenceIntelligenceFacade } from "@icicso/evidence-intelligence";
import type { ParsingIngestionPort, RouteEnginePort } from "@icicso/evidence-intelligence/contracts";
import type { StructuredEvidenceRecord, EvidenceObject } from "@icicso/evidence-intelligence/models";
import type { EvidenceDocumentArtifact } from "@icicso/evidence-intelligence/artifacts";
import { mapSerToEoWithInferences } from "@icicso/evidence-intelligence/mappers";
```

Public subpaths:

- `@icicso/evidence-intelligence`
- `@icicso/evidence-intelligence/api`
- `@icicso/evidence-intelligence/contracts`
- `@icicso/evidence-intelligence/models`
- `@icicso/evidence-intelligence/artifacts`
- `@icicso/evidence-intelligence/validators`
- `@icicso/evidence-intelligence/mappers`
- `@icicso/evidence-intelligence/seeds`

## Boundary model

- External interchange payloads use `snake_case` and are validated by the interchange validators.
- Internal runtime models use `camelCase` and feed the mapper and downstream engines.
- The facade exposes both layers explicitly; callers should not assume the same validator handles both shapes.

## Integration with the rest of ICICSO

Expected continuum:

1. ingestion/parsing normalizes source artifacts into `EvidenceDocument`
2. classification maps the source into evidence ontology codes
3. curation or extraction produces `SER`
4. Evidence Intelligence maps `SER -> EO`
5. route engine projects `EO` into pathway / route logic
6. orchestration engine evaluates `EO` against case context
7. audit trail records evidence lifecycle events
8. admin review UI consumes `reviewMetadata`, `conflicts` and `inferenceTrace`

## Integration contracts

The module publishes minimal ports for:

- parsing / ingestion
- terminology mapping
- route engine
- orchestration engine
- audit trail
- UI / admin review

These contracts live in [src/contracts/integration.ts](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/packages/evidence-intelligence/src/contracts/integration.ts).

## Dependency rules

- `contracts` depends only on stable domain models
- `api` depends on validators and mappers
- `artifacts` defines the external interchange contract and adapters into runtime models
- `mappers` depend on models and validators
- downstream engines should depend on `contracts` and `models`, not on validator internals
- no external domain should import from `tools`, `tests` or `examples`

## What this module does not solve yet

- raw document parsing
- OCR / PDF extraction
- full terminology resolution against live vocab services
- multi-source evidence reconciliation
- route generation itself
- runtime orchestration itself
- persistent audit storage
- admin UI implementation

## Technical docs

- [architecture.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/packages/evidence-intelligence/docs/architecture.md)
- [ontology-v1.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/packages/evidence-intelligence/docs/ontology-v1.md)
- [validation.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/packages/evidence-intelligence/docs/validation.md)
- [eo-mapper-v1.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/packages/evidence-intelligence/docs/eo-mapper-v1.md)

## Current limits

- one primary SER statement is mapped to one EO at a time
- conflict handling is explicit but still local to one SER
- cross-document consolidation is a future layer
- publication-date-aware evidence decay still needs to be propagated end-to-end

## Next exact build step

Build the ingestion adapter that transforms parsing output into `EvidenceDocument` and `SER`, then calls the mapper facade and pushes resulting `EO` objects into the route engine boundary.
