const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("ui action errors include command action suggestion capability and timestamp", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  for (const field of ["type UiActionError", "command:", "action?: TunnelAction", "suggestion?", "capabilityMissing?", "timestamp:"]) {
    assert.match(source, new RegExp(field.replace("?", "\\?")));
  }
  assert.match(source, /recordActionError/);
  assert.match(source, /actionErrorSuggestion/);
});