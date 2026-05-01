import type { ValidationIssue } from "../models/common.js";
import type { EvidenceDocument } from "../models/evidence-document.js";
import {
  CERTAINTY_CODES,
  CURRENCY_STATUS_CODES,
  EFFECT_DIRECTION_CODES,
  EVIDENCE_HIERARCHY_CODES,
  EVIDENCE_STRENGTH_CODES,
  EVIDENCE_TYPE_CODES,
} from "../models/common.js";
import { validateApplicability } from "./applicability.validator.js";
import { validateProvenance } from "./provenance.validator.js";
import { enumSet, isIsoDate, isIsoDateTime, isNonEmptyString, isObject, pushIssue, result } from "./_shared.js";

const evidenceTypes = enumSet(EVIDENCE_TYPE_CODES);
const hierarchies = enumSet(EVIDENCE_HIERARCHY_CODES);
const directions = enumSet(EFFECT_DIRECTION_CODES);
const strengths = enumSet(EVIDENCE_STRENGTH_CODES);
const certainties = enumSet(CERTAINTY_CODES);
const currencies = enumSet(CURRENCY_STATUS_CODES);

export function validateEvidenceDocument(value: unknown, path = "document") {
  const issues: ValidationIssue[] = [];

  if (!isObject(value)) {
    pushIssue(issues, path, "must be an object");
    return result<EvidenceDocument>(issues);
  }

  if (!isNonEmptyString(value.documentId)) pushIssue(issues, `${path}.documentId`, "must be a non-empty string");
  if (!isNonEmptyString(value.title)) pushIssue(issues, `${path}.title`, "must be a non-empty string");
  if (!isNonEmptyString(value.clinicalDomain)) pushIssue(issues, `${path}.clinicalDomain`, "must be a non-empty string");
  if (!isNonEmptyString(value.evidenceType) || !evidenceTypes.has(value.evidenceType)) pushIssue(issues, `${path}.evidenceType`, "must be a supported evidence type");
  if (!isNonEmptyString(value.evidenceHierarchy) || !hierarchies.has(value.evidenceHierarchy)) pushIssue(issues, `${path}.evidenceHierarchy`, "must be a supported hierarchy code");
  if (!isNonEmptyString(value.effectDirection) || !directions.has(value.effectDirection)) pushIssue(issues, `${path}.effectDirection`, "must be a supported effect direction");
  if (!isNonEmptyString(value.strength) || !strengths.has(value.strength)) pushIssue(issues, `${path}.strength`, "must be a supported strength code");
  if (!isNonEmptyString(value.certainty) || !certainties.has(value.certainty)) pushIssue(issues, `${path}.certainty`, "must be a supported certainty code");
  if (!isIsoDate(value.publicationDate)) pushIssue(issues, `${path}.publicationDate`, "must be an ISO date");

  if (!isObject(value.publication)) {
    pushIssue(issues, `${path}.publication`, "must be an object");
  } else {
    if (!isNonEmptyString(value.publication.publisher)) pushIssue(issues, `${path}.publication.publisher`, "must be a non-empty string");
    if (!isNonEmptyString(value.publication.citation)) pushIssue(issues, `${path}.publication.citation`, "must be a non-empty string");
  }

  if (!isObject(value.recency)) {
    pushIssue(issues, `${path}.recency`, "must be an object");
  } else {
    if (typeof value.recency.publicationYear !== "number") pushIssue(issues, `${path}.recency.publicationYear`, "must be a number");
    if (!isNonEmptyString(value.recency.currencyStatus) || !currencies.has(value.recency.currencyStatus)) {
      pushIssue(issues, `${path}.recency.currencyStatus`, "must be a supported currency status");
    }
    if (value.recency.lastReappraisedAt !== undefined && value.recency.lastReappraisedAt !== null && !isIsoDateTime(value.recency.lastReappraisedAt)) {
      pushIssue(issues, `${path}.recency.lastReappraisedAt`, "must be an ISO date-time");
    }
  }

  issues.push(...validateApplicability(value.applicability, `${path}.applicability`).issues);
  issues.push(...validateProvenance(value.provenance, `${path}.provenance`).issues);

  return result<EvidenceDocument>(issues, issues.length === 0 ? (value as unknown as EvidenceDocument) : undefined);
}
