import type { GuidelineHierarchyArtifact } from "./types.ts";

export interface GuidelineHierarchyLayerRepository {
    save(hierarchy: GuidelineHierarchyArtifact): Promise<void>;
    getBySpecialty(specialtyCode: string): Promise<GuidelineHierarchyArtifact | null>;
    getById(hierarchyId: string): Promise<GuidelineHierarchyArtifact | null>;
    list(): Promise<GuidelineHierarchyArtifact[]>;
    updateNodeReferences(hierarchyId: string, nodeId: string, evidenceIds: string[]): Promise<void>;
}

export function createInMemoryGuidelineHierarchyLayerRepository(): GuidelineHierarchyLayerRepository {
    const hierarchies = new Map<string, GuidelineHierarchyArtifact>();

    return {
        async save(hierarchy) {
            hierarchies.set(hierarchy.payload.hierarchyId, hierarchy);
        },

        async getBySpecialty(specialtyCode) {
            for (const hierarchy of hierarchies.values()) {
                if (hierarchy.payload.rootSpecialty === specialtyCode) {
                    return hierarchy;
                }
            }
            return null;
        },

        async getById(hierarchyId) {
            return hierarchies.get(hierarchyId) ?? null;
        },

        async list() {
            return [...hierarchies.values()].sort((left, right) =>
                left.payload.hierarchyId.localeCompare(right.payload.hierarchyId),
            );
        },

        async updateNodeReferences(hierarchyId, nodeId, evidenceIds) {
            const hierarchy = hierarchies.get(hierarchyId);
            if (!hierarchy) return;

            const node = hierarchy.payload.nodes.find(n => n.id === nodeId);
            if (node) {
                node.evidenceReferences = evidenceIds;
                hierarchies.set(hierarchyId, hierarchy);
            }
        },
    };
}