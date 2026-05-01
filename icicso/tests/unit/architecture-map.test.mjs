import assert from "node:assert/strict";

import { architectureMap } from "../../apps/emulator/src/data/architectureMap.ts";

const requiredLayerIds = [
  "ingest",
  "terminology",
  "ser",
  "eo",
  "evidence-lake",
  "evidence-translation",
  "epistemic-uncertainty",
  "guideline-harmonization",
  "cpo",
  "bom",
  "tam",
  "evt",
  "readiness-gates",
  "adverse-events",
  "case-control",
  "legal-snapshots",
  "outcomes",
  "drift",
  "integration-layer",
  "clinical-execution",
  "resource-orchestration",
  "device-intelligence",
  "financial-intelligence",
  "client-operations",
  "simulation-engine",
];

const ids = new Set(architectureMap.map((layer) => layer.id));

for (const layerId of requiredLayerIds) {
  assert.ok(ids.has(layerId), `Missing layer ${layerId}`);
}

for (const layer of architectureMap) {
  assert.ok(layer.id.length > 0);
  assert.ok(layer.maturity.length > 0);
  assert.ok(Array.isArray(layer.repoPaths));
  assert.ok(layer.repoPaths.length > 0);
}

assert.ok(architectureMap.find((layer) => layer.id === "shared-kernel"));
assert.ok(architectureMap.find((layer) => layer.id === "scientific-governance"));

console.log("architecture map checks passed");
