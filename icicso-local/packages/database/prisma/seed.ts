import { createHash } from "node:crypto";
import { PrismaClient, BaseRole } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function hashAudit(previousHash: string | null, payload: Record<string, unknown>, createdAt: Date, eventType: string) {
  const source = JSON.stringify({
    previousHash,
    payload,
    createdAt: createdAt.toISOString(),
    eventType,
  });

  return createHash("sha256").update(source).digest("hex");
}

async function main() {
  const admin = await prisma.authUser.upsert({
    where: { email: "admin@icicso.local" },
    update: {},
    create: {
      userId: "USR-ADMIN-0001",
      email: "admin@icicso.local",
      passwordHash: hashPassword("Admin123!"),
      fullName: "ICICSO Admin",
      role: BaseRole.admin,
    },
  });

  await prisma.authUser.upsert({
    where: { email: "clinician@icicso.local" },
    update: {},
    create: {
      userId: "USR-CLINICIAN-0001",
      email: "clinician@icicso.local",
      passwordHash: hashPassword("Clinician123!"),
      fullName: "ICICSO Clinician",
      role: BaseRole.clinician,
    },
  });

  await prisma.authUser.upsert({
    where: { email: "governance@icicso.local" },
    update: {},
    create: {
      userId: "USR-GOVERNANCE-0001",
      email: "governance@icicso.local",
      passwordHash: hashPassword("Governance123!"),
      fullName: "ICICSO Governance",
      role: BaseRole.governance,
    },
  });

  const identity = await prisma.longitudinalIdentity.upsert({
    where: { ilcId: "ILC-MX-CIH-2026-0004821" },
    update: {},
    create: {
      ilcId: "ILC-MX-CIH-2026-0004821",
      firstName: "Paciente",
      lastName: "CABG x3",
      birthDate: new Date("1964-10-15T00:00:00.000Z"),
      sex: "MALE",
    },
  });

  const clinicalCase = await prisma.clinicalCase.upsert({
    where: { caseId: "CASE-CABG3-2026-00014" },
    update: {
      longitudinalIdentityId: identity.id,
      patientId: identity.ilcId,
      status: "active",
      reason: "CABG x3 + DM2 + FEVI 35% + NSTEMI + ERC3",
      clinicalSummary: "Caso demo de Bloque 1 para identidad longitudinal y auditoria basal.",
      pathwayId: "CABG_X3_PATHWAY",
    },
    create: {
      caseId: "CASE-CABG3-2026-00014",
      patientId: identity.ilcId,
      longitudinalIdentityId: identity.id,
      status: "active",
      reason: "CABG x3 + DM2 + FEVI 35% + NSTEMI + ERC3",
      clinicalSummary: "Caso demo de Bloque 1 para identidad longitudinal y auditoria basal.",
      pathwayId: "CABG_X3_PATHWAY",
    },
  });

  await prisma.clinicalEpisode.upsert({
    where: { episodeId: "EPI-ACS-2026-02-15" },
    update: {
      caseId: clinicalCase.id,
      longitudinalIdentityId: identity.id,
      episodeType: "ACS",
      status: "open",
    },
    create: {
      episodeId: "EPI-ACS-2026-02-15",
      caseId: clinicalCase.id,
      longitudinalIdentityId: identity.id,
      episodeType: "ACS",
      status: "open",
    },
  });

  const existingAudit = await prisma.auditEvent.findMany({
    orderBy: { createdAt: "asc" },
  });

  if (existingAudit.length === 0) {
    const createCaseAt = new Date("2026-03-29T08:00:00.000Z");
    const createCasePayload = {
      caseId: clinicalCase.caseId,
      ilcId: identity.ilcId,
      reason: clinicalCase.reason,
    };
    const createCaseHash = hashAudit(null, createCasePayload, createCaseAt, "create_case");

    await prisma.auditEvent.create({
      data: {
        auditEventId: "AUD-0001",
        eventType: "create_case",
        actorId: admin.userId,
        actorEmail: admin.email,
        targetCaseId: clinicalCase.caseId,
        correlationId: "seed-correlation-create-case",
        hash: createCaseHash,
        previousHash: null,
        payload: createCasePayload,
        createdAt: createCaseAt,
      },
    });

    const readCaseAt = new Date("2026-03-29T08:05:00.000Z");
    const readCasePayload = {
      caseId: clinicalCase.caseId,
      source: "seed-demo",
    };
    const readCaseHash = hashAudit(createCaseHash, readCasePayload, readCaseAt, "read_case");

    await prisma.auditEvent.create({
      data: {
        auditEventId: "AUD-0002",
        eventType: "read_case",
        actorId: admin.userId,
        actorEmail: admin.email,
        targetCaseId: clinicalCase.caseId,
        correlationId: "seed-correlation-read-case",
        hash: readCaseHash,
        previousHash: createCaseHash,
        payload: readCasePayload,
        createdAt: readCaseAt,
      },
    });
  }
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
    await prisma.$disconnect();
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
