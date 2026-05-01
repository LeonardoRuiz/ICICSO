import { z } from "zod";

export const signalSeveritySchema = z.enum(["moderate", "high"]);
export const signalStatusSchema = z.enum(["open", "monitoring", "resolved"]);
export const dtqStatusSchema = z.enum(["pass", "issue"]);
export const metricStatusSchema = z.enum(["on_target", "watch", "out_of_range"]);
export const driftStatusSchema = z.enum(["candidate", "confirmed", "monitoring"]);

export const systemicRiskSignalSchema = z.object({
  signalId: z.string().min(1),
  caseId: z.string().min(1),
  signalKey: z.string().min(1),
  label: z.string().min(1),
  severity: signalSeveritySchema,
  status: signalStatusSchema,
  thresholdId: z.string().min(1),
  windowId: z.string().min(1),
  metricValue: z.number(),
  thresholdValue: z.number(),
  unit: z.string().min(1),
  summary: z.string().min(1),
  sourceRefs: z.array(z.string().min(1)),
  createdAt: z.string().min(1),
});

export const riskThresholdSchema = z.object({
  thresholdId: z.string().min(1),
  signalKey: z.string().min(1),
  label: z.string().min(1),
  comparator: z.enum([">=", "<="]),
  unit: z.string().min(1),
  thresholdValue: z.number(),
  warningValue: z.number(),
});

export const signalWindowSchema = z.object({
  windowId: z.string().min(1),
  label: z.string().min(1),
  phase: z.string().min(1),
  startState: z.string().min(1),
  endState: z.string().min(1),
  horizonHours: z.number().int().nonnegative(),
});

export const dataQualityRecordSchema = z.object({
  recordId: z.string().min(1),
  caseId: z.string().min(1),
  category: z.string().min(1),
  status: dtqStatusSchema,
  finding: z.string().min(1),
  evidence: z.string().min(1),
  anomalyFlags: z.array(z.string().min(1)),
  createdAt: z.string().min(1),
});

export const traceabilityScoreSchema = z.object({
  scoreId: z.string().min(1),
  caseId: z.string().min(1),
  overallScore: z.number(),
  stcCoverage: z.number(),
  eslCoverage: z.number(),
  overrideTransparency: z.number(),
  documentationCompleteness: z.number(),
  createdAt: z.string().min(1),
});

export const cqoiMetricSchema = z.object({
  metricId: z.string().min(1),
  caseId: z.string().min(1),
  code: z.string().min(1),
  label: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1),
  target: z.number(),
  comparator: z.enum(["<=", ">="]),
  status: metricStatusSchema,
  createdAt: z.string().min(1),
});

export const outcomeAggregateSchema = z.object({
  aggregateId: z.string().min(1),
  caseId: z.string().min(1),
  mortality30d: z.boolean(),
  akiStage: z.number().int().nonnegative(),
  postopFa: z.boolean(),
  prolongedIcuStay: z.boolean(),
  transfusionUnits: z.number().nonnegative(),
  icuLengthHours: z.number().nonnegative(),
  lengthOfStayDays: z.number().nonnegative(),
  documentationClosureRate: z.number().nonnegative(),
  createdAt: z.string().min(1),
});

export const qualityReportSchema = z.object({
  reportId: z.string().min(1),
  caseId: z.string().min(1),
  metricIds: z.array(z.string().min(1)),
  outcomeAggregateId: z.string().min(1),
  summary: z.string().min(1),
  createdAt: z.string().min(1),
});

export const driftCandidateSchema = z.object({
  candidateId: z.string().min(1),
  caseId: z.string().min(1),
  domain: z.string().min(1),
  label: z.string().min(1),
  rationale: z.string().min(1),
  signalIds: z.array(z.string().min(1)),
  status: driftStatusSchema,
  createdAt: z.string().min(1),
});

export const driftRecordSchema = z.object({
  driftId: z.string().min(1),
  caseId: z.string().min(1),
  driftType: z.string().min(1),
  candidateId: z.string().min(1),
  severity: signalSeveritySchema,
  baseline: z.number(),
  observed: z.number(),
  delta: z.number(),
  summary: z.string().min(1),
  createdAt: z.string().min(1),
});

export const dtqSummarySchema = z.object({
  dataQualityRecords: z.array(dataQualityRecordSchema),
  traceabilityScore: traceabilityScoreSchema,
});

export const systemicRiskSummarySchema = z.object({
  thresholds: z.array(riskThresholdSchema),
  windows: z.array(signalWindowSchema),
  signals: z.array(systemicRiskSignalSchema),
  dtq: dtqSummarySchema,
});

export const cqoiSummarySchema = z.object({
  metrics: z.array(cqoiMetricSchema),
  outcomeAggregate: outcomeAggregateSchema,
  qualityReport: qualityReportSchema,
  driftCandidates: z.array(driftCandidateSchema),
  driftRecords: z.array(driftRecordSchema),
});
