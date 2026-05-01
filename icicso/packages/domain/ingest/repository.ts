import type { IngestedDocument } from "./types.ts";

export interface IngestModuleRepository {
  save(document: IngestedDocument): Promise<void>;
  getBySourceId(sourceId: string): Promise<IngestedDocument | null>;
  list(): Promise<IngestedDocument[]>;
}

export function createInMemoryIngestModuleRepository(): IngestModuleRepository {
  const documents = new Map<string, IngestedDocument>();

  return {
    async save(document) {
      documents.set(document.payload.sourceId, document);
    },
    async getBySourceId(sourceId) {
      return documents.get(sourceId) ?? null;
    },
    async list() {
      return [...documents.values()].sort((left, right) =>
        left.payload.sourceId.localeCompare(right.payload.sourceId),
      );
    },
  };
}
