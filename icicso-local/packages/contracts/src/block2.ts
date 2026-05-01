import { z } from "zod";
import { serviceHealthSchema } from "./block1";

export const documentTypeSchema = z.enum([
  "lab",
  "imaging",
  "note",
  "external",
  "consent",
  "medication",
  "procedure",
  "device",
  "dynamic_odd",
  "dynamic_pri",
]);

export const sourceSystemSchema = z.enum([
  "LIS",
  "PACS",
  "EHR",
  "external",
  "patient_portal",
  "device_gateway",
  "manual_entry",
]);

export const ingestionMethodSchema = z.enum([
  "api",
  "upload",
  "stream",
  "bulk_import",
  "manual_capture",
]);

export const rawFormatSchema = z.enum([
  "pdf",
  "dicom",
  "json",
  "txt",
  "hl7",
  "fhir",
  "csv",
  "image",
]);

export const sensitivityClassSchema = z.enum([
  "public",
  "internal",
  "confidential",
  "restricted",
  "highly_sensitive",
]);

export const ingestionStatusSchema = z.enum([
  "received",
  "classified",
  "parsed",
  "certified",
  "failed",
  "quarantined",
]);

export const variableTypeSchema = z.enum([
  "lab",
  "diagnosis",
  "measurement",
  "procedure",
  "medication",
  "device",
  "odd",
  "pri",
  "consent",
  "note",
]);

export const extractionMethodSchema = z.enum([
  "hl7",
  "fhir",
  "json_path",
  "pdf_parser",
  "ocr",
  "dicom_metadata",
  "dicom_measurement",
  "nlp",
  "manual",
]);

export const reliabilityLevelSchema = z.enum([
  "low",
  "moderate",
  "high",
  "validated_internal",
]);

export const completenessStatusSchema = z.enum(["complete", "partial", "missing"]);
export const semanticValiditySchema = z.enum(["valid", "invalid", "requires_review"]);
export const certificationStatusSchema = z.enum(["PASS", "FAIL", "PARTIAL"]);

export const ingestedDocumentSchema = z.object({
  documentId: z.string().min(1),
  caseId: z.string().min(1),
  episodeId: z.string().min(1).optional(),
  ilcId: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  fileName: z.string().min(1).optional(),
  documentType: documentTypeSchema,
  sourceSystem: sourceSystemSchema,
  ingestionMethod: ingestionMethodSchema,
  rawFormat: rawFormatSchema,
  language: z.string().min(2).optional(),
  sensitivityClass: sensitivityClassSchema,
  sensitivityReason: z.string().min(1).optional(),
  ingestionTimestamp: z.coerce.date(),
  rawHash: z.string().min(32),
  storageObjectId: z.string().min(1),
  minioBucket: z.string().min(1).optional(),
  minioObjectKey: z.string().min(1).optional(),
  storageUrl: z.string().min(1).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  ingestionStatus: ingestionStatusSchema,
});

export const parsedVariableSchema = z.object({
  parsedVariableId: z.string().min(1),
  documentId: z.string().min(1),
  variableType: variableTypeSchema,
  variableName: z.string().min(1),
  rawText: z.string().min(1),
  normalizedValue: z.union([z.string(), z.number(), z.boolean(), z.record(z.any()), z.array(z.any()), z.null()]).optional(),
  unit: z.string().min(1).optional(),
  terminologyCode: z.string().min(1).optional(),
  terminologySystem: z.string().min(1).optional(),
  parsingConfidence: z.number().min(0).max(1),
  extractionMethod: extractionMethodSchema,
  manualOverrideFlag: z.boolean().default(false),
  timestampExtracted: z.coerce.date(),
});

export const provenanceRecordSchema = z.object({
  provenanceId: z.string().min(1),
  parsedVariableId: z.string().min(1),
  sourceDocumentId: z.string().min(1),
  sourceSystem: sourceSystemSchema,
  acquisitionMethod: z.string().min(1),
  operatorId: z.string().min(1).optional(),
  institutionId: z.string().min(1).optional(),
  timestampAcquired: z.coerce.date().optional(),
  timestampRecorded: z.coerce.date().optional(),
  methodDescription: z.string().optional(),
  reliabilityLevel: reliabilityLevelSchema,
  calibrationReference: z.string().optional(),
  transformationHistory: z.array(z.string()).default([]),
});

export const terminologyMappingSchema = z.object({
  mappingId: z.string().min(1),
  parsedVariableId: z.string().min(1).optional(),
  sourceValue: z.string().min(1),
  sourceSystem: z.string().min(1),
  normalizedCode: z.string().min(1),
  normalizedSystem: z.string().min(1),
  mappingConfidence: z.number().min(0).max(1),
  mappingMethod: z.string().min(1),
  canonicalTerm: z.string().min(1),
  versionRegistryReference: z.string().min(1),
});

export const dataCertificationRecordSchema = z.object({
  certificationId: z.string().min(1),
  caseId: z.string().min(1),
  parsedVariableId: z.string().min(1),
  completenessStatus: completenessStatusSchema,
  semanticValidity: semanticValiditySchema,
  sourceVerified: z.boolean(),
  reliabilityScore: z.number().min(0).max(1),
  sensitivityClass: sensitivityClassSchema,
  timestampCertified: z.coerce.date(),
  certifierId: z.string().min(1),
  certificationHash: z.string().min(32),
  certificationVersion: z.string().min(1),
});

export const terminologyCatalogEntrySchema = z.object({
  canonicalKey: z.string().min(1),
  display: z.string().min(1),
  category: z.enum(["diagnosis", "lab", "measurement", "medication", "consent"]),
  synonyms: z.array(z.string().min(1)).min(1),
  systems: z.array(
    z.object({
      system: z.enum(["ICD-10", "SNOMED", "LOINC", "UCUM"]),
      code: z.string().min(1),
      display: z.string().min(1),
    }),
  ).min(1),
});

export const terminologyLookupResponseSchema = z.object({
  query: z.string().min(1),
  matches: z.array(terminologyCatalogEntrySchema),
});

export const ingestionEventSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.literal("document.ingested"),
  caseId: z.string().min(1),
  documentId: z.string().min(1),
  emittedAt: z.coerce.date(),
  payload: z.record(z.unknown()),
});

export const datasetStatusSchema = z.object({
  caseId: z.string().min(1),
  certificationStatus: certificationStatusSchema,
  blockingReasons: z.array(z.string()),
  missingVariables: z.array(z.string()),
  lastCertificationTimestamp: z.coerce.date(),
  readinessForEte: z.boolean(),
  dataCompletenessIndex: z.number().min(0).max(100),
  dataReliabilityTier: z.string().min(1),
  eteEligibleVariableIds: z.array(z.string()),
  softFlags: z.array(z.string()),
});

export const block2OverviewSchema = z.object({
  services: z.array(serviceHealthSchema),
  documents: z.array(ingestedDocumentSchema),
  parsedVariables: z.array(parsedVariableSchema),
  provenanceRecords: z.array(provenanceRecordSchema),
  terminologyMappings: z.array(terminologyMappingSchema),
  certificationRecords: z.array(dataCertificationRecordSchema),
  datasetStatus: datasetStatusSchema,
  ingestionEvents: z.array(ingestionEventSchema),
  terminologyCatalog: z.array(terminologyCatalogEntrySchema),
});

export const certificationVariableInputSchema = z.object({
  parsedVariableId: z.string().min(1),
  variableName: z.string().min(1),
  mandatory: z.boolean().default(false),
  completenessStatus: completenessStatusSchema,
  semanticValidity: semanticValiditySchema,
  sourceVerified: z.boolean(),
  reliabilityScore: z.number().min(0).max(1),
  parsingConfidence: z.number().min(0).max(1),
  provenanceValid: z.boolean(),
  terminologyMapped: z.boolean(),
  unitValid: z.boolean().default(true),
  terminologyCodeValid: z.boolean().default(true),
  observedAt: z.coerce.date().optional(),
});

export const certificationEvaluationInputSchema = z.object({
  caseId: z.string().min(1),
  certifierId: z.string().min(1),
  certificationVersion: z.string().min(1),
  evaluatedAt: z.coerce.date().default(() => new Date()),
  staleAfterHours: z.number().positive().default(24 * 30),
  reliabilityTierThresholds: z
    .object({
      tier1: z.number().min(0).max(1).default(0.9),
      tier2: z.number().min(0).max(1).default(0.75),
    })
    .default({ tier1: 0.9, tier2: 0.75 }),
  variables: z.array(certificationVariableInputSchema).min(1),
});

export type CertificationEvaluationInput = z.infer<typeof certificationEvaluationInputSchema>;
export type DatasetStatus = z.infer<typeof datasetStatusSchema>;

const isStale = (observedAt: Date | undefined, staleAfterHours: number, evaluatedAt: Date) => {
  if (!observedAt) {
    return false;
  }

  return evaluatedAt.getTime() - observedAt.getTime() > staleAfterHours * 60 * 60 * 1000;
};

export function evaluateDatasetCertification(
  rawInput: CertificationEvaluationInput,
): DatasetStatus {
  const input = certificationEvaluationInputSchema.parse(rawInput);
  const blockingReasons = new Set<string>();
  const missingVariables = new Set<string>();
  const softFlags = new Set<string>();
  const eteEligibleVariableIds: string[] = [];

  let completeCount = 0;
  let cumulativeReliability = 0;

  for (const variable of input.variables) {
    cumulativeReliability += variable.reliabilityScore;

    if (variable.completenessStatus === "complete") {
      completeCount += 1;
    }

    if (variable.mandatory && variable.completenessStatus === "missing") {
      blockingReasons.add(`mandatory_variable_missing:${variable.variableName}`);
      missingVariables.add(variable.variableName);
    }

    if (variable.semanticValidity === "invalid") {
      blockingReasons.add(`semantic_invalid:${variable.variableName}`);
    }

    if (!variable.unitValid) {
      blockingReasons.add(`invalid_unit:${variable.variableName}`);
    }

    if (!variable.terminologyCodeValid || !variable.terminologyMapped) {
      blockingReasons.add(`invalid_terminology:${variable.variableName}`);
    }

    if (variable.parsingConfidence < 0.75) {
      softFlags.add(`weak_parsing:${variable.variableName}`);
    }

    if (variable.reliabilityScore < 0.7) {
      softFlags.add(`low_reliability:${variable.variableName}`);
    }

    if (isStale(variable.observedAt, input.staleAfterHours, input.evaluatedAt)) {
      softFlags.add(`stale_data:${variable.variableName}`);
    }

    if (
      variable.completenessStatus !== "missing" &&
      variable.semanticValidity === "valid" &&
      variable.provenanceValid &&
      variable.terminologyMapped &&
      variable.unitValid &&
      variable.terminologyCodeValid
    ) {
      eteEligibleVariableIds.push(variable.parsedVariableId);
    }
  }

  const dataCompletenessIndex = Number(
    ((completeCount / input.variables.length) * 100).toFixed(1),
  );
  const averageReliability = cumulativeReliability / input.variables.length;

  const dataReliabilityTier =
    averageReliability >= input.reliabilityTierThresholds.tier1
      ? "Nivel 1 (interno validado)"
      : averageReliability >= input.reliabilityTierThresholds.tier2
        ? "Nivel 2 (revisión requerida)"
        : "Nivel 3 (confiabilidad limitada)";

  const certificationStatus =
    blockingReasons.size > 0
      ? "FAIL"
      : softFlags.size > 0
        ? "PARTIAL"
        : "PASS";

  return datasetStatusSchema.parse({
    caseId: input.caseId,
    certificationStatus,
    blockingReasons: [...blockingReasons],
    missingVariables: [...missingVariables],
    lastCertificationTimestamp: input.evaluatedAt,
    readinessForEte: certificationStatus === "PASS",
    dataCompletenessIndex,
    dataReliabilityTier,
    eteEligibleVariableIds,
    softFlags: [...softFlags],
  });
}

export const cabgBlock2Fixture = certificationEvaluationInputSchema.parse({
  caseId: "case-cabg-x3",
  certifierId: "dg-engine",
  certificationVersion: "block2.v1",
  evaluatedAt: new Date("2026-03-28T12:00:00.000Z"),
  variables: [
    {
      parsedVariableId: "pv-troponin",
      variableName: "troponina",
      mandatory: true,
      completenessStatus: "complete",
      semanticValidity: "valid",
      sourceVerified: true,
      reliabilityScore: 0.98,
      parsingConfidence: 0.97,
      provenanceValid: true,
      terminologyMapped: true,
      unitValid: true,
      terminologyCodeValid: true,
      observedAt: new Date("2026-03-28T08:00:00.000Z"),
    },
    {
      parsedVariableId: "pv-creatinine",
      variableName: "creatinina",
      mandatory: true,
      completenessStatus: "complete",
      semanticValidity: "valid",
      sourceVerified: true,
      reliabilityScore: 0.95,
      parsingConfidence: 0.94,
      provenanceValid: true,
      terminologyMapped: true,
      unitValid: true,
      terminologyCodeValid: true,
      observedAt: new Date("2026-03-28T08:00:00.000Z"),
    },
    {
      parsedVariableId: "pv-hba1c",
      variableName: "HbA1c",
      mandatory: true,
      completenessStatus: "complete",
      semanticValidity: "valid",
      sourceVerified: true,
      reliabilityScore: 0.94,
      parsingConfidence: 0.93,
      provenanceValid: true,
      terminologyMapped: true,
      unitValid: true,
      terminologyCodeValid: true,
      observedAt: new Date("2026-03-28T08:00:00.000Z"),
    },
    {
      parsedVariableId: "pv-fevi",
      variableName: "FEVI",
      mandatory: true,
      completenessStatus: "complete",
      semanticValidity: "valid",
      sourceVerified: true,
      reliabilityScore: 0.94,
      parsingConfidence: 0.91,
      provenanceValid: true,
      terminologyMapped: true,
      unitValid: true,
      terminologyCodeValid: true,
      observedAt: new Date("2026-03-28T09:00:00.000Z"),
    },
  ],
});
