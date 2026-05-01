import {
  buildHashMetadata,
  createAuditMetadata,
  createEoId,
  createVrn,
} from "../../shared-kernel/index.ts";
import {
  createEvidenceObjectPostgresRepository,
  type EvidenceObjectPostgresRepository,
} from "./repository-postgres.ts";
import {
  createInMemoryEvidenceObjectEventPublisher,
  type EvidenceObjectEventPublisher,
} from "./events.ts";
import {
  EvidenceObjectModuleDescriptor,
  type EvidenceObjectArtifact,
  type EvidenceObjectModuleContract,
  type EvidenceObjectPayload,
} from "./types.ts";

function shortenTitle(title: string): string {
  return title.length <= 88 ? title : `${title.slice(0, 85).trimEnd()}...`;
}

function inferDomainTags(documentType: string, issuingBody: string): string[] {
  const tags = new Set<string>(["evidence-object"]);
  const normalizedType = documentType.trim().toLowerCase();
  const normalizedAuthority = issuingBody.trim().toLowerCase();

  if (normalizedType) {
    tags.add(normalizedType);
  }

  if (normalizedAuthority.includes("acc")) {
    tags.add("acc");
  }

  if (normalizedAuthority.includes("aha")) {
    tags.add("aha");
  }

  if (normalizedAuthority.includes("esc")) {
    tags.add("esc");
  }

  if (normalizedType.includes("guideline")) {
    tags.add("guideline");
    tags.add("recommendation");
  }

  if (normalizedType.includes("trial")) {
    tags.add("trial");
  }

  if (normalizedType.includes("review")) {
    tags.add("review");
  }

  return [...tags];
}

function deriveCanonicalClaims(title: string, documentType: string, issuingBody: string): string[] {
  return [
    `${documentType} canonicalizado`,
    `fuente emisora ${issuingBody}`,
    `Evidence Object derivado desde SER`,
    shortenTitle(title),
  ];
}

export function createEvidenceObjectModuleService(
  repository: EvidenceObjectPostgresRepository = createEvidenceObjectPostgresRepository(),
  eventPublisher: EvidenceObjectEventPublisher = createInMemoryEvidenceObjectEventPublisher(),
): EvidenceObjectModuleContract {
  return {
    module: EvidenceObjectModuleDescriptor,
    inputs: [...EvidenceObjectModuleDescriptor.inputs],
    outputs: [...EvidenceObjectModuleDescriptor.outputs],
    async createFromRecord(record) {
      const previous = await repository.getBySourceId(record.payload.sourceId);
      const payload: EvidenceObjectPayload = {
        sourceRecordId: record.id,
        sourceId: record.payload.sourceId,
        canonicalTitle: record.payload.canonicalTitle,
        evidenceSynopsis: `${record.payload.shortTitle} · ${record.payload.issuingBody} ${record.payload.publicationYear}`,
        documentType: record.payload.documentType,
        issuingBody: record.payload.issuingBody,
        publicationDate: record.payload.publicationDate,
        publicationYear: record.payload.publicationYear,
        sourceUrlReference: record.payload.sourceUrlReference,
        sourceHash: record.payload.sourceHash,
        evidenceStatus: "Active",
        canonicalClaims: deriveCanonicalClaims(
          record.payload.canonicalTitle,
          record.payload.documentType,
          record.payload.issuingBody,
        ),
        domainTags: inferDomainTags(record.payload.documentType, record.payload.issuingBody),
      };
      const integrity = buildHashMetadata(payload, "sha256", previous?.integrity.hash ?? null);
      const artifact: EvidenceObjectArtifact = {
        id: createEoId(`EO-${integrity.hash.slice(0, 12).toUpperCase()}`),
        vrn: createVrn(),
        version: 1,
        createdAt: new Date().toISOString(),
        payload,
        audit: createAuditMetadata({
          createdBy: record.audit.createdBy,
          createdByType: record.audit.createdByType,
        }),
        provenance: [...record.provenance],
        integrity,
        maturity: "defined",
      };

      await repository.save(artifact);

      // Publish event for downstream processing
      await eventPublisher.publish({
        type: "evidence-object.created",
        eoId: artifact.id,
        sourceId: payload.sourceId,
        timestamp: artifact.createdAt,
        payload: {
          canonicalTitle: payload.canonicalTitle,
          documentType: payload.documentType,
          issuingBody: payload.issuingBody,
          domainTags: payload.domainTags,
        },
      });

      return artifact;
    },
    async getObject(sourceId) {
      return repository.getBySourceId(sourceId);
    },
    async listObjects() {
      return repository.list();
    },
  };
}
