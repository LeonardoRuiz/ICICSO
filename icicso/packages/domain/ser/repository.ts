import type { SourceEvidenceRecordArtifact } from "./types.ts";

export interface SourceEvidenceRecordModuleRepository {
  save(record: SourceEvidenceRecordArtifact): Promise<void>;
  getBySourceId(sourceId: string): Promise<SourceEvidenceRecordArtifact | null>;
  list(): Promise<SourceEvidenceRecordArtifact[]>;
}

export function createInMemorySourceEvidenceRecordModuleRepository(): SourceEvidenceRecordModuleRepository {
  const records = new Map<string, SourceEvidenceRecordArtifact>();

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
