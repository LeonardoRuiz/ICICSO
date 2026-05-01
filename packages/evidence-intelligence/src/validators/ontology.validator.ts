import type { OntologyCatalog, ValidationIssue } from "../models/common.js";
import {
  APPLICABILITY_DIMENSION_CODES,
  CERTAINTY_CODES,
  CLINICAL_FUNCTION_CODES,
  CONFLICT_PRIORITY_CODES,
  EFFECT_DIRECTION_CODES,
  EVIDENCE_DECAY_CODES,
  EVIDENCE_HIERARCHY_CODES,
  EVIDENCE_TYPE_CODES,
  IMPLEMENTATION_COMPLEXITY_CODES,
  INTERVENTION_CLASS_CODES,
  JURISDICTION_CODES,
  OPERATIONAL_RELEVANCE_CODES,
  OUTCOME_CODES,
  TIME_HORIZON_CODES,
  UNCERTAINTY_CODES,
} from "../models/common.js";
import { ontologyCatalogs } from "../seeds/catalogs.js";
import { isNonEmptyString, isObject, pushIssue, result } from "./_shared.js";

function validateCatalogShape(catalog: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isObject(catalog)) {
    pushIssue(issues, path, "must be an object");
    return issues;
  }

  if (!isNonEmptyString(catalog.catalogId)) pushIssue(issues, `${path}.catalogId`, "must be a non-empty string");
  if (!isNonEmptyString(catalog.code)) pushIssue(issues, `${path}.code`, "must be a non-empty string");
  if (!isNonEmptyString(catalog.label)) pushIssue(issues, `${path}.label`, "must be a non-empty string");
  if (!isNonEmptyString(catalog.description)) pushIssue(issues, `${path}.description`, "must be a non-empty string");
  if (!Array.isArray(catalog.usageNotes) || catalog.usageNotes.length === 0) pushIssue(issues, `${path}.usageNotes`, "must contain at least one usage note");
  if (!Array.isArray(catalog.entries) || catalog.entries.length === 0) {
    pushIssue(issues, `${path}.entries`, "must contain entries");
    return issues;
  }

  const ids = new Set<string>();
  const codes = new Set<string>();
  for (const [index, entry] of catalog.entries.entries()) {
    const entryPath = `${path}.entries[${index}]`;
    if (!isObject(entry)) {
      pushIssue(issues, entryPath, "must be an object");
      continue;
    }
    if (!isNonEmptyString(entry.id)) pushIssue(issues, `${entryPath}.id`, "must be a non-empty string");
    if (!isNonEmptyString(entry.code)) pushIssue(issues, `${entryPath}.code`, "must be a non-empty string");
    if (!isNonEmptyString(entry.label)) pushIssue(issues, `${entryPath}.label`, "must be a non-empty string");
    if (!isNonEmptyString(entry.description)) pushIssue(issues, `${entryPath}.description`, "must be a non-empty string");
    if (!Array.isArray(entry.usageNotes) || entry.usageNotes.length === 0) pushIssue(issues, `${entryPath}.usageNotes`, "must contain at least one usage note");

    if (isNonEmptyString(entry.id)) {
      if (ids.has(entry.id)) pushIssue(issues, `${entryPath}.id`, "duplicate id");
      ids.add(entry.id);
    }
    if (isNonEmptyString(entry.code)) {
      if (codes.has(entry.code)) pushIssue(issues, `${entryPath}.code`, "duplicate code");
      codes.add(entry.code);
    }
  }

  return issues;
}

function validateCodeCoverage(catalog: OntologyCatalog, expectedCodes: readonly string[], path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const actualCodes = new Set(catalog.entries.map((entry) => entry.code));

  for (const code of expectedCodes) {
    if (!actualCodes.has(code)) pushIssue(issues, path, `missing code ${code}`);
  }

  for (const code of actualCodes) {
    if (!expectedCodes.includes(code)) pushIssue(issues, path, `unexpected code ${code}`);
  }

  return issues;
}

export function validateOntologyCatalogs() {
  const issues: ValidationIssue[] = [];
  const catalogs = ontologyCatalogs as Record<string, OntologyCatalog>;

  for (const [key, catalog] of Object.entries(catalogs)) {
    issues.push(...validateCatalogShape(catalog, `ontologyCatalogs.${key}`));
  }

  issues.push(...validateCodeCoverage(catalogs.evidenceTypes, EVIDENCE_TYPE_CODES, "ontologyCatalogs.evidenceTypes"));
  issues.push(...validateCodeCoverage(catalogs.evidenceLevels, EVIDENCE_HIERARCHY_CODES, "ontologyCatalogs.evidenceLevels"));
  issues.push(...validateCodeCoverage(catalogs.clinicalFunctions, CLINICAL_FUNCTION_CODES, "ontologyCatalogs.clinicalFunctions"));
  issues.push(...validateCodeCoverage(catalogs.interventions, INTERVENTION_CLASS_CODES, "ontologyCatalogs.interventions"));
  issues.push(...validateCodeCoverage(catalogs.outcomes, OUTCOME_CODES, "ontologyCatalogs.outcomes"));
  issues.push(...validateCodeCoverage(catalogs.timeHorizons, TIME_HORIZON_CODES, "ontologyCatalogs.timeHorizons"));
  issues.push(...validateCodeCoverage(catalogs.uncertaintyCatalog, UNCERTAINTY_CODES, "ontologyCatalogs.uncertaintyCatalog"));
  issues.push(...validateCodeCoverage(catalogs.certaintyLevels, CERTAINTY_CODES, "ontologyCatalogs.certaintyLevels"));
  issues.push(...validateCodeCoverage(catalogs.jurisdictions, JURISDICTION_CODES, "ontologyCatalogs.jurisdictions"));
  issues.push(...validateCodeCoverage(catalogs.conflictRules, CONFLICT_PRIORITY_CODES, "ontologyCatalogs.conflictRules"));
  issues.push(...validateCodeCoverage(catalogs.applicabilityDimensions, APPLICABILITY_DIMENSION_CODES, "ontologyCatalogs.applicabilityDimensions"));
  issues.push(...validateCodeCoverage(catalogs.implementationComplexity, IMPLEMENTATION_COMPLEXITY_CODES, "ontologyCatalogs.implementationComplexity"));
  issues.push(...validateCodeCoverage(catalogs.effectDirection, EFFECT_DIRECTION_CODES, "ontologyCatalogs.effectDirection"));
  issues.push(...validateCodeCoverage(catalogs.evidenceDecay, EVIDENCE_DECAY_CODES, "ontologyCatalogs.evidenceDecay"));
  issues.push(...validateCodeCoverage(catalogs.operationalRelevance, OPERATIONAL_RELEVANCE_CODES, "ontologyCatalogs.operationalRelevance"));

  return result(issues, catalogs);
}
