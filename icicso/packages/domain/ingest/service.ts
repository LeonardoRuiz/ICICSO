import {
  buildHashMetadata,
  createAuditMetadata,
  createProvenanceMetadata,
  createVrn,
} from "../../shared-kernel/index.ts";
import { createInMemoryIngestModuleRepository, type IngestModuleRepository } from "./repository.ts";
import {
  IngestModuleDescriptor,
  type IngestModuleContract,
  type IngestedDocument,
  type IngestedDocumentPayload,
  type SourceDocumentInput,
} from "./types.ts";

function toPublicationYear(publicationDate: string): number {
  const parsed = new Date(publicationDate);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("publicationDate must be a valid ISO timestamp");
  }

  return parsed.getUTCFullYear();
}

function toPayload(input: SourceDocumentInput): IngestedDocumentPayload {
  return {
    sourceId: input.sourceId,
    canonicalTitle: input.title.trim(),
    documentType: input.documentType.trim(),
    issuingBody: input.issuingBody.trim(),
    publicationDate: new Date(input.publicationDate).toISOString(),
    publicationYear: toPublicationYear(input.publicationDate),
    sourceUrlReference: input.sourceUrlReference,
    content: input.content.trim(),
  };
}

export function createIngestModuleService(
  repository: IngestModuleRepository = createInMemoryIngestModuleRepository(),
): IngestModuleContract {
  return {
    module: IngestModuleDescriptor,
    inputs: [...IngestModuleDescriptor.inputs],
    outputs: [...IngestModuleDescriptor.outputs],
    async ingestDocument(input) {
      const payload = toPayload(input);
      const integrity = buildHashMetadata(payload);
      const artifact: IngestedDocument = {
        id: `ING-${integrity.hash.slice(0, 12).toUpperCase()}`,
        vrn: createVrn(),
        version: 1,
        createdAt: new Date().toISOString(),
        payload,
        audit: createAuditMetadata({
          createdBy: input.createdBy,
          createdByType: input.createdByType,
        }),
        provenance: [
          createProvenanceMetadata({
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            location: input.location,
            chainOfCustody: input.chainOfCustody,
            notes: input.notes,
          }),
        ],
        integrity,
        maturity: "implemented",
      };

      await repository.save(artifact);
      return artifact;
    },
    async getDocument(sourceId) {
      return repository.getBySourceId(sourceId);
    },
    async listDocuments() {
      return repository.list();
    },
  };
}
