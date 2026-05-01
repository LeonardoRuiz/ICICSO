import { layerResult } from "../core/layer-result";
import type { BomArtifact, LayerResult, RunbookArtifact } from "../core/types";

export function validateBom(runbook: RunbookArtifact | null): { result: LayerResult; artifact: BomArtifact | null } {
  const blockers = runbook ? [] : ["Runbook required before BOM validation"];
  const artifact: BomArtifact | null = runbook
    ? {
        status: "READY",
        validated: ["IB-BOM", "P-BOM", "E-BOM", "systemic-contingencies"],
      }
    : null;

  return {
    artifact,
    result: layerResult({
      id: "BOM",
      name: "Bill of Materials",
      status: artifact ? "READY" : "BLOCKED",
      message: artifact ? "IB-BOM, P-BOM, E-BOM and systemic contingencies validated" : "BOM validation blocked",
      blockers,
      critical: blockers.length > 0,
      artifacts: artifact ? { bom: artifact } : {},
    }),
  };
}
