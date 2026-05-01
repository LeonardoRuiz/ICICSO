import { layerResult } from "../core/layer-result";
import type { EvtArtifact, IcicsoCase, LayerResult } from "../core/types";

export function evaluateEvt(caseData: IcicsoCase): { result: LayerResult; artifact: EvtArtifact } {
  const criticalActive = caseData.evt.active.filter((trigger) => trigger.active && trigger.severity === "CRITICAL").length;
  const artifact: EvtArtifact = {
    criticalActive,
    triggers: caseData.evt.active,
  };

  return {
    artifact,
    result: layerResult({
      id: "EVT",
      name: "Event Trigger",
      status: `${criticalActive} CRITICAL ACTIVE`,
      message: "Structured clinical triggers evaluated; no automatic medical orders emitted",
      metrics: {
        criticalActive,
        totalActive: caseData.evt.active.length,
      },
      artifacts: { evt: artifact },
    }),
  };
}
