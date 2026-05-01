import { createServer, ServerResponse } from "node:http";
import { loadServiceConfig } from "@icicso/config";
import {
  blockingReasonSchema,
  bomResourceSchema,
  evtCatalogItemSchema,
  readinessGateSchema,
  readinessSnapshotSchema,
  readinessSummarySchema,
  runbookSchema,
  tamPhaseSchema,
} from "@icicso/contracts";
import {
  evaluateReadinessSnapshot,
  getReadinessSnapshot,
  getRunbook,
  listBlockingReasons,
  listBomResources,
  listEvtCatalog,
  listReadinessGates,
  listTamPhases,
} from "@icicso/database";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("readiness-service", 3112);
const logger = createLogger("readiness-service");

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
  const runbook = getRunbook(caseId);
  const snapshot = getReadinessSnapshot(caseId) ?? evaluateReadinessSnapshot(caseId);

  return readinessSummarySchema.parse({
    runbook: runbook ? runbookSchema.parse(runbook) : null,
    readinessSnapshot: snapshot ? readinessSnapshotSchema.parse(snapshot) : null,
    readinessGates: readinessGateSchema.array().parse(listReadinessGates(caseId)),
    blockingReasons: blockingReasonSchema.array().parse(listBlockingReasons(caseId)),
    bom: bomResourceSchema.array().parse(listBomResources(caseId)),
    tam: tamPhaseSchema.array().parse(listTamPhases(caseId)),
    evt: evtCatalogItemSchema.array().parse(listEvtCatalog(caseId)),
  });
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
    const snapshot = getReadinessSnapshot(caseId) ?? evaluateReadinessSnapshot(caseId);
    sendJson(response, 200, {
      service: "readiness-service",
      status: "ok",
      port: config.port,
      timestamp: new Date().toISOString(),
      readinessStatus: snapshot?.overallStatus ?? "FAIL",
    }, correlationId);
    return;
  }

  if (request.method === "POST" && url.pathname === "/readiness/evaluate") {
    const snapshot = evaluateReadinessSnapshot(caseId);
    if (!snapshot) {
      sendError(response, 404, "No fue posible evaluar readiness para el caso", correlationId);
      return;
    }

    sendJson(response, 201, readinessSnapshotSchema.parse(snapshot), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/readiness/snapshot") {
    const snapshot = getReadinessSnapshot(caseId);
    if (!snapshot) {
      sendError(response, 404, "Snapshot de readiness no encontrado", correlationId);
      return;
    }

    sendJson(response, 200, readinessSnapshotSchema.parse(snapshot), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/summary") {
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
