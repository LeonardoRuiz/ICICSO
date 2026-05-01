import type { LayerId, LayerResult } from "./types";

export function layerResult(input: {
  id: LayerId;
  name: string;
  status: string;
  message: string;
  blockers?: string[];
  metrics?: Record<string, unknown>;
  artifacts?: Record<string, unknown>;
  critical?: boolean;
}): LayerResult {
  return {
    id: input.id,
    name: input.name,
    status: input.status,
    message: input.message,
    blockers: input.blockers ?? [],
    metrics: input.metrics ?? {},
    artifacts: input.artifacts ?? {},
    critical: input.critical ?? false,
  };
}
