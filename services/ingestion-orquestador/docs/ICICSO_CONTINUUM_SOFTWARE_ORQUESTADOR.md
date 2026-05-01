# ICICSO: Continuum para Generar un Software Orquestador

## 1. Que es ICICSO

ICICSO es una infraestructura institucional de orquestacion clinica y quirurgica basada en gobernanza cognitiva. No es un EHR, no es un sistema de ordenes, no es un algoritmo autonomo y no sustituye el juicio clinico. Opera como una capa suprayacente que:

- ingiere evidencia cientifica y datos clinicos certificados,
- versiona y gobierna conocimiento,
- traduce evidencia a aplicabilidad contextual,
- clasifica incertidumbre epistemica,
- armoniza guias potencialmente divergentes,
- compila rutas clinicas estructuradas,
- instancia casos bajo supervision humana,
- registra consenso, arbitrajes, overrides y trazabilidad medico-legal.

En terminos de software, ICICSO debe construirse como una plataforma de orquestacion con separacion estricta entre:

- conocimiento cientifico,
- motores de traduccion y clasificacion,
- objetos operativos pre-ejecutables,
- runtime de caso,
- gobernanza,
- integracion hospitalaria,
- observabilidad y auditoria.

## 2. Lectura sintetica de la arquitectura documental

De los documentos revisados, el stack funcional central queda asi:

1. `EL / SER / EO`
   Entrada y gobierno de evidencia primaria y secundaria.
2. `ETE`
   Traduce evidencia a puntajes, incertidumbre contextual y aplicabilidad.
3. `EUL`
   Clasifica la friccion epistemica institucional.
4. `GHL + ICDR`
   Armoniza coexistencia de guias y documenta divergencias.
5. `KBOL`
   Compila objetos operativos: CPO, Runbooks, BOM, TAM, EVT, RDY-G, CAE.
6. `CCCL / Control dinamico del caso`
   Instancia el caso real y evalua transiciones, gates y eventos.
7. `GCL`
   Ledger append-only de consenso, arbitraje, versionado, drift y auditoria.

## 3. Principios de software no negociables

- Todo artefacto estructural debe ser versionado.
- Toda decision automatizable debe ser explicable y trazable.
- Ningun modulo debe poder emitir ordenes clinicas autonomas.
- El runtime del caso nunca debe modificar el ledger historico.
- La escritura medico-legal debe ocurrir solo por canales controlados.
- Ciencia, operacion y economia deben quedar separadas por diseno.
- Todo cambio de reglas debe generar nuevo VRN o equivalente tecnico.

## 4. Continuum recomendado de construccion

## Etapa 0. Fundacion ontologica y de gobierno

Objetivo: convertir la arquitectura documental en contratos de software.

Entregables:

- glosario canonico de entidades,
- mapa de bounded contexts,
- taxonomia de documentos y artefactos,
- esquema de versionado institucional,
- politica de inmutabilidad,
- matriz de permisos por capa.

Modulos a definir:

- `identity-service`
- `governance-policy-service`
- `version-registry`
- `audit-foundation`

Sin esta etapa, el software nace ambiguo.

## Etapa 1. Carga documental local y corpus fuente

Objetivo: convertir los documentos actuales en un corpus indexado y utilizable.

Pasos:

1. Registrar cada archivo como fuente documental local.
2. Asignar categoria estructural: L0, L1, L2, L3, L4, L5, L6, arquitectura, outputs, anexos.
3. Extraer metadatos minimos: titulo, capa, idioma, version, tipo de artefacto, dominio.
4. Generar un `manifest` local auditable.
5. Separar documento fuente de artefacto derivado.

Salida de software:

- catalogo de documentos,
- indice de relaciones,
- cola de ingestion,
- hash por archivo,
- registro de version local.

## Etapa 2. Modelo canonico de datos

Objetivo: definir las entidades maestras del orquestador.

Entidades minimas:

- `SourceDocument`
- `SER`
- `EO`
- `ICDR`
- `GuidelinePackage`
- `ECS`
- `UCI`
- `MAC`
- `DDMO`
- `EULClassification`
- `CPO`
- `Runbook`
- `BOM`
- `TAM`
- `EventTrigger`
- `ReadinessGate`
- `CAE`
- `CaseInstance`
- `DecisionCard`
- `ConsensusRecord`
- `VRN`
- `OverrideRecord`
- `DriftEvent`

Recomendacion tecnica:

- contratos en `JSON Schema` o `Pydantic`,
- eventos de dominio versionados,
- ids inmutables y hashes por artefacto,
- relaciones explicitas entre fuente, traduccion, compilacion y caso.

## Etapa 3. Evidence Lake e ingestion cientifica

Objetivo: levantar la primera capacidad productiva del sistema.

Capacidades:

- ingreso de SER desde documentos fuente,
- validacion metodologica,
- atomizacion SER -> EO,
- versionado append-only,
- trazabilidad de DOI, LOE, COR, MIM,
- archivado y deprecacion.

Servicios:

- `evidence-ingestion-service`
- `evidence-registry`
- `methodology-review-service`
- `document-hash-service`

Base de datos sugerida:

- `PostgreSQL` para metadatos y relaciones,
- `Object Storage` para archivos,
- `OpenSearch` o `Postgres full-text` para busqueda documental.

## Etapa 4. Motor ETE

Objetivo: traducir evidencia a estructuras computables reproducibles.

Funciones:

- calculo de `ECS`,
- calculo de `UCI`,
- resolucion de `MAC`,
- validacion de `DDMO`,
- trazabilidad de reglas y pesos.

Patron recomendado:

- `rules-engine` deterministico,
- `versioned rulesets`,
- pruebas de reproducibilidad por version triple:
  `EO + engine + ruleset`.

Servicios:

- `ete-engine`
- `ruleset-registry`
- `context-applicability-service`

## Etapa 5. Capa EUL

Objetivo: transformar incertidumbre cuantitativa en friccion institucional gobernable.

Funciones:

- clasificacion de nivel I-IV,
- aplicacion de umbrales por dominio,
- definicion de validacion reforzada,
- trazabilidad de escalamiento deliberativo.

Servicios:

- `uncertainty-classifier`
- `threshold-registry`
- `validation-policy-service`

## Etapa 6. GHL e ICDR

Objetivo: coexistencia formal de multiples guias sin fusionarlas de forma opaca.

Funciones:

- registro de concordancias y divergencias,
- severidad de conflicto,
- arbitraje documentado,
- construccion de `GuidelinePackage`.

Servicios:

- `guideline-harmonization-service`
- `conflict-registry`
- `package-activation-service`

Este modulo es clave para evitar sesgo de seleccion de guias.

## Etapa 7. KBOL

Objetivo: compilar conocimiento armonizado en objetos operativos pre-ejecutables.

Artefactos:

- `CPO`,
- `Runbook`,
- `BOM`,
- `TAM`,
- `EVT`,
- `RDY-G`,
- `CAE`,
- `Context Adaptation Module`.

Servicios:

- `pathway-compiler`
- `runbook-service`
- `dependency-graph-service`
- `readiness-gate-service`

Regla central:

- KBOL no usa datos dinamicos del paciente para cambiar conocimiento base.

## Etapa 8. Runtime de caso y control dinamico

Objetivo: llevar el conocimiento compilado al caso real bajo supervision humana.

Funciones:

- instanciacion de `CaseInstance`,
- maquina de estados,
- evaluacion de eventos y gates,
- snapshot legal de evidencia,
- decision cards,
- suspension, reactivacion, reconciliacion y cierre.

Servicios:

- `case-runtime`
- `state-machine-service`
- `event-evaluator`
- `decision-card-service`
- `snapshot-service`

Aqui nace el software orquestador propiamente dicho.

## Etapa 9. Governance & Consensus Ledger

Objetivo: que toda modificacion estructural sea auditable e irreversible.

Funciones:

- registro append-only,
- hash encadenado,
- CR, GCA, overrides, release notes, drift,
- consulta historica reproducible.

Servicios:

- `ledger-service`
- `signature-service`
- `release-governance-service`

Implementacion sugerida:

- tabla append-only con hash previo,
- sellado criptografico,
- firma institucional,
- export reproducible.

## Etapa 10. Integracion con entorno clinico

Objetivo: conectar ICICSO con sistemas hospitalarios sin perder sus fronteras.

Integraciones:

- EHR / LCR,
- LIS,
- PACS / DICOM,
- farmacia,
- inventario y UDI,
- agenda y cama UCI,
- HL7 / FHIR.

Reglas:

- leer mas que escribir,
- escribir solo por canales autorizados,
- no crear expediente paralelo,
- registrar siempre el origen y la transformacion.

## Etapa 11. Interfaz de usuario del orquestador

Objetivo: exponer la inteligencia estructural de forma util y segura.

Vistas minimas:

- consola de evidencia,
- visor de EO y GP,
- tablero de incertidumbre,
- compilador de CPO,
- consola del caso,
- panel de gates y eventos,
- ledger y auditoria,
- tablero de drift y performance.

Perfiles:

- cientifico,
- comite,
- medico tratante,
- coordinacion quirurgica,
- calidad,
- auditoria,
- tecnologia.

## Etapa 12. Observabilidad, validacion y seguridad

Objetivo: asegurar que el sistema sea confiable antes de operar.

Capas:

- pruebas de integridad documental,
- pruebas de reproducibilidad de reglas,
- simulaciones por caso,
- pruebas de explainability,
- trazas de auditoria,
- seguridad zero-trust,
- backup y disaster recovery.

## 5. Orden realista de implementacion

Si el objetivo es construir el software sin sobredisenarlo desde el dia 1, el orden mas sano es:

1. Corpus documental local + manifest + hashing.
2. Modelo canonico de entidades.
3. Evidence Lake con SER y EO.
4. ETE.
5. EUL.
6. GHL + ICDR.
7. KBOL.
8. Runtime de caso.
9. Ledger GCL.
10. Integraciones hospitalarias.
11. UI completa y observabilidad avanzada.

## 6. MVP recomendado

El MVP no debe intentar cubrir toda la arquitectura institucional. Debe demostrar el ciclo minimo de valor:

1. cargar evidencia,
2. convertirla en EO,
3. ejecutar ETE,
4. clasificar incertidumbre con EUL,
5. armonizar un GP simple,
6. compilar un CPO,
7. instanciar un caso,
8. mostrar gates, eventos y decision cards,
9. registrar todo en ledger.

MVP sugerido para el caso de referencia:

- dominio unico: `CABG x3`,
- una familia de guias,
- un conjunto controlado de EO,
- un solo flujo perioperatorio,
- un runtime con supervision humana obligatoria.

## 7. Arquitectura tecnica sugerida

Backend:

- `Python + FastAPI` o `C# + ASP.NET Core`
- `PostgreSQL`
- `Object Storage`
- `Redis` para colas ligeras y cache
- `OpenSearch` opcional para busqueda semantica y documental

Patrones:

- arquitectura modular por dominios,
- eventos de dominio,
- servicios deterministas para reglas,
- append-only para ledger,
- API-first,
- trazabilidad por correlation id y version id.

Frontend:

- consola web por roles,
- visores de trazabilidad,
- timeline del caso,
- UI separada para ciencia, operacion y gobernanza.

## 8. Estructura propuesta del repositorio de software

```text
software_orquestador/
  docs/
  manifest/
  schemas/
  services/
    evidence_ingestion/
    evidence_lake/
    ete/
    eul/
    ghl/
    kbol/
    case_runtime/
    ledger/
    integration/
  apps/
    admin_console/
    clinical_console/
  tests/
  infra/
```

## 9. Riesgos principales a controlar

- mezclar conocimiento cientifico con estado dinamico del caso,
- permitir que una regla opaque la fuente cientifica original,
- convertir scores en ordenes clinicas,
- perder versionado reproducible,
- permitir escritura medico-legal automatica,
- fusionar economia con recomendacion clinica,
- no separar documento fuente de objeto derivado.

## 10. Siguiente accion concreta sugerida

La mejor siguiente accion no es programar todo de una vez, sino crear primero una base local de trabajo con tres piezas:

1. un `manifest` de documentos,
2. un `modelo canonico` de entidades,
3. un `backlog` de implementacion por modulos.

Con eso ya puedes arrancar el software orquestador sobre fundamentos correctos.
