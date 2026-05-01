import {
    buildHashMetadata,
    createAuditMetadata,
    createVrn,
} from "../../shared-kernel/index.ts";
import {
    createInMemoryClinicalAdverseEventsModuleRepository,
    type ClinicalAdverseEventsModuleRepository,
} from "./repository.ts";
import {
    ClinicalAdverseEventsModuleDescriptor,
    type ClinicalAdverseEventsModuleContract,
    type ClinicalAdverseEventArtifact,
    type ClinicalAdverseEventRecord,
    type AdverseEvent,
    type EventTriggerCatalogArtifact,
} from "./types.ts";
import {
    createInMemoryClinicalAdverseEventsEventPublisher,
    type ClinicalAdverseEventsEventPublisher,
} from "./events.ts";

const ADVERSE_EVENT_TRIGGERS: Record<string, Omit<AdverseEvent, "eventId" | "detectedAt" | "triggerSource">[]> = {
    "Postoperative bleeding surveillance": [
        {
            eventType: "bleeding",
            severity: "severe",
            description: "Major bleeding event detected requiring intervention",
            mitigationRequired: true,
            clinicalImpact: "Immediate transfusion protocol and surgical review",
        },
    ],
    "Renal function escalation": [
        {
            eventType: "renal_failure",
            severity: "life_threatening",
            description: "Acute kidney injury with creatinine elevation >2x baseline",
            mitigationRequired: true,
            clinicalImpact: "Nephrology consultation and fluid management protocol",
        },
    ],
    "Arrhythmia detection alert": [
        {
            eventType: "arrhythmia",
            severity: "moderate",
            description: "New onset atrial fibrillation or ventricular tachycardia",
            mitigationRequired: true,
            clinicalImpact: "Cardiology consultation and antiarrhythmic therapy",
        },
    ],
    "Hypotension support alert": [
        {
            eventType: "hypotension",
            severity: "severe",
            description: "Persistent hypotension requiring vasopressors",
            mitigationRequired: true,
            clinicalImpact: "Critical care escalation and hemodynamic monitoring",
        },
    ],
    "Anticoagulation management alert": [
        {
            eventType: "bleeding",
            severity: "moderate",
            description: "Anticoagulation-related bleeding risk detected",
            mitigationRequired: true,
            clinicalImpact: "Hematology consultation and anticoagulation adjustment",
        },
    ],
};

function createEventId(index: number, event: Omit<AdverseEvent, "eventId" | "detectedAt" | "triggerSource">) {
    const suffix = `${event.eventType}-${index + 1}`.toUpperCase();
    return `CAE-EVT-${suffix}`;
}

function inferAdverseEventsFromTriggers(evtCatalog: EventTriggerCatalogArtifact): AdverseEvent[] {
    const detectedEvents: AdverseEvent[] = [];

    for (const trigger of evtCatalog.payload.triggerDefinitions) {
        const eventProfiles = ADVERSE_EVENT_TRIGGERS[trigger.name] ?? [];

        for (const [index, profile] of eventProfiles.entries()) {
            detectedEvents.push({
                ...profile,
                eventId: createEventId(detectedEvents.length + index, profile),
                detectedAt: new Date().toISOString(),
                triggerSource: trigger.evtId,
            });
        }
    }

    return detectedEvents;
}

function calculateOverallRiskScore(events: AdverseEvent[]): number {
    const severityWeights = {
        mild: 0.1,
        moderate: 0.3,
        severe: 0.6,
        life_threatening: 1.0,
    };

    const totalScore = events.reduce((sum, event) => sum + severityWeights[event.severity], 0);
    return Math.min(totalScore / Math.max(events.length, 1), 1.0);
}

export function createClinicalAdverseEventsModuleService(
    repository: ClinicalAdverseEventsModuleRepository = createInMemoryClinicalAdverseEventsModuleRepository(),
    eventPublisher: ClinicalAdverseEventsEventPublisher = createInMemoryClinicalAdverseEventsEventPublisher(),
): ClinicalAdverseEventsModuleContract {
    return {
        module: ClinicalAdverseEventsModuleDescriptor,
        inputs: [...ClinicalAdverseEventsModuleDescriptor.inputs],
        outputs: [...ClinicalAdverseEventsModuleDescriptor.outputs],

        async generateClinicalAdverseEventRecord(evtCatalog) {
            const detectedEvents = inferAdverseEventsFromTriggers(evtCatalog);
            const overallRiskScore = calculateOverallRiskScore(detectedEvents);

            const cae: ClinicalAdverseEventRecord = {
                caeId: `CAE-${Date.now().toString(36).toUpperCase()}`,
                evtCatalogId: evtCatalog.id,
                activeVrn: createVrn(),
                detectedEvents,
                overallRiskScore,
                createdAt: new Date().toISOString(),
            };

            const integrity = buildHashMetadata(cae, "sha256", null);
            const artifact: ClinicalAdverseEventArtifact = {
                id: `CAE-${integrity.hash.slice(0, 12).toUpperCase()}`,
                vrn: createVrn(),
                version: 1,
                createdAt: new Date().toISOString(),
                payload: cae,
                audit: createAuditMetadata({
                    createdBy: "cae-system",
                    createdByType: "system",
                }),
                provenance: [],
                integrity,
                maturity: "implemented",
            };

            await repository.save(artifact);
            await eventPublisher.publish({
                type: "cae.generated",
                payload: {
                    cae: artifact,
                    evtCatalogId: evtCatalog.id,
                    detectedEventsCount: detectedEvents.length,
                    overallRiskScore,
                    generatedAt: new Date().toISOString(),
                },
            });

            return artifact;
        },

        async validateClinicalAdverseEventRecord(cae) {
            return cae.payload.detectedEvents.length >= 0 &&
                cae.payload.evtCatalogId.length > 0 &&
                cae.payload.overallRiskScore >= 0 &&
                cae.payload.overallRiskScore <= 1.0;
        },

        async getCachedClinicalAdverseEventRecord(evtCatalogId) {
            return await repository.findByEvtCatalogId(evtCatalogId);
        },

        async invalidateCache(evtCatalogId) {
            await repository.deleteByEvtCatalogId(evtCatalogId);
            await eventPublisher.publish({
                type: "cae.cache.invalidated",
                payload: {
                    evtCatalogId,
                    invalidatedAt: new Date().toISOString(),
                },
            });
        },
    };
}
