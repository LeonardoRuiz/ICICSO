import type { ValidationIssue } from "../models/common.js";
import type { ProvenanceRecord } from "../models/provenance.js";
import { isIsoDate, isIsoDateTime, isNonEmptyString, isObject, pushIssue, result } from "./_shared.js";

export function validateProvenance(value: unknown, path = "provenance") {
  const issues: ValidationIssue[] = [];

  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result<ProvenanceRecord>(issues);
  }

  if (!isNonEmptyString(value.sourceSystem)) pushIssue(issues, `${path}.sourceSystem`, "must be a non-empty string");
  if (!isIsoDateTime(value.capturedAt)) pushIssue(issues, `${path}.capturedAt`, "must be an ISO date-time");
  if (!isNonEmptyString(value.capturedBy)) pushIssue(issues, `${path}.capturedBy`, "must be a non-empty string");

  if (!Array.isArray(value.chainOfCustody) || value.chainOfCustody.length === 0) {
    pushIssue(issues, `${path}.chainOfCustody`, "must contain at least one custody record");
  }

  if (!isObject(value.legal)) {
    pushIssue(issues, `${path}.legal`, "must be an object");
  } else {
    if (!isNonEmptyString(value.legal.reviewPolicy)) pushIssue(issues, `${path}.legal.reviewPolicy`, "must be a non-empty string");
  }

  if (!isObject(value.versioning)) {
    pushIssue(issues, `${path}.versioning`, "must be an object");
  } else {
    if (!isNonEmptyString(value.versioning.canonicalId)) pushIssue(issues, `${path}.versioning.canonicalId`, "must be a non-empty string");
    if (!isNonEmptyString(value.versioning.version)) pushIssue(issues, `${path}.versioning.version`, "must be a semver string");
    if (!isIsoDate(value.versioning.effectiveFrom)) pushIssue(issues, `${path}.versioning.effectiveFrom`, "must be an ISO date");
  }

  return result<ProvenanceRecord>(issues, issues.length === 0 ? (value as unknown as ProvenanceRecord) : undefined);
}
