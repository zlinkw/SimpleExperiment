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
exports.projectOpsCommand = projectOpsCommand;
const fs = __importStar(require("node:fs"));
const api_1 = require("../api");
const errors_1 = require("../errors");
const format_1 = require("../format");
// A project.prepare / project.bootstrap / project.bootstrap.operation. Parameters mirror the real
// handlers only (src/extension/legacy.ts:2254-2360 prepare, :2788-2872 bootstrap, :2874-2881 operation):
// {workspace?, topologyMode?, serverIds?, workerTunnels?, planFile?|planId?, applyXshell?, deployRuntime?,
// applyTopology?, startSessions?, autoTest?, legacyMigrationDigests?, confirm?}. confirm is the ONLY
// confirmation factor the backend defines (requires:["confirm"], legacy.ts:2310-2317/:2794-2804); it is
// forwarded only when the flag is actually given — never auto-filled, and a refused call is never replayed.
// Without confirm the backend answers 2001 CONFIRM_REQUIRED with the full preview (missing + preview +
// echoed params), which the CLI prints and exits ENV(2) — nothing is written anywhere. Confirmed runs
// mutate real infrastructure (Xshell sessions, SimpleSFTP profiles, agent runtime deploy, session start),
// so this surface is preview-first by contract. bootstrap answers {operationId,status:"started"} and the
// background run is observed via bootstrap-operation (never re-invoked).
// Hub retirement red line: the CLI offers NO hub configuration path — --hub/--mode hub/hub in serverIds
// are refused locally with the backend's own HUB_REMOVED reason and zero RPC; the backend's legacy
// hub/hubConfig parameter compatibility stays untouched behind that gate.
// Input conflicts (paired switches, wrong-action switches, bootstrap --no-apply-topology) are refused
// BEFORE any request: the CLI never silently ignores what the user asked for.
const USAGE = `Usage:
  simpleex project prepare [--workspace <abs>] [--mode worker_pool] [--server-ids a,b] [--workers workerTunnels.json] [--plan-file <plan>] [--plan-id <id>] [--skip-xshell] [--skip-runtime] [--no-apply-topology] [--start-sessions] [--auto-test] [--legacy-migration-digests digests.json] [--confirm] [--json]
  simpleex project bootstrap [same parameters minus --start-sessions/--auto-test/--no-apply-topology] [--no-start-sessions] [--no-auto-test] [--confirm] [--json]
  simpleex project bootstrap-operation --operation-id <id> [--json]
       confirm is the only confirmation factor (backend requires:["confirm"]): without it the full server preview prints at exit 2 and nothing changes. --no-apply-topology is prepare-only (legacy.ts:2317 honors it); bootstrap's background run forces applyTopology (:2850) and refuses the opt-out locally. bootstrap defaults startSessions/autoTest to true unless explicitly false (:2852-2854) — use --no-start-sessions/--no-auto-test there; prepare defaults them off — use --start-sessions/--auto-test there. Paired or wrong-action switches are input conflicts refused with zero API. --hub and hub modes are HUB_REMOVED (the CLI adds no Hub configuration path; backend legacy params stay compatible).
       bootstrap-operation exit 0 means the QUERY succeeded — not that the bootstrap succeeded: read operation.status (pending/running are not failures; a failed operation echoes status:"failed" with its full error and the CLI never re-submits bootstrap).`;
async function projectOpsCommand(action, rest, flags) {
    if (rest.length)
        throw (0, errors_1.usageError)(`project ${action} takes no positional arguments`, USAGE);
    if (action === "bootstrap-operation") {
        if (!flags["operation-id"])
            throw (0, errors_1.usageError)("project bootstrap-operation needs --operation-id <id> (backend: 未找到 project.bootstrap 操作)", USAGE);
        return emit(await (0, api_1.callApi)("project.bootstrap.operation", { operationId: String(flags["operation-id"]) }));
    }
    return emit(await (0, api_1.callApi)(action === "prepare" ? "project.prepare" : "project.bootstrap", buildParams(action, flags)));
}
function buildParams(action, flags) {
    const given = (value) => value === true;
    if (flags.hub) {
        // Hub retirement red line: no CLI hub-configuration path exists (backend legacy compatibility is untouched).
        throw (0, errors_1.usageError)("HUB_REMOVED：Hub 功能已移除，--hub 不能经 CLI 提供 hub 配置（与 mode/serverIds 同为零 RPC 本地拒绝；后端旧参数兼容不变）", USAGE);
    }
    const mode = flags.mode === undefined ? undefined : String(flags.mode);
    if (mode !== undefined && /^(hub|hub_worker|hub_control|hub_available|hub-available)$/.test(mode)) {
        // Input-deterministic HUB_REMOVED (legacy.ts apiPrepareTopology): refuse locally with the backend's own reason, zero RPC.
        throw (0, errors_1.usageError)(`HUB_REMOVED：Hub 功能已移除，请选择 Worker（mode=${mode}；后端对同一输入给出同样拒绝）`, USAGE);
    }
    // Input-deterministic conflict refusals (zero RPC): never let a mutation-preparing command silently ignore intent.
    if (given(flags["start-sessions"]) && given(flags["no-start-sessions"]))
        throw (0, errors_1.usageError)("输入冲突：--start-sessions 与 --no-start-sessions 不能同时给出", USAGE);
    if (given(flags["auto-test"]) && given(flags["no-auto-test"]))
        throw (0, errors_1.usageError)("输入冲突：--auto-test 与 --no-auto-test 不能同时给出", USAGE);
    if (action === "prepare") {
        if (given(flags["no-start-sessions"]) || given(flags["no-auto-test"]))
            throw (0, errors_1.usageError)("输入冲突：prepare 的 startSessions/autoTest 默认即为关闭，--no-start-sessions/--no-auto-test 是 bootstrap 的显式关闭选项（本地拒绝，零 API）", USAGE);
    }
    else {
        if (given(flags["start-sessions"]) || given(flags["auto-test"]))
            throw (0, errors_1.usageError)("输入冲突：bootstrap 后台运行对 startSessions/autoTest 默认即为开启（legacy.ts:2852-2854），--start-sessions/--auto-test 是 prepare 的显式开启选项（本地拒绝，零 API）", USAGE);
        if (given(flags["no-apply-topology"]))
            throw (0, errors_1.usageError)("bootstrap 的后台运行强制 applyTopology:true（legacy.ts:2850），不接受 --no-apply-topology；该 opt-out 仅对 prepare 有意义（本地拒绝，零 API）", USAGE);
    }
    const params = {};
    if (flags.workspace)
        params.workspace = String(flags.workspace);
    if (mode !== undefined)
        params.topologyMode = mode;
    if (flags["server-ids"]) {
        const serverIds = String(flags["server-ids"]).split(",").map((item) => item.trim()).filter(Boolean);
        if (!serverIds.length)
            throw (0, errors_1.usageError)("project --server-ids must list at least one server id", USAGE);
        if (serverIds.includes("hub"))
            throw (0, errors_1.usageError)("HUB_REMOVED：serverIds 不得包含 hub（后端同输入同样拒绝）", USAGE);
        params.serverIds = serverIds;
    }
    if (flags.workers)
        params.workerTunnels = readWorkerTunnels(flags.workers);
    if (flags["plan-file"])
        params.planFile = String(flags["plan-file"]);
    if (flags["plan-id"])
        params.planId = String(flags["plan-id"]);
    if (flags["skip-xshell"] === true)
        params.applyXshell = false;
    if (flags["skip-runtime"] === true)
        params.deployRuntime = false;
    if (flags["no-apply-topology"] === true)
        params.applyTopology = false; // honored by prepare at legacy.ts:2317
    if (action === "prepare") {
        if (flags["start-sessions"] === true)
            params.startSessions = true;
        if (flags["auto-test"] === true)
            params.autoTest = true;
    }
    else {
        // bootstrap defaults startSessions/autoTest to true unless explicitly false (legacy.ts:2852-2854): the CLI exposes both opt-outs.
        if (flags["no-start-sessions"] === true)
            params.startSessions = false;
        if (flags["no-auto-test"] === true)
            params.autoTest = false;
    }
    if (flags["legacy-migration-digests"])
        params.legacyMigrationDigests = readJsonValue(flags["legacy-migration-digests"], "legacyMigrationDigests");
    // confirm is forwarded only when actually given (same rule as drafts): absence means the backend preview path.
    if (flags.confirm === true)
        params.confirm = true;
    return params;
}
/**
 * Same in-band rule as drafts/plan cleanup: the full JSON always prints and an object with ok===false
 * is a business failure (BUSINESS 3); objects without an "ok" field are not failures. The preview-first
 * refusals here are CONFIRM_REQUIRED (2001 → ENV 2), raised before any ok field exists. NOTE:
 * bootstrap-operation returns ok:true whenever the LOOKUP succeeded — operation.status inside it is the
 * bootstrap outcome and is reported verbatim (failed/pending/running are all query successes).
 */
function emit(result) {
    (0, format_1.writeJson)(result);
    return result && typeof result === "object" && !Array.isArray(result) && result.ok === false ? errors_1.EXIT_BUSINESS : errors_1.EXIT_OK;
}
function readJsonValue(file, what) {
    if (!fs.existsSync(file))
        throw (0, errors_1.usageError)(`${what} file not found: ${file}`);
    try {
        const value = JSON.parse(fs.readFileSync(file, "utf8"));
        if (!value || typeof value !== "object")
            throw (0, errors_1.usageError)(`${what} must be a JSON object or array`);
        return value;
    }
    catch (error) {
        if (error && typeof error === "object" && "exitCode" in error)
            throw error;
        throw (0, errors_1.usageError)(`${what} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function readWorkerTunnels(file) {
    const value = readJsonValue(file, "workerTunnels");
    if (!Array.isArray(value) || !value.length)
        throw (0, errors_1.usageError)("workerTunnels must be a non-empty JSON array of server objects");
    return value.map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item))
            throw (0, errors_1.usageError)("workerTunnels entries must be JSON objects");
        return item;
    });
}
