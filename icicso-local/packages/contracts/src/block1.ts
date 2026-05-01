import { z } from "zod";
import { BASE_ROLES, AUDIT_EVENT_TYPES } from "@icicso/canonical-types";

// Derive schemas from canonical-types to ensure single source of truth
export const baseRoleSchema = z.enum(BASE_ROLES);
export const auditEventTypeSchema = z.enum(AUDIT_EVENT_TYPES);

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export const authUserSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: baseRoleSchema,
});

export const authSessionSchema = z.object({
  token: z.string(),
  user: authUserSchema,
});

export const createIdentitySchema = z.object({
  ilcId: z.string().min(6).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string(),
  sex: z.string().min(1),
});

export const createEpisodeSchema = z.object({
  identityId: z.string().optional(),
  ilcId: z.string().optional(),
  episodeId: z.string().min(6).optional(),
  episodeType: z.string().min(1),
});

export const createCaseSchema = z.object({
  identityId: z.string().optional(),
  ilcId: z.string().optional(),
  episodeId: z.string().min(6),
  caseId: z.string().min(6).optional(),
  reason: z.string().min(1),
  clinicalSummary: z.string().min(1).optional(),
  pathwayId: z.string().min(1).optional(),
});

export const auditEventInputSchema = z.object({
  eventType: auditEventTypeSchema,
  actorId: z.string().nullable().optional(),
  actorEmail: z.string().email().nullable().optional(),
  targetCaseId: z.string().nullable().optional(),
  correlationId: z.string().min(8),
  payload: z.record(z.unknown()),
});

export const auditEventSchema = auditEventInputSchema.extend({
  auditEventId: z.string(),
  hash: z.string(),
  previousHash: z.string().nullable(),
  createdAt: z.string(),
});

export const serviceHealthSchema = z.object({
  service: z.enum([
    "gateway-api",
    "auth-service",
    "identity-service",
    "audit-service",
    "storage-service",
    "ingestion-service",
    "terminology-service",
    "data-governance-service",
    "evidence-lake-service",
    "ghl-service",
    "kbol-service",
  ]),
  status: z.enum(["ok", "degraded", "down"]),
  port: z.number().int().positive(),
  timestamp: z.string(),
});

export const block1OverviewSchema = z.object({
  services: z.array(serviceHealthSchema),
  demoCase: z
    .object({
      ilcId: z.string(),
      episodeId: z.string(),
      caseId: z.string(),
      reason: z.string().nullable(),
      clinicalSummary: z.string().nullable(),
      status: z.string(),
    })
    .nullable(),
  auditTimeline: z.array(auditEventSchema),
});
