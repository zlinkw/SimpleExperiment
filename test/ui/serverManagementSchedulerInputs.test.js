const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = source.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

test("all visible panel commands have extension handlers", () => {
  const root = path.join(__dirname, "..", "..");
  const html = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  const extension = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");

  const commands = new Set();
  for (const match of html.matchAll(/data-command="([A-Za-z][A-Za-z0-9]+)"/g)) commands.add(match[1]);
  for (const match of html.matchAll(/actionButton\("([^"]+)",\s*"([^"]+)"/g)) {
    const command = /^[A-Za-z][A-Za-z0-9]+$/.test(match[2]) ? match[2] : match[1];
    if (/^[A-Za-z][A-Za-z0-9]+$/.test(command)) commands.add(command);
  }
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
  assert.match(html, /document\.querySelectorAll\("button:not\(\[data-tooltip-ready='1'\]\)"\)/);
  assert.match(html, /function genericButtonHelp/);
  assert.match(html, /setNativeTitle\(button, help\)/);
  assert.match(html, /button\.setAttribute\("aria-label"/);
  const commands = new Set();
  for (const match of html.matchAll(/data-command="([A-Za-z][A-Za-z0-9]+)"/g)) commands.add(match[1]);
  for (const pattern of [/actionButton\("([^"]+)",\s*"([^"]+)"/g, /rowActionButton\("([^"]+)",\s*"([^"]+)"/g]) {
    for (const match of html.matchAll(pattern)) {
      const command = /^[A-Za-z][A-Za-z0-9]+$/.test(match[2]) ? match[2] : match[1];
      if (/^[A-Za-z][A-Za-z0-9]+$/.test(command)) commands.add(command);
    }
  }
  for (const command of commands) {
    assert.match(html, new RegExp(`${command}: "`), `missing Chinese tooltip for ${command}`);
  }
  assert.match(html, /pending \? "执行中" : commandHelp\(command\)/);
});

test("server management config fields receive Chinese hover explanations", () => {
  const root = path.join(__dirname, "..", "..");
  const html = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");

  assert.match(html, /function configHelp/);
  assert.match(html, /hubDisplayName: "面板中显示的 Hub 名称/);
  assert.match(html, /agentProjectDir: "服务器上存放项目的父目录/);
  assert.match(html, /savedSessionPath: "负责保持 127\.0\.0\.1 本地端口转发的 Xshell 隧道会话文件"/);
  assert.match(html, /configSessionSelect\(scope, key, label, value\)[\s\S]*helpBadge\(help\)/);
  assert.match(html, /configPortPair\(scope, label, localKey, remoteKey[\s\S]*helpBadge\(pairHelp\)/);
  assert.match(html, /configSelect\(scope, key, label, value[\s\S]*helpBadge\(help\)/);
});

test("server overview and settings reuse status indexes", () => {
  const root = path.join(__dirname, "..", "..");
  const html = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  const helper = html.slice(html.indexOf("function serverStatusIndexesForState"), html.indexOf("function renderServerObjectOverview"));
  const overview = html.slice(html.indexOf("function renderServerObjectOverview"), html.indexOf("function serverObjectSummaryItem"));
  const settings = html.slice(html.indexOf("function renderServerCardsV2"), html.indexOf("function renderServerCards(state)"));

  assert.match(helper, /cached\.workerTelemetry === workerTelemetry/);
  assert.match(helper, /agentWorkerById: new Map/);
  assert.match(overview, /const indexes = serverStatusIndexesForState\(state\)/);
  assert.match(settings, /const indexes = serverStatusIndexesForState\(state\)/);
  assert.match(overview, /indexes\.workerStatus/);
  assert.match(settings, /indexes\.agentWorkerById\.get/);
  assert.doesNotMatch(overview + settings, /new Map\(|agent\.workers[^\n]*\.find\(/);

  const sandbox = {
    EMPTY_SERVER_STATUS_ROWS: [],
    serverStatusIndexCacheSources: null,
    serverStatusIndexCacheValue: null,
  };
  vm.createContext(sandbox);
  vm.runInContext(extractFunction(html, "serverStatusIndexesForState") + "\nthis.indexes = serverStatusIndexesForState;", sandbox);
  const firstState = { workerTelemetryStatus: [{ workerId: "w1", status: "online" }] };
  const first = sandbox.indexes(firstState);
  assert.equal(sandbox.indexes(firstState), first);
  const second = sandbox.indexes({ workerTelemetryStatus: [{ workerId: "w1", status: "offline" }] });
  assert.notEqual(second, first);
  assert.equal(second.workerStatus.get("w1").status, "offline");
});
