import { layerResult } from "../core/layer-result";
import type { CmlArtifact, IcicsoCase, LayerResult } from "../core/types";

export function evaluateCml(caseData: IcicsoCase): { result: LayerResult; artifact: CmlArtifact } {
  const artifact: CmlArtifact = {
    status: caseData.caseState === "Closed" ? "READY" : "BLOCKED UNTIL CLOSED",
    lcrIndividualAccess: false,
  };

  return {
    artifact,
    result: layerResult({
      id: "CML",
      name: "Commercial & Monetization Layer",
      status: artifact.status,
      message: "Downstream commercial layer isolated and blocked until case closure",
      blockers: artifact.status === "READY" ? [] : ["Case is not Closed"],
      critical: false,
      artifacts: { cml: artifact },
    }),
  };
}
