import assert from "node:assert/strict";

import { createIngestModuleService } from "../../packages/domain/ingest/service.ts";
import { createSourceEvidenceRecordModuleService } from "../../packages/domain/ser/service.ts";
import { createEvidenceObjectModuleService } from "../../packages/domain/eo/service.ts";
import { createEvidenceLakeModuleService } from "../../packages/domain/evidence-lake/service.ts";

const ingestService = createIngestModuleService();
const serService = createSourceEvidenceRecordModuleService();
const eoService = createEvidenceObjectModuleService();
const evidenceLakeService = createEvidenceLakeModuleService();

const document = await ingestService.ingestDocument({
  sourceId: "DOC-CABG-EL-2026-ACC-AHA",
  title: "2026 CABG Evidence Lake Indexing Slice",
  documentType: "guideline",
  issuingBody: "ACC/AHA",
  publicationDate: "2026-04-03T16:00:00.000Z",
  sourceType: "document",
  sourceUrlReference: "https://example.org/cabg-el-guidance",
  location: "04_Referencias_Externas/PDF",
  chainOfCustody: ["download", "catalog", "qa"],
  notes: ["evidence-lake implementation slice"],
  content: "CABG evidence should be indexed into a canonical evidence lake record.",
  createdBy: "ACTOR-CANON-EL",
  createdByType: "human",
});

const record = await serService.registerFromIngest(document);
const evidenceObject = await eoService.createFromRecord(record);
const lakeRecord = await evidenceLakeService.indexEvidenceObject(evidenceObject);

assert.equal(lakeRecord.payload.sourceObjectId, evidenceObject.id);
assert.equal(lakeRecord.payload.sourceRecordId, record.id);
assert.equal(lakeRecord.payload.sourceId, record.payload.sourceId);
assert.equal(lakeRecord.payload.lakeStatus, "indexed");
assert.equal(lakeRecord.payload.evidenceHash, evidenceObject.integrity.hash);
assert.ok(lakeRecord.payload.indexingKey.includes(record.payload.sourceId));
assert.ok(lakeRecord.payload.domainTags.includes("guideline"));
assert.ok(
  lakeRecord.payload.canonicalClaims.some((claim) => claim.includes("Evidence Object derivado desde SER")),
);
assert.match(lakeRecord.id, /^EL-[A-F0-9]{12}$/);
assert.equal(lakeRecord.integrity.previousHash, null);

const stored = await evidenceLakeService.getRecord(record.payload.sourceId);
assert.equal(stored?.id, lakeRecord.id);
assert.equal((await evidenceLakeService.listRecords()).length, 1);

console.log("ingest -> ser -> eo -> evidence-lake pipeline checks passed");
