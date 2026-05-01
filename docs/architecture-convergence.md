# Architecture Convergence

## Decision

La convergencia estructural del repo queda fijada asi:

- `icicso/` es el canon ejecutable
- `services/ingestion-orquestador/` e `ICICSO_TERMINOLOGIAS/` son soporte activo
- `_archive/noncanonical/08_Plataforma_Digital/icicso-foundation/` queda como referencia en sitio
- `domain/` y `engines/` salieron del root y quedaron archivados
- `icicso-local/` queda como experimental

## Por que

El repo llego a tener varias lineas de arquitectura parcialmente superpuestas. Eso servia para explorar, pero ya no sirve para construir SER y los modulos siguientes sin ambiguedad.

Los problemas concretos eran:

- multiple `shared-kernel`
- multiples mapas de arquitectura
- contratos similares en rutas distintas
- dificultad para saber donde nace el desarrollo nuevo

## Integracion aplicada

### Canon fijado

- `shared-kernel` efectivo: `icicso/packages/shared-kernel/`
- `architectureMap` efectivo: `icicso/apps/emulator/src/data/`
- emulador efectivo: `icicso/apps/emulator/`

### Arboles reclasificados

| Ruta | Clasificacion | Uso permitido |
| --- | --- | --- |
| `icicso/` | canonical | desarrollo nuevo |
| `services/ingestion-orquestador/` | active-support | gobierno documental |
| `ICICSO_TERMINOLOGIAS/` | active-support | terminologia y normalizacion |
| `_archive/deprecated_audit_20260405/legacy_reference/domain/` | archived-reference | consulta y migracion selectiva |
| `_archive/deprecated_audit_20260405/legacy_reference/engines/` | archived-reference | consulta y migracion selectiva |
| `_archive/noncanonical/08_Plataforma_Digital/icicso-foundation/` | reference | consulta, comparacion y extraccion |
| `icicso-local/` | experimental | pruebas locales y prototipos |

## Regla de migracion

1. si algo ya existe mejor en un arbol no canonico, se migra hacia `icicso/`
2. si solo documenta una idea, se referencia y no se duplica
3. si duplica algo ya resuelto en `icicso/`, se considera deuda estructural

## Siguiente paso recomendado

La convergencia estructural ya es suficiente para avanzar a SER. Lo siguiente no es otra reestructuracion; es implementar comportamiento real en `icicso/packages/domain/ser`.
