import type { EventSeverity } from "../enums/events.ts";
import type { MaturityStatus } from "../enums/maturity.ts";
import type { CaseState } from "../enums/case-state.ts";
import type { VRN, case_id } from "../ids/types.ts";

export interface TimestampedEntity {
  createdAt: string;
  updatedAt?: string;
}

export interface RepoPathReference {
  path: string;
  role?: string;
  canonical?: boolean;
}

export interface RiskNote {
  title: string;
  severity: EventSeverity | "Structural";
  note: string;
}

export interface DependencyReference {
  id: string;
  reason: string;
  optional?: boolean;
}

export interface ModuleDescriptor {
  code: string;
  name: string;
  layer: string;
  path: string;
  status: MaturityStatus;
  maturity: MaturityStatus;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
}

export interface ArchitectureLayerRecord {
  id: string;
  name: string;
  description: string;
  stage: string;
  repoPaths: RepoPathReference[];
  inputs: string[];
  outputs: string[];
  dependencies: DependencyReference[];
  relatedObjects: string[];
  maturity: MaturityStatus;
  risks: RiskNote[];
  notes: string[];
}

export interface CaseRuntimeState {
  caseId: case_id;
  currentState: CaseState;
  allowedTransitions: CaseState[];
  maturity: MaturityStatus;
  audit: import("./audit.ts").AuditMetadata;
}

export interface CanonicalIdentifierSet {
  vrn: VRN;
  caseId: case_id;
}
