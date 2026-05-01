import { z } from "zod";

export const evidenceStatusSchema = z.enum(["active", "under_review", "deprecated"]);

export const sourceEvidenceRecordSchema = z.object({
  serId: z.string().min(1),
  title: z.string().min(1),
  authority: z.string().min(1),
  year: z.number().int(),
  domain: z.string().min(1),
  status: evidenceStatusSchema,
  vrn: z.string().min(1),
  hash: z.string().min(16),
  lineageParentSerId: z.string().nullable().optional(),
});

export const evidenceObjectSchema = z.object({
  eoId: z.string().min(1),
  serId: z.string().min(1),
  title: z.string().min(1),
  domain: z.string().min(1),
  status: evidenceStatusSchema,
  strength: z.string().min(1),
  payload: z.record(z.unknown()),
  vrn: z.string().min(1),
  hash: z.string().min(16),
  lineageParentEoId: z.string().nullable().optional(),
});

export const icdrRecordSchema = z.object({
  icdrId: z.string().min(1),
  topic: z.string().min(1),
  status: evidenceStatusSchema,
  sourceA: z.string().min(1),
  sourceB: z.string().min(1),
  divergence: z.string().min(1),
  clinicalContext: z.string().min(1),
  resolutionNote: z.string().min(1),
  vrn: z.string().min(1),
  hash: z.string().min(16),
});

export const evidenceSnapshotSchema = z.object({
  snapshotId: z.string().min(1),
  caseId: z.string().min(1),
  title: z.string().min(1),
  status: evidenceStatusSchema,
  serIds: z.array(z.string()),
  eoIds: z.array(z.string()),
  icdrIds: z.array(z.string()),
  summary: z.string().min(1),
  vrn: z.string().min(1),
  hash: z.string().min(16),
  scientificDate: z.string().min(1),
});

export const translationEvaluationSchema = z.object({
  eteId: z.string().min(1),
  caseId: z.string().min(1),
  ecs: z.number(),
  uci: z.number(),
  macClassification: z.enum(["applicable", "conditional", "not_applicable", "indeterminate"]),
  ddmoGateStatus: z.enum(["pass", "blocked"]),
  conflictCount: z.number().int(),
  status: z.enum(["pass", "review", "blocked"]),
  hash: z.string().min(16),
});

export const epistemicUncertaintyLayerSchema = z.object({
  eulId: z.string().min(1),
  caseId: z.string().min(1),
  eteId: z.string().min(1),
  level: z.enum(["I", "II", "III", "IV"]),
  validationPolicy: z.enum(["standard-validation", "contextual-validation", "reinforced-validation", "blocked-pending-governance"]),
  activationBlocked: z.boolean(),
  requiredSignatures: z.array(z.string()),
  escalationThreshold: z.number(),
  rationale: z.string().min(1),
  hash: z.string().min(16),
});

export const evidenceLakeSummarySchema = z.object({
  services: z
    .array(
      z.object({
        service: z.string(),
        status: z.string(),
        port: z.number(),
        timestamp: z.string(),
      }),
    )
    .default([]),
  activeSer: z.array(sourceEvidenceRecordSchema),
  activeEo: z.array(evidenceObjectSchema),
  openIcdr: z.array(icdrRecordSchema),
  currentSnapshot: evidenceSnapshotSchema.nullable(),
  translationEvaluation: translationEvaluationSchema.nullable(),
  epistemicUncertaintyLayer: epistemicUncertaintyLayerSchema.nullable(),
});
