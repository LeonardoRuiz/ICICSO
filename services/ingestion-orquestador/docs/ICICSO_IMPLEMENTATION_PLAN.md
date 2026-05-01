# ICICSO: Plan de Implementacion Concreto

## 1. Objetivo de este plan

Convertir el corpus documental ICICSO ya indexado localmente en una base de software ejecutable, trazable y gobernada, sin intentar construir toda la plataforma en un solo paso.

Este plan toma como punto de partida el estado actual del repositorio:

- existe un `manifest` local generado,
- existe un script de indexacion reproducible,
- existen documentos de arquitectura y continuum,
- ya existen servicios iniciales, esquemas, aplicacion FastAPI y pruebas base.

Este plan debe leerse junto con `docs/ICICSO_CANONICAL_CONTINUUM.md`, que fija el stack canonico `L0-L12` y las fronteras estructurales que el software no puede romper.

## 2. Resultado esperado por etapas

La estrategia correcta es avanzar en cuatro olas:

1. `Fundacion`
   Convertir arquitectura documental en contratos tecnicos verificables.
2. `MVP de conocimiento`
   Ingerir fuentes, normalizar evidencia y ejecutar el ciclo `SourceDocument -> EO -> ETE -> EUL`.
3. `MVP operativo`
   Armonizar una guia, compilar un `CPO` y correr un caso supervisado.
4. `Gobernanza ampliada`
   Fortalecer ledger, integraciones, UI por roles y observabilidad avanzada.

Correspondencia con el continuum canonico:

- `Fundacion` cubre `L0-L1`.
- `MVP de conocimiento` cubre `L2-L5`.
- `MVP operativo` cubre `L6-L8`.
- `Gobernanza ampliada` extiende `L9-L12`.

El detalle de economia, comercial, simulacion y planeacion desacopladas para esta ola debe seguir `docs/ICICSO_BLOCK9_DOWNSTREAM_SPEC.md`.

## 3. Arquitectura objetivo minima

Para evitar sobrediseño, el primer sistema debe nacer como monolito modular con fronteras limpias, no como microservicios plenos.

### Recomendacion tecnica inicial

- Backend: `Python + FastAPI`
- Persistencia: `PostgreSQL`
- Archivos fuente: sistema local al inicio; luego `Object Storage`
- Cola simple: `Redis` opcional en fase 2
- Busqueda: `PostgreSQL full-text` al inicio
- Frontend inicial: API + consola administrativa minima

### Razon

La arquitectura documental todavia se esta consolidando. Un monolito modular reduce costo de coordinacion, acelera validacion del dominio y permite separar modulos internamente antes de extraer servicios.

## 4. Estructura de repositorio recomendada para la siguiente iteracion

```text
software_orquestador/
  docs/
  manifest/
  scripts/
  schemas/
    source/
    evidence/
    translation/
    uncertainty/
    orchestration/
    governance/
  app/
    api/
    domain/
    services/
    persistence/
    governance/
  tests/
    unit/
    integration/
    fixtures/
```

## 5. Fase 1: Fundacion ejecutable

### Objetivo

Pasar de documentos narrativos a contratos tecnicos y reglas de gobierno implementables.

### Entregables

- glosario canonico versionado,
- mapa de bounded contexts,
- taxonomia estable de artefactos,
- convencion de ids inmutables,
- politica tecnica de versionado,
- politica tecnica append-only,
- primer set de esquemas canonicos.

### Trabajo concreto

1. Crear `schemas/` con modelos iniciales para:
   - `SourceDocument`
   - `DocumentRelationship`
   - `SER`
   - `EO`
   - `EULClassification`
   - `GuidelinePackage`
   - `CPO`
   - `CaseInstance`
   - `ConsensusRecord`
   - `VRN`
2. Definir enums tecnicos para:
   - capa documental,
   - categoria,
   - estado de fuente,
   - estado de caso,
   - severidad de conflicto,
   - nivel de incertidumbre.
3. Escribir reglas de trazabilidad:
   - todo derivado referencia fuente,
   - todo cambio genera nueva version,
   - nunca se muta el historico.
4. Redactar `ADR` iniciales:
   - monolito modular primero,
   - append-only en ledger,
   - separacion de conocimiento vs runtime,
   - no decisionalidad clinica.

### Criterio de salida

La fase termina cuando un desarrollador puede leer los esquemas y entender sin ambigüedad que entidades existen, como se relacionan y que invariantes no se pueden romper.

## 6. Fase 2: Corpus gobernado e ingestion

### Objetivo

Convertir el `manifest` actual en una base de ingestion utilizable por software.

### Alcance

- registrar fuentes documentales,
- almacenar hashes y metadatos,
- detectar documentos nuevos o modificados,
- separar fuente original de artefactos derivados.

### Componentes

- `document_catalog`
- `document_hash_service`
- `manifest_importer`
- `document_registry`

### Trabajo concreto

1. Persistir `icicso_manifest.json` en tablas relacionales.
2. Crear proceso idempotente `manifest -> database`.
3. Definir tabla `source_documents`.
4. Definir tabla `document_ingestions`.
5. Definir tabla `document_relationships`.
6. Marcar diferencias entre:
   - documento fuente,
   - documento de arquitectura,
   - output nuclear,
   - anexo complementario.
7. Añadir validaciones:
   - hash obligatorio,
   - path obligatorio,
   - categoria valida,
   - `document_id` estable.

### Criterio de salida

La fase termina cuando el sistema puede importar las 102 fuentes actuales y reconstruir su catalogo sin perder trazabilidad.

## 7. Fase 3: Modelo de evidencia

### Objetivo

Levantar la primera capacidad de negocio real: transformar fuentes en conocimiento estructurado.

### Alcance

- registrar `SER`,
- atomizar a `EO`,
- vincular EO con fuente y version,
- conservar revision metodologica.

### Componentes

- `evidence_registry`
- `methodology_review`
- `eo_builder`
- `evidence_query_api`

### Trabajo concreto

1. Definir contrato de `SER`.
2. Definir contrato de `EO`.
3. Diseñar pipeline manual-asistido para:
   - seleccionar documento,
   - registrar resumen estructurado,
   - emitir EO derivadas,
   - aprobar version.
4. Añadir campos criticos:
   - `source_document_id`
   - `methodology_status`
   - `loe`
   - `cor`
   - `doi`
   - `domain`
   - `version_id`
5. Implementar consultas basicas:
   - EO por fuente,
   - EO por dominio,
   - EO por version,
   - EO activas vs deprecadas.

### Criterio de salida

La fase termina cuando el equipo puede cargar manualmente un conjunto pequeño de fuentes y producir EO estructuradas, versionadas y consultables.

## 8. Fase 4: ETE y EUL

### Objetivo

Demostrar que el software puede traducir evidencia a una salida computable reproducible y luego clasificar su incertidumbre institucional.

### Alcance

- `ETE` deterministico,
- reglas versionadas,
- `EUL` con clasificacion inicial I-IV,
- explainability por ejecucion.

### Componentes

- `ete_engine`
- `ruleset_registry`
- `context_applicability`
- `uncertainty_classifier`

### Trabajo concreto

1. Definir estructura de `ruleset`.
2. Registrar inputs requeridos por EO.
3. Calcular:
   - `ECS`
   - `UCI`
   - `MAC`
   - `DDMO`
4. Emitir `EULClassification` con:
   - nivel,
   - razones,
   - reglas disparadas,
   - version del motor,
   - version del ruleset.
5. Garantizar reproducibilidad por tripleta:
   - `EO version`
   - `engine version`
   - `ruleset version`

### Criterio de salida

La fase termina cuando un mismo input produce la misma salida bajo la misma tripleta versionada y deja rastro explicable.

## 9. Fase 5: GHL, KBOL y caso supervisado

### Objetivo

Completar el primer ciclo operativo util: armonizar una guia, compilar un `CPO` y abrir un caso supervisado.

### Alcance del MVP

- un solo dominio: `CABG x3`,
- una familia de guias,
- un flujo perioperatorio acotado,
- supervision humana obligatoria,
- sin integraciones hospitalarias en esta fase.

### Componentes

- `guideline_harmonization`
- `conflict_registry`
- `pathway_compiler`
- `case_runtime`
- `decision_card_service`

### Trabajo concreto

1. Formalizar dominio clinico acotado y construir `GuidelinePackage` con neutralidad declarada, sunset policy y `VRN` activo.
2. Registrar concordancias y divergencias mediante `ICDR` cuantificado, sin fusionar guias en una guideline hibrida.
3. Compilar frameworks operativos modulares y su matriz de dependencias cuantificada.
4. Compilar `CPO` y `Runbook` como artefactos pre-ejecutables y dependientes de validacion humana.
4. Crear `CaseInstance` con snapshot legal de evidencia.
5. Evaluar:
   - eventos,
   - readiness gates,
   - decision cards,
   - override humano.
6. Registrar toda accion relevante en ledger.

### Criterio de salida

La fase termina cuando el equipo puede demostrar un caso CABG x3 desde evidencia versionada hasta un `GP` activo, un `KBOL` modular, un `CPO` audit-ready y una ruta operativa supervisada.

## 10. Fase 6: Ledger, seguridad y endurecimiento

### Objetivo

Convertir el MVP en una base gobernable y auditable.

### Componentes

- `ledger_service`
- `release_governance`
- `audit_api`
- `security_foundation`

### Trabajo concreto

1. Implementar tablas append-only.
2. Encadenar hash previo y hash actual.
3. Registrar:
   - activaciones,
   - deprecaciones,
   - overrides,
   - cambios de reglas,
   - cierres de caso.
4. Añadir control de acceso por rol.
5. Añadir `correlation_id`, `actor_id`, `version_id`.
6. Crear export reproducible de auditoria.

### Criterio de salida

La fase termina cuando cualquier salida operativa puede rastrearse hasta su fuente, sus reglas y la accion humana asociada.

## 11. Backlog priorizado de los primeros 90 dias

### Sprint 1-2

- consolidar estructura del repo,
- elegir stack tecnico definitivo,
- crear proyecto backend,
- importar manifest actual,
- modelar `SourceDocument`,
- modelar `DocumentRelationship`,
- persistir catalogo documental.

### Sprint 3-4

- modelar `SER` y `EO`,
- crear flujo manual de curacion de evidencia,
- exponer API de consulta de documentos y EO,
- agregar pruebas de integridad y versionado.

### Sprint 5-6

- implementar `ETE` minimo,
- implementar `EUL` minimo,
- registrar `rulesets`,
- producir explainability por corrida.

### Sprint 7-8

- modelar `GuidelinePackage`,
- compilar `CPO`,
- abrir `CaseInstance`,
- registrar eventos, gates y overrides,
- agregar ledger append-only inicial.

## 12. Historias tecnicas fundacionales

Las historias mas importantes para arrancar son estas:

1. Como sistema, quiero importar el manifest local a base de datos para registrar el corpus sin alterar los originales.
2. Como sistema, quiero mantener `document_id` estable por hash para conservar identidad reproducible.
3. Como curador, quiero asociar una EO a su documento fuente y version para preservar explicabilidad.
4. Como motor, quiero ejecutar un ruleset versionado y devolver salida deterministica.
5. Como usuario clinico, quiero ver una decision card con evidencia, incertidumbre y contexto sin recibir una orden autonoma.
6. Como auditor, quiero reconstruir una decision a partir de fuente, ruleset, runtime y actor humano.

## 13. Decisiones que deben tomarse temprano

Hay cuatro decisiones que no conviene postergar:

1. `Stack`
   Python/FastAPI o C#/ASP.NET Core.
2. `Contrato de esquemas`
   JSON Schema puro o modelos `Pydantic` como fuente de verdad.
3. `Persistencia de archivos`
   filesystem local por etapa inicial o object storage desde el dia 1.
4. `Flujo de curacion`
   manual guiado primero o semiautomatizado desde el inicio.

## 14. Riesgos de implementacion

- modelar entidades demasiado pronto sin validar el vocabulario canonico,
- intentar microservicios antes de estabilizar contratos,
- mezclar conocimiento base con estado dinamico del caso,
- permitir reglas sin fuente trazable,
- automatizar escritura clinica antes de cerrar gobernanza,
- subestimar el diseño del ledger y luego no poder reconstruir decisiones.

## 15. Siguiente accion recomendada

La mejor siguiente accion practica es esta:

1. crear el esqueleto tecnico del backend,
2. definir los primeros esquemas canonicos,
3. importar el `manifest` actual a persistencia,
4. dejar listo el primer API de `SourceDocument`.

Ese es el primer corte que convierte ICICSO de corpus gobernado a software real.
