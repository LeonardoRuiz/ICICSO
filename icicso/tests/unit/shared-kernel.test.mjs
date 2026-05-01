import assert from "node:assert/strict";

import {
  bomTypes,
  caseStates,
  clinicalPhases,
  createAuditMetadata,
  createBomId,
  createCaseId,
  createCpoId,
  createDriftId,
  createEoId,
  createEslId,
  createEvtId,
  createGateId,
  createIlc,
  createOutcomeId,
  createSerId,
  createTamId,
  createVrn,
  createDeviceUdi,
  evidenceStatuses,
  eventSeverities,
  maturityStatuses,
  snapshotTypes,
  uncertaintyLevels,
  createProvenanceMetadata,
  buildHashMetadata,
} from "../../packages/shared-kernel/index.ts";

assert.equal(createVrn("VRN-BASE-0001"), "VRN-BASE-0001");
assert.equal(createIlc("ILC-BASE-0001"), "ILC-BASE-0001");
assert.equal(createCaseId("CASE-BASE-0001"), "CASE-BASE-0001");
assert.equal(createSerId("SER-BASE-0001"), "SER-BASE-0001");
assert.equal(createEoId("EO-BASE-0001"), "EO-BASE-0001");
assert.equal(createCpoId("CPO-BASE-0001"), "CPO-BASE-0001");
assert.equal(createBomId("BOM-BASE-0001"), "BOM-BASE-0001");
assert.equal(createTamId("TAM-BASE-0001"), "TAM-BASE-0001");
assert.equal(createEvtId("EVT-BASE-0001"), "EVT-BASE-0001");
assert.equal(createGateId("GATE-BASE-0001"), "GATE-BASE-0001");
assert.equal(createEslId("ESL-BASE-0001"), "ESL-BASE-0001");
assert.equal(createOutcomeId("OUTCOME-BASE-0001"), "OUTCOME-BASE-0001");
assert.equal(createDriftId("DRIFT-BASE-0001"), "DRIFT-BASE-0001");
assert.equal(createDeviceUdi("UDI-BASE-0001"), "UDI-BASE-0001");

assert.deepEqual(maturityStatuses, ["implemented", "partial", "mock", "planned", "missing"]);
assert.deepEqual(evidenceStatuses, ["Active", "UnderReview", "Deprecated"]);
assert.deepEqual(clinicalPhases, ["PreOp", "IntraOp", "CEC", "ICU", "Ward", "Discharge"]);
assert.deepEqual(eventSeverities, ["Low", "Moderate", "High", "Critical"]);
assert.deepEqual(uncertaintyLevels, ["LevelI", "LevelII", "LevelIII", "LevelIV"]);
assert.ok(bomTypes.includes("EO_MAPPED_BOM"));
assert.ok(snapshotTypes.includes("FinalClosure"));
assert.ok(caseStates.includes("LegallySnapshotted"));

const audit = createAuditMetadata({
  createdBy: "ACTOR-ARCH-01",
  createdByType: "human",
  createdAt: "2026-03-31T12:00:00.000Z",
});
const provenance = createProvenanceMetadata({
  sourceType: "document",
  sourceId: "DOC-ARCH-01",
  capturedAt: "2026-03-31T12:05:00.000Z",
  chainOfCustody: ["catalog", "audit"],
});
const integrity = buildHashMetadata({ sourceId: provenance.sourceId, layer: "shared-kernel" });

assert.equal(audit.createdBy, "ACTOR-ARCH-01");
assert.equal(provenance.sourceType, "document");
assert.equal(integrity.algorithm, "sha256");
assert.match(integrity.hash, /^[a-f0-9]{64}$/);

console.log("canonical shared-kernel checks passed");
