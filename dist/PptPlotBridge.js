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
exports.PptPlotBridge = void 0;
exports.defaultPptAutomationReadiness = defaultPptAutomationReadiness;
exports.pptAutomationReadinessFromError = pptAutomationReadinessFromError;
exports.ensureLocalPlottingContract = ensureLocalPlottingContract;
exports.buildPptPlotRequest = buildPptPlotRequest;
// @ts-nocheck
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = __importStar(require("child_process"));
const PlottingContract_1 = __importStar(require("./features/PlottingContract"));
const activePlotRequests = new Set();
let powerPointLaunchInFlight;
let lastPowerPointLaunchAt = 0;
const PPT_SOURCE_FILE_MAX_BYTES = 2 * 1024 * 1024;
const PPT_LIGHTWEIGHT_SOURCE_EXTENSIONS = new Set([".json", ".csv", ".md", ".tex"]);
const PPT_FINAL_STATISTICS_PATH = "zlk_cluster/results/statistics.json";
const PPT_FINAL_PAPER_TABLE_PATH = "paper/tables/zlk_results_table.csv";
const PPT_BLOCKING_READINESS_STATES = new Set(["incompatible", "token_missing", "token_invalid"]);
const PPT_LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost"]);
const PPT_NON_RAW_SOURCE_PATHS = new Set([
    PlottingContract_1.PLOTTING_CONTRACT_JSON_PATH,
    PPT_FINAL_STATISTICS_PATH,
    PPT_FINAL_PAPER_TABLE_PATH,
    "paper/tables/zlk_results_table.md",
    "zlk_cluster/results/case_level_index.json",
    "zlk_cluster/datasets/profile.json",
].map((item) => item.toLowerCase()));
class PptPlotBridge {
    fetchImpl;
    localAppData;
    requestIdFactory;
    launchPowerPoint;
    sleepImpl;
    healthTimeoutMs;
    healthPollMs;
    requestTimeoutMs;
    postTimeoutMs;
    launchCooldownMs;
    constructor(deps = {}) {
        this.fetchImpl = deps.fetch || fetch;
        this.localAppData = deps.localAppData || process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
        this.requestIdFactory = deps.requestIdFactory || defaultRequestId;
        this.launchPowerPoint = deps.launchPowerPoint || launchPowerPoint;
        this.sleepImpl = deps.sleep || sleep;
        this.healthTimeoutMs = deps.healthTimeoutMs ?? 30_000;
        this.healthPollMs = deps.healthPollMs ?? 750;
        this.requestTimeoutMs = deps.requestTimeoutMs ?? 5_000;
        this.postTimeoutMs = deps.postTimeoutMs ?? 30_000;
        this.launchCooldownMs = deps.launchCooldownMs ?? 10_000;
    }
    async plot(input) {
        const request = await buildPptPlotRequest(input, this.requestIdFactory());
        const requestDir = await ensureAuditDir(request.projectRoot);
        const requestPath = path.join(requestDir, `${request.requestId}.json`);
        const responsePath = path.join(requestDir, `${request.requestId}.response.json`);
        await writeJson(requestPath, request);
        const admissionKey = pptPlotAdmissionKey(request);
        if (activePlotRequests.has(admissionKey)) {
            const failure = { ok: false, error: "已有相同 PPT 绘图请求正在执行，请等待当前请求完成后再试。", requestId: request.requestId };
            await writeJson(responsePath, failure);
            throw pptAutomationError("busy", `${failure.error}；审计文件：${toProjectRelative(request.projectRoot, requestPath)}，响应：${toProjectRelative(request.projectRoot, responsePath)}`);
        }
        activePlotRequests.add(admissionKey);
        try {
            const automation = await this.ensureAutomationReady(request.target.presentationPath);
            const response = await this.postPlotRequest(automation, request);
            await writeJson(responsePath, response);
            return { requestId: request.requestId, requestPath, responsePath, request, response };
        }
        catch (error) {
            const failure = { ok: false, error: errorMessage(error), requestId: request.requestId };
            await writeJson(responsePath, failure);
            throw pptAutomationError(pptAutomationErrorState(error), `${errorMessage(error)}；审计文件：${toProjectRelative(request.projectRoot, requestPath)}，响应：${toProjectRelative(request.projectRoot, responsePath)}`);
        }
        finally {
            activePlotRequests.delete(admissionKey);
        }
    }
    async inspectAutomation() {
        return (await this.probeAutomation()).readiness;
    }
    async prepareAutomation(presentationPath) {
        const config = await this.ensureAutomationReady(presentationPath);
        return pptAutomationReadiness("ready", "PPT automation schemaVersion=1 已就绪。", { schemaVersion: 1, endpoint: config.baseUrl });
    }
    async ensureAutomationReady(presentationPath) {
        const first = await this.probeAutomation();
        if (first.readiness.ready)
            return first.config;
        if (PPT_BLOCKING_READINESS_STATES.has(first.readiness.state))
            throw pptAutomationError(first.readiness.state, first.readiness.message);
        const targetPresentationPath = cleanOptional(presentationPath);
        await this.launchPowerPointOnce(targetPresentationPath || undefined);
        const started = Date.now();
        let lastReadiness = first.readiness;
        while (Date.now() - started <= this.healthTimeoutMs) {
            const current = await this.probeAutomation();
            if (current.readiness.ready)
                return current.config;
            lastReadiness = current.readiness;
            if (PPT_BLOCKING_READINESS_STATES.has(current.readiness.state))
                throw pptAutomationError(current.readiness.state, current.readiness.message);
            await this.sleepImpl(this.healthPollMs);
        }
        throw pptAutomationError("not_running", `PPT automation 未就绪：${lastReadiness.message} 请确认 PPT 插件已安装并重新打开 PowerPoint。`);
    }
    async launchPowerPointOnce(presentationPath) {
        const now = Date.now();
        if (powerPointLaunchInFlight) {
            await powerPointLaunchInFlight;
            return;
        }
        if (now - lastPowerPointLaunchAt < this.launchCooldownMs)
            return;
        lastPowerPointLaunchAt = now;
        powerPointLaunchInFlight = Promise.resolve(this.launchPowerPoint(presentationPath)).finally(() => {
            powerPointLaunchInFlight = undefined;
        });
        await powerPointLaunchInFlight;
    }
    async readAutomationConfig() {
        const dir = path.join(this.localAppData, "RoughPptAddin");
        const configPath = path.join(dir, "automation.json");
        const tokenPath = path.join(dir, "automation.token");
        let raw;
        try {
            raw = JSON.parse(await fs.readFile(configPath, "utf8"));
        }
        catch (error) {
            if (error?.code === "ENOENT")
                throw error;
            throw pptAutomationError("incompatible", `PPT automation.json 无法解析：${errorMessage(error)} 请更新或重新安装 PPT 插件。`);
        }
        const schemaVersion = Number(raw.schemaVersion);
        if (schemaVersion !== 1)
            throw pptAutomationError("incompatible", `PPT automation discovery schemaVersion=${schemaVersion}，SimpleExperiment 仅支持 schemaVersion=1。请更新 PPT 插件。`);
        let baseUrl;
        try {
            baseUrl = automationBaseUrl(raw);
        }
        catch (error) {
            throw pptAutomationError("incompatible", `PPT automation discovery 无效：${errorMessage(error)} 请更新或重新安装 PPT 插件。`);
        }
        const token = String(await fs.readFile(tokenPath, "utf8").catch(() => "")).trim();
        if (!token)
            throw pptAutomationError("token_missing", "PPT automation.token 缺失或为空。请完全退出并重新打开 PowerPoint；仍失败时更新 PPT 插件。");
        return { baseUrl, token, schemaVersion };
    }
    async probeAutomation(knownConfig) {
        let config = knownConfig;
        if (!config) {
            try {
                config = await this.readAutomationConfig();
            }
            catch (error) {
                const state = pptAutomationErrorState(error);
                if (state !== "unknown")
                    return { readiness: pptAutomationReadinessFromError(error) };
                return { readiness: pptAutomationReadiness("not_running", "未找到可用的 PPT automation discovery。请确认 PPT 插件已安装并打开 PowerPoint。") };
            }
        }
        try {
            const response = await this.fetchTextWithTimeout(`${config.baseUrl}/health`, {
                method: "GET",
                headers: automationHeaders(config, false),
            }, this.requestTimeoutMs, "PPT automation health");
            const payload = parseJsonObject(response.text);
            if (response.status === 401)
                return { config, readiness: pptAutomationReadiness("token_invalid", "PPT automation 令牌已失效。请完全退出并重新打开 PowerPoint。") };
            if (!response.ok)
                return { config, readiness: pptAutomationReadiness("not_running", `PPT automation health 返回 HTTP ${response.status}。请重新打开 PowerPoint。`) };
            const schemaVersion = Number(payload.schemaVersion);
            if (payload.ok !== true || schemaVersion !== 1)
                return { config, readiness: pptAutomationReadiness("incompatible", `PPT automation health 契约不兼容：ok=${String(payload.ok)}，schemaVersion=${String(payload.schemaVersion ?? "缺失")}。请更新 PPT 插件。`) };
            return { config, readiness: pptAutomationReadiness("ready", "PPT automation schemaVersion=1 已就绪。", { schemaVersion, endpoint: config.baseUrl }) };
        }
        catch (error) {
            return { config, readiness: pptAutomationReadiness("not_running", `PPT automation 未响应：${errorMessage(error)} 请打开或重新启动 PowerPoint。`) };
        }
    }
    async postPlotRequest(config, request) {
        const response = await this.fetchTextWithTimeout(`${config.baseUrl}/api/zlk-cluster/plot`, {
            method: "POST",
            headers: automationHeaders(config, true),
            body: JSON.stringify(request),
        }, this.postTimeoutMs, "PPT automation 绘图请求");
        const text = response.text;
        const payload = parseJsonObject(text);
        if (!response.ok) {
            const remoteMessage = cleanOptional(payload.error) || text.slice(0, 500);
            if (response.status === 409)
                throw pptAutomationError("busy", remoteMessage || "PPT 插件正在处理另一个绘图请求，请等待完成后重试。");
            if (response.status === 401)
                throw pptAutomationError("token_invalid", "PPT automation 令牌已失效。请完全退出并重新打开 PowerPoint。");
            if ([404, 405].includes(response.status))
                throw pptAutomationError("incompatible", `PPT automation 接口不兼容（HTTP ${response.status}）。请更新 PPT 插件。`);
            throw pptAutomationError("unavailable", `PPT automation HTTP ${response.status}: ${remoteMessage}`);
        }
        if (payload.ok !== true)
            throw pptAutomationError("incompatible", "PPT automation 响应缺少 ok=true。请更新 PPT 插件。");
        return payload;
    }
    async fetchTextWithTimeout(url, init, timeoutMs, label) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
        timer.unref?.();
        try {
            const response = await this.fetchImpl(url, { ...init, signal: controller.signal });
            return { ok: response.ok, status: response.status, text: await response.text() };
        }
        catch (error) {
            if (isAbortError(error))
                throw new Error(`${label} 超时（${timeoutMs}ms）。`);
            throw error;
        }
        finally {
            clearTimeout(timer);
        }
    }
}
exports.PptPlotBridge = PptPlotBridge;
function defaultPptAutomationReadiness() {
    return pptAutomationReadiness("unknown", "尚未检测 PPT automation；不影响实验运行，仅影响结果绘图。", { actionCommand: "refreshPptAutomation", actionLabel: "检测 PPT 插件" });
}
function pptAutomationReadinessFromError(error) {
    const state = pptAutomationErrorState(error);
    return pptAutomationReadiness(state === "unknown" ? "unavailable" : state, errorMessage(error));
}
function pptAutomationReadiness(state, message, details = {}) {
    const actions = {
        unknown: ["refreshPptAutomation", "检测 PPT 插件"],
        not_running: ["startPptAutomation", "启动 PowerPoint"],
        busy: ["refreshPptAutomation", "等待后重新检测"],
        token_missing: ["openPptAutomationGuide", "查看修复说明"],
        token_invalid: ["openPptAutomationGuide", "查看修复说明"],
        incompatible: ["openPptAutomationGuide", "查看升级说明"],
        unavailable: ["refreshPptAutomation", "重新检测"],
    };
    const action = actions[state] || [];
    return {
        state,
        ready: state === "ready",
        message: String(message || "PPT automation 状态未知。"),
        actionCommand: details.actionCommand || action[0] || "",
        actionLabel: details.actionLabel || action[1] || "",
        schemaVersion: details.schemaVersion,
        endpoint: details.endpoint || "",
    };
}
function pptAutomationError(state, message) {
    const error = new Error(message);
    error.pptAutomationState = state;
    return error;
}
function pptAutomationErrorState(error) {
    return String(error?.pptAutomationState || "unknown");
}
function parseJsonObject(text) {
    if (!String(text || "").trim())
        return {};
    try {
        const parsed = JSON.parse(text);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    }
    catch {
        return {};
    }
}
async function ensureLocalPlottingContract(projectRoot, planFile = "") {
    const root = path.resolve(projectRoot);
    const plan = String(planFile || "").trim();
    const preferredRel = (0, PlottingContract_1.plottingContractJsonPath)(plan);
    const preferredPath = safeProjectPath(root, preferredRel);
    if (await pathExists(preferredPath))
        return toProjectRelative(root, preferredPath);
    const fallbackPath = safeProjectPath(root, PlottingContract_1.PLOTTING_CONTRACT_JSON_PATH);
    if (!plan && await pathExists(fallbackPath))
        return toProjectRelative(root, fallbackPath);
    await fs.mkdir(path.dirname(preferredPath), { recursive: true });
    const contract = (0, PlottingContract_1.buildPlottingOutputContract)(new Date().toISOString(), plan);
    await writeJson(preferredPath, contract);
    if (plan) {
        await fs.mkdir(path.dirname(fallbackPath), { recursive: true });
        await writeJson(fallbackPath, contract);
    }
    const mdRel = (0, PlottingContract_1.plottingContractMarkdownPath)(plan);
    const mdPath = safeProjectPath(root, mdRel);
    if (!await pathExists(mdPath)) {
        await fs.mkdir(path.dirname(mdPath), { recursive: true });
        await fs.writeFile(mdPath, (0, PlottingContract_1.plottingContractMarkdown)(contract), "utf8");
    }
    return toProjectRelative(root, preferredPath);
}
async function buildPptPlotRequest(input, requestId = defaultRequestId()) {
    const projectRoot = path.resolve(input.projectRoot);
    const planFile = cleanOptional(input.planFile) || "";
    const plottingContractPath = normalizeProjectRelativePath(input.plottingContractPath || (0, PlottingContract_1.plottingContractJsonPath)(planFile) || PlottingContract_1.PLOTTING_CONTRACT_JSON_PATH, projectRoot);
    const sourceCandidates = await finalAnalysisPlotSources(projectRoot, input.sourcePaths?.length ? input.sourcePaths : [plottingContractPath], planFile);
    const sourcePaths = await resolvePptSourcePaths(projectRoot, sourceCandidates);
    const request = {
        schemaVersion: 1,
        requestId,
        projectRoot,
        sourcePaths: sourcePaths.paths,
        plottingContractPath,
        selectedResultId: cleanOptional(input.selectedResultId),
        runKey: cleanOptional(input.runKey),
        archiveKey: cleanOptional(input.archiveKey),
        chartType: cleanOptional(input.chartType) || "auto",
        target: {
            presentationPath: cleanOptional(input.presentationPath),
            createIfMissing: true,
            slideMode: "append",
        },
        styleMode: cleanOptional(input.styleMode) || "activePpt",
        sourceLabel: cleanOptional(input.sourceLabel) || "SimpleExperiment 结果",
        markdownSummary: sourcePaths.markdownSummary || null,
    };
    return request;
}
async function finalAnalysisPlotSources(projectRoot, sourcePaths, planFile = "") {
    const out = [];
    for (const raw of sourcePaths) {
        const rel = normalizeProjectRelativePath(raw, projectRoot);
        if (!rel)
            continue;
        if (isStatisticsPlotSource(rel) && !await archivedStatisticsSource(projectRoot, rel)) {
            throw new Error(`统计文件不是有效的已归档结果统计：${rel}。请重新运行“统计”。`);
        }
        if (!isRawSingleRunPlotSource(rel)) {
            out.push(rel);
            continue;
        }
        const finalSource = await firstExistingFinalPlotSource(projectRoot, planFile);
        if (!finalSource) {
            throw new Error(`SCI 绘图需要先生成聚合统计，不能直接使用单个 seed 原始结果：${rel}。请先运行“统计”或“导出论文表格”。`);
        }
        out.push(finalSource);
    }
    return Array.from(new Set(out));
}
async function resolvePptSourcePaths(projectRoot, sourcePaths) {
    const out = [];
    let markdownSummary;
    for (const raw of sourcePaths) {
        const rel = normalizeProjectRelativePath(raw, projectRoot);
        if (!rel)
            continue;
        const full = safeProjectPath(projectRoot, rel);
        await assertPptLightweightSource(full, rel);
        if (/\.md$/i.test(rel)) {
            const jsonRel = rel.replace(/\.md$/i, ".json");
            const jsonFull = safeProjectPath(projectRoot, jsonRel);
            if (await pathExists(jsonFull)) {
                await assertPptLightweightSource(jsonFull, jsonRel);
                out.push(jsonRel);
            }
            else if (!markdownSummary) {
                markdownSummary = { path: rel, text: (await fs.readFile(full, "utf8")).slice(0, 24_000) };
                out.push(rel);
            }
            continue;
        }
        out.push(rel);
    }
    const unique = Array.from(new Set(out));
    if (!unique.length)
        throw new Error("没有可用于 PPT 绘图的轻量结果文件。");
    return { paths: unique, markdownSummary };
}
async function firstExistingFinalPlotSource(projectRoot, planFile = "") {
    const plan = String(planFile || "").trim();
    const candidates = plan
        ? [(0, PlottingContract_1.statisticsJsonPath)(plan)]
        : [PPT_FINAL_STATISTICS_PATH];
    for (const rel of Array.from(new Set(candidates.filter(Boolean)))) {
        if (await pathExists(safeProjectPath(projectRoot, rel)) && (!isStatisticsPlotSource(rel) || await archivedStatisticsSource(projectRoot, rel)))
            return rel;
    }
    return undefined;
}
function isStatisticsPlotSource(rel) {
    return /(^|\/)statistics\.json$/i.test(normalizeProjectRelativePath(rel));
}
async function archivedStatisticsSource(projectRoot, rel) {
    const full = safeProjectPath(projectRoot, rel);
    try {
        const report = JSON.parse(await fs.readFile(full, "utf8"));
        const source = String(report?.aggregationPolicy?.source || report?.inclusionPolicy || "").toLowerCase();
        return Number(report?.resultCount || 0) > 0 && source === "archived_only";
    }
    catch {
        return false;
    }
}
function isRawSingleRunPlotSource(rel) {
    const text = normalizeProjectRelativePath(rel).toLowerCase();
    if (!text)
        return false;
    if (/(^|\/)results_preview_all\.csv$/i.test(text))
        return true;
    if (PPT_NON_RAW_SOURCE_PATHS.has(text))
        return false;
    if (text.startsWith("zlk_cluster/results/by_plan/") && /(statistics\.json|plotting_contract\.json|case_level_index\.json|result_registry\.json|output_contract_for_plotting\.md)$/.test(text))
        return false;
    if (/^paper\/tables\/zlk_results_table__.+\.csv$/.test(text))
        return false;
    if (text.startsWith("zlk_cluster/results/anomaly/") || text.startsWith("zlk_cluster/results/by_plan/") && text.includes("/anomaly/") || text.startsWith("zlk_cluster/plans/recovered/"))
        return false;
    if (text === "zlk_cluster/results/result_registry.json")
        return true;
    return /^(experiments\/results|work_dirs|results|outputs|runs|custom_results|reports|artifacts|evals|evaluation)\//.test(text) && /\.(csv|json)$/i.test(text);
}
async function assertPptLightweightSource(fullPath, rel) {
    const stat = await fs.stat(fullPath).catch(() => undefined);
    if (!stat)
        throw new Error(`绘图源文件不存在：${rel}`);
    if (!stat.isFile())
        throw new Error(`绘图源必须是轻量结果文件，不能是目录：${rel}`);
    const ext = path.extname(rel).toLowerCase();
    if (!PPT_LIGHTWEIGHT_SOURCE_EXTENSIONS.has(ext)) {
        throw new Error(`不支持的 PPT 绘图源文件类型：${rel}。仅允许 JSON、CSV、Markdown 或 TeX 轻量结果文件。`);
    }
    if (stat.size > PPT_SOURCE_FILE_MAX_BYTES) {
        throw new Error(`PPT 绘图源文件过大：${rel}，请先生成 statistics、paper table、case-level 或 Markdown 摘要。`);
    }
}
async function ensureAuditDir(projectRoot) {
    const dir = safeProjectPath(projectRoot, "zlk_cluster/results/ppt_plot_requests");
    await fs.mkdir(dir, { recursive: true });
    return dir;
}
function automationBaseUrl(raw) {
    const direct = cleanOptional(raw.baseUrl) || cleanOptional(raw.url) || cleanOptional(raw.endpoint);
    const host = cleanOptional(raw.host) || "127.0.0.1";
    const port = typeof raw.port === "number" ? raw.port : Number(raw.port);
    const protocol = cleanOptional(raw.protocol) || "http";
    const base = direct || (Number.isFinite(port) ? `${protocol}://${host}:${port}` : "");
    if (!base)
        throw new Error("automation.json 缺少 baseUrl/url/endpoint 或 port。");
    const url = new URL(base);
    if (!PPT_LOOPBACK_HOSTNAMES.has(url.hostname)) {
        throw new Error("PPT automation server 必须绑定本机 127.0.0.1 或 localhost。");
    }
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
}
function automationHeaders(config, hasBody) {
    const headers = { Accept: "application/json" };
    if (hasBody)
        headers["Content-Type"] = "application/json";
    if (config.token) {
        headers.Authorization = `Bearer ${config.token}`;
        headers["X-RoughPpt-Automation-Token"] = config.token;
        headers["X-Rough-Ppt-Token"] = config.token;
    }
    return headers;
}
function pptPlotAdmissionKey(request) {
    return JSON.stringify({
        projectRoot: path.resolve(request.projectRoot),
        sourcePaths: request.sourcePaths,
        plottingContractPath: request.plottingContractPath,
        selectedResultId: request.selectedResultId || "",
        runKey: request.runKey || "",
        archiveKey: request.archiveKey || "",
        chartType: request.chartType || "auto",
        presentationPath: request.target.presentationPath || "",
        styleMode: request.styleMode || "activePpt",
    });
}
function launchPowerPoint(presentationPath) {
    const child = process.platform === "win32"
        ? (0, child_process_1.spawn)("powershell.exe", [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            presentationPath ? "Start-Process -FilePath powerpnt.exe -ArgumentList $args[0]" : "Start-Process -FilePath powerpnt.exe",
            ...(presentationPath ? [presentationPath] : []),
        ], { detached: true, stdio: "ignore", windowsHide: true })
        : (0, child_process_1.spawn)("open", presentationPath ? [presentationPath] : ["-a", "Microsoft PowerPoint"], { detached: true, stdio: "ignore" });
    child.unref();
}
async function writeJson(file, payload) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
function safeProjectPath(projectRoot, value) {
    const root = path.resolve(projectRoot);
    const full = path.resolve(root, normalizeProjectRelativePath(value, root));
    if (full !== root && !full.startsWith(root + path.sep))
        throw new Error(`路径越界：${value}`);
    return full;
}
function normalizeProjectRelativePath(value, projectRoot) {
    const text = String(value || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if (!text)
        return "";
    if (path.isAbsolute(text))
        return path.relative(path.resolve(projectRoot || process.cwd()), text).replace(/\\/g, "/");
    return text.replace(/\/+/g, "/");
}
function toProjectRelative(projectRoot, file) {
    return path.relative(projectRoot, file).replace(/\\/g, "/");
}
async function pathExists(file) {
    return fs.access(file).then(() => true, () => false);
}
function cleanOptional(value) {
    return typeof value === "string" ? value.trim() : "";
}
function defaultRequestId() {
    return `ppt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function sleep(ms) {
    return new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        timer.unref?.();
    });
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error || "unknown error");
}
function isAbortError(error) {
    return error instanceof Error && (error.name === "AbortError" || /aborted|abort/i.test(error.message));
}
