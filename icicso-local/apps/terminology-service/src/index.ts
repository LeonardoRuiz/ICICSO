import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { loadServiceConfig } from "@icicso/config";
import {
  listTerminologyCatalog,
  listTerminologySourceRegistry,
  lookupTerminologyEntries,
  lookupTerminologySourceRegistry,
  mapSourceToTerminology,
} from "@icicso/database";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("terminology-service", 3109);
const logger = createLogger("terminology-service");

const mappingRequestSchema = z.object({
  sourceValue: z.string().min(1),
});

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

const server = createServer(async (request, response) => {
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
    const sourceRegistry = listTerminologySourceRegistry();
    sendJson(response, 200, {
      service: "terminology-service",
      status: "ok",
      port: config.port,
      timestamp: new Date().toISOString(),
      supportedSystems: sourceRegistry.map((item) => item.datasetId),
    }, correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/catalog") {
    sendJson(response, 200, listTerminologyCatalog(), correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/lookup") {
    const query = url.searchParams.get("query");
    if (!query) {
      sendError(response, 400, "Falta query", correlationId);
      return;
    }
    sendJson(response, 200, { query, matches: lookupTerminologyEntries(query) }, correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/sources") {
    sendJson(response, 200, {
      sources: listTerminologySourceRegistry(),
    }, correlationId);
    return;
  }

  if (request.method === "GET" && url.pathname === "/source-lookup") {
    const query = url.searchParams.get("query");
    if (!query) {
      sendError(response, 400, "Falta query", correlationId);
      return;
    }
    sendJson(response, 200, { query, matches: lookupTerminologySourceRegistry(query) }, correlationId);
    return;
  }

  if (request.method === "POST" && url.pathname === "/mapping") {
    try {
      const parsed = mappingRequestSchema.parse(await readJsonBody(request));
      sendJson(response, 200, { sourceValue: parsed.sourceValue, mappings: mapSourceToTerminology(parsed.sourceValue) }, correlationId);
      return;
    } catch (error) {
      sendError(response, 400, error instanceof Error ? error.message : "Payload invalido", correlationId);
      return;
    }
  }

  sendError(response, 404, "Ruta no encontrada", correlationId);
});

server.listen(config.port, () => {
  logger.info("service-started", { port: config.port });
});
