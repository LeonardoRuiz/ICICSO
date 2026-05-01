# Evidence Intelligence Ontology v1.0

## Principios

- Todos los catálogos usan JSON canónico homogéneo.
- Cada entrada expone `id`, `code`, `label`, `description` y `usageNotes`.
- `code` es el valor persistible para APIs, validación, UI y pipelines.
- `id` es el identificador estable de ontología para referencias internas y migraciones.

## Catálogos nucleares

- `evidence-types`: clasifica el artefacto fuente y define familia, nivel por defecto y readiness por defecto.
- `evidence-levels`: jerarquía operacional de evidencia para conflicto y weighting.
- `clinical-functions`: propósito clínico primario del statement o EO.
- `intervention-classes`: clase de intervención accionable.
- `outcome-classes`: clase de outcome esperado o monitorizable.
- `time-horizons`: ventanas temporales normalizadas.
- `certainty-levels`: escala de certeza.
- `uncertainty-sources`: causas explícitas de incertidumbre.
- `applicability-dimensions`: dimensiones independientes del fit contextual.
- `jurisdictions`: modelo de jurisdicción con bandas de prioridad.
- `implementation-complexity`: complejidad operativa.
- `effect-direction`: dirección del efecto.
- `conflict-resolution-priorities`: prioridad de resolución de conflicto.
- `evidence-decay`: half-life y gatillos de reappraisal.
- `provenance-minimum-set`: conjunto mínimo legal/auditable.
- `operational-relevance`: peso operacional de una recomendación.

## Decisiones de nomenclatura

- Se migró de códigos `UPPER_SNAKE_CASE` a `kebab-case` porque es más estable para JSON, URLs, filtros de UI y validación cross-language.
- Se separó `registry` de `rwe` para evitar perder la diferencia entre evidencia registry-governed y evidencia rutinaria heterogénea.
- Se separó `cost-effectiveness` de `budget-impact` porque responden a preguntas distintas y no deben colapsarse.
- Se agregó `mixed` en `effect-direction` porque la reducción forzada a una sola polaridad perdía semántica clínica real.

## Validación

- El shape de cada catálogo queda cubierto por [ontology-catalog.schema.json](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/packages/evidence-intelligence/schemas/ontology-catalog.schema.json).
- La consistencia entre catálogos y enums TypeScript queda cubierta por [ontology.validator.ts](/c:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/packages/evidence-intelligence/src/validators/ontology.validator.ts).
