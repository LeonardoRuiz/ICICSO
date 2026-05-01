export interface EvidenceObjectCreatedEvent {
    type: "evidence-object.created";
    eoId: string;
    sourceId: string;
    timestamp: string;
    payload: {
        canonicalTitle: string;
        documentType: string;
        issuingBody: string;
        domainTags: string[];
    };
}

export type EvidenceObjectEvent = EvidenceObjectCreatedEvent;

export interface EvidenceObjectEventPublisher {
    publish(event: EvidenceObjectEvent): Promise<void>;
}

// Simple in-memory event publisher for now
// In production, this would publish to Kafka, Redis, etc.
export function createInMemoryEvidenceObjectEventPublisher(): EvidenceObjectEventPublisher {
    const events: EvidenceObjectEvent[] = [];

    return {
        async publish(event) {
            events.push(event);
            console.log(`[EO Event] ${event.type}: ${event.eoId} (${event.sourceId})`);
        },
    };
}