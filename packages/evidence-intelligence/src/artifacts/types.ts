import type {
  CertaintyCode,
  ClinicalFunctionCode,
  ConflictPriorityCode,
  EffectDirection,
  EvidenceHierarchyCode,
  EvidenceTypeCode,
  InterventionClassCode,
  JurisdictionCode,
  OperationalRelevance,
  OutcomeCode,
  ReviewStatus,
  TimeHorizonCode,
  UncertaintyCode,
} from "../models/common.js";
import type { ApplicabilityProfile } from "../models/applicability.js";
import type { OperationalContext } from "../models/operational-context.js";
import type { ProvenanceRecord } from "../models/provenance.js";

export type InterchangeArtifactKind =
  | "evidence-document"
  | "evidence-source"
  | "evidence-classification"
  | "ser"
  | "eo"
  | "provenance"
  | "applicability"
  | "operational-context"
  | "conflict-rule"
  | "review-metadata";

export interface ApplicabilityArtifact {
  population_fit: { score: number; rationale: string };
  intervention_fit: { score: number; rationale: string };
  setting_fit: { score: number; rationale: string };
  jurisdiction_fit: { score: number; rationale: string };
  resource_fit: { score: number; rationale: string };
  overall_recommendation: "directly-applicable" | "applicable-with-review" | "contextual-only" | "not-applicable";
}

export interface ProvenanceArtifact {
  source_system: string;
  captured_at: string;
  captured_by: string;
  chain_of_custody: Array<{
    step: string;
    actor: string;
    timestamp: string;
    hash: string;
    note?: string | null;
  }>;
  license_status: string;
  attestation_status: string;
  review_policy?: string | null;
  canonical_id: string;
  version: string;
  effective_from?: string | null;
  effective_to?: string | null;
  status: string;
}

export interface OperationalContextArtifact {
  implementation_complexity: OperationalContext["implementationComplexity"];
  resource_demand: OperationalContext["resourceDemand"];
  cost_relevance: OperationalContext["costRelevance"];
  operational_relevance?: OperationalRelevance;
  resource_requirements: Array<{
    resource_type: string;
    role: string;
    quantity: number;
    unit: string;
    mandatory: boolean;
    cost_center?: string | null;
    note?: string | null;
  }>;
  constraints?: string[];
}

export interface EvidenceSourceArtifact {
  source_id: string;
  source_type: "journal" | "guideline-body" | "society" | "hta-agency" | "institution" | "registry" | "database";
  origin: string;
  publisher: string;
  language: string;
  access_model: string;
}

export interface EvidenceClassificationArtifact {
  classification_id: string;
  evidence_type: EvidenceTypeCode;
  evidence_level: EvidenceHierarchyCode;
  clinical_functions: ClinicalFunctionCode[];
  effect_direction: EffectDirection;
  certainty: CertaintyCode;
  time_horizons: TimeHorizonCode[];
}

export interface EvidenceDocumentArtifact {
  id: string;
  title: string;
  source_type: EvidenceSourceArtifact["source_type"];
  evidence_type: EvidenceTypeCode;
  publication_year: number;
  version_or_update: string;
  jurisdiction: JurisdictionCode[];
  specialty: string;
  clinical_domain: string;
  population: {
    summary: string;
    age_groups?: string[];
    diagnoses?: string[];
    severity?: string | null;
  };
  intervention: {
    class: InterventionClassCode;
    summary: string;
  };
  comparator?: {
    summary: string;
  } | null;
  outcomes: Array<{
    outcome_class: OutcomeCode;
    summary: string;
  }>;
  effect_direction: EffectDirection;
  certainty: CertaintyCode;
  clinical_functions: ClinicalFunctionCode[];
  time_horizons: TimeHorizonCode[];
  applicability: ApplicabilityArtifact;
  provenance: ProvenanceArtifact;
  references: Array<{
    citation: string;
    doi?: string | null;
    uri?: string | null;
  }>;
  ingestion_metadata: {
    ingested_at: string;
    ingestion_channel: string;
    parser_version?: string | null;
  };
  hash: string;
  status: "draft" | "classified" | "structured" | "approved" | "deprecated";
}

export interface ReviewMetadataArtifact {
  owner: string;
  review_status: ReviewStatus;
  reviewed_at: string;
  review_cycle: string;
  approver?: string | null;
  notes?: string | null;
}

export interface StructuredEvidenceRecordArtifact {
  ser_id: string;
  linked_source_ids: string[];
  pico: {
    population: string;
    intervention: string;
    comparator?: string | null;
    outcomes: string[];
  };
  population_details: {
    summary: string;
  };
  intervention_details: {
    class: InterventionClassCode;
    summary: string;
  };
  comparator_details?: {
    summary: string;
  } | null;
  outcome_objects: Array<{
    outcome_class: OutcomeCode;
    effect_direction: EffectDirection;
    measure: string;
  }>;
  effect_estimates: Array<{
    measure_type: string;
    value: number;
    confidence_interval?: { lower: number; upper: number } | null;
  }>;
  follow_up_period: string;
  bias_limitations: string[];
  applicability_assessment: ApplicabilityArtifact;
  operational_relevance: OperationalRelevance;
  decision_readiness: ApplicabilityProfile["decisionReadiness"];
  evidence_grading: {
    evidence_level: EvidenceHierarchyCode;
    certainty: CertaintyCode;
  };
  provenance: ProvenanceArtifact;
  review: ReviewMetadataArtifact;
}

export interface EvidenceObjectArtifact {
  eo_id: string;
  trigger: {
    event: string;
    clinical_function: ClinicalFunctionCode;
  };
  conditions: string[];
  exclusions?: string[];
  decision: {
    verb: "recommend" | "consider" | "avoid" | "defer-to-review";
    effect_direction: EffectDirection;
    decision_readiness: ApplicabilityProfile["decisionReadiness"];
    rationale?: string | null;
  };
  actions: Array<{
    action_id: string;
    intervention_class: InterventionClassCode;
    summary: string;
  }>;
  expected_outcomes: Array<{
    outcome_class: OutcomeCode;
    effect_direction: EffectDirection;
    note?: string | null;
  }>;
  required_context: string[];
  operational_constraints: OperationalContextArtifact;
  evidence_support: Array<{
    artifact_type: "document" | "ser" | "statement";
    artifact_id: string;
  }>;
  confidence: {
    certainty: CertaintyCode;
    uncertainty_sources?: UncertaintyCode[];
  };
  jurisdiction: JurisdictionCode[];
  review_status: ReviewStatus;
  version: string;
  audit_fields: {
    created_at: string;
    created_by: string;
    updated_at?: string | null;
  };
}

export interface ConflictRuleArtifact {
  rule_id: string;
  priority_code: ConflictPriorityCode;
  priority_order: number;
  description: string;
  resolution_action: "prefer-left" | "prefer-right" | "defer-review" | "reduce-readiness" | "mark-unresolved";
}

export type InterchangeArtifactMap = {
  "evidence-document": EvidenceDocumentArtifact;
  "evidence-source": EvidenceSourceArtifact;
  "evidence-classification": EvidenceClassificationArtifact;
  ser: StructuredEvidenceRecordArtifact;
  eo: EvidenceObjectArtifact;
  provenance: ProvenanceArtifact;
  applicability: ApplicabilityArtifact;
  "operational-context": OperationalContextArtifact;
  "conflict-rule": ConflictRuleArtifact;
  "review-metadata": ReviewMetadataArtifact;
};
