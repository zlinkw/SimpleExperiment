import { ComparisonStudyRecord } from "./Comparison";
import { ExperimentPlanRecord, importLegacyPlanYamlToRegistry } from "./PlanBuilder";
import { ExperimentResultRecord } from "./Results";

export type ExperimentScaleMode = "small" | "medium" | "custom";

export interface SmallScaleSettings {
  scaleMode: ExperimentScaleMode;
  maxConcurrentExperiments: number;
  maxVisibleExperimentsWithoutPaging: number;
  useFileBasedRegistryOnly: boolean;
  enableHeavyIndexing: boolean;
  enableExternalDatabase: boolean;
  autoRefreshResultsAfterRun: boolean;
}

export const defaultSmallScaleSettings: SmallScaleSettings = {
  scaleMode: "small",
  maxConcurrentExperiments: 10,
  maxVisibleExperimentsWithoutPaging: 200,
  useFileBasedRegistryOnly: true,
  enableHeavyIndexing: false,
  enableExternalDatabase: false,
  autoRefreshResultsAfterRun: true,
};

export interface CompletenessMatrixConfig {
  id: string;
  name: string;
  scope: { planId?: string; studyId?: string; suite?: string };
  axes: Array<"method" | "dataset" | "split" | "fold" | "seed" | "missing_rate" | "noise_level">;
  requiredMetrics: string[];
}

export interface CompletenessCell {
  key: Record<string, string | number | boolean>;
  status: "not_planned" | "planned" | "queued" | "running" | "completed_no_result" | "parse_failed" | "result_available" | "ready_for_analysis" | "excluded";
  experimentIds: string[];
  resultIds: string[];
  missingMetrics?: string[];
  warnings?: string[];
}

export interface MissingRerunOptions {
  sourceStudyId?: string;
  sourcePlanId?: string;
  completenessMatrixId?: string;
  missingTypes: Array<"not_planned" | "failed" | "completed_no_result" | "parse_failed" | "missing_primary_metric">;
  skipLockedResults: boolean;
  keepSameSeed: boolean;
  keepSameSplit: boolean;
  generateNewAttemptId: boolean;
}

export function normalizeSmallScaleSettings(input: Partial<SmallScaleSettings> = {}): SmallScaleSettings {
  return {
    ...defaultSmallScaleSettings,
    ...input,
    maxConcurrentExperiments: Math.min(input.maxConcurrentExperiments ?? defaultSmallScaleSettings.maxConcurrentExperiments, 10),
    useFileBasedRegistryOnly: true,
    enableHeavyIndexing: false,
    enableExternalDatabase: false,
  };
}

export function buildCompletenessMatrix(config: CompletenessMatrixConfig, input: { plans?: ExperimentPlanRecord[]; studies?: ComparisonStudyRecord[]; results?: ExperimentResultRecord[]; lifecycles?: Array<{ experimentId: string; status?: string; state?: string }> }): CompletenessCell[] {
  const plans = (input.plans || []).filter((plan) => (!config.scope.planId || plan.planId === config.scope.planId) && (!config.scope.suite || plan.suite === config.scope.suite));
  const study = (input.studies || []).find((item) => item.studyId === config.scope.studyId);
  const planned = [
    ...plans.flatMap((plan) => plan.plannedExperiments.map((exp) => ({ ...dimsFromRun(exp.runKey), experimentId: exp.experimentKey, status: exp.status || "planned" }))),
    ...(study ? study.methods.flatMap((method) => study.datasets.flatMap((dataset) => study.splits.flatMap((split) => study.seeds.map((seed) => ({ method: method.methodId, dataset: dataset.name, split: split.name, seed, experimentId: `${study.studyId}:${method.methodId}:${dataset.name}:${split.name}:${seed}`, status: "planned" as const }))))) : []),
  ];
  const planKeys = new Map<string, typeof planned>();
  for (const item of planned) {
    const key = keyFor(config.axes, item);
    const plannedItems = planKeys.get(key);
    if (plannedItems) plannedItems.push(item);
    else planKeys.set(key, [item]);
  }
  const resultKeys = new Map<string, ExperimentResultRecord[]>();
  for (const record of input.results || []) {
    if (config.scope.suite && record.suite !== config.scope.suite) continue;
    const key = keyFor(config.axes, { ...record.dimensions, ...dimsFromRun(record.runKey) });
    const records = resultKeys.get(key);
    if (records) records.push(record);
    else resultKeys.set(key, [record]);
  }
  type Lifecycle = NonNullable<typeof input.lifecycles>[number];
  const lifecyclesByExperiment = new Map<string, Array<{ order: number; value: Lifecycle }>>();
  for (const [order, value] of (input.lifecycles || []).entries()) {
    const lifecycles = lifecyclesByExperiment.get(value.experimentId);
    if (lifecycles) lifecycles.push({ order, value });
    else lifecyclesByExperiment.set(value.experimentId, [{ order, value }]);
  }
  const allKeys = new Set([...planKeys.keys(), ...resultKeys.keys()]);
  return Array.from(allKeys).map((key) => {
    const plannedItems = planKeys.get(key) || [];
    const records = resultKeys.get(key) || [];
    const missingMetrics = Array.from(new Set(records.flatMap((record) => config.requiredMetrics.filter((metric) => !record.metrics[metric]))));
    const lifecycle = Array.from(new Set(plannedItems.map((item) => String(item.experimentId))))
      .flatMap((experimentId) => lifecyclesByExperiment.get(experimentId) || [])
      .sort((left, right) => left.order - right.order)
      .map((entry) => entry.value);
    const status = completenessStatus(plannedItems, records, lifecycle, missingMetrics);
    return { key: parseKey(key), status, experimentIds: Array.from(new Set([...plannedItems.map((item) => String(item.experimentId)), ...records.map((record) => record.experimentId)])), resultIds: records.map((record) => record.resultId), missingMetrics };
  }).sort((a, b) => JSON.stringify(a.key).localeCompare(JSON.stringify(b.key)));
}

export function completenessMatrixToMarkdown(cells: CompletenessCell[]): string {
  const headers = ["Key", "Status", "Experiments", "Results", "Missing"];
  const rows = cells.map((cell) => [JSON.stringify(cell.key), cell.status, cell.experimentIds.join(";"), cell.resultIds.join(";"), (cell.missingMetrics || []).join(";")]);
  return [headers.join(" | "), headers.map(() => "---").join(" | "), ...rows.map((row) => row.join(" | "))].join("\n");
}

export function completenessMatrixToCsv(cells: CompletenessCell[]): string {
  return [["key", "status", "experimentIds", "resultIds", "missingMetrics"], ...cells.map((cell) => [JSON.stringify(cell.key), cell.status, cell.experimentIds.join(";"), cell.resultIds.join(";"), (cell.missingMetrics || []).join(";")])].map((row) => row.map(csvEscape).join(",")).join("\n");
}

export function generateMissingOnlyRerunPlan(cells: CompletenessCell[], options: MissingRerunOptions): ExperimentPlanRecord {
  const selected = cells.filter((cell) => shouldRerunCell(cell, options));
  const suite = `missing_rerun_${Date.now()}`;
  const yaml = [
    `suite: ${JSON.stringify(suite)}`,
    "mode: train_test",
    "runner:",
    "  result_path_policy: declared",
    "base_config: configs/base.yaml",
    `parent_plan_id: ${JSON.stringify(options.sourcePlanId || "")}`,
    `parent_study_id: ${JSON.stringify(options.sourceStudyId || "")}`,
    "cases:",
    ...selected.map((cell, index) => [
      `  - name: ${JSON.stringify(`rerun_${index}_${Object.values(cell.key).join("_")}`)}`,
      "    overrides:",
      ...Object.entries(cell.key).map(([key, value]) => `      ${key}: ${JSON.stringify(String(value))}`),
    ].join("\n")),
  ].join("\n") + "\n";
  const record = importLegacyPlanYamlToRegistry(`simple_cluster/plans/generated/${suite}.yaml`, yaml);
  record.source = { type: "cloned", generatedFrom: options.sourcePlanId || options.sourceStudyId };
  record.provenance.parentPlanId = options.sourcePlanId;
  record.provenance.parentRevisionId = options.completenessMatrixId;
  return record;
}

function completenessStatus(plannedItems: Array<{ status?: string }>, records: ExperimentResultRecord[], lifecycle: Array<{ status?: string; state?: string }>, missingMetrics: string[]): CompletenessCell["status"] {
  if (!plannedItems.length && !records.length) return "not_planned";
  if (records.some((record) => record.status === "excluded")) return "excluded";
  if (records.some((record) => record.status === "parse_failed")) return "parse_failed";
  if (records.length && missingMetrics.length) return "result_available";
  if (records.length) return "ready_for_analysis";
  if (lifecycle.some((item) => ["completed", "archived"].includes(String(item.status || item.state)))) return "completed_no_result";
  if (lifecycle.some((item) => ["running"].includes(String(item.status || item.state))) || plannedItems.some((item) => item.status === "running")) return "running";
  if (plannedItems.some((item) => item.status === "queued")) return "queued";
  return "planned";
}

function shouldRerunCell(cell: CompletenessCell, options: MissingRerunOptions): boolean {
  if (options.missingTypes.includes(cell.status as any)) return true;
  if (options.missingTypes.includes("missing_primary_metric") && (cell.missingMetrics || []).length) return true;
  return false;
}

function dimsFromRun(runKey: string): Record<string, string> {
  const text = runKey.toLowerCase();
  const out: Record<string, string> = {};
  for (const key of ["method", "dataset", "split", "fold", "seed", "missing_rate", "noise_level"]) {
    const match = text.match(new RegExp(`${key}[-_:]([^_:/]+)`));
    if (match) out[key] = match[1];
  }
  return out;
}

function keyFor(axes: CompletenessMatrixConfig["axes"], values: Record<string, unknown>): string {
  return axes.map((axis) => `${axis}=${String(values[axis] ?? "")}`).join("|");
}

function parseKey(key: string): Record<string, string> {
  return Object.fromEntries(key.split("|").map((part) => {
    const [k, ...rest] = part.split("=");
    return [k, rest.join("=")];
  }));
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
