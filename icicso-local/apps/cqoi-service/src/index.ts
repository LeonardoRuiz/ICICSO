import { createServer, ServerResponse } from "node:http";
import { loadServiceConfig } from "@icicso/config";
import {
  cqoiMetricSchema,
  cqoiSummarySchema,
  driftCandidateSchema,
  driftRecordSchema,
  outcomeAggregateSchema,
  qualityReportSchema,
} from "@icicso/contracts";
import {
  getOutcomeAggregate,
  getQualityReport,
  listCqoiMetrics,
  listDriftCandidates,
  listDriftRecords,
} from "@icicso/database";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("cqoi-service", 3115);
const logger = createLogger("cqoi-service");

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
  const outcomeAggregate = getOutcomeAggregate(caseId);
  const qualityReport = getQualityReport(caseId);
  if (!outcomeAggregate || !qualityReport) {
    return null;
  }

  return cqoiSummarySchema.parse({
    metrics: cqoiMetricSchema.array().parse(listCqoiMetrics(caseId)),
    outcomeAggregate: outcomeAggregateSchema.parse(outcomeAggregate),
    qualityReport: qualityReportSchema.parse(qualityReport),
    driftCandidates: driftCandidateSchema.array().parse(listDriftCandidates(caseId)),
    driftRecords: driftRecordSchema.array().parse(listDriftRecords(caseId)),
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
      service: "cqoi-service",
      status: "ok",
      port: config.port,
      timestamp: new Date().toISOString(),
      metrics: listCqoiMetrics(caseId).length,
      drifts: listDriftRecords(caseId).length,
    }, correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/metrics") {
    sendJson(response, 200, cqoiMetricSchema.array().parse(listCqoiMetrics(caseId)), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/drift") {
    sendJson(response, 200, driftRecordSchema.array().parse(listDriftRecords(caseId)), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/summary") {
    const summary = buildSummary(caseId);
    if (!summary) {
      sendError(response, 404, "Summary CQOI no disponible", correlationId);
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
