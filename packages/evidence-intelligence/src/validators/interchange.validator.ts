import type { ValidationIssue, ValidationResult } from "../models/common.js";
import {
  CERTAINTY_CODES,
  CLINICAL_FUNCTION_CODES,
  CONFLICT_PRIORITY_CODES,
  EFFECT_DIRECTION_CODES,
  EVIDENCE_HIERARCHY_CODES,
  EVIDENCE_TYPE_CODES,
  IMPLEMENTATION_COMPLEXITY_CODES,
  INTERVENTION_CLASS_CODES,
  JURISDICTION_CODES,
  OPERATIONAL_RELEVANCE_CODES,
  OUTCOME_CODES,
  RESOURCE_DEMAND_CODES,
  REVIEW_STATUS_CODES,
  TIME_HORIZON_CODES,
  UNCERTAINTY_CODES,
  COST_RELEVANCE_CODES,
  DECISION_READINESS_CODES,
} from "../models/common.js";
import type {
  ApplicabilityArtifact,
  ConflictRuleArtifact,
  EvidenceClassificationArtifact,
  EvidenceDocumentArtifact,
  EvidenceObjectArtifact,
  EvidenceSourceArtifact,
  InterchangeArtifactKind,
  InterchangeArtifactMap,
  OperationalContextArtifact,
  ProvenanceArtifact,
  ReviewMetadataArtifact,
  StructuredEvidenceRecordArtifact,
} from "../artifacts/types.js";
import { enumSet, isIsoDate, isIsoDateTime, isNonEmptyString, isObject, isStringArray, pushIssue, result } from "./_shared.js";

const evidenceTypes = enumSet(EVIDENCE_TYPE_CODES);
const evidenceLevels = enumSet(EVIDENCE_HIERARCHY_CODES);
const clinicalFunctions = enumSet(CLINICAL_FUNCTION_CODES);
const interventionClasses = enumSet(INTERVENTION_CLASS_CODES);
const outcomes = enumSet(OUTCOME_CODES);
const jurisdictions = enumSet(JURISDICTION_CODES);
const timeHorizons = enumSet(TIME_HORIZON_CODES);
const effects = enumSet(EFFECT_DIRECTION_CODES);
const certainties = enumSet(CERTAINTY_CODES);
const complexities = enumSet(IMPLEMENTATION_COMPLEXITY_CODES);
const resourceDemands = enumSet(RESOURCE_DEMAND_CODES);
const costRelevances = enumSet(COST_RELEVANCE_CODES);
const operationalRelevances = enumSet(OPERATIONAL_RELEVANCE_CODES);
const decisionReadinessSet = enumSet(DECISION_READINESS_CODES);
const reviewStatuses = enumSet(REVIEW_STATUS_CODES);
const conflictPriorities = enumSet(CONFLICT_PRIORITY_CODES);
const uncertaintySet = enumSet(UNCERTAINTY_CODES);

const sourceTypes = enumSet(["journal", "guideline-body", "society", "hta-agency", "institution", "registry", "database"] as const);
const overallRecommendations = enumSet(["directly-applicable", "applicable-with-review", "contextual-only", "not-applicable"] as const);
const conflictResolutionActions = enumSet(["prefer-left", "prefer-right", "defer-review", "reduce-readiness", "mark-unresolved"] as const);
const decisionVerbs = enumSet(["recommend", "consider", "avoid", "defer-to-review"] as const);
const artifactTypes = enumSet(["document", "ser", "statement"] as const);

function typedResult<T>(issues: ValidationIssue[], value?: T): ValidationResult<T> {
  return result<T>(issues, value);
}

function validateApplicabilityArtifact(value: unknown, path = "applicability"): ValidationResult<ApplicabilityArtifact> {
  const issues: ValidationIssue[] = [];
  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result(issues);
  }

  for (const dimension of ["population_fit", "intervention_fit", "setting_fit", "jurisdiction_fit", "resource_fit"] as const) {
    const item = value[dimension];
    if (!isObject(item)) {
      pushIssue(issues, `${path}.${dimension}`, "must be an object");
      continue;
    }
    const score = item.score;
    if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > 3) pushIssue(issues, `${path}.${dimension}.score`, "must be integer 0..3");
    if (!isNonEmptyString(item.rationale)) pushIssue(issues, `${path}.${dimension}.rationale`, "must be a non-empty string");
  }

  if (!isNonEmptyString(value.overall_recommendation) || !overallRecommendations.has(value.overall_recommendation)) {
    pushIssue(issues, `${path}.overall_recommendation`, "must be a supported applicability recommendation");
  }

  return typedResult(issues, issues.length === 0 ? (value as unknown as ApplicabilityArtifact) : undefined);
}

export function validateProvenanceArtifact(value: unknown, path = "provenance"): ValidationResult<ProvenanceArtifact> {
  const issues: ValidationIssue[] = [];
  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result(issues);
  }

  for (const field of ["source_system", "captured_at", "captured_by", "license_status", "attestation_status", "canonical_id", "version", "status"] as const) {
    if (!isNonEmptyString(value[field])) pushIssue(issues, `${path}.${field}`, "must be a non-empty string");
  }

  if (!isIsoDateTime(value.captured_at)) pushIssue(issues, `${path}.captured_at`, "must be an ISO date-time");
  if (value.effective_from !== undefined && value.effective_from !== null && !isIsoDate(value.effective_from)) pushIssue(issues, `${path}.effective_from`, "must be an ISO date");
  if (value.effective_to !== undefined && value.effective_to !== null && !isIsoDate(value.effective_to)) pushIssue(issues, `${path}.effective_to`, "must be an ISO date");
  if (value.review_policy !== undefined && value.review_policy !== null && !isNonEmptyString(value.review_policy)) pushIssue(issues, `${path}.review_policy`, "must be a non-empty string");

  if (!Array.isArray(value.chain_of_custody) || value.chain_of_custody.length === 0) {
    pushIssue(issues, `${path}.chain_of_custody`, "must contain at least one custody record");
  } else {
    value.chain_of_custody.forEach((entry, index) => {
      if (!isObject(entry)) {
        pushIssue(issues, `${path}.chain_of_custody[${index}]`, "must be an object");
        return;
      }
      for (const field of ["step", "actor", "timestamp", "hash"] as const) {
        if (!isNonEmptyString(entry[field])) pushIssue(issues, `${path}.chain_of_custody[${index}].${field}`, "must be a non-empty string");
      }
      if (!isIsoDateTime(entry.timestamp)) pushIssue(issues, `${path}.chain_of_custody[${index}].timestamp`, "must be an ISO date-time");
    });
  }

  return typedResult(issues, issues.length === 0 ? (value as unknown as ProvenanceArtifact) : undefined);
}

export function validateOperationalContextArtifact(value: unknown, path = "operational_context"): ValidationResult<OperationalContextArtifact> {
  const issues: ValidationIssue[] = [];
  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result(issues);
  }

  if (!isNonEmptyString(value.implementation_complexity) || !complexities.has(value.implementation_complexity)) pushIssue(issues, `${path}.implementation_complexity`, "must be a supported implementation complexity");
  if (!isNonEmptyString(value.resource_demand) || !resourceDemands.has(value.resource_demand)) pushIssue(issues, `${path}.resource_demand`, "must be a supported resource demand");
  if (!isNonEmptyString(value.cost_relevance) || !costRelevances.has(value.cost_relevance)) pushIssue(issues, `${path}.cost_relevance`, "must be a supported cost relevance");
  if (value.operational_relevance !== undefined && value.operational_relevance !== null && (!isNonEmptyString(value.operational_relevance) || !operationalRelevances.has(value.operational_relevance))) {
    pushIssue(issues, `${path}.operational_relevance`, "must be a supported operational relevance");
  }
  if (!Array.isArray(value.resource_requirements) || value.resource_requirements.length === 0) {
    pushIssue(issues, `${path}.resource_requirements`, "must contain at least one resource requirement");
  }

  return typedResult(issues, issues.length === 0 ? (value as unknown as OperationalContextArtifact) : undefined);
}

export function validateEvidenceSourceArtifact(value: unknown, path = "evidence_source"): ValidationResult<EvidenceSourceArtifact> {
  const issues: ValidationIssue[] = [];
  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result(issues);
  }
  for (const field of ["source_id", "origin", "publisher", "language", "access_model"] as const) {
    if (!isNonEmptyString(value[field])) pushIssue(issues, `${path}.${field}`, "must be a non-empty string");
  }
  if (!isNonEmptyString(value.source_type) || !sourceTypes.has(value.source_type)) pushIssue(issues, `${path}.source_type`, "must be a supported source type");
  return typedResult(issues, issues.length === 0 ? (value as unknown as EvidenceSourceArtifact) : undefined);
}

export function validateEvidenceClassificationArtifact(value: unknown, path = "evidence_classification"): ValidationResult<EvidenceClassificationArtifact> {
  const issues: ValidationIssue[] = [];
  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result(issues);
  }
  if (!isNonEmptyString(value.classification_id)) pushIssue(issues, `${path}.classification_id`, "must be a non-empty string");
  if (!isNonEmptyString(value.evidence_type) || !evidenceTypes.has(value.evidence_type)) pushIssue(issues, `${path}.evidence_type`, "must be a supported evidence type");
  if (!isNonEmptyString(value.evidence_level) || !evidenceLevels.has(value.evidence_level)) pushIssue(issues, `${path}.evidence_level`, "must be a supported evidence level");
  if (!Array.isArray(value.clinical_functions) || value.clinical_functions.length === 0 || !value.clinical_functions.every((item) => isNonEmptyString(item) && clinicalFunctions.has(item))) {
    pushIssue(issues, `${path}.clinical_functions`, "must contain supported clinical function codes");
  }
  if (!isNonEmptyString(value.effect_direction) || !effects.has(value.effect_direction)) pushIssue(issues, `${path}.effect_direction`, "must be a supported effect direction");
  if (!isNonEmptyString(value.certainty) || !certainties.has(value.certainty)) pushIssue(issues, `${path}.certainty`, "must be a supported certainty");
  if (!Array.isArray(value.time_horizons) || value.time_horizons.length === 0 || !value.time_horizons.every((item) => isNonEmptyString(item) && timeHorizons.has(item))) {
    pushIssue(issues, `${path}.time_horizons`, "must contain supported time horizon codes");
  }
  return typedResult(issues, issues.length === 0 ? (value as unknown as EvidenceClassificationArtifact) : undefined);
}

export function validateEvidenceDocumentArtifact(value: unknown, path = "evidence_document"): ValidationResult<EvidenceDocumentArtifact> {
  const issues: ValidationIssue[] = [];
  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result(issues);
  }

  for (const field of ["id", "title", "version_or_update", "specialty", "clinical_domain", "hash", "status"] as const) {
    if (!isNonEmptyString(value[field])) pushIssue(issues, `${path}.${field}`, "must be a non-empty string");
  }
  if (!isNonEmptyString(value.source_type) || !sourceTypes.has(value.source_type)) pushIssue(issues, `${path}.source_type`, "must be a supported source type");
  if (!isNonEmptyString(value.evidence_type) || !evidenceTypes.has(value.evidence_type)) pushIssue(issues, `${path}.evidence_type`, "must be a supported evidence type");
  if (typeof value.publication_year !== "number" || !Number.isInteger(value.publication_year) || value.publication_year < 1900 || value.publication_year > 2100) pushIssue(issues, `${path}.publication_year`, "must be an integer between 1900 and 2100");
  if (!Array.isArray(value.jurisdiction) || value.jurisdiction.length === 0 || !value.jurisdiction.every((item) => isNonEmptyString(item) && jurisdictions.has(item))) pushIssue(issues, `${path}.jurisdiction`, "must contain supported jurisdiction codes");
  if (!isObject(value.population) || !isNonEmptyString(value.population.summary)) pushIssue(issues, `${path}.population.summary`, "must be a non-empty string");
  if (!isObject(value.intervention)) {
    pushIssue(issues, `${path}.intervention`, "must be an object");
  } else {
    if (!isNonEmptyString(value.intervention.class) || !interventionClasses.has(value.intervention.class)) pushIssue(issues, `${path}.intervention.class`, "must be a supported intervention class");
    if (!isNonEmptyString(value.intervention.summary)) pushIssue(issues, `${path}.intervention.summary`, "must be a non-empty string");
  }
  if (value.comparator !== undefined && value.comparator !== null && (!isObject(value.comparator) || !isNonEmptyString(value.comparator.summary))) {
    pushIssue(issues, `${path}.comparator`, "must be null or an object with summary");
  }
  if (!Array.isArray(value.outcomes) || value.outcomes.length === 0) {
    pushIssue(issues, `${path}.outcomes`, "must contain at least one outcome");
  } else {
    value.outcomes.forEach((outcome, index) => {
      if (!isObject(outcome)) {
        pushIssue(issues, `${path}.outcomes[${index}]`, "must be an object");
        return;
      }
      if (!isNonEmptyString(outcome.outcome_class) || !outcomes.has(outcome.outcome_class)) pushIssue(issues, `${path}.outcomes[${index}].outcome_class`, "must be a supported outcome class");
      if (!isNonEmptyString(outcome.summary)) pushIssue(issues, `${path}.outcomes[${index}].summary`, "must be a non-empty string");
    });
  }
  if (!isNonEmptyString(value.effect_direction) || !effects.has(value.effect_direction)) pushIssue(issues, `${path}.effect_direction`, "must be a supported effect direction");
  if (!isNonEmptyString(value.certainty) || !certainties.has(value.certainty)) pushIssue(issues, `${path}.certainty`, "must be a supported certainty");
  if (!Array.isArray(value.clinical_functions) || value.clinical_functions.length === 0 || !value.clinical_functions.every((item) => isNonEmptyString(item) && clinicalFunctions.has(item))) {
    pushIssue(issues, `${path}.clinical_functions`, "must contain supported clinical function codes");
  }
  if (!Array.isArray(value.time_horizons) || value.time_horizons.length === 0 || !value.time_horizons.every((item) => isNonEmptyString(item) && timeHorizons.has(item))) {
    pushIssue(issues, `${path}.time_horizons`, "must contain supported time horizon codes");
  }

  issues.push(...validateApplicabilityArtifact(value.applicability, `${path}.applicability`).issues);
  issues.push(...validateProvenanceArtifact(value.provenance, `${path}.provenance`).issues);

  if (!Array.isArray(value.references) || value.references.length === 0) {
    pushIssue(issues, `${path}.references`, "must contain at least one reference");
  }
  if (!isObject(value.ingestion_metadata)) {
    pushIssue(issues, `${path}.ingestion_metadata`, "must be an object");
  } else {
    if (!isIsoDateTime(value.ingestion_metadata.ingested_at)) pushIssue(issues, `${path}.ingestion_metadata.ingested_at`, "must be an ISO date-time");
    if (!isNonEmptyString(value.ingestion_metadata.ingestion_channel)) pushIssue(issues, `${path}.ingestion_metadata.ingestion_channel`, "must be a non-empty string");
  }

  return typedResult(issues, issues.length === 0 ? (value as unknown as EvidenceDocumentArtifact) : undefined);
}

export function validateReviewMetadataArtifact(value: unknown, path = "review_metadata"): ValidationResult<ReviewMetadataArtifact> {
  const issues: ValidationIssue[] = [];
  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result(issues);
  }
  for (const field of ["owner", "reviewed_at", "review_cycle"] as const) {
    if (!isNonEmptyString(value[field])) pushIssue(issues, `${path}.${field}`, "must be a non-empty string");
  }
  if (!isIsoDateTime(value.reviewed_at)) pushIssue(issues, `${path}.reviewed_at`, "must be an ISO date-time");
  if (!isNonEmptyString(value.review_status) || !reviewStatuses.has(value.review_status)) pushIssue(issues, `${path}.review_status`, "must be a supported review status");
  return typedResult(issues, issues.length === 0 ? (value as unknown as ReviewMetadataArtifact) : undefined);
}

export function validateStructuredEvidenceRecordArtifact(value: unknown, path = "ser"): ValidationResult<StructuredEvidenceRecordArtifact> {
  const issues: ValidationIssue[] = [];
  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result(issues);
  }
  if (!isNonEmptyString(value.ser_id)) pushIssue(issues, `${path}.ser_id`, "must be a non-empty string");
  if (!isStringArray(value.linked_source_ids) || value.linked_source_ids.length === 0) pushIssue(issues, `${path}.linked_source_ids`, "must contain at least one linked source id");
  if (!isObject(value.pico) || !isNonEmptyString(value.pico.population) || !isNonEmptyString(value.pico.intervention) || !isStringArray(value.pico.outcomes) || value.pico.outcomes.length === 0) {
    pushIssue(issues, `${path}.pico`, "must include population, intervention and outcomes");
  }
  if (!isObject(value.population_details) || !isNonEmptyString(value.population_details.summary)) pushIssue(issues, `${path}.population_details.summary`, "must be a non-empty string");
  if (!isObject(value.intervention_details)) {
    pushIssue(issues, `${path}.intervention_details`, "must be an object");
  } else {
    if (!isNonEmptyString(value.intervention_details.class) || !interventionClasses.has(value.intervention_details.class)) pushIssue(issues, `${path}.intervention_details.class`, "must be a supported intervention class");
    if (!isNonEmptyString(value.intervention_details.summary)) pushIssue(issues, `${path}.intervention_details.summary`, "must be a non-empty string");
  }
  if (value.comparator_details !== undefined && value.comparator_details !== null && (!isObject(value.comparator_details) || !isNonEmptyString(value.comparator_details.summary))) {
    pushIssue(issues, `${path}.comparator_details`, "must be null or an object with summary");
  }
  if (!Array.isArray(value.outcome_objects) || value.outcome_objects.length === 0) {
    pushIssue(issues, `${path}.outcome_objects`, "must contain at least one outcome object");
  } else {
    value.outcome_objects.forEach((item, index) => {
      if (!isObject(item)) {
        pushIssue(issues, `${path}.outcome_objects[${index}]`, "must be an object");
        return;
      }
      if (!isNonEmptyString(item.outcome_class) || !outcomes.has(item.outcome_class)) pushIssue(issues, `${path}.outcome_objects[${index}].outcome_class`, "must be a supported outcome class");
      if (!isNonEmptyString(item.effect_direction) || !effects.has(item.effect_direction)) pushIssue(issues, `${path}.outcome_objects[${index}].effect_direction`, "must be a supported effect direction");
      if (!isNonEmptyString(item.measure)) pushIssue(issues, `${path}.outcome_objects[${index}].measure`, "must be a non-empty string");
    });
  }
  if (!Array.isArray(value.effect_estimates) || value.effect_estimates.length === 0) pushIssue(issues, `${path}.effect_estimates`, "must contain at least one effect estimate");
  if (!isNonEmptyString(value.follow_up_period)) pushIssue(issues, `${path}.follow_up_period`, "must be a non-empty string");
  if (!Array.isArray(value.bias_limitations)) pushIssue(issues, `${path}.bias_limitations`, "must be an array");
  issues.push(...validateApplicabilityArtifact(value.applicability_assessment, `${path}.applicability_assessment`).issues);
  if (!isNonEmptyString(value.operational_relevance) || !operationalRelevances.has(value.operational_relevance)) pushIssue(issues, `${path}.operational_relevance`, "must be a supported operational relevance");
  if (!isNonEmptyString(value.decision_readiness) || !decisionReadinessSet.has(value.decision_readiness)) pushIssue(issues, `${path}.decision_readiness`, "must be a supported decision readiness code");
  if (!isObject(value.evidence_grading)) {
    pushIssue(issues, `${path}.evidence_grading`, "must be an object");
  } else {
    if (!isNonEmptyString(value.evidence_grading.evidence_level) || !evidenceLevels.has(value.evidence_grading.evidence_level)) pushIssue(issues, `${path}.evidence_grading.evidence_level`, "must be a supported evidence level");
    if (!isNonEmptyString(value.evidence_grading.certainty) || !certainties.has(value.evidence_grading.certainty)) pushIssue(issues, `${path}.evidence_grading.certainty`, "must be a supported certainty");
  }
  issues.push(...validateProvenanceArtifact(value.provenance, `${path}.provenance`).issues);
  issues.push(...validateReviewMetadataArtifact(value.review, `${path}.review`).issues);
  return typedResult(issues, issues.length === 0 ? (value as unknown as StructuredEvidenceRecordArtifact) : undefined);
}

export function validateEvidenceObjectArtifact(value: unknown, path = "eo"): ValidationResult<EvidenceObjectArtifact> {
  const issues: ValidationIssue[] = [];
  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result(issues);
  }

  if (!isNonEmptyString(value.eo_id)) pushIssue(issues, `${path}.eo_id`, "must be a non-empty string");
  if (!isObject(value.trigger)) {
    pushIssue(issues, `${path}.trigger`, "must be an object");
  } else {
    if (!isNonEmptyString(value.trigger.event)) pushIssue(issues, `${path}.trigger.event`, "must be a non-empty string");
    if (!isNonEmptyString(value.trigger.clinical_function) || !clinicalFunctions.has(value.trigger.clinical_function)) pushIssue(issues, `${path}.trigger.clinical_function`, "must be a supported clinical function");
  }
  if (!isStringArray(value.conditions)) pushIssue(issues, `${path}.conditions`, "must be a string array");
  if (value.exclusions !== undefined && !isStringArray(value.exclusions)) pushIssue(issues, `${path}.exclusions`, "must be a string array");

  if (!isObject(value.decision)) {
    pushIssue(issues, `${path}.decision`, "must be an object");
  } else {
    if (!isNonEmptyString(value.decision.verb) || !decisionVerbs.has(value.decision.verb)) pushIssue(issues, `${path}.decision.verb`, "must be a supported decision verb");
    if (!isNonEmptyString(value.decision.effect_direction) || !effects.has(value.decision.effect_direction)) pushIssue(issues, `${path}.decision.effect_direction`, "must be a supported effect direction");
    if (!isNonEmptyString(value.decision.decision_readiness) || !decisionReadinessSet.has(value.decision.decision_readiness)) pushIssue(issues, `${path}.decision.decision_readiness`, "must be a supported decision readiness code");
  }

  if (!Array.isArray(value.actions) || value.actions.length === 0) {
    pushIssue(issues, `${path}.actions`, "must contain at least one action");
  } else {
    value.actions.forEach((action, index) => {
      if (!isObject(action)) {
        pushIssue(issues, `${path}.actions[${index}]`, "must be an object");
        return;
      }
      if (!isNonEmptyString(action.action_id)) pushIssue(issues, `${path}.actions[${index}].action_id`, "must be a non-empty string");
      if (!isNonEmptyString(action.intervention_class) || !interventionClasses.has(action.intervention_class)) pushIssue(issues, `${path}.actions[${index}].intervention_class`, "must be a supported intervention class");
      if (!isNonEmptyString(action.summary)) pushIssue(issues, `${path}.actions[${index}].summary`, "must be a non-empty string");
    });
  }
  if (!Array.isArray(value.expected_outcomes) || value.expected_outcomes.length === 0) pushIssue(issues, `${path}.expected_outcomes`, "must contain at least one expected outcome");
  if (!isStringArray(value.required_context)) pushIssue(issues, `${path}.required_context`, "must be a string array");
  issues.push(...validateOperationalContextArtifact(value.operational_constraints, `${path}.operational_constraints`).issues);

  if (!Array.isArray(value.evidence_support) || value.evidence_support.length === 0) {
    pushIssue(issues, `${path}.evidence_support`, "must contain at least one evidence support entry");
  } else {
    value.evidence_support.forEach((support, index) => {
      if (!isObject(support)) {
        pushIssue(issues, `${path}.evidence_support[${index}]`, "must be an object");
        return;
      }
      if (!isNonEmptyString(support.artifact_type) || !artifactTypes.has(support.artifact_type)) pushIssue(issues, `${path}.evidence_support[${index}].artifact_type`, "must be a supported artifact type");
      if (!isNonEmptyString(support.artifact_id)) pushIssue(issues, `${path}.evidence_support[${index}].artifact_id`, "must be a non-empty string");
    });
  }

  if (!isObject(value.confidence)) {
    pushIssue(issues, `${path}.confidence`, "must be an object");
  } else {
    if (!isNonEmptyString(value.confidence.certainty) || !certainties.has(value.confidence.certainty)) pushIssue(issues, `${path}.confidence.certainty`, "must be a supported certainty");
    if (value.confidence.uncertainty_sources !== undefined && (!Array.isArray(value.confidence.uncertainty_sources) || !value.confidence.uncertainty_sources.every((item) => isNonEmptyString(item) && uncertaintySet.has(item)))) {
      pushIssue(issues, `${path}.confidence.uncertainty_sources`, "must contain supported uncertainty codes");
    }
  }

  if (!Array.isArray(value.jurisdiction) || value.jurisdiction.length === 0 || !value.jurisdiction.every((item) => isNonEmptyString(item) && jurisdictions.has(item))) pushIssue(issues, `${path}.jurisdiction`, "must contain supported jurisdiction codes");
  if (!isNonEmptyString(value.review_status) || !reviewStatuses.has(value.review_status)) pushIssue(issues, `${path}.review_status`, "must be a supported review status");
  if (!isNonEmptyString(value.version)) pushIssue(issues, `${path}.version`, "must be a non-empty string");
  if (!isObject(value.audit_fields)) {
    pushIssue(issues, `${path}.audit_fields`, "must be an object");
  } else {
    if (!isIsoDateTime(value.audit_fields.created_at)) pushIssue(issues, `${path}.audit_fields.created_at`, "must be an ISO date-time");
    if (!isNonEmptyString(value.audit_fields.created_by)) pushIssue(issues, `${path}.audit_fields.created_by`, "must be a non-empty string");
    if (value.audit_fields.updated_at !== undefined && value.audit_fields.updated_at !== null && !isIsoDateTime(value.audit_fields.updated_at)) pushIssue(issues, `${path}.audit_fields.updated_at`, "must be an ISO date-time");
  }

  return typedResult(issues, issues.length === 0 ? (value as unknown as EvidenceObjectArtifact) : undefined);
}

export function validateConflictRuleArtifact(value: unknown, path = "conflict_rule"): ValidationResult<ConflictRuleArtifact> {
  const issues: ValidationIssue[] = [];
  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result(issues);
  }
  if (!isNonEmptyString(value.rule_id)) pushIssue(issues, `${path}.rule_id`, "must be a non-empty string");
  if (!isNonEmptyString(value.priority_code) || !conflictPriorities.has(value.priority_code)) pushIssue(issues, `${path}.priority_code`, "must be a supported conflict priority");
  if (!Number.isInteger(value.priority_order)) pushIssue(issues, `${path}.priority_order`, "must be an integer");
  if (!isNonEmptyString(value.description)) pushIssue(issues, `${path}.description`, "must be a non-empty string");
  if (!isNonEmptyString(value.resolution_action) || !conflictResolutionActions.has(value.resolution_action)) pushIssue(issues, `${path}.resolution_action`, "must be a supported conflict resolution action");
  return typedResult(issues, issues.length === 0 ? (value as unknown as ConflictRuleArtifact) : undefined);
}

const interchangeValidators: { [K in InterchangeArtifactKind]: (value: unknown, path?: string) => ValidationResult<InterchangeArtifactMap[K]> } = {
  "evidence-document": validateEvidenceDocumentArtifact,
  "evidence-source": validateEvidenceSourceArtifact,
  "evidence-classification": validateEvidenceClassificationArtifact,
  ser: validateStructuredEvidenceRecordArtifact,
  eo: validateEvidenceObjectArtifact,
  provenance: validateProvenanceArtifact,
  applicability: validateApplicabilityArtifact,
  "operational-context": validateOperationalContextArtifact,
  "conflict-rule": validateConflictRuleArtifact,
  "review-metadata": validateReviewMetadataArtifact,
};

export function validateArtifactPayload<K extends InterchangeArtifactKind>(kind: K, value: unknown): ValidationResult<InterchangeArtifactMap[K]> {
  return interchangeValidators[kind](value);
}
