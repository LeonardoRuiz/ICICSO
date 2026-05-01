export type ModuleStatus = "ready" | "building" | "queued" | "blocked";
export type LogKind = "boot" | "worker" | "artifact" | "error";
export type ArtifactKey =
  | "ser"
  | "eo"
  | "etp"
  | "gp"
  | "cpo"
  | "ro"
  | "bom"
  | "tam"
  | "esl";

export interface EmulatorPhase {
  id: string;
  code: string;
  title: string;
  description: string;
  status: "active" | "complete" | "planned";
  progress: number;
}

export interface EmulatorKpi {
  id: string;
  label: string;
  value: string;
  trend: string;
  tone: "good" | "neutral" | "warning" | "critical";
}

export interface EmulatorModule {
  id: string;
  name: string;
  owner: string;
  status: ModuleStatus;
  phase: string;
  progress: number;
  summary: string;
}

export interface EmulatorLogEntry {
  id: string;
  timestamp: string;
  kind: LogKind;
  service: string;
  message: string;
}

export interface PipelineStage {
  id: string;
  label: string;
  status: ModuleStatus;
  note: string;
}

export interface ActiveCaseField {
  label: string;
  value: string;
}

export interface ActiveMockCase {
  id: string;
  title: string;
  diagnosis: string;
  fields: ActiveCaseField[];
}

export interface ArtifactRecord {
  key: ArtifactKey;
  title: string;
  content: Record<string, unknown>;
}

export interface ProgressEmulatorSnapshot {
  generatedAt: string;
  phases: EmulatorPhase[];
  kpis: EmulatorKpi[];
  modules: EmulatorModule[];
  logs: EmulatorLogEntry[];
  pipeline: PipelineStage[];
  activeCase: ActiveMockCase;
  artifacts: ArtifactRecord[];
}
