# SER to EO Mapper v1

## Scope

The mapper converts one `StructuredEvidenceRecord` statement into one executable `EvidenceObject`.

## Base inference rules

- `trigger`: derived from `clinicalDomain` + primary `clinicalFunction`
- `conditions`: primary statement conditions, otherwise population inclusion criteria
- `exclusions`: primary statement exclusions, otherwise population exclusion criteria
- `decision`:
  - `benefit` + strong evidence -> `recommend`
  - `benefit` + weaker evidence -> `consider`
  - `harm` or `no-benefit` -> `avoid`
  - `mixed` or `inconclusive` -> `defer_to_review`
- `actions`: derived from intervention class plus statement/intervention label
- `expectedOutcomes`: statement outcomes when available
- `confidence`: derived from certainty, strength, applicability and evidence age

## Escalation rules

- guideline and consensus receive a positive source-priority bonus
- older evidence reduces confidence
- low applicability reduces confidence
- mixed or inconclusive direction creates explicit conflict markers
- insufficient strength or certainty forces `needs-human-review`

## New EO fields

- `evidenceSupport`: normalized support bundle for the primary source chain
- `operationalConstraintBundle`: summarized hard constraints and required resources
- `inferenceTrace`: ordered rationale trail for generated fields
- `conflicts`: explicit conflict markers; the mapper does not resolve silently
- `reviewMetadata.reviewState`: `auto-approved` or `needs-human-review`

## Test cases

- guideline de revascularizacion
- ERAS perioperatorio
- RCT terapeutico
- estudio observacional con aplicabilidad limitada
- evidencia inconclusiva

Implemented in [mapping.test.ts](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/packages/evidence-intelligence/tests/mapping.test.ts).

## Known limits of v1

- one SER statement maps to one EO at a time
- no multi-source reconciliation yet
- no comparator-specific action branching yet
- no numeric effect-threshold policies yet
- evidence age uses provenance capture date as a proxy until publication-date is propagated into SER runtime models
