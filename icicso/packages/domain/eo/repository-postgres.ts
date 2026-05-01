import type { EvidenceObjectArtifact } from "./types.ts";

export interface EvidenceObjectPostgresRepository {
    save(record: EvidenceObjectArtifact): Promise<void>;
    getBySourceId(sourceId: string): Promise<EvidenceObjectArtifact | null>;
    getByEoId(eoId: string): Promise<EvidenceObjectArtifact | null>;
    list(): Promise<EvidenceObjectArtifact[]>;
    update(eoId: string, updates: Partial<EvidenceObjectArtifact>): Promise<void>;
}

// Mock Prisma client for development
// In production, import from "@icicso/database"
interface MockPrismaClient {
    evidenceObject: {
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
        evidenceObject: {
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
                if (where.eoId) {
                    for (const record of records.values()) {
                        if (record.eoId === where.eoId) return record;
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
                const record = records.get(where.eoId);
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

export function createEvidenceObjectPostgresRepository(): EvidenceObjectPostgresRepository {
    const prisma = getPrismaClient();

    return {
        async save(record) {
            await prisma.evidenceObject.upsert({
                where: { sourceId: record.payload.sourceId },
                update: {
                    vrn: record.vrn,
                    version: record.version,
                    canonicalTitle: record.payload.canonicalTitle,
                    evidenceSynopsis: record.payload.evidenceSynopsis,
                    documentType: record.payload.documentType,
                    issuingBody: record.payload.issuingBody,
                    publicationDate: record.payload.publicationDate,
                    publicationYear: record.payload.publicationYear,
                    sourceUrlReference: record.payload.sourceUrlReference,
                    sourceHash: record.payload.sourceHash,
                    evidenceStatus: record.payload.evidenceStatus,
                    canonicalClaims: record.payload.canonicalClaims,
                    domainTags: record.payload.domainTags,
                    payload: record.payload,
                    audit: record.audit,
                    provenance: record.provenance,
                    integrity: record.integrity,
                    updatedAt: new Date().toISOString(),
                },
                create: {
                    eoId: record.id,
                    vrn: record.vrn,
                    version: record.version,
                    sourceRecordId: record.payload.sourceRecordId,
                    sourceId: record.payload.sourceId,
                    canonicalTitle: record.payload.canonicalTitle,
                    evidenceSynopsis: record.payload.evidenceSynopsis,
                    documentType: record.payload.documentType,
                    issuingBody: record.payload.issuingBody,
                    publicationDate: record.payload.publicationDate,
                    publicationYear: record.payload.publicationYear,
                    sourceUrlReference: record.payload.sourceUrlReference,
                    sourceHash: record.payload.sourceHash,
                    evidenceStatus: record.payload.evidenceStatus,
                    canonicalClaims: record.payload.canonicalClaims,
                    domainTags: record.payload.domainTags,
                    payload: record.payload,
                    audit: record.audit,
                    provenance: record.provenance,
                    integrity: record.integrity,
                },
            });
        },

        async getBySourceId(sourceId) {
            const record = await prisma.evidenceObject.findUnique({
                where: { sourceId },
            });

            if (!record) return null;

            return {
                id: record.eoId,
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

        async getByEoId(eoId) {
            const record = await prisma.evidenceObject.findUnique({
                where: { eoId },
            });

            if (!record) return null;

            return {
                id: record.eoId,
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
            const records = await prisma.evidenceObject.findMany({
                orderBy: { sourceId: 'asc' },
            });

            return records.map(record => ({
                id: record.eoId,
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

        async update(eoId, updates) {
            const updateData: any = {};

            if (updates.payload) {
                updateData.payload = updates.payload;
                if (updates.payload.canonicalTitle) updateData.canonicalTitle = updates.payload.canonicalTitle;
                if (updates.payload.evidenceSynopsis) updateData.evidenceSynopsis = updates.payload.evidenceSynopsis;
                if (updates.payload.documentType) updateData.documentType = updates.payload.documentType;
                if (updates.payload.issuingBody) updateData.issuingBody = updates.payload.issuingBody;
                if (updates.payload.publicationDate) updateData.publicationDate = updates.payload.publicationDate;
                if (updates.payload.publicationYear) updateData.publicationYear = updates.payload.publicationYear;
                if (updates.payload.sourceUrlReference) updateData.sourceUrlReference = updates.payload.sourceUrlReference;
                if (updates.payload.sourceHash) updateData.sourceHash = updates.payload.sourceHash;
                if (updates.payload.evidenceStatus) updateData.evidenceStatus = updates.payload.evidenceStatus;
                if (updates.payload.canonicalClaims) updateData.canonicalClaims = updates.payload.canonicalClaims;
                if (updates.payload.domainTags) updateData.domainTags = updates.payload.domainTags;
            }

            if (updates.audit) updateData.audit = updates.audit;
            if (updates.provenance) updateData.provenance = updates.provenance;
            if (updates.integrity) updateData.integrity = updates.integrity;
            if (updates.version) updateData.version = updates.version;

            updateData.updatedAt = new Date().toISOString();

            await prisma.evidenceObject.update({
                where: { eoId },
                data: updateData,
            });
        },
    };
}
