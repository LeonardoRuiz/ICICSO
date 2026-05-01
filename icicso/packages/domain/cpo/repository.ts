import type { ClinicalPracticeObjectArtifact } from "./types.ts";

export interface ClinicalPracticeObjectRepository {
    save(cpo: ClinicalPracticeObjectArtifact): Promise<void>;
    getById(cpoId: string): Promise<ClinicalPracticeObjectArtifact | null>;
    getByQueryHash(queryHash: string): Promise<ClinicalPracticeObjectArtifact | null>;
    list(): Promise<ClinicalPracticeObjectArtifact[]>;
    delete(cpoId: string): Promise<void>;
}

export function createInMemoryClinicalPracticeObjectRepository(): ClinicalPracticeObjectRepository {
    const cpos = new Map<string, ClinicalPracticeObjectArtifact>();
    const queryHashIndex = new Map<string, string>(); // queryHash -> cpoId

    return {
        async save(cpo) {
            cpos.set(cpo.id, cpo);
            // Create index for query hash lookup
            const queryHash = cpo.payload.id.replace("CPO-", "");
            queryHashIndex.set(queryHash, cpo.id);
        },

        async getById(cpoId) {
            return cpos.get(cpoId) ?? null;
        },

        async getByQueryHash(queryHash) {
            const cpoId = queryHashIndex.get(queryHash);
            if (!cpoId) return null;
            return cpos.get(cpoId) ?? null;
        },

        async list() {
            return Array.from(cpos.values()).sort((left, right) =>
                new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
            );
        },

        async delete(cpoId) {
            const cpo = cpos.get(cpoId);
            if (cpo) {
                cpos.delete(cpoId);
                // Remove from query hash index
                const queryHash = cpo.payload.id.replace("CPO-", "");
                queryHashIndex.delete(queryHash);
            }
        },
    };
}
