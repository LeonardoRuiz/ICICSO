import type { ApplicabilityAssessment } from "../models/applicability.js";
import type { CertaintyCode, EvidenceStrength, EvidenceTypeCode, JurisdictionCode } from "../models/common.js";
import {
  appendDdmoConflicts,
  buildApplicabilityMatrix as buildMacApplicabilityMatrix,
  collectEvidenceConflictMarkers,
  evaluateMinimumDataDependencies as evaluateDdmoGate,
  type MinimumDataDependencyInput,
} from "../engines/applicability-ddmo-engine.js";
import {
  averageApplicability as engineAverageApplicability,
  computeEvidenceConfidence,
} from "../engines/evidence-confidence-engine.js";
import { classifyEpistemicUncertaintyLayer } from "../engines/epistemic-uncertainty-engine.js";
import type {
  ConflictMarker,
  EvidenceAction,
  EvidenceConfidence,
  EvidenceDecision,
  EvidenceObject,
  EvidenceSupportBundle,
  InferenceTrace,
  OperationalConstraintBundle,
  ReviewMetadata,
} from "../models/eo.js";
import type { EvidenceStatement, StructuredEvidenceRecord } from "../models/ser.js";

export interface SerToEoEngineOptions {
  statementId?: string;
  owner?: string;
  jurisdiction?: JurisdictionCode;
  reviewBy?: string | null;
  activationWindow?: string | null;
  now?: string;
  specialistReview?: {
    approved: boolean;
    reviewer?: string | null;
    reviewedAt?: string | null;
  };
  minimumDataDependencies?: MinimumDataDependencyInput[];
}

function certaintyScore(certainty: CertaintyCode): number {
  switch (certainty) {
    case "very-high":
      return 1;
    case "high":
      return 0.85;
    case "moderate":
      return 0.65;
    case "low":
      return 0.45;
    case "very-low":
      return 0.25;
    default:
      return 0.15;
  }
}

function strengthScore(strength: EvidenceStrength): number {
  switch (strength) {
    case "highest":
      return 1;
    case "high":
      return 0.85;
    case "moderate":
      return 0.65;
    case "low":
      return 0.45;
    case "very-low":
      return 0.25;
    default:
      return 0.15;
  }
}

function sourcePriorityBonus(evidenceType: EvidenceTypeCode): number {
  if (evidenceType === "guideline" || evidenceType === "consensus") return 0.12;
  if (evidenceType === "pathway" || evidenceType === "protocol" || evidenceType === "order-set") return 0.08;
  if (evidenceType === "rct" || evidenceType === "pragmatic-trial") return 0.04;
  return 0;
}

function averageApplicability(assessments?: ApplicabilityAssessment[]): number {
  if (!assessments || assessments.length === 0) return 0.67;
  const total = assessments.reduce((sum, item) => sum + item.score, 0);
  return total / (assessments.length * 3);
}

function evidenceAgePenalty(capturedAt: string, nowIso: string): number {
  const capturedYear = new Date(capturedAt).getUTCFullYear();
  const currentYear = new Date(nowIso).getUTCFullYear();
  const age = currentYear - capturedYear;
  if (age >= 10) return 0.25;
  if (age >= 6) return 0.12;
  return 0;
}

function selectStatement(ser: StructuredEvidenceRecord, statementId?: string): EvidenceStatement {
  if (statementId) {
    const matched = ser.statements.find((statement) => statement.statementId === statementId);
    if (!matched) throw new Error(`Statement ${statementId} not found in ${ser.serId}`);
    return matched;
  }
  return ser.statements[0];
}

function inferDecisionVerb(statement: EvidenceStatement): EvidenceDecision["verb"] {
  if (statement.effectDirection === "benefit" && (statement.strength === "highest" || statement.strength === "high")) {
    return "recommend";
  }
  if (statement.effectDirection === "benefit") return "consider";
  if (statement.effectDirection === "harm" || statement.effectDirection === "no-benefit") return "avoid";
  return "defer_to_review";
}

function inferConditions(ser: StructuredEvidenceRecord, statement: EvidenceStatement): string[] {
  return statement.conditions?.length
    ? statement.conditions
    : (ser.applicability.population.inclusionCriteria ?? ser.applicability.population.diagnoses ?? []);
}

function inferExclusions(ser: StructuredEvidenceRecord, statement: EvidenceStatement): string[] {
  return statement.exclusions?.length
    ? statement.exclusions
    : (ser.applicability.population.exclusionCriteria ?? []);
}

function inferAction(ser: StructuredEvidenceRecord, statement: EvidenceStatement): EvidenceAction {
  const summary = statement.interventionLabel
    ?? `${statement.interventionClass} aligned with ${statement.clinicalFunction}`;
  return {
    interventionClass: statement.interventionClass,
    description: `${summary} for ${ser.clinicalDomain}`,
  };
}

function buildEvidenceSupport(ser: StructuredEvidenceRecord, statement: EvidenceStatement): EvidenceSupportBundle {
  return {
    sourceDocumentId: ser.sourceDocumentId,
    sourceSerId: ser.serId,
    evidenceType: ser.evidenceType,
    primaryStatementId: statement.statementId,
    supportLinks: [
      { artifactType: "document", artifactId: ser.sourceDocumentId },
      { artifactType: "ser", artifactId: ser.serId },
      { artifactType: "statement", artifactId: statement.statementId },
    ],
    supportSummary: ser.summary ?? ser.title,
  };
}

function buildOperationalConstraintBundle(statement: EvidenceStatement): OperationalConstraintBundle {
  return {
    implementationComplexity: statement.operationalContext.implementationComplexity,
    resourceDemand: statement.operationalContext.resourceDemand,
    costRelevance: statement.operationalContext.costRelevance,
    operationalRelevance: statement.operationalContext.operationalRelevance,
    hardConstraints: statement.operationalContext.constraints ?? [],
    requiredResources: statement.operationalContext.resourceRequirements,
  };
}

function collectConflicts(
  ser: StructuredEvidenceRecord,
  statement: EvidenceStatement,
  confidenceScore: number,
  applicabilityScore: number,
  agePenalty: number,
): ConflictMarker[] {
  const conflicts: ConflictMarker[] = [];

  if (statement.effectDirection === "mixed" || statement.effectDirection === "inconclusive") {
    conflicts.push({
      code: "effect-direction-conflict",
      severity: "critical",
      message: "Evidence direction is mixed or inconclusive.",
    });
  }

  if (applicabilityScore < 0.45) {
    conflicts.push({
      code: "low-applicability",
      severity: "warning",
      message: "Applicability is limited across one or more dimensions.",
    });
  }

  if (agePenalty >= 0.12) {
    conflicts.push({
      code: "stale-evidence",
      severity: agePenalty >= 0.25 ? "critical" : "warning",
      message: "Evidence age reduces current confidence.",
    });
  }

  if (confidenceScore < 0.5 || statement.strength === "insufficient" || statement.certainty === "unknown") {
    conflicts.push({
      code: "insufficient-strength",
      severity: "critical",
      message: "Strength or certainty is insufficient for silent execution.",
    });
  }

  if (ser.evidenceType === "observational" as never) {
    // no-op; kept to preserve future branching point without weakening current model
  }

  return conflicts;
}

function inferReadiness(
  statement: EvidenceStatement,
  conflicts: ConflictMarker[],
): EvidenceDecision["readiness"] {
  if (conflicts.some((conflict) => conflict.severity === "critical")) return "not-ready";
  if (statement.decisionReadiness === "ready-for-execution" && conflicts.length === 0) return "ready-for-execution";
  if (statement.decisionReadiness === "ready-for-execution") return "ready-with-local-review";
  return statement.decisionReadiness;
}

function inferReviewMetadata(
  ser: StructuredEvidenceRecord,
  conflicts: ConflictMarker[],
  options: SerToEoEngineOptions,
): ReviewMetadata {
  const specialistReview = options.specialistReview;
  const hasSpecialistApproval =
    specialistReview?.approved === true
    && typeof specialistReview.reviewer === "string"
    && specialistReview.reviewer.length > 0;
  const needsHumanReview = conflicts.some((conflict) => conflict.severity === "critical") || !hasSpecialistApproval;
  return {
    owner: options.owner ?? "icicso.evidence.governance",
    status: ser.provenance.versioning.status,
    lastReviewedAt: ser.provenance.capturedAt,
    reviewState: needsHumanReview ? "needs-human-review" : "specialist-approved",
    specialistReviewer: hasSpecialistApproval ? specialistReview.reviewer : null,
    specialistReviewedAt: hasSpecialistApproval ? specialistReview.reviewedAt ?? null : null,
    rationale: needsHumanReview
      ? "Generated evidence remains limited until explicit specialist audit; critical conflicts or missing approval prevent unrestricted activation."
      : `Specialist audit approved by ${specialistReview.reviewer}.`,
  };
}

function buildInferenceTrace(
  ser: StructuredEvidenceRecord,
  statement: EvidenceStatement,
  confidence: EvidenceConfidence,
  conflicts: ConflictMarker[],
  review: ReviewMetadata,
  eul?: EvidenceObject["epistemicUncertaintyLayer"],
): InferenceTrace[] {
  const trace: InferenceTrace[] = [
    {
      step: "select-statement",
      rationale: `Selected statement ${statement.statementId} from SER ${ser.serId}.`,
    },
    {
      step: "infer-decision",
      rationale: `Mapped effect direction ${statement.effectDirection} and strength ${statement.strength} into decision verb.`,
    },
    {
      step: "compute-confidence",
      rationale: `Computed confidence score ${confidence.score?.toFixed(2) ?? "n/a"} from certainty, strength, applicability and recency.`,
    },
    {
      step: "check-conflicts",
      rationale: conflicts.length === 0
        ? "No blocking conflicts detected."
        : `Detected conflicts: ${conflicts.map((item) => item.code).join(", ")}.`,
    },
    {
      step: "assign-review-state",
      rationale: `Assigned review state ${review.reviewState ?? "unknown"}.`,
    },
  ];
  if (eul) {
    trace.push({
      step: "classify-eul",
      rationale: `Assigned EUL ${eul.level} with policy ${eul.activationPolicy}.`,
    });
  }
  return trace;
}

export function mapSerToEoWithInferences(
  ser: StructuredEvidenceRecord,
  options: SerToEoEngineOptions = {},
): EvidenceObject {
  const statement = selectStatement(ser, options.statementId);
  const now = options.now ?? new Date().toISOString();
  const applicabilityScore = engineAverageApplicability(ser.applicability.dimensionAssessments);
  const confidenceEngine = computeEvidenceConfidence({ ser, statement, nowIso: now, applicabilityScore });
  const minimumDataDependencyGate = evaluateDdmoGate(options.minimumDataDependencies);
  const conflicts = appendDdmoConflicts(
    collectEvidenceConflictMarkers({
      statement,
      confidenceScore: confidenceEngine.confidenceScore,
      applicabilityScore,
      agePenalty: confidenceEngine.structural.agePenalty,
    }),
    minimumDataDependencyGate,
  );
  const applicabilityMatrix = buildMacApplicabilityMatrix({
    ser,
    statement,
    applicabilityScore,
    conflicts,
    ddmoGate: minimumDataDependencyGate,
  });
  const decision: EvidenceDecision = {
    verb: inferDecisionVerb(statement),
    effectDirection: statement.effectDirection,
    readiness: inferReadiness(statement, conflicts),
    rationale: statement.rationale ?? ser.summary ?? null,
  };
  const confidence: EvidenceConfidence = {
    strength: statement.strength,
    certainty: statement.certainty,
    uncertainties: statement.uncertainties ?? [],
    score: confidenceEngine.confidenceScore,
    evidenceConfidenceScore: confidenceEngine.ecs,
    uncertaintyConfidenceIndex: confidenceEngine.uci,
    conflictDetected: conflicts.length > 0,
    reasons: [
      ...confidenceEngine.reasons,
      `mac-classification:${applicabilityMatrix.classification}`,
      `ddmo-gate:${minimumDataDependencyGate.status}`,
    ],
  };
  const reviewMetadata = inferReviewMetadata(ser, conflicts, options);
  const evidenceSupport = buildEvidenceSupport(ser, statement);
  const operationalConstraintBundle = buildOperationalConstraintBundle(statement);

  const jurisdiction = options.jurisdiction ?? ser.applicability.jurisdictions[0] ?? "global";
  const eoId = `EO-${ser.serId.replace(/[^A-Z0-9]/gi, "")}-${statement.statementId.replace(/[^A-Z0-9]/gi, "")}`.slice(0, 64);
  const epistemicUncertaintyLayer = classifyEpistemicUncertaintyLayer({
    eoId,
    confidence: confidenceEngine,
    mac: applicabilityMatrix,
    ddmoGate: minimumDataDependencyGate,
    conflicts,
    reviewState: reviewMetadata.reviewState,
  });

  const eo: EvidenceObject = {
    eoId,
    sourceDocumentId: ser.sourceDocumentId,
    sourceSerId: ser.serId,
    trigger: {
      event: `${ser.clinicalDomain}:${statement.clinicalFunction}`.toLowerCase(),
      clinicalFunction: statement.clinicalFunction,
    },
    conditions: inferConditions(ser, statement),
    exclusions: inferExclusions(ser, statement),
    decision,
    action: inferAction(ser, statement),
    expectedOutcomes: statement.outcomes ?? [],
    confidence,
    evidenceLinks: evidenceSupport.supportLinks,
    evidenceSupport,
    provenance: ser.provenance,
    operationalConstraints: statement.operationalContext,
    operationalConstraintBundle,
    applicabilityMatrix,
    minimumDataDependencyGate,
    temporalContext: {
      timeHorizon: statement.timeHorizon,
      activationWindow: options.activationWindow ?? null,
      reviewBy: options.reviewBy ?? null,
    },
    jurisdiction,
    reviewMetadata,
    epistemicUncertaintyLayer,
    inferenceTrace: buildInferenceTrace(ser, statement, confidence, conflicts, reviewMetadata, epistemicUncertaintyLayer),
    conflicts,
  };

  if (reviewMetadata.reviewState === "needs-human-review" || epistemicUncertaintyLayer.activationBlocked) {
    eo.decision.verb = "defer_to_review";
    eo.decision.readiness = "not-ready";
  }

  return eo;
}
