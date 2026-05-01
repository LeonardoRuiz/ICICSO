import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";

export interface ServiceUrls {
  gateway: string;
  auth: string;
  identity: string;
  audit: string;
  storage: string;
  ingestion: string;
  terminology: string;
  dataGovernance: string;
  evidenceLake: string;
  ghl: string;
  kbol: string;
  runbook: string;
  readiness: string;
  caseControl: string;
  systemicRisk: string;
  cqoi: string;
}

export interface ServiceConfig {
  serviceName: string;
  port: number;
  nodeEnv: string;
  logLevel: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  authIssuer: string;
  authAudience: string;
  internalServiceToken: string;
  databaseUrl: string;
  minioEndpoint: string;
  minioBucket: string;
  demoCaseId: string;
  demoEpisodeId: string;
  demoIlcId: string;
  urls: ServiceUrls;
}

const logLevelSchema = z.enum(["debug", "info", "warn", "error", "DEBUG", "INFO", "WARN", "ERROR"]);
const nodeEnvSchema = z.enum(["development", "test", "staging", "production"]);
const urlSchema = z.string().url();
const portValueSchema = z
  .string()
  .regex(/^\d{2,5}$/)
  .transform((value) => Number(value))
  .refine((value) => value > 0 && value <= 65535, "must be a valid TCP port");

const environmentSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    LOG_LEVEL: logLevelSchema,
    JWT_SECRET: z.string().min(24),
    JWT_EXPIRES_IN: z.string().min(2),
    AUTH_ISSUER: z.string().min(3),
    AUTH_AUDIENCE: z.string().min(3),
    INTERNAL_SERVICE_TOKEN: z.string().min(24),
    DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "must be a PostgreSQL connection string"),
    MINIO_ENDPOINT: urlSchema,
    MINIO_BUCKET: z.string().min(1),
    DEMO_CASE_ID: z.string().min(1),
    DEMO_EPISODE_ID: z.string().min(1),
    DEMO_ILC_ID: z.string().min(1),
    GATEWAY_API_PORT: portValueSchema,
    AUTH_SERVICE_PORT: portValueSchema,
    IDENTITY_SERVICE_PORT: portValueSchema,
    AUDIT_SERVICE_PORT: portValueSchema,
    EVIDENCE_LAKE_SERVICE_PORT: portValueSchema,
    GHL_SERVICE_PORT: portValueSchema,
    KBOL_SERVICE_PORT: portValueSchema,
    STORAGE_SERVICE_PORT: portValueSchema,
    INGESTION_SERVICE_PORT: portValueSchema,
    TERMINOLOGY_SERVICE_PORT: portValueSchema,
    DATA_GOVERNANCE_SERVICE_PORT: portValueSchema,
    RUNBOOK_SERVICE_PORT: portValueSchema,
    READINESS_SERVICE_PORT: portValueSchema,
    CASE_CONTROL_SERVICE_PORT: portValueSchema,
    SYSTEMIC_RISK_SERVICE_PORT: portValueSchema,
    CQOI_SERVICE_PORT: portValueSchema,
    GATEWAY_API_URL: urlSchema,
    AUTH_SERVICE_URL: urlSchema,
    IDENTITY_SERVICE_URL: urlSchema,
    AUDIT_SERVICE_URL: urlSchema,
    EVIDENCE_LAKE_SERVICE_URL: urlSchema,
    GHL_SERVICE_URL: urlSchema,
    KBOL_SERVICE_URL: urlSchema,
    STORAGE_SERVICE_URL: urlSchema,
    INGESTION_SERVICE_URL: urlSchema,
    TERMINOLOGY_SERVICE_URL: urlSchema,
    DATA_GOVERNANCE_SERVICE_URL: urlSchema,
    RUNBOOK_SERVICE_URL: urlSchema,
    READINESS_SERVICE_URL: urlSchema,
    CASE_CONTROL_SERVICE_URL: urlSchema,
    SYSTEMIC_RISK_SERVICE_URL: urlSchema,
    CQOI_SERVICE_URL: urlSchema,
  })
  .passthrough();

function parseEnvFile(content: string) {
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (!line || line.trim().length === 0 || line.trim().startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = rawValue;
    }
  }
}

function findEnvFile() {
  const configured = process.env.CONFIG_ENV_FILE;
  if (configured && existsSync(configured)) {
    return configured;
  }

  const candidates = [process.cwd(), __dirname];

  for (const start of candidates) {
    let current = start;

    while (true) {
      const directEnv = join(current, ".env");
      if (existsSync(directEnv)) {
        return directEnv;
      }

      const localSource = join(current, "config", "env", ".env.local");
      if (existsSync(localSource)) {
        return localSource;
      }

      const parent = dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  return null;
}

let envLoaded = false;

export function ensureEnvLoaded() {
  if (envLoaded) {
    return;
  }

  const envPath = findEnvFile();
  if (envPath) {
    parseEnvFile(readFileSync(envPath, "utf8"));
  }
  envLoaded = true;
}

export function validateCurrentEnvironment() {
  ensureEnvLoaded();
  const parsed = environmentSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid ICICSO configuration: ${issues}`);
  }

  return parsed.data;
}

export function loadServiceConfig(serviceName: string, fallbackPort: number): ServiceConfig {
  const env = validateCurrentEnvironment();

  const portMap: Record<string, number> = {
    "gateway-api": env.GATEWAY_API_PORT,
    "auth-service": env.AUTH_SERVICE_PORT,
    "identity-service": env.IDENTITY_SERVICE_PORT,
    "audit-service": env.AUDIT_SERVICE_PORT,
    "storage-service": env.STORAGE_SERVICE_PORT,
    "ingestion-service": env.INGESTION_SERVICE_PORT,
    "terminology-service": env.TERMINOLOGY_SERVICE_PORT,
    "data-governance-service": env.DATA_GOVERNANCE_SERVICE_PORT,
    "evidence-lake-service": env.EVIDENCE_LAKE_SERVICE_PORT,
    "ghl-service": env.GHL_SERVICE_PORT,
    "kbol-service": env.KBOL_SERVICE_PORT,
    "runbook-service": env.RUNBOOK_SERVICE_PORT,
    "readiness-service": env.READINESS_SERVICE_PORT,
    "case-control-service": env.CASE_CONTROL_SERVICE_PORT,
    "systemic-risk-service": env.SYSTEMIC_RISK_SERVICE_PORT,
    "cqoi-service": env.CQOI_SERVICE_PORT,
  };

  return {
    serviceName,
    port: portMap[serviceName] ?? fallbackPort,
    nodeEnv: env.NODE_ENV,
    logLevel: env.LOG_LEVEL.toLowerCase(),
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    authIssuer: env.AUTH_ISSUER,
    authAudience: env.AUTH_AUDIENCE,
    internalServiceToken: env.INTERNAL_SERVICE_TOKEN,
    databaseUrl: env.DATABASE_URL,
    minioEndpoint: env.MINIO_ENDPOINT,
    minioBucket: env.MINIO_BUCKET,
    demoCaseId: env.DEMO_CASE_ID,
    demoEpisodeId: env.DEMO_EPISODE_ID,
    demoIlcId: env.DEMO_ILC_ID,
    urls: {
      gateway: env.GATEWAY_API_URL,
      auth: env.AUTH_SERVICE_URL,
      identity: env.IDENTITY_SERVICE_URL,
      audit: env.AUDIT_SERVICE_URL,
      storage: env.STORAGE_SERVICE_URL,
      ingestion: env.INGESTION_SERVICE_URL,
      terminology: env.TERMINOLOGY_SERVICE_URL,
      dataGovernance: env.DATA_GOVERNANCE_SERVICE_URL,
      evidenceLake: env.EVIDENCE_LAKE_SERVICE_URL,
      ghl: env.GHL_SERVICE_URL,
      kbol: env.KBOL_SERVICE_URL,
      runbook: env.RUNBOOK_SERVICE_URL,
      readiness: env.READINESS_SERVICE_URL,
      caseControl: env.CASE_CONTROL_SERVICE_URL,
      systemicRisk: env.SYSTEMIC_RISK_SERVICE_URL,
      cqoi: env.CQOI_SERVICE_URL,
    },
  };
}
