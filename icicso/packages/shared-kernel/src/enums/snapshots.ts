export const snapshotTypes = ["PreOp", "IntraOp", "Transition", "Complication", "FinalClosure"] as const;
export type SnapshotType = (typeof snapshotTypes)[number];
