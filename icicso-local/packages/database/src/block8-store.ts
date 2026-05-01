import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getCase } from "./block1-store";
import { getReadinessSnapshot } from "./block6-store";
import {
  getCaseControl,
  listCaseStateTransitions,
  listLegalSnapshots,
  listOverrideRecords,
  listStateTransitionCaptures,
} from "./block7-store";

type StoredSystemicRiskSignal = {
  signalId: string;
  caseId: string;
  signalKey: string;
  label: string;
  severity: "moderate" | "high";
  status: "open" | "monitoring" | "resolved";
  thresholdId: string;
  windowId: string;
  metricValue: number;
  thresholdValue: number;
  unit: string;
  summary: string;
  sourceRefs: string[];
  createdAt: string;
};

type StoredRiskThreshold = {
  thresholdId: string;
  signalKey: string;
  label: string;
  comparator: ">=" | "<=";
  unit: string;
  thresholdValue: number;
  warningValue: number;
};

type StoredSignalWindow = {
  windowId: string;
  label: string;
  phase: string;
  startState: string;
  endState: string;
  horizonHours: number;
};

type StoredDataQualityRecord = {
  recordId: string;
  caseId: string;
  category: string;
  status: "pass" | "issue";
  finding: string;
  evidence: string;
  anomalyFlags: string[];
  createdAt: string;
};

type StoredTraceabilityScore = {
  scoreId: string;
  caseId: string;
  overallScore: number;
  stcCoverage: number;
  eslCoverage: number;
  overrideTransparency: number;
  documentationCompleteness: number;
  createdAt: string;
};

type StoredCqoiMetric = {
  metricId: string;
  caseId: string;
  code: string;
  label: string;
  value: number;
  unit: string;
  target: number;
  comparator: "<=" | ">=";
  status: "on_target" | "watch" | "out_of_range";
  createdAt: string;
};

type StoredOutcomeAggregate = {
  aggregateId: string;
  caseId: string;
  mortality30d: boolean;
  akiStage: number;
  postopFa: boolean;
  prolongedIcuStay: boolean;
  transfusionUnits: number;
  icuLengthHours: number;
  lengthOfStayDays: number;
  documentationClosureRate: number;
  createdAt: string;
};

type StoredQualityReport = {
  reportId: string;
  caseId: string;
  metricIds: string[];
  outcomeAggregateId: string;
  summary: string;
  createdAt: string;
};

type StoredDriftCandidate = {
  candidateId: string;
  caseId: string;
  domain: string;
  label: string;
  rationale: string;
  signalIds: string[];
  status: "candidate" | "confirmed" | "monitoring";
  createdAt: string;
};

type StoredDriftRecord = {
  driftId: string;
  caseId: string;
  driftType: string;
  candidateId: string;
  severity: "moderate" | "high";
  baseline: number;
  observed: number;
  delta: number;
  summary: string;
  createdAt: string;
};

type Block8Store = {
  thresholds: StoredRiskThreshold[];
  windows: StoredSignalWindow[];
  signals: StoredSystemicRiskSignal[];
  dataQualityRecords: StoredDataQualityRecord[];
  traceabilityScores: StoredTraceabilityScore[];
  cqoiMetrics: StoredCqoiMetric[];
  outcomeAggregates: StoredOutcomeAggregate[];
  qualityReports: StoredQualityReport[];
  driftCandidates: StoredDriftCandidate[];
  driftRecords: StoredDriftRecord[];
};

function findRoot() {
  let current = process.cwd();
  while (true) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return process.cwd();
    }
    current = parent;
  }
}

function getStorePath() {
  const root = findRoot();
  const dataDir = join(root, ".data");
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return join(dataDir, "block8-systemic-control.json");
}

function createInitialStore(): Block8Store {
  return {
    thresholds: [],
    windows: [],
    signals: [],
    dataQualityRecords: [],
    traceabilityScores: [],
    cqoiMetrics: [],
    outcomeAggregates: [],
    qualityReports: [],
    driftCandidates: [],
    driftRecords: [],
  };
}

function readStore() {
  const storePath = getStorePath();
  if (!existsSync(storePath)) {
    const initial = createInitialStore();
    writeFileSync(storePath, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  return JSON.parse(readFileSync(storePath, "utf8")) as Block8Store;
}

function writeStore(store: Block8Store) {
  writeFileSync(getStorePath(), JSON.stringify(store, null, 2), "utf8");
}

function upsertByCase<T extends { caseId: string }>(rows: T[], nextRow: T) {
  return rows.filter((item) => item.caseId !== nextRow.caseId).concat(nextRow);
}

function upsertListByCase<T extends { caseId: string }>(rows: T[], caseId: string, nextRows: T[]) {
  return rows.filter((item) => item.caseId !== caseId).concat(nextRows);
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function ensureBlock8Artifacts(caseId = "CASE-CABG3-2026-00014") {
  const store = readStore();
  const clinicalCase = getCase(caseId);
  const readiness = getReadinessSnapshot(caseId);
  const control = getCaseControl(caseId);
  const transitions = listCaseStateTransitions(caseId);
  const captures = listStateTransitionCaptures(caseId);
  const snapshots = listLegalSnapshots(caseId);
  const overrides = listOverrideRecords(caseId);

  if (!clinicalCase || !readiness) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const documentationCompleteness = control?.currentState === "CLOSED" ? 78 : 64;
  const stcCoverage = Math.min(100, captures.length * 16);
  const eslCoverage = Math.min(100, snapshots.length * 25);
  const overrideTransparency = overrides.every((item) => item.signedBy && item.justification) ? 100 : 40;
  const overallScore = round((stcCoverage + eslCoverage + overrideTransparency + documentationCompleteness) / 4);

  const thresholds: StoredRiskThreshold[] = [
    { thresholdId: "RTH-AKI-001", signalKey: "aki_risk", label: "Ascenso de creatinina perioperatoria", comparator: ">=", unit: "mg/dL", thresholdValue: 0.3, warningValue: 0.2 },
    { thresholdId: "RTH-FA-001", signalKey: "fa_signal", label: "FA postoperatoria", comparator: ">=", unit: "binary", thresholdValue: 1, warningValue: 1 },
    { thresholdId: "RTH-ICU-001", signalKey: "prolonged_icu_stay", label: "Estancia UCI prolongada", comparator: ">=", unit: "hours", thresholdValue: 48, warningValue: 36 },
    { thresholdId: "RTH-DOC-001", signalKey: "documentation_quality_issue", label: "Cierre documental incompleto", comparator: "<=", unit: "%", thresholdValue: 90, warningValue: 95 },
    { thresholdId: "RTH-PBM-001", signalKey: "pbm_drift", label: "Consumo transfusional sobre PBM", comparator: ">=", unit: "units", thresholdValue: 2, warningValue: 1 },
  ];

  const windows: StoredSignalWindow[] = [
    { windowId: "SW-PREOP-001", label: "Activación y salida a intra-op", phase: "preop", startState: "PRE-OP", endState: "INTRA-OP", horizonHours: 12 },
    { windowId: "SW-INTRAOP-001", label: "Salida de intra-op", phase: "intraop", startState: "INTRA-OP", endState: "ICU", horizonHours: 8 },
    { windowId: "SW-ICU-001", label: "Primeras 48h de UCI", phase: "icu", startState: "ICU", endState: "FLOOR", horizonHours: 48 },
    { windowId: "SW-CLOSE-001", label: "Cierre y revisión institucional", phase: "closure", startState: "FOLLOW-UP", endState: "CLOSED", horizonHours: 72 },
  ];

  const outcomeAggregate: StoredOutcomeAggregate = {
    aggregateId: "OUT-CABG3-0001",
    caseId,
    mortality30d: false,
    akiStage: 1,
    postopFa: true,
    prolongedIcuStay: true,
    transfusionUnits: 3,
    icuLengthHours: 68,
    lengthOfStayDays: 9,
    documentationClosureRate: documentationCompleteness,
    createdAt,
  };

  const signals: StoredSystemicRiskSignal[] = [
    {
      signalId: "SRS-AKI-001",
      caseId,
      signalKey: "aki_risk",
      label: "AKI risk signal",
      severity: "high",
      status: "open",
      thresholdId: "RTH-AKI-001",
      windowId: "SW-ICU-001",
      metricValue: 0.4,
      thresholdValue: 0.3,
      unit: "mg/dL",
      summary: "Creatinina perioperatoria con ascenso compatible con AKI stage 1 sobre ERC3.",
      sourceRefs: ["STC", "ESL", "EVT creatinina en ascenso", "outcomeAggregate.akiStage"],
      createdAt,
    },
    {
      signalId: "SRS-FA-001",
      caseId,
      signalKey: "fa_signal",
      label: "FA signal",
      severity: "moderate",
      status: "monitoring",
      thresholdId: "RTH-FA-001",
      windowId: "SW-ICU-001",
      metricValue: 1,
      thresholdValue: 1,
      unit: "binary",
      summary: "FA postoperatoria documentada durante la ventana de UCI temprana.",
      sourceRefs: ["STC", "EVT FA", "outcomeAggregate.postopFa"],
      createdAt,
    },
    {
      signalId: "SRS-ICU-001",
      caseId,
      signalKey: "prolonged_icu_stay",
      label: "Prolonged ICU stay",
      severity: "high",
      status: "open",
      thresholdId: "RTH-ICU-001",
      windowId: "SW-ICU-001",
      metricValue: 68,
      thresholdValue: 48,
      unit: "hours",
      summary: "Estancia en UCI por arriba del umbral institucional para CABG x3 con complicaciones vigiladas.",
      sourceRefs: ["STC", "ESL icu_entry", "outcomeAggregate.icuLengthHours"],
      createdAt,
    },
    {
      signalId: "SRS-DOC-001",
      caseId,
      signalKey: "documentation_quality_issue",
      label: "Documentation quality issue",
      severity: "moderate",
      status: "open",
      thresholdId: "RTH-DOC-001",
      windowId: "SW-CLOSE-001",
      metricValue: documentationCompleteness,
      thresholdValue: 90,
      unit: "%",
      summary: "La trazabilidad es alta, pero el cierre documental institucional sigue incompleto para auditoría dura.",
      sourceRefs: ["STC", "ESL case_closure", "traceabilityScore.documentationCompleteness"],
      createdAt,
    },
    {
      signalId: "SRS-PBM-001",
      caseId,
      signalKey: "pbm_drift",
      label: "Transfusion / PBM drift",
      severity: "high",
      status: "open",
      thresholdId: "RTH-PBM-001",
      windowId: "SW-INTRAOP-001",
      metricValue: 3,
      thresholdValue: 2,
      unit: "units",
      summary: "Consumo transfusional por arriba del target PBM para el perfil demo CABG x3.",
      sourceRefs: ["override.logistical", "ESL intraop_exit", "outcomeAggregate.transfusionUnits"],
      createdAt,
    },
  ];

  const traceabilityScore: StoredTraceabilityScore = {
    scoreId: "TS-CABG3-0001",
    caseId,
    overallScore,
    stcCoverage,
    eslCoverage,
    overrideTransparency,
    documentationCompleteness,
    createdAt,
  };

  const dataQualityRecords: StoredDataQualityRecord[] = [
    {
      recordId: "DTQ-TRACE-001",
      caseId,
      category: "traceability",
      status: "pass",
      finding: "Cobertura sólida de STC y ESL para la ruta demo.",
      evidence: `${transitions.length} transiciones, ${captures.length} STC y ${snapshots.length} ESL disponibles para agregación.`,
      anomalyFlags: [],
      createdAt,
    },
    {
      recordId: "DTQ-DOC-001",
      caseId,
      category: "documentation",
      status: "issue",
      finding: "Persisten huecos de cierre documental y completitud de outcome package.",
      evidence: `documentationCompleteness=${documentationCompleteness}% con ${overrides.length} override(s) y outcome agregado derivado.`,
      anomalyFlags: ["documentation_gap", "outcome_fixture_derived"],
      createdAt,
    },
  ];

  const metrics: StoredCqoiMetric[] = [
    { metricId: "CQOI-AKI-001", caseId, code: "AKI_STAGE", label: "AKI stage postoperatorio", value: 1, unit: "stage", target: 0, comparator: "<=", status: "out_of_range", createdAt },
    { metricId: "CQOI-FA-001", caseId, code: "POSTOP_FA", label: "FA postoperatoria", value: 1, unit: "binary", target: 0, comparator: "<=", status: "out_of_range", createdAt },
    { metricId: "CQOI-ICU-001", caseId, code: "ICU_STAY_HOURS", label: "Estancia UCI", value: 68, unit: "hours", target: 48, comparator: "<=", status: "out_of_range", createdAt },
    { metricId: "CQOI-PBM-001", caseId, code: "TRANSFUSION_UNITS", label: "Unidades transfundidas", value: 3, unit: "units", target: 2, comparator: "<=", status: "out_of_range", createdAt },
    { metricId: "CQOI-DOC-001", caseId, code: "DOC_CLOSURE_RATE", label: "Cierre documental", value: documentationCompleteness, unit: "%", target: 90, comparator: ">=", status: "watch", createdAt },
  ];

  const driftCandidates: StoredDriftCandidate[] = [
    {
      candidateId: "DRC-PBM-001",
      caseId,
      domain: "perioperative_blood_management",
      label: "PBM drift candidate",
      rationale: "El consumo de hemoderivados excede el baseline operativo del GP/CPO para CABG x3.",
      signalIds: ["SRS-PBM-001"],
      status: "confirmed",
      createdAt,
    },
    {
      candidateId: "DRC-DOC-001",
      caseId,
      domain: "documentation_quality",
      label: "Documentation drift candidate",
      rationale: "La trazabilidad clínica es robusta, pero el cierre documental institucional queda por debajo del target.",
      signalIds: ["SRS-DOC-001"],
      status: "candidate",
      createdAt,
    },
  ];

  const driftRecords: StoredDriftRecord[] = [
    {
      driftId: "DRIFT-PBM-001",
      caseId,
      driftType: "transfusion_drift",
      candidateId: "DRC-PBM-001",
      severity: "high",
      baseline: 2,
      observed: 3,
      delta: 1,
      summary: "El caso demo excede en una unidad el baseline PBM definido para CABG x3.",
      createdAt,
    },
    {
      driftId: "DRIFT-DOC-001",
      caseId,
      driftType: "documentation_drift",
      candidateId: "DRC-DOC-001",
      severity: "moderate",
      baseline: 90,
      observed: documentationCompleteness,
      delta: round(documentationCompleteness - 90),
      summary: "El cierre documental queda por debajo del estándar institucional esperado para CQOI.",
      createdAt,
    },
  ];

  const qualityReport: StoredQualityReport = {
    reportId: "QREP-CABG3-0001",
    caseId,
    metricIds: metrics.map((item) => item.metricId),
    outcomeAggregateId: outcomeAggregate.aggregateId,
    summary: "Reporte CQOI derivado del caso demo cerrado. Resume AKI, FA, estancia UCI, PBM y cierre documental sin write-back sobre la ejecución clínica.",
    createdAt,
  };

  store.thresholds = thresholds;
  store.windows = windows;
  store.signals = upsertListByCase(store.signals, caseId, signals);
  store.dataQualityRecords = upsertListByCase(store.dataQualityRecords, caseId, dataQualityRecords);
  store.traceabilityScores = upsertByCase(store.traceabilityScores, traceabilityScore);
  store.cqoiMetrics = upsertListByCase(store.cqoiMetrics, caseId, metrics);
  store.outcomeAggregates = upsertByCase(store.outcomeAggregates, outcomeAggregate);
  store.qualityReports = upsertByCase(store.qualityReports, qualityReport);
  store.driftCandidates = upsertListByCase(store.driftCandidates, caseId, driftCandidates);
  store.driftRecords = upsertListByCase(store.driftRecords, caseId, driftRecords);
  writeStore(store);

  return {
    thresholds,
    windows,
    signals,
    dataQualityRecords,
    traceabilityScore,
    metrics,
    outcomeAggregate,
    qualityReport,
    driftCandidates,
    driftRecords,
  };
}

export function listRiskThresholds() {
  return ensureBlock8Artifacts()?.thresholds ?? readStore().thresholds;
}

export function listSignalWindows() {
  return ensureBlock8Artifacts()?.windows ?? readStore().windows;
}

export function listSystemicRiskSignals(caseId = "CASE-CABG3-2026-00014") {
  return ensureBlock8Artifacts(caseId)?.signals ?? readStore().signals.filter((item) => item.caseId === caseId);
}

export function listDataQualityRecords(caseId = "CASE-CABG3-2026-00014") {
  return ensureBlock8Artifacts(caseId)?.dataQualityRecords ?? readStore().dataQualityRecords.filter((item) => item.caseId === caseId);
}

export function getTraceabilityScore(caseId = "CASE-CABG3-2026-00014") {
  return ensureBlock8Artifacts(caseId)?.traceabilityScore ?? readStore().traceabilityScores.find((item) => item.caseId === caseId) ?? null;
}

export function listCqoiMetrics(caseId = "CASE-CABG3-2026-00014") {
  return ensureBlock8Artifacts(caseId)?.metrics ?? readStore().cqoiMetrics.filter((item) => item.caseId === caseId);
}

export function getOutcomeAggregate(caseId = "CASE-CABG3-2026-00014") {
  return ensureBlock8Artifacts(caseId)?.outcomeAggregate ?? readStore().outcomeAggregates.find((item) => item.caseId === caseId) ?? null;
}

export function getQualityReport(caseId = "CASE-CABG3-2026-00014") {
  return ensureBlock8Artifacts(caseId)?.qualityReport ?? readStore().qualityReports.find((item) => item.caseId === caseId) ?? null;
}

export function listDriftCandidates(caseId = "CASE-CABG3-2026-00014") {
  return ensureBlock8Artifacts(caseId)?.driftCandidates ?? readStore().driftCandidates.filter((item) => item.caseId === caseId);
}

export function listDriftRecords(caseId = "CASE-CABG3-2026-00014") {
  return ensureBlock8Artifacts(caseId)?.driftRecords ?? readStore().driftRecords.filter((item) => item.caseId === caseId);
}
