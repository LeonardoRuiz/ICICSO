# ingest

## Propósito del módulo

Normalizar fuentes entrantes hacia un artefacto canónico y trazable consumible por `SER`.

## Inputs

documentos fuente, metadatos de procedencia

## Outputs

`IngestedDocument`

## Dependencias

shared-kernel

## Estado actual

Parcial. Ya genera artefactos versionados con auditoría, procedencia e integridad hash, pero todavía no persiste fuera de memoria.
