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
exports.preflightPlugin = preflightPlugin;
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
function requestLocalJson(discovery, route, body, maxBytes = 16 * 1024 * 1024, timeoutMs = 15000) {
    validateDiscovery(discovery);
    if (!["/api/v1/capabilities", "/api/v1/rpc", "/api/v1/health"].includes(route))
        throw new Error("Invalid local API route");
    const url = new URL(route, String(discovery.baseUrl));
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: url.hostname === "[::1]" ? "::1" : url.hostname === "localhost" ? "127.0.0.1" : url.hostname, port: url.port, path: url.pathname,
            method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${discovery.token}`, ...(body ? { "Content-Type": "application/json", "Content-Length": body.length } : {}) } }, res => {
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
        return await preflightHandshake(plugin);
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
/** Explicit multi-window pin: when the user names an instance, the live instanceId must equal it. */
function assertInstancePin(expected, preflight) {
    const pin = String(expected ?? process.env.SIMPLE_CLI_INSTANCE_ID ?? "").trim();
    if (!pin)
        return;
    if (pin !== preflight.instanceId) {
        throw new errors_1.CliError(2, "ENV", `Instance pin mismatch: this command was pinned to instance ${pin}, but the live listener is ${preflight.instanceId} (${String(preflight.capabilities.name)}). Refusing to run against a different window; remove or fix --instance.`, "");
    }
}
async function preflightHandshake(plugin) {
    const spec = PLUGIN_ENDPOINTS[plugin];
    const discoveryPath = pluginDiscoveryPath(plugin);
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
    const capabilities = await requestLocalJson(discovery, "/api/v1/capabilities", undefined, 1024 * 1024, 10000);
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
/** Preflighted RPC: retired and undeclared methods are refused client-side; confirmations surface as preview data. */
async function callPluginRpc(plugin, method, params, expectedInstanceId) {
    if (typeof method !== "string" || !method || !params || typeof params !== "object" || Array.isArray(params))
        throw new Error("API method and object params required");
    const preflight = await preflightPlugin(plugin);
    assertInstancePin(expectedInstanceId, preflight);
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
