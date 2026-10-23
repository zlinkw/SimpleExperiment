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
exports.emitRpc = emitRpc;
exports.controlCommand = controlCommand;
const fs = __importStar(require("node:fs"));
const api_1 = require("../api");
const errors_1 = require("../errors");
const format_1 = require("../format");
async function emitRpc(method, params = {}) {
    const result = await (0, api_1.callApi)(method, params);
    (0, format_1.writeJson)(result);
    return result && typeof result === "object" && !Array.isArray(result)
        && result.ok === false ? errors_1.EXIT_BUSINESS : errors_1.EXIT_OK;
}
function jsonFile(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch (error) {
        throw (0, errors_1.usageError)(`invalid JSON file ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function objectFile(file) {
    if (!file)
        throw (0, errors_1.usageError)("requires --file <parameters.json>");
    const value = jsonFile(file);
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw (0, errors_1.usageError)("--file must contain a JSON object");
    return value;
}
function only(params, fields) {
    const unknown = Object.keys(params).filter(key => !fields.includes(key));
    if (unknown.length)
        throw (0, errors_1.usageError)("unsupported fields: " + unknown.join(", "));
}
function key(rest, flags) {
    if (rest.length > 1)
        throw (0, errors_1.usageError)("expected one key");
    const value = rest[0] || flags.key;
    if (!value || !value.trim())
        throw (0, errors_1.usageError)("requires a key");
    return value;
}
/** Fixed named methods; validates local arguments before discovering either plugin. */
async function controlCommand(domain, action, rest, flags) {
    if (domain === "config" || domain === "state") {
        if (action === "snapshot" && domain === "state") {
            if (rest.length)
                throw (0, errors_1.usageError)("state snapshot takes no arguments");
            return emitRpc("state");
        }
        if (!["list", "get", "set", "reset"].includes(action))
            throw (0, errors_1.usageError)(`unknown ${domain} action: ${action}`);
        if (action === "list") {
            if (rest.length)
                throw (0, errors_1.usageError)(`${domain} list takes no arguments`);
            return emitRpc(domain + ".list");
        }
        const params = { key: key(rest, flags) };
        if (domain === "config" && flags.scope) {
            if (!["global", "workspace", "workspaceFolder"].includes(flags.scope))
                throw (0, errors_1.usageError)("--scope must be global|workspace|workspaceFolder");
            params.scope = flags.scope;
        }
        if (action === "set") {
            if (flags.file && flags.value !== undefined)
                throw (0, errors_1.usageError)("choose --file or --value");
            if (flags.file)
                params.value = jsonFile(flags.file);
            else if (flags.value !== undefined) {
                try {
                    params.value = JSON.parse(flags.value);
                }
                catch {
                    params.value = flags.value;
                }
            }
            else
                throw (0, errors_1.usageError)("set requires --value <JSON or text> or --file <value.json>");
        }
        if (flags.confirm === true)
            params.confirm = true;
        return emitRpc(domain + "." + action, params);
    }
    if (domain === "flow") {
        if (rest.length)
            throw (0, errors_1.usageError)("flow takes no positional arguments");
        if (action === "get")
            return emitRpc("flow.get");
        if (action !== "update")
            throw (0, errors_1.usageError)("flow supports get|update");
        const params = objectFile(flags.file);
        only(params, ["step", "completed", "blocked", "appliedAt"]);
        if (typeof params.step !== "string" || !params.step.trim())
            throw (0, errors_1.usageError)("flow update requires step");
        for (const flag of ["completed", "blocked"])
            if (params[flag] !== undefined && typeof params[flag] !== "boolean")
                throw (0, errors_1.usageError)(flag + " must be boolean");
        if (params.completed === true && params.blocked === true)
            throw (0, errors_1.usageError)("completed and blocked are mutually exclusive");
        if (params.appliedAt !== undefined && typeof params.appliedAt !== "string")
            throw (0, errors_1.usageError)("appliedAt must be text");
        return emitRpc("flow.update", params);
    }
    if (domain === "tmux") {
        if (!["list", "capture"].includes(action))
            throw (0, errors_1.usageError)("tmux supports list|capture");
        if (!flags.worker)
            throw (0, errors_1.usageError)("tmux requires --worker <id>");
        if (rest.length > (action === "capture" ? 1 : 0))
            throw (0, errors_1.usageError)("unexpected tmux argument");
        const params = { workerId: flags.worker };
        if (action === "capture") {
            const window = rest[0] || flags["tmux-window"];
            if (!window)
                throw (0, errors_1.usageError)("tmux capture requires an explicit window");
            params.window = window;
        }
        return emitRpc("tmux." + action, params);
    }
    if (rest.length)
        throw (0, errors_1.usageError)("unexpected positional arguments");
    if (domain === "gpu" && action === "history")
        return emitRpc("gpu.history");
    if (domain === "panel" && action === "diagnostics")
        return emitRpc("panel.diagnostics");
    if (domain === "server" && action === "test-all") {
        const params = flags.file ? objectFile(flags.file) : {};
        only(params, ["refresh"]);
        if (params.refresh !== undefined && typeof params.refresh !== "boolean")
            throw (0, errors_1.usageError)("refresh must be boolean");
        return emitRpc("server.testAll", params);
    }
    if (domain === "plan" && action === "filter")
        return emitRpc("plans.filter", objectFile(flags.file));
    throw (0, errors_1.usageError)(`unknown command: ${domain} ${action}`);
}
