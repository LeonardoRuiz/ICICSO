import { icicsoCaseSchema, type IcicsoCase } from "../core/types";

const cabgCase: IcicsoCase = {
  caseId: "CASE-CABG-0001",
  episodeId: "EP-CABG-0001",
  label: "CABG x3 + DM2 + NSTEMI + FEVI 35% + ERC estadio 3 + SYNTAX 32",
  displayCase: "CABG x3 + DM2 + NSTEMI + FEVI 35% + ERC3",
  ilc: {
    id: "ILC-CABG-2026-001",
    valid: true,
    version: "ILC-v1",
  },
  consent: {
    id: "CONSENT-CABG-001",
    active: true,
    timestamp: "2026-04-25T00:00:00.000Z",
  },
  ddmo: {
    present: true,
    required: [
      "diagnosis",
      "syntaxScore",
      "lvef",
      "renalStage",
      "diabetesStatus",
      "indexEvent",
    ],
    presentFields: [
      "diagnosis",
      "syntaxScore",
      "lvef",
      "renalStage",
      "diabetesStatus",
      "indexEvent",
    ],
  },
  dataCompletenessIndex: 0.96,
  terminology: {
    icd10: ["I21.4", "E11.9", "I25.10", "N18.3", "I50.2"],
    snomedCt: ["232717009", "44054006", "53741008"],
    loinc: ["33880-4", "2160-0", "4548-4"],
    ucum: ["%", "mg/dL", "mL/min/1.73m2"],
    rxNormAtc: ["860975", "C10AA", "B01AC"],
    udiGs1: ["GS1-CABG-SET-001"],
  },
  evidence: {
    ser: [
      {
        id: "SER-ACC-AHA-SCAI-REVASC-2021",
        title: "Coronary artery revascularization guideline source",
        active: true,
      },
      {
        id: "SER-CABG-DM2-SYNTAX",
        title: "CABG diabetes and complex coronary disease source",
        active: true,
      },
    ],
    eo: [
      {
        id: "EO-CABG-MULTIVESSEL-001",
        sourceSerId: "SER-ACC-AHA-SCAI-REVASC-2021",
        conclusion: "Structured CABG revascularization evidence object",
      },
      {
        id: "EO-DM2-SYNTAX-001",
        sourceSerId: "SER-CABG-DM2-SYNTAX",
        conclusion: "Diabetes and high SYNTAX applicability evidence object",
      },
      {
        id: "EO-LVEF-RENAL-001",
        sourceSerId: "SER-CABG-DM2-SYNTAX",
        conclusion: "Reduced FEVI and ERC3 operative context evidence object",
      },
    ],
    icdr: [
      {
        id: "ICDR-CABG-REVASC-001",
        maxSeverity: 2,
        conflicts: 1,
        summary: "Contextual guideline tension is present but bounded",
      },
    ],
  },
  vrn: {
    id: "VRN-GP-REVASC-CABG-v3",
    active: true,
    version: "3.0.0",
  },
  evt: {
    active: [],
  },
  stc: {
    available: true,
    transitionId: "STC-CABG-PREOP-001",
    actor: "case-control-service",
  },
  caseState: "Draft",
};

export function createCabgFixture(): IcicsoCase {
  return icicsoCaseSchema.parse(structuredClone(cabgCase));
}
