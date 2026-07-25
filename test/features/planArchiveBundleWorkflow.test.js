const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const PlanArchive = require("../../dist/features/PlanArchive.js");
const { isSafeRemotePath } = require("../../src/tunnel/FileTransferTypes.ts");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

function extractFunction(name) {
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

function loadPlanArchiveGate() {
  const sandbox = {
    uniqueStrings: (values) => [...new Set(values.filter(Boolean))],
    usableSelectionKey: (value) => String(value || "").trim(),
    objectRecord: (value) => value && typeof value === "object" && !Array.isArray(value) ? value : undefined,
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("normalizePlanSelectionKey"),
    extractFunction("planFileEquivalenceKeys"),
    extractFunction("samePlanSelection"),
    extractFunction("resultRecordPlanFile"),
    extractFunction("planArchiveGateFromResults"),
    "this.gate = planArchiveGateFromResults;",
  ].join("\n"), sandbox);
  return sandbox.gate;
}

test("plan archive creates a reusable bundle from archived-only effective results", () => {
  assert.match(source, /async archivePlanFromUi\(message\)/);
  assert.match(source, /await this\.refreshResultsSummary\(file\)/);
  assert.match(source, /planArchiveGateFromResults\(resultSummary, file\)/);
  assert.match(source, /path\.join\(stagingDir, "plan\.yaml"\)/);
  assert.match(source, /copyPlanArchiveFiles\(root, stagingDir, "configs", configFiles\)/);
  assert.match(source, /const environmentFiles = await detectEnvironmentFiles\(root\)/);
  assert.match(source, /copyPlanArchiveFiles\(root, stagingDir, "environment", environmentFiles\)/);
  assert.match(source, /const parameterSnapshot = await planArchiveParameterSnapshot\(root, planText\)/);
  assert.match(source, /pythonLocalImportReferences\(source, file\)/);
  assert.match(source, /static_recursive_local_source_scan_no_import_or_execution/);
  assert.match(source, /sourceScanWarnings: parameterSnapshot\.sourceScanWarnings/);
  assert.match(source, /`参数：\$\{parameterSnapshot\.entries\.length\} 个源码/);
  assert.match(source, /copyPlanArchiveFiles\(root, stagingDir, path\.join\("parameters", "entries"\), parameterSnapshot\.entryScripts\)/);
  assert.match(source, /"parameters", "cli_parameters\.json"/);
  assert.match(source, /parameters: \{/);
  assert.match(source, /const evidencePlan = planArchiveEvidencePlan\(resultSummary, file\)/);
  assert.match(source, /showWarningMessage\(\[\s*"【Plan 归档位置确认】"/);
  assert.match(source, /`归档包位置：\$\{bundleRelative\}`/);
  assert.match(source, /`结果证据来源：\$\{evidenceMode === "hub_download"/);
  assert.match(source, /materializePlanArchiveEvidenceFiles\(this\.client, root, stagingDir, evidenceFiles, evidenceMode\)/);
  assert.match(source, /environment,/);
  assert.match(source, /planArchiveConfigMigration\(root, planDir, source, configFiles\)/);
  assert.match(source, /planArchiveMovableEvidenceFiles\(evidenceFiles\)/);
  assert.match(source, /configArchive: \{ migrated: configMigration\.migrated, retainedShared: configMigration\.retainedShared \}/);
  assert.match(source, /await removeArchivedWorkspaceFiles\(root, configMigration\.migrated\)/);
  assert.match(source, /await removeArchivedWorkspaceFiles\(root, movableEvidence\)/);
  assert.match(source, /const resultSelection = planArchiveResultSelection\(resultSummary, file\)/);
  assert.match(source, /"evidence\/result_selection\.json"/);
  assert.match(source, /schemaVersion: 5/);
  assert.match(source, /excludedResultsTotalCount: resultSelection\.notIncludedCount/);
  assert.match(source, /archiveResultSelectionFile:/);
  assert.match(source, /evidenceSource: \{/);
  assert.match(source, /remoteProjectRetained: evidenceMode === "hub_download"/);
  assert.match(source, /finalEvidenceState.*=== "archived"/);
  assert.match(source, /previewCsvPath[\s\S]*effectiveResultsCsvPath/);
  assert.match(source, /async function nextAvailableDirectory\(parent, stem\)/);
  assert.match(source, /archiveEnvironmentCount: Array\.isArray\(bundle\.environment\) \? bundle\.environment\.length : 0/);
  assert.match(source, /archiveEvidenceSourceMode: String\(bundle\.evidenceSource\?\.mode \|\| bundle\.resultArchive\?\.sourceMode \|\| ""\)/);
  assert.match(source, /archiveParameterCount: Number\(bundle\.parameters\?\.parameterCount \|\| 0\)/);
  assert.match(source, /archiveParameterReviewCount: Number\(bundle\.parameters\?\.reviewCount \|\| 0\)/);
  assert.match(source, /parserFeatureCount: parameterSnapshot\.parserFeatureCount/);
  assert.match(source, /parserDeclarationCount: parameterSnapshot\.parserDeclarationCount/);
  assert.match(source, /reviewCount: parameterReviewCount/);
});

test("plan archive evidence plan is Plan-scoped and requires preview plus effective CSV", () => {
  const sandbox = {
    FileTransferTypes_1: { isSafeRemotePath },
    uniqueStrings: (values) => [...new Set(values.filter(Boolean))],
    usableSelectionKey: (value) => String(value || "").trim(),
    objectRecord: (value) => value && typeof value === "object" && !Array.isArray(value) ? value : undefined,
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("normalizePlanSelectionKey"),
    extractFunction("planFileEquivalenceKeys"),
    extractFunction("samePlanSelection"),
    extractFunction("normalizePlanArchiveEvidencePath"),
    extractFunction("planArchiveEvidencePlan"),
    "this.plan = planArchiveEvidencePlan;",
  ].join("\n"), sandbox);
  const summary = {
    planFile: "experiments/plans/smoke.yaml",
    previewCsvPath: "zlk_cluster/results/by_plan/smoke/results_preview_all.csv",
    effectiveResultsCsvPath: "zlk_cluster/results/by_plan/smoke/results_effective_archived.csv",
    statisticsPath: "zlk_cluster/results/by_plan/smoke/statistics.json",
    paperTablePath: "zlk_cluster/results/by_plan/smoke/paper_table.md",
    plottingContractPath: "zlk_cluster/results/by_plan/smoke/plotting_contract.json",
  };
  const ready = sandbox.plan(summary, "experiments/plans/smoke.yaml");
  assert.deepEqual(Array.from(ready.files), [
    "zlk_cluster/results/by_plan/smoke/statistics.json",
    "zlk_cluster/results/by_plan/smoke/paper_table.md",
    "zlk_cluster/results/by_plan/smoke/plotting_contract.json",
    "zlk_cluster/results/by_plan/smoke/results_preview_all.csv",
    "zlk_cluster/results/by_plan/smoke/results_effective_archived.csv",
  ]);
  assert.deepEqual(Array.from(ready.missingRequired), []);
  assert.deepEqual(Array.from(ready.invalid), []);
  const missing = sandbox.plan({ planFile: summary.planFile, previewCsvPath: summary.previewCsvPath }, summary.planFile);
  assert.deepEqual(Array.from(missing.missingRequired), ["有效结果 CSV"]);
  const stale = sandbox.plan(summary, "experiments/plans/other.yaml");
  assert.deepEqual(Array.from(stale.missingRequired), ["当前 Plan 结果摘要"]);
  const invalid = sandbox.plan({ planFile: summary.planFile, previewCsvPath: "../preview.csv", effectiveResultsCsvPath: "results/model.pt" }, summary.planFile);
  assert.equal(invalid.invalid.length, 2);
});

test("Plan archive synchronizes evidence only after modal confirmation and before migration", () => {
  const archive = source.slice(source.indexOf("async archivePlanFromUi"), source.indexOf("async restoreArchivedPlanFromUi"));
  const confirmIndex = archive.indexOf("showWarningMessage");
  const materializeIndex = archive.indexOf("materializePlanArchiveEvidenceFiles");
  const unlinkPlanIndex = archive.indexOf("await fs.unlink(source)");
  assert.ok(confirmIndex >= 0 && materializeIndex > confirmIndex);
  assert.ok(unlinkPlanIndex > materializeIndex);
  assert.match(archive, /\{ modal: true \}, confirmLabel/);
  assert.match(archive, /Plan 归档已取消，未创建归档包或迁移文件/);
  assert.match(archive, /evidenceMode === "local" \? planArchiveMovableEvidenceFiles\(evidenceFiles\) : \[\]/);
  assert.match(archive, /let bundlePublished = false/);
  assert.match(archive, /restorePlanArchiveWorkspaceFiles\(root, bundleDir, source, configMigration\.migrated, movableEvidence\)/);
  assert.match(archive, /if \(workspaceRestored\) \{[\s\S]*fs\.rm\(bundleDir/);
  assert.match(archive, /恢复失败，归档副本保留在/);
  assert.match(archive, /Plan 归档失败，自动回滚不完整/);
  assert.doesNotMatch(archive, /confirmUiCommand\("归档 Plan 包"/);
  assert.doesNotMatch(extractFunction("nextAvailableDirectory"), /fs\.mkdir/);
});

test("Plan archive materializes local or Hub evidence inside the bundle", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-evidence-"));
  try {
    const relative = "zlk_cluster/results/by_plan/smoke/results_effective_archived.csv";
    const sourceFile = path.join(root, ...relative.split("/"));
    fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
    fs.writeFileSync(sourceFile, "metric,value\nAUC,0.9\n", "utf8");
    const sandbox = {
      fs: fs.promises,
      path,
      PLAN_ARCHIVE_EVIDENCE_MAX_BYTES: 4 * 1024 * 1024,
      safeWorkspaceChildPath: (workspace, file) => path.resolve(workspace, file),
      safeArchiveBundleChildPath: (bundle, file) => path.resolve(bundle, file),
    };
    vm.createContext(sandbox);
    const materializeSource = extractFunction("materializePlanArchiveEvidenceFiles").replace(/^function /, "async function ");
    vm.runInContext(materializeSource + "\nthis.materialize = materializePlanArchiveEvidenceFiles;", sandbox);
    const localBundle = path.join(root, "local_bundle");
    const localFiles = await sandbox.materialize({}, root, localBundle, [relative], "local");
    assert.deepEqual(Array.from(localFiles), [relative]);
    assert.equal(fs.readFileSync(path.join(localBundle, "evidence", ...relative.split("/")), "utf8"), "metric,value\nAUC,0.9\n");

    const calls = [];
    const remoteBundle = path.join(root, "remote_bundle");
    const client = {
      async downloadFile(remotePath, localPath, options) {
        calls.push({ remotePath, localPath, options });
        await fs.promises.writeFile(localPath, "metric,value\nAUC,0.95\n", "utf8");
      },
    };
    await sandbox.materialize(client, root, remoteBundle, [relative], "hub_download");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].remotePath, relative);
    assert.equal(calls[0].options.maxBytes, 4 * 1024 * 1024);
    assert.equal(fs.readFileSync(path.join(remoteBundle, "evidence", ...relative.split("/")), "utf8"), "metric,value\nAUC,0.95\n");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Plan archive rollback restores migrated Plan, configs, and local evidence", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-archive-rollback-"));
  try {
    const bundle = path.join(root, "bundle");
    const plan = path.join(root, "experiments", "plans", "smoke.yaml");
    const config = "configs/smoke.yaml";
    const evidence = "zlk_cluster/results/by_plan/smoke/results_effective_archived.csv";
    fs.mkdirSync(path.join(bundle, "configs", path.dirname(config)), { recursive: true });
    fs.mkdirSync(path.join(bundle, "evidence", path.dirname(evidence)), { recursive: true });
    fs.writeFileSync(path.join(bundle, "plan.yaml"), "suite: smoke\n", "utf8");
    fs.writeFileSync(path.join(bundle, "configs", config), "epochs: 3\n", "utf8");
    fs.writeFileSync(path.join(bundle, "evidence", evidence), "metric,value\nAUC,0.9\n", "utf8");
    const sandbox = {
      fs: fs.promises,
      path,
      safeWorkspaceChildPath: (workspace, file) => path.resolve(workspace, file),
      safeArchiveBundleChildPath: (bundleRoot, file) => path.resolve(bundleRoot, file),
    };
    vm.createContext(sandbox);
    const restoreSource = extractFunction("restorePlanArchiveWorkspaceFiles").replace(/^function /, "async function ");
    vm.runInContext(restoreSource + "\nthis.restore = restorePlanArchiveWorkspaceFiles;", sandbox);
    await sandbox.restore(root, bundle, plan, [config], [evidence]);
    assert.equal(fs.readFileSync(plan, "utf8"), "suite: smoke\n");
    assert.equal(fs.readFileSync(path.join(root, config), "utf8"), "epochs: 3\n");
    assert.equal(fs.readFileSync(path.join(root, evidence), "utf8"), "metric,value\nAUC,0.9\n");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("plan archive requires at least one archived effective result", () => {
  const gate = loadPlanArchiveGate();
  const planFile = "experiments/plans/demo.yaml";
  const none = gate({ results: [] }, planFile);
  assert.equal(none.ok, false);
  const excludedOnly = gate({ results: [
    { planFile, finalEvidenceState: "pending_review" },
    { planFile, finalEvidenceState: "excluded" },
    { planFile: "experiments/plans/other.yaml", finalEvidenceState: "archived" },
  ] }, planFile);
  assert.equal(excludedOnly.ok, false);
  assert.equal(excludedOnly.includedCount, 0);
  assert.equal(excludedOnly.excludedCount, 2);
  assert.match(excludedOnly.reason, /至少归档一条结果/);
  const partial = gate({ results: [
    { planFile, finalEvidenceState: "archived" },
    { planFile, finalEvidenceState: "pending_review" },
  ] }, planFile);
  assert.equal(partial.ok, true);
  assert.equal(partial.includedCount, 1);
  assert.equal(partial.excludedCount, 1);
});

test("plan archive preserves the complete Plan-scoped result selection", () => {
  const sandbox = {
    uniqueStrings: (values) => [...new Set(values.filter(Boolean))],
    usableSelectionKey: (value) => String(value || "").trim(),
    objectRecord: (value) => value && typeof value === "object" && !Array.isArray(value) ? value : undefined,
    Date,
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("normalizePlanSelectionKey"),
    extractFunction("planFileEquivalenceKeys"),
    extractFunction("samePlanSelection"),
    extractFunction("resultRecordPlanFile"),
    extractFunction("planArchiveResultSelection"),
    extractFunction("planArchiveExcludedResults"),
    "this.api = { planArchiveResultSelection, planArchiveExcludedResults };",
  ].join("\n"), sandbox);
  const planFile = "experiments/plans/demo.yaml";
  const records = Array.from({ length: 260 }, (_, index) => ({
    planFile,
    resultId: `result-${index}`,
    finalEvidenceState: index < 3 ? "archived" : "pending_review",
    eligibleForFinalAnalysis: index < 3,
    dimensions: { method: `m${index}`, seed: index },
    metrics: { AUC: { value: 0.5 + index / 1000 } },
  }));
  records.push({ planFile: "experiments/plans/other.yaml", resultId: "foreign", finalEvidenceState: "pending_review" });
  const selection = sandbox.api.planArchiveResultSelection({ results: records }, planFile);
  assert.equal(selection.totalCount, 260);
  assert.equal(selection.includedCount, 3);
  assert.equal(selection.notIncludedCount, 257);
  assert.equal(selection.records.some((row) => row.resultId === "foreign"), false);
  assert.equal(selection.records[0].disposition, "included");
  assert.equal(selection.records[3].disposition, "not_included");
  const manifestPreview = sandbox.api.planArchiveExcludedResults(selection);
  assert.equal(manifestPreview.length, 200);
  assert.equal(selection.notIncludedCount - manifestPreview.length, 57);
});

test("plan archive statically records argparse, click, and Typer defaults", () => {
  const sourceText = [
    "DEFAULT_VALUE = 7",
    'parser = argparse.ArgumentParser(argument_default=DEFAULT_VALUE)',
    'parser.add_argument("--batch-size", type=int, default=32, choices=[16, 32])',
    'parser.add_argument("--augment", action="store_true")',
    'parser.add_argument("--implicit")',
    'parser.add_argument("--labels", default={"positive": 1, "negative": 0})',
    'parser.add_argument("dataset")',
    'parser.set_defaults(batch_size=64)',
    '@click.option("--learning-rate", "lr", default=1e-3, required=True)',
    'config: str = typer.Option("base.yaml", "--config")',
    'checkpoint: str = typer.Argument(...)',
    '# parser.add_argument("--ignored", default=99)',
  ].join("\n");
  const rows = PlanArchive.pythonCliParameterDeclarations(sourceText);
  const byName = new Map(rows.map((row) => [row.name, row]));
  assert.equal(byName.get("batch_size").defaultExpression, "64");
  assert.equal(byName.get("batch_size").defaultSource, "set_defaults");
  assert.equal(byName.get("batch_size").defaultValue, 64);
  assert.equal(byName.get("batch_size").choicesExpression, "[16, 32]");
  assert.equal(byName.get("augment").defaultExpression, "DEFAULT_VALUE");
  assert.equal(byName.get("augment").defaultSource, "argument_default");
  assert.equal(byName.get("augment").defaultValue, 7);
  assert.equal(byName.get("augment").defaultResolvedFrom, "module_constant");
  assert.equal(byName.get("implicit").defaultExpression, "DEFAULT_VALUE");
  assert.deepEqual(byName.get("labels").defaultValue, { positive: 1, negative: 0 });
  assert.equal(byName.get("implicit").defaultSource, "argument_default");
  assert.equal(byName.get("dataset").positional, true);
  assert.equal(byName.get("lr").framework, "click");
  assert.equal(byName.get("lr").defaultValue, 0.001);
  assert.equal(byName.get("config").framework, "typer");
  assert.equal(byName.get("config").defaultValue, "base.yaml");
  assert.equal(byName.get("checkpoint").defaultSource, "required");
  assert.equal(byName.has("ignored"), false);
});

test("plan archive keeps implicit defaults, destinations, duplicate declarations, and unresolved CLI syntax", () => {
  const sourceText = [
    "main = argparse.ArgumentParser(argument_default=MAIN_DEFAULT)",
    "group = main.add_argument_group('runtime')",
    "group.add_argument('-o', '--output', dest='work_dir', const='tmp', nargs='?')",
    "main.set_defaults(work_dir='runs/default')",
    "main.set_defaults(handler=run_command)",
    "main.set_defaults(**DYNAMIC_DEFAULTS)",
    "plain = argparse.ArgumentParser()",
    "plain.add_argument('--verbose', action='store_true')",
    "plain.add_argument('--cache', action=argparse.BooleanOptionalAction)",
    "plain.add_argument('inputs', nargs='*')",
    "plain.add_argument('remainder', nargs=argparse.REMAINDER)",
    "plain.add_argument('zero_more', nargs=argparse.ZERO_OR_MORE)",
    "plain.add_argument('optional', nargs=argparse.OPTIONAL)",
    "plain.set_defaults(before_explicit=1)",
    "plain.add_argument('--before-explicit', default=2)",
    "plain.set_defaults(prior_implicit=6)",
    "plain.add_argument('--prior-implicit')",
    "plain.add_argument('--before-implicit')",
    "plain.set_defaults(before_implicit=3)",
    "plain.add_argument('--after-explicit', default=4)",
    "plain.set_defaults(after_explicit=5)",
    "plain.add_argument('--suppressed', default=argparse.SUPPRESS)",
    "plain.add_argument('--required-token', required=True)",
    "plain.add_argument('--repeat', default=1)",
    "plain.add_argument('--repeat', default=2)",
    "plain.add_argument('--dynamic-dest', dest=DESTINATION)",
    "plain.add_argument(*DYNAMIC_ARGUMENTS)",
    "plain.add_argument_group('chain').add_argument('--chained')",
    "plain.parse_args(namespace=seeded_namespace)",
    "other = argparse.ArgumentParser(argument_default=OTHER_DEFAULT, parents=[main])",
    "other.add_argument('--other-value')",
    "subparsers = other.add_subparsers(dest='command', required=True)",
    "train_parser = subparsers.add_parser('train', argument_default=SUB_DEFAULT)",
    "train_parser.add_argument('--epochs')",
    "train_parser.add_argument('--options', **OPTION_KWARGS)",
    "optional_subparsers = plain.add_subparsers(dest='optional_command')",
    "runtime_group = plain.add_argument_group('runtime options')",
    "exclusive_group = plain.add_mutually_exclusive_group(required=True)",
    "exclusive_group.add_argument('--cpu', action='store_true')",
    "@click.option('--debug', is_flag=True)",
    "@click.option('--count', count=True)",
    "@click.option('--tag', multiple=True, envvar='TAGS')",
    "@click.argument('input_file')",
    "@click.password_option()",
    "cache_dir: str = typer.Option(default_factory=resolve_cache_dir)",
    "typer.run(main_cli)",
    '"""parser.add_argument(\'--docstring-only\', default=9)"""',
  ].join("\n");
  const audit = PlanArchive.pythonCliParameterAudit(sourceText);
  const byName = new Map(audit.parameters.map((row) => [row.name, row]));
  assert.equal(byName.get("work_dir").defaultValue, "runs/default");
  assert.equal(byName.get("work_dir").defaultSource, "set_defaults");
  assert.equal(byName.get("work_dir").destExpression, "'work_dir'");
  assert.equal(byName.get("work_dir").constExpression, "'tmp'");
  assert.equal(byName.get("handler").namespaceDefault, true);
  assert.equal(byName.get("handler").defaultExpression, "run_command");
  assert.equal(byName.get("verbose").defaultValue, false);
  assert.equal(byName.get("cache").defaultValue, null);
  assert.deepEqual(byName.get("inputs").defaultValue, []);
  assert.equal(byName.get("inputs").defaultSource, "nargs_implicit");
  assert.deepEqual(byName.get("remainder").defaultValue, []);
  assert.deepEqual(byName.get("zero_more").defaultValue, []);
  assert.equal(byName.get("optional").defaultValue, null);
  assert.equal(byName.get("before_explicit").defaultValue, 2);
  assert.equal(byName.get("prior_implicit").defaultValue, 6);
  assert.equal(byName.get("before_implicit").defaultValue, 3);
  assert.equal(byName.get("after_explicit").defaultValue, 5);
  assert.equal(byName.get("suppressed").suppressed, true);
  assert.equal(byName.get("suppressed").defaultResolved, true);
  assert.equal(byName.get("required_token").defaultSource, "required");
  assert.equal(byName.get("other_value").defaultExpression, "OTHER_DEFAULT");
  assert.equal(byName.get("command").defaultSource, "required");
  assert.equal(byName.get("optional_command").defaultSource, "framework_implicit");
  assert.equal(byName.get("optional_command").defaultValue, null);
  assert.equal(byName.get("epochs").defaultExpression, "SUB_DEFAULT");
  assert.equal(byName.get("debug").defaultValue, false);
  assert.equal(byName.get("count").defaultValue, 0);
  assert.deepEqual(byName.get("tag").defaultValue, []);
  assert.equal(byName.get("tag").envvarExpression, "'TAGS'");
  assert.equal(byName.get("input_file").positional, true);
  assert.equal(byName.get("input_file").defaultSource, "required");
  assert.equal(byName.get("cache_dir").defaultSource, "default_factory");
  assert.equal(byName.get("cache_dir").defaultResolved, false);
  assert.equal(byName.has("docstring_only"), false);
  assert.equal(audit.parameters.filter((row) => row.name === "repeat").length, 2);
  assert.equal(audit.unresolvedDeclarations.filter((row) => row.reason === "dynamic_parameter_name").length, 1);
  assert.equal(audit.unresolvedDeclarations.filter((row) => row.reason === "dynamic_set_defaults").length, 1);
  assert.equal(audit.unresolvedDeclarations.filter((row) => row.reason === "dynamic_dest").length, 1);
  assert.equal(audit.unresolvedDeclarations.filter((row) => row.reason === "dynamic_parameter_kwargs").length, 1);
  assert.deepEqual(audit.dynamicDefaults.map((row) => row.name).sort(), ["cache_dir", "epochs", "handler", "options", "other_value"]);
  assert.equal(audit.parserDeclarations.filter((row) => row.kind === "ArgumentParser").length, 3);
  assert.equal(audit.parserDeclarations.filter((row) => row.kind === "add_parser").length, 1);
  assert.equal(audit.parserDeclarations.find((row) => row.kind === "add_parser").keywordArguments.argument_default, "SUB_DEFAULT");
  assert.ok(audit.parserDeclarations.some((row) => row.kind === "add_argument_group" && row.assignedReceiver === "runtime_group"));
  assert.equal(audit.parserDeclarations.find((row) => row.kind === "add_mutually_exclusive_group").keywordArguments.required, "True");
  assert.ok(audit.parserFeatures.includes("typer_plain_function_parameters_require_source_review"));
  assert.ok(audit.parserFeatures.includes("argparse_parents_require_source_review"));
  assert.ok(audit.parserFeatures.includes("argparse_namespace_defaults_require_runtime_evidence"));
  assert.ok(audit.parserFeatures.includes("argparse_chained_group_requires_source_review"));
  assert.ok(audit.parserFeatures.includes("click_convenience_decorators_require_source_review"));
});

test("plan archive discovers entry scripts from scalar, block, flow-map, and torchrun commands", () => {
  const sandbox = { path, uniqueStrings: (values) => [...new Set(values)] };
  const entryStart = source.indexOf("function pythonCommandEntryReferences(");
  const entryEnd = source.indexOf("\nasync function planArchiveConfigMigration", entryStart);
  assert.ok(entryStart >= 0 && entryEnd > entryStart);
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("stripYamlComment"),
    extractFunction("planCommandValues"),
    source.slice(entryStart, entryEnd),
    "this.api = { planCommandValues, pythonCommandEntryReferences, pythonCommandArchiveEntryReferences };",
  ].join("\n"), sandbox);
  const plan = [
    'train_command: "python train.py --seed {seed}"',
    "test_command: >",
    "  torchrun --nproc_per_node 4 tools/eval.py",
    "  --result-csv {result_csv}",
    "cases: [{case: extra, command: 'python scripts/extra.py'}]",
    'module_command: "python -m package.runner --config base.yaml"',
  ].join("\n");
  const moduleCommands = sandbox.api.planCommandValues('command: "python -m package.runner --config base.yaml"');
  assert.deepEqual(sandbox.api.pythonCommandArchiveEntryReferences(moduleCommands[0]), ["package/runner.py"]);
  const commands = sandbox.api.planCommandValues(plan);
  const entries = [...new Set(commands.flatMap(sandbox.api.pythonCommandEntryReferences))].sort();
  assert.deepEqual(entries, ["scripts/extra.py", "tools/eval.py", "train.py"]);
});

test("plan archive follows project-local Python imports without executing them", () => {
  const rows = PlanArchive.pythonLocalImportReferences([
    "import cli.shared as shared",
    "from .options import TrainOptions",
    "from ..common import parser as common_parser",
    '"""from ignored.module import fake"""',
    "# import ignored.comment",
  ].join("\n"), "package/train.py");
  const candidates = rows.flatMap((row) => row.candidates);
  assert.ok(candidates.includes("cli/shared.py"));
  assert.ok(candidates.includes("package/options.py"));
  assert.ok(candidates.includes("common.py"));
  assert.equal(candidates.some((value) => value.includes("ignored")), false);
});

test("plan archive snapshot includes argparse declared in an imported module", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-plan-archive-"));
  try {
    fs.mkdirSync(path.join(root, "package"), { recursive: true });
    fs.writeFileSync(path.join(root, "package", "runner.py"), "from .options import build_parser\nargs = build_parser().parse_args()\n", "utf8");
    fs.writeFileSync(path.join(root, "package", "options.py"), [
      "import argparse",
      "DEFAULT_EPOCHS = 12",
      "def build_parser():",
      "    parser = argparse.ArgumentParser()",
      "    parser.add_argument('--epochs', type=int, default=DEFAULT_EPOCHS)",
      "    return parser",
    ].join("\n"), "utf8");
    const sandbox = {
      fs: fs.promises,
      path,
      PlanBuilder_1: require("../../dist/features/PlanBuilder.js"),
      pythonCliParameterAudit: PlanArchive.pythonCliParameterAudit,
      pythonLocalImportReferences: PlanArchive.pythonLocalImportReferences,
      uniqueStrings: (values) => [...new Set(values.filter(Boolean))],
      safeWorkspaceChildPath: (workspace, relative) => path.resolve(workspace, relative),
      sha256Text: (value) => crypto.createHash("sha256").update(value).digest("hex"),
    };
    const snapshotStart = source.indexOf("async function planArchiveParameterSnapshot(");
    const snapshotEnd = source.indexOf("\nfunction planCommandValues(", snapshotStart);
    const entryStart = source.indexOf("function pythonCommandEntryReferences(");
    const entryEnd = source.indexOf("\nasync function planArchiveConfigMigration", entryStart);
    assert.ok(snapshotStart >= 0 && snapshotEnd > snapshotStart);
    assert.ok(entryStart >= 0 && entryEnd > entryStart);
    vm.createContext(sandbox);
    vm.runInContext([
      extractFunction("stripYamlComment"),
      extractFunction("planCommandValues"),
      source.slice(entryStart, entryEnd),
      source.slice(snapshotStart, snapshotEnd),
      "this.snapshot = planArchiveParameterSnapshot;",
    ].join("\n"), sandbox);
    const snapshot = await sandbox.snapshot(root, 'command: "python -m package.runner"');
    assert.deepEqual([...snapshot.entryScripts], ["package/options.py", "package/runner.py"]);
    assert.equal(snapshot.missingEntries.length, 0);
    assert.equal(snapshot.sourceScanWarnings.length, 0);
    assert.equal(snapshot.entries.find((entry) => entry.file === "package/options.py").sourceRole, "imported_cli_source");
    assert.equal(snapshot.entries.find((entry) => entry.file === "package/options.py").parameters[0].defaultExpression, "DEFAULT_EPOCHS");
    assert.equal(snapshot.entries.find((entry) => entry.file === "package/options.py").parameters[0].defaultValue, 12);
  }
  finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
