import assert from "node:assert/strict";

const elements = new Map([
  ["summary", { textContent: "", innerHTML: "" }],
  ["status-counts", { textContent: "", innerHTML: "" }],
  ["implemented-slice", { textContent: "", innerHTML: "" }],
  ["architecture-body", { textContent: "", innerHTML: "" }],
]);

global.document = {
  getElementById(id) {
    return elements.get(id);
  },
};

await import("../../apps/emulator/src/main.js");

assert.match(elements.get("summary").textContent, /capas ICICSO auditadas/i);
assert.match(elements.get("status-counts").innerHTML, /implemented:/);
assert.match(elements.get("implemented-slice").innerHTML, /ING -> SER -> EO -> EL/);
assert.match(elements.get("implemented-slice").innerHTML, /Evidence Object/);
assert.match(elements.get("implemented-slice").innerHTML, /Evidence Lake/);
assert.match(elements.get("architecture-body").innerHTML, /packages\/shared-kernel/);
assert.match(elements.get("architecture-body").innerHTML, /Source Evidence Record/);

delete global.document;

console.log("emulator wiring checks passed");
