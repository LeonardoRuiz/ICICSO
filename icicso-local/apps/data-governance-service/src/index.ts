import { createServer, ServerResponse } from "node:http";
import { loadServiceConfig } from "@icicso/config";
import {
  getDatasetStatus,
  listCertificationRecordsByCase,
  listDocumentsByCase,
  listIngestionEvents,
  listParsedVariablesByCase,
  listProvenanceRecordsByCase,
  listTerminologyCatalog,
  listTerminologyMappingsByCase,
  recertifyDataset,
} from "@icicso/database";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("data-governance-service", 3110);
const logger = createLogger("data-governance-service");

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

const server = createServer((request, response) => {
  const correlationId = createCorrelationId(request.headers["x-correlation-id"]?.toString());
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const caseId = url.searchParams.get("caseId") ?? config.demoCaseId;

  logger.info("request-received", {
    correlationId,
    method: request.method,
    path: url.pathname,
    caseId,
  });

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {}, correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    const datasetStatus = getDatasetStatus(config.demoCaseId);
    sendJson(response, 200, {
      service: "data-governance-service",
      status: "ok",
      port: config.port,
      timestamp: new Date().toISOString(),
      demoCaseStatus: datasetStatus.certificationStatus,
    }, correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/parsed-variables") {
    sendJson(response, 200, listParsedVariablesByCase(caseId), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/provenance") {
    sendJson(response, 200, listProvenanceRecordsByCase(caseId), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/terminology-mappings") {
    sendJson(response, 200, listTerminologyMappingsByCase(caseId), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/certification-records") {
    sendJson(response, 200, listCertificationRecordsByCase(caseId), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/dataset-status") {
    sendJson(response, 200, getDatasetStatus(caseId), correlationId);
    return;
  }

  if (request.method === "POST" && url.pathname === "/certify") {
    sendJson(response, 200, recertifyDataset(caseId), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/overview") {
    sendJson(response, 200, {
      documents: listDocumentsByCase(caseId),
      parsedVariables: listParsedVariablesByCase(caseId),
      provenanceRecords: listProvenanceRecordsByCase(caseId),
      terminologyMappings: listTerminologyMappingsByCase(caseId),
      certificationRecords: listCertificationRecordsByCase(caseId),
      datasetStatus: getDatasetStatus(caseId),
      ingestionEvents: listIngestionEvents(caseId),
      terminologyCatalog: listTerminologyCatalog(),
    }, correlationId);
    return;
  }

  sendError(response, 404, "Ruta no encontrada", correlationId);
});

server.listen(config.port, () => {
  logger.info("service-started", { port: config.port });
});
