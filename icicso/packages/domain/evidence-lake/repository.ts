import type { EvidenceLakeRecordArtifact } from "./types.ts";

export interface EvidenceLakeModuleRepository {
  save(record: EvidenceLakeRecordArtifact): Promise<void>;
  getBySourceId(sourceId: string): Promise<EvidenceLakeRecordArtifact | null>;
  list(): Promise<EvidenceLakeRecordArtifact[]>;
}

export function createInMemoryEvidenceLakeModuleRepository(): EvidenceLakeModuleRepository {
  const records = new Map<string, EvidenceLakeRecordArtifact>();

  return {
    async save(record) {
      records.set(record.payload.sourceId, record);
    },
    async getBySourceId(sourceId) {
      return records.get(sourceId) ?? null;
    },
    async list() {
      return [...records.values()].sort((left, right) =>
        left.payload.sourceId.localeCompare(right.payload.sourceId),
      );
    },
  };
}
