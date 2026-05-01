import { createServer, ServerResponse } from "node:http";
import { loadServiceConfig } from "@icicso/config";
import {
  cabgBlock2Fixture,
  clinicalPathwayObjectSchema,
  frameworkDependencySchema,
  kbolSummarySchema,
  operativeFrameworkSchema,
  rollbackRecordSchema,
  evaluateDatasetCertification,
} from "@icicso/contracts";
import {
  generateClinicalPathwayObject,
  getClinicalPathwayObject,
  listFrameworkDependencies,
  listOperativeFrameworks,
  listRollbackRecords,
} from "@icicso/database";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("kbol-service", 3106);
const logger = createLogger("kbol-service");

function sendJson(response: ServerResponse, statusCode: number, body: unknown, correlationId: string) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Correlation-Id": correlationId,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Correlation-Id",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, statusCode: number, message: string, correlationId: string) {
  sendJson(response, statusCode, { message }, correlationId);
}

function buildSummary(caseId: string) {
  const cpo = generateClinicalPathwayObject(caseId);
  const datasetGate = evaluateDatasetCertification(cabgBlock2Fixture);

  return kbolSummarySchema.parse({
    frameworks: operativeFrameworkSchema.array().parse(listOperativeFrameworks()),
    dependencies: frameworkDependencySchema.array().parse(listFrameworkDependencies()),
    cpo: cpo ? clinicalPathwayObjectSchema.parse(cpo) : null,
    rollbacks: rollbackRecordSchema.array().parse(listRollbackRecords(caseId)),
    datasetGate: {
      certificationStatus: datasetGate.certificationStatus,
      readinessForEte: datasetGate.readinessForEte,
      dataCompletenessIndex: datasetGate.dataCompletenessIndex,
    },
  });
}

const server = createServer((request, response) => {
  const correlationId = createCorrelationId(request.headers["x-correlation-id"]?.toString());
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

  logger.info("request-received", {
    correlationId,
    method: request.method,
    path: url.pathname,
  });

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {}, correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      service: "kbol-service",
      status: "ok",
      port: config.port,
      timestamp: new Date().toISOString(),
    }, correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/frameworks") {
    sendJson(response, 200, operativeFrameworkSchema.array().parse(listOperativeFrameworks()), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/frameworks/dependencies") {
    sendJson(response, 200, frameworkDependencySchema.array().parse(listFrameworkDependencies()), correlationId);
    return;
  }

  if (request.method === "POST" && url.pathname === "/cpo/generate") {
    const caseId = url.searchParams.get("caseId") ?? config.demoCaseId;
    const cpo = generateClinicalPathwayObject(caseId);
    if (!cpo) {
      sendError(response, 404, "No fue posible generar CPO para el caso", correlationId);
      return;
    }

    sendJson(response, 201, clinicalPathwayObjectSchema.parse(cpo), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/cpo") {
    const caseId = url.searchParams.get("caseId") ?? config.demoCaseId;
    const cpo = getClinicalPathwayObject(caseId);
    if (!cpo) {
      sendError(response, 404, "CPO no encontrado", correlationId);
      return;
    }

    sendJson(response, 200, clinicalPathwayObjectSchema.parse(cpo), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/summary") {
    const caseId = url.searchParams.get("caseId") ?? config.demoCaseId;
    sendJson(response, 200, buildSummary(caseId), correlationId);
    return;
  }

  sendError(response, 404, "Ruta no encontrada", correlationId);
});

server.listen(config.port, () => {
  logger.info("service-started", {
    port: config.port,
  });
});
