const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const body = source.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

test("project quick access gates run readiness on server setup", () => {
  assert.match(panel, /function serverSetupReadiness\(state\)/);
  assert.match(panel, /Hub Xshell 会话/);
  assert.match(panel, /Hub 项目父目录/);
  assert.match(panel, /worker\.agentProjectDir/);
  assert.match(panel, /先配置 Xshell 会话和服务器项目父目录/);
  assert.match(panel, /data-section-target="settings" data-anchor-target="settings-servers"/);
  assert.match(panel, /projectQuickLifecyclePresentation\(executionStage, readyToStart, firstRunRecommended\)/);
});

test("experiment submission requires an enabled Worker before confirmation or sync", () => {
  const sandbox = {
    EMPTY_WORKER_TUNNELS_FOR_ALIAS: [],
    enabledWorkerTunnelsCacheSource: null,
    enabledWorkerTunnelsCacheValue: [],
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction(panel, "enabledWorkerTunnelsForState"),
    extractFunction(panel, "executionWorkerReadiness"),
    "this.check = executionWorkerReadiness;",
  ].join("\n"), sandbox);
  assert.equal(sandbox.check({ setup: { workerTunnels: [] } }).ready, false);
  assert.equal(sandbox.check({ setup: { workerTunnels: [{ id: "w1", enabled: false }] } }).ready, false);
  assert.equal(sandbox.check({ setup: { workerTunnels: [{ id: "w1", enabled: true }] } }).ready, true);
  assert.match(panel, /projectQuickRow\("运行目标", workerReadiness\.summary/);
  assert.match(panel, /至少配置并启用一个执行 Worker/);
  assert.match(panel, /\["runPlan", "reproducePlan", "runAllPlans"\].*executionWorkerReadiness/);
  assert.match(extension, /assertExecutionWorkersReady\(workers = this\.workerActionTargets\(\)\)/);
  assert.match(extension, /至少需要配置并启用一个 Worker 才能运行实验/);
});
