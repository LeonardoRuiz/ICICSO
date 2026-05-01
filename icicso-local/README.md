# ICICSO Local

Runtime demo local del continuum ICICSO.

No es la entrada documental principal del proyecto. La autoridad documental sigue en [START_HERE.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/START_HERE.md).

## Qué es hoy

- un runtime local multi-servicio para demo;
- un gateway operativo;
- un emulador HTML navegable;
- servicios por bloque suficientes para mostrar caso, evidence, pathway, readiness, state machine y systemic control;
- una superficie útil incluso cuando la infraestructura externa está degradada.

## Qué no es

- no es garantía de infraestructura completa;
- no es la única base confiable del repositorio;
- no debe confundirse con `_archive/noncanonical/08_Plataforma_Digital/icicso-foundation/`.

## Arranque recomendado

Desde la raíz del repo:

```powershell
.\scripts\start-icicso-mockup.ps1
```

Arranque completo con infraestructura Docker:

```powershell
.\scripts\start-icicso-local-full.ps1
```

Rearranque rápido:

```powershell
.\scripts\start-icicso-mockup.ps1 -NoBuild
```

Verificación:

```powershell
.\scripts\Invoke-ContinuumDoctor.ps1
```

## Superficies vivas

- emulador HTML: `http://127.0.0.1:8090/index.html`
- gateway health: `http://127.0.0.1:3100/health`
- block1 overview: `http://127.0.0.1:3100/block1/overview`

## Estado operativo

`icicso-local/` puede arrancar en modo degradado aunque PostgreSQL, Redis, Kafka o MinIO no estén disponibles.

Eso permite:

- demo del flujo principal;
- navegación por workspaces;
- validación de integración superficial;
- lectura del caso y del timeline.

No permite asumir:

- cierre end-to-end completo;
- persistencia o event streaming total;
- salud integral de todos los bounded contexts externos.

## Documentos de apoyo

- `docs/BLOCK1_SERVICES.md`
- `docs/BLOCK3_EVIDENCE_LAKE.md`
- `docs/BLOCK5_GHL_KBOL.md`
- `docs/BLOCK6_RUNBOOK_READINESS.md`
- `docs/BLOCK7_CASE_CONTROL.md`
- `docs/BLOCK8_SYSTEMIC_CONTROL.md`
