import type { ProvenanceSourceType } from "../enums/provenance.ts";
import type { ProvenanceMetadata } from "../contracts/provenance.ts";

function ensureIsoTimestamp(value: string, label: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} must be a valid ISO timestamp`);
  }

  return new Date(parsed).toISOString();
}

export function createProvenanceMetadata(input: {
  sourceType: ProvenanceSourceType;
  sourceId: string;
  capturedAt?: string;
  location?: string;
  chainOfCustody?: string[];
  notes?: string[];
}): ProvenanceMetadata {
  return {
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    capturedAt: ensureIsoTimestamp(input.capturedAt ?? new Date().toISOString(), "capturedAt"),
    location: input.location,
    chainOfCustody: [...(input.chainOfCustody ?? [])],
    notes: [...(input.notes ?? [])],
  };
}
