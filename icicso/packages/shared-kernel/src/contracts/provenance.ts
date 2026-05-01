import type { ProvenanceSourceType } from "../enums/provenance.ts";

export interface ProvenanceMetadata {
  sourceType: ProvenanceSourceType;
  sourceId: string;
  capturedAt: string;
  location?: string;
  chainOfCustody: string[];
  notes: string[];
}
