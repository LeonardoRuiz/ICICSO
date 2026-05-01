import { layerResult } from "../core/layer-result";
import type { IcicsoCase, LayerResult } from "../core/types";

export function evaluateIgl(caseData: IcicsoCase): LayerResult {
  const blockers: string[] = [];

  if (!caseData.ilc.valid) blockers.push("ILC invalid or missing");
  if (!caseData.caseId) blockers.push("Case ID missing");
  if (!caseData.episodeId) blockers.push("Episode ID missing");
  if (!caseData.consent.active) blockers.push("Active consent missing");
  if (caseData.ddmo.required.length === 0) blockers.push("DDMO baseline registry missing");
  if (caseData.dataCompletenessIndex < 0.85) blockers.push("Data Completeness Index below threshold");

  return layerResult({
    id: "IGL",
    name: "Information Governance Layer",
    status: blockers.length === 0 ? "PASS" : "BLOCKED",
    message: blockers.length === 0 ? "ILC, identifiers, consent, DDMO baseline and DCI validated" : "Information governance blocked",
    blockers,
    critical: blockers.length > 0,
    metrics: {
      dataCompletenessIndex: caseData.dataCompletenessIndex,
      ilcId: caseData.ilc.id,
      caseId: caseData.caseId,
      episodeId: caseData.episodeId,
    },
  });
}
