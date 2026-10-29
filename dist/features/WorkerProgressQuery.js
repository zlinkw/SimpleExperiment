"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeProgressSnapshot = void 0;
exports.executionProgressSnapshot = executionProgressSnapshot;
exports.completeProgressSnapshot = completeProgressSnapshot;
exports.queryWorkerProgress = queryWorkerProgress;
exports.progressEvidenceReport = progressEvidenceReport;
const TaskLifecycle_1 = require("./TaskLifecycle");
const WorkerProgressEvidence_1 = require("./WorkerProgressEvidence");
const WorkerProgressDiagnostics_1 = require("./WorkerProgressDiagnostics");
var WorkerProgressEvidence_2 = require("./WorkerProgressEvidence");
Object.defineProperty(exports, "mergeProgressSnapshot", { enumerable: true, get: function () { return WorkerProgressEvidence_2.mergeProgressSnapshot; } });
const progressCursors = new WeakMap();
function executionProgressSnapshot(live, previous, startedAt) {
    const timing = (0, WorkerProgressEvidence_1.observationTiming)(live, startedAt);
    const key = (task) => task.projectId + ":" + task.commandId;
    const rows = new Map((live.tasks || []).map((task) => [key(task), task]));
    for (const task of previous?.tasks || [])
        if (!rows.has(key(task)))
            rows.set(key(task), { ...task,
                observation: { lifecycleProtocol: 2, commandId: task.commandId, projectId: task.projectId, workerId: task.workerId,
                    observedAt: live.generatedAt } });
    const incoming = { ...live, fetchedAt: timing.receivedAt, tasks: [...rows.values()].map((task) => ({ ...task,
            observation: { ...task.observation, evidence: { execution: timing } } })) };
    return (0, WorkerProgressEvidence_1.mergeProgressSnapshot)(previous, incoming);
}
function completeProgressSnapshot(value, startedAt) {
    const timing = (0, WorkerProgressEvidence_1.observationTiming)(value, startedAt);
    return { ...value, localQueryTiming: timing, tasks: (value.tasks || []).map((task) => ({ ...task,
            ...(task.observation ? { observation: { ...task.observation, evidence: { execution: timing, artifacts: timing,
                        ...(task.observation.runtimeDiagnostics ? { logs: timing } : {}) } } } : {}) })) };
}
/** Current-round observations only. One slow result cannot discard its siblings. */
async function queryWorkerProgress(client, workerId, queries, execution, options = {}) {
    const key = (task) => task.projectId + ":" + task.commandId;
    const selected = new Map();
    for (const task of [...queries, ...(execution.tasks || [])])
        if (task.commandId && task.projectId && task.workerId === workerId && task.outputDir
            && !options.excludeVerified?.has(key(task)))
            selected.set(key(task), { ...selected.get(key(task)), ...task });
    // Low traffic follows live panes until exit; manual rounds retain full details.
    if (options.terminalOnly)
        for (const task of execution.tasks || [])
            if (task.observation?.tmux?.dead === false)
                selected.delete(key(task));
    const rows = new Map((execution.tasks || []).map((task) => [key(task), task]));
    for (const [id, query] of selected)
        if (!rows.has(id))
            rows.set(id, { ...query, observation: {
                    lifecycleProtocol: 2, commandId: query.commandId, projectId: query.projectId, workerId,
                    observedAt: execution.generatedAt, evidence: { execution: (0, WorkerProgressEvidence_1.observationTiming)(execution, execution.progressRequestStartedAt || execution.fetchedAt || new Date().toISOString()) }
                } });
    const selection = [...selected.values()], checked = new Set(), errors = new Map();
    const needsDiagnostics = new Set(), diagnosticsChecked = new Set(), runtimeErrors = new Map();
    const artifactAttempts = new Map();
    let cursors = progressCursors.get(client);
    if (!cursors) {
        cursors = new Map();
        progressCursors.set(client, cursors);
    }
    const scope = workerId + ":" + [...new Set(selection.map(task => task.projectId))].sort().join(",");
    const start = (cursors.get(scope) || 0) % Math.max(1, selection.length);
    const entries = [...selection.slice(start), ...selection.slice(0, start)];
    if (cursors.size > 64)
        cursors.delete(cursors.keys().next().value);
    const cleanup = new Map();
    let index = 0, closed = false, detached = false, controlIncomplete = false, capabilities = execution.capabilities;
    const cancelled = () => !detached && options.signal?.aborted;
    const snapshot = (reason) => {
        const partial = !entries.length || checked.size !== entries.length || errors.size > 0;
        const { executionOnly: _, ...base } = execution;
        return { ...base, workerId, fetchedAt: execution.fetchedAt || new Date().toISOString(), capabilities,
            ...(partial ? { executionOnly: true,
                ...(!entries.length && options.terminalOnly ? { backgroundDetailsDeferred: true }
                    : { resultQueryError: reason || [...errors.values()].join("; ") || "部分产物仍在核实" }) } : {}),
            ...(controlIncomplete ? { controlIncomplete: true } : {}),
            ...(needsDiagnostics.size > diagnosticsChecked.size ? { diagnosticsPending: true,
                ...(reason ? { runtimeQueryError: reason } : {}) } : {}),
            ...(runtimeErrors.size ? { runtimeQueryError: [...runtimeErrors.values()].join("; ") } : {}),
            tasks: [...rows.values()], cleanupExecutors: [...cleanup.values()] };
    };
    const publish = () => { if (!closed)
        options.onSnapshot?.(snapshot()); };
    const fail = (query, message, startedAt) => {
        const id = key(query), prior = rows.get(id) || query;
        errors.set(id, message);
        rows.set(id, { ...prior, observation: { ...(prior.observation || {}), resultQueryError: message,
                evidence: { ...prior.observation?.evidence, artifacts: { requestedAt: startedAt, receivedAt: new Date().toISOString(), failed: true } } } });
    };
    const runtimeFailure = (query, message, startedAt) => {
        const id = key(query), prior = rows.get(id);
        runtimeErrors.set(id, message);
        if (prior) {
            const known = prior.observation?.runtimeDiagnostics;
            const evidence = known?.commandId === query.commandId && known?.runId === query.commandId && known.count > 0
                ? { ...known, scanComplete: false, reason: message }
                : { schemaVersion: 1, commandId: query.commandId, runId: query.commandId,
                    state: "unverified", count: 0, scanComplete: false, reason: message };
            rows.set(id, { ...prior, runtimeDiagnostics: evidence, completionState: evidence.count > 0 ? "review_required" : "unverified", successful: false,
                observation: { ...prior.observation, runtimeDiagnostics: evidence, runtimeQueryError: message,
                    evidence: { ...prior.observation?.evidence, logs: { requestedAt: startedAt, receivedAt: new Date().toISOString(), failed: true } } } });
        }
    };
    const lane = async () => {
        while (!closed && !options.signal?.aborted && index < entries.length) {
            const batch = entries.slice(index, index + 4);
            index += batch.length;
            cursors.set(scope, (start + index) % entries.length);
            const startedAt = new Date().toISOString();
            for (const query of batch)
                artifactAttempts.set(key(query), startedAt);
            try {
                const value = await client.getWorkerTasks(workerId, { signal: options.signal,
                    selectedOnly: true, observationOnly: true, queries: batch.map(WorkerProgressDiagnostics_1.progressQuery) });
                if (closed || options.signal?.aborted)
                    return;
                if (value?.error || value?.queryComplete !== true || value?.capabilities?.taskLifecycle !== 2
                    || value?.resultsOnly !== true && !Array.isArray(value?.cleanupExecutors))
                    throw new Error(value?.error || "所选任务的产物查询未完成");
                capabilities = { ...capabilities, ...value.capabilities };
                for (const item of value.cleanupExecutors || [])
                    cleanup.set(JSON.stringify(item), item);
                for (const query of batch) {
                    const id = key(query);
                    const task = value?.tasks?.find((task) => key(task) === id && task.workerId === workerId);
                    if (!task || task.observation?.queryError) {
                        fail(query, task?.observation?.queryError || "所选任务的产物查询未完成", startedAt);
                        continue;
                    }
                    if (value.resultsOnly === true) {
                        controlIncomplete = true;
                        const prior = rows.get(id) || query;
                        const observation = { ...task.observation, ...(prior.observation?.tmux ? { tmux: prior.observation.tmux } : {}),
                            runtimeDiagnostics: value.metadataOnly ? prior.observation?.runtimeDiagnostics : task.observation?.runtimeDiagnostics,
                            evidence: { ...prior.observation?.evidence, artifacts: (0, WorkerProgressEvidence_1.observationTiming)(value, startedAt) } };
                        if (observation.tmux && !observation.tmux.dead && observation.runtimeDiagnostics) {
                            observation.runtimeDiagnostics = { ...observation.runtimeDiagnostics, scanComplete: false,
                                state: observation.runtimeDiagnostics.count ? "anomalous" : "scanning" };
                        }
                        const state = (0, TaskLifecycle_1.taskLifecycle)(observation);
                        rows.set(id, { ...prior, ...task, observation, status: state.status, executionState: state.execution,
                            resultState: state.result, completionState: state.completionState, runtimeDiagnostics: state.runtimeDiagnostics,
                            exitCode: state.exitCode, successful: state.status === "completed" && state.completionState === "verified" });
                    }
                    else
                        rows.set(id, { ...task, observation: { ...task.observation,
                                evidence: { execution: (0, WorkerProgressEvidence_1.observationTiming)(value, startedAt), artifacts: (0, WorkerProgressEvidence_1.observationTiming)(value, startedAt),
                                    ...(task.observation?.runtimeDiagnostics ? { logs: (0, WorkerProgressEvidence_1.observationTiming)(value, startedAt) } : {}) } } });
                    checked.add(id);
                    if (value.metadataOnly === true)
                        needsDiagnostics.add(id);
                }
            }
            catch (error) {
                if (closed || options.signal?.aborted)
                    return;
                const message = error instanceof Error ? error.message : String(error);
                for (const query of batch)
                    fail(query, message, startedAt);
            }
            publish();
            if (options.deferDiagnostics)
                for (const query of batch)
                    if (needsDiagnostics.has(key(query))) {
                        detached = true;
                        (0, WorkerProgressDiagnostics_1.enqueueProgressDiagnostics)(client, workerId, query, (value, timing, error) => {
                            if (closed || options.signal?.aborted && options.signal.reason?.code !== "TASK_QUERY_TIMEOUT")
                                return;
                            const id = key(query), prior = rows.get(id);
                            const task = value?.tasks?.find((t) => key(t) === id && t.workerId === workerId);
                            const evidence = task?.observation?.runtimeDiagnostics;
                            if (error || !evidence || task.observation.runtimeQueryError || task.observation.queryError) {
                                runtimeFailure(query, error instanceof Error ? error.message : String(error || task?.observation?.runtimeQueryError
                                    || task?.observation?.queryError || "未取得本次运行日志"), timing?.requestedAt || new Date().toISOString());
                            }
                            else {
                                const observation = { ...prior.observation, runtimeDiagnostics: observationDiagnostics(prior.observation, evidence), runtimeQueryError: undefined,
                                    evidence: { ...prior.observation?.evidence, logs: timing } };
                                const state = (0, TaskLifecycle_1.taskLifecycle)(observation);
                                rows.set(id, { ...prior, observation, runtimeDiagnostics: state.runtimeDiagnostics, completionState: state.completionState,
                                    successful: state.status === "completed" && state.completionState === "verified" });
                                runtimeErrors.delete(id);
                                if (evidence.scanComplete)
                                    diagnosticsChecked.add(id);
                            }
                            publish();
                        });
                    }
        }
    };
    const readLogs = async () => {
        if (closed || cancelled() || !needsDiagnostics.size)
            return;
        // Every artifact receipt is published before any raw log request. A log
        // timeout changes only runtime evidence, never the verified result state.
        const jobs = selection.filter(query => needsDiagnostics.has(key(query))).sort((a, b) => key(a).localeCompare(key(b)));
        const logScope = scope + ":logs", start = detached ? 0 : (cursors.get(logScope) || 0) % jobs.length;
        const logs = [...jobs.slice(start), ...jobs.slice(0, start)];
        let next = 0;
        const logLane = async () => {
            while (!closed && !cancelled() && next < logs.length) {
                const batch = logs.slice(next, next + 4);
                next += batch.length;
                cursors.set(logScope, (start + next) % jobs.length);
                const startedAt = new Date().toISOString();
                try {
                    const value = await client.getWorkerTasks(workerId, { signal: options.signal,
                        selectedOnly: true, observationOnly: true, diagnosticsOnly: true, queries: batch.map(WorkerProgressDiagnostics_1.progressQuery) });
                    if (closed || cancelled())
                        return;
                    if (value?.queryComplete !== true || value?.error)
                        throw Error(value?.error || "运行日志核实未完成");
                    for (const query of batch) {
                        const id = key(query), prior = rows.get(id), task = value.tasks?.find((task) => key(task) === id && task.workerId === workerId);
                        const evidence = task?.observation?.runtimeDiagnostics;
                        if (!evidence || task.observation.runtimeQueryError || task.observation.queryError) {
                            runtimeFailure(query, task?.observation?.runtimeQueryError || task?.observation?.queryError || "未取得本次运行日志", startedAt);
                            continue;
                        }
                        const observation = { ...prior.observation, runtimeDiagnostics: observationDiagnostics(prior.observation, evidence), runtimeQueryError: undefined,
                            evidence: { ...prior.observation?.evidence, logs: (0, WorkerProgressEvidence_1.observationTiming)(value, startedAt) } };
                        const state = (0, TaskLifecycle_1.taskLifecycle)(observation);
                        rows.set(id, { ...prior, observation, runtimeDiagnostics: state.runtimeDiagnostics, completionState: state.completionState,
                            successful: state.status === "completed" && state.completionState === "verified" });
                        diagnosticsChecked.add(id);
                    }
                }
                catch (error) {
                    if (closed || cancelled())
                        return;
                    for (const query of batch)
                        runtimeFailure(query, error instanceof Error ? error.message : String(error), startedAt);
                }
                publish();
            }
        };
        await Promise.all(Array.from({ length: Math.min(4, Math.ceil(logs.length / 4)) }, logLane));
    };
    const read = async () => {
        await Promise.all(Array.from({ length: Math.min(4, entries.length) }, lane));
        if (closed || options.signal?.aborted)
            return;
        if (!options.deferDiagnostics)
            await readLogs();
    };
    let abort;
    const interrupted = new Promise(resolve => {
        abort = resolve;
        options.signal?.addEventListener("abort", abort, { once: true });
        if (options.signal?.aborted)
            resolve();
    });
    try {
        await Promise.race([read(), interrupted]);
        if (options.signal?.aborted && options.signal.reason?.code !== "TASK_QUERY_TIMEOUT")
            throw options.signal.reason;
        if (options.signal?.aborted)
            for (const query of entries)
                if (!checked.has(key(query)))
                    fail(query, String(options.signal.reason?.message || "产物查询未完成"), artifactAttempts.get(key(query)) || execution.progressRequestStartedAt || execution.fetchedAt || new Date().toISOString());
        const result = snapshot(options.signal?.aborted ? String(options.signal.reason?.message || "部分产物查询超时") : undefined);
        options.onSnapshot?.(result);
        return result;
    }
    finally {
        if (!detached)
            closed = true;
        if (abort)
            options.signal?.removeEventListener("abort", abort);
    }
}
function observationDiagnostics(observation, evidence) {
    return observation?.tmux && !observation.tmux.dead
        ? { ...evidence, scanComplete: false, state: evidence.count ? "anomalous" : "scanning" } : evidence;
}
/** Bounded, memory-only timing evidence; excludes tokens, paths and log text. */
function progressEvidenceReport(snapshots, now, maxAgeMs) {
    return snapshots.flatMap(snapshot => (snapshot.tasks || []).slice(0, 128).map((task) => ({
        workerId: snapshot.workerId, projectId: task.projectId, commandId: task.commandId,
        requestedAt: snapshot.progressRequestStartedAt, publishedAt: snapshot.publishedAt,
        remoteObservedAt: task.observation?.observedAt, fetchedAt: snapshot.fetchedAt,
        evaluatedAt: new Date(now).toISOString(), maxAgeMs,
        evidence: Object.fromEntries(["execution", "artifacts", "logs"].map(lane => {
            const timing = task.observation?.evidence?.[lane];
            const ageMs = now - Date.parse(timing?.failed ? "" : timing?.networkStartedAt || snapshot.fetchedAt || "");
            return [lane, { ...timing, available: Boolean(timing && !timing.failed), source: timing?.failed ? "query_failed" : timing ? "local_network_observation" : "legacy_snapshot",
                    ageMs: Number.isFinite(ageMs) ? ageMs : null,
                    expired: !timing && Boolean(task.observation?.evidence) || !Number.isFinite(ageMs) || ageMs > maxAgeMs || ageMs < -30000 }];
        })),
    }))).slice(0, 256);
}
