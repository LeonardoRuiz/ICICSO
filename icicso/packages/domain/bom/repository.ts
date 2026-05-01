import type { BillOfMaterialsArtifact } from "./types.ts";

export interface BillOfMaterialsModuleRepository {
    save(bom: BillOfMaterialsArtifact): Promise<void>;
    getByBOMId(bomId: string): Promise<BillOfMaterialsArtifact | null>;
    getByCpoId(cpoId: string): Promise<BillOfMaterialsArtifact | null>;
    list(): Promise<BillOfMaterialsArtifact[]>;
    delete(bomId: string): Promise<void>;
}

export function createInMemoryBillofMaterialsModuleRepository(): BillOfMaterialsModuleRepository {
    const boms = new Map<string, BillOfMaterialsArtifact>();

    return {
        async save(bom) {
            boms.set(bom.id, bom);
        },

        async getByBOMId(bomId) {
            return boms.get(bomId) ?? null;
        },

        async getByCpoId(cpoId) {
            for (const bom of Array.from(boms.values())) {
                if (bom.payload.cpoId === cpoId) {
                    return bom;
                }
            }
            return null;
        },

        async list() {
            return Array.from(boms.values()).sort((left, right) =>
                new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
            );
        },

        async delete(bomId) {
            boms.delete(bomId);
        },
    };
}

