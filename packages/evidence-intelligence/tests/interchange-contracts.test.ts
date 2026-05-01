import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evidenceIntelligenceFacade } from "../src/api/facade.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function loadExample(relativePath: string): { artifact_kind: string; data: unknown } {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8")) as { artifact_kind: string; data: unknown };
}

function run(): void {
  const documentFixture = loadExample("examples/valid/evidence-document.valid.json");
  const serFixture = loadExample("examples/valid/ser.valid.json");
  const eoFixture = loadExample("examples/valid/eo.valid.json");
  const invalidDocumentFixture = loadExample("examples/invalid/evidence-document.invalid.json");

  const validExternalDocument = evidenceIntelligenceFacade.validateInterchangeEvidenceDocument(documentFixture.data);
  assert.equal(validExternalDocument.ok, true);

  const invalidExternalDocument = evidenceIntelligenceFacade.validateInterchangeEvidenceDocument(invalidDocumentFixture.data);
  assert.equal(invalidExternalDocument.ok, false);

  const normalizedDocument = evidenceIntelligenceFacade.adaptInterchangeEvidenceDocument(documentFixture.data);
  assert.equal(normalizedDocument.ok, true);
  assert.equal(normalizedDocument.value?.documentId, "EDOC-CABG-0001");
  assert.equal(normalizedDocument.value?.evidenceType, "guideline");

  const normalizedSer = evidenceIntelligenceFacade.adaptInterchangeStructuredEvidenceRecord(serFixture.data);
  assert.equal(normalizedSer.ok, true);
  assert.equal(normalizedSer.value?.serId, "SER-CABG-0001");
  assert.ok(Array.isArray(normalizedSer.value?.statements));
  assert.ok((normalizedSer.value?.statements.length ?? 0) > 0);

  const mappedEo = evidenceIntelligenceFacade.mapSerToEo(normalizedSer.value!);
  assert.ok(mappedEo.eoId.startsWith("EO-"));
  assert.ok(Array.isArray(mappedEo.inferenceTrace));
  assert.ok(mappedEo.inferenceTrace.length > 0);

  const validExternalEo = evidenceIntelligenceFacade.validateInterchangeEvidenceObject(eoFixture.data);
  assert.equal(validExternalEo.ok, true);

  const normalizedEo = evidenceIntelligenceFacade.adaptInterchangeEvidenceObject(eoFixture.data);
  assert.equal(normalizedEo.ok, true);
  assert.equal(normalizedEo.value?.eoId, "EO-CABG-0001");
}

run();
console.log("PASS interchange contracts");
