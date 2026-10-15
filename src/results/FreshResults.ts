import { createHash } from "node:crypto";
import { verifyNativeResult } from "./NativeResultManifest";
import * as Tables from "./ProjectResultTables";

export type ResultDeclaration = { planFile: string; index: number; case: string; seed: number; output_dir: string; result_csv: string; mode: string };
export type ResultPlan = { planFile: string; revision: string; mode: string; seeds: number[]; jobs: ResultDeclaration[] };
export type ResultSource = { remotePath: string; bytes: number; sha256: string };
export type ResultJob = { planFile: string; index: number; case: string; seed: number; outputDir: string; state: string;
  executionState?: string; commandId?: string; workerId?: string; sources?: ResultSource[]; error?: string };
export type FreshResult = { observedAt: string; jobs: ResultJob[]; records: Tables.SeedRecord[]; errors: string[]; querySucceeded: boolean };

export function resultPath(value: string): string {
  if (!value || value.startsWith("/") || /[:\\\x00-\x1f*?]/.test(value)
    || value.split("/").some(part => !part || [".", "..", ".git", "clean_dir"].includes(part))) throw Error("RESULT_PATH_INVALID: " + value);
  return value;
}
export const resultDigest = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

/** Each invocation owns its inputs. No disk registry, previous rows, or queue can fill a missing result. */
export async function collectFreshResults(plans: ResultPlan[], snapshots: any[], receive: (workerId: string, files: ResultSource[]) => Promise<any[]>,
  parse: (text: string, job: ResultDeclaration) => any[], mappings: Record<string, any> = {}, current = () => true): Promise<FreshResult> {
  const result: FreshResult = { observedAt: new Date().toISOString(), jobs: [], records: [], errors: [], querySucceeded: false };
  const online = snapshots.filter(row => row.queryComplete === true && !row.error);
  result.errors = snapshots.filter(row => !online.includes(row)).map(row => row.workerId + "：" + (row.error || "实时查询未完成"));
  result.querySucceeded = online.length > 0;
  for (const plan of plans) for (const job of plan.jobs) {
    if (!current()) throw Error("结果查询已取消或工作区已变化");
    resultPath(job.output_dir); if (job.result_csv) resultPath(job.result_csv);
    const item: ResultJob = { planFile: plan.planFile, index: job.index, case: job.case, seed: job.seed, outputDir: job.output_dir, state: "unknown" };
    result.jobs.push(item);
    const tasks = online.flatMap(snapshot => (snapshot.tasks || []).filter((task: any) => task.outputDir === job.output_dir));
    if (tasks.some(task => task.observation?.queryError || task.observation?.tmux && !task.observation.tmux.dead)) {
      item.state = "incomplete"; item.executionState = tasks.some(task => task.observation?.queryError) ? "unknown" : "running"; continue;
    }
    const candidates = online.flatMap(snapshot => (snapshot.declaredResults || [])
      .filter((row: any) => row.outputDir === job.output_dir && row.index === job.index)
      .map((row: any) => ({ ...row, workerId: snapshot.workerId })));
    const valid = candidates.filter(row => row.completed === true && row.runId && Array.isArray(row.files) && row.files.length);
    if (!valid.length) {
      const issues = candidates.filter(row => row.error);
      item.state = issues.length || candidates.length < snapshots.length ? "unknown"
        : candidates.every(row => row.resultState === "missing") ? "missing" : "incomplete";
      item.error = issues.map(row => row.workerId + "：" + row.error).join("；") || undefined; continue;
    }
    const signatures = new Set(valid.map(row => JSON.stringify([row.runId, row.files.map((file: ResultSource) => [file.remotePath, file.bytes, file.sha256])])));
    if (signatures.size !== 1) { item.state = "conflict"; item.error = "服务器副本的执行身份或指标内容冲突"; continue; }
    for (const source of valid) {
      try {
        const manifestPath = job.output_dir + "/artifact_manifest.json";
        const needed = [manifestPath, ...(job.mode === "train" ? [] : [job.result_csv])];
        if (source.files.length !== needed.length || source.files.some((file: ResultSource) => !needed.includes(resultPath(file.remotePath))
          || !Number.isSafeInteger(file.bytes) || file.bytes <= 0 || file.bytes > 4 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(file.sha256)))
          throw Error("RESULT_FILES_INVALID");
        const files = await receive(source.workerId, source.files);
        if (files.length !== needed.length || new Set(files.map(file => file.remotePath)).size !== needed.length) throw Error("RESULT_FILES_INCOMPLETE");
        for (const file of files) {
          const expected = source.files.find((row: ResultSource) => row.remotePath === file.remotePath);
          if (!expected || typeof file.text !== "string" || Buffer.byteLength(file.text, "utf8") !== expected.bytes || resultDigest(file.text) !== expected.sha256)
            throw Error("RESULT_CONTENT_CHANGED: " + file.remotePath);
        }
        const manifest = files.find(file => file.remotePath === manifestPath)!;
        const report = verifyNativeResult(manifest.text, resultDigest(manifest.text), { commandId: source.runId, index: job.index, case: job.case,
          seed: job.seed, outputDir: job.output_dir, collectionResultCsv: job.result_csv }, job.mode);
        if (report.planFile && report.planFile !== job.planFile) throw Error("RESULT_MANIFEST_PLAN_MISMATCH");
        const metricProof = source.files.find((file: ResultSource) => file.remotePath === job.result_csv);
        if (metricProof && report.sha256?.[job.result_csv] && report.sha256[job.result_csv] !== metricProof.sha256) throw Error("RESULT_METRIC_HASH_CHANGED");
        const rows = job.mode === "train" ? [] : parse(files.find(file => file.remotePath === job.result_csv)!.text, job);
        if (job.mode !== "train" && !rows.length) throw Error("RESULT_METRICS_EMPTY");
        const records: Tables.SeedRecord[] = rows.map(row => {
          const dims = row.dimensions || {};
          if (String(dims.case) !== job.case || String(dims.seed) !== String(job.seed)) throw Error("RESULT_METRIC_JOB_MISMATCH");
          const metrics: Record<string, number> = {};
          for (const [key, raw] of Object.entries(row.metrics || {})) {
            const value = (raw as any)?.value ?? raw;
            if (value !== "" && value != null && Number.isFinite(Number(value))) metrics[key] = Number(value);
          }
          const trainRate = Number(dims.train_rate);
          const rate = dims.rate_percent || (dims.train_rate !== "" && dims.train_rate != null && Number.isFinite(trainRate)
            ? String(Number((trainRate * (Math.abs(trainRate) <= 1 ? 100 : 1)).toPrecision(12))) : "");
          const mapped = mappings[plan.planFile]?.datasets;
          return { planFile: plan.planFile, workerId: source.workerId, case: job.case, seed: String(job.seed),
            method: dims.method || plan.planFile.split("/").pop()!.replace(/\.ya?ml$/i, ""),
            dataset: dims.dataset || (mapped?.length === 1 ? mapped[0] : ""), rate, endpoint: dims.eval_protocol || dims.split || "",
            metrics, runId: source.runId, revision: plan.revision, jobDir: job.output_dir };
        });
        if (records.length) {
          const check = Tables.emptyTableRegistry();
          check.plans[plan.planFile] = { revision: plan.revision, expectedSeeds: 1, records };
          Tables.buildTables(check, { partial: true });
        }
        item.state = "complete"; item.commandId = source.runId; item.workerId = source.workerId; item.sources = source.files;
        const panes = tasks.filter(task => task.commandId === source.runId).map(task => task.observation?.tmux).filter(Boolean);
        item.executionState = panes.some(pane => pane.exitCode != null && pane.exitCode !== 0) ? "failed"
          : panes.some(pane => pane.exitCode === 0) ? "exited" : panes.length ? "unknown" : "missing";
        if (item.executionState === "failed") result.errors.push(plan.planFile + " · " + job.case + "/" + job.seed + "：执行以非零退出码结束；产物状态单独显示为完整。");
        result.records.push(...records); item.error = undefined; break;
      } catch (error: any) { item.state = "unknown"; item.error = source.workerId + "：" + String(error.message || error); }
    }
  }
  return result;
}

/** Reuse the established metric aliases, grouping, derived metrics and sample standard deviation. */
export function freshResultTables(result: FreshResult, plans: ResultPlan[], derivedMetric?: Tables.DerivedMetric) {
  const registry = Tables.emptyTableRegistry(); registry.derivedMetric = derivedMetric;
  for (const plan of plans) registry.plans[plan.planFile] = { revision: plan.revision, expectedSeeds: plan.seeds.length,
    records: result.records.filter(row => row.planFile === plan.planFile) };
  return Tables.buildTables(registry, { partial: true });
}
