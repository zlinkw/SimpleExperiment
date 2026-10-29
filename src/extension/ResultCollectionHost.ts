import * as fs from "node:fs/promises";
import * as path from "node:path";
import { collectFreshResults, freshResultTables, resultDigest, resultPath, transientResultReadError, type ResultPlan, type ResultSource } from "../results/FreshResults";
import { publishLatestResult } from "../results/LatestResultExport";
import { newestJobOutputs } from "../features/LatestJobArtifacts";
import { retryRequestSignal } from "../core/SafeRequestRetry";
import { canonicalMetricName } from "../results/ProjectResultTables";

const hosts = new WeakMap<object, ResultCollectionHost>();
export type ResultReadProgress = { message: string };
type ReadOptions = { planFiles?: string[]; automatic?: boolean; onProgress?: (progress: ResultReadProgress) => void };
const cancelled = (signal?: AbortSignal) => Object.assign(Error("结果查询已取消"), { name: "AbortError", cause: signal?.reason });
export function resultCollectionHost(host: any): ResultCollectionHost {
  let service = hosts.get(host);
  if (!service) { service = new ResultCollectionHost(host); hosts.set(host, service); }
  return service;
}
export class ResultCollectionHost {
  private request?: Promise<any>;
  private requestKey = "";
  private requestController?: AbortController;
  private readers = new Map<object, ReadOptions["onProgress"]>();
  private lastProgress?: ResultReadProgress;
  private automaticController?: AbortController;
  private automaticRequest?: Promise<any>;
  private again = false;
  private timer?: ReturnType<typeof setTimeout>;
  private seen = new Set<string>();
  private scope = "";
  private visibleScope = "";
  constructor(private readonly h: any) {}
  private automaticAllowed() { return !this.h.panelDisposed && this.h.lowTrafficMode !== true && this.h.effectiveTrafficPolicy?.().displayAutoRefresh !== false; }
  suspendAutomatic() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined; this.again = false; this.visibleScope = "";
    this.automaticController?.abort();
  }
  refreshAutomatic(): Promise<any> {
    if (!this.automaticAllowed()) return Promise.resolve(undefined);
    if (this.automaticRequest) return this.automaticRequest;
    const controller = new AbortController(); this.automaticController = controller;
    const run = this.update(controller.signal, { automatic: true }).catch(error => {
      if (controller.signal.aborted) return undefined;
      throw error;
    }).finally(() => {
      if (this.automaticController === controller) { this.automaticController = undefined; this.automaticRequest = undefined; }
    });
    this.automaticRequest = run; return run;
  }
  refreshOnVisible() {
    if (!this.automaticAllowed()) return;
    const context = this.h.captureProjectContext();
    const key = context.root + ":" + context.generation;
    if (this.visibleScope === key) return;
    this.visibleScope = key;
    if (this.request) return;
    void this.refreshAutomatic().catch((error: any) => this.h.recordActionError?.({ command: "updateResultSummary", message: String(error.message || error) }));
  }
  observe(snapshot: any) {
    if (!this.automaticAllowed() || snapshot.queryComplete !== true || snapshot.capabilities?.resultCollection !== 1) return;
    const scope = this.h.captureProjectContext().root || "";
    if (scope !== this.scope) { this.scope = scope; this.seen.clear(); }
    const completed = (snapshot.tasks || []).filter((task: any) => task.observation?.result?.verified === true
      && task.observation.result.runId === task.commandId && task.observation.result.status === "completed"
      && (!task.observation.tmux || task.observation.tmux.dead === true));
    const keys = completed.map((task: any) => scope + "\0" + snapshot.workerId + "\0" + task.commandId + ":" + task.runtimeDiagnostics?.state + ":" + task.runtimeDiagnostics?.scanComplete + ":" + task.runtimeDiagnostics?.count);
    const fresh = keys.filter((key: string) => !this.seen.has(key));
    if (!fresh.length) return;
    fresh.forEach((key: string) => this.seen.add(key));
    this.again = true;
    if (this.timer || this.request) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (!this.automaticAllowed() || this.h.captureProjectContext().root !== scope) return;
      void this.refreshAutomatic().then((report: any) => { if (!report?.current) fresh.forEach((key: string) => this.seen.delete(key)); }).catch((error: any) => {
        fresh.forEach((key: string) => this.seen.delete(key));
        this.h.recordActionError?.({ command: "updateResultSummary", message: String(error.message || error) });
      });
    }, 250);
    this.timer.unref?.();
  }
  private waitFor<T>(run: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return run;
    if (signal.aborted) return Promise.reject(cancelled(signal));
    return new Promise<T>((resolve, reject) => {
      const cancel = () => { signal.removeEventListener("abort", cancel); reject(cancelled(signal)); };
      signal.addEventListener("abort", cancel, { once: true });
      run.then(value => { signal.removeEventListener("abort", cancel); resolve(value); }, error => { signal.removeEventListener("abort", cancel); reject(error); });
    });
  }
  private subscribe(run: Promise<any>, signal: AbortSignal | undefined, onProgress: ReadOptions["onProgress"]) {
    const reader = {};
    this.readers.set(reader, onProgress);
    if (this.lastProgress) { try { onProgress?.(this.lastProgress); } catch { /* display observers cannot change a query */ } }
    return this.waitFor(run, signal).finally(() => {
      this.readers.delete(reader);
      if (this.request === run && this.readers.size === 0) this.requestController?.abort();
    });
  }
  private report(progress: ResultReadProgress) {
    this.lastProgress = progress;
    for (const observer of this.readers.values()) { try { observer?.(progress); } catch { /* display only */ } }
  }
  async update(signal?: AbortSignal, options: ReadOptions = {}): Promise<any> {
    if (signal?.aborted) throw cancelled(signal);
    if (options.automatic && !this.automaticAllowed()) return undefined;
    const context = this.h.captureProjectContext();
    const key = JSON.stringify([context.root, context.generation, [...new Set(options.planFiles || [])].sort()]);
    if (this.request) {
      if (this.requestKey === key && !this.requestController?.signal.aborted) return this.subscribe(this.request, signal, options.onProgress);
      await this.waitFor(this.request.then(() => undefined, () => undefined), signal);
      const next = this.h.captureProjectContext();
      if (next.root !== context.root || next.generation !== context.generation) throw Error("项目已变化，取消等待中的结果查询。");
      return this.update(signal, options);
    }
    this.again = false;
    const controller = new AbortController();
    this.requestController = controller; this.lastProgress = undefined;
    const run = this.collect(controller.signal, options.planFiles).finally(() => {
      if (this.request === run) { this.request = undefined; this.requestController = undefined; }
      // New completions request a separate refresh; they cannot keep the current
      // user's request open through an unbounded sequence of full collections.
      if (this.again && !this.timer && !controller.signal.aborted && this.automaticAllowed()) {
        this.timer = setTimeout(() => {
          this.timer = undefined;
          if (!this.automaticAllowed()) return;
          void this.refreshAutomatic().catch((error: any) => {
            this.seen.clear();
            this.h.recordActionError?.({ command: "updateResultSummary", message: String(error.message || error) });
          });
        }, 250);
        this.timer.unref?.();
      }
    });
    this.request = run; this.requestKey = key;
    return this.subscribe(run, signal, options.onProgress);
  }
  private async collect(signal?: AbortSignal, selection?: string[]) {
    this.report({ message: "读取本机 PLAN 声明…" });
    const h = this.h, context = h.captureProjectContext(), root = context.root;
    if (!root) throw Error("请先打开当前实验项目。");
    // Sync destinations carry transport identity. The selected task environment
    // belongs to execution targets (including the global Conda fallback).
    const currentTargets = () => {
      const execution = h.workerActionTargets?.() || [];
      return h.workerCodeSyncTargets().map((worker: any) => {
        const task = execution.find((row: any) => row.id === worker.id);
        return {...worker,condaEnv:String(task?.condaEnv ?? task?.conda_env ?? worker.condaEnv ?? "")};
      });
    };
    const targets = currentTargets();
    const projectKey = (value: string) => {
      const normalized = String(value || "").replaceAll("\\", "/");
      return process.platform === "win32" ? normalized.toLowerCase() : normalized;
    };
    const queuedPlans = () => (h.distributedQueueCache?.plans || []).filter((plan: any) => projectKey(plan.projectId) === projectKey(root));
    const runBindings = () => newestJobOutputs({ plans: queuedPlans() }).map(({ plan, job }) => ({
      planFile: plan.planFile, workflowId: plan.id, revision: plan.revision, codeFingerprint: plan.codeFingerprint,
      index: job.index, case: job.case, seed: job.seed, outputDir: job.outputDir, collectionResultCsv: job.collectionResultCsv,
      commandId: job.commandId, workerId: job.workerId }));
    let owners: string | undefined;
    const key = () => JSON.stringify(currentTargets().map((row: any) => [row.id, row.host, row.user, row.port, row.remotePath, row.condaEnv]));
    const binding = key();
    const signals = [signal, context.signal, retryRequestSignal()].filter(Boolean) as AbortSignal[];
    const requestSignal = signals.length ? AbortSignal.any(signals) : undefined;
    const current = () => !requestSignal?.aborted && h.projectContextIsCurrent(context) && key() === binding
      && (owners === undefined || owners === JSON.stringify(runBindings()));
    const check = () => { if (!current()) throw Error("结果查询已取消或项目/服务器配置已变化。"); };
    const retryRead = async <T>(read: () => Promise<T>, attempts = 3): Promise<T> => {
      for (let attempt = 0; ; attempt++) {
        check();
        try { const result = await read(); check(); return result; }
        catch (error) {
          check();
          if (attempt + 1 >= attempts || !transientResultReadError(error)) throw error;
          await new Promise<void>((resolve, reject) => {
            const cancel = () => { clearTimeout(timer); reject(requestSignal?.reason || Error("结果查询已取消")); };
            const timer = setTimeout(() => { requestSignal?.removeEventListener("abort", cancel); resolve(); }, attempt ? 1500 : 500);
            requestSignal?.addEventListener("abort", cancel, { once: true });
            if (requestSignal?.aborted) cancel();
          });
        }
      }
    };
    const pendingReads = new Map<object, { workerId: string; phase: string; attempt: number; attempts: number; budget: number; started: number }>();
    const returnedWorkers = new Set<string>();
    let waitingTimer: ReturnType<typeof setInterval> | undefined;
    const reportPending = () => {
      if (!current() || !pendingReads.size) return;
      const waiting = [...pendingReads.values()].map(row => row.workerId + " · " + row.phase + " · 第 " + row.attempt + "/" + row.attempts
        + " 次 · 已等 " + Math.floor((Date.now() - row.started) / 1000) + " 秒（单次上限 " + Math.ceil(row.budget / 1000) + " 秒）");
      this.report({ message: "等待 Worker：" + waiting.join("；") + "；产物查询已处理 " + returnedWorkers.size + "/" + targets.length + " 台" });
    };
    const readTasks = (workerId: string, options: any, budget: number, attempts = 3) => {
      let attempt = 0;
      return retryRead<any>(async () => {
        const reader = {};
        pendingReads.set(reader, { workerId, phase: options.discovery ? "PLAN 声明" : "产物状态", attempt: ++attempt, attempts, budget, started: Date.now() });
        if (!waitingTimer) { waitingTimer = setInterval(reportPending, 5000); waitingTimer.unref?.(); }
        reportPending();
        try { return await this.waitFor(h.client.getWorkerTasks(workerId,
          { ...options, signal: requestSignal ? AbortSignal.any([requestSignal, AbortSignal.timeout(budget)]) : AbortSignal.timeout(budget) }), requestSignal); }
        finally {
          pendingReads.delete(reader);
          if (!pendingReads.size) { clearInterval(waitingTimer); waitingTimer = undefined; }
          else reportPending();
        }
      }, attempts);
    };
    const started = Date.now(), timing: Record<string, number> = {};
    let inputs = await this.waitFor<any[]>(h.currentResultPlanInputs(), requestSignal); check();
    const scoped = Boolean(selection?.length);
    if (scoped) {
      const chosen = new Set<string>();
      for (const value of selection!) {
        const normalized = String(value).replaceAll("\\", "/").replace(/^\.\//, "");
        const exact = inputs.filter((row: any) => row.planFile === normalized);
        const matches = exact.length ? exact : inputs.filter((row: any) => path.posix.basename(row.planFile).replace(/\.ya?ml$/i, "") === normalized.replace(/\.ya?ml$/i, ""));
        if (matches.length !== 1) throw Error("PLAN 选择不存在或不唯一：" + value);
        chosen.add(matches[0].planFile);
      }
      inputs = inputs.filter((row: any) => chosen.has(row.planFile));
    }
    timing.localPlansMs = Date.now() - started;
    const discoveryStarted = Date.now();
    const plans: ResultPlan[] = [], declarationErrors: string[] = [];
    const declarationIssues: Array<{ workerId: string; message: string; affected: string[] }> = [];
    // A transport failure belongs to this refresh, not to each of its PLANs.
    // Do not quarantine declaration mismatches: another PLAN on this Worker may be valid.
    const unavailable = new Map<string, string>();
    const discoveryReady = new Set<string>();
    const discoveryWarmups = new Map<string, Promise<void>>();
    const discover = async (plan: any): Promise<ResultPlan | undefined> => {
      let jobs: any[] | undefined;
      for (const worker of targets) {
        // Establish one successful read before fanning out PLAN queries on an
        // unproven connection. Concurrent callers share its bounded recovery.
        const warmup = discoveryWarmups.get(worker.id);
        if (warmup) { await warmup; check(); }
        if (unavailable.has(worker.id)) continue;
        try {
          this.report({ message: "核实 PLAN 声明 · " + worker.id + " · " + plan.planFile });
          let response: any;
          let finishWarmup: (() => void) | undefined;
          if (!discoveryReady.has(worker.id)) discoveryWarmups.set(worker.id, new Promise(resolve => { finishWarmup = resolve; }));
          try {
            response = await readTasks(worker.id, {
              discovery: { planFile: plan.planFile, condaEnv: worker.condaEnv || "", collect: true } }, 15000);
            discoveryReady.add(worker.id);
          }
          catch (error: any) {
            const message = String(error.message || error);
            if (transientResultReadError(error))
              unavailable.set(worker.id, message);
            throw error;
          } finally { if (finishWarmup) { discoveryWarmups.delete(worker.id); finishWarmup(); } }
          check();
          if (response.queryComplete !== true || response.capabilities?.resultCollection !== 1) throw Error("请更新此 Worker 的 Agent/Scheduler，以支持直接结果读取");
          if (!Array.isArray(response.declaredJobs) || !response.declaredJobs.length || response.declaredJobs.some((job: any) => job.planHash !== plan.revision))
            throw Error("服务器 PLAN 与当前本机声明不一致，未使用旧路径");
          jobs = response.declaredJobs; break;
        } catch (error: any) {
          const message = String(error.message || error);
          declarationErrors.push(plan.planFile + " · " + worker.id + "：" + message);
          declarationIssues.push({ workerId: worker.id, message, affected: [plan.planFile] });
        }
      }
      if (!jobs) return undefined;
      const declared = jobs.map((job: any) => ({ planFile: resultPath(plan.planFile), index: Number(job.index), case: String(job.case), seed: Number(job.seed),
        output_dir: resultPath(job.output_dir), result_csv: job.result_csv ? resultPath(job.result_csv) : "", mode: plan.mode }));
      if (declared.some((job: any) => !Number.isInteger(job.index) || !Number.isInteger(job.seed) || !job.case || !["train", "test", "train_test"].includes(job.mode))) throw Error("PLAN_JOB_DECLARATION_INVALID");
      return { ...plan, jobs: declared };
    };
    // Bound pressure on slow tunnels and preserve PLAN order. All enabled Workers
    // still receive the complete declarations/file verification below.
    let processedPlans = 0, verifiedPlans = 0;
    for (let offset = 0; offset < inputs.length; offset += 4) {
      const settled = await Promise.allSettled(inputs.slice(offset, offset + 4).map(async (plan: any) => {
        try { const value = await discover(plan); if (value) verifiedPlans++; return value; }
        finally { processedPlans++; this.report({ message: "已处理 PLAN 声明 " + processedPlans + "/" + inputs.length + "；已核实 " + verifiedPlans + "；待核实 " + (processedPlans - verifiedPlans) }); }
      }));
      const failed = settled.find(row => row.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
      for (const row of settled) if (row.status === "fulfilled" && row.value) plans.push(row.value);
      check();
    }
    timing.declarationsMs = Date.now() - discoveryStarted;
    const observationStarted = Date.now();
    const declarations = plans.flatMap(plan => plan.jobs.map(job => ({ ...job, collect: true })));
    const snapshots = await Promise.all(targets.map(async (worker: any) => {
      const values = [];
      try {
        for (let offset = 0; offset < Math.max(1, declarations.length); offset += 500) {
          this.report({ message: "查询实际产物 · " + worker.id + " · job " + Math.min(offset, declarations.length) + "/" + declarations.length });
          const value = await readTasks(worker.id, {
            queries: [], declarations: declarations.slice(offset, offset + 500) }, 30000, unavailable.has(worker.id) ? 1 : 3); check();
          if (value.queryComplete !== true || value.capabilities?.resultCollection !== 1) throw Error(value.error || "请更新 Agent/Scheduler：直接结果查询不可用");
          values.push(value);
        }
        return { workerId: worker.id, queryComplete: true, tasks: values.flatMap(value => value.tasks || []), declaredResults: values.flatMap(value => value.declaredResults || []) };
      } catch (error: any) { return { workerId: worker.id, queryComplete: false, error: String(error.message || error) }; }
      finally { returnedWorkers.add(worker.id); reportPending(); }
    })); check();
    timing.observationsMs = Date.now() - observationStarted;
    const receiveStarted = Date.now(); let memoryRequests = 0, memoryFiles = 0, verifiedFiles = 0;
    const readUnavailable = new Map<string, any>();
    const receive = async (workerId: string, files: ResultSource[]) => {
      check();
      if (readUnavailable.has(workerId)) throw readUnavailable.get(workerId);
      this.report({ message: "核实 SimpleSFTP 能力 · " + workerId });
      const capability = await this.waitFor<any>(h.simpleSftpCapability("sync.downloadMappedPaths"), requestSignal); check();
      if (capability.methodOptions?.["sync.downloadMappedPaths"]?.memoryOnly !== true
        || capability.methodOptions?.["sync.downloadMappedPaths"]?.memoryWrapperResults !== true) throw Error("请更新 SimpleSFTP：需要内存指标读取能力");
      const server = h.sftpServerOptions(targets.find((row: any) => row.id === workerId));
      const output = [];
      const batches: ResultSource[][] = [];
      for (const file of files) {
        const batch = batches[batches.length - 1];
        if (batch && batch.reduce((sum, row) => sum + row.bytes, 0) + file.bytes <= 4 * 1024 * 1024) batch.push(file);
        else batches.push([file]);
      }
      for (const batch of batches) {
        this.report({ message: "内存读取指标 · " + workerId + " · 已核实 " + verifiedFiles + " 个文件" });
        let response: any;
        try { response = await retryRead(async () => {
          memoryRequests++; memoryFiles += batch.length;
          return this.waitFor(h.simpleSftpApiCall("sync.downloadMappedPaths", { server, localPath: root,
          entries: batch.map(file => ({ ...file, localRelativePath: file.remotePath })), memoryOnly: true, metricsOnly: true, wrapperResults: true,
          maxFileBytes: 4 * 1024 * 1024, maxBatchBytes: 4 * 1024 * 1024, confirm: true, pathConfirmed: true, signal: requestSignal }), requestSignal);
        }); } catch (error) {
          if (transientResultReadError(error)) readUnavailable.set(workerId, error);
          throw error;
        }
        check();
        if (!response?.memoryOnly || response.ok === false || response.entries?.length !== batch.length) throw Error("RESULT_MEMORY_READ_INCOMPLETE");
        for (const entry of response.entries) {
          const file = batch.find(row => row.remotePath === entry.remotePath);
          if (!file || typeof entry.dataBase64 !== "string" || entry.dataBase64.length > 4 * Math.ceil(file.bytes / 3)) throw Error("RESULT_MEMORY_READ_UNDECLARED");
          const bytes = Buffer.from(entry.dataBase64, "base64");
          if (bytes.toString("base64") !== entry.dataBase64 || bytes.length !== file.bytes || entry.sha256 !== file.sha256 || entry.bytes !== file.bytes)
            throw Error("RESULT_CONTENT_CHANGED: " + file.remotePath);
          output.push({ remotePath: file.remotePath, text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes) });
        }
        verifiedFiles += batch.length;
        this.report({ message: "内存读取指标 · " + workerId + " · 已核实 " + verifiedFiles + " 个文件" });
      }
      return output;
    };
    // Queue metadata supplies provenance/ownership only, never result bytes or proof.
    const queued = queuedPlans(), bindings = runBindings(); owners = JSON.stringify(bindings);
    const result = await collectFreshResults(plans, snapshots, receive, (text, job) => h.parseFreshResultMetric(text, job), h.resultAdapterRules().planDatasetMapping || {}, current, bindings); check();
    timing.metricsMs = Date.now() - receiveStarted;
    // A failed declaration cannot make an entire PLAN silently disappear from a new export.
    result.errors.push(...declarationErrors);
    for (const plan of inputs.filter((row: any) => !plans.some(item => item.planFile === row.planFile))) {
      result.jobs.push({ planFile: plan.planFile, index: -1, case: "", seed: 0, outputDir: "", state: "unknown", error: "无法核实当前 PLAN 声明" });
    }
    if (inputs.length && !plans.length) result.querySucceeded = false;
    // Successful metadata is not a successful result read. Preserve the last
    // export when every job remains unknown after a failed receive.
    if (result.jobs.length && result.jobs.every(job => job.state === "unknown")) result.querySucceeded = false;
    for (const plan of inputs) {
      if (resultDigest(await fs.readFile(path.join(root, resultPath(plan.planFile)), "utf8")) !== plan.revision) throw Error("PLAN 已变化，未发布过期结果。");
    }
    check();
    const publicationStarted = Date.now();
    this.report({ message: scoped ? "生成所选 PLAN 结果（不覆盖整批导出）…" : "生成并保存本机结果表格…" });
    const rules = h.resultAdapterRules();
    const derived = rules.derivedMetric ? { ...rules.derivedMetric, metric: canonicalMetricName(rules.derivedMetric.metric, rules.metricAliases) } : undefined;
    const tables = { ...freshResultTables(result, plans, derived),
      ...Object.fromEntries(Object.entries(freshResultTables(result, plans, derived, true)).map(([key, value]) => ["review/" + key, value])) };
    const directory = h.resultCsvDirectory || "experiments/results";
    const published = scoped ? false : await publishLatestResult(root, directory, result, tables, current); check();
    timing.publicationMs = Date.now() - publicationStarted;
    const participating = new Set<string>([...queued.map((plan: any) => plan.planFile),
      ...result.jobs.filter(job => job.state !== "missing" && (job.commandId || job.error || job.state === "conflict" || job.executionState === "running")).map(job => job.planFile)]);
    const coverage = Object.fromEntries<{ included: boolean; expected: number; completed: number; artifactsComplete: number; reviewRequired: number }>(inputs.map((plan: any) => [String(plan.planFile), {
      included: participating.has(plan.planFile),
      expected: plans.find(row => row.planFile === plan.planFile)?.jobs.length || plan.jobCount || 0,
      completed: result.jobs.filter(job => job.planFile === plan.planFile && job.state === "complete" && job.aggregationState === "eligible").length,
      artifactsComplete: result.jobs.filter(job => job.planFile === plan.planFile && job.state === "complete").length,
      reviewRequired: result.jobs.filter(job => job.planFile === plan.planFile && job.state === "complete" && job.aggregationState === "review_required").length }] as const));
    const issues = [...declarationIssues,
      ...result.jobs.filter(job => job.error).map(job => ({ workerId: job.workerId || "", message: job.error!, affected: [job.planFile + " · " + job.case + "/" + job.seed] }))];
    const issueGroups = [...issues.reduce((groups, issue) => {
      const key = JSON.stringify([issue.workerId, issue.message]);
      const group = groups.get(key) || { ...issue, affected: [] as string[] };
      group.affected.push(...issue.affected); groups.set(key, group); return groups;
    }, new Map<string, typeof issues[number]>()).values()];
    const report = { source: "active_query", scope: scoped ? "selected_plans" : "all_plans", exported: published,
      observedAt: result.observedAt, current: scoped ? result.querySucceeded : published, merged: published, downloaded: result.records.length > 0, planCoverage: coverage,
      issueGroups, counts: { plans: inputs.length, includedPlans: new Set(result.records.map(row => row.planFile)).size,
        completeJobs: result.jobs.filter(job => job.state === "complete").length,
        unknownJobs: result.jobs.filter(job => job.index >= 0 && (job.state === "unknown" || job.state === "conflict")).length
          + inputs.filter((plan: any) => !plans.some(row => row.planFile === plan.planFile)).reduce((sum: number, plan: any) => sum + Number(plan.jobCount || 0), 0),
        unverifiedPlans: inputs.filter((plan: any) => !plans.some(row => row.planFile === plan.planFile)).length,
        unfinishedJobs: result.jobs.filter(job => job.state !== "complete" && job.state !== "unknown" && job.state !== "conflict").length,
        queryIssues: result.errors.length },
      queryTiming: timing, memoryRequests, memoryFiles,
      plans: plans.map(plan => plan.planFile), discovered: inputs.length, included: [...new Set(result.records.map(row => row.planFile))],
      missing: result.jobs.filter(job => participating.has(job.planFile) && job.state !== "complete").map(job => job.planFile + " · " + job.case + "/" + job.seed + "：" + (job.error || job.state)),
      skipped: result.errors, jobs: result.jobs, completed: result.jobs.filter(job => job.state === "complete" && job.aggregationState === "eligible").length,
      reviewRequired: result.jobs.filter(job => job.state === "complete" && job.aggregationState === "review_required").length,
      artifactsComplete: result.jobs.filter(job => job.state === "complete").length, expected: Object.values(coverage).filter(row => row.included).reduce((sum, row) => sum + row.expected, 0),
      catalogExpected: Object.values(coverage).reduce((sum, row) => sum + row.expected, 0),
      unobservedDeclarations: Object.values(coverage).filter(row => !row.included).reduce((sum, row) => sum + row.expected, 0),
      tables: Object.values(tables).map(table => ({ tableKey: table.tableKey, dataset: table.dataset, relativePath: table.relativePath, markdownPath: table.markdownPath })),
      results: result.records.map(row => ({ planFile: row.planFile, workerId: row.workerId, runId: row.runId, dimensions: { case: row.case, seed: row.seed, method: row.method,
        dataset: row.dataset, rate_percent: row.rate, eval_protocol: row.endpoint }, metrics: row.metrics, sourceFiles: [{ path: row.jobDir }],
        aggregationState: result.jobs.find(job => job.commandId === row.runId)?.aggregationState,
        workflowId: row.workflowId, revision: row.revision, codeFingerprint: row.codeFingerprint, executionWorkerId: row.executionWorkerId,
        completionState: result.jobs.find(job => job.commandId === row.runId)?.completionState,
        runtimeDiagnostics: result.jobs.find(job => job.commandId === row.runId)?.runtimeDiagnostics })) };
    if (!scoped) h.resultsSummary = report;
    const { results: _records, tables: _tables, jobs: _jobs, ...brief } = report;
    if (!scoped) h.resultSyncReport = brief;
    if (published) await h.refreshLocalResultCatalogForProject(context);
    timing.totalMs = Date.now() - started;
    h.postState?.(); return report;
  }
}
