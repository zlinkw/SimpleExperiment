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
exports.ensureLocalPlottingContract = ensureLocalPlottingContract;
exports.buildPptPlotRequest = buildPptPlotRequest;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const PlottingContract_1 = require("./features/PlottingContract");
class PptPlotBridge {
    fetchImpl;
    localAppData;
    requestIdFactory;
    launchPowerPoint;
    sleepImpl;
    healthTimeoutMs;
    healthPollMs;
    constructor(deps = {}) {
        this.fetchImpl = deps.fetch || fetch;
        this.localAppData = deps.localAppData || process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
        this.requestIdFactory = deps.requestIdFactory || defaultRequestId;
        this.launchPowerPoint = deps.launchPowerPoint || launchPowerPoint;
        this.sleepImpl = deps.sleep || sleep;
        this.healthTimeoutMs = deps.healthTimeoutMs ?? 30_000;
        this.healthPollMs = deps.healthPollMs ?? 750;
    }
    async plot(input) {
        const request = await buildPptPlotRequest(input, this.requestIdFactory());
        const requestDir = await ensureAuditDir(request.projectRoot);
        const requestPath = path.join(requestDir, `${request.requestId}.json`);
        const responsePath = path.join(requestDir, `${request.requestId}.response.json`);
        await writeJson(requestPath, request);
        try {
            const automation = await this.ensureAutomationReady(request.target.presentationPath);
            const response = await this.postPlotRequest(automation, request);
            await writeJson(responsePath, response);
            return { requestId: request.requestId, requestPath, responsePath, request, response };
        }
        catch (error) {
            const failure = { ok: false, error: errorMessage(error), requestId: request.requestId };
            await writeJson(responsePath, failure);
            throw new Error(`${errorMessage(error)}；审计文件：${toProjectRelative(request.projectRoot, requestPath)}，响应：${toProjectRelative(request.projectRoot, responsePath)}`);
        }
    }
    async ensureAutomationReady(presentationPath) {
        const first = await this.readAutomationConfig().catch(() => undefined);
        if (first && await this.healthOk(first))
            return first;
        await this.launchPowerPoint(presentationPath && await pathExists(presentationPath) ? presentationPath : undefined);
        const started = Date.now();
        let lastError = first ? "health 未通过" : "未找到 automation.json";
        while (Date.now() - started <= this.healthTimeoutMs) {
            const config = await this.readAutomationConfig().catch((error) => {
                lastError = errorMessage(error);
                return undefined;
            });
            if (config && await this.healthOk(config))
                return config;
            await this.sleepImpl(this.healthPollMs);
        }
        throw new Error(`PPT automation server 未就绪：${lastError}。请确认 RoughPptAddin 已安装并打开 PowerPoint 后重试。`);
    }
    async readAutomationConfig() {
        const dir = path.join(this.localAppData, "RoughPptAddin");
        const configPath = path.join(dir, "automation.json");
        const tokenPath = path.join(dir, "automation.token");
        const raw = JSON.parse(await fs.readFile(configPath, "utf8"));
        const baseUrl = automationBaseUrl(raw);
        const token = String((await fs.readFile(tokenPath, "utf8").catch(() => "")) || raw.token || "").trim();
        return { baseUrl, token };
    }
    async healthOk(config) {
        try {
            const response = await this.fetchImpl(`${config.baseUrl}/health`, {
                method: "GET",
                headers: automationHeaders(config, false),
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    async postPlotRequest(config, request) {
        const response = await this.fetchImpl(`${config.baseUrl}/api/zlk-cluster/plot`, {
            method: "POST",
            headers: automationHeaders(config, true),
            body: JSON.stringify(request),
        });
        const text = await response.text();
        const payload = text.trim() ? JSON.parse(text) : {};
        if (!response.ok)
            throw new Error(`PPT automation server HTTP ${response.status}: ${text.slice(0, 500)}`);
        return payload;
    }
}
exports.PptPlotBridge = PptPlotBridge;
async function ensureLocalPlottingContract(projectRoot) {
    const root = path.resolve(projectRoot);
    const jsonPath = safeProjectPath(root, PlottingContract_1.PLOTTING_CONTRACT_JSON_PATH);
    if (!await pathExists(jsonPath)) {
        await fs.mkdir(path.dirname(jsonPath), { recursive: true });
        await writeJson(jsonPath, (0, PlottingContract_1.buildPlottingOutputContract)());
    }
    const mdPath = safeProjectPath(root, "zlk_cluster/results/output_contract_for_plotting.md");
    if (!await pathExists(mdPath)) {
        await fs.mkdir(path.dirname(mdPath), { recursive: true });
        await fs.writeFile(mdPath, (0, PlottingContract_1.plottingContractMarkdown)(), "utf8");
    }
    return toProjectRelative(root, jsonPath);
}
async function buildPptPlotRequest(input, requestId = defaultRequestId()) {
    const projectRoot = path.resolve(input.projectRoot);
    const plottingContractPath = normalizeProjectRelativePath(input.plottingContractPath || PlottingContract_1.PLOTTING_CONTRACT_JSON_PATH, projectRoot);
    const sourcePaths = await resolvePptSourcePaths(projectRoot, input.sourcePaths?.length ? input.sourcePaths : [plottingContractPath]);
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
        sourceLabel: cleanOptional(input.sourceLabel) || "ZLK 结果",
    };
    if (sourcePaths.markdownSummary)
        request.markdownSummary = sourcePaths.markdownSummary;
    return request;
}
async function resolvePptSourcePaths(projectRoot, sourcePaths) {
    const out = [];
    let markdownSummary;
    for (const raw of sourcePaths) {
        const rel = normalizeProjectRelativePath(raw, projectRoot);
        if (!rel)
            continue;
        const full = safeProjectPath(projectRoot, rel);
        if (!await pathExists(full))
            throw new Error(`绘图源文件不存在：${rel}`);
        if (/\.md$/i.test(rel)) {
            const jsonRel = rel.replace(/\.md$/i, ".json");
            const jsonFull = safeProjectPath(projectRoot, jsonRel);
            if (await pathExists(jsonFull)) {
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
    if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)) {
        throw new Error("PPT automation server 必须绑定本机 127.0.0.1 或 localhost。");
    }
    url.pathname = url.pathname.replace(/\/+$/, "");
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
function launchPowerPoint(presentationPath) {
    const child = process.platform === "win32"
        ? (0, child_process_1.spawn)("powershell.exe", [
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            presentationPath ? "Start-Process -FilePath $args[0]" : "Start-Process -FilePath powerpnt.exe",
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
