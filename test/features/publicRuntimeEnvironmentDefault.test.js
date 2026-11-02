const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

const root = path.join(__dirname, "../..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const extension = readSource("src/extension.ts");
const panel = readSource("src/ui/PanelHtml.ts");
const agentSource = readSource("src/clusterAgentRuntime.ts");

test("public setup defaults to system Python without changing explicit Conda environments", () => {
  const setup = require(path.join(root, "dist/tunnel/XshellTunnelSetup.js"));
  const policy = require(path.join(root, "dist/tunnel/AgentTmuxPolicy.js"));

  assert.equal(packageJson.contributes.configuration.properties["simpleExperiment.tunnel.condaEnv"].default, "");
  assert.equal(packageJson.contributes.configuration.properties["simpleExperiment.tunnel.remoteTmuxSessionPrefix"].default, "simple");
  assert.deepEqual(packageJson.contributes.configuration.properties["simpleExperiment.remote.allowedRoots"].default, []);
  assert.deepEqual(packageJson.contributes.configuration.properties["simpleExperiment.remote.deniedRoots"].default, []);
  assert.equal(setup.defaultXshellTunnelSetupConfig.condaEnv, "");
  assert.equal(setup.normalizeXshellSetupConfig({ condaEnv: "" }).condaEnv, "");
  assert.equal(setup.normalizeXshellSetupConfig({ condaEnv: " torch2 " }).condaEnv, "torch2");
  assert.equal(setup.workerTunnelToXshellSetupConfig({ ...setup.defaultXshellTunnelSetupConfig, condaEnv: "torch2" }, { id: "w1", condaEnv: "" }).condaEnv, "");
  assert.equal(setup.workerTunnelToXshellSetupConfig({ ...setup.defaultXshellTunnelSetupConfig, condaEnv: "torch2" }, { id: "w1" }).condaEnv, "torch2");

  assert.throws(() => policy.agentTmuxStartupCommand({role:"hub",port:33440,installDir:"/srv/agent",workDir:"/srv/demo"}), /HUB_REMOVED/);
  const blank = policy.agentTmuxStartupCommand({ role: "worker", endpointId: "blank-worker", port: 18765, installDir: "/srv/agent", workDir: "/srv/demo", condaEnv: "" });
  assert.match(blank, /SIMPLE_EXPERIMENT_CONDA_ENV=''/);
  assert.match(blank, /SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV='0'/);
  assert.match(blank, /SIMPLE_EXPERIMENT_AGENT_TMUX_V21=1/);
  assert.equal(JSON.parse(/--config '([^']+)'/.exec(blank)[1]).condaEnv, "");

  const explicit = policy.agentTmuxStartupCommand({ role: "worker", endpointId: "w1", port: 18766, installDir: "/srv/agent", workDir: "/srv/demo", condaEnv: "torch2" });
  assert.match(explicit, /SIMPLE_EXPERIMENT_CONDA_ENV='torch2'/);
  assert.match(explicit, /SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV='1'/);
  assert.equal(JSON.parse(/--config '([^']+)'/.exec(explicit)[1]).condaEnv, "torch2");
});

test("generated runtimes use system Python for blank environment and fail closed for explicit Conda", () => {
  const agentPath = path.join(root, "dist/runtime/cluster_agent.py");
  const schedulerPath = path.join(root, "dist/runtime/cluster_scheduler.py");
  const script = `
import importlib.util, json, os, sys
def load(name, path):
    import sys
    sys.path.insert(0, ${JSON.stringify(require("node:path").resolve(__dirname, "../_helpers"))})
    from extractRuntimeFunctions import extract_runtime_functions
    module = extract_runtime_functions(path, ["runtime_python_command", "simple_conda_activation_script", "simple_conda_env_name", "simple_runtime_env", "simple_runtime_python", "simple_tmux_name"])
    return module
agent = load("simple_experiment_agent", ${JSON.stringify(agentPath)})
os.environ["SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX"] = "zlk"
scheduler = load("simple_experiment_scheduler", ${JSON.stringify(schedulerPath)})
blank = agent.simple_runtime_env({})
explicit = agent.simple_runtime_env({"SIMPLE_EXPERIMENT_CONDA_ENV": "/path/to/conda_envs/torch2"})
try:
    agent.simple_runtime_python({"SIMPLE_EXPERIMENT_CONDA_ENV": "torch2"})
    invalid_name_rejected = False
except RuntimeError:
    invalid_name_rejected = True
print(json.dumps({
    "blank": blank,
    "blank_python": agent.simple_runtime_python(blank),
    "explicit": explicit,
    "explicit_python": agent.simple_runtime_python(explicit),
    "invalid_name_rejected": invalid_name_rejected,
    "agent_activation": agent.simple_conda_activation_script(),
    "prefixed_tmux": agent.simple_tmux_name("worker-w1-1"),
    "scheduler_blank_name": scheduler.simple_conda_env_name({}),
    "scheduler_blank_activation": scheduler.simple_conda_activation_script({}),
    "scheduler_blank_python": scheduler.runtime_python_command({}),
    "scheduler_explicit_activation": scheduler.simple_conda_activation_script({"SIMPLE_EXPERIMENT_CONDA_ENV": "/path/to/conda_envs/torch2", "SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV": "1"}),
}))
`;
  const result = spawnSync("python", ["-B", (() => { const f = require("node:fs"), p = require("node:path"); const d = f.mkdtempSync(p.join(require("node:os").tmpdir(), "se-python-fixture-")); const file = p.join(d, "probe.py"); f.writeFileSync(file, script, "utf8"); console.log("kept Python fixture at " + d); return file; })()], { encoding: "utf8", timeout: 10000, windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const value = JSON.parse(result.stdout.trim());
  assert.equal(value.blank.SIMPLE_EXPERIMENT_CONDA_ENV, "");
  assert.equal(value.blank.SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV, "0");
  assert.equal(value.blank_python, value.scheduler_blank_python);
  assert.equal(value.explicit.SIMPLE_EXPERIMENT_CONDA_ENV, "/path/to/conda_envs/torch2");
  assert.equal(value.explicit.SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV, "1");
  assert.equal(value.explicit_python, "/path/to/conda_envs/torch2/bin/python");
  assert.equal(value.invalid_name_rejected, true);
  assert.match(value.agent_activation, /if \[ -n "\$SIMPLE_EXPERIMENT_CONDA_ENV" \]; then :/);
  assert.equal(value.prefixed_tmux, "zlk-worker-w1-1");
  assert.equal(value.scheduler_blank_name, "");
  assert.equal(value.scheduler_blank_activation, "true");
  assert.match(value.scheduler_explicit_activation, /conda activate "\$SIMPLE_EXPERIMENT_CONDA_ENV"/);
});

test("settings and confirmations explain the effective runtime environment", () => {
  assert.match(extension, /function condaEnvPatch\(patch, key, fallback = ""\)/);
  assert.match(extension, /return condaEnv \? `Conda \$\{condaEnv\}` : "系统 Python（未指定 Conda）"/);
  assert.match(extension, /updateXshellSessionLoginCommand\)\(target\.filePath, target\.command/);
  assert.match(panel, /configInput\("defaults", "remoteTmuxSessionPrefix", "全局远端资源前缀"/);
  assert.match(panel, /cards\.push\([\s\S]{0,500}data-anchor="servers-session-defaults"[\s\S]{0,700}remoteTmuxSessionPrefix/);
  assert.match(extension, /remoteTmuxSessionPrefix: patch\.remoteTmuxSessionPrefix === undefined \? this\.setupConfig\.remoteTmuxSessionPrefix : patch\.remoteTmuxSessionPrefix/);
  assert.match(agentSource, /conda_declared = any\(key in command/);
  assert.match(agentSource, /env\["SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV"\] = "1" if conda_env else "0"/);
  assert.match(panel, /Conda 环境绝对路径/);
  assert.match(panel, /留空使用系统 Python/);
});

function prefixFixture() {
  const vm = require("node:vm"), ts = require("typescript");
  const source = fs.readFileSync(path.join(root, "src/extension/legacy.ts"), "utf8");
  const ast = ts.createSourceFile("host.ts", source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === "RealtimeTunnelPanelProvider");
  const names = ["loadSetupConfig", "sessionDefaultInspections", "sessionDefaultConfigurationSignature", "persistGlobalResourcePrefix", "remindDefaultResourcePrefix", "applySetupDraft"];
  const members = cls.members.filter(node => names.includes(node.name?.getText(ast))).map(node => node.getText(ast)).join("\n");
  const state = { prefix: undefined, project: "/local/demo", prompts: 0, choice: "稍后", value: "alice", writes: [],
    savedConfig: { remoteTmuxSessionPrefix: "zlk", sessionPrefix: "other-old-prefix", workerTunnels: [] } };
  const config = { inspect: key => key === "tunnel.remoteTmuxSessionPrefix"
    ? { defaultValue: "simple", globalValue: state.prefix, workspaceValue: "workspace-prefix", workspaceFolderValue: "folder-prefix" }
    : { defaultValue: "", ...(key === "tunnel.condaEnv" ? { globalValue: state.globalConda } : {}) },
    update: async (key, value, scope) => { state.writes.push({ key, value, scope }); state.prefix = value; } };
  const code = ts.transpileModule("class Host {" + members + "}; Host", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const Host = vm.runInNewContext(code, {
    vscode: { ConfigurationTarget: { Global: 1 }, workspace: { getConfiguration: () => config }, window: {
      showWarningMessage: async () => { state.prompts++; return state.choice; }, showInputBox: async () => state.value,
    } },
    ConfigurationSettings_1: require(path.join(root, "dist/tunnel/ConfigurationSettings.js")),
    XshellTunnelSetup_1: require(path.join(root, "dist/tunnel/XshellTunnelSetup.js")),
    AgentTmuxPolicy_1: require(path.join(root, "dist/tunnel/AgentTmuxPolicy.js")),
    TunnelGateway_1: { normalizeTunnelGatewayConfig: value => value, xshellTunnelConnectionMode: "xshell_realtime" },
    workspaceRoot: () => state.project, keys: { setupConfig: "setup", setupConfigurationSignature: "signature" },
    readProjectConnectionValue: (_context, _root, key) => key === "setup" ? state.savedConfig : state.signature,
    nonEmptyWorkerTunnelConfig: () => [],
    saveProjectConnectionValues: async () => {},
  });
  const host = new Host(); host.context = {}; host.tunnelConfig = {}; host.postState = () => {};
  host.lastWorkerProbes = {}; host.saveState = async () => {}; host.resetClient = () => {};
  host.setupConfig = host.loadSetupConfig();
  return { host, state };
}

test("resource prefix comes only from global user configuration across projects and without a project", () => {
  const { host, state } = prefixFixture();
  assert.equal(host.loadSetupConfig().remoteTmuxSessionPrefix, "simple");
  state.prefix = "alice";
  assert.equal(host.loadSetupConfig().remoteTmuxSessionPrefix, "alice");
  state.project = "/another/project";
  assert.equal(host.loadSetupConfig().remoteTmuxSessionPrefix, "alice");
  state.project = "";
  assert.equal(host.loadSetupConfig().remoteTmuxSessionPrefix, "alice");
  assert.doesNotMatch(extension, /setupConfig(?:\s+as\s+any)?\)?\??\.sessionPrefix|get\("sessionPrefix"\)|projectSessionPrefixPrompt/);
});

test("a prefix change preserves saved project Conda with both existing and new signatures", () => {
  const { host, state } = prefixFixture();
  state.savedConfig.condaEnv = "/project/env"; state.globalConda = "/global/env"; state.prefix = "alice";
  const condaInspection = ["", null, null, "/global/env"];
  for (const signature of [JSON.stringify([["simple", null, null, "old-prefix"], condaInspection]), JSON.stringify([condaInspection])]) {
    state.signature = signature;
    assert.equal(host.loadSetupConfig().condaEnv, "/project/env");
    state.prefix = "bob";
    assert.equal(host.loadSetupConfig().condaEnv, "/project/env");
  }
  state.globalConda = "/changed/global/env";
  assert.equal(host.loadSetupConfig().condaEnv, "/changed/global/env");
});

test("ordinary server snapshots cannot write an obsolete project prefix back to global settings", async () => {
  const { host, state } = prefixFixture(); state.prefix = "alice";
  await host.applySetupDraft({ remoteTmuxSessionPrefix: "zlk", workerTunnels: [] });
  assert.equal(host.setupConfig.remoteTmuxSessionPrefix, "alice");
  assert.equal(state.writes.length, 0);
  await host.applySetupDraft({ remoteTmuxSessionPrefix: "team", workerTunnels: [] }, { saveGlobalResourcePrefix: true });
  assert.equal(host.setupConfig.remoteTmuxSessionPrefix, "team");
  assert.deepEqual(state.writes, [{ key: "tunnel.remoteTmuxSessionPrefix", value: "team", scope: 1 }]);
});

test("every plugin opening reminds while the default is unchanged and global save works without a project", async () => {
  const { host, state } = prefixFixture();
  await host.remindDefaultResourcePrefix(); await host.remindDefaultResourcePrefix();
  assert.equal(state.prompts, 2);
  state.choice = "设置全局前缀"; state.project = "";
  await host.remindDefaultResourcePrefix();
  assert.equal(state.prefix, "alice");
  assert.deepEqual(state.writes, [{ key: "tunnel.remoteTmuxSessionPrefix", value: "alice", scope: 1 }]);
  await host.remindDefaultResourcePrefix();
  assert.equal(state.prompts, 3);
  await assert.rejects(host.persistGlobalResourcePrefix("bad prefix"), /全局资源前缀/);
  assert.equal(state.writes.length, 1);
  assert.match(extension, /if \(webviewView\.visible\) void this\.remindDefaultResourcePrefix\(\)/);
  assert.match(extension, /if \(becameVisible\) void this\.remindDefaultResourcePrefix\(\)/);
  assert.match(panel, /未修改时每次打开插件都会提醒/);
});

test("a global prefix change participates in the real settings render model", () => {
  const vm = require("node:vm");
  const sandbox = { compactRecordForSignature: value => value, compactRowsForSignature: value => value, SECTION_SIGNATURE_ROW_LIMIT: 100 };
  vm.createContext(sandbox);
  vm.runInContext(require("../_helpers/panelFunction")("compactSetupForSignature"), sandbox);
  assert.equal(sandbox.compactSetupForSignature({ remoteTmuxSessionPrefix: "alice" }).remoteTmuxSessionPrefix, "alice");
  assert.notDeepEqual(sandbox.compactSetupForSignature({ remoteTmuxSessionPrefix: "alice" }), sandbox.compactSetupForSignature({ remoteTmuxSessionPrefix: "simple" }));
});
