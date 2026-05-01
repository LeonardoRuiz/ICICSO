import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { loadServiceConfig } from "@icicso/config";
import {
  activateCase,
  createOverrideRecord,
  getCaseControl,
  listCaseControlLogs,
  listCaseStateTransitions,
  listLegalSnapshots,
  listOverrideRecords,
  listStateTransitionCaptures,
  transitionCaseState,
} from "@icicso/database";
import {
  caseControlSchema,
  caseControlSummarySchema,
  caseStateTransitionSchema,
  legalSnapshotSchema,
  overrideCreateSchema,
  overrideRecordSchema,
  stateTransitionCaptureSchema,
  transitionRequestSchema,
} from "@icicso/contracts";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("case-control-service", 3113);
const logger = createLogger("case-control-service");

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

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function buildSummary(caseId: string) {
  return caseControlSummarySchema.parse({
    caseControl: (() => {
      const control = getCaseControl(caseId);
      return control ? caseControlSchema.parse(control) : null;
    })(),
    transitions: caseStateTransitionSchema.array().parse(listCaseStateTransitions(caseId)),
    captures: stateTransitionCaptureSchema.array().parse(listStateTransitionCaptures(caseId)),
    legalSnapshots: legalSnapshotSchema.array().parse(listLegalSnapshots(caseId)),
    overrides: overrideRecordSchema.array().parse(listOverrideRecords(caseId)),
    logs: listCaseControlLogs(caseId),
  });
}

const server = createServer(async (request, response) => {
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
      service: "case-control-service",
      status: "ok",
      port: config.port,
      timestamp: new Date().toISOString(),
      currentState: getCaseControl(caseId)?.currentState ?? "not-activated",
    }, correlationId);
    return;
  }

  if (request.method === "POST" && url.pathname === "/activate") {
    const actorRole = url.searchParams.get("actorRole") ?? "case-controller";
    const result = activateCase(caseId, actorRole);
    if ("error" in result) {
      sendError(response, 409, result.error ?? "No fue posible activar el caso", correlationId);
      return;
    }
    logger.info("case.activated", { correlationId, caseId, actorRole });
    sendJson(response, 201, result, correlationId);
    return;
  }

  if (request.method === "POST" && url.pathname === "/transition") {
    try {
      const parsed = transitionRequestSchema.parse(await readJsonBody(request));
      const result = transitionCaseState(caseId, parsed.toState, parsed.reason, parsed.actorRole, parsed.overrideId ?? null);
      if ("error" in result) {
        sendError(response, 409, result.error ?? "No fue posible transicionar el caso", correlationId);
        return;
      }
      logger.info("case.transitioned", { correlationId, caseId, toState: parsed.toState });
      if (result.legalSnapshot) {
        logger.info("legal.snapshot.created", {
          correlationId,
          caseId,
          legalSnapshotId: result.legalSnapshot.legalSnapshotId,
        });
      }
      sendJson(response, 201, result, correlationId);
      return;
    } catch (error) {
      sendError(response, 400, error instanceof Error ? error.message : "Payload inválido", correlationId);
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/timeline") {
    sendJson(response, 200, caseStateTransitionSchema.array().parse(listCaseStateTransitions(caseId)), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/esl") {
    sendJson(response, 200, legalSnapshotSchema.array().parse(listLegalSnapshots(caseId)), correlationId);
    return;
  }

  if (request.method === "POST" && url.pathname === "/overrides") {
    try {
      const parsed = overrideCreateSchema.parse(await readJsonBody(request));
      const override = createOverrideRecord(caseId, parsed.overrideType, parsed.justification, parsed.signedBy);
      if (!override) {
        sendError(response, 404, "No fue posible crear override", correlationId);
        return;
      }
      logger.info("override.created", { correlationId, caseId, overrideId: override.overrideId });
      sendJson(response, 201, overrideRecordSchema.parse(override), correlationId);
      return;
    } catch (error) {
      sendError(response, 400, error instanceof Error ? error.message : "Payload inválido", correlationId);
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/overrides") {
    sendJson(response, 200, overrideRecordSchema.array().parse(listOverrideRecords(caseId)), correlationId);
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
