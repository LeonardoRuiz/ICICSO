import type { EvidenceObjectArtifact } from "./types.ts";

export interface EvidenceObjectModuleRepository {
  save(record: EvidenceObjectArtifact): Promise<void>;
  getBySourceId(sourceId: string): Promise<EvidenceObjectArtifact | null>;
  list(): Promise<EvidenceObjectArtifact[]>;
}

export function createInMemoryEvidenceObjectModuleRepository(): EvidenceObjectModuleRepository {
  const records = new Map<string, EvidenceObjectArtifact>();

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
