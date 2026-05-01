export const EVIDENCE_TYPE_CODES = [
  "guideline",
  "consensus",
  "position-paper",
  "auc",
  "pathway",
  "protocol",
  "order-set",
  "checklist",
  "rct",
  "pragmatic-trial",
  "cohort",
  "case-control",
  "cross-sectional",
  "systematic-review",
  "meta-analysis",
  "network-meta-analysis",
  "registry",
  "rwe",
  "hta",
  "cost-effectiveness",
  "budget-impact",
  "editorial",
  "narrative-review",
  "expert-opinion",
  "preclinical",
  "biomarker-study",
  "omics-study",
  "diagnostic-accuracy-study",
  "prognostic-study",
] as const;

export const EVIDENCE_HIERARCHY_CODES = [
  "directive",
  "synthesis",
  "comparative-primary",
  "observational",
  "contextual-implementation",
  "background",
] as const;

export const EFFECT_DIRECTION_CODES = [
  "benefit",
  "harm",
  "no-benefit",
  "inconclusive",
  "mixed",
] as const;

export const EVIDENCE_STRENGTH_CODES = [
  "highest",
  "high",
  "moderate",
  "low",
  "very-low",
  "insufficient",
] as const;

export const CERTAINTY_CODES = [
  "very-high",
  "high",
  "moderate",
  "low",
  "very-low",
  "unknown",
] as const;

export const DECISION_READINESS_CODES = [
  "ready-for-execution",
  "ready-with-local-review",
  "synthesis-required",
  "contextual-only",
  "not-ready",
] as const;

export const IMPLEMENTATION_COMPLEXITY_CODES = [
  "low",
  "moderate",
  "high",
  "very-high",
] as const;

export const RESOURCE_DEMAND_CODES = [
  "low",
  "moderate",
  "high",
  "critical",
] as const;

export const COST_RELEVANCE_CODES = [
  "low",
  "moderate",
  "high",
  "transformational",
] as const;

export const OPERATIONAL_RELEVANCE_CODES = [
  "low",
  "moderate",
  "high",
  "transformational",
] as const;

export const CLINICAL_FUNCTION_CODES = [
  "screening",
  "diagnosis",
  "severity-stratification",
  "risk-stratification",
  "eligibility",
  "intervention-selection",
  "perioperative-optimization",
  "intraoperative-management",
  "postoperative-management",
  "critical-care-management",
  "rehabilitation",
  "follow-up",
  "complication-management",
  "surveillance",
  "escalation",
  "de-escalation",
  "palliative-transition",
  "prevention",
  "discharge-planning",
  "long-term-secondary-prevention",
] as const;

export const INTERVENTION_CLASS_CODES = [
  "drug",
  "device",
  "surgery",
  "minimally-invasive-procedure",
  "open-procedure",
  "endovascular-procedure",
  "icu-strategy",
  "ventilation-strategy",
  "analgesia-strategy",
  "nutrition-strategy",
  "rehab-strategy",
  "diagnostic-test",
  "imaging-test",
  "biomarker-panel",
  "workflow-rule",
  "care-bundle",
  "monitoring-strategy",
] as const;

export const OUTCOME_CODES = [
  "mortality",
  "mace",
  "stroke",
  "mi",
  "bleeding",
  "infection",
  "aki",
  "ventilator-time",
  "icu-los",
  "hospital-los",
  "readmission",
  "reintervention",
  "quality-of-life",
  "functional-status",
  "symptom-burden",
  "cost",
  "resource-utilization",
  "adherence",
  "diagnostic-yield",
  "adverse-event",
] as const;

export const TIME_HORIZON_CODES = [
  "immediate",
  "intraoperative",
  "postoperative-24h",
  "postoperative-48h",
  "index-hospitalization",
  "icu-stay",
  "7-days",
  "30-days",
  "90-days",
  "6-months",
  "1-year",
  "5-years",
  "long-term",
] as const;

export const UNCERTAINTY_CODES = [
  "selection-bias",
  "confounding",
  "statistical-imprecision",
  "inconsistency",
  "indirectness",
  "publication-bias",
  "heterogeneity",
  "operational-variability",
  "jurisdiction-mismatch",
  "evidence-decay",
  "unknown",
] as const;

export const JURISDICTION_CODES = [
  "global",
  "us",
  "mexico",
  "eu",
  "uk",
  "canada",
  "latam",
  "institutional-local",
] as const;

export const APPLICABILITY_DIMENSION_CODES = [
  "population-fit",
  "intervention-fit",
  "setting-fit",
  "jurisdiction-fit",
  "resource-fit",
] as const;

export const CONFLICT_PRIORITY_CODES = [
  "source-priority",
  "recency-priority",
  "certainty-priority",
  "directness-priority",
  "jurisdiction-priority",
  "implementation-priority",
] as const;

export const EVIDENCE_DECAY_CODES = [
  "rapid",
  "moderate",
  "slow",
  "governed",
] as const;

export const REVIEW_STATUS_CODES = [
  "draft",
  "under-review",
  "approved",
  "active",
  "superseded",
  "deprecated",
] as const;

export const CURRENCY_STATUS_CODES = [
  "current",
  "watch",
  "aging",
  "outdated",
] as const;

export const TERMINOLOGY_SYSTEM_CODES = [
  "SNOMED_CT",
  "LOINC",
  "ICD10",
  "ICD11",
  "RxNorm",
  "ATC",
  "CPT",
  "FHIR",
] as const;

export const MAP_STATUS_CODES = [
  "exact",
  "narrow",
  "broad",
  "related",
  "candidate",
] as const;

export type EvidenceTypeCode = (typeof EVIDENCE_TYPE_CODES)[number];
export type EvidenceHierarchyCode = (typeof EVIDENCE_HIERARCHY_CODES)[number];
export type EffectDirection = (typeof EFFECT_DIRECTION_CODES)[number];
export type EvidenceStrength = (typeof EVIDENCE_STRENGTH_CODES)[number];
export type CertaintyCode = (typeof CERTAINTY_CODES)[number];
export type DecisionReadiness = (typeof DECISION_READINESS_CODES)[number];
export type ImplementationComplexity = (typeof IMPLEMENTATION_COMPLEXITY_CODES)[number];
export type ResourceDemand = (typeof RESOURCE_DEMAND_CODES)[number];
export type CostRelevance = (typeof COST_RELEVANCE_CODES)[number];
export type OperationalRelevance = (typeof OPERATIONAL_RELEVANCE_CODES)[number];
export type ClinicalFunctionCode = (typeof CLINICAL_FUNCTION_CODES)[number];
export type InterventionClassCode = (typeof INTERVENTION_CLASS_CODES)[number];
export type OutcomeCode = (typeof OUTCOME_CODES)[number];
export type TimeHorizonCode = (typeof TIME_HORIZON_CODES)[number];
export type UncertaintyCode = (typeof UNCERTAINTY_CODES)[number];
export type JurisdictionCode = (typeof JURISDICTION_CODES)[number];
export type ApplicabilityDimensionCode = (typeof APPLICABILITY_DIMENSION_CODES)[number];
export type ConflictPriorityCode = (typeof CONFLICT_PRIORITY_CODES)[number];
export type EvidenceDecayCode = (typeof EVIDENCE_DECAY_CODES)[number];
export type ReviewStatus = (typeof REVIEW_STATUS_CODES)[number];
export type CurrencyStatus = (typeof CURRENCY_STATUS_CODES)[number];
export type TerminologySystemCode = (typeof TERMINOLOGY_SYSTEM_CODES)[number];
export type MapStatus = (typeof MAP_STATUS_CODES)[number];

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult<T> {
  ok: boolean;
  issues: ValidationIssue[];
  value?: T;
}

export interface TerminologyBinding {
  system: TerminologySystemCode;
  code: string;
  display?: string | null;
  mapStatus: MapStatus;
  version?: string | null;
  fhirReference?: string | null;
}

export interface ArtifactLink {
  artifactType: "document" | "ser" | "statement";
  artifactId: string;
}

export interface OntologyCatalogEntry {
  id: string;
  code: string;
  label: string;
  description: string;
  usageNotes: string[];
  [key: string]: unknown;
}

export interface OntologyCatalog {
  catalogId: string;
  code: string;
  label: string;
  description: string;
  usageNotes: string[];
  entries: OntologyCatalogEntry[];
  constraints: Record<string, unknown>;
}
