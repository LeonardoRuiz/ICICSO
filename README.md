# ICICSO

ICICSO no es un repositorio de una sola app terminada.

ICICSO es un repositorio de trabajo para construir un continuum canónico de evidencia clínica y gobernanza operativa, desde la ingesta documental hasta artefactos derivados que después puedan alimentar motores, reglas, decisiones y ejecución.

Hoy el repo tiene cuatro superficies distintas:

- `icicso/`
  Canon de desarrollo TypeScript. Aquí vive el modelo del continuum y el primer slice realmente probado.
- `services/ingestion-orquestador/`
  Backend Python funcional para catálogo, ingesta documental, materialización, governance y auditoría.
- `icicso-local/`
  Runtime local multi-servicio para demo, navegación y pruebas operativas. Útil, pero no debe confundirse con el canon.
- `_archive/`
  Referencia histórica o no canónica. No es la base para desarrollo nuevo.

## Qué estamos construyendo

La intención del proyecto es esta:

1. tomar documentos y fuentes clínicas;
2. normalizarlos y versionarlos;
3. derivar artefactos canónicos del continuum;
4. exponerlos a capas posteriores de gobernanza, harmonización, pathway, readiness y ejecución.

La explicación corta del repo está en:

- [docs/WHAT_ICICSO_IS.md](docs/WHAT_ICICSO_IS.md)
- [docs/glossary.md](docs/glossary.md)
- [docs/glossary.html](docs/glossary.html)
- [docs/clinical-concepts.md](docs/clinical-concepts.md)
- [docs/clinical-concepts.html](docs/clinical-concepts.html)
- [docs/glossary-automation.md](docs/glossary-automation.md)
- [docs/strategy/mxrep-resiliente-icicso-panomics-ehr.md](docs/strategy/mxrep-resiliente-icicso-panomics-ehr.md)

## Capa documental activa de Acompañantes

La capa `Acompañantes` ya vive como artefacto operativo y de gobernanza dentro del repo:

- [docs/generated/acompanantes/README.md](docs/generated/acompanantes/README.md)
- [docs/generated/acompanantes/index.html](docs/generated/acompanantes/index.html)
- [docs/generated/acompanantes/acompanantes-filter-model.json](docs/generated/acompanantes/acompanantes-filter-model.json)
- [docs/generated/acompanantes/acompanantes-taxonomia.yaml](docs/generated/acompanantes/acompanantes-taxonomia.yaml)
- [docs/generated/acompanantes/estado-editorial-2026-05-28.md](docs/generated/acompanantes/estado-editorial-2026-05-28.md)

Estado editorial vigente de esa capa:

- `927` registros activos de referencia
- `370` fichas con acompañante explícito
- `33` fichas multietiqueta reales
- `AC-09 = 5`
- `AC-13 = 68`
- `AC-14 = 3`

## Qué funciona hoy

Lo que sí tiene evidencia de ejecución al 23 de abril de 2026:

- `icicso/`
  - pasa pruebas del slice `ING -> SER -> EO -> EL`
  - tiene emulador canónico navegable
- `services/ingestion-orquestador/`
  - expone rutas reales de health, catálogo, ingesta, materialización, governance y audit feed
  - persiste en SQLite
- `packages/evidence-intelligence/`
  - valida contratos y mapea `SER -> EO`

## Qué no debes asumir

- que todo paquete del repo está implementado;
- que todo módulo de `icicso/` es productivo;
- que `icicso-local/` es la fuente de verdad arquitectónica;
- que `_archive/` debe revivirse como base operativa;
- que “hay HTML” implica que la funcionalidad detrás existe end-to-end.

## Ruta recomendada

Si entras hoy al repo, lee en este orden:

1. [START_HERE.md](START_HERE.md)
2. [docs/WHAT_ICICSO_IS.md](docs/WHAT_ICICSO_IS.md)
3. [docs/generated/acompanantes/index.html](docs/generated/acompanantes/index.html)
4. [docs/generated/acompanantes/README.md](docs/generated/acompanantes/README.md)
5. [docs/glossary.md](docs/glossary.md)
6. [docs/clinical-concepts.md](docs/clinical-concepts.md)
7. [SYSTEM_STATUS.md](SYSTEM_STATUS.md)
8. [icicso/README.md](icicso/README.md)
9. [docs/local-development.md](docs/local-development.md)

## Reglas de navegación

- desarrollo nuevo del continuum: `icicso/`
- backend documental y catálogo: `services/ingestion-orquestador/`
- runtime local de demo: `icicso-local/`
- corpus y referencias: `references/` e `ICICSO_TERMINOLOGIAS/`
- histórico: `_archive/`

## Comandos de validación rápidos

```powershell
npm --prefix ./icicso test
```

```powershell
npm --prefix ./packages/evidence-intelligence run test:validation
```

```powershell
py -m pytest services/ingestion-orquestador/tests -q
```