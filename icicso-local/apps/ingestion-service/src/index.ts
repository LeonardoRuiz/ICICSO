import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { loadServiceConfig } from "@icicso/config";
import { documentTypeSchema, ingestionMethodSchema, rawFormatSchema, sourceSystemSchema } from "@icicso/contracts";
import { ingestStructuredDocument, pingDatabase } from "@icicso/database";
import {
  MetricsRegistry,
  applyResponseTelemetryHeaders,
  createChildTraceHeaders,
  createLogger,
  createRequestContext,
} from "@icicso/logger";

const config = loadServiceConfig("ingestion-service", 3108);
const logger = createLogger("ingestion-service");
const metrics = new MetricsRegistry();
const SERVICE_NAME = "ingestion-service";
const BUILD_ID = process.env.BUILD_ID ?? "dev-local";
const AUDIT_TIMEOUT_MS = 3000;

let startupComplete = false;
let activeRequests = 0;

const ingestionSchema = z.object({
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
  payload: z.unknown(),
});

type RequestContext = ReturnType<typeof createRequestContext>;

function setCommonHeaders(response: ServerResponse, context: RequestContext) {
  applyResponseTelemetryHeaders(response, context);
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Correlation-Id, X-Request-Id, traceparent");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown, context: RequestContext) {
  setCommonHeaders(response, context);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function sendText(response: ServerResponse, statusCode: number, body: string, context: RequestContext, contentType = "text/plain; version=0.0.4; charset=utf-8") {
  setCommonHeaders(response, context);
  response.writeHead(statusCode, {
    "Content-Type": contentType,
  });
  response.end(body);
}

function sendError(response: ServerResponse, statusCode: number, message: string, context: RequestContext, errorCode?: string) {
  sendJson(
    response,
    statusCode,
    {
      message,
      service_name: SERVICE_NAME,
      correlation_id: context.correlationId,
      request_id: context.requestId,
      trace_id: context.traceId,
      timestamp: new Date().toISOString(),
      ...(errorCode ? { error_code: errorCode } : {}),
    },
    context,
  );
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

async function writeAudit(context: RequestContext, event: Record<string, unknown>, caseId: string) {
  const timer = metrics.startTimer(
    "icicso_parser_audit_duration_seconds",
    "Audit write duration triggered by ingestion parser.",
  );

  try {
    const response = await fetch(`${config.urls.audit}/events`, {
      method: "POST",
      signal: AbortSignal.timeout(AUDIT_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        ...createChildTraceHeaders(context),
      },
      body: JSON.stringify({
        eventType: "document.ingested",
        actorId: null,
        actorEmail: null,
        targetCaseId: caseId,
        correlationId: context.correlationId,
        payload: event,
      }),
    });

    timer();
    if (!response.ok) {
      throw new Error(`audit ${response.status}`);
    }
  } catch (error) {
    timer();
    metrics.incCounter("icicso_parser_audit_failures_total", "Audit write failures emitted by parser.", {});
    logger.warn("audit-write-failed", {
      correlation_id: context.correlationId,
      request_id: context.requestId,
      trace_id: context.traceId,
      span_id: context.spanId,
      error: error instanceof Error ? error.message : "unknown-error",
      error_code: "AUDIT_WRITE_FAILED",
    });
  }
}

async function buildReadinessReport() {
  const timestamp = new Date().toISOString();
  const dependencies: Array<Record<string, unknown>> = [];
  let criticalFailure = false;

  try {
    await pingDatabase();
    metrics.setGauge("icicso_postgres_up", "PostgreSQL reachability from parser service.", { service: SERVICE_NAME }, 1);
    dependencies.push({
      dependency: "postgres",
      critical: true,
      status: "up",
    });
  } catch (error) {
    criticalFailure = true;
    metrics.setGauge("icicso_postgres_up", "PostgreSQL reachability from parser service.", { service: SERVICE_NAME }, 0);
    dependencies.push({
      dependency: "postgres",
      critical: true,
      status: "down",
      error: error instanceof Error ? error.message : "unknown-error",
    });
  }

  return {
    service_name: SERVICE_NAME,
    status: criticalFailure ? "not_ready" : "ready",
    build_id: BUILD_ID,
    timestamp,
    process: {
      pid: process.pid,
      uptime_seconds: Number(process.uptime().toFixed(3)),
      memory_rss_bytes: process.memoryUsage().rss,
      active_requests: activeRequests,
    },
    dependencies,
  };
}

function beginRequest(request: IncomingMessage) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const context = createRequestContext(request.headers, SERVICE_NAME, url.pathname, request.method);

  activeRequests += 1;
  metrics.setGauge("icicso_parser_active_requests", "Active parser requests.", {}, activeRequests);
  metrics.incCounter(
    "icicso_parser_request_count_total",
    "Total parser HTTP requests.",
    {
      method: request.method ?? "UNKNOWN",
      route: url.pathname,
    },
  );

  const timer = metrics.startTimer(
    "icicso_parser_request_duration_seconds",
    "Parser HTTP request duration in seconds.",
    {
      method: request.method ?? "UNKNOWN",
      route: url.pathname,
    },
  );

  return { context, url, timer };
}

function endRequest(response: ServerResponse, context: RequestContext, timer: () => number) {
  response.once("finish", () => {
    activeRequests = Math.max(activeRequests - 1, 0);
    metrics.setGauge("icicso_parser_active_requests", "Active parser requests.", {}, activeRequests);
    const duration = timer();
    metrics.observeHistogram(
      "icicso_parser_request_duration_seconds",
      "Parser HTTP request duration in seconds.",
      {
        method: context.method ?? "UNKNOWN",
        route: context.route ?? "unknown",
        status_code: String(response.statusCode ?? 0),
      },
      duration,
    );

    if ((response.statusCode ?? 0) >= 400) {
      metrics.incCounter(
        "icicso_parser_error_count_total",
        "Parser HTTP request errors.",
        {
          method: context.method ?? "UNKNOWN",
          route: context.route ?? "unknown",
          status_code: String(response.statusCode ?? 0),
        },
      );
    }

    logger.info("request-completed", {
      correlation_id: context.correlationId,
      request_id: context.requestId,
      trace_id: context.traceId,
      span_id: context.spanId,
      route: context.route,
      method: context.method,
      status_code: response.statusCode,
      duration_ms: Math.round(duration * 1000),
    });
  });
}

const server = createServer(async (request, response) => {
  const { context, url, timer } = beginRequest(request);
  endRequest(response, context, timer);

  logger.info("request-received", {
    correlation_id: context.correlationId,
    request_id: context.requestId,
    trace_id: context.traceId,
    span_id: context.spanId,
    route: url.pathname,
    method: request.method,
  });

  if (request.method === "OPTIONS") {
    setCommonHeaders(response, context);
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/health/live") {
    sendJson(
      response,
      200,
      {
        service_name: SERVICE_NAME,
        status: "live",
        build_id: BUILD_ID,
        timestamp: new Date().toISOString(),
      },
      context,
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/health/startup") {
    sendJson(
      response,
      startupComplete ? 200 : 503,
      {
        service_name: SERVICE_NAME,
        status: startupComplete ? "started" : "starting",
        build_id: BUILD_ID,
        timestamp: new Date().toISOString(),
      },
      context,
    );
    return;
  }

  if (request.method === "GET" && (url.pathname === "/health/ready" || url.pathname === "/health")) {
    const readiness = await buildReadinessReport();
    sendJson(response, readiness.status === "not_ready" ? 503 : 200, readiness, context);
    return;
  }

  if (request.method === "GET" && url.pathname === "/metrics") {
    sendText(response, 200, metrics.render(), context);
    return;
  }

  if (request.method === "POST" && url.pathname === "/ingestions/structured") {
    const parseTimer = metrics.startTimer(
      "icicso_parse_duration_seconds",
      "Structured document parse and persist duration in seconds.",
      {},
    );
    metrics.incCounter("icicso_documents_received_total", "Structured documents received by parser.", {});

    try {
      const parsed = ingestionSchema.parse(await readJsonBody(request));
      const created = ingestStructuredDocument({
        caseId: parsed.caseId,
        documentType: parsed.documentType,
        sourceSystem: parsed.sourceSystem,
        ingestionMethod: parsed.ingestionMethod,
        rawFormat: parsed.rawFormat,
        language: parsed.language,
        payload: parsed.payload,
        ...(parsed.episodeId ? { episodeId: parsed.episodeId } : {}),
        ...(parsed.ilcId ? { ilcId: parsed.ilcId } : {}),
        ...(parsed.title ? { title: parsed.title } : {}),
        ...(parsed.fileName ? { fileName: parsed.fileName } : {}),
      });

      const duration = parseTimer();
      metrics.incCounter("icicso_parse_success_total", "Successful parser executions.", {
        document_type: parsed.documentType,
      });
      metrics.observeHistogram(
        "icicso_parse_duration_seconds",
        "Structured document parse and persist duration in seconds.",
        {
          document_type: parsed.documentType,
        },
        duration,
      );

      await writeAudit(context, created.event, parsed.caseId);

      sendJson(
        response,
        201,
        {
          ...created,
          telemetry: {
            service_name: SERVICE_NAME,
            correlation_id: context.correlationId,
            request_id: context.requestId,
            trace_id: context.traceId,
          },
        },
        context,
      );
      return;
    } catch (error) {
      const duration = parseTimer();
      metrics.incCounter("icicso_parse_failure_total", "Failed parser executions.", {});
      metrics.observeHistogram("icicso_parse_duration_seconds", "Structured document parse and persist duration in seconds.", {}, duration);
      logger.warn("structured-ingestion-failed", {
        correlation_id: context.correlationId,
        request_id: context.requestId,
        trace_id: context.traceId,
        span_id: context.spanId,
        route: url.pathname,
        error: error instanceof Error ? error.message : "Payload invalido",
        error_code: "INVALID_INGESTION_PAYLOAD",
      });
      sendError(response, 400, error instanceof Error ? error.message : "Payload invalido", context, "INVALID_INGESTION_PAYLOAD");
      return;
    }
  }

  sendError(response, 404, "Ruta no encontrada", context, "ROUTE_NOT_FOUND");
});

server.listen(config.port, () => {
  startupComplete = true;
  logger.info("service-started", {
    service_name: SERVICE_NAME,
    port: config.port,
    build_id: BUILD_ID,
  });
});
