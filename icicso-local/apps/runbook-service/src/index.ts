import { createServer, ServerResponse } from "node:http";
import { loadServiceConfig } from "@icicso/config";
import {
  actorMatrixSchema,
  bomResourceSchema,
  evtCatalogItemSchema,
  runbookSchema,
  runbookStepSchema,
  runbookSummarySchema,
  tamPhaseSchema,
} from "@icicso/contracts";
import {
  generateRunbook,
  getRunbook,
  listActorMatrix,
  listBomResources,
  listEvtCatalog,
  listRunbookSteps,
  listTamPhases,
} from "@icicso/database";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("runbook-service", 3111);
const logger = createLogger("runbook-service");

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
  const runbook = getRunbook(caseId) ?? generateRunbook(caseId);
  if (!runbook) {
    return null;
  }

  return runbookSummarySchema.parse({
    runbook: runbookSchema.parse(runbook),
    steps: runbookStepSchema.array().parse(listRunbookSteps(caseId)),
    actorMatrix: actorMatrixSchema.array().parse(listActorMatrix(caseId)),
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
    sendJson(response, 200, {
      service: "runbook-service",
      status: "ok",
      port: config.port,
      timestamp: new Date().toISOString(),
    }, correlationId);
    return;
  }

  if (request.method === "POST" && url.pathname === "/runbook/generate") {
    const runbook = generateRunbook(caseId);
    if (!runbook) {
      sendError(response, 404, "No fue posible generar runbook para el caso", correlationId);
      return;
    }

    sendJson(response, 201, runbookSchema.parse(runbook), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/runbook") {
    const runbook = getRunbook(caseId);
    if (!runbook) {
      sendError(response, 404, "Runbook no encontrado", correlationId);
      return;
    }

    sendJson(response, 200, runbookSchema.parse(runbook), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/bom") {
    sendJson(response, 200, bomResourceSchema.array().parse(listBomResources(caseId)), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/tam") {
    sendJson(response, 200, tamPhaseSchema.array().parse(listTamPhases(caseId)), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/evt") {
    sendJson(response, 200, evtCatalogItemSchema.array().parse(listEvtCatalog(caseId)), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/summary") {
    const summary = buildSummary(caseId);
    if (!summary) {
      sendError(response, 404, "Summary de runbook no disponible", correlationId);
      return;
    }

    sendJson(response, 200, summary, correlationId);
    return;
  }

  sendError(response, 404, "Ruta no encontrada", correlationId);
});

server.listen(config.port, () => {
  logger.info("service-started", {
    port: config.port,
  });
});
