export const bomTypes = [
  "IB_BOM",
  "P_BOM",
  "E_BOM",
  "ICU_BOM",
  "D_BOM",
  "EO_MAPPED_BOM",
  "RISK_WEIGHTED_BOM",
  "OUTCOME_LINKED_BOM",
] as const;
export type BomType = (typeof bomTypes)[number];
