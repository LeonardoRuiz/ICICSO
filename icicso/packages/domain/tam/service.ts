import {
    buildHashMetadata,
    createAuditMetadata,
    createVrn,
} from "../../shared-kernel/index.ts";
import type {
    ClinicalPracticeObjectArtifact,
    ClinicalPracticeObject,
} from "../cpo/types.ts";
import type {
    TemporalActivationModelArtifact,
    TemporalActivationModelModuleContract,
    TemporalActivationStep,
    Tam,
} from "./types.ts";
import {
    createInMemoryTemporalActivationModelRepository,
    type TemporalActivationModelRepository,
} from "./repository.ts";
import {
    createInMemoryTemporalActivationModelEventPublisher,
    type TemporalActivationModelEventPublisher,
    type TemporalActivationModelEvent,
} from "./events.ts";
import {
    TemporalActivationModelModuleDescriptor,
} from "./types.ts";

function inferActivationSteps(cpo: ClinicalPracticeObject): TemporalActivationStep[] {
    const baseStart = `Start when ${cpo.query.condition} care plan is confirmed`;
    const stepIds = ["pre", "intra", "icu", "floor", "follow"].map(phase => `TAM-${phase.toUpperCase()}`);

    const steps: TemporalActivationStep[] = [
        {
            stepId: stepIds[0],
            phase: "pre",
            startCondition: `${baseStart} and patient readiness is confirmed`,
            durationExpected: "2-4 hours",
            maxDuration: "12 hours",
            dependencyStepIds: [],
            concurrencyFlag: false,
            criticalPathFlag: true,
        },
        {
            stepId: stepIds[1],
            phase: "intra",
            startCondition: `${cpo.query.condition} intervention begins`,
            durationExpected: cpo.query.condition === "CABG" ? "3-5 hours" : "1-2 hours",
            maxDuration: cpo.query.condition === "CABG" ? "6 hours" : "4 hours",
            dependencyStepIds: [stepIds[0]],
            concurrencyFlag: false,
            criticalPathFlag: true,
        },
        {
            stepId: stepIds[2],
            phase: "icu",
            startCondition: "Patient arrives in intensive care unit",
            durationExpected: "24-48 hours",
            maxDuration: "72 hours",
            dependencyStepIds: [stepIds[1]],
            concurrencyFlag: true,
            criticalPathFlag: true,
        },
        {
            stepId: stepIds[3],
            phase: "floor",
            startCondition: "Patient is stable for ward transfer",
            durationExpected: "2-5 days",
            maxDuration: "10 days",
            dependencyStepIds: [stepIds[2]],
            concurrencyFlag: true,
            criticalPathFlag: cpo.query.queryType === "treatment",
        },
        {
            stepId: stepIds[4],
            phase: "follow",
            startCondition: "Discharge plan approved",
            durationExpected: "30 days",
            maxDuration: "90 days",
            dependencyStepIds: [stepIds[3]],
            concurrencyFlag: true,
            criticalPathFlag: false,
        },
    ];

    return steps.map((step) => ({
        ...step,
        startCondition: step.startCondition,
    }));
}

function createTamPayload(cpo: ClinicalPracticeObject, cpoArtifactId: string): Tam {
    return {
        tamId: `TAM-${cpoArtifactId}`,
        cpoId: cpoArtifactId,
        activeVrn: createVrn(),
        activations: inferActivationSteps(cpo),
    };
}

export function createTemporalActivationModelModuleService(
    repository: TemporalActivationModelRepository = createInMemoryTemporalActivationModelRepository(),
    eventPublisher: TemporalActivationModelEventPublisher = createInMemoryTemporalActivationModelEventPublisher(),
): TemporalActivationModelModuleContract {
    return {
        module: TemporalActivationModelModuleDescriptor,
        inputs: [...TemporalActivationModelModuleDescriptor.inputs],
        outputs: [...TemporalActivationModelModuleDescriptor.outputs],

        async generateTAM(cpo) {
            const cached = await this.getCachedTAM(cpo.id);
            if (cached) {
                console.log(`[TAM] Returning cached TAM for CPO artifact: ${cpo.id}`);
                return cached;
            }

            const payload = createTamPayload(cpo.payload, cpo.id);
            const integrity = buildHashMetadata(payload, "sha256", null);
            const artifact: TemporalActivationModelArtifact = {
                id: `TAM-${integrity.hash.slice(0, 12).toUpperCase()}`,
                vrn: createVrn(),
                version: 1,
                createdAt: new Date().toISOString(),
                payload,
                audit: createAuditMetadata({
                    createdBy: "tam-system",
                    createdByType: "system",
                }),
                provenance: [
                    {
                        sourceType: "derived",
                        sourceId: cpo.id,
                        capturedAt: new Date().toISOString(),
                        chainOfCustody: ["CPO -> TAM"],
                        notes: ["Generated from Clinical Practice Object"],
                    },
                ],
                integrity,
                maturity: "implemented",
            };

            await repository.save(artifact);
            await eventPublisher.publish({
                type: "tam.generated",
                payload: {
                    tamId: artifact.id,
                    cpoId: cpo.id,
                    generatedAt: new Date().toISOString(),
                },
            });

            return artifact;
        },

        async validateTAM(tam) {
            if (!tam.payload.activations.length) return false;
            if (tam.payload.tamId !== `TAM-${tam.payload.cpoId}`) return false;
            return tam.payload.activations.every((step) => step.stepId.length > 0 && step.startCondition.length > 0);
        },

        async getCachedTAM(cpoId) {
            return repository.getByCpoId(cpoId);
        },

        async invalidateCache(cpoId) {
            await repository.invalidate(cpoId);
            await eventPublisher.publish({
                type: "tam.cache.invalidated",
                payload: {
                    cpoId,
                    invalidatedAt: new Date().toISOString(),
                },
            });
        },
    };
}
