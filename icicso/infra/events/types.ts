export interface InternalEventEnvelope<TPayload = Record<string, unknown>> {
  name: InternalEventName;
  source: string;
  occurredAt: string;
  traceId?: string;
  payload: TPayload;
}

export type InternalEventName = `icicso.${string}.${string}`;
