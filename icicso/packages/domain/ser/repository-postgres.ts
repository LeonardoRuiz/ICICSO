// Mock Prisma client for development
// In production, import from "@icicso/database"
interface MockPrismaClient {
  sourceEvidenceRecord: {
    upsert: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    update: (args: any) => Promise<any>;
  };
}

function getPrismaClient(): MockPrismaClient {
  // Mock implementation - replace with real Prisma client
  const records = new Map<string, any>();

  return {
    sourceEvidenceRecord: {
      upsert: async ({ where, update, create }) => {
        const key = where.sourceId || create.sourceId;
        const existing = records.get(key);
        if (existing) {
          records.set(key, { ...existing, ...update, updatedAt: new Date().toISOString() });
          return records.get(key);
        } else {
          records.set(key, { ...create, createdAt: new Date().toISOString() });
          return records.get(key);
        }
      },
      findUnique: async ({ where }) => {
        if (where.sourceId) return records.get(where.sourceId) || null;
        if (where.serId) {
          for (const record of records.values()) {
            if (record.serId === where.serId) return record;
          }
        }
        return null;
      },
      findMany: async ({ orderBy }) => {
        const values = Array.from(records.values());
        if (orderBy?.sourceId === 'asc') {
          values.sort((a, b) => a.sourceId.localeCompare(b.sourceId));
        }
        return values;
      },
      update: async ({ where, data }) => {
        const record = records.get(where.serId);
        if (record) {
          const updated = { ...record, ...data, updatedAt: new Date().toISOString() };
          records.set(record.sourceId, updated);
          return updated;
        }
        throw new Error('Record not found');
      },
    },
  };
}
import type { SourceEvidenceRecordArtifact } from "./types.ts";

export interface SourceEvidenceRecordPostgresRepository {
  save(record: SourceEvidenceRecordArtifact): Promise<void>;
  getBySourceId(sourceId: string): Promise<SourceEvidenceRecordArtifact | null>;
  getBySerId(serId: string): Promise<SourceEvidenceRecordArtifact | null>;
  list(): Promise<SourceEvidenceRecordArtifact[]>;
  update(serId: string, updates: Partial<SourceEvidenceRecordArtifact>): Promise<void>;
}

export function createSourceEvidenceRecordPostgresRepository(): SourceEvidenceRecordPostgresRepository {
  const prisma = getPrismaClient();

  return {
    async save(record) {
      await prisma.sourceEvidenceRecord.upsert({
        where: { sourceId: record.payload.sourceId },
        update: {
          vrn: record.vrn,
          version: record.version,
          canonicalTitle: record.payload.canonicalTitle,
          shortTitle: record.payload.shortTitle,
          documentType: record.payload.documentType,
          issuingBody: record.payload.issuingBody,
          publicationDate: record.payload.publicationDate,
          publicationYear: record.payload.publicationYear,
          sourceUrlReference: record.payload.sourceUrlReference,
          sourceHash: record.payload.sourceHash,
          lifecycleStatus: record.payload.lifecycleStatus,
          payload: record.payload,
          audit: record.audit,
          provenance: record.provenance,
          integrity: record.integrity,
          updatedAt: new Date().toISOString(),
        },
        create: {
          serId: record.id,
          vrn: record.vrn,
          version: record.version,
          sourceDocumentId: record.payload.sourceDocumentId,
          sourceId: record.payload.sourceId,
          canonicalTitle: record.payload.canonicalTitle,
          shortTitle: record.payload.shortTitle,
          documentType: record.payload.documentType,
          issuingBody: record.payload.issuingBody,
          publicationDate: record.payload.publicationDate,
          publicationYear: record.payload.publicationYear,
          sourceUrlReference: record.payload.sourceUrlReference,
          sourceHash: record.payload.sourceHash,
          lifecycleStatus: record.payload.lifecycleStatus,
          payload: record.payload,
          audit: record.audit,
          provenance: record.provenance,
          integrity: record.integrity,
        },
      });
    },

    async getBySourceId(sourceId) {
      const record = await prisma.sourceEvidenceRecord.findUnique({
        where: { sourceId },
      });

      if (!record) return null;

      return {
        id: record.serId,
        vrn: record.vrn,
        version: record.version,
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : record.createdAt.toISOString(),
        payload: record.payload as any,
        audit: record.audit as any,
        provenance: record.provenance as any,
        integrity: record.integrity as any,
        maturity: "implemented" as const,
      };
    },

    async getBySerId(serId) {
      const record = await prisma.sourceEvidenceRecord.findUnique({
        where: { serId },
      });

      if (!record) return null;

      return {
        id: record.serId,
        vrn: record.vrn,
        version: record.version,
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : record.createdAt.toISOString(),
        payload: record.payload as any,
        audit: record.audit as any,
        provenance: record.provenance as any,
        integrity: record.integrity as any,
        maturity: "implemented" as const,
      };
    },

    async list() {
      const records = await prisma.sourceEvidenceRecord.findMany({
        orderBy: { sourceId: 'asc' },
      });

      return records.map(record => ({
        id: record.serId,
        vrn: record.vrn,
        version: record.version,
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : record.createdAt.toISOString(),
        payload: record.payload as any,
        audit: record.audit as any,
        provenance: record.provenance as any,
        integrity: record.integrity as any,
        maturity: "implemented" as const,
      }));
    },

    async update(serId, updates) {
      const updateData: any = {};

      if (updates.payload) {
        updateData.payload = updates.payload;
        if (updates.payload.canonicalTitle) updateData.canonicalTitle = updates.payload.canonicalTitle;
        if (updates.payload.shortTitle) updateData.shortTitle = updates.payload.shortTitle;
        if (updates.payload.documentType) updateData.documentType = updates.payload.documentType;
        if (updates.payload.issuingBody) updateData.issuingBody = updates.payload.issuingBody;
        if (updates.payload.publicationDate) updateData.publicationDate = updates.payload.publicationDate;
        if (updates.payload.publicationYear) updateData.publicationYear = updates.payload.publicationYear;
        if (updates.payload.sourceUrlReference) updateData.sourceUrlReference = updates.payload.sourceUrlReference;
        if (updates.payload.sourceHash) updateData.sourceHash = updates.payload.sourceHash;
        if (updates.payload.lifecycleStatus) updateData.lifecycleStatus = updates.payload.lifecycleStatus;
      }

      if (updates.audit) updateData.audit = updates.audit;
      if (updates.provenance) updateData.provenance = updates.provenance;
      if (updates.integrity) updateData.integrity = updates.integrity;
      if (updates.version) updateData.version = updates.version;

      updateData.updatedAt = new Date().toISOString();

      await prisma.sourceEvidenceRecord.update({
        where: { serId },
        data: updateData,
      });
    },
  };
}
