import type { ValidationIssue } from "../models/common.js";
import type { StructuredEvidenceRecord } from "../models/ser.js";
import {
  CERTAINTY_CODES,
  CLINICAL_FUNCTION_CODES,
  DECISION_READINESS_CODES,
  EFFECT_DIRECTION_CODES,
  EVIDENCE_STRENGTH_CODES,
  EVIDENCE_TYPE_CODES,
  INTERVENTION_CLASS_CODES,
  TIME_HORIZON_CODES,
} from "../models/common.js";
import { validateApplicability } from "./applicability.validator.js";
import { validateOperationalContext } from "./operational-context.validator.js";
import { validateProvenance } from "./provenance.validator.js";
import { enumSet, isNonEmptyString, isObject, pushIssue, result } from "./_shared.js";

const evidenceTypes = enumSet(EVIDENCE_TYPE_CODES);
const functions = enumSet(CLINICAL_FUNCTION_CODES);
const interventions = enumSet(INTERVENTION_CLASS_CODES);
const directions = enumSet(EFFECT_DIRECTION_CODES);
const strengths = enumSet(EVIDENCE_STRENGTH_CODES);
const certainties = enumSet(CERTAINTY_CODES);
const readiness = enumSet(DECISION_READINESS_CODES);
const horizons = enumSet(TIME_HORIZON_CODES);

export function validateStructuredEvidenceRecord(value: unknown, path = "ser") {
  const issues: ValidationIssue[] = [];

  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result<StructuredEvidenceRecord>(issues);
  }

  if (!isNonEmptyString(value.serId)) pushIssue(issues, `${path}.serId`, "must be a non-empty string");
  if (!isNonEmptyString(value.sourceDocumentId)) pushIssue(issues, `${path}.sourceDocumentId`, "must be a non-empty string");
  if (!isNonEmptyString(value.title)) pushIssue(issues, `${path}.title`, "must be a non-empty string");
  if (!isNonEmptyString(value.clinicalDomain)) pushIssue(issues, `${path}.clinicalDomain`, "must be a non-empty string");
  if (!isNonEmptyString(value.evidenceType) || !evidenceTypes.has(value.evidenceType)) pushIssue(issues, `${path}.evidenceType`, "must be a supported evidence type");

  if (!Array.isArray(value.statements) || value.statements.length === 0) {
    pushIssue(issues, `${path}.statements`, "must include at least one statement");
  } else {
    value.statements.forEach((statement, index) => {
      const statementPath = `${path}.statements[${index}]`;
      if (!isObject(statement)) {
        pushIssue(issues, statementPath, "must be an object");
        return;
      }
      if (!isNonEmptyString(statement.statementId)) pushIssue(issues, `${statementPath}.statementId`, "must be a non-empty string");
      if (!isNonEmptyString(statement.clinicalFunction) || !functions.has(statement.clinicalFunction)) pushIssue(issues, `${statementPath}.clinicalFunction`, "must be supported");
      if (!isNonEmptyString(statement.interventionClass) || !interventions.has(statement.interventionClass)) pushIssue(issues, `${statementPath}.interventionClass`, "must be supported");
      if (!isNonEmptyString(statement.effectDirection) || !directions.has(statement.effectDirection)) pushIssue(issues, `${statementPath}.effectDirection`, "must be supported");
      if (!isNonEmptyString(statement.strength) || !strengths.has(statement.strength)) pushIssue(issues, `${statementPath}.strength`, "must be supported");
      if (!isNonEmptyString(statement.certainty) || !certainties.has(statement.certainty)) pushIssue(issues, `${statementPath}.certainty`, "must be supported");
      if (!isNonEmptyString(statement.decisionReadiness) || !readiness.has(statement.decisionReadiness)) pushIssue(issues, `${statementPath}.decisionReadiness`, "must be supported");
      if (!isNonEmptyString(statement.timeHorizon) || !horizons.has(statement.timeHorizon)) pushIssue(issues, `${statementPath}.timeHorizon`, "must be supported");
      issues.push(...validateOperationalContext(statement.operationalContext, `${statementPath}.operationalContext`).issues);
    });
  }

  issues.push(...validateApplicability(value.applicability, `${path}.applicability`).issues);
  issues.push(...validateProvenance(value.provenance, `${path}.provenance`).issues);

  return result<StructuredEvidenceRecord>(issues, issues.length === 0 ? (value as unknown as StructuredEvidenceRecord) : undefined);
}
