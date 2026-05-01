# Desktop Emulator

App estática y ligera para visualizar el estado vivo del runtime local y del continuum ICICSO desde navegador local.

## Uso

Desde la raíz del repositorio se puede servir con:

```powershell
py -m http.server 8090
```

Rutas útiles:

- `http://127.0.0.1:8090/index.html`
- `http://127.0.0.1:8090/icicso-local/apps/desktop-emulator/index.html`

Uso real recomendado:

- levantar primero `.\scripts\start-icicso-mockup.ps1`
- entrar luego a `http://127.0.0.1:8090/index.html`

## Principio

- sin framework pesado
- desacoplada por `fetch`
- configurable por `gateway base URL`
- preparada para crecer por workspaces, bloques y nuevos endpoints

## Arquitectura visible actual

- navegación superior por dominios: `Continuum`, `Case`, `Knowledge`, `Pathway`, `Readiness`, `State`, `Systemic`, `Operator`
- workspaces clínicos diferenciados
- operator rail para walkthrough, actions, audit y hooks
- timeline de dominio y knowledge surface visibles
- product shell con narrativa SaaS por encima del runtime real

## Bloques visibles hoy

### Knowledge / Evidence

Con `gateway-api` y `evidence-lake-service` arriba, el emulador ya pinta:

- panel `Evidence Lake`
- conteo de `Source Evidence Record (SER)`, `Evidence Object (EO)` e `Inter-Guideline Conflict / Divergence Record (ICDR)`
- snapshot científico actual
- `hash` y `VRN` del snapshot

### Pathway / Readiness / State

- `Guideline Package / Clinical Pathway Object (GP / CPO)`
- `Runbook Object / Readiness (RO)`
- `Case control / state machine`
- `Systemic Risk / Clinical Outcomes / Drift (SRM / CQOI)`

## Regla

El emulador ya no debe presentarse como “tablero genérico”.

Debe leerse como:

- superficie de producto;
- consola clínica y operativa;
- demo navegable del SaaS terminado sobre servicios locales reales.
