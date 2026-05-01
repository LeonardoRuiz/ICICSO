import type { ModuleDescriptor, VersionedArtifact } from "../../shared-kernel/index.ts";
import type { IngestedDocument } from "../ingest/index.ts";

export interface SourceEvidenceRecordPayload {
  sourceDocumentId: string;
  sourceId: string;
  canonicalTitle: string;
  shortTitle: string;
  documentType: string;
  issuingBody: string;
  publicationDate: string;
  publicationYear: number;
  sourceUrlReference?: string;
  sourceHash: string;
  lifecycleStatus: "validated";
}

export type SourceEvidenceRecordArtifact = VersionedArtifact<SourceEvidenceRecordPayload>;

export interface SourceEvidenceRecordModuleContract {
  module: ModuleDescriptor;
  inputs: string[];
  outputs: string[];
  registerFromIngest(document: IngestedDocument): Promise<SourceEvidenceRecordArtifact>;
  getRecord(sourceId: string): Promise<SourceEvidenceRecordArtifact | null>;
  listRecords(): Promise<SourceEvidenceRecordArtifact[]>;
}

export const SourceEvidenceRecordModuleDescriptor: ModuleDescriptor = {
  code: "SER",
  name: "Source Evidence Record Module",
  layer: "domain/ser",
  path: "packages/domain/ser",
  status: "implemented",
  maturity: "implemented",
  inputs: ["IngestedDocument"],
  outputs: ["SourceEvidenceRecordArtifact"],
  dependencies: ["shared-kernel", "ingest", "@icicso/database"],
};
