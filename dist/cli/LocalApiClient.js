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
exports.validateDiscovery = validateDiscovery;
exports.readLocalDiscovery = readLocalDiscovery;
exports.requestLocalJson = requestLocalJson;
exports.callLocalRpc = callLocalRpc;
exports.pluginDiscoveryPath = pluginDiscoveryPath;
exports.pluginInstancesDir = pluginInstancesDir;
exports.listPluginInstances = listPluginInstances;
exports.resolveInstanceByWorkspace = resolveInstanceByWorkspace;
exports.preflightPlugin = preflightPlugin;
exports.preflightPluginAt = preflightPluginAt;
exports.assertInstancePin = assertInstancePin;
exports.rpcTimeoutMs = rpcTimeoutMs;
exports.callPluginRpc = callPluginRpc;
const fs = __importStar(require("node:fs"));
const http = __importStar(require("node:http"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const errors_1 = require("./errors");
const DISCOVERY_LIMIT = 65536, REQUEST_LIMIT = 4 * 1024 * 1024;
function validateDiscovery(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("Invalid local API discovery");
    const row = value;
    if (typeof row.baseUrl !== "string" || typeof row.token !== "string" || !/^[\x21-\x7e]{1,4096}$/.test(row.token))
        throw new Error("Invalid local API discovery");
    const url = new URL(row.baseUrl);
    if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash
        || !url.port || Number(url.port) < 1 || Number(url.port) > 65535 || row.status === "stopped")
        throw new Error("Local API discovery must describe a running loopback listener with an explicit port");
    return row;
}
function readLocalDiscovery(file) {
    const fd = fs.openSync(file, "r");
    try {
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.size > DISCOVERY_LIMIT)
            throw new Error("Invalid local API discovery file");
        const bytes = Buffer.alloc(DISCOVERY_LIMIT + 1), size = fs.readSync(fd, bytes, 0, bytes.length, 0);
        if (size > DISCOVERY_LIMIT)
            throw new Error("Local API discovery exceeds size limit");
        let value;
        try {
            value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, size)));
        }
        catch {
            throw new Error("Invalid local API discovery file; raw content withheld");
        }
        return validateDiscovery(value);
    }
    finally {
        fs.closeSync(fd);
    }
}
function requestLocalJson(discovery, route, body, maxBytes = 16 * 1024 * 1024, timeoutMs = 15000, signal) {
    if (signal?.aborted)
        return Promise.reject(signal.reason || Error("实例核实已取消"));
    validateDiscovery(discovery);
    if (!["/api/v1/capabilities", "/api/v1/rpc", "/api/v1/health"].includes(route))
        throw new Error("Invalid local API route");
    const url = new URL(route, String(discovery.baseUrl));
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: url.hostname === "[::1]" ? "::1" : url.hostname === "localhost" ? "127.0.0.1" : url.hostname, port: url.port, path: url.pathname, signal,
            method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${discovery.token}`,
                ...(body && discovery.pid && discovery.startedAt ? { "X-Simple-Api-Instance": `${discovery.pid}:${discovery.startedAt}` } : {}),
                ...(body && discovery.workspace ? { "X-Simple-Api-Workspace": encodeURIComponent(String(discovery.workspace)) } : {}),
                ...(body ? { "Content-Type": "application/json", "Content-Length": body.length } : {}) } }, res => {
            if (res.statusCode !== 200) {
                reject(new Error(`Local API HTTP ${res.statusCode}`));
                res.destroy();
                req.destroy();
                return;
            }
            const chunks = [];
            let size = 0;
            res.on("data", (chunk) => { size += chunk.length; if (size > maxBytes) {
                reject(new Error("Local API response exceeds size limit"));
                res.destroy();
                req.destroy();
            }
            else
                chunks.push(chunk); });
            res.on("error", reject);
            res.on("aborted", () => reject(new Error("Local API response was interrupted")));
            res.on("end", () => {
                try {
                    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
                    if (!value || typeof value !== "object" || Array.isArray(value))
                        throw Error();
                    resolve(value);
                }
                catch {
                    reject(new Error("Invalid local API JSON response"));
                }
            });
        });
        // timeoutMs <= 0 disables the timer: long file operations complete on real file results, never a silent socket timeout.
        const timer = timeoutMs > 0 ? setTimeout(() => { reject(new Error("Local API request timed out; the request outcome is unknown and will not be retried automatically")); req.destroy(); }, timeoutMs) : undefined;
        req.on("close", () => { if (timer)
            clearTimeout(timer); });
        req.on("error", reject);
        req.end(body);
    });
}
async function callLocalRpc(readDiscovery, method, params) {
    if (typeof method !== "string" || !method || !params || typeof params !== "object" || Array.isArray(params))
        throw new Error("API method and object params required");
    const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), "utf8");
    if (body.length > REQUEST_LIMIT)
        throw new Error("Local API request exceeds size limit");
    const discovery = validateDiscovery(readDiscovery()), contract = await requestLocalJson(discovery, "/api/v1/capabilities", undefined, 1024 * 1024);
    if (contract.schemaVersion !== 1 || contract.rpc !== "json-rpc-2.0" || !Array.isArray(contract.methods) || !contract.methods.every((m) => typeof m === "string")
        || discovery.name && contract.name !== discovery.name || discovery.version && contract.version !== discovery.version)
        throw new Error("Invalid or mismatched live API capabilities");
    if (!contract.methods.includes(method))
        throw new Error(`Method unavailable in live API: ${method}`);
    const fresh = validateDiscovery(readDiscovery());
    for (const k of ["baseUrl", "token", "name", "version", "pid", "startedAt"])
        if (fresh[k] !== discovery[k])
            throw new Error("Local API discovery changed during preflight; check the current listener");
    const result = await requestLocalJson(fresh, "/api/v1/rpc", body);
    if (result.jsonrpc !== "2.0" || result.id !== 1 || !(Object.hasOwn(result, "result") !== Object.hasOwn(result, "error"))
        || Object.hasOwn(result, "error") && (!result.error || typeof result.error !== "object" || Array.isArray(result.error)))
        throw new Error("Invalid local API JSON-RPC response");
    return result;
}
const PLUGIN_ENDPOINTS = {
    experiment: { env: "SIMPLE_EXPERIMENT_API_FILE", dir: "SimpleExperiment", label: "SimpleExperiment" },
    sftp: { env: "SIMPLE_SFTP_API_FILE", dir: "SimpleSFTP", label: "SimpleSFTP" },
};
function pluginDiscoveryPath(plugin) {
    const spec = PLUGIN_ENDPOINTS[plugin];
    const override = process.env[spec.env];
    if (override !== undefined && override !== "")
        return override;
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, spec.dir, "api.json");
}
function pluginInstancesDir(pluginOrPath) {
    const base = typeof pluginOrPath === "string" && (pluginOrPath === "experiment" || pluginOrPath === "sftp")
        ? path.dirname(pluginDiscoveryPath(pluginOrPath))
        : path.dirname(String(pluginOrPath));
    return path.join(base, "instances");
}
function readBoundedJson(file) {
    const fd = fs.openSync(file, "r");
    try {
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.size > DISCOVERY_LIMIT)
            throw new Error("record exceeds size limit");
        const bytes = Buffer.alloc(DISCOVERY_LIMIT + 1);
        const size = fs.readSync(fd, bytes, 0, bytes.length, 0);
        if (size > DISCOVERY_LIMIT)
            throw new Error("record exceeds size limit");
        const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, size)));
        if (!value || typeof value !== "object" || Array.isArray(value))
            throw new Error("record is not an object");
        return value;
    }
    finally {
        fs.closeSync(fd);
    }
}
function readInstanceRecord(file) {
    const row = { discoveryPath: file, instanceId: "", name: "", version: "", pid: 0, startedAt: "", status: "", workspace: "", error: "" };
    try {
        const value = readBoundedJson(file);
        row.name = typeof value.name === "string" ? value.name : "";
        row.version = typeof value.version === "string" ? value.version : "";
        row.pid = Number.isInteger(value.pid) ? Number(value.pid) : 0;
        row.startedAt = typeof value.startedAt === "string" ? value.startedAt : "";
        row.status = typeof value.status === "string" ? value.status : "";
        row.workspace = typeof value.workspace === "string" ? value.workspace : "";
        row.instanceId = typeof value.instanceId === "string" && value.instanceId
            ? value.instanceId
            : (row.pid > 0 && row.startedAt ? `${row.pid}:${row.startedAt}` : "");
        // A record whose live transport fields are unusable is still listed (marked), never guessed.
        try {
            validateDiscovery(value);
        }
        catch (error) {
            row.error = error instanceof Error ? error.message : String(error);
        }
    }
    catch (error) {
        row.error = error instanceof Error ? error.message : String(error);
    }
    return row;
}
/**
 * Enumeration is bounded; `truncated` means MORE records exist beyond the cap, so callers must not
 * claim an unseen instance does not exist. Nothing is ever cleaned up here.
 */
function listPluginInstances(plugin) {
    const dir = pluginInstancesDir(plugin);
    let names;
    try {
        names = fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".json")).sort();
    }
    catch (error) {
        const code = error?.code;
        if (code === "ENOENT")
            return { rows: [], truncated: false };
        throw error;
    }
    return { rows: names.slice(0, 256).map((name) => readInstanceRecord(path.join(dir, name))), truncated: names.length > 256 };
}
function sameWorkspacePath(a, b) {
    const normalize = (value) => String(value || "").trim().replace(/[\\/]+$/, "").replace(/\\/g, "/");
    const left = normalize(a), right = normalize(b);
    if (!left || !right)
        return false;
    return process.platform === "win32" ? left.toLowerCase() === right.toLowerCase() : left === right;
}
/** Bounded per-resolve handshake budget; exceeding it refuses instead of probing a prefix. */
const CANDIDATE_HANDSHAKE_BUDGET = 16;
/**
 * Resolve exactly one LIVE instance for a workspace via real handshakes. Disk status is only a
 * candidate hint: a crashed instance's stale "running" record is probed and excluded (kept on disk,
 * never deleted), so it can never block the one genuinely live instance. Two genuinely live
 * listeners are still refused — then the pin must be explicit (expectedInstanceId/--instance or
 * SIMPLE_CLI_INSTANCE_ID); the pin filters before probing and is never auto-substituted. Nothing is
 * guessed by recency. The returned row's discoveryPath is still re-handshaked by callPluginRpc.
 * More candidates than the handshake budget is a refusal BEFORE any probe ("incomplete verification,
 * cannot confirm uniqueness", pointing at an explicit discoveryPath) — a prefix handshake must never
 * pretend the remainder is absent or that the first live hit is unique.
 */
async function resolveInstanceByWorkspace(plugin, workspace, expectedInstanceId, options = {}) {
    const timeoutMs = options.timeoutMs ?? 30_000;
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30_000)
        throw Error("实例核实总等待上限必须在 1–30000 毫秒内。");
    const signal = AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)].filter(Boolean));
    const check = () => { if (signal.aborted)
        throw Error(options.signal?.aborted ? "实例核实已取消，未执行命令。" : "实例核实达到总等待上限，无法确认唯一实例；未执行命令，请指定 --instance 或稍后重试。"); };
    const progress = (message) => { try {
        options.onProgress?.(message);
    }
    catch { /* display cannot authorize routing */ } };
    check();
    if (!workspace || !String(workspace).trim())
        throw new Error("按工作区路由必须提供明确的 workspace。");
    const listing = listPluginInstances(plugin);
    if (listing.truncated)
        throw new Error(`实例记录目录超过单次枚举上限（256 条且仍有更多记录），无法安全枚举 ${workspace} 的存活实例；截断不当作完整，--instance 也不可靠（目标记录可能不在已枚举前 256 条内），请用已知的 discoveryPath 明确指定，不自动清理历史记录。`);
    const pin = String(expectedInstanceId ?? process.env.SIMPLE_CLI_INSTANCE_ID ?? "").trim();
    let candidates = listing.rows.filter((row) => !row.error && !!(row.instanceId || row.pid > 0) && sameWorkspacePath(row.workspace, workspace));
    if (pin) {
        candidates = candidates.filter((row) => row.instanceId === pin);
        if (candidates.length === 0)
            throw new Error(`--instance ${pin} 在工作区 ${workspace} 的实例记录中不存在；已保留全部历史记录，不做替换或猜测。`);
    }
    // 握手预算在 pin 筛选之后、任何握手之前整体判定：绝不做部分握手后再宣称唯一或不存在
    // （17 条候选里第 1 与第 17 条同时存活时，截半握手会把歧义伪装成唯一）。
    if (candidates.length > CANDIDATE_HANDSHAKE_BUDGET)
        throw new Error(`工作区 ${workspace} 有 ${candidates.length} 条候选实例记录，超过单次 ${CANDIDATE_HANDSHAKE_BUDGET} 条握手预算；未完整核验，不能确认唯一。请用已知的 discoveryPath 明确指定目标实例，不做部分握手、不扩大探测。`);
    const live = [];
    const unreachable = [];
    for (const [index, row] of candidates.entries()) {
        check();
        progress("正在核实实例 " + (index + 1) + "/" + candidates.length + " · " + row.instanceId);
        try {
            await preflightPluginAt(plugin, row.discoveryPath, workspace, signal);
            live.push(row);
        }
        catch {
            check();
            unreachable.push(row);
        }
        progress("已处理实例 " + (index + 1) + "/" + candidates.length + "；当前可达 " + live.length);
    }
    check();
    if (live.length === 0) {
        const known = listing.rows.filter((row) => row.workspace)
            .map((row) => `${row.workspace}(${row.status || "?"}${row.status === "running" ? "，记录称运行中但握手失败=疑似崩溃遗留，记录保留" : ""})`).join(", ");
        throw new Error(`未找到工作区 ${workspace} 的可达实例（已对 ${candidates.length} 条候选记录做实际握手）。已知记录：${known || "无"}。请先在该项目窗口打开插件面板。`);
    }
    if (live.length > 1)
        throw new Error(`工作区 ${workspace} 实际存在 ${live.length} 个存活实例（${live.map((row) => row.instanceId).join(", ")}）；请用 --instance <pid:startedAt> 明确指定，不按时间猜测。`);
    return live[0];
}
function expectedInstanceId(discovery) {
    return `${String(discovery.pid)}:${String(discovery.startedAt)}`;
}
/**
 * Live handshake for the fixed plugin slot: capabilities must come from the instance the discovery
 * describes AND that instance must be the plugin this command targets. Discovery alone proves only
 * the registered listener, not which window/profile the user meant; the handshake therefore never
 * guesses a version or path. Explicit instance selection is the approved disambiguation mechanism:
 * pass --instance <pid:startedAt> (or SIMPLE_CLI_INSTANCE_ID) and the live instanceId must match
 * exactly, otherwise the command refuses with ENV(2) before any RPC is sent.
 */
async function preflightPlugin(plugin) {
    try {
        return await preflightHandshake(plugin, pluginDiscoveryPath(plugin));
    }
    catch (error) {
        // Preflight failures happen before any request body is sent: they are environment facts
        // (missing/invalid discovery, wrong slot, identity/version mismatch) and exit ENV(2), except
        // genuine transport failures which keep NETWORK(4). Never let them degrade to BUSINESS(3).
        if (error instanceof errors_1.CliError)
            throw error;
        throw (0, errors_1.asCliError)(error, 2);
    }
}
/**
 * Same live handshake against an explicit instance record (from listPluginInstances /
 * resolveInstanceByWorkspace). When expectedWorkspace is given, the live capabilities must carry a
 * matching workspace — an older listener without the field is refused, never assumed.
 */
async function preflightPluginAt(plugin, discoveryPath, expectedWorkspace, signal) {
    try {
        const preflight = await preflightHandshake(plugin, discoveryPath, signal);
        if (expectedWorkspace !== undefined && String(expectedWorkspace).trim()) {
            const live = String(preflight.capabilities.workspace || "");
            if (!live || !sameWorkspacePath(live, expectedWorkspace))
                throw new Error(`工作区核对失败：实例 ${preflight.instanceId} 的实际工作区为 ${live || "（旧版实例未声明）"}，与目标 ${expectedWorkspace} 不一致；拒绝路由。`);
        }
        return preflight;
    }
    catch (error) {
        if (error instanceof errors_1.CliError)
            throw error;
        throw (0, errors_1.asCliError)(error, 2);
    }
}
/** Explicit multi-window pin: when the user names an instance, the live instanceId must equal it. */
function assertInstancePin(expected, preflight) {
    const pin = String(expected ?? process.env.SIMPLE_CLI_INSTANCE_ID ?? "").trim();
    if (!pin)
        return;
    if (pin !== preflight.instanceId) {
        throw new errors_1.CliError(2, "ENV", `Instance pin mismatch: this command was pinned to instance ${pin}, but the live listener is ${preflight.instanceId} (${String(preflight.capabilities.name)}). Refusing to run against a different window; remove or fix --instance.`, "");
    }
}
async function preflightHandshake(plugin, discoveryPath, signal) {
    const spec = PLUGIN_ENDPOINTS[plugin];
    if (!fs.existsSync(discoveryPath)) {
        throw new Error(`${spec.label} API discovery not found: ${discoveryPath}. Open VS Code once to start the extension host.`);
    }
    const discovery = readLocalDiscovery(discoveryPath);
    if (!Number.isInteger(discovery.pid) || Number(discovery.pid) <= 0
        || typeof discovery.startedAt !== "string" || !discovery.startedAt || Number.isNaN(Date.parse(discovery.startedAt))) {
        throw new Error("Local API discovery lacks a valid pid/startedAt instance identity; refusing to guess the running instance");
    }
    if (typeof discovery.name !== "string" || !discovery.name)
        throw new Error("Local API discovery lacks a plugin name");
    if (typeof discovery.version !== "string" || !discovery.version)
        throw new Error("Local API discovery lacks a plugin version");
    const capabilities = await requestLocalJson(discovery, "/api/v1/capabilities", undefined, 1024 * 1024, 10000, signal);
    if (capabilities.schemaVersion !== 1 || capabilities.rpc !== "json-rpc-2.0"
        || !Array.isArray(capabilities.methods) || !capabilities.methods.every((m) => typeof m === "string")) {
        throw new Error("Invalid live API capabilities");
    }
    if (capabilities.name !== spec.label || discovery.name !== spec.label) {
        throw new Error(`Plugin slot mismatch: this command targets ${spec.label}, but discovery=${String(discovery.name)} capabilities=${String(capabilities.name)}; refusing cross-plugin execution`);
    }
    if (typeof capabilities.version !== "string" || !capabilities.version)
        throw new Error("Live API capabilities lack a version");
    if (capabilities.version !== discovery.version) {
        throw new Error(`Live API version mismatch: capabilities=${String(capabilities.version)} discovery=${String(discovery.version)}`);
    }
    if (typeof capabilities.instanceId !== "string" || !capabilities.instanceId) {
        throw new Error("Live API capabilities lack instanceId identity; the running extension is older than the unified CLI identity contract — update the extension before using this command");
    }
    if (capabilities.instanceId !== expectedInstanceId(discovery)) {
        throw new Error(`Instance identity mismatch: capabilities.instanceId=${capabilities.instanceId} discovery.pid:startedAt=${expectedInstanceId(discovery)}; refusing to run against an ambiguous listener`);
    }
    return { plugin, discoveryPath, discovery, capabilities, instanceId: capabilities.instanceId };
}
function rpcError(message, apiCode, apiData) {
    const error = new Error(message);
    error.apiCode = apiCode;
    error.apiData = apiData;
    return error;
}
/**
 * Transport classes proven by the method contract: long file/business operations finish on real
 * results (no silent socket cutoff), everything else (control/status/config/list) stays bounded at
 * the legacy 15s bound. A timed-out write has an unknown receipt: the transport never auto-retries.
 */
function rpcTimeoutMs(plugin, method) {
    if (plugin !== "sftp") {
        // These host handlers await synchronization, deployment or remote validation; a client-side
        // 15s cutoff would abort the host request mid-operation. Queries retain their bounded timer.
        return ["plan.validate", "workflow.plan", "invoke", "agents.lifecycle", "project.prepare", "server.testAll"].includes(method) ? 0 : 15_000;
    }
    const unbounded = /^(sync\.|upload\.|download\.|remote\.|files\.cleanup\.)/.test(method)
        // agents.lifecycle mutates remote state over one long SSH command with no reconciliation
        // poll; the client waits instead of imposing a shorter silent cutoff. This is not "no
        // deadline": the backend itself stops at 45s with AGENT_RECEIPT_UNCONFIRMED (agent-lifecycle.js:91,
        // "do not retry or signal the remote process"); that refusal or a lost connection is an
        // unknown receipt and is never auto-resent by this CLI.
        || ["project.create", "handoff.markReady", "downloadScope.configure", "agents.lifecycle"].includes(method);
    return unbounded ? 0 : 15_000;
}
/**
 * Preflighted RPC: retired and undeclared methods are refused client-side; confirmations surface as preview data.
 * Optional target routes to a specific instance record or the unique running instance of a workspace;
 * the legacy single-slot behavior is unchanged when no target is given.
 */
async function callPluginRpc(plugin, method, params, expectedInstanceId, target) {
    if (typeof method !== "string" || !method || !params || typeof params !== "object" || Array.isArray(params))
        throw new Error("API method and object params required");
    let preflight;
    if (target && (target.discoveryPath || target.workspace)) {
        const workspace = String(target.workspace || "").trim();
        // The pin must resolve the ambiguity itself: filter by the exact pinned instance BEFORE any
        // workspace-wide probing, so `--instance` is a real disambiguation, not a post-hoc mismatch check.
        const pin = String(expectedInstanceId ?? process.env.SIMPLE_CLI_INSTANCE_ID ?? "").trim();
        const discoveryPath = target.discoveryPath
            || (await resolveInstanceByWorkspace(plugin, workspace, pin || undefined)).discoveryPath;
        preflight = await preflightPluginAt(plugin, discoveryPath, workspace || undefined);
    }
    else {
        preflight = await preflightPlugin(plugin);
    }
    assertInstancePin(expectedInstanceId, preflight);
    if (!target && !expectedInstanceId && !process.env.SIMPLE_CLI_INSTANCE_ID && !process.env[PLUGIN_ENDPOINTS[plugin].env]) {
        const workspace = String(preflight.capabilities.workspace || "");
        const relative = workspace ? path.relative(path.resolve(workspace), process.cwd()) : "..";
        if (!workspace || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative))
            throw new Error("API_WORKSPACE_MISMATCH：默认 API 属于其他项目窗口；请使用 --workspace 或 --instance 明确选择，未转交请求。");
    }
    const retired = preflight.capabilities.retiredMethods;
    if (retired && typeof retired[method] === "string") {
        throw rpcError(`Method retired by the live API: ${method} (${String(retired[method])})`, -32001, retired[method]);
    }
    const methods = preflight.capabilities.methods;
    if (!methods.includes(method))
        throw rpcError(`Method unavailable in live API: ${method}`, -32601, method);
    const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), "utf8");
    if (body.length > REQUEST_LIMIT)
        throw new Error("Local API request exceeds size limit");
    const fresh = readLocalDiscovery(preflight.discoveryPath);
    validateDiscovery(fresh);
    for (const k of ["baseUrl", "token", "name", "version", "pid", "startedAt"])
        if (fresh[k] !== preflight.discovery[k]) {
            throw new Error("Local API discovery changed during preflight; check the current listener");
        }
    const result = await requestLocalJson(fresh, "/api/v1/rpc", body, 16 * 1024 * 1024, rpcTimeoutMs(plugin, method));
    if (result.jsonrpc !== "2.0" || result.id !== 1 || !(Object.hasOwn(result, "result") !== Object.hasOwn(result, "error"))
        || Object.hasOwn(result, "error") && (!result.error || typeof result.error !== "object" || Array.isArray(result.error)))
        throw new Error("Invalid local API JSON-RPC response");
    if (Object.hasOwn(result, "error")) {
        const error = result.error;
        throw rpcError(String(error.message || "API error"), Number(error.code) || -32000, error.data ?? null);
    }
    return result.result;
}
