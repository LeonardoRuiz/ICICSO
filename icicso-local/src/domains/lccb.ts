import { layerResult } from "../core/layer-result";
import type { LayerResult, LccbArtifact, RdygArtifact } from "../core/types";

export function evaluateLccb(rdyg: RdygArtifact): { result: LayerResult; artifact: LccbArtifact | null } {
  const blockers = rdyg.decision === "GO" ? [] : ["Readiness gate must be GO"];
  const artifact: LccbArtifact | null =
    blockers.length === 0
      ? {
          status: "OPERATIONALLY FEASIBLE",
          modifiesClinicalIndication: false,
        }
      : null;

  return {
    artifact,
    result: layerResult({
      id: "LCCB",
      name: "Logistics & Complex Coordination Branch",
      status: artifact ? "OPERATIONALLY FEASIBLE" : "BLOCKED",
      message: artifact ? "Operational feasibility validated without modifying clinical indication" : "Operational feasibility blocked",
      blockers,
      critical: blockers.length > 0,
      artifacts: artifact ? { lccb: artifact } : {},
    }),
  };
}
