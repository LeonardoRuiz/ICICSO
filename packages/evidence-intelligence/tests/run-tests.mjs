import assert from "node:assert/strict";
import { loadExample, validateArtifact } from "../tools/validation-core.mjs";

const tests = [
  {
    name: "valid evidence document passes",
    run() {
      const example = loadExample("examples/valid/evidence-document.valid.json");
      assert.equal(validateArtifact(example.artifact_kind, example.data).length, 0);
    },
  },
  {
    name: "invalid evidence document is rejected",
    run() {
      const example = loadExample("examples/invalid/evidence-document.invalid.json");
      assert.ok(validateArtifact(example.artifact_kind, example.data).length > 0);
    },
  },
  {
    name: "valid SER and EO pass",
    run() {
      const ser = loadExample("examples/valid/ser.valid.json");
      const eo = loadExample("examples/valid/eo.valid.json");
      assert.equal(validateArtifact(ser.artifact_kind, ser.data).length, 0);
      assert.equal(validateArtifact(eo.artifact_kind, eo.data).length, 0);
    },
  },
  {
    name: "invalid SER and EO are rejected",
    run() {
      const ser = loadExample("examples/invalid/ser.invalid.json");
      const eo = loadExample("examples/invalid/eo.invalid.json");
      assert.ok(validateArtifact(ser.artifact_kind, ser.data).length > 0);
      assert.ok(validateArtifact(eo.artifact_kind, eo.data).length > 0);
    },
  },
];

let failed = false;
for (const test of tests) {
  try {
    test.run();
    console.log(`PASS ${test.name}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${test.name}`);
    console.error(error);
  }
}

if (failed) process.exit(1);
