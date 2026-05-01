# Desarrollo Local

Estado del documento:

- runbook operativo secundario
- complementar con [SYSTEM_STATUS.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/SYSTEM_STATUS.md)
- la entrada documental principal sigue siendo [START_HERE.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/START_HERE.md)

## Distinción clave

- `icicso/` es canon de desarrollo.
- `icicso-local/` es runtime demo local.
- `_archive/noncanonical/08_Plataforma_Digital/icicso-foundation/` no es startup path principal.

## Arranque oficial del mockup local

```powershell
.\scripts\start-icicso-mockup.ps1
```

o:

```powershell
.\scripts\start-icicso-mockup.bat
```

## Estado real hoy

Ese flujo ya puede completar arranque oficial en modo degradado.

No debe asumirse:

- que `ready` implica infraestructura completa;
- que PostgreSQL, Redis, Kafka y MinIO están arriba;
- que todos los endpoints de bloque equivalen a producto cerrado.

Sí debe asumirse cuando el runtime queda arriba:

- `http://127.0.0.1:8090/index.html` responde;
- `http://127.0.0.1:3100/health` responde;
- el `Doctor` puede validar gateway, emulator y servicios publicados.

## Verificación mínima

```powershell
.\scripts\Invoke-ContinuumDoctor.ps1
```

## Superficies operativas

- producto demo principal: `http://127.0.0.1:8090/index.html`
- health del gateway: `http://127.0.0.1:3100/health`
- overview base del caso: `http://127.0.0.1:3100/block1/overview`

## Hub de escritorio

Ruta:

- `C:\Users\leona\OneDrive\Desktop\ICICSO Local`

Entrada principal:

- `START_HERE.cmd`

Arquitectura del hub:

- `launchers de Windows`
- `superficies de producto`
- `documentación canónica`
- `diagnóstico e internals`
