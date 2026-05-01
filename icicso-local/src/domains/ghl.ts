import { layerResult } from "../core/layer-result";
import type { GhlArtifact, LayerResult } from "../core/types";

export function harmonizeGuideline(): { result: LayerResult; artifact: GhlArtifact } {
  const artifact: GhlArtifact = {
    guidelinePackageId: "GP-REVASC-CABG-v3",
    active: true,
    mergedGuidelines: false,
    decidesTreatment: false,
  };

  return {
    artifact,
    result: layerResult({
      id: "GHL",
      name: "Guideline Harmonization Layer",
      status: artifact.guidelinePackageId,
      message: "Guideline package generated without merging guidelines or deciding treatment",
      artifacts: { ghl: artifact },
    }),
  };
}
