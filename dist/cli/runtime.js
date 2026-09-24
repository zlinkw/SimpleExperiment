"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.observeRunningExperiments = observeRunningExperiments;
exports.observationFromCapture = observationFromCapture;
exports.currentTrainingLoopPercent = currentTrainingLoopPercent;
exports.overallTrainingPercent = overallTrainingPercent;
exports.parseTrainingProgress = parseTrainingProgress;
exports.matchesRuntime = matchesRuntime;
const http = __importStar(require("http"));
const api_1 = require("./api");
async function observeRunningExperiments() {
    const endpoints = await enabledWorkerEndpoints();
    const observed = [];
    for (const endpoint of endpoints) {
        const sessions = await tmuxList(endpoint);
        for (const session of sessions) {
            for (const window of session.windows || []) {
                const runId = runIdFromName(window.name);
                if (!runId)
                    continue;
                const capture = await tmuxCapture(endpoint, window.target || `${session.name}:${window.index}`);
                if (!capture)
                    continue;
                const observation = observationFromCapture(endpoint, session.name, window, capture);
                observation.config = await configFromWorker(endpoint, observation.config);
                observed.push(observation);
            }
        }
    }
    return observed;
}
function observationFromCapture(endpoint, sessionName, window, text) {
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
function currentTrainingLoopPercent(epoch, maxEpoch, batch, totalBatch, epochPercent) {
    if (!Number.isFinite(epoch) || !Number.isFinite(maxEpoch) || maxEpoch === null || maxEpoch <= 0)
        return null;
    const currentEpoch = Math.min(maxEpoch, Math.max(1, epoch));
    let withinEpoch = 0;
    if (Number.isFinite(batch) && Number.isFinite(totalBatch) && totalBatch !== null && totalBatch > 0) {
        withinEpoch = Math.min(1, Math.max(0, batch / totalBatch));
    }
    else if (Number.isFinite(epochPercent)) {
        withinEpoch = Math.min(1, Math.max(0, epochPercent / 100));
    }
    const completedEpochs = Math.max(0, currentEpoch - 1);
    const loopPercent = (completedEpochs + withinEpoch) / maxEpoch * 100;
    return Math.round(Math.min(100, Math.max(0, loopPercent)) * 10) / 10;
}
/** @deprecated Use currentTrainingLoopPercent. */
function overallTrainingPercent(epoch, maxEpoch, batch, totalBatch, epochPercent) {
    return currentTrainingLoopPercent(epoch, maxEpoch, batch, totalBatch, epochPercent);
}
function parseTrainingProgress(text) {
    const source = String(text || "");
    const epoch = source.match(/epoch\s+(\d+)\s*\/\s*(\d+)/i);
    const batch = source.match(/(\d+)\s*\/\s*(\d+)\s+\d+:\d+:\d+/);
    const epochPercent = source.match(/(\d+(?:\.\d+)?)\s*%/);
    const loss = source.match(/当前\s*loss\s+([0-9]+(?:\.[0-9]+)?)/i);
    const lr = source.match(/\blr\s+([0-9]+(?:\.[0-9]+)?e[+-]?\d+)/i);
    const memory = source.match(/显存\s+([0-9]+(?:\.[0-9]+)?\s*GiB)/i);
    if (!epoch && !batch && !loss && !lr && !memory)
        return null;
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
function matchesRuntime(query, observation, operationId = "") {
    const wanted = String(query || "").trim();
    if (!wanted)
        return false;
    return [observation.run_id, observation.plan, observation.tmux.window, observation.tmux.session, operationId]
        .some((value) => value && (value === wanted || value.endsWith(wanted) || wanted.endsWith(value)));
}
async function enabledWorkerEndpoints() {
    const state = await (0, api_1.optionalApi)("state.get", { key: "setupConfig" });
    const setup = asRecord(asRecord(state).value);
    const workers = Array.isArray(setup.workerTunnels) ? setup.workerTunnels.map(asRecord) : [];
    const out = [];
    for (const worker of workers) {
        if (worker.enabled === false)
            continue;
        const port = Number(worker.localForwardPort);
        if (!Number.isInteger(port) || port <= 0)
            continue;
        out.push({
            id: String(worker.id || worker.displayName || ""),
            host: String(worker.localForwardHost || worker.localHost || "127.0.0.1"),
            port,
        });
    }
    return out;
}
async function tmuxList(endpoint) {
    const payload = await agentGet(endpoint, "/api/tmux/list");
    const sessions = Array.isArray(payload?.sessions) ? payload.sessions : [];
    return sessions.map((session) => ({
        name: String(asRecord(session).name || ""),
        windows: Array.isArray(asRecord(session).windows) ? asRecord(session).windows : [],
    })).filter((session) => session.name);
}
async function tmuxCapture(endpoint, target) {
    const payload = await agentGet(endpoint, `/api/tmux/capture?window=${encodeURIComponent(target)}`);
    return String(payload?.text || payload?.output || "");
}
function agentGet(endpoint, urlPath) {
    return agentText(endpoint, urlPath).then((text) => {
        if (!text)
            return null;
        try {
            return JSON.parse(text);
        }
        catch {
            return null;
        }
    });
}
function agentText(endpoint, urlPath) {
    return new Promise((resolve) => {
        const req = http.request({
            host: endpoint.host,
            port: endpoint.port,
            path: urlPath,
            method: "GET",
            timeout: 5000,
        }, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => resolve(res.statusCode === 200 ? Buffer.concat(chunks).toString("utf8") : ""));
        });
        req.on("error", () => resolve(""));
        req.on("timeout", () => { req.destroy(); resolve(""); });
        req.end();
    });
}
async function configFromWorker(endpoint, config) {
    if (!config.path || (config.model && config.dataset && config.experiment_case))
        return config;
    const yaml = await agentText(endpoint, `/api/files/download?path=${encodeURIComponent(config.path)}&maxBytes=200000`);
    if (!yaml || yaml.startsWith("{"))
        return config;
    return {
        ...config,
        experiment_case: experimentCase(yaml) || config.experiment_case,
        model: config.model || nestedYamlValue(yaml, "model", "name") || nestedYamlValue(yaml, "model", "joint_encoder"),
        dataset: config.dataset || nestedYamlValue(yaml, "data", "dataset"),
        seed: config.seed || yamlValue(yaml, "seed"),
    };
}
function launchFields(text) {
    const source = unwrapTerminalText(text);
    const configPath = jsonStringField(source, "config_path") || jsonStringField(source, "config") || flagValue(source, "config");
    const yaml = yamlObject(source);
    return {
        plan: jsonStringField(source, "plan") || jsonStringField(source, "plan_file"),
        worker_id: jsonStringField(source, "worker_id"),
        gpu_ids: jsonStringField(source, "gpu_ids"),
        config_path: configPath,
        case: experimentCase(yaml) || flagValue(source, "case") || pathTail(configPath),
        seed: flagValue(source, "seed") || pathSeed(configPath) || yamlValue(yaml, "seed"),
        model: yamlValue(yaml, "model") || yamlValue(yaml, "encoder_profile"),
        dataset: yamlValue(yaml, "dataset") || yamlValue(yaml, "data"),
        stage: stageFromCommand(source),
    };
}
function unwrapTerminalText(text) {
    return String(text || "").replace(/\r?\n/g, "");
}
function yamlObject(text) {
    const marker = text.lastIndexOf('{"');
    return marker >= 0 ? text.slice(0, marker) : text;
}
function jsonStringField(text, key) {
    const match = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"\\\\]+)`));
    return match ? match[1] : "";
}
function stageFromCommand(text) {
    const match = String(text || "").match(/--stage\s+([A-Za-z0-9_-]+)/);
    return match ? match[1] : "";
}
function flagValue(text, name) {
    const pattern = "--" + name + "\\s+(\\S+)";
    const match = String(text || "").match(new RegExp(pattern));
    return match ? match[1] : "";
}
function pathTail(value) {
    const name = value.split("/").pop() || "";
    return name.replace(/_seed\d+$/, "").replace(/^\d+_/, "");
}
function pathSeed(value) {
    return value.match(/_seed(\d+)(?:\/|$)/)?.[1] || "";
}
function yamlValue(text, key) {
    const match = text.match(new RegExp(`(?:^|\\n)\\s*${key}\\s*:\\s*([^#\\n]+)`));
    return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : "";
}
function experimentCase(text) {
    const named = yamlValue(text, "experiment_name").split("/").filter(Boolean);
    return named.length >= 2 ? named[named.length - 2] : "";
}
function nestedYamlValue(text, section, key) {
    const block = String(text || "").match(new RegExp(`(?:^|\\n)${section}:\\n((?:[ \\t]+.*\\n?)*)`));
    return block ? yamlValue(`\n${block[1]}`, key) : "";
}
function runIdFromName(value) {
    const name = String(value || "").trim();
    return /^run-\d+$/.test(name) ? name : "";
}
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
