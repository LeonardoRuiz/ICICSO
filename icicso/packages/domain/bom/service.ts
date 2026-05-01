import {
    buildHashMetadata,
    createAuditMetadata,
    createVrn,
} from "../../shared-kernel/index.ts";
import {
    createInMemoryBillofMaterialsModuleRepository,
    type BillOfMaterialsModuleRepository,
} from "./repository.ts";
import {
    BillOfMaterialsModuleDescriptor,
    type BillOfMaterialsGeneratorContract,
    type BillOfMaterialsArtifact,
    type BillOfMaterials,
    type BillOfMaterialsResource,
    type ClinicalPracticeObjectArtifact,
    type PathwayPhase,
} from "./types.ts";
import {
    createInMemoryBillOfMaterialsEventPublisher,
    type BillOfMaterialsEventPublisher,
} from "./events.ts";

const COMMON_BOM_RESOURCES: Omit<BillOfMaterialsResource, "resourceId">[] = [
    {
        resourceType: "diagnostic",
        description: "Baseline laboratory panel and imaging orders",
        quantity: 1,
        criticalFlag: true,
        availabilityStatus: "available",
        backupRequired: false,
        supplierReference: null,
    },
    {
        resourceType: "consumable",
        description: "Patient consent form and educational material",
        quantity: 1,
        criticalFlag: false,
        availabilityStatus: "available",
        backupRequired: false,
        supplierReference: null,
    },
];

const RESOURCE_PROFILES: Record<string, Omit<BillOfMaterialsResource, "resourceId">[]> = {
    CABG: [
        {
            resourceType: "equipment",
            description: "Cardiopulmonary bypass machine",
            quantity: 1,
            criticalFlag: true,
            availabilityStatus: "reserved",
            backupRequired: true,
            supplierReference: "OR-Cardio-BP",
        },
        {
            resourceType: "human",
            description: "Cardiac surgeon",
            quantity: 1,
            criticalFlag: true,
            availabilityStatus: "reserved",
            backupRequired: false,
            supplierReference: null,
        },
        {
            resourceType: "drug",
            description: "Heparin and protamine dosing set",
            quantity: 1,
            criticalFlag: true,
            availabilityStatus: "available",
            backupRequired: true,
            supplierReference: "Pharmacy-OR",
        },
        {
            resourceType: "consumable",
            description: "Coronary artery bypass graft conduits and suture kits",
            quantity: 1,
            criticalFlag: true,
            availabilityStatus: "available",
            backupRequired: true,
            supplierReference: "Supply-OR",
        },
    ],
    AFIB: [
        {
            resourceType: "drug",
            description: "Oral anticoagulation therapy supply",
            quantity: 30,
            criticalFlag: true,
            availabilityStatus: "available",
            backupRequired: false,
            supplierReference: "Pharmacy-Cardio",
        },
        {
            resourceType: "diagnostic",
            description: "Telemetry monitoring patch set",
            quantity: 1,
            criticalFlag: true,
            availabilityStatus: "available",
            backupRequired: true,
            supplierReference: "Diagnostic-Cardio",
        },
        {
            resourceType: "human",
            description: "Cardiology nurse specialist",
            quantity: 1,
            criticalFlag: false,
            availabilityStatus: "reserved",
            backupRequired: false,
            supplierReference: null,
        },
    ],
};

function createResourceId(index: number, resource: Omit<BillOfMaterialsResource, "resourceId">) {
    const suffix = `${resource.resourceType}-${index + 1}`.toUpperCase();
    return `BOM-${suffix}`;
}

function inferPhase(queryType: string, urgency?: string): PathwayPhase {
    if (queryType === "monitoring") return "icu";
    if (queryType === "prevention") return "follow";
    if (queryType === "diagnosis") return "pre";
    if (queryType === "treatment" && urgency === "emergency") return "intra";
    return "pre";
}

function buildBomResources(condition: string) {
    const profile = RESOURCE_PROFILES[condition] ?? [];
    return [
        ...COMMON_BOM_RESOURCES,
        ...profile,
        {
            resourceType: "infra",
            description: "Dedicated clinical pathway coordination workspace",
            quantity: 1,
            criticalFlag: false,
            availabilityStatus: "available",
            backupRequired: false,
            supplierReference: "Operations",
        },
    ].map((resource, index) => ({
        ...resource,
        resourceId: createResourceId(index, resource),
    }));
}

export function createBillofMaterialsModuleService(
    repository: BillOfMaterialsModuleRepository = createInMemoryBillofMaterialsModuleRepository(),
    eventPublisher: BillOfMaterialsEventPublisher = createInMemoryBillOfMaterialsEventPublisher(),
): BillOfMaterialsGeneratorContract {
    return {
        module: BillOfMaterialsModuleDescriptor,
        inputs: [...BillOfMaterialsModuleDescriptor.inputs],
        outputs: [...BillOfMaterialsModuleDescriptor.outputs],

        async generateBillOfMaterials(cpo) {
            const phase = inferPhase(cpo.payload.query.queryType, cpo.payload.query.urgency);
            const resources = buildBomResources(cpo.payload.query.condition);
            const bom: BillOfMaterials = {
                bomId: `BOM-${Date.now().toString(36).toUpperCase()}`,
                cpoId: cpo.id,
                phase,
                activeVrn: createVrn(),
                resources,
            };

            const integrity = buildHashMetadata(bom, "sha256", null);
            const artifact: BillOfMaterialsArtifact = {
                id: `BOM-${integrity.hash.slice(0, 12).toUpperCase()}`,
                vrn: createVrn(),
                version: 1,
                createdAt: new Date().toISOString(),
                payload: bom,
                audit: createAuditMetadata({
                    createdBy: "bom-system",
                    createdByType: "system",
                }),
                provenance: [],
                integrity,
                maturity: "implemented",
            };

            await repository.save(artifact);
            await eventPublisher.publish({
                type: "bom.generated",
                payload: {
                    bom: artifact,
                    cpoId: cpo.id,
                    generatedAt: new Date().toISOString(),
                },
            });

            return artifact;
        },

        async validateBOM(bom) {
            return bom.payload.resources.length > 0 && bom.payload.cpoId.length > 0;
        },

        async getResourcesByPhase(bom, phase) {
            return bom.payload.phase === phase ? bom.payload.resources : [];
        },

        async getCachedBOM(cpoId) {
            return repository.getByCpoId(cpoId);
        },

        async invalidateCache(cpoId) {
            if (!cpoId) return;
            const existing = await repository.getByCpoId(cpoId);
            if (!existing) return;
            await repository.delete(existing.id);
            await eventPublisher.publish({
                type: "bom.cache.invalidated",
                payload: {
                    cpoId,
                    invalidatedAt: new Date().toISOString(),
                },
            });
        },
    };
}

