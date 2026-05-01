import type { ModuleDescriptor, VersionedArtifact, VRN } from "../../shared-kernel/index.ts";
import type { EventTriggerCatalogArtifact } from "../evt/types.ts";

export type AdverseEventType =
    | "bleeding"
    | "renal_failure"
    | "arrhythmia"
    | "hypotension"
    | "infection"
    | "stroke"
    | "mortality"
    | "other";

export type AdverseEventSeverity = "mild" | "moderate" | "severe" | "life_threatening";

export interface AdverseEvent {
    eventId: string;
    eventType: AdverseEventType;
    severity: AdverseEventSeverity;
    description: string;
    detectedAt: string;
    triggerSource: string;
    mitigationRequired: boolean;
    clinicalImpact: string;
}

export interface ClinicalAdverseEventRecord {
    caeId: string;
    evtCatalogId: string;
    activeVrn: VRN;
    detectedEvents: AdverseEvent[];
    overallRiskScore: number;
    createdAt: string;
}

export type ClinicalAdverseEventArtifact = VersionedArtifact<ClinicalAdverseEventRecord>;

export interface ClinicalAdverseEventsModuleContract {
    module: ModuleDescriptor;
    inputs: string[];
    outputs: string[];

    generateClinicalAdverseEventRecord(evtCatalog: EventTriggerCatalogArtifact): Promise<ClinicalAdverseEventArtifact>;
    validateClinicalAdverseEventRecord(cae: ClinicalAdverseEventArtifact): Promise<boolean>;
    getCachedClinicalAdverseEventRecord(evtCatalogId: string): Promise<ClinicalAdverseEventArtifact | null>;
    invalidateCache(evtCatalogId: string): Promise<void>;
}

export const ClinicalAdverseEventsModuleDescriptor: ModuleDescriptor = {
    code: "CAE",
    name: "Clinical Adverse Events Module",
    layer: "domain/adverse-events",
    path: "packages/domain/adverse-events",
    status: "implemented",
    maturity: "implemented",
    inputs: ["EventTriggerCatalog"],
    outputs: ["ClinicalAdverseEventRecord"],
    dependencies: ["shared-kernel", "evt"],
};
