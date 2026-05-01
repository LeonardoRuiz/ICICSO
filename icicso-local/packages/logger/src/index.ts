import { randomBytes, randomUUID } from "node:crypto";
import type { ServerResponse } from "node:http";

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;
type HeaderBag = Record<string, string | string[] | undefined>;
type MetricType = "counter" | "gauge" | "histogram";

interface HistogramMetric {
  help: string;
  type: "histogram";
  buckets: number[];
  values: Map<string, { count: number; sum: number; bucketCounts: Map<string, number> }>;
}

interface NumericMetric {
  help: string;
  type: "counter" | "gauge";
  values: Map<string, number>;
}

type MetricEntry = HistogramMetric | NumericMetric;

export interface RequestContext {
  serviceName: string;
  environment: string;
  correlationId: string;
  requestId: string;
  traceId: string;
  spanId: string;
  traceparent: string;
  method?: string;
  route?: string;
  userRole?: string | null;
}

const DEFAULT_HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

function write(level: LogLevel, service: string, message: string, meta?: LogMeta) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    service_name: service,
    environment: process.env.NODE_ENV ?? "development",
    message,
    ...(meta ?? {}),
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

export function createLogger(service: string) {
  return {
    debug: (message: string, meta?: LogMeta) => write("debug", service, message, meta),
    info: (message: string, meta?: LogMeta) => write("info", service, message, meta),
    warn: (message: string, meta?: LogMeta) => write("warn", service, message, meta),
    error: (message: string, meta?: LogMeta) => write("error", service, message, meta),
  };
}

export function createCorrelationId(existing?: string | null): string {
  return existing && existing.trim().length > 0 ? existing : randomUUID();
}

function normalizeHeaderValue(value?: string | string[] | null): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

function parseTraceparent(traceparent: string | null): { traceId: string; spanId: string } | null {
  if (!traceparent) {
    return null;
  }

  const match = traceparent.trim().match(/^00-([a-f0-9]{32})-([a-f0-9]{16})-[a-f0-9]{2}$/i);
  if (!match) {
    return null;
  }

  return {
    traceId: match[1]!,
    spanId: match[2]!,
  };
}

export function createTraceparent(traceId = randomHex(16), spanId = randomHex(8)) {
  return `00-${traceId}-${spanId}-01`;
}

export function createRequestContext(headers: HeaderBag, serviceName: string, route?: string, method?: string): RequestContext {
  const existingCorrelationId = normalizeHeaderValue(headers["x-correlation-id"]);
  const existingRequestId = normalizeHeaderValue(headers["x-request-id"]);
  const existingTraceparent = normalizeHeaderValue(headers.traceparent);
  const parsedTrace = parseTraceparent(existingTraceparent);
  const traceId = parsedTrace?.traceId ?? randomHex(16);
  const spanId = randomHex(8);

  return {
    serviceName,
    environment: process.env.NODE_ENV ?? "development",
    correlationId: createCorrelationId(existingCorrelationId),
    requestId: existingRequestId && existingRequestId.trim().length > 0 ? existingRequestId : randomUUID(),
    traceId,
    spanId,
    traceparent: createTraceparent(traceId, spanId),
    userRole: normalizeHeaderValue(headers["x-user-role"]),
    ...(route ? { route } : {}),
    ...(method ? { method } : {}),
  };
}

export function createChildTraceHeaders(context: RequestContext): Record<string, string> {
  return {
    "X-Correlation-Id": context.correlationId,
    "X-Request-Id": context.requestId,
    traceparent: createTraceparent(context.traceId, randomHex(8)),
  };
}

export function applyResponseTelemetryHeaders(response: ServerResponse, context: RequestContext) {
  response.setHeader("X-Correlation-Id", context.correlationId);
  response.setHeader("X-Request-Id", context.requestId);
  response.setHeader("traceparent", context.traceparent);
}

function labelsKey(labels: Record<string, string>) {
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}=${labels[key]}`)
    .join(",");
}

function parseLabels(labels: string): Record<string, string> {
  if (!labels) {
    return {};
  }

  const output: Record<string, string> = {};
  for (const label of labels.split(",")) {
    const [key, ...rest] = label.split("=");
    if (key) {
      output[key] = rest.join("=");
    }
  }
  return output;
}

function formatLabels(labels: Record<string, string>) {
  const keys = Object.keys(labels);
  if (keys.length === 0) {
    return "";
  }

  const body = keys
    .sort()
    .map((key) => `${key}="${(labels[key] ?? "").replaceAll("\"", "\\\"")}"`)
    .join(",");
  return `{${body}}`;
}

export class MetricsRegistry {
  private readonly metrics = new Map<string, MetricEntry>();

  incCounter(name: string, help: string, labels: Record<string, string> = {}, value = 1) {
    const metric = this.metrics.get(name);
    const counter =
      metric?.type === "counter"
        ? metric
        : {
            help,
            type: "counter" as const,
            values: new Map<string, number>(),
          };

    const key = labelsKey(labels);
    counter.values.set(key, (counter.values.get(key) ?? 0) + value);
    this.metrics.set(name, counter);
  }

  setGauge(name: string, help: string, labels: Record<string, string> = {}, value: number) {
    const metric = this.metrics.get(name);
    const gauge =
      metric?.type === "gauge"
        ? metric
        : {
            help,
            type: "gauge" as const,
            values: new Map<string, number>(),
          };

    gauge.values.set(labelsKey(labels), value);
    this.metrics.set(name, gauge);
  }

  observeHistogram(
    name: string,
    help: string,
    labels: Record<string, string> = {},
    value: number,
    buckets = DEFAULT_HISTOGRAM_BUCKETS,
  ) {
    const metric = this.metrics.get(name);
    const histogram =
      metric?.type === "histogram"
        ? metric
        : {
            help,
            type: "histogram" as const,
            buckets: [...buckets],
            values: new Map<string, { count: number; sum: number; bucketCounts: Map<string, number> }>(),
          };

    const key = labelsKey(labels);
    const sample = histogram.values.get(key) ?? {
      count: 0,
      sum: 0,
      bucketCounts: new Map<string, number>(),
    };

    sample.count += 1;
    sample.sum += value;

    for (const bucket of histogram.buckets) {
      const bucketKey = bucket.toString();
      if (value <= bucket) {
        sample.bucketCounts.set(bucketKey, (sample.bucketCounts.get(bucketKey) ?? 0) + 1);
      }
    }
    sample.bucketCounts.set("+Inf", (sample.bucketCounts.get("+Inf") ?? 0) + 1);

    histogram.values.set(key, sample);
    this.metrics.set(name, histogram);
  }

  startTimer(name: string, help: string, labels: Record<string, string> = {}, buckets = DEFAULT_HISTOGRAM_BUCKETS) {
    const startedAt = process.hrtime.bigint();
    return () => {
      const elapsed = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      this.observeHistogram(name, help, labels, elapsed, buckets);
      return elapsed;
    };
  }

  render() {
    const lines: string[] = [];

    for (const [name, metric] of this.metrics.entries()) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} ${metric.type}`);

      if (metric.type === "histogram") {
        for (const [labelsKeyValue, sample] of metric.values.entries()) {
          const labels = parseLabels(labelsKeyValue);
          for (const bucket of [...metric.buckets, Number.POSITIVE_INFINITY]) {
            const bucketKey = Number.isFinite(bucket) ? bucket.toString() : "+Inf";
            lines.push(`${name}_bucket${formatLabels({ ...labels, le: bucketKey })} ${sample.bucketCounts.get(bucketKey) ?? 0}`);
          }
          lines.push(`${name}_sum${formatLabels(labels)} ${sample.sum}`);
          lines.push(`${name}_count${formatLabels(labels)} ${sample.count}`);
        }
        continue;
      }

      for (const [labelsKeyValue, value] of metric.values.entries()) {
        lines.push(`${name}${formatLabels(parseLabels(labelsKeyValue))} ${value}`);
      }
    }

    return `${lines.join("\n")}\n`;
  }
}
