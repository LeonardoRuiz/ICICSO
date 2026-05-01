export const evidenceStatuses = ["Active", "UnderReview", "Deprecated"] as const;
export type EvidenceStatus = (typeof evidenceStatuses)[number];
