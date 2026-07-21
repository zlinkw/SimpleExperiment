import { createHash } from "crypto";

export const PLAN_REGISTRY_PATH = "zlk_cluster/plans/plan_registry.json";
export const PLAN_REGISTRY_LOCAL_PATH = "zlk_cluster/plans/plan_registry.local.json";
export const PLAN_EXPORT_DIR = "zlk_cluster/plans/exports";

export interface ExperimentMatrix {
  baseConfig: string;
  suite: string;
  variables: Array<{ name: string; key?: string; values?: string[]; mode: "grid" | "paired" | "fixed" | "derived" | "conditional"; expression?: string; when?: string }>;
  seeds: string[];
  constraints?: string[];
  namingRule?: { pattern: string; sanitize?: boolean };
}

export interface GeneratedExperiment {
  experimentIndex: number;
  name: string;
  runKey: string;
  experimentKey?: string;
  configOverrides: Record<string, unknown>;
  commandPreview: string;
  filteredBy?: string;
}

export interface PlanBuildResult {
  experiments: GeneratedExperiment[];
  duplicateRunKeys: string[];
  filteredCount?: number;
  errors?: string[];
  yaml: string;
  previewCsv?: string;
}

export interface PlannedExperimentSummary {
  experimentKey: string;
  name: string;
  runKey: string;
  status?: "planned" | "queued" | "running" | "completed" | "failed" | "skipped";
  stageId?: string;
  tags?: string[];
}

export interface PlanResourceEstimate {
  experimentCount: number;
  estimatedGpuHours?: number;
  estimatedWallTimeHours?: number;
  estimatedDiskGb?: number;
  estimatedCheckpointGb?: number;
  estimatedLogMb?: number;
  requiredGpuMemoryMb?: number;
  suggestedWorkers?: string[];
  warnings?: string[];
}

export interface ExperimentPlanRecord {
  schemaVersion: 1;
  planId: string;
  planName: string;
  suite: string;
  project?: string;
  status: "draft" | "validated" | "scheduled" | "running" | "completed" | "partially_completed" | "failed" | "archived" | "deprecated";
  source: { type: "manual_yaml" | "template_generated" | "imported" | "cloned" | "ui_builder"; path?: string; templateId?: string; generatedFrom?: string };
  planFile: string;
  planSha256?: string;
  schemaId?: string;
  templateId?: string;
  variables: Record<string, unknown>;
  dimensions: Record<string, string | number | boolean>;
  experimentCount: number;
  plannedExperiments: PlannedExperimentSummary[];
  resourceEstimate?: PlanResourceEstimate;
  createdAt: string;
  updatedAt: string;
  validatedAt?: string;
  lastRunAt?: string;
  tags?: string[];
  favorite?: boolean;
  notes?: string;
  locked?: boolean;
  provenance: { baseConfig?: string; gitCommit?: string; branch?: string; author?: string; parentPlanId?: string; parentRevisionId?: string };
  revisions?: PlanRevision[];
  dependencies?: PlanDependency[];
  stages?: PlanStage[];
}

export interface PlanFieldDefinition {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "path" | "enum" | "array" | "object";
  required?: boolean;
  defaultValue?: unknown;
  enumValues?: string[];
  description?: string;
}

export interface PlanVariableDefinition {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "enum";
  mode: "single" | "grid" | "paired" | "derived";
  values?: unknown[];
  defaultValue?: unknown;
  required?: boolean;
  description?: string;
}

export interface PlanConstraint {
  id: string;
  expression: string;
  message: string;
}

export interface SchedulingPolicy {
  priority?: "high" | "normal" | "low";
  runPolicy?: "sequential" | "parallel" | "manual";
  maxConcurrentJobs?: number;
  retryFailed?: boolean;
}

export interface PlanSchema {
  schemaVersion: 1;
  id: string;
  name: string;
  description?: string;
  appliesTo?: { projects?: string[]; suites?: string[]; tags?: string[] };
  fields: PlanFieldDefinition[];
  variables: PlanVariableDefinition[];
  constraints: PlanConstraint[];
  defaultSchedulingPolicy?: SchedulingPolicy;
  defaultResultSchemaId?: string;
  defaultPlanTemplateId?: string;
  display?: { pinnedFields?: string[]; hiddenFields?: string[]; defaultGroupBy?: string[] };
}

export interface PlanTemplate {
  schemaVersion: 1;
  id: string;
  name: string;
  description?: string;
  schemaId?: string;
  templateType: "yaml_template" | "json_template" | "command_template";
  variables: PlanVariableDefinition[];
  files: Array<{ relativePath: string; contentTemplate: string; overwritePolicy: "never" | "prompt" | "overwrite" }>;
  commandTemplates?: { train?: string; test?: string; resume?: string; evaluate?: string };
  defaultTags?: string[];
  resultParserPresetId?: string;
  resultSchemaId?: string;
}

export interface PlanMatrix {
  variables: Array<{ key: string; mode: "grid" | "paired" | "fixed" | "derived" | "conditional"; values?: unknown[]; expression?: string; when?: string }>;
  constraints?: Array<{ id: string; expression: string; message: string }>;
  namingRule?: { pattern: string; sanitize?: boolean };
}

export interface PlanValidationIssue {
  id: string;
  severity: "info" | "warning" | "critical";
  path?: string;
  message: string;
  suggestion?: string;
}

export interface PlanValidationResult {
  planId?: string;
  status: "ok" | "warning" | "failed";
  experimentCount: number;
  warnings: PlanValidationIssue[];
  errors: PlanValidationIssue[];
  duplicateExperiments: Array<{ experimentKey: string; existingExperimentId?: string; reason: string }>;
}

export interface PlanDependency {
  id: string;
  from: string;
  to: string;
  type: "plan" | "experiment" | "stage";
  condition: { type: "completed" } | { type: "metric_threshold"; metric: string; op: ">=" | "<="; value: number } | { type: "manual_approval" };
}

export interface PlanStage {
  stageId: string;
  name: string;
  experiments: string[];
  dependsOn?: string[];
  runPolicy: "sequential" | "parallel" | "manual";
}

export interface PlanRevision {
  revisionId: string;
  planId: string;
  createdAt: string;
  reason: string;
  source: "manual_edit" | "template_generate" | "schema_migration" | "clone" | "import";
  planSha256: string;
  diffSummary?: string;
  changedFields?: string[];
}

export interface ReproducePlanOptions {
  sourcePlanId?: string;
  sourceExperimentIds?: string[];
  mode: "rerun_all" | "retry_failed" | "missing_results_only" | "new_seeds" | "new_dataset";
  overrides: Record<string, unknown>;
  skipCompleted: boolean;
}

export interface PlanResultCoverage {
  planId: string;
  experimentCount: number;
  completedCount: number;
  parsedResultCount: number;
  missingResultCount: number;
  missingPrimaryMetric: string[];
  bestByMetric: Record<string, { experimentId: string; value: number }>;
}

export const builtInPlanSchemas: PlanSchema[] = [
  {
    schemaVersion: 1,
    id: "generic_experiment_plan",
    name: "Generic experiment plan",
    fields: [
      { key: "suite", label: "Suite", type: "string", required: true },
      { key: "base_config", label: "Base config", type: "path", required: true },
      { key: "mode", label: "Mode", type: "enum", enumValues: ["train", "test", "train_test"], defaultValue: "train_test" },
    ],
    variables: [
      { key: "seed", label: "Seed", type: "string", mode: "grid", values: ["1", "2", "3"] },
      { key: "learning_rate", label: "Learning rate", type: "number", mode: "grid", values: [0.001] },
    ],
    constraints: [],
    defaultSchedulingPolicy: { priority: "normal", runPolicy: "parallel", maxConcurrentJobs: 1 },
    defaultPlanTemplateId: "generic_grid_search",
    display: { pinnedFields: ["suite", "base_config"], defaultGroupBy: ["suite", "status"] },
  },
  {
    schemaVersion: 1,
    id: "medical_segmentation_plan",
    name: "Medical segmentation plan",
    fields: [
      { key: "suite", label: "Suite", type: "string", required: true },
      { key: "base_config", label: "Base config", type: "path", required: true },
      { key: "dataset", label: "Dataset", type: "enum", enumValues: ["VinDr", "PAD-UFES", "VinDr-CXR"], required: true },
    ],
    variables: [
      { key: "model", label: "Model", type: "enum", mode: "grid", values: ["baseline", "fusion"] },
      { key: "missing_rate", label: "Missing rate", type: "number", mode: "grid", values: [0, 0.3, 0.5] },
      { key: "noise_type", label: "Noise type", type: "enum", mode: "paired", values: ["none", "gaussian"] },
      { key: "noise_level", label: "Noise level", type: "number", mode: "paired", values: [0, 0.1] },
    ],
    constraints: [
      { id: "missing_zero_none", expression: "missing_rate == 0 -> missing_strategy == none", message: "missing_rate=0 requires missing_strategy=none" },
      { id: "noise_none_zero", expression: "noise_type == none -> noise_level == 0", message: "noise_type=none requires noise_level=0" },
    ],
    defaultSchedulingPolicy: { priority: "normal", runPolicy: "parallel", maxConcurrentJobs: 1 },
    defaultResultSchemaId: "medical_segmentation",
    defaultPlanTemplateId: "medical_segmentation_ablation",
  },
];

export const builtInPlanTemplates: PlanTemplate[] = [
  template("generic_grid_search", "Generic grid search", "generic_experiment_plan", "{{suite}}.generated.yaml"),
  template("medical_segmentation_ablation", "Medical segmentation ablation", "medical_segmentation_plan", "{{suite}}.ablation.yaml"),
  template("missing_modality_experiment", "Missing modality experiment", "medical_segmentation_plan", "{{suite}}.missing_modality.yaml"),
  template("noisy_clinical_data_experiment", "Noisy clinical data experiment", "medical_segmentation_plan", "{{suite}}.noise.yaml"),
  template("cross_dataset_evaluation", "Cross dataset evaluation", "medical_segmentation_plan", "{{suite}}.cross_dataset.yaml"),
  template("seed_repeat_experiment", "Seed repeat experiment", "generic_experiment_plan", "{{suite}}.seeds.yaml"),
];

export function buildExperimentMatrix(matrix: ExperimentMatrix, existingRunKeys: Iterable<string> = []): PlanBuildResult {
  const existing = new Set(existingRunKeys);
  const advanced = expandPlanMatrix({
    variables: [
      ...matrix.variables.map((item) => ({ key: item.key || item.name, mode: item.mode, values: item.values, expression: item.expression, when: item.when })),
      ...(matrix.seeds.length ? [{ key: "seed", mode: "grid" as const, values: matrix.seeds }] : [{ key: "seed", mode: "fixed" as const, values: ["0"] }]),
    ],
    constraints: (matrix.constraints || []).map((expression, index) => ({ id: `constraint_${index}`, expression, message: expression })),
    namingRule: matrix.namingRule,
  }, existing, matrix.suite);
  const experiments: GeneratedExperiment[] = [];
  const duplicateRunKeys: string[] = [];
  let index = 0;
  for (const item of advanced.experiments) {
    if (existing.has(item.runKey) || experiments.some((existingItem) => existingItem.runKey === item.runKey)) duplicateRunKeys.push(item.runKey);
    experiments.push({
      experimentIndex: index++,
      name: item.name,
      runKey: item.runKey,
      experimentKey: item.experimentKey,
      configOverrides: item.configOverrides,
      commandPreview: `config=${matrix.baseConfig} ${Object.entries(item.configOverrides).map(([k, v]) => `${k}=${v}`).join(" ")}`,
    });
  }
  return { experiments, duplicateRunKeys: Array.from(new Set(duplicateRunKeys)), filteredCount: advanced.filteredCount, errors: advanced.errors, yaml: renderPlanYaml(matrix, experiments), previewCsv: matrixPreviewCsv(experiments) };
}

export function renderPlanYaml(matrix: ExperimentMatrix, experiments: GeneratedExperiment[]): string {
  const lines = [
    `suite: ${quoteYaml(matrix.suite)}`,
    "mode: train_test",
    `base_config: ${quoteYaml(matrix.baseConfig)}`,
    "seeds:",
    ...Array.from(new Set(experiments.map((item) => String(item.configOverrides.seed || "0")))).map((seed) => `  - ${quoteYaml(seed)}`),
    "cases:",
    ...experiments.map((item) => [
      `  - name: ${quoteYaml(item.name)}`,
      "    overrides:",
      ...Object.entries(item.configOverrides).map(([key, value]) => `      ${key}: ${quoteYaml(String(value))}`),
    ].join("\n")),
  ];
  return `${lines.join("\n")}\n`;
}

export function parsePlanCases(yaml: string): string[] {
  const cases: string[] = [];
  let sectionIndent = -1;
  let inPlanList = false;
  let currentItemIndent = -1;
  let currentItemHasLabel = false;
  for (const rawLine of yaml.split(/\r?\n/)) {
    const line = rawLine.replace(/\t/g, "  ");
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const indent = line.match(/^\s*/)?.[0].length || 0;
    const section = line.match(/^(\s*)(cases|experiments)\s*:\s*(?:#.*)?$/);
    if (section) {
      sectionIndent = section[1].length;
      inPlanList = true;
      currentItemIndent = -1;
      currentItemHasLabel = false;
      continue;
    }
    if (!inPlanList) continue;
    if (indent <= sectionIndent) {
      inPlanList = false;
      currentItemIndent = -1;
      currentItemHasLabel = false;
      continue;
    }
    const listItem = line.match(/^(\s*)-\s*(.*)$/);
    if (listItem) {
      currentItemIndent = listItem[1].length;
      currentItemHasLabel = false;
      const inlineLabel = planCaseLabelValue(listItem[2]);
      if (inlineLabel) {
        cases.push(inlineLabel);
        currentItemHasLabel = true;
      }
      continue;
    }
    if (currentItemIndent >= 0 && indent === currentItemIndent + 2 && !currentItemHasLabel) {
      const nestedLabel = planCaseLabelValue(line.trim());
      if (nestedLabel) {
        cases.push(nestedLabel);
        currentItemHasLabel = true;
      }
      continue;
    }
    if (currentItemIndent < 0) {
      const mapItem = line.match(/^\s*([A-Za-z0-9_.:-]+)\s*:\s*(?:#.*)?$/);
      if (mapItem) cases.push(stripYamlScalar(mapItem[1]));
    }
  }
  return cases;
}

export interface PlanOutputEvidence {
  outputCandidates: string[];
  outputSignals: string[];
  evidenceCandidates: string[];
}

const directResultKeys = [
  "result_csv",
  "resultCsv",
  "results_csv",
  "resultsCsv",
  "metrics_csv",
  "metricsCsv",
  "summary_csv",
  "summaryCsv",
  "output_csv",
  "outputCsv",
  "result_json",
  "resultJson",
  "metrics_json",
  "metricsJson",
  "summary_txt",
  "summaryTxt",
  "log_file",
  "logFile",
];
const resultListKeys = [
  "expectedResults",
  "expected_results",
  "resultFiles",
  "result_files",
  "outputFiles",
  "output_files",
];
const objectResultPathKeys = new Set([
  "path",
  "file",
  "result",
  "resultFile",
  "result_file",
  "output",
  "outputFile",
  "output_file",
  "log",
  "log_file",
  ...directResultKeys,
]);
const resultDirKeys = ["output_dir", "outputDir", "result_dir", "resultDir", "results_dir", "resultsDir", "work_dir", "workDir", "workdir", "save_dir", "saveDir", "log_dir", "logDir"];
const commandResultFlags = new Map<string, string>([
  ["result-csv", "result_csv"],
  ["result_csv", "result_csv"],
  ["results-csv", "results_csv"],
  ["results_csv", "results_csv"],
  ["metrics-csv", "metrics_csv"],
  ["metrics_csv", "metrics_csv"],
  ["summary-csv", "summary_csv"],
  ["summary_csv", "summary_csv"],
  ["output-csv", "output_csv"],
  ["output_csv", "output_csv"],
  ["result-json", "result_json"],
  ["result_json", "result_json"],
  ["metrics-json", "metrics_json"],
  ["metrics_json", "metrics_json"],
  ["summary-txt", "summary_txt"],
  ["summary_txt", "summary_txt"],
  ["log-file", "log_file"],
  ["log_file", "log_file"],
  ["stdout", "stdout"],
  ["stderr", "stderr"],
]);

export function parsePlanOutputEvidence(yaml: string, commands: { trainCommand?: string; testCommand?: string } = {}): PlanOutputEvidence {
  const clean = stripYamlComments(yaml);
  const direct = directResultKeys.flatMap((key) => extractYamlStringValues(clean, key).map((value) => ({ key, value: normalizePlanCandidatePath(value) }))).filter((item) => item.value);
  const listed = resultListKeys.flatMap((key) => extractYamlResultListValues(clean, key).map((value) => ({ key, value: normalizePlanCandidatePath(value) }))).filter((item) => item.value);
  const dirs = resultDirKeys.flatMap((key) => extractYamlStringValues(clean, key)).map(normalizePlanCandidateDir).filter(Boolean);
  const outputCandidates = uniquePlanStrings([
    ...direct.map((item) => item.value),
    ...listed.map((item) => item.value),
    ...dirs.flatMap((dir) => [
      `${dir}/metrics_summary.csv`,
      `${dir}/results.csv`,
      `${dir}/metrics.csv`,
      `${dir}/summary.txt`,
      `${dir}/stdout.log`,
    ]),
  ]);
  const signals = new Set<string>();
  for (const item of [...direct, ...listed]) {
    if (isPlanParseableResultCandidate(item.value)) signals.add(`结果文件: ${item.key}=${item.value}`);
  }
  const trainCommand = commands.trainCommand || firstYamlStringValue(clean, ["train_command", "trainCommand"]) || "";
  const testCommand = commands.testCommand || firstYamlStringValue(clean, ["test_command", "testCommand"]) || "";
  const combinedCommand = `${trainCommand}\n${testCommand}`;
  if (/\{?result_csv\}?|--result-csv|--results-csv/i.test(combinedCommand)) signals.add("命令参数: result_csv");
  if (/\b(stdout|stderr|console|tee)\b/i.test(clean)) signals.add("文本日志: stdout/stderr");
  if (/^\s*metricRegex\s*:/im.test(clean)) signals.add("metricRegex: 自定义指标正则");
  const evidenceCandidates = uniquePlanStrings([...direct, ...listed].map((item) => item.value).filter(isPlanParseableResultCandidate));
  return { outputCandidates, outputSignals: [...signals].sort(), evidenceCandidates };
}

function extractYamlStringValues(text: string, key: string): string[] {
  const values: string[] = [];
  const pattern = new RegExp(`^\\s*${escapeRegExp(key)}:\\s*["']?([^"'#\\r\\n]+)`, "gim");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) values.push(stripYamlScalar(match[1]));
  return values;
}

function firstYamlStringValue(text: string, keys: string[]): string {
  for (const key of keys) {
    const value = extractYamlStringValues(text, key)[0];
    if (value) return value;
  }
  return "";
}

function extractYamlResultListValues(text: string, key: string): string[] {
  const values: string[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const match = line.match(new RegExp(`^(\\s*)${escapeRegExp(key)}:\\s*(.*)$`));
    if (!match) continue;
    const sectionIndent = match[1].length;
    const rest = match[2].trim();
    if (rest && rest !== "[]" && rest !== "{}") {
      if (rest.startsWith("[")) values.push(...splitTopLevelYamlList(rest.slice(1, rest.lastIndexOf("]") >= 0 ? rest.lastIndexOf("]") : undefined)).flatMap(resultValuesFromYamlItem));
      else values.push(...resultValuesFromYamlItem(rest));
    }
    let currentItemIndent = -1;
    for (let cursor = index + 1; cursor < lines.length; cursor++) {
      const nested = lines[cursor];
      if (!nested.trim()) continue;
      const indent = nested.match(/^\s*/)?.[0].length || 0;
      if (indent <= sectionIndent) break;
      const item = nested.match(/^(\s*)-\s*(.*)$/);
      if (item) {
        currentItemIndent = item[1].length;
        values.push(...resultValuesFromYamlItem(item[2]));
        continue;
      }
      if (currentItemIndent >= 0 && indent > currentItemIndent) values.push(...resultValuesFromYamlItem(nested.trim()));
    }
  }
  return values;
}

function resultValuesFromYamlItem(item: string): string[] {
  const text = item.trim();
  if (!text || text === "[]" || text === "{}") return [];
  if (text.startsWith("{") && text.endsWith("}")) {
    return splitTopLevelYamlList(text.slice(1, -1)).flatMap((part) => resultValuesFromYamlItem(part));
  }
  const pair = text.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.+)$/);
  if (pair) return resultPathKey(pair[1]) ? [stripYamlScalar(pair[2])] : [];
  return [stripYamlScalar(text)];
}

function resultPathKey(key: string): boolean {
  return objectResultPathKeys.has(key);
}

function splitTopLevelYamlList(text: string): string[] {
  const out: string[] = [];
  let quote = "";
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ((ch === "\"" || ch === "'") && text[i - 1] !== "\\") quote = quote === ch ? "" : quote || ch;
    if (!quote && (ch === "{" || ch === "[")) depth++;
    if (!quote && (ch === "}" || ch === "]")) depth = Math.max(0, depth - 1);
    if (!quote && depth === 0 && ch === ",") {
      out.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(text.slice(start).trim());
  return out.filter(Boolean);
}

function stripYamlComments(text: string): string {
  return text.split(/\r?\n/).map(stripYamlLineComment).join("\n");
}

function stripYamlLineComment(value: string): string {
  let quote = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if ((ch === "\"" || ch === "'") && value[i - 1] !== "\\") quote = quote === ch ? "" : quote || ch;
    if (ch === "#" && !quote) return value.slice(0, i);
  }
  return value;
}

function normalizePlanCandidateDir(value: string): string {
  const text = normalizePlanCandidatePath(value).replace(/\/+$/, "");
  if (!text) return "";
  if (/\.(csv|json|txt|log|out)$/i.test(text)) return text.split("/").slice(0, -1).join("/") || ".";
  return text;
}

function normalizePlanCandidatePath(value: string): string {
  const text = stripYamlScalar(value).replace(/\\/g, "/");
  if (!text || /^(none|null|false)$/i.test(text)) return "";
  if (/^(https?:|s3:|gs:|oss:)/i.test(text)) return "";
  if (/^(?:[A-Za-z]:)?\//.test(text)) return "";
  if (text.startsWith("$") || text.includes("://")) return "";
  return text.replace(/^\.\//, "");
}

function isPlanParseableResultCandidate(value: string): boolean {
  const text = String(value || "").trim().replace(/\\/g, "/");
  if (!text || /(^|\/)jobs\.csv$/i.test(text)) return false;
  return /\.(csv|json|txt|log|out)$/i.test(text);
}

function uniquePlanStrings(values: string[]): string[] {
  return [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function expandPlanMatrix(matrix: PlanMatrix, existingRunKeys: Iterable<string> = [], suite = "suite"): PlanBuildResult {
  const errors: string[] = [];
  const paired = matrix.variables.filter((item) => item.mode === "paired");
  const fixed = matrix.variables.filter((item) => item.mode === "fixed");
  const grid = matrix.variables.filter((item) => item.mode === "grid");
  const derived = matrix.variables.filter((item) => item.mode === "derived");
  const conditional = matrix.variables.filter((item) => item.mode === "conditional");
  const pairedRows = paired.length ? pairedCombinations(paired.map(varToLegacy)) : [{}];
  const gridRows = gridCombinations(grid.map(varToLegacy));
  const fixedRow = Object.fromEntries(fixed.map((item) => [item.key, item.values?.[0] ?? ""]));
  const experiments: GeneratedExperiment[] = [];
  const duplicateRunKeys: string[] = [];
  let filteredCount = 0;
  let index = 0;
  for (const pairedRow of pairedRows) {
    for (const gridRow of gridRows) {
      let row: Record<string, unknown> = { ...fixedRow, ...gridRow, ...pairedRow };
      for (const item of derived) row[item.key] = evaluateValueExpression(item.expression || "", row);
      for (const item of conditional) if (!item.when || evaluateCondition(item.when, row)) row[item.key] = item.expression ? evaluateValueExpression(item.expression, row) : item.values?.[0];
      const failed = (matrix.constraints || []).find((constraint) => !evaluateConstraint(constraint.expression, row));
      if (failed) {
        filteredCount++;
        continue;
      }
      const name = renderNamingRule(matrix.namingRule?.pattern, suite, row) || experimentName(suite, row);
      const safeName = matrix.namingRule?.sanitize === false ? name : sanitizeName(name);
      const runKey = `${suite}:${safeName}`;
      const experimentKey = sha256(`${suite}:${JSON.stringify(sortObject(row))}`).slice(0, 16);
      if (new Set(existingRunKeys).has(runKey) || experiments.some((item) => item.runKey === runKey)) duplicateRunKeys.push(runKey);
      experiments.push({ experimentIndex: index++, name: safeName, runKey, experimentKey, configOverrides: row, commandPreview: Object.entries(row).map(([k, v]) => `${k}=${v}`).join(" ") });
    }
  }
  return { experiments, duplicateRunKeys: Array.from(new Set(duplicateRunKeys)), filteredCount, errors, yaml: "", previewCsv: matrixPreviewCsv(experiments) };
}

export function renderPlanTemplate(template: PlanTemplate, variables: Record<string, unknown>): Array<{ relativePath: string; content: string; overwritePolicy: PlanTemplate["files"][number]["overwritePolicy"] }> {
  validateTemplateVariables(template, variables);
  return template.files.map((file) => ({ relativePath: renderTemplate(file.relativePath, variables), content: renderTemplate(file.contentTemplate, variables), overwritePolicy: file.overwritePolicy }));
}

export function validateTemplateVariables(template: PlanTemplate, variables: Record<string, unknown>): PlanValidationIssue[] {
  return template.variables.filter((item) => item.required && variables[item.key] === undefined && item.defaultValue === undefined).map((item) => ({ id: `missing_variable_${item.key}`, severity: "critical" as const, path: `variables.${item.key}`, message: `Missing template variable: ${item.key}`, suggestion: "Set variable before generating plan." }));
}

export function importLegacyPlanYamlToRegistry(planFile: string, text: string, existing: ExperimentPlanRecord[] = []): ExperimentPlanRecord {
  const suite = scalar(text, "suite") || stripExt(planFile);
  const cases = parsePlanCases(text);
  const planId = stablePlanId(planFile, suite);
  const previous = existing.find((item) => item.planId === planId);
  const now = new Date().toISOString();
  const plannedExperiments = cases.map((name) => ({ experimentKey: sha256(`${suite}:${name}`).slice(0, 16), name, runKey: `${suite}:${name}`, status: "planned" as const }));
  return {
    schemaVersion: 1,
    planId,
    planName: previous?.planName || pathName(planFile),
    suite,
    status: previous?.status || "draft",
    source: { type: "manual_yaml", path: planFile },
    planFile,
    planSha256: sha256(text),
    variables: {},
    dimensions: { suite },
    experimentCount: plannedExperiments.length || Number(scalar(text, "job_count") || 0) || 1,
    plannedExperiments,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    provenance: { baseConfig: scalar(text, "base_config") },
    revisions: previous?.revisions || [createPlanRevision(planId, text, "initial import", "import")],
  };
}

export function upsertPlanRecords(existing: ExperimentPlanRecord[], incoming: ExperimentPlanRecord[]): ExperimentPlanRecord[] {
  const map = new Map(existing.map((item) => [item.planId, item]));
  for (const record of incoming) {
    const prev = map.get(record.planId);
    map.set(record.planId, prev ? { ...prev, ...record, createdAt: prev.createdAt, revisions: mergeRevisions(prev.revisions, record.revisions), updatedAt: new Date().toISOString() } : record);
  }
  return Array.from(map.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function deprecatePlan(record: ExperimentPlanRecord, reason = "deprecated"): ExperimentPlanRecord {
  return { ...record, status: "deprecated", notes: [record.notes, reason].filter(Boolean).join("\n"), updatedAt: new Date().toISOString() };
}

export function validatePlanRecord(record: ExperimentPlanRecord, context: { schemas?: PlanSchema[]; templates?: PlanTemplate[]; existingExperimentKeys?: string[]; resultSchemaIds?: string[]; parserPresetIds?: string[] } = {}): PlanValidationResult {
  const warnings: PlanValidationIssue[] = [];
  const errors: PlanValidationIssue[] = [];
  const duplicates: PlanValidationResult["duplicateExperiments"] = [];
  if (!record.suite) errors.push(planIssue("suite_missing", "critical", "suite", "Plan suite is required", "Set suite."));
  if (!record.planFile) errors.push(planIssue("plan_file_missing", "critical", "planFile", "Plan file is required", "Save plan YAML."));
  if (!record.provenance.baseConfig) warnings.push(planIssue("base_config_missing", "warning", "provenance.baseConfig", "Base config missing", "Set base_config."));
  if (!record.plannedExperiments.length) warnings.push(planIssue("empty_plan", "warning", "plannedExperiments", "No planned experiments", "Add cases or matrix variables."));
  const seen = new Set<string>();
  for (const exp of record.plannedExperiments) {
    if (seen.has(exp.experimentKey)) duplicates.push({ experimentKey: exp.experimentKey, reason: "duplicate in plan" });
    seen.add(exp.experimentKey);
    if (context.existingExperimentKeys?.includes(exp.experimentKey)) duplicates.push({ experimentKey: exp.experimentKey, reason: "already exists" });
  }
  if (record.schemaId && context.schemas && !context.schemas.some((item) => item.id === record.schemaId)) warnings.push(planIssue("schema_missing", "warning", "schemaId", "Plan schema missing", "Import schema or change schemaId."));
  if (record.templateId && context.templates && !context.templates.some((item) => item.id === record.templateId)) warnings.push(planIssue("template_missing", "warning", "templateId", "Plan template missing", "Import template or change templateId."));
  if (record.resourceEstimate?.warnings?.length) warnings.push(...record.resourceEstimate.warnings.map((message, index) => planIssue(`resource_${index}`, "warning", "resourceEstimate", message)));
  return { planId: record.planId, status: errors.length ? "failed" : warnings.length || duplicates.length ? "warning" : "ok", experimentCount: record.experimentCount, warnings, errors, duplicateExperiments: duplicates };
}

export function estimatePlanResources(experimentCount: number, perExperiment: Partial<PlanResourceEstimate> = {}, workers: Array<{ serverId: string; freeDiskGb?: number; gpuMemoryMb?: number }> = []): PlanResourceEstimate {
  const estimate: PlanResourceEstimate = {
    experimentCount,
    estimatedGpuHours: multiply(perExperiment.estimatedGpuHours, experimentCount),
    estimatedWallTimeHours: multiply(perExperiment.estimatedWallTimeHours, experimentCount),
    estimatedDiskGb: multiply(perExperiment.estimatedDiskGb, experimentCount),
    estimatedCheckpointGb: multiply(perExperiment.estimatedCheckpointGb, experimentCount),
    estimatedLogMb: multiply(perExperiment.estimatedLogMb, experimentCount),
    requiredGpuMemoryMb: perExperiment.requiredGpuMemoryMb,
    suggestedWorkers: workers.filter((worker) => !perExperiment.requiredGpuMemoryMb || (worker.gpuMemoryMb || 0) >= perExperiment.requiredGpuMemoryMb).map((worker) => worker.serverId),
    warnings: [],
  };
  if (estimate.estimatedDiskGb && workers.length && workers.every((worker) => (worker.freeDiskGb || 0) < estimate.estimatedDiskGb!)) estimate.warnings!.push("Estimated disk usage exceeds every worker free disk.");
  if (estimate.requiredGpuMemoryMb && workers.length && !estimate.suggestedWorkers?.length) estimate.warnings!.push("No worker appears to satisfy GPU memory requirement.");
  return estimate;
}

export function createPlanRevision(planId: string, planText: string, reason: string, source: PlanRevision["source"] = "manual_edit", previous?: ExperimentPlanRecord): PlanRevision {
  const hash = sha256(planText);
  return {
    revisionId: `plan_rev_${hash.slice(0, 12)}`,
    planId,
    createdAt: new Date().toISOString(),
    reason,
    source,
    planSha256: hash,
    diffSummary: previous ? diffPlans(previous, { ...previous, planSha256: hash }) : undefined,
    changedFields: previous && previous.planSha256 !== hash ? ["planSha256"] : [],
  };
}

export function diffPlans(a: ExperimentPlanRecord, b: ExperimentPlanRecord): string {
  const changed = ["planName", "suite", "status", "planFile", "planSha256", "schemaId", "templateId", "experimentCount"].filter((key) => JSON.stringify((a as any)[key]) !== JSON.stringify((b as any)[key]));
  const expA = new Set(a.plannedExperiments.map((item) => item.experimentKey));
  const expB = new Set(b.plannedExperiments.map((item) => item.experimentKey));
  const added = Array.from(expB).filter((key) => !expA.has(key)).length;
  const removed = Array.from(expA).filter((key) => !expB.has(key)).length;
  return `fields=${changed.join(",") || "none"} experiments_added=${added} experiments_removed=${removed}`;
}

export function cloneOrReproducePlan(source: ExperimentPlanRecord, options: ReproducePlanOptions): ExperimentPlanRecord {
  const now = new Date().toISOString();
  const filtered = source.plannedExperiments.filter((item) => {
    if (options.mode === "retry_failed") return item.status === "failed";
    if (options.skipCompleted && item.status === "completed") return false;
    return !options.sourceExperimentIds?.length || options.sourceExperimentIds.includes(item.experimentKey);
  });
  const suffix = options.mode.replace(/_/g, "-");
  const planId = `${source.planId}-${suffix}-${sha256(`${now}:${JSON.stringify(options.overrides)}`).slice(0, 8)}`;
  return {
    ...source,
    planId,
    planName: `${source.planName} ${suffix}`,
    status: "draft",
    source: { type: "cloned", generatedFrom: source.planId },
    variables: { ...source.variables, ...options.overrides },
    plannedExperiments: filtered.map((item) => ({ ...item, experimentKey: sha256(`${planId}:${item.experimentKey}`).slice(0, 16), runKey: `${source.suite}:${suffix}:${item.name}`, status: "planned" })),
    experimentCount: filtered.length,
    createdAt: now,
    updatedAt: now,
    lastRunAt: undefined,
    provenance: { ...source.provenance, parentPlanId: source.planId, parentRevisionId: source.revisions?.at(-1)?.revisionId },
    revisions: [createPlanRevision(planId, JSON.stringify({ source: source.planId, options }), "clone/reproduce", "clone")],
  };
}

export function searchPlans(records: ExperimentPlanRecord[], query: { suite?: string; status?: string; tag?: string; schemaId?: string; templateId?: string; hasFailures?: boolean; favorite?: boolean; text?: string }): ExperimentPlanRecord[] {
  return records.filter((record) => {
    if (query.suite && record.suite !== query.suite) return false;
    if (query.status && record.status !== query.status) return false;
    if (query.tag && !record.tags?.includes(query.tag)) return false;
    if (query.schemaId && record.schemaId !== query.schemaId) return false;
    if (query.templateId && record.templateId !== query.templateId) return false;
    if (query.favorite !== undefined && record.favorite !== query.favorite) return false;
    if (query.hasFailures !== undefined && record.plannedExperiments.some((item) => item.status === "failed") !== query.hasFailures) return false;
    if (query.text && !`${record.planName} ${record.suite} ${record.notes || ""}`.toLowerCase().includes(query.text.toLowerCase())) return false;
    return true;
  });
}

export function tagPlan(record: ExperimentPlanRecord, tag: string, enabled = true): ExperimentPlanRecord {
  const tags = new Set(record.tags || []);
  if (enabled) tags.add(tag); else tags.delete(tag);
  return { ...record, tags: Array.from(tags), updatedAt: new Date().toISOString() };
}

export function computePlanResultCoverage(plan: ExperimentPlanRecord, lifecycles: Array<{ experimentId?: string; experimentKey?: string; runKey?: string; state?: string; status?: string }> = [], results: Array<{ experimentId: string; runKey?: string; metrics: Record<string, { value: unknown }>; primaryMetric?: string; status?: string }> = [], primaryMetric = "DSC"): PlanResultCoverage {
  const aliasesByExperiment = plan.plannedExperiments.map((item) => planExperimentAliases(item));
  const allAliases = new Set(aliasesByExperiment.flatMap((aliases) => Array.from(aliases)));
  const completed = lifecycles.filter((item) => planRecordMatchesAliases(item, allAliases) && ["completed", "archived"].includes(String(item.state || item.status))).length;
  const parsed = results.filter((item) => planRecordMatchesAliases(item, allAliases) && item.status !== "parse_failed");
  const missingPrimaryMetric = plan.plannedExperiments.filter((item, index) => {
    const aliases = aliasesByExperiment[index] || planExperimentAliases(item);
    return !parsed.some((result) => planRecordMatchesAliases(result, aliases) && result.metrics[primaryMetric]);
  }).map((item) => item.experimentKey);
  const bestByMetric: PlanResultCoverage["bestByMetric"] = {};
  for (const result of parsed) for (const [metric, value] of Object.entries(result.metrics)) {
    const n = Number(value.value);
    if (Number.isFinite(n) && (!bestByMetric[metric] || n > bestByMetric[metric].value)) bestByMetric[metric] = { experimentId: result.experimentId, value: n };
  }
  return { planId: plan.planId, experimentCount: plan.experimentCount, completedCount: completed, parsedResultCount: parsed.length, missingResultCount: Math.max(0, plan.experimentCount - parsed.length), missingPrimaryMetric, bestByMetric };
}

function planExperimentAliases(item: PlannedExperiment): Set<string> {
  return new Set([item.experimentKey, item.runKey, item.name].map((value) => String(value || "").trim()).filter(Boolean));
}

function planRecordMatchesAliases(item: { experimentId?: string; experimentKey?: string; runKey?: string }, aliases: Set<string>): boolean {
  return [item.experimentKey, item.experimentId, item.runKey].some((value) => aliases.has(String(value || "").trim()));
}

export function dependencyBlockedReasons(plan: ExperimentPlanRecord, completedIds: Iterable<string>, metrics: Record<string, Record<string, number>> = {}): Record<string, string[]> {
  const completed = new Set(completedIds);
  const blocked: Record<string, string[]> = {};
  for (const dep of plan.dependencies || []) {
    let ok = false;
    if (dep.condition.type === "completed") ok = completed.has(dep.from);
    if (dep.condition.type === "manual_approval") ok = false;
    if (dep.condition.type === "metric_threshold") {
      const value = metrics[dep.from]?.[dep.condition.metric];
      ok = dep.condition.op === ">=" ? value >= dep.condition.value : value <= dep.condition.value;
    }
    if (!ok) blocked[dep.to] = [...(blocked[dep.to] || []), `blocked by ${dep.from}:${dep.condition.type}`];
  }
  return blocked;
}

export function readPlanConfigJson<T>(text: string, validate: (value: unknown) => value is T, lastKnownGood: T): { ok: true; value: T } | { ok: false; value: T; error: string } {
  try {
    const parsed = JSON.parse(text);
    return validate(parsed) ? { ok: true, value: parsed } : { ok: false, value: lastKnownGood, error: "schema validation failed" };
  } catch (error) {
    return { ok: false, value: lastKnownGood, error: error instanceof Error ? error.message : String(error) };
  }
}

function gridCombinations(variables: Array<{ name: string; values?: unknown[] }>): Record<string, string>[] {
  let rows: Record<string, string>[] = [{}];
  for (const variable of variables) {
    const next: Record<string, string>[] = [];
    for (const row of rows) for (const value of variable.values || []) next.push({ ...row, [variable.name]: String(value) });
    rows = next;
  }
  return rows.length ? rows : [{}];
}

function pairedCombinations(variables: Array<{ name: string; values?: unknown[] }>): Record<string, string>[] {
  const length = Math.max(...variables.map((item) => item.values?.length || 0));
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < length; i++) {
    const row: Record<string, string> = {};
    for (const variable of variables) row[variable.name] = String(variable.values?.[Math.min(i, (variable.values?.length || 1) - 1)] || "");
    rows.push(row);
  }
  return rows;
}

function experimentName(suite: string, overrides: Record<string, unknown>): string {
  const body = Object.entries(overrides).map(([key, value]) => `${key}-${String(value).replace(/[^a-zA-Z0-9_.-]/g, "_")}`).join("__");
  return `${suite}__${body}`;
}

function quoteYaml(value: string): string {
  return JSON.stringify(value);
}

function template(id: string, name: string, schemaId: string, relativePath: string): PlanTemplate {
  return {
    schemaVersion: 1,
    id,
    name,
    schemaId,
    templateType: "yaml_template",
    variables: [
      { key: "suite", label: "Suite", type: "string", mode: "single", required: true },
      { key: "base_config", label: "Base config", type: "string", mode: "single", defaultValue: "configs/base.yaml" },
      { key: "dataset", label: "Dataset", type: "string", mode: "single" },
      { key: "seed", label: "Seed", type: "string", mode: "grid", values: ["1", "2", "3"] },
    ],
    files: [{
      relativePath: `zlk_cluster/plans/generated/${relativePath}`,
      contentTemplate: [
        "suite: {{suite}}",
        "mode: train_test",
        "base_config: {{base_config}}",
        "dataset: {{dataset}}",
        "seeds: [{{seed}}]",
        "cases:",
        "  - name: {{suite}}_{{dataset}}_seed{{seed}}",
      ].join("\n"),
      overwritePolicy: "prompt",
    }],
    defaultTags: [schemaId],
    resultParserPresetId: schemaId.includes("medical") ? "medical_segmentation_long_csv" : "generic_metric_long_csv",
    resultSchemaId: schemaId.includes("medical") ? "medical_segmentation" : undefined,
  };
}

function varToLegacy(variable: PlanMatrix["variables"][number]): { name: string; values?: unknown[] } {
  return { name: variable.key, values: variable.values };
}

function renderTemplate(text: string, values: Record<string, unknown>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => String(values[key] ?? ""));
}

function planCaseLabelValue(text: string): string {
  const match = text.match(/^(?:case|name|id)\s*:\s*(.+)$/);
  if (match) return stripYamlScalar(match[1]);
  const inlineMap = text.match(/^\{\s*(.+?)\s*\}$/)?.[1] || text;
  for (const key of ["case", "name", "id"]) {
    const inline = inlineMap.match(new RegExp(`(?:^|,)\\s*${key}\\s*:\\s*("[^"]+"|'[^']+'|[^,#{}]+)`));
    if (inline) return stripYamlScalar(inline[1]);
  }
  return "";
}

function stripYamlScalar(value: string): string {
  const trimmed = value.replace(/\s+#.*$/, "").trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function renderNamingRule(pattern: string | undefined, suite: string, row: Record<string, unknown>): string {
  return pattern ? renderTemplate(pattern, { suite, ...row }) : "";
}

function evaluateValueExpression(expression: string, row: Record<string, unknown>): unknown {
  const trimmed = expression.trim();
  if (!trimmed) return undefined;
  const ref = trimmed.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
  if (ref) return row[trimmed];
  const arithmetic = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*([*+\-/])\s*([a-zA-Z0-9_.-]+)$/);
  if (arithmetic) {
    const a = Number(resolveToken(arithmetic[1], row));
    const b = Number(resolveToken(arithmetic[3], row));
    if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
    if (arithmetic[2] === "*") return a * b;
    if (arithmetic[2] === "+") return a + b;
    if (arithmetic[2] === "-") return a - b;
    return b === 0 ? undefined : a / b;
  }
  return trimmed.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => String(row[key] ?? ""));
}

function evaluateConstraint(expression: string, row: Record<string, unknown>): boolean {
  const implication = expression.split(/\s*->\s*/);
  if (implication.length === 2) return !evaluateCondition(implication[0], row) || evaluateCondition(implication[1], row);
  return evaluateCondition(expression, row);
}

function evaluateCondition(expression: string, row: Record<string, unknown>): boolean {
  const match = expression.trim().match(/^([a-zA-Z0-9_.-]+)(?:\s*([*])\s*([a-zA-Z0-9_.-]+))?\s*(==|!=|>=|<=|>|<)\s*["']?([^"']+)["']?$/);
  if (!match) throw new Error(`Invalid plan expression: ${expression}`);
  const leftValue = match[2] ? Number(resolveToken(match[1], row)) * Number(resolveToken(match[3], row)) : resolveToken(match[1], row);
  const rightValue = resolveToken(match[5], row);
  return compare(leftValue, match[4], rightValue);
}

function resolveToken(token: string, row: Record<string, unknown>): unknown {
  if (Object.prototype.hasOwnProperty.call(row, token)) return row[token];
  const n = Number(token);
  return Number.isFinite(n) ? n : token;
}

function compare(left: unknown, op: string, right: unknown): boolean {
  if ([">", "<", ">=", "<="].includes(op)) {
    const a = Number(left);
    const b = Number(right);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    if (op === ">") return a > b;
    if (op === "<") return a < b;
    if (op === ">=") return a >= b;
    return a <= b;
  }
  return op === "==" ? String(left) === String(right) : String(left) !== String(right);
}

function matrixPreviewCsv(experiments: GeneratedExperiment[]): string {
  const keys = Array.from(new Set(experiments.flatMap((item) => Object.keys(item.configOverrides))));
  const rows = [["experimentIndex", "experimentKey", "name", "runKey", ...keys], ...experiments.map((item) => [item.experimentIndex, item.experimentKey || "", item.name, item.runKey, ...keys.map((key) => String(item.configOverrides[key] ?? ""))])];
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function scalar(text: string, key: string): string | undefined {
  const match = text.match(new RegExp(`^${key}:\\s*["']?([^"'#\\n]+)["']?`, "m"));
  return match?.[1]?.trim();
}

function stablePlanId(planFile: string, suite: string): string {
  return `plan_${sha256(`${suite}:${planFile}`).slice(0, 12)}`;
}

function pathName(file: string): string {
  return file.replace(/\\/g, "/").split("/").pop() || file;
}

function stripExt(file: string): string {
  return pathName(file).replace(/\.[^.]+$/, "");
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function mergeRevisions(a: PlanRevision[] = [], b: PlanRevision[] = []): PlanRevision[] {
  const map = new Map([...a, ...b].map((item) => [item.revisionId, item]));
  return Array.from(map.values()).sort((x, y) => x.createdAt.localeCompare(y.createdAt));
}

function planIssue(id: string, severity: PlanValidationIssue["severity"], path: string, message: string, suggestion?: string): PlanValidationIssue {
  return { id, severity, path, message, suggestion };
}

function multiply(value: number | undefined, count: number): number | undefined {
  return value === undefined ? undefined : value * count;
}

function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.:-]/g, "_");
}

function sortObject(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(input).sort().map((key) => [key, input[key]]));
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

