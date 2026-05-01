import type { ClinicalPracticeObjectArtifact } from "./types.ts";

export interface ClinicalPracticeObjectGeneratedEvent {
    type: "cpo.generated";
    payload: {
        cpo: ClinicalPracticeObjectArtifact;
        queryHash: string;
        generatedAt: string;
    };
}

export interface ClinicalPracticeObjectCacheInvalidatedEvent {
    type: "cpo.cache.invalidated";
    payload: {
        specialty?: string;
        invalidatedAt: string;
    };
}

export type ClinicalPracticeObjectEvent =
    | ClinicalPracticeObjectGeneratedEvent
    | ClinicalPracticeObjectCacheInvalidatedEvent;

export interface ClinicalPracticeObjectEventPublisher {
    publish(event: ClinicalPracticeObjectEvent): Promise<void>;
}

export function createInMemoryClinicalPracticeObjectEventPublisher(): ClinicalPracticeObjectEventPublisher {
    const events: ClinicalPracticeObjectEvent[] = [];

    return {
        async publish(event) {
            events.push(event);
            console.log(`[CPO] Event published: ${event.type}`, event.payload);
        },
    };
}