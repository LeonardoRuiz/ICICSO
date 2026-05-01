import assert from "node:assert/strict";

import { createIngestModuleService } from "../../packages/domain/ingest/service.ts";
import { createSourceEvidenceRecordModuleService } from "../../packages/domain/ser/service.ts";
import { createEvidenceObjectModuleService } from "../../packages/domain/eo/service.ts";

const ingestService = createIngestModuleService();
const serService = createSourceEvidenceRecordModuleService();
const eoService = createEvidenceObjectModuleService();

const document = await ingestService.ingestDocument({
  sourceId: "DOC-CABG-EO-2026-ACC-AHA",
  title: "2026 CABG Evidence Bridge for High-Risk Revascularization",
  documentType: "guideline",
  issuingBody: "ACC/AHA",
  publicationDate: "2026-04-03T12:00:00.000Z",
  sourceType: "document",
  sourceUrlReference: "https://example.org/cabg-eo-guidance",
  location: "04_Referencias_Externas/PDF",
  chainOfCustody: ["download", "catalog", "qa"],
  notes: ["eo implementation slice"],
  content: "CABG evidence should be converted from SER into auditable evidence objects.",
  createdBy: "ACTOR-CANON-EO",
  createdByType: "human",
});

const record = await serService.registerFromIngest(document);
const evidenceObject = await eoService.createFromRecord(record);

assert.equal(evidenceObject.payload.sourceRecordId, record.id);
assert.equal(evidenceObject.payload.sourceId, record.payload.sourceId);
assert.equal(evidenceObject.payload.evidenceStatus, "Active");
assert.equal(evidenceObject.payload.documentType, "guideline");
assert.equal(evidenceObject.payload.issuingBody, "ACC/AHA");
assert.equal(evidenceObject.payload.sourceHash, record.payload.sourceHash);
assert.ok(evidenceObject.payload.domainTags.includes("guideline"));
assert.ok(evidenceObject.payload.domainTags.includes("acc"));
assert.ok(evidenceObject.payload.domainTags.includes("aha"));
assert.ok(
  evidenceObject.payload.canonicalClaims.some((claim) => claim.includes("Evidence Object derivado desde SER")),
);
assert.equal(evidenceObject.integrity.previousHash, null);
assert.match(evidenceObject.id, /^EO-[A-F0-9]{12}$/);

const stored = await eoService.getObject(record.payload.sourceId);
assert.equal(stored?.id, evidenceObject.id);
assert.equal((await eoService.listObjects()).length, 1);

console.log("ingest -> ser -> eo pipeline checks passed");
