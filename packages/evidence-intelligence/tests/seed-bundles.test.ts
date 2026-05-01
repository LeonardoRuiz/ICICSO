import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mapSerToEoWithInferences } from "../src/mappers/ser-to-eo-engine.js";
import { seedBundles } from "../src/seeds/index.js";
import type { StructuredEvidenceRecord } from "../src/models/ser.js";
import { validateEvidenceDocument } from "../src/validators/evidence-document.validator.js";
import { validateOntologyCatalogs } from "../src/validators/ontology.validator.js";
import { validateStructuredEvidenceRecord } from "../src/validators/ser.validator.js";

interface SeedBundleLike {
  document?: unknown;
  ser?: unknown;
  expectedMapperBehavior?: {
    expectedDecisionVerb?: string;
    expectedReviewState?: string;
  };
}

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const seedsDir = path.join(packageRoot, "seeds");
const bundleEntries = Object.entries(seedBundles) as Array<[string, SeedBundleLike]>;
const diskBundleFiles = fs.readdirSync(seedsDir).filter((file) => file.endsWith(".bundle.json"));

const ontologyValidation = validateOntologyCatalogs();
if (!ontologyValidation.ok) {
  console.error("FAIL ontology catalogs");
  console.error(ontologyValidation.issues);
  process.exit(1);
}
console.log("PASS ontology catalogs");

assert.equal(bundleEntries.length, diskBundleFiles.length, "seed export count should match seed bundle files on disk");

let failed = false;
for (const [bundleName, bundle] of bundleEntries) {
  try {
    if ("document" in bundle && bundle.document) {
      const docResult = validateEvidenceDocument(bundle.document);
      assert.equal(docResult.ok, true, `${bundleName} document should validate`);
    }

    if ("ser" in bundle && bundle.ser) {
      const typedSer = bundle.ser as unknown as StructuredEvidenceRecord;
      const serResult = validateStructuredEvidenceRecord(typedSer);
      assert.equal(serResult.ok, true, `${bundleName} SER should validate`);
      const eo = mapSerToEoWithInferences(typedSer, {
        now: "2026-04-04T00:00:00Z",
        specialistReview: {
          approved: true,
          reviewer: "icicso.seed.specialist",
          reviewedAt: "2026-04-04T00:00:00Z",
        },
      });
      assert.ok(eo.eoId.startsWith("EO-"), `${bundleName} should generate EO`);

      if ("expectedMapperBehavior" in bundle && bundle.expectedMapperBehavior) {
        const expected = bundle.expectedMapperBehavior;
        if (expected.expectedDecisionVerb) {
          assert.equal(eo.decision.verb, expected.expectedDecisionVerb, `${bundleName} decision verb mismatch`);
        }
        if (expected.expectedReviewState) {
          assert.equal(eo.reviewMetadata.reviewState, expected.expectedReviewState, `${bundleName} review state mismatch`);
        }
      }
    }

    console.log(`PASS ${bundleName}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${bundleName}`);
    console.error(error);
  }
}

if (failed) process.exit(1);
