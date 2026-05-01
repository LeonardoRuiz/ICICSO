import { layerResult } from "../core/layer-result";
import type { EvidenceLakeArtifact, IcicsoCase, LayerResult } from "../core/types";

export function activateEvidenceLake(caseData: IcicsoCase): { result: LayerResult; artifact: EvidenceLakeArtifact } {
  const artifact: EvidenceLakeArtifact = {
    status: "ACTIVE",
    serCount: caseData.evidence.ser.length,
    evidenceObjectCount: caseData.evidence.eo.length,
    icdrCount: caseData.evidence.icdr.length,
    appendOnly: true,
    decides: false,
  };

  return {
    artifact,
    result: layerResult({
      id: "EL",
      name: "Evidence Lake",
      status: "ACTIVE",
      message: "SER, EO and ICDR loaded into conceptual append-only lake; no decisions made",
      artifacts: { evidenceLake: artifact },
      metrics: {
        ser: artifact.serCount,
        eo: artifact.evidenceObjectCount,
        icdr: artifact.icdrCount,
      },
    }),
  };
}
