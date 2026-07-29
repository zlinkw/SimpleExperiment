const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(name) {
  const start = panel.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = panel.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function baseSandbox() {
  return {
    EMPTY_OUTPUT_DERIVATION_VALUES: Object.freeze([]),
    EMPTY_OUTPUT_DERIVATION_SOURCE: Object.freeze({}),
    EMPTY_SERVER_SETUP: Object.freeze({}),
    EMPTY_WORKER_TUNNELS_FOR_ALIAS: Object.freeze([]),
    projectUploadDestinationSummaryCache: new WeakMap(),
    projectEnvironmentSummaryCache: new WeakMap(),
    projectWorkspaceContextCache: new WeakMap(),
    enabledWorkerTunnelsCacheSource: null,
    enabledWorkerTunnelsCacheValue: [],
    asArray(value) { return Array.isArray(value) ? value : []; },
    meaningfulValue(value) { return String(value === undefined || value === null ? "" : value).trim(); },
    compactPath(value) { return String(value || ""); },
    compactText(value, limit) { return String(value || "").slice(0, limit); },
    uniqueText(values) { return [...new Set(values.filter(Boolean))]; },
  };
}

test("project upload destination summary reuses stable Agent inputs and invalidates replacements", () => {
  const sandbox = baseSandbox();
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("projectUploadDestinationSummary")}\nthis.check = projectUploadDestinationSummary;`, sandbox);

  const agentSessions = {
    hub: { workDir: "/srv/demo", actualWorkRoot: "/srv", projectName: "demo" },
    workers: [
      { id: "worker-a", enabled: true, workDir: "/srv/demo" },
      { id: "worker-b", enabled: true, workDir: "/srv/demo" },
    ],
  };
  const state = { agentSessions };
  const first = sandbox.check(state);

  assert.strictEqual(sandbox.check(state), first);
  assert.equal(first.ready, true);
  assert.match(first.summary, /Hub \+ 2 个 Worker/);

  agentSessions.hub = { ...agentSessions.hub, workDir: "/srv/demo-v2" };
  const hubRefresh = sandbox.check(state);
  assert.notStrictEqual(hubRefresh, first);
  assert.match(hubRefresh.summary, /2 个独立位置/);

  agentSessions.workers = [{ id: "worker-a", enabled: true, workDir: "" }];
  const workerRefresh = sandbox.check(state);
  assert.notStrictEqual(workerRefresh, hubRefresh);
  assert.equal(workerRefresh.ready, false);
  assert.match(workerRefresh.summary, /1 个 Worker 路径待保存/);
});

test("project environment summary reuses stable setup and manifests and invalidates replacements", () => {
  const sandbox = baseSandbox();
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("enabledWorkerTunnelsForState"),
    extractFunction("executionEnvironmentText"),
    extractFunction("projectEnvironmentSummary"),
    "this.check = projectEnvironmentSummary;",
  ].join("\n"), sandbox);

  const state = {
    setup: {
      condaEnv: "base",
      workerTunnels: [{ id: "worker-a", enabled: true, condaEnv: "gpu" }],
    },
  };
  const project = { environmentFiles: ["environment.yml", "pyproject.toml"] };
  const first = sandbox.check(state, project);

  assert.strictEqual(sandbox.check(state, project), first);
  assert.equal(first.firstFile, "environment.yml");
  assert.match(first.summary, /Hub Conda base · Worker Conda gpu/);

  project.environmentFiles = ["requirements.txt"];
  const manifestRefresh = sandbox.check(state, project);
  assert.notStrictEqual(manifestRefresh, first);
  assert.equal(manifestRefresh.firstFile, "requirements.txt");

  state.setup = { condaEnv: "torch", workerTunnels: [{ id: "worker-a", enabled: true }] };
  const setupRefresh = sandbox.check(state, project);
  assert.notStrictEqual(setupRefresh, manifestRefresh);
  assert.match(setupRefresh.summary, /^Conda torch/);
});

test("project workspace summary reuses stable inputs and invalidates effective scalar changes", () => {
  const sandbox = baseSandbox();
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("projectWorkspaceContext")}\nthis.check = projectWorkspaceContext;`, sandbox);

  const workspace = {
    root: "D:/GitRepo/Demo",
    name: "Demo",
    containerPath: "/workspaces/Demo",
    folderCount: 1,
    singleProject: true,
  };
  const state = { workspace };
  const project = { root: "D:/Fallback" };
  const first = sandbox.check(state, project);

  assert.strictEqual(sandbox.check(state, project), first);
  assert.equal(first.singleProject, true);
  assert.match(first.summary, /容器 \/workspaces\/Demo → 宿主 D:\/GitRepo\/Demo/);

  workspace.containerPath = "/workspace/Demo";
  const pathRefresh = sandbox.check(state, project);
  assert.notStrictEqual(pathRefresh, first);
  assert.match(pathRefresh.summary, /容器 \/workspace\/Demo/);

  workspace.mappingError = "映射失败";
  const errorRefresh = sandbox.check(state, project);
  assert.notStrictEqual(errorRefresh, pathRefresh);
  assert.match(errorRefresh.summary, /工作区路径映射错误/);

  workspace.mappingError = "";
  workspace.folderCount = 2;
  workspace.singleProject = false;
  const multiple = sandbox.check(state, project);
  assert.equal(multiple.singleProject, false);
  assert.match(multiple.summary, /多根工作区（2 个）/);
});
