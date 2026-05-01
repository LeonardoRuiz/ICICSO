import { layerResult } from "../core/layer-result";
import type { CcclArtifact, EteArtifact, EulArtifact, GhlArtifact, IcicsoCase, LayerResult } from "../core/types";

export function runCccl(
  caseData: IcicsoCase,
  ete: EteArtifact,
  eul: EulArtifact,
  ghl: GhlArtifact,
): { result: LayerResult; artifact: CcclArtifact } {
  const blockers = caseData.stc.available ? [] : ["State Transition Certificate missing"];

  if (blockers.length > 0) {
    const blockedArtifact: CcclArtifact = {
      status: "BLOCKED",
      from: caseData.caseState,
      to: caseData.caseState,
      stcId: caseData.stc.transitionId,
      esl: null,
    };

    return {
      artifact: blockedArtifact,
      result: layerResult({
        id: "CCCL",
        name: "Clinical Case Control Layer",
        status: "BLOCKED",
        message: "State transition blocked without STC",
        blockers,
        critical: true,
        artifacts: { cccl: blockedArtifact },
      }),
    };
  }

  const generatedAt = "2026-04-25T00:00:00.000Z";
  const esl = {
    id: `ESL-${caseData.caseId}`,
    caseId: caseData.caseId,
    episodeId: caseData.episodeId,
    generatedAt,
    evidenceLakeStatus: "ACTIVE",
    ecs: ete.ecs,
    uci: ete.uci,
    eul: eul.level,
    guidelinePackageId: ghl.guidelinePackageId,
    transitionId: caseData.stc.transitionId,
  };
  const artifact: CcclArtifact = {
    status: "PRE-OPERATIVE ACTIVE",
    from: caseData.caseState,
    to: "PreOperative",
    stcId: caseData.stc.transitionId,
    esl,
  };

  return {
    artifact,
    result: layerResult({
      id: "CCCL",
      name: "Clinical Case Control Layer",
      status: "PRE-OPERATIVE ACTIVE",
      message: "State machine transitioned with STC and generated ESL",
      artifacts: { cccl: artifact, esl },
    }),
  };
}
