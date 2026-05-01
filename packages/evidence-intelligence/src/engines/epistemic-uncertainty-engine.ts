import type { ApplicabilityMatrixResult, MinimumDataDependencyGate } from "./applicability-ddmo-engine.js";
import type { EvidenceConfidenceEngineResult } from "./evidence-confidence-engine.js";
import type { ConflictMarker, ReviewMetadata } from "../models/eo.js";

export type EpistemicUncertaintyLevel = "I" | "II" | "III" | "IV";

export interface EpistemicUncertaintyLayerResult {
  layerId: string;
  level: EpistemicUncertaintyLevel;
  classification:
    | "low-epistemic-friction"
    | "contextual-epistemic-friction"
    | "reinforced-epistemic-friction"
    | "blocked-epistemic-friction";
  activationPolicy:
    | "standard-validation"
    | "contextual-validation"
    | "reinforced-validation"
    | "blocked-pending-governance";
  activationBlocked: boolean;
  validationRequired: EpistemicUncertaintyLayerResult["activationPolicy"];
  requiredSignatures: string[];
  escalationThreshold: number;
  conflictSeverity: ConflictMarker["severity"];
  inputs: {
    ecs: number;
    uci: number;
    macClassification: ApplicabilityMatrixResult["classification"];
    ddmoGateStatus: MinimumDataDependencyGate["status"];
    reviewState: ReviewMetadata["reviewState"];
    conflictCount: number;
  };
  rationale: string;
}

export interface EpistemicUncertaintyLayerInput {
  eoId: string;
  confidence: EvidenceConfidenceEngineResult;
  mac: ApplicabilityMatrixResult;
  ddmoGate: MinimumDataDependencyGate;
  conflicts: ConflictMarker[];
  reviewState: ReviewMetadata["reviewState"];
}

function highestConflictSeverity(conflicts: ConflictMarker[]): ConflictMarker["severity"] {
  if (conflicts.some((conflict) => conflict.severity === "critical")) return "critical";
  if (conflicts.some((conflict) => conflict.severity === "warning")) return "warning";
  return "info";
}

function requiredSignatures(level: EpistemicUncertaintyLevel): string[] {
  switch (level) {
    case "I":
      return ["evidence-owner"];
    case "II":
      return ["evidence-owner", "local-clinical-reviewer"];
    case "III":
      return ["evidence-owner", "specialist-reviewer", "governance-duty-officer"];
    case "IV":
      return ["evidence-owner", "specialist-reviewer", "governance-board"];
    default:
      return ["evidence-owner"];
  }
}

function activationPolicy(level: EpistemicUncertaintyLevel): EpistemicUncertaintyLayerResult["activationPolicy"] {
  switch (level) {
    case "I":
      return "standard-validation";
    case "II":
      return "contextual-validation";
    case "III":
      return "reinforced-validation";
    case "IV":
      return "blocked-pending-governance";
    default:
      return "contextual-validation";
  }
}

function escalationThreshold(level: EpistemicUncertaintyLevel): number {
  switch (level) {
    case "I":
      return 0.25;
    case "II":
      return 0.4;
    case "III":
      return 0.6;
    case "IV":
      return 0;
    default:
      return 0.4;
  }
}

export function classifyEpistemicUncertaintyLayer(
  input: EpistemicUncertaintyLayerInput,
): EpistemicUncertaintyLayerResult {
  const criticalConflict = input.conflicts.some((conflict) => conflict.severity === "critical");
  const warningConflict = input.conflicts.some((conflict) => conflict.severity === "warning");
  let level: EpistemicUncertaintyLevel = "II";
  const reasons: string[] = [];

  if (input.ddmoGate.status === "blocked") {
    level = "IV";
    reasons.push("DDMO gate is blocked by missing critical data.");
  } else if (criticalConflict || input.mac.classification === "indeterminate" || input.confidence.ecs < 50 || input.confidence.uci > 0.6) {
    level = "IV";
    reasons.push("Critical epistemic blocker detected.");
  } else if (warningConflict || input.mac.classification === "conditional" || input.confidence.ecs < 65 || input.confidence.uci > 0.4) {
    level = "III";
    reasons.push("Residual uncertainty requires reinforced validation.");
  } else if (input.mac.classification === "applicable" && input.confidence.ecs >= 80 && input.confidence.uci <= 0.25) {
    level = "I";
    reasons.push("Evidence structure, applicability and uncertainty are within standard validation bounds.");
  } else {
    level = "II";
    reasons.push("Evidence is usable only with contextual validation.");
  }

  if (input.reviewState !== "specialist-approved" && level === "I") {
    level = "II";
    reasons.push("Specialist approval is absent, so the layer is elevated to contextual validation.");
  }

  const policy = activationPolicy(level);
  return {
    layerId: `EUL-${input.eoId}`,
    level,
    classification: level === "I"
      ? "low-epistemic-friction"
      : level === "II"
        ? "contextual-epistemic-friction"
        : level === "III"
          ? "reinforced-epistemic-friction"
          : "blocked-epistemic-friction",
    activationPolicy: policy,
    activationBlocked: level === "IV",
    validationRequired: policy,
    requiredSignatures: requiredSignatures(level),
    escalationThreshold: escalationThreshold(level),
    conflictSeverity: highestConflictSeverity(input.conflicts),
    inputs: {
      ecs: input.confidence.ecs,
      uci: input.confidence.uci,
      macClassification: input.mac.classification,
      ddmoGateStatus: input.ddmoGate.status,
      reviewState: input.reviewState,
      conflictCount: input.conflicts.length,
    },
    rationale: reasons.join(" "),
  };
}
