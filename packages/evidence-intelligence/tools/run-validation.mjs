import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateArtifact } from "./validation-core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const validDir = path.join(root, "examples", "valid");
const invalidDir = path.join(root, "examples", "invalid");

function runFolder(folder, expectedValid) {
  const files = fs.readdirSync(folder).filter((name) => name.endsWith(".json"));
  let hasFailure = false;

  for (const file of files) {
    const filePath = path.join(folder, file);
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const issues = validateArtifact(payload.artifact_kind, payload.data);
    const ok = issues.length === 0;
    const expected = expectedValid ? "valid" : "invalid";
    if (ok !== expectedValid) {
      hasFailure = true;
      console.error(`[${expected}] ${file} failed expectation`);
      if (issues.length > 0) console.error(issues);
    } else {
      console.log(`[${expected}] ${file} ok`);
    }
  }

  return hasFailure;
}

const failed = runFolder(validDir, true) || runFolder(invalidDir, false);
if (failed) process.exit(1);
