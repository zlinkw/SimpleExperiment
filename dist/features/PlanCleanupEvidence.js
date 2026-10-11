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
exports.cleanupStablePlanId = void 0;
exports.collectPlanCleanupEvidence = collectPlanCleanupEvidence;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const node_crypto_1 = require("node:crypto");
const PlanArchive_1 = require("./PlanArchive");
const DistributedPlanQueue_1 = require("./DistributedPlanQueue");
const PlanCleanup_1 = require("./PlanCleanup");
const terminal = new Set(["completed", "failed", "cancelled"]);
const sha = (text) => (0, node_crypto_1.createHash)("sha256").update(text, "utf8").digest("hex");
const normalized = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
const ancestor = (a, b) => b === a || b.startsWith(a + "/");
const sameFile = (a, b) => process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
const cleanupStablePlanId = (text) => text.match(/^(?:plan_id|stable_plan_id):[ \t]*["']?([A-Za-z0-9._-]+)["']?[ \t]*$/m)?.[1];
exports.cleanupStablePlanId = cleanupStablePlanId;
async function literalPlans(root) {
    const found = [];
    const walk = async (dir) => {
        const entries = await fs.readdir(path.join(root, dir), { withFileTypes: true }).catch((error) => { if (error.code === "ENOENT")
            return []; throw error; });
        for (const entry of entries) {
            if (entry.isSymbolicLink())
                throw new Error("LINK_OR_REPARSE_POINT: " + dir + "/" + entry.name);
            const file = dir + "/" + entry.name;
            if (entry.isDirectory())
                await walk(file);
            else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) {
                const stat = await fs.stat(path.join(root, file));
                if (stat.size > 1024 * 1024 || found.length > 5000)
                    throw new Error("PLAN_SCAN_LIMIT");
                found.push({ file, text: await fs.readFile(path.join(root, file), "utf8") });
            }
        }
    };
    await walk("experiments/plans");
    await walk("experiments/drafts");
    await walk("tmp/plan");
    return found;
}
/** Read-only joins from registered attempts/sync receipts. Unknown legacy ownership is report-only. */
async function collectPlanCleanupEvidence(input) {
    const file = (0, PlanCleanup_1.cleanupRelative)(normalized(input.planFile)), projectId = (0, DistributedPlanQueue_1.canonicalProjectId)(input.root);
    const plans = await literalPlans(input.root);
    const virtual = new Map();
    for (const [source, destination] of Object.entries(input.archivedFiles || {})) {
        (0, PlanCleanup_1.cleanupRelative)(source);
        (0, PlanCleanup_1.cleanupRelative)(destination);
        if (!destination.startsWith("clean_dir/"))
            throw new Error("UNSAFE_ARCHIVED_PATH");
        if (await fs.lstat(path.join(input.root, source)).then(() => true, (error) => { if (error.code === "ENOENT")
            return false; throw error; }))
            throw new Error("SOURCE_RECREATED_OR_CHANGED");
        const text = await fs.readFile(path.join(input.root, destination), "utf8");
        virtual.set(source, text);
        if (/^(?:experiments\/(?:plans|drafts)|tmp\/plan)\//.test(source))
            plans.push({ file: source, text });
    }
    const removed = input.removedMetadata;
    for (const source of Object.keys(removed?.hashes || {})) {
        (0, PlanCleanup_1.cleanupRelative)(source);
        if (await fs.lstat(path.join(input.root, source)).then(() => true, (error) => { if (error.code === "ENOENT")
            return false; throw error; }))
            throw new Error("SOURCE_RECREATED_OR_CHANGED");
    }
    for (const source of Object.keys(removed?.hashes || {}))
        if (/^(?:experiments\/(?:plans|drafts)|tmp\/plan)\//.test(source)
            && !plans.some(row => sameFile(row.file, source)))
            plans.push({ file: source, text: "" });
    const planSha = (row) => removed?.hashes[row.file] || sha(row.text);
    const current = plans.find(row => sameFile(row.file, file));
    if (!current && !input.allowMissing)
        throw new Error("PLAN_NOT_FOUND");
    const stable = current && (0, exports.cleanupStablePlanId)(current.text);
    const planKey = removed?.hashes[file] ? removed.planKey : (0, PlanCleanup_1.cleanupDigest)([projectId, stable || file]);
    const aliases = new Set(plans.filter(row => stable && (0, exports.cleanupStablePlanId)(row.text) === stable).map(row => row.file));
    aliases.add(file);
    const selected = input.queue.plans.filter(row => removed?.runIds.includes(row.id) || stable && row.stablePlanId === stable || [...aliases].some(alias => sameFile(normalized(row.planFile), alias)));
    selected.forEach(row => aliases.add(normalized(row.planFile)));
    const runIds = selected.map(row => row.id), candidates = [];
    const blockers = [];
    const scope = { projectId, planKey, planFile: file, planHash: removed?.hashes[file] || (current ? sha(current.text) : "absent"), runIds, revision: "",
        nodes: input.nodes, candidates, blockers };
    const add = (nodeId, rel, type, category, evidence, owners = [planKey], protectedReason) => {
        try {
            rel = (0, PlanCleanup_1.cleanupRelative)(normalized(rel));
        }
        catch {
            blockers.push({ code: "UNSAFE_RECORDED_PATH", nodeId, detail: String(rel) });
            return;
        }
        const existing = candidates.find(row => row.nodeId === nodeId && row.relativePath === rel);
        if (existing) {
            existing.evidence = [...new Set([...existing.evidence, ...evidence])];
            existing.owners = [...new Set([...existing.owners, ...owners])];
            existing.protectedReason ||= protectedReason;
            return;
        }
        candidates.push({ nodeId, relativePath: rel, type, category, evidence, owners, dependencies: [], ...(protectedReason ? { protectedReason } : {}) });
    };
    for (const alias of plans.filter(row => aliases.has(row.file))) {
        add("local", alias.file, "file", "PLAN 文件", ["项目规范路径=" + projectId, "PLAN SHA256=" + planSha(alias), "PLAN ID=" + planKey]);
        candidates.find(row => row.relativePath === alias.file).expectedSha256 = removed?.hashes[alias.file] || sha(alias.text);
    }
    // The full graph includes config inheritance, not merely references of the selected PLAN.
    const configRefs = new Map(), configHashes = {};
    const externalAssetRefs = [];
    let unknownConfigReferences = plans.some(plan => /\$\{|!(?:include|inherit)\b/.test(plan.text))
        || input.queue.plans.some(plan => !aliases.has(normalized(plan.planFile)) && !plans.some(row => sameFile(row.file, normalized(plan.planFile))));
    const configGraph = async (config, owner, visiting = new Set()) => {
        config = (0, PlanCleanup_1.cleanupRelative)(normalized(config));
        const users = configRefs.get(config) || new Set();
        users.add(owner);
        configRefs.set(config, users);
        if (visiting.has(config))
            return;
        visiting.add(config);
        const text = virtual.has(config) ? virtual.get(config) : await fs.readFile(path.join(input.root, config), "utf8").catch((error) => { if (error.code === "ENOENT")
            return ""; throw error; });
        configHashes[config] = removed?.hashes[config] || sha(text);
        unknownConfigReferences ||= /\$\{|!(?:include|inherit)\b/.test(text);
        for (const match of text.matchAll(/^[ \t]*(?:checkpoint(?:_path)?|pretrained(?:_path)?|weights(?:_path)?|resume(?:_from)?|code_backup_ref):[ \t]*["']?([^\r\n"'#]+)["']?[ \t]*(?:#.*)?$/gm)) {
            let asset = normalized(match[1].trim());
            if (/\$\{|!(?:include|inherit)\b/.test(asset))
                continue;
            for (const node of input.nodes) {
                const base = normalized(node.root).replace(/\/$/, "");
                if (base && asset.startsWith(base + "/"))
                    asset = asset.slice(base.length + 1);
            }
            if (asset.startsWith("./") || asset.startsWith("../"))
                asset = path.posix.normalize(path.posix.join(path.posix.dirname(config), asset));
            try {
                externalAssetRefs.push({ owner, path: (0, PlanCleanup_1.cleanupRelative)(asset) });
            }
            catch { }
        }
        // Parse only literal config references. Dynamic inheritance remains protected.
        const refs = [...text.matchAll(/(?:["']|^|[\s\[,])((?:\.?\.?\/)?[A-Za-z0-9_./-]+\.ya?ml)(?:["']|$|[\s\],])/gm)].map(match => match[1]);
        for (const ref of refs) {
            const child = ref.startsWith("configs/") ? ref : path.posix.normalize(path.posix.join(path.posix.dirname(config), ref));
            try {
                await configGraph(child, owner, visiting);
            }
            catch {
                blockers.push({ code: "CONFIG_REFERENCE_UNVERIFIED", detail: config });
            }
        }
    };
    for (const plan of plans) {
        const owner = aliases.has(plan.file) ? planKey : (0, PlanCleanup_1.cleanupDigest)([projectId, plan.file]);
        for (const config of (0, PlanArchive_1.planStaticConfigReferences)(plan.text)) {
            try {
                await configGraph(config, owner);
            }
            catch {
                blockers.push({ code: "CONFIG_REFERENCE_UNVERIFIED", detail: config });
            }
        }
    }
    if (removed)
        for (const [config, owners] of Object.entries(removed.references))
            if (owners.includes(planKey)) {
                await configGraph(config, planKey);
                // Retain old external dependents conservatively; current PLAN scans can add further dependents.
                for (const owner of owners)
                    configRefs.get(config).add(owner);
            }
    for (const [config, owners] of configRefs)
        if (owners.has(planKey)) {
            const shared = owners.size > 1 || !/^(?:configs|tmp\/config)\//.test(config) || /(?:^|\/)(?:base|_base_|defaults)(?:\/|\.)/.test(config);
            add("local", config, "file", "专用配置", ["PLAN 配置引用图", "配置 SHA256=" + configHashes[config]], [...owners], shared ? "共享或基础配置" : unknownConfigReferences ? "动态/缺失历史 PLAN 的配置引用无法证明独占" : undefined);
            candidates.find(row => row.relativePath === config).expectedSha256 = configHashes[config];
        }
    const selectedIds = new Set(runIds);
    const associations = new Set();
    for (const plan of selected) {
        if (plan.projectId && plan.projectId !== projectId) {
            blockers.push({ code: "PROJECT_ID_MISMATCH", detail: plan.id });
            continue;
        }
        for (const job of plan.jobs) {
            if (!terminal.has(job.status) || job.reassignmentPending || job.automaticRetry?.retryAt && !job.automaticRetry.exhausted)
                blockers.push({ code: "ACTIVE_JOB", nodeId: job.workerId, detail: plan.id + ":" + job.index });
            for (const attempt of [job, ...(job.history || [])]) {
                const workerIds = [...new Set([attempt.workerId, ...job.fragmentWorkerIds || [], ...job.mirroredWorkerIds || []].filter(Boolean))];
                workerIds.forEach(id => associations.add(id));
                const output = normalized(attempt.outputDir);
                const conflicts = input.queue.plans.filter(other => !selectedIds.has(other.id)).flatMap(other => other.jobs.flatMap(row => [row, ...(row.history || [])]))
                    .filter(other => ancestor(output, normalized(other.outputDir)) || ancestor(normalized(other.outputDir), output));
                const trusted = Boolean(plan.projectId === projectId && plan.id && plan.revision && job.case && Number.isInteger(job.seed)
                    && Number.isInteger(attempt.attempt) && attempt.commandId && attempt.workerId && output);
                const reason = !trusted ? "旧记录缺少完整项目/job/attempt/命令所有权" : conflicts.length ? "其他 PLAN/job 引用该目录" : undefined;
                const evidence = ["任务登记 workflow=" + plan.id, "PLAN revision=" + plan.revision, "case=" + job.case + " seed=" + job.seed,
                    "fold=" + String(job.fold ?? "未登记"),
                    "attempt=" + attempt.attempt + " commandId=" + (attempt.commandId || "未核实"), "Worker=" + (attempt.workerId || "未核实")];
                for (const worker of workerIds) {
                    add(worker, output, "directory", "作业产物（权重/日志/预测/指标/协议/快照）", evidence, [planKey], reason);
                    if (trusted)
                        candidates.find(row => row.nodeId === worker && row.relativePath === output).expectedOwner = {
                            workflowId: plan.id, commandId: attempt.commandId, workerId: attempt.workerId, outputDir: output,
                            attempt: attempt.attempt, case: job.case, seed: job.seed
                        };
                }
                // A local mirror is owned only when synchronization history declares that exact directory.
                for (const entry of Object.values(input.ledger.entries))
                    if (entry.runId === plan.id && sameFile(normalized(entry.planFile), normalized(plan.planFile))) {
                        const synced = Object.entries(entry.destinations || {}).filter(([, receipt]) => receipt.status === "synced").map(([id]) => id);
                        for (const destination of synced) {
                            associations.add(destination);
                            if ((entry.directoryPaths || []).includes(output))
                                add(destination, output, "directory", "同步副本", [...evidence, "已确认同步 runId=" + entry.runId], [planKey], reason);
                        }
                    }
                for (const [artifact, hash] of Object.entries(job.artifacts || {}))
                    if (/^[a-f0-9]{64}$/i.test(hash)) {
                        const rel = normalized(artifact);
                        if (!ancestor(output, rel))
                            add(job.workerId || "unverified", rel, "file", "登记的独立产物", [...evidence, "产物 SHA256=" + hash], [planKey], "需要独立 manifest 与外部引用证明");
                    }
            }
        }
    }
    const knownCommands = new Set(selected.flatMap(plan => plan.jobs.flatMap(job => [job, ...(job.history || [])]).map(attempt => attempt.commandId).filter(Boolean)));
    for (const snapshot of input.snapshots)
        for (const task of snapshot.tasks || []) {
            const taskPlan = normalized(task.planFile || task.plan_file || "");
            if (![...aliases].some(alias => sameFile(alias, taskPlan)) && !(stable && task.stablePlanId === stable))
                continue;
            if (task.projectId && task.projectId !== projectId || knownCommands.has(task.commandId))
                continue;
            associations.add(snapshot.workerId);
            const output = normalized(task.outputDir || task.output_dir || "");
            if (!output) {
                blockers.push({ code: "TASK_OUTPUT_UNVERIFIED", nodeId: snapshot.workerId, detail: String(task.commandId || "旧任务无精确产物登记") });
                continue;
            }
            add(snapshot.workerId, output, "directory", "旧任务登记产物", ["当前任务登记的精确 PLAN=" + taskPlan,
                "workflow=" + String(task.workflowId || task.planWorkflowId || "未登记"), "commandId=" + String(task.commandId || "未登记")], [planKey], "缺少完整持久队列/版本及独占依赖证据；仅报告");
        }
    for (const entry of Object.values(input.ledger.entries))
        if ([...aliases].some(alias => sameFile(normalized(entry.planFile), alias))) {
            associations.add(entry.sourceWorkerId);
            Object.keys(entry.destinations || {}).forEach(id => associations.add(id));
            for (const remote of [entry.sourceWorkerId, ...Object.keys(entry.destinations || {})]) {
                const localPlan = plans.find(row => sameFile(row.file, normalized(entry.planFile)));
                const confirmed = selectedIds.has(entry.runId) && (remote === entry.sourceWorkerId || entry.destinations[remote]?.status === "synced");
                add(remote, entry.planFile, "file", "远端 PLAN 同步副本", ["同步登记 revision=" + entry.revision + " runId=" + entry.runId, "精确 PLAN 路径与当前文件 SHA256 绑定"], [planKey], confirmed && localPlan ? undefined : "缺少已确认运行或 PLAN 文件哈希证据");
                if (confirmed && localPlan) {
                    candidates.find(row => row.nodeId === remote && row.relativePath === normalized(entry.planFile)).expectedSha256 = planSha(localPlan);
                    for (const config of candidates.filter(row => row.nodeId === "local" && row.category === "专用配置")) {
                        add(remote, config.relativePath, "file", "远端配置同步副本", ["已确认同步关联 runId=" + entry.runId, ...config.evidence], config.owners, config.protectedReason);
                        candidates.find(row => row.nodeId === remote && row.relativePath === config.relativePath).expectedSha256 = config.expectedSha256;
                    }
                }
                for (const artifact of entry.artifactPaths || [])
                    if (!candidates.some(row => row.nodeId === remote && ancestor(row.relativePath, artifact)))
                        add(remote, artifact, "file", "结果索引/同步副本", ["同步登记 runId=" + entry.runId], [planKey], "正式/历史结果或缺少独占 manifest");
            }
        }
    for (const deferred of input.queue.deferred || [])
        if ([...aliases].some(alias => sameFile(normalized(deferred.planFile), alias)) && ["pending", "processing", "blocked"].includes(deferred.status))
            blockers.push({ code: "ACTIVE_DEFERRED_PLAN", detail: deferred.id });
    for (const recovery of input.queue.failedAttemptRecoveries || [])
        if (selectedIds.has(recovery.plan.id) && recovery.status !== "completed")
            blockers.push({ code: "ACTIVE_ATTEMPT_RECOVERY", nodeId: recovery.job.workerId, detail: recovery.id });
    for (const operation of input.operations || [])
        if (["running", "queued", "pending", "accepted"].includes(operation.status))
            blockers.push({ code: "ACTIVE_OPERATION", detail: String(operation.id || operation.opId || operation.kind || "操作") });
    for (const id of associations)
        if (!input.nodes.some(node => node.id === id)) {
            scope.nodes.push({ id, kind: "remote", root: "", error: "历史关联节点缺少当前主机/端口/项目根配置" });
        }
    for (const node of scope.nodes.filter(node => node.kind === "remote")) {
        const snapshot = input.snapshots.find(row => row.workerId === node.id);
        if (!snapshot || snapshot.error || !Number.isFinite(Date.parse(snapshot.generatedAt || "")) || Date.now() - Date.parse(snapshot.generatedAt || "") > 180000) {
            node.error ||= snapshot?.error || "当前任务/队列证据不可达或过期";
            blockers.push({ code: "OFFLINE_NODE", nodeId: node.id, detail: node.error });
        }
        else {
            if ((snapshot.tasks || []).some(task => !terminal.has(String(task.status).toLowerCase())))
                blockers.push({ code: "ACTIVE_NODE_TASK", nodeId: node.id, detail: "该项目节点存在运行/排队/待核实任务" });
            for (const candidate of candidates.filter(row => row.nodeId === node.id)) {
                const conflicts = (snapshot.tasks || []).filter(task => {
                    const output = normalized(task.outputDir || task.output_dir || "");
                    return output && (ancestor(candidate.relativePath, output) || ancestor(output, candidate.relativePath))
                        && task.commandId !== candidate.expectedOwner?.commandId && !runIds.includes(String(task.workflowId || task.planWorkflowId || ""));
                });
                if (conflicts.length)
                    candidate.dependencies.push("当前节点其他命令登记引用该精确目录");
            }
        }
    }
    // Published indexes and their sources are paper/formal evidence, never rewrite merged tables here.
    const protectedPaths = new Set();
    const visit = (value, depth = 0) => {
        if (depth > 20)
            return;
        if (typeof value === "string") {
            const rel = normalized(value);
            if (rel.includes("/") && !path.isAbsolute(value)) {
                try {
                    protectedPaths.add((0, PlanCleanup_1.cleanupRelative)(rel));
                }
                catch { }
            }
            for (const node of input.nodes) {
                const base = normalized(node.root).replace(/\/$/, "");
                if (base && rel.startsWith(base + "/")) {
                    try {
                        protectedPaths.add((0, PlanCleanup_1.cleanupRelative)(rel.slice(base.length + 1)));
                    }
                    catch { }
                }
            }
        }
        else if (Array.isArray(value))
            value.forEach(item => visit(item, depth + 1));
        else if (value && typeof value === "object")
            Object.values(value).forEach(item => visit(item, depth + 1));
    };
    visit(input.registry);
    if (input.registry)
        add("local", "simple_cluster/results/project_table_registry.json", "file", "插件结果索引", ["项目结果注册表"], [planKey], "跨 PLAN 共享正式/历史结果索引");
    for (const rel of protectedPaths) {
        if (/^(?:experiments\/results|tmp\/result|simple_cluster\/results)\//.test(rel))
            add("local", rel, "file", "专用结果/原始 sidecar/结果索引", ["项目结果索引的精确路径引用"], [planKey], "已有正式/历史或共享结果受保护");
    }
    for (const candidate of candidates)
        for (const ref of protectedPaths)
            if (ancestor(candidate.relativePath, ref))
                candidate.dependencies.push("正式/历史结果引用 " + ref);
    for (const candidate of candidates)
        for (const ref of externalAssetRefs)
            if (ref.owner !== planKey && ancestor(candidate.relativePath, ref.path))
                candidate.dependencies.push("其他 PLAN 配置引用 checkpoint/权重/代码备份 " + ref.path);
    candidates.push(...input.extraEvidence || []);
    candidates.forEach(candidate => { candidate.owners.sort(); candidate.dependencies.sort(); });
    candidates.sort((a, b) => Number(a.category === "PLAN 文件") - Number(b.category === "PLAN 文件") || a.nodeId.localeCompare(b.nodeId) || a.relativePath.localeCompare(b.relativePath));
    scope.nodes = scope.nodes.filter(node => node.id === "local" || associations.has(node.id));
    scope.blockers = blockers.filter(row => !row.nodeId || scope.nodes.some(node => node.id === row.nodeId));
    scope.references = Object.fromEntries([...configRefs].map(([config, owners]) => [config, [...owners]]));
    // Exclude lifecycle markers and wall-clock freshness from the revision, retain every ownership/status field.
    scope.revision = (0, PlanCleanup_1.cleanupDigest)({ projectId, file, planHash: scope.planHash, plans: plans.map(row => [row.file, planSha(row)]).sort(), configHashes: Object.fromEntries(Object.entries(configHashes).sort()),
        queue: input.queue.plans.map(plan => ({ ...plan, cleanup: undefined })), removedMetadata: removed, deferred: input.queue.deferred,
        recoveries: input.queue.failedAttemptRecoveries, ledger: input.ledger, nodes: scope.nodes.map(node => ({ ...node, error: undefined })), candidates });
    return scope;
}
