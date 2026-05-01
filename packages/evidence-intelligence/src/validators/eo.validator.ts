import type { ValidationIssue } from "../models/common.js";
import type { EvidenceObject } from "../models/eo.js";
import {
  CERTAINTY_CODES,
  EFFECT_DIRECTION_CODES,
  EVIDENCE_STRENGTH_CODES,
  INTERVENTION_CLASS_CODES,
  JURISDICTION_CODES,
  OUTCOME_CODES,
  REVIEW_STATUS_CODES,
  TIME_HORIZON_CODES,
} from "../models/common.js";
import { validateOperationalContext } from "./operational-context.validator.js";
import { validateProvenance } from "./provenance.validator.js";
import { enumSet, isNonEmptyString, isObject, pushIssue, result } from "./_shared.js";

const strengths = enumSet(EVIDENCE_STRENGTH_CODES);
const certainties = enumSet(CERTAINTY_CODES);
const directions = enumSet(EFFECT_DIRECTION_CODES);
const interventions = enumSet(INTERVENTION_CLASS_CODES);
const outcomes = enumSet(OUTCOME_CODES);
const horizons = enumSet(TIME_HORIZON_CODES);
const jurisdictions = enumSet(JURISDICTION_CODES);
const statuses = enumSet(REVIEW_STATUS_CODES);

export function validateEvidenceObject(value: unknown, path = "eo") {
  const issues: ValidationIssue[] = [];

  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result<EvidenceObject>(issues);
  }

  if (!isNonEmptyString(value.eoId)) pushIssue(issues, `${path}.eoId`, "must be a non-empty string");
  if (!isNonEmptyString(value.sourceDocumentId)) pushIssue(issues, `${path}.sourceDocumentId`, "must be a non-empty string");
  if (!isNonEmptyString(value.sourceSerId)) pushIssue(issues, `${path}.sourceSerId`, "must be a non-empty string");
  if (!isObject(value.trigger) || !isNonEmptyString(value.trigger.event) || !isNonEmptyString(value.trigger.clinicalFunction)) {
    pushIssue(issues, `${path}.trigger`, "must contain event and clinicalFunction");
  }
  if (!Array.isArray(value.conditions)) pushIssue(issues, `${path}.conditions`, "must be an array");
  if (!isObject(value.decision) || !isNonEmptyString(value.decision.verb) || !isNonEmptyString(value.decision.effectDirection) || !directions.has(value.decision.effectDirection)) {
    pushIssue(issues, `${path}.decision`, "must contain a supported decision");
  }
  if (!isObject(value.action) || !isNonEmptyString(value.action.interventionClass) || !interventions.has(value.action.interventionClass) || !isNonEmptyString(value.action.description)) {
    pushIssue(issues, `${path}.action`, "must contain a supported intervention and description");
  }
  if (!Array.isArray(value.expectedOutcomes)) {
    pushIssue(issues, `${path}.expectedOutcomes`, "must be an array");
  } else if (value.expectedOutcomes.some((entry) => !isObject(entry) || !isNonEmptyString(entry.outcomeCode) || !outcomes.has(entry.outcomeCode))) {
    pushIssue(issues, `${path}.expectedOutcomes`, "contains unsupported outcome codes");
  }
  if (!isObject(value.confidence) || !isNonEmptyString(value.confidence.strength) || !strengths.has(value.confidence.strength) || !isNonEmptyString(value.confidence.certainty) || !certainties.has(value.confidence.certainty)) {
    pushIssue(issues, `${path}.confidence`, "must contain supported strength and certainty");
  }
  if (!isNonEmptyString(value.jurisdiction) || !jurisdictions.has(value.jurisdiction)) {
    pushIssue(issues, `${path}.jurisdiction`, "must be a supported jurisdiction");
  }
  if (!isObject(value.temporalContext) || !isNonEmptyString(value.temporalContext.timeHorizon) || !horizons.has(value.temporalContext.timeHorizon)) {
    pushIssue(issues, `${path}.temporalContext.timeHorizon`, "must be a supported time horizon");
  }
  if (!isObject(value.reviewMetadata) || !isNonEmptyString(value.reviewMetadata.owner) || !isNonEmptyString(value.reviewMetadata.status) || !statuses.has(value.reviewMetadata.status)) {
    pushIssue(issues, `${path}.reviewMetadata`, "must contain owner and supported status");
  }

  issues.push(...validateOperationalContext(value.operationalConstraints, `${path}.operationalConstraints`).issues);
  issues.push(...validateProvenance(value.provenance, `${path}.provenance`).issues);

  return result<EvidenceObject>(issues, issues.length === 0 ? (value as unknown as EvidenceObject) : undefined);
}
