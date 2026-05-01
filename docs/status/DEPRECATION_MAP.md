# DEPRECATION MAP

## Cuarentena formal

Ruta:

- `_archive/deprecated_audit_20260405/`

## Mapa de reubicación

| Antes | Después | Estado |
| --- | --- | --- |
| `domain/` | `_archive/deprecated_audit_20260405/legacy_reference/domain/` | archivado |
| `engines/` | `_archive/deprecated_audit_20260405/legacy_reference/engines/` | archivado |
| `_quarantine/` | `_archive/deprecated_audit_20260405/legacy_reference/_quarantine/` | archivado |
| `03_Outputs/` | `_archive/deprecated_audit_20260405/outputs_historical/03_Outputs/` | archivado |
| `docs/00_repo_audit/` | `_archive/deprecated_audit_20260405/historical_docs/docs_00_repo_audit/` | archivado |
| `docs/audits/` | `_archive/deprecated_audit_20260405/historical_docs/docs_audits/` | archivado |
| `AUDIT_REPO_MASTER.md` | `_archive/deprecated_audit_20260405/historical_docs/AUDIT_REPO_MASTER.md` | archivado |
| `99_Archivo_Historico/` | `_archive/deprecated_audit_20260405/historical_docs/99_Archivo_Historico/` | archivado |
| `ICICSO Canon Emulator.lnk` | `_archive/deprecated_audit_20260405/obsolete_launchers/ICICSO Canon Emulator.lnk` | archivado |
| `ICICSO Mockup Local.lnk` | `_archive/deprecated_audit_20260405/obsolete_launchers/ICICSO Mockup Local.lnk` | archivado |
| `icicso-local/packages/event-bus/` | `_archive/deprecated_audit_20260405/partial_modules/icicso-local_event-bus/` | archivado |

## Eliminación directa

| Elemento | Motivo |
| --- | --- |
| `00_Inbox/` | vacío |
| `analytics/` | vacío |
| `apps/` | vacío |
| `client-ops/` | vacío |
| `integrations/` | vacío |
| `legal/` | vacío |
| `simulation/` | vacío |
| `icicso-local/infrastructure/` | vacío |
| `icicso-local/shared/` | vacío |
| `logs/` | artefacto regenerable |
| `dist/` | artefacto regenerable |
| `.pnpm-store/` | cache regenerable |
| `rustup-init.exe` | residuo ajeno al producto |
| `services/ingestion-orquestador/build/` | build regenerable |
| `services/ingestion-orquestador/icicso_software_orquestador.egg-info/` | metadata regenerable |
| `services/ingestion-orquestador/uvicorn.out.log` | log residual |
| `services/ingestion-orquestador/uvicorn.err.log` | log residual |
| `icicso-local/.turbo/` | cache regenerable |
| `08_Plataforma_Digital/icicso-foundation/.pnpm-store/` | cache regenerable |
| `08_Plataforma_Digital/icicso-foundation/.turbo/` | cache regenerable |

## Pendientes de deprecación o limpieza adicional

| Elemento | Motivo para no ejecutar ya |
| --- | --- |
| `08_Plataforma_Digital/icicso-foundation/` | recuperable y con cambios abiertos |
| `services/ingestion-orquestador/.pytest_cache/` | bloqueo de permisos |
| `services/ingestion-orquestador/.ruff_cache/` | bloqueo de permisos |
| `icicso-local/engines/13_semantic_terminology_engine/.pytest_cache/` | bloqueo de permisos |
| `C:\Users\leona\OneDrive\Desktop\ICICSO Local` | fuera del workspace de escritura |
