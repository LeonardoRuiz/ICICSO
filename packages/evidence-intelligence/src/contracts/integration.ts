import type { EvidenceObject } from "../models/eo.js";
import type { EvidenceDocument } from "../models/evidence-document.js";
import type { StructuredEvidenceRecord } from "../models/ser.js";
import type {
  JurisdictionCode,
  TerminologyBinding,
  ValidationIssue,
} from "../models/common.js";
import type {
  EvidenceDocumentArtifact,
  EvidenceObjectArtifact,
  InterchangeArtifactKind,
  InterchangeArtifactMap,
  StructuredEvidenceRecordArtifact,
} from "../artifacts/types.js";

export interface ParsingIngestionInput {
  rawDocumentId: string;
  sourceUri?: string | null;
  sourceHash: string;
  language?: string | null;
  extractedText?: string | null;
  extractedMetadata?: Record<string, unknown>;
}

export interface ParsingIngestionOutput {
  document: EvidenceDocument;
  classification?: {
    evidenceType: string;
    evidenceLevel: string;
    clinicalFunctions: string[];
  };
  issues: ValidationIssue[];
}

export interface ParsingIngestionPort {
  classifyAndNormalize(input: ParsingIngestionInput): Promise<ParsingIngestionOutput>;
}

export interface TerminologyMappingRequest {
  artifactId: string;
  artifactKind: "evidence-document" | "ser" | "eo";
  clinicalTerms: string[];
  targetSystems: Array<"SNOMED_CT" | "LOINC" | "ICD10" | "ICD11" | "RxNorm" | "ATC" | "CPT" | "FHIR">;
}

export interface TerminologyMappingResult {
  artifactId: string;
  bindings: TerminologyBinding[];
  unresolvedTerms: string[];
}

export interface TerminologyMappingPort {
  mapTerms(request: TerminologyMappingRequest): Promise<TerminologyMappingResult>;
}

export interface RouteEngineInput {
  eo: EvidenceObject;
  routeContextId: string;
  targetJurisdiction: JurisdictionCode;
}

export interface RouteEngineProjection {
  routeRuleId: string;
  triggerEvent: string;
  preconditions: string[];
  actions: string[];
  requiredResources: string[];
}

export interface RouteEnginePort {
  projectEvidenceObject(input: RouteEngineInput): Promise<RouteEngineProjection>;
}

export interface OrchestrationEngineInput {
  eo: EvidenceObject;
  caseId: string;
  runtimeContext: Record<string, unknown>;
}

export interface OrchestrationDecisionEnvelope {
  eoId: string;
  executable: boolean;
  reasons: string[];
  deferredToHumanReview: boolean;
}

export interface OrchestrationEnginePort {
  evaluateEvidenceObject(input: OrchestrationEngineInput): Promise<OrchestrationDecisionEnvelope>;
}

export interface AuditTrailEvent {
  eventType:
    | "document-normalized"
    | "ser-created"
    | "eo-created"
    | "eo-review-required"
    | "eo-route-projected";
  artifactId: string;
  artifactKind: "evidence-document" | "ser" | "eo";
  timestamp: string;
  actor: string;
  payload: Record<string, unknown>;
}

export interface AuditTrailPort {
  append(event: AuditTrailEvent): Promise<void>;
}

export interface AdminReviewQueueItem {
  artifactId: string;
  artifactKind: "evidence-document" | "ser" | "eo";
  reviewState: "auto-approved" | "needs-human-review";
  summary: string;
  reasons: string[];
  conflicts: Array<{ code: string; severity: string; message: string }>;
}

export interface AdminReviewPort {
  enqueue(item: AdminReviewQueueItem): Promise<void>;
}

export interface EvidenceIntelligenceFacade {
  validateInterchangeArtifact<K extends InterchangeArtifactKind>(kind: K, input: unknown): { ok: boolean; issues: ValidationIssue[]; value?: InterchangeArtifactMap[K] };
  validateInterchangeEvidenceDocument(input: unknown): { ok: boolean; issues: ValidationIssue[]; value?: EvidenceDocumentArtifact };
  validateInterchangeStructuredEvidenceRecord(input: unknown): { ok: boolean; issues: ValidationIssue[]; value?: StructuredEvidenceRecordArtifact };
  validateInterchangeEvidenceObject(input: unknown): { ok: boolean; issues: ValidationIssue[]; value?: EvidenceObjectArtifact };
  adaptInterchangeEvidenceDocument(input: unknown): { ok: boolean; issues: ValidationIssue[]; value?: EvidenceDocument };
  adaptInterchangeStructuredEvidenceRecord(input: unknown): { ok: boolean; issues: ValidationIssue[]; value?: StructuredEvidenceRecord };
  adaptInterchangeEvidenceObject(input: unknown): { ok: boolean; issues: ValidationIssue[]; value?: EvidenceObject };
  validateEvidenceDocument(input: unknown): { ok: boolean; issues: ValidationIssue[] };
  validateStructuredEvidenceRecord(input: unknown): { ok: boolean; issues: ValidationIssue[] };
  validateEvidenceObject(input: unknown): { ok: boolean; issues: ValidationIssue[] };
  mapSerToEo(input: StructuredEvidenceRecord, options?: Record<string, unknown>): EvidenceObject;
}
