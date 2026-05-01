import type { ApplicabilityAssessment } from "../models/applicability.js";
import type { ConflictMarker } from "../models/eo.js";
import type { EvidenceStatement, StructuredEvidenceRecord } from "../models/ser.js";

export interface MinimumDataDependencyInput {
  id?: string;
  key?: string;
  label?: string;
  required?: boolean;
  present?: boolean;
  critical?: boolean;
  source?: string | null;
}

export interface MinimumDataDependency {
  key: string;
  label: string;
  required: boolean;
  present: boolean;
  critical: boolean;
  source: string | null;
}

export interface MinimumDataDependencyGate {
  status: "pass" | "blocked";
  missingCritical: string[];
  dependencies: MinimumDataDependency[];
}

export interface ApplicabilityMatrixResult {
  classification: "applicable" | "conditional" | "not-applicable" | "indeterminate";
  applicabilityScore: number;
  dimensions: ApplicabilityAssessment[];
  rationale: string;
}

export interface ApplicabilityMatrixInput {
  ser: StructuredEvidenceRecord;
  statement: EvidenceStatement;
  applicabilityScore: number;
  conflicts: ConflictMarker[];
  ddmoGate: MinimumDataDependencyGate;
}

function normalizeMinimumDataDependency(input: MinimumDataDependencyInput, index: number): MinimumDataDependency {
  const key = input.key ?? input.id ?? `dependency-${String(index + 1).padStart(3, "0")}`;
  return {
    key,
    label: input.label ?? key,
    required: input.required !== false,
    present: input.present === true,
    critical: input.critical !== false,
    source: input.source ?? null,
  };
}

export function evaluateMinimumDataDependencies(
  dependencies: MinimumDataDependencyInput[] = [],
): MinimumDataDependencyGate {
  const normalized = dependencies.map((item, index) => normalizeMinimumDataDependency(item, index));
  const missingCritical = normalized
    .filter((item) => item.required && item.critical && !item.present)
    .map((item) => item.key);

  return {
    status: missingCritical.length === 0 ? "pass" : "blocked",
    missingCritical,
    dependencies: normalized,
  };
}

export function classifyApplicabilityMatrix(
  input: Pick<ApplicabilityMatrixInput, "statement" | "applicabilityScore" | "conflicts" | "ddmoGate">,
): ApplicabilityMatrixResult["classification"] {
  if (input.ddmoGate.status === "blocked") return "indeterminate";
  if (input.conflicts.some((conflict) => conflict.severity === "critical")) return "indeterminate";
  if (input.applicabilityScore < 0.45) return "not-applicable";
  if (input.statement.decisionReadiness === "ready-for-execution" && input.conflicts.length === 0 && input.applicabilityScore >= 0.75) {
    return "applicable";
  }
  return "conditional";
}

export function buildApplicabilityMatrix(input: ApplicabilityMatrixInput): ApplicabilityMatrixResult {
  const classification = classifyApplicabilityMatrix(input);
  return {
    classification,
    applicabilityScore: Number(input.applicabilityScore.toFixed(2)),
    dimensions: input.ser.applicability.dimensionAssessments ?? [],
    rationale: classification === "indeterminate"
      ? "Applicability cannot be finalized because uncertainty, conflict or DDMO blockers remain."
      : classification === "not-applicable"
        ? "Applicability score is below the minimum execution threshold."
        : classification === "applicable"
          ? "Applicability dimensions support direct use after governance clearance."
          : "Applicability is conditional and requires explicit contextual review before unrestricted use.",
  };
}

export function collectEvidenceConflictMarkers(input: {
  statement: EvidenceStatement;
  confidenceScore: number;
  applicabilityScore: number;
  agePenalty: number;
}): ConflictMarker[] {
  const conflicts: ConflictMarker[] = [];

  if (input.statement.effectDirection === "mixed" || input.statement.effectDirection === "inconclusive") {
    conflicts.push({
      code: "effect-direction-conflict",
      severity: "critical",
      message: "Evidence direction is mixed or inconclusive.",
    });
  }

  if (input.applicabilityScore < 0.45) {
    conflicts.push({
      code: "low-applicability",
      severity: "warning",
      message: "Applicability is limited across one or more dimensions.",
    });
  }

  if (input.agePenalty >= 0.12) {
    conflicts.push({
      code: "stale-evidence",
      severity: input.agePenalty >= 0.25 ? "critical" : "warning",
      message: "Evidence age reduces current confidence.",
    });
  }

  if (input.confidenceScore < 0.5 || input.statement.strength === "insufficient" || input.statement.certainty === "unknown") {
    conflicts.push({
      code: "insufficient-strength",
      severity: "critical",
      message: "Strength or certainty is insufficient for silent execution.",
    });
  }

  return conflicts;
}

export function appendDdmoConflicts(
  conflicts: ConflictMarker[],
  ddmoGate: MinimumDataDependencyGate,
): ConflictMarker[] {
  if (ddmoGate.status !== "blocked") return conflicts;
  return [
    ...conflicts,
    {
      code: "ddmo-missing-critical",
      severity: "critical",
      message: `Missing critical DDMO fields: ${ddmoGate.missingCritical.join(", ")}.`,
    },
  ];
}
