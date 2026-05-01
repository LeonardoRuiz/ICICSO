import type {
  ArtifactLink,
  CertaintyCode,
  ClinicalFunctionCode,
  EffectDirection,
  EvidenceStrength,
  InterventionClassCode,
  JurisdictionCode,
  EvidenceTypeCode,
  OutcomeCode,
  ReviewStatus,
  TimeHorizonCode,
  UncertaintyCode,
} from "./common.js";
import type { OperationalContext } from "./operational-context.js";
import type { ProvenanceRecord } from "./provenance.js";
import type { ApplicabilityMatrixResult, MinimumDataDependencyGate } from "../engines/applicability-ddmo-engine.js";
import type { EpistemicUncertaintyLayerResult } from "../engines/epistemic-uncertainty-engine.js";

export interface EvidenceTrigger {
  event: string;
  clinicalFunction: ClinicalFunctionCode;
}

export interface EvidenceDecision {
  verb: "recommend" | "consider" | "avoid" | "defer_to_review";
  effectDirection: EffectDirection;
  readiness: "ready-for-execution" | "ready-with-local-review" | "synthesis-required" | "contextual-only" | "not-ready";
  rationale?: string | null;
}

export interface EvidenceAction {
  interventionClass: InterventionClassCode;
  description: string;
}

export interface ExpectedOutcome {
  outcomeCode: OutcomeCode;
  effectDirection: EffectDirection;
  note?: string | null;
}

export interface EvidenceConfidence {
  strength: EvidenceStrength;
  certainty: CertaintyCode;
  uncertainties?: UncertaintyCode[];
  score?: number;
  evidenceConfidenceScore?: number;
  uncertaintyConfidenceIndex?: number;
  conflictDetected?: boolean;
  reasons?: string[];
}

export interface TemporalContext {
  timeHorizon: TimeHorizonCode;
  activationWindow?: string | null;
  reviewBy?: string | null;
}

export interface ReviewMetadata {
  owner: string;
  status: ReviewStatus;
  lastReviewedAt?: string | null;
  reviewState?: "auto-approved" | "specialist-approved" | "needs-human-review";
  specialistReviewer?: string | null;
  specialistReviewedAt?: string | null;
  rationale?: string | null;
}

export interface EvidenceSupportBundle {
  sourceDocumentId: string;
  sourceSerId: string;
  evidenceType: EvidenceTypeCode;
  primaryStatementId: string;
  supportLinks: ArtifactLink[];
  supportSummary: string;
}

export interface OperationalConstraintBundle {
  implementationComplexity: OperationalContext["implementationComplexity"];
  resourceDemand: OperationalContext["resourceDemand"];
  costRelevance: OperationalContext["costRelevance"];
  operationalRelevance?: OperationalContext["operationalRelevance"];
  hardConstraints: string[];
  requiredResources: OperationalContext["resourceRequirements"];
}

export interface InferenceTrace {
  step: string;
  rationale: string;
}

export interface ConflictMarker {
  code:
    | "effect-direction-conflict"
    | "low-applicability"
    | "stale-evidence"
    | "insufficient-strength"
    | "ddmo-missing-critical";
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface EvidenceObject {
  eoId: string;
  sourceDocumentId: string;
  sourceSerId: string;
  trigger: EvidenceTrigger;
  conditions: string[];
  exclusions?: string[];
  decision: EvidenceDecision;
  action: EvidenceAction;
  expectedOutcomes: ExpectedOutcome[];
  confidence: EvidenceConfidence;
  evidenceLinks: ArtifactLink[];
  evidenceSupport: EvidenceSupportBundle;
  provenance: ProvenanceRecord;
  operationalConstraints: OperationalContext;
  operationalConstraintBundle: OperationalConstraintBundle;
  applicabilityMatrix?: ApplicabilityMatrixResult;
  minimumDataDependencyGate?: MinimumDataDependencyGate;
  temporalContext: TemporalContext;
  jurisdiction: JurisdictionCode;
  reviewMetadata: ReviewMetadata;
  epistemicUncertaintyLayer?: EpistemicUncertaintyLayerResult;
  inferenceTrace: InferenceTrace[];
  conflicts?: ConflictMarker[];
}
