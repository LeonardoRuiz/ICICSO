import { buildHashMetadata, createAuditMetadata, createVrn } from "../../shared-kernel/index.ts";
import {
  createSourceEvidenceRecordPostgresRepository,
  type SourceEvidenceRecordPostgresRepository,
} from "./repository-postgres.ts";
import {
  createInMemorySourceEvidenceRecordEventPublisher,
  type SourceEvidenceRecordEventPublisher,
} from "./events.ts";
import {
  SourceEvidenceRecordModuleDescriptor,
  type SourceEvidenceRecordArtifact,
  type SourceEvidenceRecordModuleContract,
  type SourceEvidenceRecordPayload,
} from "./types.ts";

function shortenTitle(title: string): string {
  return title.length <= 48 ? title : `${title.slice(0, 45).trimEnd()}...`;
}

export function createSourceEvidenceRecordModuleService(
  repository: SourceEvidenceRecordPostgresRepository = createSourceEvidenceRecordPostgresRepository(),
  eventPublisher: SourceEvidenceRecordEventPublisher = createInMemorySourceEvidenceRecordEventPublisher(),
): SourceEvidenceRecordModuleContract {
  return {
    module: SourceEvidenceRecordModuleDescriptor,
    inputs: [...SourceEvidenceRecordModuleDescriptor.inputs],
    outputs: [...SourceEvidenceRecordModuleDescriptor.outputs],
    async registerFromIngest(document) {
      const previous = await repository.getBySourceId(document.payload.sourceId);
      const payload: SourceEvidenceRecordPayload = {
        sourceDocumentId: document.id,
        sourceId: document.payload.sourceId,
        canonicalTitle: document.payload.canonicalTitle,
        shortTitle: shortenTitle(document.payload.canonicalTitle),
        documentType: document.payload.documentType,
        issuingBody: document.payload.issuingBody,
        publicationDate: document.payload.publicationDate,
        publicationYear: document.payload.publicationYear,
        sourceUrlReference: document.payload.sourceUrlReference,
        sourceHash: document.integrity.hash,
        lifecycleStatus: "validated",
      };
      const integrity = buildHashMetadata(payload, "sha256", previous?.integrity.hash ?? null);
      const artifact: SourceEvidenceRecordArtifact = {
        id: `SER-${integrity.hash.slice(0, 12).toUpperCase()}`,
        vrn: createVrn(),
        version: 1,
        createdAt: new Date().toISOString(),
        payload,
        audit: createAuditMetadata({
          createdBy: document.audit.createdBy,
          createdByType: document.audit.createdByType,
        }),
        provenance: [...document.provenance],
        integrity,
      };
      await repository.save(artifact);

      // Publish event for downstream processing
      await eventPublisher.publish({
        type: "source-evidence-record.created",
        serId: artifact.id,
        sourceId: payload.sourceId,
        timestamp: artifact.createdAt,
        payload: {
          canonicalTitle: payload.canonicalTitle,
          documentType: payload.documentType,
          issuingBody: payload.issuingBody,
          publicationYear: payload.publicationYear,
        },
      });

      return artifact;
    },
    async getRecord(sourceId) {
      return await repository.getBySourceId(sourceId);
    },
    async listRecords() {
      return await repository.list();
    },
  };
}
