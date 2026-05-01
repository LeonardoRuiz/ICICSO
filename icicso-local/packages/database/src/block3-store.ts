import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

type EvidenceStatus = "active" | "under_review" | "deprecated";

export type StoredSourceEvidenceRecord = {
  serId: string;
  title: string;
  authority: string;
  year: number;
  domain: string;
  status: EvidenceStatus;
  vrn: string;
  hash: string;
  lineageParentSerId: string | null;
  createdAt: string;
};

export type StoredEvidenceObject = {
  eoId: string;
  serId: string;
  title: string;
  domain: string;
  status: EvidenceStatus;
  strength: string;
  payload: Record<string, unknown>;
  vrn: string;
  hash: string;
  lineageParentEoId: string | null;
  createdAt: string;
};

export type StoredIcdrRecord = {
  icdrId: string;
  topic: string;
  status: EvidenceStatus;
  sourceA: string;
  sourceB: string;
  divergence: string;
  clinicalContext: string;
  resolutionNote: string;
  vrn: string;
  hash: string;
  createdAt: string;
};

export type StoredEvidenceSnapshot = {
  snapshotId: string;
  caseId: string;
  title: string;
  status: EvidenceStatus;
  serIds: string[];
  eoIds: string[];
  icdrIds: string[];
  summary: string;
  vrn: string;
  hash: string;
  scientificDate: string;
  createdAt: string;
};

export type StoredTranslationEvaluation = {
  eteId: string;
  caseId: string;
  ecs: number;
  uci: number;
  macClassification: "applicable" | "conditional" | "not_applicable" | "indeterminate";
  ddmoGateStatus: "pass" | "blocked";
  conflictCount: number;
  status: "pass" | "review" | "blocked";
  hash: string;
  createdAt: string;
};

export type StoredEpistemicUncertaintyLayer = {
  eulId: string;
  caseId: string;
  eteId: string;
  level: "I" | "II" | "III" | "IV";
  validationPolicy: "standard-validation" | "contextual-validation" | "reinforced-validation" | "blocked-pending-governance";
  activationBlocked: boolean;
  requiredSignatures: string[];
  escalationThreshold: number;
  rationale: string;
  hash: string;
  createdAt: string;
};

type EvidenceLakeStore = {
  sourceEvidenceRecords: StoredSourceEvidenceRecord[];
  evidenceObjects: StoredEvidenceObject[];
  icdrRecords: StoredIcdrRecord[];
  evidenceSnapshots: StoredEvidenceSnapshot[];
  translationEvaluations?: StoredTranslationEvaluation[];
  epistemicUncertaintyLayers?: StoredEpistemicUncertaintyLayer[];
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

  return join(dataDir, "block3-evidence-lake.json");
}

function computeHash(payload: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function createInitialStore(): EvidenceLakeStore {
  const createdAt = "2026-03-29T12:00:00.000Z";
  const serSeedRows: Array<[string, string, string, number, string, string]> = [
    ["SER-REVASC-ACC-2021", "2021 ACC/AHA/SCAI Coronary Artery Revascularization Guideline", "ACC/AHA/SCAI", 2021, "revascularization", "VRN-SER-0001"],
    ["SER-REVASC-ESC-2018", "2018 ESC/EACTS Myocardial Revascularization Guideline", "ESC/EACTS", 2018, "revascularization", "VRN-SER-0002"],
    ["SER-DM-ADA-2024", "2024 ADA Standards of Care", "ADA", 2024, "diabetes", "VRN-SER-0003"],
    ["SER-AKI-KDIGO-2012", "2012 KDIGO Acute Kidney Injury Guideline", "KDIGO", 2012, "aki", "VRN-SER-0004"],
    ["SER-CKD-KDIGO-2023", "2023 KDIGO CKD Guideline", "KDIGO", 2023, "ckd", "VRN-SER-0005"],
    ["SER-ERAS-CARDIAC-2022", "2022 ERAS Cardiac Surgery Recommendations", "ERAS Society", 2022, "perioperative", "VRN-SER-0006"],
    ["SER-PBM-STS-2022", "2022 STS Patient Blood Management Guidance", "STS", 2022, "blood-management", "VRN-SER-0007"],
  ];
  const serSeeds: StoredSourceEvidenceRecord[] = serSeedRows.map(([serId, title, authority, year, domain, vrn]) => ({
    serId,
    title,
    authority,
    year,
    domain,
    status: "active" as const,
    vrn,
    hash: computeHash({ serId, title, authority, year, domain, vrn }),
    lineageParentSerId: null,
    createdAt,
  }));

  const eoSeedRows: Array<[string, string, string, string, string, Record<string, unknown>, string]> = [
    ["EO-REVASC-002", "SER-REVASC-ACC-2021", "CABG favorecida en enfermedad multivaso compleja", "revascularization", "I-A", { syntaxBand: "high", recommendation: "CABG preferred" }, "VRN-EO-0001"],
    ["EO-REVASC-007", "SER-REVASC-ESC-2018", "Heart team para revascularización en DM2 + multivaso", "revascularization", "I-A", { syntaxBand: "intermediate", recommendation: "Heart Team review" }, "VRN-EO-0002"],
    ["EO-ACS-003", "SER-REVASC-ACC-2021", "NSTEMI con anatomía compleja y estrategia de revascularización", "acs", "I-B", { condition: "NSTEMI", target: "multivessel CAD" }, "VRN-EO-0003"],
    ["EO-AKI-001", "SER-AKI-KDIGO-2012", "Prevención de AKI perioperatoria", "aki", "I-B", { risk: "cardiac surgery + CKD3" }, "VRN-EO-0004"],
    ["EO-ERAS-003", "SER-ERAS-CARDIAC-2022", "Bundle ERAS en cirugía cardiaca", "perioperative", "IIa-B", { pathway: "ERAS Cardiac" }, "VRN-EO-0005"],
    ["EO-PBM-003", "SER-PBM-STS-2022", "Manejo conservador de transfusión y anemia", "blood-management", "IIa-B", { focus: "PBM CABG" }, "VRN-EO-0006"],
    ["EO-CKD-002", "SER-CKD-KDIGO-2023", "Protección renal en ERC estadio 3", "ckd", "I-B", { ckdStage: "3" }, "VRN-EO-0007"],
    ["EO-REVASC-003", "SER-DM-ADA-2024", "DM2 como modulador de estrategia de revascularización", "diabetes", "I-B", { comorbidity: "DM2" }, "VRN-EO-0008"],
  ];
  const eoSeeds: StoredEvidenceObject[] = eoSeedRows.map(([eoId, serId, title, domain, strength, payload, vrn]) => ({
    eoId,
    serId,
    title,
    domain,
    status: "active" as const,
    strength,
    payload,
    vrn,
    hash: computeHash({ eoId, serId, title, domain, strength, payload, vrn }),
    lineageParentEoId: null,
    createdAt,
  }));

  const icdrSeed: StoredIcdrRecord = {
    icdrId: "ICDR-REVASC-DM2-SYNTAX-001",
    topic: "DM2 + SYNTAX intermedio",
    status: "under_review",
    sourceA: "SER-REVASC-ACC-2021",
    sourceB: "SER-REVASC-ESC-2018",
    divergence:
      "ACC 2021 tiende a favorecer una lectura más fuerte hacia CABG en multivaso con complejidad creciente; ESC 2018 deja más espacio a discusión Heart Team en SYNTAX intermedio.",
    clinicalContext: "NSTEMI + CAD multivaso + DM2 + SYNTAX intermedio en caso CABG x3.",
    resolutionNote:
      "Mantener Heart Team obligatorio y exponer la divergencia en snapshot científico hasta consolidar CPO.",
    vrn: "VRN-ICDR-0001",
    hash: computeHash({ topic: "DM2 + SYNTAX intermedio", sourceA: "SER-REVASC-ACC-2021", sourceB: "SER-REVASC-ESC-2018" }),
    createdAt,
  };

  const snapshot: StoredEvidenceSnapshot = {
    snapshotId: "SNAPSHOT-CABG3-EL-0001",
    caseId: "CASE-CABG3-2026-00014",
    title: "Snapshot científico CABG x3",
    status: "active",
    serIds: serSeeds.map((item) => item.serId),
    eoIds: eoSeeds.map((item) => item.eoId),
    icdrIds: [icdrSeed.icdrId],
    summary:
      "Snapshot mínimo de revascularización, DM2, ERC3, AKI, ERAS y PBM para soportar el caso demo CABG x3 con divergencia leve ACC/ESC en SYNTAX intermedio.",
    vrn: "VRN-SNAPSHOT-0001",
    hash: computeHash({ caseId: "CASE-CABG3-2026-00014", title: "Snapshot científico CABG x3", serCount: serSeeds.length, eoCount: eoSeeds.length }),
    scientificDate: "2026-03-29",
    createdAt,
  };

  const translationEvaluation = buildTranslationEvaluation("CASE-CABG3-2026-00014", serSeeds, eoSeeds, [icdrSeed], createdAt);
  const eul = buildEulRecord("CASE-CABG3-2026-00014", translationEvaluation, createdAt);

  return {
    sourceEvidenceRecords: serSeeds,
    evidenceObjects: eoSeeds,
    icdrRecords: [icdrSeed],
    evidenceSnapshots: [snapshot],
    translationEvaluations: [translationEvaluation],
    epistemicUncertaintyLayers: [eul],
  };
}

function readStore() {
  const storePath = getStorePath();
  if (!existsSync(storePath)) {
    const initial = createInitialStore();
    writeFileSync(storePath, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }

  return JSON.parse(readFileSync(storePath, "utf8")) as EvidenceLakeStore;
}

function writeStore(store: EvidenceLakeStore) {
  writeFileSync(getStorePath(), JSON.stringify(store, null, 2), "utf8");
}

function upsertByCase<T extends { caseId: string }>(rows: T[] = [], nextRow: T): T[] {
  return rows.filter((item) => item.caseId !== nextRow.caseId).concat(nextRow);
}

function buildTranslationEvaluation(
  caseId: string,
  serRows: StoredSourceEvidenceRecord[],
  eoRows: StoredEvidenceObject[],
  icdrRows: StoredIcdrRecord[],
  createdAt: string,
): StoredTranslationEvaluation {
  const conflictCount = icdrRows.filter((item) => item.status !== "deprecated").length;
  const agedSerCount = serRows.filter((item) => item.year <= 2018).length;
  const ecs = Number(Math.max(60, Math.min(95, 91 - conflictCount * 4 - agedSerCount * 1.5)).toFixed(1));
  const uci = Number(Math.min(0.95, 0.12 + conflictCount * 0.12 + agedSerCount * 0.03).toFixed(2));
  const macClassification = conflictCount > 0 ? "conditional" : "applicable";

  return {
    eteId: `ETE-${caseId.replace(/[^A-Z0-9]/gi, "")}-0001`.slice(0, 64),
    caseId,
    ecs,
    uci,
    macClassification,
    ddmoGateStatus: "pass",
    conflictCount,
    status: conflictCount > 0 ? "review" : "pass",
    hash: computeHash({ caseId, ecs, uci, macClassification, conflictCount, eoCount: eoRows.length }),
    createdAt,
  };
}

function buildEulRecord(
  caseId: string,
  translationEvaluation: StoredTranslationEvaluation,
  createdAt: string,
): StoredEpistemicUncertaintyLayer {
  const level: StoredEpistemicUncertaintyLayer["level"] = translationEvaluation.ddmoGateStatus === "blocked"
    ? "IV"
    : translationEvaluation.conflictCount > 0 || translationEvaluation.macClassification === "conditional"
      ? "III"
      : translationEvaluation.ecs >= 80 && translationEvaluation.uci <= 0.25
        ? "II"
        : "III";
  const validationPolicy: StoredEpistemicUncertaintyLayer["validationPolicy"] = level === "IV"
    ? "blocked-pending-governance"
    : level === "III"
      ? "reinforced-validation"
      : level === "II"
        ? "contextual-validation"
        : "standard-validation";
  const requiredSignatures = level === "IV"
    ? ["evidence-owner", "specialist-reviewer", "governance-board"]
    : level === "III"
      ? ["evidence-owner", "specialist-reviewer", "governance-duty-officer"]
      : ["evidence-owner", "local-clinical-reviewer"];
  const eulId = `EUL-${caseId.replace(/[^A-Z0-9]/gi, "")}-0001`.slice(0, 64);

  return {
    eulId,
    caseId,
    eteId: translationEvaluation.eteId,
    level,
    validationPolicy,
    activationBlocked: level === "IV",
    requiredSignatures,
    escalationThreshold: level === "III" ? 0.6 : level === "II" ? 0.4 : level === "IV" ? 0 : 0.25,
    rationale: level === "III"
      ? "ICDR abierto mantiene fricción epistemológica reforzada; DDMO está en pass y no bloquea activación gobernada."
      : "EUL calculada desde ECS, UCI, MAC, DDMO e ICDR para el snapshot científico activo.",
    hash: computeHash({ eulId, level, validationPolicy, eteId: translationEvaluation.eteId }),
    createdAt,
  };
}

function ensureTranslationArtifacts(caseId = "CASE-CABG3-2026-00014") {
  const store = readStore();
  store.translationEvaluations ??= [];
  store.epistemicUncertaintyLayers ??= [];
  const snapshot = store.evidenceSnapshots.find((item) => item.caseId === caseId) ?? null;
  if (!snapshot) {
    writeStore(store);
    return null;
  }

  const existingEvaluation = store.translationEvaluations.find((item) => item.caseId === caseId);
  const existingEul = store.epistemicUncertaintyLayers.find((item) => item.caseId === caseId);
  if (existingEvaluation && existingEul) {
    return { translationEvaluation: existingEvaluation, eul: existingEul };
  }

  const createdAt = new Date().toISOString();
  const serRows = store.sourceEvidenceRecords.filter((item) => snapshot.serIds.includes(item.serId));
  const eoRows = store.evidenceObjects.filter((item) => snapshot.eoIds.includes(item.eoId));
  const icdrRows = store.icdrRecords.filter((item) => snapshot.icdrIds.includes(item.icdrId));
  const translationEvaluation = buildTranslationEvaluation(caseId, serRows, eoRows, icdrRows, createdAt);
  const eul = buildEulRecord(caseId, translationEvaluation, createdAt);

  store.translationEvaluations = upsertByCase(store.translationEvaluations, translationEvaluation);
  store.epistemicUncertaintyLayers = upsertByCase(store.epistemicUncertaintyLayers, eul);
  writeStore(store);
  return { translationEvaluation, eul };
}

export function listSourceEvidenceRecords() {
  return readStore().sourceEvidenceRecords;
}

export function listEvidenceObjects(domain?: string | null) {
  const items = readStore().evidenceObjects;
  return domain ? items.filter((item) => item.domain === domain) : items;
}

export function listIcdrRecords() {
  return readStore().icdrRecords;
}

export function getTranslationEvaluation(caseId = "CASE-CABG3-2026-00014") {
  return ensureTranslationArtifacts(caseId)?.translationEvaluation ?? null;
}

export function getEpistemicUncertaintyLayer(caseId = "CASE-CABG3-2026-00014") {
  return ensureTranslationArtifacts(caseId)?.eul ?? null;
}

export function getEvidenceSnapshot(caseId = "CASE-CABG3-2026-00014") {
  return readStore().evidenceSnapshots.find((snapshot) => snapshot.caseId === caseId) ?? null;
}

export function getEvidenceLakeSummary(caseId = "CASE-CABG3-2026-00014") {
  const artifacts = ensureTranslationArtifacts(caseId);
  const store = readStore();
  const snapshot = store.evidenceSnapshots.find((item) => item.caseId === caseId) ?? null;

  return {
    activeSer: store.sourceEvidenceRecords.filter((item) => item.status === "active"),
    activeEo: store.evidenceObjects.filter((item) => item.status === "active"),
    openIcdr: store.icdrRecords.filter((item) => item.status !== "deprecated"),
    currentSnapshot: snapshot,
    translationEvaluation: artifacts?.translationEvaluation ?? null,
    epistemicUncertaintyLayer: artifacts?.eul ?? null,
  };
}
