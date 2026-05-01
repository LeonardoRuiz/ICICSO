import {
    buildHashMetadata,
    createAuditMetadata,
} from "../../shared-kernel/index.ts";
import {
    createInMemoryGuidelineHierarchyLayerRepository,
    type GuidelineHierarchyLayerRepository,
} from "./repository.ts";
import {
    GuidelineHierarchyLayerDescriptor,
    type GuidelineHierarchyLayerContract,
    type GuidelineHierarchyArtifact,
    type GuidelineHierarchyPayload,
    type GuidelineHierarchyNode,
    type MedicalSpecialty,
    type ClinicalCondition,
} from "./types.ts";
import {
    createInMemoryGuidelineHierarchyEventPublisher,
    type GuidelineHierarchyEventPublisher,
} from "./events.ts";

// Simple VRN generator for now
function createVrn(): string {
    return `VRN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Medical taxonomy data
const MEDICAL_SPECIALTIES: MedicalSpecialty[] = [
    { code: "CARD", name: "Cardiology", description: "Heart and cardiovascular system" },
    { code: "CARD-SURG", name: "Cardiac Surgery", description: "Surgical treatment of heart conditions", parentCode: "CARD" },
    { code: "NEURO", name: "Neurology", description: "Nervous system disorders" },
    { code: "ONCO", name: "Oncology", description: "Cancer treatment and research" },
];

const CLINICAL_CONDITIONS: ClinicalCondition[] = [
    {
        code: "CABG",
        name: "Coronary Artery Bypass Graft",
        description: "Surgical revascularization for coronary artery disease",
        specialtyCode: "CARD-SURG",
        icd10Codes: ["I25.10", "I25.11"],
        snomedCodes: ["232717009"],
    },
    {
        code: "AFIB",
        name: "Atrial Fibrillation",
        description: "Irregular heart rhythm originating in the atria",
        specialtyCode: "CARD",
        icd10Codes: ["I48.0", "I48.1", "I48.2"],
        snomedCodes: ["49436004"],
    },
];

function buildGuidelineHierarchy(
    specialtyCode: string,
    evidenceRecords: any[] // Simplified for now
): GuidelineHierarchyNode[] {
    const specialty = MEDICAL_SPECIALTIES.find(s => s.code === specialtyCode);
    if (!specialty) return [];

    const conditions = CLINICAL_CONDITIONS.filter(c => c.specialtyCode === specialtyCode);

    return conditions.map(condition => ({
        id: `node-${condition.code}`,
        specialty,
        condition,
        evidenceReferences: [], // Will be populated from Evidence Lake
        recommendationLevel: "Class I" as const,
        strength: "Strong" as const,
        lastUpdated: new Date().toISOString(),
    }));
}

export function createGuidelineHierarchyLayerService(
    repository: GuidelineHierarchyLayerRepository = createInMemoryGuidelineHierarchyLayerRepository(),
    eventPublisher: GuidelineHierarchyEventPublisher = createInMemoryGuidelineHierarchyEventPublisher(),
): GuidelineHierarchyLayerContract {
    return {
        module: GuidelineHierarchyLayerDescriptor,
        inputs: [...GuidelineHierarchyLayerDescriptor.inputs],
        outputs: [...GuidelineHierarchyLayerDescriptor.outputs],

        async getSpecialtyHierarchy(specialtyCode) {
            return repository.getBySpecialty(specialtyCode);
        },

        async getConditionNodes(conditionCode) {
            const hierarchies = await repository.list();
            const nodes: GuidelineHierarchyNode[] = [];

            for (const hierarchy of hierarchies) {
                const conditionNodes = hierarchy.payload.nodes.filter(
                    node => node.condition.code === conditionCode
                );
                nodes.push(...conditionNodes);
            }

            return nodes;
        },

        async getEvidenceByRecommendation(specialtyCode, level) {
            const hierarchy = await repository.getBySpecialty(specialtyCode);
            if (!hierarchy) return [];

            const evidenceIds: string[] = [];
            for (const node of hierarchy.payload.nodes) {
                if (node.recommendationLevel === level) {
                    evidenceIds.push(...node.evidenceReferences);
                }
            }

            return [...new Set(evidenceIds)]; // Remove duplicates
        },

        async rebuildHierarchy(specialtyCode) {
            const existing = await repository.getBySpecialty(specialtyCode);
            const hierarchyId = existing?.payload.hierarchyId ?? `hierarchy-${specialtyCode}`;

            const nodes = buildGuidelineHierarchy(specialtyCode, []);

            const payload: GuidelineHierarchyPayload = {
                hierarchyId,
                rootSpecialty: specialtyCode,
                nodes,
                totalEvidenceCount: nodes.reduce((sum, node) => sum + node.evidenceReferences.length, 0),
                lastRebuildDate: new Date().toISOString(),
            };

            const integrity = buildHashMetadata(payload, "sha256", existing?.integrity.hash ?? null);

            const artifact: GuidelineHierarchyArtifact = {
                id: `GHL-${integrity.hash.slice(0, 12).toUpperCase()}`,
                vrn: createVrn(),
                version: (existing?.version ?? 0) + 1,
                createdAt: new Date().toISOString(),
                payload,
                audit: createAuditMetadata({
                    createdBy: "ghl-system",
                    createdByType: "system",
                }),
                provenance: existing?.provenance ?? [],
                integrity,
                maturity: "implemented",
            };

            await repository.save(artifact);

            await eventPublisher.publish({
                type: "ghl.hierarchy.rebuilt",
                payload: {
                    hierarchy: artifact,
                    rebuiltAt: new Date().toISOString(),
                },
            });

            return artifact;
        },

        async updateNodeReferences(nodeId, evidenceIds) {
            // Find which hierarchy contains this node
            const hierarchies = await repository.list();
            for (const hierarchy of hierarchies) {
                const node = hierarchy.payload.nodes.find(n => n.id === nodeId);
                if (node) {
                    await repository.updateNodeReferences(hierarchy.payload.hierarchyId, nodeId, evidenceIds);

                    await eventPublisher.publish({
                        type: "ghl.node.updated",
                        payload: {
                            hierarchyId: hierarchy.payload.hierarchyId,
                            nodeId,
                            evidenceIds,
                            updatedAt: new Date().toISOString(),
                        },
                    });

                    break;
                }
            }
        },
    };
}