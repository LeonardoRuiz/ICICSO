import { layerResult } from "../core/layer-result";
import type { IcicsoCase, LayerResult } from "../core/types";

export function evaluateTg(caseData: IcicsoCase): LayerResult {
  const terminology = caseData.terminology;
  const blockers: string[] = [];

  if (terminology.icd10.length === 0) blockers.push("ICD-10 codes missing");
  if (terminology.snomedCt.length === 0) blockers.push("SNOMED CT codes missing");
  if (terminology.loinc.length === 0) blockers.push("LOINC codes missing");
  if (terminology.ucum.length === 0) blockers.push("UCUM units missing");
  if (terminology.rxNormAtc.length === 0) blockers.push("RxNorm/ATC terms missing");
  if (terminology.udiGs1.length === 0) blockers.push("UDI/GS1 traceability missing");

  return layerResult({
    id: "TG",
    name: "Terminology Governance",
    status: blockers.length === 0 ? "PASS" : "BLOCKED",
    message: blockers.length === 0 ? "Terminologies validated locally" : "Terminology governance blocked",
    blockers,
    critical: blockers.length > 0,
    metrics: {
      icd10: terminology.icd10.length,
      snomedCt: terminology.snomedCt.length,
      loinc: terminology.loinc.length,
      ucum: terminology.ucum.length,
      rxNormAtc: terminology.rxNormAtc.length,
      udiGs1: terminology.udiGs1.length,
    },
  });
}
