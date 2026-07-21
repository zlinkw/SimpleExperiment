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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const RequestBudget_1 = require("./tunnel/RequestBudget");
const TunnelGateway_1 = require("./tunnel/TunnelGateway");
const RealtimeTunnelClient_1 = require("./tunnel/RealtimeTunnelClient");
const TunnelHealth_1 = require("./tunnel/TunnelHealth");
const MobaXtermSetup_1 = require("./tunnel/MobaXtermSetup");
const MobaXtermLauncher_1 = require("./tunnel/MobaXtermLauncher");
const MobaXtermIntegration_1 = require("./tunnel/MobaXtermIntegration");
const MobaXtermCommandBuilder_1 = require("./tunnel/MobaXtermCommandBuilder");
const OfflineImport_1 = require("./tunnel/OfflineImport");
const TunnelDiagnostics_1 = require("./tunnel/TunnelDiagnostics");
const TunnelOnlyPolicy_1 = require("./tunnel/TunnelOnlyPolicy");
const viewId = "zlkCluster.panel";
const keys = {
    tunnelConfig: "zlkCluster.tunnelGatewayConfig",
    setupConfig: "zlkCluster.mobaXtermRealtimeTunnelConfig",
    migrationShown: "zlkCluster.legacyRemoteMigrationShown",
    offlineBundle: "zlkCluster.offlineBundle",
    uiLayout: "zlkCluster.uiLayout",
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
const defaultUiLayout = {
    order: defaultUiSectionOrder,
    collapsed: { servers: true },
    manual: false,
};
const uiActionCommands = new Set([
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
const actionCommandMap = {
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
let provider;
function activate(context) {
    provider = new RealtimeTunnelPanelProvider(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(viewId, provider, { webviewOptions: { retainContextWhenHidden: true } }), vscode.commands.registerCommand("zlkCluster.openPanel", () => vscode.commands.executeCommand(`${viewId}.focus`)), vscode.commands.registerCommand("zlkCluster.configureMobaXtermRealtimeTunnel", () => provider?.configureMobaXtermRealtimeTunnel()), vscode.commands.registerCommand("zlkCluster.startMobaXtermRealtimeTunnel", () => provider?.startMobaXtermRealtimeTunnel()), vscode.commands.registerCommand("zlkCluster.testMobaXtermTunnel", () => provider?.testTunnel(true)), vscode.commands.registerCommand("zlkCluster.restartRealtimeStream", () => provider?.restartRealtimeStream()), vscode.commands.registerCommand("zlkCluster.pauseRealtimeStream", () => provider?.pauseRealtimeStream()), vscode.commands.registerCommand("zlkCluster.resumeRealtimeStream", () => provider?.resumeRealtimeStream()), vscode.commands.registerCommand("zlkCluster.pauseAllNetworkActivity", () => provider?.pauseAllNetworkActivity()), vscode.commands.registerCommand("zlkCluster.generateMobaXtermTunnelScript", () => provider?.generateTunnelScript()), vscode.commands.registerCommand("zlkCluster.openTunnelStatus", () => provider?.openTunnelStatus()), vscode.commands.registerCommand("zlkCluster.runMobaXtermRealIntegrationCheck", () => provider?.runMobaXtermRealIntegrationCheck()), vscode.commands.registerCommand("zlkCluster.manualRefresh", () => provider?.manualSnapshot()), vscode.commands.registerCommand("zlkCluster.importOfflineBundle", () => provider?.importOffline()));
    void provider.migrateLegacyConfigOnce();
}
function deactivate() {
    void provider?.dispose();
    provider = undefined;
}
class RealtimeTunnelPanelProvider {
    context;
    view;
    tunnelConfig;
    setupConfig;
    budget;
    client;
    lastHealth;
    lastSnapshot;
    lastRealtimeState;
    lastProbe;
    lastIntegrationReport;
    lastSnapshotAt;
    lastError;
    offlineBundle;
    selectedLogRunKey;
    selectedPlanId;
    selectedExperimentIds = new Set();
    selectedRunKey;
    selectedArchiveKeys = new Set();
    selectedRemoteFile;
    planFileInput;
    recentPlans = [];
    remoteFilePath = "zlk_cluster";
    remoteFileEntries = [];
    remoteFileError;
    resultsSummary;
    auditTail;
    debugBundlePath;
    actionErrors = [];
    localOperations = {};
    xshellLibrary = { searchedDirs: [], existingDirs: [], sessions: [] };
    xshellLibraryError;
    constructor(context) {
        this.context = context;
        this.tunnelConfig = this.loadTunnelConfig();
        this.setupConfig = this.loadSetupConfig();
        this.budget = new RequestBudget_1.RequestBudget((0, TunnelGateway_1.requestBudgetConfigFromTunnel)(this.tunnelConfig));
        this.client = this.createClient();
    }
    resolveWebviewView(webviewView) {
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
    async dispose() {
        for (const timer of this.operationTimers.values())
            clearTimeout(timer);
        this.operationTimers.clear();
        await this.client.disconnect("deactivate").catch(() => undefined);
        this.view = undefined;
    }
    async migrateLegacyConfigOnce() {
        if (this.context.workspaceState.get(keys.migrationShown))
            return;
        const config = vscode.workspace.getConfiguration("zlkCluster");
        const legacy = (0, TunnelOnlyPolicy_1.migrateLegacyRemoteConfig)({ ...config });
        await this.context.workspaceState.update(keys.migrationShown, true);
        if (legacy.removedFields.length)
            void vscode.window.showWarningMessage(legacy.warning);
    }
    async importMobaXtermServerConfigs() {
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
        if (!hub)
            return;
        const workerServers = await pickWorkerServers(servers.filter((server) => server.name !== hub.name), this.setupConfig);
        if (!workerServers)
            return;
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
    async configureMobaXtermRealtimeTunnel() {
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
        if (hubHost === undefined)
            return;
        const hubUser = await input("Hub user", this.setupConfig.hubUser, "user; empty when SSH alias is used");
        if (hubUser === undefined)
            return;
        const hubSshPort = await inputPort("Hub SSH port", this.setupConfig.hubSshPort);
        if (hubSshPort === undefined)
            return;
        let localForwardPort = await inputPort("Local forward port", this.setupConfig.localForwardPort);
        if (localForwardPort === undefined)
            return;
        if (!(await (0, MobaXtermLauncher_1.isLocalPortAvailable)(localForwardPort))) {
            const recommended = await (0, MobaXtermLauncher_1.recommendAvailableLocalPort)(localForwardPort + 1);
            const answer = await vscode.window.showWarningMessage(`127.0.0.1:${localForwardPort} is occupied. Recommended available port: ${recommended}.`, "Use Recommended", "Keep Current", "Cancel");
            if (answer === "Cancel")
                return;
            if (answer === "Use Recommended")
                localForwardPort = recommended;
        }
        const remoteAgentPort = await inputPort("Remote agent port", this.setupConfig.remoteAgentPort);
        if (remoteAgentPort === undefined)
            return;
        const sshConfigAlias = await input("SSH config alias (optional)", this.setupConfig.sshConfigAlias || "", "Used instead of host/user when set");
        if (sshConfigAlias === undefined)
            return;
        const next = (0, MobaXtermSetup_1.normalizeMobaXtermSetupConfig)({
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
        const errors = (0, MobaXtermSetup_1.validateMobaXtermSetupConfig)(next);
        if (errors.length) {
            void vscode.window.showErrorMessage(errors.join(" "));
            return;
        }
        this.setupConfig = next;
        this.tunnelConfig = (0, TunnelGateway_1.normalizeTunnelGatewayConfig)({
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
    async startMobaXtermRealtimeTunnel() {
        const errors = (0, MobaXtermSetup_1.validateMobaXtermSetupConfig)(this.setupConfig);
        if (errors.length) {
            void vscode.window.showErrorMessage(`${errors.join(" ")} Configure realtime tunnel first.`);
            return;
        }
        if (!(await (0, MobaXtermLauncher_1.isLocalPortAvailable)(this.setupConfig.localForwardPort))) {
            const proceed = await vscode.window.showWarningMessage(`127.0.0.1:${this.setupConfig.localForwardPort} is occupied. If this is running tunnel, test it now.`, "Test Tunnel", "Cancel");
            if (proceed === "Test Tunnel")
                await this.testTunnel(true);
            return;
        }
        const integration = this.integration();
        const preview = integration.buildTunnelCommand(this.setupConfig);
        const answer = await vscode.window.showWarningMessage(`Start MobaXterm with visible window. No password/passphrase is saved. Host key checking is not disabled.\n\n${preview.redactedShellCommand}`, { modal: true }, "Start Tunnel");
        if (answer !== "Start Tunnel")
            return;
        const launch = await integration.launchTunnel(this.setupConfig);
        if (!launch.launched) {
            void vscode.window.showErrorMessage(`${launch.message} ${launch.error || ""}`.trim());
            return;
        }
        if (this.setupConfig.autoTestTunnelAfterStart)
            setTimeout(() => void this.testTunnel(true), 2500).unref?.();
    }
    async startAllMobaXtermRealtimeTunnels() {
        const launchItems = this.tunnelLaunchItems();
        const errors = launchItems.flatMap((item) => (0, MobaXtermSetup_1.validateMobaXtermSetupConfig)(item.config).map((error) => `${item.id}: ${error}`));
        if (errors.length) {
            void vscode.window.showErrorMessage(`${errors.join(" ")} 请先导入或配置隧道。`);
            return;
        }
        const answer = await vscode.window.showWarningMessage(`即将启动 ${launchItems.length} 个 MobaXterm 隧道。插件仍只访问 127.0.0.1，本地实时状态会从 Hub 和已配置 Worker 隧道聚合。\n\n${launchItems.map((item) => `${item.id}: 127.0.0.1:${item.config.localForwardPort} -> 127.0.0.1:${item.config.remoteAgentPort}`).join("\n")}`, { modal: true }, "启动全部隧道");
        if (answer !== "启动全部隧道")
            return;
        const integration = this.integration();
        const results = [];
        for (const item of launchItems) {
            if (!(await (0, MobaXtermLauncher_1.isLocalPortAvailable)(item.config.localForwardPort))) {
                results.push(`${item.id}: 本地端口已打开，跳过启动`);
                continue;
            }
            const launch = await integration.launchTunnel(item.config);
            results.push(`${item.id}: ${launch.launched ? "已发出启动命令" : launch.message}`);
            if (!launch.launched && launch.error)
                results.push(`${item.id}: ${launch.error}`);
        }
        void vscode.window.showInformationMessage(results.join("；"));
        if (this.setupConfig.autoTestTunnelAfterStart)
            setTimeout(() => void this.testTunnel(true), 2500).unref?.();
    }
    async testTunnel(userInitiated = false) {
        (0, TunnelOnlyPolicy_1.assertTunnelOnlyMode)(this.tunnelConfig.connectionMode);
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
        }
        catch (error) {
            this.lastHealth = (0, TunnelHealth_1.classifyTunnelHealth)({
                configured: Boolean(this.setupConfig.mobaxtermExePath),
                paused: error instanceof RequestBudget_1.RequestBudgetDeniedError && error.decision.reason === "paused",
                rateLimited: error instanceof RequestBudget_1.RequestBudgetDeniedError && error.decision.reason === "rate_limited",
                error,
            });
            this.lastError = this.lastHealth.message;
        }
        if (userInitiated)
            this.postState();
    }
    async runMobaXtermRealIntegrationCheck() {
        if (this.tunnelConfig.connectionMode === "offline_import")
            return;
        const integration = this.integration();
        const preview = integration.buildTunnelCommand(this.setupConfig);
        const answer = await vscode.window.showWarningMessage(`Run real integration check through 127.0.0.1:${this.setupConfig.localForwardPort}.\n\n${preview.redactedShellCommand}`, { modal: true }, "Check Existing Tunnel", "Launch And Check");
        if (!answer)
            return;
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
    async restartRealtimeStream() {
        if (this.tunnelConfig.connectionMode === "offline_import")
            return;
        try {
            await this.client.reconnect("manual restart");
            this.lastError = undefined;
        }
        catch (error) {
            this.lastError = errorMessage(error);
        }
        this.postState();
    }
    async pauseRealtimeStream() {
        await this.client.disconnect("paused");
        this.postState();
    }
    async resumeRealtimeStream() {
        if (this.tunnelConfig.connectionMode === "offline_import")
            return;
        try {
            await this.client.connect(this.lastRealtimeState?.lastSeq || 0);
            this.lastError = undefined;
        }
        catch (error) {
            this.lastError = errorMessage(error);
        }
        this.postState();
    }
    async pauseAllNetworkActivity() {
        this.client.pauseAll();
        await this.client.disconnect("paused");
        this.lastHealth = { state: "paused", status: "paused", checkedAt: new Date().toISOString(), message: "All network activity paused." };
        this.postState();
    }
    resumeNetwork() {
        this.client.resume();
        this.postState();
    }
    async manualSnapshot() {
        if (this.tunnelConfig.connectionMode === "offline_import") {
            void vscode.window.showInformationMessage("Offline mode does not access network. Import offline bundle.");
            return;
        }
        try {
            const snapshot = await this.client.getSnapshot();
            this.lastSnapshot = snapshot;
            this.lastSnapshotAt = new Date().toISOString();
            this.lastError = undefined;
        }
        catch (error) {
            this.lastError = errorMessage(error);
        }
        this.postState();
    }
    async generateTunnelScript() {
        const errors = (0, MobaXtermSetup_1.validateMobaXtermSetupConfig)(this.setupConfig);
        if (errors.length) {
            void vscode.window.showErrorMessage(`${errors.join(" ")} Configure tunnel first.`);
            return;
        }
        const target = await vscode.window.showSaveDialog({
            title: "Save MobaXterm tunnel script",
            defaultUri: vscode.Uri.file(path.join(workspaceRoot() || process.cwd(), "start-zlk-mobaxterm-realtime-tunnel.bat")),
            filters: { "Batch script": ["bat"], "PowerShell script": ["ps1"] },
        });
        if (!target)
            return;
        const text = target.fsPath.toLowerCase().endsWith(".ps1") ? (0, MobaXtermCommandBuilder_1.generateMobaXtermPs1Script)(this.setupConfig) : (0, MobaXtermCommandBuilder_1.generateMobaXtermBatScript)(this.setupConfig);
        await fs.writeFile(target.fsPath, text, "utf8");
    }
    async openTunnelStatus() {
        const doc = await vscode.workspace.openTextDocument({ language: "json", content: JSON.stringify(this.buildState(), null, 2) });
        await vscode.window.showTextDocument(doc, { preview: true });
    }
    async importOffline() {
        const picked = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: true,
            canSelectMany: false,
            title: "Select offline bundle JSON or directory",
            filters: { "Offline bundle": ["json"], "All files": ["*"] },
        });
        const source = picked?.[0]?.fsPath;
        if (!source)
            return;
        const result = await (0, OfflineImport_1.importOfflineBundle)(source);
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
    async handleMessage(message) {
        const command = typeof message === "object" && message ? String(message.command || "") : "";
        if (command === "configure")
            await this.configureMobaXtermRealtimeTunnel();
        else if (command === "start")
            await this.startMobaXtermRealtimeTunnel();
        else if (command === "test")
            await this.testTunnel(true);
        else if (command === "restart")
            await this.restartRealtimeStream();
        else if (command === "pauseStream")
            await this.pauseRealtimeStream();
        else if (command === "resumeStream")
            await this.resumeRealtimeStream();
        else if (command === "pauseAll")
            await this.pauseAllNetworkActivity();
        else if (command === "resumeNetwork")
            this.resumeNetwork();
        else if (command === "snapshot")
            await this.manualSnapshot();
        else if (command === "script")
            await this.generateTunnelScript();
        else if (command === "status")
            await this.openTunnelStatus();
        else if (command === "offline")
            await this.importOffline();
    }
    loadTunnelConfig() {
        const saved = this.context.globalState.get(keys.tunnelConfig)
            || this.context.workspaceState.get(keys.tunnelConfig)
            || {};
        const config = vscode.workspace.getConfiguration("zlkCluster");
        return (0, TunnelGateway_1.normalizeTunnelGatewayConfig)({
            ...TunnelGateway_1.defaultTunnelGatewayConfig,
            ...saved,
            connectionMode: config.get("connectionMode", saved.connectionMode || "mobaxterm_tunnel_realtime"),
            localPort: config.get("tunnel.localForwardPort", saved.localPort || TunnelGateway_1.defaultTunnelGatewayConfig.localPort),
            remotePort: config.get("tunnel.remoteAgentPort", saved.remotePort || TunnelGateway_1.defaultTunnelGatewayConfig.remotePort),
            token: config.get("tunnel.agentToken", saved.token),
        });
    }
    loadSetupConfig() {
        const saved = this.context.globalState.get(keys.setupConfig)
            || this.context.workspaceState.get(keys.setupConfig)
            || {};
        const config = vscode.workspace.getConfiguration("zlkCluster");
        return (0, MobaXtermSetup_1.normalizeMobaXtermSetupConfig)({
            ...MobaXtermSetup_1.defaultMobaXtermTunnelSetupConfig,
            ...saved,
            localForwardPort: this.tunnelConfig.localPort,
            remoteAgentPort: this.tunnelConfig.remotePort,
            mobaxtermExePath: saved.mobaxtermExePath || this.tunnelConfig.mobaxtermExePath || "",
            workerRealtimeMode: config.get("tunnel.workerRealtimeMode", saved.workerRealtimeMode || "hub_only"),
            workerTunnels: config.get("tunnel.workerTunnels", saved.workerTunnels || []),
        });
    }
    async applySetupDraft(patch) {
        const next = (0, MobaXtermSetup_1.normalizeMobaXtermSetupConfig)({
            ...this.setupConfig,
            ...patch,
        });
        this.setupConfig = next;
        this.tunnelConfig = (0, TunnelGateway_1.normalizeTunnelGatewayConfig)({
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
    async saveState() {
        await this.context.globalState.update(keys.tunnelConfig, this.tunnelConfig);
        await this.context.globalState.update(keys.setupConfig, this.setupConfig);
    }
    resetClient() {
        this.budget = new RequestBudget_1.RequestBudget((0, TunnelGateway_1.requestBudgetConfigFromTunnel)(this.tunnelConfig));
        this.client = this.createClient();
        this.startAvailabilityPushLoop();
    }
    createClient() {
        return new MultiEndpointRealtimeClient(this.realtimeEndpoints(), (endpoint) => {
            if (endpoint.id === "hub")
                return this.budget;
            return new RequestBudget_1.RequestBudget((0, TunnelGateway_1.requestBudgetConfigFromTunnel)(this.tunnelConfig));
        }, RealtimeTunnelClient_1.defaultRealtimeRefreshPolicy, (state) => {
            this.lastRealtimeState = state;
            void this.pushLocalWorkerAvailability(false);
            this.postState();
        });
    }
    realtimeEndpoints() {
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
    tunnelLaunchItems() {
        const items = [
            { id: "hub", role: "hub", config: (0, MobaXtermSetup_1.normalizeMobaXtermSetupConfig)({ ...this.setupConfig, workerRealtimeMode: "hub_only", workerTunnels: [] }) },
        ];
        if (this.setupConfig.workerRealtimeMode !== "hub_plus_workers")
            return items;
        for (const worker of this.setupConfig.workerTunnels.filter((item) => item.enabled)) {
            items.push({ id: worker.id, role: "worker", config: workerTunnelToSetupConfig(this.setupConfig, worker) });
        }
        return items;
    }
    buildState() {
        const realtime = this.client.diagnostics();
        return {
            connectionMode: this.tunnelConfig.connectionMode,
            localEndpoint: (0, TunnelGateway_1.localBaseUrl)(this.tunnelConfig),
            setup: (0, MobaXtermSetup_1.publicSetupSummary)(this.setupConfig),
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
            diagnostics: (0, TunnelDiagnostics_1.redactTunnelDiagnostics)({
                connectionMode: this.tunnelConfig.connectionMode,
                localEndpoint: (0, TunnelGateway_1.localBaseUrl)(this.tunnelConfig),
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
    postState() {
        if (!this.view)
            return;
        void this.view.webview.postMessage({ type: "state", state: this.buildState() });
    }
    integration() {
        return new MobaXtermIntegration_1.MobaXtermIntegration({
            configuredPath: this.setupConfig.mobaxtermExePath,
            workspaceRoot: workspaceRoot(),
            token: this.tunnelConfig.token,
        });
    }
    healthFromProbe(probe) {
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
function renderHtml() {
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
async function pickLocalSshServer(current) {
    const servers = await readLocalSshServers();
    if (!servers.length)
        return { cancelled: false };
    const items = servers.map((server) => ({
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
    if (!picked)
        return { cancelled: true };
    if (picked.manual)
        return { cancelled: false };
    return { server: picked.server, cancelled: false };
}
function setupFromLocalSshServer(current, server) {
    return (0, MobaXtermSetup_1.normalizeMobaXtermSetupConfig)({
        ...current,
        hubHost: server.hostName || current.hubHost,
        hubUser: server.user || current.hubUser,
        hubSshPort: server.port || current.hubSshPort,
        sshConfigAlias: server.name || current.sshConfigAlias,
        privateKeyPath: server.identityFile || current.privateKeyPath,
    });
}
async function input(title, value, placeHolder) {
    return vscode.window.showInputBox({ title, value, placeHolder, ignoreFocusOut: true });
}
async function inputPort(title, value) {
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
function workspaceRoot() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
