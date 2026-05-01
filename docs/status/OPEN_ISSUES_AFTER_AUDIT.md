# Open Issues After Audit

Fecha base: 2026-04-05

## Prioridad 1

- `icicso-local/apps/audit-service/src/index.ts:64`
  - el build integral falla por taxonomía de `eventType` más amplia que la aceptada por persistencia.
- `scripts/start-icicso-mockup.ps1`
  - el launcher principal sigue dependiendo de que todo `icicso-local` compile.

## Prioridad 2

- `08_Plataforma_Digital/icicso-foundation/`
  - sigue visible en root aunque el workspace no pasa build.
- `services/ingestion-orquestador/.pytest_cache/`
  - persiste warning por problema de cache/permisos.
- `icicso-local/engines/13_semantic_terminology_engine/.pytest_cache/`
  - cache residual con bloqueo de permisos.

## Prioridad 3

- existen documentos históricos o de diseño en `docs/architecture/` que siguen siendo referencia, no estado operativo;
- `icicso/apps/api` sigue siendo scaffold;
- varios paquetes del continuum canónico siguen en estado descriptor o esqueleto.

## Regla de lectura

- si un documento contradice a [START_HERE.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/START_HERE.md) o a [SYSTEM_STATUS.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/SYSTEM_STATUS.md), el documento secundario es el que está desactualizado.
