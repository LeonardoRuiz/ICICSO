export type TemporalActivationModelEvent =
    | {
        type: "tam.generated";
        payload: { tamId: string; cpoId: string; generatedAt: string };
    }
    | {
        type: "tam.cache.invalidated";
        payload: { cpoId?: string; invalidatedAt: string };
    };

export interface TemporalActivationModelEventPublisher {
    publish(event: TemporalActivationModelEvent): Promise<void>;
}

export const createInMemoryTemporalActivationModelEventPublisher = (): TemporalActivationModelEventPublisher => ({
    async publish(event) {
        console.log(`[TAM EVENT] ${event.type}`, event.payload);
    },
});
