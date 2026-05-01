import type { PrismaClient } from "@icicso/database";
import type { EvidenceLakeRecordArtifact } from "./types.ts";
import type { EvidenceLakeModuleRepository } from "./repository.ts";

export function createPostgresEvidenceLakeModuleRepository(
    prisma: PrismaClient,
): EvidenceLakeModuleRepository {
    return {
        async save(record) {
            await prisma.evidenceLakeRecord.upsert({
                where: { sourceId: record.payload.sourceId },
                update: {
                    vrn: record.vrn,
                    version: record.version,
                    sourceObjectId: record.payload.sourceObjectId,
                    sourceRecordId: record.payload.sourceRecordId,
                    canonicalTitle: record.payload.canonicalTitle,
                    evidenceSynopsis: record.payload.evidenceSynopsis,
                    lakeStatus: record.payload.lakeStatus,
                    indexingKey: record.payload.indexingKey,
                    domainTags: record.payload.domainTags,
                    canonicalClaims: record.payload.canonicalClaims,
                    evidenceHash: record.payload.evidenceHash,
                    snapshotSummary: record.payload.snapshotSummary,
                    audit: record.audit,
                    provenance: record.provenance,
                    integrity: record.integrity,
                    updatedAt: new Date(),
                },
                create: {
                    elrId: record.id,
                    vrn: record.vrn,
                    version: record.version,
                    sourceObjectId: record.payload.sourceObjectId,
                    sourceRecordId: record.payload.sourceRecordId,
                    sourceId: record.payload.sourceId,
                    canonicalTitle: record.payload.canonicalTitle,
                    evidenceSynopsis: record.payload.evidenceSynopsis,
                    lakeStatus: record.payload.lakeStatus,
                    indexingKey: record.payload.indexingKey,
                    domainTags: record.payload.domainTags,
                    canonicalClaims: record.payload.canonicalClaims,
                    evidenceHash: record.payload.evidenceHash,
                    snapshotSummary: record.payload.snapshotSummary,
                    audit: record.audit,
                    provenance: record.provenance,
                    integrity: record.integrity,
                },
            });
        },

        async getBySourceId(sourceId) {
            const record = await prisma.evidenceLakeRecord.findUnique({
                where: { sourceId },
            });

            if (!record) {
                return null;
            }

            return {
                id: record.elrId,
                vrn: record.vrn,
                version: record.version,
                payload: {
                    sourceObjectId: record.sourceObjectId,
                    sourceRecordId: record.sourceRecordId,
                    sourceId: record.sourceId,
                    canonicalTitle: record.canonicalTitle,
                    evidenceSynopsis: record.evidenceSynopsis,
                    lakeStatus: record.lakeStatus as "indexed",
                    indexingKey: record.indexingKey,
                    domainTags: record.domainTags as string[],
                    canonicalClaims: record.canonicalClaims as string[],
                    evidenceHash: record.evidenceHash,
                    snapshotSummary: record.snapshotSummary,
                },
                audit: record.audit as any,
                provenance: record.provenance as any,
                integrity: record.integrity as any,
            };
        },

        async list() {
            const records = await prisma.evidenceLakeRecord.findMany({
                orderBy: { createdAt: "asc" },
            });

            return records.map((record) => ({
                id: record.elrId,
                vrn: record.vrn,
                version: record.version,
                payload: {
                    sourceObjectId: record.sourceObjectId,
                    sourceRecordId: record.sourceRecordId,
                    sourceId: record.sourceId,
                    canonicalTitle: record.canonicalTitle,
                    evidenceSynopsis: record.evidenceSynopsis,
                    lakeStatus: record.lakeStatus as "indexed",
                    indexingKey: record.indexingKey,
                    domainTags: record.domainTags as string[],
                    canonicalClaims: record.canonicalClaims as string[],
                    evidenceHash: record.evidenceHash,
                    snapshotSummary: record.snapshotSummary,
                },
                audit: record.audit as any,
                provenance: record.provenance as any,
                integrity: record.integrity as any,
            }));
        },
    };
}