import type { EvidenceObject } from "../models/eo.js";
import type { StructuredEvidenceRecord } from "../models/ser.js";
import { mapSerToEoWithInferences, type SerToEoEngineOptions } from "./ser-to-eo-engine.js";
import { validateStructuredEvidenceRecord } from "../validators/ser.validator.js";

export interface MapSerToEvidenceObjectOptions extends SerToEoEngineOptions {}

export function mapSerToEvidenceObject(
  ser: StructuredEvidenceRecord,
  options: MapSerToEvidenceObjectOptions = {},
): EvidenceObject {
  const validation = validateStructuredEvidenceRecord(ser);
  if (!validation.ok) {
    throw new Error(`SER is invalid: ${validation.issues.map((issue) => `${issue.path} ${issue.message}`).join("; ")}`);
  }
  return mapSerToEoWithInferences(ser, options);
}
