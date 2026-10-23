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
exports.agentsLifecycleCommand = agentsLifecycleCommand;
const fs = __importStar(require("node:fs"));
const api_1 = require("../api");
const errors_1 = require("../errors");
const format_1 = require("../format");
// A agents.lifecycle (NOT B's — B's simpleex sftp agents lifecycle has its own server-file contract and
// is untouched). Parameters mirror src/extension/legacy.ts:7958-7990 ONLY:
// {serverIds: string[] (required, AGENT_TARGET_REQUIRED :7960), action: inspect|ensure|stop|restart|migrate
// (default "inspect", AGENT_ACTION_INVALID :7963), confirm?, migrationDigests?: {serverId: 64-hex digest}}.
// Everything else (dirs, tmux policy, conda env, agent token, ports, expectedVersion/files manifest) is
// host-side setupConfig/runtime state at :7992-8038 — the CLI never sends or invents those fields.
// Confirmation factors are exactly what the backend defines: non-inspect requires ["confirm"] (:7982-7986);
// migrate additionally requires per-target migrationDigests matching the preview digests (:7973-7979), and
// the 2001 preview echoes the expected digests so the operator can save and echo them — the CLI never
// auto-fills and never replays. inspect is zero-write and needs no confirmations (descriptor
// LocalApiServer.legacy.ts:664-670: inspectZeroWrites, mutationConfirmation "exact configured target").
// Input-deterministic refusals (empty serverIds, bad action, malformed digests) are local, zero-RPC, with
// the backend's own reason strings.
const USAGE = `Usage:
  simpleex agents lifecycle inspect --server-ids a,b [--json]                                        (zero-write; no confirmation factors required)
  simpleex agents lifecycle ensure|stop|restart --server-ids a,b --confirm [--json]                  (backend requires ["confirm"]; without it the full target/tmux preview prints at exit 2 and nothing changes)
  simpleex agents lifecycle migrate --server-ids a,b --migration-digests digests.json --confirm [--json]   (requires confirm + per-target migrationDigests equal to the preview digests; the 2001 preview echoes them — never auto-filled, never replayed)
       serverIds are configured server ids (AGENT_TARGET_REQUIRED if missing); action outside inspect|ensure|stop|restart|migrate is AGENT_ACTION_INVALID. Directories, tmux sessions, tokens, ports and the runtime manifest stay host-side setupConfig state — the CLI sends only the real four fields. Restart/migrate semantics (restartPreservesTasks, migrationDigests, explicitConfirmation) are the backend's; a mutation here touches real remote agents when confirmed.`;
const ACTIONS = ["inspect", "ensure", "stop", "restart", "migrate"];
async function agentsLifecycleCommand(sub, rest, flags) {
    if (rest.length)
        throw (0, errors_1.usageError)("agents lifecycle takes no positional arguments after the action", USAGE);
    if (!ACTIONS.includes(sub))
        throw (0, errors_1.usageError)(`agents lifecycle action must be one of ${ACTIONS.join("|")} (backend: AGENT_ACTION_INVALID; local refusal, zero RPC)`, USAGE);
    const serverIds = flags["server-ids"] ? String(flags["server-ids"]).split(",").map((item) => item.trim()).filter(Boolean) : [];
    if (!serverIds.length)
        throw (0, errors_1.usageError)("agents lifecycle needs --server-ids a,b (backend: AGENT_TARGET_REQUIRED; local refusal, zero RPC)", USAGE);
    const params = { action: sub, serverIds };
    if (flags["migration-digests"])
        params.migrationDigests = readMigrationDigests(flags["migration-digests"]);
    // Forward the confirm factor only when actually given — the backend preview path answers otherwise.
    if (flags.confirm === true)
        params.confirm = true;
    return emit(await (0, api_1.callApi)("agents.lifecycle", params));
}
/** {serverId: 64-hex} — the same shape the backend validates when matching preview digests (:7976/:8040). */
function readMigrationDigests(file) {
    if (!fs.existsSync(file))
        throw (0, errors_1.usageError)(`migrationDigests file not found: ${file}`);
    let value;
    try {
        value = JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch (error) {
        throw (0, errors_1.usageError)(`migrationDigests must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw (0, errors_1.usageError)("migrationDigests must be a JSON object {serverId: 64-hex digest}");
    const rows = value;
    const entries = Object.entries(rows);
    if (!entries.length)
        throw (0, errors_1.usageError)("migrationDigests must map at least one serverId to its preview digest");
    for (const [serverId, digest] of entries) {
        if (!serverId.trim() || typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest)) {
            throw (0, errors_1.usageError)(`migrationDigests["${serverId}"] must be a 64-hex sha256 digest echoed from the preview (backend compares it per target)`);
        }
    }
    return rows;
}
/** Same in-band rule as drafts/plan cleanup/projectOps: full JSON always prints; ok===false → BUSINESS 3. */
function emit(result) {
    (0, format_1.writeJson)(result);
    return result && typeof result === "object" && !Array.isArray(result) && result.ok === false ? errors_1.EXIT_BUSINESS : errors_1.EXIT_OK;
}
