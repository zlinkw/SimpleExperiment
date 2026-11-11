/** Native business results stay intact. Only arrays use the transport's existing { result } envelope. */
type Schema = Record<string, unknown>;
const string: Schema = { type: "string" }, number: Schema = { type: "number" }, boolean: Schema = { type: "boolean" };
const value: Schema = { description: "Native JSON value; its type follows the selected configuration or business field." };
const object = (properties: Record<string, Schema> = {}, required: string[] = []): Schema =>
  ({ type: "object", properties, ...(required.length ? { required } : {}), additionalProperties: true });
const array = (items: Schema): Schema => ({ type: "array", items });
const strings = array(string), record = (items: Schema): Schema => ({ type: "object", additionalProperties: items });
const nullable = (schema: Schema): Schema => ({ anyOf: [schema, { type: "null" }] });
const error = object({ ok: { const: false }, error: string, code: { anyOf: [string, number] }, detail: value }, ["ok"]);
const outcome = (schema: Schema): Schema => ({ anyOf: [schema, error] });

// The same declaration controls host scheduling and the advertised request receipt.
export const LONG_TOOLS = new Set(["project_prepare", "project_connect", "plan_preflight", "plan_validate", "result_collect",
  "agent_ensure", "agent_restart", "agent_migrate", "task_stop", "plan_stop", "sftp_upload_files", "sftp_upload_workspace", "sftp_download_paths", "sftp_worker_sync",
  "sftp_worker_directory", "sftp_worker_batch", "sftp_download_mapped", "sftp_handoff", "sftp_from_remote", "file_cleanup_execute",
  "result_list", "result_show", "result_export", "result_compare", "metric_list", "metric_show", "experiment_results", "artifact_list", "artifact_inspect", "tensorboard_start", "tensorboard_stop"]);

const operation = { operationId: string, status: string, error: string, startedAt: string, finishedAt: string };
const receipt = object({ ok: { const: true }, operationId: string, status: { const: "running" }, requestScope: { const: "tool_request" },
  receiptProvesExperimentCompletion: { const: false }, nextTool: { const: "operation_get" }, nextArguments: object({ operationId: string }, ["operationId"]) },
  ["ok", "operationId", "status", "requestScope", "receiptProvesExperimentCompletion", "nextTool", "nextArguments"]);
const plan = object({ planId: string, planFile: string, revision: string });
const task = object({ lifecycleProtocol: number, projectId: string, planFile: string, workflowId: string, commandId: string, index: number,
  workerId: string, gpuId: value, outputDir: string, collectionResultCsv: string, status: string, executionState: string, resultState: string,
  completionState: string, exitCode: nullable(number), successful: boolean, queryState: string, queryError: string,
  verifiedCompletion: object({ verifiedAt: string }), stopIntent: object({ commandId: string, workerId: string, state: string }),
  runtimeDiagnostics: object({ state: string, scanComplete: boolean, count: number, reason: string }), artifactSync: object(), artifactError: string });
const nativeState = object({ lifecycle_protocol: number, project_id: string, workflow_id: string, command_id: string, worker_id: string,
  output_dir: string, result_csv: string, execution_state: string, result_state: string, completion_state: string, successful: boolean,
  exit_code: nullable(number), query_state: string, query_error: string, verified_at: string, stop_requested: boolean });
const experiment = object({ id: string, type: string, name: string, status: string, health_status: string, plan: string,
  worker_id: string, worker: nullable(object({ id: string, host: string })), gpu: nullable(object({ id: string })),
  stage: string, progress: nullable(object()), native_state: nativeState, native_summary: object(), observation_source: string,
  updated_at: string, recentLogs: string });
const snapshot = { snapshot_id: string, snapshot_time: string, runtime_version: string, observation_source: string };
const config = object({ key: string, type: { anyOf: [string, strings] }, scope: string, default: value, value, secret: boolean }, ["key"]);
const state = object({ key: string, label: string, store: string, writable: boolean, value }, ["key"]);
const resultRow = object({ id: string, experimentId: string, status: string, metric: string, value, metrics: record(value),
  source: string, current: boolean, observedAt: nullable(string), updated: string, outputFiles: strings });
const artifact = object({ id: string, path: string, size: value });
const agent = object({ id: string, ok: boolean, status: string, runningVersion: string, message: string,
  tmuxWindow: object({ server: string, session: string, windowId: string, windowName: string }),
  schedulerRuntime: object({ status: string, windowId: string, runningVersion: string, runtimeFiles: record(string) }) });
const cleanupPreview = object({ token: string, digest: string, action: string, scope: object(), rows: array(object({ nodeId: string,
  relativePath: string, absolutePath: string, type: string, disposition: string, error: string })), blockers: array(object()),
  verifiedOnly: boolean, expiresAt: number, confirmations: number }, ["token", "digest", "action", "rows"]);
const cleanupOperation = object({ id: string, preview: cleanupPreview, state: string, targets: record(object({ state: string, receipt: value, error: string })),
  pendingNodes: strings, error: string, updatedAt: string, continuedBy: string, restoredBy: string }, ["id", "state"]);
const filePreview = object({ token: string, digest: string, action: string, node: object({ id: string, kind: string, root: string }),
  rootIdentity: object(), targets: array(object({ relativePath: string, type: string, missing: boolean, fingerprint: string })),
  states: strings, confirmations: number, expiresAt: number, observations: array(object()), statusQueryError: string }, ["token", "digest"]);
const fileExecution = object({ ok: boolean, state: string, operationId: string, receipt: value, settled: boolean,
  alreadyCompleted: boolean, reason: string, notStarted: boolean });
const fileObservation = object({ rootIdentity: object(), target: object({ relativePath: string, type: string, missing: boolean, fingerprint: string }),
  state: string, executorsChecked: boolean, executors: array(object()), queryError: string });
const server = object({ id: string, label: string, host: string, port: number, username: string, remotePath: string });
const tensorboard = object({ status: string, endpointId: string, running: nullable(boolean), listening: nullable(boolean),
  port: number, tmuxSession: string, windowId: string, closedWindowIds: strings, logPath: string, message: string, proxyVerified: boolean }, ["status", "endpointId"]);
const transfer = object({ id: string, operationId: string, status: string, error: string });
const transferResult = object({ ok: boolean, operationId: string, localPath: string, remotePath: string, transferred: number,
  fileCount: number, byteCount: number, skipped: boolean, files: value, errors: array(value), message: string });
const flow = object({ ok: boolean, flow: object({ schemaVersion: number, currentStep: string, steps: record(object()), updatedAt: string }), nextStep: string }, ["flow"]);

const results: Record<string, Schema> = {};
function assign(names: string[], schema: Schema): void { for (const name of names) results[name] = schema; }
assign(["tensorboard_status", "tensorboard_start", "tensorboard_stop"], tensorboard);
assign(["tensorboard_viewer"], object({ url: string, workspace: string, workerId: string, view: { enum: ["scalars", "native"] } }, ["url", "workspace", "workerId", "view"]));
assign(["project_status"], object({ ok: boolean, name: string, version: string, workspace: string, connectionMode: string,
  topology: object(), pid: number, timestamp: string }, ["ok", "name", "version", "workspace", "pid"]));
assign(["action_catalog"], object({ actions: array(object({ command: string, safe: boolean, confirm: boolean, action: string })), count: number }, ["actions", "count"]));
assign(["project_state"], object({ workspace: object(), extensionVersion: string, topology: object(), health: value, selection: object(),
  projectOnboarding: object(), workerTelemetryStatus: array(object()), actionErrors: array(object()), detail: string,
  fullDetailTool: string, fullDetailArguments: object(), planFileInput: string, planStatusSummaries: array(object()), distributedPlans: array(object()) }, ["workspace", "extensionVersion"]));
assign(["project_authorization"], object({ workspace: string, authorization: nullable(object({ workspace: object(), workers: array(server), permissions: strings, grantedAt: string })), userCommand: string }, ["workspace", "authorization", "userCommand"]));
assign(["project_registry"], object({ currentWorkspaceRoot: string, storagePath: string, fileDigest: string, ancestors: array(object()), branches: array(object()), verifiedAt: string }, ["currentWorkspaceRoot", "ancestors", "branches"]));
assign(["project_instances"], object({ schemaVersion: number, instances: array(object({ instanceId: string, workspace: string, version: string, pid: number, startedAt: string, status: string, error: string })), truncated: boolean, note: string }, ["instances", "truncated"]));
assign(["project_connect"], object({ ok: boolean, started: boolean, phase: string, topology: object(), preview: array(object()),
  ports: array(object({ serverId: string, displayName: string, localForwardPort: number, remoteAgentPort: number })) }, ["ok", "started", "phase"]));
assign(["project_prepare"], object({ ok: boolean, operation: string, topology: object(), enabledServers: strings, servers: array(server),
  missing: array(object()), plan: nullable(plan), planSelection: object(), deferredValidation: boolean, test: object(), flow: object() }, ["ok"]));
assign(["project_bootstrap"], object({ ok: boolean, ...operation }, ["ok", "operationId", "status"]));
assign(["project_bootstrap_operation"], object({ ok: boolean, operation: object(operation) }, ["ok", "operation"]));
assign(["plan_list"], object({ planDir: string, detectedProject: object(), plans: array(object()), archivedPlans: array(object()), error: string, source: string }, ["plans", "archivedPlans"]));
assign(["plan_preflight"], object({ ok: boolean, workspace: string, plan, planSelection: object(), ready: boolean, phase: string,
  blocker: nullable(object()), nextAction: string, calls: array(object()), missing: array(object()), flow: object() }, ["ok", "ready"]));
assign(["plan_validate"], object({ ok: boolean, plan, planFile: string, missing: array(object()), validation: object(), nextAction: string }, ["ok"]));
assign(["plan_run"], object({ ok: boolean, started: boolean, ...operation, requestScope: string, receiptProvesExperimentCompletion: boolean,
  plan, confirmation: string, nextAction: string, calls: array(object()) }, ["ok", "operationId", "status"]));
assign(["plan_filter"], object({ ok: boolean, source: string, planDir: string, plans: array(object()), count: number, total: number }, ["ok"]));
assign(["task_list"], object({ lifecycleProtocol: number, stateSource: string, projectId: string, queriedAt: string, queriedWorkerIds: strings,
  jobLifecycle: array(task), workerTasks: array(object({ workerId: string, queryComplete: boolean, controlIncomplete: boolean, diagnosticsPending: boolean,
    error: string, tasks: array(task) })), schedulerStates: value, experimentTraces: array(object()), operations: value }, ["jobLifecycle", "workerTasks", "projectId"]));
assign(["task_stop"], object({ ok: boolean, workerId: string, commandId: string, workflowId: string, receipt: object(),
  completionSource: string, nextTool: string }, ["ok", "workerId", "commandId", "workflowId"]));
assign(["plan_stop"], object({ ok: boolean, stopped: number, matchedOperations: strings, terminatedSessions: strings, terminatedPids: array(number),
  remainingActiveEvidence: array(object()), reconciledOperations: strings }, ["ok"]));
assign(["task_dispatch"], object({ ok: boolean, workflowId: string, indices: array(number), jobs: array(object()), results: array(object()) }));
assign(["task_preflight", "task_preflight_status", "task_preflight_cancel"], object({ ...operation, action: string, commandId: string,
  result: value, payload: object(), progress: value, message: string }));
assign(["task_analyze"], object({ commandId: string, workerId: string, status: string, executionState: string, resultState: string,
  exitCode: nullable(number), completionState: string, runtimeDiagnostics: object(), readOnly: boolean, historyRewritten: boolean }, ["commandId", "workerId", "runtimeDiagnostics"]));
assign(["operation_list"], object({ operations: array(object(operation)), records: array(object(operation)), total: number, offset: number, limit: number, source: string }, ["operations", "records", "total"]));
assign(["gpu_status"], object({ gpu: object(), source: string, gpuHistory: object() }, ["gpu", "source"]));
assign(["gpu_history"], object({ status: string, query: object(), data: object({ series: array(object()), totalPointCount: number }), fetchedAt: string, error: string }));
assign(["log_read"], object({ runKey: string, workerId: string, logs: array(object({ key: string, text: string, offset: number })), count: number }, ["logs", "count"]));
assign(["tmux_list"], object({ type: string, ok: boolean, available: boolean, workerId: string, workers: array(object()),
  sessions: array(object({ name: string, windows: array(object({ windowId: string, name: string, panes: array(object()) })) })), error: string, fetchedAt: string }, ["ok", "sessions"]));
assign(["tmux_capture"], object({ type: string, workerId: string, window: string, text: string, ok: boolean, error: string, fetchedAt: string }, ["ok", "workerId", "window", "text"]));
assign(["result_collect"], object({ source: string, planFile: string, results: array(object()), summary: object() }, ["source", "results", "summary"]));
assign(["server_test"], object({ ok: boolean, topology: object(), rows: array(object({ serverId: string, host: string, port: number, user: string, status: string, message: string, nextAction: string })), error: string }, ["ok", "rows"]));
assign(["agent_inspect", "agent_ensure", "agent_stop", "agent_restart", "agent_migrate"], object({ ok: boolean, results: array(agent) }, ["results"]));
assign(["configuration_list", "sftp_configuration_list"], object({ namespace: string, keys: array(config), secretKeys: strings }, ["namespace", "keys"]));
assign(["configuration_get", "sftp_configuration_get"], config);
assign(["configuration_set", "sftp_configuration_set"], object({ ok: boolean, key: string, scope: string, value, secret: boolean }, ["ok", "key"]));
assign(["configuration_reset", "sftp_configuration_reset", "state_reset"], object({ ok: boolean, key: string, reset: boolean }, ["ok", "key"]));
assign(["state_keys"], object({ keys: array(state) }, ["keys"]));
assign(["state_value"], state);
assign(["state_set"], object({ ok: boolean, key: string, value }, ["ok", "key"]));
assign(["worker_configure"], object({ ok: boolean, workerId: string, worker: object() }, ["ok", "workerId"]));
assign(["flow_get", "flow_update"], flow);
assign(["panel_diagnostics"], object({ lifecycle: string, visualMode: string, runningVersion: string, installedVersion: string,
  rendererNeedsReset: boolean, sectionFailures: strings, lastFailure: nullable(object()), stateDelivery: object(), statePostTraffic: object() }, ["lifecycle", "runningVersion", "sectionFailures"]));
assign(["draft_list"], object({ drafts: array(object()), cleanupCandidates: array(object()), error: string, updatedAt: string }));
assign(["draft_validate"], object({ draftPlanPath: string, status: string, configRefs: strings, issues: array(object()) }, ["draftPlanPath", "status"]));
assign(["draft_promotion_preview"], object({ draftPlanPath: string, status: string, debugRunId: string, metricsSummary: object(), targetPlanPath: string }));
assign(["draft_review", "draft_reject"], object({ ok: boolean, draftPlanPath: string, status: string }, ["ok", "draftPlanPath", "status"]));
assign(["draft_cleanup_candidates"], object({ candidates: array(object()) }, ["candidates"]));
assign(["cleanup_list"], array(object({ id: string, state: string, planFile: string, action: string, pendingNodes: strings, updatedAt: string })));
assign(["cleanup_status", "cleanup_cancel", "cleanup_resume", "cleanup_execute"], cleanupOperation);
assign(["cleanup_preview", "cleanup_continue", "cleanup_restore_preview"], cleanupPreview);
assign(["cleanup_recheck"], array(object({ operationId: string, nodeId: string, checkedAt: string, state: string, targets: array(object()) })));
assign(["file_cleanup_preview", "file_cleanup_status"], filePreview);
assign(["file_cleanup_inspect", "file_cleanup_check", "file_cleanup_verify"], fileObservation);
assign(["file_cleanup_observe_batch"], object({ ok: boolean, observationId: string, capabilities: object(), entries: array(object()), rootIdentity: object() }, ["ok", "observationId"]));
assign(["file_cleanup_review"], object({ requiresUserAction: boolean, token: string, digest: string, requiredConfirmations: number, nextTool: string }, ["requiresUserAction", "token", "digest"]));
assign(["file_cleanup_execute", "file_cleanup_settle"], fileExecution);
assign(["sftp_status"], object({ ok: boolean, plugin: string, version: string, activeServer: nullable(server), api: nullable(object()), serverConfigFile: string }, ["ok", "plugin", "version"]));
assign(["sftp_connection"], object({ ok: boolean, methods: strings, error: string }, ["ok", "methods"]));
assign(["sftp_servers"], object({ ok: boolean, activeServerId: string, servers: array(server) }, ["ok", "servers"]));
assign(["sftp_target", "sftp_target_update"], object({ ok: boolean, localPath: string, host: string, username: string, port: number, remotePath: string, ignoreCount: number, summary: string }, ["ok"]));
assign(["sftp_transfers"], object({ ok: boolean, instanceId: string, transfers: array(transfer), operations: value, settledOperations: value, busy: object() }, ["ok", "transfers"]));
assign(["sftp_server_activate", "sftp_server_save"], object({ ok: boolean, activeServerId: string, server }, ["ok", "server"]));
assign(["sftp_server_delete"], object({ ok: boolean, deletedId: string, activeServerId: string }, ["ok", "deletedId"]));
assign(["sftp_server_import"], object({ ok: boolean, imported: number, activeServerId: string }, ["ok", "imported", "activeServerId"]));
assign(["sftp_confirmation_reset"], object({ ok: boolean, resetCount: number }, ["ok", "resetCount"]));
assign(["sftp_transfer_reconcile", "sftp_transfer_cancel"], object({ ok: boolean, transferId: string, operationId: string, status: string,
  settled: boolean, cancelled: boolean, operationInstanceId: string, instanceId: string }, ["ok"]));
assign(["sftp_tree"], object({ ok: boolean, relativePath: string, exists: boolean, entries: array(object({ path: string, name: string, directory: boolean })) }, ["ok", "entries", "exists"]));
assign(["sftp_tree_state"], object({ ok: boolean, relativePath: string, exists: boolean, empty: boolean }, ["ok", "exists"]));
assign(["sftp_inventory"], object({ ok: boolean, relativePath: string, files: record(object({ size: number, sha256: string, modifiedAtMs: number })), directories: strings, missing: strings }, ["ok"]));
assign(["sftp_file_stats"], object({ ok: boolean, files: record(object({ size: number, modifiedAtMs: number })), missing: strings }, ["ok", "files", "missing"]));
assign(["sftp_plan_logs"], object({ ok: boolean, paths: strings }, ["ok", "paths"]));
assign(["sftp_download_scope"], object({ ok: boolean, scope: object({ paths: strings, extensions: strings, maxFileSizeMB: number }) }, ["ok", "scope"]));
assign(["sftp_remote_directories"], object({ ok: boolean, remotePath: string, dirs: array(value) }, ["ok", "remotePath", "dirs"]));
assign(["sftp_upload_files", "sftp_upload_workspace", "sftp_download_paths", "sftp_worker_sync", "sftp_worker_directory", "sftp_worker_batch",
  "sftp_download_mapped", "sftp_handoff", "sftp_from_remote"], transferResult);
assign(["experiment_list"], array(experiment));
assign(["experiment_summary"], object({ running_count: number, failed_count: number, success_count: number, workflows: number,
  active_workers: strings, gpu_usage: array(object()), stalled_experiments: strings, recent_failures: array(object()) }, ["running_count", "failed_count", "success_count"]));
assign(["experiment_active"], object({ active_count: number, workflows: array(experiment), runs: array(experiment) }, ["active_count", "workflows", "runs"]));
assign(["experiment_tree"], array(object({ id: string, type: string, stage: string, status: string, children_count: number, children: array(object()) })));
assign(["experiment_overview"], object({ schema_version: string, snapshot: object(snapshot), summary: object(), active: object(), alerts: object(), health: object() }, ["summary", "active", "health"]));
assign(["experiment_health"], object({ schema_version: string, snapshot: object(snapshot), health: object(), alerts: object() }, ["health", "alerts"]));
assign(["experiment_status"], object({ ...experiment.properties as Record<string, Schema>, ...snapshot }, ["id", "status"]));
assign(["experiment_inspect"], object({ schema_version: string, snapshot: object(snapshot), summary: object(), status: object(),
  progress: nullable(object()), health: object(), diagnosis: object(), alerts: object() }, ["summary", "status", "diagnosis"]));
assign(["experiment_monitor"], object({ ...experiment.properties as Record<string, Schema>, ...snapshot, epoch: nullable(number), batch: nullable(number), loss: nullable(number), latest_message: string }, ["id", "status"]));
assign(["experiment_diagnose"], object({ ...experiment.properties as Record<string, Schema>, ...snapshot, reason: strings, last_stage: string, suggestions: strings, evidence: strings }, ["id", "status", "reason"]));
assign(["experiment_config"], object({ id: string, config_path: string, yaml: string, experiment_case: string, seed: string, dataset: string,
  model: string, optimizer: string, batch_size: string, epoch: string }, ["id", "config_path", "yaml"]));
assign(["experiment_log"], array(object({ timestamp: string, level: string, message: string })));
assign(["result_list"], array(resultRow));
assign(["result_show"], object({ ...resultRow.properties as Record<string, Schema>, time: nullable(string), config: value, seed: value, checkpoint: value }, ["id", "metrics"]));
assign(["metric_list"], object({ metrics: strings }, ["metrics"]));
assign(["metric_show"], record(number));
assign(["experiment_results"], object({ experimentId: string, current: boolean, result_ids: strings, metrics: value, output_paths: strings, reason: string }, ["result_ids", "metrics"]));
assign(["result_export"], object({ id: string, source: string, current: boolean, observedAt: nullable(string), format: string, path: string, content: string }, ["id", "format", "content"]));
assign(["result_compare"], object({ left: string, right: string, metric_difference: record(object({ left: number, right: number, delta: number })), improvement: strings, regression: strings, reason: string }, ["left", "right", "metric_difference"]));
assign(["result_parse"], array(object({ runKey: string, metrics: record(value), source: value })));
assign(["result_paper_table"], { anyOf: [object({ config: object(), rows: array(object()) }, ["config", "rows"]),
  object({ content: string, format: string, source: string }, ["content", "format", "source"])] });
assign(["metric_leaderboard"], object({ metrics: strings, board: array(object()) }, ["metrics", "board"]));
assign(["artifact_list"], array(artifact));
assign(["artifact_inspect"], object({ id: string, file: string, size: value, mtime: string, hash: string }, ["id", "file", "size"]));
assign(["resource_available"], array(object({ server: string, gpu: string, available: string, reason: string, utilization: value })));
assign(["server_list"], array(object({ id: string, online: string, ssh: string, gpu: string })));
assign(["plan_matrix"], object({ count: number, suite: string, cases: number, seeds: number, filteredCount: number }, ["count", "suite", "cases", "seeds"]));
assign(["plan_build"], object({ suite: string, baseConfig: string, seeds: strings, yaml: string }, ["suite", "baseConfig", "seeds", "yaml"]));

results.operation_get = { ...object({ ...operation, type: string, tool: string, resultAvailable: boolean,
  requestScope: string, receiptProvesExperimentCompletion: boolean, result: value }, ["operationId", "status", "tool", "resultAvailable"]),
  allOf: [...LONG_TOOLS].map(name => ({ if: { properties: { tool: { const: name } }, required: ["tool"] },
    then: { properties: { result: outcome(results[name]) } } })) };

export function toolOutputSchema(name: string): Schema {
  const native = results[name];
  if (!native) throw Error("MCP_OUTPUT_SCHEMA_MISSING: " + name);
  const success = LONG_TOOLS.has(name) ? receipt : native.type === "array" ? object({ result: native }, ["result"]) : native;
  return { type: "object", description: LONG_TOOLS.has(name)
    ? "Request receipt only. Query operation_get with operationId; its result is the complete native outcome, not experiment completion."
    : "Native structured result. Optional evidence may remain unknown; additional native fields are preserved.", anyOf: [success, error] };
}
