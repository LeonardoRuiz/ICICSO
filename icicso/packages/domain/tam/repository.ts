import type { TemporalActivationModelArtifact } from "./types.ts";

export interface TemporalActivationModelRepository {
    save(tam: TemporalActivationModelArtifact): Promise<void>;
    getByCpoId(cpoId: string): Promise<TemporalActivationModelArtifact | null>;
    getById(tamId: string): Promise<TemporalActivationModelArtifact | null>;
    invalidate(cpoId?: string): Promise<void>;
}

export const createInMemoryTemporalActivationModelRepository = (): TemporalActivationModelRepository => {
    const storageByTamId = new Map<string, TemporalActivationModelArtifact>();
    const indexByCpoId = new Map<string, string>();

    return {
        async save(tam) {
            storageByTamId.set(tam.id, tam);
            indexByCpoId.set(tam.payload.cpoId, tam.id);
        },

        async getByCpoId(cpoId) {
            const tamId = indexByCpoId.get(cpoId);
            if (!tamId) return null;
            return storageByTamId.get(tamId) ?? null;
        },

        async getById(tamId) {
            return storageByTamId.get(tamId) ?? null;
        },

        async invalidate(cpoId) {
            if (cpoId) {
                const tamId = indexByCpoId.get(cpoId);
                if (tamId) {
                    storageByTamId.delete(tamId);
                    indexByCpoId.delete(cpoId);
                }
                return;
            }
            storageByTamId.clear();
            indexByCpoId.clear();
        },
    };
};
