import type { ModuleDescriptor, VersionedArtifact } from "../../shared-kernel/index.ts";

export interface ClinicalQuery {
    specialty: string;
    condition: string;
    patientContext?: {
        age?: number;
        gender?: "M" | "F" | "O";
        comorbidities?: string[];
        medications?: string[];
    };
    urgency?: "routine" | "urgent" | "emergency";
    queryType: "diagnosis" | "treatment" | "monitoring" | "prevention";
}

export interface EvidenceReference {
    evidenceId: string;
    sourceId: string;
    title: string;
    recommendationLevel: "Class I" | "Class IIa" | "Class IIb" | "Class III";
    strength: "Strong" | "Moderate" | "Weak";
    applicability: number; // 0-1 score of how applicable this evidence is
    keyFindings: string[];
}

export interface ClinicalRecommendation {
    id: string;
    category: "diagnostic" | "therapeutic" | "monitoring" | "preventive";
    priority: "high" | "medium" | "low";
    recommendation: string;
    rationale: string;
    evidenceReferences: EvidenceReference[];
    confidence: number; // 0-1 confidence score
    alternatives?: string[];
    contraindications?: string[];
}

export interface ClinicalPracticeObject {
    id: string;
    query: ClinicalQuery;
    recommendations: ClinicalRecommendation[];
    generatedAt: string;
    validityPeriod: string; // How long this CPO remains valid
    version: string;
    evidenceSummary: {
        totalEvidence: number;
        highQualityEvidence: number;
        conflictingEvidence: number;
    };
}

export type ClinicalPracticeObjectArtifact = VersionedArtifact<ClinicalPracticeObject>;

export interface ClinicalPracticeObjectGeneratorContract {
    module: ModuleDescriptor;
    inputs: string[];
    outputs: string[];

    // Core generation methods
    generateCPO(query: ClinicalQuery): Promise<ClinicalPracticeObjectArtifact>;
    validateCPO(cpo: ClinicalPracticeObjectArtifact): Promise<boolean>;

    // Query optimization methods
    getRelevantEvidence(query: ClinicalQuery): Promise<EvidenceReference[]>;
    rankRecommendations(recommendations: ClinicalRecommendation[]): ClinicalRecommendation[];

    // Cache and performance methods
    getCachedCPO(queryHash: string): Promise<ClinicalPracticeObjectArtifact | null>;
    invalidateCache(specialty?: string): Promise<void>;
}

export const ClinicalPracticeObjectGeneratorDescriptor: ModuleDescriptor = {
    code: "CPO",
    name: "Clinical Practice Object Generator",
    layer: "domain/cpo",
    path: "packages/domain/cpo",
    status: "implemented",
    maturity: "implemented",
    inputs: ["ClinicalQuery", "GuidelineHierarchyArtifact", "EvidenceLakeRecordArtifact"],
    outputs: ["ClinicalPracticeObjectArtifact"],
    dependencies: ["shared-kernel", "ghl", "evidence-lake"],
};
