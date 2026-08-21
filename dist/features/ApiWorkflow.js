"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLOW_STEPS = void 0;
exports.defaultFlowState = defaultFlowState;
exports.normalizeFlowState = normalizeFlowState;
exports.advanceFlowStep = advanceFlowStep;
exports.nextFlowStep = nextFlowStep;
exports.filterPlans = filterPlans;
exports.selectWorkflowPlan = selectWorkflowPlan;
exports.remoteProjectWorkDir = remoteProjectWorkDir;
exports.isNwpu3Server = isNwpu3Server;
exports.normalizeApiRemotePath = normalizeApiRemotePath;
exports.resolveApiRemoteRoot = resolveApiRemoteRoot;
exports.structuredMissingInventory = structuredMissingInventory;
exports.serverTestRow = serverTestRow;
exports.formatServerTarget = formatServerTarget;
exports.FLOW_STEPS = [
    "select_servers",
    "select_mode",
    "prepare_agents",
    "validate_plan",
    "dry_run",
    "upload",
    "run",
    "parse_results",
    "quality_gate",
    "statistics",
    "claims_export",
];
function defaultFlowState() {
    return {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        currentStep: exports.FLOW_STEPS[0],
        steps: Object.fromEntries(exports.FLOW_STEPS.map((step) => [step, {}])),
    };
}
function normalizeFlowState(input) {
    const fallback = defaultFlowState();
    if (!input || typeof input !== "object" || Array.isArray(input))
        return fallback;
    const raw = input;
    const rawSteps = raw.steps && typeof raw.steps === "object" && !Array.isArray(raw.steps)
        ? raw.steps
        : {};
    const steps = Object.fromEntries(exports.FLOW_STEPS.map((step) => {
        const value = rawSteps[step];
        return [step, value && typeof value === "object" && !Array.isArray(value) ? value : {}];
    }));
    const firstIncomplete = exports.FLOW_STEPS.find((step) => !steps[step].completed && !steps[step].blocked) || exports.FLOW_STEPS[exports.FLOW_STEPS.length - 1];
    const currentStep = exports.FLOW_STEPS.find((step) => step === raw.currentStep) || firstIncomplete;
    return {
        schemaVersion: 1,
        updatedAt: String(raw.updatedAt || fallback.updatedAt || ""),
        currentStep,
        steps,
    };
}
function advanceFlowStep(state, step, patch = {}) {
    const current = normalizeFlowState(state);
    const name = exports.FLOW_STEPS.find((item) => item === String(step || "").trim());
    if (!name)
        throw new Error(`未知流程步骤：${String(step || "")}。可用步骤：${exports.FLOW_STEPS.join(", ")}`);
    const nextRecord = {
        ...current.steps[name],
        ...patch,
        appliedAt: patch.appliedAt || new Date().toISOString(),
    };
    const nextSteps = { ...current.steps, [name]: nextRecord };
    const firstIncomplete = exports.FLOW_STEPS.find((item) => !nextSteps[item].completed && !nextSteps[item].blocked) || exports.FLOW_STEPS[exports.FLOW_STEPS.length - 1];
    return {
        schemaVersion: current.schemaVersion,
        updatedAt: new Date().toISOString(),
        currentStep: firstIncomplete,
        steps: nextSteps,
    };
}
function nextFlowStep(state) {
    const current = normalizeFlowState(state);
    const blocked = exports.FLOW_STEPS.find((item) => current.steps[item].blocked);
    if (blocked)
        return blocked;
    const incomplete = exports.FLOW_STEPS.find((item) => !current.steps[item].completed);
    if (incomplete)
        return incomplete;
    return exports.FLOW_STEPS[exports.FLOW_STEPS.length - 1];
}
function filterPlans(plans, filter = {}) {
    const list = Array.isArray(plans) ? plans.filter((item) => item && typeof item === "object") : [];
    const status = new Set(Array.isArray(filter.status)
        ? filter.status.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean)
        : String(filter.status || "").trim().toLowerCase() ? [String(filter.status || "").trim().toLowerCase()] : []);
    const query = String(filter.query || "").trim().toLowerCase();
    const planFile = String(filter.planFile || "").trim();
    const planId = String(filter.planId || "").trim();
    const includeArchived = filter.archived === true;
    const candidates = list.filter((item) => {
        if (!includeArchived && item.archived === true)
            return false;
        const file = String(item.planFile || item.file || item.planId || "");
        const id = String(item.planId || item.planFile || file || "");
        if (planFile && file !== planFile)
            return false;
        if (planId && id !== planId && file !== planId)
            return false;
        if (status.size) {
            const itemStatus = String(item.status || item.state || "").trim().toLowerCase();
            if (!status.has(itemStatus))
                return false;
        }
        if (query) {
            const haystack = [String(item.name || ""), file, id, String(item.suite || ""), String(item.description || "")].join(" ").toLowerCase();
            if (!haystack.includes(query))
                return false;
        }
        return true;
    });
    const uniqueFiles = new Set(candidates.map((item) => String(item.planFile || item.file || item.planId || "").trim()).filter(Boolean));
    const needsChoice = filter.needsChoice === true
        ? uniqueFiles.size > 1
        : candidates.some((item) => item.needsChoice === true || item.needsSelection === true || item.selectRequired === true);
    const limit = Math.max(0, Number(filter.limit) || 0);
    const output = limit > 0 ? candidates.slice(0, Math.floor(limit)) : candidates;
    return { plans: output, count: candidates.length, total: list.length, needsChoice };
}
function planIdentityValues(plan) {
    return [plan.planFile, plan.file, plan.planId]
        .map((value) => String(value || "").trim())
        .filter(Boolean);
}
function selectWorkflowPlan(plans, selection = {}) {
    const list = Array.isArray(plans) ? plans.filter((item) => item && typeof item === "object") : [];
    const requestedFile = String(selection.planFile || selection.file || "").trim();
    const requestedId = String(selection.planId || "").trim();
    let plan;
    if (requestedFile) {
        plan = list.find((item) => planIdentityValues(item).includes(requestedFile));
    }
    else if (requestedId) {
        plan = list.find((item) => planIdentityValues(item).includes(requestedId));
    }
    else if (list.length === 1) {
        plan = list[0];
    }
    const missing = [];
    if (!plan) {
        if (list.length > 1) {
            missing.push({
                step: "validate_plan",
                reason: "需要选择 PLAN",
                options: ["plans.filter"],
                requiredConfirm: [],
            });
        }
        else if (requestedFile || requestedId) {
            missing.push({
                step: "validate_plan",
                reason: `未找到指定 PLAN：${requestedFile || requestedId}`,
                options: ["plans.filter"],
                requiredConfirm: [],
            });
        }
        else {
            missing.push({
                step: "validate_plan",
                reason: "未找到可自动选择的 PLAN",
                options: ["plans.list", "plans.filter"],
                requiredConfirm: [],
            });
        }
    }
    return {
        plan,
        plans: list,
        count: list.length,
        total: list.length,
        needsChoice: !plan && list.length > 1,
        missing,
    };
}
function remoteProjectWorkDir(remoteRoot, projectName) {
    const root = normalizeApiRemotePath(remoteRoot);
    const name = String(projectName || "").trim();
    return root && name && name !== "." && name !== ".." ? `${root}/${name}` : undefined;
}
function isNwpu3Server(server) {
    const item = server && typeof server === "object" ? server : {};
    const id = String(item.id || item.serverId || "");
    const label = String(item.label || item.name || item.displayName || "");
    const host = String(item.host || item.sshHost || item.resolvedHost || "");
    return [id, label, host].some((value) => /(^|[^a-z0-9])(nwpu3|nwpu213|npu213)([^a-z0-9]|$)/i.test(value));
}
function normalizeApiRemotePath(value) {
    const text = String(value || "").trim().replace(/\\/g, "/").replace(/\/+/g, "/");
    if (!text || text === "/" || text === "." || text === "..")
        return undefined;
    return text.replace(/\/+$/, "");
}
function resolveApiRemoteRoot(value, server = {}) {
    const root = normalizeApiRemotePath(value);
    if (!root)
        return undefined;
    const lower = root.toLowerCase();
    if (lower === "/root/disk1/qgking/zlk" || lower.startsWith("/root/disk1/qgking/zlk/")) {
        throw new Error("NWPU3 已固定使用 /data/qgking/zlk，禁止使用 /root/disk1/qgking/zlk。");
    }
    if (lower.split("/").includes("zlk_agent")) {
        throw new Error("项目父目录不能包含 zlk_agent；插件会自动管理同级 Agent runtime。");
    }
    if (isNwpu3Server(server))
        return "/data/qgking/zlk";
    return root;
}
function structuredMissingInventory(options) {
    const missing = [];
    const workspace = String(options.workspace || "").trim();
    const setup = options.setup && typeof options.setup === "object" ? options.setup : {};
    const topology = options.topology && typeof options.topology === "object" ? options.topology : {};
    const simpleSftp = options.simpleSftp && typeof options.simpleSftp === "object" ? options.simpleSftp : {};
    const project = options.project && typeof options.project === "object" ? options.project : {};
    const plan = options.plan && typeof options.plan === "object" ? options.plan : {};
    const workers = Array.isArray(setup.workerTunnels) ? setup.workerTunnels.filter((worker) => worker && typeof worker === "object" && worker.enabled !== false) : [];
    const hubConfigured = Boolean(String(setup.savedSessionPath || "").trim() && String(setup.agentProjectDir || "").trim());
    const requirePlan = options.requirePlan !== false;
    if (!workspace) {
        missing.push({
            step: "select_servers",
            reason: "未打开工作区，无法确定本机上传路径和远端项目名。",
            options: ["workspace"],
            requiredConfirm: [],
        });
    }
    const workerCount = new Set(workers.map((worker) => String(worker.id || "").trim()).filter(Boolean)).size;
    const mode = String(topology.mode || topology.configuredMode || "").trim();
    if (workerCount < 1 || (String(topology.hubAllowed || topology.mode || "") === "hub_worker" && !hubConfigured)) {
        missing.push({
            step: "select_servers",
            reason: hubConfigured
                ? "需要至少一台启用的 Worker，当前 0 台。"
                : "需要先配置 Hub 会话和项目父目录，或至少一台启用的 Worker。",
            options: hubConfigured ? ["server.addWorker"] : ["config.server", "server.addWorker"],
            requiredConfirm: ["confirm"],
        });
    }
    const valid = topology.valid !== false && Boolean(mode);
    if (!valid) {
        const issueText = Array.isArray(topology.issues) && topology.issues.length
            ? topology.issues.join("；")
            : "需要在单 Worker、仅多 Worker 或 Hub 可用模式中明确选择。";
        missing.push({
            step: "select_mode",
            reason: issueText,
            options: hubConfigured ? ["single_worker", "worker_pool", "hub_worker"] : ["single_worker", "worker_pool"],
            requiredConfirm: ["confirm"],
        });
    }
    if (simpleSftp.ready !== true) {
        missing.push({
            step: "prepare_agents",
            reason: String(simpleSftp.message || "配套 SimpleSFTP 未就绪，无法完成正式上传或运行。"),
            options: ["install_simple_sftp", "reload_vscode"],
            requiredConfirm: ["confirm"],
        });
    }
    else {
        const setupMissing = [];
        if (mode === "hub_worker" && !hubConfigured)
            setupMissing.push("Hub Xshell 会话和项目父目录");
        for (const worker of workers) {
            if (!String(worker.savedSessionPath || "").trim())
                setupMissing.push(`${String(worker.displayName || worker.id || "Worker")} Xshell 会话`);
            if (!String(worker.agentProjectDir || "").trim())
                setupMissing.push(`${String(worker.displayName || worker.id || "Worker")} 项目父目录`);
        }
        if (setupMissing.length) {
            missing.push({
                step: "prepare_agents",
                reason: `服务器配置不完整：${setupMissing.join("、")}。`,
                options: ["config.set", "server.addWorker"],
                requiredConfirm: ["confirm"],
            });
        }
    }
    if (requirePlan) {
        const planFile = String(plan.planFile || plan.file || plan.planId || "").trim();
        if (!planFile) {
            missing.push({
                step: "validate_plan",
                reason: "未选择需要验证的 Plan，且项目内没有可自动确定的唯一 Plan。",
                options: ["plans.list", "plans.filter"],
                requiredConfirm: ["confirm"],
            });
        }
        else {
            const diagnosticsRows = Array.isArray(project.outputGateDiagnosticsRows) ? project.outputGateDiagnosticsRows : [];
            const missingRows = Array.isArray(project.outputGateMissing) ? project.outputGateMissing : diagnosticsRows.filter((row) => row && row.ok === false);
            if (missingRows.length) {
                missing.push({
                    step: "validate_plan",
                    reason: `Plan 或项目输出契约未通过：${missingRows.map((row) => String(row.label || row.step || "") || "输出契约").join("、")}。`,
                    options: ["generateOutputAdapter", "config.set"],
                    requiredConfirm: ["confirm"],
                });
            }
        }
    }
    return missing;
}
function serverTestRow(target, probe, options = {}) {
    const id = String(target.id || options.id || "");
    const statusMap = new Map([
        ["ok", "ok"],
        ["agent_ok", "ok"],
        ["ready", "ok"],
        ["timeout", "timeout"],
        ["failed", "failed"],
        ["error", "failed"],
    ]);
    const probeStatus = String(probe?.status || probe?.state || options.status || "unknown").toLowerCase().trim();
    const status = statusMap.get(probeStatus) || (probeStatus ? probeStatus : "unknown");
    return {
        serverId: id,
        host: String(target.host || options.host || ""),
        port: Number(target.port || options.port || 22),
        user: String(target.user || target.username || target.userName || options.user || ""),
        remoteRoot: String(target.remotePath || target.remoteRoot || options.remoteRoot || ""),
        status,
        message: String(probe?.message || probe?.suggestion || options.message || (status === "ok" ? "检测通过" : "未执行检测或端点不可达")),
        nextAction: status === "ok"
            ? "continue"
            : status === "timeout"
                ? "check_xshell_tunnel"
                : status === "unknown"
                    ? "startAllConnections"
                    : "inspect_server",
    };
}
function formatServerTarget(target) {
    const user = String(target.user || target.username || target.userName || "");
    const host = String(target.host || "");
    const port = Number(target.port || 22);
    const root = String(target.remotePath || target.remoteRoot || "");
    return `${user ? `${user}@` : ""}${host}:${port}${root ? `:${root}` : ""}`;
}
