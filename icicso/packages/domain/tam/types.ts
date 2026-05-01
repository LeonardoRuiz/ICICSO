import type { ModuleDescriptor, VersionedArtifact } from "../../shared-kernel/index.ts";
import type { ClinicalPracticeObjectArtifact } from "../cpo/types.ts";

export interface TemporalActivationStep {
    stepId: string;
    phase: "pre" | "intra" | "icu" | "floor" | "follow";
    startCondition: string;
    durationExpected: string;
    maxDuration: string;
    dependencyStepIds: string[];
    concurrencyFlag: boolean;
    criticalPathFlag: boolean;
}

export interface Tam {
    tamId: string;
    cpoId: string;
    activeVrn: string;
    activations: TemporalActivationStep[];
}

export type TemporalActivationModelArtifact = VersionedArtifact<Tam>;

export interface TemporalActivationModelModuleContract {
    module: ModuleDescriptor;
    inputs: string[];
    outputs: string[];

    generateTAM(cpo: ClinicalPracticeObjectArtifact): Promise<TemporalActivationModelArtifact>;
    validateTAM(tam: TemporalActivationModelArtifact): Promise<boolean>;
    getCachedTAM(cpoId: string): Promise<TemporalActivationModelArtifact | null>;
    invalidateCache(cpoId?: string): Promise<void>;
}

export const TemporalActivationModelModuleDescriptor: ModuleDescriptor = {
    code: "TAM",
    name: "Temporal Activation Model Module",
    layer: "domain/tam",
    path: "packages/domain/tam",
    status: "implemented",
    maturity: "implemented",
    inputs: ["ClinicalPracticeObject"],
    outputs: ["TemporalActivationModel"],
    dependencies: ["shared-kernel", "cpo"],
};
