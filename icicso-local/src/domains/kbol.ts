import { layerResult } from "../core/layer-result";
import type { EteArtifact, EulArtifact, GhlArtifact, IcicsoCase, KbolArtifact, LayerResult } from "../core/types";

export function compileKbol(
  caseData: IcicsoCase,
  ete: EteArtifact,
  eul: EulArtifact,
  ghl: GhlArtifact,
): { result: LayerResult; artifact: KbolArtifact | null } {
  const blockers: string[] = [];

  if (eul.levelNumber > 3) blockers.push("EUL must be LEVEL I-III");
  if (ete.ddmoGate !== "PASS") blockers.push("DDMO-Gate must pass");
  if (!ghl.active) blockers.push("Guideline package inactive");
  if (!caseData.vrn.active) blockers.push("VRN is not active");

  const artifact: KbolArtifact | null =
    blockers.length === 0
      ? {
          cpoId: `CPO-${caseData.caseId}`,
          status: "CPO ACTIVE",
        }
      : null;

  return {
    artifact,
    result: layerResult({
      id: "KBOL",
      name: "Knowledge Base Operative Layer",
      status: artifact ? "CPO ACTIVE" : "BLOCKED",
      message: artifact ? "Clinical Pathway Object activated" : "CPO activation blocked",
      blockers,
      critical: blockers.length > 0,
      artifacts: artifact ? { kbol: artifact } : {},
    }),
  };
}
