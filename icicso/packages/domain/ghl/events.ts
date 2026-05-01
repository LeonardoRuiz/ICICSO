import type { GuidelineHierarchyArtifact, GuidelineHierarchyNode } from "./types.ts";

export interface GuidelineHierarchyRebuiltEvent {
    type: "ghl.hierarchy.rebuilt";
    payload: {
        hierarchy: GuidelineHierarchyArtifact;
        rebuiltAt: string;
    };
}

export interface GuidelineHierarchyNodeUpdatedEvent {
    type: "ghl.node.updated";
    payload: {
        hierarchyId: string;
        nodeId: string;
        evidenceIds: string[];
        updatedAt: string;
    };
}

export type GuidelineHierarchyEvent =
    | GuidelineHierarchyRebuiltEvent
    | GuidelineHierarchyNodeUpdatedEvent;

export interface GuidelineHierarchyEventPublisher {
    publish(event: GuidelineHierarchyEvent): Promise<void>;
}

export function createInMemoryGuidelineHierarchyEventPublisher(): GuidelineHierarchyEventPublisher {
    const events: GuidelineHierarchyEvent[] = [];

    return {
        async publish(event) {
            events.push(event);
            console.log(`[GHL] Event published: ${event.type}`, event.payload);
        },
    };
}