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
    EventTriggerCatalogArtifact,
    EventTriggerDefinition,
    EventTriggerModuleContract,
} from "./types.ts";
import {
    createInMemoryEventTriggerRepository,
    type EventTriggerRepository,
} from "./repository.ts";
import {
    createInMemoryEventTriggerEventPublisher,
    type EventTriggerEventPublisher,
} from "./events.ts";
import {
    EventTriggerModuleDescriptor,
} from "./types.ts";

function inferEventTriggers(cpo: ClinicalPracticeObject): EventTriggerDefinition[] {
    const coreTriggers: EventTriggerDefinition[] = [];

    const recommendBleeding = {
        evtId: "EVT-BLEED",
        name: "Postoperative bleeding surveillance",
        description: "Monitor surgical drains and hemoglobin to detect significant bleeding early.",
        severity: "high" as const,
        owner: "cirujano cardiovascular",
        sourceRefs: ["CPO", "clinical pathway"],
        conditions: ["postoperative", "drain output > threshold", "hemoglobin drop"],
        triggerType: "evt" as const,
    };

    const recommendRenal = {
        evtId: "EVT-CREAT",
        name: "Renal function escalation",
        description: "Trigger renal support evaluation when creatinine rises or urine output decreases.",
        severity: "high" as const,
        owner: "intensivista",
        sourceRefs: ["CPO", "laboratory"],
        conditions: ["creatinina en ascenso", "diuresis reducida"],
        triggerType: "evt" as const,
    };

    const recommendArrhythmia = {
        evtId: "EVT-AF",
        name: "Arrhythmia detection alert",
        description: "Detect atrial fibrillation and escalate rhythm management.",
        severity: "moderate" as const,
        owner: "intensivista",
        sourceRefs: ["CPO", "monitorizacion cardiaca"],
        conditions: ["fibrilación auricular postoperatoria", "ritmo irregular"],
        triggerType: "evt" as const,
    };

    const recommendHypotension = {
        evtId: "EVT-HYPOT",
        name: "Hypotension support alert",
        description: "Identify sustained low mean arterial pressure requiring hemodynamic intervention.",
        severity: "high" as const,
        owner: "anestesiólogo",
        sourceRefs: ["CPO", "monitorizacion hemodinamica"],
        conditions: ["MAP < 65 mmHg", "soporte vasopresor"],
        triggerType: "evt" as const,
    };

    const followTriggers = {
        evtId: "EVT-FOLLOW",
        name: "Discharge readiness review",
        description: "Review discharge and follow-up care as the patient transitions from ward to home.",
        severity: "low" as const,
        owner: "médico de planta",
        sourceRefs: ["CPO", "plan de alta"],
        conditions: ["estabilidad hemodinámica", "plan de rehabilitación"],
        triggerType: "gate" as const,
    };

    coreTriggers.push(recommendBleeding);

    if (cpo.query.condition === "CABG") {
        coreTriggers.push(recommendRenal);
        coreTriggers.push(recommendArrhythmia);
        coreTriggers.push(recommendHypotension);
    }

    if (cpo.query.queryType === "treatment") {
        coreTriggers.push(followTriggers);
    }

    if (cpo.query.condition === "AFIB") {
        coreTriggers.push({
            evtId: "EVT-ANO",
            name: "Anticoagulation management alert",
            description: "Escalate anticoagulation monitoring and bleeding risk review.",
            severity: "moderate" as const,
            owner: "hematólogo",
            sourceRefs: ["CPO", "guía AF"],
            conditions: ["tratamiento anticoagulante", "riesgo de sangrado"],
            triggerType: "evt" as const,
        });
    }

    return coreTriggers.map((trigger) => ({
        ...trigger,
        conditions: [...trigger.conditions],
    }));
}

function createEventTriggerCatalogPayload(cpo: ClinicalPracticeObject, cpoArtifactId: string) {
    return {
        evtCatalogId: `EVT-${cpoArtifactId}`,
        cpoId: cpoArtifactId,
        activeVrn: createVrn(),
        triggerDefinitions: inferEventTriggers(cpo),
        createdAt: new Date().toISOString(),
    };
}

export function createEventTriggerModuleService(
    repository: EventTriggerRepository = createInMemoryEventTriggerRepository(),
    eventPublisher: EventTriggerEventPublisher = createInMemoryEventTriggerEventPublisher(),
): EventTriggerModuleContract {
    return {
        module: EventTriggerModuleDescriptor,
        inputs: [...EventTriggerModuleDescriptor.inputs],
        outputs: [...EventTriggerModuleDescriptor.outputs],

        async generateEventTriggerCatalog(cpo) {
            const cached = await this.getCachedEventTriggerCatalog(cpo.id);
            if (cached) {
                console.log(`[EVT] Returning cached Event Trigger Catalog for CPO: ${cpo.id}`);
                return cached;
            }

            const payload = createEventTriggerCatalogPayload(cpo.payload, cpo.id);
            const integrity = buildHashMetadata(payload, "sha256", null);
            const artifact: EventTriggerCatalogArtifact = {
                id: `EVT-${integrity.hash.slice(0, 12).toUpperCase()}`,
                vrn: createVrn(),
                version: 1,
                createdAt: new Date().toISOString(),
                payload,
                audit: createAuditMetadata({
                    createdBy: "evt-system",
                    createdByType: "system",
                }),
                provenance: [
                    {
                        sourceType: "derived",
                        sourceId: cpo.id,
                        capturedAt: new Date().toISOString(),
                        chainOfCustody: ["CPO -> EVT"],
                        notes: ["Generated event trigger catalog from CPO"],
                    },
                ],
                integrity,
                maturity: "implemented",
            };

            await repository.save(artifact);
            await eventPublisher.publish({
                type: "evt.generated",
                payload: {
                    evtCatalogId: artifact.id,
                    cpoId: cpo.id,
                    generatedAt: new Date().toISOString(),
                },
            });

            return artifact;
        },

        async validateEventTriggerCatalog(evtCatalog) {
            return (
                evtCatalog.payload.cpoId === evtCatalog.payload.evtCatalogId.replace(/^EVT-/, "") ||
                evtCatalog.payload.triggerDefinitions.length > 0
            );
        },

        async getCachedEventTriggerCatalog(cpoId) {
            return repository.getByCpoId(cpoId);
        },

        async invalidateCache(cpoId) {
            await repository.invalidate(cpoId);
            await eventPublisher.publish({
                type: "evt.cache.invalidated",
                payload: {
                    cpoId,
                    invalidatedAt: new Date().toISOString(),
                },
            });
        },
    };
}
