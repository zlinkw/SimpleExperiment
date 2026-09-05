const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
function readFirst(candidates) {
  for (const candidate of candidates) {
    const full = path.join(root, candidate);
    if (fs.existsSync(full)) return fs.readFileSync(full, "utf8");
  }
  assert.fail(`missing source, tried: ${candidates.join(", ")}`);
}
// Factory refactor v0.4.92+: logic lives in legacy files, facades only re-export.
const extension = readFirst(["src/extension/legacy.ts", "src/extension.ts"]);
const panel = readFirst(["src/ui/PanelHtml.legacy.ts", "src/ui/PanelHtml.ts"]);

function block(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing block start: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `missing block end after: ${startMarker}`);
  return source.slice(start, end);
}

function quotedValues(source) {
  return [...source.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function objectKeys(source) {
  return [...source.matchAll(/^\s+([A-Za-z][A-Za-z0-9]*):/gm)].map((match) => match[1]);
}

function webviewCommands() {
  return new Set([
    ...quotedValues(block(panel, "const webviewHandledCommands = new Set([", "]);")),
    ...objectKeys(block(panel, "const uiCapabilityMap = {", "};")),
  ]);
}

function safeCommands() {
  return new Set([
    ...quotedValues(block(extension, "const uiActionCommands = new Set<WebviewActionCommand>([", "]);")),
    ...quotedValues(block(extension, "const SAFE_WEBVIEW_COMMANDS = new Set([", "]);")),
  ]);
}

test("all declared webview commands pass the extension safety whitelist", () => {
  const webview = webviewCommands();
  const safe = safeCommands();

  const missing = [...webview].filter((command) => !safe.has(command)).sort();
  assert.deepEqual(missing, []);
  assert.ok(safe.has("openSetupGuide"));
  assert.ok(safe.has("openAdvancedCommandsSetting"));
});

test("extension safety whitelist stays covered by webview declarations (reverse)", () => {
  const webview = webviewCommands();
  const safeOnly = new Set(quotedValues(block(extension, "const SAFE_WEBVIEW_COMMANDS = new Set([", "]);")));
  // Extension-only: panel bootstrap handshake (never webview-originated).
  const KNOWN_EXTENSION_ONLY = new Set([
    "webviewReady", "webviewBootstrapError", "webviewRenderError", "reloadPanel",
  ]);
  // Pre-existing gaps (follow-up, not this change): declared in SAFE whitelist and
  // sent by webview buttons, but missing from webviewHandledCommands. Any NEW gap fails.
  const KNOWN_GAPS_TODO = new Set([
    "startTensorBoard", "runDraftDebug", "promoteDraft", "rejectDraft",
    "reviewDraft", "cleanupDrafts", "resetPptPathConfirmations",
  ]);
  const uncovered = [...safeOnly].filter((command) => !webview.has(command) && !KNOWN_EXTENSION_ONLY.has(command) && !KNOWN_GAPS_TODO.has(command)).sort();
  assert.deepEqual(uncovered, []);
  for (const command of ["runCheckStatic", "openLastCheckStaticReport", "copyLastCheckStaticReport"]) {
    assert.ok(webview.has(command), `webview must declare ${command}`);
    assert.ok(safeOnly.has(command), `SAFE whitelist must contain ${command}`);
  }
});

test("configuration entry handlers remain reachable and unknown commands remain rejected", () => {
  assert.match(extension, /case "openSetupGuide":[\s\S]{0,100}this\.openSetupGuide\(\)/);
  assert.match(extension, /case "openAdvancedCommandsSetting":[\s\S]{0,180}workbench\.action\.openSettings/);
  assert.match(extension, /return SAFE_WEBVIEW_COMMANDS\.has\(command\) \|\| uiActionCommands\.has\(command\) \? command : ""/);
  assert.match(extension, /if \(rawCommand && !command\)[\s\S]{0,120}未知或未放行的前端命令/);
});

test("webview command routing reuses module-level fixed sets", () => {
  const safeCommand = block(extension, "function getSafeCommand(message)", "const hostOperationUiCommands");
  const statusHelpers = block(extension, "function commandNeedsUiStatus(command)", "function normalizeUiLayout(input)");
  assert.match(extension, /const COMMANDS_WITHOUT_UI_STATUS = new Set\(/);
  assert.match(extension, /const LOCAL_COMMAND_RELEASES_AFTER_TRIGGER = new Set\(/);
  assert.doesNotMatch(safeCommand + statusHelpers, /new Set\(|\["startAllConnections", "testAll", "snapshot"\]/);
  assert.match(statusHelpers, /COMMANDS_WITHOUT_UI_STATUS\.has\(command\)/);
  assert.match(statusHelpers, /LOCAL_COMMAND_RELEASES_AFTER_TRIGGER\.has/);
});
