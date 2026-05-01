import { layerResult } from "../core/layer-result";
import type { CqoiArtifact, IcicsoCase, LayerResult } from "../core/types";

export function evaluateCqoi(caseData: IcicsoCase): { result: LayerResult; artifact: CqoiArtifact } {
  const artifact: CqoiArtifact = {
    status: caseData.caseState === "Closed" ? "READY" : "PENDING CASE CLOSURE",
    modifiesActiveCase: false,
  };

  return {
    artifact,
    result: layerResult({
      id: "CQOI",
      name: "Clinical Quality & Outcomes Intelligence",
      status: artifact.status,
      message: "Post-closure intelligence only; active case remains unmodified",
      artifacts: { cqoi: artifact },
    }),
  };
}
