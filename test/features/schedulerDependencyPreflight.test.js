const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const schedulerPath = path.join(root, "dist/runtime/cluster_scheduler.py");
const agentPath = path.join(root, "dist/runtime/cluster_agent.py");
const agentSource = fs.readFileSync(path.join(root, "src/clusterAgentRuntime.ts"), "utf8");
const schedulerSource = fs.readFileSync(path.join(root, "src/clusterSchedulerRuntime.ts"), "utf8");
const extensionSource = fs.readFileSync(path.join(root, "src/extension.ts"), "utf8");
const panelSource = fs.readFileSync(path.join(root, "src/ui/PanelHtml.ts"), "utf8");
const probeSource = fs.readFileSync(path.join(root, "src/tunnel/XshellTunnelPortProbe.ts"), "utf8");
const utf8PythonEnv = { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" };

test("scheduler reports actionable PyYAML guidance without a traceback", () => {
  const readyCheck = spawnSync("python", [schedulerPath, "--check-dependencies-json"], { encoding: "utf8", env: utf8PythonEnv });
  assert.equal(readyCheck.status, 0, readyCheck.stderr || readyCheck.stdout);
  const ready = JSON.parse(readyCheck.stdout.trim());
  assert.equal(ready.ok, true);
  assert.deepEqual(ready.missingModules, []);
  assert.equal(ready.installCommand, "");

  const check = spawnSync("python", ["-S", schedulerPath, "--check-dependencies-json"], { encoding: "utf8", env: utf8PythonEnv });
  assert.equal(check.status, 0, check.stderr || check.stdout);
  const status = JSON.parse(check.stdout.trim());
  assert.equal(status.ok, false);
  assert.equal(status.environment.kind, "system_python");
  assert.deepEqual(status.missingModules, [{ module: "yaml", package: "PyYAML" }]);
  assert.match(status.installCommand, /-m pip install PyYAML$/);
  assert.match(status.message, /当前执行环境：系统 Python/);
  assert.match(status.message, /缺失模块：yaml \(PyYAML\)/);
  assert.doesNotMatch(status.message, /Traceback/);

  const validation = spawnSync("python", ["-S", schedulerPath, "--validate-plan", "--plan", "missing.yaml"], { encoding: "utf8", env: utf8PythonEnv });
  assert.notEqual(validation.status, 0);
  assert.match(validation.stderr, /Scheduler 依赖预检失败/);
  assert.match(validation.stderr, /安装命令：/);
  assert.doesNotMatch(validation.stderr, /Traceback/);
});

test("dependency guidance targets an explicitly configured Conda environment", () => {
  const check = spawnSync("python", ["-S", schedulerPath, "--check-dependencies-json"], {
    encoding: "utf8",
    env: { ...utf8PythonEnv, SIMPLE_EXPERIMENT_CONDA_ENV: "research", SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV: "1" },
  });
  assert.equal(check.status, 0, check.stderr || check.stdout);
  const status = JSON.parse(check.stdout.trim());
  assert.equal(status.ok, false);
  assert.equal(status.environment.kind, "conda");
  assert.equal(status.environment.name, "research");
  assert.equal(status.installCommand, "conda run -n research python -m pip install PyYAML");
  assert.match(status.message, /当前执行环境：Conda research/);
});

test("Agent propagates dependency failures before validation, preview, or Worker launch", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-dependency-"));
  const fixture = path.join(directory, "scheduler.py");
  fs.writeFileSync(fixture, [
    "import json, sys",
    "if '--check-dependencies-json' in sys.argv:",
    "    print(json.dumps({'ok': False, 'message': '缺少 yaml；安装命令：python -m pip install PyYAML'}))",
    "else:",
    "    raise SystemExit('scheduler should not run')",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(directory, "plan.yaml"), "mode: train\n", "utf8");
  const script = [
    "import importlib.util, json, sys",
    `spec = importlib.util.spec_from_file_location('agent', ${JSON.stringify(agentPath)})`,
    "agent = importlib.util.module_from_spec(spec)",
    "sys.modules['agent'] = agent",
    "spec.loader.exec_module(agent)",
    "dependency_error = ''",
    "try:",
    `    agent.require_scheduler_dependencies(${JSON.stringify(directory)}, ${JSON.stringify(fixture)})`,
    "except Exception as exc:",
    "    dependency_error = str(exc)",
    `worker = agent.execute_worker_command(${JSON.stringify(directory)}, {'action': 'start-worker-task', 'commandId': 'cmd-1', 'projectDir': ${JSON.stringify(directory)}, 'schedulerPath': ${JSON.stringify(fixture)}, 'planFile': 'plan.yaml', 'mode': 'train', 'condaEnv': 'research'}, 'worker-1')`,
    "print(json.dumps({'error': dependency_error, 'worker': worker}, ensure_ascii=False))",
  ].join("\n");
  const result = spawnSync("python", ["-c", script], { encoding: "utf8" });
  fs.rmSync(directory, { recursive: true, force: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout.trim());
  assert.match(payload.error, /python -m pip install PyYAML/);
  assert.equal(payload.worker.status, "failed");
  assert.match(payload.worker.message, /python -m pip install PyYAML/);

  const validate = agentSource.slice(agentSource.indexOf("def scheduler_validate_json"), agentSource.indexOf("def dry_run_preview_action"));
  const preview = agentSource.slice(agentSource.indexOf("def dry_run_preview_action"), agentSource.indexOf("def selected_worker_id"));
  const worker = agentSource.slice(agentSource.indexOf("def execute_worker_command"), agentSource.indexOf("def worker_command_plan_mode"));
  assert.match(validate, /require_scheduler_dependencies\(root, scheduler, env\)/);
  assert.match(preview, /require_scheduler_dependencies\(root, scheduler\)/);
  assert.ok(worker.indexOf("require_scheduler_dependencies") < worker.indexOf("start_simple_tmux_command"));
  assert.ok(worker.indexOf("require_scheduler_dependencies") < worker.indexOf("subprocess.Popen"));
  assert.match(agentSource, /simple_conda_activation_script\(\)\} && exec/);
  assert.match(schedulerSource, /simple_conda_activation_script\(env\)\} && exec/);
});

test("Agent health reports scheduler dependency readiness before plan actions", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-health-dependency-"));
  const fixture = path.join(directory, "scheduler.py");
  fs.writeFileSync(fixture, [
    "import json, sys",
    "if '--check-dependencies-json' in sys.argv:",
    "    print(json.dumps({'ok': False, 'environment': {'kind': 'system_python', 'label': '系统 Python', 'python': sys.executable}, 'missingModules': [{'module': 'yaml', 'package': 'PyYAML'}], 'installCommand': 'python -m pip install PyYAML', 'message': 'Scheduler 依赖预检失败；安装命令：python -m pip install PyYAML'}, ensure_ascii=False))",
  ].join("\n"), "utf8");
  const script = [
    "import importlib.util, json, sys",
    `spec = importlib.util.spec_from_file_location('agent', ${JSON.stringify(agentPath)})`,
    "agent = importlib.util.module_from_spec(spec)",
    "sys.modules['agent'] = agent",
    "spec.loader.exec_module(agent)",
    `agent.cluster_scheduler_path = lambda root: ${JSON.stringify(fixture)}`,
    `print(json.dumps(agent.api_health(${JSON.stringify(directory)}), ensure_ascii=False))`,
  ].join("\n");
  const result = spawnSync("python", ["-c", script], { encoding: "utf8", env: utf8PythonEnv });
  fs.rmSync(directory, { recursive: true, force: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const health = JSON.parse(result.stdout.trim());
  assert.equal(health.schedulerDependencies.ok, false);
  assert.deepEqual(health.schedulerDependencies.missingModules, [{ module: "yaml", package: "PyYAML" }]);
  assert.match(health.schedulerDependencies.installCommand, /pip install PyYAML/);
  assert.match(health.schedulerDependencies.message, /安装命令/);
});

test("endpoint probes, onboarding, and UI retain scheduler dependency guidance", () => {
  assert.match(probeSource, /schedulerDependencies: health\.schedulerDependencies/);
  assert.match(extensionSource, /schedulerDependencies: compactSchedulerDependenciesForWebview\(probe\.schedulerDependencies\)/);
  assert.match(extensionSource, /const dependencyIssues = \[\{ label: "Hub", probe: hub \}, \.\.\.workers\]/);
  assert.match(extensionSource, /projectBootstrapEndpointReadiness\(\{[\s\S]*hubSchedulerDependencies/);
  assert.match(panelSource, /const dependencyRows = hubRequired \? \[\{ label: "Hub", dependency: hubProbe\.schedulerDependencies \}\] : \[\]/);
  assert.match(panelSource, /Scheduler 依赖缺失/);
  assert.match(panelSource, /installCommand/);
  assert.match(panelSource, /renderSchedulerDependencyStatus/);
});
