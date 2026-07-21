import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { spawn } from "child_process";
import { buildPlottingOutputContract, PLOTTING_CONTRACT_JSON_PATH, plottingContractMarkdown } from "./features/PlottingContract";

export type PptPlotTarget = {
  presentationPath?: string;
  createIfMissing: true;
  slideMode: "append";
};

export type PptPlotRequest = {
  schemaVersion: 1;
  requestId: string;
  projectRoot: string;
  sourcePaths: string[];
  plottingContractPath: string;
  selectedResultId?: string;
  runKey?: string;
  archiveKey?: string;
  chartType: "auto" | string;
  target: PptPlotTarget;
  styleMode: "activePpt" | string;
  sourceLabel: string;
  markdownSummary?: {
    path: string;
    text: string;
  };
};

export type PptPlotInput = {
  projectRoot: string;
  sourcePaths?: string[];
  plottingContractPath?: string;
  selectedResultId?: string;
  runKey?: string;
  archiveKey?: string;
  chartType?: string;
  presentationPath?: string;
  styleMode?: string;
  sourceLabel?: string;
};

export type PptPlotResult = {
  requestId: string;
  requestPath: string;
  responsePath: string;
  request: PptPlotRequest;
  response: unknown;
};

type AutomationConfig = {
  baseUrl: string;
  token?: string;
};

type BridgeDeps = {
  fetch?: typeof fetch;
  localAppData?: string;
  requestIdFactory?: () => string;
  launchPowerPoint?: (presentationPath?: string) => Promise<void> | void;
  sleep?: (ms: number) => Promise<void>;
  healthTimeoutMs?: number;
  healthPollMs?: number;
};

export class PptPlotBridge {
  private readonly fetchImpl: typeof fetch;
  private readonly localAppData: string;
  private readonly requestIdFactory: () => string;
  private readonly launchPowerPoint: (presentationPath?: string) => Promise<void> | void;
  private readonly sleepImpl: (ms: number) => Promise<void>;
  private readonly healthTimeoutMs: number;
  private readonly healthPollMs: number;

  constructor(deps: BridgeDeps = {}) {
    this.fetchImpl = deps.fetch || fetch;
    this.localAppData = deps.localAppData || process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    this.requestIdFactory = deps.requestIdFactory || defaultRequestId;
    this.launchPowerPoint = deps.launchPowerPoint || launchPowerPoint;
    this.sleepImpl = deps.sleep || sleep;
    this.healthTimeoutMs = deps.healthTimeoutMs ?? 30_000;
    this.healthPollMs = deps.healthPollMs ?? 750;
  }

  async plot(input: PptPlotInput): Promise<PptPlotResult> {
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
    } catch (error) {
      const failure = { ok: false, error: errorMessage(error), requestId: request.requestId };
      await writeJson(responsePath, failure);
      throw new Error(`${errorMessage(error)}；审计文件：${toProjectRelative(request.projectRoot, requestPath)}，响应：${toProjectRelative(request.projectRoot, responsePath)}`);
    }
  }

  private async ensureAutomationReady(presentationPath?: string): Promise<AutomationConfig> {
    const first = await this.readAutomationConfig().catch(() => undefined);
    if (first && await this.healthOk(first)) return first;
    await this.launchPowerPoint(presentationPath && await pathExists(presentationPath) ? presentationPath : undefined);
    const started = Date.now();
    let lastError = first ? "health 未通过" : "未找到 automation.json";
    while (Date.now() - started <= this.healthTimeoutMs) {
      const config = await this.readAutomationConfig().catch((error) => {
        lastError = errorMessage(error);
        return undefined;
      });
      if (config && await this.healthOk(config)) return config;
      await this.sleepImpl(this.healthPollMs);
    }
    throw new Error(`PPT automation server 未就绪：${lastError}。请确认 RoughPptAddin 已安装并打开 PowerPoint 后重试。`);
  }

  private async readAutomationConfig(): Promise<AutomationConfig> {
    const dir = path.join(this.localAppData, "RoughPptAddin");
    const configPath = path.join(dir, "automation.json");
    const tokenPath = path.join(dir, "automation.token");
    const raw = JSON.parse(await fs.readFile(configPath, "utf8")) as Record<string, unknown>;
    const baseUrl = automationBaseUrl(raw);
    const token = String((await fs.readFile(tokenPath, "utf8").catch(() => "")) || raw.token || "").trim();
    return { baseUrl, token };
  }

  private async healthOk(config: AutomationConfig): Promise<boolean> {
    try {
      const response = await this.fetchImpl(`${config.baseUrl}/health`, {
        method: "GET",
        headers: automationHeaders(config, false),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async postPlotRequest(config: AutomationConfig, request: PptPlotRequest): Promise<unknown> {
    const response = await this.fetchImpl(`${config.baseUrl}/api/zlk-cluster/plot`, {
      method: "POST",
      headers: automationHeaders(config, true),
      body: JSON.stringify(request),
    });
    const text = await response.text();
    const payload = text.trim() ? JSON.parse(text) : {};
    if (!response.ok) throw new Error(`PPT automation server HTTP ${response.status}: ${text.slice(0, 500)}`);
    return payload;
  }
}

export async function ensureLocalPlottingContract(projectRoot: string): Promise<string> {
  const root = path.resolve(projectRoot);
  const jsonPath = safeProjectPath(root, PLOTTING_CONTRACT_JSON_PATH);
  if (!await pathExists(jsonPath)) {
    await fs.mkdir(path.dirname(jsonPath), { recursive: true });
    await writeJson(jsonPath, buildPlottingOutputContract());
  }
  const mdPath = safeProjectPath(root, "zlk_cluster/results/output_contract_for_plotting.md");
  if (!await pathExists(mdPath)) {
    await fs.mkdir(path.dirname(mdPath), { recursive: true });
    await fs.writeFile(mdPath, plottingContractMarkdown(), "utf8");
  }
  return toProjectRelative(root, jsonPath);
}

export async function buildPptPlotRequest(input: PptPlotInput, requestId = defaultRequestId()): Promise<PptPlotRequest> {
  const projectRoot = path.resolve(input.projectRoot);
  const plottingContractPath = normalizeProjectRelativePath(input.plottingContractPath || PLOTTING_CONTRACT_JSON_PATH, projectRoot);
  const sourcePaths = await resolvePptSourcePaths(projectRoot, input.sourcePaths?.length ? input.sourcePaths : [plottingContractPath]);
  const request: PptPlotRequest = {
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
  if (sourcePaths.markdownSummary) request.markdownSummary = sourcePaths.markdownSummary;
  return request;
}

async function resolvePptSourcePaths(projectRoot: string, sourcePaths: string[]): Promise<{ paths: string[]; markdownSummary?: PptPlotRequest["markdownSummary"] }> {
  const out: string[] = [];
  let markdownSummary: PptPlotRequest["markdownSummary"];
  for (const raw of sourcePaths) {
    const rel = normalizeProjectRelativePath(raw, projectRoot);
    if (!rel) continue;
    const full = safeProjectPath(projectRoot, rel);
    if (!await pathExists(full)) throw new Error(`绘图源文件不存在：${rel}`);
    if (/\.md$/i.test(rel)) {
      const jsonRel = rel.replace(/\.md$/i, ".json");
      const jsonFull = safeProjectPath(projectRoot, jsonRel);
      if (await pathExists(jsonFull)) {
        out.push(jsonRel);
      } else if (!markdownSummary) {
        markdownSummary = { path: rel, text: (await fs.readFile(full, "utf8")).slice(0, 24_000) };
        out.push(rel);
      }
      continue;
    }
    out.push(rel);
  }
  const unique = Array.from(new Set(out));
  if (!unique.length) throw new Error("没有可用于 PPT 绘图的轻量结果文件。");
  return { paths: unique, markdownSummary };
}

async function ensureAuditDir(projectRoot: string): Promise<string> {
  const dir = safeProjectPath(projectRoot, "zlk_cluster/results/ppt_plot_requests");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function automationBaseUrl(raw: Record<string, unknown>): string {
  const direct = cleanOptional(raw.baseUrl) || cleanOptional(raw.url) || cleanOptional(raw.endpoint);
  const host = cleanOptional(raw.host) || "127.0.0.1";
  const port = typeof raw.port === "number" ? raw.port : Number(raw.port);
  const protocol = cleanOptional(raw.protocol) || "http";
  const base = direct || (Number.isFinite(port) ? `${protocol}://${host}:${port}` : "");
  if (!base) throw new Error("automation.json 缺少 baseUrl/url/endpoint 或 port。");
  const url = new URL(base);
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname)) {
    throw new Error("PPT automation server 必须绑定本机 127.0.0.1 或 localhost。");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function automationHeaders(config: AutomationConfig, hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (hasBody) headers["Content-Type"] = "application/json";
  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
    headers["X-RoughPpt-Automation-Token"] = config.token;
    headers["X-Rough-Ppt-Token"] = config.token;
  }
  return headers;
}

function launchPowerPoint(presentationPath?: string): void {
  const child = process.platform === "win32"
    ? spawn("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      presentationPath ? "Start-Process -FilePath $args[0]" : "Start-Process -FilePath powerpnt.exe",
      ...(presentationPath ? [presentationPath] : []),
    ], { detached: true, stdio: "ignore", windowsHide: true })
    : spawn("open", presentationPath ? [presentationPath] : ["-a", "Microsoft PowerPoint"], { detached: true, stdio: "ignore" });
  child.unref();
}

async function writeJson(file: string, payload: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function safeProjectPath(projectRoot: string, value: string): string {
  const root = path.resolve(projectRoot);
  const full = path.resolve(root, normalizeProjectRelativePath(value, root));
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error(`路径越界：${value}`);
  return full;
}

function normalizeProjectRelativePath(value: string, projectRoot?: string): string {
  const text = String(value || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!text) return "";
  if (path.isAbsolute(text)) return path.relative(path.resolve(projectRoot || process.cwd()), text).replace(/\\/g, "/");
  return text.replace(/\/+/g, "/");
}

function toProjectRelative(projectRoot: string, file: string): string {
  return path.relative(projectRoot, file).replace(/\\/g, "/");
}

async function pathExists(file: string): Promise<boolean> {
  return fs.access(file).then(() => true, () => false);
}

function cleanOptional(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function defaultRequestId(): string {
  return `ppt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref?.();
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "unknown error");
}