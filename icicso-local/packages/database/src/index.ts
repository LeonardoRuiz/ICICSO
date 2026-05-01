import { PrismaClient } from "@prisma/client";
export * from "./block1-store";
export * from "./block2-store";
export * from "./block3-store";
export * from "./block5-store";
export * from "./block6-store";
export * from "./block7-store";
export * from "./block8-store";

declare global {
  var __icicsoPrisma: PrismaClient | undefined;
}

export function getPrismaClient() {
  if (!global.__icicsoPrisma) {
    global.__icicsoPrisma = new PrismaClient({
      log: ["warn", "error"],
    });
  }

  return global.__icicsoPrisma;
}

export async function pingDatabase() {
  const prisma = getPrismaClient();
  await prisma.$queryRaw`SELECT 1`;
  return true;
}

export const BLOCK2_TABLES = {
  clinicalEpisode: "clinical_episodes",
  ingestedDocument: "ingested_documents",
  parsedVariable: "parsed_variables",
  provenanceRecord: "provenance_records",
  dataCertificationRecord: "data_certification_records",
  datasetStatus: "dataset_status",
  terminologyMapping: "block2_terminology_mappings",
} as const;

export type Block2TableName = (typeof BLOCK2_TABLES)[keyof typeof BLOCK2_TABLES];

export async function disconnectDatabase() {
  if (global.__icicsoPrisma) {
    await global.__icicsoPrisma.$disconnect();
  }
}
