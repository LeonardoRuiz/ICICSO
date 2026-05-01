export type EventTriggerEvent =
    | {
        type: "evt.generated";
        payload: { evtCatalogId: string; cpoId: string; generatedAt: string };
    }
    | {
        type: "evt.cache.invalidated";
        payload: { cpoId?: string; invalidatedAt: string };
    };

export interface EventTriggerEventPublisher {
    publish(event: EventTriggerEvent): Promise<void>;
}

export const createInMemoryEventTriggerEventPublisher = (): EventTriggerEventPublisher => ({
    async publish(event) {
        console.log(`[EVT EVENT] ${event.type}`, event.payload);
    },
});
