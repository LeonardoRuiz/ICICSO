import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { cabgBlock2Fixture, evaluateDatasetCertification } from "@icicso/contracts";
import { getCase } from "./block1-store";
import { getEvidenceLakeSummary } from "./block3-store";

type StoredGuidelineDomain = {
  domainId: string;
  title: string;
  clinicalArea: string;
  status: string;
  description: string;
  createdAt: string;
};

type StoredGuidelinePackage = {
  gpId: string;
  domainId: string;
  caseId: string;
  title: string;
  version: string;
  status: "draft" | "active" | "sunset";
  eoCount: number;
  icdrCount: number;
  snapshotId: string;
  neutralityDeclarationId: string;
  sunsetPolicyId: string;
  summary: string;
  createdAt: string;
};

type StoredPackageEoLink = {
  linkId: string;
  gpId: string;
  eoId: string;
  serId: string;
  domain: string;
  groupLabel: string;
  createdAt: string;
};

type StoredSunsetPolicy = {
  sunsetPolicyId: string;
  gpId: string;
  reviewBy: string;
  reason: string;
  status: string;
  createdAt: string;
};

type StoredNeutralityDeclaration = {
  neutralityDeclarationId: string;
  gpId: string;
  statement: string;
  conflictStatus: string;
  reviewedBy: string;
  createdAt: string;
};

type StoredOperativeFramework = {
  frameworkId: string;
  title: string;
  status: "active" | "review" | "frozen";
  purpose: string;
  freezeFlag: boolean;
  reviewFlag: boolean;
  createdAt: string;
};

type StoredFrameworkDependency = {
  dependencyId: string;
  frameworkId: string;
  dependsOnFrameworkId: string;
  reason: string;
  createdAt: string;
};

type StoredClinicalPathwayObject = {
  cpoId: string;
  caseId: string;
  gpId: string;
  frameworkIds: string[];
  freezeFlag: boolean;
  reviewFlag: boolean;
  notAutoExecutable: boolean;
  ddmoGateStatus: "pass" | "blocked";
  status: "issued" | "review" | "frozen" | "rolled_back";
  summary: string;
  createdAt: string;
};

type StoredRollbackRecord = {
  rollbackId: string;
  cpoId: string;
  reason: string;
  createdAt: string;
};

type Block5Store = {
  guidelineDomains: StoredGuidelineDomain[];
  guidelinePackages: StoredGuidelinePackage[];
  packageEoLinks: StoredPackageEoLink[];
  sunsetPolicies: StoredSunsetPolicy[];
  neutralityDeclarations: StoredNeutralityDeclaration[];
  operativeFrameworks: StoredOperativeFramework[];
  frameworkDependencies: StoredFrameworkDependency[];
  clinicalPathwayObjects: StoredClinicalPathwayObject[];
  rollbackRecords: StoredRollbackRecord[];
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

  return join(dataDir, "block5-ghl-kbol.json");
}

function createInitialStore(): Block5Store {
  const createdAt = "2026-03-29T12:30:00.000Z";

  return {
    guidelineDomains: [
      {
        domainId: "DOM-REVASC-CABG",
        title: "Revascularización CABG",
        clinicalArea: "cardiac-surgery",
        status: "active",
        description: "Dominio operativo para CABG x3 con ACS, DM2 y ERC3.",
        createdAt,
      },
    ],
    guidelinePackages: [],
    packageEoLinks: [],
    sunsetPolicies: [],
    neutralityDeclarations: [],
    operativeFrameworks: [
      {
        frameworkId: "FW-ERAS-CARD",
        title: "ERAS Cardiac",
        status: "active",
        purpose: "Trayectoria perioperatoria acelerada y estandarizada.",
        freezeFlag: false,
        reviewFlag: false,
        createdAt,
      },
      {
        frameworkId: "FW-GLYCEMIC",
        title: "Glycemic Control",
        status: "active",
        purpose: "Control glucémico perioperatorio en DM2.",
        freezeFlag: false,
        reviewFlag: true,
        createdAt,
      },
      {
        frameworkId: "FW-AKI",
        title: "AKI Prevention",
        status: "active",
        purpose: "Prevención y mitigación de lesión renal aguda.",
        freezeFlag: false,
        reviewFlag: true,
        createdAt,
      },
      {
        frameworkId: "FW-AF",
        title: "Post-op AF Prevention",
        status: "active",
        purpose: "Control de riesgo de fibrilación auricular posoperatoria.",
        freezeFlag: false,
        reviewFlag: false,
        createdAt,
      },
      {
        frameworkId: "FW-PBM",
        title: "Patient Blood Management",
        status: "active",
        purpose: "Manejo conservador de sangre y anemia en CABG.",
        freezeFlag: false,
        reviewFlag: false,
        createdAt,
      },
    ],
    frameworkDependencies: [
      {
        dependencyId: "DEP-ERAS-PBM-001",
        frameworkId: "FW-ERAS-CARD",
        dependsOnFrameworkId: "FW-PBM",
        reason: "ERAS integra manejo transfusional conservador.",
        createdAt,
      },
      {
        dependencyId: "DEP-ERAS-GLY-001",
        frameworkId: "FW-ERAS-CARD",
        dependsOnFrameworkId: "FW-GLYCEMIC",
        reason: "ERAS requiere control glucémico estable en perioperatorio.",
        createdAt,
      },
      {
        dependencyId: "DEP-ERAS-AKI-001",
        frameworkId: "FW-ERAS-CARD",
        dependsOnFrameworkId: "FW-AKI",
        reason: "ERAS debe preservar función renal en CABG complejo.",
        createdAt,
      },
      {
        dependencyId: "DEP-AF-ERAS-001",
        frameworkId: "FW-AF",
        dependsOnFrameworkId: "FW-ERAS-CARD",
        reason: "Prevención de AF se monta sobre la trayectoria perioperatoria.",
        createdAt,
      },
    ],
    clinicalPathwayObjects: [],
    rollbackRecords: [],
  };
}

function readStore() {
  const storePath = getStorePath();
  if (!existsSync(storePath)) {
    const initial = createInitialStore();
    writeFileSync(storePath, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }

  return JSON.parse(readFileSync(storePath, "utf8")) as Block5Store;
}

function writeStore(store: Block5Store) {
  writeFileSync(getStorePath(), JSON.stringify(store, null, 2), "utf8");
}

export function listGuidelineDomains() {
  return readStore().guidelineDomains;
}

export function getGuidelineDomain(domainId = "DOM-REVASC-CABG") {
  return readStore().guidelineDomains.find((item) => item.domainId === domainId) ?? null;
}

export function publishGuidelinePackage(caseId = "CASE-CABG3-2026-00014") {
  const store = readStore();
  const existing = store.guidelinePackages.find((item) => item.caseId === caseId && item.domainId === "DOM-REVASC-CABG");
  if (existing) {
    return existing;
  }

  const caseRecord = getCase(caseId);
  const evidence = getEvidenceLakeSummary(caseId);
  if (!caseRecord || !evidence.currentSnapshot) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const gpId = "GP-REVASC-CABG-v3";
  const neutralityDeclarationId = "ND-GP-REVASC-CABG-v3";
  const sunsetPolicyId = "SUNSET-GP-REVASC-CABG-v3";
  const eoLinks = evidence.activeEo.map((item) => ({
    linkId: `LINK-${gpId}-${item.eoId}`,
    gpId,
    eoId: item.eoId,
    serId: item.serId,
    domain: item.domain,
    groupLabel: item.domain.toUpperCase(),
    createdAt,
  }));

  const guidelinePackage: StoredGuidelinePackage = {
    gpId,
    domainId: "DOM-REVASC-CABG",
    caseId,
    title: "Guideline Package CABG x3 revascularización compleja",
    version: "v3",
    status: "active",
    eoCount: evidence.activeEo.length,
    icdrCount: evidence.openIcdr.length,
    snapshotId: evidence.currentSnapshot.snapshotId,
    neutralityDeclarationId,
    sunsetPolicyId,
    summary:
      "Paquete guía compilado desde Evidence Lake activo para CABG x3 + DM2 + NSTEMI + FEVI 35% + ERC3.",
    createdAt,
  };

  store.guidelinePackages.push(guidelinePackage);
  store.packageEoLinks.push(...eoLinks);
  store.neutralityDeclarations.push({
    neutralityDeclarationId,
    gpId,
    statement:
      "El paquete agrupa EO activos y divergencias explícitas sin cerrar en falso la discrepancia ACC 2021 vs ESC 2018.",
    conflictStatus: "declared-neutral",
    reviewedBy: "governance-board-local",
    createdAt,
  });
  store.sunsetPolicies.push({
    sunsetPolicyId,
    gpId,
    reviewBy: "2026-09-30",
    reason: "Revisión semestral o cambio mayor de guideline base.",
    status: "scheduled",
    createdAt,
  });
  writeStore(store);
  return guidelinePackage;
}

export function listGuidelinePackages(domainId?: string | null) {
  const items = readStore().guidelinePackages;
  return domainId ? items.filter((item) => item.domainId === domainId) : items;
}

export function getGuidelinePackage(gpId: string) {
  return readStore().guidelinePackages.find((item) => item.gpId === gpId) ?? null;
}

export function listPackageEoLinks(gpId: string) {
  return readStore().packageEoLinks.filter((item) => item.gpId === gpId);
}

export function getSunsetPolicy(gpId: string) {
  return readStore().sunsetPolicies.find((item) => item.gpId === gpId) ?? null;
}

export function getNeutralityDeclaration(gpId: string) {
  return readStore().neutralityDeclarations.find((item) => item.gpId === gpId) ?? null;
}

export function listOperativeFrameworks() {
  return readStore().operativeFrameworks;
}

export function listFrameworkDependencies() {
  return readStore().frameworkDependencies;
}

export function generateClinicalPathwayObject(caseId = "CASE-CABG3-2026-00014") {
  const store = readStore();
  const existing = store.clinicalPathwayObjects.find((item) => item.caseId === caseId);
  if (existing) {
    return existing;
  }

  const gp = publishGuidelinePackage(caseId);
  const caseRecord = getCase(caseId);
  const evidence = getEvidenceLakeSummary(caseId);
  const datasetGate = evaluateDatasetCertification(cabgBlock2Fixture);
  if (!gp || !caseRecord) {
    return null;
  }

  const createdAt = new Date().toISOString();
  const reviewFlag = evidence.openIcdr.length > 0;
  const freezeFlag = false;
  const ddmoGateStatus = datasetGate.readinessForEte ? "pass" as const : "blocked" as const;
  const status = ddmoGateStatus === "pass"
    ? reviewFlag ? "review" as const : "issued" as const
    : "review" as const;
  const cpo: StoredClinicalPathwayObject = {
    cpoId: "CPO-CABG3-DM2-NSTEMI-FEVI35-ERC3-v1",
    caseId,
    gpId: gp.gpId,
    frameworkIds: store.operativeFrameworks.map((item) => item.frameworkId),
    freezeFlag,
    reviewFlag,
    notAutoExecutable: true,
    ddmoGateStatus,
    status,
    summary:
      "CPO formal no autoejecutable para CABG x3 + DM2 + NSTEMI + FEVI 35% + ERC3 con gate DDMO dependiente de dataset certificado.",
    createdAt,
  };

  store.clinicalPathwayObjects.push(cpo);
  writeStore(store);
  return cpo;
}

export function getClinicalPathwayObject(caseId = "CASE-CABG3-2026-00014") {
  return readStore().clinicalPathwayObjects.find((item) => item.caseId === caseId) ?? null;
}

export function listRollbackRecords(caseId?: string | null) {
  const rollbacks = readStore().rollbackRecords;
  if (!caseId) {
    return rollbacks;
  }

  const cpo = getClinicalPathwayObject(caseId);
  return cpo ? rollbacks.filter((item) => item.cpoId === cpo.cpoId) : [];
}
