# Evidence Object (EO) Module

## Propósito del módulo

Convertir `SER` en `Evidence Object` versionado y auditable con claims canónicos y tags de dominio.

## Arquitectura

```
SourceEvidenceRecordArtifact → EO Generator → PostgreSQL Repository → Event Stream
                                        ↓
                           EvidenceObjectArtifact
```

## Inputs

`SourceEvidenceRecordArtifact` (de módulo ser)

## Outputs

`EvidenceObjectArtifact` (bounded context EO)

## Eventos

- `evidence-object.created`: Publicado cuando se crea un nuevo EO

## Dependencias

- shared-kernel
- ser
- @icicso/database (PostgreSQL con Prisma)

## Estado actual

**Implementado y testeable**. Incluye:

- ✅ Servicio con lógica de transformación semántica completa
- ✅ Repositorio PostgreSQL (con mock para desarrollo)
- ✅ Inferencia automática de domain tags (ACC, AHA, ESC, guideline, trial, etc.)
- ✅ Derivación de canonical claims
- ✅ Publicación de eventos para downstream
- ✅ Test de integración end-to-end

## Capacidades

- **Transformación semántica**: Convierte SER en EO con claims y tags
- **Domain tagging**: Etiquetas automáticas basadas en tipo de documento y autoridad emisora
- **Hash continuity**: Preserva integridad desde SER original
- **Event streaming**: Notifica creación para procesamiento downstream

## Uso

```typescript
import { createEvidenceObjectModuleService } from "@icicso/eo";

const eoService = createEvidenceObjectModuleService();

// Crear EO desde SER
const eo = await eoService.createFromRecord(sourceEvidenceRecord);

// Recuperar por source ID
const object = await eoService.getObject("source-id-123");
```

## Próximo paso

Conectar EO hacia Evidence Lake para persistencia canónica y consultas.
