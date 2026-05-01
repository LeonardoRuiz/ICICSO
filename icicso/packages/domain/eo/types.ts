import type { EvidenceStatus, ModuleDescriptor, VersionedArtifact } from "../../shared-kernel/index.ts";
import type { SourceEvidenceRecordArtifact } from "../ser/index.ts";

export interface EvidenceObjectPayload {
  sourceRecordId: string;
  sourceId: string;
  canonicalTitle: string;
  evidenceSynopsis: string;
  documentType: string;
  issuingBody: string;
  publicationDate: string;
  publicationYear: number;
  sourceUrlReference?: string;
  sourceHash: string;
  evidenceStatus: EvidenceStatus;
  canonicalClaims: string[];
  domainTags: string[];
}

export type EvidenceObjectArtifact = VersionedArtifact<EvidenceObjectPayload>;

export interface EvidenceObjectModuleContract {
  module: ModuleDescriptor;
  inputs: string[];
  outputs: string[];
  createFromRecord(record: SourceEvidenceRecordArtifact): Promise<EvidenceObjectArtifact>;
  getObject(sourceId: string): Promise<EvidenceObjectArtifact | null>;
  listObjects(): Promise<EvidenceObjectArtifact[]>;
}

export const EvidenceObjectModuleDescriptor: ModuleDescriptor = {
  code: "EO",
  name: "Evidence Object Module",
  layer: "domain/eo",
  path: "packages/domain/eo",
  status: "implemented",
  maturity: "implemented",
  inputs: ["SourceEvidenceRecordArtifact"],
  outputs: ["EvidenceObjectArtifact"],
  dependencies: ["shared-kernel", "ser", "@icicso/database"],
};
