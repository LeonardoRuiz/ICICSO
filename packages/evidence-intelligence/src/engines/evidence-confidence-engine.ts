import type { ApplicabilityAssessment } from "../models/applicability.js";
import type { CertaintyCode, EvidenceStrength, EvidenceTypeCode, UncertaintyCode } from "../models/common.js";
import type { EvidenceStatement, StructuredEvidenceRecord } from "../models/ser.js";

export interface EvidenceConfidenceEngineInput {
  ser: StructuredEvidenceRecord;
  statement: EvidenceStatement;
  nowIso: string;
  applicabilityScore?: number;
}

export interface EvidenceConfidenceEngineResult {
  ecs: number;
  uci: number;
  confidenceScore: number;
  strength: EvidenceStrength;
  certainty: CertaintyCode;
  uncertainties: UncertaintyCode[];
  structural: {
    certaintyScore: number;
    strengthScore: number;
    applicabilityScore: number;
    sourcePriorityBonus: number;
    agePenalty: number;
  };
  reasons: string[];
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

export function averageApplicability(assessments?: ApplicabilityAssessment[]): number {
  if (!assessments || assessments.length === 0) return 0.67;
  const total = assessments.reduce((sum, item) => sum + item.score, 0);
  return total / (assessments.length * 3);
}

export function evidenceAgePenalty(capturedAt: string, nowIso: string): number {
  const capturedYear = new Date(capturedAt).getUTCFullYear();
  const currentYear = new Date(nowIso).getUTCFullYear();
  const age = currentYear - capturedYear;
  if (age >= 10) return 0.25;
  if (age >= 6) return 0.12;
  return 0;
}

function uncertaintySourcePenalty(uncertainties: UncertaintyCode[] = []): number {
  const unique = new Set(uncertainties);
  return Math.min(0.35, unique.size * 0.05);
}

export function computeEvidenceConfidence(input: EvidenceConfidenceEngineInput): EvidenceConfidenceEngineResult {
  const applicabilityScore = input.applicabilityScore ?? averageApplicability(input.ser.applicability.dimensionAssessments);
  const agePenalty = evidenceAgePenalty(input.ser.provenance.capturedAt, input.nowIso);
  const certaintyComponent = certaintyScore(input.statement.certainty);
  const strengthComponent = strengthScore(input.statement.strength);
  const sourceComponent = sourcePriorityBonus(input.ser.evidenceType);
  const rawScore =
    certaintyComponent * 0.4
    + strengthComponent * 0.35
    + applicabilityScore * 0.15
    + sourceComponent
    - agePenalty;
  const confidenceScore = Math.max(0, Math.min(1, Number(rawScore.toFixed(2))));
  const residualUncertainty = Math.max(
    0,
    Math.min(1, Number((1 - confidenceScore + uncertaintySourcePenalty(input.statement.uncertainties)).toFixed(2))),
  );

  return {
    ecs: Number((confidenceScore * 100).toFixed(1)),
    uci: residualUncertainty,
    confidenceScore,
    strength: input.statement.strength,
    certainty: input.statement.certainty,
    uncertainties: input.statement.uncertainties ?? [],
    structural: {
      certaintyScore: certaintyComponent,
      strengthScore: strengthComponent,
      applicabilityScore: Number(applicabilityScore.toFixed(2)),
      sourcePriorityBonus: sourceComponent,
      agePenalty,
    },
    reasons: [
      `evidence-type:${input.ser.evidenceType}`,
      `applicability-score:${applicabilityScore.toFixed(2)}`,
      `age-penalty:${agePenalty.toFixed(2)}`,
      `uncertainty-sources:${input.statement.uncertainties?.length ?? 0}`,
    ],
  };
}
