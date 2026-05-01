# Dashboard Link Validation

Fecha de validación: 2026-04-06

## Alcance

Validación integral del punto de entrada operativo local después de las reparaciones:

- dashboard raíz del repo;
- links del dashboard del escritorio;
- launchers de escritorio;
- assets;
- rutas del repo y del escritorio;
- consistencia entre dashboard, repo y documentación;
- revalidación después de correcciones.

## Resumen ejecutivo

Estado final:

- dashboard raíz del repo: `ok`
- dashboard del mockup: `ok`
- canon emulator: `ok`
- block1 overview: `ok`
- launchers del escritorio: `ok`
- assets del escritorio: `ok`
- rutas documentales y de reportes: `ok`
- consistencia repo/dashboard/docs: `ok`
- gateway `ready` (`http://127.0.0.1:3100/health`): `warn esperado`

El único `warn` final no es un link muerto. Corresponde a `http://127.0.0.1:3100/health`, que en este runtime representa `ready` y devuelve `503` cuando el stack corre en modo degradado sin infraestructura externa. El enlace sigue siendo correcto y útil como señal de readiness.

## Correcciones aplicadas antes de revalidar

### Scripts corregidos

- `scripts/Open-ICICSO.ps1`
  - se agregó `-ResolveOnly` real y serialización JSON estable;
  - se corrigió la resolución del escritorio para `Desktop` y `OneDrive\Desktop`;
  - se corrigió el bug de `param(...)` fuera de posición.
- `scripts/Validate-DashboardLinks.ps1`
  - se creó el validador integral;
  - se corrigió la resolución del escritorio;
  - se corrigió el parseo de la salida JSON de `Open-ICICSO.ps1`;
  - se agregó control defensivo si un target no resuelve.
- `scripts/Sync-DesktopHub.ps1`
  - se corrigió la resolución del escritorio;
  - se corrigió la generación del cockpit HTML;
  - se corrigió la conversión `file://`;
  - se limpió la salida documental generada;
  - se movieron wrappers legacy a `_archive`.

### Estructura y fuente de verdad

- `config/runtime/desktop-hub.json`
  - manifest canónico de launchers, docs, reportes y operaciones.
- `tools/desktop-launcher/ICICSO-Local.html`
  - degradado a landing mínima para no competir como cockpit paralelo.
- `C:\Users\leona\OneDrive\Desktop\ICICSO Local`
  - regenerada desde el repo con estructura limpia.

## Matriz de validación de links del dashboard

Fuente validada:

- `dashboard/index.html`
- `C:\Users\leona\OneDrive\Desktop\ICICSO Local\01_Start_Here\ICICSO Local Cockpit.html`

### Estado final

| Link | Destino | Resultado |
| --- | --- | --- |
| Dashboard raíz -> Mockup local | `http://127.0.0.1:8090/index.html` | `ok` HTTP 200 |
| Dashboard raíz -> Canon emulator | `http://127.0.0.1:8098/index.html` | `ok` HTTP 200 |
| Dashboard raíz -> Gateway readiness | `http://127.0.0.1:3100/health` | `warn` HTTP 503 esperado en modo degradado |
| Dashboard raíz -> Block1 overview | `http://127.0.0.1:3100/block1/overview` | `ok` HTTP 200 |
| Dashboard raíz -> START_HERE | `../START_HERE.md` | `ok` |
| Dashboard raíz -> SYSTEM_STATUS | `../SYSTEM_STATUS.md` | `ok` |
| Dashboard raíz -> dashboard-reality manifest | `../config/runtime/dashboard-reality.json` | `ok` |
| Abrir mockup dashboard | `http://127.0.0.1:8090/index.html` | `ok` HTTP 200 |
| Abrir gateway health | `http://127.0.0.1:3100/health` | `warn` HTTP 503 esperado en modo degradado |
| Abrir START_HERE | `file:///.../START_HERE.md` | `ok` |
| Open Mockup Dashboard | `http://127.0.0.1:8090/index.html` | `ok` HTTP 200 |
| Open Canon Emulator | `http://127.0.0.1:8098/index.html` | `ok` HTTP 200 |
| Open Gateway Health | `http://127.0.0.1:3100/health` | `warn` HTTP 503 esperado |
| Open Block1 Overview | `http://127.0.0.1:3100/block1/overview` | `ok` HTTP 200 |
| Open Useful Logs Folder | `file:///.../logs` | `ok` |
| Open Docker Compose Source | `file:///.../icicso-local/docker-compose.yml` | `ok` |
| Open Evidence Assets | `file:///.../evidence` | `ok` |
| Open START_HERE Repo | `file:///.../START_HERE.md` | `ok` |
| Open SYSTEM_STATUS | `file:///.../SYSTEM_STATUS.md` | `ok` |
| Open NEXT_ACTIONS | `file:///.../NEXT_ACTIONS.md` | `ok` |
| Open Local Development Runbook | `file:///.../docs/local-development.md` | `ok` |
| Open AUDIT_REPORT | `file:///.../AUDIT_REPORT.md` | `ok` |
| Open SYSTEM_MAP | `file:///.../SYSTEM_MAP.md` | `ok` |
| Open CLEANUP_DECISIONS | `file:///.../CLEANUP_DECISIONS.md` | `ok` |
| Open MODULE_CLASSIFICATION | `file:///.../MODULE_CLASSIFICATION.md` | `ok` |

## Validación de launchers de escritorio

Fuente validada:

- `config/runtime/desktop-hub.json`
- `C:\Users\leona\OneDrive\Desktop\ICICSO Local\02_Launchers\*.cmd`
- `scripts/Open-ICICSO.ps1 -ResolveOnly`

### Resultado

| Launcher | Resultado | Destino resuelto |
| --- | --- | --- |
| Open Repo ICICSO | `ok` | `C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO` |
| Start Mockup Local | `ok` | `Launch-ICICSO-Continuum.cmd` |
| Prepare Mockup Build | `ok` | `scripts/Initialize-ContinuumLocal.ps1` |
| Run Continuum Doctor | `ok` | `scripts/Invoke-ContinuumDoctor.ps1` |
| Start Canon Emulator | `ok` | `scripts/start-icicso-canon-emulator.bat` |
| Stop Mockup Local | `ok` | `scripts/stop-icicso-mockup.ps1` |
| Stop Canon Emulator | `ok` | `scripts/stop-icicso-canon-emulator.bat` |

## Validación de assets

Fuente validada:

- `C:\Users\leona\OneDrive\Desktop\ICICSO Local\06_Assets`

### Resultado

| Asset | Resultado |
| --- | --- |
| `folder.svg` | `ok` |
| `launch.svg` | `ok` |
| `report.svg` | `ok` |

Observación:

- los assets existen y no están rotos;
- el cockpit actual no depende de ellos para funcionar;
- hoy actúan como assets de soporte, no como dependencia crítica.

## Validación de rutas

### Rutas de repo validadas

| Ruta | Resultado |
| --- | --- |
| `START_HERE.md` | `ok` |
| `SYSTEM_STATUS.md` | `ok` |
| `NEXT_ACTIONS.md` | `ok` |
| `docs/local-development.md` | `ok` |
| `AUDIT_REPORT.md` | `ok` |
| `SYSTEM_MAP.md` | `ok` |
| `CLEANUP_DECISIONS.md` | `ok` |
| `MODULE_CLASSIFICATION.md` | `ok` |
| `icicso-local/docker-compose.yml` | `ok` |
| `logs/` | `ok` |
| `evidence/` | `ok` |

### Rutas de producto validadas

| URL | Resultado |
| --- | --- |
| `http://127.0.0.1:8090/index.html` | `ok` HTTP 200 |
| `http://127.0.0.1:8098/index.html` | `ok` HTTP 200 |
| `http://127.0.0.1:3100/block1/overview` | `ok` HTTP 200 |
| `http://127.0.0.1:3100/health` | `warn` HTTP 503 esperado |

## Validación de consistencia entre dashboard, repo y docs

### Resultado

| Chequeo | Resultado |
| --- | --- |
| mockup dashboard oficial en `8090` | `ok` |
| gateway health oficial en `3100/health` | `ok` |
| dashboard raíz sin `href="#"` | `ok` |
| dashboard raíz sin puertos legacy como entrada oficial | `ok` |
| dashboard raíz solo usa estados permitidos | `ok` |
| dashboard raíz enlaza `SYSTEM_STATUS.md` y `dashboard-reality.json` | `ok` |
| docs del hub apuntan a `START_HERE.md` | `ok` |
| launcher HTML del repo ya no compite como segundo cockpit | `ok` |
| carpeta del escritorio generada desde manifest del repo | `ok` |
| wrappers legacy movidos a `_archive` | `ok` |

### Consistencia observada

- el punto de entrada operativo del usuario ya es la carpeta `ICICSO Local` del escritorio;
- el repo define la fuente de verdad de los accesos;
- el cockpit del escritorio y los `.cmd` se generan desde el mismo manifest;
- las rutas documentales y operativas coinciden con el estado actual del repo.

## Revalidación del runtime local

### Arranque host real

Se arrancó el mockup real fuera del sandbox con:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\scripts\start-icicso-mockup.ps1' -NoBuild -NoBrowser
```

### Doctor host real

Resultado principal:

- `runtime-state.json`: `17 procesos activos`
- gateway: `LIVE`
- auth, identity, audit, storage, terminology, governance, evidence-lake, ghl, kbol, runbook, readiness, case-control, systemic-risk, cqoi: `OK`
- emulator `8090`: `OK`
- infraestructura externa `5432/6379/9092/9000`: `DOWN`

Conclusión:

- el runtime local quedó operativo en modo degradado;
- el dashboard del mockup y `block1/overview` son navegables;
- `gateway /health` sigue marcando `ready` degradado y por eso devuelve `503`.

### Canon emulator host real

Se arrancó con:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\scripts\start-icicso-canon-emulator.ps1'
```

Resultado:

- `http://127.0.0.1:8098/index.html` respondió `200`

## Fallas detectadas y corrección

### Fallas corregidas

1. `param(...)` roto en scripts PowerShell.
   - corregido en `Open-ICICSO.ps1`, `Sync-DesktopHub.ps1`, `Validate-DashboardLinks.ps1`
2. resolución frágil de Desktop vs OneDrive Desktop.
   - corregida en los tres scripts
3. `ResolveOnly` devolvía objetos formateados en tabla.
   - corregido a JSON explícito
4. el validador parseaba mal la salida de `ResolveOnly`.
   - corregido
5. cockpit generado vacío o incompleto.
   - corregido en `Sync-DesktopHub.ps1`
6. wrappers legacy y accesos caóticos en el escritorio.
   - archivados y removidos de la ruta principal
7. `open-canon-emulator` estaba `warn` porque el canon no estaba arriba.
   - corregido levantando el canon emulator y revalidando

### Advertencias finales no corregidas porque son comportamiento esperado

1. `http://127.0.0.1:3100/health`
   - devuelve `503` en modo degradado;
   - no es link muerto;
   - representa `ready`, no `live`.

## Archivos tocados en esta validación

- `config/runtime/desktop-hub.json`
- `config/runtime/dashboard-reality.json`
- `dashboard/index.html`
- `scripts/Open-ICICSO.ps1`
- `scripts/Sync-DesktopHub.ps1`
- `scripts/Validate-DashboardLinks.ps1`
- `tools/desktop-launcher/ICICSO-Local.html`
- `docs/desktop-hub-operations.md`
- `docs/audit/dashboard-link-validation.md`

## Comandos exactos de uso

### Regenerar la carpeta del escritorio

```powershell
.\scripts\Sync-DesktopHub.ps1
```

### Abrir el hub del escritorio

```powershell
C:\Users\leona\OneDrive\Desktop\ICICSO Local\START_HERE.cmd
```

### Levantar el mockup local

```powershell
.\scripts\start-icicso-mockup.ps1
```

### Levantar el mockup sin recompilar ni abrir navegador

```powershell
.\scripts\start-icicso-mockup.ps1 -NoBuild -NoBrowser
```

### Diagnosticar el runtime

```powershell
.\scripts\Invoke-ContinuumDoctor.ps1
```

### Levantar el canon emulator

```powershell
.\scripts\start-icicso-canon-emulator.ps1
```

### Detener el mockup

```powershell
.\scripts\stop-icicso-mockup.ps1
```

### Validar dashboard, launchers, assets y consistencia

```powershell
.\scripts\Validate-DashboardLinks.ps1
```

## Estado final

Revalidación completada después de corregir.

Resultado final:

- launchers: `ok`
- links documentales: `ok`
- links de producto: `ok`, salvo `gateway ready` en `warn esperado`
- assets: `ok`
- rutas: `ok`
- consistencia dashboard/repo/docs: `ok`
