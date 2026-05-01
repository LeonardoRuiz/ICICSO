# Connection Fixes

Fecha: 2026-04-05

## Cambios ejecutados

- unificación del tipo de auditoría en `icicso-local/packages/database/src/block1-store.ts` con `AuditEventType`
- bootstrap de entorno corregido en `scripts/start-icicso-mockup.ps1`
- gateway por defecto corregido en `icicso-local/apps/desktop-emulator`
- migración automática del valor legacy `origin/api` al gateway real `http://127.0.0.1:3100`
- healthchecks del launcher separados entre liveness y readiness para `gateway-api` e `ingestion-service`
- doctor actualizado para distinguir `runtime-state` activo frente a `runtime-state` stale

## Resultado

- `.\scripts\start-icicso-mockup.ps1 -PrepareOnly` pasa
- `.\scripts\start-icicso-mockup.ps1 -NoBuild -NoBrowser` completa startup del mockup
- `icicso-local` vuelve a cerrar build integral

## Bloqueos que siguen fuera

- readiness degradado si falta infraestructura externa
- `_archive/noncanonical/08_Plataforma_Digital/icicso-foundation/` sigue fuera de la ruta de arranque canónica
