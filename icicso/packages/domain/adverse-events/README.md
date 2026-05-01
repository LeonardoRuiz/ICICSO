# adverse-events

## Propósito del módulo

Detectar y registrar eventos adversos clínicos desde catálogos de triggers de eventos.

## Inputs

EventTriggerCatalog

## Outputs

ClinicalAdverseEventRecord

## Dependencias

shared-kernel, evt

## Estado actual

Implementado. El módulo detecta eventos adversos basados en triggers, calcula puntuación de riesgo global y soporta cache e invalidación.
