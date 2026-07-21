const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("all visible panel commands have extension handlers", () => {
  const root = path.join(__dirname, "..", "..");
  const html = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  const extension = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");

  const commands = new Set();
  for (const match of html.matchAll(/data-command="([A-Za-z][A-Za-z0-9]+)"/g)) commands.add(match[1]);
  for (const match of html.matchAll(/actionButton\("[^"]+",\s*"([^"]+)"/g)) commands.add(match[1]);
  for (const command of ["selectLogRunKey", "stopExperiment", "retryExperiment", "parseResults", "archiveArtifacts", "deleteArtifacts"]) {
    commands.add(command);
  }

  const handled = new Set();
  for (const match of extension.matchAll(/case "([^"]+)"/g)) handled.add(match[1]);
  const uiActionBlock = extension.match(/const uiActionCommands = new Set<WebviewActionCommand>\(\[([\s\S]*?)\]\);/);
  if (uiActionBlock) {
    for (const match of uiActionBlock[1].matchAll(/"([A-Za-z][A-Za-z0-9]+)"/g)) handled.add(match[1]);
  }

  const missing = [...commands].filter((command) => !handled.has(command)).sort();
  assert.deepEqual(missing, []);
});

test("visible command buttons receive Chinese hover explanations", () => {
  const root = path.join(__dirname, "..", "..");
  const html = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");

  assert.match(html, /function decorateCommandTooltips/);
  assert.match(html, /document\.querySelectorAll\("button"\)/);
  assert.match(html, /function genericButtonHelp/);
  assert.match(html, /button\.setAttribute\("title", help\)/);
  assert.match(html, /button\.setAttribute\("aria-label"/);
  const commands = new Set();
  for (const match of html.matchAll(/data-command="([A-Za-z][A-Za-z0-9]+)"/g)) commands.add(match[1]);
  for (const match of html.matchAll(/actionButton\("[^"]+",\s*"([^"]+)"/g)) commands.add(match[1]);
  for (const match of html.matchAll(/rowActionButton\("[^"]+",\s*"([^"]+)"/g)) commands.add(match[1]);
  for (const command of commands) {
    assert.match(html, new RegExp(`${command}: "`), `missing Chinese tooltip for ${command}`);
  }
  assert.match(html, /鎵ц涓紝绛夊緟缁堟€佸洖浼犲悗浼氳嚜鍔ㄦ仮澶嶃€/);
});

test("server management config fields receive Chinese hover explanations", () => {
  const root = path.join(__dirname, "..", "..");
  const html = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");

  assert.match(html, /function configHelp/);
  assert.match(html, /hubDisplayName: "闈㈡澘涓樉绀虹殑 Hub 鍚嶇О/);
  assert.match(html, /agentProjectDir: "杩滅瀹為檯宸ヤ綔鏍圭洰褰/);
  assert.match(html, /savedSessionPath: "璐熻矗淇濇寔 127\.0\.0\.1 鏈湴绔彛杞彂/);
  assert.match(html, /configSessionSelect\(scope, key, label, value\)[\s\S]*helpBadge\(help\)/);
  assert.match(html, /configPortPair\(scope, label, localKey, remoteKey[\s\S]*helpBadge\(pairHelp\)/);
  assert.match(html, /configSelect\(scope, key, label, value[\s\S]*helpBadge\(help\)/);
});



