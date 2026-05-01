export const logLevels = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof logLevels)[number];

export interface StructuredLogEntry {
  level: LogLevel;
  namespace: string;
  message: string;
  timestamp: string;
  traceId?: string;
  context?: Record<string, unknown>;
}
