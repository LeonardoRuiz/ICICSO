import type { LogLevel, StructuredLogEntry } from "./types.ts";

function write(entry: StructuredLogEntry) {
  const payload = JSON.stringify(entry);

  if (entry.level === "error") {
    console.error(payload);
    return;
  }

  if (entry.level === "warn") {
    console.warn(payload);
    return;
  }

  console.log(payload);
}

export interface Logger {
  emit(level: LogLevel, message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export function createLogger(namespace: string, traceId?: string): Logger {
  const emit = (level: LogLevel, message: string, context?: Record<string, unknown>) =>
    write({
      level,
      namespace,
      message,
      timestamp: new Date().toISOString(),
      traceId,
      context,
    });

  return {
    emit,
    debug(message, context) {
      emit("debug", message, context);
    },
    info(message, context) {
      emit("info", message, context);
    },
    warn(message, context) {
      emit("warn", message, context);
    },
    error(message, context) {
      emit("error", message, context);
    },
  };
}
