import type { ApplicabilityProfile } from "./applicability.js";
import type {
  CurrencyStatus,
  EvidenceDecayCode,
  EffectDirection,
  EvidenceHierarchyCode,
  EvidenceStrength,
  EvidenceTypeCode,
  CertaintyCode,
  TerminologyBinding,
} from "./common.js";
import type { ProvenanceRecord } from "./provenance.js";

export interface PublicationMetadata {
  publisher: string;
  journal?: string | null;
  citation: string;
  doi?: string | null;
  sourceUri?: string | null;
}

export interface RecencyMetadata {
  publicationYear: number;
  lastReappraisedAt?: string | null;
  currencyStatus: CurrencyStatus;
  decayClass?: EvidenceDecayCode;
}

export interface EvidenceDocument {
  documentId: string;
  title: string;
  evidenceType: EvidenceTypeCode;
  clinicalDomain: string;
  publicationDate: string;
  publication: PublicationMetadata;
  evidenceHierarchy: EvidenceHierarchyCode;
  effectDirection: EffectDirection;
  strength: EvidenceStrength;
  certainty: CertaintyCode;
  recency: RecencyMetadata;
  applicability: ApplicabilityProfile;
  provenance: ProvenanceRecord;
  interoperability?: TerminologyBinding[];
}
