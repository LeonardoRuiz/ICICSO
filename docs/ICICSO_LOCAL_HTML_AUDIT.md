# ICICSO Local HTML Audit (Non Plus Ultra)

Checklist de conexiones y puntos de entrada HTML.

## Rutas principales (click recomendado)

- `icicso-local/apps/desktop-emulator/repo-html-hub.html`
- `dashboard/index.html`
- `dashboard/document-ingestion.html`
- `icicso/apps/emulator/index.html`
- `icicso-local/apps/desktop-emulator/index.html`
- `icicso-local/apps/desktop-emulator/audit-links.html`

## Health y auditoría (runtime local)

- `http://127.0.0.1:3100/health` (gateway)
- `http://127.0.0.1:3100/block1/overview`
- `http://127.0.0.1:3100/audit/events`

## Ingesta (orquestador)

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/api/source-documents/nomenclature`
- `http://127.0.0.1:8000/api/source-documents/ingestions/feed`
- `http://127.0.0.1:8000/api/source-documents/governance/feed`

## Evidencia HTML

- `evidence/cabg_non_plus_ultra/processed/`
- `evidence/cabg_non_plus_ultra/raw/landing_pages/`

## Estado

- `SYSTEM_STATUS.md`
- `RUNBOOK_LOCAL.md`
