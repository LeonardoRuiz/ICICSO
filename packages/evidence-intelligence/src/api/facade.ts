import { mapSerToEvidenceObject } from "../mappers/index.js";
import {
  validateArtifactPayload,
  validateEvidenceDocument,
  validateEvidenceDocumentArtifact,
  validateEvidenceObject,
  validateEvidenceObjectArtifact,
  validateStructuredEvidenceRecord,
  validateStructuredEvidenceRecordArtifact,
} from "../validators/index.js";
import type { EvidenceIntelligenceFacade } from "../contracts/integration.js";
import type { StructuredEvidenceRecord } from "../models/ser.js";
import {
  adaptEvidenceDocumentArtifact,
  adaptEvidenceObjectArtifact,
  adaptStructuredEvidenceRecordArtifact,
} from "../artifacts/adapters.js";

export const evidenceIntelligenceFacade: EvidenceIntelligenceFacade = {
  validateInterchangeArtifact(kind, input) {
    return validateArtifactPayload(kind, input);
  },
  validateInterchangeEvidenceDocument(input) {
    return validateEvidenceDocumentArtifact(input);
  },
  validateInterchangeStructuredEvidenceRecord(input) {
    return validateStructuredEvidenceRecordArtifact(input);
  },
  validateInterchangeEvidenceObject(input) {
    return validateEvidenceObjectArtifact(input);
  },
  adaptInterchangeEvidenceDocument(input) {
    return adaptEvidenceDocumentArtifact(input);
  },
  adaptInterchangeStructuredEvidenceRecord(input) {
    return adaptStructuredEvidenceRecordArtifact(input);
  },
  adaptInterchangeEvidenceObject(input) {
    return adaptEvidenceObjectArtifact(input);
  },
  validateEvidenceDocument(input) {
    const result = validateEvidenceDocument(input);
    return { ok: result.ok, issues: result.issues };
  },
  validateStructuredEvidenceRecord(input) {
    const result = validateStructuredEvidenceRecord(input);
    return { ok: result.ok, issues: result.issues };
  },
  validateEvidenceObject(input) {
    const result = validateEvidenceObject(input);
    return { ok: result.ok, issues: result.issues };
  },
  mapSerToEo(input: StructuredEvidenceRecord, options) {
    return mapSerToEvidenceObject(input, options);
  },
};
