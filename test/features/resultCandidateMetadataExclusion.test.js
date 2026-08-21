const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const PlanBuilder = require("../../dist/features/PlanBuilder.js");
const Templates = require("../../dist/templates/ProjectAdapterTemplates.js");

function metadataPlan(extraResults = []) {
  return [
    "suite: metadata_only",
    "mode: test",
    "base_config: configs/base.yaml",
    "seeds: [0]",
    "runner:",
    "  test_command: python test.py",
    "cases:",
    "  - case: smoke",
    "    expectedResults:",
    "      - work_dirs/metadata_only/status.json",
    "      - work_dirs/metadata_only/artifact_manifest.json",
    "      - experiments/results/jobs.csv",
    ...extraResults.map((item) => `      - ${item}`),
  ].join("\n");
}

function extractAgent(source) {
  const start = source.indexOf("#!/usr/bin/env python3");
  const end = source.lastIndexOf("`;");
  assert.ok(start >= 0 && end > start);
  return source.slice(start, end);
}

test("Plan evidence rejects metadata-only outputs and keeps real result candidates", () => {
  const metadata = PlanBuilder.parsePlanOutputEvidence(metadataPlan());
  assert.deepEqual(metadata.evidenceCandidates, []);
  assert.deepEqual(metadata.outputCandidates, []);
  assert.deepEqual(metadata.outputSignals, []);
  assert.equal(PlanBuilder.validateDeepLearningPlanContract(metadataPlan()).ok, false);

  const mixed = PlanBuilder.parsePlanOutputEvidence(metadataPlan(["work_dirs/metadata_only/metrics.json"]));
  assert.deepEqual(mixed.evidenceCandidates, ["work_dirs/metadata_only/metrics.json"]);
  assert.deepEqual(mixed.outputCandidates, ["work_dirs/metadata_only/metrics.json"]);
  assert.ok(mixed.outputSignals.some((item) => item.includes("metrics.json")));
});

test("new-project scanners and generated adapter rules do not advertise metadata as results", () => {
  const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
  const start = extension.indexOf("function resultCandidateFile(name)");
  const end = extension.indexOf("\nfunction isHeavyProjectDir", start);
  assert.ok(start >= 0 && end > start);
  const resultCandidateFile = new Function(extension.slice(start, end) + "; return resultCandidateFile;")();
  assert.equal(resultCandidateFile("metrics.json"), true);
  assert.equal(resultCandidateFile("summary.txt"), true);
  assert.equal(resultCandidateFile("status.json"), false);
  assert.equal(resultCandidateFile("artifact_manifest.json"), false);
  assert.equal(resultCandidateFile("jobs.csv"), false);
  assert.match(panel, /已忽略非结果候选/);

  const writer = Templates.outputAdapterTemplate("demo");
  const jsonBlock = writer.match(/JSON_CANDIDATES = \[[\s\S]*?\n\]/)?.[0] || "";
  const onboarding = Templates.projectOnboardingConfigTemplate("demo");
  const candidateBlock = onboarding.match(/  candidateJson:\n[\s\S]*?\n  csvColumnMapping:/)?.[0] || "";
  assert.ok(jsonBlock.includes('"metrics.json"'));
  assert.ok(candidateBlock.includes("metrics.json"));
  for (const block of [jsonBlock, candidateBlock]) {
    assert.doesNotMatch(block, /status\.json/);
    assert.doesNotMatch(block, /artifact_manifest\.json/);
  }
});

test("Hub Agent output gate and adapter policy reject metadata-only candidates", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-metadata-candidate-"));
  const root = path.join(tmp, "project");
  fs.mkdirSync(path.join(root, "experiments", "plans"), { recursive: true });
  fs.writeFileSync(path.join(root, "experiments", "plans", "metadata.yaml"), metadataPlan(), "utf8");
  fs.writeFileSync(path.join(root, "experiments", "simple_project.yaml"), [
    "outputs:",
    "  candidateJson:",
    "    - work_dirs/metadata_only/status.json",
    "    - work_dirs/metadata_only/artifact_manifest.json",
  ].join("\n"), "utf8");

  const source = fs.readFileSync(path.join(__dirname, "../../src/clusterAgentRuntime.ts"), "utf8");
  const agentPath = path.join(tmp, "cluster_agent.py");
  fs.writeFileSync(agentPath, extractAgent(source), "utf8");
  const script = path.join(tmp, "check.py");
  fs.writeFileSync(script, [
    "import importlib.util, json",
    `spec = importlib.util.spec_from_file_location('agent', ${JSON.stringify(agentPath)})`,
    "agent = importlib.util.module_from_spec(spec)",
    "spec.loader.exec_module(agent)",
    `root = ${JSON.stringify(root)}`,
    "plan = 'experiments/plans/metadata.yaml'",
    "policy = agent.read_project_metric_policy(root)",
    "print(json.dumps({",
    "  'gate': agent.plan_output_capture_evidence(root, plan),",
    "  'declared': agent.plan_declared_result_candidates(root, plan),",
    "  'policy': agent.policy_explicit_result_candidates(policy),",
    "  'status': agent.parseable_result_candidate('work_dirs/metadata_only/status.json'),",
    "  'manifest': agent.parseable_result_candidate('work_dirs/metadata_only/artifact_manifest.json'),",
    "  'internal': agent.parseable_result_candidate('simple_cluster/results/by_plan/metadata/statistics.json'),",
    "}))",
  ].join("\n"), "utf8");
  const result = spawnSync("python", [script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse((result.stdout || "").trim().split(/\r?\n/).pop());
  assert.equal(payload.gate.ok, false);
  assert.deepEqual(payload.gate.expectedResults, []);
  assert.deepEqual(payload.declared, []);
  assert.deepEqual(payload.policy, []);
  assert.equal(payload.status, "");
  assert.equal(payload.manifest, "");
  assert.equal(payload.internal, "");
});
