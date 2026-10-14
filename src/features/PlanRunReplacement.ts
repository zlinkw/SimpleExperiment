import { cleanupDigest, cleanupError, CleanupPreview } from "./PlanCleanup";

export type RunReplacement = { key?: string; previews?: Array<{ index: number; preview: CleanupPreview }>;
  choice?: "rerun_all" | "rerun_missing"; phase?: number; selectedIndices?: number[]; completed?: string[]; done?: boolean };
export type RunReplacementPorts = {
  preview(job: any): Promise<CleanupPreview>;
  service: any;
  execute(id: string): Promise<any>;
  ask(payload: any): Promise<string>;
  save(): Promise<void>;
  assertCurrent(): void;
  beforeDelete(): Promise<void>;
  hold(jobs: any[]): Promise<void>;
  progress(text: string): void;
};
const targets = (previews: Array<{ index: number; preview: CleanupPreview }>) => previews.flatMap(({ preview }) =>
  preview.rows.filter(row => row.disposition === "delete").map(row => ({ server: row.node.id,
    connection: row.node.kind === "remote" ? row.node.user + "@" + row.node.host + ":" + row.node.port : "本机",
    path: row.absolutePath, type: row.type })));

/** One flow for normal runs and explicit retries. No owner/revision review UI. */
export async function replaceRunOutputs(ports: RunReplacementPorts, state: RunReplacement, planFile: string,
  jobs: any[], completedIndices: number[], key: string): Promise<{ choice: "rerun_all" | "rerun_missing"; selectedIndices: number[] }> {
  ports.assertCurrent();
  if (state.key && state.key !== key) cleanupError("RUN_DECLARATION_CHANGED", "本次任务或服务器配置已变化，请重新提交并确认路径。");
  state.key = key;
  if (!state.previews) {
    const previews = [];
    for (const job of jobs) {
      ports.progress("正在定位任务 " + job.index + " 的已有文件…");
      const preview = await ports.preview(job);
      if (preview.blockers.length || preview.rows.some(row => !["delete", "absent"].includes(row.disposition)))
        cleanupError("OUTPUT_REPLACEMENT_BLOCKED", [...preview.blockers.map(row => (row.nodeId || "") + "：" + row.code + " " + row.detail),
          ...preview.rows.filter(row => !["delete", "absent"].includes(row.disposition)).map(row => row.absolutePath + "：" + (row.error || row.protectedReason))].join("\n"));
      previews.push({ index: Number(job.index), preview });
    }
    const exact = targets(previews).map(row => row.server + ":" + row.path);
    if (new Set(exact).size !== exact.length) cleanupError("OUTPUT_REPLACEMENT_OVERLAP");
    state.previews = previews;
    await ports.save();
  }
  const all = jobs.map(job => Number(job.index)), missing = all.filter(index => !completedIndices.includes(index));
  if (!targets(state.previews).length && !state.choice) state.choice = "rerun_all";
  if (!state.choice) {
    ports.progress("等待选择运行范围并第一次确认完整路径…");
    const choice = await ports.ask({ phase: 1, planFile, title: "选择运行范围并确认完整路径", groups: [
      { value: "rerun_all", label: "覆盖并重跑全部", targets: targets(state.previews) },
      { value: "rerun_missing", label: "仅补跑未完成任务", disabled: !missing.length,
        targets: targets(state.previews.filter(row => missing.includes(row.index))) }] });
    if (!["rerun_all", "rerun_missing"].includes(choice)) cleanupError("REPLACEMENT_CANCELLED", "已取消；未删除文件或提交任务。");
    state.choice = choice as RunReplacement["choice"];
    state.selectedIndices = choice === "rerun_missing" ? missing : all;
    await ports.save();
  }
  state.selectedIndices ||= state.choice === "rerun_missing" ? missing : all;
  const selected = state.previews.filter(row => state.selectedIndices!.includes(row.index) && targets([row]).length);
  const exact = targets(selected);
  if (exact.length && (state.phase || 0) < 1) {
    for (const { preview } of selected) await ports.service.confirm({ token: preview.token, digest: preview.digest, phase: 1, confirm: true,
      exactTargets: targets([{ index: 0, preview }]).map(row => row.server + ":" + row.path) });
    state.phase = 1; await ports.save();
  }
  if (exact.length && (state.phase || 0) < 2) {
    ports.progress("等待第二次确认：永久删除并重跑…");
    if (await ports.ask({ phase: 2, planFile, title: "永久删除以下文件并重跑", groups: [
      { value: "delete_and_run", label: "永久删除并重跑", targets: exact }] }) !== "delete_and_run")
      cleanupError("REPLACEMENT_CANCELLED", "已取消；未删除文件或提交任务。");
    for (const { preview } of selected) await ports.service.confirm({ token: preview.token, digest: preview.digest, phase: 2, confirm: true,
      exactTargets: targets([{ index: 0, preview }]).map(row => row.server + ":" + row.path) });
    state.phase = 2; await ports.save();
  }
  ports.assertCurrent();
  if (selected.length) {
    await ports.beforeDelete();
    for (const { preview } of selected) await ports.service.preflightConfirmed(preview.token);
    await ports.hold(jobs.filter(job => state.selectedIndices!.includes(Number(job.index))));
    state.completed ||= [];
    for (const { preview } of selected) {
      ports.assertCurrent();
      if (state.completed.includes(preview.token)) {
        if ((await ports.service.status(preview.token)).state !== "completed") cleanupError("OUTPUT_REPLACEMENT_PARTIAL", "已处理路径需要重新核实，尚未提交。");
        continue;
      }
      ports.progress("正在删除已确认文件；已完成 " + state.completed.length + "/" + selected.length + " 批…");
      let result;
      try { result = await ports.execute(preview.token); }
      catch (error) {
        try { result = await ports.service.status(preview.token); } catch {}
        if (result?.state !== "completed") throw error;
      }
      if (result.state !== "completed" || result.pendingNodes?.length) cleanupError("OUTPUT_REPLACEMENT_PARTIAL", "部分文件尚未清除；可重试失败步骤，未提交任务。");
      state.completed.push(preview.token); await ports.save();
    }
  }
  state.done = true; await ports.save();
  return { choice: state.choice!, selectedIndices: state.selectedIndices };
}

export const runReplacementKey = (plan: string, revision: string, code: string, jobs: any[], nodes: any[]) =>
  cleanupDigest([plan, revision, code, jobs, nodes]);
