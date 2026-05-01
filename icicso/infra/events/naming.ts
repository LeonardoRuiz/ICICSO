import type { InternalEventEnvelope, InternalEventName } from "./types.ts";

export function createInternalEventName(moduleId: string, action: string): InternalEventName {
  return `icicso.${moduleId}.${action}`;
}

export function createInternalEvent<TPayload>(
  moduleId: string,
  action: string,
  payload: TPayload,
  traceId?: string,
): InternalEventEnvelope<TPayload> {
  return {
    name: createInternalEventName(moduleId, action),
    source: "icicso",
    occurredAt: new Date().toISOString(),
    traceId,
    payload,
  };
}
