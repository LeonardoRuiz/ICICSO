import type { ApplicabilityProfile } from "./applicability.js";
import type {
  CertaintyCode,
  ClinicalFunctionCode,
  EffectDirection,
  EvidenceStrength,
  EvidenceTypeCode,
  InterventionClassCode,
  OutcomeCode,
  TimeHorizonCode,
  UncertaintyCode,
} from "./common.js";
import type { OperationalContext } from "./operational-context.js";
import type { ProvenanceRecord } from "./provenance.js";

export interface StatementOutcome {
  outcomeCode: OutcomeCode;
  effectDirection: EffectDirection;
  note?: string | null;
}

export interface EvidenceStatement {
  statementId: string;
  clinicalFunction: ClinicalFunctionCode;
  interventionClass: InterventionClassCode;
  interventionLabel?: string | null;
  comparatorLabel?: string | null;
  effectDirection: EffectDirection;
  strength: EvidenceStrength;
  certainty: CertaintyCode;
  uncertainties?: UncertaintyCode[];
  decisionReadiness: ApplicabilityProfile["decisionReadiness"];
  timeHorizon: TimeHorizonCode;
  outcomes?: StatementOutcome[];
  conditions?: string[];
  exclusions?: string[];
  rationale?: string | null;
  operationalContext: OperationalContext;
}

export interface StructuredEvidenceRecord {
  serId: string;
  sourceDocumentId: string;
  title: string;
  evidenceType: EvidenceTypeCode;
  clinicalDomain: string;
  summary?: string | null;
  statements: EvidenceStatement[];
  applicability: ApplicabilityProfile;
  provenance: ProvenanceRecord;
}
