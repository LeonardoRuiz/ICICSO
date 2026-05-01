import { z } from "zod";

export const eventSeveritySchema = z.enum(["INFO", "WARNING", "CRITICAL"]);
export const caseStateSchema = z.enum(["Draft", "PreOperative", "Closed"]);

export const eventTriggerSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  severity: eventSeveritySchema,
  active: z.boolean(),
});

export const icicsoCaseSchema = z.object({
  caseId: z.string().min(1),
  episodeId: z.string().min(1),
  label: z.string().min(1),
  displayCase: z.string().min(1),
  ilc: z.object({
    id: z.string().min(1),
    valid: z.boolean(),
    version: z.string().min(1),
  }),
  consent: z.object({
    id: z.string().min(1),
    active: z.boolean(),
    timestamp: z.string().min(1),
  }),
  ddmo: z.object({
    present: z.boolean(),
    required: z.array(z.string().min(1)),
    presentFields: z.array(z.string().min(1)),
  }),
  dataCompletenessIndex: z.number().min(0).max(1),
  terminology: z.object({
    icd10: z.array(z.string().min(1)),
    snomedCt: z.array(z.string().min(1)),
    loinc: z.array(z.string().min(1)),
    ucum: z.array(z.string().min(1)),
    rxNormAtc: z.array(z.string().min(1)),
    udiGs1: z.array(z.string().min(1)),
  }),
  evidence: z.object({
    ser: z.array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        active: z.boolean(),
      }),
    ),
    eo: z.array(
      z.object({
        id: z.string().min(1),
        sourceSerId: z.string().min(1),
        conclusion: z.string().min(1),
      }),
    ),
    icdr: z.array(
      z.object({
        id: z.string().min(1),
        maxSeverity: z.number().int().min(0).max(4),
        conflicts: z.number().int().min(0),
        summary: z.string().min(1),
      }),
    ),
  }),
  vrn: z.object({
    id: z.string().min(1),
    active: z.boolean(),
    version: z.string().min(1),
  }),
  evt: z.object({
    active: z.array(eventTriggerSchema),
  }),
  stc: z.object({
    available: z.boolean(),
    transitionId: z.string().min(1),
    actor: z.string().min(1),
  }),
  caseState: caseStateSchema,
});

export type IcicsoCase = z.infer<typeof icicsoCaseSchema>;
export type EventTrigger = z.infer<typeof eventTriggerSchema>;
export type CaseState = z.infer<typeof caseStateSchema>;

export type LayerId =
  | "IGL"
  | "TG"
  | "EL"
  | "ETE"
  | "EUL"
  | "GHL"
  | "KBOL"
  | "RO"
  | "BOM"
  | "TAM"
  | "EVT"
  | "RDY-G"
  | "LCCB"
  | "CCCL"
  | "SRM"
  | "CQOI"
  | "CML";

export interface LayerResult {
  id: LayerId;
  name: string;
  status: string;
  message: string;
  blockers: string[];
  metrics: Record<string, unknown>;
  artifacts: Record<string, unknown>;
  critical: boolean;
}

export interface PipelineContext {
  caseData: IcicsoCase;
  layers: LayerResult[];
  artifacts: {
    evidenceLake?: EvidenceLakeArtifact;
    ete?: EteArtifact;
    eul?: EulArtifact;
    ghl?: GhlArtifact;
    kbol?: KbolArtifact;
    runbook?: RunbookArtifact;
    bom?: BomArtifact;
    tam?: TamArtifact;
    evt?: EvtArtifact;
    rdyg?: RdygArtifact;
    lccb?: LccbArtifact;
    cccl?: CcclArtifact;
    srm?: SrmArtifact;
    cqoi?: CqoiArtifact;
    cml?: CmlArtifact;
  };
}

export interface EvidenceLakeArtifact {
  status: "ACTIVE";
  serCount: number;
  evidenceObjectCount: number;
  icdrCount: number;
  appendOnly: true;
  decides: false;
}

export interface EteArtifact {
  ecs: number;
  uci: number;
  mac: {
    applicable: number;
    conditional: number;
    indeterminate: number;
  };
  ddmoGate: "PASS" | "BLOCKED";
}

export interface EulArtifact {
  level: "LEVEL I" | "LEVEL II" | "LEVEL III" | "LEVEL IV";
  levelNumber: 1 | 2 | 3 | 4;
  rationale: string;
}

export interface GhlArtifact {
  guidelinePackageId: "GP-REVASC-CABG-v3";
  active: boolean;
  mergedGuidelines: false;
  decidesTreatment: false;
}

export interface KbolArtifact {
  cpoId: string;
  status: "CPO ACTIVE";
}

export interface RunbookArtifact {
  id: string;
  actors: string[];
}

export interface BomArtifact {
  status: "READY";
  validated: string[];
}

export interface TamArtifact {
  status: "READY";
  phases: number[];
}

export interface EvtArtifact {
  criticalActive: number;
  triggers: EventTrigger[];
}

export interface RdygArtifact {
  gateId: "GATE-0";
  decision: "GO" | "BLOCKED";
}

export interface LccbArtifact {
  status: "OPERATIONALLY FEASIBLE";
  modifiesClinicalIndication: false;
}

export interface CcclArtifact {
  status: "PRE-OPERATIVE ACTIVE" | "BLOCKED";
  from: CaseState;
  to: CaseState;
  stcId: string;
  esl: EvidenceSnapshotLegal | null;
}

export interface EvidenceSnapshotLegal {
  id: string;
  caseId: string;
  episodeId: string;
  generatedAt: string;
  evidenceLakeStatus: string;
  ecs: number;
  uci: number;
  eul: string;
  guidelinePackageId: string;
  transitionId: string;
}

export interface SrmArtifact {
  status: "ADVISORY REPORT GENERATED";
  blocksSurgery: false;
}

export interface CqoiArtifact {
  status: "PENDING CASE CLOSURE" | "READY";
  modifiesActiveCase: false;
}

export interface CmlArtifact {
  status: "BLOCKED UNTIL CLOSED" | "READY";
  lcrIndividualAccess: false;
}

export interface EngineRun {
  runId: string;
  generatedAt: string;
  ok: boolean;
  case: {
    caseId: string;
    episodeId: string;
    label: string;
    displayCase: string;
  };
  layers: LayerResult[];
  artifacts: PipelineContext["artifacts"];
  summary: string;
}
