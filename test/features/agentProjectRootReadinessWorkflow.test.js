const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
const probeSource = fs.readFileSync(path.join(__dirname, "../../src/tunnel/XshellTunnelPortProbe.ts"), "utf8");

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

function loadAgentRootHelpers() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction(extension, "normalizeAgentProjectRoot"),
    extractFunction(extension, "enforceExpectedAgentProjectRoot"),
    extractFunction(extension, "assertAgentProjectProbeReady"),
    "this.api = { normalizeAgentProjectRoot, enforceExpectedAgentProjectRoot, assertAgentProjectProbeReady };",
  ].join("\n"), sandbox);
  return sandbox.api;
}

function loadEndpointReadiness() {
  const sandbox = {
    EMPTY_WORKER_TUNNELS_FOR_ALIAS: [],
    enabledWorkerTunnelsCacheSource: null,
    enabledWorkerTunnelsCacheValue: [],
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction(panel, "enabledWorkerTunnelsForState"),
    extractFunction(panel, "projectEndpointReadiness"),
    "this.check = projectEndpointReadiness;",
  ].join("\n"), sandbox);
  return sandbox.check;
}

test("Agent project roots normalize separators and trailing slashes", () => {
  const { normalizeAgentProjectRoot } = loadAgentRootHelpers();
  assert.equal(normalizeAgentProjectRoot(" /remote//experiments/project/ "), "/remote/experiments/project");
  assert.equal(normalizeAgentProjectRoot("C:\\Experiments\\Project\\"), "c:/Experiments/Project");
  assert.equal(normalizeAgentProjectRoot("/"), "/");
});

test("matching roots pass while missing or stale roots become a dedicated mismatch", () => {
  const { enforceExpectedAgentProjectRoot, assertAgentProjectProbeReady } = loadAgentRootHelpers();
  const matching = enforceExpectedAgentProjectRoot({ status: "ok", projectRoot: "/remote/project/" }, "/remote//project", "Hub");
  assert.equal(matching.status, "ok");
  assert.equal(matching.expectedProjectRoot, "/remote/project");
  for (const projectRoot of ["", "/remote/old-project"]) {
    const checked = enforceExpectedAgentProjectRoot({ status: "ok", projectRoot }, "/remote/new-project", "Hub");
    assert.equal(checked.status, "agent_project_mismatch");
    assert.equal(checked.expectedProjectRoot, "/remote/new-project");
    assert.match(checked.suggestion, /准备 Agent 并启动/);
    assert.throws(() => assertAgentProjectProbeReady(checked, "/remote/new-project", "Hub"), /当前项目目录与本工作区不一致/);
  }
  const stale = enforceExpectedAgentProjectRoot({ status: "file_api_unavailable", projectRoot: "/remote/project-a" }, "/remote/project-b", "Hub");
  const restored = enforceExpectedAgentProjectRoot(stale, "/remote/project-a", "Hub");
  assert.equal(restored.status, "file_api_unavailable");
  assert.equal(restored.projectRootValidatedStatus, undefined);
});

test("Hub-only checks and execution checks use different endpoint scopes", () => {
  const actionStart = extension.indexOf("async runActionCommand(command, message)");
  const actionEnd = extension.indexOf("async runPlanPreflight(body, label)", actionStart);
  const action = extension.slice(actionStart, actionEnd);
  const validateStart = action.indexOf('if (command === "validatePlan"');
  const runStart = action.indexOf('if (command === "runPlan"');
  const validateGuard = action.slice(validateStart, runStart);
  const runGuard = action.slice(runStart, action.indexOf("const danger = command", runStart));
  const runAll = extension.slice(extension.indexOf("async runAllPlansFromUi()"), extension.indexOf("async generatePlanGuideFromUi("));
  assert.match(validateGuard, /assertHubAgentProjectReady\(\)/);
  assert.doesNotMatch(validateGuard, /assertExecutionAgentProjectsReady\(\)/);
  assert.match(runGuard, /assertExecutionAgentProjectsReady\(\)/);
  assert.match(runAll, /assertExecutionAgentProjectsReady\(\)/);
  assert.ok(runAll.indexOf("assertExecutionAgentProjectsReady()") < runAll.indexOf("confirmPlanBatchRunSubmission"));
  const applySetup = extension.slice(extension.indexOf("async applySetupDraft(patch, options = {})"), extension.indexOf("currentUiLayoutState()"));
  assert.match(applySetup, /enforceExpectedAgentProjectRoot\(this\.lastProbe/);
  assert.match(applySetup, /enforceExpectedAgentProjectRoot\(this\.lastWorkerProbes\[worker\.id\]/);
});

test("UI distinguishes stale Hub and Worker projects and directs preparation", () => {
  const readiness = loadEndpointReadiness();
  const hubMismatch = readiness({
    setup: { workerTunnels: [] },
    probe: { status: "agent_project_mismatch", projectRoot: "/remote/old", expectedProjectRoot: "/remote/new" },
  });
  assert.equal(hubMismatch.hubReady, false);
  assert.equal(hubMismatch.projectMismatch, true);
  assert.match(hubMismatch.missing[0], /\/remote\/old/);
  const workerMismatch = readiness({
    setup: { workerTunnels: [{ id: "w1", displayName: "Worker 1", enabled: true }] },
    probe: { status: "ok" },
    workerProbes: { w1: { status: "agent_project_mismatch", projectRoot: "/old", expectedProjectRoot: "/new" } },
  });
  assert.equal(workerMismatch.hubReady, true);
  assert.equal(workerMismatch.ready, false);
  assert.match(workerMismatch.missing[0], /Worker 1.*旧项目/);
  assert.match(panel, /当前 Agent 仍指向旧项目；需重写本项目启动命令/);
  assert.match(panel, /projectMismatch[\s\S]{0,160}data-command="prepareAgents"/);
});

test("probe and webview compaction retain actual and expected project roots", () => {
  assert.match(probeSource, /const projectRoot = String\(health\.projectRoot \|\| ""\)\.trim\(\)/);
  assert.match(probeSource, /healthOk: true, projectRoot/);
  const compactHub = extractFunction(extension, "compactProbeForWebview");
  const compactWorker = extractFunction(extension, "compactWorkerProbeForWebview");
  assert.match(compactHub, /projectRoot: probe\.projectRoot/);
  assert.match(compactHub, /expectedProjectRoot: probe\.expectedProjectRoot/);
  assert.match(compactWorker, /projectRoot: probe\.projectRoot/);
  assert.match(compactWorker, /expectedProjectRoot: probe\.expectedProjectRoot/);
  assert.match(extension, /probe\.status === "agent_project_mismatch" \? "agent_project_mismatch"/);
});
