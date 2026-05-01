import { z } from "zod";

export const caseStateSchema = z.enum(["PRE-OP", "INTRA-OP", "ICU", "FLOOR", "FOLLOW-UP", "CLOSED"]);
export const overrideTypeSchema = z.enum(["clinical", "logistical", "emergent"]);

export const caseControlSchema = z.object({
  caseControlId: z.string().min(1),
  caseId: z.string().min(1),
  currentState: caseStateSchema,
  activated: z.boolean(),
  readinessSnapshotId: z.string().nullable(),
  currentLegalSnapshotId: z.string().nullable(),
});

export const caseStateTransitionSchema = z.object({
  transitionId: z.string().min(1),
  caseId: z.string().min(1),
  fromState: caseStateSchema.nullable(),
  toState: caseStateSchema,
  reason: z.string().min(1),
  overrideId: z.string().nullable(),
  createdAt: z.string().min(1),
});

export const stateTransitionCaptureSchema = z.object({
  captureId: z.string().min(1),
  transitionId: z.string().min(1),
  caseId: z.string().min(1),
  actorRole: z.string().min(1),
  summary: z.string().min(1),
  createdAt: z.string().min(1),
});

export const legalSnapshotSchema = z.object({
  legalSnapshotId: z.string().min(1),
  caseId: z.string().min(1),
  state: caseStateSchema,
  snapshotType: z.enum(["activation_preop", "intraop_exit", "icu_entry", "case_closure"]),
  summary: z.string().min(1),
  createdAt: z.string().min(1),
});

export const overrideRecordSchema = z.object({
  overrideId: z.string().min(1),
  caseId: z.string().min(1),
  overrideType: overrideTypeSchema,
  justification: z.string().min(1),
  signedBy: z.string().min(1),
  status: z.enum(["active", "consumed"]),
  createdAt: z.string().min(1),
});

export const overrideCreateSchema = z.object({
  overrideType: overrideTypeSchema,
  justification: z.string().min(5),
  signedBy: z.string().min(3),
});

export const transitionRequestSchema = z.object({
  toState: caseStateSchema,
  reason: z.string().min(3),
  actorRole: z.string().min(3).default("case-controller"),
  overrideId: z.string().min(1).optional(),
});

export const caseControlSummarySchema = z.object({
  caseControl: caseControlSchema.nullable(),
  transitions: z.array(caseStateTransitionSchema),
  captures: z.array(stateTransitionCaptureSchema),
  legalSnapshots: z.array(legalSnapshotSchema),
  overrides: z.array(overrideRecordSchema),
  logs: z.array(z.string()),
});
