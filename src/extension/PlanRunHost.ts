import * as fs from "node:fs/promises";
import * as path from "node:path";
import { atomicWriteText } from "../state/StateStore";
import { cleanupDigest, cleanupRelative } from "../features/PlanCleanup";
import { replaceRunOutputs, runReplacementKey } from "../features/PlanRunReplacement";
import { observationMatches, taskLifecycle } from "../features/TaskLifecycle";

/** Local recoverable inputs, never authority for a remote process or a result. */
export class PlanRunHost {
  constructor(private readonly host: any, private readonly root: string) {}
  private file(id: string) { return path.join(this.host.context.globalStorageUri.fsPath, "run-submissions", cleanupDigest(this.root), cleanupDigest(id) + ".json"); }
  async load(id: string) {
    const value = JSON.parse(await fs.readFile(this.file(id), "utf8"));
    if (value.root !== this.root || value.operationId !== id) throw Error("提交恢复记录不属于当前项目。");
    return value;
  }
  async save(body: any) {
    const id = body.submissionOperationIdLocal;
    if (!id) return;
    const input: any = {};
    for (const key of ["workspace", "planFile", "selectedPlanId", "planRevision", "schedulerOwnerWorkerId", "gitProvenance", "options", "schedulingMode",
      "existingOutputCount", "existingOutputChoice", "distributedSkipJobIndices", "assignedExperimentIndices", "submissionWorkflowId"])
      if (body[key] !== undefined) input[key] = body[key];
    input.planFile = cleanupRelative(body.planFile || body.options?.planFile);
    const safeInput = JSON.parse(JSON.stringify(input, (key, item) => /token|password|credential|privateKey|authorization/i.test(key) ? undefined : item));
    const value = { root: this.root, operationId: id, input: safeInput, recovery: body.runRecovery || {}, replacement: body.runReplacement || {} };
    // Cleanup preview tokens are opaque approvals; server credentials never enter the input.
    if (value.input.options) { delete value.input.options.workers; delete value.input.options.agentToken; delete value.input.options.env; }
    await atomicWriteText(this.file(id), JSON.stringify(value));
  }
  async replace(plan: any, body: any, validation: any) {
    const h = this.host, cleanup = h.planCleanupHost(), jobs = validation.jobs, context = h.captureProjectContext();
    const currentNodes = () => h.workerActionTargets().map((row: any) => [row.id, row.host, row.port, row.user, row.project_dir]);
    // Health checks rebuild the client even when its physical targets stay the
    // same. Bind confirmation to the project and actual configured endpoints.
    const connectionKey = () => cleanupDigest([h.effectiveConnectionMode(), h.workerActionTargets().map((row: any) =>
      [row.id, row.host, row.port, row.user, row.project_dir, row.local_agent_url, row.agent_runtime_dir, row.conda_env])]);
    const connection = connectionKey();
    const assertCurrent = () => {
      if (context.root !== this.root || !h.projectContextIsCurrent(context) || connectionKey() !== connection)
        throw Error("工作区或服务器连接配置已变化，未继续运行。");
    };
    const planFile = cleanupRelative(body.planFile || body.options?.planFile || plan?.planFile || plan?.file);
    if (body.options?.planFile && body.options.planFile !== planFile) throw Error("提交的 PLAN 路径不一致，未删除或提交。");
    body.planFile = planFile;
    body.runReplacement ||= {};
    const completed = new Set<number>();
    const tasks = (body.workerSubmissionSnapshots || []).flatMap((snapshot: any) => snapshot.tasks || []);
    const executionAllowsCompletion = (output: string, runId: string) => !tasks.some((task: any) => {
      if (task.outputDir !== output || !task.observation) return false;
      const observed = task.observation, state = taskLifecycle(observed);
      return !!observed.queryError || !!observed.tmux && !observed.tmux.dead
        || task.commandId === runId && ["failed", "unknown"].includes(state.execution);
    });
    for (const snapshot of body.workerSubmissionSnapshots || []) {
      for (const result of snapshot.declaredResults || []) if (result.completed === true && executionAllowsCompletion(result.outputDir, result.runId)) {
        const declaration = jobs.find((row: any) => Number(row.index) === result.index && row.output_dir === result.outputDir && row.result_csv === result.collectionResultCsv);
        if (declaration) completed.add(result.index);
      }
      for (const task of snapshot.tasks || []) if (task.observation && observationMatches(task.observation,
        { commandId: task.commandId, workerId: snapshot.workerId, projectId: task.projectId })
        && taskLifecycle(task.observation).status === "completed" && executionAllowsCompletion(task.outputDir, task.commandId)) {
        const declaration = jobs.find((row: any) => row.case === task.case && Number(row.seed) === Number(task.seed)
          && row.output_dir === task.outputDir && row.result_csv === task.collectionResultCsv);
        if (declaration) completed.add(Number(declaration.index));
      }
    }
    const key = runReplacementKey(body.planFile, body.planRevision, h.lastCodeSyncState?.fingerprint || "", jobs, currentNodes());
    const result = await replaceRunOutputs({
      preview: (job: any) => cleanup.service.preview({ planFile: body.planFile, action: "delete", verifiedOnly: false, authorizationMode: "confirmed_paths",
        job: { workflowId: "manifest-" + cleanupDigest([body.planFile, job.output_dir]), commandId: "manifest-" + cleanupDigest(job), index: Number(job.index),
          purpose: "replace_outputs", manifest: { declarations: [job], replacement: true } } }),
      service: cleanup.service, execute: (id: string) => cleanup.execute(id),
      ask: (payload: any) => h.askRunConfirmation(payload, body.submissionOperationIdLocal),
      save: () => this.save(body),
      assertCurrent,
      beforeDelete: async () => {
        // Deletion still requires the complete batch check. Ordinary launch can
        // already use ready Workers while the remaining servers prepare.
        await body.awaitWorkerPreparationLocal?.();
        const current = { ...body }; await h.refreshLocalPlanMetadataForAction(current); h.stampPlanRevision(current);
        const fingerprint = await h.localDistributedCodeFingerprint(this.root);
        if (current.planRevision !== body.planRevision || fingerprint !== h.lastCodeSyncState?.fingerprint
          || runReplacementKey(body.planFile, body.planRevision, fingerprint, jobs, currentNodes()) !== key)
          throw Error("PLAN、代码或服务器配置已变化，请重新运行并确认路径；未删除。");
        await h.assertPlanSubmissionWorkers(body, { validation });
      },
      progress: (text: string) => body.reportPlanStageLocal?.(text),
      hold: async (selected: any[]) => {
        await h.saveDistributedQueue(this.root, undefined, { artifactMutation: true, mutateLatest: (queue: any) => ({ ...queue,
          plans: queue.plans.map((old: any) => ({ ...old, jobs: old.jobs.map((job: any) =>
            selected.some(row => row.output_dir === job.outputDir && row.result_csv === job.collectionResultCsv)
              ? { ...job, outputRetiredAt: job.outputRetiredAt || new Date().toISOString(), artifacts: undefined,
                mirroredWorkerIds: [], fragmentWorkerIds: [] } : job) })) }) });
      },
    }, body.runReplacement, body.planFile, jobs, [...completed], key);
    body.existingOutputChoice = result.choice;
    body.existingOutputCount = body.runReplacement.previews?.filter((row: any) => row.preview.rows.some((file: any) => file.disposition === "delete")).length || 0;
    body.distributedSkipJobIndices = jobs.filter((job: any) => !result.selectedIndices.includes(Number(job.index))).map((job: any) => Number(job.index));
    body.assignedExperimentIndices = result.selectedIndices;
    body.outputReplacementOperationIds = body.runReplacement.completed || [];
    body.overwrite = body.overwriteExisting = false;
    body.options = { ...body.options, overwrite: false, overwriteExisting: false };
    await this.save(body);
  }
}
