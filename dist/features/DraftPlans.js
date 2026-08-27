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
exports.DRAFT_STATUSES = exports.PROMOTION_LEDGER_PATH = exports.DRAFT_METADATA_PATH = exports.DRAFT_STATE_DIR = exports.DRAFT_RESULT_ROOT = exports.DRAFT_CONFIG_ROOT = exports.DRAFT_PLAN_ROOT = void 0;
exports.isDraftPlanPath = isDraftPlanPath;
exports.isDraftConfigPath = isDraftConfigPath;
exports.safeDraftWorkspaceChild = safeDraftWorkspaceChild;
exports.extractDraftConfigRefs = extractDraftConfigRefs;
exports.validateDraftReferences = validateDraftReferences;
exports.draftContentHash = draftContentHash;
exports.reconcileDraftPlans = reconcileDraftPlans;
exports.buildPromotionPreview = buildPromotionPreview;
exports.promoteDraft = promoteDraft;
exports.updateDraftMetadata = updateDraftMetadata;
exports.rejectDraft = rejectDraft;
exports.markDraftReviewed = markDraftReviewed;
exports.listCleanupCandidates = listCleanupCandidates;
exports.cleanupApprovedDrafts = cleanupApprovedDrafts;
exports.sha256Text = sha256Text;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const PlanBuilder_1 = require("./PlanBuilder");
exports.DRAFT_PLAN_ROOT = "tmp/plan";
exports.DRAFT_CONFIG_ROOT = "tmp/config";
exports.DRAFT_RESULT_ROOT = "tmp/result";
exports.DRAFT_STATE_DIR = "simple_cluster/drafts";
exports.DRAFT_METADATA_PATH = `${exports.DRAFT_STATE_DIR}/drafts.json`;
exports.PROMOTION_LEDGER_PATH = `${exports.DRAFT_STATE_DIR}/promotions.jsonl`;
exports.DRAFT_STATUSES = Object.freeze([
    "draft", "validated", "debug_running", "debug_completed",
    "ready_for_review", "promoted", "rejected", "stale",
]);
const TERMINAL_DRAFT_STATUSES = new Set(["promoted", "rejected"]);
const CLEANABLE_DRAFT_STATUSES = new Set(["rejected", "stale"]);
const MAX_DRAFT_TEXT_BYTES = 512 * 1024;
const MAX_DRAFT_FILES = 500;
function normalizeWorkspacePath(value) {
    const raw = String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
    if (!raw)
        return "";
    if (path.posix.isAbsolute(raw) || /^[A-Za-z]:\//.test(raw))
        return "";
    const normalized = path.posix.normalize(raw);
    if (!normalized || normalized === "." || normalized.startsWith("../"))
        return "";
    return normalized.replace(/\/+$/, "");
}
function isDraftPlanPath(value) {
    const normalized = normalizeWorkspacePath(value);
    return normalized === exports.DRAFT_PLAN_ROOT || normalized.startsWith(`${exports.DRAFT_PLAN_ROOT}/`);
}
function isDraftConfigPath(value) {
    const normalized = normalizeWorkspacePath(value);
    return normalized === exports.DRAFT_CONFIG_ROOT || normalized.startsWith(`${exports.DRAFT_CONFIG_ROOT}/`);
}
function safeDraftWorkspaceChild(root, relative) {
    const normalized = normalizeWorkspacePath(relative);
    if (!normalized)
        throw new Error(`非法草稿路径：${relative}`);
    const full = path.resolve(root, normalized);
    const rootFull = path.resolve(root);
    const rel = path.relative(rootFull, full);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel))
        throw new Error(`草稿路径必须位于工作区内：${relative}`);
    return full;
}
function yamlScalarValue(value) {
    return String(value || "").trim()
        .replace(/(^|[^\\])#.*$/, "$1")
        .trim()
        .replace(/^['"]|['"]$/g, "")
        .replace(/\\(["'])/g, "$1")
        .trim();
}
function addConfigCandidate(out, source, value) {
    const token = yamlScalarValue(value).split(/\s+/)[0] || "";
    if (!token || token.includes("{") || token.includes("$"))
        return;
    const normalized = normalizeWorkspacePath(token.replace(/^["']|["']$/g, ""));
    if (!/\.(?:ya?ml)$/i.test(normalized))
        return;
    if (!out.has(normalized))
        out.set(normalized, source);
}
function extractDraftConfigRefs(planFile, text) {
    const candidates = new Map();
    for (const line of String(text || "").split(/\r?\n/)) {
        if (!line.trim() || /^\s*#/.test(line))
            continue;
        const scalar = line.match(/^\s*-?\s*(?:base_config|base-config|config_file|config-file|config_path|config-path|cfg|config)\s*:\s*(.+?)\s*(?:#.*)?$/i);
        if (scalar?.[1] && !/^[{&*]/.test(scalar[1]))
            addConfigCandidate(candidates, `yaml:${line.trim()}`, scalar[1]);
        for (const match of line.matchAll(/(?:^|[\s;&|(])(?:--)?(?:base[-_]config|config[-_]file|config[-_]path|cfg|config)(?:=|\s*=\s*|\s+)("[^"]+"|'[^']+'|[^\s;&|]+)/gi)) {
            addConfigCandidate(candidates, `command:${line.trim()}`, match[1]);
        }
    }
    return [...candidates].map(([itemPath, source]) => ({ path: itemPath, source }));
}
function validateDraftReferences(planFile, text) {
    const refs = extractDraftConfigRefs(planFile, text);
    const issues = [];
    const configRefs = [];
    for (const ref of refs) {
        if (isDraftConfigPath(ref.path))
            configRefs.push(ref.path);
        else
            issues.push({ code: "CONFIG_OUTSIDE_TMP", message: `配置引用不在 ${exports.DRAFT_CONFIG_ROOT}/：${ref.path}` });
    }
    if (!refs.length)
        issues.push({ code: "NO_DRAFT_CONFIG", message: `草稿 Plan 必须引用 ${exports.DRAFT_CONFIG_ROOT}/ 下的配置。` });
    const contract = (0, PlanBuilder_1.validateDeepLearningPlanContract)(text);
    for (const issue of contract.issues || [])
        issues.push({ code: "PLAN_CONTRACT", message: issue.message || issue.label });
    return { ok: issues.length === 0, status: issues.length ? "draft" : "validated", configRefs: unique(configRefs), issues };
}
function draftContentHash(files) {
    const stable = files
        .map((item) => ({ path: normalizeWorkspacePath(item.path), text: String(item.text || "") }))
        .filter((item) => item.path)
        .sort((left, right) => left.path.localeCompare(right.path))
        .map((item) => `${item.path}\n${sha256Text(item.text)}`);
    return sha256Text(JSON.stringify(stable));
}
async function readTextCapped(file) {
    const handle = await fs.open(file, "r");
    try {
        const buffer = Buffer.alloc(MAX_DRAFT_TEXT_BYTES + 1);
        const result = await handle.read(buffer, 0, buffer.length, 0);
        if (result.bytesRead > MAX_DRAFT_TEXT_BYTES)
            throw new Error(`草稿文件超过 ${MAX_DRAFT_TEXT_BYTES} 字节读取上限。`);
        return buffer.subarray(0, result.bytesRead).toString("utf8");
    }
    finally {
        await handle.close();
    }
}
async function walkYamlFiles(dir) {
    const out = [];
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    }
    catch {
        return out;
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory())
            out.push(...await walkYamlFiles(full));
        else if (entry.isFile() && /\.(?:ya?ml)$/i.test(entry.name))
            out.push(full);
        if (out.length >= MAX_DRAFT_FILES)
            break;
    }
    return out.slice(0, MAX_DRAFT_FILES);
}
function promotionTargetFor(source) {
    const normalized = normalizeWorkspacePath(source);
    if (isDraftPlanPath(normalized))
        return normalized.replace(new RegExp(`^${exports.DRAFT_PLAN_ROOT}/`), "experiments/plans/");
    if (isDraftConfigPath(normalized))
        return normalized.replace(new RegExp(`^${exports.DRAFT_CONFIG_ROOT}/`), "configs/");
    return "";
}
function metadataMap(records) {
    const rows = records && typeof records === "object" && Array.isArray(records.drafts)
        ? records.drafts : Array.isArray(records) ? records : [];
    return new Map(rows.filter((row) => row && typeof row === "object").map((row) => [String(row.draftPlanPath || "").replace(/\\/g, "/"), row]));
}
async function loadMetadata(root) {
    try {
        return metadataMap(JSON.parse(await fs.readFile(path.join(root, exports.DRAFT_METADATA_PATH), "utf8")));
    }
    catch {
        return new Map();
    }
}
async function saveMetadata(root, drafts) {
    const target = safeDraftWorkspaceChild(root, exports.DRAFT_METADATA_PATH);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await atomicWriteJson(target, {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        drafts,
    });
}
async function atomicWriteJson(target, value) {
    const temp = `${target}.tmp-${process.pid}-${Math.random().toString(16).slice(2)}`;
    await fs.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await fs.rename(temp, target);
}
function baseRecord(row, now) {
    const item = row && typeof row === "object" ? row : {};
    const createdAt = String(item.createdAt || item.created_at || "") && validIso(String(item.createdAt || item.created_at)) ? String(item.createdAt || item.created_at) : now;
    return {
        createdAt,
        lastDebugRunId: optionalString(item.lastDebugRunId || item.lastDebugRunId),
        lastDebugStatus: optionalString(item.lastDebugStatus),
        reviewedAt: optionalString(item.reviewedAt),
        reviewedBy: optionalString(item.reviewedBy),
        promotionDecision: ["promoted", "rejected", "replaced"].includes(String(item.promotionDecision)) ? item.promotionDecision : undefined,
    };
}
function validIso(value) {
    return Number.isFinite(Date.parse(value));
}
function optionalString(value) {
    const text = String(value || "").trim();
    return text || undefined;
}
function unique(values) {
    return [...new Set(values.map((value) => normalizeWorkspacePath(value)).filter(Boolean))];
}
async function reconcileDraftPlans(root, activity = []) {
    const plans = await walkYamlFiles(path.resolve(root, exports.DRAFT_PLAN_ROOT));
    const metadata = await loadMetadata(root);
    const now = new Date().toISOString();
    const drafts = [];
    const seen = new Set();
    for (const full of plans) {
        const relative = path.relative(root, full).replace(/\\/g, "/");
        seen.add(relative.toLowerCase());
        const stat = await fs.stat(full);
        const planText = await readTextCapped(full);
        const validation = validateDraftReferences(relative, planText);
        const configTexts = new Map();
        for (const configRef of validation.configRefs) {
            try {
                configTexts.set(configRef, await readTextCapped(safeDraftWorkspaceChild(root, configRef)));
            }
            catch (error) {
                validation.issues.push({ code: "CONFIG_MISSING", message: errorMessage(error) });
                validation.ok = false;
                validation.status = "draft";
            }
        }
        const contentHash = draftContentHash([{ path: relative, text: planText }, ...[...configTexts].map(([itemPath, text]) => ({ path: itemPath, text }))]);
        const previous = metadata.get(relative) || {};
        const prior = baseRecord(previous, now);
        const active = activity.find((item) => normalizeWorkspacePath(item.draftPlanPath) === relative && !["completed", "failed", "cancelled", "canceled", "stalled", "stale"].includes(String(item.debugStatus || "").toLowerCase()));
        let status = validation.ok ? "validated" : "draft";
        if (active)
            status = "debug_running";
        else if (!validation.ok && !TERMINAL_DRAFT_STATUSES.has(previous.status))
            status = "draft";
        else if (validation.ok && String(previous.contentHash || "") === contentHash && exports.DRAFT_STATUSES.includes(previous.status))
            status = previous.status;
        else if (!validation.ok && exports.DRAFT_STATUSES.includes(previous.status))
            status = previous.status;
        else if (validation.ok && String(previous.contentHash || "") !== contentHash && TERMINAL_DRAFT_STATUSES.has(previous.status))
            status = "stale";
        const summary = (0, PlanBuilder_1.parsePlanSummary)(planText);
        const record = {
            ...prior,
            draftPlanPath: relative,
            draftConfigPaths: validation.configRefs,
            contentHash,
            createdAt: prior.createdAt || stat.birthtime?.toISOString?.() || now,
            updatedAt: stat.mtime?.toISOString?.() || now,
            promotionTargetPaths: unique([relative, ...validation.configRefs].map(promotionTargetFor).filter(Boolean)),
            status,
            issues: validation.issues,
            suite: summary.suite || "",
            jobCount: Math.max(1, summary.seeds.length || 1) * Math.max(1, summary.cases.length),
            missing: false,
        };
        drafts.push(record);
    }
    for (const [relative, previous] of metadata) {
        if (seen.has(relative.toLowerCase()))
            continue;
        if (TERMINAL_DRAFT_STATUSES.has(previous.status))
            continue;
        const prior = baseRecord(previous, now);
        drafts.push({
            ...prior,
            draftPlanPath: relative,
            draftConfigPaths: unique(previous.draftConfigPaths || []),
            contentHash: String(previous.contentHash || ""),
            createdAt: prior.createdAt || now,
            updatedAt: now,
            promotionTargetPaths: unique(previous.promotionTargetPaths || []),
            status: "stale",
            issues: [{ code: "PLAN_MISSING", message: "草稿 PLAN 文件不存在。" }],
            missing: true,
        });
    }
    await saveMetadata(root, drafts);
    return { enabled: Boolean(drafts.length), drafts: drafts.sort((left, right) => left.draftPlanPath.localeCompare(right.draftPlanPath)) };
}
async function readFileIfExists(root, relative) {
    try {
        return await fs.readFile(safeDraftWorkspaceChild(root, relative), "utf8");
    }
    catch {
        return undefined;
    }
}
function diffLines(left, right) {
    const oldLines = String(left || "").split(/\r?\n/);
    const newLines = String(right || "").split(/\r?\n/);
    const cap = 2000;
    const a = oldLines.slice(0, cap);
    const b = newLines.slice(0, cap);
    const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
    for (let i = a.length - 1; i >= 0; i -= 1) {
        for (let j = b.length - 1; j >= 0; j -= 1) {
            dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
    }
    const added = [];
    const removed = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            i += 1;
            j += 1;
        }
        else if (dp[i + 1][j] >= dp[i][j + 1])
            removed.push(a[i++]);
        else
            added.push(b[j++]);
    }
    while (i < a.length)
        removed.push(a[i++]);
    while (j < b.length)
        added.push(b[j++]);
    if (oldLines.length > cap)
        removed.push(`... (${oldLines.length - cap} more lines)`);
    if (newLines.length > cap)
        added.push(`... (${newLines.length - cap} more lines)`);
    return { added, removed };
}
async function buildPromotionPreview(root, draftPlanPath, context = {}) {
    const planPath = normalizeWorkspacePath(draftPlanPath);
    if (!isDraftPlanPath(planPath))
        throw new Error(`不是合法的草稿 PLAN：${draftPlanPath}`);
    const planText = await readFileIfExists(root, planPath);
    if (planText === undefined)
        throw new Error(`草稿 PLAN 不存在：${planPath}`);
    const refs = extractDraftConfigRefs(planPath, planText).map((ref) => ref.path);
    const invalidRefs = refs.filter((ref) => !isDraftConfigPath(ref));
    if (invalidRefs.length || !refs.length)
        throw new Error(`草稿配置引用无效：${invalidRefs.join(", ") || "缺少引用"}`);
    const targets = [];
    const sourceFiles = [];
    for (const source of unique([planPath, ...refs])) {
        const sourceText = await readFileIfExists(root, source);
        if (sourceText === undefined)
            throw new Error(`草稿文件不存在：${source}`);
        const targetPath = promotionTargetFor(source);
        const existing = await readFileIfExists(root, targetPath);
        targets.push({
            kind: isDraftPlanPath(source) ? "plan" : "config",
            sourcePath: source,
            targetPath,
            exists: existing !== undefined,
            sourceHash: sha256Text(sourceText),
            diff: diffLines(existing ?? "", sourceText),
        });
        sourceFiles.push({ path: source, text: sourceText });
    }
    return {
        schemaVersion: 1,
        draftPlanPath: planPath,
        contentHash: draftContentHash(sourceFiles),
        debugRunId: String(context.debugRunId || ""),
        debugStatus: String(context.debugStatus || ""),
        metricsSummary: context.metricsSummary || {},
        targets,
        conflicts: targets.filter((target) => target.exists).map((target) => ({ path: target.targetPath, kind: target.kind })),
    };
}
async function nextAvailableWorkspaceFile(root, target) {
    const parsed = path.posix.parse(normalizeWorkspacePath(target));
    for (let index = 1; index < 10000; index += 1) {
        const candidate = path.posix.join(parsed.dir, `${parsed.name}_draft_${index}${parsed.ext}`);
        if (!await readFileIfExists(root, candidate))
            return candidate;
    }
    throw new Error(`无法为 ${target} 找到可用的转正文件名。`);
}
async function promoteDraft(root, preview, options) {
    if (options.conflictMode === "cancel")
        throw new Error("用户取消转正。");
    const conflicts = preview.conflicts || [];
    if (conflicts.length && options.conflictMode !== "replace" && options.conflictMode !== "rename") {
        throw new Error(`正式目标已存在，需要选择 rename、replace 或取消：${conflicts.map((item) => item.path).join(", ")}`);
    }
    const renames = [];
    const copyPlan = [];
    for (const target of preview.targets) {
        const sourceText = await readFileIfExists(root, target.sourcePath);
        if (sourceText === undefined || sha256Text(sourceText) !== target.sourceHash)
            throw new Error(`转正预览后草稿已变化：${target.sourcePath}`);
        let destination = target.targetPath;
        if (target.exists) {
            if (options.conflictMode === "replace") {
                destination = target.targetPath;
            }
            else {
                destination = await nextAvailableWorkspaceFile(root, target.targetPath);
                renames.push({ from: target.targetPath, to: destination });
            }
        }
        copyPlan.push({ source: target.sourcePath, target: destination, expected: target.sourceHash });
    }
    const destinations = new Set(copyPlan.map((item) => item.target));
    if (destinations.size !== copyPlan.length)
        throw new Error("转正目标路径重复，已停止。");
    for (const item of copyPlan) {
        const source = safeDraftWorkspaceChild(root, item.source);
        const target = safeFormalWorkspaceChild(root, item.target);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(source, target);
    }
    // Rewrite promoted PLAN to reference formal config paths instead of draft tmp/config
    const draftToFormal = new Map(copyPlan.filter((item) => isDraftConfigPath(item.source)).map((item) => [item.source, item.target]));
    if (draftToFormal.size) {
        for (const item of copyPlan) {
            if (!isDraftPlanPath(item.source))
                continue;
            const formalPlanFull = safeFormalWorkspaceChild(root, item.target);
            let planText = await fs.readFile(formalPlanFull, "utf8").catch(() => "");
            if (!planText)
                continue;
            let rewritten = planText;
            for (const [draftRef, formalRef] of draftToFormal) {
                // replace all occurrences of draft config path with formal path
                rewritten = rewritten.split(draftRef).join(formalRef);
            }
            if (rewritten !== planText) {
                await fs.writeFile(formalPlanFull, rewritten, "utf8");
            }
        }
    }
    const ledgerRecord = {
        schemaVersion: 1,
        promotedAt: new Date().toISOString(),
        sourceHash: preview.contentHash,
        sourceFiles: preview.targets.map((target) => ({ path: target.sourcePath, sha256: target.sourceHash })),
        targetPaths: copyPlan.map((item) => item.target),
        renamedExistingTargets: renames,
        debugRunId: preview.debugRunId,
        metricsSummary: preview.metricsSummary,
        userConfirmed: true,
        reviewedBy: options.reviewedBy || "local-user",
        decision: options.conflictMode,
    };
    const ledger = safeFormalWorkspaceChild(root, exports.PROMOTION_LEDGER_PATH);
    await fs.mkdir(path.dirname(ledger), { recursive: true });
    await fs.appendFile(ledger, `${JSON.stringify(ledgerRecord)}\n`, "utf8");
    await updateDraftMetadata(root, preview.draftPlanPath, (record) => ({
        ...record,
        status: "promoted",
        reviewedAt: ledgerRecord.promotedAt,
        reviewedBy: ledgerRecord.reviewedBy,
        promotionDecision: options.conflictMode === "replace" ? "replaced" : "promoted",
        promotionTargetPaths: ledgerRecord.targetPaths,
    }));
    return {
        ok: true,
        decision: options.conflictMode === "replace" ? "replaced" : "promoted",
        planPath: copyPlan.find((item) => isDraftPlanPath(item.source))?.target || "",
        configPaths: copyPlan.filter((item) => isDraftConfigPath(item.source)).map((item) => item.target),
        renamedTargets: renames,
        ledgerPath: exports.PROMOTION_LEDGER_PATH,
    };
}
function safeFormalWorkspaceChild(root, relative) {
    const normalized = normalizeWorkspacePath(relative);
    if (!normalized || normalized.startsWith("tmp/") || normalized.startsWith("simple_cluster/debug_runs/")) {
        throw new Error(`非法正式目标：${relative}`);
    }
    return safeDraftWorkspaceChild(root, normalized);
}
async function updateDraftMetadata(root, draftPlanPath, updater) {
    const current = await loadMetadata(root);
    const key = normalizeWorkspacePath(draftPlanPath);
    const existing = current.get(key) || { draftPlanPath: key, createdAt: new Date().toISOString() };
    const next = updater(existing);
    current.set(key, next);
    await saveMetadata(root, [...current.values()].sort((left, right) => String(left.draftPlanPath).localeCompare(String(right.draftPlanPath))));
    return [...current.values()];
}
async function rejectDraft(root, draftPlanPath, reviewedBy = "local-user") {
    const now = new Date().toISOString();
    await updateDraftMetadata(root, draftPlanPath, (record) => ({
        ...record,
        draftPlanPath: normalizeWorkspacePath(draftPlanPath),
        status: "rejected",
        reviewedAt: now,
        reviewedBy,
        promotionDecision: "rejected",
    }));
}
async function markDraftReviewed(root, draftPlanPath, reviewedBy = "local-user") {
    const now = new Date().toISOString();
    await updateDraftMetadata(root, draftPlanPath, (record) => ({
        ...record,
        status: record.status === "debug_completed" || record.status === "ready_for_review" ? "ready_for_review" : record.status,
        reviewedAt: now,
        reviewedBy,
    }));
}
async function listCleanupCandidates(root, drafts) {
    const protectedConfigs = new Set();
    for (const draft of drafts) {
        if (!CLEANABLE_DRAFT_STATUSES.has(draft.status)) {
            for (const config of draft.draftConfigPaths || [])
                protectedConfigs.add(normalizeWorkspacePath(config));
        }
    }
    const candidates = [];
    for (const draft of drafts) {
        if (!CLEANABLE_DRAFT_STATUSES.has(draft.status) || draft.missing)
            continue;
        if (await fileExists(safeDraftWorkspaceChild(root, draft.draftPlanPath))) {
            candidates.push({ path: draft.draftPlanPath, kind: "file", reason: `状态 ${draft.status} 且未被活动草稿引用` });
        }
        for (const configPath of draft.draftConfigPaths || []) {
            const normalized = normalizeWorkspacePath(configPath);
            if (protectedConfigs.has(normalized))
                continue;
            if (await fileExists(safeDraftWorkspaceChild(root, normalized))) {
                candidates.push({ path: normalized, kind: "file", reason: `仅被 ${draft.status} 草稿 ${draft.draftPlanPath} 引用` });
            }
        }
    }
    return candidates.sort((left, right) => left.path.localeCompare(right.path));
}
async function cleanupApprovedDrafts(root, drafts, approvedPaths) {
    const candidates = await listCleanupCandidates(root, drafts);
    const allowed = new Map(candidates.map((candidate) => [normalizeWorkspacePath(candidate.path), candidate]));
    const requested = approvedPaths.map((value) => normalizeWorkspacePath(value)).filter(Boolean);
    if (new Set(requested).size !== requested.length)
        throw new Error("清理请求包含重复路径。");
    const deleted = [];
    for (const requestedPath of requested) {
        const candidate = allowed.get(requestedPath);
        if (!candidate || candidate.kind !== "file")
            throw new Error(`清理候选不匹配或已变化：${requestedPath}`);
        const target = safeDraftWorkspaceChild(root, requestedPath);
        const stat = await fs.stat(target);
        if (!stat.isFile())
            throw new Error(`清理候选不是普通文件：${requestedPath}`);
        await fs.unlink(target);
        deleted.push(requestedPath);
    }
    return { deleted };
}
async function fileExists(file) {
    try {
        return (await fs.stat(file)).isFile();
    }
    catch {
        return false;
    }
}
function sha256Text(text) {
    return (0, crypto_1.createHash)("sha256").update(text, "utf8").digest("hex");
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
