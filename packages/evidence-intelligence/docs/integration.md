# Integration

## Module role in ICICSO

`evidence-intelligence` is the canonical evidence domain package.

It must be consumed by other domains through stable contracts, not by reaching into implementation folders.

## Allowed dependency directions

- parsing / ingestion -> `contracts`, `validators`, `models`
- terminology mapping -> `contracts`, `models`
- route engine -> `contracts`, `models`
- orchestration engine -> `contracts`, `models`
- audit trail -> `contracts`
- admin UI -> `contracts`, `models`

## Disallowed dependency directions

- no external module should depend on `tools/`, `tests/`, `examples/` or `dist/`
- no other domain should import individual internal files below `src/` when a barrel export exists
- route and orchestration domains should not call ontology files directly if typed interfaces already cover the need

## Public entrypoints

- package root: general use
- `/contracts`: cross-domain boundary contracts
- `/models`: stable runtime types
- `/validators`: artifact validation
- `/mappers`: SER to EO transformation
- `/api`: facade for common module operations

## Extension points

- `ParsingIngestionPort`
- `TerminologyMappingPort`
- `RouteEnginePort`
- `OrchestrationEnginePort`
- `AuditTrailPort`
- `AdminReviewPort`

## Known boundary limits

- this package emits domain artifacts, not UI view models
- this package emits route/orchestration projections only through contracts, not implementations
- audit storage and queueing remain external concerns
