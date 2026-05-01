import type { ClinicalAdverseEventArtifact } from "./types.ts";

export interface ClinicalAdverseEventGeneratedEvent {
    type: "cae.generated";
    payload: {
        cae: ClinicalAdverseEventArtifact;
        evtCatalogId: string;
        detectedEventsCount: number;
        overallRiskScore: number;
        generatedAt: string;
    };
}

export interface ClinicalAdverseEventCacheInvalidatedEvent {
    type: "cae.cache.invalidated";
    payload: {
        evtCatalogId: string;
        invalidatedAt: string;
    };
}

export type ClinicalAdverseEventsEvent =
    | ClinicalAdverseEventGeneratedEvent
    | ClinicalAdverseEventCacheInvalidatedEvent;

export interface ClinicalAdverseEventsEventPublisher {
    publish(event: ClinicalAdverseEventsEvent): Promise<void>;
}

export function createInMemoryClinicalAdverseEventsEventPublisher(): ClinicalAdverseEventsEventPublisher {
    const events: ClinicalAdverseEventsEvent[] = [];

    return {
        async publish(event) {
            events.push(event);
            console.log(`[CAE] Event published: ${event.type}`, event.payload);
        },
    };
}