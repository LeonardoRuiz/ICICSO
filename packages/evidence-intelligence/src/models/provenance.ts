import type { ReviewStatus } from "./common.js";

export interface ChainOfCustodyRecord {
  step: string;
  actor: string;
  timestamp: string;
  hashSha256?: string | null;
  note?: string | null;
}

export interface LegalMetadata {
  licenseStatus: "licensed" | "open_access" | "institutional_use_only" | "restricted";
  attestationStatus: "pending" | "attested" | "rejected";
  reviewPolicy: string;
  retentionClass?: string | null;
}

export interface VersionMetadata {
  canonicalId: string;
  version: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  supersedes?: string[];
  status: ReviewStatus;
}

export interface ProvenanceRecord {
  sourceSystem: string;
  capturedAt: string;
  capturedBy: string;
  chainOfCustody: ChainOfCustodyRecord[];
  legal: LegalMetadata;
  versioning: VersionMetadata;
}
