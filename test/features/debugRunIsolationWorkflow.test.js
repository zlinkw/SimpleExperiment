const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "../..");
const schedulerRuntime = path.join(root, "dist/runtime/cluster_scheduler.py");
const agentRuntime = path.join(root, "dist/runtime/cluster_agent.py");
const schedulerSource = fs.readFileSync(path.join(root, "src/clusterSchedulerRuntime.ts"), "utf8");
const agentSource = fs.readFileSync(path.join(root, "src/clusterAgentRuntime.ts"), "utf8");
const extensionSource = fs.readFileSync(path.join(root, "src/extension.ts"), "utf8");
const panelSource = fs.readFileSync(path.join(root, "src/ui/PanelHtml.ts"), "utf8");

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

function runModeActionLabel(mode, formalLabel) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(extractFunction(panelSource, "runModeActionLabel") + "\nthis.check = runModeActionLabel;", sandbox);
  return sandbox.check(mode, formalLabel);
}

function runModeForButton(dataset, command, fallbackMode) {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(extractFunction(panelSource, "runModeForButton") + "\nthis.check = runModeForButton;", sandbox);
  return sandbox.check({ dataset }, command, fallbackMode);
}

test("Debug mode is explicit and propagates across Local, Hub, Scheduler, and Worker", () => {
  assert.match(panelSource, /data-run-mode="formal"/);
  assert.match(panelSource, /data-run-mode="debug"/);
  assert.match(panelSource, /payload\.debugMode = runModeForButton\(button, command, runMode\)/);
  assert.match(panelSource, /debugMode: pick\(row, \["debugMode", "debug_mode"\]/);
  assert.match(panelSource, /Debug 已完成；先查看任务与日志/);
  assert.match(extensionSource, /const debugMode = booleanField\(message, "debugMode"\)/);
  assert.match(extensionSource, /debugMode \? "Debug 运行" :/);
  assert.match(agentSource, /"--debug-mode"/);
  assert.match(agentSource, /"debugMode": debug_mode/);
  assert.match(schedulerSource, /parser\.add_argument\("--debug-mode", action="store_true"\)/);
  assert.match(schedulerSource, /"debugMode": bool\(args\.debug_mode\)/);
  assert.match(schedulerSource, /"debugMode": bool\(debug_mode\)/);
});

test("Debug worker execution rewrites outputs under debug_runs", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-debug-run-"));
  fs.mkdirSync(path.join(project, "configs"), { recursive: true });
  fs.mkdirSync(path.join(project, "experiments", "plans"), { recursive: true });
  fs.writeFileSync(path.join(project, "configs", "base.yaml"), "{}\n", "utf8");
  fs.writeFileSync(path.join(project, "train_stage.py"), [
    "import argparse",
    "from pathlib import Path",
    "p = argparse.ArgumentParser()",
    "p.add_argument('--output-dir', required=True)",
    "p.add_argument('--result-csv', required=True)",
    "a = p.parse_args()",
    "out = Path(a.output_dir)",
    "out.mkdir(parents=True, exist_ok=True)",
    "(out / 'debug.marker').write_text('ok', encoding='utf-8')",
    "result = Path(a.result_csv)",
    "result.parent.mkdir(parents=True, exist_ok=True)",
    "result.write_text('metric,value\\nAUC,0.9\\n', encoding='utf-8')",
    "",
  ].join("\n"), "utf8");
  const plan = path.join(project, "experiments", "plans", "smoke.yaml");
  fs.writeFileSync(plan, [
    "suite: smoke",
    "mode: train",
    "base_config: configs/base.yaml",
    "seeds: [0, 1]",
    "runner:",
    "  train_command: python train_stage.py --output-dir work_dirs/hardcoded --result-csv experiments/results/hardcoded.csv",
    "paper:",
    "  result_csv: experiments/results/smoke.csv",
    "naming:",
    "  sweep_dir: work_dirs/{suite}",
    "cases:",
    "  - case: baseline",
    "",
  ].join("\n"), "utf8");

  const result = spawnSync("python", [schedulerRuntime, "--run-job", "--plan", plan, "--only-index", "0", "--debug-mode", "--debug-run-id", "debug-1"], { cwd: project, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const debugRoot = path.join(project, "zlk_cluster", "debug_runs");
  const markers = fs.readdirSync(debugRoot, { recursive: true }).filter((item) => String(item).endsWith("debug.marker"));
  assert.equal(markers.length, 1);
  assert.equal(fs.existsSync(path.join(project, "work_dirs")), false);
  assert.equal(fs.existsSync(path.join(project, "experiments", "results", "smoke.csv")), false);
  assert.equal(fs.existsSync(path.join(project, "experiments", "results", "hardcoded.csv")), false);
  assert.equal(fs.existsSync(path.join(project, "experiments", "results", "jobs.csv")), false);
});

test("Debug requests cannot enter formal result, archive, delete, or PPT actions", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-debug-block-"));
  fs.mkdirSync(path.join(project, "work_dirs", "keep"), { recursive: true });
  fs.writeFileSync(path.join(project, "work_dirs", "keep", "result.csv"), "metric,value\nAUC,0.9\n", "utf8");
  const script = [
    "import importlib.util, json",
    `spec = importlib.util.spec_from_file_location('agent', r'${agentRuntime.replace(/\\/g, "/")}')`,
    "agent = importlib.util.module_from_spec(spec)",
    "spec.loader.exec_module(agent)",
    `root = r'${project.replace(/\\/g, "/")}'`,
    "actions = ['archive-artifacts', 'delete-artifacts', 'parse-results', 'run-statistics', 'export-plotting-contract']",
    "out = {}",
    "for action in actions:",
    "    payload = {'debugMode': True, 'selectedArchiveKeys': ['work_dirs/keep'], 'planFile': 'experiments/plans/smoke.yaml'}",
    "    out[action] = agent.handle_action(root, action, payload, 'op-' + action, 'op-' + action)",
    "print(json.dumps(out, ensure_ascii=False))",
  ].join("\n");
  const result = spawnSync("python", ["-c", script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
  for (const action of Object.keys(payload)) {
    assert.equal(payload[action].status, "failed", `${action}: ${JSON.stringify(payload[action])}`);
    assert.match(payload[action].message, /Debug/);
  }
  assert.equal(fs.existsSync(path.join(project, "work_dirs", "keep", "result.csv")), true);
});

test("first-run mode guidance recommends Debug without changing the formal default", () => {
  assert.match(panelSource, /function runModeGuidance\(state\)/);
  assert.match(panelSource, /function syncRunModeActionLabels\(root\)/);
  assert.match(panelSource, /runModeActionLabel\(runMode, button\.dataset\.formalRunLabel\)/);
  assert.match(panelSource, /data-force-formal="true"/);
  assert.match(panelSource, /首次运行建议先选择 Debug：只提交首个任务/);
  assert.match(panelSource, /Debug 已完成；先复核任务与日志，再正式运行完整 Plan/);
  assert.match(panelSource, /refreshRunModeNote\(state\)/);
  assert.match(panelSource, /refreshRunModeUi\(\)[\s\S]{0,900}renderSectionIfVisible\(state, "overview", \{ force: true \}\)/);
  assert.match(panelSource, /button\[data-command="archivePlan"\][\s\S]{0,500}debugModeDisableReason\("archivePlan"\)/);
  assert.match(panelSource, /function renderArchivedPlanCard\(plan\)[\s\S]{0,1800}debugModeDisableReason\("restoreArchivedPlan"\)/);
  assert.match(panelSource, /restoreDisabled = restoreReason \? " disabled" : ""/);
  assert.match(panelSource, /const debugReason = debugModeDisableReason\("plotResultsToPpt"\)/);
  assert.match(panelSource, /function refreshPptPlotConfigDebugState\(state\)/);
  assert.match(panelSource, /function pptPlotButton\(label, sourcePath, sourceLabel, extra\)[\s\S]{0,900}debugModeDisableReason\("plotResultsToPpt"\)/);
  assert.match(panelSource, /\["validatePlan", "dryRunPlan", "runPlan", "runAllPlans"\]/);
  assert.match(panelSource, /function resultAwaitRunNextAction\(stage\)[\s\S]{0,1100}disableReason\(state, "parseResults", \{ planFile \}\)/);
  assert.match(panelSource, /function resultEvidenceWorkbenchCacheKeyFor\(summary, traceStats, outputContractCheck, analysisArtifacts, autoParseReadiness\)[\s\S]{0,260}runMode:/);
  assert.match(panelSource, /runMode = normalizeRunMode\(restoredWebviewState\.runMode\)/);
  assert.match(panelSource, /return String\(value \|\| "formal"\) === "debug" \? "debug" : "formal"/);
  assert.match(panelSource, /persistWebviewState\(\{ runMode \}\)/);
  assert.match(panelSource, /function runModeForButton\(button, command, fallbackMode\)/);
});

test("run buttons keep clear labels and submit their explicit mode", () => {
  assert.equal(runModeActionLabel("formal", "校验并提交运行"), "校验并提交运行");
  assert.equal(runModeActionLabel("debug", "校验并提交运行"), "Debug 运行");
  assert.equal(runModeActionLabel("formal", "重新提交"), "重新提交");
  assert.equal(runModeForButton({ debugMode: "true" }, "runPlan", "formal"), true);
  assert.equal(runModeForButton({ debugMode: "false" }, "runPlan", "debug"), false);
  assert.equal(runModeForButton({ forceFormal: "true", debugMode: "true" }, "runPlan", "debug"), false);
  assert.equal(runModeForButton({}, "validatePlan", "debug"), true);
  assert.match(panelSource, /function renderProjectFirstRunActions\(show, planFile\)/);
  assert.match(panelSource, /data-command="runPlan" data-debug-mode="true" data-confirm="true"/);
  assert.match(panelSource, /data-command="runPlan" data-debug-mode="false" data-confirm="true"/);
  assert.match(panelSource, /建议 Debug 首跑/);
});

test("Debug completion skips the formal automatic result pipeline", () => {
  assert.match(schedulerSource, /if bool\(payload\.get\("debugMode"\) or event\.get\("debugMode"\)\):\s*return/);
  assert.match(agentSource, /if event_is_debug_run\(event\):\s*return \[\]/);
});

test("Formal result discovery excludes debug_runs files", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-debug-discovery-"));
  fs.mkdirSync(path.join(project, "results"), { recursive: true });
  fs.mkdirSync(path.join(project, "zlk_cluster", "debug_runs", "plan", "run", "artifacts"), { recursive: true });
  fs.writeFileSync(path.join(project, "results", "formal.csv"), "metric,value\nAUC,0.9\n", "utf8");
  fs.writeFileSync(path.join(project, "zlk_cluster", "debug_runs", "plan", "run", "artifacts", "results.csv"), "metric,value\nAUC,0.1\n", "utf8");
  const script = [
    "import importlib.util, json",
    `spec = importlib.util.spec_from_file_location('agent', r'${agentRuntime.replace(/\\/g, "/")}')`,
    "agent = importlib.util.module_from_spec(spec)",
    "spec.loader.exec_module(agent)",
    `print(json.dumps(agent.discover_result_files(r'${project.replace(/\\/g, "/")}')))`
  ].join("\n");
  const result = spawnSync("python", ["-c", script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const files = JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(files.includes("results/formal.csv"), true);
  assert.equal(files.some((item) => item.includes("debug_runs")), false);
});
