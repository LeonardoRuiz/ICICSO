import { z } from "zod";

export const packageStatusSchema = z.enum(["draft", "active", "sunset"]);
export const frameworkStatusSchema = z.enum(["active", "review", "frozen"]);
export const ddmoGateStatusSchema = z.enum(["pass", "blocked"]);
export const cpoStatusSchema = z.enum(["issued", "review", "frozen", "rolled_back"]);

export const guidelineDomainSchema = z.object({
  domainId: z.string().min(1),
  title: z.string().min(1),
  clinicalArea: z.string().min(1),
  status: z.string().min(1),
  description: z.string().min(1),
});

export const guidelinePackageSchema = z.object({
  gpId: z.string().min(1),
  domainId: z.string().min(1),
  caseId: z.string().min(1),
  title: z.string().min(1),
  version: z.string().min(1),
  status: packageStatusSchema,
  eoCount: z.number().int().nonnegative(),
  icdrCount: z.number().int().nonnegative(),
  snapshotId: z.string().min(1),
  neutralityDeclarationId: z.string().min(1),
  sunsetPolicyId: z.string().min(1),
  summary: z.string().min(1),
});

export const packageEoLinkSchema = z.object({
  linkId: z.string().min(1),
  gpId: z.string().min(1),
  eoId: z.string().min(1),
  serId: z.string().min(1),
  domain: z.string().min(1),
  groupLabel: z.string().min(1),
});

export const sunsetPolicySchema = z.object({
  sunsetPolicyId: z.string().min(1),
  gpId: z.string().min(1),
  reviewBy: z.string().min(1),
  reason: z.string().min(1),
  status: z.string().min(1),
});

export const neutralityDeclarationSchema = z.object({
  neutralityDeclarationId: z.string().min(1),
  gpId: z.string().min(1),
  statement: z.string().min(1),
  conflictStatus: z.string().min(1),
  reviewedBy: z.string().min(1),
});

export const operativeFrameworkSchema = z.object({
  frameworkId: z.string().min(1),
  title: z.string().min(1),
  status: frameworkStatusSchema,
  purpose: z.string().min(1),
  freezeFlag: z.boolean(),
  reviewFlag: z.boolean(),
});

export const frameworkDependencySchema = z.object({
  dependencyId: z.string().min(1),
  frameworkId: z.string().min(1),
  dependsOnFrameworkId: z.string().min(1),
  reason: z.string().min(1),
});

export const clinicalPathwayObjectSchema = z.object({
  cpoId: z.string().min(1),
  caseId: z.string().min(1),
  gpId: z.string().min(1),
  frameworkIds: z.array(z.string()).min(1),
  freezeFlag: z.boolean(),
  reviewFlag: z.boolean(),
  notAutoExecutable: z.boolean(),
  ddmoGateStatus: ddmoGateStatusSchema,
  status: cpoStatusSchema,
  summary: z.string().min(1),
});

export const rollbackRecordSchema = z.object({
  rollbackId: z.string().min(1),
  cpoId: z.string().min(1),
  reason: z.string().min(1),
  createdAt: z.string().min(1),
});

export const eoGroupSummarySchema = z.object({
  groupLabel: z.string().min(1),
  eoIds: z.array(z.string()),
  domains: z.array(z.string()),
});

export const ghlSummarySchema = z.object({
  domain: guidelineDomainSchema,
  guidelinePackage: guidelinePackageSchema,
  packageEoLinks: z.array(packageEoLinkSchema),
  eoGroups: z.array(eoGroupSummarySchema),
  sunsetPolicy: sunsetPolicySchema,
  neutralityDeclaration: neutralityDeclarationSchema,
});

export const kbolSummarySchema = z.object({
  frameworks: z.array(operativeFrameworkSchema),
  dependencies: z.array(frameworkDependencySchema),
  cpo: clinicalPathwayObjectSchema.nullable(),
  rollbacks: z.array(rollbackRecordSchema),
  datasetGate: z.object({
    certificationStatus: z.string().min(1),
    readinessForEte: z.boolean(),
    dataCompletenessIndex: z.number().min(0).max(100),
  }),
});
