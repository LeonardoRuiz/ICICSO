# Esquemas Canonicos ICICSO

Este directorio contiene los primeros contratos canonicos del software orquestador.

## Objetivo

Definir estructuras minimas y estables para:

- describir documentos fuente,
- relacionar artefactos,
- representar evidencia resumida,
- representar objetos de evidencia derivados.

## Relacion con la especificacion canonica

Los esquemas de este directorio deben derivarse de:

- `docs/ICICSO_CANONICAL_CONTINUUM.md`
- `docs/ICICSO_ENTITY_MODEL.md`
- `docs/ICICSO_STATE_MACHINES.md`
- `docs/ICICSO_IO_CONTRACTS.md`
- `docs/ICICSO_SERVICE_BOUNDARIES.md`

El continuum define dominios y fronteras. El entity model define entidades maestras, campos y restricciones estructurales. Las state machines definen ciclos de vida, transiciones y restricciones de activacion/ejecucion. Los contratos de entrada/salida definen payloads, validaciones y restricciones de propagacion entre dominios. Las fronteras de servicio definen ownership operativo y acoplamientos prohibidos. Los JSON Schemas representan una traduccion implementable y versionable de esas definiciones.

## Principios

- Cada artefacto debe tener identidad estable.
- Todo derivado debe apuntar a su fuente.
- El versionado debe ser explicito.
- Los contratos no deben implicar autonomia clinica.
- Los esquemas describen datos, no autorizan decisiones.

## Esquemas iniciales

- `source/source_document.schema.json`
- `source/document_relationship.schema.json`
- `evidence/ser.schema.json`
- `evidence/eo.schema.json`

## Nota

Estos esquemas son la primera capa canonica. Se pueden usar para validacion JSON, documentacion de APIs y futura persistencia.
