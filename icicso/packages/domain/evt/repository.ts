import type { EventTriggerCatalogArtifact } from "./types.ts";

export interface EventTriggerRepository {
    save(evtCatalog: EventTriggerCatalogArtifact): Promise<void>;
    getByCpoId(cpoId: string): Promise<EventTriggerCatalogArtifact | null>;
    getById(evtCatalogId: string): Promise<EventTriggerCatalogArtifact | null>;
    invalidate(cpoId?: string): Promise<void>;
}

export const createInMemoryEventTriggerRepository = (): EventTriggerRepository => {
    const storageById = new Map<string, EventTriggerCatalogArtifact>();
    const indexByCpoId = new Map<string, string>();

    return {
        async save(evtCatalog) {
            storageById.set(evtCatalog.id, evtCatalog);
            indexByCpoId.set(evtCatalog.payload.cpoId, evtCatalog.id);
        },

        async getByCpoId(cpoId) {
            const evtCatalogId = indexByCpoId.get(cpoId);
            if (!evtCatalogId) return null;
            return storageById.get(evtCatalogId) ?? null;
        },

        async getById(evtCatalogId) {
            return storageById.get(evtCatalogId) ?? null;
        },

        async invalidate(cpoId) {
            if (cpoId) {
                const evtCatalogId = indexByCpoId.get(cpoId);
                if (evtCatalogId) {
                    storageById.delete(evtCatalogId);
                    indexByCpoId.delete(cpoId);
                }
                return;
            }
            storageById.clear();
            indexByCpoId.clear();
        },
    };
};
