# Desktop Hub Operations

## Objetivo

Convertir `C:\Users\leona\OneDrive\Desktop\ICICSO Local` en un punto de entrada operativo limpio, sin wrappers caoticos ni duplicacion manual.

## Arquitectura

La carpeta del escritorio ya no debe ser una segunda fuente de verdad.

La fuente canonica ahora vive en el repo:

- manifest: `config/runtime/desktop-hub.json`
- script de apertura: `scripts/Open-ICICSO.ps1`
- script de sincronizacion: `scripts/Sync-DesktopHub.ps1`

## Regla operativa

- el repo define entrypoints y destinos;
- el escritorio se genera desde el repo;
- los `.cmd` del escritorio solo delegan en `Open-ICICSO.ps1`;
- el cockpit HTML del escritorio es una vista generada, no una pieza editada a mano.

## Uso diario

1. Regenera el hub si cambian rutas o entrypoints:

```powershell
.\scripts\Sync-DesktopHub.ps1
```

2. Abre la carpeta `ICICSO Local` del escritorio.

3. Ejecuta:

- `START_HERE.cmd` para abrir el cockpit visual
- `02_Launchers\Start Mockup Local.cmd` para levantar el stack local
- `05_Operations\Open Mockup Dashboard.cmd` para entrar al dashboard del mockup
- `02_Launchers\Run Continuum Doctor.cmd` para diagnostico

## Estructura esperada

- `01_Start_Here`: cockpit principal
- `02_Launchers`: start, stop, doctor y repo
- `03_Documentation`: documentos canonicos
- `04_Reports`: auditorias y mapas
- `05_Operations`: dashboard, gateway, overview, logs y compose
- `06_Assets`: assets de apoyo
- `_archive`: snapshots y material retirado

## Mantenimiento

Si necesitas agregar o quitar un acceso:

1. edita `config/runtime/desktop-hub.json`
2. ejecuta `.\scripts\Sync-DesktopHub.ps1`
3. verifica la carpeta regenerada

## Lo que ya no debe hacerse

- editar a mano el cockpit HTML del escritorio;
- crear `.cmd` sueltos fuera del manifest;
- abrir rutas a `3000` como dashboard principal del producto;
- apuntar a documentos inexistentes como `docs/roadmap.md`;
- mantener backups operativos en la misma carpeta principal del hub.
