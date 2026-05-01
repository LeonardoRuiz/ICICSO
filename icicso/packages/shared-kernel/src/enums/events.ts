export const eventSeverities = ["Low", "Moderate", "High", "Critical"] as const;
export type EventSeverity = (typeof eventSeverities)[number];

export const actorTypes = ["human", "service", "system", "committee"] as const;
export type ActorType = (typeof actorTypes)[number];
