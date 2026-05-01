import type {
  ActorType,
  ModuleDescriptor,
  ProvenanceSourceType,
  VersionedArtifact,
} from "../../shared-kernel/index.ts";

export interface SourceDocumentInput {
  sourceId: string;
  title: string;
  documentType: string;
  issuingBody: string;
  publicationDate: string;
  sourceType: ProvenanceSourceType;
  sourceUrlReference?: string;
  location?: string;
  chainOfCustody?: string[];
  notes?: string[];
  content: string;
  createdBy: string;
  createdByType: ActorType;
}

export interface IngestedDocumentPayload {
  sourceId: string;
  canonicalTitle: string;
  documentType: string;
  issuingBody: string;
  publicationDate: string;
  publicationYear: number;
  sourceUrlReference?: string;
  content: string;
}

export type IngestedDocument = VersionedArtifact<IngestedDocumentPayload>;

export interface IngestModuleContract {
  module: ModuleDescriptor;
  inputs: string[];
  outputs: string[];
  ingestDocument(input: SourceDocumentInput): Promise<IngestedDocument>;
  getDocument(sourceId: string): Promise<IngestedDocument | null>;
  listDocuments(): Promise<IngestedDocument[]>;
}

export const IngestModuleDescriptor: ModuleDescriptor = {
  code: "ING",
  name: "Ingest Module",
  layer: "domain/ingest",
  path: "packages/domain/ingest",
  status: "implemented",
  maturity: "implemented",
  inputs: ["documentos fuente", "metadatos de procedencia"],
  outputs: ["IngestedDocument"],
  dependencies: ["shared-kernel"],
};
