export const clinicalPhases = ["PreOp", "IntraOp", "CEC", "ICU", "Ward", "Discharge"] as const;
export type ClinicalPhase = (typeof clinicalPhases)[number];
