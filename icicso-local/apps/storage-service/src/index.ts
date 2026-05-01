import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { loadServiceConfig } from "@icicso/config";
import { documentTypeSchema, ingestionMethodSchema, rawFormatSchema, sourceSystemSchema } from "@icicso/contracts";
import { listDocumentsByCase, uploadDocumentMetadata } from "@icicso/database";
import { createCorrelationId, createLogger } from "@icicso/logger";

const config = loadServiceConfig("storage-service", 3107);
const logger = createLogger("storage-service");

const uploadMetadataSchema = z.object({
  caseId: z.string().min(1),
  episodeId: z.string().min(1).optional(),
  ilcId: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  fileName: z.string().min(1).optional(),
  documentType: documentTypeSchema,
  sourceSystem: sourceSystemSchema,
  ingestionMethod: ingestionMethodSchema.default("upload"),
  rawFormat: rawFormatSchema.default("json"),
  language: z.string().min(2).default("es"),
  payload: z.unknown().optional(),
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
    sendJson(response, 200, {
      service: "storage-service",
      status: "ok",
      port: config.port,
      timestamp: new Date().toISOString(),
      minio: {
        endpoint: config.minioEndpoint,
        bucket: config.minioBucket,
      },
    }, correlationId);
    return;
  }

  if (request.method === "POST" && url.pathname === "/documents/metadata") {
    try {
      const parsed = uploadMetadataSchema.parse(await readJsonBody(request));
      const document = uploadDocumentMetadata({
        caseId: parsed.caseId,
        documentType: parsed.documentType,
        sourceSystem: parsed.sourceSystem,
        ingestionMethod: parsed.ingestionMethod,
        rawFormat: parsed.rawFormat,
        ...(parsed.episodeId ? { episodeId: parsed.episodeId } : {}),
        ...(parsed.ilcId ? { ilcId: parsed.ilcId } : {}),
        ...(parsed.title ? { title: parsed.title } : {}),
        ...(parsed.fileName ? { fileName: parsed.fileName } : {}),
        ...(parsed.language ? { language: parsed.language } : {}),
        ...(parsed.payload !== undefined ? { payload: parsed.payload } : {}),
      });
      sendJson(response, 201, document, correlationId);
      return;
    } catch (error) {
      sendError(response, 400, error instanceof Error ? error.message : "Payload invalido", correlationId);
      return;
    }
  }

  if (request.method === "GET" && url.pathname.startsWith("/cases/") && url.pathname.endsWith("/documents")) {
    const caseId = decodeURIComponent(url.pathname.replace("/cases/", "").replace("/documents", ""));
    sendJson(response, 200, listDocumentsByCase(caseId), correlationId);
    return;
  }

  sendError(response, 404, "Ruta no encontrada", correlationId);
});

server.listen(config.port, () => {
  logger.info("service-started", { port: config.port });
});
