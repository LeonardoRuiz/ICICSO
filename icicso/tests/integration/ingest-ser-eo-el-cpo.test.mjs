import assert from "node:assert/strict";

import { createIngestModuleService } from "../../packages/domain/ingest/service.ts";
import { createSourceEvidenceRecordModuleService } from "../../packages/domain/ser/service.ts";
import { createEvidenceObjectModuleService } from "../../packages/domain/eo/service.ts";
import { createEvidenceLakeModuleService } from "../../packages/domain/evidence-lake/service.ts";
import { createClinicalPracticeObjectGeneratorService } from "../../packages/domain/cpo/service.ts";

const ingestService = createIngestModuleService();
const serService = createSourceEvidenceRecordModuleService();
const eoService = createEvidenceObjectModuleService();
const evidenceLakeService = createEvidenceLakeModuleService();
const cpoService = createClinicalPracticeObjectGeneratorService(undefined, undefined, evidenceLakeService);

const document = await ingestService.ingestDocument({
  sourceId: "DOC-CABG-CPO-2026-ACC-AHA",
  title: "2026 CABG Revascularization Guideline",
  documentType: "guideline",
  issuingBody: "ACC/AHA",
  publicationDate: "2026-04-08T12:00:00.000Z",
  sourceType: "document",
  sourceUrlReference: "https://example.org/cabg-cpo-guideline",
  location: "04_Referencias_Externas/PDF",
  chainOfCustody: ["download", "catalog", "qa"],
  notes: ["cpo integration slice"],
  content: "CABG is recommended for significant left main and multivessel coronary disease.",
  createdBy: "ACTOR-CANON-CPO",
  createdByType: "human",
});

const record = await serService.registerFromIngest(document);
const evidenceObject = await eoService.createFromRecord(record);
const evidenceLakeRecord = await evidenceLakeService.indexEvidenceObject(evidenceObject);

const query = {
  specialty: "CARD",
  condition: "CABG",
  patientContext: {
    age: 67,
    gender: "M",
    comorbidities: ["diabetes"],
    medications: ["aspirin"],
  },
  urgency: "routine",
  queryType: "treatment",
};

const relevantEvidence = await cpoService.getRelevantEvidence(query);
assert.ok(relevantEvidence.length >= 1);
assert.equal(relevantEvidence[0].sourceId, evidenceLakeRecord.payload.sourceId);
assert.equal(relevantEvidence[0].title, evidenceLakeRecord.payload.canonicalTitle);

const cpo = await cpoService.generateCPO(query);
assert.match(cpo.id, /^CPO-[A-F0-9]{12}$/);
assert.equal(cpo.payload.query.condition, "CABG");
assert.ok(cpo.payload.recommendations.length >= 1);
assert.equal(cpo.payload.evidenceSummary.totalEvidence, relevantEvidence.length);
assert.ok(
  cpo.payload.recommendations.some((recommendation) =>
    recommendation.evidenceReferences.some((reference) => reference.sourceId === evidenceLakeRecord.payload.sourceId),
  ),
);

const queryHash = cpo.payload.id.replace("CPO-", "");
const cached = await cpoService.getCachedCPO(queryHash);
assert.equal(cached?.id, cpo.id);

console.log("ingest -> ser -> eo -> evidence-lake -> cpo pipeline checks passed");
