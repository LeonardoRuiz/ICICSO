import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getCase } from "./block1-store";
import { getReadinessSnapshot } from "./block6-store";

type CaseState = "PRE-OP" | "INTRA-OP" | "ICU" | "FLOOR" | "FOLLOW-UP" | "CLOSED";
type OverrideType = "clinical" | "logistical" | "emergent";

type StoredCaseControl = {
  caseControlId: string;
  caseId: string;
  currentState: CaseState;
  activated: boolean;
  readinessSnapshotId: string | null;
  currentLegalSnapshotId: string | null;
  createdAt: string;
  updatedAt: string;
};

type StoredCaseStateTransition = {
  transitionId: string;
  caseId: string;
  fromState: CaseState | null;
  toState: CaseState;
  reason: string;
  overrideId: string | null;
  createdAt: string;
};

type StoredStateTransitionCapture = {
  captureId: string;
  transitionId: string;
  caseId: string;
  actorRole: string;
  summary: string;
  createdAt: string;
};

type StoredLegalSnapshot = {
  legalSnapshotId: string;
  caseId: string;
  state: CaseState;
  snapshotType: "activation_preop" | "intraop_exit" | "icu_entry" | "case_closure";
  summary: string;
  createdAt: string;
};

type StoredOverrideRecord = {
  overrideId: string;
  caseId: string;
  overrideType: OverrideType;
  justification: string;
  signedBy: string;
  status: "active" | "consumed";
  createdAt: string;
};

type Block7Store = {
  caseControls: StoredCaseControl[];
  transitions: StoredCaseStateTransition[];
  captures: StoredStateTransitionCapture[];
  legalSnapshots: StoredLegalSnapshot[];
  overrides: StoredOverrideRecord[];
  logs: Array<{ caseId: string; event: string; createdAt: string }>;
};

const transitionsMap: Record<CaseState, CaseState[]> = {
  "PRE-OP": ["INTRA-OP"],
  "INTRA-OP": ["ICU"],
  "ICU": ["FLOOR"],
  "FLOOR": ["FOLLOW-UP"],
  "FOLLOW-UP": ["CLOSED"],
  "CLOSED": [],
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
  return join(dataDir, "block7-case-control.json");
}

function createInitialStore(): Block7Store {
  return {
    caseControls: [],
    transitions: [],
    captures: [],
    legalSnapshots: [],
    overrides: [],
    logs: [],
  };
}

function readStore() {
  const storePath = getStorePath();
  if (!existsSync(storePath)) {
    const initial = createInitialStore();
    writeFileSync(storePath, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  return JSON.parse(readFileSync(storePath, "utf8")) as Block7Store;
}

function writeStore(store: Block7Store) {
  writeFileSync(getStorePath(), JSON.stringify(store, null, 2), "utf8");
}

function addLog(store: Block7Store, caseId: string, event: string, createdAt: string) {
  store.logs.push({ caseId, event, createdAt });
}

function getOrCreateCaseControl(store: Block7Store, caseId: string) {
  const existing = store.caseControls.find((item) => item.caseId === caseId);
  if (existing) {
    return existing;
  }
  const createdAt = new Date().toISOString();
  const control: StoredCaseControl = {
    caseControlId: `CCCL-${caseId}`,
    caseId,
    currentState: "PRE-OP",
    activated: false,
    readinessSnapshotId: null,
    currentLegalSnapshotId: null,
    createdAt,
    updatedAt: createdAt,
  };
  store.caseControls.push(control);
  return control;
}

function createLegalSnapshot(
  store: Block7Store,
  caseId: string,
  state: CaseState,
  snapshotType: StoredLegalSnapshot["snapshotType"],
  summary: string,
) {
  const createdAt = new Date().toISOString();
  const snapshot: StoredLegalSnapshot = {
    legalSnapshotId: `ESL-${snapshotType.toUpperCase()}-${caseId}-${store.legalSnapshots.length + 1}`,
    caseId,
    state,
    snapshotType,
    summary,
    createdAt,
  };
  store.legalSnapshots.push(snapshot);
  addLog(store, caseId, "legal.snapshot.created", createdAt);
  return snapshot;
}

export function getCaseControl(caseId = "CASE-CABG3-2026-00014") {
  const store = readStore();
  return store.caseControls.find((item) => item.caseId === caseId) ?? null;
}

export function activateCase(caseId = "CASE-CABG3-2026-00014", actorRole = "case-controller") {
  const store = readStore();
  const clinicalCase = getCase(caseId);
  const readiness = getReadinessSnapshot(caseId);
  if (!clinicalCase) {
    return { error: "Caso no encontrado" as const };
  }
  if (!readiness || readiness.overallStatus !== "PASS") {
    return { error: "Readiness no está en PASS" as const };
  }

  const control = getOrCreateCaseControl(store, caseId);
  if (control.activated) {
    return { caseControl: control, transition: null, capture: null, legalSnapshot: null };
  }

  const createdAt = new Date().toISOString();
  control.activated = true;
  control.currentState = "PRE-OP";
  control.readinessSnapshotId = readiness.snapshotId;
  control.updatedAt = createdAt;

  const transition: StoredCaseStateTransition = {
    transitionId: `TR-${caseId}-ACTIVATE`,
    caseId,
    fromState: null,
    toState: "PRE-OP",
    reason: "Activación formal del caso desde readiness PASS.",
    overrideId: null,
    createdAt,
  };
  const capture: StoredStateTransitionCapture = {
    captureId: `STC-${transition.transitionId}`,
    transitionId: transition.transitionId,
    caseId,
    actorRole,
    summary: "Caso activado en PRE-OP con gates de readiness cumplidos.",
    createdAt,
  };
  const legalSnapshot = createLegalSnapshot(
    store,
    caseId,
    "PRE-OP",
    "activation_preop",
    "Snapshot legal de activación preoperatoria con readiness PASS y CPO vigente.",
  );
  control.currentLegalSnapshotId = legalSnapshot.legalSnapshotId;

  store.transitions.push(transition);
  store.captures.push(capture);
  addLog(store, caseId, "case.activated", createdAt);
  writeStore(store);
  return { caseControl: control, transition, capture, legalSnapshot };
}

export function createOverrideRecord(
  caseId = "CASE-CABG3-2026-00014",
  overrideType: OverrideType,
  justification: string,
  signedBy: string,
) {
  const store = readStore();
  const clinicalCase = getCase(caseId);
  if (!clinicalCase) {
    return null;
  }
  const createdAt = new Date().toISOString();
  const override: StoredOverrideRecord = {
    overrideId: `OVR-${caseId}-${store.overrides.length + 1}`,
    caseId,
    overrideType,
    justification,
    signedBy,
    status: "active",
    createdAt,
  };
  store.overrides.push(override);
  addLog(store, caseId, "override.created", createdAt);
  writeStore(store);
  return override;
}

export function transitionCaseState(
  caseId = "CASE-CABG3-2026-00014",
  toState: CaseState,
  reason: string,
  actorRole: string,
  overrideId?: string | null,
) {
  const store = readStore();
  const control = getOrCreateCaseControl(store, caseId);
  if (!control.activated) {
    return { error: "Caso no activado" as const };
  }

  const fromState = control.currentState;
  const allowed = transitionsMap[fromState].includes(toState);
  let consumedOverride: StoredOverrideRecord | null = null;

  if (!allowed) {
    if (!overrideId) {
      return { error: "Transición inválida sin override" as const };
    }
    const found = store.overrides.find((item) => item.overrideId === overrideId && item.caseId === caseId);
    if (!found || found.status !== "active" || !found.signedBy || !found.justification) {
      return { error: "Override inválido o no activo" as const };
    }
    consumedOverride = found;
    found.status = "consumed";
  }

  const createdAt = new Date().toISOString();
  const transition: StoredCaseStateTransition = {
    transitionId: `TR-${caseId}-${store.transitions.length + 1}`,
    caseId,
    fromState,
    toState,
    reason,
    overrideId: consumedOverride?.overrideId ?? null,
    createdAt,
  };
  const capture: StoredStateTransitionCapture = {
    captureId: `STC-${transition.transitionId}`,
    transitionId: transition.transitionId,
    caseId,
    actorRole,
    summary: `Transición ${fromState} -> ${toState}. ${reason}`,
    createdAt,
  };

  control.currentState = toState;
  control.updatedAt = createdAt;
  store.transitions.push(transition);
  store.captures.push(capture);

  let legalSnapshot: StoredLegalSnapshot | null = null;
  if (fromState === "INTRA-OP" && toState === "ICU") {
    legalSnapshot = createLegalSnapshot(
      store,
      caseId,
      "INTRA-OP",
      "intraop_exit",
      "Snapshot legal de salida intraoperatoria con cierre de tiempo quirúrgico.",
    );
  }
  if (toState === "ICU") {
    legalSnapshot = createLegalSnapshot(
      store,
      caseId,
      "ICU",
      "icu_entry",
      "Snapshot legal de ingreso a UCI con transferencia clínica y hemodinámica.",
    );
  }
  if (toState === "CLOSED") {
    legalSnapshot = createLegalSnapshot(
      store,
      caseId,
      "CLOSED",
      "case_closure",
      "Snapshot legal de cierre formal del caso con trazabilidad completa.",
    );
  }
  if (legalSnapshot) {
    control.currentLegalSnapshotId = legalSnapshot.legalSnapshotId;
  }

  addLog(store, caseId, "case.transitioned", createdAt);
  writeStore(store);
  return { caseControl: control, transition, capture, legalSnapshot, override: consumedOverride };
}

export function listCaseStateTransitions(caseId = "CASE-CABG3-2026-00014") {
  return readStore().transitions.filter((item) => item.caseId === caseId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listStateTransitionCaptures(caseId = "CASE-CABG3-2026-00014") {
  return readStore().captures.filter((item) => item.caseId === caseId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listLegalSnapshots(caseId = "CASE-CABG3-2026-00014") {
  return readStore().legalSnapshots.filter((item) => item.caseId === caseId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listOverrideRecords(caseId = "CASE-CABG3-2026-00014") {
  return readStore().overrides.filter((item) => item.caseId === caseId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function listCaseControlLogs(caseId = "CASE-CABG3-2026-00014") {
  return readStore().logs.filter((item) => item.caseId === caseId).map((item) => item.event);
}
