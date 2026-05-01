# Huecos de Integracion

## Huecos entre documentacion y software

- no existe un contrato formal que conecte `services/ingestion-orquestador/schemas/` con `icicso/packages/domain/*`
- `ICICSO_TERMINOLOGIAS/` ya publica catalogo oficial y source lookup hacia `icicso-local/apps/terminology-service`; sigue pendiente convertir todos los nuevos datasets a tablas normalizadas consumibles
- el corpus documental no esta indexado como dependencia formal del canon tecnico

## Huecos entre canon y runtime local

- `icicso/` no consume ni coordina `icicso-local/`
- `icicso-local/` tiene runtime real, pero no esta derivado del canon `icicso/`
- no hay adapters explicitos entre contracts del canon y contracts del runtime local

## Huecos de contratos y tipos

- multiples `contracts` activos o referenciados
- multiples nociones de `shared-kernel`
- ausencia de una politica de versionado inter-arbol para tipos compartidos
- ausencia de DTOs transversales entre Python y TypeScript

## Huecos de wiring por capas

| Flujo esperado | Estado real |
| --- | --- |
| corpus -> ingestion documental | existe en Python |
| ingestion documental -> contratos canonicos TS | no formalizado |
| contracts -> `icicso` | parcial |
| `icicso` -> runtime local `icicso-local` | inexistente |
| terminologias -> evidence / ser / eo | parcial: catalogo y source lookup integrados; parsers y bindings clinicos completos pendientes |
| docs -> emulador demo | indirecto y manual |

## Huecos de infraestructura

- sin event bus unico para todo el repo
- sin observabilidad transversal
- sin logging unificado entre arboles
- sin health matrix unica
- sin configuracion centralizada multi-runtime

## Huecos de ejecucion

- `icicso/apps/api` no es una API real todavia
- gran parte del continuum en `icicso/packages/*` sigue en scaffold
- `icicso-foundation` no es corrible de forma confiable
- `tests/` root no participa en CI local efectiva

## Huecos de gobernanza

- no existe un archivo maestro de clasificacion de modulos mas alla de documentacion parcial
- no existe politica de decommission de arboles legacy
- no existe definicion operativa de que debe migrarse y que debe archivarse

## Huecos de datos

- no hay seed/dev fixture compartido entre Python y TypeScript
- hay persistencias paralelas:
  - SQLite en `services/ingestion-orquestador`
  - JSON stores en `icicso-local`
  - Prisma/Postgres en `icicso-foundation`

## Huecos de pruebas

- solo algunos slices tienen pruebas reales
- no existe harness E2E global del repo
- no existe validacion automatica de convergencia entre arboles

## Huecos especificos del continuum ICICSO

- faltan bridges explicitos para `SER -> EO -> EL -> ETE -> EUL -> GHL -> CPO` entre canon y runtime local
- falta wiring formal completo de provenance y terminology mapping hasta el runtime de caso; el source registry de terminologias ya esta expuesto por `terminology-service`
- falta una ruta canonica unica para `ESL`, `CQOI`, `drift` y gobernanza cientifica
