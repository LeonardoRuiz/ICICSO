export const caseStates = [
  "Registered",
  "EvidenceBound",
  "Harmonized",
  "PathwayCompiled",
  "Materialized",
  "InExecution",
  "TransitionBlocked",
  "Complicated",
  "LegallySnapshotted",
  "Closed",
] as const;
export type CaseState = (typeof caseStates)[number];
