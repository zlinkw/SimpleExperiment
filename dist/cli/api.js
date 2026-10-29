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
exports.setApiWorkspace = setApiWorkspace;
exports.setInstancePin = setInstancePin;
exports.hasApiDiscovery = hasApiDiscovery;
exports.discoveryOrNull = discoveryOrNull;
exports.callApi = callApi;
exports.optionalApi = optionalApi;
exports.tunnelEndpointFromConfig = tunnelEndpointFromConfig;
exports.classifyApiFailure = classifyApiFailure;
const errors_1 = require("./errors");
const LocalApiClient_1 = require("./LocalApiClient");
const fs = __importStar(require("node:fs"));
// CLI --instance wins over SIMPLE_CLI_INSTANCE_ID; set once by runSimpleCli before any dispatch.
let cliInstancePin = "";
let cliWorkspace = "";
function setApiWorkspace(value) { cliWorkspace = String(value || "").trim(); }
function setInstancePin(value) {
    cliInstancePin = String(value || "").trim();
}
function hasApiDiscovery() {
    try {
        return fs.existsSync((0, LocalApiClient_1.pluginDiscoveryPath)("experiment"));
    }
    catch {
        return false;
    }
}
function discoveryOrNull() {
    try {
        const file = (0, LocalApiClient_1.pluginDiscoveryPath)("experiment");
        return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
    }
    catch {
        return null;
    }
}
/**
 * Every SimpleExperiment-domain call runs through the unified transport: plugin-slot binding,
 * live instance handshake, retired/undeclared method refusal, and bounded or proven-unbounded
 * timeouts. No A-domain path bypasses it any more.
 */
async function callApi(method, params = {}) {
    try {
        return await (0, LocalApiClient_1.callPluginRpc)("experiment", method, params, cliInstancePin || undefined, cliWorkspace ? { workspace: cliWorkspace } : undefined);
    }
    catch (error) {
        const rpc = error;
        if (Number(rpc.apiCode) === 2001)
            throw (0, errors_1.envError)(String(rpc.message || "CONFIRM_REQUIRED"), JSON.stringify(rpc.apiData ?? {}));
        if (Number(rpc.apiCode) === -32001 || Number(rpc.apiCode) === -32601) {
            // Keep the JSON-RPC code attached so optional callers can tell "not declared here" (-32601)
            // from a retired refusal (-32001, always fatal); the public exit stays BUSINESS(3).
            const refusal = (0, errors_1.businessError)(String(rpc.message || "API refusal"), rpc.apiData === null || rpc.apiData === undefined ? "" : JSON.stringify(rpc.apiData));
            refusal.apiCode = Number(rpc.apiCode);
            throw refusal;
        }
        if (error.exitCode)
            throw error;
        if (Number.isFinite(Number(rpc.apiCode)))
            throw (0, errors_1.businessError)(String(rpc.message || "API error"), rpc.apiData === null || rpc.apiData === undefined ? "" : JSON.stringify(rpc.apiData));
        throw (0, errors_1.asCliError)(error, 4);
    }
}
async function optionalApi(method, params = {}) {
    if (!hasApiDiscovery())
        return null;
    try {
        return await callApi(method, params);
    }
    catch (error) {
        // A method this live instance never declared is an absent optional enrichment, like being
        // offline: the merged local view stands. Retired methods and business refusals still throw.
        if (Number(error.apiCode) === -32601)
            return null;
        const mapped = (0, errors_1.asCliError)(error, 4);
        if (mapped.exitCode === 4)
            return null;
        if (mapped.exitCode === 2)
            return null;
        throw mapped;
    }
}
function tunnelEndpointFromConfig(config) {
    if (!config)
        return null;
    const host = firstString(config, ["localForwardHost", "localHost", "host"]);
    const port = Number(config.localForwardPort ?? config.localPort ?? config.port);
    if (!host || !Number.isInteger(port) || port <= 0)
        return null;
    return { localHost: host, localPort: port };
}
function firstString(record, keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim())
            return value.trim();
    }
    return "";
}
function classifyApiFailure(error) {
    const mapped = (0, errors_1.asCliError)(error, 4);
    if (mapped.exitCode === 4)
        throw (0, errors_1.networkError)(mapped.message, mapped.detail);
    throw mapped;
}
