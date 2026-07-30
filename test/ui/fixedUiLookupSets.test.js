const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(name) {
  const start = panel.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const body = panel.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

test("frequent UI lookup paths reuse fixed command sets", () => {
  for (const constant of ["BUTTON_AUDIT_ROW_ACTION_COMMANDS", "RESOURCE_TREE_SECTION_KEYS", "PINNED_COMMAND_VALUES", "SIMPLE_SFTP_GATED_COMMANDS", "ARTIFACT_SCOPE_COMMANDS"]) {
    assert.equal((panel.match(new RegExp(`const ${constant} = new Set`, "g")) || []).length, 1, constant);
  }
  const expectations = new Map([
    ["auditButtonPayloadWarnings", "BUTTON_AUDIT_ROW_ACTION_COMMANDS"],
    ["normalizeResourceTreeChildOrders", "RESOURCE_TREE_SECTION_KEYS"],
    ["normalizePinnedCommands", "PINNED_COMMAND_VALUES"],
    ["simpleSftpCommandDisableReason", "SIMPLE_SFTP_GATED_COMMANDS"],
  ]);
  for (const [name, constant] of expectations) {
    const source = extractFunction(name);
    assert.match(source, new RegExp(`${constant}\\.has\\(`), name);
    assert.doesNotMatch(source, /new Set\(/, name);
  }
});

test("artifact scoped UI actions reuse one command set", () => {
  for (const name of ["contextRefreshPayloadFromButton", "traceActionDisableReason", "rowActionButton", "rowActionDisableReason", "disableReason", "payloadFromButton", "taskActionKeyForCommand"]) {
    assert.match(extractFunction(name), /ARTIFACT_SCOPE_COMMANDS\.has\(command\)/, name);
  }
  assert.doesNotMatch(panel, /\["archiveArtifacts", "deleteArtifacts"\]\.includes\(command\)/);
});
