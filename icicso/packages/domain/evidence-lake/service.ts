import type { PrismaClient } from "@prisma/client";
import {
  buildHashMetadata,
  createAuditMetadata,
  createVrn,
} from "../../shared-kernel/index.ts";
import {
  createPostgresEvidenceLakeModuleRepository,
} from "./repository-postgres.ts";
import {
  createInMemoryEvidenceLakeModuleRepository,
  type EvidenceLakeModuleRepository,
} from "./repository.ts";
import {
  EvidenceLakeModuleDescriptor,
  type EvidenceLakeModuleContract,
  type EvidenceLakeRecordArtifact,
  type EvidenceLakeRecordPayload,
} from "./types.ts";
import {
  createInMemoryEvidenceLakeEventPublisher,
  type EvidenceLakeEventPublisher,
} from "./events.ts";

function buildIndexingKey(sourceId: string, title: string): string {
  return `${sourceId}::${title.trim().toLowerCase().replace(/\s+/g, "-")}`;
}

export function createEvidenceLakeModuleService(
  prismaOrRepository?: PrismaClient | EvidenceLakeModuleRepository,
  eventPublisher: EvidenceLakeEventPublisher = createInMemoryEvidenceLakeEventPublisher(),
): EvidenceLakeModuleContract {
  const repository = isEvidenceLakeRepository(prismaOrRepository)
    ? prismaOrRepository
    : prismaOrRepository
      ? createPostgresEvidenceLakeModuleRepository(prismaOrRepository)
      : createInMemoryEvidenceLakeModuleRepository();
  return {
    module: EvidenceLakeModuleDescriptor,
    inputs: [...EvidenceLakeModuleDescriptor.inputs],
    outputs: [...EvidenceLakeModuleDescriptor.outputs],
    async indexEvidenceObject(object) {
      const previous = await repository.getBySourceId(object.payload.sourceId);
      const payload: EvidenceLakeRecordPayload = {
        sourceObjectId: object.id,
        sourceRecordId: object.payload.sourceRecordId,
        sourceId: object.payload.sourceId,
        canonicalTitle: object.payload.canonicalTitle,
        evidenceSynopsis: object.payload.evidenceSynopsis,
        lakeStatus: "indexed",
        indexingKey: buildIndexingKey(object.payload.sourceId, object.payload.canonicalTitle),
        domainTags: [...object.payload.domainTags],
        canonicalClaims: [...object.payload.canonicalClaims],
        evidenceHash: object.integrity.hash,
        snapshotSummary: `${object.payload.evidenceStatus} · ${object.payload.issuingBody} ${object.payload.publicationYear}`,
      };
      const integrity = buildHashMetadata(payload, "sha256", previous?.integrity.hash ?? null);
      const artifact: EvidenceLakeRecordArtifact = {
        id: `EL-${integrity.hash.slice(0, 12).toUpperCase()}`,
        vrn: createVrn(),
        version: 1,
        createdAt: new Date().toISOString(),
        payload,
        audit: createAuditMetadata({
          createdBy: object.audit.createdBy,
          createdByType: object.audit.createdByType,
        }),
        provenance: [...object.provenance],
        integrity,
        maturity: "implemented",
      };

      await repository.save(artifact);

      await eventPublisher.publish({
        type: "evidence-lake.record.indexed",
        payload: {
          record: artifact,
          indexedAt: new Date().toISOString(),
        },
      });

      return artifact;
    },
    async getRecord(sourceId) {
      return repository.getBySourceId(sourceId);
    },
    async listRecords() {
      return repository.list();
    },
  };
}

function isEvidenceLakeRepository(
  candidate: PrismaClient | EvidenceLakeModuleRepository | undefined,
): candidate is EvidenceLakeModuleRepository {
  return Boolean(
    candidate
      && typeof candidate === "object"
      && "save" in candidate
      && "getBySourceId" in candidate
      && "list" in candidate,
  );
}
