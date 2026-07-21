import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import { RequestBudget, RequestBudgetDeniedError } from "./tunnel/RequestBudget";
import {
  defaultTunnelGatewayConfig,
  localBaseUrl,
  normalizeTunnelGatewayConfig,
  requestBudgetConfigFromTunnel,
  TunnelGatewayConfig,
} from "./tunnel/TunnelGateway";
import { ClusterSnapshot } from "./tunnel/TunnelClient";
import { RealtimeState } from "./tunnel/RealtimeEventReducer";
import { RealtimeTunnelClient, defaultRealtimeRefreshPolicy } from "./tunnel/RealtimeTunnelClient";
import { classifyTunnelHealth, TunnelHealth } from "./tunnel/TunnelHealth";
import {
  defaultMobaXtermTunnelSetupConfig,
  MobaXtermTunnelSetupConfig,
  normalizeMobaXtermSetupConfig,
  publicSetupSummary,
  validateMobaXtermSetupConfig,
} from "./tunnel/MobaXtermSetup";
import {
  isLocalPortAvailable,
  recommendAvailableLocalPort,
} from "./tunnel/MobaXtermLauncher";
import { MobaXtermIntegration, MobaXtermRealIntegrationReport } from "./tunnel/MobaXtermIntegration";
import { generateMobaXtermBatScript, generateMobaXtermPs1Script } from "./tunnel/MobaXtermCommandBuilder";
import { TunnelProbeResult } from "./tunnel/MobaXtermPortProbe";
import { importOfflineBundle, OfflineBundle } from "./tunnel/OfflineImport";
import { redactTunnelDiagnostics } from "./tunnel/TunnelDiagnostics";
import { assertTunnelOnlyMode, migrateLegacyRemoteConfig } from "./tunnel/TunnelOnlyPolicy";

const viewId = "zlkCluster.panel";
const keys = {
  tunnelConfig: "zlkCluster.tunnelGatewayConfig",
  setupConfig: "zlkCluster.mobaXtermRealtimeTunnelConfig",
  migrationShown: "zlkCluster.legacyRemoteMigrationShown",
  offlineBundle: "zlkCluster.offlineBundle",
  uiLayout: "zlkCluster.uiLayout",
};

type UiLayoutState = {
  order: string[];
  collapsed: Record<string, boolean>;
  manual: boolean;
};

const defaultUiSectionOrder = [
  "overview",
  "gpu",
  "tasks",
  "plans",
  "results",
  "operations",
  "logs",
  "traces",
  "remoteFiles",
  "transfers",
  "servers",
  "diagnostics",
];

const defaultUiLayout: UiLayoutState = {
  order: defaultUiSectionOrder,
  collapsed: { servers: true },
  manual: false,
};

type WebviewClusterState = {
  connectionMode: string;
  localEndpoint: string;
  setup: unknown;
  health: TunnelHealth | { state: string; checkedAt: string };
  realtime: unknown;
  gpu: Record<string, unknown[]>;
  schedulerStates: unknown[];
  experimentTraces: unknown[];
  logs: Record<string, unknown>;
  operations: Record<string, unknown>;
  fileTransfers: Record<string, unknown>;
  selectedLogRunKey?: string;
  lastKnownGood?: ClusterSnapshot;
  offline?: unknown;
  probe?: unknown;
  capabilities?: unknown;
  fileCapabilities?: unknown;
  diagnostics: unknown;
  lastError?: string;
};

type WebviewActionCommand =
  | "validatePlan"
  | "dryRunPlan"
  | "runPlan"
  | "stopExperiment"
  | "retryExperiment"
  | "reproducePlan"
  | "parseResults"
  | "refreshResults"
  | "runQualityGate"
  | "runStatistics"
  | "exportPaperTable"
  | "archiveArtifacts"
  | "syncArtifacts"
  | "completeThreeWay"
  | "deleteArtifacts"
  | "reconcileDeletions"
  | "selfCheck"
  | "createDebugBundle"
  | "downloadDebugBundle"
  | "openAuditTail"
  | "listRemoteFiles"
  | "downloadRemoteFile"
  | "uploadRemoteFile"
  | "selectExperiment"
  | "selectPlan"
  | "selectRemoteFile";

type UiActionError = {
  command: string;
  action?: TunnelAction;
  message: string;
  suggestion?: string;
  capabilityMissing?: string[];
  timestamp: string;
};

type StandardActionRequest = {
  schemaVersion: 1;
  opId: string;
  selectedPlanId?: string;
  selectedExperimentIds?: string[];
  selectedRunKeys?: string[];
  selectedArchiveKeys?: string[];
  options?: Record<string, unknown>;
};

type LocalPlanSummary = {
  planId?: string;
  planFile: string;
  file: string;
  name: string;
  suite?: string;
  status?: string;
  mode?: string;
  baseConfig?: string;
  seeds: string[];
  cases: string[];
  trainCommand?: string;
  testCommand?: string;
  jobCount: number;
  parseError?: string;
  text: string;
};

type LocalConfigSummary = {
  file: string;
  folder: string;
  params: Array<{ key: string; value: string; important: boolean; kind: string }>;
  omittedParamCount?: number;
};

type LocalPlanMetadata = {
  planDir: string;
  detectedProject: Record<string, unknown>;
  plans: LocalPlanSummary[];
  error?: string;
};

type CodeSyncTarget = {
  id: string;
  role: "hub" | "worker";
  label: string;
  host: string;
  user: string;
  port: number;
  sshConfigHost?: string;
  remotePath: string;
};

const uiActionCommands = new Set<WebviewActionCommand>([
  "validatePlan",
  "dryRunPlan",
  "runPlan",
  "stopExperiment",
  "retryExperiment",
  "reproducePlan",
  "parseResults",
  "refreshResults",
  "runQualityGate",
  "runStatistics",
  "exportPaperTable",
  "archiveArtifacts",
  "syncArtifacts",
  "completeThreeWay",
  "deleteArtifacts",
  "reconcileDeletions",
  "selfCheck",
  "createDebugBundle",
  "downloadDebugBundle",
  "openAuditTail",
  "listRemoteFiles",
  "downloadRemoteFile",
  "uploadRemoteFile",
  "selectExperiment",
  "selectPlan",
  "selectRemoteFile",
]);

const actionCommandMap: Partial<Record<WebviewActionCommand, TunnelAction>> = {
  validatePlan: "validate-plan",
  dryRunPlan: "dry-run-plan",
  runPlan: "run-plan",
  stopExperiment: "stop-experiment",
  retryExperiment: "retry-experiment",
  reproducePlan: "reproduce-plan",
  parseResults: "parse-results",
  refreshResults: "refresh-results",
  runQualityGate: "run-quality-gate",
  runStatistics: "run-statistics",
  exportPaperTable: "export-paper-table",
  archiveArtifacts: "archive-artifacts",
  syncArtifacts: "sync-artifacts",
  completeThreeWay: "complete-three-way",
  deleteArtifacts: "delete-artifacts",
  reconcileDeletions: "reconcile-deletions",
  selfCheck: "self-check",
  createDebugBundle: "create-debug-bundle",
};

let provider: RealtimeTunnelPanelProvider | undefined;

export function activate(context: vscode.ExtensionContext): void {
  provider = new RealtimeTunnelPanelProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(viewId, provider, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.commands.registerCommand("zlkCluster.openPanel", () => vscode.commands.executeCommand(`${viewId}.focus`)),
    vscode.commands.registerCommand("zlkCluster.configureMobaXtermRealtimeTunnel", () => provider?.configureMobaXtermRealtimeTunnel()),
    vscode.commands.registerCommand("zlkCluster.startMobaXtermRealtimeTunnel", () => provider?.startMobaXtermRealtimeTunnel()),
    vscode.commands.registerCommand("zlkCluster.testMobaXtermTunnel", () => provider?.testTunnel(true)),
    vscode.commands.registerCommand("zlkCluster.restartRealtimeStream", () => provider?.restartRealtimeStream()),
    vscode.commands.registerCommand("zlkCluster.pauseRealtimeStream", () => provider?.pauseRealtimeStream()),
    vscode.commands.registerCommand("zlkCluster.resumeRealtimeStream", () => provider?.resumeRealtimeStream()),
    vscode.commands.registerCommand("zlkCluster.pauseAllNetworkActivity", () => provider?.pauseAllNetworkActivity()),
    vscode.commands.registerCommand("zlkCluster.generateMobaXtermTunnelScript", () => provider?.generateTunnelScript()),
    vscode.commands.registerCommand("zlkCluster.openTunnelStatus", () => provider?.openTunnelStatus()),
    vscode.commands.registerCommand("zlkCluster.runMobaXtermRealIntegrationCheck", () => provider?.runMobaXtermRealIntegrationCheck()),
    vscode.commands.registerCommand("zlkCluster.manualRefresh", () => provider?.manualSnapshot()),
    vscode.commands.registerCommand("zlkCluster.importOfflineBundle", () => provider?.importOffline()),
  );
  void provider.migrateLegacyConfigOnce();
}

export function deactivate(): void {
  void provider?.dispose();
  provider = undefined;
}

class RealtimeTunnelPanelProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private tunnelConfig: TunnelGatewayConfig;
  private setupConfig: MobaXtermTunnelSetupConfig;
  private budget: RequestBudget;
  private client: RealtimeTunnelClient;
  private lastHealth?: TunnelHealth;
  private lastSnapshot?: ClusterSnapshot;
  private lastRealtimeState?: RealtimeState;
  private lastProbe?: TunnelProbeResult;
  private lastIntegrationReport?: MobaXtermRealIntegrationReport;
  private lastSnapshotAt?: string;
  private lastError?: string;
  private offlineBundle?: OfflineBundle;
  private selectedLogRunKey?: string;
  private selectedPlanId?: string;
  private selectedExperimentIds = new Set<string>();
  private selectedRunKey?: string;
  private selectedArchiveKeys = new Set<string>();
  private selectedRemoteFile?: string;
  private planFileInput?: string;
  private recentPlans: Array<{ planId?: string; planFile: string; suite?: string; status?: string }> = [];
  private remoteFilePath = "zlk_cluster";
  private remoteFileEntries: RemoteFileEntry[] = [];
  private remoteFileError?: string;
  private resultsSummary?: unknown;
  private auditTail?: unknown;
  private debugBundlePath?: string;
  private actionErrors: UiActionError[] = [];
  private localOperations: Record<string, unknown> = {};
  private xshellLibrary: XshellSessionScanResult = { searchedDirs: [], existingDirs: [], sessions: [] };
  private xshellLibraryError?: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.tunnelConfig = this.loadTunnelConfig();
    this.setupConfig = this.loadSetupConfig();
    this.budget = new RequestBudget(requestBudgetConfigFromTunnel(this.tunnelConfig));
    this.client = this.createClient();
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = renderHtml();
    webviewView.onDidChangeVisibility(() => {
      this.budget.setHidden(!webviewView.visible);
      this.postState();
    });
    webviewView.webview.onDidReceiveMessage((message) => void this.handleMessage(message));
    this.postState();
    if (this.tunnelConfig.connectionMode === "mobaxterm_tunnel_realtime") {
      void this.ensureRealtimeConnected("webview resolved");
    }
  }

  async dispose(): Promise<void> {
    for (const timer of this.operationTimers.values()) clearTimeout(timer);
    this.operationTimers.clear();
    await this.client.disconnect("deactivate").catch(() => undefined);
    this.view = undefined;
  }

  async migrateLegacyConfigOnce(): Promise<void> {
    if (this.context.workspaceState.get<boolean>(keys.migrationShown)) return;
    const config = vscode.workspace.getConfiguration("zlkCluster");
    const legacy = migrateLegacyRemoteConfig({ ...config });
    await this.context.workspaceState.update(keys.migrationShown, true);
    if (legacy.removedFields.length) void vscode.window.showWarningMessage(legacy.warning);
  }

  async importMobaXtermServerConfigs(): Promise<void> {
    const integration = this.integration();
    const found = await integration.findExecutable();
    let exePath = found.path || this.setupConfig.mobaxtermExePath;
    if (!exePath) {
      const picked = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        title: "选择 MobaXterm.exe",
        filters: { "MobaXterm.exe": ["exe"] },
      });
      exePath = picked?.[0]?.fsPath || "";
    }
    if (!exePath) {
      void vscode.window.showErrorMessage("需要先选择 MobaXterm.exe。");
      return;
    }

    const servers = await readLocalSshServers();
    if (!servers.length) {
      void vscode.window.showWarningMessage("未从 ~/.ssh/config 读取到服务器配置，请使用手动配置。");
      await this.applySetupDraft({ mobaxtermExePath: exePath });
      await this.configureMobaXtermRealtimeTunnel();
      return;
    }

    const hub = await pickHubServer(servers, this.setupConfig);
    if (!hub) return;
    const workerServers = await pickWorkerServers(servers.filter((server) => server.name !== hub.name), this.setupConfig);
    if (!workerServers) return;

    const hubSetup = setupFromLocalSshServer({ ...this.setupConfig, mobaxtermExePath: exePath }, hub);
    const workerTunnels = await buildWorkerTunnels(workerServers, hubSetup);
    await this.applySetupDraft({
      ...hubSetup,
      mobaxtermExePath: exePath,
      workerRealtimeMode: workerTunnels.length ? "hub_plus_workers" : "hub_only",
      workerTunnels,
    });
    void vscode.window.showInformationMessage(`已导入 Hub 配置和 ${workerTunnels.length} 个 Worker 隧道配置。`);
  }

  async configureMobaXtermRealtimeTunnel(): Promise<void> {
    const workspace = workspaceRoot();
    const integration = this.integration();
    const found = await integration.findExecutable();
    let exePath = found.path || this.setupConfig.mobaxtermExePath;
    if (!exePath) {
      const picked = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        title: "Select MobaXterm.exe",
        filters: { "MobaXterm.exe": ["exe"] },
      });
      exePath = picked?.[0]?.fsPath || "";
    }
    const hubHost = await input("Hub host", this.setupConfig.hubHost, "hub.example.edu; empty when SSH alias is used");
    if (hubHost === undefined) return;
    const hubUser = await input("Hub user", this.setupConfig.hubUser, "user; empty when SSH alias is used");
    if (hubUser === undefined) return;
    const hubSshPort = await inputPort("Hub SSH port", this.setupConfig.hubSshPort);
    if (hubSshPort === undefined) return;
    let localForwardPort = await inputPort("Local forward port", this.setupConfig.localForwardPort);
    if (localForwardPort === undefined) return;
    if (!(await isLocalPortAvailable(localForwardPort))) {
      const recommended = await recommendAvailableLocalPort(localForwardPort + 1);
      const answer = await vscode.window.showWarningMessage(
        `127.0.0.1:${localForwardPort} is occupied. Recommended available port: ${recommended}.`,
        "Use Recommended",
        "Keep Current",
        "Cancel",
      );
      if (answer === "Cancel") return;
      if (answer === "Use Recommended") localForwardPort = recommended;
    }
    const remoteAgentPort = await inputPort("Remote agent port", this.setupConfig.remoteAgentPort);
    if (remoteAgentPort === undefined) return;
    const sshConfigAlias = await input("SSH config alias (optional)", this.setupConfig.sshConfigAlias || "", "Used instead of host/user when set");
    if (sshConfigAlias === undefined) return;

    const next = normalizeMobaXtermSetupConfig({
      ...this.setupConfig,
      mobaxtermExePath: exePath,
      hubHost,
      hubUser,
      hubSshPort,
      localForwardPort,
      remoteAgentPort,
      sshConfigAlias: sshConfigAlias.trim() || undefined,
      realtimeEnabled: true,
      fileTransferEnabled: true,
    });
    const errors = validateMobaXtermSetupConfig(next);
    if (errors.length) {
      void vscode.window.showErrorMessage(errors.join(" "));
      return;
    }
    this.setupConfig = next;
    this.tunnelConfig = normalizeTunnelGatewayConfig({
      ...this.tunnelConfig,
      connectionMode: "mobaxterm_tunnel_realtime",
      localPort: next.localForwardPort,
      remotePort: next.remoteAgentPort,
      mobaxtermExePath: next.mobaxtermExePath,
      allowStreaming: true,
      refreshProfile: "realtime",
    });
    await this.saveState();
    this.resetClient();
    this.postState();
  }

  async startMobaXtermRealtimeTunnel(): Promise<void> {
    const errors = validateMobaXtermSetupConfig(this.setupConfig);
    if (errors.length) {
      void vscode.window.showErrorMessage(`${errors.join(" ")} Configure realtime tunnel first.`);
      return;
    }
    if (!(await isLocalPortAvailable(this.setupConfig.localForwardPort))) {
      const proceed = await vscode.window.showWarningMessage(
        `127.0.0.1:${this.setupConfig.localForwardPort} is occupied. If this is running tunnel, test it now.`,
        "Test Tunnel",
        "Cancel",
      );
      if (proceed === "Test Tunnel") await this.testTunnel(true);
      return;
    }
    const integration = this.integration();
    const preview = integration.buildTunnelCommand(this.setupConfig);
    const answer = await vscode.window.showWarningMessage(
      `Start MobaXterm with visible window. No password/passphrase is saved. Host key checking is not disabled.\n\n${preview.redactedShellCommand}`,
      { modal: true },
      "Start Tunnel",
    );
    if (answer !== "Start Tunnel") return;
    const launch = await integration.launchTunnel(this.setupConfig);
    if (!launch.launched) {
      void vscode.window.showErrorMessage(`${launch.message} ${launch.error || ""}`.trim());
      return;
    }
    if (this.setupConfig.autoTestTunnelAfterStart) setTimeout(() => void this.testTunnel(true), 2500).unref?.();
  }

  async startAllMobaXtermRealtimeTunnels(): Promise<void> {
    const launchItems = this.tunnelLaunchItems();
    const errors = launchItems.flatMap((item) => validateMobaXtermSetupConfig(item.config).map((error) => `${item.id}: ${error}`));
    if (errors.length) {
      void vscode.window.showErrorMessage(`${errors.join(" ")} 请先导入或配置隧道。`);
      return;
    }
    const answer = await vscode.window.showWarningMessage(
      `即将启动 ${launchItems.length} 个 MobaXterm 隧道。插件仍只访问 127.0.0.1，本地实时状态会从 Hub 和已配置 Worker 隧道聚合。\n\n${launchItems.map((item) => `${item.id}: 127.0.0.1:${item.config.localForwardPort} -> 127.0.0.1:${item.config.remoteAgentPort}`).join("\n")}`,
      { modal: true },
      "启动全部隧道",
    );
    if (answer !== "启动全部隧道") return;

    const integration = this.integration();
    const results: string[] = [];
    for (const item of launchItems) {
      if (!(await isLocalPortAvailable(item.config.localForwardPort))) {
        results.push(`${item.id}: 本地端口已打开，跳过启动`);
        continue;
      }
      const launch = await integration.launchTunnel(item.config);
      results.push(`${item.id}: ${launch.launched ? "已发出启动命令" : launch.message}`);
      if (!launch.launched && launch.error) results.push(`${item.id}: ${launch.error}`);
    }
    void vscode.window.showInformationMessage(results.join("；"));
    if (this.setupConfig.autoTestTunnelAfterStart) setTimeout(() => void this.testTunnel(true), 2500).unref?.();
  }

  async testTunnel(userInitiated = false): Promise<void> {
    assertTunnelOnlyMode(this.tunnelConfig.connectionMode);
    if (this.tunnelConfig.connectionMode === "offline_import") {
      this.lastHealth = { state: "paused", status: "paused", checkedAt: new Date().toISOString(), message: "Offline mode." };
      this.postState();
      return;
    }
    try {
      const probe = await this.integration().probeLocalTunnel(this.setupConfig);
      this.lastProbe = probe;
      this.lastHealth = this.healthFromProbe(probe);
      this.lastError = undefined;
    } catch (error) {
      this.lastHealth = classifyTunnelHealth({
        configured: Boolean(this.setupConfig.mobaxtermExePath),
        paused: error instanceof RequestBudgetDeniedError && error.decision.reason === "paused",
        rateLimited: error instanceof RequestBudgetDeniedError && error.decision.reason === "rate_limited",
        error,
      });
      this.lastError = this.lastHealth.message;
    }
    if (userInitiated) this.postState();
  }

  async runMobaXtermRealIntegrationCheck(): Promise<void> {
    if (this.tunnelConfig.connectionMode === "offline_import") return;
    const integration = this.integration();
    const preview = integration.buildTunnelCommand(this.setupConfig);
    const answer = await vscode.window.showWarningMessage(
      `Run real integration check through 127.0.0.1:${this.setupConfig.localForwardPort}.\n\n${preview.redactedShellCommand}`,
      { modal: true },
      "Check Existing Tunnel",
      "Launch And Check",
    );
    if (!answer) return;
    if (answer === "Launch And Check") {
      const launch = await integration.launchTunnel(this.setupConfig);
      if (!launch.launched) {
        void vscode.window.showErrorMessage(`${launch.message} ${launch.error || ""}`.trim());
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
    const result = await integration.runIntegrationCheck(this.setupConfig);
    this.lastProbe = result.probe;
    this.lastIntegrationReport = result.report;
    this.lastHealth = this.healthFromProbe(result.probe);
    this.lastError = result.report.overall === "failed" ? result.probe.message : undefined;
    this.postState();
    const doc = await vscode.workspace.openTextDocument({ language: "json", content: JSON.stringify(result.report, null, 2) });
    await vscode.window.showTextDocument(doc, { preview: true });
  }

  async restartRealtimeStream(): Promise<void> {
    if (this.tunnelConfig.connectionMode === "offline_import") return;
    try {
      await this.client.reconnect("manual restart");
      this.lastError = undefined;
    } catch (error) {
      this.lastError = errorMessage(error);
    }
    this.postState();
  }

  async pauseRealtimeStream(): Promise<void> {
    await this.client.disconnect("paused");
    this.postState();
  }

  async resumeRealtimeStream(): Promise<void> {
    if (this.tunnelConfig.connectionMode === "offline_import") return;
    try {
      await this.client.connect(this.lastRealtimeState?.lastSeq || 0);
      this.lastError = undefined;
    } catch (error) {
      this.lastError = errorMessage(error);
    }
    this.postState();
  }

  async pauseAllNetworkActivity(): Promise<void> {
    this.client.pauseAll();
    await this.client.disconnect("paused");
    this.lastHealth = { state: "paused", status: "paused", checkedAt: new Date().toISOString(), message: "All network activity paused." };
    this.postState();
  }

  resumeNetwork(): void {
    this.client.resume();
    this.postState();
  }

  async manualSnapshot(): Promise<void> {
    if (this.tunnelConfig.connectionMode === "offline_import") {
      void vscode.window.showInformationMessage("Offline mode does not access network. Import offline bundle.");
      return;
    }
    try {
      const snapshot = await this.client.getSnapshot();
      this.lastSnapshot = snapshot;
      this.lastSnapshotAt = new Date().toISOString();
      this.lastError = undefined;
    } catch (error) {
      this.lastError = errorMessage(error);
    }
    this.postState();
  }

  async generateTunnelScript(): Promise<void> {
    const errors = validateMobaXtermSetupConfig(this.setupConfig);
    if (errors.length) {
      void vscode.window.showErrorMessage(`${errors.join(" ")} Configure tunnel first.`);
      return;
    }
    const target = await vscode.window.showSaveDialog({
      title: "Save MobaXterm tunnel script",
      defaultUri: vscode.Uri.file(path.join(workspaceRoot() || process.cwd(), "start-zlk-mobaxterm-realtime-tunnel.bat")),
      filters: { "Batch script": ["bat"], "PowerShell script": ["ps1"] },
    });
    if (!target) return;
    const text = target.fsPath.toLowerCase().endsWith(".ps1") ? generateMobaXtermPs1Script(this.setupConfig) : generateMobaXtermBatScript(this.setupConfig);
    await fs.writeFile(target.fsPath, text, "utf8");
  }

  async openTunnelStatus(): Promise<void> {
    const doc = await vscode.workspace.openTextDocument({ language: "json", content: JSON.stringify(this.buildState(), null, 2) });
    await vscode.window.showTextDocument(doc, { preview: true });
  }

  async importOffline(): Promise<void> {
    const picked = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: true,
      canSelectMany: false,
      title: "Select offline bundle JSON or directory",
      filters: { "Offline bundle": ["json"], "All files": ["*"] },
    });
    const source = picked?.[0]?.fsPath;
    if (!source) return;
    const result = await importOfflineBundle(source);
    if (!result.ok || !result.bundle) {
      void vscode.window.showErrorMessage(result.error || "Offline bundle import failed.");
      return;
    }
    await this.pauseRealtimeStream();
    this.offlineBundle = result.bundle;
    await this.context.workspaceState.update(keys.offlineBundle, result.bundle);
    this.resetClient();
    this.postState();
  }

  private async handleMessage(message: unknown): Promise<void> {
    const command = typeof message === "object" && message ? String((message as { command?: unknown }).command || "") : "";
    if (command === "configure") await this.configureMobaXtermRealtimeTunnel();
    else if (command === "start") await this.startMobaXtermRealtimeTunnel();
    else if (command === "test") await this.testTunnel(true);
    else if (command === "restart") await this.restartRealtimeStream();
    else if (command === "pauseStream") await this.pauseRealtimeStream();
    else if (command === "resumeStream") await this.resumeRealtimeStream();
    else if (command === "pauseAll") await this.pauseAllNetworkActivity();
    else if (command === "resumeNetwork") this.resumeNetwork();
    else if (command === "snapshot") await this.manualSnapshot();
    else if (command === "script") await this.generateTunnelScript();
    else if (command === "status") await this.openTunnelStatus();
    else if (command === "offline") await this.importOffline();
  }

  private loadTunnelConfig(): TunnelGatewayConfig {
    const saved = this.context.globalState.get<Partial<TunnelGatewayConfig>>(keys.tunnelConfig)
      || this.context.workspaceState.get<Partial<TunnelGatewayConfig>>(keys.tunnelConfig)
      || {};
    const config = vscode.workspace.getConfiguration("zlkCluster");
    return normalizeTunnelGatewayConfig({
      ...defaultTunnelGatewayConfig,
      ...saved,
      connectionMode: config.get("connectionMode", saved.connectionMode || "mobaxterm_tunnel_realtime"),
      localPort: config.get("tunnel.localForwardPort", saved.localPort || defaultTunnelGatewayConfig.localPort),
      remotePort: config.get("tunnel.remoteAgentPort", saved.remotePort || defaultTunnelGatewayConfig.remotePort),
      token: config.get("tunnel.agentToken", saved.token),
    });
  }

  private loadSetupConfig(): MobaXtermTunnelSetupConfig {
    const saved = this.context.globalState.get<Partial<MobaXtermTunnelSetupConfig>>(keys.setupConfig)
      || this.context.workspaceState.get<Partial<MobaXtermTunnelSetupConfig>>(keys.setupConfig)
      || {};
    const config = vscode.workspace.getConfiguration("zlkCluster");
    return normalizeMobaXtermSetupConfig({
      ...defaultMobaXtermTunnelSetupConfig,
      ...saved,
      localForwardPort: this.tunnelConfig.localPort,
      remoteAgentPort: this.tunnelConfig.remotePort,
      mobaxtermExePath: saved.mobaxtermExePath || this.tunnelConfig.mobaxtermExePath || "",
      workerRealtimeMode: config.get("tunnel.workerRealtimeMode", saved.workerRealtimeMode || "hub_only"),
      workerTunnels: config.get("tunnel.workerTunnels", saved.workerTunnels || []),
    });
  }

  private async applySetupDraft(patch: Partial<MobaXtermTunnelSetupConfig>): Promise<void> {
    const next = normalizeMobaXtermSetupConfig({
      ...this.setupConfig,
      ...patch,
    });
    this.setupConfig = next;
    this.tunnelConfig = normalizeTunnelGatewayConfig({
      ...this.tunnelConfig,
      connectionMode: "mobaxterm_tunnel_realtime",
      localPort: next.localForwardPort,
      remotePort: next.remoteAgentPort,
      mobaxtermExePath: next.mobaxtermExePath,
      allowStreaming: true,
      refreshProfile: "realtime",
    });
    await this.saveState();
    this.resetClient();
    this.postState();
  }

  private async saveState(): Promise<void> {
    await this.context.globalState.update(keys.tunnelConfig, this.tunnelConfig);
    await this.context.globalState.update(keys.setupConfig, this.setupConfig);
  }

  private resetClient(): void {
    this.budget = new RequestBudget(requestBudgetConfigFromTunnel(this.tunnelConfig));
    this.client = this.createClient();
    this.startAvailabilityPushLoop();
  }

  private createClient(): MultiEndpointRealtimeClient {
    return new MultiEndpointRealtimeClient(this.realtimeEndpoints(), (endpoint) => {
      if (endpoint.id === "hub") return this.budget;
      return new RequestBudget(requestBudgetConfigFromTunnel(this.tunnelConfig));
    }, defaultRealtimeRefreshPolicy, (state) => {
      this.lastRealtimeState = state;
      void this.pushLocalWorkerAvailability(false);
      this.postState();
    });
  }

  private realtimeEndpoints(): NamedTunnelEndpointConfig[] {
    const registry = buildTunnelEndpointRegistry(this.setupConfig);
    return registry.endpoints.filter((endpoint) => endpoint.enabled).map((endpoint) => ({
      id: endpoint.id,
      role: endpoint.role === "hub_control" ? "hub" : "worker",
      displayName: endpoint.displayName,
      localHost: "127.0.0.1",
      localPort: endpoint.tunnel.localPort,
      token: this.tunnelConfig.token,
      timeoutMs: 8_000,
    }));
  }

  private tunnelLaunchItems(): Array<{ id: string; role: "hub" | "worker"; config: MobaXtermTunnelSetupConfig }> {
    const items: Array<{ id: string; role: "hub" | "worker"; config: MobaXtermTunnelSetupConfig }> = [
      { id: "hub", role: "hub", config: normalizeMobaXtermSetupConfig({ ...this.setupConfig, workerRealtimeMode: "hub_only", workerTunnels: [] }) },
    ];
    if (this.setupConfig.workerRealtimeMode !== "hub_plus_workers") return items;
    for (const worker of this.setupConfig.workerTunnels.filter((item) => item.enabled)) {
      items.push({ id: worker.id, role: "worker", config: workerTunnelToSetupConfig(this.setupConfig, worker) });
    }
    return items;
  }

  private buildState(): Record<string, unknown> {
    const realtime = this.client.diagnostics();
    return {
      connectionMode: this.tunnelConfig.connectionMode,
      localEndpoint: localBaseUrl(this.tunnelConfig),
      setup: publicSetupSummary(this.setupConfig),
      health: this.lastHealth || { state: "unknown", checkedAt: "" },
      realtime,
      probe: this.lastProbe,
      integrationReport: this.lastIntegrationReport,
      capabilities: this.lastProbe?.capabilities,
      fileCapabilities: this.lastProbe?.fileCapabilities,
      lastSeq: realtime.lastSeq,
      lastHeartbeatAt: realtime.lastHeartbeatAt,
      lastSnapshotAt: this.lastSnapshotAt,
      lastKnownGood: this.lastRealtimeState?.lastKnownGood || this.lastSnapshot || this.offlineBundle?.snapshot,
      offline: this.offlineBundle ? { lastImportedAt: this.offlineBundle.lastImportedAt, schemaVersion: this.offlineBundle.schemaVersion } : undefined,
      diagnostics: redactTunnelDiagnostics({
        connectionMode: this.tunnelConfig.connectionMode,
        localEndpoint: localBaseUrl(this.tunnelConfig),
        directAccessDisabled: true,
        requests: this.budget.snapshot(),
        health: this.lastHealth,
        realtime,
        probe: this.lastProbe,
        capabilities: this.lastProbe?.capabilities,
        fileCapabilities: this.lastProbe?.fileCapabilities,
        integrationReport: this.lastIntegrationReport,
        lastSnapshotAt: this.lastSnapshotAt,
        lastError: this.lastError,
      }),
      lastError: this.lastError,
    };
  }

  private postState(): void {
    if (!this.view) return;
    void this.view.webview.postMessage({ type: "state", state: this.buildState() });
  }

  private integration(): MobaXtermIntegration {
    return new MobaXtermIntegration({
      configuredPath: this.setupConfig.mobaxtermExePath,
      workspaceRoot: workspaceRoot(),
      token: this.tunnelConfig.token,
    });
  }

  private healthFromProbe(probe: TunnelProbeResult): TunnelHealth {
    const state = probe.status === "ok" ? "agent_ok" : probe.status === "file_api_unavailable" ? "file_api_unavailable" : probe.status === "local_port_closed" ? "local_port_closed" : "agent_unreachable";
    return {
      state,
      status: state,
      checkedAt: new Date().toISOString(),
      localForwardPort: probe.localForwardPort,
      remoteAgentPort: probe.remoteAgentPort,
      latencyMs: probe.latencyMs,
      agentVersion: probe.agentVersion,
      fileApiOk: probe.fileApiOk,
      message: probe.message,
    };
  }
}

function renderHtml(): string {
  const nonce = String(Date.now());
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZLK Cluster</title>
  <style>
    body { margin: 0; padding: 16px; font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-sideBar-background); }
    h2 { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
    h3 { margin: 18px 0 8px; font-size: 13px; font-weight: 600; }
    .row { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 8px; padding: 4px 0; }
    .label { color: var(--vscode-descriptionForeground); }
    .value { overflow-wrap: anywhere; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; padding: 6px 9px; border-radius: 3px; cursor: pointer; }
    button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; padding: 10px; background: var(--vscode-textCodeBlock-background); border-radius: 4px; max-height: 240px; overflow: auto; }
    .ok { color: var(--vscode-testing-iconPassed); }
    .warn { color: var(--vscode-editorWarning-foreground); }
  </style>
</head>
<body>
  <h2>MobaXterm Tunnel Realtime</h2>
  <div id="summary"></div>
  <div class="toolbar">
    <button data-command="configure">Configure</button>
    <button data-command="start">Start MobaXterm</button>
    <button data-command="test">Test Tunnel</button>
    <button data-command="restart">Restart Stream</button>
    <button data-command="pauseStream" class="secondary">Pause Stream</button>
    <button data-command="resumeStream" class="secondary">Resume Stream</button>
    <button data-command="pauseAll" class="secondary">Pause All</button>
    <button data-command="resumeNetwork" class="secondary">Resume Network</button>
    <button data-command="snapshot" class="secondary">Manual Snapshot</button>
    <button data-command="script" class="secondary">Generate Script</button>
    <button data-command="status" class="secondary">Status</button>
    <button data-command="offline" class="secondary">Offline Import</button>
  </div>
  <h3>Status</h3>
  <pre id="details">Waiting...</pre>
  <h3>Policy</h3>
  <pre>Plugin connects through MobaXterm local port forwarding to Hub Agent.
Plugin never connects directly to Hub or Worker.
Realtime status, logs, and file transfer use 127.0.0.1:&lt;port&gt; only.
If tunnel is unavailable, fix MobaXterm tunnel or use offline_import.</pre>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const summary = document.getElementById("summary");
    const details = document.getElementById("details");
    document.querySelectorAll("button[data-command]").forEach((button) => {
      button.addEventListener("click", () => vscode.postMessage({ command: button.dataset.command }));
    });
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.type !== "state") return;
      const state = event.data.state;
      const health = state.health || {};
      const realtime = state.realtime || {};
      const paused = state.diagnostics && state.diagnostics.requests && state.diagnostics.requests.paused;
      summary.innerHTML = [
        row("Mode", state.connectionMode),
        row("Endpoint", state.localEndpoint),
        row("Tunnel health", health.state || "unknown", health.state === "agent_ok" || health.state === "stream_connected" ? "ok" : "warn"),
        row("Stream", realtime.streamStatus || "disconnected"),
        row("Last seq", String(realtime.lastSeq || 0)),
        row("Heartbeat", realtime.lastHeartbeatAt || "-"),
        row("Reconnects", String(realtime.reconnectCount || 0)),
        row("Paused", paused ? "yes" : "no"),
        row("Last error", state.lastError || "-"),
      ].join("");
      details.textContent = JSON.stringify(state.diagnostics, null, 2);
    });
    function row(label, value, klass) {
      return '<div class="row"><div class="label">' + esc(label) + '</div><div class="value ' + (klass || "") + '">' + esc(value || "-") + '</div></div>';
    }
    function esc(value) {
      return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    }
  </script>
</body>
</html>`;
}

async function pickLocalSshServer(current: MobaXtermTunnelSetupConfig): Promise<{ server?: LocalSshServerInfo; cancelled: boolean }> {
  const servers = await readLocalSshServers();
  if (!servers.length) return { cancelled: false };
  const items: Array<vscode.QuickPickItem & { server?: LocalSshServerInfo; manual?: boolean }> = servers.map((server) => ({
    label: server.hostName,
    description: `${server.user || current.hubUser || "用户名未填"}@${server.hostName}:${server.port}`,
    detail: `本机 SSH 配置名称：${server.name}`,
    server,
  }));
  items.push({
    label: "手动填写服务器 IP/域名",
    description: "没有合适条目时选择",
    detail: "后续填写服务器 IP/域名、登录用户名、SSH 端口号。",
    manual: true,
  });
  const picked = await vscode.window.showQuickPick(items, {
    title: "选择服务器",
    placeHolder: "优先从本机 ~/.ssh/config 选择已保存服务器；没有就手动填写。",
    ignoreFocusOut: true,
  });
  if (!picked) return { cancelled: true };
  if (picked.manual) return { cancelled: false };
  return { server: picked.server, cancelled: false };
}

function setupFromLocalSshServer(current: MobaXtermTunnelSetupConfig, server: LocalSshServerInfo): MobaXtermTunnelSetupConfig {
  return normalizeMobaXtermSetupConfig({
    ...current,
    hubHost: server.hostName || current.hubHost,
    hubUser: server.user || current.hubUser,
    hubSshPort: server.port || current.hubSshPort,
    sshConfigAlias: server.name || current.sshConfigAlias,
    privateKeyPath: server.identityFile || current.privateKeyPath,
  });
}

async function input(title: string, value: string, placeHolder?: string): Promise<string | undefined> {
  return vscode.window.showInputBox({ title, value, placeHolder, ignoreFocusOut: true });
}

async function inputPort(title: string, value: number): Promise<number | undefined> {
  const raw = await vscode.window.showInputBox({
    title,
    value: String(value),
    ignoreFocusOut: true,
    validateInput: (text) => {
      const port = Number(text);
      return Number.isInteger(port) && port >= 1024 && port <= 65535 ? undefined : "Port must be 1024-65535.";
    },
  });
  return raw === undefined ? undefined : Number(raw);
}

function workspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}