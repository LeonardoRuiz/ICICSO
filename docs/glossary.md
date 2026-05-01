# Glosario ICICSO

Estado del documento: glosario canónico vivo.

Vista interactiva: [docs/glossary.html](glossary.html).

Este documento no es un volcado de terminologías médicas externas. Es el glosario de conceptos que ICICSO va generando dentro del repo: artefactos, entidades, objetos de evidencia, ontologías, contratos, seeds, schemas, decisiones arquitectónicas y documentación operativa.

## Regla de origen

Un término entra al Glosario ICICSO cuando aparece en información producida por ICICSO, por ejemplo:

- un `SER`, `EO`, `EL` u otro artefacto del continuum;
- un schema o modelo de dominio;
- un catálogo de ontología propio de `packages/evidence-intelligence`;
- un seed bundle usado para pruebas o demostración;
- una decisión de arquitectura, contrato de I/O o documento canónico del repo;
- una salida generada por pipelines propios, siempre que represente conocimiento ICICSO y no sólo un dataset externo descargado.

Las terminologías externas como SNOMED CT, ICD-10, LOINC, RxNorm, ATC, UCUM, CPT o MeSH no son el glosario. Son fuentes de codificación, validación o interoperabilidad. Si ICICSO genera un término médico propio o usa un término médico dentro de un `SER`/`EO`, entonces el glosario puede incluirlo con su explicación en contexto ICICSO y, si existe, con binding terminológico.

## Regla de actualización

Cada entrada debe poder rastrearse a una fuente dentro del repo. Si una entrada no tiene fuente viva, debe marcarse como `histórica`, `conceptual` o eliminarse.

Flujo automático:

```powershell
pnpm glossary:refresh
```

Ese comando hace dos cosas:

1. escanea fuentes relevantes del repo y genera candidatos en [docs/glossary-candidates.md](glossary-candidates.md) y [docs/generated/glossary-candidates.json](generated/glossary-candidates.json);
2. regenera la vista interactiva [docs/glossary.html](glossary.html).

Los candidatos automáticos no son canónicos hasta que se revisen y se promuevan manualmente a este archivo.

Formato recomendado por entrada:

- **Definición corta:** una frase para lectura rápida.
- **Definición larga:** explicación operativa dentro de ICICSO.
- **Tipo:** artefacto, entidad, capa, regla, término médico generado, métrica, estado, engine, contrato.
- **Fuente primaria:** archivo o artefacto donde se define.
- **Menciones:** archivos donde aparece o se usa.
- **Relación médica/terminológica:** opcional; sólo cuando el término tiene binding o dependencia clínica relevante.

## Fuentes primarias actuales

- [README.md](../README.md)
- [START_HERE.md](../START_HERE.md)
- [SYSTEM_STATUS.md](../SYSTEM_STATUS.md)
- [docs/WHAT_ICICSO_IS.md](WHAT_ICICSO_IS.md)
- [services/ingestion-orquestador/docs/ICICSO_CANONICAL_CONTINUUM.md](../services/ingestion-orquestador/docs/ICICSO_CANONICAL_CONTINUUM.md)
- [services/ingestion-orquestador/docs/ICICSO_ENTITY_MODEL.md](../services/ingestion-orquestador/docs/ICICSO_ENTITY_MODEL.md)
- [packages/evidence-intelligence/docs/architecture.md](../packages/evidence-intelligence/docs/architecture.md)
- [packages/evidence-intelligence/docs/eo-mapper-v1.md](../packages/evidence-intelligence/docs/eo-mapper-v1.md)
- [packages/evidence-intelligence/docs/ontology-v1.md](../packages/evidence-intelligence/docs/ontology-v1.md)
- [packages/evidence-intelligence/seeds/](../packages/evidence-intelligence/seeds)
- [packages/evidence-intelligence/examples/valid/](../packages/evidence-intelligence/examples/valid)

## Entradas canónicas iniciales

### ICICSO

- **Definición corta:** continuum canónico para transformar evidencia clínica en artefactos estructurados, versionados, auditables y reutilizables.
- **Definición larga:** ICICSO no es una sola app ni sólo un backend. Es un repositorio de trabajo que modela una cadena de transformación: documentos y fuentes clínicas entran al sistema, se normalizan, se convierten en artefactos canónicos y alimentan capas posteriores de gobernanza, decisión, readiness y ejecución.
- **Tipo:** concepto raíz del repo.
- **Fuente primaria:** [docs/WHAT_ICICSO_IS.md](WHAT_ICICSO_IS.md)
- **Menciones:** [README.md](../README.md), [START_HERE.md](../START_HERE.md), [SYSTEM_STATUS.md](../SYSTEM_STATUS.md)

### Continuum canónico

- **Definición corta:** secuencia institucional de capas por las que ICICSO transforma evidencia en ejecución gobernada.
- **Definición larga:** El continuum organiza el diseño por capas `L0-L12`, desde fundación/gobernanza hasta downstream, federación y exportación. En el estado actual del repo, el slice con evidencia real de ejecución es principalmente `ING -> SER -> EO -> EL`; el resto existe en diferentes grados de especificación, scaffold o runtime local.
- **Tipo:** arquitectura/capa.
- **Fuente primaria:** [services/ingestion-orquestador/docs/ICICSO_CANONICAL_CONTINUUM.md](../services/ingestion-orquestador/docs/ICICSO_CANONICAL_CONTINUUM.md)
- **Menciones:** [docs/WHAT_ICICSO_IS.md](WHAT_ICICSO_IS.md), [SYSTEM_STATUS.md](../SYSTEM_STATUS.md), [icicso/docs/continuum/README.md](../icicso/docs/continuum/README.md)

### ING

- **Definición corta:** etapa de ingesta documental.
- **Definición larga:** Representa la entrada inicial de documentos y fuentes clínicas al flujo ICICSO. En el repo aparece como la primera etapa del slice probado `ING -> SER -> EO -> EL`, conectada con catálogo documental, ingesta, materialización y auditoría.
- **Tipo:** etapa del continuum.
- **Fuente primaria:** [README.md](../README.md)
- **Menciones:** [START_HERE.md](../START_HERE.md), [SYSTEM_STATUS.md](../SYSTEM_STATUS.md), [services/ingestion-orquestador/README.md](../services/ingestion-orquestador/README.md)

### SER

- **Definición corta:** registro estructurado de evidencia fuente.
- **Definición larga:** `SER` captura evidencia validada y versionada antes de convertirse en un `EO`. En `packages/evidence-intelligence`, un `StructuredEvidenceRecord` contiene documento fuente, dominio clínico, statements, aplicabilidad, contexto operacional y provenance.
- **Tipo:** artefacto de evidencia.
- **Fuente primaria:** [packages/evidence-intelligence/src/models/ser.ts](../packages/evidence-intelligence/src/models/ser.ts)
- **Menciones:** [icicso/packages/domain/ser/README.md](../icicso/packages/domain/ser/README.md), [services/ingestion-orquestador/docs/ICICSO_ENTITY_MODEL.md](../services/ingestion-orquestador/docs/ICICSO_ENTITY_MODEL.md), [packages/evidence-intelligence/docs/eo-mapper-v1.md](../packages/evidence-intelligence/docs/eo-mapper-v1.md)

### EO

- **Definición corta:** objeto de evidencia ejecutable, derivado de un `SER`.
- **Definición larga:** `EO` transforma una declaración estructurada de evidencia en un objeto con trigger, condiciones, exclusiones, decisión, acción, outcomes esperados, confianza, soporte, trazabilidad, restricciones operativas y estado de revisión. No es una orden médica autónoma: es un artefacto auditable que puede alimentar capas posteriores.
- **Tipo:** artefacto de evidencia.
- **Fuente primaria:** [packages/evidence-intelligence/src/models/eo.ts](../packages/evidence-intelligence/src/models/eo.ts)
- **Menciones:** [icicso/packages/domain/eo/README.md](../icicso/packages/domain/eo/README.md), [packages/evidence-intelligence/docs/eo-mapper-v1.md](../packages/evidence-intelligence/docs/eo-mapper-v1.md), [services/ingestion-orquestador/schemas/evidence/evidence_object.schema.json](../services/ingestion-orquestador/schemas/evidence/evidence_object.schema.json)

### EL

- **Definición corta:** Evidence Lake, registro canónico consultable de `EO`.
- **Definición larga:** `EL` persiste e indexa Evidence Objects para consulta, trazabilidad y reutilización. En el canon actual funciona como destino posterior de `EO` dentro del slice `SER -> EO -> EL`.
- **Tipo:** artefacto/registro de evidencia.
- **Fuente primaria:** [icicso/packages/domain/evidence-lake/README.md](../icicso/packages/domain/evidence-lake/README.md)
- **Menciones:** [START_HERE.md](../START_HERE.md), [SYSTEM_STATUS.md](../SYSTEM_STATUS.md), [icicso/packages/domain/ser/test-ser-eo-el-pipeline.ts](../icicso/packages/domain/ser/test-ser-eo-el-pipeline.ts)

### Evidence statement

- **Definición corta:** declaración clínica estructurada dentro de un `SER`.
- **Definición larga:** Es la unidad semántica que el mapper puede convertir en `EO`. Contiene función clínica, clase de intervención, comparador, dirección del efecto, fuerza, certeza, condiciones, exclusiones, outcomes y contexto operacional.
- **Tipo:** entidad interna de evidencia.
- **Fuente primaria:** [packages/evidence-intelligence/src/models/ser.ts](../packages/evidence-intelligence/src/models/ser.ts)
- **Menciones:** [packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json](../packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json), [packages/evidence-intelligence/seeds/colorectal-eras.bundle.json](../packages/evidence-intelligence/seeds/colorectal-eras.bundle.json)

### Canon semántico-operacional

- **Definición corta:** conjunto de contratos y catálogos que hacen estable la interpretación de evidencia.
- **Definición larga:** Vive principalmente en `packages/evidence-intelligence`: `ontology/` define catálogos controlados; `schemas/` define contratos validables; `src/models`, `src/validators` y `src/mappers` dan comportamiento operativo a la transformación de evidencia.
- **Tipo:** arquitectura de dominio.
- **Fuente primaria:** [packages/evidence-intelligence/docs/architecture.md](../packages/evidence-intelligence/docs/architecture.md)
- **Menciones:** [packages/evidence-intelligence/docs/ontology-v1.md](../packages/evidence-intelligence/docs/ontology-v1.md), [packages/evidence-intelligence/src/models](../packages/evidence-intelligence/src/models)

### Mapper SER -> EO

- **Definición corta:** transformación de un `StructuredEvidenceRecord` en un `EvidenceObject`.
- **Definición larga:** Convierte un statement de `SER` en un `EO` usando reglas de inferencia: deriva trigger, condiciones, decisión, acciones, outcomes, confianza, conflictos y estado de revisión. En v1, un statement genera un EO a la vez y no resuelve silenciosamente conflictos.
- **Tipo:** transformación/engine de dominio.
- **Fuente primaria:** [packages/evidence-intelligence/docs/eo-mapper-v1.md](../packages/evidence-intelligence/docs/eo-mapper-v1.md)
- **Menciones:** [packages/evidence-intelligence/src/mappers/ser-to-eo.ts](../packages/evidence-intelligence/src/mappers/ser-to-eo.ts), [packages/evidence-intelligence/tests/mapping.test.ts](../packages/evidence-intelligence/tests/mapping.test.ts)

### Trigger

- **Definición corta:** evento o situación que activa la aplicabilidad de un `EO`.
- **Definición larga:** En un `EO`, el trigger combina un evento con una función clínica. El mapper lo deriva del dominio clínico y de la función clínica primaria del statement.
- **Tipo:** campo de `EO`.
- **Fuente primaria:** [packages/evidence-intelligence/src/models/eo.ts](../packages/evidence-intelligence/src/models/eo.ts)
- **Menciones:** [packages/evidence-intelligence/examples/valid/eo.valid.json](../packages/evidence-intelligence/examples/valid/eo.valid.json), [packages/evidence-intelligence/docs/eo-mapper-v1.md](../packages/evidence-intelligence/docs/eo-mapper-v1.md)

### Decision readiness

- **Definición corta:** estado que indica si una evidencia está lista para ejecución, revisión o síntesis.
- **Definición larga:** ICICSO usa este campo para separar evidencia accionable de evidencia que requiere revisión humana, síntesis adicional o sólo contexto. Aparece en SER, EO y perfiles de aplicabilidad.
- **Tipo:** estado de decisión.
- **Fuente primaria:** [packages/evidence-intelligence/src/models/eo.ts](../packages/evidence-intelligence/src/models/eo.ts)
- **Menciones:** [packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json](../packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json), [packages/evidence-intelligence/seeds/cardiovascular-rct.bundle.json](../packages/evidence-intelligence/seeds/cardiovascular-rct.bundle.json)

### Inference trace

- **Definición corta:** rastro ordenado que explica cómo el sistema derivó campos de un `EO`.
- **Definición larga:** El `inferenceTrace` permite auditar la transformación de `SER` a `EO`: cada paso registra una decisión de inferencia y su racionalidad. Es clave para que un `EO` generado no sea una caja negra.
- **Tipo:** trazabilidad/inferencia.
- **Fuente primaria:** [packages/evidence-intelligence/src/models/eo.ts](../packages/evidence-intelligence/src/models/eo.ts)
- **Menciones:** [packages/evidence-intelligence/docs/eo-mapper-v1.md](../packages/evidence-intelligence/docs/eo-mapper-v1.md)

### Conflict marker

- **Definición corta:** marca explícita de conflicto o debilidad semántica en un `EO`.
- **Definición larga:** ICICSO no debe resolver silenciosamente conflictos. El mapper puede marcar conflictos como dirección de efecto mixta, baja aplicabilidad, evidencia antigua o fuerza insuficiente, elevando el estado a revisión humana cuando corresponde.
- **Tipo:** señal de revisión.
- **Fuente primaria:** [packages/evidence-intelligence/src/models/eo.ts](../packages/evidence-intelligence/src/models/eo.ts)
- **Menciones:** [packages/evidence-intelligence/docs/eo-mapper-v1.md](../packages/evidence-intelligence/docs/eo-mapper-v1.md), [packages/evidence-intelligence/seeds/conflictive-evidence.bundle.json](../packages/evidence-intelligence/seeds/conflictive-evidence.bundle.json)

### Provenance

- **Definición corta:** cadena de trazabilidad legal y técnica de un artefacto.
- **Definición larga:** En ICICSO, provenance registra origen, captura, actor, cadena de custodia, licencia, política de revisión, retención y versionado. Es un campo estructural de SER, EO y otros artefactos de evidencia.
- **Tipo:** trazabilidad/legal.
- **Fuente primaria:** [packages/evidence-intelligence/src/models/provenance.ts](../packages/evidence-intelligence/src/models/provenance.ts)
- **Menciones:** [packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json](../packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json), [packages/evidence-intelligence/docs/architecture.md](../packages/evidence-intelligence/docs/architecture.md)

### VRN

- **Definición corta:** identificador de registro/versionado usado para gobernar artefactos.
- **Definición larga:** `VRN` aparece como parte de la gobernanza de entidades y del continuum. Se usa para vincular versiones activas, estados, decisiones y trazabilidad institucional.
- **Tipo:** versionado/gobernanza.
- **Fuente primaria:** [services/ingestion-orquestador/docs/ICICSO_ENTITY_MODEL.md](../services/ingestion-orquestador/docs/ICICSO_ENTITY_MODEL.md)
- **Menciones:** [services/ingestion-orquestador/docs/ICICSO_CANONICAL_CONTINUUM.md](../services/ingestion-orquestador/docs/ICICSO_CANONICAL_CONTINUUM.md), [services/ingestion-orquestador/app/services/vrn_policy_service.py](../services/ingestion-orquestador/app/services/vrn_policy_service.py)

### Terminology binding

- **Definición corta:** vínculo entre un concepto usado por ICICSO y un sistema terminológico externo.
- **Definición larga:** El binding terminológico permite que un término clínico generado o usado por ICICSO pueda apuntar a sistemas como SNOMED CT, ICD-10, LOINC, RxNorm, ATC, UCUM o CPT. En el glosario, el binding es evidencia complementaria; no convierte el glosario en catálogo externo.
- **Tipo:** interoperabilidad/terminología.
- **Fuente primaria:** [services/ingestion-orquestador/docs/ICICSO_ENTITY_MODEL.md](../services/ingestion-orquestador/docs/ICICSO_ENTITY_MODEL.md)
- **Menciones:** [packages/evidence-intelligence/docs/architecture.md](../packages/evidence-intelligence/docs/architecture.md), [ICICSO_TERMINOLOGIAS/README.md](../ICICSO_TERMINOLOGIAS/README.md)

## Términos médicos generados por ICICSO

Estas entradas no sustituyen definiciones clínicas formales. Describen cómo ICICSO usa esos términos dentro de artefactos propios.

### CABG

- **Definición corta:** cirugía de revascularización coronaria usada como intervención en ejemplos ICICSO.
- **Definición larga:** En los seeds de revascularización, `CABG` aparece como intervención quirúrgica recomendada para adultos seleccionados con enfermedad de tronco coronario izquierdo o enfermedad coronaria multivaso con alta complejidad anatómica. ICICSO la modela como acción derivable desde un `SER` hacia un `EO`, con restricciones operativas como equipo de cirugía cardíaca, quirófano e ICU.
- **Tipo:** término médico generado/usado por artefactos ICICSO.
- **Fuente primaria:** [packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json](../packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json)
- **Menciones:** [packages/evidence-intelligence/examples/valid/eo.valid.json](../packages/evidence-intelligence/examples/valid/eo.valid.json), [packages/evidence-intelligence/tests/mapping.test.ts](../packages/evidence-intelligence/tests/mapping.test.ts)
- **Relación médica/terminológica:** el seed incluye binding SNOMED CT para `Coronary artery bypass graft` y CPT relacionado.

### Left main coronary artery disease

- **Definición corta:** condición cardiovascular usada como criterio de aplicabilidad para CABG.
- **Definición larga:** ICICSO la usa como parte de la población objetivo de un `SER` de revascularización coronaria. En el ejemplo, sirve para determinar condiciones de aplicabilidad, intervención preferida y necesidad de evaluación por heart team.
- **Tipo:** término médico generado/usado por artefactos ICICSO.
- **Fuente primaria:** [packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json](../packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json)
- **Menciones:** [packages/evidence-intelligence/examples/valid/eo.valid.json](../packages/evidence-intelligence/examples/valid/eo.valid.json)

### Multivessel CAD

- **Definición corta:** enfermedad coronaria multivaso usada como condición de activación de un `EO`.
- **Definición larga:** En el ejemplo válido de `EO`, `multivessel CAD` aparece como condición para una recomendación de evaluación y programación de CABG. El término no entra por haber sido descargado desde un vocabulario externo; entra porque ICICSO lo usa en un artefacto generado.
- **Tipo:** término médico generado/usado por artefactos ICICSO.
- **Fuente primaria:** [packages/evidence-intelligence/examples/valid/eo.valid.json](../packages/evidence-intelligence/examples/valid/eo.valid.json)
- **Menciones:** [packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json](../packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json)

### Heart team evaluation

- **Definición corta:** evaluación clínica multidisciplinaria usada como precondición para decisiones cardiovasculares complejas.
- **Definición larga:** ICICSO la modela como criterio de inclusión, condición operativa o trigger contextual para seleccionar intervención en enfermedad coronaria compleja. En el seed de CABG, aparece como precondición antes de selección final.
- **Tipo:** término médico-operativo generado/usado por artefactos ICICSO.
- **Fuente primaria:** [packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json](../packages/evidence-intelligence/seeds/cardiac-revascularization.bundle.json)
- **Menciones:** [packages/evidence-intelligence/examples/valid/eo.valid.json](../packages/evidence-intelligence/examples/valid/eo.valid.json)

### Queratocono / Keratoconus

- **Definición corta:** ectasia corneal progresiva disponible en el repo como concepto ICD-10 `H18.6`.
- **Definición larga:** ICICSO lo registra por ahora como término médico con binding terminológico local, no como `SER` o `EO` ya materializado. El dato vive en el paquete ICD-10 ClaML descargado en `ICICSO_TERMINOLOGIAS`: `H18.6` corresponde a `Keratoconus`, y también aparece una mención relacionada de queratocono en síndrome de Down dentro de `H19.8`. Cuando se genere evidencia ICICSO sobre diagnóstico, seguimiento, cross-linking, topografía/tomografía corneal o pathway oftalmológico, esta entrada debe enlazarse a esos artefactos.
- **Tipo:** término médico con binding terminológico; pendiente de artefacto `SER/EO`.
- **Fuente primaria:** [ICICSO_TERMINOLOGIAS/01_RAW/ICD10/icd10_claml.xml](../ICICSO_TERMINOLOGIAS/01_RAW/ICD10/icd10_claml.xml)
- **Menciones:** [ICICSO_TERMINOLOGIAS/01_RAW/ICD10/icd10_claml_package/icd102019en.xml](../ICICSO_TERMINOLOGIAS/01_RAW/ICD10/icd10_claml_package/icd102019en.xml)
- **Relación médica/terminológica:** ICD-10 `H18.6 Keratoconus`; mención relacionada `H19.8` con referencia a síndrome de Down `Q90.-`.

### Extended antithrombotic therapy

- **Definición corta:** intervención farmacológica modelada como evidencia con balance beneficio-daño.
- **Definición larga:** En el seed cardiovascular RCT, ICICSO la usa para representar terapia antitrombótica extendida posterior a revascularización vascular. El mapper espera generar un `EO` que no recomiende ejecución automática, sino `defer_to_review`, porque la dirección de efecto es mixta: reduce eventos isquémicos pero aumenta sangrado.
- **Tipo:** término médico generado/usado por artefactos ICICSO.
- **Fuente primaria:** [packages/evidence-intelligence/seeds/cardiovascular-rct.bundle.json](../packages/evidence-intelligence/seeds/cardiovascular-rct.bundle.json)
- **Menciones:** [packages/evidence-intelligence/tests/mapping.test.ts](../packages/evidence-intelligence/tests/mapping.test.ts)

### Bleeding risk review

- **Definición corta:** revisión de riesgo hemorrágico requerida antes de aplicar cierta evidencia antitrombótica.
- **Definición larga:** ICICSO la registra como precondición de implementación y restricción operativa en el ejemplo de terapia antitrombótica extendida. Es una señal de que el `EO` necesita revisión contextual y no activación silenciosa.
- **Tipo:** término médico-operativo generado/usado por artefactos ICICSO.
- **Fuente primaria:** [packages/evidence-intelligence/seeds/cardiovascular-rct.bundle.json](../packages/evidence-intelligence/seeds/cardiovascular-rct.bundle.json)
- **Menciones:** [packages/evidence-intelligence/docs/eo-mapper-v1.md](../packages/evidence-intelligence/docs/eo-mapper-v1.md)

### ERAS

- **Definición corta:** vía perioperatoria de recuperación mejorada usada en ejemplos de cirugía colorrectal.
- **Definición larga:** ICICSO usa ERAS para modelar evidencia de manejo postoperatorio, como ingesta oral temprana tras cirugía colorrectal electiva. En el seed, el término se conecta con outcomes como estancia hospitalaria y recuperación funcional, y con restricciones como protocolo de enfermería y firma quirúrgica postoperatoria.
- **Tipo:** término médico-operativo generado/usado por artefactos ICICSO.
- **Fuente primaria:** [packages/evidence-intelligence/seeds/colorectal-eras.bundle.json](../packages/evidence-intelligence/seeds/colorectal-eras.bundle.json)
- **Menciones:** [packages/evidence-intelligence/docs/eo-mapper-v1.md](../packages/evidence-intelligence/docs/eo-mapper-v1.md), [packages/evidence-intelligence/tests/mapping.test.ts](../packages/evidence-intelligence/tests/mapping.test.ts)

### Early oral intake

- **Definición corta:** intervención postoperatoria usada dentro del ejemplo ERAS colorrectal.
- **Definición larga:** En ICICSO, aparece como intervención de manejo postoperatorio para pacientes estables después de cirugía colorrectal electiva. El seed la vincula a outcomes esperados como menor estancia hospitalaria y mejor recuperación funcional.
- **Tipo:** término médico generado/usado por artefactos ICICSO.
- **Fuente primaria:** [packages/evidence-intelligence/seeds/colorectal-eras.bundle.json](../packages/evidence-intelligence/seeds/colorectal-eras.bundle.json)
- **Menciones:** [packages/evidence-intelligence/tests/mapping.test.ts](../packages/evidence-intelligence/tests/mapping.test.ts)

## Notas de mantenimiento

- Este archivo debe actualizarse cuando se agreguen nuevos seeds, schemas, EO, SER, catálogos de ontología o documentos canónicos.
- Para automatización futura, el generador debería leer `packages/evidence-intelligence/seeds`, `packages/evidence-intelligence/examples/valid`, `packages/evidence-intelligence/ontology`, schemas y docs canónicos, y proponer entradas nuevas con fuente y menciones.
- Los datasets en `ICICSO_TERMINOLOGIAS/01_RAW` no deben alimentar el glosario automáticamente. Sólo deben aparecer como binding, referencia o fuente de validación cuando un artefacto ICICSO ya usa el concepto, o cuando una entrada se promueve explícitamente como término médico pendiente de `SER/EO`.
- Cuando aparezca `software_orquestador`, leerlo como antecedente histórico del soporte activo ubicado en `services/ingestion-orquestador/`.
