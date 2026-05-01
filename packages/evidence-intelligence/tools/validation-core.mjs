import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_DIR = path.join(ROOT, "schemas");

export const enums = {
  source_type: ["journal", "guideline-body", "society", "hta-agency", "institution", "registry", "database"],
  effect_direction: ["benefit", "harm", "no-benefit", "inconclusive", "mixed"],
  certainty: ["very-high", "high", "moderate", "low", "very-low", "unknown"],
  decision_readiness: ["ready-for-execution", "ready-with-local-review", "synthesis-required", "contextual-only", "not-ready"],
  review_status: ["draft", "under-review", "approved", "active", "superseded", "deprecated"],
  implementation_complexity: ["low", "moderate", "high", "very-high"],
  resource_demand: ["low", "moderate", "high", "critical"],
  cost_relevance: ["low", "moderate", "high", "transformational"],
  operational_relevance: ["low", "moderate", "high", "transformational"],
  overall_recommendation: ["directly-applicable", "applicable-with-review", "contextual-only", "not-applicable"],
  conflict_priority: ["source-priority", "recency-priority", "certainty-priority", "directness-priority", "jurisdiction-priority", "implementation-priority"],
  conflict_action: ["prefer-left", "prefer-right", "defer-review", "reduce-readiness", "mark-unresolved"],
  source_artifact_type: ["evidence-document", "evidence-source", "ser"],
  decision_verb: ["recommend", "consider", "avoid", "defer-to-review"],
};

function push(issues, pathKey, message) {
  issues.push({ path: pathKey, message });
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isArrayOfStrings(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function checkEnum(issues, pathKey, value, allowed) {
  if (!isNonEmptyString(value) || !allowed.includes(value)) {
    push(issues, pathKey, `must be one of: ${allowed.join(", ")}`);
  }
}

function checkRequiredObject(issues, pathKey, value) {
  if (!isObject(value)) {
    push(issues, pathKey, "must be an object");
    return false;
  }
  return true;
}

function checkApplicability(value, pathKey = "applicability") {
  const issues = [];
  if (!checkRequiredObject(issues, pathKey, value)) return issues;
  for (const dimension of ["population_fit", "intervention_fit", "setting_fit", "jurisdiction_fit", "resource_fit"]) {
    const item = value[dimension];
    if (!checkRequiredObject(issues, `${pathKey}.${dimension}`, item)) continue;
    if (!Number.isInteger(item.score) || item.score < 0 || item.score > 3) push(issues, `${pathKey}.${dimension}.score`, "must be integer 0..3");
    if (!isNonEmptyString(item.rationale)) push(issues, `${pathKey}.${dimension}.rationale`, "must be a non-empty string");
  }
  checkEnum(issues, `${pathKey}.overall_recommendation`, value.overall_recommendation, enums.overall_recommendation);
  return issues;
}

function checkProvenance(value, pathKey = "provenance") {
  const issues = [];
  if (!checkRequiredObject(issues, pathKey, value)) return issues;
  for (const field of ["source_system", "captured_at", "captured_by", "license_status", "attestation_status", "canonical_id", "version", "status"]) {
    if (!isNonEmptyString(value[field])) push(issues, `${pathKey}.${field}`, "must be a non-empty string");
  }
  if (!Array.isArray(value.chain_of_custody) || value.chain_of_custody.length === 0) push(issues, `${pathKey}.chain_of_custody`, "must contain at least one record");
  return issues;
}

function checkOperationalContext(value, pathKey = "operational_context") {
  const issues = [];
  if (!checkRequiredObject(issues, pathKey, value)) return issues;
  checkEnum(issues, `${pathKey}.implementation_complexity`, value.implementation_complexity, enums.implementation_complexity);
  checkEnum(issues, `${pathKey}.resource_demand`, value.resource_demand, enums.resource_demand);
  checkEnum(issues, `${pathKey}.cost_relevance`, value.cost_relevance, enums.cost_relevance);
  checkEnum(issues, `${pathKey}.operational_relevance`, value.operational_relevance, enums.operational_relevance);
  if (!Array.isArray(value.resource_requirements) || value.resource_requirements.length === 0) {
    push(issues, `${pathKey}.resource_requirements`, "must contain at least one requirement");
  }
  return issues;
}

export function validateEvidenceSource(data) {
  const issues = [];
  if (!checkRequiredObject(issues, "evidence_source", data)) return issues;
  if (!isNonEmptyString(data.source_id)) push(issues, "source_id", "required");
  checkEnum(issues, "source_type", data.source_type, enums.source_type);
  for (const field of ["origin", "publisher", "language", "access_model"]) {
    if (!isNonEmptyString(data[field])) push(issues, field, "required");
  }
  return issues;
}

export function validateEvidenceClassification(data) {
  const issues = [];
  if (!checkRequiredObject(issues, "evidence_classification", data)) return issues;
  for (const field of ["classification_id", "evidence_type", "evidence_level"]) {
    if (!isNonEmptyString(data[field])) push(issues, field, "required");
  }
  if (!isArrayOfStrings(data.clinical_functions) || data.clinical_functions.length === 0) push(issues, "clinical_functions", "must be a non-empty string array");
  checkEnum(issues, "effect_direction", data.effect_direction, enums.effect_direction);
  checkEnum(issues, "certainty", data.certainty, enums.certainty);
  if (!isArrayOfStrings(data.time_horizons) || data.time_horizons.length === 0) push(issues, "time_horizons", "must be a non-empty string array");
  return issues;
}

export function validateEvidenceDocument(data) {
  const issues = [];
  if (!checkRequiredObject(issues, "evidence_document", data)) return issues;
  for (const field of ["id", "title", "evidence_type", "version_or_update", "specialty", "clinical_domain", "hash", "status"]) {
    if (!isNonEmptyString(data[field])) push(issues, field, "required");
  }
  if (!Number.isInteger(data.publication_year)) push(issues, "publication_year", "must be an integer");
  checkEnum(issues, "source_type", data.source_type, enums.source_type);
  if (!isArrayOfStrings(data.jurisdiction) || data.jurisdiction.length === 0) push(issues, "jurisdiction", "must be a non-empty string array");
  if (!checkRequiredObject(issues, "population", data.population)) {}
  if (!checkRequiredObject(issues, "intervention", data.intervention)) {}
  if (data.comparator !== undefined && data.comparator !== null && !isObject(data.comparator)) push(issues, "comparator", "must be object or null");
  if (!Array.isArray(data.outcomes) || data.outcomes.length === 0) push(issues, "outcomes", "must contain at least one outcome");
  checkEnum(issues, "effect_direction", data.effect_direction, enums.effect_direction);
  checkEnum(issues, "certainty", data.certainty, enums.certainty);
  if (!isArrayOfStrings(data.clinical_functions) || data.clinical_functions.length === 0) push(issues, "clinical_functions", "must be a non-empty string array");
  if (!isArrayOfStrings(data.time_horizons) || data.time_horizons.length === 0) push(issues, "time_horizons", "must be a non-empty string array");
  issues.push(...checkApplicability(data.applicability));
  issues.push(...checkProvenance(data.provenance));
  if (!Array.isArray(data.references) || data.references.length === 0) push(issues, "references", "must contain at least one reference");
  if (!checkRequiredObject(issues, "ingestion_metadata", data.ingestion_metadata)) {}
  return issues;
}

export function validateReviewMetadata(data) {
  const issues = [];
  if (!checkRequiredObject(issues, "review_metadata", data)) return issues;
  if (!isNonEmptyString(data.owner)) push(issues, "owner", "required");
  checkEnum(issues, "review_status", data.review_status, enums.review_status);
  if (!isNonEmptyString(data.reviewed_at)) push(issues, "reviewed_at", "required");
  if (!isNonEmptyString(data.review_cycle)) push(issues, "review_cycle", "required");
  return issues;
}

export function validateSER(data) {
  const issues = [];
  if (!checkRequiredObject(issues, "ser", data)) return issues;
  if (!isNonEmptyString(data.ser_id)) push(issues, "ser_id", "required");
  if (!Array.isArray(data.linked_source_ids) || data.linked_source_ids.length === 0) push(issues, "linked_source_ids", "must contain linked source ids");
  if (!checkRequiredObject(issues, "pico", data.pico)) {}
  if (!checkRequiredObject(issues, "population_details", data.population_details)) {}
  if (!checkRequiredObject(issues, "intervention_details", data.intervention_details)) {}
  if (data.comparator_details !== undefined && data.comparator_details !== null && !isObject(data.comparator_details)) push(issues, "comparator_details", "must be object or null");
  if (!Array.isArray(data.outcome_objects) || data.outcome_objects.length === 0) push(issues, "outcome_objects", "must contain outcomes");
  if (!Array.isArray(data.effect_estimates) || data.effect_estimates.length === 0) push(issues, "effect_estimates", "must contain estimates");
  if (!isNonEmptyString(data.follow_up_period)) push(issues, "follow_up_period", "required");
  if (!Array.isArray(data.bias_limitations)) push(issues, "bias_limitations", "must be an array");
  issues.push(...checkApplicability(data.applicability_assessment, "applicability_assessment"));
  checkEnum(issues, "operational_relevance", data.operational_relevance, enums.operational_relevance);
  checkEnum(issues, "decision_readiness", data.decision_readiness, enums.decision_readiness);
  if (!checkRequiredObject(issues, "evidence_grading", data.evidence_grading)) {}
  issues.push(...checkProvenance(data.provenance));
  issues.push(...validateReviewMetadata(data.review));
  return issues;
}

export function validateEO(data) {
  const issues = [];
  if (!checkRequiredObject(issues, "eo", data)) return issues;
  if (!isNonEmptyString(data.eo_id)) push(issues, "eo_id", "required");
  if (!checkRequiredObject(issues, "trigger", data.trigger)) {}
  if (!Array.isArray(data.conditions)) push(issues, "conditions", "must be an array");
  if (data.exclusions !== undefined && !Array.isArray(data.exclusions)) push(issues, "exclusions", "must be an array");
  if (!checkRequiredObject(issues, "decision", data.decision)) {
  } else {
    checkEnum(issues, "decision.verb", data.decision.verb, enums.decision_verb);
    checkEnum(issues, "decision.effect_direction", data.decision.effect_direction, enums.effect_direction);
    checkEnum(issues, "decision.decision_readiness", data.decision.decision_readiness, enums.decision_readiness);
  }
  if (!Array.isArray(data.actions) || data.actions.length === 0) push(issues, "actions", "must contain at least one action");
  if (!Array.isArray(data.expected_outcomes) || data.expected_outcomes.length === 0) push(issues, "expected_outcomes", "must contain at least one outcome");
  if (!Array.isArray(data.required_context)) push(issues, "required_context", "must be an array");
  issues.push(...checkOperationalContext(data.operational_constraints));
  if (!Array.isArray(data.evidence_support) || data.evidence_support.length === 0) push(issues, "evidence_support", "must contain evidence links");
  if (!checkRequiredObject(issues, "confidence", data.confidence)) {
  } else {
    checkEnum(issues, "confidence.certainty", data.confidence.certainty, enums.certainty);
  }
  if (!isArrayOfStrings(data.jurisdiction) || data.jurisdiction.length === 0) push(issues, "jurisdiction", "must be a non-empty string array");
  checkEnum(issues, "review_status", data.review_status, enums.review_status);
  if (!isNonEmptyString(data.version)) push(issues, "version", "required");
  if (!checkRequiredObject(issues, "audit_fields", data.audit_fields)) {}
  return issues;
}

export function validateConflictRule(data) {
  const issues = [];
  if (!checkRequiredObject(issues, "conflict_rule", data)) return issues;
  if (!isNonEmptyString(data.rule_id)) push(issues, "rule_id", "required");
  checkEnum(issues, "priority_code", data.priority_code, enums.conflict_priority);
  if (!Number.isInteger(data.priority_order)) push(issues, "priority_order", "must be an integer");
  if (!isNonEmptyString(data.description)) push(issues, "description", "required");
  checkEnum(issues, "resolution_action", data.resolution_action, enums.conflict_action);
  return issues;
}

export const validators = {
  "evidence-source": validateEvidenceSource,
  "evidence-classification": validateEvidenceClassification,
  "evidence-document": validateEvidenceDocument,
  provenance: checkProvenance,
  applicability: checkApplicability,
  "operational-context": checkOperationalContext,
  ser: validateSER,
  eo: validateEO,
  "conflict-rule": validateConflictRule,
  "review-metadata": validateReviewMetadata,
};

export function validateArtifact(kind, data) {
  const validator = validators[kind];
  if (!validator) throw new Error(`Unknown validator kind: ${kind}`);
  return validator(data);
}

export function loadExample(relativePath) {
  return readJson(path.join(ROOT, relativePath));
}

export function loadSchema(fileName) {
  return readJson(path.join(SCHEMA_DIR, fileName));
}
