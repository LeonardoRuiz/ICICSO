import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { AuditEventType, BaseRole } from "@icicso/canonical-types";

type StoredUser = {
  id: string;
  userId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: BaseRole;
  isActive: boolean;
  createdAt: string;
};

type StoredIdentity = {
  id: string;
  ilcId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: string;
  createdAt: string;
  updatedAt: string;
};

type StoredCase = {
  id: string;
  caseId: string;
  patientId: string;
  longitudinalIdentityId: string;
  status: string;
  reason: string | null;
  clinicalSummary: string | null;
  pathwayId: string | null;
  createdAt: string;
  updatedAt: string;
};

type StoredEpisode = {
  id: string;
  episodeId: string;
  caseId: string;
  longitudinalIdentityId: string;
  episodeType: string;
  status: string;
  startedAt: string;
  createdAt: string;
};

type StoredAuditEvent = {
  id: string;
  auditEventId: string;
  eventType: AuditEventType;
  actorId: string | null;
  actorEmail: string | null;
  targetCaseId: string | null;
  correlationId: string;
  hash: string;
  previousHash: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

type Block1Store = {
  users: StoredUser[];
  identities: StoredIdentity[];
  episodes: StoredEpisode[];
  cases: StoredCase[];
  auditEvents: StoredAuditEvent[];
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

  return join(dataDir, "block1-store.json");
}

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function hashAudit(previousHash: string | null, payload: Record<string, unknown>, createdAt: string, eventType: string) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        previousHash,
        payload,
        createdAt,
        eventType,
      }),
    )
    .digest("hex");
}

function createInitialStore(): Block1Store {
  const now = new Date("2026-03-29T08:00:00.000Z").toISOString();
  const identityId = randomUUID();
  const caseInternalId = randomUUID();
  const episodeInternalId = randomUUID();
  const createCaseHash = hashAudit(
    null,
    {
      caseId: "CASE-CABG3-2026-00014",
      ilcId: "ILC-MX-CIH-2026-0004821",
    },
    now,
    "create_case",
  );

  return {
    users: [
      {
        id: randomUUID(),
        userId: "USR-ADMIN-0001",
        email: "admin@icicso.local",
        passwordHash: hashPassword("Admin123!"),
        fullName: "ICICSO Admin",
        role: "admin",
        isActive: true,
        createdAt: now,
      },
      {
        id: randomUUID(),
        userId: "USR-CLINICIAN-0001",
        email: "clinician@icicso.local",
        passwordHash: hashPassword("Clinician123!"),
        fullName: "ICICSO Clinician",
        role: "clinician",
        isActive: true,
        createdAt: now,
      },
      {
        id: randomUUID(),
        userId: "USR-GOVERNANCE-0001",
        email: "governance@icicso.local",
        passwordHash: hashPassword("Governance123!"),
        fullName: "ICICSO Governance",
        role: "governance",
        isActive: true,
        createdAt: now,
      },
    ],
    identities: [
      {
        id: identityId,
        ilcId: "ILC-MX-CIH-2026-0004821",
        firstName: "Paciente",
        lastName: "CABG x3",
        birthDate: new Date("1964-10-15T00:00:00.000Z").toISOString(),
        sex: "MALE",
        createdAt: now,
        updatedAt: now,
      },
    ],
    episodes: [
      {
        id: episodeInternalId,
        episodeId: "EPI-ACS-2026-02-15",
        caseId: caseInternalId,
        longitudinalIdentityId: identityId,
        episodeType: "ACS",
        status: "open",
        startedAt: now,
        createdAt: now,
      },
    ],
    cases: [
      {
        id: caseInternalId,
        caseId: "CASE-CABG3-2026-00014",
        patientId: "ILC-MX-CIH-2026-0004821",
        longitudinalIdentityId: identityId,
        status: "active",
        reason: "CABG x3 + DM2 + FEVI 35% + NSTEMI + ERC3",
        clinicalSummary: "Caso demo de Bloque 1 para identidad longitudinal y auditoria basal.",
        pathwayId: "CABG_X3_PATHWAY",
        createdAt: now,
        updatedAt: now,
      },
    ],
    auditEvents: [
      {
        id: randomUUID(),
        auditEventId: "AUD-0001",
        eventType: "create_case",
        actorId: "USR-ADMIN-0001",
        actorEmail: "admin@icicso.local",
        targetCaseId: "CASE-CABG3-2026-00014",
        correlationId: "seed-correlation-create-case",
        hash: createCaseHash,
        previousHash: null,
        payload: {
          caseId: "CASE-CABG3-2026-00014",
          ilcId: "ILC-MX-CIH-2026-0004821",
        },
        createdAt: now,
      },
      {
        id: randomUUID(),
        auditEventId: "AUD-0002",
        eventType: "read_case",
        actorId: "USR-ADMIN-0001",
        actorEmail: "admin@icicso.local",
        targetCaseId: "CASE-CABG3-2026-00014",
        correlationId: "seed-correlation-read-case",
        hash: hashAudit(
          createCaseHash,
          {
            caseId: "CASE-CABG3-2026-00014",
            source: "seed-demo",
          },
          new Date("2026-03-29T08:05:00.000Z").toISOString(),
          "read_case",
        ),
        previousHash: createCaseHash,
        payload: {
          caseId: "CASE-CABG3-2026-00014",
          source: "seed-demo",
        },
        createdAt: new Date("2026-03-29T08:05:00.000Z").toISOString(),
      },
    ],
  };
}

function readStore() {
  const storePath = getStorePath();
  if (!existsSync(storePath)) {
    const initial = createInitialStore();
    writeFileSync(storePath, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }

  return JSON.parse(readFileSync(storePath, "utf8")) as Block1Store;
}

function writeStore(store: Block1Store) {
  writeFileSync(getStorePath(), JSON.stringify(store, null, 2), "utf8");
}

export function getAuthUserByEmail(email: string) {
  return readStore().users.find((user) => user.email === email) ?? null;
}

export function createIdentity(input: {
  ilcId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: string;
}) {
  const store = readStore();
  const now = new Date().toISOString();
  const record: StoredIdentity = {
    id: randomUUID(),
    ilcId: input.ilcId,
    firstName: input.firstName,
    lastName: input.lastName,
    birthDate: new Date(input.birthDate).toISOString(),
    sex: input.sex,
    createdAt: now,
    updatedAt: now,
  };

  store.identities.push(record);
  writeStore(store);
  return record;
}

export function findIdentity(identityId?: string | null, ilcId?: string | null) {
  const store = readStore();
  if (identityId) {
    return store.identities.find((identity) => identity.id === identityId) ?? null;
  }

  if (ilcId) {
    return store.identities.find((identity) => identity.ilcId === ilcId) ?? null;
  }

  return null;
}

export function createEpisode(input: {
  identityId: string;
  episodeId: string;
  episodeType: string;
}) {
  const store = readStore();
  const identity = store.identities.find((item) => item.id === input.identityId);
  if (!identity) {
    return null;
  }

  const now = new Date().toISOString();
  const linkedCase: StoredCase = {
    id: randomUUID(),
    caseId: `CASE-${randomUUID()}`,
    patientId: identity.ilcId,
    longitudinalIdentityId: identity.id,
    status: "pending_activation",
    reason: null,
    clinicalSummary: null,
    pathwayId: null,
    createdAt: now,
    updatedAt: now,
  };

  const episode: StoredEpisode = {
    id: randomUUID(),
    episodeId: input.episodeId,
    caseId: linkedCase.id,
    longitudinalIdentityId: identity.id,
    episodeType: input.episodeType,
    status: "open",
    startedAt: now,
    createdAt: now,
  };

  store.cases.push(linkedCase);
  store.episodes.push(episode);
  writeStore(store);

  return episode;
}

export function createCase(input: {
  episodeId: string;
  caseId: string;
  reason: string;
  clinicalSummary?: string | null;
  pathwayId?: string | null;
}) {
  const store = readStore();
  const episode = store.episodes.find((item) => item.episodeId === input.episodeId);
  if (!episode) {
    return null;
  }

  const linkedCase = store.cases.find((item) => item.id === episode.caseId);
  if (!linkedCase) {
    return null;
  }

  linkedCase.caseId = input.caseId;
  linkedCase.status = "active";
  linkedCase.reason = input.reason;
  linkedCase.clinicalSummary = input.clinicalSummary ?? null;
  linkedCase.pathwayId = input.pathwayId ?? null;
  linkedCase.updatedAt = new Date().toISOString();
  writeStore(store);

  return getCase(linkedCase.caseId);
}

export function getCase(caseId: string) {
  const store = readStore();
  const clinicalCase = store.cases.find((item) => item.caseId === caseId);
  if (!clinicalCase) {
    return null;
  }

  return {
    ...clinicalCase,
    longitudinalIdentity: store.identities.find((item) => item.id === clinicalCase.longitudinalIdentityId) ?? null,
    episodes: store.episodes.filter((item) => item.caseId === clinicalCase.id),
  };
}

export function listAuditEvents(caseId?: string | null, limit = 20) {
  const store = readStore();
  const filtered = caseId
    ? store.auditEvents.filter((item) => item.targetCaseId === caseId)
    : [...store.auditEvents];

  return filtered.sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, limit);
}

export function appendAuditEvent(input: {
  eventType: AuditEventType;
  actorId?: string | null;
  actorEmail?: string | null;
  targetCaseId?: string | null;
  correlationId: string;
  payload: Record<string, unknown>;
}) {
  const store = readStore();
  const previous = store.auditEvents[store.auditEvents.length - 1] ?? null;
  const createdAt = new Date().toISOString();
  const record: StoredAuditEvent = {
    id: randomUUID(),
    auditEventId: `AUD-${randomUUID()}`,
    eventType: input.eventType,
    actorId: input.actorId ?? null,
    actorEmail: input.actorEmail ?? null,
    targetCaseId: input.targetCaseId ?? null,
    correlationId: input.correlationId,
    previousHash: previous?.hash ?? null,
    hash: hashAudit(previous?.hash ?? null, input.payload, createdAt, input.eventType),
    payload: input.payload,
    createdAt,
  };

  store.auditEvents.push(record);
  writeStore(store);
  return record;
}
