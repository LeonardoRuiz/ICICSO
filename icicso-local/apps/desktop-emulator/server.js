const { createServer } = require("node:http");
const { createReadStream, existsSync, statSync } = require("node:fs");
const { extname, join, normalize } = require("node:path");
const { randomBytes, randomUUID } = require("node:crypto");

const HOST = process.env.FRONTEND_HOST || "0.0.0.0";
const PORT = Number(process.env.FRONTEND_PORT || process.env.PORT || 8080);
const ROOT = __dirname;
const BUILD_ID = process.env.BUILD_ID || "dev-local";
const SERVICE_NAME = "desktop-emulator";

let activeRequests = 0;
let startupComplete = false;
const counters = new Map();
const durations = [];

function log(level, message, meta = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service_name: SERVICE_NAME,
    environment: process.env.NODE_ENV || "development",
    message,
    ...meta,
  };
  console.log(JSON.stringify(payload));
}

function normalizeHeader(value) {
  return Array.isArray(value) ? value[0] : value;
}

function randomHex(bytes) {
  return randomBytes(bytes).toString("hex");
}

function buildContext(request, route) {
  const traceparent = normalizeHeader(request.headers.traceparent);
  const match = traceparent && /^00-([a-f0-9]{32})-([a-f0-9]{16})-[a-f0-9]{2}$/i.exec(traceparent);
  const traceId = match ? match[1] : randomHex(16);

  return {
    route,
    method: request.method || "GET",
    trace_id: traceId,
    span_id: randomHex(8),
    request_id: normalizeHeader(request.headers["x-request-id"]) || randomUUID(),
    correlation_id: normalizeHeader(request.headers["x-correlation-id"]) || randomUUID(),
  };
}

function applyTelemetryHeaders(response, context) {
  response.setHeader("X-Correlation-Id", context.correlation_id);
  response.setHeader("X-Request-Id", context.request_id);
  response.setHeader("traceparent", `00-${context.trace_id}-${context.span_id}-01`);
}

function contentType(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function counterKey(labels) {
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}=${labels[key]}`)
    .join(",");
}

function formatLabels(labels) {
  const keys = Object.keys(labels);
  if (keys.length === 0) {
    return "";
  }

  return `{${keys
    .sort()
    .map((key) => `${key}="${String(labels[key]).replaceAll('"', '\\"')}"`)
    .join(",")}}`;
}

function incrementCounter(name, help, labels, value = 1) {
  const key = `${name}::${counterKey(labels)}`;
  const current = counters.get(key) || { help, labels, value: 0 };
  current.value += value;
  counters.set(key, current);
}

function observeDuration(route, method, statusCode, durationSeconds) {
  durations.push({ route, method, statusCode, durationSeconds });
}

function metricsPayload() {
  const lines = [
    "# HELP icicso_frontend_active_requests Active frontend emulator requests.",
    "# TYPE icicso_frontend_active_requests gauge",
    `icicso_frontend_active_requests ${activeRequests}`,
    "# HELP icicso_frontend_health Frontend readiness state.",
    "# TYPE icicso_frontend_health gauge",
    "icicso_frontend_health 1",
    "# HELP icicso_frontend_request_count_total Total frontend emulator requests.",
    "# TYPE icicso_frontend_request_count_total counter",
  ];

  for (const [key, sample] of counters.entries()) {
    const [name] = key.split("::");
    if (name !== "icicso_frontend_request_count_total") {
      continue;
    }
    lines.push(`${name}${formatLabels(sample.labels)} ${sample.value}`);
  }

  lines.push("# HELP icicso_frontend_request_duration_seconds Frontend emulator request duration.");
  lines.push("# TYPE icicso_frontend_request_duration_seconds histogram");

  const buckets = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5];
  const groups = new Map();
  for (const sample of durations) {
    const labels = { route: sample.route, method: sample.method, status_code: String(sample.statusCode) };
    const key = counterKey(labels);
    const group = groups.get(key) || { labels, values: [] };
    group.values.push(sample.durationSeconds);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    for (const bucket of [...buckets, Number.POSITIVE_INFINITY]) {
      const le = Number.isFinite(bucket) ? bucket.toString() : "+Inf";
      const count = group.values.filter((value) => (Number.isFinite(bucket) ? value <= bucket : true)).length;
      lines.push(`icicso_frontend_request_duration_seconds_bucket${formatLabels({ ...group.labels, le })} ${count}`);
    }
    const sum = group.values.reduce((acc, value) => acc + value, 0);
    lines.push(`icicso_frontend_request_duration_seconds_sum${formatLabels(group.labels)} ${sum}`);
    lines.push(`icicso_frontend_request_duration_seconds_count${formatLabels(group.labels)} ${group.values.length}`);
  }

  return `${lines.join("\n")}\n`;
}

function sendJson(response, statusCode, body, context) {
  applyTelemetryHeaders(response, context);
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function serveFile(response, filePath, context) {
  applyTelemetryHeaders(response, context);
  response.writeHead(200, { "Content-Type": contentType(filePath) });
  createReadStream(filePath).pipe(response);
}

function resolveFile(pathname) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const candidate = normalize(join(ROOT, cleanPath));
  if (!candidate.startsWith(ROOT)) {
    return null;
  }
  if (!existsSync(candidate) || !statSync(candidate).isFile()) {
    return null;
  }
  return candidate;
}

const server = createServer((request, response) => {
  const startedAt = process.hrtime.bigint();
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
  const context = buildContext(request, url.pathname);

  activeRequests += 1;
  incrementCounter("icicso_frontend_request_count_total", "Total frontend emulator requests.", {
    route: url.pathname,
    method: context.method,
  });

  response.once("finish", () => {
    activeRequests = Math.max(activeRequests - 1, 0);
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    observeDuration(url.pathname, context.method, response.statusCode || 0, durationSeconds);
    log("info", "request-completed", {
      ...context,
      status_code: response.statusCode,
      duration_ms: Math.round(durationSeconds * 1000),
    });
  });

  if (request.method === "GET" && url.pathname === "/health/live") {
    sendJson(response, 200, {
      service_name: SERVICE_NAME,
      status: "live",
      build_id: BUILD_ID,
      timestamp: new Date().toISOString(),
    }, context);
    return;
  }

  if (request.method === "GET" && url.pathname === "/health/startup") {
    sendJson(response, startupComplete ? 200 : 503, {
      service_name: SERVICE_NAME,
      status: startupComplete ? "started" : "starting",
      build_id: BUILD_ID,
      timestamp: new Date().toISOString(),
    }, context);
    return;
  }

  if (request.method === "GET" && (url.pathname === "/health/ready" || url.pathname === "/health")) {
    sendJson(response, 200, {
      service_name: SERVICE_NAME,
      status: "ready",
      build_id: BUILD_ID,
      timestamp: new Date().toISOString(),
      process: {
        pid: process.pid,
        uptime_seconds: Number(process.uptime().toFixed(3)),
        active_requests: activeRequests,
      },
    }, context);
    return;
  }

  if (request.method === "GET" && url.pathname === "/metrics") {
    applyTelemetryHeaders(response, context);
    response.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
    response.end(metricsPayload());
    return;
  }

  const filePath = resolveFile(url.pathname);
  if (filePath) {
    serveFile(response, filePath, context);
    return;
  }

  sendJson(response, 404, {
    service_name: SERVICE_NAME,
    status: "not_found",
    message: "Ruta no encontrada",
    timestamp: new Date().toISOString(),
  }, context);
});

server.listen(PORT, HOST, () => {
  startupComplete = true;
  log("info", "frontend-server-started", {
    build_id: BUILD_ID,
    port: PORT,
    host: HOST,
  });
});
