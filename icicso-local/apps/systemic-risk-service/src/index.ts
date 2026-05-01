import { createServer, ServerResponse } from "node:http";
import { loadServiceConfig } from "@icicso/config";
import {
  dataQualityRecordSchema,
  dtqSummarySchema,
  riskThresholdSchema,
  signalWindowSchema,
  systemicRiskSignalSchema,
  systemicRiskSummarySchema,
  traceabilityScoreSchema,
} from "@icicso/contracts";
import {
  getTraceabilityScore,
  listDataQualityRecords,
  listRiskThresholds,
  listSignalWindows,
  listSystemicRiskSignals,
} from "@icicso/database";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("systemic-risk-service", 3114);
const logger = createLogger("systemic-risk-service");

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
  const traceabilityScore = getTraceabilityScore(caseId);
  if (!traceabilityScore) {
    return null;
  }

  return systemicRiskSummarySchema.parse({
    thresholds: riskThresholdSchema.array().parse(listRiskThresholds()),
    windows: signalWindowSchema.array().parse(listSignalWindows()),
    signals: systemicRiskSignalSchema.array().parse(listSystemicRiskSignals(caseId)),
    dtq: dtqSummarySchema.parse({
      dataQualityRecords: dataQualityRecordSchema.array().parse(listDataQualityRecords(caseId)),
      traceabilityScore: traceabilityScoreSchema.parse(traceabilityScore),
    }),
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
      service: "systemic-risk-service",
      status: "ok",
      port: config.port,
      timestamp: new Date().toISOString(),
      signals: listSystemicRiskSignals(caseId).length,
    }, correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/signals") {
    sendJson(response, 200, systemicRiskSignalSchema.array().parse(listSystemicRiskSignals(caseId)), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/dtq") {
    const traceabilityScore = getTraceabilityScore(caseId);
    if (!traceabilityScore) {
      sendError(response, 404, "DTQ no disponible", correlationId);
      return;
    }
    sendJson(response, 200, dtqSummarySchema.parse({
      dataQualityRecords: dataQualityRecordSchema.array().parse(listDataQualityRecords(caseId)),
      traceabilityScore: traceabilityScoreSchema.parse(traceabilityScore),
    }), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/summary") {
    const summary = buildSummary(caseId);
    if (!summary) {
      sendError(response, 404, "Summary sistémico no disponible", correlationId);
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
