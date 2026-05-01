import type { EvidenceLakeRecordArtifact } from "./types.ts";

export interface EvidenceLakeRecordIndexedEvent {
    type: "evidence-lake.record.indexed";
    payload: {
        record: EvidenceLakeRecordArtifact;
        indexedAt: string;
    };
}

export interface EvidenceLakeRecordRetrievedEvent {
    type: "evidence-lake.record.retrieved";
    payload: {
        sourceId: string;
        retrievedAt: string;
    };
}

export type EvidenceLakeEvent =
    | EvidenceLakeRecordIndexedEvent
    | EvidenceLakeRecordRetrievedEvent;

export interface EvidenceLakeEventPublisher {
    publish(event: EvidenceLakeEvent): Promise<void>;
}

export function createInMemoryEvidenceLakeEventPublisher(): EvidenceLakeEventPublisher {
    const events: EvidenceLakeEvent[] = [];

    return {
        async publish(event) {
            events.push(event);
            console.log(`[EvidenceLake] Event published: ${event.type}`, event.payload);
        },
    };
}