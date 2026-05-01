import { createHash, randomUUID } from "node:crypto";
// @ts-nocheck
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { evaluateDatasetCertification } from "@icicso/contracts";
import { getCase } from "./block1-store";

type StoredDocument = {
  documentId: string;
  caseId: string;
  episodeId?: string;
  ilcId?: string;
  title?: string;
  fileName?: string;
  documentType: "lab" | "imaging" | "note" | "external" | "consent" | "medication" | "procedure" | "device" | "dynamic_odd" | "dynamic_pri";
  sourceSystem: "LIS" | "PACS" | "EHR" | "external" | "patient_portal" | "device_gateway" | "manual_entry";
  ingestionMethod: "api" | "upload" | "stream" | "bulk_import" | "manual_capture";
  rawFormat: "pdf" | "dicom" | "json" | "txt" | "hl7" | "fhir" | "csv" | "image";
  language?: string;
  sensitivityClass: "public" | "internal" | "confidential" | "restricted" | "highly_sensitive";
  sensitivityReason?: string;
  ingestionTimestamp: string;
  rawHash: string;
  storageObjectId: string;
  minioBucket: string;
  minioObjectKey: string;
  storageUrl: string;
  sizeBytes: number;
  ingestionStatus: "received" | "classified" | "parsed" | "certified" | "failed" | "quarantined";
  payload: unknown;
};

type StoredParsedVariable = {
  parsedVariableId: string;
  documentId: string;
  variableType: "lab" | "diagnosis" | "measurement" | "procedure" | "medication" | "device" | "odd" | "pri" | "consent" | "note";
  variableName: string;
  rawText: string;
  normalizedValue?: string | number | boolean | Record<string, unknown> | unknown[] | null;
  unit?: string;
  terminologyCode?: string;
  terminologySystem?: string;
  parsingConfidence: number;
  extractionMethod: "hl7" | "fhir" | "json_path" | "pdf_parser" | "ocr" | "dicom_metadata" | "dicom_measurement" | "nlp" | "manual";
  manualOverrideFlag: boolean;
  timestampExtracted: string;
};

type StoredProvenanceRecord = {
  provenanceId: string;
  parsedVariableId: string;
  sourceDocumentId: string;
  sourceSystem: StoredDocument["sourceSystem"];
  acquisitionMethod: string;
  operatorId?: string;
  institutionId?: string;
  timestampAcquired?: string;
  timestampRecorded?: string;
  methodDescription?: string;
  reliabilityLevel: "low" | "moderate" | "high" | "validated_internal";
  calibrationReference?: string;
  transformationHistory: string[];
};

type StoredTerminologyMapping = {
  mappingId: string;
  parsedVariableId?: string;
  sourceValue: string;
  sourceSystem: string;
  normalizedCode: string;
  normalizedSystem: string;
  mappingConfidence: number;
  mappingMethod: string;
  canonicalTerm: string;
  versionRegistryReference: string;
};

type StoredCertificationRecord = {
  certificationId: string;
  caseId: string;
  parsedVariableId: string;
  completenessStatus: "complete" | "partial" | "missing";
  semanticValidity: "valid" | "invalid" | "requires_review";
  sourceVerified: boolean;
  reliabilityScore: number;
  sensitivityClass: StoredDocument["sensitivityClass"];
  timestampCertified: string;
  certifierId: string;
  certificationHash: string;
  certificationVersion: string;
};

type StoredDatasetStatus = {
  caseId: string;
  certificationStatus: "PASS" | "FAIL" | "PARTIAL";
  blockingReasons: string[];
  missingVariables: string[];
  lastCertificationTimestamp: string;
  readinessForEte: boolean;
  dataCompletenessIndex: number;
  dataReliabilityTier: string;
  eteEligibleVariableIds: string[];
  softFlags: string[];
};

type StoredIngestionEvent = {
  eventId: string;
  eventType: "document.ingested";
  caseId: string;
  documentId: string;
  emittedAt: string;
  payload: Record<string, unknown>;
};

type TerminologyCatalogEntry = {
  canonicalKey: string;
  display: string;
  category: "diagnosis" | "lab" | "measurement" | "medication" | "consent";
  synonyms: string[];
  systems: Array<{
    system: "ICD-10" | "SNOMED" | "LOINC" | "UCUM";
    code: string;
    display: string;
  }>;
};

type TerminologySourceRegistryEntry = {
  sourceId: string;
  datasetId: string;
  standard: string;
  subtopic: string;
  versionOrDate: string;
  format: string;
  officialSource: string;
  officialUrl: string;
  accessLicense: string;
  priority: string;
  operationalStatus: string;
  downloadObservation: string;
  dbTarget: string;
  ingestStrategy: string;
};

type Block2Store = {
  documents: StoredDocument[];
  parsedVariables: StoredParsedVariable[];
  provenanceRecords: StoredProvenanceRecord[];
  terminologyMappings: StoredTerminologyMapping[];
  certificationRecords: StoredCertificationRecord[];
  datasetStatuses: StoredDatasetStatus[];
  ingestionEvents: StoredIngestionEvent[];
  terminologyCatalog: TerminologyCatalogEntry[];
  essentialVariables: string[];
};

type UploadMetadataInput = {
  caseId: string;
  episodeId?: string;
  ilcId?: string;
  title?: string;
  fileName?: string;
  documentType: StoredDocument["documentType"];
  sourceSystem: StoredDocument["sourceSystem"];
  ingestionMethod: StoredDocument["ingestionMethod"];
  rawFormat: StoredDocument["rawFormat"];
  language?: string;
  payload?: unknown;
};

type IngestionInput = {
  caseId: string;
  episodeId?: string;
  ilcId?: string;
  title?: string;
  fileName?: string;
  documentType: StoredDocument["documentType"];
  sourceSystem: StoredDocument["sourceSystem"];
  ingestionMethod?: StoredDocument["ingestionMethod"];
  rawFormat?: StoredDocument["rawFormat"];
  language?: string;
  payload: unknown;
};

type ParsedCandidate = {
  variableType: StoredParsedVariable["variableType"];
  variableName: string;
  rawText: string;
  normalizedValue?: StoredParsedVariable["normalizedValue"];
  unit?: string;
  parsingConfidence: number;
  extractionMethod: StoredParsedVariable["extractionMethod"];
  reliabilityLevel: StoredProvenanceRecord["reliabilityLevel"];
  observedAt?: string;
  transformationHistory: string[];
};

const DEMO_CASE_ID = "CASE-CABG3-2026-00014";
const DEMO_EPISODE_ID = "EPI-ACS-2026-02-15";
const DEMO_ILC_ID = "ILC-MX-CIH-2026-0004821";
const MINIO_BUCKET = process.env.MINIO_BUCKET ?? "icicso-block2";
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT ?? "http://127.0.0.1:9000";

const terminologyCatalog: TerminologyCatalogEntry[] = [
  {
    canonicalKey: "nstemi",
    display: "NSTEMI",
    category: "diagnosis",
    synonyms: ["NSTEMI", "IAMSEST", "infarto agudo de miocardio sin elevacion del st"],
    systems: [
      { system: "ICD-10", code: "I21.4", display: "Non-ST elevation myocardial infarction" },
      { system: "SNOMED", code: "57054005", display: "Acute non-ST segment elevation myocardial infarction" },
    ],
  },
  {
    canonicalKey: "cad multivaso",
    display: "CAD multivaso",
    category: "diagnosis",
    synonyms: ["CAD multivaso", "enfermedad coronaria multivaso", "multivessel coronary artery disease"],
    systems: [
      { system: "ICD-10", code: "I25.10", display: "Atherosclerotic heart disease" },
      { system: "SNOMED", code: "194828000", display: "Triple vessel coronary artery disease" },
    ],
  },
  {
    canonicalKey: "dm2",
    display: "DM2",
    category: "diagnosis",
    synonyms: ["DM2", "diabetes mellitus tipo 2", "type 2 diabetes mellitus"],
    systems: [
      { system: "ICD-10", code: "E11.9", display: "Type 2 diabetes mellitus without complications" },
      { system: "SNOMED", code: "44054006", display: "Type 2 diabetes mellitus" },
    ],
  },
  {
    canonicalKey: "erc estadio 3",
    display: "ERC estadio 3",
    category: "diagnosis",
    synonyms: ["ERC 3", "ERC estadio 3", "enfermedad renal cronica estadio 3", "ckd stage 3"],
    systems: [
      { system: "ICD-10", code: "N18.30", display: "Chronic kidney disease, stage 3 unspecified" },
      { system: "SNOMED", code: "433144002", display: "Chronic kidney disease stage 3" },
    ],
  },
  {
    canonicalKey: "hta",
    display: "HTA",
    category: "diagnosis",
    synonyms: ["HTA", "hipertension arterial", "hypertension"],
    systems: [
      { system: "ICD-10", code: "I10", display: "Essential primary hypertension" },
      { system: "SNOMED", code: "38341003", display: "Hypertensive disorder" },
    ],
  },
  {
    canonicalKey: "troponina",
    display: "Troponina",
    category: "lab",
    synonyms: ["troponina", "troponina hs", "high sensitivity troponin"],
    systems: [
      { system: "LOINC", code: "89579-7", display: "Troponin I.cardiac [Mass/volume] in Serum or Plasma by High sensitivity method" },
      { system: "UCUM", code: "ng/L", display: "nanogram per liter" },
    ],
  },
  {
    canonicalKey: "creatinina",
    display: "Creatinina",
    category: "lab",
    synonyms: ["creatinina", "serum creatinine"],
    systems: [
      { system: "LOINC", code: "2160-0", display: "Creatinine [Mass/volume] in Serum or Plasma" },
      { system: "UCUM", code: "mg/dL", display: "milligram per deciliter" },
    ],
  },
  {
    canonicalKey: "hba1c",
    display: "HbA1c",
    category: "lab",
    synonyms: ["hba1c", "hemoglobina glucosilada", "hemoglobina glicosilada", "glycated hemoglobin"],
    systems: [
      { system: "LOINC", code: "4548-4", display: "Hemoglobin A1c/Hemoglobin.total in Blood" },
      { system: "UCUM", code: "%", display: "percent" },
    ],
  },
  {
    canonicalKey: "fevi",
    display: "FEVI",
    category: "measurement",
    synonyms: ["fevi", "lvef", "fraccion de eyeccion del ventriculo izquierdo"],
    systems: [
      { system: "LOINC", code: "33878-0", display: "Left ventricular ejection fraction by US" },
      { system: "UCUM", code: "%", display: "percent" },
    ],
  },
  {
    canonicalKey: "medicacion activa",
    display: "Medicación activa",
    category: "medication",
    synonyms: ["medicacion activa", "active medication", "tratamiento activo"],
    systems: [{ system: "SNOMED", code: "182904002", display: "Drug therapy" }],
  },
  {
    canonicalKey: "consentimiento base",
    display: "Consentimiento base",
    category: "consent",
    synonyms: ["consentimiento base", "consentimiento informado", "base consent"],
    systems: [{ system: "SNOMED", code: "309370004", display: "Consent given for procedure" }],
  },
];

const essentialVariables = [
  "nstemi",
  "cad multivaso",
  "dm2",
  "erc estadio 3",
  "hta",
  "troponina",
  "creatinina",
  "hba1c",
  "fevi",
  "medicacion activa",
  "consentimiento base",
] as const;

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
  return join(dataDir, "block2-store.json");
}

function sha256(value: unknown) {
  return createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9%./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildObjectLocation(caseId: string, documentType: string, rawFormat: string, rawHash: string) {
  const minioObjectKey = `${caseId}/${documentType}/${rawHash.slice(0, 16)}.${rawFormat}`;
  const normalizedEndpoint = MINIO_ENDPOINT.replace(/\/$/, "");
  return {
    minioBucket: MINIO_BUCKET,
    minioObjectKey,
    storageObjectId: `minio://${MINIO_BUCKET}/${minioObjectKey}`,
    storageUrl: `${normalizedEndpoint}/${MINIO_BUCKET}/${minioObjectKey}`,
  };
}

function classifySensitivity(documentType: StoredDocument["documentType"], payload: unknown) {
  const serialized = normalizeText(JSON.stringify(payload));
  if (documentType === "consent" || serialized.includes("consentimiento") || serialized.includes("firma")) {
    return {
      sensitivityClass: "highly_sensitive" as const,
      sensitivityReason: "Incluye consentimiento o autorizacion clinica firmada.",
    };
  }
  if (documentType === "lab" || documentType === "imaging" || documentType === "medication") {
    return {
      sensitivityClass: "restricted" as const,
      sensitivityReason: "Contiene datos clinicos directos y resultados observacionales.",
    };
  }
  return {
    sensitivityClass: "confidential" as const,
    sensitivityReason: "Metadata documental con identificacion de caso clinico.",
  };
}

function parseNumeric(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const match = value.replace(",", ".").match(/-?\d+(\.\d+)?/);
    if (match) {
      return Number(match[0]);
    }
  }
  return null;
}

function parseArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function stringifyValue(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function findCatalogEntry(query: string) {
  const normalized = normalizeText(query);
  return terminologyCatalog.find((entry) =>
    entry.synonyms.some((synonym) => normalized === normalizeText(synonym) || normalized.includes(normalizeText(synonym))),
  ) ?? null;
}

function lookupTerminology(query: string) {
  const normalized = normalizeText(query);
  return terminologyCatalog.filter((entry) =>
    entry.synonyms.some((synonym) => normalizeText(synonym).includes(normalized) || normalized.includes(normalizeText(synonym))),
  );
}

function findTerminologySourceCatalogPath() {
  const root = findRoot();
  const candidates = [
    join(root, "ICICSO_TERMINOLOGIAS", "00_METADATA", "sources_catalog.tsv"),
    join(dirname(root), "ICICSO_TERMINOLOGIAS", "00_METADATA", "sources_catalog.tsv"),
    join(process.cwd(), "ICICSO_TERMINOLOGIAS", "00_METADATA", "sources_catalog.tsv"),
    join(dirname(process.cwd()), "ICICSO_TERMINOLOGIAS", "00_METADATA", "sources_catalog.tsv"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function parseTerminologySourcesCatalog() {
  const catalogPath = findTerminologySourceCatalogPath();
  if (!catalogPath) return [] as TerminologySourceRegistryEntry[];

  const [headerLine, ...lines] = readFileSync(catalogPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const headers = headerLine.split("\t");
  return lines.map((line) => {
    const cells = line.split("\t");
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    return {
      sourceId: row.source_id,
      datasetId: row.dataset_id,
      standard: row.estandar,
      subtopic: row.subtema,
      versionOrDate: row.version_o_fecha,
      format: row.formato,
      officialSource: row.fuente_oficial,
      officialUrl: row.enlace_oficial,
      accessLicense: row.acceso_o_licencia,
      priority: row.prioridad,
      operationalStatus: row.estado_operativo,
      downloadObservation: row.observacion_de_descarga,
      dbTarget: row.db_target,
      ingestStrategy: row.ingest_strategy,
    };
  });
}

function primaryCodingForCategory(entry: TerminologyCatalogEntry) {
  if (entry.category === "diagnosis") {
    return entry.systems.find((item) => item.system === "SNOMED") ?? entry.systems[0];
  }
  if (entry.category === "lab" || entry.category === "measurement") {
    return entry.systems.find((item) => item.system === "LOINC") ?? entry.systems[0];
  }
  return entry.systems.find((item) => item.system === "SNOMED") ?? entry.systems[0];
}

function reliabilityScore(level: StoredProvenanceRecord["reliabilityLevel"], confidence: number) {
  const base = { low: 0.58, moderate: 0.74, high: 0.88, validated_internal: 0.97 }[level];
  return Number(Math.min(0.99, Math.max(0.5, base * 0.6 + confidence * 0.4)).toFixed(2));
}

function extractDiagnoses(payload: unknown) {
  const candidates: ParsedCandidate[] = [];
  const source = typeof payload === "object" && payload ? payload as Record<string, unknown> : {};
  const list = [...parseArray(source.diagnoses), ...parseArray(source.conditions), ...parseArray(source.problems)];
  const freeText = stringifyValue(payload);

  for (const item of list) {
    const text = typeof item === "string"
      ? item
      : typeof item === "object" && item
        ? String((item as Record<string, unknown>).display ?? (item as Record<string, unknown>).name ?? (item as Record<string, unknown>).diagnosis ?? "")
        : "";
    const match = findCatalogEntry(text);
    if (match && match.category === "diagnosis") {
      candidates.push({
        variableType: "diagnosis",
        variableName: match.display,
        rawText: text,
        normalizedValue: match.display,
        parsingConfidence: 0.96,
        extractionMethod: "json_path",
        reliabilityLevel: "validated_internal",
        transformationHistory: ["structured.diagnoses"],
      });
    }
  }

  for (const entry of terminologyCatalog.filter((item) => item.category === "diagnosis")) {
    if (normalizeText(freeText).includes(normalizeText(entry.display)) || entry.synonyms.some((synonym) => normalizeText(freeText).includes(normalizeText(synonym)))) {
      if (!candidates.some((candidate) => normalizeText(candidate.variableName) === normalizeText(entry.display))) {
        candidates.push({
          variableType: "diagnosis",
          variableName: entry.display,
          rawText: entry.display,
          normalizedValue: entry.display,
          parsingConfidence: 0.84,
          extractionMethod: "nlp",
          reliabilityLevel: "high",
          transformationHistory: ["text.scan"],
        });
      }
    }
  }

  return candidates;
}

function extractLabs(payload: unknown) {
  const candidates: ParsedCandidate[] = [];
  const source = typeof payload === "object" && payload ? payload as Record<string, unknown> : {};
  const observations = [...parseArray(source.labs), ...parseArray(source.observations), ...parseArray(source.results)];

  for (const item of observations) {
    const record = typeof item === "object" && item ? item as Record<string, unknown> : {};
    const name = String(record.name ?? record.test ?? record.code ?? "");
    const value = parseNumeric(record.value ?? record.result);
    const unit = typeof record.unit === "string" ? record.unit : undefined;
    const match = findCatalogEntry(name);
    if (!match || match.category !== "lab" || value === null) {
      continue;
    }

    candidates.push({
      variableType: "lab",
      variableName: match.display,
      rawText: `${name}: ${value}${unit ? ` ${unit}` : ""}`,
      normalizedValue: value,
      unit,
      parsingConfidence: 0.97,
      extractionMethod: "json_path",
      reliabilityLevel: "validated_internal",
      transformationHistory: ["structured.observations"],
      observedAt: typeof record.observedAt === "string" ? record.observedAt : undefined,
    });
  }

  const text = stringifyValue(payload);
  const patterns = [
    { term: "troponina", regex: /troponina(?:\s*hs)?[:\s]+(\d+(?:[.,]\d+)?)\s*(ng\/l)/i },
    { term: "creatinina", regex: /creatinina[:\s]+(\d+(?:[.,]\d+)?)\s*(mg\/dl)/i },
    { term: "hba1c", regex: /(?:hba1c|hemoglobina glucos(?:il|i)ada)[:\s]+(\d+(?:[.,]\d+)?)\s*(%)/i },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    const catalog = findCatalogEntry(pattern.term);
    if (!match || !catalog || candidates.some((item) => normalizeText(item.variableName) === normalizeText(catalog.display))) {
      continue;
    }
    candidates.push({
      variableType: "lab",
      variableName: catalog.display,
      rawText: match[0],
      normalizedValue: Number(match[1].replace(",", ".")),
      unit: match[2],
      parsingConfidence: 0.86,
      extractionMethod: "pdf_parser",
      reliabilityLevel: "high",
      transformationHistory: ["regex.text"],
    });
  }

  return candidates;
}

function extractImaging(payload: unknown) {
  const candidates: ParsedCandidate[] = [];
  const source = typeof payload === "object" && payload ? payload as Record<string, unknown> : {};
  const measurements = typeof source.measurements === "object" && source.measurements ? source.measurements as Record<string, unknown> : {};
  const fevi = typeof measurements.fevi === "object" && measurements.fevi ? measurements.fevi as Record<string, unknown> : {};
  const value = parseNumeric(fevi.value ?? source.fevi ?? source.lvef);
  const unit = typeof fevi.unit === "string" ? fevi.unit : "%";

  if (value !== null) {
    candidates.push({
      variableType: "measurement",
      variableName: "FEVI",
      rawText: `FEVI ${value}${unit}`,
      normalizedValue: value,
      unit,
      parsingConfidence: 0.96,
      extractionMethod: "dicom_measurement",
      reliabilityLevel: "validated_internal",
      transformationHistory: ["structured.measurements.fevi"],
      observedAt: typeof source.studyDate === "string" ? source.studyDate : undefined,
    });
  } else {
    const text = stringifyValue(payload);
    const match = text.match(/(?:fevi|lvef)[^\d]{0,12}(\d+(?:[.,]\d+)?)\s*(%)/i);
    if (match) {
      candidates.push({
        variableType: "measurement",
        variableName: "FEVI",
        rawText: match[0],
        normalizedValue: Number(match[1].replace(",", ".")),
        unit: match[2],
        parsingConfidence: 0.85,
        extractionMethod: "dicom_metadata",
        reliabilityLevel: "high",
        transformationHistory: ["regex.imaging"],
      });
    }
  }

  return candidates;
}

function extractMedications(payload: unknown) {
  const source = typeof payload === "object" && payload ? payload as Record<string, unknown> : {};
  const medications = [...parseArray(source.medications), ...parseArray(source.activeMedications)];
  const names = medications
    .map((item) =>
      typeof item === "string"
        ? item
        : typeof item === "object" && item
          ? String((item as Record<string, unknown>).name ?? (item as Record<string, unknown>).display ?? "")
          : "",
    )
    .filter((item) => item.length > 0);

  if (names.length === 0 && !normalizeText(stringifyValue(payload)).includes("medicacion")) {
    return [];
  }

  const candidate: ParsedCandidate = {
      variableType: "medication",
      variableName: "Medicación activa",
      rawText: names.length > 0 ? names.join(", ") : stringifyValue(payload),
      normalizedValue: names,
      parsingConfidence: names.length > 0 ? 0.94 : 0.78,
      extractionMethod: names.length > 0 ? "json_path" : "nlp",
      reliabilityLevel: names.length > 0 ? "validated_internal" : "moderate",
      transformationHistory: [names.length > 0 ? "structured.medications" : "text.medication"],
  };

  return [candidate];
}

function extractConsent(payload: unknown) {
  const source = typeof payload === "object" && payload ? payload as Record<string, unknown> : {};
  const granted = typeof source.consentGranted === "boolean"
    ? source.consentGranted
    : normalizeText(stringifyValue(payload)).includes("consentimiento");
  if (!granted) {
    return [];
  }

  const candidate: ParsedCandidate = {
      variableType: "consent",
      variableName: "Consentimiento base",
      rawText: typeof source.statement === "string" ? source.statement : "Consentimiento informado basal registrado.",
      normalizedValue: true,
      parsingConfidence: typeof source.consentGranted === "boolean" ? 0.95 : 0.8,
      extractionMethod: typeof source.consentGranted === "boolean" ? "json_path" : "nlp",
      reliabilityLevel: "high",
      transformationHistory: ["structured.consent"],
  };

  return [candidate];
}

function parsePayload(documentType: StoredDocument["documentType"], payload: unknown) {
  if (documentType === "lab") {
    return extractLabs(payload);
  }
  if (documentType === "imaging") {
    return extractImaging(payload);
  }
  if (documentType === "medication") {
    return extractMedications(payload);
  }
  if (documentType === "consent") {
    return extractConsent(payload);
  }
  return extractDiagnoses(payload);
}

function addMappings(store: Block2Store, parsedVariable: StoredParsedVariable) {
  const direct = findCatalogEntry(parsedVariable.variableName) ?? findCatalogEntry(parsedVariable.rawText);
  const matches = direct ? [direct] : lookupTerminology(parsedVariable.variableName);
  const created: StoredTerminologyMapping[] = [];

  for (const entry of matches) {
    for (const coding of entry.systems) {
      if (
        (coding.system === "UCUM" && parsedVariable.unit && normalizeText(parsedVariable.unit) !== normalizeText(coding.code)) ||
        created.some((item) => item.normalizedSystem === coding.system && item.normalizedCode === coding.code)
      ) {
        continue;
      }

      created.push({
        mappingId: `map-${randomUUID()}`,
        parsedVariableId: parsedVariable.parsedVariableId,
        sourceValue: parsedVariable.variableName,
        sourceSystem: parsedVariable.variableType,
        normalizedCode: coding.code,
        normalizedSystem: coding.system,
        mappingConfidence: coding.system === "UCUM" ? 0.99 : 0.95,
        mappingMethod: coding.system === "UCUM" ? "unit-match" : "catalog-match",
        canonicalTerm: entry.display,
        versionRegistryReference: "block2.demo.v1",
      });
    }

    const primary = primaryCodingForCategory(entry);
    parsedVariable.terminologyCode = primary.code;
    parsedVariable.terminologySystem = primary.system;
  }

  store.terminologyMappings.push(...created);
  return created;
}

function certifyCase(store: Block2Store, caseId: string) {
  const documents = store.documents.filter((item) => item.caseId === caseId);
  const documentMap = new Map(documents.map((item) => [item.documentId, item]));
  const parsedVariables = store.parsedVariables.filter((item) => {
    const document = documentMap.get(item.documentId);
    return document?.caseId === caseId;
  });
  const provenanceByVariable = new Map(
    store.provenanceRecords
      .filter((item) => parsedVariables.some((variable) => variable.parsedVariableId === item.parsedVariableId))
      .map((item) => [item.parsedVariableId, item]),
  );
  const mappingsByVariable = new Map<string, StoredTerminologyMapping[]>();

  for (const mapping of store.terminologyMappings) {
    if (!mapping.parsedVariableId) {
      continue;
    }
    const bucket = mappingsByVariable.get(mapping.parsedVariableId) ?? [];
    bucket.push(mapping);
    mappingsByVariable.set(mapping.parsedVariableId, bucket);
  }

  store.certificationRecords = store.certificationRecords.filter((item) => item.caseId !== caseId);
  const certifierId = "data-governance-service";
  const timestampCertified = new Date().toISOString();

  for (const variable of parsedVariables) {
    const document = documentMap.get(variable.documentId);
    if (!document) {
      continue;
    }
    const provenance = provenanceByVariable.get(variable.parsedVariableId);
    const reliability = reliabilityScore(provenance?.reliabilityLevel ?? "moderate", variable.parsingConfidence);
    store.certificationRecords.push({
      certificationId: `cert-${randomUUID()}`,
      caseId,
      parsedVariableId: variable.parsedVariableId,
      completenessStatus: variable.normalizedValue === undefined || variable.normalizedValue === null ? "partial" : "complete",
      semanticValidity: mappingsByVariable.has(variable.parsedVariableId) ? "valid" : "requires_review",
      sourceVerified: Boolean(provenance),
      reliabilityScore: reliability,
      sensitivityClass: document.sensitivityClass,
      timestampCertified,
      certifierId,
      certificationHash: sha256({ caseId, parsedVariableId: variable.parsedVariableId, timestampCertified, reliability }),
      certificationVersion: "block2.v1",
    });
  }

  const variableByKey = new Map<string, StoredParsedVariable>();
  for (const variable of parsedVariables) {
    const entry = findCatalogEntry(variable.variableName) ?? findCatalogEntry(variable.rawText);
    if (entry) {
      variableByKey.set(entry.canonicalKey, variable);
    }
  }

  const evaluation = evaluateDatasetCertification({
    caseId,
    certifierId,
    certificationVersion: "block2.v1",
    evaluatedAt: new Date(timestampCertified),
    staleAfterHours: 24 * 45,
    reliabilityTierThresholds: {
      tier1: 0.9,
      tier2: 0.75,
    },
    variables: essentialVariables.map((key) => {
      const variable = variableByKey.get(key);
      const provenance = variable ? provenanceByVariable.get(variable.parsedVariableId) : undefined;
      const mappings = variable ? mappingsByVariable.get(variable.parsedVariableId) ?? [] : [];
      return {
        parsedVariableId: variable?.parsedVariableId ?? `missing:${key}`,
        variableName: key,
        mandatory: true,
        completenessStatus: variable ? "complete" : "missing",
        semanticValidity: variable ? (mappings.length > 0 ? "valid" : "requires_review") : "invalid",
        sourceVerified: Boolean(variable && provenance),
        reliabilityScore: variable ? reliabilityScore(provenance?.reliabilityLevel ?? "moderate", variable.parsingConfidence) : 0,
        parsingConfidence: variable?.parsingConfidence ?? 0,
        provenanceValid: Boolean(variable && provenance),
        terminologyMapped: mappings.length > 0,
        unitValid: variable?.unit ? mappings.some((item) => item.normalizedSystem === "UCUM") || !["troponina", "creatinina", "hba1c", "fevi"].includes(key) : true,
        terminologyCodeValid: mappings.some((item) => item.normalizedSystem !== "UCUM"),
        observedAt: variable?.timestampExtracted ? new Date(variable.timestampExtracted) : undefined,
      };
    }),
  });

  const status: StoredDatasetStatus = {
    caseId,
    certificationStatus: evaluation.certificationStatus,
    blockingReasons: evaluation.blockingReasons,
    missingVariables: evaluation.missingVariables,
    lastCertificationTimestamp: evaluation.lastCertificationTimestamp.toISOString(),
    readinessForEte: evaluation.readinessForEte,
    dataCompletenessIndex: evaluation.dataCompletenessIndex,
    dataReliabilityTier: evaluation.dataReliabilityTier,
    eteEligibleVariableIds: evaluation.eteEligibleVariableIds,
    softFlags: evaluation.softFlags,
  };

  const existingIndex = store.datasetStatuses.findIndex((item) => item.caseId === caseId);
  if (existingIndex >= 0) {
    store.datasetStatuses[existingIndex] = status;
  } else {
    store.datasetStatuses.push(status);
  }

  return status;
}

function pushParsedArtifacts(store: Block2Store, document: StoredDocument, candidates: ParsedCandidate[]) {
  const existingVariableIds = new Set(
    store.parsedVariables.filter((item) => item.documentId === document.documentId).map((item) => item.parsedVariableId),
  );
  store.parsedVariables = store.parsedVariables.filter((item) => item.documentId !== document.documentId);
  store.provenanceRecords = store.provenanceRecords.filter((item) => item.sourceDocumentId !== document.documentId);
  store.terminologyMappings = store.terminologyMappings.filter((item) => !item.parsedVariableId || !existingVariableIds.has(item.parsedVariableId));

  const parsedVariables: StoredParsedVariable[] = [];
  const provenanceRecords: StoredProvenanceRecord[] = [];

  for (const candidate of candidates) {
    const parsedVariable: StoredParsedVariable = {
      parsedVariableId: `pv-${randomUUID()}`,
      documentId: document.documentId,
      variableType: candidate.variableType,
      variableName: candidate.variableName,
      rawText: candidate.rawText,
      normalizedValue: candidate.normalizedValue,
      unit: candidate.unit,
      parsingConfidence: candidate.parsingConfidence,
      extractionMethod: candidate.extractionMethod,
      manualOverrideFlag: false,
      timestampExtracted: candidate.observedAt ?? document.ingestionTimestamp,
    };
    parsedVariables.push(parsedVariable);
    provenanceRecords.push({
      provenanceId: `prov-${randomUUID()}`,
      parsedVariableId: parsedVariable.parsedVariableId,
      sourceDocumentId: document.documentId,
      sourceSystem: document.sourceSystem,
      acquisitionMethod: `${document.ingestionMethod}:${candidate.extractionMethod}`,
      institutionId: "ICICSO-DEMO",
      timestampAcquired: candidate.observedAt ?? document.ingestionTimestamp,
      timestampRecorded: document.ingestionTimestamp,
      methodDescription: `Parsed from ${document.documentType} using ${candidate.extractionMethod}.`,
      reliabilityLevel: candidate.reliabilityLevel,
      transformationHistory: candidate.transformationHistory,
    });
    addMappings(store, parsedVariable);
  }

  store.parsedVariables.push(...parsedVariables);
  store.provenanceRecords.push(...provenanceRecords);
  document.ingestionStatus = "parsed";
  return parsedVariables;
}

function materializeDocument(input: UploadMetadataInput) {
  const caseRecord = getCase(input.caseId);
  if (!caseRecord) {
    throw new Error(`Caso clinico no encontrado: ${input.caseId}`);
  }

  const payload = input.payload ?? {};
  const rawHash = sha256(payload);
  const location = buildObjectLocation(input.caseId, input.documentType, input.rawFormat, rawHash);
  const sensitivity = classifySensitivity(input.documentType, payload);

  return {
    documentId: `doc-${randomUUID()}`,
    caseId: input.caseId,
    episodeId: input.episodeId ?? caseRecord.episodes[0]?.episodeId ?? DEMO_EPISODE_ID,
    ilcId: input.ilcId ?? caseRecord.longitudinalIdentity?.ilcId ?? DEMO_ILC_ID,
    title: input.title,
    fileName: input.fileName,
    documentType: input.documentType,
    sourceSystem: input.sourceSystem,
    ingestionMethod: input.ingestionMethod,
    rawFormat: input.rawFormat,
    language: input.language,
    sensitivityClass: sensitivity.sensitivityClass,
    sensitivityReason: sensitivity.sensitivityReason,
    ingestionTimestamp: new Date().toISOString(),
    rawHash,
    storageObjectId: location.storageObjectId,
    minioBucket: location.minioBucket,
    minioObjectKey: location.minioObjectKey,
    storageUrl: location.storageUrl,
    sizeBytes: Buffer.byteLength(JSON.stringify(payload), "utf8"),
    ingestionStatus: "classified" as const,
    payload,
  };
}

function ingestIntoStore(store: Block2Store, input: IngestionInput) {
  const document = materializeDocument({
    caseId: input.caseId,
    episodeId: input.episodeId,
    ilcId: input.ilcId,
    title: input.title,
    fileName: input.fileName,
    documentType: input.documentType,
    sourceSystem: input.sourceSystem,
    ingestionMethod: input.ingestionMethod ?? "upload",
    rawFormat: input.rawFormat ?? "json",
    language: input.language ?? "es",
    payload: input.payload,
  });
  store.documents.push(document);

  const parsedVariables = pushParsedArtifacts(store, document, parsePayload(document.documentType, input.payload));
  const datasetStatus = certifyCase(store, document.caseId);
  const event: StoredIngestionEvent = {
    eventId: `evt-${randomUUID()}`,
    eventType: "document.ingested",
    caseId: document.caseId,
    documentId: document.documentId,
    emittedAt: new Date().toISOString(),
    payload: {
      parsedVariableIds: parsedVariables.map((item) => item.parsedVariableId),
      documentType: document.documentType,
      rawFormat: document.rawFormat,
      mappingCount: store.terminologyMappings.filter((item) => item.parsedVariableId && parsedVariables.some((variable) => variable.parsedVariableId === item.parsedVariableId)).length,
      certificationStatus: datasetStatus.certificationStatus,
    },
  };
  store.ingestionEvents.push(event);
  return { document, parsedVariables, datasetStatus, event };
}

function createInitialStore() {
  const store: Block2Store = {
    documents: [],
    parsedVariables: [],
    provenanceRecords: [],
    terminologyMappings: [],
    certificationRecords: [],
    datasetStatuses: [],
    ingestionEvents: [],
    terminologyCatalog,
    essentialVariables: [...essentialVariables],
  };

  ingestIntoStore(store, {
    caseId: DEMO_CASE_ID,
    episodeId: DEMO_EPISODE_ID,
    ilcId: DEMO_ILC_ID,
    title: "Diagnósticos estructurados CABG x3",
    fileName: "cabg-diagnosticos.json",
    documentType: "note",
    sourceSystem: "EHR",
    payload: {
      diagnoses: ["NSTEMI", "CAD multivaso", "DM2", "ERC estadio 3", "HTA"],
      summary: "Paciente con NSTEMI y enfermedad coronaria multivaso candidato a CABG x3.",
    },
  });
  ingestIntoStore(store, {
    caseId: DEMO_CASE_ID,
    episodeId: DEMO_EPISODE_ID,
    ilcId: DEMO_ILC_ID,
    title: "Laboratorios ingreso ACS",
    fileName: "cabg-labs.json",
    documentType: "lab",
    sourceSystem: "LIS",
    payload: {
      observations: [
        { name: "Troponina hs", value: 185, unit: "ng/L", observedAt: "2026-03-28T08:00:00.000Z" },
        { name: "Creatinina", value: 1.8, unit: "mg/dL", observedAt: "2026-03-28T08:00:00.000Z" },
        { name: "HbA1c", value: 8.4, unit: "%", observedAt: "2026-03-28T08:00:00.000Z" },
      ],
    },
  });
  ingestIntoStore(store, {
    caseId: DEMO_CASE_ID,
    episodeId: DEMO_EPISODE_ID,
    ilcId: DEMO_ILC_ID,
    title: "Ecocardiograma preoperatorio",
    fileName: "cabg-echo.json",
    documentType: "imaging",
    sourceSystem: "PACS",
    payload: {
      modality: "US",
      studyDescription: "Ecocardiograma transtoracico",
      studyDate: "2026-03-28T09:00:00.000Z",
      measurements: { fevi: { value: 35, unit: "%" } },
    },
  });
  ingestIntoStore(store, {
    caseId: DEMO_CASE_ID,
    episodeId: DEMO_EPISODE_ID,
    ilcId: DEMO_ILC_ID,
    title: "Medicación activa",
    fileName: "cabg-medications.json",
    documentType: "medication",
    sourceSystem: "EHR",
    payload: {
      medications: [
        { name: "Aspirina 100 mg VO diario" },
        { name: "Clopidogrel 75 mg VO diario" },
        { name: "Atorvastatina 80 mg VO nocturna" },
        { name: "Metoprolol 50 mg VO cada 12 h" },
        { name: "Insulina basal-bolo" },
      ],
    },
  });
  ingestIntoStore(store, {
    caseId: DEMO_CASE_ID,
    episodeId: DEMO_EPISODE_ID,
    ilcId: DEMO_ILC_ID,
    title: "Consentimiento base simulado",
    fileName: "cabg-consent.json",
    documentType: "consent",
    sourceSystem: "manual_entry",
    payload: {
      consentGranted: true,
      statement: "Consentimiento informado basal para procedimiento CABG x3 y uso interno de dataset demo.",
    },
  });

  return store;
}

function readStore() {
  const storePath = getStorePath();
  if (!existsSync(storePath)) {
    const initial = createInitialStore();
    writeFileSync(storePath, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  return JSON.parse(readFileSync(storePath, "utf8")) as Block2Store;
}

function writeStore(store: Block2Store) {
  writeFileSync(getStorePath(), JSON.stringify(store, null, 2), "utf8");
}

export function listTerminologyCatalog() {
  return readStore().terminologyCatalog;
}

export function lookupTerminologyEntries(query: string) {
  return lookupTerminology(query);
}

export function listTerminologySourceRegistry() {
  return parseTerminologySourcesCatalog();
}

export function lookupTerminologySourceRegistry(query: string) {
  const normalized = normalizeText(query);
  return parseTerminologySourcesCatalog().filter((entry) => {
    const haystack = normalizeText([
      entry.datasetId,
      entry.standard,
      entry.subtopic,
      entry.versionOrDate,
      entry.format,
      entry.officialSource,
      entry.accessLicense,
      entry.operationalStatus,
      entry.downloadObservation,
      entry.dbTarget,
      entry.ingestStrategy,
    ].join(" "));
    return haystack.includes(normalized);
  });
}

export function mapSourceToTerminology(sourceValue: string) {
  const match = findCatalogEntry(sourceValue);
  if (!match) {
    return [];
  }
  return match.systems.map((item) => ({
    sourceValue,
    canonicalTerm: match.display,
    system: item.system,
    code: item.code,
    display: item.display,
  }));
}

export function uploadDocumentMetadata(input: UploadMetadataInput) {
  const store = readStore();
  const document = materializeDocument(input);
  store.documents.push(document);
  writeStore(store);
  return document;
}

export function ingestStructuredDocument(input: IngestionInput) {
  const store = readStore();
  const created = ingestIntoStore(store, input);
  writeStore(store);
  return created;
}

export function listDocumentsByCase(caseId: string) {
  return readStore().documents.filter((item) => item.caseId === caseId).sort((left, right) => right.ingestionTimestamp.localeCompare(left.ingestionTimestamp));
}

export function listParsedVariablesByCase(caseId: string) {
  const documents = new Set(listDocumentsByCase(caseId).map((item) => item.documentId));
  return readStore().parsedVariables.filter((item) => documents.has(item.documentId));
}

export function listProvenanceRecordsByCase(caseId: string) {
  const documents = new Set(listDocumentsByCase(caseId).map((item) => item.documentId));
  return readStore().provenanceRecords.filter((item) => documents.has(item.sourceDocumentId));
}

export function listTerminologyMappingsByCase(caseId: string) {
  const variables = new Set(listParsedVariablesByCase(caseId).map((item) => item.parsedVariableId));
  return readStore().terminologyMappings.filter((item) => item.parsedVariableId && variables.has(item.parsedVariableId));
}

export function listCertificationRecordsByCase(caseId: string) {
  return readStore().certificationRecords.filter((item) => item.caseId === caseId).sort((left, right) => right.timestampCertified.localeCompare(left.timestampCertified));
}

export function getDatasetStatus(caseId: string) {
  const store = readStore();
  const existing = store.datasetStatuses.find((item) => item.caseId === caseId);
  if (existing) {
    return existing;
  }
  const recalculated = certifyCase(store, caseId);
  writeStore(store);
  return recalculated;
}

export function recertifyDataset(caseId: string) {
  const store = readStore();
  const datasetStatus = certifyCase(store, caseId);
  writeStore(store);
  return {
    datasetStatus,
    certificationRecords: store.certificationRecords.filter((item) => item.caseId === caseId),
  };
}

export function listIngestionEvents(caseId: string) {
  return readStore().ingestionEvents.filter((item) => item.caseId === caseId).sort((left, right) => right.emittedAt.localeCompare(left.emittedAt));
}
