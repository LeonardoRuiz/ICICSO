import type { BillOfMaterialsArtifact } from "./types.ts";

export interface BillOfMaterialsGeneratedEvent {
    type: "bom.generated";
    payload: {
        bom: BillOfMaterialsArtifact;
        cpoId: string;
        generatedAt: string;
    };
}

export interface BillOfMaterialsCacheInvalidatedEvent {
    type: "bom.cache.invalidated";
    payload: {
        cpoId?: string;
        invalidatedAt: string;
    };
}

export type BillOfMaterialsEvent =
    | BillOfMaterialsGeneratedEvent
    | BillOfMaterialsCacheInvalidatedEvent;

export interface BillOfMaterialsEventPublisher {
    publish(event: BillOfMaterialsEvent): Promise<void>;
}

export function createInMemoryBillOfMaterialsEventPublisher(): BillOfMaterialsEventPublisher {
    const events: BillOfMaterialsEvent[] = [];

    return {
        async publish(event) {
            events.push(event);
            console.log(`[BOM] Event published: ${event.type}`, event.payload);
        },
    };
}
