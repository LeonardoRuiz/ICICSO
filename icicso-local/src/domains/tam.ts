import { layerResult } from "../core/layer-result";
import type { BomArtifact, LayerResult, TamArtifact } from "../core/types";

export function buildTam(bom: BomArtifact | null): { result: LayerResult; artifact: TamArtifact | null } {
  const blockers = bom ? [] : ["BOM must be ready before TAM"];
  const artifact: TamArtifact | null = bom
    ? {
        status: "READY",
        phases: [0, 1, 2, 3, 4, 5, 6],
      }
    : null;

  return {
    artifact,
    result: layerResult({
      id: "TAM",
      name: "Temporal Activation Model",
      status: artifact ? "READY" : "BLOCKED",
      message: artifact ? "Phases 0 through 6 activated" : "TAM generation blocked",
      blockers,
      critical: blockers.length > 0,
      artifacts: artifact ? { tam: artifact } : {},
    }),
  };
}
