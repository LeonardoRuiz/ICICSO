# Source Evidence Record (SER) Module

## Propósito del módulo

Representar evidencia fuente validada y versionada antes de `EO`. Actúa como contrato unificado entre los pipelines de ingesta Python y TypeScript.

## Arquitectura

```
IngestedDocument → SER Service → PostgreSQL Repository → Event Stream
                                      ↓
                               SourceEvidenceRecordArtifact
```

## Inputs

`IngestedDocument` (de módulo ingest)

## Outputs

`SourceEvidenceRecordArtifact` (bounded context SER)

## Eventos

- `source-evidence-record.created`: Publicado cuando se registra un nuevo SER

## Dependencias

- shared-kernel
- ingest
- @icicso/database (PostgreSQL con Prisma)

## Estado actual

**Implementado y testeable**. Incluye:
- ✅ Servicio con lógica de negocio completa
- ✅ Repositorio PostgreSQL (con mock para desarrollo)
- ✅ Publicación de eventos
- ✅ Tipos TypeScript completos
- ✅ Test básico de integración

## Uso

```typescript
import { createSourceEvidenceRecordModuleService } from "@icicso/ser";

const serService = createSourceEvidenceRecordModuleService();

// Registrar documento ingerido
const ser = await serService.registerFromIngest(ingestedDocument);

// Recuperar por source ID
const record = await serService.getRecord("source-id-123");
```
