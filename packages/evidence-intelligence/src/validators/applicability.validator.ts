import type { ValidationIssue } from "../models/common.js";
import type { ApplicabilityProfile } from "../models/applicability.js";
import { DECISION_READINESS_CODES, JURISDICTION_CODES } from "../models/common.js";
import { enumSet, isNonEmptyString, isObject, isStringArray, pushIssue, result } from "./_shared.js";

const readiness = enumSet(DECISION_READINESS_CODES);
const jurisdictions = enumSet(JURISDICTION_CODES);

export function validateApplicability(value: unknown, path = "applicability") {
  const issues: ValidationIssue[] = [];

  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result<ApplicabilityProfile>(issues);
  }

  if (!isNonEmptyString(value.clinicalDomain)) pushIssue(issues, `${path}.clinicalDomain`, "must be a non-empty string");
  if (!isNonEmptyString(value.careSetting)) pushIssue(issues, `${path}.careSetting`, "must be a non-empty string");
  if (!isNonEmptyString(value.decisionReadiness) || !readiness.has(value.decisionReadiness)) {
    pushIssue(issues, `${path}.decisionReadiness`, "must be a supported decision readiness code");
  }

  if (!Array.isArray(value.jurisdictions) || value.jurisdictions.length === 0) {
    pushIssue(issues, `${path}.jurisdictions`, "must include at least one jurisdiction");
  } else if (value.jurisdictions.some((entry) => !isNonEmptyString(entry) || !jurisdictions.has(entry))) {
    pushIssue(issues, `${path}.jurisdictions`, "contains unsupported jurisdiction codes");
  }

  if (!isObject(value.population)) {
    pushIssue(issues, `${path}.population`, "must be an object");
  } else {
    if (!isNonEmptyString(value.population.summary)) pushIssue(issues, `${path}.population.summary`, "must be a non-empty string");
    if (value.population.inclusionCriteria !== undefined && !isStringArray(value.population.inclusionCriteria)) {
      pushIssue(issues, `${path}.population.inclusionCriteria`, "must be an array of strings");
    }
    if (value.population.exclusionCriteria !== undefined && !isStringArray(value.population.exclusionCriteria)) {
      pushIssue(issues, `${path}.population.exclusionCriteria`, "must be an array of strings");
    }
  }

  return result<ApplicabilityProfile>(issues, issues.length === 0 ? (value as unknown as ApplicabilityProfile) : undefined);
}
