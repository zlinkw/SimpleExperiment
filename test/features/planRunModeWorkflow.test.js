const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const PlanBuilder = require("../../dist/features/PlanBuilder.js");
const PlanArchive = require("../../dist/features/PlanArchive.js");

const root = path.join(__dirname, "../..");
const schedulerRuntime = path.join(root, "dist/runtime/cluster_scheduler.py");
const agentRuntime = path.join(root, "dist/runtime/cluster_agent.py");
const schedulerSource = fs.readFileSync(path.join(root, "src/clusterSchedulerRuntime.ts"), "utf8");
const agentSource = fs.readFileSync(path.join(root, "src/clusterAgentRuntime.ts"), "utf8");
const extensionSource = fs.readFileSync(path.join(root, "src/extension.ts"), "utf8");
const panelSource = fs.readFileSync(path.join(root, "src/ui/PanelHtml.ts"), "utf8");

function planText(mode, commands, result = "experiments/results/smoke.csv") {
  return [
    "suite: smoke",
    `mode: ${mode}`,
    "base_config: configs/base.yaml",
    "seeds: [0]",
    "paper:",
    `  result_csv: ${result}`,
    "runner:",
    ...commands.map((command) => `  ${command}`),
    "naming:",
    "  sweep_dir: work_dirs/{suite}",
    "  job_name: '{index}_{case}_seed{seed}'",
    "cases:",
    "  - case: baseline",
    "    overrides: {}",
    "",
  ].join("\n");
}

test("Plan contract requires only commands used by the selected mode", () => {
  const train = PlanBuilder.validateDeepLearningPlanContract(planText("train", [
    "train_command: python train.py --result-csv experiments/results/smoke.csv",
  ]));
  assert.equal(train.ok, true, JSON.stringify(train.issues));
  assert.equal(train.summary.mode, "train");
  assert.equal(train.summary.testCommand, "");

  const evaluate = PlanBuilder.validateDeepLearningPlanContract(planText("test", [
    "test_command: python eval.py --result-csv experiments/results/smoke.csv",
  ]));
  assert.equal(evaluate.ok, true, JSON.stringify(evaluate.issues));
  assert.equal(evaluate.summary.mode, "test");
  assert.equal(evaluate.summary.trainCommand, "");

  const combined = PlanBuilder.validateDeepLearningPlanContract(planText("train_test", [
    "train_command: python train.py",
  ]));
  assert.equal(combined.ok, false);
  assert.ok(combined.issues.some((issue) => issue.field === "test_command"));

  const invalid = PlanBuilder.validateDeepLearningPlanContract(planText("predict", [
    "train_command: python train.py",
    "test_command: python eval.py",
  ]));
  assert.equal(invalid.ok, false);
  assert.ok(invalid.issues.some((issue) => issue.field === "mode"));
});

test("mode-specific output evidence ignores an unused command", () => {
  const yaml = [
    "suite: smoke",
    "mode: train",
    "base_config: configs/base.yaml",
    "seeds: [0]",
    "runner:",
    "  train_command: python train.py",
    "  test_command: python missing_eval.py --result-csv work_dirs/stale.csv",
    "cases:",
    "  - case: baseline",
  ].join("\n");
  const contract = PlanBuilder.validateDeepLearningPlanContract(yaml);
  assert.equal(contract.ok, false);
  assert.ok(contract.issues.some((issue) => issue.field === "result_output"), JSON.stringify(contract));
  assert.equal(contract.outputCandidates.includes("work_dirs/stale.csv"), false);
});

test("mode-specific local config references ignore an unused command", () => {
  const yaml = [
    "base_config: configs/base.yaml",
    "runner:",
    "  train_command: python train.py --config configs/train.yaml",
    "  test_command: python eval.py --config configs/test.yaml",
  ].join("\n");
  assert.deepEqual(PlanArchive.planRuntimeConfigReferences(yaml, "train"), ["configs/base.yaml", "configs/train.yaml"]);
  assert.deepEqual(PlanArchive.planRuntimeConfigReferences(yaml, "test"), ["configs/base.yaml", "configs/test.yaml"]);
  assert.deepEqual(PlanArchive.planStaticConfigReferences(yaml), ["configs/base.yaml", "configs/train.yaml", "configs/test.yaml"]);
});

test("Hub output gate and Worker retry derive the same Plan mode", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-agent-mode-"));
  fs.mkdirSync(path.join(project, "experiments", "plans"), { recursive: true });
  const relative = "experiments/plans/train.yaml";
  fs.writeFileSync(path.join(project, ...relative.split("/")), [
    "suite: smoke",
    "mode: train",
    "base_config: configs/base.yaml",
    "seeds: [0]",
    "runner:",
    "  train_command: python train.py",
    "  test_command: python stale_eval.py --result-csv work_dirs/metrics_summary.csv",
    "cases:",
    "  - case: baseline",
  ].join("\n"), "utf8");
  const py = [
    "import json, sys",
    `sys.path.insert(0, r'${path.dirname(agentRuntime).replace(/\\/g, "/")}')`,
    "import cluster_agent as agent",
    `root = r'${project.replace(/\\/g, "/")}'`,
    `plan = '${relative}'`,
    "print(json.dumps({'mode': agent.worker_command_plan_mode(root, plan), 'gate': agent.plan_output_capture_evidence(root, plan)}))",
  ].join("; ");
  const proc = spawnSync("python", ["-c", py], { encoding: "utf8" });
  assert.equal(proc.status, 0, proc.stderr || proc.stdout);
  const payload = JSON.parse(proc.stdout.trim().split(/\r?\n/).at(-1));
  assert.equal(payload.mode, "train");
  assert.equal(payload.gate.ok, false, JSON.stringify(payload.gate));
  assert.equal(payload.gate.expectedResults.includes("work_dirs/metrics_summary.csv"), false);
});

test("scheduler derives train-only and test-only execution from Plan", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-plan-mode-"));
  fs.mkdirSync(path.join(project, "configs"), { recursive: true });
  fs.mkdirSync(path.join(project, "experiments", "zlk_adapter"), { recursive: true });
  fs.mkdirSync(path.join(project, "experiments", "plans"), { recursive: true });
  fs.writeFileSync(path.join(project, "configs", "base.yaml"), "{}\n", "utf8");
  fs.writeFileSync(path.join(project, "experiments", "zlk_project.yaml"), [
    "adapter:",
    "  runWrapper: experiments/zlk_adapter/run_wrapper.py",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(project, "experiments", "zlk_adapter", "run_wrapper.py"), [
    "import argparse",
    "import json",
    "import subprocess",
    "from pathlib import Path",
    "",
    "parser = argparse.ArgumentParser()",
    "parser.add_argument('--output-dir', required=True)",
    "parser.add_argument('--context-json', default='{}')",
    "parser.add_argument('command', nargs=argparse.REMAINDER)",
    "args = parser.parse_args()",
    "command = args.command[1:] if args.command[:1] == ['--'] else args.command",
    "output = Path(args.output_dir)",
    "output.mkdir(parents=True, exist_ok=True)",
    "result = subprocess.run(command)",
    "(output / 'stdout.log').write_text('', encoding='utf-8')",
    "(output / 'config_snapshot.yaml').write_text('seed: 0\\n', encoding='utf-8')",
    "(output / 'env_snapshot.json').write_text('{}\\n', encoding='utf-8')",
    "raise SystemExit(result.returncode)",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(project, "train_stage.py"), "from pathlib import Path\nPath('train.marker').write_text('train', encoding='utf-8')\n", "utf8");
  fs.writeFileSync(path.join(project, "test_stage.py"), "from pathlib import Path\nPath('test.marker').write_text('test', encoding='utf-8')\n", "utf8");
  const trainPlan = path.join(project, "experiments", "plans", "train.yaml");
  const testPlan = path.join(project, "experiments", "plans", "test.yaml");
  fs.writeFileSync(trainPlan, planText("train", ["train_command: python train_stage.py"]), "utf8");
  fs.writeFileSync(testPlan, planText("test", ["test_command: python test_stage.py"]), "utf8");

  const validateTrain = spawnSync("python", [schedulerRuntime, "--validate-plan", "--plan", trainPlan], { cwd: project, encoding: "utf8" });
  assert.equal(validateTrain.status, 0, validateTrain.stderr || validateTrain.stdout);
  assert.equal(JSON.parse(validateTrain.stdout).execution_mode, "train");
  const runTrain = spawnSync("python", [schedulerRuntime, "--run-job", "--plan", trainPlan, "--only-index", "0"], { cwd: project, encoding: "utf8" });
  assert.equal(runTrain.status, 0, runTrain.stderr || runTrain.stdout);
  assert.equal(fs.existsSync(path.join(project, "train.marker")), true);
  assert.equal(fs.existsSync(path.join(project, "test.marker")), false);

  fs.rmSync(path.join(project, "train.marker"));
  const validateTest = spawnSync("python", [schedulerRuntime, "--validate-plan", "--plan", testPlan], { cwd: project, encoding: "utf8" });
  assert.equal(validateTest.status, 0, validateTest.stderr || validateTest.stdout);
  assert.equal(JSON.parse(validateTest.stdout).execution_mode, "test");
  const workersFile = path.join(project, "workers.json");
  fs.writeFileSync(workersFile, "[]\n", "utf8");
  const dryRunTest = spawnSync("python", [schedulerRuntime, "--dry-run-plan", "--plan", testPlan, "--workers-json", workersFile], { cwd: project, encoding: "utf8" });
  assert.equal(dryRunTest.status, 0, dryRunTest.stderr || dryRunTest.stdout);
  const dryRunPayload = JSON.parse(dryRunTest.stdout);
  assert.equal(dryRunPayload.executionMode, "test");
  assert.deepEqual(dryRunPayload.runnerWarnings, []);
  const runTest = spawnSync("python", [schedulerRuntime, "--run-job", "--plan", testPlan, "--only-index", "0"], { cwd: project, encoding: "utf8" });
  assert.equal(runTest.status, 0, runTest.stderr || runTest.stdout);
  assert.equal(fs.existsSync(path.join(project, "train.marker")), false);
  assert.equal(fs.existsSync(path.join(project, "test.marker")), true);
});

test("new-project UI and Hub/Worker chain preserve the selected mode", () => {
  assert.match(extensionSource, /title: "选择 Plan 运行模式"/);
  assert.match(extensionSource, /mode === "train" \? "train" : "test"/);
  assert.match(extensionSource, /`mode: \$\{mode\}`/);
  assert.match(extensionSource, /planRuntimeConfigReferences\(text, summary\.mode\)/);
  assert.match(panelSource, /function planModeLabel\(mode\)/);
  assert.match(panelSource, /"仅训练"/);
  assert.match(panelSource, /"仅评估"/);
  assert.match(schedulerSource, /launch_experiment\(worker, args\.plan, experiment_index, gpu_id, log_dir, execution_mode, args\.debug_mode, args\.debug_run_id, args\.debug_output_dir, args\.default_result_csv_dir\)/);
  assert.match(schedulerSource, /"mode": execution_mode/);
  assert.match(schedulerSource, /testing\[f"\{worker\['id'\]\}:\{gpu_id\}"\] = item/);
  assert.match(agentSource, /"--mode", mode/);
});
