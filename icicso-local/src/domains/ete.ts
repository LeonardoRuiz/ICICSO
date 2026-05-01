import { layerResult } from "../core/layer-result";
import type { EvidenceLakeArtifact, EteArtifact, IcicsoCase, LayerResult } from "../core/types";

export function runEte(caseData: IcicsoCase, evidenceLake: EvidenceLakeArtifact): { result: LayerResult; artifact: EteArtifact } {
  const missingDdmoFields = caseData.ddmo.required.filter((field) => !caseData.ddmo.presentFields.includes(field));
  const ddmoPass = caseData.ddmo.present && missingDdmoFields.length === 0;

  const maxSeverity = Math.max(0, ...caseData.evidence.icdr.map((item) => item.maxSeverity));
  const ecs = Number((88 + evidenceLake.evidenceObjectCount).toFixed(1));
  const uci = Number((0.2 + maxSeverity * 0.045).toFixed(2));

  const artifact: EteArtifact = {
    ecs,
    uci,
    mac: {
      applicable: 11,
      conditional: 2,
      indeterminate: 1,
    },
    ddmoGate: ddmoPass ? "PASS" : "BLOCKED",
  };

  const blockers = ddmoPass ? [] : ["DDMO-Gate blocked"];

  return {
    artifact,
    result: layerResult({
      id: "ETE",
      name: "Evidence Translation Engine",
      status: ddmoPass ? "COMPLETE" : "BLOCKED",
      message: ddmoPass ? "ECS, UCI, MAC and DDMO-Gate generated" : "Evidence translation blocked by DDMO",
      blockers,
      critical: blockers.length > 0,
      metrics: {
        ecs,
        uci,
        macApplicable: artifact.mac.applicable,
        macConditional: artifact.mac.conditional,
        macIndeterminate: artifact.mac.indeterminate,
        ddmoGate: artifact.ddmoGate,
      },
      artifacts: { ete: artifact },
    }),
  };
}
