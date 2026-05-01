import type { ModuleDescriptor, VersionedArtifact } from "../../shared-kernel/index.ts";
import type { ClinicalPracticeObjectArtifact, ClinicalPracticeObject } from "../cpo/types.ts";

export type EventTriggerSeverity = "high" | "moderate" | "low";
export type EventTriggerType = "evt" | "gate" | "manual_validation" | "override" | "contingency";

export interface EventTriggerDefinition {
    evtId: string;
    name: string;
    description: string;
    severity: EventTriggerSeverity;
    owner: string;
    sourceRefs: string[];
    conditions: string[];
    triggerType: EventTriggerType;
}

export interface EventTriggerCatalog {
    evtCatalogId: string;
    cpoId: string;
    activeVrn: string;
    triggerDefinitions: EventTriggerDefinition[];
    createdAt: string;
}

export type EventTriggerCatalogArtifact = VersionedArtifact<EventTriggerCatalog>;

export interface EventTriggerModuleContract {
    module: ModuleDescriptor;
    inputs: string[];
    outputs: string[];

    generateEventTriggerCatalog(cpo: ClinicalPracticeObjectArtifact): Promise<EventTriggerCatalogArtifact>;
    validateEventTriggerCatalog(evtCatalog: EventTriggerCatalogArtifact): Promise<boolean>;
    getCachedEventTriggerCatalog(cpoId: string): Promise<EventTriggerCatalogArtifact | null>;
    invalidateCache(cpoId?: string): Promise<void>;
}

export const EventTriggerModuleDescriptor: ModuleDescriptor = {
    code: "EVT",
    name: "Event Trigger Module",
    layer: "domain/evt",
    path: "packages/domain/evt",
    status: "implemented",
    maturity: "implemented",
    inputs: ["ClinicalPracticeObject"],
    outputs: ["EventTriggerCatalog"],
    dependencies: ["shared-kernel", "cpo", "tam"],
};
