import * as http from "http";
import { optionalApi } from "./api";

export interface RuntimeProgress {
  epoch: number | null;
  max_epoch: number | null;
  batch: number | null;
  total_batch: number | null;
  percent: number | null;
  loss: number | null;
  lr: string | null;
  memory: string | null;
}

export interface RuntimeObservation {
  run_id: string;
  plan: string;
  status: "running";
  worker: { id: string; host: string };
  tmux: { session: string; window: string; pane: string };
  stage: string;
  progress: RuntimeProgress | null;
  gpu: { id: string; memory: string; utilization: string };
  config: { path: string; experiment_case: string; seed: string; model: string; dataset: string };
  log: string;
  updated_at: string;
}

interface WorkerEndpoint {
  id: string;
  host: string;
  port: number;
}

export async function observeRunningExperiments(): Promise<RuntimeObservation[]> {
  const endpoints = await enabledWorkerEndpoints();
  const observed: RuntimeObservation[] = [];
  for (const endpoint of endpoints) {
    const sessions = await tmuxList(endpoint);
    for (const session of sessions) {
      for (const window of session.windows || []) {
        const runId = runIdFromName(window.name);
        if (!runId) continue;
        const capture = await tmuxCapture(endpoint, window.target || `${session.name}:${window.index}`);
        if (!capture) continue;
        const observation = observationFromCapture(endpoint, session.name, window, capture);
        observation.config = await configFromWorker(endpoint, observation.config);
        observed.push(observation);
      }
    }
  }
  return observed;
}

export function observationFromCapture(
  endpoint: WorkerEndpoint,
  sessionName: string,
  window: { index?: string; name?: string; target?: string; panes?: Array<{ index?: string; target?: string }> },
  text: string,
): RuntimeObservation {
  const pane = (window.panes || [])[0] || {};
  const fields = launchFields(text);
  const progress = parseTrainingProgress(text);
  return {
    run_id: runIdFromName(window.name) || "",
    plan: fields.plan || "",
    status: "running",
    worker: { id: fields.worker_id || endpoint.id, host: endpoint.host },
    tmux: {
      session: sessionName,
      window: window.target || `${sessionName}:${window.index || ""}`,
      pane: pane.target || `${window.target || sessionName}.0`,
    },
    stage: fields.stage || "",
    progress,
    gpu: {
      id: fields.gpu_ids || "",
      memory: progress?.memory || "",
      utilization: "",
    },
    config: {
      path: fields.config_path || "",
      experiment_case: fields.case || "",
      seed: fields.seed || "",
      model: fields.model || "",
      dataset: fields.dataset || "",
    },
    log: text.trim(),
    updated_at: new Date().toISOString(),
  };
}

export function currentTrainingLoopPercent(
  epoch: number | null,
  maxEpoch: number | null,
  batch: number | null,
  totalBatch: number | null,
  epochPercent: number | null,
): number | null {
  if (!Number.isFinite(epoch) || !Number.isFinite(maxEpoch) || maxEpoch === null || maxEpoch <= 0) return null;
  const currentEpoch = Math.min(maxEpoch, Math.max(1, epoch as number));
  let withinEpoch = 0;
  if (Number.isFinite(batch) && Number.isFinite(totalBatch) && totalBatch !== null && totalBatch > 0) {
    withinEpoch = Math.min(1, Math.max(0, (batch as number) / totalBatch));
  } else if (Number.isFinite(epochPercent)) {
    withinEpoch = Math.min(1, Math.max(0, (epochPercent as number) / 100));
  }
  const completedEpochs = Math.max(0, currentEpoch - 1);
  const loopPercent = (completedEpochs + withinEpoch) / maxEpoch * 100;
  return Math.round(Math.min(100, Math.max(0, loopPercent)) * 10) / 10;
}

/** @deprecated Use currentTrainingLoopPercent. */
export function overallTrainingPercent(
  epoch: number | null,
  maxEpoch: number | null,
  batch: number | null,
  totalBatch: number | null,
  epochPercent: number | null,
): number | null {
  return currentTrainingLoopPercent(epoch, maxEpoch, batch, totalBatch, epochPercent);
}

export function parseTrainingProgress(text: string): RuntimeProgress | null {
  const source = String(text || "");
  const epoch = source.match(/epoch\s+(\d+)\s*\/\s*(\d+)/i);
  const batch = source.match(/(\d+)\s*\/\s*(\d+)\s+\d+:\d+:\d+/);
  const epochPercent = source.match(/(\d+(?:\.\d+)?)\s*%/);
  const loss = source.match(/当前\s*loss\s+([0-9]+(?:\.[0-9]+)?)/i);
  const lr = source.match(/\blr\s+([0-9]+(?:\.[0-9]+)?e[+-]?\d+)/i);
  const memory = source.match(/显存\s+([0-9]+(?:\.[0-9]+)?\s*GiB)/i);
  if (!epoch && !batch && !loss && !lr && !memory) return null;
  const epochValue = epoch ? Number(epoch[1]) : null;
  const maxEpochValue = epoch ? Number(epoch[2]) : null;
  const batchValue = batch ? Number(batch[1]) : null;
  const totalBatchValue = batch ? Number(batch[2]) : null;
  return {
    epoch: epochValue,
    max_epoch: maxEpochValue,
    batch: batchValue,
    total_batch: totalBatchValue,
    percent: currentTrainingLoopPercent(epochValue, maxEpochValue, batchValue, totalBatchValue, epochPercent ? Number(epochPercent[1]) : null),
    loss: loss ? Number(loss[1]) : null,
    lr: lr ? lr[1] : null,
    memory: memory ? memory[1].replace(/\s+/g, " ") : null,
  };
}

export function matchesRuntime(query: string, observation: RuntimeObservation, operationId = ""): boolean {
  const wanted = String(query || "").trim();
  if (!wanted) return false;
  return [observation.run_id, observation.plan, observation.tmux.window, observation.tmux.session, operationId]
    .some((value) => value && (value === wanted || value.endsWith(wanted) || wanted.endsWith(value)));
}

async function enabledWorkerEndpoints(): Promise<WorkerEndpoint[]> {
  const state = await optionalApi("state.get", { key: "setupConfig" });
  const setup = asRecord(asRecord(state).value);
  const workers = Array.isArray(setup.workerTunnels) ? setup.workerTunnels.map(asRecord) : [];
  const out: WorkerEndpoint[] = [];
  for (const worker of workers) {
    if (worker.enabled === false) continue;
    const port = Number(worker.localForwardPort);
    if (!Number.isInteger(port) || port <= 0) continue;
    out.push({
      id: String(worker.id || worker.displayName || ""),
      host: String(worker.localForwardHost || worker.localHost || "127.0.0.1"),
      port,
    });
  }
  return out;
}

async function tmuxList(endpoint: WorkerEndpoint): Promise<Array<{ name: string; windows: Array<Record<string, any>> }>> {
  const payload = await agentGet(endpoint, "/api/tmux/list");
  const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];
  return sessions.map((session) => ({
    name: String(asRecord(session).name || ""),
    windows: Array.isArray(asRecord(session).windows) ? asRecord(session).windows as Array<Record<string, any>> : [],
  })).filter((session) => session.name);
}

async function tmuxCapture(endpoint: WorkerEndpoint, target: string): Promise<string> {
  const payload = await agentGet(endpoint, `/api/tmux/capture?window=${encodeURIComponent(target)}`);
  return String(payload?.text || payload?.output || "");
}

function agentGet(endpoint: WorkerEndpoint, urlPath: string): Promise<Record<string, any> | null> {
  return agentText(endpoint, urlPath).then((text) => {
    if (!text) return null;
    try { return JSON.parse(text) as Record<string, any>; } catch { return null; }
  });
}

function agentText(endpoint: WorkerEndpoint, urlPath: string): Promise<string> {
  return new Promise((resolve) => {
    const req = http.request({
      host: endpoint.host,
      port: endpoint.port,
      path: urlPath,
      method: "GET",
      timeout: 5000,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(res.statusCode === 200 ? Buffer.concat(chunks).toString("utf8") : ""));
    });
    req.on("error", () => resolve(""));
    req.on("timeout", () => { req.destroy(); resolve(""); });
    req.end();
  });
}

async function configFromWorker(endpoint: WorkerEndpoint, config: RuntimeObservation["config"]): Promise<RuntimeObservation["config"]> {
  if (!config.path || (config.model && config.dataset && config.experiment_case)) return config;
  const yaml = await agentText(endpoint, `/api/files/download?path=${encodeURIComponent(config.path)}&maxBytes=200000`);
  if (!yaml || yaml.startsWith("{")) return config;
  return {
    ...config,
    experiment_case: experimentCase(yaml) || config.experiment_case,
    model: config.model || nestedYamlValue(yaml, "model", "name") || nestedYamlValue(yaml, "model", "joint_encoder"),
    dataset: config.dataset || nestedYamlValue(yaml, "data", "dataset"),
    seed: integerText(config.seed) || integerText(yamlValue(yaml, "seed")),
  };
}

function launchFields(text: string): Record<string, string> {
  const raw = String(text || "");
  const source = unwrapTerminalText(raw);
  const configPath = jsonStringField(source, "config_path") || jsonStringField(source, "config") || flagValue(source, "config");
  const yaml = yamlObject(source);
  return {
    plan: jsonStringField(source, "plan") || jsonStringField(source, "plan_file"),
    worker_id: jsonStringField(source, "worker_id"),
    gpu_ids: jsonStringField(source, "gpu_ids"),
    config_path: configPath,
    case: experimentCase(yaml) || flagValue(source, "case") || pathTail(configPath),
    seed: jsonIntegerField(source, "seed") || integerFlagValue(raw, "seed") || pathSeed(configPath) || integerText(yamlValue(yaml, "seed")),
    model: yamlValue(yaml, "model") || yamlValue(yaml, "encoder_profile"),
    dataset: yamlValue(yaml, "dataset") || yamlValue(yaml, "data"),
    stage: stageFromCommand(source),
  };
}

function unwrapTerminalText(text: string): string {
  return String(text || "").replace(/\r?\n/g, "");
}

function yamlObject(text: string): string {
  const marker = text.lastIndexOf('{"');
  return marker >= 0 ? text.slice(0, marker) : text;
}

function jsonStringField(text: string, key: string): string {
  const match = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]+)`));
  return match ? match[1] : "";
}

function integerText(value: unknown): string {
  const text = String(value ?? "").trim();
  return /^[+-]?\d+$/.test(text) ? text : "";
}

function jsonIntegerField(text: string, key: string): string {
  const match = String(text || "").match(new RegExp(`"${key}"\\s*:\\s*([+-]?\\d+)(?=\\s*[,}])`));
  return match ? integerText(match[1]) : "";
}

function integerFlagValue(text: string, name: string): string {
  return integerText(flagValue(text, name));
}

function stageFromCommand(text: string): string {
  const match = String(text || "").match(/--stage\s+([A-Za-z0-9_-]+)/);
  return match ? match[1] : "";
}

function flagValue(text: string, name: string): string {
  const pattern = "--" + name + "\\s+(\\S+)";
  const match = String(text || "").match(new RegExp(pattern));
  return match ? match[1] : "";
}

function pathTail(value: string): string {
  const name = value.split("/").pop() || "";
  return name.replace(/_seed\d+$/, "").replace(/^\d+_/, "");
}

function pathSeed(value: string): string {
  return value.match(/_seed(\d+)(?:\/|$)/)?.[1] || "";
}

function yamlValue(text: string, key: string): string {
  const match = text.match(new RegExp(`(?:^|\\n)\\s*${key}\\s*:\\s*([^#\\n]+)`));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : "";
}

function experimentCase(text: string): string {
  const named = yamlValue(text, "experiment_name").split("/").filter(Boolean);
  return named.length >= 2 ? named[named.length - 2] : "";
}

function nestedYamlValue(text: string, section: string, key: string): string {
  const block = String(text || "").match(new RegExp(`(?:^|\\n)${section}:\\n((?:[ \\t]+.*\\n?)*)`));
  return block ? yamlValue(`\n${block[1]}`, key) : "";
}

function runIdFromName(value: unknown): string {
  const name = String(value || "").trim();
  return /^run-\d+$/.test(name) ? name : "";
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}
