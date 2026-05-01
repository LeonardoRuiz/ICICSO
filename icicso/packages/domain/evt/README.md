# evt

## Propósito del módulo

Generar un catálogo de disparadores operativos y eventos clínicos derivados del CPO para su uso en gates y eventos de caso.

## Inputs

ClinicalPracticeObjectArtifact

## Outputs

EventTriggerCatalogArtifact

## Dependencias

shared-kernel, cpo, tam

## Estado actual

Implementado. El módulo ahora genera un catálogo de eventos basado en CPO, valida el catálogo y soporta cache e invalidación.
