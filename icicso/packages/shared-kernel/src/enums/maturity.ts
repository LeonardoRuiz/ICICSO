export const maturityStatuses = ["implemented", "partial", "mock", "planned", "missing"] as const;
export type MaturityStatus = (typeof maturityStatuses)[number];

export const moduleStatuses = maturityStatuses;
export type ModuleStatus = MaturityStatus;
