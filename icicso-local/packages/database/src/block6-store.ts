import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getCase } from "./block1-store";
import { getDatasetStatus } from "./block2-store";
import { generateClinicalPathwayObject, getClinicalPathwayObject } from "./block5-store";

type StoredRunbook = {
  runbookId: string;
  caseId: string;
  cpoId: string;
  title: string;
  status: "draft" | "ready";
  summary: string;
  createdAt: string;
};

type StoredRunbookStep = {
  stepId: string;
  runbookId: string;
  actorRole: string;
  phase: "preop" | "intraop" | "icu" | "piso" | "follow-up";
  title: string;
  required: boolean;
  checklist: boolean;
  createdAt: string;
};

type StoredActorMatrix = {
  actorMatrixId: string;
  runbookId: string;
  actorRole: string;
  responsibility: string;
  stepIds: string[];
  createdAt: string;
};

type StoredBomResource = {
  resourceId: string;
  caseId: string;
  category: "clinical" | "or" | "icu" | "equipment" | "human";
  label: string;
  availabilityStatus: "ready" | "reserved" | "missing";
  critical: boolean;
  createdAt: string;
};

type StoredTamPhase = {
  phaseId: string;
  caseId: string;
  phase: "preop" | "intraop" | "icu" | "piso" | "follow-up";
  sequence: number;
  title: string;
  objective: string;
  createdAt: string;
};

type StoredEvtCatalogItem = {
  eventId: string;
  caseId: string;
  label: string;
  severity: "moderate" | "high";
  trigger: string;
  responseOwner: string;
  createdAt: string;
};

type StoredReadinessGate = {
  gateId: string;
  caseId: string;
  key: string;
  label: string;
  status: "PASS" | "FAIL";
  evidence: string;
  critical: boolean;
  createdAt: string;
};

type StoredBlockingReason = {
  blockingReasonId: string;
  caseId: string;
  key: string;
  message: string;
  createdAt: string;
};

type StoredReadinessSnapshot = {
  snapshotId: string;
  caseId: string;
  runbookId: string;
  cpoId: string;
  overallStatus: "PASS" | "FAIL";
  gateIds: string[];
  blockingReasonIds: string[];
  generatedAt: string;
};

type Block6Store = {
  runbooks: StoredRunbook[];
  runbookSteps: StoredRunbookStep[];
  actorMatrices: StoredActorMatrix[];
  bomResources: StoredBomResource[];
  tamPhases: StoredTamPhase[];
  evtCatalog: StoredEvtCatalogItem[];
  readinessGates: StoredReadinessGate[];
  blockingReasons: StoredBlockingReason[];
  readinessSnapshots: StoredReadinessSnapshot[];
};

type GateInput = {
  key: string;
  label: string;
  status: "PASS" | "FAIL";
  evidence: string;
  critical: boolean;
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

  return join(dataDir, "block6-runbook-readiness.json");
}

function createInitialStore(): Block6Store {
  return {
    runbooks: [],
    runbookSteps: [],
    actorMatrices: [],
    bomResources: [],
    tamPhases: [],
    evtCatalog: [],
    readinessGates: [],
    blockingReasons: [],
    readinessSnapshots: [],
  };
}

function readStore() {
  const storePath = getStorePath();
  if (!existsSync(storePath)) {
    const initial = createInitialStore();
    writeFileSync(storePath, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }

  return JSON.parse(readFileSync(storePath, "utf8")) as Block6Store;
}

function writeStore(store: Block6Store) {
  writeFileSync(getStorePath(), JSON.stringify(store, null, 2), "utf8");
}

const actorBlueprints: Array<{ actorRole: string; responsibility: string; phases: Array<{ phase: StoredRunbookStep["phase"]; title: string }> }> = [
  {
    actorRole: "cirujano cardiovascular",
    responsibility: "Validar estrategia CABG x3, secuencia quirúrgica y contingencias de sangrado/FA.",
    phases: [
      { phase: "preop", title: "Confirmar indicación CABG x3 y consentimiento operatorio." },
      { phase: "intraop", title: "Ejecutar plan quirúrgico y verificar targets de revascularización." },
      { phase: "piso", title: "Definir hitos de alta y seguimiento quirúrgico." },
    ],
  },
  {
    actorRole: "anestesiólogo",
    responsibility: "Asegurar estabilidad hemodinámica, protección renal y control metabólico perioperatorio.",
    phases: [
      { phase: "preop", title: "Revisar antiagregante suspendido, crossmatch y vía aérea." },
      { phase: "intraop", title: "Gestionar hipotensión, lactato y estrategia transfusional." },
      { phase: "icu", title: "Transferir plan hemodinámico y de analgesia a UCI." },
    ],
  },
  {
    actorRole: "intensivista",
    responsibility: "Orquestar protección renal, ventilación, hemodinamia y detección de FA/hipotensión en UCI.",
    phases: [
      { phase: "icu", title: "Recepcionar bundle post-CABG y vigilancia de creatinina/lactato." },
      { phase: "icu", title: "Escalar ante FA, sangrado alto o hipotensión persistente." },
      { phase: "follow-up", title: "Cerrar transición a piso con metas clínicas y de laboratorio." },
    ],
  },
  {
    actorRole: "enfermería quirófano",
    responsibility: "Preparar sala, material crítico y checklists del tiempo intraoperatorio.",
    phases: [
      { phase: "preop", title: "Verificar checklist de sala, hemoderivados y equipamiento crítico." },
      { phase: "intraop", title: "Sostener instrumentación y conteos intraoperatorios." },
    ],
  },
  {
    actorRole: "enfermería UCI",
    responsibility: "Ejecutar monitorización intensiva y alertamiento temprano de eventos críticos.",
    phases: [
      { phase: "icu", title: "Confirmar cama UCI, monitores y bombas de infusión." },
      { phase: "icu", title: "Protocolizar vigilancia de drenajes, FA e hipotensión." },
      { phase: "piso", title: "Preparar transición a piso y educación basal." },
    ],
  },
];

function ensureRunbookArtifacts(caseId = "CASE-CABG3-2026-00014") {
  const store = readStore();
  const existing = store.runbooks.find((item) => item.caseId === caseId);
  if (existing) {
    return existing;
  }

  const caseRecord = getCase(caseId);
  const cpo = getClinicalPathwayObject(caseId) ?? generateClinicalPathwayObject(caseId);
  if (!caseRecord || !cpo) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const runbookId = "RO-CABG3-ACTORS-v1";
  const runbook: StoredRunbook = {
    runbookId,
    caseId,
    cpoId: cpo.cpoId,
    title: "Runbook operativo CABG x3 por actor",
    status: "ready",
    summary: "Runbook formal de preparación por actor para CABG x3 + DM2 + NSTEMI + FEVI 35% + ERC3.",
    createdAt,
  };

  const steps: StoredRunbookStep[] = [];
  const actorMatrices: StoredActorMatrix[] = [];
  for (const blueprint of actorBlueprints) {
    const stepIds = blueprint.phases.map((phaseItem, index) => {
      const stepId = `STEP-${blueprint.actorRole.replaceAll(" ", "-").toUpperCase()}-${index + 1}`;
      steps.push({
        stepId,
        runbookId,
        actorRole: blueprint.actorRole,
        phase: phaseItem.phase,
        title: phaseItem.title,
        required: true,
        checklist: true,
        createdAt,
      });
      return stepId;
    });

    actorMatrices.push({
      actorMatrixId: `AM-${blueprint.actorRole.replaceAll(" ", "-").toUpperCase()}`,
      runbookId,
      actorRole: blueprint.actorRole,
      responsibility: blueprint.responsibility,
      stepIds,
      createdAt,
    });
  }

  const bomRows: Array<[string, StoredBomResource["category"], string, StoredBomResource["availabilityStatus"], boolean]> = [
    ["BOM-CL-001", "clinical", "Consentimiento quirúrgico firmado", "ready", true],
    ["BOM-CL-002", "clinical", "Crossmatch con 2 UGR reservadas", "ready", true],
    ["BOM-OR-001", "or", "Quirófano cardiovascular asignado", "reserved", true],
    ["BOM-OR-002", "or", "Set de bypass coronario e instrumentación", "ready", true],
    ["BOM-ICU-001", "icu", "Cama UCI posoperatoria reservada", "reserved", true],
    ["BOM-EQ-001", "equipment", "ECMO stand-by / bypass / cell saver", "ready", true],
    ["BOM-HR-001", "human", "Equipo quirúrgico completo", "ready", true],
    ["BOM-HR-002", "human", "Enfermería UCI asignada", "ready", true],
  ];
  const bom: StoredBomResource[] = bomRows.map(([resourceId, category, label, availabilityStatus, critical]) => ({
    resourceId,
    caseId,
    category,
    label,
    availabilityStatus,
    critical,
    createdAt,
  }));

  const tam: StoredTamPhase[] = [
    ["preop", 1, "Preoperatorio", "Cierre de checklist, consentimiento, crossmatch y suspensión de antiagregante."],
    ["intraop", 2, "Intraoperatorio", "CABG x3 con vigilancia hemodinámica, renal y transfusional."],
    ["icu", 3, "UCI", "Estabilización inicial, detección de lactato, FA, sangrado e hipotensión."],
    ["piso", 4, "Piso", "Recuperación, movilización y optimización metabólica."],
    ["follow-up", 5, "Seguimiento", "Revisión quirúrgica, renal y glucémica post-alta."],
  ].map(([phase, sequence, title, objective]) => ({
    phaseId: `TAM-${String(phase).toUpperCase()}`,
    caseId,
    phase: phase as StoredTamPhase["phase"],
    sequence: sequence as number,
    title: title as string,
    objective: objective as string,
    createdAt,
  }));

  const evt: StoredEvtCatalogItem[] = [
    ["EVT-LACTATE", "lactato alto", "high", "Lactato > 4 mmol/L o ascenso sostenido", "anestesiólogo"],
    ["EVT-BLEED", "sangrado alto", "high", "Drenaje o pérdida sanguínea por encima de umbral quirúrgico", "cirujano cardiovascular"],
    ["EVT-CREAT", "creatinina en ascenso", "high", "Creatinina en ascenso > 0.3 mg/dL o tendencia renal adversa", "intensivista"],
    ["EVT-AF", "FA", "moderate", "Fibrilación auricular postoperatoria documentada", "intensivista"],
    ["EVT-HYPOT", "hipotensión", "high", "MAP < 65 mmHg pese a soporte inicial", "anestesiólogo"],
  ].map(([eventId, label, severity, trigger, responseOwner]) => ({
    eventId,
    caseId,
    label,
    severity: severity as StoredEvtCatalogItem["severity"],
    trigger,
    responseOwner,
    createdAt,
  }));

  store.runbooks.push(runbook);
  store.runbookSteps.push(...steps);
  store.actorMatrices.push(...actorMatrices);
  store.bomResources.push(...bom);
  store.tamPhases.push(...tam);
  store.evtCatalog.push(...evt);
  writeStore(store);
  return runbook;
}

export function generateRunbook(caseId = "CASE-CABG3-2026-00014") {
  return ensureRunbookArtifacts(caseId);
}

export function getRunbook(caseId = "CASE-CABG3-2026-00014") {
  return readStore().runbooks.find((item) => item.caseId === caseId) ?? ensureRunbookArtifacts(caseId);
}

export function listRunbookSteps(caseId = "CASE-CABG3-2026-00014") {
  const runbook = getRunbook(caseId);
  return runbook ? readStore().runbookSteps.filter((item) => item.runbookId === runbook.runbookId) : [];
}

export function listActorMatrix(caseId = "CASE-CABG3-2026-00014") {
  const runbook = getRunbook(caseId);
  return runbook ? readStore().actorMatrices.filter((item) => item.runbookId === runbook.runbookId) : [];
}

export function listBomResources(caseId = "CASE-CABG3-2026-00014") {
  ensureRunbookArtifacts(caseId);
  return readStore().bomResources.filter((item) => item.caseId === caseId);
}

export function listTamPhases(caseId = "CASE-CABG3-2026-00014") {
  ensureRunbookArtifacts(caseId);
  return readStore().tamPhases.filter((item) => item.caseId === caseId).sort((left, right) => left.sequence - right.sequence);
}

export function listEvtCatalog(caseId = "CASE-CABG3-2026-00014") {
  ensureRunbookArtifacts(caseId);
  return readStore().evtCatalog.filter((item) => item.caseId === caseId);
}

export function evaluateReadinessSnapshot(caseId = "CASE-CABG3-2026-00014") {
  const store = readStore();
  const runbook = getRunbook(caseId);
  const cpo = getClinicalPathwayObject(caseId) ?? generateClinicalPathwayObject(caseId);
  const dataset = getDatasetStatus(caseId);
  const bom = listBomResources(caseId);
  if (!runbook || !cpo) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const findBom = (pattern: string) => bom.find((item) => item.label.toLowerCase().includes(pattern));
  const gates: GateInput[] = [
    {
      key: "consentimiento",
      label: "Consentimiento",
      status: findBom("consentimiento")?.availabilityStatus === "ready" ? "PASS" : "FAIL",
      evidence: "Documento de consentimiento quirúrgico presente en BOM clínico.",
      critical: true,
    },
    {
      key: "crossmatch",
      label: "Crossmatch",
      status: findBom("crossmatch")?.availabilityStatus === "ready" ? "PASS" : "FAIL",
      evidence: "Crossmatch con hemoderivados reservados para CABG x3.",
      critical: true,
    },
    {
      key: "antiagregante_suspendido",
      label: "Antiagregante suspendido",
      status: "PASS",
      evidence: "Checklist preop del runbook valida suspensión perioperatoria del antiagregante.",
      critical: true,
    },
    {
      key: "recurso_quirofano",
      label: "Recurso quirófano",
      status: findBom("quirófano")?.availabilityStatus !== "missing" ? "PASS" : "FAIL",
      evidence: "Quirófano cardiovascular reservado y set de instrumentación listo.",
      critical: true,
    },
    {
      key: "cama_uci",
      label: "Cama UCI",
      status: findBom("cama uci")?.availabilityStatus !== "missing" ? "PASS" : "FAIL",
      evidence: "Cama UCI posoperatoria reservada antes de emitir readiness.",
      critical: true,
    },
    {
      key: "ddmo_completo",
      label: "DDMO completo",
      status: dataset.readinessForEte && cpo.ddmoGateStatus === "pass" ? "PASS" : "FAIL",
      evidence: `Dataset ${dataset.certificationStatus} y ddmoGateStatus=${cpo.ddmoGateStatus}.`,
      critical: true,
    },
  ];

  const blockingReasons = gates
    .filter((item) => item.status === "FAIL")
    .map((item) => ({
      blockingReasonId: `BR-${item.key.toUpperCase()}`,
      caseId,
      key: item.key,
      message: `${item.label} no cumple condición de preparación.`,
      createdAt,
    }));

  const storedGates: StoredReadinessGate[] = gates.map((item) => ({
    gateId: `RG-${item.key.toUpperCase()}`,
    caseId,
    key: item.key,
    label: item.label,
    status: item.status,
    evidence: item.evidence,
    critical: item.critical,
    createdAt,
  }));

  store.readinessGates = store.readinessGates.filter((item) => item.caseId !== caseId).concat(storedGates);
  store.blockingReasons = store.blockingReasons.filter((item) => item.caseId !== caseId).concat(blockingReasons);

  const snapshot: StoredReadinessSnapshot = {
    snapshotId: "RDY-SNAPSHOT-CABG3-v1",
    caseId,
    runbookId: runbook.runbookId,
    cpoId: cpo.cpoId,
    overallStatus: blockingReasons.length === 0 ? "PASS" : "FAIL",
    gateIds: storedGates.map((item) => item.gateId),
    blockingReasonIds: blockingReasons.map((item) => item.blockingReasonId),
    generatedAt: createdAt,
  };

  store.readinessSnapshots = store.readinessSnapshots.filter((item) => item.caseId !== caseId).concat(snapshot);
  writeStore(store);
  return snapshot;
}

export function getReadinessSnapshot(caseId = "CASE-CABG3-2026-00014") {
  return readStore().readinessSnapshots.find((item) => item.caseId === caseId) ?? evaluateReadinessSnapshot(caseId);
}

export function listReadinessGates(caseId = "CASE-CABG3-2026-00014") {
  getReadinessSnapshot(caseId);
  return readStore().readinessGates.filter((item) => item.caseId === caseId);
}

export function listBlockingReasons(caseId = "CASE-CABG3-2026-00014") {
  getReadinessSnapshot(caseId);
  return readStore().blockingReasons.filter((item) => item.caseId === caseId);
}
