const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const extension = fs.readFileSync(path.join(root, "src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(root, "src/ui/PanelHtml.ts"), "utf8");

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

test("all declared webview commands pass the extension safety whitelist", () => {
  const webviewCommands = new Set([
    ...quotedValues(block(panel, "const webviewHandledCommands = new Set([", "]);")),
    ...objectKeys(block(panel, "const uiCapabilityMap = {", "};")),
  ]);
  const safeCommands = new Set([
    ...quotedValues(block(extension, "const uiActionCommands = new Set<WebviewActionCommand>([", "]);")),
    ...quotedValues(block(extension, "const basic = new Set([", "]);")),
  ]);

  const missing = [...webviewCommands].filter((command) => !safeCommands.has(command)).sort();
  assert.deepEqual(missing, []);
  assert.ok(safeCommands.has("openSetupGuide"));
  assert.ok(safeCommands.has("openAdvancedCommandsSetting"));
});

test("configuration entry handlers remain reachable and unknown commands remain rejected", () => {
  assert.match(extension, /case "openSetupGuide":[\s\S]{0,100}this\.openSetupGuide\(\)/);
  assert.match(extension, /case "openAdvancedCommandsSetting":[\s\S]{0,180}workbench\.action\.openSettings/);
  assert.match(extension, /return basic\.has\(command\) \|\| uiActionCommands\.has\(command\) \? command : ""/);
  assert.match(extension, /if \(rawCommand && !command\)[\s\S]{0,120}未知或未放行的前端命令/);
});
