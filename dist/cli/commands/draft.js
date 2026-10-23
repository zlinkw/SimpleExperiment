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
exports.draftCommand = draftCommand;
const fs = __importStar(require("node:fs"));
const api_1 = require("../api");
const errors_1 = require("../errors");
const format_1 = require("../format");
// A drafts domain — parameters mirror src/extension/legacy.ts:1534-1551 exactly:
// list/cleanupCandidates take {force}; validate/promotionPreview/review/reject take draftPlanPath
// (review/reject also accept reviewedBy, whose default "local-user" belongs to the backend —
// the CLI never sends it on the backend's behalf); drafts.cleanup requires paths and gates the
// move with confirm + pathConfirmed + confirmedPaths (exact absolute-path set, :15696-15698).
// B's files.cleanup rules do NOT apply here and are not reused. Missing confirmation factors are
// forwarded as-is — never auto-filled — so the backend answers with its own preview (2001 → exit 2).
const USAGE = `Usage:
  simpleex draft list [--force] [--json]
  simpleex draft candidates [--force] [--json]
  simpleex draft validate <draftPlanPath> [--json]
  simpleex draft promotion-preview <draftPlanPath> [--json]
  simpleex draft review <draftPlanPath> [--reviewed-by <name>] [--json]
  simpleex draft reject <draftPlanPath> [--reviewed-by <name>] [--json]
  simpleex draft cleanup --paths paths.json [--confirmed-paths-file confirmed.json] [--confirm] [--path-confirmed] [--json]
       cleanup gates the move with confirm+pathConfirmed+confirmedPaths (absolute paths from the preview); drafts.promote is retired (DRAFT_PROMOTION_RETIRED) and is refused, never revived.`;
async function draftCommand(action, rest, flags) {
    if (action === "list" || action === "candidates") {
        if (rest.length)
            throw (0, errors_1.usageError)(`draft ${action} takes no positional arguments`, USAGE);
        const method = action === "list" ? "drafts.list" : "drafts.cleanupCandidates";
        return emit(await (0, api_1.callApi)(method, flags.force === true ? { force: true } : {}));
    }
    if (action === "validate" || action === "promotion-preview" || action === "review" || action === "reject") {
        if (rest.length !== 1)
            throw (0, errors_1.usageError)(`draft ${action} takes exactly one <draftPlanPath>`, USAGE);
        const params = { draftPlanPath: rest[0] };
        if ((action === "review" || action === "reject") && flags["reviewed-by"])
            params.reviewedBy = String(flags["reviewed-by"]);
        const method = action === "validate" ? "drafts.validate"
            : action === "promotion-preview" ? "drafts.promotionPreview"
                : action === "review" ? "drafts.review" : "drafts.reject";
        return emit(await (0, api_1.callApi)(method, params));
    }
    if (action === "cleanup") {
        if (rest.length)
            throw (0, errors_1.usageError)("draft cleanup takes no positional arguments", USAGE);
        if (!flags.paths)
            throw (0, errors_1.usageError)("draft cleanup needs --paths <paths.json> (exact candidate paths from drafts.cleanupCandidates)", USAGE);
        const paths = readStringArray(readJsonArray(flags.paths, "draft cleanup paths"), "draft cleanup paths");
        if (!paths.length)
            throw (0, errors_1.usageError)("draft cleanup needs at least one exact path (backend: 清理必须提供精确文件路径列表)", USAGE);
        // Duplicate refusal is deterministic from the input itself (legacy.ts:15711), so it belongs to usage — zero API calls.
        if (new Set(paths).size !== paths.length)
            throw (0, errors_1.usageError)("draft cleanup paths contain duplicates (backend refuses; refusing before any API call)", USAGE);
        const params = { paths };
        if (flags["confirmed-paths-file"])
            params.confirmedPaths = readStringArray(readJsonArray(flags["confirmed-paths-file"], "draft cleanup confirmed paths"), "draft cleanup confirmed paths");
        if (flags.confirm === true)
            params.confirm = true;
        if (flags["path-confirmed"] === true)
            params.pathConfirmed = true;
        return emit(await (0, api_1.callApi)("drafts.cleanup", params));
    }
    if (action === "promote") {
        throw (0, errors_1.businessError)("drafts.promote is retired: DRAFT_PROMOTION_RETIRED — new tasks use configs and experiments/plans directly; historical drafts stay read-only (src/extension/legacy.ts apiDraftPromote)", "zero RPC: this CLI never calls the retired method.");
    }
    throw (0, errors_1.usageError)(`unknown draft action: ${action || "(missing)"}`, USAGE);
}
/**
 * Full JSON always prints; the exit code follows the real result contract. A validation report is
 * a successful RPC even when ok:false (legacy.ts:15614-15621 returns {ok:validation.ok,status,
 * configRefs,issues}), so the shell contract must say BUSINESS(3) — never a silent success. Objects
 * without an "ok" field (list state, promotion previews) are NOT failures; ok===false is the only
 * in-band business failure this domain defines. The backend's own semantics are untouched.
 */
function emit(result) {
    (0, format_1.writeJson)(result);
    return result && typeof result === "object" && !Array.isArray(result) && result.ok === false ? errors_1.EXIT_BUSINESS : errors_1.EXIT_OK;
}
function readJsonArray(file, what) {
    if (!fs.existsSync(file))
        throw (0, errors_1.usageError)(`${what} file not found: ${file}`);
    let value;
    try {
        value = JSON.parse(fs.readFileSync(file, "utf8"));
    }
    catch (error) {
        throw (0, errors_1.usageError)(`${what} must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!Array.isArray(value))
        throw (0, errors_1.usageError)(`${what} must be a JSON array`);
    return value;
}
function readStringArray(value, what) {
    return value.map((item) => {
        if (typeof item !== "string" || !item.trim())
            throw (0, errors_1.usageError)(`${what} must contain non-empty strings only`);
        return item.trim();
    });
}
