import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { loadServiceConfig } from "@icicso/config";
import {
  MetricsRegistry,
  applyResponseTelemetryHeaders,
  createChildTraceHeaders,
  createLogger,
  createRequestContext,
} from "@icicso/logger";

const config = loadServiceConfig("gateway-api", 3100);
const logger = createLogger("gateway-api");
const metrics = new MetricsRegistry();
const UPSTREAM_TIMEOUT_MS = 4000;
const SERVICE_NAME = "gateway-api";
const BUILD_ID = process.env.BUILD_ID ?? "dev-local";
const SEMANTIC_ENGINE_URL = process.env.TERMINOLOGY_ENGINE_URL ?? null;

let startupComplete = false;
let activeRequests = 0;

type DependencyStatus = {
  dependency: string;
  target: string;
  critical: boolean;
  status: "up" | "down";
  latency_ms?: number;
  details?: Record<string, unknown> | null;
  error?: string;
};

type RequestContext = ReturnType<typeof createRequestContext>;

const readinessDependencies = [
  { dependency: "auth-service", target: config.urls.auth, critical: true },
  { dependency: "identity-service", target: config.urls.identity, critical: true },
  { dependency: "ingestion-service", target: config.urls.ingestion, critical: true },
  { dependency: "terminology-service", target: config.urls.terminology, critical: true },
  { dependency: "semantic-terminology-engine", target: SEMANTIC_ENGINE_URL, critical: false },
  { dependency: "audit-service", target: config.urls.audit, critical: false },
  { dependency: "storage-service", target: config.urls.storage, critical: false },
  { dependency: "data-governance-service", target: config.urls.dataGovernance, critical: false },
  { dependency: "evidence-lake-service", target: config.urls.evidenceLake, critical: false },
  { dependency: "ghl-service", target: config.urls.ghl, critical: false },
  { dependency: "kbol-service", target: config.urls.kbol, critical: false },
  { dependency: "runbook-service", target: config.urls.runbook, critical: false },
  { dependency: "readiness-service", target: config.urls.readiness, critical: false },
  { dependency: "case-control-service", target: config.urls.caseControl, critical: false },
  { dependency: "systemic-risk-service", target: config.urls.systemicRisk, critical: false },
  { dependency: "cqoi-service", target: config.urls.cqoi, critical: false },
].filter((dependency): dependency is { dependency: string; target: string; critical: boolean } => Boolean(dependency.target));

function setCors(response: ServerResponse, context: RequestContext) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Correlation-Id, X-Request-Id, traceparent");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  applyResponseTelemetryHeaders(response, context);
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : Buffer.alloc(0);
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown, context: RequestContext) {
  setCors(response, context);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function sendText(response: ServerResponse, statusCode: number, body: string, context: RequestContext, contentType = "text/plain; version=0.0.4; charset=utf-8") {
  setCors(response, context);
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

async function fetchUpstream(url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

async function getDependencyHealth(
  dependency: string,
  target: string,
  context: RequestContext,
  critical: boolean,
): Promise<DependencyStatus> {
  const startedAt = process.hrtime.bigint();
  const headers = createChildTraceHeaders(context);

  try {
    let response = await fetchUpstream(`${target}/health/ready`, { headers });
    if (!response.ok && response.status === 404) {
      response = await fetchUpstream(`${target}/health`, { headers });
    }

    if (!response.ok) {
      throw new Error(`health ${response.status}`);
    }

    const details = (await response.json()) as Record<string, unknown>;
    return {
      dependency,
      target,
      critical,
      status: "up",
      latency_ms: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
      details,
    };
  } catch (error) {
    return {
      dependency,
      target,
      critical,
      status: "down",
      latency_ms: Number(process.hrtime.bigint() - startedAt) / 1_000_000,
      error: error instanceof Error ? error.message : "unknown-error",
    };
  }
}

async function buildReadinessReport(context: RequestContext) {
  const dependencies = await Promise.all(
    readinessDependencies.map((dependency) =>
      getDependencyHealth(dependency.dependency, dependency.target, context, dependency.critical),
    ),
  );

  const criticalFailures = dependencies.filter((dependency) => dependency.critical && dependency.status !== "up");
  const degraded = dependencies.filter((dependency) => !dependency.critical && dependency.status !== "up");
  const status = criticalFailures.length > 0 ? "not_ready" : degraded.length > 0 ? "degraded" : "ready";

  return {
    service_name: SERVICE_NAME,
    status,
    build_id: BUILD_ID,
    timestamp: new Date().toISOString(),
    process: {
      pid: process.pid,
      uptime_seconds: Number(process.uptime().toFixed(3)),
      memory_rss_bytes: process.memoryUsage().rss,
      active_requests: activeRequests,
    },
    dependencies,
  };
}

async function proxyRequest(
  request: IncomingMessage,
  response: ServerResponse,
  targetUrl: string,
  context: RequestContext,
) {
  const timer = metrics.startTimer(
    "icicso_gateway_upstream_duration_seconds",
    "Gateway upstream request latency in seconds.",
    {
      target: new URL(targetUrl).origin,
    },
  );

  try {
    const body = await readBody(request);
    const method = request.method ?? "GET";
    const requestInit: RequestInit = {
      method,
      headers: {
        "Content-Type": request.headers["content-type"] ?? "application/json",
        ...(request.headers.authorization ? { Authorization: request.headers.authorization } : {}),
        ...createChildTraceHeaders(context),
      },
    };

    if (body.length > 0) {
      requestInit.body = body;
    }

    const proxied = await fetchUpstream(targetUrl, requestInit);
    const text = await proxied.text();
    timer();
    setCors(response, context);
    response.writeHead(proxied.status, {
      "Content-Type": proxied.headers.get("content-type") ?? "application/json; charset=utf-8",
    });
    response.end(text);
  } catch (error) {
    const elapsed = timer();
    metrics.incCounter(
      "icicso_gateway_upstream_failures_total",
      "Failed upstream requests by gateway.",
      {
        route: context.route ?? "unknown",
      },
    );
    logger.warn("upstream-request-failed", {
      correlation_id: context.correlationId,
      request_id: context.requestId,
      trace_id: context.traceId,
      span_id: context.spanId,
      route: context.route,
      target_url: targetUrl,
      duration_ms: Number(elapsed.toFixed(6)) * 1000,
      error: error instanceof Error ? error.message : "unknown-error",
      error_code: "UPSTREAM_UNAVAILABLE",
    });
    sendError(response, 502, `Upstream unavailable: ${targetUrl}`, context, "UPSTREAM_UNAVAILABLE");
  }
}

function beginRequest(request: IncomingMessage) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const context = createRequestContext(request.headers, SERVICE_NAME, url.pathname, request.method);
  const timer = metrics.startTimer(
    "icicso_api_request_duration_seconds",
    "Gateway API request duration in seconds.",
    {
      method: request.method ?? "UNKNOWN",
      route: url.pathname,
    },
  );

  activeRequests += 1;
  metrics.setGauge("icicso_api_active_requests", "Active requests handled by gateway API.", {}, activeRequests);
  metrics.incCounter(
    "icicso_api_request_count_total",
    "Total requests handled by gateway API.",
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
    metrics.setGauge("icicso_api_active_requests", "Active requests handled by gateway API.", {}, activeRequests);
    const durationSeconds = timer();
    const statusCode = response.statusCode || 0;

    metrics.observeHistogram(
      "icicso_api_request_duration_seconds",
      "Gateway API request duration in seconds.",
      {
        method: context.method ?? "UNKNOWN",
        route: context.route ?? "unknown",
        status_code: String(statusCode),
      },
      durationSeconds,
    );

    if (statusCode >= 400) {
      metrics.incCounter(
        "icicso_api_error_count_total",
        "Gateway API request errors by route and status code.",
        {
          method: context.method ?? "UNKNOWN",
          route: context.route ?? "unknown",
          status_code: String(statusCode),
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
      status_code: statusCode,
      duration_ms: Math.round(durationSeconds * 1000),
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
    method: request.method,
    route: url.pathname,
  });

  if (request.method === "OPTIONS") {
    setCors(response, context);
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
        process: {
          pid: process.pid,
          uptime_seconds: Number(process.uptime().toFixed(3)),
        },
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
    const readiness = await buildReadinessReport(context);
    sendJson(response, readiness.status === "not_ready" ? 503 : 200, readiness, context);
    return;
  }

  if (request.method === "GET" && url.pathname === "/metrics") {
    sendText(response, 200, metrics.render(), context);
    return;
  }

  if (request.method === "GET" && url.pathname === "/block1/overview") {
    const [authHealth, identityHealth, auditHealth, demoCaseResponse, auditResponse] = await Promise.all([
      getDependencyHealth("auth-service", config.urls.auth, context, true),
      getDependencyHealth("identity-service", config.urls.identity, context, true),
      getDependencyHealth("audit-service", config.urls.audit, context, false),
      fetchUpstream(`${config.urls.identity}/cases/${config.demoCaseId}`, {
        headers: createChildTraceHeaders(context),
      }).catch(() => null),
      fetchUpstream(`${config.urls.audit}/events?caseId=${config.demoCaseId}&limit=12`, {
        headers: createChildTraceHeaders(context),
      }).catch(() => null),
    ]);

    const demoCasePayload =
      demoCaseResponse && demoCaseResponse.ok
        ? ((await demoCaseResponse.json()) as {
            longitudinalIdentity?: { ilcId?: string };
            episodes?: Array<{ episodeId?: string }>;
            caseId: string;
            reason?: string | null;
            clinicalSummary?: string | null;
            status: string;
          })
        : null;
    const auditTimeline = auditResponse && auditResponse.ok ? await auditResponse.json() : [];

    sendJson(
      response,
      200,
      {
        services: [authHealth, identityHealth, auditHealth].filter((service) => service.status === "up"),
        demoCase: demoCasePayload
          ? {
              ilcId: demoCasePayload.longitudinalIdentity?.ilcId ?? config.demoIlcId,
              episodeId: demoCasePayload.episodes?.[0]?.episodeId ?? config.demoEpisodeId,
              caseId: demoCasePayload.caseId,
              reason: demoCasePayload.reason ?? null,
              clinicalSummary: demoCasePayload.clinicalSummary ?? null,
              status: demoCasePayload.status,
            }
          : null,
        auditTimeline,
      },
      context,
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/block2/overview") {
    const [
      storageHealth,
      ingestionHealth,
      terminologyHealth,
      governanceHealth,
      documentsResponse,
      overviewResponse,
    ] = await Promise.all([
      getDependencyHealth("storage-service", config.urls.storage, context, false),
      getDependencyHealth("ingestion-service", config.urls.ingestion, context, true),
      getDependencyHealth("terminology-service", config.urls.terminology, context, true),
      getDependencyHealth("data-governance-service", config.urls.dataGovernance, context, false),
      fetchUpstream(`${config.urls.storage}/cases/${config.demoCaseId}/documents`, {
        headers: createChildTraceHeaders(context),
      }).catch(() => null),
      fetchUpstream(`${config.urls.dataGovernance}/overview?caseId=${config.demoCaseId}`, {
        headers: createChildTraceHeaders(context),
      }).catch(() => null),
    ]);

    const documents = documentsResponse && documentsResponse.ok ? await documentsResponse.json() : [];
    const governanceOverview =
      overviewResponse && overviewResponse.ok
        ? (await overviewResponse.json()) as {
            parsedVariables?: unknown[];
            provenanceRecords?: unknown[];
            terminologyMappings?: unknown[];
            certificationRecords?: unknown[];
            datasetStatus?: unknown;
            ingestionEvents?: unknown[];
            terminologyCatalog?: unknown[];
          }
        : null;

    sendJson(
      response,
      200,
      {
        services: [storageHealth, ingestionHealth, terminologyHealth, governanceHealth].filter((service) => service.status === "up"),
        documents,
        parsedVariables: governanceOverview?.parsedVariables ?? [],
        provenanceRecords: governanceOverview?.provenanceRecords ?? [],
        terminologyMappings: governanceOverview?.terminologyMappings ?? [],
        certificationRecords: governanceOverview?.certificationRecords ?? [],
        datasetStatus: governanceOverview?.datasetStatus ?? null,
        ingestionEvents: governanceOverview?.ingestionEvents ?? [],
        terminologyCatalog: governanceOverview?.terminologyCatalog ?? [],
      },
      context,
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/block2/dataset-status") {
    const caseId = url.searchParams.get("caseId") ?? config.demoCaseId;
    const [governanceHealth, statusResponse] = await Promise.all([
      getDependencyHealth("data-governance-service", config.urls.dataGovernance, context, false),
      fetchUpstream(`${config.urls.dataGovernance}/dataset-status?caseId=${encodeURIComponent(caseId)}`, {
        headers: createChildTraceHeaders(context),
      }).catch(() => null),
    ]);

    const datasetStatus = statusResponse && statusResponse.ok ? await statusResponse.json() : null;

    sendJson(
      response,
      200,
      {
        services: governanceHealth.status === "up" ? [governanceHealth] : [],
        datasetStatus,
      },
      context,
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/block3/evidence-lake/summary") {
    const [evidenceLakeHealth, summaryResponse] = await Promise.all([
      getDependencyHealth("evidence-lake-service", config.urls.evidenceLake, context, false),
      fetchUpstream(`${config.urls.evidenceLake}/summary?caseId=${config.demoCaseId}`, {
        headers: createChildTraceHeaders(context),
      }).catch(() => null),
    ]);

    const summary = summaryResponse && summaryResponse.ok ? await summaryResponse.json() : null;

    sendJson(
      response,
      200,
      {
        services: evidenceLakeHealth.status === "up" ? [evidenceLakeHealth] : [],
        evidenceLake: summary,
      },
      context,
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/block5/gp-cpo/summary") {
    const [ghlHealth, kbolHealth, ghlSummaryResponse, kbolSummaryResponse] = await Promise.all([
      getDependencyHealth("ghl-service", config.urls.ghl, context, false),
      getDependencyHealth("kbol-service", config.urls.kbol, context, false),
      fetchUpstream(`${config.urls.ghl}/summary?caseId=${config.demoCaseId}`, {
        headers: createChildTraceHeaders(context),
      }).catch(() => null),
      fetchUpstream(`${config.urls.kbol}/summary?caseId=${config.demoCaseId}`, {
        headers: createChildTraceHeaders(context),
      }).catch(() => null),
    ]);

    const ghlSummary = ghlSummaryResponse && ghlSummaryResponse.ok ? await ghlSummaryResponse.json() : null;
    const kbolSummary = kbolSummaryResponse && kbolSummaryResponse.ok ? await kbolSummaryResponse.json() : null;

    sendJson(
      response,
      200,
      {
        services: [ghlHealth, kbolHealth].filter((service) => service.status === "up"),
        guidelineHub: ghlSummary,
        kbol: kbolSummary,
      },
      context,
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/block6/readiness/summary") {
    const [runbookHealth, readinessHealth, runbookSummaryResponse, readinessSummaryResponse] = await Promise.all([
      getDependencyHealth("runbook-service", config.urls.runbook, context, false),
      getDependencyHealth("readiness-service", config.urls.readiness, context, false),
      fetchUpstream(`${config.urls.runbook}/summary?caseId=${config.demoCaseId}`, {
        headers: createChildTraceHeaders(context),
      }).catch(() => null),
      fetchUpstream(`${config.urls.readiness}/summary?caseId=${config.demoCaseId}`, {
        headers: createChildTraceHeaders(context),
      }).catch(() => null),
    ]);

    const runbookSummary = runbookSummaryResponse && runbookSummaryResponse.ok ? await runbookSummaryResponse.json() : null;
    const readinessSummary = readinessSummaryResponse && readinessSummaryResponse.ok ? await readinessSummaryResponse.json() : null;

    sendJson(
      response,
      200,
      {
        services: [runbookHealth, readinessHealth].filter((service) => service.status === "up"),
        runbook: runbookSummary,
        readiness: readinessSummary,
      },
      context,
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/block7/case-control/summary") {
    const [caseControlHealth, summaryResponse] = await Promise.all([
      getDependencyHealth("case-control-service", config.urls.caseControl, context, false),
      fetchUpstream(`${config.urls.caseControl}/summary?caseId=${config.demoCaseId}`, {
        headers: createChildTraceHeaders(context),
      }).catch(() => null),
    ]);

    const summary = summaryResponse && summaryResponse.ok ? await summaryResponse.json() : null;

    sendJson(
      response,
      200,
      {
        services: caseControlHealth.status === "up" ? [caseControlHealth] : [],
        caseControl: summary,
      },
      context,
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/block8/systemic-control/summary") {
    const [systemicRiskHealth, cqoiHealth, systemicRiskSummaryResponse, cqoiSummaryResponse] = await Promise.all([
      getDependencyHealth("systemic-risk-service", config.urls.systemicRisk, context, false),
      getDependencyHealth("cqoi-service", config.urls.cqoi, context, false),
      fetchUpstream(`${config.urls.systemicRisk}/summary?caseId=${config.demoCaseId}`, {
        headers: createChildTraceHeaders(context),
      }).catch(() => null),
      fetchUpstream(`${config.urls.cqoi}/summary?caseId=${config.demoCaseId}`, {
        headers: createChildTraceHeaders(context),
      }).catch(() => null),
    ]);

    const systemicRiskSummary = systemicRiskSummaryResponse && systemicRiskSummaryResponse.ok
      ? await systemicRiskSummaryResponse.json()
      : null;
    const cqoiSummary = cqoiSummaryResponse && cqoiSummaryResponse.ok ? await cqoiSummaryResponse.json() : null;

    sendJson(
      response,
      200,
      {
        services: [systemicRiskHealth, cqoiHealth].filter((service) => service.status === "up"),
        systemicRisk: systemicRiskSummary,
        cqoi: cqoiSummary,
      },
      context,
    );
    return;
  }

  if (url.pathname.startsWith("/auth")) {
    await proxyRequest(request, response, `${config.urls.auth}${url.pathname.replace("/auth", "") || "/"}${url.search}`, context);
    return;
  }

  if (url.pathname.startsWith("/identity")) {
    await proxyRequest(
      request,
      response,
      `${config.urls.identity}${url.pathname.replace("/identity", "") || "/"}${url.search}`,
      context,
    );
    return;
  }

  if (url.pathname.startsWith("/audit")) {
    await proxyRequest(request, response, `${config.urls.audit}${url.pathname.replace("/audit", "") || "/"}${url.search}`, context);
    return;
  }

  if (url.pathname.startsWith("/storage")) {
    await proxyRequest(
      request,
      response,
      `${config.urls.storage}${url.pathname.replace("/storage", "") || "/"}${url.search}`,
      context,
    );
    return;
  }

  if (url.pathname.startsWith("/ingestion")) {
    await proxyRequest(
      request,
      response,
      `${config.urls.ingestion}${url.pathname.replace("/ingestion", "") || "/"}${url.search}`,
      context,
    );
    return;
  }

  if (url.pathname.startsWith("/terminology")) {
    await proxyRequest(
      request,
      response,
      `${config.urls.terminology}${url.pathname.replace("/terminology", "") || "/"}${url.search}`,
      context,
    );
    return;
  }

  if (url.pathname.startsWith("/governance")) {
    await proxyRequest(
      request,
      response,
      `${config.urls.dataGovernance}${url.pathname.replace("/governance", "") || "/"}${url.search}`,
      context,
    );
    return;
  }

  if (url.pathname.startsWith("/evidence-lake")) {
    await proxyRequest(
      request,
      response,
      `${config.urls.evidenceLake}${url.pathname.replace("/evidence-lake", "") || "/"}${url.search}`,
      context,
    );
    return;
  }

  if (url.pathname.startsWith("/ghl")) {
    await proxyRequest(request, response, `${config.urls.ghl}${url.pathname.replace("/ghl", "") || "/"}${url.search}`, context);
    return;
  }

  if (url.pathname.startsWith("/kbol")) {
    await proxyRequest(request, response, `${config.urls.kbol}${url.pathname.replace("/kbol", "") || "/"}${url.search}`, context);
    return;
  }

  if (url.pathname.startsWith("/runbook")) {
    await proxyRequest(
      request,
      response,
      `${config.urls.runbook}${url.pathname.replace("/runbook", "") || "/"}${url.search}`,
      context,
    );
    return;
  }

  if (url.pathname.startsWith("/readiness")) {
    await proxyRequest(
      request,
      response,
      `${config.urls.readiness}${url.pathname.replace("/readiness", "") || "/"}${url.search}`,
      context,
    );
    return;
  }

  if (url.pathname.startsWith("/case-control")) {
    await proxyRequest(
      request,
      response,
      `${config.urls.caseControl}${url.pathname.replace("/case-control", "") || "/"}${url.search}`,
      context,
    );
    return;
  }

  if (url.pathname.startsWith("/systemic-risk")) {
    await proxyRequest(
      request,
      response,
      `${config.urls.systemicRisk}${url.pathname.replace("/systemic-risk", "") || "/"}${url.search}`,
      context,
    );
    return;
  }

  if (url.pathname.startsWith("/cqoi")) {
    await proxyRequest(request, response, `${config.urls.cqoi}${url.pathname.replace("/cqoi", "") || "/"}${url.search}`, context);
    return;
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
