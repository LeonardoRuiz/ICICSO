import { layerResult } from "../core/layer-result";
import type { LayerResult, SrmArtifact } from "../core/types";

export function generateSrm(): { result: LayerResult; artifact: SrmArtifact } {
  const artifact: SrmArtifact = {
    status: "ADVISORY REPORT GENERATED",
    blocksSurgery: false,
  };

  return {
    artifact,
    result: layerResult({
      id: "SRM",
      name: "Systemic Risk Modeling",
      status: "ADVISORY REPORT GENERATED",
      message: "Aggregate advisory report generated; surgery is not blocked by SRM",
      artifacts: { srm: artifact },
    }),
  };
}
