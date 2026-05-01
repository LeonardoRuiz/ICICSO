# evidence-lake
## Propósito del módulo
Persistir e indexar `Evidence Object` en un registro canónico consultable y trazable.
## Inputs
`EvidenceObjectArtifact`
## Outputs
`EvidenceLakeRecordArtifact`
## Dependencias
`shared-kernel`, `eo`
## Estado actual
Slice canónico ya implementado en memoria.
## Capacidades
- indexar `EO` en un registro de lake
- preservar hash encadenado, auditoría y procedencia
- exponer `indexEvidenceObject`, `getRecord` y `listRecords`
## Siguiente paso
Volver durable el lake y añadir snapshots/consultas más ricas.
 ## Propósito del módulo
 Persistir EO en un repositorio consultable y trazable.
 ## Inputs
 EvidenceObject
 ## Outputs
 EvidenceLakeRecord
 ## Dependencias
 shared-kernel, eo
 ## Estado inicial
 Scaffolded. Contrato base creado y listo para implementación formal.
