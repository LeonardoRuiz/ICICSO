# Validation

## Scope

The module validates these formal artifacts:

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

## Design

- JSON Schema files in `schemas/` define the machine-readable contract.
- Runtime interchange validators in [interchange.validator.ts](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/packages/evidence-intelligence/src/validators/interchange.validator.ts) validate the external `snake_case` payloads that mirror the schemas.
- Runtime domain validators in `src/validators/*.validator.ts` validate the internal `camelCase` runtime models.
- Adapters in [src/artifacts/adapters.ts](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/packages/evidence-intelligence/src/artifacts/adapters.ts) perform the explicit boundary conversion from interchange artifacts to runtime objects.
- Example payloads in `examples/valid` and `examples/invalid` serve as regression fixtures.

## Commands

From the repo root:

```bash
pnpm --dir packages/evidence-intelligence validate:examples
pnpm --dir packages/evidence-intelligence test:validation
pnpm --dir packages/evidence-intelligence test:contracts
pnpm --dir packages/evidence-intelligence typecheck
```

## Notes

- The JSON artifacts use `snake_case` as the interchange contract for ingestion and parsing workflows.
- The runtime domain models use `camelCase`; this is deliberate and now explicit rather than implicit.
- The validators are intentionally strict on required fields and enumerations to reject ambiguous payloads early.
- If future parsing stages produce partial payloads, they should validate against dedicated draft-stage schemas rather than weakening these contracts.
