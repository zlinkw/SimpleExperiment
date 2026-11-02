const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");
const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

const source = fs.readFileSync(path.resolve(__dirname, "../../src/ui/PanelHtml.legacy.ts"), "utf8");
const cardsStart = source.indexOf("function renderServerCardsV2(state)");
const cardsEnd = source.indexOf("function renderServerCards(state)", cardsStart);
const helpStart = source.indexOf("function configHelp(scope, key)");
const helpEnd = source.indexOf("function sessionStatusCell(", helpStart);
assert.ok(cardsStart >= 0 && cardsEnd > cardsStart);
assert.ok(helpStart >= 0 && helpEnd > helpStart);
const cards = source.slice(cardsStart, cardsEnd);
const help = vm.runInNewContext(source.slice(helpStart, helpEnd) + "\nconfigHelp;");

test("server form has one network address and one remote parent directory per endpoint", () => {
  assert.doesNotMatch(cards, /configInput\("hub"/);
  assert.match(cards, /configInput\(scope, "workerHost", "服务器地址"/);
  assert.doesNotMatch(cards, /data-command="saveHubConfig"/);
  assert.match(cards, /configInput\(scope, "agentProjectDir", "项目父目录"/);
  assert.doesNotMatch(cards, /configInput\((?:"hub"|scope), "(?:transferHost|sshConfigAlias)"/);
  assert.match(cards, /后台隧道与 Agent 部署使用系统 SSH 认证/);
  assert.match(cards, /文件传输路径由项目父目录和当前项目名自动计算/);
});

test("every visible server, scheduler and topology field has a useful hover explanation", () => {
  const calls = [...cards.matchAll(/config(?:Input|Select|SessionSelect)\((?:"(hub|scheduler|topology)"|scope),\s*"(\w+)"/g)];
  const keys = new Set(calls.map(call => call[2]));
  for (const key of ['workerHost','workerUser','condaEnv','agentProjectDir','gpuMaxConcurrentCards','gpuJobsPerCard','gpuMinFreeMemoryGb','savedSessionPath','enabled']) assert.ok(keys.has(key), key);
  for (const [, scope, key] of calls) {
    const text = help(scope || "worker:example", key);
    assert.ok(text && text.length >= 15, `missing explanation for ${scope || "worker"}.${key}`);
  }
  for (const [scope, key] of [
    ["hub", "localForwardPort"], ["hub", "remoteAgentPort"],
    ["worker:example", "localForwardPort"], ["worker:example", "remoteTelemetryPort"],
    ["worker:example", "gpuIdleUtilThreshold"], ["worker:example", "gpuIdleMemThresholdMb"],
    ["worker:example", "sessionCheckMinSeconds"],
  ]) assert.ok(help(scope, key).length >= 15, `missing explanation for ${scope}.${key}`);
  assert.match(help("worker:example", "workerHost"), /IP 地址.*不是文件路径/);
  assert.match(help("worker:example", "agentProjectDir"), /自动追加当前本地项目名/);
  assert.match(help("hub", "hubHost"), /旧顶层.*已退役/);
});

test("other settings controls explain their purpose on hover", () => {
  assert.match(source, /remoteAllowedRootsInput[^\n]*title="每行一个服务器上的绝对目录/);
  assert.match(source, /remoteDeniedRootsInput[^\n]*title="每行一个服务器上的绝对目录/);
  assert.match(source, /data-key="csvDirectory"[^\n]*title="填写工作区相对目录/);
  assert.match(source, /const fieldHelp = String\(title \|\| label\)/);
  assert.match(source, /const fieldHelp = String\(title \|\| label\) \+ "；当前 "/);
});

test("actual server status rendering never treats token errors, disconnected or configuration as healthy", () => {
  const script = [...renderPanelHtml().matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).join("\n");
  const ast = ts.createSourceFile("panel.js", script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const names = new Set(["serverObjectStatusClass", "serverObjectStatusLabel", "sessionStatusCell", "renderServerChainOverview"]), functions = [];
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.has(node.name?.text)) functions.push(node.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.equal(functions.length, names.size);
  const sandbox = { labelStatus: value => value, esc: value => String(value), escAttr: value => String(value),
    serverSetupReadiness: state => state.config, projectCodeSyncReadiness: () => ({ ready: true }),
    publishAgentReadiness: () => ({ ready: true }), serverStatusIndexesForState: () => ({ conflicts: [] }), topologyModeLabel: () => "Worker" };
  vm.createContext(sandbox); vm.runInContext(functions.join("\n"), sandbox);
  for (const status of ["disconnected", "agent_token_invalid", "worker_api_invalid", "agent_token_mismatch", "offline", "timeout", "local_port_closed", "agent_unreachable"]) {
    assert.equal(sandbox.serverObjectStatusClass(status), "error", status);
    assert.match(sandbox.serverObjectStatusLabel(status, "error"), new RegExp(status));
    assert.match(sandbox.sessionStatusCell(undefined, status, true), /pill status-failed/);
  }
  for (const status of ["configured", "已配置", "unknown", "stale", "connecting", "reconnecting", "paused", "future_status"]) assert.equal(sandbox.serverObjectStatusClass(status), "warn", status);
  for (const status of ["ok", "online", "connected", "agent_ok"]) assert.equal(sandbox.serverObjectStatusClass(status), "ok", status);
  assert.equal(sandbox.serverObjectStatusClass("online", { severity: "error" }), "error");
  assert.equal(sandbox.serverObjectStatusClass("online", { severity: "error" }, false), "disabled");
  assert.match(sandbox.sessionStatusCell({ severity: "error" }, "online", false), /已禁用/);
  assert.doesNotMatch(sandbox.sessionStatusCell({ severity: "error" }, "online", false), /status-completed|status-failed/);
  assert.match(sandbox.sessionStatusCell(undefined, "已配置", true), /status-warning.*待核实/);
  assert.match(sandbox.serverObjectStatusLabel("future_status", "warn"), /待核实.*future_status/);
  for (const config of [{ ready: false, summary: "当前未配置" }, { ready: false, summary: "当前全部已禁用" }, { ready: true, summary: "字段完整" }]) {
    const rendered = sandbox.renderServerChainOverview({ config });
    assert.doesNotMatch(rendered, /连接就绪|全绿/);
    assert.match(rendered, /chainStep warn[^>]*data-chain-step="connect"/);
    assert.match(rendered, config.ready ? /连接配置完整/ : new RegExp(config.summary));
    assert.match(rendered, /配置完整不代表连接成功/);
  }
});
