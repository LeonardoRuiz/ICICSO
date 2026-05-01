# shared-kernel

Núcleo canónico transversal de ICICSO.

## Estructura

- `src/ids`: identificadores base y factories tipadas
- `src/enums`: enums y estados canónicos compartidos
- `src/contracts`: contratos transversales reutilizables
- `src/audit`: helpers de auditoría
- `src/provenance`: helpers de procedencia
- `src/hash`: integridad y canonicalización
- `src/state`: estado de caso reutilizable

## Qué exporta

- IDs base: `VRN`, `ILC`, `case_id`, `ser_id`, `eo_id`, `cpo_id`, `bom_id`, `tam_id`, `evt_id`, `gate_id`, `cae_id`, `esl_id`, `outcome_id`, `drift_id`, `device_udi`
- Enums base: evidencia, madurez, fases clínicas, severidad de evento, incertidumbre, BOM, snapshots y estados de caso
- Contratos: `AuditMetadata`, `ProvenanceMetadata`, `HashMetadata`, `VersionedEntity`, `AppendOnlyRecord`, `TimestampedEntity`, `RepoPathReference`, `RiskNote`, `DependencyReference`
- Utilidades: creación de IDs, metadata de auditoría, metadata de procedencia, metadata hash y `CaseRuntimeState`

## Regla operativa

Todo módulo nuevo del continuum debe depender de este paquete para semántica base antes de inventar tipos locales.
