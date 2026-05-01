import { layerResult } from "../core/layer-result";
import type { EteArtifact, EulArtifact, IcicsoCase, LayerResult } from "../core/types";

export function classifyEul(caseData: IcicsoCase, ete: EteArtifact): { result: LayerResult; artifact: EulArtifact } {
  const maxSeverity = Math.max(0, ...caseData.evidence.icdr.map((item) => item.maxSeverity));

  let artifact: EulArtifact;
  if (maxSeverity >= 4 || ete.uci > 0.55) {
    artifact = {
      level: "LEVEL IV",
      levelNumber: 4,
      rationale: "High ICDR severity or uncertainty requires reinforced validation",
    };
  } else if (maxSeverity >= 3 || ete.uci > 0.35) {
    artifact = {
      level: "LEVEL III",
      levelNumber: 3,
      rationale: "Moderate uncertainty detected",
    };
  } else if (maxSeverity >= 1 || ete.uci > 0.15) {
    artifact = {
      level: "LEVEL II",
      levelNumber: 2,
      rationale: "Bounded contextual uncertainty detected",
    };
  } else {
    artifact = {
      level: "LEVEL I",
      levelNumber: 1,
      rationale: "Low uncertainty and no material ICDR conflict",
    };
  }

  return {
    artifact,
    result: layerResult({
      id: "EUL",
      name: "Epistemic Uncertainty Layer",
      status: artifact.level,
      message: artifact.rationale,
      metrics: {
        uci: ete.uci,
        maxIcdrSeverity: maxSeverity,
      },
      artifacts: { eul: artifact },
    }),
  };
}
