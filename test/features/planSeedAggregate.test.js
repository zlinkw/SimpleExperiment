const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

test("Plan summary uses declared raw CSV, computes sample SD, and marks missing seeds", () => {
  const source = readSource("src/clusterAgentRuntime.ts");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "simple-plan-aggregate-"));
  const agentPath = path.join(tmp, "cluster_agent.py");
  fs.writeFileSync(agentPath, source.slice(source.indexOf("#!/usr/bin/env python3"), source.lastIndexOf("`;")), "utf8");
  const root = path.join(tmp, "project");
  fs.mkdirSync(path.join(root, "experiments", "plans"), { recursive: true });
  fs.mkdirSync(path.join(root, "experiments", "results"), { recursive: true });
  fs.writeFileSync(path.join(root, "experiments", "plans", "demo.yaml"), "suite: demo\nseeds: [1, 2, 3, 4, 5]\nnaming:\n  sweep_dir: work_dirs/demo\npaper:\n  result_csv: experiments/results/raw.csv\ncases:\n  - case: alpha\n  - case: beta\n", "utf8");
  for (const job of ["0_alpha_seed1", "0_foreign_seed1", "0_alpha_seed9"]) {
    const dir = path.join(root, "work_dirs", "demo", job);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "stdout.log"), job + "\n", "utf8");
  }
  fs.writeFileSync(path.join(root, "experiments", "results", "raw.csv"), [
    "case,seed,split,accuracy,loss",
    "alpha,1,test,0.8,0.2",
    "alpha,2,test,0.9,0.1",
    "alpha,3,test,0.7,0.3",
    "alpha,4,test,0.8,0.2",
    "alpha,4,test,1.0,0.0",
    "beta,1,test,0.6,0.4",
    "foreign,1,test,0.1,0.9",
  ].join("\n") + "\n", "utf8");
  const script = path.join(tmp, "check.py");
  fs.writeFileSync(script, [
    "import importlib.util, json, csv",
    `spec = importlib.util.spec_from_file_location('agent', ${JSON.stringify(agentPath)})`,
    "agent = importlib.util.module_from_spec(spec)",
    "spec.loader.exec_module(agent)",
    `root = ${JSON.stringify(root)}`,
    "summary = agent.parse_results_action(root, plan='experiments/plans/demo.yaml')",
    "rows = list(csv.DictReader(open(agent.safe_project_path(root, summary['aggregateCsvPath']), encoding='utf-8'))) if summary.get('aggregateCsvPath') else []",
    "archive = agent.archive_plan_copy_action(root, 'experiments/plans/demo.yaml', 'fixture')",
    "archive_manifest = json.load(open(agent.safe_project_path(root, archive['manifestPath']), encoding='utf-8'))",
    "archived_raw = next(item['path'] for item in archive_manifest['files'] if item['source'] == 'experiments/results/raw.csv')",
    "archived_rows = list(csv.DictReader(open(agent.safe_project_path(root, archived_raw), encoding='utf-8')))",
    "open(agent.safe_project_path(root, 'experiments/simple_project.yaml'), 'w', encoding='utf-8').write('outputs:\\n  csvColumnMapping:\\n    case: specimen\\n    seed: rng\\n')",
    "open(agent.safe_project_path(root, 'experiments/plans/mapped.yaml'), 'w', encoding='utf-8').write('suite: mapped\\nseeds: [1, 2]\\npaper:\\n  result_csv: experiments/results/mapped.csv\\ncases:\\n  - case: alpha\\n')",
    "open(agent.safe_project_path(root, 'experiments/results/mapped.csv'), 'w', encoding='utf-8').write('specimen,rng,accuracy\\nalpha,1,0.7\\nalpha,2,0.9\\n')",
    "mapped = agent.parse_results_action(root, plan='experiments/plans/mapped.yaml')",
    "open(agent.safe_project_path(root, 'experiments/plans/missing.yaml'), 'w', encoding='utf-8').write('suite: missing\\nseeds: [1, 2]\\npaper:\\n  result_csv: experiments/results/missing.csv\\ncases:\\n  - case: alpha\\n')",
    "open(agent.safe_project_path(root, 'experiments/results/missing.csv'), 'w', encoding='utf-8').write('case,accuracy\\nalpha,0.7\\n')",
    "missing = agent.parse_results_action(root, plan='experiments/plans/missing.yaml')",
    "print(json.dumps({'status': summary.get('aggregateStatus'), 'raw': summary.get('rawResultCsvPath'), 'rows': rows, 'incomplete': summary.get('aggregateIncompleteCount'), 'archivedRows': archived_rows, 'archive': archive['archivePath'], 'archiveSources': [item['source'] for item in archive_manifest['files']], 'mappedStatus': mapped.get('aggregateStatus'), 'mappedMetrics': mapped.get('metrics'), 'missingStatus': missing.get('aggregateStatus')}))",
  ].join("\n"), "utf8");
  const result = spawnSync("python", [script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout.trim().split(/\r?\n/).pop());
  assert.equal(payload.status, "ready", JSON.stringify(payload));
  assert.equal(payload.raw, "experiments/results/raw.csv");
  assert.equal(payload.rows.length, 2);
  assert.equal(payload.incomplete, 2);
  const alpha = payload.rows.find((row) => row.case === "alpha");
  assert.equal(alpha.accuracy_n, "4");
  assert.equal(alpha.accuracy_coverage, "4/5");
  assert.equal(Number(alpha.accuracy_mean), 0.85);
  assert.ok(Math.abs(Number(alpha.accuracy_std) - Math.sqrt(0.05 / 3)) < 1e-10);
  const beta = payload.rows.find((row) => row.case === "beta");
  assert.equal(beta.accuracy_n, "1");
  assert.equal(beta.accuracy_std, "");
  assert.equal(payload.archivedRows.length, 6);
  assert.equal(payload.archivedRows.some((row) => row.case === "foreign"), false);
  assert.match(payload.archive, /^archives\/demo\/fixture$/);
  assert.ok(payload.archiveSources.includes("work_dirs/demo/0_alpha_seed1/stdout.log"));
  assert.equal(payload.archiveSources.some((item) => item.includes("foreign") || item.includes("seed9")), false);
  assert.equal(payload.mappedStatus, "ready");
  assert.equal(payload.mappedMetrics.includes("rng"), false);
  assert.equal(payload.missingStatus, "mapping_required");
});

test("single Worker summary keeps file links and multi Worker summary keeps ownership", () => {
  const { mergeWorkerResultsSummaries } = require("../../dist/tunnel/MultiEndpointRealtimeClient");
  const planFile = "experiments/plans/demo.yaml";
  const first = { planFile, results: [], rawResultCsvPath: "experiments/results/raw.csv", aggregateCsvPath: "simple_cluster/results/by_plan/demo/seed_mean_std.csv", aggregateStatus: "ready" };
  const single = mergeWorkerResultsSummaries([{ workerId: "NWPU3", summary: first }], planFile, ["NWPU3"]);
  assert.equal(single.aggregateStatus, "ready");
  assert.equal(single.rawResultCsvPath, first.rawResultCsvPath);
  assert.equal(single.resultOwnerWorkerId, "NWPU3");
  const both = mergeWorkerResultsSummaries([{ workerId: "NWPU3", summary: first }, { workerId: "NWPU4", summary: first }], planFile, ["NWPU3", "NWPU4"]);
  assert.equal(both.workerResultTables.length, 2);
  assert.equal(both.rawResultCsvPath, undefined);
});

test("Worker result download uses its own tunnel", async () => {
  const { MultiEndpointRealtimeClient } = require("../../dist/tunnel/MultiEndpointRealtimeClient");
  const client = Object.create(MultiEndpointRealtimeClient.prototype);
  const calls = [];
  client.endpointById = new Map([["NWPU3", { role: "worker" }], ["hub", { role: "hub" }]]);
  client.clients = new Map([["NWPU3", {
    downloadFile: async (...args) => { calls.push(args); return { status: "completed" }; },
    postAction: async (...args) => { calls.push(args); return { status: "completed" }; },
  }]]);
  client.updateMergedState = () => undefined;
  await client.downloadWorkerFile("NWPU3", "archives/a.csv", "C:/tmp/a.csv", { maxBytes: 10 });
  assert.deepEqual(calls, [["archives/a.csv", "C:/tmp/a.csv", { maxBytes: 10 }]]);
  await client.postWorkerAction("NWPU3", "archive-plan-copy", { options: { topologyMode: "single_worker", resultOwnerWorkerId: "NWPU3", automaticBackup: false } });
  assert.equal(calls[1][0], "archive-plan-copy");
  await assert.rejects(() => client.downloadWorkerFile("hub", "a", "b"), /Worker Agent endpoint not configured/);
});

test("copy archive confirms exact targets and verifies the local Worker copy", async () => {
  const source = readSource("src/extension.ts");
  const start = source.indexOf("    async archivePlanCopyFromUi(message) {");
  const end = source.indexOf("    async archivePlanFromUi(message) {", start);
  assert.ok(start >= 0 && end > start);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-archive-copy-"));
  const planFile = "experiments/plans/demo.yaml";
  const planBytes = Buffer.from("suite: demo\n", "utf8");
  const digest = crypto.createHash("sha256").update(planBytes).digest("hex");
  let confirmed = "";
  const client = {
    postWorkerAction: async (_workerId, action, body) => {
      assert.equal(action, "archive-plan-copy");
      assert.deepEqual(JSON.parse(JSON.stringify(body.options)), { topologyMode: "single_worker", resultOwnerWorkerId: "NWPU3", automaticBackup: false });
      const archivePath = `archives/demo/${body.snapshotName}`;
      return { status: "completed", archivePath, files: [`${archivePath}/manifest.json`, `${archivePath}/files/${planFile}`] };
    },
    downloadWorkerFile: async (_workerId, remoteFile, localFile) => {
      if (remoteFile.endsWith("/manifest.json")) {
        const archivePath = remoteFile.slice(0, -"/manifest.json".length);
        await fs.promises.writeFile(localFile, JSON.stringify({ planFile, files: [{ path: `${archivePath}/files/${planFile}`, sha256: digest }] }), "utf8");
      } else {
        await fs.promises.writeFile(localFile, planBytes);
      }
    },
  };
  const child = (base, relative) => {
    const full = path.resolve(base, relative);
    if (!full.startsWith(path.resolve(base) + path.sep)) throw new Error("outside archive");
    return full;
  };
  const context = {
    fs: fs.promises, path, crypto,
    vscode: { window: { showWarningMessage: async (message) => { confirmed = message; return "确认复制归档"; }, showInformationMessage: () => undefined } },
    stringField: (value, key) => String(value?.[key] || ""),
    makeOpId: () => "archive-test",
    remoteActionPendingStatus: () => false,
    resultStatus: (value) => value?.status,
    stringFromRecord: (value, fields) => fields.map((field) => value?.[field]).find(Boolean),
    safeWorkspaceChildPath: child,
    safeArchiveBundleChildPath: child,
    safePlanToken: (value) => value,
    sha256File: async (file) => crypto.createHash("sha256").update(await fs.promises.readFile(file)).digest("hex"),
    UiCommandCancelled: class extends Error {},
  };
  const method = vm.runInNewContext(`({${source.slice(start, end)}}).archivePlanCopyFromUi`, context);
  const host = {
    client, planFileInput: planFile, selectedPlanId: planFile,
    resultsSummary: { aggregateStatus: "ready", availableWorkerIds: ["NWPU3"] },
    setupConfig: {},
    captureProjectContext: () => ({ root }),
    resolveSelectedPlanFile: (value) => value,
    filterResultsSummaryForPlan: (value) => value,
    enabledWorkerConfigs: () => [{ id: "NWPU3", remotePath: "/data/qgking/zlk" }],
    missingWorkerActionCapabilities: () => [],
    agentRuntimeDirs: () => ({ workDir: "/data/qgking/zlk/MultiModal" }),
    projectContextIsCurrent: () => true,
  };
  await method.call(host, { planFile });
  assert.match(confirmed, /NWPU3：\/data\/qgking\/zlk\/MultiModal\/archives\/demo\//);
  const archiveParent = path.join(root, "archives", "demo");
  const [snapshot] = fs.readdirSync(archiveParent);
  const copied = path.join(archiveParent, snapshot, "NWPU3", "files", ...planFile.split("/"));
  assert.equal(fs.readFileSync(copied, "utf8"), "suite: demo\n");
});
