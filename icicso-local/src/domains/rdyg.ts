import { layerResult } from "../core/layer-result";
import type { EvtArtifact, LayerResult, RdygArtifact } from "../core/types";

export function evaluateReadinessGate(evt: EvtArtifact): { result: LayerResult; artifact: RdygArtifact } {
  const blocked = evt.criticalActive > 0;
  const artifact: RdygArtifact = {
    gateId: "GATE-0",
    decision: blocked ? "BLOCKED" : "GO",
  };

  return {
    artifact,
    result: layerResult({
      id: "RDY-G",
      name: "Readiness Gate",
      status: blocked ? "GATE-0 BLOCKED" : "GATE-0 GO",
      message: blocked ? "Critical active EVT blocks readiness" : "Readiness gate cleared",
      blockers: blocked ? ["Critical active EVT present"] : [],
      critical: blocked,
      artifacts: { rdyg: artifact },
    }),
  };
}
