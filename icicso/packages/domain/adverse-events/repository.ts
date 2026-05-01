import type { ClinicalAdverseEventArtifact } from "./types.ts";

export interface ClinicalAdverseEventsModuleRepository {
    save(cae: ClinicalAdverseEventArtifact): Promise<void>;
    getByCaeId(caeId: string): Promise<ClinicalAdverseEventArtifact | null>;
    findByEvtCatalogId(evtCatalogId: string): Promise<ClinicalAdverseEventArtifact | null>;
    list(): Promise<ClinicalAdverseEventArtifact[]>;
    delete(caeId: string): Promise<void>;
    deleteByEvtCatalogId(evtCatalogId: string): Promise<void>;
}

export function createInMemoryClinicalAdverseEventsModuleRepository(): ClinicalAdverseEventsModuleRepository {
    const caes = new Map<string, ClinicalAdverseEventArtifact>();

    return {
        async save(cae) {
            caes.set(cae.id, cae);
        },

        async getByCaeId(caeId) {
            return caes.get(caeId) ?? null;
        },

        async findByEvtCatalogId(evtCatalogId) {
            for (const cae of Array.from(caes.values())) {
                if (cae.payload.evtCatalogId === evtCatalogId) {
                    return cae;
                }
            }
            return null;
        },

        async list() {
            return Array.from(caes.values()).sort((left, right) =>
                new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
            );
        },

        async delete(caeId) {
            caes.delete(caeId);
        },

        async deleteByEvtCatalogId(evtCatalogId) {
            for (const [id, cae] of Array.from(caes.entries())) {
                if (cae.payload.evtCatalogId === evtCatalogId) {
                    caes.delete(id);
                    break;
                }
            }
        },
    };
}
