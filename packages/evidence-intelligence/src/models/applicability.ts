import type {
  ApplicabilityDimensionCode,
  DecisionReadiness,
  JurisdictionCode,
} from "./common.js";

export interface ApplicabilityAssessment {
  dimension: ApplicabilityDimensionCode;
  score: 0 | 1 | 2 | 3;
  rationale: string;
}

export interface PopulationDescriptor {
  summary: string;
  ageBands?: string[];
  sexes?: string[];
  diagnoses?: string[];
  procedures?: string[];
  biomarkers?: string[];
  severity?: string | null;
  comorbidities?: string[];
  inclusionCriteria?: string[];
  exclusionCriteria?: string[];
}

export interface ApplicabilityProfile {
  clinicalDomain: string;
  careSetting: string;
  jurisdictions: JurisdictionCode[];
  decisionReadiness: DecisionReadiness;
  population: PopulationDescriptor;
  dimensionAssessments?: ApplicabilityAssessment[];
  implementationPreconditions?: string[];
}
