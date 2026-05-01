# START HERE

## Si llegas hoy al repo

La pregunta correcta no es “cómo arranco todo”.

La pregunta correcta es “qué parte del repo estoy intentando entender o validar”.

Empieza así:

1. lee [README.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/README.md)
2. lee [docs/WHAT_ICICSO_IS.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/docs/WHAT_ICICSO_IS.md)
3. lee [docs/glossary.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/docs/glossary.md) o abre [docs/glossary.html](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/docs/glossary.html)
4. para busqueda clinica/autocomplete, abre [docs/clinical-concepts.html](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/docs/clinical-concepts.html) o lee [docs/clinical-concepts.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/docs/clinical-concepts.md)
5. lee [SYSTEM_STATUS.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/SYSTEM_STATUS.md)
6. si vas a desarrollar el continuum, entra a [icicso/README.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/icicso/README.md)
7. si vas a operar el backend documental, entra a `services/ingestion-orquestador/`
8. si vas a levantar una demo o revisar superficies HTTP, usa `icicso-local/`

## Qué estamos haciendo aquí

Estamos construyendo un continuum canónico para transformar documentos y evidencia en artefactos clínicos estructurados, versionados, auditables y reutilizables.

Hoy el repositorio ya valida de forma real:

- `ING`
- `SER`
- `EO`
- `EL`

El resto del continuum existe en distintos niveles de madurez: algunos módulos están descritos, otros scaffolded, otros mockeados, otros todavía sólo documentados.

## Dónde empezar según objetivo

### Quiero entender el proyecto

Lee:

1. [docs/WHAT_ICICSO_IS.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/docs/WHAT_ICICSO_IS.md)
2. [docs/glossary.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/docs/glossary.md)
3. [docs/clinical-concepts.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/docs/clinical-concepts.md)
4. [docs/glossary-automation.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/docs/glossary-automation.md)
5. [SYSTEM_STATUS.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/SYSTEM_STATUS.md)
6. [docs/repo-map.md](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/docs/repo-map.md)

### Quiero validar lo que sí corre

```powershell
npm --prefix ./icicso test
```

```powershell
npm --prefix ./packages/evidence-intelligence run test:validation
```

```powershell
py -m pytest services/ingestion-orquestador/tests -q
```

### Quiero abrir el emulador canónico

```powershell
cd icicso
npx serve apps/emulator
```

### Quiero abrir el runtime local

```powershell
.\scripts\start-icicso-mockup.ps1
```

Superficies útiles cuando queda arriba:

- `http://127.0.0.1:8090/index.html`
- `http://127.0.0.1:3100/health`
- `http://127.0.0.1:3100/block1/overview`

## Qué no debes asumir

- que el root del repo representa una sola aplicación desplegable;
- que `icicso-local/` y `icicso/` son lo mismo;
- que todos los bounded contexts ya tienen persistencia real;
- que `_archive/` forma parte de la ruta principal;
- que el nombre de una carpeta implica madurez funcional.
