export interface EvidenceIntelligenceModuleDescriptor {
  module: "evidence-intelligence";
  version: string;
  responsibilities: string[];
  upstreamDependencies: string[];
  downstreamConsumers: string[];
}

export const evidenceIntelligenceDescriptor: EvidenceIntelligenceModuleDescriptor = {
  module: "evidence-intelligence",
  version: "1.0.0",
  responsibilities: [
    "normalize evidence domain artifacts",
    "separate interchange and runtime evidence contracts",
    "validate evidence contracts",
    "map SER to EO",
    "expose ontology and schemas",
  ],
  upstreamDependencies: [
    "document ingestion/parsing",
    "clinical terminology services",
  ],
  downstreamConsumers: [
    "route engine",
    "orchestration engine",
    "audit trail",
    "admin review ui",
  ],
};
