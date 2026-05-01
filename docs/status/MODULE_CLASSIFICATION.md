# MODULE CLASSIFICATION

## A. Canónico / conservar

### 1. `icicso/`

Motivo:

- es el árbol más consistente;
- tiene tests pasando;
- concentra el emulador canónico y el `shared-kernel` más claro.

Estado:

- conservar;
- usar como canon de desarrollo nuevo.

### 2. `services/ingestion-orquestador/`

Motivo:

- backend Python real;
- pruebas pasan;
- útil para soporte documental y catálogo.

Estado:

- conservar;
- integrar mejor o aislar mejor, pero no eliminar.

### 3. `config/`, `infra/`, `.github/workflows/`, `scripts/` base

Motivo:

- contienen operación real;
- launchers y contratos de configuración sí están conectados al runtime local.

Estado:

- conservar;
- depurar inconsistencias, no borrar en bloque.

## B. Reparar / refactorizar

### 1. `icicso-local/`

Motivo:

- alto valor operativo;
- múltiples servicios con código real;
- arranque oficial roto por inconsistencia interna.

Problemas verificados:

- `audit-service` no compila en flujo oficial.
- `turbo` falla en `typecheck`.
- `packages/event-bus` incompleto.
- `infrastructure/` y `shared/` vacíos.
- README sobredimensiona madurez real.

Acción:

- reparar;
- mantener como runtime demo mientras se sanea.

### 2. `08_Plataforma_Digital/icicso-foundation/`

Motivo:

- tiene código útil;
- API y web existen;
- falla por dependencias y tipado, no por ausencia total de implementación.

Problemas verificados:

- ausencia de `@icicso/shared-kernel` resoluble.
- bounded contexts no cierran.

Acción:

- refactorizar solo si seguirá teniendo rol;
- si no, extraer valor y pasar a cuarentena.

### 3. `packages/evidence-intelligence/`

Motivo:

- tiene cuerpo real;
- no está claramente integrado al canon.

Acción:

- decidir si se integra a `icicso/` o se aísla como librería independiente.

## C. Deprecar / mandar a cuarentena

### 1. `domain/`

Motivo:

- referencia rica pero muy duplicada;
- compite semánticamente con `icicso/` y con `icicso-foundation/`.

Acción:

- congelar como referencia;
- extraer solo piezas útiles.

### 2. `engines/`

Motivo:

- árbol de referencia;
- sin pipeline corrible oficial;
- compite por atención sin demostrar ser la ruta activa.

Acción:

- cuarentena documental/técnica.

### 3. `_quarantine/`

Motivo:

- explícitamente fuera del pipeline real.

Acción:

- mantener fuera del discurso de calidad;
- no promover como señal de salud del sistema.

### 4. `tools/desktop-launcher/ICICSO-Local.html`

Motivo:

- útil como acceso visual;
- no debe tratarse como producto central.

Acción:

- mantener solo como wrapper secundario.

## D. Eliminar

No ejecutar todavía en esta pasada. Lista objetivo para la siguiente intervención controlada:

### 1. Directorios top-level vacíos

- `00_Inbox/`
- `analytics/`
- `apps/`
- `client-ops/`
- `integrations/`
- `legal/`
- `simulation/`

### 2. Vacíos internos sin función real

- `icicso-local/infrastructure/`
- `icicso-local/shared/`

### 3. Artefactos/caches/logs que no deben vivir como estructura de producto

- `logs/` históricos no vigentes
- `dist/` regenerable
- `.pytest_cache`
- `.ruff_cache`
- `.turbo`
- `.pnpm-store`
- `uvicorn.out.log`
- `uvicorn.err.log`
- `rustup-init.exe`

### 4. Placeholders mínimos sin rol claro

- `icicso/apps/api` si no se activa en la siguiente pasada
- wrappers `index.ts` de una sola línea en árboles legacy donde no haya importadores reales

## Módulo canónico cuando compiten versiones

- `shared-kernel` canónico:
  - `icicso/packages/shared-kernel/`
- emulador canónico:
  - `icicso/apps/emulator/`
- runtime local multi-servicio:
  - `icicso-local/`
- backend documental real:
  - `services/ingestion-orquestador/`
- foundation alterno:
  - `08_Plataforma_Digital/icicso-foundation/` como no-canónico

## Zonas mayores

Zona de mayor deuda técnica:

- `08_Plataforma_Digital/icicso-foundation/`

Zona de mayor desconexión:

- `domain/`

Zona de mayor simulación/maquillaje:

- root del repo más README(s) que presentan convergencia cerrada sin que el runtime principal y el foundation estén realmente sanos.
