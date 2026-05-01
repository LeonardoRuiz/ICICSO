import type { ModuleDescriptor, VersionedArtifact } from "../../shared-kernel/index.ts";
import type { EvidenceObjectArtifact } from "../eo/index.ts";

export interface EvidenceLakeRecordPayload {
  sourceObjectId: string;
  sourceRecordId: string;
  sourceId: string;
  canonicalTitle: string;
  evidenceSynopsis: string;
  lakeStatus: "indexed";
  indexingKey: string;
  domainTags: string[];
  canonicalClaims: string[];
  evidenceHash: string;
  snapshotSummary: string;
}

export type EvidenceLakeRecordArtifact = VersionedArtifact<EvidenceLakeRecordPayload>;

export interface EvidenceLakeModuleContract {
  module: ModuleDescriptor;
  inputs: string[];
  outputs: string[];
  indexEvidenceObject(object: EvidenceObjectArtifact): Promise<EvidenceLakeRecordArtifact>;
  getRecord(sourceId: string): Promise<EvidenceLakeRecordArtifact | null>;
  listRecords(): Promise<EvidenceLakeRecordArtifact[]>;
}

export const EvidenceLakeModuleDescriptor: ModuleDescriptor = {
  code: "EL",
  name: "Evidence Lake Module",
  layer: "domain/evidence-lake",
  path: "packages/domain/evidence-lake",
  status: "complete",
  maturity: "defined",
  inputs: ["EvidenceObjectArtifact"],
  outputs: ["EvidenceLakeRecordArtifact"],
  dependencies: ["shared-kernel", "eo"],
};
