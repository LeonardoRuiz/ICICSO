import { createServer, ServerResponse } from "node:http";
import { loadServiceConfig } from "@icicso/config";
import {
  evidenceLakeSummarySchema,
  evidenceObjectSchema,
  evidenceSnapshotSchema,
  epistemicUncertaintyLayerSchema,
  icdrRecordSchema,
  sourceEvidenceRecordSchema,
  translationEvaluationSchema,
} from "@icicso/contracts";
import {
  getEpistemicUncertaintyLayer,
  getEvidenceLakeSummary,
  getEvidenceSnapshot,
  getTranslationEvaluation,
  listEvidenceObjects,
  listIcdrRecords,
  listSourceEvidenceRecords,
} from "@icicso/database";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("evidence-lake-service", 3104);
const logger = createLogger("evidence-lake-service");

function sendJson(response: ServerResponse, statusCode: number, body: unknown, correlationId: string) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Correlation-Id": correlationId,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Correlation-Id",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  });
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, statusCode: number, message: string, correlationId: string) {
  sendJson(response, statusCode, { message }, correlationId);
}

const server = createServer((request, response) => {
  const correlationId = createCorrelationId(request.headers["x-correlation-id"]?.toString());
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

  logger.info("request-received", {
    correlationId,
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
  });

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {}, correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(
      response,
      200,
      {
        service: "evidence-lake-service",
        status: "ok",
        port: config.port,
        timestamp: new Date().toISOString(),
      },
      correlationId,
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/ser") {
    sendJson(response, 200, sourceEvidenceRecordSchema.array().parse(listSourceEvidenceRecords()), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/eo") {
    const domain = url.searchParams.get("domain");
    sendJson(response, 200, evidenceObjectSchema.array().parse(listEvidenceObjects(domain)), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/icdr") {
    sendJson(response, 200, icdrRecordSchema.array().parse(listIcdrRecords()), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/ete") {
    const caseId = url.searchParams.get("caseId") ?? config.demoCaseId;
    const ete = getTranslationEvaluation(caseId);

    if (!ete) {
      sendError(response, 404, "Evaluacion ETE no encontrada", correlationId);
      return;
    }

    sendJson(response, 200, translationEvaluationSchema.parse(ete), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/eul") {
    const caseId = url.searchParams.get("caseId") ?? config.demoCaseId;
    const eul = getEpistemicUncertaintyLayer(caseId);

    if (!eul) {
      sendError(response, 404, "EUL no encontrada", correlationId);
      return;
    }

    sendJson(response, 200, epistemicUncertaintyLayerSchema.parse(eul), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/snapshot") {
    const caseId = url.searchParams.get("caseId") ?? config.demoCaseId;
    const snapshot = getEvidenceSnapshot(caseId);

    if (!snapshot) {
      sendError(response, 404, "Snapshot cientifico no encontrado", correlationId);
      return;
    }

    sendJson(response, 200, evidenceSnapshotSchema.parse(snapshot), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/summary") {
    const caseId = url.searchParams.get("caseId") ?? config.demoCaseId;
    const summary = getEvidenceLakeSummary(caseId);

    sendJson(
      response,
      200,
      evidenceLakeSummarySchema.parse({
        services: [
          {
            service: "evidence-lake-service",
            status: "ok",
            port: config.port,
            timestamp: new Date().toISOString(),
          },
        ],
        ...summary,
      }),
      correlationId,
    );
    return;
  }

  sendError(response, 404, "Ruta no encontrada", correlationId);
});

server.listen(config.port, () => {
  logger.info("service-started", {
    port: config.port,
  });
});
