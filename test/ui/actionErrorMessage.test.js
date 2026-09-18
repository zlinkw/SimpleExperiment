const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readSource } = require("../_helpers/sourceReader");

const root = path.resolve(__dirname, "..", "..");

test("ui action errors include command action suggestion capability and timestamp", () => {
  const source = readSource("src/extension.ts");
  for (const field of ["type UiActionError", "command:", "action?: TunnelAction", "suggestion?", "capabilityMissing?", "timestamp:"]) {
    assert.match(source, new RegExp(field.replace("?", "\\?")));
  }
  assert.match(source, /recordActionError/);
  assert.match(source, /actionErrorSuggestion/);
});