import assert from "node:assert/strict";
import {
  appendDdmoConflicts,
  buildApplicabilityMatrix,
  classifyEpistemicUncertaintyLayer,
  collectEvidenceConflictMarkers,
  computeEvidenceConfidence,
  evaluateMinimumDataDependencies,
} from "../src/engines/index.js";
import type { EvidenceStatement, StructuredEvidenceRecord } from "../src/models/ser.js";

const statement: EvidenceStatement = {
  statementId: "SES-SCOPE-01",
  clinicalFunction: "intervention-selection",
  interventionClass: "surgery",
  effectDirection: "benefit",
  strength: "high",
  certainty: "high",
  decisionReadiness: "ready-for-execution",
  timeHorizon: "1-year",
  outcomes: [{ outcomeCode: "mortality", effectDirection: "benefit" }],
  operationalContext: {
    implementationComplexity: "high",
    resourceDemand: "critical",
    costRelevance: "high",
    operationalRelevance: "high",
    resourceRequirements: [{ resourceType: "or", role: "surgeon", quantity: 1, unit: "team", mandatory: true }],
    constraints: [],
  },
};

const ser: StructuredEvidenceRecord = {
  serId: "SER-SCOPE-0001",
  sourceDocumentId: "EDOC-SCOPE-0001",
  title: "Scope SER",
  evidenceType: "guideline",
  clinicalDomain: "cardiovascular",
  statements: [statement],
  applicability: {
    clinicalDomain: "cardiovascular",
    careSetting: "tertiary-hospital",
    jurisdictions: ["us"],
    decisionReadiness: "ready-for-execution",
    population: { summary: "Adults" },
    dimensionAssessments: [
      { dimension: "population-fit", score: 3, rationale: "fit" },
      { dimension: "intervention-fit", score: 3, rationale: "fit" },
      { dimension: "setting-fit", score: 3, rationale: "fit" },
      { dimension: "jurisdiction-fit", score: 3, rationale: "fit" },
      { dimension: "resource-fit", score: 3, rationale: "fit" },
    ],
  },
  provenance: {
    sourceSystem: "test",
    capturedAt: "2026-01-01T00:00:00Z",
    capturedBy: "tester",
    chainOfCustody: [{ step: "ingest", actor: "tester", timestamp: "2026-01-01T00:00:00Z", hashSha256: "hash" }],
    legal: { licenseStatus: "licensed", attestationStatus: "attested", reviewPolicy: "test" },
    versioning: { canonicalId: "CANON-SCOPE", version: "1.0.0", effectiveFrom: "2026-01-01", status: "active" },
  },
};

const confidence = computeEvidenceConfidence({ ser, statement, nowIso: "2026-04-04T00:00:00Z" });
const ddmo = evaluateMinimumDataDependencies([{ key: "fevi", label: "FEVI", present: true, required: true, critical: true }]);
const conflicts = appendDdmoConflicts(
  collectEvidenceConflictMarkers({
    statement,
    confidenceScore: confidence.confidenceScore,
    applicabilityScore: confidence.structural.applicabilityScore,
    agePenalty: confidence.structural.agePenalty,
  }),
  ddmo,
);
const mac = buildApplicabilityMatrix({
  ser,
  statement,
  applicabilityScore: confidence.structural.applicabilityScore,
  conflicts,
  ddmoGate: ddmo,
});
const eul = classifyEpistemicUncertaintyLayer({
  eoId: "EO-SCOPE-0001",
  confidence,
  mac,
  ddmoGate: ddmo,
  conflicts,
  reviewState: "specialist-approved",
});

assert.equal(ddmo.status, "pass");
assert.equal(mac.classification, "applicable");
assert.ok(confidence.ecs >= 80);
assert.ok(confidence.uci <= 0.25);
assert.equal(eul.level, "I");
assert.equal(eul.activationBlocked, false);

const blockedDdmo = evaluateMinimumDataDependencies([{ key: "fevi", label: "FEVI", present: false, required: true, critical: true }]);
const blockedEul = classifyEpistemicUncertaintyLayer({
  eoId: "EO-SCOPE-0002",
  confidence,
  mac: { ...mac, classification: "indeterminate" },
  ddmoGate: blockedDdmo,
  conflicts: appendDdmoConflicts([], blockedDdmo),
  reviewState: "specialist-approved",
});

assert.equal(blockedEul.level, "IV");
assert.equal(blockedEul.activationBlocked, true);

console.log("PASS SER to EUL scope engines");
