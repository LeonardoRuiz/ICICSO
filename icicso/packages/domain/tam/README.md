# tam

## Propósito del módulo

Ordenar la activación temporal de un CPO para soportar ejecución clínica y orquestación de fases de atención.

## Inputs

ClinicalPracticeObjectArtifact

## Outputs

TemporalActivationModelArtifact

## Dependencias

shared-kernel, cpo

## Estado actual

Implementado. El módulo ahora genera un modelo TAM basado en un CPO, valida el plan temporal y soporta cache e invalidación.
