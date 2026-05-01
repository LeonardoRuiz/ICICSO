import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { loadServiceConfig } from "@icicso/config";
import { auditEventInputSchema } from "@icicso/contracts";
import { appendAuditEvent, listAuditEvents } from "@icicso/database";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("audit-service", 3103);
const logger = createLogger("audit-service");

function sendJson(response: ServerResponse, statusCode: number, body: unknown, correlationId: string) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Correlation-Id": correlationId,
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

const server = createServer(async (request, response) => {
  const correlationId = createCorrelationId(request.headers["x-correlation-id"]?.toString());
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

  logger.info("request-received", {
    correlationId,
    method: request.method,
    path: url.pathname,
  });

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(
      response,
      200,
      {
        service: "audit-service",
        status: "ok",
        port: config.port,
        timestamp: new Date().toISOString(),
      },
      correlationId,
    );
    return;
  }

  if (request.method === "POST" && url.pathname === "/events") {
    try {
      const parsed = auditEventInputSchema.parse(await readJsonBody(request));
      const created = appendAuditEvent({
        eventType: parsed.eventType,
        actorId: parsed.actorId ?? null,
        actorEmail: parsed.actorEmail ?? null,
        targetCaseId: parsed.targetCaseId ?? null,
        correlationId: parsed.correlationId,
        payload: parsed.payload,
      });

      sendJson(response, 201, created, correlationId);
      return;
    } catch (error) {
      sendError(response, 400, error instanceof Error ? error.message : "Payload invalido", correlationId);
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/events") {
    const targetCaseId = url.searchParams.get("caseId");
    const limitValue = Number(url.searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : 20;

    const events = listAuditEvents(targetCaseId, limit);

    sendJson(response, 200, events, correlationId);
    return;
  }

  sendError(response, 404, "Ruta no encontrada", correlationId);
});

server.listen(config.port, () => {
  logger.info("service-started", {
    port: config.port,
  });
});
