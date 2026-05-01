export interface SourceEvidenceRecordCreatedEvent {
  type: "source-evidence-record.created";
  serId: string;
  sourceId: string;
  timestamp: string;
  payload: {
    canonicalTitle: string;
    documentType: string;
    issuingBody: string;
    publicationYear: number;
  };
}

export type SourceEvidenceRecordEvent = SourceEvidenceRecordCreatedEvent;

export interface SourceEvidenceRecordEventPublisher {
  publish(event: SourceEvidenceRecordEvent): Promise<void>;
}

// Simple in-memory event publisher for now
// In production, this would publish to Kafka, Redis, etc.
export function createInMemorySourceEvidenceRecordEventPublisher(): SourceEvidenceRecordEventPublisher {
  const events: SourceEvidenceRecordEvent[] = [];

  return {
    async publish(event) {
      events.push(event);
      console.log(`[SER Event] ${event.type}: ${event.serId} (${event.sourceId})`);
    },
  };
}