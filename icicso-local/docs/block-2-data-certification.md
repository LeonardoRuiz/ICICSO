# Bloque 2 - Contrato de Certificación de Datos

## Estado del contrato

Este documento define la compuerta operativa que usa Bloque 2 para decidir si un dataset puede progresar hacia `Evidence Lake`.

Debe leerse como contrato de runtime demo vigente, no como normativa institucional final.

## Propósito

Bloque 2 transforma entradas clínicas heterogéneas en un dataset:

- estructurado
- trazable
- semánticamente válido
- certificable para capas superiores

La salida de este contrato decide si el caso queda:

- `PASS`
- `PARTIAL`
- `FAIL`

## Objetos contractuales

- `ingested_document`
- `parsed_variable`
- `provenance_record`
- `terminology_mapping`
- `data_certification_record`
- `dataset_status`

## Reglas de elegibilidad

Una variable se considera usable por capas superiores solo si:

- no está ausente
- conserva provenance válido
- pasó validación semántica mínima
- tiene unidad válida cuando aplica
- tiene mapping terminológico válido cuando aplica
- no arrastra hard blocker abierto

## Hard blockers

Un dataset cae a `FAIL` si existe cualquiera de estos estados:

- variable obligatoria faltante
- inconsistencia semántica material
- unidad inválida
- código terminológico inválido o no mapeado

## Soft flags

Un dataset puede quedar en `PARTIAL` si persisten flags blandos como:

- dato antiguo
- baja confiabilidad
- parsing débil
- cobertura documental incompleta sin romper mínimos obligatorios

## Fixture demo vigente

El fixture inicial CABG contempla al menos:

- troponina
- creatinina
- HbA1c
- FEVI

Ese fixture sirve para:

- probar ingestión estructurada
- recalcular `dataset_status`
- liberar o bloquear el paso hacia `Evidence Lake`

## Decisión contractual

La compuerta debe interpretarse así:

- `PASS`: Bloque 3 puede construir snapshot científico del caso
- `PARTIAL`: el caso sigue visible, pero no debe asumirse plenamente listo
- `FAIL`: Bloque 3 no debe tratar el dataset como base certificada

## Relación con Bloque 3

Este contrato entrega a Bloque 3:

- variables certificadas
- provenance verificable
- mapping terminológico mínimo
- una decisión explícita sobre aptitud del dataset

Sin esa decisión, `Evidence Lake` no debe presentarse como sustentado por datos suficientes del caso.
