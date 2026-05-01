import type { ModuleDescriptor, VersionedArtifact } from "../../shared-kernel/index.ts";

export interface MedicalSpecialty {
    code: string;
    name: string;
    description: string;
    parentCode?: string;
}

export interface ClinicalCondition {
    code: string;
    name: string;
    description: string;
    specialtyCode: string;
    icd10Codes: string[];
    snomedCodes: string[];
}

export interface GuidelineHierarchyNode {
    id: string;
    specialty: MedicalSpecialty;
    condition: ClinicalCondition;
    evidenceReferences: string[]; // Evidence Lake record IDs
    recommendationLevel: "Class I" | "Class IIa" | "Class IIb" | "Class III";
    strength: "Strong" | "Moderate" | "Weak";
    lastUpdated: string;
}

export interface GuidelineHierarchyPayload {
    hierarchyId: string;
    rootSpecialty: string;
    nodes: GuidelineHierarchyNode[];
    totalEvidenceCount: number;
    lastRebuildDate: string;
}

export type GuidelineHierarchyArtifact = VersionedArtifact<GuidelineHierarchyPayload>;

export interface GuidelineHierarchyLayerContract {
    module: ModuleDescriptor;
    inputs: string[];
    outputs: string[];

    // Navigation methods
    getSpecialtyHierarchy(specialtyCode: string): Promise<GuidelineHierarchyArtifact | null>;
    getConditionNodes(conditionCode: string): Promise<GuidelineHierarchyNode[]>;
    getEvidenceByRecommendation(specialtyCode: string, level: string): Promise<string[]>;

    // Management methods
    rebuildHierarchy(specialtyCode: string): Promise<GuidelineHierarchyArtifact>;
    updateNodeReferences(nodeId: string, evidenceIds: string[]): Promise<void>;
}

export const GuidelineHierarchyLayerDescriptor: ModuleDescriptor = {
    code: "GHL",
    name: "Guideline Hierarchy Layer",
    layer: "domain/ghl",
    path: "packages/domain/ghl",
    status: "implemented",
    maturity: "implemented",
    inputs: ["EvidenceLakeRecordArtifact"],
    outputs: ["GuidelineHierarchyArtifact"],
    dependencies: ["shared-kernel", "evidence-lake"],
};