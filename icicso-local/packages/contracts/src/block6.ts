import { z } from "zod";

export const runbookStatusSchema = z.enum(["draft", "ready"]);
export const readinessStatusSchema = z.enum(["PASS", "FAIL"]);
export const resourceCategorySchema = z.enum(["clinical", "or", "icu", "equipment", "human"]);
export const resourceAvailabilitySchema = z.enum(["ready", "reserved", "missing"]);
export const temporalPhaseKeySchema = z.enum(["preop", "intraop", "icu", "piso", "follow-up"]);
export const eventSeveritySchema = z.enum(["moderate", "high"]);

export const runbookSchema = z.object({
  runbookId: z.string().min(1),
  caseId: z.string().min(1),
  cpoId: z.string().min(1),
  title: z.string().min(1),
  status: runbookStatusSchema,
  summary: z.string().min(1),
});

export const runbookStepSchema = z.object({
  stepId: z.string().min(1),
  runbookId: z.string().min(1),
  actorRole: z.string().min(1),
  phase: temporalPhaseKeySchema,
  title: z.string().min(1),
  required: z.boolean(),
  checklist: z.boolean(),
});

export const actorMatrixSchema = z.object({
  actorMatrixId: z.string().min(1),
  runbookId: z.string().min(1),
  actorRole: z.string().min(1),
  responsibility: z.string().min(1),
  stepIds: z.array(z.string()),
});

export const bomResourceSchema = z.object({
  resourceId: z.string().min(1),
  caseId: z.string().min(1),
  category: resourceCategorySchema,
  label: z.string().min(1),
  availabilityStatus: resourceAvailabilitySchema,
  critical: z.boolean(),
});

export const tamPhaseSchema = z.object({
  phaseId: z.string().min(1),
  caseId: z.string().min(1),
  phase: temporalPhaseKeySchema,
  sequence: z.number().int().positive(),
  title: z.string().min(1),
  objective: z.string().min(1),
});

export const evtCatalogItemSchema = z.object({
  eventId: z.string().min(1),
  caseId: z.string().min(1),
  label: z.string().min(1),
  severity: eventSeveritySchema,
  trigger: z.string().min(1),
  responseOwner: z.string().min(1),
});

export const blockingReasonSchema = z.object({
  blockingReasonId: z.string().min(1),
  caseId: z.string().min(1),
  key: z.string().min(1),
  message: z.string().min(1),
  createdAt: z.string().min(1),
});

export const readinessGateSchema = z.object({
  gateId: z.string().min(1),
  caseId: z.string().min(1),
  key: z.string().min(1),
  label: z.string().min(1),
  status: readinessStatusSchema,
  evidence: z.string().min(1),
  critical: z.boolean(),
});

export const readinessSnapshotSchema = z.object({
  snapshotId: z.string().min(1),
  caseId: z.string().min(1),
  runbookId: z.string().min(1),
  cpoId: z.string().min(1),
  overallStatus: readinessStatusSchema,
  gateIds: z.array(z.string()),
  blockingReasonIds: z.array(z.string()),
  generatedAt: z.string().min(1),
});

export const runbookSummarySchema = z.object({
  runbook: runbookSchema,
  steps: z.array(runbookStepSchema),
  actorMatrix: z.array(actorMatrixSchema),
  bom: z.array(bomResourceSchema),
  tam: z.array(tamPhaseSchema),
  evt: z.array(evtCatalogItemSchema),
});

export const readinessSummarySchema = z.object({
  runbook: runbookSchema.nullable(),
  readinessSnapshot: readinessSnapshotSchema.nullable(),
  readinessGates: z.array(readinessGateSchema),
  blockingReasons: z.array(blockingReasonSchema),
  bom: z.array(bomResourceSchema),
  tam: z.array(tamPhaseSchema),
  evt: z.array(evtCatalogItemSchema),
});
