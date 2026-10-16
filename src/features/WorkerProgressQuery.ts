import { taskLifecycle } from "./TaskLifecycle";
const progressCursors = new WeakMap<object, Map<string, number>>();
/** Current-round observations only. One slow result cannot discard its siblings. */
export async function queryWorkerProgress(client: any, workerId: string, queries: any[], execution: any,
  options: { signal?: AbortSignal; onSnapshot?: (snapshot: any) => void } = {}) {
  const key = (task: any) => task.projectId + ":" + task.commandId;
  const selected = new Map<string, any>();
  for (const task of [...queries, ...(execution.tasks || [])])
    if (task.commandId && task.projectId && task.workerId === workerId && task.outputDir) selected.set(key(task), { ...selected.get(key(task)), ...task });
  const rows = new Map<string, any>((execution.tasks || []).map((task: any) => [key(task), task]));
  const selection = [...selected.values()], checked = new Set<string>(), errors = new Map<string, string>();
  const needsDiagnostics = new Set<string>(), diagnosticsChecked = new Set<string>(), runtimeErrors = new Map<string, string>();
  let cursors = progressCursors.get(client);
  if (!cursors) { cursors = new Map(); progressCursors.set(client, cursors); }
  const scope = workerId + ":" + [...new Set(selection.map(task => task.projectId))].sort().join(",");
  const start = (cursors.get(scope) || 0) % Math.max(1, selection.length);
  const entries = [...selection.slice(start), ...selection.slice(0, start)];
  if (cursors.size > 64) cursors.delete(cursors.keys().next().value!);
  const cleanup = new Map<string, any>();
  let index = 0, closed = false, controlIncomplete = false, capabilities = execution.capabilities;
  const snapshot = (reason?: string) => {
    const partial = !entries.length || checked.size !== entries.length || errors.size > 0;
    const { executionOnly: _, ...base } = execution;
    return { ...base, workerId, fetchedAt: execution.fetchedAt || new Date().toISOString(), capabilities,
      ...(partial ? { executionOnly: true, resultQueryError: reason || [...errors.values()].join("; ") || "部分产物仍在核实" } : {}),
      ...(controlIncomplete ? { controlIncomplete: true } : {}),
      ...(needsDiagnostics.size > diagnosticsChecked.size ? { diagnosticsPending: true,
        ...(reason ? { runtimeQueryError: reason } : {}) } : {}),
      ...(runtimeErrors.size ? { runtimeQueryError: [...runtimeErrors.values()].join("; ") } : {}),
      tasks: [...rows.values()], cleanupExecutors: [...cleanup.values()] };
  };
  const publish = () => { if (!closed) options.onSnapshot?.(snapshot()); };
  const fail = (query: any, message: string) => {
    const id = key(query), prior = rows.get(id) || query;
    errors.set(id, message);
    rows.set(id, { ...prior, observation: { ...(prior.observation || {}), resultQueryError: message } });
  };
  const runtimeFailure = (query: any, message: string) => {
    const id = key(query), prior = rows.get(id);
    runtimeErrors.set(id, message);
    if (prior) {
      const evidence = { schemaVersion: 1, commandId: query.commandId, runId: query.commandId,
        state: "unverified", count: 0, scanComplete: false, reason: message };
      rows.set(id, { ...prior, runtimeDiagnostics: evidence, completionState: "unverified", successful: false,
        observation: { ...prior.observation, runtimeDiagnostics: evidence } });
    }
  };
  const lane = async () => {
    while (!closed && !options.signal?.aborted && index < entries.length) {
      const batch = entries.slice(index, index + 4);
      index += batch.length;
      cursors!.set(scope, (start + index) % entries.length);
      try {
        const value: any = await client.getWorkerTasks(workerId, { signal: options.signal,
          selectedOnly: true, observationOnly: true, queries: batch });
        if (closed || options.signal?.aborted) return;
        if (value?.error || value?.queryComplete !== true || value?.capabilities?.taskLifecycle !== 2
          || value?.resultsOnly !== true && !Array.isArray(value?.cleanupExecutors))
          throw new Error(value?.error || "所选任务的产物查询未完成");
        capabilities = { ...capabilities, ...value.capabilities };
        for (const item of value.cleanupExecutors || []) cleanup.set(JSON.stringify(item), item);
        for (const query of batch) {
          const id = key(query);
          const task = value?.tasks?.find((task: any) => key(task) === id && task.workerId === workerId);
          if (!task || task.observation?.queryError) {
            fail(query, task?.observation?.queryError || "所选任务的产物查询未完成");
            continue;
          }
          if (value.resultsOnly === true) {
            controlIncomplete = true;
            const prior = rows.get(id) || query;
            const observation = { ...task.observation, ...(prior.observation?.tmux ? { tmux: prior.observation.tmux } : {}) };
            if (observation.tmux && !observation.tmux.dead && observation.runtimeDiagnostics) {
              observation.runtimeDiagnostics = { ...observation.runtimeDiagnostics, scanComplete: false,
                state: observation.runtimeDiagnostics.count ? "anomalous" : "scanning" };
            }
            const state = taskLifecycle(observation);
            rows.set(id, { ...prior, ...task, observation, status: state.status, executionState: state.execution,
              resultState: state.result, completionState: state.completionState, runtimeDiagnostics: state.runtimeDiagnostics,
              exitCode: state.exitCode, successful: state.status === "completed" && state.completionState === "verified" });
          } else rows.set(id, task);
          checked.add(id);
          if (value.metadataOnly === true) needsDiagnostics.add(id);
        }
      } catch (error) {
        if (closed || options.signal?.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        for (const query of batch) fail(query, message);
      }
      publish();
    }
  };
  const read = async () => {
    await Promise.all(Array.from({ length: Math.min(4, entries.length) }, lane));
    if (closed || options.signal?.aborted || !needsDiagnostics.size) return;
    // Every artifact receipt is published before any raw log request. A log
    // timeout changes only runtime evidence, never the verified result state.
    const jobs = selection.filter(query => needsDiagnostics.has(key(query)));
    const logScope = scope + ":logs", start = (cursors!.get(logScope) || 0) % jobs.length;
    const logs = [...jobs.slice(start), ...jobs.slice(0, start)];
    let next = 0;
    const logLane = async () => {
      while (!closed && !options.signal?.aborted && next < logs.length) {
        const batch = logs.slice(next, next + 4); next += batch.length;
        cursors!.set(logScope, (start + next) % jobs.length);
        try {
          const value: any = await client.getWorkerTasks(workerId, { signal: options.signal,
            selectedOnly: true, observationOnly: true, diagnosticsOnly: true, queries: batch });
          if (closed || options.signal?.aborted) return;
          if (value?.queryComplete !== true || value?.error) throw Error(value?.error || "运行日志核实未完成");
          for (const query of batch) {
            const id = key(query), prior = rows.get(id), task = value.tasks?.find((task: any) => key(task) === id && task.workerId === workerId);
            const evidence = task?.observation?.runtimeDiagnostics;
            if (!evidence || task.observation.runtimeQueryError || task.observation.queryError) {
              runtimeFailure(query, task?.observation?.runtimeQueryError || task?.observation?.queryError || "未取得本次运行日志");
              continue;
            }
            const observation = { ...prior.observation, runtimeDiagnostics: observationDiagnostics(prior.observation, evidence) };
            const state = taskLifecycle(observation);
            rows.set(id, { ...prior, observation, runtimeDiagnostics: state.runtimeDiagnostics, completionState: state.completionState,
              successful: state.status === "completed" && state.completionState === "verified" });
            diagnosticsChecked.add(id);
          }
        } catch (error) {
          if (closed || options.signal?.aborted) return;
          for (const query of batch) runtimeFailure(query, error instanceof Error ? error.message : String(error));
        }
        publish();
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, Math.ceil(logs.length / 4)) }, logLane));
  };
  let abort: (() => void) | undefined;
  const interrupted = new Promise<void>(resolve => {
    abort = resolve;
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) resolve();
  });
  try {
    await Promise.race([read(), interrupted]);
    if (options.signal?.aborted && options.signal.reason?.code !== "TASK_QUERY_TIMEOUT") throw options.signal.reason;
    const result = snapshot(options.signal?.aborted ? String(options.signal.reason?.message || "部分产物查询超时") : undefined);
    options.onSnapshot?.(result);
    return result;
  } finally {
    closed = true;
    if (abort) options.signal?.removeEventListener("abort", abort);
  }
}

function observationDiagnostics(observation: any, evidence: any) {
  return observation?.tmux && !observation.tmux.dead
    ? { ...evidence, scanComplete: false, state: evidence.count ? "anomalous" : "scanning" } : evidence;
}
