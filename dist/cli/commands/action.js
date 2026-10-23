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
exports.actionName = actionName;
exports.actionCommand = actionCommand;
const fs = __importStar(require("node:fs"));
const api_1 = require("../api");
const errors_1 = require("../errors");
const format_1 = require("../format");
const control_1 = require("./control");
function actionName(command) { return command.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(); }
const REDIRECT = {
    deleteArtifacts: "plan cleanup preview/confirm/execute",
    reconcileDeletions: "plan cleanup preview/confirm/execute",
    cleanupPlan: "plan cleanup preview/confirm/execute",
    cleanupDrafts: "draft candidates/cleanup",
    promoteDraft: "draft promote (retired)",
};
const READ_ACTIONS = new Set(["status", "fetchTmuxList", "fetchTmuxCapture", "loadGpuHistory", "gpuWindowSamples", "getTensorBoardStatus", "showRegistry", "checkPluginUpdates"]);
async function actionCommand(name, rest, flags) {
    if (name === "invoke" || name === "run" || rest.length > (name === "describe" ? 1 : 0))
        throw (0, errors_1.usageError)("use a named action: simpleex actions <kebab-name> [--file parameters.json] [--confirm]; actions list prints available names");
    if (name === "describe" && rest.length !== 1)
        throw (0, errors_1.usageError)("actions describe requires a named action");
    const requested = name === "describe" ? rest[0] : name;
    if (!/^[a-z][a-z0-9-]*$/.test(requested))
        throw (0, errors_1.usageError)("action names use lowercase kebab-case");
    const params = {};
    if (flags.file) {
        let value;
        try {
            value = JSON.parse(fs.readFileSync(flags.file, "utf8"));
        }
        catch {
            throw (0, errors_1.usageError)("action --file must be a readable JSON object");
        }
        if (!value || typeof value !== "object" || Array.isArray(value))
            throw (0, errors_1.usageError)("action --file must be a JSON object");
        Object.assign(params, value);
        for (const key of ["command", "confirm", "pathConfirmed", "secondConfirmation"])
            if (Object.hasOwn(params, key))
                throw (0, errors_1.usageError)("confirmation/command fields cannot come from --file; use explicit confirmation flags");
    }
    const catalog = await (0, api_1.callApi)("actions.list", {});
    if (!Array.isArray(catalog?.actions) || catalog.actions.some(row => typeof row.command !== "string" || !/^[A-Za-z][A-Za-z0-9]*$/.test(row.command)))
        throw (0, errors_1.envError)("Invalid actions.list catalog");
    const rows = catalog.actions.filter(row => actionName(row.command) === requested);
    if (rows.length !== 1)
        throw (0, errors_1.businessError)("Action is absent or ambiguous in the current host catalog: " + requested);
    const row = rows[0];
    if (name === "describe") {
        (0, format_1.writeJson)({ name: requested, ...row, parameters: "explicit JSON object via --file; handler validates business parameters", confirmation: READ_ACTIONS.has(row.command) ? "backend-defined" : "--confirm required by CLI; further backend requirements remain authoritative", replacement: REDIRECT[row.command] || null });
        return 0;
    }
    if (row.command === "promoteDraft" || actionName(row.command).replace(/git-hub/g, "github").split("-").includes("hub"))
        throw (0, errors_1.businessError)("RETIRED_ACTION: " + row.command);
    if (REDIRECT[row.command])
        throw (0, errors_1.businessError)("Use the protected named command: simpleex " + REDIRECT[row.command]);
    // A catalog row's 'safe' means non-uiActionCommand, NOT read-only. Do not use it as authorization.
    if (!READ_ACTIONS.has(row.command) && flags.confirm !== true)
        throw (0, errors_1.envError)("CONFIRM_REQUIRED: " + requested, JSON.stringify({ command: row.command, params, requires: ["confirm"], executed: false }));
    if (flags.confirm === true)
        params.confirm = true;
    if (flags["path-confirmed"] === true)
        params.pathConfirmed = true;
    if (flags["second-confirmation"] === true)
        params.secondConfirmation = true;
    return (0, control_1.emitRpc)("invoke", { ...params, command: row.command });
}
