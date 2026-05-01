import type { ModuleDescriptor, VersionedArtifact, VRN } from "../../shared-kernel/index.ts";
import type { ClinicalPracticeObjectArtifact } from "../cpo/types.ts";

export type BillOfMaterialsResourceType =
    | "equipment"
    | "human"
    | "drug"
    | "infra"
    | "consumable"
    | "diagnostic";

export type BillOfMaterialsAvailabilityStatus =
    | "available"
    | "reserved"
    | "missing"
    | "backup_only";

export type PathwayPhase = "pre" | "intra" | "icu" | "floor" | "follow";

export interface BillOfMaterialsResource {
    resourceId: string;
    resourceType: BillOfMaterialsResourceType;
    description: string;
    quantity: number;
    criticalFlag: boolean;
    availabilityStatus: BillOfMaterialsAvailabilityStatus;
    backupRequired: boolean;
    supplierReference: string | null;
}

export interface BillOfMaterials {
    bomId: string;
    cpoId: string;
    phase: PathwayPhase;
    activeVrn: VRN;
    resources: BillOfMaterialsResource[];
}

export type BillOfMaterialsArtifact = VersionedArtifact<BillOfMaterials>;

export interface BillOfMaterialsGeneratorContract {
    module: ModuleDescriptor;
    inputs: string[];
    outputs: string[];

    generateBillOfMaterials(cpo: ClinicalPracticeObjectArtifact): Promise<BillOfMaterialsArtifact>;
    validateBOM(bom: BillOfMaterialsArtifact): Promise<boolean>;
    getResourcesByPhase(bom: BillOfMaterialsArtifact, phase: PathwayPhase): Promise<BillOfMaterialsResource[]>;
    getCachedBOM(cpoId: string): Promise<BillOfMaterialsArtifact | null>;
    invalidateCache(cpoId: string): Promise<void>;
}

export const BillOfMaterialsModuleDescriptor: ModuleDescriptor = {
    code: "BOM",
    name: "Bill of Materials Module",
    layer: "domain/bom",
    path: "packages/domain/bom",
    status: "implemented",
    maturity: "implemented",
    inputs: ["ClinicalPathwayObject"],
    outputs: ["BillOfMaterials"],
    dependencies: ["shared-kernel", "cpo"],
};
