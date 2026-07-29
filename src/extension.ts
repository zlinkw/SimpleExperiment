// @ts-nocheck
import * as vscode from "vscode";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import * as os from "os";
import RequestBudget_1 = require("./tunnel/RequestBudget");
import TunnelGateway_1 = require("./tunnel/TunnelGateway");
import RealtimeEventReducer_1 = require("./tunnel/RealtimeEventReducer");
import RealtimeTunnelClient_1 = require("./tunnel/RealtimeTunnelClient");
import FileTransferTypes_1 = require("./tunnel/FileTransferTypes");
import TunnelHealth_1 = require("./tunnel/TunnelHealth");
import XshellTunnelSetup_1 = require("./tunnel/XshellTunnelSetup");
import XshellTunnelLauncher_1 = require("./tunnel/XshellTunnelLauncher");
import XshellTunnelIntegration_1 = require("./tunnel/XshellTunnelIntegration");
import XshellTunnelCommandBuilder_1 = require("./tunnel/XshellTunnelCommandBuilder");
import XshellTunnelPortProbe_1 = require("./tunnel/XshellTunnelPortProbe");
import XshellSessionLauncher_1 = require("./tunnel/XshellSessionLauncher");
import AgentTmuxPolicy_1 = require("./tunnel/AgentTmuxPolicy");
import XshellSessionScanner_1 = require("./tunnel/XshellSessionScanner");
import XshellSessionPatcher_1 = require("./tunnel/XshellSessionPatcher");
import OfflineImport_1 = require("./tunnel/OfflineImport");
import TunnelDiagnostics_1 = require("./tunnel/TunnelDiagnostics");
import TunnelOnlyPolicy_1 = require("./tunnel/TunnelOnlyPolicy");
import MultiEndpointRealtimeClient_1 = require("./tunnel/MultiEndpointRealtimeClient");
import PanelHtml_1 = require("./ui/PanelHtml");
const { renderPanelHtml } = PanelHtml_1;
import PanelRecoveryHtml_1 = require("./ui/PanelRecoveryHtml");
const { renderPanelRecoveryHtml } = PanelRecoveryHtml_1;
import PanelBootstrap_1 = require("./ui/PanelBootstrap");
const { renderPanelBootstrapDocument } = PanelBootstrap_1;
import TunnelPortAllocator_1 = require("./tunnel/TunnelPortAllocator");
import TunnelEndpointRegistry_1 = require("./tunnel/TunnelEndpointRegistry");
import TunnelPortConflict_1 = require("./tunnel/TunnelPortConflict");
import ConfigurationSettings_1 = require("./tunnel/ConfigurationSettings");
import WorkspacePathMapper_1 = require("./core/WorkspacePathMapper");
import HostOperationLease_1 = require("./core/HostOperationLease");
import BoundedTimestampMap_1 = require("./core/BoundedTimestampMap");
import Results_1 = require("./features/Results");
import PlanBuilder_1 = require("./features/PlanBuilder");
import { planStaticConfigReferences, planRuntimeConfigReferences, pythonCliParameterAudit, pythonLocalImportReferences, restorePlanText } from "./features/PlanArchive";
import ProjectAdapterTemplates_1 = require("./templates/ProjectAdapterTemplates");
import PptPlotBridge_1 = require("./PptPlotBridge");
import GpuHistoryState_1 = require("./features/GpuHistoryState");
import TopologyMode_1 = require("./features/TopologyMode");
import WorkerPlanSharding_1 = require("./features/WorkerPlanSharding");
import RenamedExtensionStateMigration_1 = require("./config/RenamedExtensionStateMigration");
type TunnelAction = string;
type UiActionError = {
    command: string;
    action?: TunnelAction;
    message: string;
    suggestion?: string;
    capabilityMissing?: string[];
    timestamp: string;
};
type StandardActionRequest = {
    opId: string;
    operationId?: string;
};
type WebviewClusterState = Record<string, unknown>;
type RealtimeState = Record<string, unknown>;
type ProjectStatePersistenceQueue = {
    dirty: boolean;
    promise?: Promise<void>;
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
    | "checkClaimEvidence"
    | "checkOutputContract"
    | "parseCaseLevel"
    | "runLeakageCheck"
    | "runSubgroupAnalysis"
    | "exportCaseAnalysis"
    | "planCheckpointRetention"
    | "inspectDataset"
    | "exportPlottingContract"
    | "plotResultsToPpt"
    | "inferConfigFromRun"
    | "recoverPlanFromRun"
    | "diagnoseResultAnomaly"
    | "compareWithBestConfig"
    | "archiveArtifacts"
    | "excludeResults"
    | "syncArtifacts"
    | "completeThreeWay"
    | "deleteArtifacts"
    | "reconcileDeletions"
    | "selfCheck"
    | "createDebugBundle"
    | "downloadDebugBundle"
    | "openAuditTail"
    | "publishGithub"
    | "syncGithub"
    | "overwriteGithub"
    | "uploadProjectToHub"
    | "uploadProjectToWorkers"
    | "distributeCodeToWorkers"
    | "deployLatestAgent"
    | "configureSftpIgnores"
    | "clearLegacyTasks"
    | "selectExperiment"
    | "selectPlan";
const viewId = "zlkCluster.panel";
const keys = {
    tunnelConfig: "zlkCluster.tunnelGatewayConfig",
    setupConfig: "zlkCluster.xshellRealtimeTunnelConfig",
    migrationShown: "zlkCluster.legacyRemoteMigrationShown",
    offlineBundle: "zlkCluster.offlineBundle",
    uiLayout: "zlkCluster.uiLayout",
    uiProjectActions: "zlkCluster.uiProjectActions",
    uiProjectLayout: "zlkCluster.uiProjectLayout",
    hiddenLegacyTaskUiKeys: "zlkCluster.hiddenLegacyTaskUiKeys",
    pptPlotConfig: "zlkCluster.pptPlotConfig",
    firstRunSetupPrompt: "simpleExperiment.firstRunSetupPromptVersion",
    projectOnboardingPrompt: "simpleExperiment.projectOnboardingPromptVersion",
    projectOnboardingCompleted: "simpleExperiment.projectOnboardingCompleted",
    legacySftpNoticeShown: "simpleExperiment.legacySftpNoticeShown",
    pendingWorkspaceContinuation: "simpleExperiment.pendingWorkspaceContinuation",
};
const FIRST_RUN_SETUP_PROMPT_VERSION = 4;
const WORKSPACE_CONTINUATION_MAX_AGE_MS = 10 * 60_000;
const SIMPLE_SFTP_EXTENSION_ID = "simple-local.simple-sftp";
const LEGACY_SFTP_EXTENSION_ID = "zlk-local.zlk-sftp-manager";
const SIMPLE_SFTP_REQUIRED_COMMANDS = [
    "simpleSftp.uploadWorkspace",
    "simpleSftp.uploadFiles",
    "simpleSftp.configureIgnores",
];
const defaultUiSectionOrder = [
    "plans",
    "results",
    "tasks",
    "servers",
    "settings",
    "overview",
    "gpu",
    "sync",
    "operations",
    "diagnostics",
];
const defaultUiLayout = {
    order: defaultUiSectionOrder,
    collapsed: { overview: false, plans: false, results: false, tasks: false, servers: false, settings: true, gpu: true, sync: true, operations: true, diagnostics: true },
    resourceTreeChildren: {},
    manual: false,
    columns: { tree: 280, inspector: 360 },
    treePinned: false,
    inspectorPinned: false,
    pinnedCommands: ["testAll", "snapshot", "startAllConnections", "runPlan", "parseResults", "configureSftpIgnores"],
    detailActions: [],
    pinnedActions: [],
};
const LOCAL_OPERATION_RECORD_LIMIT = 120;
const STATE_OPERATION_RECORD_LIMIT = 120;
const TERMINAL_OPERATION_RECORD_LIMIT = 80;
const ABNORMAL_OPERATION_RECORD_LIMIT = 80;
const WEBVIEW_FILE_TRANSFER_ACTIVE_LIMIT = 16;
const WEBVIEW_FILE_TRANSFER_TERMINAL_LIMIT = 8;
const WEBVIEW_GPU_PROCESS_LIMIT = 8;
const WEBVIEW_GPU_PROCESS_COMMAND_LIMIT = 360;
const WEBVIEW_LOCAL_PLAN_LIMIT = 80;
const WEBVIEW_ARCHIVED_PLAN_LIMIT = 40;
const WEBVIEW_PLAN_CASE_LIMIT = 24;
const WEBVIEW_PLAN_OUTPUT_LIMIT = 16;
const WEBVIEW_CONFIG_SUMMARY_LIMIT = 40;
const WEBVIEW_CONFIG_SUMMARY_PARAM_LIMIT = 16;
const WEBVIEW_ADAPTER_INFERRED_SIGNAL_LIMIT = 12;
const WEBVIEW_ADAPTER_RULE_LIST_LIMIT = 40;
const WEBVIEW_ADAPTER_RULE_MAP_LIMIT = 80;
const SCHEDULER_STATE_RECORD_LIMIT = 240;
const SCHEDULER_ACTIVE_BUCKET_LIMIT = 160;
const SCHEDULER_TERMINAL_BUCKET_LIMIT = 80;
const UI_ACTION_ERROR_RECORD_LIMIT = 8;
const UI_ACTION_ERROR_MESSAGE_LIMIT = 480;
const UI_ACTION_ERROR_SUGGESTION_LIMIT = 240;
const UI_ACTION_ERROR_CAPABILITY_LIMIT = 8;
const XSHELL_BATCH_LAUNCH_DELAY_MS = 1500;
const SCHEDULER_STATE_CONTAINER_LIMIT = 24;
const EXPERIMENT_TRACE_RECORD_LIMIT = 240;
const EXPERIMENT_TRACE_ATTENTION_LIMIT = 120;
class UiCommandCancelled extends Error {
    constructor(message = "用户取消操作。") {
        super(message);
        this.name = "UiCommandCancelled";
    }
}
class UiCommandRemotePending extends Error {
    constructor(message = "远端操作已提交，等待 Agent operation 终态。") {
        super(message);
        this.name = "UiCommandRemotePending";
    }
}
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
    "checkClaimEvidence",
    "checkOutputContract",
    "parseCaseLevel",
    "runLeakageCheck",
    "runSubgroupAnalysis",
    "exportCaseAnalysis",
    "planCheckpointRetention",
    "inspectDataset",
    "exportPlottingContract",
    "plotResultsToPpt",
    "inferConfigFromRun",
    "recoverPlanFromRun",
    "diagnoseResultAnomaly",
    "compareWithBestConfig",
    "archiveArtifacts",
    "excludeResults",
    "syncArtifacts",
    "completeThreeWay",
    "deleteArtifacts",
    "reconcileDeletions",
    "selfCheck",
    "createDebugBundle",
    "downloadDebugBundle",
    "openAuditTail",
    "publishGithub",
    "syncGithub",
    "overwriteGithub",
    "uploadProjectToHub",
    "uploadProjectToWorkers",
    "distributeCodeToWorkers",
    "deployLatestAgent",
    "configureSftpIgnores",
    "clearLegacyTasks",
    "selectExperiment",
    "selectPlan",
]);
const SAFE_WEBVIEW_COMMANDS = new Set([
    "webviewReady", "webviewBootstrapError", "webviewRenderError", "reloadPanel", "quickSetup", "configureSessions", "configureAgentSessions", "writeAgentCommands", "saveTopologyMode", "saveHubConfig", "saveSchedulerConfig", "saveWorkerConfig", "addWorkerConfig", "deleteWorkerConfig", "startTunnelEndpoint", "startAgentEndpoint", "configureWorkers", "configurePorts", "repairPorts", "configure", "startHub", "startWorker", "start", "startAll", "startAgents", "startAllConnections", "prepareAgents", "test", "testAll", "showRegistry", "restart", "pauseStream", "resumeStream", "pauseAll",
    "resumeNetwork", "snapshot", "manualGpuSnapshot", "loadGpuHistory", "manualSchedulerSnapshot", "manualTracesSnapshot", "selectLogRunKey", "openSetupGuide", "openAdvancedCommandsSetting",
    "script", "realCheck", "status", "offline", "openPlan", "savePlan", "archivePlan", "restoreArchivedPlan", "runAllPlans", "generatePlanGuide", "bootstrapProject", "generateOutputAdapter", "saveProjectAdapterRules", "savePptPlotConfig", "choosePptPath", "chooseNewPptPath", "plotResultsToPpt", "refreshPptAutomation", "startPptAutomation", "openPptAutomationGuide", "clearLegacyTasks", "saveUiLayout", "resetUiLayout",
    "selectPlan", "selectExperiment",
    "publishGithub", "syncGithub", "overwriteGithub", "uploadProjectToHub", "uploadProjectToWorkers", "distributeCodeToWorkers", "deployLatestAgent", "configureSftpIgnores", "resetRemotePathConfirmations", "resetPptPathConfirmations", "downloadDebugBundle", "downloadRemoteResult", "openResultArtifact", "openAuditTail",
]);
const COMMANDS_WITHOUT_UI_STATUS = new Set(["selectPlan", "selectExperiment", "selectLogRunKey", "openPlan", "status"]);
const LOCAL_COMMAND_RELEASES_AFTER_TRIGGER = new Set(["startAllConnections", "testAll", "snapshot"]);
const UI_LAYOUT_SECTION_KEYS = new Set(defaultUiSectionOrder);
const PINNED_UI_COMMANDS = new Set([
    "startAllConnections", "prepareAgents", "testAll", "snapshot", "runPlan", "runAllPlans", "archivePlan", "validatePlan", "dryRunPlan",
    "parseResults", "refreshResults", "runQualityGate", "runStatistics", "checkClaimEvidence", "exportPaperTable",
    "checkOutputContract", "parseCaseLevel", "runLeakageCheck", "runSubgroupAnalysis", "exportCaseAnalysis", "plotResultsToPpt",
    "publishGithub", "syncGithub", "overwriteGithub", "uploadProjectToHub", "uploadProjectToWorkers",
    "distributeCodeToWorkers", "deployLatestAgent", "configureSftpIgnores", "selfCheck",
    "createDebugBundle", "pauseAll", "resumeNetwork",
]);
const UI_BUTTON_ACTION_COMMANDS = new Set([
    ...defaultUiLayout.pinnedCommands,
    ...uiActionCommands,
    "quickSetup", "openSetupGuide", "configureSessions", "configureAgentSessions", "writeAgentCommands",
    "saveTopologyMode", "saveHubConfig", "saveSchedulerConfig", "saveWorkerConfig", "addWorkerConfig", "deleteWorkerConfig",
    "startTunnelEndpoint", "startAgentEndpoint", "configureWorkers", "configurePorts", "repairPorts", "configure",
    "startHub", "startWorker", "start", "startAll", "startAgents", "startAllConnections", "prepareAgents", "test", "testAll",
    "showRegistry", "restart", "pauseStream", "resumeStream", "pauseAll", "resumeNetwork", "snapshot",
    "manualGpuSnapshot", "manualSchedulerSnapshot", "manualTracesSnapshot", "selectLogRunKey", "script",
    "realCheck", "status", "offline", "openPlan", "savePlan", "archivePlan", "runAllPlans",
    "generatePlanGuide", "bootstrapProject", "generateOutputAdapter", "saveProjectAdapterRules", "savePptPlotConfig", "choosePptPath", "chooseNewPptPath", "plotResultsToPpt", "refreshPptAutomation", "startPptAutomation", "openPptAutomationGuide", "saveUiLayout", "resetUiLayout",
    "downloadDebugBundle", "downloadRemoteResult", "openAuditTail", "selectPlan", "selectExperiment",
]);
const UI_BUTTON_PAYLOAD_KEYS = new Set([
    "endpointId", "planFile", "planId", "file", "runKey", "taskUiKey", "experimentId",
    "archiveKey", "experimentIndex", "gpuId", "workerId", "remotePath", "savePlan", "batchSelected",
    "sourcePath", "sourceLabel", "presentationPath", "chartType", "styleMode",
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
    checkClaimEvidence: "check-claim-evidence",
    checkOutputContract: "check-output-contract",
    parseCaseLevel: "parse-case-level",
    runLeakageCheck: "run-leakage-check",
    runSubgroupAnalysis: "run-subgroup-analysis",
    exportCaseAnalysis: "export-case-analysis",
    planCheckpointRetention: "plan-checkpoint-retention",
    inspectDataset: "inspect-dataset",
    exportPlottingContract: "export-plotting-contract",
    inferConfigFromRun: "infer-config-from-run",
    recoverPlanFromRun: "recover-plan-from-run",
    diagnoseResultAnomaly: "diagnose-result-anomaly",
    compareWithBestConfig: "compare-with-best-config",
    archiveArtifacts: "archive-artifacts",
    excludeResults: "exclude-results",
    syncArtifacts: "sync-artifacts",
    completeThreeWay: "complete-three-way",
    deleteArtifacts: "delete-artifacts",
    reconcileDeletions: "reconcile-deletions",
    selfCheck: "self-check",
    createDebugBundle: "create-debug-bundle",
};
const directWorkerActionMap = {
    stopExperiment: "stop-worker-task",
    retryExperiment: "retry-worker-task",
    archiveArtifacts: "archive-worker-artifacts",
    deleteArtifacts: "delete-worker-artifacts",
};
const noHubWorkerResultActions = new Set([
    "refresh-results", "rescan-results", "parse-results", "run-quality-gate", "run-statistics", "export-paper-table",
    "check-claim-evidence", "check-output-contract", "parse-case-level", "run-leakage-check", "run-subgroup-analysis",
    "export-case-analysis", "plan-checkpoint-retention", "inspect-dataset", "export-plotting-contract", "infer-config-from-run",
    "recover-plan-from-run", "diagnose-result-anomaly", "compare-with-best-config", "archive-artifacts", "exclude-results",
    "sync-artifacts", "complete-three-way",
]);
const workerPoolResultFanoutActions = new Set(["refresh-results", "rescan-results", "parse-results"]);
let provider;
export function activate(context) {
    return activateExtension(context);
}
async function activateExtension(context) {
    await (0, RenamedExtensionStateMigration_1.migrateRenamedExtensionState)(context).catch(() => undefined);
    provider = new RealtimeTunnelPanelProvider(context);
    const hostCommand = (commandId, actionType, actionLabel, operation) => vscode.commands.registerCommand(commandId, (...args) => provider?.withHostOperationLease(actionType, actionLabel, () => operation(...args)));
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(viewId, provider, { webviewOptions: { retainContextWhenHidden: true } }),
        vscode.commands.registerCommand("zlkCluster.openPanel", () => vscode.commands.executeCommand(`${viewId}.focus`)),
        hostCommand("zlkCluster.quickSetup", "quick-setup", "一键配置", () => provider?.quickSetup()),
        hostCommand("zlkCluster.configureXshellSavedSessions", "configure-xshell-sessions", "配置 Xshell 会话", () => provider?.configureXshellSavedSessions()),
        hostCommand("zlkCluster.configureXshellAgentSessions", "configure-agent-sessions", "配置 Agent 会话", () => provider?.configureXshellAgentSessions()),
        hostCommand("zlkCluster.writeXshellAgentStartupCommands", "write-agent-commands", "写入 Agent 启动命令", () => provider?.writeXshellAgentStartupCommands()),
        hostCommand("zlkCluster.configureWorkerTunnels", "configure-worker-tunnels", "配置 Worker 隧道", () => provider?.configureWorkerTunnels()),
        hostCommand("zlkCluster.configureTunnelPorts", "configure-tunnel-ports", "配置隧道端口", () => provider?.configureTunnelPorts()),
        hostCommand("zlkCluster.configureXshellRealtimeTunnel", "configure-xshell-tunnel", "配置 Xshell 隧道", () => provider?.configureXshellRealtimeTunnel()),
        hostCommand("zlkCluster.startHubTunnel", "start-hub-tunnel", "启动 Hub 隧道", () => provider?.startHubTunnel()),
        hostCommand("zlkCluster.startWorkerTunnel", "start-worker-tunnel", "启动 Worker 隧道", () => provider?.startWorkerTunnel()),
        hostCommand("zlkCluster.startXshellRealtimeTunnel", "start-xshell-tunnel", "启动 Xshell 隧道", () => provider?.startXshellRealtimeTunnel()),
        hostCommand("zlkCluster.startAllXshellRealtimeTunnels", "start-all-tunnels", "启动全部 Xshell 隧道", () => provider?.startAllXshellRealtimeTunnels()),
        hostCommand("zlkCluster.startAllXshellAgentSessions", "start-agent-sessions", "启动全部 Agent 会话", () => provider?.startAllXshellAgentSessions()),
        hostCommand("zlkCluster.startAllXshellConnections", "start-all-connections", "启动全部 Xshell 连接", () => provider?.startAllXshellConnections()),
        vscode.commands.registerCommand("zlkCluster.testAllTunnels", () => provider?.testTunnel(true)),
        vscode.commands.registerCommand("zlkCluster.showTunnelEndpointRegistry", () => provider?.showTunnelEndpointRegistry()),
        vscode.commands.registerCommand("zlkCluster.testXshellTunnel", () => provider?.testTunnel(true)),
        hostCommand("zlkCluster.restartRealtimeStream", "restart-realtime-stream", "重启实时流", () => provider?.restartRealtimeStream()),
        hostCommand("zlkCluster.pauseRealtimeStream", "pause-realtime-stream", "暂停实时流", () => provider?.pauseRealtimeStream()),
        hostCommand("zlkCluster.resumeRealtimeStream", "resume-realtime-stream", "恢复实时流", () => provider?.resumeRealtimeStream()),
        hostCommand("zlkCluster.pauseAllNetworkActivity", "pause-network", "暂停网络活动", () => provider?.pauseAllNetworkActivity()),
        hostCommand("zlkCluster.generateXshellTunnelScript", "write-tunnel-script", "生成 Xshell 启动脚本", () => provider?.generateTunnelScript()),
        vscode.commands.registerCommand("zlkCluster.openTunnelStatus", () => provider?.openTunnelStatus()),
        vscode.commands.registerCommand("zlkCluster.runXshellRealIntegrationCheck", () => provider?.runXshellRealIntegrationCheck()),
        vscode.commands.registerCommand("zlkCluster.manualRefresh", () => provider?.manualSnapshot()),
        hostCommand("zlkCluster.importOfflineBundle", "import-offline-bundle", "导入离线包", () => provider?.importOffline()),
    );
    context.subscriptions.push(
        hostCommand("zlkCluster.bootstrapProject", "bootstrap-project", "接入当前项目", () => provider?.bootstrapProjectFromUi()),
        hostCommand("zlkCluster.prepareAgents", "prepare-agents", "准备 Agent 并启动", () => provider?.prepareAgentsForFirstRun()),
    );
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => void provider?.handleConfigurationChanged(event)));
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => void provider?.handleWorkspaceFoldersChanged()));
    void provider.runActivationOnboarding();
    context.subscriptions.push(vscode.commands.registerCommand("simpleExperiment.openSetupGuide", () => provider?.openSetupGuide()));
}
export function deactivate() {
    void provider?.dispose();
    provider = undefined;
}
async function runOnboardingSteps(steps, onError = async () => undefined) {
    for (const step of steps) {
        try {
            await step.run();
        }
        catch (error) {
            try {
                await onError(step.name, error);
            }
            catch {
                // Background onboarding must continue even if error reporting fails.
            }
        }
    }
}
function createSingleFlightRunner() {
    let inFlight;
    return (operation) => {
        if (inFlight)
            return inFlight;
        const current = Promise.resolve().then(operation).finally(() => {
            if (inFlight === current)
                inFlight = undefined;
        });
        inFlight = current;
        return current;
    };
}
function setupGuideNextStep(options) {
    const item = options || {};
    if (item.simpleSftpReady === false) {
        return {
            message: `配置说明已打开。下一步：先安装或升级配套 SimpleSFTP。${String(item.simpleSftpMessage || "")}`,
            action: "打开扩展管理",
        };
    }
    if (!item.setupComplete) {
        return {
            message: "配置说明已打开。下一步：选择 Xshell 会话并填写 Hub/Worker 项目父目录。",
            action: "开始一键配置",
        };
    }
    if (Number(item.workerCount || 0) < 1) {
        return {
            message: "配置说明已打开。Hub 已配置；下一步：添加至少一个执行 Worker。",
            action: "添加 Worker",
        };
    }
    if (!item.workspaceOpen) {
        return {
            message: "配置说明已打开。服务器已配置；下一步：打开要运行实验的本地项目文件夹。",
            action: "选择项目并继续",
        };
    }
    return {
        message: "配置说明已打开。服务器和本地项目已就绪；下一步：接入当前项目。",
        action: "接入当前项目",
    };
}
const SETUP_GUIDE_MAX_STEPS = 4;
class RealtimeTunnelPanelProvider {
    context;
    hostOperationLease = new HostOperationLease_1.HostOperationLeaseManager();
    view;
    tunnelConfig;
    setupConfig;
    budget;
    client;
    lastHealth;
    lastSnapshot;
    lastRealtimeState;
    lastProbe;
    lastWorkerProbes = {};
    lastFullEndpointProbeAt = 0;
    lastIntegrationReport;
    lastSnapshotAt;
    lastError;
    offlineBundle;
    selectedLogRunKey;
    selectedPlanId;
    selectedExperimentIds = new Set();
    selectedRunKeys = new Set();
    selectedRunKey;
    selectedArchiveKeys = new Set();
    selectedTaskUiKeys = new Set();
    hiddenLegacyTaskUiKeys = new Set();
    private readonly planSelectionPersistenceQueue: ProjectStatePersistenceQueue = { dirty: false };
    private readonly taskSelectionPersistenceQueue: ProjectStatePersistenceQueue = { dirty: false };
    private readonly projectStatePersistenceQueues = new Map<string, ProjectStatePersistenceQueue>();
    planFileInput;
    planFileWatchers = [];
    planFileWatchRoot = "";
    planFileWatchPlanDir = "";
    planLocalChangeParseTimer;
    recentPlans = [];
    resultsSummary;
    resultsSummaryRefreshTimer;
    lastResultsSummaryRefreshedDirtyKey = "";
    pendingResultsSummaryDirtyKey = "";
    pendingResultsSummaryDirtyPlanFile = "";
    lastResultsSummaryRealtimeErrorKey = "";
    lastResultsSummaryCapabilityWarningKey = "";
    lastResultsSummaryCapabilitySkippedDirtyKey = "";
    resultsSummaryRefreshRetryCount = 0;
    resultsSummaryRefreshInFlight = false;
    private statePostTimer?: ReturnType<typeof setTimeout>;
    private statePostRetryTimer?: ReturnType<typeof setTimeout>;
    private statePostPending = false;
    private statePostInFlight = false;
    private statePostRetryCount = 0;
    private lastPostedStateSignature = "";
    private lastStateBuildErrorSignature = "";
    private lastStatePostErrorSignature = "";
    private readonly statePostBatchMs = 100;
    private readonly statePostRetryMax = 3;
    private readonly statePostRetryBaseMs = 500;
    webviewReady = false;
    panelReadyWatchdogTimer;
    pendingPanelNavigation;
    operationStatusProbeMaxAttempts = 4;
    private realtimeUiStateRefs?: RealtimeUiStateRefs;
    private lastRealtimeHeartbeatPostAt = 0;
    private readonly realtimeHeartbeatPostMinMs = 60_000;
    private lastAvailabilityGpuSignature = "";
    private readonly gpuHistoryState = new GpuHistoryState_1.GpuHistoryStateCache();
    auditTail;
    debugBundlePath;
    actionErrors = [];
    projectPptPlotConfig;
    pptAutomationReadiness = (0, PptPlotBridge_1.defaultPptAutomationReadiness)();
    pptAutomationRefreshPromise;
    projectUiLayout;
    localOperations = {};
    localOperationsDirty = false;
    private localOperationsPersistPromise?: Promise<void>;
    operationTimers = new Map();
    operationProbeTimers = new Map();
    workerActionInFlight = new Map();
    workerActionLastAt = new Map();
    workerActionAdmissionLocks = new Map();
    workerActionReleaseWaiters = new Map();
    workerActionLastAtLimit = 256;
    availabilityPushTimer;
    lastAvailabilityPushAt = 0;
    lastCodeSyncState = {};
    confirmedRemotePaths = [];
    confirmedPptPaths = [];
    localPlanMetadata = { planDir: "experiments/plans", detectedProject: {}, plans: [] };
    localPlanMetadataRefreshPromise;
    workspaceChangePromise;
    projectBootstrapPromise;
    firstRunSetupPromptSingleFlight = createSingleFlightRunner();
    localPlanMetadataUpdatedAt = 0;
    localPlanMetadataActionUpdatedAt = 0;
    localPlanMetadataKey = "";
    localPlanMetadataFullRefresh = false;
    projectContextGeneration = 0;
    localPlanMetadataRefreshMinIntervalMs = 5_000;
    localPlanMetadataActionRefreshMaxAgeMs = 60_000;
    xshellLibrary = { searchedDirs: [], existingDirs: [], sessions: [] };
    xshellLibraryError;
    xshellLibraryRefreshPromise;
    xshellLibraryUpdatedAt = 0;
    xshellLibraryDirsKey = "";
    xshellLibraryRefreshMinIntervalMs = 15_000;
    enabledWorkerConfigsCacheSource;
    enabledWorkerConfigsCacheValue = [];
    currentAssignmentsCacheConfig;
    currentAssignmentsCacheValue = [];
    currentPortConflictsCacheAssignments;
    currentPortConflictsCacheRangeKey = "";
    currentPortConflictsCacheValue = [];
    topologyRuntimeMode = "";
    constructor(context) {
        this.context = context;
        this.tunnelConfig = this.loadTunnelConfig();
        this.projectBootstrapPromise = this.bootstrapProjectLocalUiState()
            .catch(() => undefined)
            .finally(() => {
            this.ensureSelectedPlanFileWatchers("bootstrap");
        });
        this.setupConfig = this.loadSetupConfig();
        this.topologyRuntimeMode = this.projectTopologyAssessment().mode;
        this.budget = new RequestBudget_1.RequestBudget((0, TunnelGateway_1.requestBudgetConfigFromTunnel)(this.tunnelConfig));
        this.client = this.createClient();
    }
    enabledWorkerConfigs() {
        const source = this.setupConfig.workerTunnels;
        if (source === this.enabledWorkerConfigsCacheSource)
            return this.enabledWorkerConfigsCacheValue;
        this.enabledWorkerConfigsCacheSource = source;
        this.enabledWorkerConfigsCacheValue = source.filter((worker) => worker.enabled !== false);
        return this.enabledWorkerConfigsCacheValue;
    }
    async runActivationOnboarding() {
        await runOnboardingSteps([
            { name: "legacyConfigMigration", run: () => this.migrateLegacyConfigOnce() },
            { name: "workspaceContinuation", run: () => this.resumePendingWorkspaceContinuation() },
            { name: "projectStateBootstrap", run: () => this.projectBootstrapPromise },
            { name: "firstRunPrompt", run: () => this.showFirstRunSetupPromptOnce() },
        ], (step, error) => this.recordOnboardingBackgroundError(step, error));
    }
    async recordOnboardingBackgroundError(step, error) {
        const message = errorMessage(error);
        this.lastError = message;
        this.recordActionError({
            command: `onboarding:${step}`,
            message,
            suggestion: "请重新打开 SimpleExperiment 面板或从命令面板执行“接入当前项目”。",
        });
        this.postState(true);
    }
    async bootstrapProjectLocalUiState() {
        const projectContext = this.captureProjectContext();
        await Promise.all([
            this.loadProjectPlanSelectionState().catch(() => undefined),
            this.loadProjectTaskSelectionState().catch(() => undefined),
            this.loadProjectOfflineBundleState().catch(() => undefined),
            this.loadProjectActionErrorsState().catch(() => undefined),
            this.loadProjectPptPlotConfigState().catch(() => undefined),
            this.loadProjectUiLayoutState().catch(() => undefined),
            this.loadProjectDebugBundleState().catch(() => undefined),
            this.loadProjectCodeSyncState().catch(() => undefined),
            this.loadProjectRemotePathConfirmationsState().catch(() => undefined),
            this.loadProjectPptPathConfirmationsState().catch(() => undefined),
            this.loadProjectLocalOperationsState().catch(() => undefined),
            this.loadProjectLocalPlanMetadataState().catch(() => undefined),
        ]);
        if (!this.projectContextIsCurrent(projectContext))
            return;
        await this.migrateLegacyProjectUiStateFromVsCode(projectContext).catch(() => undefined);
    }
    captureProjectContext() {
        return { generation: this.projectContextGeneration, root: workspaceRoot() };
    }
    projectContextIsCurrent(context) {
        return context?.generation === this.projectContextGeneration && context?.root === workspaceRoot();
    }
    async openWorkspaceFolderForContinuation(operation, action, payload = {}) {
        const picked = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            title: `${operation}：选择本地实验项目文件夹`,
            openLabel: "打开并继续",
        });
        const folder = picked?.[0];
        if (!folder)
            return false;
        await this.context.globalState.update(keys.pendingWorkspaceContinuation, {
            action,
            operation,
            ...payload,
            expectedRoot: folder.fsPath,
            requestedAt: Date.now(),
        });
        try {
            await vscode.commands.executeCommand("vscode.openFolder", folder, false);
        }
        catch (error) {
            await this.context.globalState.update(keys.pendingWorkspaceContinuation, undefined);
            throw error;
        }
        await this.resumePendingWorkspaceContinuation();
        return true;
    }
    async resumePendingWorkspaceContinuation() {
        const pending = this.context.globalState.get(keys.pendingWorkspaceContinuation);
        if (!pending || typeof pending !== "object")
            return false;
        const requestedAt = Number(pending.requestedAt || 0);
        if (!requestedAt || Date.now() - requestedAt > WORKSPACE_CONTINUATION_MAX_AGE_MS) {
            await this.context.globalState.update(keys.pendingWorkspaceContinuation, undefined);
            return false;
        }
        const root = workspaceRoot();
        if (!root || localPathKey(root) !== localPathKey(pending.expectedRoot || ""))
            return false;
        const folders = Array.isArray(vscode.workspace.workspaceFolders) ? vscode.workspace.workspaceFolders : [];
        await this.context.globalState.update(keys.pendingWorkspaceContinuation, undefined);
        if (folders.length !== 1) {
            void vscode.window.showWarningMessage(`已打开 ${folders.length} 个工作区文件夹，${String(pending.operation || "原操作")}未继续。请在独立 VS Code 窗口中只打开目标实验项目。`);
            return false;
        }
        await this.projectBootstrapPromise?.catch(() => undefined);
        if (this.workspaceChangePromise)
            await this.workspaceChangePromise.catch(() => undefined);
        try {
            if (pending.action === "bootstrapProject") {
                await this.bootstrapProjectFromUi();
                return true;
            }
            if (pending.action === "prepareAgents") {
                await this.prepareAgentsForFirstRun(true);
                return true;
            }
            if (pending.action === "quickSetup") {
                await this.completeQuickSetupAfterWorkspace(pending.showAgentCompletion !== false);
                return true;
            }
            if (pending.action === "setupGuide") {
                await this.openSetupGuide();
                return true;
            }
        }
        catch (error) {
            if (error instanceof UiCommandCancelled)
                return false;
            const message = errorMessage(error);
            this.lastError = message;
            this.recordActionError({ command: String(pending.action || "workspaceContinuation"), message, suggestion: "请确认当前窗口只打开目标实验项目，然后从项目关键入口重试。" });
            this.postState(true);
            void vscode.window.showWarningMessage(`${String(pending.operation || "原操作")}自动续接失败：${message}`);
            return false;
        }
        return false;
    }
    async readCurrentProjectState(reader) {
        const context = this.captureProjectContext();
        const value = await reader(context.root);
        return { current: this.projectContextIsCurrent(context), value };
    }
    handleWorkspaceFoldersChanged() {
        const previous = this.workspaceChangePromise || Promise.resolve();
        const current = previous.catch(() => undefined)
            .then(() => this.reloadProjectContextAfterWorkspaceChange())
            .then(() => this.showFirstRunSetupPromptOnce())
            .catch((error) => {
            const message = errorMessage(error);
            this.lastError = message;
            this.recordActionError({ command: "workspaceChanged", message, suggestion: "请保持当前窗口只打开一个项目，然后重新打开 SimpleExperiment 面板。" });
            this.postState(true);
        });
        this.workspaceChangePromise = current;
        void current.finally(() => {
            if (this.workspaceChangePromise === current)
                this.workspaceChangePromise = undefined;
        });
        return current;
    }
    async reloadProjectContextAfterWorkspaceChange() {
        this.resetProjectContextInMemory();
        this.topologyRuntimeMode = this.projectTopologyAssessment().mode;
        this.resetClient();
        await this.bootstrapProjectLocalUiState();
        await this.refreshLocalPlanMetadata({ post: false, force: true }).catch((error) => {
            this.localPlanMetadata = { ...this.localPlanMetadata, error: errorMessage(error) };
        });
        this.ensureSelectedPlanFileWatchers("workspace folders changed");
        if (this.isRealtimeMode() && initialServerSetupComplete(this.setupConfig, this.projectTopologyAssessment().hubAllowed))
            await this.testTunnel(false).catch(() => undefined);
        this.postState(true);
    }
    resetProjectContextInMemory() {
        this.projectContextGeneration += 1;
        this.disposeSelectedPlanFileWatchers();
        if (this.planLocalChangeParseTimer)
            clearTimeout(this.planLocalChangeParseTimer);
        this.planLocalChangeParseTimer = undefined;
        if (this.resultsSummaryRefreshTimer)
            clearTimeout(this.resultsSummaryRefreshTimer);
        this.resultsSummaryRefreshTimer = undefined;
        for (const timer of this.operationTimers.values())
            clearTimeout(timer);
        this.operationTimers.clear();
        for (const timer of this.operationProbeTimers.values())
            clearTimeout(timer);
        this.operationProbeTimers.clear();
        this.selectedPlanId = undefined;
        this.planFileInput = undefined;
        this.recentPlans = [];
        this.selectedExperimentIds.clear();
        this.selectedRunKeys.clear();
        this.selectedRunKey = undefined;
        this.selectedArchiveKeys.clear();
        this.selectedTaskUiKeys.clear();
        this.hiddenLegacyTaskUiKeys.clear();
        this.planSelectionPersistenceQueue.dirty = false;
        this.taskSelectionPersistenceQueue.dirty = false;
        for (const queue of this.projectStatePersistenceQueues.values())
            queue.dirty = false;
        this.selectedLogRunKey = undefined;
        this.offlineBundle = undefined;
        this.resultsSummary = undefined;
        this.auditTail = undefined;
        this.debugBundlePath = undefined;
        this.actionErrors = [];
        this.projectPptPlotConfig = undefined;
        this.projectUiLayout = undefined;
        this.localOperations = {};
        this.localOperationsDirty = false;
        this.lastCodeSyncState = {};
        this.confirmedRemotePaths = [];
        this.confirmedPptPaths = [];
        this.localPlanMetadata = { planDir: planDirSafe(), detectedProject: {}, plans: [], archivedPlans: [] };
        this.localPlanMetadataRefreshPromise = undefined;
        this.localPlanMetadataUpdatedAt = 0;
        this.localPlanMetadataActionUpdatedAt = 0;
        this.localPlanMetadataKey = "";
        this.localPlanMetadataFullRefresh = false;
        this.resultsSummaryRefreshInFlight = false;
        this.resultsSummaryRefreshRetryCount = 0;
        this.lastResultsSummaryRefreshedDirtyKey = "";
        this.pendingResultsSummaryDirtyKey = "";
        this.pendingResultsSummaryDirtyPlanFile = "";
        this.lastResultsSummaryRealtimeErrorKey = "";
        this.lastResultsSummaryCapabilityWarningKey = "";
        this.lastResultsSummaryCapabilitySkippedDirtyKey = "";
        this.lastSnapshot = undefined;
        this.lastRealtimeState = undefined;
        this.gpuHistoryState.reset();
        this.lastHealth = undefined;
        this.lastProbe = undefined;
        this.lastWorkerProbes = {};
        this.lastFullEndpointProbeAt = 0;
        this.lastIntegrationReport = undefined;
        this.lastSnapshotAt = undefined;
        this.lastError = undefined;
        this.lastPostedStateSignature = "";
    }
    async migrateLegacyProjectUiStateFromVsCode(projectContext = this.captureProjectContext()) {
        if (!this.projectContextIsCurrent(projectContext))
            return;
        const workspaceHiddenLegacyKeys = stringArrayConfig(this.context.workspaceState.get(keys.hiddenLegacyTaskUiKeys, []));
        const globalHiddenLegacyKeys = stringArrayConfig(this.context.globalState.get(keys.hiddenLegacyTaskUiKeys, []));
        const legacyHidden = uniqueStrings([...workspaceHiddenLegacyKeys, ...globalHiddenLegacyKeys]);
        if (legacyHidden.length) {
            for (const key of legacyHidden)
                this.hiddenLegacyTaskUiKeys.add(key);
            await this.persistProjectTaskSelectionState().catch(() => undefined);
            if (!this.projectContextIsCurrent(projectContext))
                return;
            await this.context.workspaceState.update(keys.hiddenLegacyTaskUiKeys, undefined);
            await this.context.globalState.update(keys.hiddenLegacyTaskUiKeys, undefined);
            if (!this.projectContextIsCurrent(projectContext))
                return;
        }
        const legacyOffline = this.context.workspaceState.get(keys.offlineBundle);
        if (!this.offlineBundle && legacyOffline) {
            this.offlineBundle = legacyOffline;
            await this.persistProjectOfflineBundleState().catch(() => undefined);
            if (!this.projectContextIsCurrent(projectContext))
                return;
            await this.context.workspaceState.update(keys.offlineBundle, undefined);
        }
        else if (legacyOffline) {
            await this.context.workspaceState.update(keys.offlineBundle, undefined);
        }
        if (!this.projectContextIsCurrent(projectContext))
            return;
        const legacyPpt = this.context.globalState.get(keys.pptPlotConfig);
        if (legacyPpt)
            await this.context.globalState.update(keys.pptPlotConfig, undefined);
        if (!this.projectContextIsCurrent(projectContext))
            return;
        const legacyLayout = this.context.workspaceState.get(keys.uiProjectLayout)
            || this.context.workspaceState.get(keys.uiProjectActions);
        if (!this.projectUiLayout && legacyLayout && typeof legacyLayout === "object") {
            this.projectUiLayout = normalizeUiProjectLayoutState(legacyLayout, defaultUiLayout);
            await this.persistProjectUiLayoutState().catch(() => undefined);
            if (!this.projectContextIsCurrent(projectContext))
                return;
            await this.context.workspaceState.update(keys.uiProjectLayout, undefined);
            await this.context.workspaceState.update(keys.uiProjectActions, undefined);
        }
        else if (legacyLayout) {
            await this.context.workspaceState.update(keys.uiProjectLayout, undefined);
            await this.context.workspaceState.update(keys.uiProjectActions, undefined);
        }
    }
    effectiveConnectionMode() {
        return this.offlineBundle ? "offline_import" : this.tunnelConfig.connectionMode;
    }
    isRealtimeMode() {
        return (0, TunnelGateway_1.isRealtimeConnectionMode)(this.effectiveConnectionMode());
    }
    async handleConfigurationChanged(event) {
        if (!event?.affectsConfiguration?.("zlkCluster"))
            return;
        const previousMode = this.effectiveConnectionMode();
        const topologyChanged = event.affectsConfiguration("zlkCluster.topologyMode");
        const connectionChanged = event.affectsConfiguration("zlkCluster.connectionMode")
            || event.affectsConfiguration("zlkCluster.tunnel");
        if (connectionChanged) {
            this.tunnelConfig = this.loadTunnelConfig();
            this.setupConfig = this.loadSetupConfig();
        }
        const topologyApplied = topologyChanged
            ? await this.applyTopologyRuntimeMode(this.projectTopologyAssessment().mode, "topology configuration changed")
            : false;
        if (connectionChanged && !topologyApplied) {
            this.resetClient();
        }
        if (connectionChanged && !topologyApplied && this.isRealtimeMode())
            await this.ensureRealtimeConnected("configuration changed");
        this.postState(true);
        const currentMode = this.effectiveConnectionMode();
        if (connectionChanged
            && !(0, TunnelGateway_1.isRealtimeConnectionMode)(previousMode)
            && (0, TunnelGateway_1.isRealtimeConnectionMode)(currentMode)) {
            const next = await vscode.window.showInformationMessage("SimpleExperiment 已切换为 Xshell 实时隧道模式，连接状态已立即刷新。", "继续接入当前项目");
            if (next === "继续接入当前项目" && workspaceRoot())
                await this.bootstrapProjectFromUi();
        }
    }
    async clearOfflineImport() {
        if (!this.offlineBundle)
            return;
        this.offlineBundle = undefined;
        this.applyOfflineResultsSummaryFromBundle(undefined);
        await this.persistProjectOfflineBundleState().catch(() => undefined);
        await this.context.workspaceState.update(keys.offlineBundle, undefined);
    }
    async loadProjectPlanSelectionState() {
        const loaded = await this.readCurrentProjectState(readProjectPlanSelectionState);
        const state = loaded.value;
        if (!loaded.current || !state)
            return;
        if (!this.selectedPlanId && state.selectedPlanId)
            this.selectedPlanId = state.selectedPlanId;
        if (!this.planFileInput && state.planFileInput)
            this.planFileInput = state.planFileInput;
        if (Array.isArray(state.recentPlans) && state.recentPlans.length)
            this.recentPlans = mergeRecentPlans(state.recentPlans, this.recentPlans);
    }
    async persistProjectPlanSelectionState() {
        await this.persistCoalescedProjectState(this.planSelectionPersistenceQueue, () => ({
            selectedPlanId: this.selectedPlanId || "",
            planFileInput: this.planFileInput || "",
            recentPlans: this.recentPlans || [],
            updatedAt: new Date().toISOString(),
        }), writeProjectPlanSelectionState);
    }
    reconcileProjectPlanSelection(plans) {
        const list = Array.isArray(plans) ? plans : [];
        const keys = new Set(list.flatMap((plan) => planIdentityKeys(plan)));
        if (this.selectedPlanId && !keys.has(this.selectedPlanId)) {
            const fileMatch = list.find((plan) => plan.planFile === this.selectedPlanId || plan.file === this.selectedPlanId || plan.planId === this.selectedPlanId);
            if (fileMatch) {
                this.selectedPlanId = fileMatch.planId || fileMatch.planFile || fileMatch.file || this.selectedPlanId;
                this.planFileInput = fileMatch.planFile || fileMatch.file || this.planFileInput;
            }
            else {
                this.selectedPlanId = undefined;
            }
        }
        if (this.planFileInput && !keys.has(this.planFileInput) && !list.some((plan) => plan.planFile === this.planFileInput || plan.file === this.planFileInput)) {
            const selected = list.find((plan) => plan.planId === this.selectedPlanId);
            this.planFileInput = selected?.planFile || selected?.file || undefined;
        }
        this.recentPlans = mergeRecentPlans(this.recentPlans, list).filter((row) => {
            const id = row.planId || row.planFile;
            return !id || keys.has(id) || list.some((plan) => plan.planFile === row.planFile || plan.file === row.planFile);
        });
    }
    async loadProjectTaskSelectionState() {
        const loaded = await this.readCurrentProjectState(readProjectTaskSelectionState);
        const state = loaded.value;
        if (!loaded.current || !state)
            return;
        if (!this.selectedExperimentIds.size && state.selectedExperimentIds.length)
            this.selectedExperimentIds = new Set(state.selectedExperimentIds);
        if (!this.selectedRunKeys.size && state.selectedRunKeys.length)
            this.selectedRunKeys = new Set(state.selectedRunKeys);
        if (!this.selectedArchiveKeys.size && state.selectedArchiveKeys.length)
            this.selectedArchiveKeys = new Set(state.selectedArchiveKeys);
        if (!this.selectedTaskUiKeys.size && state.selectedTaskUiKeys.length)
            this.selectedTaskUiKeys = new Set(state.selectedTaskUiKeys);
        if (!this.hiddenLegacyTaskUiKeys.size && state.hiddenLegacyTaskUiKeys.length)
            this.hiddenLegacyTaskUiKeys = new Set(state.hiddenLegacyTaskUiKeys);
        if (!this.selectedRunKey && state.selectedRunKey)
            this.selectedRunKey = state.selectedRunKey;
        if (!this.selectedLogRunKey && state.selectedLogRunKey)
            this.selectedLogRunKey = state.selectedLogRunKey;
        if (this.selectedRunKeys.size)
            this.client.setProtectedLogKeys(this.logProtectedKeys());
    }
    async persistProjectTaskSelectionState() {
        await this.persistCoalescedProjectState(this.taskSelectionPersistenceQueue, () => ({
            selectedExperimentIds: [...this.selectedExperimentIds],
            selectedRunKeys: [...this.selectedRunKeys],
            selectedArchiveKeys: [...this.selectedArchiveKeys],
            selectedTaskUiKeys: [...this.selectedTaskUiKeys],
            hiddenLegacyTaskUiKeys: [...this.hiddenLegacyTaskUiKeys],
            selectedRunKey: this.selectedRunKey || "",
            selectedLogRunKey: this.selectedLogRunKey || "",
            updatedAt: new Date().toISOString(),
        }), writeProjectTaskSelectionState);
    }
    private async persistCoalescedProjectState<T>(queue: ProjectStatePersistenceQueue, snapshot: () => T, write: (root: string | undefined, state: T) => Promise<void>) {
        queue.dirty = true;
        this.queueProjectStatePersistence(queue, snapshot, write);
        while (queue.promise) {
            const persistence = queue.promise;
            await persistence;
            if (queue.promise === persistence)
                break;
        }
    }
    private projectStatePersistenceQueue(key: string) {
        let queue = this.projectStatePersistenceQueues.get(key);
        if (!queue) {
            queue = { dirty: false };
            this.projectStatePersistenceQueues.set(key, queue);
        }
        return queue;
    }
    private queueProjectStatePersistence<T>(queue: ProjectStatePersistenceQueue, snapshot: () => T, write: (root: string | undefined, state: T) => Promise<void>) {
        if (queue.promise || !queue.dirty)
            return;
        const projectContext = this.captureProjectContext();
        let failed = false;
        let persistence: Promise<void>;
        persistence = (async () => {
            while (queue.dirty && this.projectContextIsCurrent(projectContext)) {
                const state = snapshot();
                queue.dirty = false;
                await write(projectContext.root, state);
            }
        })()
            .catch((error) => {
            failed = true;
            if (!this.projectContextIsCurrent(projectContext))
                return;
            queue.dirty = true;
            throw error;
        })
            .finally(() => {
            if (queue.promise === persistence)
                queue.promise = undefined;
            if (queue.dirty && (!failed || !this.projectContextIsCurrent(projectContext)))
                this.queueProjectStatePersistence(queue, snapshot, write);
        });
        queue.promise = persistence;
    }
    async loadProjectOfflineBundleState() {
        const loaded = await this.readCurrentProjectState(readProjectOfflineBundleState);
        const bundle = loaded.value;
        if (loaded.current && bundle) {
            this.offlineBundle = bundle;
            this.applyOfflineResultsSummaryFromBundle(bundle);
        }
    }
    async persistProjectOfflineBundleState() {
        await this.persistCoalescedProjectState(this.projectStatePersistenceQueue("offlineBundle"), () => this.offlineBundle, writeProjectOfflineBundleState);
    }
    applyOfflineResultsSummaryFromBundle(bundle) {
        if (!bundle) {
            if (this.resultsSummary && this.resultsSummary.__offlineImport === true)
                this.resultsSummary = undefined;
            if (this.auditTail && this.auditTail.__offlineImport === true)
                this.auditTail = undefined;
            return;
        }
        const raw = bundle.results && typeof bundle.results === "object" && !Array.isArray(bundle.results)
            ? bundle.results
            : (bundle.resultsSummary && typeof bundle.resultsSummary === "object" && !Array.isArray(bundle.resultsSummary)
                ? bundle.resultsSummary
                : (bundle.snapshot && typeof bundle.snapshot === "object" && bundle.snapshot.resultsSummary && typeof bundle.snapshot.resultsSummary === "object"
                    ? bundle.snapshot.resultsSummary
                    : undefined));
        const qualityGate = offlineBundleObjectField(bundle, ["qualityGate", "quality_gate"]);
        const paperTable = offlineBundleObjectField(bundle, ["paperTable", "paper_table"]);
        if (!raw) {
            this.resultsSummary = {
                schemaVersion: 1,
                resultCount: 0,
                results: [],
                finalResults: [],
                sources: [],
                planFile: this.planFileInput || this.selectedPlanId || "",
                __offlineImport: true,
                message: "离线 bundle 未包含 results_summary.json",
                ...(qualityGate ? { qualityGate } : {}),
                ...(paperTable ? { paperTable } : {}),
            };
        }
        else {
            this.resultsSummary = {
                ...raw,
                __offlineImport: true,
                planFile: raw.planFile || raw.plan_file || this.planFileInput || this.selectedPlanId || "",
                ...(qualityGate && !raw.qualityGate && !raw.quality_gate ? { qualityGate } : {}),
                ...(paperTable && !raw.paperTable && !raw.paper_table ? { paperTable } : {}),
            };
        }
        if (bundle.auditTail !== undefined && bundle.auditTail !== null) {
            const summary = auditTailSummaryForWebview(bundle.auditTail);
            this.auditTail = summary && typeof summary === "object"
                ? { ...summary, __offlineImport: true }
                : { preview: String(bundle.auditTail || ""), __offlineImport: true };
        }
    }
    async loadProjectActionErrorsState() {
        const loaded = await this.readCurrentProjectState(readProjectActionErrorsState);
        const rows = loaded.value;
        if (loaded.current && rows.length)
            this.actionErrors = rows.slice(0, UI_ACTION_ERROR_RECORD_LIMIT);
    }
    async persistProjectActionErrorsState() {
        await this.persistCoalescedProjectState(this.projectStatePersistenceQueue("actionErrors"), () => this.actionErrors, writeProjectActionErrorsState);
    }
    async loadProjectPptPlotConfigState() {
        const loaded = await this.readCurrentProjectState(readProjectPptPlotConfigState);
        const config = loaded.value;
        if (loaded.current && config)
            this.projectPptPlotConfig = config;
    }
    async persistProjectPptPlotConfigState() {
        await this.persistCoalescedProjectState(this.projectStatePersistenceQueue("pptPlotConfig"), () => this.projectPptPlotConfig, writeProjectPptPlotConfigState);
    }
    async loadProjectUiLayoutState() {
        const loaded = await this.readCurrentProjectState(readProjectUiLayoutState);
        const layout = loaded.value;
        if (loaded.current && layout)
            this.projectUiLayout = layout;
    }
    async persistProjectUiLayoutState() {
        await this.persistCoalescedProjectState(this.projectStatePersistenceQueue("uiLayout"), () => this.projectUiLayout, writeProjectUiLayoutState);
    }
    async loadProjectDebugBundleState() {
        const loaded = await this.readCurrentProjectState(readProjectDebugBundleState);
        const debugBundlePath = loaded.value;
        if (loaded.current && debugBundlePath)
            this.debugBundlePath = debugBundlePath;
    }
    async persistProjectDebugBundleState() {
        await this.persistCoalescedProjectState(this.projectStatePersistenceQueue("debugBundle"), () => this.debugBundlePath, writeProjectDebugBundleState);
    }
    async loadProjectCodeSyncState() {
        const loaded = await this.readCurrentProjectState(readProjectCodeSyncState);
        const codeSync = loaded.value;
        if (loaded.current && codeSync && typeof codeSync === "object")
            this.lastCodeSyncState = codeSync;
    }
    async persistProjectCodeSyncState() {
        await this.persistCoalescedProjectState(this.projectStatePersistenceQueue("codeSync"), () => this.lastCodeSyncState, writeProjectCodeSyncState);
    }
    async loadProjectRemotePathConfirmationsState() {
        const loaded = await this.readCurrentProjectState(readProjectRemotePathConfirmationsState);
        if (loaded.current)
            this.confirmedRemotePaths = mergeRemotePathConfirmations(loaded.value);
    }
    async persistProjectRemotePathConfirmationsState() {
        await this.persistCoalescedProjectState(this.projectStatePersistenceQueue("remotePathConfirmations"), () => this.confirmedRemotePaths, writeProjectRemotePathConfirmationsState);
    }
    async loadProjectPptPathConfirmationsState() {
        const loaded = await this.readCurrentProjectState(readProjectPptPathConfirmationsState);
        if (loaded.current)
            this.confirmedPptPaths = mergePptPathConfirmations(loaded.value);
    }
    async persistProjectPptPathConfirmationsState() {
        await this.persistCoalescedProjectState(this.projectStatePersistenceQueue("pptPathConfirmations"), () => this.confirmedPptPaths, writeProjectPptPathConfirmationsState);
    }
    async resetPptPathConfirmationsFromUi() {
        assertSingleProjectWorkspace("恢复 PPT 路径提醒");
        await this.loadProjectPptPathConfirmationsState();
        const count = this.confirmedPptPaths.length;
        if (!count) {
            void vscode.window.showInformationMessage("当前项目没有已关闭提醒的 PPT 目标路径。");
            return;
        }
        const answer = await vscode.window.showWarningMessage(`将清除当前项目已记住的 ${count} 个 PPT 目标路径。后续绘图会重新显示完整确认；PPT 文件、结果文件和绘图配置不会改变。`, { modal: true }, "恢复 PPT 路径提醒");
        if (answer !== "恢复 PPT 路径提醒")
            return;
        this.confirmedPptPaths = [];
        await this.persistProjectPptPathConfirmationsState();
        this.postState(true);
        void vscode.window.showInformationMessage(`已恢复当前项目 ${count} 个 PPT 目标路径的确认提醒。`);
    }
    async resetRemotePathConfirmationsFromUi() {
        assertSingleProjectWorkspace("恢复上传路径提醒");
        await this.loadProjectRemotePathConfirmationsState();
        const count = this.confirmedRemotePaths.length;
        if (!count) {
            void vscode.window.showInformationMessage("当前项目没有已关闭提醒的远端路径。");
            return;
        }
        const answer = await vscode.window.showWarningMessage(`将清除当前项目已记住的 ${count} 个远端路径。后续代码、Agent runtime 或忽略规则写入会重新显示完整路径确认；服务器配置、SimpleSFTP 配置和远端文件不会改变。`, { modal: true }, "恢复路径提醒");
        if (answer !== "恢复路径提醒")
            return;
        this.confirmedRemotePaths = [];
        await this.persistProjectRemotePathConfirmationsState();
        this.postState(true);
        void vscode.window.showInformationMessage(`已恢复当前项目 ${count} 个远端路径的上传确认提醒。`);
    }
    async loadProjectLocalOperationsState() {
        const loaded = await this.readCurrentProjectState(readProjectLocalOperationsState);
        const ops = loaded.value;
        if (!loaded.current)
            return;
        if (ops && typeof ops === "object")
            this.localOperations = compactOperationRecords(ops, LOCAL_OPERATION_RECORD_LIMIT, TERMINAL_OPERATION_RECORD_LIMIT);
        this.localOperationsDirty = false;
    }
    markLocalOperationsDirty() {
        this.localOperationsDirty = true;
    }
    private queueProjectLocalOperationsStatePersistence() {
        if (this.localOperationsPersistPromise || !this.localOperationsDirty)
            return false;
        const projectContext = this.captureProjectContext();
        let failed = false;
        let persistence: Promise<void>;
        persistence = (async () => {
            while (this.localOperationsDirty && this.projectContextIsCurrent(projectContext)) {
                this.localOperations = compactOperationRecords(this.localOperations, LOCAL_OPERATION_RECORD_LIMIT, TERMINAL_OPERATION_RECORD_LIMIT);
                const operations = this.localOperations;
                this.localOperationsDirty = false;
                await writeProjectLocalOperationsState(projectContext.root, operations);
            }
        })()
            .catch((error) => {
            failed = true;
            if (this.projectContextIsCurrent(projectContext))
                this.localOperationsDirty = true;
            throw error;
        })
            .finally(() => {
            if (this.localOperationsPersistPromise === persistence)
                this.localOperationsPersistPromise = undefined;
            if (this.localOperationsDirty && (!failed || !this.projectContextIsCurrent(projectContext)))
                this.queueProjectLocalOperationsStatePersistence();
        });
        this.localOperationsPersistPromise = persistence;
        void persistence.catch(() => undefined);
        return true;
    }
    async persistProjectLocalOperationsState(force = false) {
        if (force)
            this.localOperationsDirty = true;
        const queued = this.queueProjectLocalOperationsStatePersistence();
        const persistence = this.localOperationsPersistPromise;
        if (!persistence)
            return false;
        await persistence;
        return queued;
    }
    async loadProjectLocalPlanMetadataState() {
        const loaded = await this.readCurrentProjectState(readProjectLocalPlanMetadataState);
        const metadata = loaded.value;
        if (!loaded.current || !metadata)
            return;
        this.localPlanMetadata = {
            planDir: metadata.planDir || this.localPlanMetadata.planDir || "experiments/plans",
            detectedProject: metadata.detectedProject || {},
            plans: Array.isArray(metadata.plans) ? metadata.plans : [],
            archivedPlans: Array.isArray(metadata.archivedPlans) ? metadata.archivedPlans : [],
            ...(metadata.error ? { error: metadata.error } : {}),
        };
        if (Array.isArray(metadata.recentPlans) && metadata.recentPlans.length)
            this.recentPlans = mergeRecentPlans(this.recentPlans, metadata.recentPlans);
        else if (this.localPlanMetadata.plans.length)
            this.recentPlans = mergeRecentPlans(this.recentPlans, this.localPlanMetadata.plans);
        this.reconcileProjectPlanSelection(this.localPlanMetadata.plans || []);
        this.localPlanMetadataUpdatedAt = Date.now();
        this.localPlanMetadataActionUpdatedAt = Date.now();
        this.localPlanMetadataKey = `${workspaceRoot() || ""}::${this.localPlanMetadata.planDir || planDirSafe()}`;
        this.localPlanMetadataFullRefresh = false;
    }
    async persistProjectLocalPlanMetadataState() {
        await this.persistCoalescedProjectState(this.projectStatePersistenceQueue("localPlanMetadata"), () => ({
            ...this.localPlanMetadata,
            recentPlans: this.recentPlans,
        }), writeProjectLocalPlanMetadataState);
    }
    resolveWebviewView(webviewView) {
        this.view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.onDidReceiveMessage((message) => void this.handleMessage(message));
        this.loadPanelHtml();
        webviewView.onDidChangeVisibility(() => {
            this.budget.setHidden(!webviewView.visible);
            this.client.setHidden(!webviewView.visible);
            if (webviewView.visible)
                this.retryPendingResultsSummaryOnVisible();
            if (webviewView.visible) this.postState(true);
            else this.postState();
        });
        void Promise.all([
            this.loadProjectPlanSelectionState().catch(() => undefined),
            this.loadProjectTaskSelectionState().catch(() => undefined),
        ]).finally(() => {
            this.ensureSelectedPlanFileWatchers("webview resolved");
            this.postState(true);
            void this.refreshLocalPlanMetadata().catch((error) => {
                this.localPlanMetadata = { ...this.localPlanMetadata, error: errorMessage(error) };
                this.postState();
            });
        });
        void this.refreshXshellSessionLibrary()
            .then(() => this.syncConfiguredXshellSessions("webview resolved"))
            .then(async () => {
            if (this.isRealtimeMode() && initialServerSetupComplete(this.setupConfig, this.projectTopologyAssessment().hubAllowed)) {
                await this.testTunnel(false);
                this.postState();
            }
        })
            .catch((error) => {
            this.xshellLibraryError = errorMessage(error);
            this.postState();
        });
        if (this.isRealtimeMode()) {
            this.startAvailabilityPushLoop();
            void this.ensureRealtimeConnected("webview resolved");
        }
    }
    async dispose() {
        this.clearPanelReadyWatchdog();
        this.disposeSelectedPlanFileWatchers();
        if (this.planLocalChangeParseTimer)
            clearTimeout(this.planLocalChangeParseTimer);
        this.planLocalChangeParseTimer = undefined;
        for (const timer of this.operationTimers.values())
            clearTimeout(timer);
        this.operationTimers.clear();
        for (const timer of this.operationProbeTimers.values())
            clearTimeout(timer);
        this.operationProbeTimers.clear();
        if (this.availabilityPushTimer)
            clearTimeout(this.availabilityPushTimer);
        this.availabilityPushTimer = undefined;
        if (this.resultsSummaryRefreshTimer)
            clearTimeout(this.resultsSummaryRefreshTimer);
        this.resultsSummaryRefreshTimer = undefined;
        if (this.statePostTimer)
            clearTimeout(this.statePostTimer);
        this.statePostTimer = undefined;
        if (this.statePostRetryTimer)
            clearTimeout(this.statePostRetryTimer);
        this.statePostRetryTimer = undefined;
        this.statePostPending = false;
        this.statePostInFlight = false;
        this.statePostRetryCount = 0;
        this.lastPostedStateSignature = "";
        this.lastStateBuildErrorSignature = "";
        this.lastStatePostErrorSignature = "";
        this.webviewReady = false;
        this.pendingPanelNavigation = undefined;
        await this.client.disconnect("deactivate").catch(() => undefined);
        this.view = undefined;
    }
    async withHostOperationLease(actionType, actionLabel, operation) {
        const leaseContext = currentHostOperationLeaseContext();
        try {
            return await this.hostOperationLease.run({
                pluginId: "simple-local.simple-experiment",
                workspaceUri: leaseContext.workspaceUri,
                hostProjectPath: leaseContext.hostProjectPath,
                actionType,
                actionLabel,
            }, operation);
        }
        catch (error) {
            if (error instanceof HostOperationLease_1.HostOperationLeaseConflictError)
                await vscode.window.showErrorMessage(error.message, { modal: true }, "知道了");
            throw error;
        }
    }
    async ensureRealtimeConnected(_reason) {
        const generation = this.projectContextGeneration;
        const client = this.client;
        if (!this.isRealtimeMode())
            return;
        if (this.budget.isPaused())
            return;
        try {
            await client.connect();
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            const diagnostics = client.diagnostics();
            const unavailable = diagnostics.endpoints.length > 0 && diagnostics.endpoints.every((endpoint) => endpoint.streamStatus === "disconnected");
            this.lastError = unavailable ? "tunnel_unavailable" : undefined;
            if (unavailable && !this.lastHealth) {
                this.lastHealth = {
                    state: "local_port_closed",
                    status: "local_port_closed",
                    checkedAt: new Date().toISOString(),
                    message: "tunnel_unavailable",
                };
            }
        }
        catch (error) {
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.lastError = errorMessage(error);
        }
        if (generation === this.projectContextGeneration && client === this.client)
            this.postState();
    }
    async migrateLegacyConfigOnce() {
        if (this.context.globalState.get(keys.migrationShown))
            return;
        const config = vscode.workspace.getConfiguration("zlkCluster");
        const legacy = (0, TunnelOnlyPolicy_1.migrateLegacyRemoteConfig)({ ...config });
        await this.context.globalState.update(keys.migrationShown, true);
        if (legacy.removedFields.length)
            void vscode.window.showWarningMessage(legacy.warning);
    }
    async showFirstRunSetupPromptOnce() {
        return this.firstRunSetupPromptSingleFlight(() => this.showFirstRunSetupPromptOnceCore());
    }
    async showFirstRunSetupPromptOnceCore() {
        const simpleSftp = simpleSftpIntegrationReadiness();
        const legacySftp = legacySftpInstallationState();
        const serverSetupComplete = initialServerSetupComplete(this.setupConfig, this.projectTopologyAssessment().hubAllowed);
        const enabledWorkerCount = this.enabledWorkerConfigs().length;
        if (serverSetupComplete && simpleSftp.ready && enabledWorkerCount > 0) {
            const root = workspaceRoot();
            if (!root)
                return;
            const projectPromptShown = Number(this.context.workspaceState.get(keys.projectOnboardingPrompt, 0));
            if (projectPromptShown >= 1)
                return;
            const choice = await vscode.window.showWarningMessage(`SimpleExperiment 已就绪，当前项目为 ${path.basename(root)}，但尚未完成项目接入。接入项目后，首次上传前会再次确认本地与远端预期位置。`, { modal: true }, "接入当前项目", "打开面板", "不再提示");
            if (choice === "接入当前项目")
                await this.bootstrapProjectFromUi();
            else if (choice === "打开面板")
                await vscode.commands.executeCommand(`${viewId}.focus`);
            else if (choice === "不再提示")
                await this.context.workspaceState.update(keys.projectOnboardingPrompt, 1);
            return;
        }
        if (simpleSftp.ready && legacySftp.installed && !this.context.globalState.get(keys.legacySftpNoticeShown)) {
            const choice = await vscode.window.showWarningMessage("检测到旧版 SFTP 插件仍已安装。新版 SimpleSFTP 已可用；若看到旧版状态栏按钮，请先卸载旧版，再执行 Developer: Reload Window。", "打开旧版扩展管理", "不再提示");
            if (choice === "打开旧版扩展管理")
                await vscode.commands.executeCommand("workbench.extensions.search", `@id:${LEGACY_SFTP_EXTENSION_ID}`);
            else if (choice === "不再提示")
                await this.context.globalState.update(keys.legacySftpNoticeShown, true);
        }
        const shownVersion = Number(this.context.globalState.get(keys.firstRunSetupPrompt, 0));
        if (shownVersion >= FIRST_RUN_SETUP_PROMPT_VERSION)
            return;
        const needsSftp = !simpleSftp.ready;
        const needsWorker = !needsSftp && serverSetupComplete && enabledWorkerCount < 1;
        const message = needsSftp
            ? `首次使用 SimpleExperiment：配套 SimpleSFTP 未就绪。${simpleSftp.message} 安装并重载窗口后再接入项目。`
            : needsWorker
                ? "首次使用 SimpleExperiment：Hub 已配置，但正式运行、复现和批量运行还缺少至少一个启用的执行 Worker。现在添加 Worker，之后即可继续准备 Agent。"
                : "首次使用 SimpleExperiment：先配置 Xshell 会话，再填写 Hub/Worker 项目父目录；插件会自动追加当前项目名。打开项目后执行“接入当前项目”。";
        const choice = needsSftp
            ? await vscode.window.showInformationMessage(message, "打开配置说明", "打开扩展管理", "不再提示")
            : needsWorker
                ? await vscode.window.showInformationMessage(message, "添加 Worker", "打开配置说明", "不再提示")
                : await vscode.window.showInformationMessage(message, "打开配置说明", "开始一键配置", "不再提示");
        if (choice === "不再提示") {
            await this.context.globalState.update(keys.firstRunSetupPrompt, FIRST_RUN_SETUP_PROMPT_VERSION);
            return;
        }
        if (choice === "打开配置说明")
            await this.openSetupGuide();
        if (choice === "打开扩展管理")
            await vscode.commands.executeCommand("workbench.extensions.search", `@id:${SIMPLE_SFTP_EXTENSION_ID}`);
        if (choice === "添加 Worker")
            await this.addWorkerConfigFromUi(false);
        if (choice === "开始一键配置")
            await this.quickSetup();
        const afterSftp = simpleSftpIntegrationReadiness();
        const afterWorkerCount = this.enabledWorkerConfigs().length;
        if (workspaceRoot() && initialServerSetupComplete(this.setupConfig, this.projectTopologyAssessment().hubAllowed) && afterSftp.ready && afterWorkerCount > 0)
            await this.context.globalState.update(keys.firstRunSetupPrompt, FIRST_RUN_SETUP_PROMPT_VERSION);
    }
    async markProjectOnboardingComplete() {
        if (workspaceRoot()) {
            await this.context.workspaceState.update(keys.projectOnboardingCompleted, true);
            await this.context.workspaceState.update(keys.projectOnboardingPrompt, 1);
        }
    }
    async ensureSimpleSftpReadyForSetup(operation) {
        const simpleSftp = simpleSftpIntegrationReadiness();
        if (simpleSftp.ready) {
            try {
                const registered = new Set(await vscode.commands.getCommands(true));
                const missing = SIMPLE_SFTP_REQUIRED_COMMANDS.filter((command) => !registered.has(command));
                if (!missing.length)
                    return true;
                const next = await vscode.window.showWarningMessage(`SimpleSFTP 已安装但当前窗口尚未注册编排命令：${missing.join("、")}。请先重载 VS Code 窗口。`, "重载窗口", "打开配置说明", "打开扩展管理", "稍后");
                if (next === "重载窗口")
                    await vscode.commands.executeCommand("workbench.action.reloadWindow");
                else if (next === "打开配置说明")
                    await this.openSetupGuide();
                else if (next === "打开扩展管理")
                    await vscode.commands.executeCommand("workbench.extensions.search", `@id:${SIMPLE_SFTP_EXTENSION_ID}`);
                return false;
            }
            catch {
                const next = await vscode.window.showWarningMessage("无法确认当前窗口是否已注册 SimpleSFTP 编排命令，请先重载 VS Code 窗口。", "重载窗口", "稍后");
                if (next === "重载窗口")
                    await vscode.commands.executeCommand("workbench.action.reloadWindow");
                return false;
            }
        }
        const next = await vscode.window.showWarningMessage(`${operation}暂不能开始：${simpleSftp.message}`, "打开配置说明", "打开扩展管理", "稍后");
        if (next === "打开配置说明")
            await this.openSetupGuide();
        else if (next === "打开扩展管理")
            await vscode.commands.executeCommand("workbench.extensions.search", `@id:${SIMPLE_SFTP_EXTENSION_ID}`);
        return false;
    }
    async quickSetup(showAgentCompletion = true) {
        if (!await this.ensureSimpleSftpReadyForSetup("一键配置"))
            return false;
        const choice = await vscode.window.showQuickPick([
            { label: "选择 Xshell 会话文件", description: "推荐。为 Hub 和 Worker 选择已保存的 .xsh 会话，并自动读取端口转发。", action: "sessions" },
            { label: "仅填写 Hub 参数", description: "仅用于诊断或旧配置迁移；正式接入仍需选择带端口转发的 .xsh 会话。", action: "manual" },
        ], {
            title: "SimpleExperiment 一键配置向导",
            placeHolder: "推荐流程：选择 Xshell 会话文件，启动隧道，再检测状态。",
            ignoreFocusOut: true,
        });
        if (!choice)
            return false;
        if (choice.action === "sessions")
            await this.configureXshellSavedSessions();
        if (choice.action === "manual")
            await this.configureXshellRealtimeTunnel();
        let missingServerSetup = serverSetupMissingItems(this.setupConfig);
        if (missingServerSetup.length) {
            const setupNext = await vscode.window.showWarningMessage(`服务器配置还不能用于 Agent 准备：缺少 ${missingServerSetup.join("、")}。正式接入必须先选择可登录且带本地端口转发的 Xshell 会话。`, "选择 Xshell 会话", "打开服务器设置", "稍后");
            if (setupNext === "选择 Xshell 会话") {
                await this.configureXshellSavedSessions();
                missingServerSetup = serverSetupMissingItems(this.setupConfig);
            }
            else if (setupNext === "打开服务器设置") {
                await this.openPanelAt("settings", "settings-servers");
            }
            if (missingServerSetup.length) {
                this.postState();
                return false;
            }
        }
        if (!workspaceRoot()) {
            this.postState();
            const open = await vscode.window.showInformationMessage("Xshell 会话和服务器项目父目录已保存。下一步选择要运行实验的本地项目；插件会自动追加项目名、生成 SimpleSFTP 目标并继续配置。", "选择项目并继续", "打开配置说明", "稍后");
            if (open === "选择项目并继续")
                await this.openWorkspaceFolderForContinuation("一键配置", "quickSetup", { showAgentCompletion });
            else if (open === "打开配置说明")
                await this.openSetupGuide();
            return false;
        }
        return this.completeQuickSetupAfterWorkspace(showAgentCompletion);
    }
    async completeQuickSetupAfterWorkspace(showAgentCompletion = true) {
        assertSingleProjectWorkspace("一键配置");
        if (!await this.ensureSimpleSftpReadyForSetup("一键配置续接"))
            return false;
        const missingServerSetup = serverSetupMissingItems(this.setupConfig);
        if (missingServerSetup.length) {
            const open = await vscode.window.showWarningMessage(`一键配置续接已停止：服务器配置缺少 ${missingServerSetup.join("、")}。尚未生成当前项目 SimpleSFTP 目标或准备 Agent。`, "打开服务器设置", "稍后");
            if (open === "打开服务器设置")
                await this.openPanelAt("settings", "settings-servers");
            return false;
        }
        let enabledWorkers = this.enabledWorkerConfigs();
        if (!enabledWorkers.length) {
            const workerNext = await vscode.window.showWarningMessage("当前只配置了 Hub。正式运行、复现或批量运行至少需要一个启用的 Worker；现在添加可避免完成 Agent 部署后才发现无法提交实验。", "添加 Worker", "仅保存 Hub", "打开服务器设置");
            if (workerNext === "添加 Worker") {
                await this.addWorkerConfigFromUi(false);
                enabledWorkers = this.enabledWorkerConfigs();
            }
            else if (workerNext === "打开服务器设置") {
                await this.openPanelAt("settings", "settings-servers");
            }
            if (!enabledWorkers.length) {
                const hubProfileResult = await this.writeSftpManagerServerProfiles();
                this.postState();
                void vscode.window.showInformationMessage(`Hub 配置已保存，并生成 ${hubProfileResult.targetCount} 个当前项目 SimpleSFTP 目标；添加并启用 Worker 后才能准备全部 Agent 和提交实验。`);
                return false;
            }
        }
        const profileResult = await this.writeSftpManagerServerProfiles();
        const expectedTargets = 1 + enabledWorkers.length;
        if (profileResult.targetCount < expectedTargets) {
            const open = await vscode.window.showWarningMessage(`服务器配置尚未形成完整的 SimpleSFTP 目标：需要 ${expectedTargets} 个，当前 ${profileResult.targetCount} 个。请检查 Hub/Worker 的 Xshell 主机、用户名和项目父目录。`, "打开服务器设置", "稍后");
            if (open === "打开服务器设置")
                await this.openPanelAt("settings", "settings-servers");
            this.postState();
            return false;
        }
        const preparationBlockers = this.currentAgentPreparationBlockers();
        if (preparationBlockers.length) {
            const open = await vscode.window.showWarningMessage(`服务器配置已保存，但 Agent 准备尚未开始：${preparationBlockers.join("；")}`, "打开服务器设置", "稍后");
            if (open === "打开服务器设置")
                await this.openPanelAt("settings", "settings-servers");
            this.postState();
            return false;
        }
        const profileSummary = `已生成 ${profileResult.targetCount} 个当前项目 SimpleSFTP 目标。`;
        const environmentSummary = executionEnvironmentLabel(this.setupConfig.condaEnv);
        const next = await vscode.window.showInformationMessage(`Xshell 会话和服务器项目父目录已保存。执行环境：${environmentSummary}。${profileSummary} 首次使用建议一次完成 Agent 部署、自启动命令、会话启动和连接检测。`, "准备 Agent 并启动", "仅启动会话", "只检测", "稍后");
        let agentsReady = false;
        if (next === "准备 Agent 并启动")
            agentsReady = await this.prepareAgentsForFirstRun(showAgentCompletion);
        if (next === "仅启动会话")
            await this.startAllXshellRealtimeTunnels();
        if (next === "只检测")
            await this.testTunnel(true);
        this.postState();
        return agentsReady;
    }
    async configureXshellSavedSessions() {
        let exePath = isXshellExecutablePath((0, XshellTunnelSetup_1.xshellExecutablePath)(this.setupConfig)) ? (0, XshellTunnelSetup_1.xshellExecutablePath)(this.setupConfig) : "";
        if (!exePath) {
            const found = await this.integration().findExecutable();
            exePath = found.path || "";
        }
        if (!exePath) {
            const pickedExe = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                title: "选择 Xshell.exe",
                filters: { "Xshell.exe": ["exe"] },
            });
            exePath = pickedExe?.[0]?.fsPath || "";
        }
        if (!exePath) {
            void vscode.window.showErrorMessage("需要先选择 Xshell.exe。");
            return;
        }
        await this.refreshXshellSessionLibrary({ force: true, postState: false });
        const library = this.xshellLibrary;
        const primaryDir = library.existingDirs[0] || library.searchedDirs[0];
        void vscode.window.showInformationMessage(library.sessions.length
            ? `已扫描 Xshell 会话目录：${primaryDir}，发现 ${library.sessions.length} 个 .xsh。`
            : `首次配置：Xshell 会话文件一般在 ${primaryDir}。未自动发现 .xsh 时可手动选择。`);
        const hubPick = await pickXshellSessionForward("选择 Hub 的 Xshell 隧道端口对", library.sessions, this.setupConfig.savedSessionPath, primaryDir);
        const hubInfo = hubPick?.session;
        const hubSessionPath = hubInfo?.filePath || this.setupConfig.savedSessionPath || "";
        if (!hubSessionPath)
            return;
        const hubForward = hubPick?.forward;
        const defaultHubName = this.setupConfig.hubDisplayName || path.basename(hubSessionPath, path.extname(hubSessionPath)) || "Hub";
        const hubDisplayName = await input("Hub 显示名称", defaultHubName, "例如 hub、nwpu213、调度节点");
        if (hubDisplayName === undefined)
            return;
        const hubActualWorkDir = await inputActualWorkRoot("Hub 项目父目录", this.setupConfig.agentProjectDir || "", "Hub");
        if (hubActualWorkDir === undefined)
            return;
        const hubLocalPort = hubForward?.localPort || await inputPort("Hub 本地端口", this.setupConfig.localForwardPort, { min: 1024, description: "Hub 本地端口", prompt: "未从 Xshell 会话解析到隧道端口，请手动填写。" });
        if (hubLocalPort === undefined)
            return;
        const hubRemotePort = hubForward?.remotePort || await inputPort("Hub Agent 远端端口", this.setupConfig.remoteAgentPort, { min: 1024, description: "Hub Agent 远端端口", prompt: "未从 Xshell 会话解析到远端端口，请手动填写。通常是 18765。" });
        if (hubRemotePort === undefined)
            return;
        let workers = [...this.setupConfig.workerTunnels];
        const reset = await vscode.window.showQuickPick([
            { label: "保留现有 Worker 会话并编辑", value: false },
            { label: "清空后重新添加 Worker 会话", value: true },
        ], { title: "Worker 会话", ignoreFocusOut: true });
        if (!reset)
            return;
        if (reset.value)
            workers = [];
        for (;;) {
            const picked = await vscode.window.showQuickPick([
                { label: "新增 Worker 会话", action: "add" },
                { label: "完成", action: "done" },
                ...workers.map((worker, index) => ({
                    label: `${worker.enabled === false ? "禁用" : "启用"} ${worker.displayName || worker.id}`,
                    description: `会话:${worker.savedSessionPath || "-"} 本地:${worker.localForwardPort}`,
                    action: "worker",
                    index,
                })),
            ], { title: "配置 Worker Xshell 会话文件", ignoreFocusOut: true });
            if (!picked || picked.action === "done")
                break;
            if (picked.action === "add") {
                const worker = await promptSavedSessionWorker(undefined, workers.length, hubRemotePort, hubLocalPort, library.sessions, primaryDir);
                if (worker)
                    workers.push(worker);
                continue;
            }
            const current = workers[picked.index];
            const action = await vscode.window.showQuickPick([
                { label: "编辑", action: "edit" },
                { label: current.enabled === false ? "启用" : "禁用", action: "toggle" },
                { label: "删除", action: "delete" },
            ], { title: `Worker 会话: ${current.displayName || current.id}`, ignoreFocusOut: true });
            if (!action)
                continue;
            if (action.action === "edit") {
                const edited = await promptSavedSessionWorker(current, picked.index, hubRemotePort, hubLocalPort, library.sessions, primaryDir);
                if (edited)
                    workers[picked.index] = edited;
            }
            else if (action.action === "toggle") {
                workers[picked.index] = { ...current, enabled: current.enabled === false };
            }
            else if (action.action === "delete") {
                workers = workers.filter((_, index) => index !== picked.index);
            }
        }
        const manual = (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)({
            ...this.setupConfig,
            xshellExePath: exePath,
            launchMode: "open_saved_session",
            savedSessionRunner: "xshell",
            savedSessionPath: hubSessionPath,
            savedSessionForwardIndex: hubForward?.index,
            hubDisplayName: hubDisplayName.trim() || defaultHubName,
            agentProjectDir: hubActualWorkDir,
            localForwardPort: hubLocalPort,
            remoteAgentPort: hubRemotePort,
            hubHost: hubInfo?.host || this.setupConfig.hubHost || "",
            resolvedHost: hubInfo?.host || this.setupConfig.resolvedHost,
            transferHost: this.setupConfig.transferHost,
            sftpHost: this.setupConfig.sftpHost,
            sshHost: this.setupConfig.sshHost,
            hubUser: hubInfo?.userName || this.setupConfig.hubUser || "",
            hubSshPort: hubInfo?.port || this.setupConfig.hubSshPort,
            authMethod: "password",
            workerRealtimeMode: workers.some((worker) => worker.enabled !== false) ? "hub_plus_workers" : "hub_only",
            workerTelemetryMode: workers.some((worker) => worker.enabled !== false) ? "hub_plus_worker_telemetry" : "hub_only",
            workerTunnels: workers,
        });
        await this.ensureXshellSessionLoaded(manual.savedSessionPath);
        await Promise.all(manual.workerTunnels.map((worker) => this.ensureXshellSessionLoaded(worker.savedSessionPath)));
        await this.applySetupDraft(this.withXshellDerivedFields(manual), { syncAssignmentsFromFields: true });
        void vscode.window.showInformationMessage(`已切换为 Xshell 会话文件模式。Hub + ${workers.filter((worker) => worker.enabled !== false).length} 个 Worker 会话会由插件启动。配置已全局保存。`);
    }
    async configureXshellAgentSessions() {
        await this.writeXshellAgentStartupCommands(true);
    }
    async writeXshellAgentStartupCommands(showMessage = true, requireConfirm = true) {
        assertSingleProjectWorkspace("写入 Agent 自启动路径");
        this.assertTopologyActualWorkRoots("写入 Agent 自启动路径");
        const targets = this.agentStartupTargets();
        if (!targets.length) {
            void vscode.window.showWarningMessage("没有可写入的 Xshell Agent 会话。请先配置或复用 Hub/Worker 会话。");
            return [];
        }
        if (requireConfirm) {
            const runtimeTargets = this.agentRuntimeUploadTargets();
            await this.confirmRemoteWriteTargets("写入 Agent 自启动路径", runtimeTargets);
            const confirm = await vscode.window.showWarningMessage(agentStartupWriteConfirmationDetail(targets, runtimeTargets, false), { modal: true }, "确认写入");
            if (confirm !== "确认写入")
                return [];
        }
        const results = [];
        for (const target of targets) {
            try {
                const result = await (0, XshellSessionPatcher_1.updateXshellSessionLoginCommand)(target.filePath, target.command, { backup: true, skipIfRemoteCommandIncludes: [target.command] });
                results.push({ id: target.id, ...result, summary: `${target.id}: ${xshellLoginCommandUpdateLabel(result.skippedReason, result.changed)}${result.backupPath ? `，备份 ${path.basename(result.backupPath)}` : ""}` });
            }
            catch (error) {
                results.push({ id: target.id, error: errorMessage(error), summary: `${target.id}: ${errorMessage(error)}` });
            }
        }
        if (showMessage)
            void vscode.window.showInformationMessage(`Xshell Agent 自启动命令写入完成：${results.map((item) => item.summary).join("；")}`);
        this.postState();
        return results;
    }
    async startAllXshellAgentSessions(showMessage = false, requireConfirm = true) {
        void showMessage;
        await this.startAllXshellRealtimeTunnels(requireConfirm);
        return true;
    }
    async startAllXshellConnections(requireConfirm = true, scheduleAutoTest = true) {
        await this.syncXshellConfigBeforeNetwork("start all xshell connections");
        const launchBlockers = this.currentTunnelLaunchBlockers();
        if (launchBlockers.length) {
            void vscode.window.showErrorMessage(`连接启动已阻止：${launchBlockers.join("；")}`);
            return false;
        }
        const tunnelItems = this.tunnelLaunchItems();
        const launchItems = [
            ...tunnelItems
                .filter((item) => item.config.savedSessionPath)
                .map((item) => ({
                id: `${item.id}-tunnel`,
                role: item.role,
                displayName: `${item.id} 隧道`,
                sessionPath: item.config.savedSessionPath || "",
            })),
        ];
        if (!launchItems.length) {
            void vscode.window.showWarningMessage("没有可启动的 Xshell 会话。请先配置 Hub/Worker 隧道会话。");
            return;
        }
        const uniqueCount = new Set(launchItems.map((item) => localPathKey(item.sessionPath))).size;
        if (requireConfirm) {
            const answer = await vscode.window.showWarningMessage(`启动连接将打开 ${uniqueCount} 个唯一 Xshell 隧道会话；同一个 .xsh 只打开一次，不会提交实验或自动修改 .xsh。若已点击“写入 Agent 自动启动命令”，Agent 会由 Xshell RemoteCommand 自动启动，并进入自动计算的当前项目代码目录。\n\n隧道会话 ${tunnelItems.length} 个：\n${tunnelItems.map((item) => `${item.id}: ${item.config.savedSessionPath || "未配置"}  127.0.0.1:${item.config.localForwardPort}`).join("\n") || "-"}\n\n插件不会直接执行 ${"s" + "sh"}/${"s" + "cp"}/${"r" + "sync"}。`, { modal: true }, "确认启动连接");
            if (answer !== "确认启动连接")
                return;
        }
        await this.launchUniqueXshellSessions(launchItems);
        if (scheduleAutoTest && this.setupConfig.autoTestTunnelAfterStart) {
            setTimeout(() => void this.testTunnel(true), 2500).unref?.();
        }
        else {
            void this.ensureRealtimeConnected("xshell sessions launched");
        }
    }
    async prepareAgentsForFirstRun(showMessage = true) {
        if (!await this.ensureSimpleSftpReadyForSetup("准备 Agent"))
            return false;
        if (!workspaceRoot()) {
            await this.openWorkspaceFolderForContinuation("准备 Agent", "prepareAgents");
            return false;
        }
        assertSingleProjectWorkspace("准备 Agent");
        await this.syncXshellConfigBeforeNetwork("prepare agents for first run");
        const topology = this.assertTopologyReady("准备 Agent");
        this.assertTopologyActualWorkRoots("准备 Agent");
        const preparationBlockers = this.currentAgentPreparationBlockers();
        if (preparationBlockers.length)
            throw new Error(`Agent 准备已阻止，尚未修改 .xsh 或部署 runtime：${preparationBlockers.join("；")}`);
        const targets = this.agentStartupTargets();
        const expectedTargets = topology.hubAllowed ? 1 + this.enabledWorkerConfigs().length : this.enabledWorkerConfigs().length;
        if (targets.length !== expectedTargets)
            throw new Error(`Agent 准备目标不完整：需要 ${expectedTargets} 个，当前 ${targets.length} 个。请检查当前拓扑内所有服务器的 Xshell 会话和项目父目录。`);
        const availableProfileTargets = this.sftpSharedTargets().length;
        if (availableProfileTargets < expectedTargets)
            throw new Error(`当前项目 SimpleSFTP 目标不完整：需要 ${expectedTargets} 个，当前 ${availableProfileTargets} 个。请检查当前拓扑内服务器的真实传输地址、用户名和项目父目录。`);
        const runtimeTargets = this.agentRuntimeUploadTargets();
        await this.confirmRemoteWriteTargets("准备 Agent 并上传 runtime", runtimeTargets);
        const answer = await vscode.window.showWarningMessage(agentStartupWriteConfirmationDetail(targets, runtimeTargets, true), { modal: true }, "确认准备并启动");
        if (answer !== "确认准备并启动")
            throw new UiCommandCancelled("Agent 准备已取消。");
        const profileResult = await this.writeSftpManagerServerProfiles(targets.map((target) => target.id));
        if (profileResult.targetCount < expectedTargets)
            throw new Error(`当前项目 SimpleSFTP 目标写入不完整：需要 ${expectedTargets} 个，当前 ${profileResult.targetCount} 个。尚未修改 .xsh 或上传 runtime。`);
        const commandResults = await this.writeXshellAgentStartupCommands(false, false);
        const blocked = commandResults.filter((item) => item.error || ["non_zlk_remote_command", "different_zlk_agent_session"].includes(item.skippedReason));
        if (blocked.length)
            throw new Error(`Agent 自启动命令未就绪，尚未部署远端 runtime：${blocked.map((item) => item.summary).join("；")}`);
        await this.deployLatestAgentRuntime(false, true);
        await this.startAllXshellConnections(false, false);
        await sleep(3000);
        await this.testTunnel(true);
        const completion = tunnelTestCompletion(this.setupConfig, this.lastProbe, this.lastHealth, this.lastWorkerProbes, topology.hubAllowed);
        if (!completion.ready)
            throw new Error(`Agent 已部署并启动，但当前拓扑端点健康检测未通过：${completion.issues.join("；") || completion.message}。请按提示修复 Conda/Python 依赖、当前项目代码目录或端口后再次检测。`);
        if (showMessage) {
            const topologySummary = topology.hubAllowed ? `Hub + ${expectedTargets - 1} 个 Worker` : `${expectedTargets} 个 Worker（无 Hub）`;
            const next = await vscode.window.showInformationMessage(`Agent 首次准备完成：${topologySummary} 已部署、启动并通过检测。下一步可直接接入当前项目。`, "接入当前项目", "打开面板");
            if (next === "接入当前项目")
                await this.bootstrapProjectFromUi();
            else if (next === "打开面板")
                await vscode.commands.executeCommand("zlkCluster.openPanel");
        }
        return true;
    }
    async configureXshellRealtimeTunnel() {
        const integration = this.integration();
        const found = await integration.findExecutable();
        let exePath = found.path || (0, XshellTunnelSetup_1.xshellExecutablePath)(this.setupConfig);
        if (!exePath) {
            const picked = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                title: "选择 Xshell.exe",
                filters: { "Xshell.exe": ["exe"] },
            });
            exePath = picked?.[0]?.fsPath || "";
        }
        if (exePath)
            await this.applySetupDraft({ xshellExePath: exePath });
        const hubHost = await input("服务器 IP 或域名", this.setupConfig.hubHost, "例如 10.10.10.8 或 login.example.edu", "这是你平时登录服务器时使用的地址，可以是数字 IP，也可以是学校或实验室给的域名。");
        if (hubHost === undefined)
            return;
        await this.applySetupDraft({ hubHost });
        const hubDisplayName = await input("Hub 显示名称", this.setupConfig.hubDisplayName || hubHost || "Hub", "例如 hub、nwpu213、调度节点");
        if (hubDisplayName === undefined)
            return;
        await this.applySetupDraft({ hubDisplayName: hubDisplayName.trim() || undefined });
        const hubUser = await input("登录用户名", this.setupConfig.hubUser, "例如 zlk、student、your_name", "这是你平时 SSH 登录服务器时输入的用户名。插件不会保存密码。");
        if (hubUser === undefined)
            return;
        await this.applySetupDraft({ hubUser });
        const hubSshPort = await inputPort("服务器 SSH 登录端口号（通常是 22）", this.setupConfig.hubSshPort, { min: 1, description: "服务器 SSH 登录端口", prompt: "这是 Xshell 会话登录服务器用的 SSH 端口，常见值是 22。它不是本地隧道端口。" });
        if (hubSshPort === undefined)
            return;
        await this.applySetupDraft({ hubSshPort });
        let localForwardPort = await inputPort("本地隧道端口号（插件访问 127.0.0.1）", this.setupConfig.localForwardPort, { min: 1024, description: "本地隧道端口", prompt: "这是你电脑上的端口，插件只访问 127.0.0.1:这个端口。建议保持 18765。" });
        if (localForwardPort === undefined)
            return;
        await this.applySetupDraft({ localForwardPort });
        if (!(await (0, XshellTunnelLauncher_1.isLocalPortAvailable)(localForwardPort))) {
            const recommended = await (0, XshellTunnelLauncher_1.recommendAvailableLocalPort)(localForwardPort + 1);
            const answer = await vscode.window.showWarningMessage(`127.0.0.1:${localForwardPort} 已被占用。推荐可用端口：${recommended}。`, "使用推荐端口", "保留当前端口", "取消");
            if (answer === "取消")
                return;
            if (answer === "使用推荐端口") {
                localForwardPort = recommended;
                await this.applySetupDraft({ localForwardPort });
            }
        }
        const remoteAgentPort = await inputPort("服务器 Agent 端口号（Hub Agent 监听端口）", this.setupConfig.remoteAgentPort, { min: 1024, description: "服务器 Agent 端口", prompt: "这是服务器上 Hub Agent 监听的端口，要和启动命令里的 --port 一致。建议保持 18765。" });
        if (remoteAgentPort === undefined)
            return;
        await this.applySetupDraft({ remoteAgentPort });
        const sshConfigAlias = await input("Xshell 登录别名（可选）", this.setupConfig.sshConfigAlias || "", "例如 Xshell 会话名、服务器简称；不懂可留空", "仅用于显示和目标标识，不会让插件直接执行 SSH。");
        if (sshConfigAlias === undefined)
            return;
        await this.applySetupDraft({ sshConfigAlias: sshConfigAlias.trim() || undefined });
        const hubActualWorkDir = await inputActualWorkRoot("Hub 项目父目录", this.setupConfig.agentProjectDir || "", "Hub");
        if (hubActualWorkDir === undefined)
            return;
        await this.applySetupDraft({ agentProjectDir: hubActualWorkDir });
        const next = (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)({
            ...this.setupConfig,
            realtimeEnabled: true,
            fileTransferEnabled: true,
        });
        const errors = (0, XshellTunnelSetup_1.validateXshellSetupConfig)(next);
        if (errors.length) {
            await this.applySetupDraft(next);
            void vscode.window.showWarningMessage(`已保存当前已填写内容，但配置还不完整：${errors.join(" ")}`);
            return;
        }
        await this.applySetupDraft(next);
        void vscode.window.showInformationMessage("Xshell 隧道配置已保存。");
    }
    async configureWorkerTunnels() {
        let workers = [...this.setupConfig.workerTunnels];
        for (;;) {
            const picked = await vscode.window.showQuickPick([
                { label: "新增 Worker", description: "手动添加一台 Worker 实时观测隧道", action: "add" },
                { label: "完成", description: "保存当前 Worker 列表", action: "done" },
                ...workers.map((worker, index) => ({
                    label: `${worker.enabled === false ? "禁用" : "启用"} ${worker.displayName || worker.id}`,
                    description: `${worker.workerUser || worker.hubUser}@${worker.workerHost || worker.hubHost}:${worker.workerSshPort || worker.hubSshPort}  本地:${worker.localForwardPort}  认证:${authMethodLabel(worker.authMethod || "password")}`,
                    action: "worker",
                    index,
                })),
            ], { title: "配置 Worker 隧道", placeHolder: "默认密码登录；只有选择密钥登录才会使用私钥。", ignoreFocusOut: true });
            if (!picked || picked.action === "done")
                break;
            if (picked.action === "add") {
                const worker = await promptWorkerTunnel(undefined, workers.length, this.setupConfig);
                if (worker)
                    workers.push(worker);
                continue;
            }
            const current = workers[picked.index];
            const action = await vscode.window.showQuickPick([
                { label: "编辑", action: "edit" },
                { label: current.enabled === false ? "启用" : "禁用", action: "toggle" },
                { label: "删除", action: "delete" },
            ], { title: `Worker: ${current.displayName || current.id}`, ignoreFocusOut: true });
            if (!action)
                continue;
            if (action.action === "edit") {
                const edited = await promptWorkerTunnel(current, picked.index, this.setupConfig);
                if (edited)
                    workers[picked.index] = edited;
            }
            else if (action.action === "toggle") {
                workers[picked.index] = { ...current, enabled: current.enabled === false };
            }
            else if (action.action === "delete") {
                const ok = await vscode.window.showWarningMessage(`删除 Worker ${current.displayName || current.id}？`, { modal: true }, "删除");
                if (ok === "删除")
                    workers = workers.filter((_, index) => index !== picked.index);
            }
        }
        await this.applySetupDraft({
            workerRealtimeMode: workers.some((worker) => worker.enabled !== false) ? "hub_plus_workers" : "hub_only",
            workerTelemetryMode: workers.some((worker) => worker.enabled !== false) ? "hub_plus_worker_telemetry" : "hub_only",
            workerTunnels: workers,
        });
        void vscode.window.showInformationMessage(`Worker 隧道配置已保存：${workers.filter((worker) => worker.enabled !== false).length} 个启用。`);
    }
    async startXshellRealtimeTunnel() {
        if (!this.projectTopologyAssessment().hubAllowed) {
            void vscode.window.showWarningMessage("当前拓扑不使用 Hub。请启动 Worker 或使用“启动全部 Xshell 会话”。");
            return;
        }
        const staticConflicts = this.currentPortConflicts().filter((conflict) => conflict.severity === "error");
        if (staticConflicts.length) {
            void vscode.window.showErrorMessage(`隧道端口存在冲突：${staticConflicts.map((item) => item.suggestion).join(" ")}`);
            return;
        }
        const hubItem = this.tunnelLaunchItems()[0];
        const hubConfig = hubItem.config;
        const errors = (0, XshellTunnelSetup_1.validateXshellSetupConfig)(hubConfig);
        if (errors.length) {
            void vscode.window.showErrorMessage(`${errors.join(" ")} 请先配置实时隧道。`);
            return;
        }
        const unsafeForward = this.unsafeXshellForwardMessage(hubConfig);
        if (unsafeForward) {
            void vscode.window.showErrorMessage(`hub: ${unsafeForward}`);
            return;
        }
        const integration = this.integration();
        const preview = integration.buildTunnelCommand(hubConfig);
        const answer = await vscode.window.showWarningMessage(`即将启动 Xshell 会话，窗口保持可见。插件不会保存密码或 passphrase，也不会关闭 host key 检查。\n\n${preview.redactedShellCommand}`, { modal: true }, "启动隧道");
        if (answer !== "启动隧道")
            return;
        await this.launchTunnelItem(hubItem);
        if (this.setupConfig.autoTestTunnelAfterStart) {
            setTimeout(() => void this.testTunnel(true), 2500).unref?.();
        }
        else {
            void this.ensureRealtimeConnected("xshell launched");
        }
    }
    async configureTunnelPorts() {
        const rangeStart = await inputPort("Worker 本地端口范围起点", this.setupConfig.ports.workerLocalPortRange.start, { min: 1024, description: "Worker 本地端口范围起点" });
        if (rangeStart === undefined)
            return;
        const rangeEnd = await inputPort("Worker 本地端口范围终点", this.setupConfig.ports.workerLocalPortRange.end, { min: rangeStart, description: "Worker 本地端口范围终点" });
        if (rangeEnd === undefined)
            return;
        await this.applySetupDraft({
            ports: {
                ...this.setupConfig.ports,
                workerLocalPortRange: { start: rangeStart, end: rangeEnd },
            },
        });
    }
    async repairTunnelPorts() {
        await this.syncXshellConfigBeforeNetwork("repair tunnel ports");
        const conflicts = this.currentPortConflicts();
        if (!conflicts.length) {
            void vscode.window.showInformationMessage("未检测到隧道端口冲突。");
            return;
        }
        const conflictSummary = conflicts.slice(0, 12).map((item) => `${item.endpointId}: 127.0.0.1:${item.requestedPort} - ${item.message}`).join("\n");
        const answer = await vscode.window.showWarningMessage(`检测到 ${conflicts.length} 个隧道端口冲突：\n\n${conflictSummary}\n\n插件不会自动改写 Xshell 会话。调整端口范围后，请在 Xshell 中核对并保存对应的本地转发端口。`, { modal: true }, "配置端口范围");
        if (answer === "配置端口范围")
            await this.configureTunnelPorts();
    }
    async startHubTunnel() {
        if (!this.projectTopologyAssessment().hubAllowed) {
            void vscode.window.showWarningMessage("当前拓扑不使用 Hub，已阻止启动 Hub 隧道。");
            return;
        }
        await this.startXshellRealtimeTunnel();
    }
    async startWorkerTunnel() {
        const workers = this.tunnelLaunchItems().filter((item) => item.role === "worker");
        if (!workers.length) {
            void vscode.window.showWarningMessage("没有已启用的 Worker 实时观测隧道。");
            return;
        }
        const picked = await vscode.window.showQuickPick(workers.map((item) => ({ label: item.id, description: `127.0.0.1:${item.config.localForwardPort}`, item })), {
            title: "启动 Worker 实时观测隧道",
            ignoreFocusOut: true,
        });
        if (!picked)
            return;
        await this.launchTunnelItem(picked.item);
    }
    async showTunnelEndpointRegistry() {
        const doc = await vscode.workspace.openTextDocument({ language: "json", content: JSON.stringify(this.endpointRegistryState(), null, 2) });
        await vscode.window.showTextDocument(doc, { preview: true });
    }
    async startAllXshellRealtimeTunnels(requireConfirm = true) {
        await this.syncXshellConfigBeforeNetwork("start all tunnels");
        const portConflicts = this.currentPortConflicts();
        const blockingConflicts = portConflicts.filter((conflict) => conflict.severity === "error");
        if (blockingConflicts.length) {
            void vscode.window.showErrorMessage(`端口冲突阻止启动全部隧道：${blockingConflicts.map((conflict) => `${conflict.endpointId}:${conflict.requestedPort}`).join(", ")}。请在服务器卡片中选择唯一的 Xshell 本机端口对后保存。`);
            return;
        }
        const launchItems = this.tunnelLaunchItems();
        const errors = launchItems.flatMap((item) => (0, XshellTunnelSetup_1.validateXshellSetupConfig)(item.config).map((error) => `${item.id}: ${error}`));
        errors.push(...launchItems.map((item) => {
            const unsafeForward = this.unsafeXshellForwardMessage(item.config);
            return unsafeForward ? `${item.id}: ${unsafeForward}` : "";
        }).filter((message) => Boolean(message)));
        if (errors.length) {
            void vscode.window.showErrorMessage(`${errors.join(" ")} 请先导入或配置隧道。`);
            return;
        }
        if (requireConfirm) {
            const answer = await vscode.window.showWarningMessage(`即将启动 ${launchItems.length} 个 Xshell 会话。插件仍只访问 127.0.0.1，本地实时状态会从 Hub 和已配置 Worker 隧道聚合。\n\n${launchItems.map((item) => `${item.id}: 127.0.0.1:${item.config.localForwardPort} -> 127.0.0.1:${item.config.remoteAgentPort}`).join("\n")}`, { modal: true }, "启动全部隧道");
            if (answer !== "启动全部隧道")
                return;
        }
        const integration = this.integration();
        for (const item of launchItems) {
            const occupancy = await this.detectPortOccupancy(item.config.localForwardPort, item.id);
            if (occupancy === "current_tunnel") {
                continue;
            }
            if (occupancy === "unknown_process" || occupancy === "existing_tunnel") {
                continue;
            }
            if (!(await (0, XshellTunnelLauncher_1.isLocalPortAvailable)(item.config.localForwardPort))) {
                continue;
            }
            await integration.launchTunnel(item.config);
            await waitForXshellBatchLaunchSlot();
        }
        if (this.setupConfig.autoTestTunnelAfterStart) {
            setTimeout(() => void this.testTunnel(true), 2500).unref?.();
        }
        else {
            void this.ensureRealtimeConnected("xshell launched all");
        }
    }
    async testTunnel(userInitiated = false) {
        const generation = this.projectContextGeneration;
        if (userInitiated)
            await this.clearOfflineImport();
        if (generation !== this.projectContextGeneration)
            return;
        (0, TunnelOnlyPolicy_1.assertTunnelOnlyMode)(this.effectiveConnectionMode());
        if (this.effectiveConnectionMode() === "offline_import") {
            this.lastHealth = { state: "paused", status: "paused", checkedAt: new Date().toISOString(), message: "当前为离线模式。" };
            this.postState();
            return;
        }
        await this.syncXshellConfigBeforeNetwork("test tunnel");
        if (generation !== this.projectContextGeneration)
            return;
        const authorityClient = this.client;
        if (userInitiated) {
            this.lastHealth = {
                state: "unknown",
                status: "unknown",
                checkedAt: new Date().toISOString(),
                localForwardPort: this.setupConfig.localForwardPort,
                remoteAgentPort: this.setupConfig.remoteAgentPort,
                message: this.projectTopologyAssessment().hubAllowed ? "正在检测 Hub 和 Worker 本地隧道..." : "正在检测 Worker 本地隧道...",
            };
            this.postState();
        }
        try {
            const topology = this.assertTopologyReady("检测隧道");
            const probe = topology.hubAllowed
                ? enforceExpectedAgentProjectRoot(await this.integration().probeLocalTunnel(this.setupConfig), this.agentRuntimeDirs(this.setupConfig.agentProjectDir).workDir, "Hub")
                : undefined;
            if (generation !== this.projectContextGeneration || authorityClient !== this.client)
                return;
            const workerItems = this.tunnelLaunchItems().filter((entry) => entry.role === "worker");
            const workerProbes = await Promise.allSettled(workerItems.map(async (item) => [
                item.id,
                enforceExpectedAgentProjectRoot(await (0, XshellTunnelPortProbe_1.probeWorkerTelemetryTunnel)({ ...item.config, token: this.tunnelConfig.token }), this.expectedWorkerAgentProjectRoot(item.id), item.label || item.id),
            ]));
            if (generation !== this.projectContextGeneration || authorityClient !== this.client)
                return;
            const nextWorkerProbes = {};
            workerProbes.forEach((entry, index) => {
                const item = workerItems[index];
                if (!item)
                    return;
                nextWorkerProbes[item.id] = entry.status === "fulfilled"
                    ? entry.value[1]
                    : {
                        status: "timeout",
                        localForwardPort: item.config.localForwardPort,
                        remoteTelemetryPort: item.config.remoteAgentPort,
                        tcpOpen: false,
                        healthOk: false,
                        capabilitiesOk: false,
                        streamApiOk: false,
                        gpuApiOk: false,
                        workerTasksApiOk: false,
                        warnings: [errorMessage(entry.reason)],
                        message: errorMessage(entry.reason),
                    };
            });
            this.lastProbe = probe;
            this.lastHealth = topology.hubAllowed ? this.healthFromProbe(probe) : noHubWorkerHealth(nextWorkerProbes);
            this.lastWorkerProbes = nextWorkerProbes;
            this.lastFullEndpointProbeAt = Date.now();
            this.resetClient();
            this.lastError = undefined;
            if (["agent_ok", "file_api_unavailable"].includes(this.lastHealth.state)) {
                void this.ensureRealtimeConnected("tunnel test ok");
            }
        }
        catch (error) {
            if (generation !== this.projectContextGeneration || authorityClient !== this.client)
                return;
            this.lastHealth = (0, TunnelHealth_1.classifyTunnelHealth)({
                configured: Boolean((0, XshellTunnelSetup_1.xshellExecutablePath)(this.setupConfig)),
                paused: error instanceof RequestBudget_1.RequestBudgetDeniedError && error.decision.reason === "paused",
                rateLimited: error instanceof RequestBudget_1.RequestBudgetDeniedError && error.decision.reason === "rate_limited",
                error,
            });
            this.lastProbe = undefined;
            this.lastWorkerProbes = {};
            this.lastFullEndpointProbeAt = 0;
            this.lastError = this.lastHealth.message;
        }
        if (userInitiated && generation === this.projectContextGeneration) {
            this.postState();
            this.showTunnelTestToast();
        }
    }
    async runXshellRealIntegrationCheck() {
        const generation = this.projectContextGeneration;
        if (this.effectiveConnectionMode() === "offline_import")
            return;
        if (!this.projectTopologyAssessment().hubAllowed) {
            void vscode.window.showWarningMessage("当前拓扑不使用 Hub。请使用“检测全部隧道”检查 Worker 本地隧道。");
            return;
        }
        const authorityClient = this.client;
        const integration = this.integration();
        const preview = integration.buildTunnelCommand(this.setupConfig);
        const answer = await vscode.window.showWarningMessage(`将通过 127.0.0.1:${this.setupConfig.localForwardPort} 运行真实对接检测。\n\n${preview.redactedShellCommand}`, { modal: true }, "检测已有隧道", "启动并检测");
        if (!answer || generation !== this.projectContextGeneration || authorityClient !== this.client)
            return;
        if (answer === "启动并检测") {
            const launch = await integration.launchTunnel(this.setupConfig);
            if (!launch.launched) {
                void vscode.window.showErrorMessage(`${launch.message} ${launch.error || ""}`.trim());
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 2500));
            if (generation !== this.projectContextGeneration || authorityClient !== this.client)
                return;
        }
        let result;
        try {
            result = await integration.runIntegrationCheck(this.setupConfig);
        }
        catch (error) {
            if (generation !== this.projectContextGeneration || authorityClient !== this.client)
                return;
            throw error;
        }
        if (generation !== this.projectContextGeneration || authorityClient !== this.client)
            return;
        result.probe = enforceExpectedAgentProjectRoot(result.probe, this.agentRuntimeDirs(this.setupConfig.agentProjectDir).workDir, "Hub");
        this.lastProbe = result.probe;
        this.lastIntegrationReport = result.report;
        this.lastHealth = this.healthFromProbe(result.probe);
        this.lastError = result.report.overall === "failed" ? result.probe.message : undefined;
        this.postState();
        const doc = await vscode.workspace.openTextDocument({ language: "json", content: JSON.stringify(result.report, null, 2) });
        if (generation === this.projectContextGeneration && authorityClient === this.client)
            await vscode.window.showTextDocument(doc, { preview: true });
    }
    async restartRealtimeStream() {
        const generation = this.projectContextGeneration;
        const client = this.client;
        if (this.effectiveConnectionMode() === "offline_import")
            return;
        try {
            await client.reconnect("manual restart");
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.lastError = undefined;
        }
        catch (error) {
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.lastError = errorMessage(error);
        }
        this.postState();
    }
    async pauseRealtimeStream() {
        const generation = this.projectContextGeneration;
        const client = this.client;
        await client.disconnect("paused");
        if (generation === this.projectContextGeneration && client === this.client)
            this.postState();
    }
    async resumeRealtimeStream() {
        await this.clearOfflineImport();
        await this.ensureRealtimeConnected("resume stream");
    }
    async pauseAllNetworkActivity() {
        const generation = this.projectContextGeneration;
        const client = this.client;
        client.pauseAll();
        await client.disconnect("paused");
        if (generation !== this.projectContextGeneration || client !== this.client)
            return;
        this.lastHealth = { state: "paused", status: "paused", checkedAt: new Date().toISOString(), message: "所有网络活动已暂停。" };
        this.postState();
    }
    async resumeNetwork() {
        const generation = this.projectContextGeneration;
        await this.clearOfflineImport();
        if (generation !== this.projectContextGeneration)
            return;
        this.client.resume();
        void this.ensureRealtimeConnected("resume network");
        this.postState();
    }
    async manualSnapshot() {
        const generation = this.projectContextGeneration;
        const client = this.client;
        await this.refreshLocalPlanMetadata({ post: false, force: true }).catch((error) => {
            if (generation !== this.projectContextGeneration)
                return;
            this.localPlanMetadata = { ...this.localPlanMetadata, error: errorMessage(error) };
        });
        if (generation !== this.projectContextGeneration)
            return;
        if (this.effectiveConnectionMode() === "offline_import") {
            void vscode.window.showInformationMessage("离线模式不会访问网络。请导入离线 bundle。");
            this.postState();
            return;
        }
        try {
            const results = await Promise.allSettled([
                client.getSnapshot(),
                client.getGpu(),
                client.getScheduler(),
                client.getTraces(),
            ]);
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            const [snapshot] = results;
            if (results.every((result) => result.status === "rejected"))
                throw results[0].reason;
            if (snapshot.status === "fulfilled")
                this.lastSnapshot = snapshot.value;
            this.lastSnapshotAt = new Date().toISOString();
            this.lastError = undefined;
            await this.pushLocalWorkerAvailability(true);
        }
        catch (error) {
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.lastError = errorMessage(error);
        }
        if (generation === this.projectContextGeneration && client === this.client)
            this.postState();
    }
    async manualGpuSnapshot() {
        const generation = this.projectContextGeneration;
        const client = this.client;
        if (this.effectiveConnectionMode() === "offline_import")
            return;
        try {
            await client.getGpu();
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            await this.pushLocalWorkerAvailability(true);
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.lastError = undefined;
        }
        catch (error) {
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.lastError = errorMessage(error);
        }
        if (generation === this.projectContextGeneration && client === this.client)
            this.postState();
    }
    async loadGpuHistoryFromUi(message) {
        const generation = this.projectContextGeneration;
        const client = this.client;
        const query = (0, GpuHistoryState_1.normalizeGpuHistoryQuery)({
            serverId: stringField(message, "serverId") || undefined,
            gpuId: stringField(message, "gpuId") || undefined,
            start: message && typeof message === "object" ? message.start : undefined,
            end: message && typeof message === "object" ? message.end : undefined,
            maxPoints: numberField(message, "maxPoints"),
        });
        const request = this.gpuHistoryState.load(query, async (normalized) => {
            if (this.effectiveConnectionMode() === "offline_import")
                throw new Error("离线模式不能查询 GPU 历史；已保留上次成功数据。");
            const capabilities = objectRecord(this.lastProbe?.capabilities);
            const endpoints = objectRecord(capabilities?.endpoints);
            if (endpoints && endpoints.gpuHistory !== true)
                throw new Error("当前 Hub Agent 未声明 GPU 历史 capability，请部署最新版 Agent 后重试。");
            return client.getGpuHistory(normalized);
        }, { force: Boolean(message && typeof message === "object" && message.force === true) });
        this.postState(true);
        let failure;
        try {
            await request;
        }
        catch (error) {
            failure = error;
        }
        if (generation === this.projectContextGeneration && client === this.client)
            this.postState(true);
        if (failure && stringField(message, "clientActionId"))
            throw failure;
    }
    async manualSchedulerSnapshot() {
        const generation = this.projectContextGeneration;
        const client = this.client;
        if (this.effectiveConnectionMode() === "offline_import")
            return;
        try {
            await client.getScheduler();
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.lastError = undefined;
        }
        catch (error) {
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.lastError = errorMessage(error);
        }
        if (generation === this.projectContextGeneration && client === this.client)
            this.postState();
    }
    async manualTracesSnapshot() {
        const generation = this.projectContextGeneration;
        const client = this.client;
        if (this.effectiveConnectionMode() === "offline_import")
            return;
        try {
            await client.getTraces();
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.lastError = undefined;
        }
        catch (error) {
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.lastError = errorMessage(error);
        }
        if (generation === this.projectContextGeneration && client === this.client)
            this.postState();
    }
    async generateTunnelScript() {
        const hubConfig = this.tunnelLaunchItems()[0].config;
        const errors = (0, XshellTunnelSetup_1.validateXshellSetupConfig)(hubConfig);
        if (errors.length) {
            void vscode.window.showErrorMessage(`${errors.join(" ")} 请先配置隧道。`);
            return;
        }
        const target = await vscode.window.showSaveDialog({
            title: "保存 Xshell 会话启动脚本",
            defaultUri: vscode.Uri.file(path.join(workspaceRoot() || process.cwd(), "start-zlk-xshell-tunnels.bat")),
            filters: { "Batch script": ["bat"], "PowerShell script": ["ps1"] },
        });
        if (!target)
            return;
        const endpoints = (0, TunnelEndpointRegistry_1.buildTunnelEndpointRegistry)(this.setupConfig, this.lastWorkerProbes).endpoints.filter((endpoint) => endpoint.enabled);
        const text = target.fsPath.toLowerCase().endsWith(".ps1")
            ? (endpoints.length > 1 ? (0, XshellTunnelCommandBuilder_1.generateXshellStartAllPs1Script)(this.setupConfig, endpoints) : (0, XshellTunnelCommandBuilder_1.generateXshellPs1Script)(hubConfig))
            : (endpoints.length > 1 ? (0, XshellTunnelCommandBuilder_1.generateXshellStartAllBatScript)(this.setupConfig, endpoints) : (0, XshellTunnelCommandBuilder_1.generateXshellBatScript)(hubConfig));
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
            title: "选择离线 bundle JSON 或目录",
            filters: { "离线 bundle": ["json"], "所有文件": ["*"] },
        });
        const source = picked?.[0]?.fsPath;
        if (!source)
            return;
        const result = await (0, OfflineImport_1.importOfflineBundle)(source);
        if (!result.ok || !result.bundle) {
            void vscode.window.showErrorMessage(result.error || "离线 bundle 导入失败。");
            return;
        }
        await this.pauseRealtimeStream();
        this.offlineBundle = result.bundle;
        this.applyOfflineResultsSummaryFromBundle(result.bundle);
        await this.persistProjectOfflineBundleState().catch(() => undefined);
        await this.context.workspaceState.update(keys.offlineBundle, undefined);
        this.resetClient();
        this.postState();
    }
    async handleMessage(message) {
        const rawCommand = stringField(message, "command");
        const command = getSafeCommand(message);
        const clientActionId = stringField(message, "clientActionId");
        if (rawCommand && !command) {
            const text = `未知或未放行的前端命令：${rawCommand}`;
            if (clientActionId)
                this.postUiCommandStatus(clientActionId, "failed", rawCommand, text);
            this.recordActionError({ command: rawCommand, message: text, suggestion: "请更新插件或清除旧布局中的失效按钮。" });
            this.postState();
            return;
        }
        const leaseAction = hostOperationLeaseActionForUiCommand(command);
        const work = leaseAction
            ? () => this.withHostOperationLease(leaseAction, hostOperationLeaseActionLabel(command), () => this.handleMessageCore(message, command))
            : () => this.handleMessageCore(message, command);
        if (clientActionId && commandNeedsUiStatus(command)) {
            await this.withUiCommandStatus(clientActionId, command, message, work);
            return;
        }
        await work();
    }
    async handleMessageCore(message, command = getSafeCommand(message)) {
        if (booleanField(message, "debugMode") && debugModeBlockedUiCommand(command))
            throw new Error("Debug 模式仅用于隔离运行和实时日志，禁止归档、删除、结果、统计、论文或 PPT 操作。请切回正式运行后再执行。");
        switch (command) {
            case "webviewReady":
                this.webviewReady = true;
                await this.flushPendingPanelNavigation();
                this.statePostRetryCount = 0;
                if (this.statePostRetryTimer)
                    clearTimeout(this.statePostRetryTimer);
                this.statePostRetryTimer = undefined;
                this.clearPanelReadyWatchdog();
                this.postState(true);
                void this.refreshPptAutomationReadiness(false).catch(() => undefined);
                break;
            case "webviewBootstrapError":
                this.lastError = String(message?.error || "Webview 脚本启动失败").slice(0, 480);
                this.recordActionError({ command, message: this.lastError, suggestion: "点击“重新加载面板”；若仍失败，请执行 Developer: Reload Window。" });
                if (!this.webviewReady)
                    this.showPanelRecovery(this.lastError);
                break;
            case "webviewRenderError":
                this.lastError = String(message?.error || "Webview 状态渲染失败").slice(0, 480);
                this.recordActionError({ command, message: this.lastError, suggestion: "请重新加载面板；若仍失败，请执行 Developer: Reload Window。" });
                break;
            case "reloadPanel":
                this.reloadPanelHtml();
                break;
            case "configureSessions":
                await this.configureXshellSavedSessions();
                break;
            case "configureAgentSessions":
                await this.configureXshellAgentSessions();
                break;
            case "writeAgentCommands":
                await this.writeXshellAgentStartupCommands();
                break;
            case "saveTopologyMode":
                await this.saveTopologyModeFromUi(message);
                break;
            case "saveHubConfig":
                await this.saveHubConfigFromUi(message);
                break;
            case "saveSchedulerConfig":
                await this.saveSchedulerConfigFromUi(message);
                break;
            case "saveWorkerConfig":
                await this.saveWorkerConfigFromUi(message);
                break;
            case "addWorkerConfig":
                await this.addWorkerConfigFromUi();
                break;
            case "deleteWorkerConfig":
                await this.deleteWorkerConfigFromUi(message);
                break;
            case "startTunnelEndpoint":
                await this.startTunnelEndpointFromUi(message);
                break;
            case "startAgentEndpoint":
                await this.startAgentEndpointFromUi(message);
                break;
            case "configureWorkers":
                await this.configureWorkerTunnels();
                break;
            case "quickSetup":
                await this.quickSetup();
                break;
            case "openSetupGuide":
                await this.openSetupGuide();
                break;
            case "openAdvancedCommandsSetting":
                await vscode.commands.executeCommand("workbench.action.openSettings", "zlkCluster.showAdvancedCommands");
                break;
            case "configurePorts":
                await this.configureTunnelPorts();
                break;
            case "repairPorts":
                await this.repairTunnelPorts();
                break;
            case "configure":
                await this.configureXshellRealtimeTunnel();
                break;
            case "startHub":
                await this.startHubTunnel();
                break;
            case "startWorker":
                await this.startWorkerTunnel();
                break;
            case "start":
                await this.startXshellRealtimeTunnel();
                break;
            case "startAll":
                await this.startAllXshellRealtimeTunnels();
                break;
            case "startAgents":
                await this.startAllXshellAgentSessions();
                break;
            case "startAllConnections":
                await this.startAllXshellConnections();
                break;
            case "prepareAgents":
                await this.prepareAgentsForFirstRun();
                break;
            case "testAll":
                await this.testTunnel(true);
                break;
            case "showRegistry":
                await this.showTunnelEndpointRegistry();
                break;
            case "test":
                await this.testTunnel(true);
                break;
            case "restart":
                await this.restartRealtimeStream();
                break;
            case "pauseStream":
                await this.pauseRealtimeStream();
                break;
            case "resumeStream":
                await this.resumeRealtimeStream();
                break;
            case "pauseAll":
                await this.pauseAllNetworkActivity();
                break;
            case "resumeNetwork":
                this.resumeNetwork();
                break;
            case "snapshot":
                await this.manualSnapshot();
                break;
            case "manualGpuSnapshot":
                await this.manualGpuSnapshot();
                break;
            case "loadGpuHistory":
                await this.loadGpuHistoryFromUi(message);
                break;
            case "manualSchedulerSnapshot":
                await this.manualSchedulerSnapshot();
                break;
            case "manualTracesSnapshot":
                await this.manualTracesSnapshot();
                break;
            case "selectLogRunKey":
                this.selectedLogRunKey = stringField(message, "runKey") || undefined;
                this.client.setProtectedLogKeys(this.logProtectedKeys());
                await this.fetchSelectedLiveOutput(this.selectedLogRunKey, stringField(message, "workerId"));
                this.postState();
                break;
            case "script":
                await this.generateTunnelScript();
                break;
            case "realCheck":
                await this.runXshellRealIntegrationCheck();
                break;
            case "status":
                await this.openTunnelStatus();
                break;
            case "offline":
                await this.importOffline();
                break;
            case "selectPlan":
                this.selectPlanFromUi(message);
                break;
            case "openPlan":
                await this.openWorkspacePlanFromUi(message);
                break;
            case "savePlan":
                await this.savePlanFromUi(message);
                break;
            case "archivePlan":
                await this.archivePlanFromUi(message);
                break;
            case "restoreArchivedPlan":
                await this.restoreArchivedPlanFromUi(message);
                break;
            case "runAllPlans":
                await this.runAllPlansFromUi();
                break;
            case "generatePlanGuide":
                await this.generatePlanGuideFromUi();
                break;
            case "bootstrapProject":
                await this.bootstrapProjectFromUi();
                break;
            case "generateOutputAdapter":
                await this.generateOutputAdapterFromUi();
                break;
            case "saveProjectAdapterRules":
                await this.saveProjectAdapterRulesFromUi(message);
                break;
            case "savePptPlotConfig":
                await this.savePptPlotConfigFromUi(message);
                break;
            case "choosePptPath":
                await this.choosePptPathFromUi();
                break;
            case "chooseNewPptPath":
                await this.chooseNewPptPathFromUi();
                break;
            case "plotResultsToPpt":
                await this.plotResultsToPptFromUi(message);
                break;
            case "refreshPptAutomation":
                await this.refreshPptAutomationReadiness(false);
                break;
            case "startPptAutomation":
                await this.refreshPptAutomationReadiness(true);
                break;
            case "openPptAutomationGuide":
                await this.openPptAutomationGuide();
                break;
            case "selectExperiment":
                this.selectExperimentFromUi(message);
                break;
            case "clearLegacyTasks":
                await this.clearLegacyTasksFromUi(message);
                break;
            case "saveUiLayout":
                await this.saveUiLayoutFromUi(message);
                break;
            case "resetUiLayout":
                await this.resetUiLayoutFromUi();
                break;
            case "publishGithub":
                await this.publishToGitHub();
                break;
            case "syncGithub":
                await this.syncToGitHub();
                break;
            case "overwriteGithub":
                await this.overwriteFromGitHub();
                break;
            case "uploadProjectToHub":
                await this.uploadProjectToHub();
                break;
            case "uploadProjectToWorkers":
                await this.uploadProjectToWorkers();
                break;
            case "distributeCodeToWorkers":
                await this.distributeCodeToWorkers();
                break;
            case "deployLatestAgent":
                await this.deployLatestAgentRuntime();
                break;
            case "configureSftpIgnores":
                await this.configureSftpIgnores();
                break;
            case "resetRemotePathConfirmations":
                await this.resetRemotePathConfirmationsFromUi();
                break;
            case "resetPptPathConfirmations":
                await this.resetPptPathConfirmationsFromUi();
                break;
            case "downloadDebugBundle":
                await this.downloadDebugBundle();
                break;
            case "downloadRemoteResult":
                await this.downloadRemoteResultFromUi(message);
                break;
            case "openResultArtifact":
                await this.openResultArtifactFromUi(message);
                break;
            case "openAuditTail":
                await this.openAuditTail();
                break;
            default:
                if (uiActionCommands.has(command))
                    await this.runActionCommand(command, message);
                else if (command)
                    throw new Error(`前端命令没有绑定处理器：${command}`);
                break;
        }
    }
    private async withUiCommandStatus(clientActionId, command, message, work) {
        this.postUiCommandStatus(clientActionId, "running", command, "running");
        let timer;
        const watchdogMs = this.uiCommandWatchdogMs(command);
        const guardedWork = work()
            .then(() => ({
            status: "completed",
            message: localCommandReleasesAfterTrigger(command) ? "已触发本地 VS Code 操作" : "completed",
        }))
            .catch((error) => {
            if (isUiCommandRemotePending(error))
                return { status: "submitted", message: errorMessage(error), remotePending: true };
            if (isUiCommandCancelled(error))
                return { status: "cancelled", message: errorMessage(error) };
            return { status: "failed", message: errorMessage(error) };
        });
        const timeout = new Promise((resolve) => {
            timer = setTimeout(() => resolve({ status: "stalled", message: `本地命令 ${Math.round(watchdogMs / 1000)}s 内未结束，按钮已恢复；后台操作可能仍在继续。`, watchdog: true }), watchdogMs);
            timer.unref?.();
        });
        const result = await Promise.race([guardedWork, timeout]);
        if (timer)
            clearTimeout(timer);
        if (result.status === "failed") {
            this.recordActionError({ command, message: result.message, suggestion: actionErrorSuggestion(result.message) });
            this.postState();
        }
        this.postUiCommandStatus(clientActionId, result.status, command, result.message);
        if (result.status === "stalled" && result.watchdog && !result.remotePending) {
            void guardedWork.then((lateResult) => {
                const message = `后台真实终态：${lateResult.message}`;
                if (lateResult.status === "failed") {
                    this.recordActionError({ command, message: lateResult.message, suggestion: actionErrorSuggestion(lateResult.message) });
                    this.postState();
                }
                this.postUiCommandStatus(clientActionId, lateResult.status, command, message);
            });
        }
    }
    uiCommandWatchdogMs(command) {
        if (command === "runAllPlans") {
            const planCount = Math.max(1, Number(this.localPlanMetadata.plans?.length || 0));
            return Math.min(60 * 60_000, Math.max(180_000, planCount * 130_000 + 60_000));
        }
        if (command === "runPlan" || command === "reproducePlan")
            return 150_000;
        if (command === "validatePlan" || command === "dryRunPlan")
            return 90_000;
        return 45_000;
    }
    private postUiCommandStatus(clientActionId, status, command, message) {
        if (!this.view || !clientActionId)
            return;
        void this.view.webview.postMessage({
            type: "uiCommandStatus",
            clientActionId,
            status,
            command,
            message,
            updatedAt: new Date().toISOString(),
        });
    }
    notifyLocalActionStarted(title, detail) {
        void vscode.window.showInformationMessage(`${title} 已开始：${detail}`);
    }
    async saveUiLayoutFromUi(message) {
        const layout = normalizeUiLayout(recordField(message, "layout"));
        // Project layout is authoritative for the open workspace.
        // globalState only keeps a pinnedCommands template for brand-new projects.
        this.projectUiLayout = projectUiLayoutState(layout);
        await Promise.all([
            this.context.globalState.update(keys.uiLayout, globalUiLayoutState(layout)),
            this.persistProjectUiLayoutState(),
            this.context.workspaceState.update(keys.uiProjectLayout, undefined),
            this.context.workspaceState.update(keys.uiProjectActions, undefined),
        ]);
        this.postState();
    }
    async resetUiLayoutFromUi() {
        this.projectUiLayout = projectUiLayoutState(defaultUiLayout);
        await Promise.all([
            this.context.globalState.update(keys.uiLayout, globalUiLayoutState(defaultUiLayout)),
            this.persistProjectUiLayoutState(),
            this.context.workspaceState.update(keys.uiProjectLayout, undefined),
            this.context.workspaceState.update(keys.uiProjectActions, undefined),
        ]);
        this.postState();
    }
    async runActionCommand(command, message) {
        if (actionCommandMap[command]) {
            return this.withHostOperationLease(command, hostOperationLeaseActionLabel(command), () => this.runActionCommandCore(command, message));
        }
        return this.runActionCommandCore(command, message);
    }
    async runActionCommandCore(command, message) {
        const action = actionCommandMap[command];
        if (!action)
            return;
        assertSingleProjectWorkspace("远端实验操作");
        this.assertRetryPlanContext(command, message);
        const body = this.actionBody(message);
        const actionPlanFile = operationResultPlanFile(body) || body?.options?.planFile || body?.planFile || body?.selectedPlanId || "";
        if (actionPlanFile && command !== "runAllPlans") {
            await this.refreshLocalPlanMetadataForAction(body);
            this.stampPlanRevision(body);
        }
        await this.ensureManualStopReason(command, body);
        const workerAction = directWorkerActionMap[command];
        const messageWorkerIds = stringArrayField(message, "selectedWorkerIds").map((id) => this.resolveWorkerEndpointId(id) || id);
        const uniqueMessageWorkerIds = uniqueStrings(messageWorkerIds);
        if (workerAction && uniqueMessageWorkerIds.length > 1) {
            await this.postMultiWorkerTunnelAction(uniqueMessageWorkerIds, workerAction, body, {
                title: command,
                confirm: ["stopExperiment", "archiveArtifacts", "deleteArtifacts"].includes(command),
                danger: command === "deleteArtifacts",
            });
            if (actionAffectsResultsSummary(workerAction)) {
                const planHint = operationResultPlanFile(body) || body?.options?.planFile || body?.planFile || "";
                this.queueSelectedPlanResultParse("Worker 结果动作", planHint);
                await this.refreshResultsSummary(planHint);
            }
            return;
        }
        const workerId = this.resolveWorkerEndpointId(stringField(message, "workerId")) || usableSelectionKey(stringField(message, "workerId")) || (messageWorkerIds.length === 1 ? messageWorkerIds[0] : "");
        if (workerAction && workerId) {
            let workerBody = body;
            body.selectedWorkerIds = [workerId];
            body.options = { ...(body.options || {}), workerId };
            if (!this.projectTopologyAssessment().hubAllowed && workerAction === "archive-worker-artifacts")
                workerBody = this.stampNoHubResultOwnership(body, workerId);
            const missing = this.missingWorkerActionCapabilities(workerId, workerAction);
            if (!missing.length || !this.canFallbackTaskActionToHub(command, body, missing)) {
                const result = await this.postWorkerTunnelAction(workerId, workerAction, workerBody, {
                    title: command,
                    confirm: ["stopExperiment", "archiveArtifacts", "deleteArtifacts"].includes(command),
                    danger: command === "deleteArtifacts",
                });
                this.throwIfRemoteActionPending(command, workerAction, result);
                if (actionAffectsResultsSummary(workerAction)) {
                    const planHint = operationResultPlanFile(result) || body?.options?.planFile || body?.planFile || "";
                    this.queueSelectedPlanResultParse("Worker 结果动作", planHint);
                    await this.refreshResultsSummary(planHint);
                }
                return;
            }
            body.options = {
                ...(body.options || {}),
                workerId,
                workerActionFallback: "hub_project_state",
                workerActionFallbackReason: missing.join(", "),
            };
        }
        if (command === "validatePlan" || command === "dryRunPlan") {
            await this.refreshLocalPlanMetadataForAction(body);
            this.stampPlanRevision(body);
            await this.assertPlanLocalConfigFiles(body);
            this.assertPlanSchedulerAgentReady(command);
            await this.ensureHubCodeReadyForPlanCheck();
        }
        if (command === "runPlan" || command === "reproducePlan") {
            this.assertPlanTopologyReady(command);
            await this.refreshLocalPlanMetadataForAction(body);
            this.stampPlanRevision(body);
            await this.assertPlanLocalConfigFiles(body);
            const plan = this.localPlanForActionBody(body);
            const outputGateReason = projectOutputGateReason(this.localPlanMetadata.detectedProject, plan);
            if (outputGateReason)
                throw new Error(outputGateReason);
            this.assertExecutionWorkersReady(body.options?.workers);
            this.assertExecutionAgentProjectsReady();
            this.assertPlanNotAlreadyActive(operationResultPlanFile(body) || plan?.planFile || plan?.file || plan?.planId || "", plan);
            if (!await this.ensureSimpleSftpReadyForSetup(body.debugMode === true ? "Debug 首跑" : command === "reproducePlan" ? "复现实验" : "运行计划"))
                return;
            await this.confirmPlanRunSubmission(command, plan, body.debugMode === true);
            await this.ensureCodeReadyForRun();
            if (!await this.runPlanPreflight(body, "当前计划"))
                return;
        }
        const danger = command === "deleteArtifacts";
        const noHubResult = await this.postNoHubResultAction(command, action, body, {
            confirm: ["archiveArtifacts", "excludeResults", "syncArtifacts", "completeThreeWay"].includes(command),
            danger,
        });
        const result = noHubResult !== undefined
            ? noHubResult
            : ["validatePlan", "dryRunPlan", "runPlan", "reproducePlan"].includes(command)
            ? await this.postPlanSchedulerAction(action, body, {
                title: command,
                confirm: false,
                danger,
                requiresCapability: capabilityForUiCommand(command, action),
            })
            : await this.postTunnelAction(action, body, {
            title: command,
            confirm: ["stopExperiment", "retryExperiment", "archiveArtifacts", "excludeResults", "syncArtifacts", "completeThreeWay", "deleteArtifacts"].includes(command),
            danger,
            requiresCapability: capabilityForUiCommand(command, action),
        });
        const finalResult = actionAffectsResultsSummary(action)
            ? await this.waitForOperationTerminalResult(action, result, command, 45_000)
            : result;
        if (command === "runPlan" || command === "reproducePlan")
            await this.openPanelAt("tasks", "tasks-list");
        this.throwIfRemoteActionPending(command, action, finalResult);
        if (["parseResults", "refreshResults", "runQualityGate", "runStatistics", "exportPaperTable", "checkClaimEvidence", "checkOutputContract", "parseCaseLevel", "runLeakageCheck", "runSubgroupAnalysis", "exportCaseAnalysis", "planCheckpointRetention", "inspectDataset", "exportPlottingContract", "inferConfigFromRun", "recoverPlanFromRun", "diagnoseResultAnomaly", "compareWithBestConfig", "excludeResults"].includes(command)) {
            const planHint = operationResultPlanFile(finalResult) || body?.options?.planFile || body?.planFile || "";
            if (command !== "parseResults" && command !== "refreshResults")
                this.queueSelectedPlanResultParse(command, planHint);
            await this.refreshResultsSummary(planHint);
        }
        this.throwIfTerminalActionFailure(command, action, resultStatus(finalResult), finalResult);
    }
    async runPlanPreflight(body, label) {
        const prefix = String(label || "当前计划").trim() || "当前计划";
        const workerId = this.planSchedulerWorkerId();
        const validate = await this.postPlanSchedulerAction("validate-plan", body, {
            title: `${prefix}：校验`,
            requiresCapability: ["endpoints.actions", "actions.validate-plan"],
        });
        const validated = remoteActionPendingStatus(resultStatus(validate))
            ? await this.waitForOperationTerminalResult("validate-plan", validate, `${prefix}：校验`, 45_000, workerId)
            : validate;
        if (!validated)
            return false;
        const preview = await this.postPlanSchedulerAction("dry-run-plan", body, {
            title: `${prefix}：预演`,
            requiresCapability: ["endpoints.actions", "actions.dry-run-plan"],
        });
        const previewed = remoteActionPendingStatus(resultStatus(preview))
            ? await this.waitForOperationTerminalResult("dry-run-plan", preview, `${prefix}：预演`, 45_000, workerId)
            : preview;
        return Boolean(previewed);
    }
    async confirmPlanRunSubmission(command, plan, debugMode = false) {
        const remoteTargets = this.planRunRemoteTargets();
        const projectOutputCandidates = adapterRuleResultCandidates(this.localPlanMetadata.detectedProject?.adapterRules || {});
        const label = command === "reproducePlan" ? "确认复现" : "确认提交";
        const answer = await vscode.window.showWarningMessage(planRunConfirmationDetail(command, { ...(plan || {}), debugMode, confirmationOutputCandidates: projectOutputCandidates }, remoteTargets), { modal: true }, label);
        if (answer !== label)
            throw new UiCommandCancelled(command === "reproducePlan" ? "复现实验已取消。" : "运行计划已取消。");
    }
    async confirmPlanBatchRunSubmission(plans) {
        const remoteTargets = this.planRunRemoteTargets();
        const projectOutputCandidates = adapterRuleResultCandidates(this.localPlanMetadata.detectedProject?.adapterRules || {});
        const confirmationPlans = (Array.isArray(plans) ? plans : []).map((plan) => ({ ...(plan || {}), confirmationOutputCandidates: projectOutputCandidates }));
        const label = "确认批量运行";
        const answer = await vscode.window.showWarningMessage(planBatchRunConfirmationDetail(confirmationPlans, remoteTargets), { modal: true }, label);
        if (answer !== label)
            throw new UiCommandCancelled("运行全部计划已取消，未上传代码或提交任务。");
    }
    planRunRemoteTargets() {
        const topology = this.assertTopologyReady("显示 Plan 运行目标");
        const workers = this.workerCodeSyncTargets();
        const workerConfigs = new Map(this.setupConfig.workerTunnels.map((worker) => [worker.id, worker]));
        return [
            ...(topology.hubAllowed ? [{ label: "Hub 汇总", role: "hub", remotePath: this.hubCodeSyncTarget().remotePath }] : []),
            ...workers.map((worker) => {
                const config = workerConfigs.get(worker.id);
                return {
                    label: worker.label || worker.id,
                    role: "worker",
                    remotePath: worker.remotePath,
                    maxConcurrentGpus: config?.maxConcurrentGpus || 1,
                    allowedGpuIds: config?.allowedGpuIds || [],
                    condaEnv: effectiveWorkerCondaEnv(config, this.setupConfig.condaEnv),
                };
            }),
        ];
    }
    assertExecutionWorkersReady(workers = this.workerActionTargets()) {
        if (!Array.isArray(workers) || !workers.length)
            throw new Error("至少需要配置并启用一个 Worker 才能运行实验。请在“设置 > 服务器”添加 Worker 的 Xshell 会话和项目父目录。");
    }
    assertHubAgentProjectReady() {
        assertAgentProjectProbeReady(this.lastProbe, this.agentRuntimeDirs(this.setupConfig.agentProjectDir).workDir, "Hub");
    }
    assertExecutionAgentProjectsReady() {
        const topology = this.assertPlanTopologyReady("运行实验");
        if (topology.hubAllowed)
            this.assertHubAgentProjectReady();
        for (const worker of this.enabledWorkerConfigs()) {
            assertAgentProjectProbeReady(this.lastWorkerProbes[worker.id], this.expectedWorkerAgentProjectRoot(worker.id), worker.displayName || worker.id);
        }
    }
    assertPlanSchedulerAgentReady(operation = "Plan 操作") {
        const topology = this.assertPlanTopologyReady(operation);
        if (topology.mode === "hub_worker") {
            this.assertHubAgentProjectReady();
            return;
        }
        for (const worker of this.enabledWorkerConfigs())
            assertAgentProjectProbeReady(this.lastWorkerProbes[worker.id], this.expectedWorkerAgentProjectRoot(worker.id), worker.displayName || worker.id);
    }
    assertPlanNotAlreadyActive(planFile, plan) {
        const selectedPlan = plan || (this.localPlanMetadata.plans || []).find((item) => samePlanSelection(item?.planFile || item?.file || item?.planId || "", planFile));
        const activity = activePlanRunEvidence(this.buildState(), planFile, selectedPlan);
        if (!activity.active)
            return;
        if (activity.historicalOnly) {
            throw new Error(`同一路径的旧 Plan revision 仍有 ${activity.taskCount} 个任务和 ${activity.operationCount} 个提交操作未结束。为保护旧任务，已阻止当前版本提交；请先在“全部任务”查看并处理旧版本运行。`);
        }
        throw new Error(`当前 Plan 已有未结束的运行：${activity.taskCount} 个任务、${activity.operationCount} 个提交操作。已阻止重复提交；请先在“任务运行状态”查看排队、运行或停止结果。`);
    }
    expectedWorkerAgentProjectRoot(workerId) {
        const worker = this.setupConfig.workerTunnels.find((item) => item.id === workerId);
        return this.agentRuntimeDirs(worker?.agentProjectDir || this.setupConfig.agentProjectDir).workDir;
    }
    async openSetupGuide() {
        const guide = path.join(this.context.extensionPath, "docs", "simple-experiment-setup.md");
        const uri = vscode.Uri.file(guide);
        try {
            await vscode.commands.executeCommand("markdown.showPreview", uri);
        }
        catch {
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document, { preview: true, viewColumn: vscode.ViewColumn.Active });
        }
        const seen = new Set();
        for (let step = 0; step < SETUP_GUIDE_MAX_STEPS; step += 1) {
            const enabledWorkers = this.enabledWorkerConfigs();
            const simpleSftp = simpleSftpIntegrationReadiness();
            const next = setupGuideNextStep({
                simpleSftpReady: simpleSftp.ready,
                simpleSftpMessage: simpleSftp.message,
                setupComplete: initialServerSetupComplete(this.setupConfig, this.projectTopologyAssessment().hubAllowed),
                workerCount: enabledWorkers.length,
                workspaceOpen: Boolean(workspaceRoot()),
            });
            const key = JSON.stringify([next.message, next.action]);
            if (seen.has(key))
                return;
            seen.add(key);
            const choice = await vscode.window.showInformationMessage(next.message, next.action, "打开面板");
            if (choice === "开始一键配置") {
                if (await this.quickSetup(false))
                    continue;
                return;
            }
            if (choice === "打开扩展管理") {
                await vscode.commands.executeCommand("workbench.extensions.search", "@id:simple-local.simple-sftp");
                return;
            }
            if (choice === "添加 Worker") {
                if (await this.addWorkerConfigFromUi(false))
                    continue;
                return;
            }
            if (choice === "选择项目并继续") {
                await this.openWorkspaceFolderForContinuation("配置说明", "setupGuide");
                return;
            }
            if (choice === "接入当前项目") {
                await this.bootstrapProjectFromUi();
                return;
            }
            if (choice === "打开面板")
                await vscode.commands.executeCommand("zlkCluster.openPanel");
            return;
        }
    }
    async openPanelAt(section, anchor = section, options = {}) {
        const target = {
            section: String(section || "overview").trim() || "overview",
            anchor: String(anchor || section || "overview").trim() || "overview",
            ...(String(options.taskPlanScope || "") === "all" ? { taskPlanScope: "all" } : {}),
        };
        this.pendingPanelNavigation = target;
        await vscode.commands.executeCommand("zlkCluster.openPanel");
        await this.flushPendingPanelNavigation();
    }
    async flushPendingPanelNavigation() {
        const target = this.pendingPanelNavigation;
        if (!target || !this.view || !this.webviewReady)
            return false;
        const delivered = await this.view.webview.postMessage({ type: "navigate", ...target });
        if (delivered && this.pendingPanelNavigation === target)
            this.pendingPanelNavigation = undefined;
        return delivered;
    }
    async assertPlanLocalConfigFiles(body) {
        const root = workspaceRoot();
        const plan = this.localPlanForActionBody(body);
        const file = String(plan?.planFile || plan?.file || body?.planFile || "").trim();
        if (!root || !file)
            return;
        const text = await fs.readFile(safeWorkspacePlanPath(root, file, planDirSafe()), "utf8");
        const summary = (0, PlanBuilder_1.parsePlanSummary)(text);
        const missing = [];
        const configReferences = planRuntimeConfigReferences(text, summary.mode);
        const legacyRestoredConfigs = configReferences.filter((relative) => /^zlk_cluster\/restored_configs\//i.test(relative));
        if (legacyRestoredConfigs.length) {
            throw new Error(`旧恢复 Plan 的配置位于本地状态目录，不会上传到服务器：${legacyRestoredConfigs.join("、")}。请从已归档计划卡再次点击“恢复”，生成可同步的新版本。`);
        }
        for (const relative of configReferences) {
            const stat = await fs.stat(safeWorkspaceChildPath(root, relative)).catch(() => undefined);
            if (!stat?.isFile())
                missing.push(relative);
        }
        if (missing.length)
            throw new Error(`当前 Plan 引用的配置文件不存在：${missing.join("、")}。`);
        const commands = uniqueStrings(planCommandValues(text, summary.mode));
        const missingEntries = [];
        for (const relative of uniqueStrings(commands.flatMap(pythonCommandEntryReferences))) {
            const stat = await fs.stat(safeWorkspaceChildPath(root, relative)).catch(() => undefined);
            if (!stat?.isFile())
                missingEntries.push(relative);
        }
        if (missingEntries.length)
            throw new Error(`当前 Plan 的 Python 入口文件不存在：${missingEntries.join("、")}。请修正 runner 命令后再校验或运行。`);
    }
    stampPlanRevision(body, plan = this.localPlanForActionBody(body)) {
        const revision = String(plan?.revision || "").trim();
        if (!revision)
            return;
        body.planRevision = revision;
        body.options = { ...(body.options || {}), planRevision: revision };
    }
    async ensureManualStopReason(command, body) {
        if (command !== "stopExperiment")
            return;
        const current = String(body.manualStopType || body.stopReason || body.options?.manualStopType || body.options?.stopReason || "").trim();
        if (current)
            return;
        const picked = await vscode.window.showQuickPick([
            { label: "代码有误或效果不好，停止后不再自动重跑", value: "manual_stop_bad_code_or_no_effect" },
            { label: "模型已收敛，停止后作为待审核完成任务", value: "manual_stop_converged" },
        ], {
            placeHolder: "选择手动中断原因；任务会标记为已完成但需要你后续审核是否归档。",
            ignoreFocusOut: true,
        });
        if (!picked)
            throw new UiCommandCancelled("停止任务已取消。");
        body.manualStopType = picked.value;
        body.stopReason = picked.value;
        body.options = { ...(body.options || {}), manualStopType: picked.value, stopReason: picked.value, stopSource: "user" };
    }
    assertRetryPlanContext(command, message) {
        if (command !== "retryExperiment")
            return;
        const selectedPlanFiles = uniqueStrings(stringArrayField(message, "selectedPlanFiles").map(usableSelectionKey).filter(Boolean));
        const selectedTaskCount = stringArrayField(message, "selectedRunKeys").length +
            stringArrayField(message, "selectedExperimentIds").length +
            stringArrayField(message, "selectedArchiveKeys").length +
            stringArrayField(message, "selectedTaskUiKeys").length;
        if (!selectedTaskCount)
            return;
        const explicitPlanFile = usableSelectionKey(stringField(message, "planFile")) || usableSelectionKey(stringField(message, "planId"));
        if (selectedPlanFiles.length > 1) {
            throw new Error("批量重试需要选中的任务来自同一个 plan；请按计划分批选择。");
        }
        if (!explicitPlanFile && selectedPlanFiles.length !== 1) {
            throw new Error("批量重试需要任务带有所属 planFile；旧任务缺少 plan 时不能安全重试。");
        }
    }
    canFallbackTaskActionToHub(command, body, missingWorkerCapabilities) {
        if (!["archiveArtifacts", "deleteArtifacts"].includes(command))
            return false;
        if (!missingWorkerCapabilities.length)
            return false;
        const targets = [
            body.archiveKey,
            body.runKey,
            ...(Array.isArray(body.selectedArchiveKeys) ? body.selectedArchiveKeys : []),
            ...(Array.isArray(body.selectedRunKeys) ? body.selectedRunKeys : []),
            ...(Array.isArray(body.selectedExperimentIds) ? body.selectedExperimentIds : []),
        ].map((value) => String(value || "").trim()).filter((value) => value && value !== "-");
        return targets.length > 0;
    }
    async postMultiWorkerTunnelAction(workerIds, action, body, options) {
        const ids = uniqueStrings(workerIds.map((id) => this.resolveWorkerEndpointId(id) || id).filter(Boolean));
        if (!ids.length)
            throw new Error("缺少可直连的 Worker 目标。");
        if (options.confirm || options.danger) {
            const label = options.danger ? "确认危险操作" : "确认执行";
            const answer = await vscode.window.showWarningMessage(workerRemoteActionConfirmationDetail(options.title, action, body, ids), { modal: true }, label);
            if (answer !== label)
                throw new UiCommandCancelled(`${options.title} 已取消。`);
        }
        const failures = [];
        let pendingCount = 0;
        for (const workerId of ids) {
            try {
                let scopedBody = this.workerScopedActionBody(body, workerId);
                if (!this.projectTopologyAssessment().hubAllowed && action === "archive-worker-artifacts")
                    scopedBody = this.stampNoHubResultOwnership(scopedBody, workerId);
                const result = await this.postWorkerTunnelAction(workerId, action, {
                    ...scopedBody,
                    selectedWorkerIds: [workerId],
                    options: {
                        ...(scopedBody.options || {}),
                        workerId,
                        directWorker: true,
                        multiWorkerDirect: true,
                    },
                }, {
                    title: options.title,
                    confirm: false,
                    danger: false,
                });
                if (remoteActionPendingStatus(resultStatus(result)))
                    pendingCount += 1;
            }
            catch (error) {
                failures.push(`${workerId}: ${errorMessage(error)}`);
            }
        }
        if (failures.length)
            throw new Error(`部分 Worker 操作失败：${failures.join("；")}`);
        if (pendingCount)
            throw new UiCommandRemotePending(`${options.title} 已提交到 ${pendingCount}/${ids.length} 个 Worker Agent，等待 operation 终态；按钮已恢复，可在“操作进度”查看。`);
    }
    workerScopedActionBody(body, workerId) {
        const targets = Array.isArray(body.selectedTaskTargets) ? body.selectedTaskTargets : [];
        if (!targets.length)
            return body;
        const scopedTargets = targets.filter((target) => {
            const id = this.resolveWorkerEndpointId(target.workerId || "") || target.workerId || "";
            return id === workerId;
        });
        if (!scopedTargets.length) {
            throw new Error(`Worker ${workerId} 没有匹配的已选任务，已阻止跨 Worker 批量操作污染。`);
        }
        const selectedRunKeys = uniqueStrings(scopedTargets.map((target) => usableSelectionKey(target.runKey || "")).filter(Boolean));
        const selectedExperimentIds = uniqueStrings(scopedTargets.map((target) => usableSelectionKey(target.experimentId || "")).filter(Boolean));
        const selectedArchiveKeys = uniqueStrings(scopedTargets.map((target) => usableSelectionKey(target.archiveKey || "")).filter(Boolean));
        const selectedTaskUiKeys = uniqueStrings(scopedTargets.map((target) => usableSelectionKey(target.taskUiKey || "")).filter(Boolean));
        const selectedPlanFiles = uniqueStrings(scopedTargets.map((target) => usableSelectionKey(target.planFile || "")).filter(Boolean));
        return {
            ...body,
            runKey: selectedRunKeys.length === 1 ? selectedRunKeys[0] : undefined,
            experimentId: selectedExperimentIds.length === 1 ? selectedExperimentIds[0] : undefined,
            archiveKey: selectedArchiveKeys.length === 1 ? selectedArchiveKeys[0] : undefined,
            selectedRunKeys,
            selectedExperimentIds,
            selectedArchiveKeys,
            selectedTaskUiKeys,
            selectedPlanFiles,
            selectedTaskTargets: scopedTargets,
            options: {
                ...(body.options || {}),
                planFile: selectedPlanFiles.length === 1 ? selectedPlanFiles[0] : (body.options || {}).planFile,
                selectedPlanFiles,
                selectedTaskTargets: scopedTargets,
            },
        };
    }
    async syncToGitHub(confirm = true) {
        if (confirm)
            this.notifyLocalActionStarted("同步到 GitHub", "正在执行 git add/commit/push。");
        const repo = await this.primaryGitRepository();
        const message = timestampCommitMessage();
        await vscode.commands.executeCommand("git.stageAll");
        if (gitRepositoryHasChanges(repo)) {
            repo.inputBox.value = message;
            await repo.commit(message);
        }
        await repo.push();
        void vscode.window.showInformationMessage(`GitHub 同步完成：${message}`);
    }
    async publishToGitHub() {
        this.notifyLocalActionStarted("一键发布当前项目", "正在创建或推送远程仓库，并提交当前工作区改动。");
        const repo = await this.primaryGitRepository();
        if (gitRepositoryHasRemote(repo)) {
            await this.syncToGitHub(false);
            return;
        }
        const root = workspaceRoot();
        if (!root)
            throw new Error("请先打开一个工作区，再执行 GitHub 发布。");
        const message = timestampCommitMessage();
        await vscode.commands.executeCommand("git.stageAll");
        if (gitRepositoryHasChanges(repo)) {
            repo.inputBox.value = message;
            await repo.commit(message);
        }
        await runVsCodeShellTask("SimpleExperiment GitHub publish", "gh repo create --source . --remote origin --private --push", root);
        void vscode.window.showInformationMessage("GitHub 发布完成。");
    }
    async overwriteFromGitHub() {
        await confirmUiCommand("从 GitHub 覆盖本机", "将执行 git reset --hard 和 git clean，删除本地未提交改动。", true);
        const root = workspaceRoot();
        if (!root)
            throw new Error("请先打开一个工作区，再从 GitHub 覆盖本机。");
        await runVsCodeShellTask("SimpleExperiment GitHub overwrite", "git fetch --all --prune && git reset --hard @{u} && git clean -fd", root);
        void vscode.window.showInformationMessage("已从 GitHub 覆盖本地工作区。");
    }
    async uploadProjectToHub() {
        if (!this.projectTopologyAssessment().hubAllowed)
            throw new Error("当前拓扑不使用 Hub，已阻止上传到 Hub。请使用 Worker 上传入口。");
        await this.prepareSftpTargets("uploadProjectToHub", "simpleSftp.uploadWorkspace");
        await this.syncCodeTargets([this.hubCodeSyncTarget()], "hub", {
            startedAction: { title: "首次上传到 Hub", detail: "正在通过 SimpleSFTP 同步本地轻量代码到 Hub。" },
        });
    }
    async uploadProjectToWorkers(confirm = true) {
        await this.prepareSftpTargets("uploadProjectToWorkers", "simpleSftp.uploadWorkspace");
        await this.syncCodeTargets(this.workerCodeSyncTargets(), "workers", confirm ? {
            startedAction: { title: "首次上传到 Worker", detail: "正在通过 SimpleSFTP 同步本地轻量代码到所有启用 Worker。" },
        } : undefined);
    }
    async distributeCodeToWorkers() {
        await this.prepareSftpTargets("distributeCodeToWorkers", "simpleSftp.uploadWorkspace");
        await this.syncCodeTargets(this.workerCodeSyncTargets(), "workers", {
            startedAction: { title: "分发代码到所有 Worker", detail: "正在把本地最新轻量代码同步到所有启用 Worker。" },
        });
    }
    async deployLatestAgentRuntime(showMessage = true, pathConfirmed = false) {
        await this.prepareSftpTargets("deployLatestAgentRuntime", "simpleSftp.uploadFiles");
        const targets = this.agentRuntimeUploadTargets();
        if (!targets.length)
            throw new Error("没有可部署的 Hub/Worker 目标。");
        const runtimeDir = path.join(__dirname, "runtime");
        const agentPath = path.join(runtimeDir, "cluster_agent.py");
        const schedulerPath = path.join(runtimeDir, "cluster_scheduler.py");
        const [agentText, schedulerText] = await Promise.all([
            fs.readFile(agentPath, "utf8"),
            fs.readFile(schedulerPath, "utf8"),
        ]);
        const manifest = {
            schemaVersion: 1,
            pluginVersion: String(this.context.extension.packageJSON?.version || ""),
            runtimeVersion: sha256Text(`${agentText}\n${schedulerText}`).slice(0, 16),
            files: {
                "cluster_agent.py": sha256Text(agentText),
                "cluster_scheduler.py": sha256Text(schedulerText),
            },
            deployedAt: new Date().toISOString(),
        };
        if (!pathConfirmed) {
            await this.confirmRemoteWriteTargets("上传 Agent runtime", targets);
            await this.writeSftpManagerServerProfiles(targets.map((target) => target.id));
        }
        const failures = [];
        for (const target of targets) {
            const result = await vscode.commands.executeCommand("simpleSftp.uploadFiles", {
                localBase: runtimeDir,
                targetId: `${target.id}-agent-runtime`,
                targetRole: target.role,
                remotePath: target.remotePath,
                server: this.sftpServerOptions(target),
                files: [
                    { localPath: agentPath, remoteName: "cluster_agent.py" },
                    { localPath: schedulerPath, remoteName: "cluster_scheduler.py" },
                ],
                manifest: { ...manifest, targetId: target.id, targetRole: target.role, targetLabel: target.label },
            });
            const record = result && typeof result === "object" ? result : {};
            if (!sftpUploadFilesSucceeded(record))
                failures.push(`${target.label}: ${stringFromRecord(record, ["error", "message", "status"]) || "上传失败"}`);
        }
        if (failures.length)
            throw new Error(`Agent runtime 部署失败：${failures.join("; ")}`);
        this.lastProbe = undefined;
        this.lastWorkerProbes = {};
        this.lastFullEndpointProbeAt = 0;
        this.lastHealth = {
            state: "agent_restart_required",
            status: "agent_restart_required",
            checkedAt: new Date().toISOString(),
            message: "最新版 Agent runtime 已部署。请重启 Hub/Worker Xshell 会话后再次检测。",
        };
        this.postState();
        if (showMessage)
            void vscode.window.showInformationMessage("最新版 Agent runtime 已部署到全部服务器。请重启 Hub/Worker Xshell 会话，再点击“检测全部”。");
    }
    agentRuntimeDeployTargets() {
        const topology = this.assertTopologyReady("部署 Agent runtime");
        return [...(topology.hubAllowed ? [this.hubActualWorkRootTarget()] : []), ...this.workerActualWorkRootTargets()].map((target) => {
            const dirs = this.agentRuntimeDirs(target.remotePath);
            if (!dirs.installDir)
                throw new Error(`${target.label} 缺少项目父目录，无法计算 zlk_agent 安装目录。`);
            return { ...target, remotePath: dirs.installDir, projectWorkDir: dirs.workDir };
        });
    }
    agentRuntimeUploadTargets() {
        return this.agentRuntimeDeployTargets().map((target) => {
            const remotePath = `${target.remotePath.replace(/\/+$/, "")}/zlk_cluster/runtime`;
            return {
                ...target,
                remotePath,
                expectedFiles: ["cluster_agent.py", "cluster_scheduler.py", "runtime_manifest.json"].map((file) => `${remotePath}/${file}`),
                relatedLocations: target.projectWorkDir ? [{ label: "Agent 项目工作目录", path: target.projectWorkDir }] : [],
            };
        });
    }
    async configureSftpIgnores() {
        await this.prepareSftpTargets("configureSftpIgnores", "simpleSftp.configureIgnores");
        const root = workspaceRoot();
        if (!root)
            throw new Error("请先打开一个工作区，再配置 SFTP 忽略规则。");
        const targets = this.topologyCodeSyncTargets();
        const selected = targets.length === 1
            ? targets[0]
            : await vscode.window.showQuickPick(targets.map((target) => ({
                label: target.label,
                description: target.role,
                detail: `${target.user}@${target.host}:${target.port} ${target.remotePath}`,
                target,
            })), { title: "选择要配置忽略规则的 SFTP 目标", ignoreFocusOut: true }).then((item) => item?.target);
        if (!selected)
            return;
        await this.confirmRemoteWriteTargets("配置该目录的上传忽略规则", [selected]);
        await this.writeSftpManagerServerProfiles([selected.id]);
        const result = await vscode.commands.executeCommand("simpleSftp.configureIgnores", {
            localPath: root,
            targetId: selected.id,
            targetRole: selected.role,
            server: this.sftpServerOptions(selected),
        });
        const record = result && typeof result === "object" ? result : {};
        if (record.ok === false)
            throw new Error(stringFromRecord(record, ["error", "message"]) || "SFTP 忽略规则配置失败。");
    }
    async ensureCodeReadyForRun() {
        await this.prepareSftpTargets("ensureCodeReadyForRun", "simpleSftp.uploadWorkspace");
        const targets = this.topologyCodeSyncTargets();
        await this.syncCodeTargets(targets, "run");
    }
    async ensureHubCodeReadyForPlanCheck() {
        await this.prepareSftpTargets("ensureHubCodeReadyForPlanCheck", "simpleSftp.uploadWorkspace");
        const topology = this.assertPlanTopologyReady("Plan 校验");
        const targets = topology.mode === "hub_worker" ? [this.hubCodeSyncTarget()] : this.workerCodeSyncTargets();
        await this.syncCodeTargets(targets, "plan-check");
    }
    async syncCodeTargets(targets, scope, options = {}) {
        await this.ensureSftpManagerCommand("simpleSftp.uploadWorkspace");
        const root = workspaceRoot();
        if (!root)
            throw new Error("请先打开一个工作区，再同步代码。");
        const enabledTargets = targets.filter(Boolean);
        if (!enabledTargets.length)
            throw new Error("没有可用于代码同步的 Hub/Worker 目标。");
        const manifest = await buildLocalCodeManifest(root);
        const fingerprint = fingerprintFromManifest(manifest);
        const expectedRelativeFiles = Object.keys(manifest).sort((a, b) => a.localeCompare(b)).slice(0, 8);
        await this.confirmRemoteWriteTargets(codeSyncConfirmationLabel(scope), enabledTargets.map((target) => ({
            ...target,
            expectedFiles: expectedRelativeFiles.map((file) => `${target.remotePath.replace(/\/+$/, "")}/${file.replace(/\\/g, "/").replace(/^\/+/, "")}`),
            expectedFileCount: Object.keys(manifest).length,
        })));
        await this.writeSftpManagerServerProfiles(enabledTargets.map((target) => target.id));
        if (options.startedAction)
            this.notifyLocalActionStarted(options.startedAction.title, options.startedAction.detail);
        const roleStatus = syncRoleStatus(enabledTargets, this.lastCodeSyncState, fingerprint);
        const failures = [];
        this.lastCodeSyncState = { fingerprint, scope, hub: roleStatus.hubRunning, workers: roleStatus.workersRunning, updatedAt: new Date().toISOString() };
        void this.persistProjectCodeSyncState().catch(() => undefined);
        this.postState();
        for (const target of enabledTargets) {
            try {
                const result = await vscode.commands.executeCommand("simpleSftp.uploadWorkspace", {
                    localPath: root,
                    targetId: target.id,
                    targetRole: target.role,
                    stateFileMode: "virtual",
                    fingerprint,
                    manifest,
                    server: this.sftpServerOptions(target),
                });
                if (!sftpUploadSucceeded(result, fingerprint))
                    throw new Error(resultError(result) || "SFTP 上传未确认成功。");
            }
            catch (error) {
                failures.push({ role: target.role, label: target.label, message: errorMessage(error) });
            }
        }
        if (failures.length) {
            const failedText = failures.map((failure) => `${failure.label}: ${failure.message}`);
            this.lastCodeSyncState = {
                fingerprint,
                scope,
                hub: failures.some((failure) => failure.role === "hub") ? "failed" : roleStatus.hubSuccess,
                workers: failures.some((failure) => failure.role === "worker") ? "failed" : roleStatus.workersSuccess,
                error: failedText.join("; "),
                updatedAt: new Date().toISOString(),
            };
            void this.persistProjectCodeSyncState().catch(() => undefined);
            this.postState();
            throw new Error(`代码同步失败：${failedText.join("; ")}`);
        }
        this.lastCodeSyncState = {
            fingerprint,
            scope,
            hub: roleStatus.hubSuccess,
            workers: roleStatus.workersSuccess,
            updatedAt: new Date().toISOString(),
        };
        void this.persistProjectCodeSyncState().catch(() => undefined);
        await this.markProjectOnboardingComplete();
        this.postState();
    }
    async confirmRemoteWriteTargets(operation, targets) {
        const localProjectRoot = assertSingleProjectWorkspace(operation);
        await this.loadProjectRemotePathConfirmationsState();
        const normalized = normalizeRemoteWriteTargets(targets);
        if (!normalized.length)
            throw new Error(`${operation}缺少可确认的远端目标路径。`);
        if (remoteWriteTargetsConfirmed(this.confirmedRemotePaths, normalized))
            return;
        const rememberLabel = normalized.length === 1 ? "确认，此后不再提醒该路径" : "确认，此后不再提醒这些路径";
        const answer = await vscode.window.showWarningMessage(remoteWriteConfirmationDetail(operation, normalized, localProjectRoot), { modal: true }, "确认位置并继续", rememberLabel);
        if (!["确认位置并继续", rememberLabel].includes(String(answer || "")))
            throw new UiCommandCancelled(`${operation}已取消，未写入任何远端文件。`);
        if (answer === rememberLabel) {
            const confirmedAt = new Date().toISOString();
            this.confirmedRemotePaths = mergeRemotePathConfirmations(this.confirmedRemotePaths, normalized.map((item) => ({ ...item, confirmedAt })));
            await this.persistProjectRemotePathConfirmationsState();
        }
    }
    async prepareSftpTargets(reason, requiredCommand) {
        assertSingleProjectWorkspace("SFTP 上传或目录配置");
        if (!await this.ensureSimpleSftpReadyForSetup("文件传输"))
            throw new UiCommandCancelled("文件传输已取消，SimpleSFTP 未就绪。");
        if (requiredCommand)
            await this.ensureSftpManagerCommand(requiredCommand);
        await this.syncXshellConfigBeforeNetwork(reason);
        this.assertTopologyActualWorkRoots("SFTP 上传或目录配置");
    }
    sftpServerOptions(target) {
        const sessionInfo = this.sessionInfoForPath(target.savedSessionPath);
        const transferHost = resolveSftpTransferHost(target.label || target.id, [
            target.transferHost,
            target.resolvedHost,
            target.sftpHost,
            target.sshHost,
            target.host,
            sessionInfo?.host,
        ]);
        return {
            id: target.id,
            label: target.label,
            host: transferHost,
            sftpHost: transferHost,
            sshHost: transferHost,
            transferHost,
            resolvedHost: transferHost,
            user: target.user,
            username: target.user,
            port: target.port,
            sshPort: target.port,
            remotePath: target.remotePath,
            sshConfigHost: transferHost,
            savedSessionPath: target.savedSessionPath,
            source: "simple-experiment",
        };
    }
    async writeSftpManagerServerProfiles(targetIds) {
        this.assertTopologyActualWorkRoots("写入 SimpleSFTP 服务器配置");
        const requestedIds = new Set((Array.isArray(targetIds) ? targetIds : []).map((item) => String(item || "").trim()).filter(Boolean));
        const targets = this.sftpSharedTargets().filter((target) => !requestedIds.size || requestedIds.has(target.id));
        const dir = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "SimpleSFTP", "server-profiles");
        const file = path.join(dir, "servers.json");
        if (!targets.length)
            return { targetCount: 0, file };
        let existing = {};
        try {
            existing = JSON.parse(await fs.readFile(file, "utf8"));
        }
        catch {
            existing = {};
        }
        const preserved = Array.isArray(existing.servers) ? existing.servers.filter((item) => {
            const id = typeof item === "object" && item ? String(item.id || "") : "";
            return id && !targets.some((target) => target.id === id);
        }) : [];
        const servers = [...preserved, ...targets.map((target) => ({
                id: target.id,
                label: target.label,
                host: firstNonEmpty(target.transferHost, target.resolvedHost, target.sftpHost, target.sshHost, target.host),
                sftpHost: firstNonEmpty(target.transferHost, target.resolvedHost, target.sftpHost, target.host),
                sshHost: firstNonEmpty(target.transferHost, target.resolvedHost, target.sshHost, target.host),
                transferHost: firstNonEmpty(target.transferHost, target.resolvedHost, target.sftpHost, target.sshHost, target.host),
                resolvedHost: firstNonEmpty(target.resolvedHost, target.transferHost, target.sftpHost, target.sshHost, target.host),
                user: target.user,
                username: target.user,
                port: target.port,
                sshPort: target.port,
                remotePath: target.remotePath,
                sshConfigHost: firstNonEmpty(target.transferHost, target.resolvedHost, target.sftpHost, target.sshHost, target.host),
                savedSessionPath: target.savedSessionPath,
                authType: "password",
                source: "simple-experiment",
                enabled: true,
                updatedAt: new Date().toISOString(),
            }))];
        const existingActiveServerId = String(existing.activeServerId || "");
        const activeServerId = targets.some((target) => target.id === existingActiveServerId)
            ? existingActiveServerId
            : (targets.find((target) => target.role === "hub") || targets[0])?.id || "";
        await fs.mkdir(dir, { recursive: true });
        const payload = `${JSON.stringify({
            version: 1,
            updatedAt: new Date().toISOString(),
            updatedBy: "simple-experiment",
            activeServerId,
            servers,
        }, null, 2)}\n`;
        const temp = `${file}.tmp`;
        await fs.writeFile(temp, payload, "utf8");
        await fs.rename(temp, file);
        return { targetCount: targets.length, file };
    }
    sftpSharedTargets() {
        if (!workspaceRoot())
            return [];
        const targets = [];
        if (this.projectTopologyAssessment().hubAllowed) {
            try {
                targets.push(this.hubCodeSyncTarget());
            }
            catch {
                // Readiness count reports the incomplete Hub target to quick setup.
            }
        }
        for (const worker of this.enabledWorkerConfigs()) {
            try {
                targets.push(this.workerCodeSyncTarget(worker));
            }
            catch {
                // Keep valid targets; quick setup compares count with enabled targets.
            }
        }
        return targets.filter((target) => target.host && target.user && target.remotePath);
    }
    topologyCodeSyncTargets() {
        const topology = this.assertTopologyReady("代码同步");
        return [...(topology.hubAllowed ? [this.hubCodeSyncTarget()] : []), ...this.workerCodeSyncTargets()];
    }
    workerActualWorkRootTargetsSafe() {
        try {
            return this.workerActualWorkRootTargets();
        }
        catch {
            return [];
        }
    }
    hubCodeSyncTarget() {
        const target = this.hubActualWorkRootTarget();
        const dirs = this.agentRuntimeDirs(target.remotePath);
        if (!dirs.workDir)
            throw new Error("Hub 项目父目录缺失，无法执行 SFTP 代码同步。");
        return { ...target, remotePath: dirs.workDir };
    }
    hubActualWorkRootTarget() {
        const remotePath = this.setupConfig.agentProjectDir;
        if (!remotePath)
            throw new Error("Hub 项目父目录缺失，无法执行 SFTP 代码同步。");
        const info = this.sessionInfoForPath(this.setupConfig.savedSessionPath);
        const transferHost = resolveSftpTransferHost(this.setupConfig.hubDisplayName || "Hub", [
            this.setupConfig.transferHost,
            this.setupConfig.resolvedHost,
            this.setupConfig.sftpHost,
            this.setupConfig.sshHost,
            info?.host,
            this.setupConfig.hubHost,
        ]);
        const host = firstNonEmpty(transferHost, info?.host, this.setupConfig.hubHost);
        const user = this.setupConfig.hubUser || info?.userName || "";
        const port = this.setupConfig.hubSshPort || info?.port || 22;
        return {
            id: "hub",
            role: "hub",
            label: this.setupConfig.hubDisplayName || "Hub",
            host,
            user,
            port,
            sshHost: transferHost,
            sftpHost: transferHost,
            transferHost,
            resolvedHost: transferHost,
            sshConfigHost: this.setupConfig.sshConfigAlias || this.setupConfig.hubHost,
            savedSessionPath: this.setupConfig.savedSessionPath,
            remotePath,
        };
    }
    workerCodeSyncTargets() {
        return this.enabledWorkerConfigs()
            .map((worker) => this.workerCodeSyncTarget(worker));
    }
    workerCodeSyncTarget(worker) {
        const target = this.workerActualWorkRootTarget(worker);
        const dirs = this.agentRuntimeDirs(target.remotePath);
        if (!dirs.workDir)
            throw new Error(`Worker ${target.id} 项目父目录缺失，无法执行 SFTP 代码同步。`);
        return { ...target, remotePath: dirs.workDir };
    }
    workerActualWorkRootTargets() {
        return this.enabledWorkerConfigs()
            .map((worker) => this.workerActualWorkRootTarget(worker));
    }
    workerActualWorkRootTarget(worker) {
        const remotePath = worker.agentProjectDir || this.setupConfig.agentProjectDir;
        if (!remotePath)
            throw new Error(`Worker ${worker.id} 项目父目录缺失，无法执行 SFTP 代码同步。`);
        const info = this.sessionInfoForPath(worker.savedSessionPath);
        const transferHost = resolveSftpTransferHost(worker.displayName || worker.id, [
            worker.transferHost,
            worker.resolvedHost,
            worker.sftpHost,
            worker.sshHost,
            info?.host,
            worker.workerHost,
            worker.hubHost,
        ]);
        const host = firstNonEmpty(transferHost, info?.host, worker.workerHost, worker.hubHost);
        const user = worker.workerUser || worker.hubUser || info?.userName || "";
        const port = worker.workerSshPort || worker.hubSshPort || info?.port || 22;
        return {
            id: worker.id,
            role: "worker",
            label: worker.displayName || worker.id,
            host,
            user,
            port,
            sshHost: transferHost,
            sftpHost: transferHost,
            transferHost,
            resolvedHost: transferHost,
            sshConfigHost: worker.sshConfigAlias || worker.workerHost || worker.hubHost,
            savedSessionPath: worker.savedSessionPath,
            remotePath,
        };
    }
    async primaryGitRepository() {
        const extension = vscode.extensions.getExtension("vscode.git");
        const git = extension ? (extension.isActive ? extension.exports : await extension.activate()).getAPI(1) : undefined;
        const root = workspaceRoot();
        const repo = git?.repositories?.find((item) => root && samePath(item.rootUri?.fsPath, root)) || git?.repositories?.[0];
        if (!repo)
            throw new Error("当前工作区没有可用的 VS Code Git 仓库。");
        return repo;
    }
    async ensureSftpManagerCommand(command) {
        const integration = simpleSftpIntegrationReadiness();
        if (!integration.ready)
            throw new Error(integration.message);
        const commands = await vscode.commands.getCommands(true);
        if (commands.includes(command))
            return;
        throw new Error(`SimpleSFTP ${integration.version || "当前版本"} 已声明但尚未注册命令 ${command}。请执行 Developer: Reload Window；仍缺失时使用配套离线包重新安装两个插件。`);
    }
    serverConfigSavedMessage(label, actualWorkRoot) {
        const dirs = this.agentRuntimeDirs(actualWorkRoot);
        if (dirs.workDir && dirs.installDir)
            return `${label} 配置已全局保存。当前项目代码：${dirs.workDir}；Agent runtime：${dirs.installDir}/zlk_cluster/runtime。`;
        if (dirs.installDir)
            return `${label} 配置已全局保存。Agent runtime：${dirs.installDir}/zlk_cluster/runtime；打开目标本地项目后再计算代码上传位置。`;
        return `${label} 配置已全局保存。请补充项目父目录后再准备 Agent。`;
    }
    async showServerConfigSavedNextStep(label, actualWorkRoot) {
        const message = this.serverConfigSavedMessage(label, actualWorkRoot);
        if (!workspaceRoot()) {
            const next = await vscode.window.showInformationMessage(`${message} 下一步选择本地项目后继续生成当前项目目标。`, "选择项目并继续", "打开配置说明");
            if (next === "选择项目并继续")
                await this.openWorkspaceFolderForContinuation(`${label} 配置`, "quickSetup", { showAgentCompletion: true });
            else if (next === "打开配置说明")
                await this.openSetupGuide();
            return;
        }
        const enabledWorkers = this.enabledWorkerConfigs();
        if (!enabledWorkers.length) {
            const next = await vscode.window.showInformationMessage(message, "添加 Worker");
            if (next === "添加 Worker") {
                const added = await this.addWorkerConfigFromUi(false);
                const worker = added ? this.setupConfig.workerTunnels[this.setupConfig.workerTunnels.length - 1] : undefined;
                if (worker)
                    await this.showServerConfigSavedNextStep(worker.displayName || worker.id, worker.agentProjectDir);
            }
            return;
        }
        let workRootsReady = true;
        try {
            this.assertTopologyActualWorkRoots("完成服务器设置");
        }
        catch {
            workRootsReady = false;
        }
        const ready = workRootsReady && initialServerSetupComplete(this.setupConfig, this.projectTopologyAssessment().hubAllowed) && !this.currentAgentPreparationBlockers().length;
        if (!ready) {
            void vscode.window.showInformationMessage(`${message} 仍有服务器配置待修复，请按当前页面提示补齐。`);
            return;
        }
        const next = await vscode.window.showInformationMessage(message, "准备 Agent 并启动");
        if (next === "准备 Agent 并启动")
            await this.prepareAgentsForFirstRun();
    }
    projectTopologyAssessment(configuredModeOverride) {
        const folder = vscode.workspace.workspaceFolders?.[0];
        const config = vscode.workspace.getConfiguration("zlkCluster", folder?.uri);
        const configuredMode = configuredModeOverride === undefined
            ? String(config.get("topologyMode", "") || "").trim()
            : String(configuredModeOverride || "").trim();
        const normalizedMode = (0, TopologyMode_1.normalizeTopologyMode)(configuredMode);
        const storedHubConfigured = Boolean(String(this.setupConfig.savedSessionPath || "").trim() && String(this.setupConfig.agentProjectDir || "").trim());
        const hubConfigured = normalizedMode ? normalizedMode === "hub_worker" && storedHubConfigured : storedHubConfigured;
        const assessment = (0, TopologyMode_1.assessProjectTopology)(configuredMode, {
            hubConfigured,
            enabledWorkerIds: this.enabledWorkerConfigs().map((worker) => worker.id),
        });
        return {
            ...assessment,
            configuredMode,
            storedHubConfigured,
            modeLabel: topologyModeLabel(assessment.mode),
        };
    }
    assertTopologyReady(operation = "当前操作") {
        const topology = this.projectTopologyAssessment();
        if (!topology.valid || !topology.mode) {
            throw new Error(`${operation}已阻止：${topology.issues.join("；") || "请先在设置中确认项目拓扑模式。"}`);
        }
        return topology;
    }
    assertPlanTopologyReady(operation = "Plan 操作") {
        return this.assertTopologyReady(operation);
    }
    planSchedulerWorkerId() {
        const topology = this.assertPlanTopologyReady("Plan 调度");
        return topology.mode === "single_worker" ? this.enabledWorkerConfigs()[0]?.id : undefined;
    }
    stampPlanTopology(body) {
        const topology = this.assertPlanTopologyReady("Plan 操作");
        const workerId = topology.mode === "single_worker" ? this.enabledWorkerConfigs()[0]?.id : undefined;
        const worker = workerId ? this.enabledWorkerConfigs().find((item) => item.id === workerId) : undefined;
        const remoteAgentPort = worker ? worker.remoteTelemetryPort || worker.remoteAgentPort : undefined;
        const workers = topology.mode === "single_worker"
            ? this.workerActionTargets().filter((item) => item.id === workerId).map((item) => ({
                ...item,
                local_agent_url: `http://127.0.0.1:${remoteAgentPort}`,
                topology_mode: topology.mode,
                scheduler_owner_worker_id: workerId,
            }))
            : body.options?.workers || this.workerActionTargets();
        body.topologyMode = topology.mode;
        body.schedulerOwnerWorkerId = workerId;
        body.options = {
            ...(body.options || {}),
            workers,
            topologyMode: topology.mode,
            schedulerOwnerWorkerId: workerId,
            localWorkerScheduler: topology.mode === "single_worker",
            automaticBackup: topology.mode === "hub_worker",
        };
        return { topology, workerId };
    }
    async postPlanSchedulerAction(action, body, options = {}) {
        const route = this.assertPlanTopologyReady(options.title || action);
        if (route.mode === "worker_pool")
            return this.postWorkerPoolPlanAction(action, body, options);
        const { topology, workerId } = this.stampPlanTopology(body);
        if (topology.mode === "single_worker") {
            return this.postWorkerTunnelAction(workerId, action, body, options);
        }
        return this.postTunnelAction(action, body, options);
    }
    workerPoolActionBody(body, workerId, shardSet, experimentIndices = []) {
        const worker = this.enabledWorkerConfigs().find((item) => item.id === workerId);
        if (!worker)
            throw new Error(`Worker pool 缺少目标配置：${workerId}`);
        const remoteAgentPort = worker.remoteTelemetryPort || worker.remoteAgentPort;
        const workerTarget = this.workerActionTargets().find((item) => item.id === workerId);
        if (!workerTarget)
            throw new Error(`Worker pool 无法计算目标项目路径：${workerId}`);
        const indices = uniqueNumbers(experimentIndices);
        const shard = shardSet?.shards?.find((item) => item.workerId === workerId);
        return {
            ...body,
            topologyMode: "worker_pool",
            schedulerOwnerWorkerId: workerId,
            workerSetRevision: shardSet?.workerSetRevision,
            assignedExperimentIndices: indices,
            options: {
                ...(body.options || {}),
                workers: [{
                        ...workerTarget,
                        local_agent_url: `http://127.0.0.1:${remoteAgentPort}`,
                        topology_mode: "worker_pool",
                        scheduler_owner_worker_id: workerId,
                    }],
                topologyMode: "worker_pool",
                schedulerOwnerWorkerId: workerId,
                localWorkerScheduler: true,
                automaticBackup: false,
                workerSetRevision: shardSet?.workerSetRevision,
                workerShardRevision: shard?.shardRevision,
                assignedExperimentIndices: indices,
            },
        };
    }
    async postWorkerPoolPlanAction(action, body, options = {}) {
        const workerIds = this.enabledWorkerConfigs().map((worker) => worker.id).sort((a, b) => a.localeCompare(b));
        const command = options.title || action;
        for (const workerId of workerIds) {
            const missing = this.missingWorkerActionCapabilities(workerId, action);
            if (missing.length)
                throw new Error(`${command}已阻止：Worker ${workerId} capability 缺失: ${missing.join(", ")}`);
        }
        if (action === "validate-plan") {
            const submissions = await Promise.all(workerIds.map(async (workerId) => {
                const request = this.workerPoolActionBody(body, workerId, undefined);
                const submitted = await this.postWorkerTunnelAction(workerId, action, request, { ...options, confirm: false, danger: false });
                const result = remoteActionPendingStatus(resultStatus(submitted))
                    ? await this.waitForOperationTerminalResult(action, submitted, command, 45_000, workerId)
                    : submitted;
                return { workerId, result };
            }));
            const indexSets = submissions.map(({ workerId, result }) => ({ workerId, indices: planValidationExperimentIndices(result) }));
            const expected = indexSets[0]?.indices || [];
            const inconsistent = indexSets.find((item) => !sameNumberArray(item.indices, expected));
            if (!expected.length || inconsistent)
                throw new Error(`${command}已阻止：各 Worker 的 Plan 展开结果不一致或为空。${indexSets.map((item) => `${item.workerId}=[${item.indices.join(",")}]`).join("；")}`);
            const planRevision = String(body.planRevision || body.options?.planRevision || "").trim();
            const shardSet = (0, WorkerPlanSharding_1.createWorkerPlanShardSet)(planRevision, workerIds, expected);
            body.workerSetRevision = shardSet.workerSetRevision;
            body.options = { ...(body.options || {}), workerSetRevision: shardSet.workerSetRevision, workerPlanShardSet: shardSet };
            return workerPoolAggregateResult(action, submissions, shardSet);
        }
        let shardSet = body.options?.workerPlanShardSet;
        const planRevision = String(body.planRevision || body.options?.planRevision || "").trim();
        if (!(0, WorkerPlanSharding_1.workerPlanShardSetMatches)(shardSet, planRevision, workerIds)) {
            await this.postWorkerPoolPlanAction("validate-plan", body, { title: `${command}：分片校验` });
            shardSet = body.options?.workerPlanShardSet;
        }
        const activeShards = shardSet.shards.filter((shard) => shard.experimentIndices.length > 0);
        const submissions = await Promise.all(activeShards.map(async (shard) => {
            const request = this.workerPoolActionBody(body, shard.workerId, shardSet, shard.experimentIndices);
            const result = await this.postWorkerTunnelAction(shard.workerId, action, request, { ...options, confirm: false, danger: false });
            return { workerId: shard.workerId, result };
        }));
        return workerPoolAggregateResult(action, submissions, shardSet);
    }
    stampNoHubResultOwnership(body, workerId) {
        const topology = this.assertPlanTopologyReady("结果操作");
        if (topology.mode === "hub_worker")
            return body;
        const planRevision = String(body.planRevision || body.options?.planRevision || "").trim();
        const workerIds = this.enabledWorkerConfigs().map((worker) => worker.id);
        const workerSetRevision = topology.mode === "worker_pool" && planRevision
            ? (0, WorkerPlanSharding_1.createWorkerSetRevision)(planRevision, workerIds)
            : String(body.workerSetRevision || body.options?.workerSetRevision || "").trim();
        return {
            ...body,
            topologyMode: topology.mode,
            resultOwnerWorkerId: workerId,
            workerSetRevision: workerSetRevision || undefined,
            selectedWorkerIds: [workerId],
            options: {
                ...(body.options || {}),
                topologyMode: topology.mode,
                resultOwnerWorkerId: workerId,
                workerSetRevision: workerSetRevision || undefined,
                automaticBackup: false,
                workerId,
                directWorker: true,
            },
        };
    }
    resultActionWorkerIds(body) {
        const direct = [
            ...(Array.isArray(body.selectedWorkerIds) ? body.selectedWorkerIds : []),
            body.workerId,
            body.options?.workerId,
            ...(Array.isArray(body.selectedTaskTargets) ? body.selectedTaskTargets.map((target) => target?.workerId) : []),
        ];
        return uniqueStrings(direct.map((id) => this.resolveWorkerEndpointId(String(id || "")) || String(id || "")).filter(Boolean));
    }
    async postNoHubResultAction(command, action, body, options = {}) {
        if (!noHubWorkerResultActions.has(action))
            return undefined;
        const topology = this.assertPlanTopologyReady(command || action);
        if (topology.mode === "hub_worker")
            return undefined;
        const explicitWorkerIds = this.resultActionWorkerIds(body);
        let workerIds = topology.mode === "single_worker" ? [this.enabledWorkerConfigs()[0]?.id] : explicitWorkerIds;
        if (topology.mode === "worker_pool" && workerPoolResultFanoutActions.has(action) && !explicitWorkerIds.length)
            workerIds = this.enabledWorkerConfigs().map((worker) => worker.id);
        workerIds = uniqueStrings(workerIds.filter(Boolean));
        if (!workerIds.length) {
            throw new Error(`${command || action}已阻止：仅多 Worker模式必须从带 Worker 归属的结果或任务行执行；不会把单 Worker结果冒充全局结果。`);
        }
        if (options.confirm || options.danger) {
            const label = options.danger ? "确认危险操作" : "确认执行";
            const answer = await vscode.window.showWarningMessage(workerRemoteActionConfirmationDetail(command, action, body, workerIds), { modal: true }, label);
            if (answer !== label)
                throw new UiCommandCancelled(`${command} 已取消。`);
        }
        const submissions = [];
        for (const workerId of workerIds) {
            try {
                const scoped = this.stampNoHubResultOwnership(this.workerScopedActionBody(body, workerId), workerId);
                const submitted = await this.postWorkerTunnelAction(workerId, action, scoped, { title: command, confirm: false, danger: false });
                const result = remoteActionPendingStatus(resultStatus(submitted))
                    ? await this.waitForOperationTerminalResult(action, submitted, command, 45_000, workerId)
                    : submitted;
                submissions.push({ workerId, result });
            }
            catch (error) {
                const message = errorMessage(error);
                submissions.push({
                    workerId,
                    result: {
                        schemaVersion: 1,
                        status: isUiCommandCancelled(error) ? "cancelled" : "failed",
                        workerId,
                        resultOwnerWorkerId: workerId,
                        error: message,
                        message,
                    },
                });
            }
        }
        return workerResultAggregateResult(action, submissions);
    }
    assertTopologyActualWorkRoots(operation = "服务器操作") {
        const topology = this.assertTopologyReady(operation);
        if (topology.hubAllowed)
            assertActualWorkRoot(this.setupConfig.agentProjectDir, "Hub");
        for (const worker of this.enabledWorkerConfigs())
            assertActualWorkRoot(worker.agentProjectDir, worker.displayName || worker.id || "Worker");
        return topology;
    }
    async saveTopologyModeFromUi(message) {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder)
            throw new Error("请先打开一个项目，再保存项目级拓扑模式。");
        const patch = recordField(message, "patch");
        const requestedMode = String(patch.mode || "").trim();
        if (!(0, TopologyMode_1.normalizeTopologyMode)(requestedMode))
            throw new Error("请选择单 Worker、仅多 Worker或 Hub 可用模式。");
        const current = this.projectTopologyAssessment();
        const next = this.projectTopologyAssessment(requestedMode);
        const issueText = next.issues.length ? `\n\n当前配置仍需修复：${next.issues.join("；")} 保存后会阻止新运行，已有任务不受影响。` : "";
        const backupText = next.hubAllowed
            ? "Hub 负责汇总状态与结果；沿用现有 Hub 归档链路。"
            : "不会访问 Hub、同步到 Hub或创建跨节点自动备份；每台 Worker 保存自己的任务与结果。";
        const answer = await vscode.window.showWarningMessage([
            `将当前项目拓扑从“${current.modeLabel}”改为“${next.modeLabel}”。`,
            `调度所有者：${next.schedulerOwner}`,
            `状态与结果位置：${next.stateOwner}`,
            backupText,
            "模式切换不会迁移、覆盖或删除已有任务与结果。" + issueText,
        ].join("\n"), { modal: true }, "保存拓扑");
        if (answer !== "保存拓扑")
            throw new UiCommandCancelled("拓扑模式修改已取消。");
        const config = vscode.workspace.getConfiguration("zlkCluster", folder.uri);
        await config.update("topologyMode", requestedMode, vscode.ConfigurationTarget.WorkspaceFolder);
        await this.applyTopologyRuntimeMode(requestedMode, "topology saved from UI");
        this.postState();
        void vscode.window.showInformationMessage(`当前项目已保存为${next.modeLabel}。`);
    }
    async saveHubConfigFromUi(message) {
        await this.refreshXshellSessionLibrary();
        const patch = recordField(message, "patch");
        const savedSessionPath = preservedOptionalStringPatch(patch, "savedSessionPath", this.setupConfig.savedSessionPath);
        const sessionChanged = sessionPathChanged(this.setupConfig.savedSessionPath, savedSessionPath);
        let agentProjectDir = preservedOptionalStringPatch(patch, "agentProjectDir", this.setupConfig.agentProjectDir);
        assertActualWorkRoot(agentProjectDir, "Hub");
        if (normalizeRemoteWorkRoot(agentProjectDir) !== normalizeRemoteWorkRoot(this.setupConfig.agentProjectDir))
            agentProjectDir = await confirmActualWorkRootAmbiguity(agentProjectDir, "Hub", "仍按当前目录保存");
        const manual = (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)({
            ...this.setupConfig,
            hubDisplayName: preservedStringPatch(patch, "hubDisplayName", this.setupConfig.hubDisplayName || this.hubDisplayName()),
            hubHost: preservedStringPatch(patch, "hubHost", this.setupConfig.hubHost),
            hubUser: preservedStringPatch(patch, "hubUser", this.setupConfig.hubUser),
            transferHost: clearableOptionalStringPatch(patch, "transferHost", this.setupConfig.transferHost),
            resolvedHost: sessionScopedOptionalStringPatch(patch, "resolvedHost", this.setupConfig.resolvedHost, sessionChanged),
            sftpHost: sessionScopedOptionalStringPatch(patch, "sftpHost", this.setupConfig.sftpHost, sessionChanged),
            sshHost: sessionScopedOptionalStringPatch(patch, "sshHost", this.setupConfig.sshHost, sessionChanged),
            sshConfigAlias: preservedOptionalStringPatch(patch, "sshConfigAlias", this.setupConfig.sshConfigAlias),
            savedSessionPath,
            savedSessionForwardIndex: forwardIndexPatch(patch, "savedSessionForwardIndex", this.setupConfig.savedSessionForwardIndex),
            agentSessionPath: preservedOptionalStringPatch(patch, "agentSessionPath", this.setupConfig.agentSessionPath),
            agentProjectDir,
            condaEnv: condaEnvPatch(patch, "condaEnv", this.setupConfig.condaEnv),
            localForwardPort: numberPatch(patch, "localForwardPort", this.setupConfig.localForwardPort),
            remoteAgentPort: numberPatch(patch, "remoteAgentPort", this.setupConfig.remoteAgentPort),
            launchMode: "open_saved_session",
            savedSessionRunner: "xshell",
        });
        await this.ensureXshellSessionLoaded(manual.savedSessionPath);
        await this.applySetupDraft(this.withXshellDerivedFields(manual), { syncAssignmentsFromFields: true });
        await this.showServerConfigSavedNextStep("Hub", this.setupConfig.agentProjectDir);
    }
    async saveSchedulerConfigFromUi(message) {
        const patch = recordField(message, "patch");
        const config = vscode.workspace.getConfiguration("zlkCluster");
        const settings = this.schedulerSettings();
        const updates = [
            config.update("scheduler.pollSeconds", numberRangePatch(patch, "pollSeconds", settings.pollSeconds, 60, 3600), vscode.ConfigurationTarget.Global),
            config.update("scheduler.jitterSeconds", numberRangePatch(patch, "jitterSeconds", settings.jitterSeconds, 0, 1800), vscode.ConfigurationTarget.Global),
            config.update("scheduler.workerStatusTtlSeconds", numberRangePatch(patch, "workerStatusTtlSeconds", settings.workerStatusTtlSeconds, 60, 7200), vscode.ConfigurationTarget.Global),
            config.update("scheduler.localAvailabilityPushSeconds", numberRangePatch(patch, "localAvailabilityPushSeconds", settings.localAvailabilityPushSeconds, 60, 3600), vscode.ConfigurationTarget.Global),
            config.update("scheduler.workerAvailabilityPushSeconds", numberRangePatch(patch, "workerAvailabilityPushSeconds", settings.workerAvailabilityPushSeconds, 60, 3600), vscode.ConfigurationTarget.Global),
            config.update("scheduler.operationEventMaxDelayMs", numberRangePatch(patch, "operationEventMaxDelayMs", settings.operationEventMaxDelayMs, 100, 10000), vscode.ConfigurationTarget.Global),
            config.update("scheduler.workerActionMinIntervalMs", numberRangePatch(patch, "workerActionMinIntervalMs", settings.workerActionMinIntervalMs, 500, 60000), vscode.ConfigurationTarget.Global),
            config.update("scheduler.workerActionMaxConcurrent", numberRangePatch(patch, "workerActionMaxConcurrent", settings.workerActionMaxConcurrent, 1, 16), vscode.ConfigurationTarget.Global),
        ];
        await Promise.all(updates);
        this.startAvailabilityPushLoop();
        this.postState();
        void vscode.window.showInformationMessage("调度与上报策略已保存。");
    }
    async saveWorkerConfigFromUi(message) {
        await this.refreshXshellSessionLibrary();
        const endpointId = stringField(message, "endpointId");
        const patch = recordField(message, "patch");
        const currentWorker = this.setupConfig.workerTunnels.find((worker) => worker.id === endpointId);
        if (!currentWorker) {
            void vscode.window.showWarningMessage(`未找到 Worker：${endpointId}`);
            return;
        }
        let targetAgentProjectDir = preservedOptionalStringPatch(patch, "agentProjectDir", currentWorker.agentProjectDir);
        assertActualWorkRoot(targetAgentProjectDir, currentWorker.displayName || currentWorker.id);
        if (normalizeRemoteWorkRoot(targetAgentProjectDir) !== normalizeRemoteWorkRoot(currentWorker.agentProjectDir))
            targetAgentProjectDir = await confirmActualWorkRootAmbiguity(targetAgentProjectDir, currentWorker.displayName || currentWorker.id, "仍按当前目录保存");
        const workers = this.setupConfig.workerTunnels.map((worker) => {
            if (worker.id !== endpointId)
                return worker;
            const remoteTelemetryPort = numberPatch(patch, "remoteTelemetryPort", worker.remoteTelemetryPort || worker.remoteAgentPort || this.setupConfig.remoteAgentPort);
            const workerHost = preservedStringPatch(patch, "workerHost", worker.workerHost || worker.hubHost);
            const workerUser = preservedStringPatch(patch, "workerUser", worker.workerUser || worker.hubUser);
            const savedSessionPath = preservedOptionalStringPatch(patch, "savedSessionPath", worker.savedSessionPath);
            const sessionChanged = sessionPathChanged(worker.savedSessionPath, savedSessionPath);
            return {
                ...worker,
                displayName: preservedStringPatch(patch, "displayName", worker.displayName || worker.id),
                hubHost: workerHost,
                hubUser: workerUser,
                transferHost: clearableOptionalStringPatch(patch, "transferHost", worker.transferHost),
                resolvedHost: sessionScopedOptionalStringPatch(patch, "resolvedHost", worker.resolvedHost, sessionChanged),
                sftpHost: sessionScopedOptionalStringPatch(patch, "sftpHost", worker.sftpHost, sessionChanged),
                sshHost: sessionScopedOptionalStringPatch(patch, "sshHost", worker.sshHost, sessionChanged),
                workerHost,
                workerUser,
                sshConfigAlias: preservedOptionalStringPatch(patch, "sshConfigAlias", worker.sshConfigAlias),
                savedSessionPath,
                savedSessionForwardIndex: forwardIndexPatch(patch, "savedSessionForwardIndex", worker.savedSessionForwardIndex),
                agentSessionPath: preservedOptionalStringPatch(patch, "agentSessionPath", worker.agentSessionPath),
                agentProjectDir: targetAgentProjectDir,
                condaEnv: condaEnvPatch(patch, "condaEnv", effectiveWorkerCondaEnv(worker, this.setupConfig.condaEnv)),
                localForwardPort: numberPatch(patch, "localForwardPort", worker.localForwardPort),
                remoteAgentPort: remoteTelemetryPort,
                remoteTelemetryPort,
                maxConcurrentGpus: numberRangePatch(patch, "maxConcurrentGpus", worker.maxConcurrentGpus || 1, 1, 64),
                allowedGpuIds: stringArrayPatch(patch, "allowedGpuIds", worker.allowedGpuIds || []),
                enabled: boolishPatch(patch, "enabled", worker.enabled !== false),
            };
        });
        const manual = (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)({
            ...this.setupConfig,
            workerRealtimeMode: workers.some((worker) => worker.enabled !== false) ? "hub_plus_workers" : "hub_only",
            workerTelemetryMode: workers.some((worker) => worker.enabled !== false) ? "hub_plus_worker_telemetry" : "hub_only",
            workerTunnels: workers,
        });
        await Promise.all(manual.workerTunnels.map((worker) => this.ensureXshellSessionLoaded(worker.savedSessionPath)));
        await this.applySetupDraft(this.withXshellDerivedFields(manual), { syncAssignmentsFromFields: true });
        const savedWorker = this.setupConfig.workerTunnels.find((worker) => worker.id === endpointId);
        await this.showServerConfigSavedNextStep(savedWorker?.displayName || endpointId, savedWorker?.agentProjectDir);
    }
    async addWorkerConfigFromUi(showMessage = true) {
        await this.refreshXshellSessionLibrary({ force: true, postState: false });
        const library = this.xshellLibrary;
        const primaryDir = library.existingDirs[0] || library.searchedDirs[0];
        const worker = await promptSavedSessionWorker(undefined, this.setupConfig.workerTunnels.length, this.setupConfig.remoteAgentPort, this.setupConfig.localForwardPort, library.sessions, primaryDir);
        if (!worker)
            return false;
        const workers = [...this.setupConfig.workerTunnels, worker];
        const manual = (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)({
            ...this.setupConfig,
            workerRealtimeMode: "hub_plus_workers",
            workerTelemetryMode: "hub_plus_worker_telemetry",
            workerTunnels: workers,
        });
        await this.ensureXshellSessionLoaded(worker.savedSessionPath);
        await this.applySetupDraft(this.withXshellDerivedFields(manual), { syncAssignmentsFromFields: true });
        if (showMessage)
            void vscode.window.showInformationMessage(`${worker.displayName || worker.id} 已添加并全局保存。`);
        return true;
    }
    async deleteWorkerConfigFromUi(message) {
        const endpointId = stringField(message, "endpointId");
        const worker = this.setupConfig.workerTunnels.find((item) => item.id === endpointId);
        if (!worker)
            return;
        const ok = await vscode.window.showWarningMessage(`删除 Worker ${worker.displayName || worker.id}？配置会从全局状态移除。`, { modal: true }, "删除");
        if (ok !== "删除")
            return;
        const workers = this.setupConfig.workerTunnels.filter((item) => item.id !== endpointId);
        const manual = (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)({
            ...this.setupConfig,
            workerRealtimeMode: workers.some((item) => item.enabled !== false) ? "hub_plus_workers" : "hub_only",
            workerTelemetryMode: workers.some((item) => item.enabled !== false) ? "hub_plus_worker_telemetry" : "hub_only",
            workerTunnels: workers,
        });
        await this.applySetupDraft(manual, { syncAssignmentsFromFields: true });
    }
    async startTunnelEndpointFromUi(message) {
        await this.syncXshellConfigBeforeNetwork("start endpoint");
        const endpointId = stringField(message, "endpointId") || "hub";
        const item = this.tunnelLaunchItems().find((entry) => entry.id === endpointId);
        if (!item) {
            void vscode.window.showWarningMessage(`未找到隧道会话：${endpointId}`);
            return;
        }
        const answer = await vscode.window.showWarningMessage(`启动 ${endpointId} 的本地 Xshell 隧道会话？\n\n${item.config.savedSessionPath || "未配置 .xsh 路径"}`, { modal: true }, "启动");
        if (answer !== "启动")
            return;
        await this.launchTunnelItem(item);
    }
    async startAgentEndpointFromUi(message) {
        await this.startTunnelEndpointFromUi(message);
    }
    async postTunnelAction(action, body, options = {}) {
        const topology = this.projectTopologyAssessment();
        if (!topology.hubAllowed) {
            const message = `${options.title || action} 已阻止：当前拓扑不使用 Hub，不能调用 Hub Agent。`;
            this.recordActionError({ command: options.title || action, action, message, suggestion: "使用单 Worker支持的 Plan 操作，或在设置中明确切换到 Hub 可用模式。" });
            this.postState();
            throw new Error(message);
        }
        const missing = this.missingCapabilities(options.requiresCapability || capabilityForAction(action));
        const command = options.title || action;
        if (missing.length) {
            const message = `capability 缺失: ${missing.join(", ")}`;
            this.recordActionError({ command, action, message, suggestion: "需要升级 Hub Agent 或先运行真实对接检测。", capabilityMissing: missing });
            this.postState();
            throw new Error(message);
        }
        if (!this.isRealtimeMode()) {
            const message = "当前是 offline_import，不能执行远端操作。";
            this.recordActionError({ command, action, message, suggestion: "切回 Xshell 实时隧道。" });
            this.postState();
            throw new Error(message);
        }
        if (options.confirm || options.danger) {
            const label = options.danger ? "确认危险操作" : action === "sync-artifacts" ? "确认检查清单" : "确认执行";
            const answer = await vscode.window.showWarningMessage(remoteActionConfirmationDetail(command, action, body), { modal: true }, label);
            if (answer !== label)
                throw new UiCommandCancelled(`${command} 已取消。`);
        }
        const generation = this.projectContextGeneration;
        const request = {
            ...body,
            schemaVersion: 1,
            opId: makeOpId(action),
        };
        request.operationId = request.opId;
        this.localOperations[request.opId] = {
            operationId: request.opId,
            type: action,
            status: "pending",
            message: "等待 Hub Agent 接受操作",
            startedAt: new Date().toISOString(),
            ...operationPlanFields(request),
        };
        this.markLocalOperationsDirty();
        this.scheduleOperationWatchdog(request.opId, action);
        this.postState();
        try {
            const result = await this.client.postAction(action, request);
            const status = resultStatus(result) || "accepted";
            const actionResult = normalizeActionSubmissionResult(result, request.opId, status);
            if (generation !== this.projectContextGeneration)
                return actionResult;
            this.localOperations[request.opId] = {
                ...this.localOperations[request.opId],
                ...actionResult,
                message: operationTerminalStatus(status) ? stringFromRecord(actionResult, ["message", "detail"]) || status : "Hub Agent 已接收，等待终态事件",
                updatedAt: new Date().toISOString(),
            };
            this.markLocalOperationsDirty();
            if (operationTerminalStatus(status))
                this.clearOperationWatchdog(request.opId);
            else
                this.scheduleOperationStatusProbe(request.opId, action);
            this.lastError = undefined;
            this.captureActionResult(action, actionResult);
            this.postState();
            this.throwIfTerminalActionFailure(command, action, status, actionResult);
            return actionResult;
        }
        catch (error) {
            if (generation !== this.projectContextGeneration)
                return;
            const message = errorMessage(error);
            const cancelled = isUiCommandCancelled(error);
            this.localOperations[request.opId] = {
                ...this.localOperations[request.opId],
                status: cancelled ? "cancelled" : "failed",
                error: message,
                updatedAt: new Date().toISOString(),
            };
            this.markLocalOperationsDirty();
            this.clearOperationWatchdog(request.opId);
            if (!cancelled) {
                this.lastError = message;
                this.recordActionError({ command, action, message, suggestion: actionErrorSuggestion(message) });
            }
            this.postState();
            if (cancelled)
                throw error;
            throw new Error(message);
        }
    }
    async postWorkerTunnelAction(workerId, action, body, options = {}) {
        workerId = this.resolveWorkerEndpointId(workerId) || workerId;
        const command = options.title || action;
        if (!this.isRealtimeMode()) {
            const message = "当前是 offline_import，不能执行 Worker 直连操作。";
            this.recordActionError({ command, action, message, suggestion: "请切回 Xshell 实时隧道。" });
            this.postState();
            throw new Error(message);
        }
        const url = this.workerAgentUrl(workerId);
        if (!url) {
            const message = `缺少 Worker Agent 本地端点：${workerId}`;
            this.recordActionError({ command, action, message, suggestion: "请先配置对应 Worker 的 Xshell 本地隧道。" });
            this.postState();
            throw new Error(message);
        }
        const missing = this.missingWorkerActionCapabilities(workerId, action);
        if (missing.length) {
            const message = `Worker Agent ${workerId} capability 缺失: ${missing.join(", ")}`;
            this.recordActionError({
                command,
                action,
                message,
                suggestion: "请先检测全部隧道；如仍失败，请部署最新版 Agent 并重启对应 Worker Agent 会话。",
                capabilityMissing: missing,
            });
            this.postState();
            throw new Error(message);
        }
        const releaseWorkerAction = await this.enterWorkerActionSlot(workerId);
        const workerActionKey = workerActionDedupKey(action, workerId, body);
        const active = this.activeWorkerActionOperation(workerActionKey);
        if (active) {
            releaseWorkerAction();
            throw new UiCommandRemotePending(`${command} 已有未完成 Worker 操作 operationId=${active.operationId}，已阻止重复提交；请等待“操作进度”终态。`);
        }
        if (options.confirm || options.danger) {
            const label = options.danger ? "确认危险操作" : "确认执行";
            const answer = await vscode.window.showWarningMessage(workerRemoteActionConfirmationDetail(command, action, body, [workerId]), { modal: true }, label);
            if (answer !== label) {
                releaseWorkerAction();
                throw new UiCommandCancelled(`${command} 已取消。`);
            }
        }
        const generation = this.projectContextGeneration;
        const request = {
            ...body,
            schemaVersion: 1,
            opId: makeOpId(action),
            selectedWorkerIds: [workerId],
            workerActionKey,
            options: {
                ...(body.options || {}),
                workerId,
                directWorker: true,
            },
        };
        request.operationId = request.opId;
        this.localOperations[request.opId] = {
            operationId: request.opId,
            type: action,
            status: "pending",
            workerId,
            workerActionKey,
            message: `等待 Worker Agent ${workerId} 接受操作`,
            startedAt: new Date().toISOString(),
            ...operationPlanFields(request),
        };
        this.markLocalOperationsDirty();
        this.scheduleOperationWatchdog(request.opId, action, workerId);
        this.postState();
        try {
            const result = await this.client.postWorkerAction(workerId, action, request);
            const status = resultStatus(result) || "accepted";
            const actionResult = normalizeActionSubmissionResult(result, request.opId, status);
            if (generation !== this.projectContextGeneration)
                return actionResult;
            this.localOperations[request.opId] = {
                ...this.localOperations[request.opId],
                ...actionResult,
                message: operationTerminalStatus(status) ? stringFromRecord(actionResult, ["message", "detail"]) || status : "Worker Agent 已接收，等待终态事件",
                updatedAt: new Date().toISOString(),
            };
            this.markLocalOperationsDirty();
            if (operationTerminalStatus(status))
                this.clearOperationWatchdog(request.opId);
            else
                this.scheduleOperationStatusProbe(request.opId, action, workerId);
            this.lastError = undefined;
            this.captureActionResult(action, actionResult);
            this.postState();
            this.throwIfTerminalActionFailure(command, action, status, actionResult);
            return actionResult;
        }
        catch (error) {
            if (generation !== this.projectContextGeneration)
                return;
            const message = errorMessage(error);
            const cancelled = isUiCommandCancelled(error);
            this.localOperations[request.opId] = {
                ...this.localOperations[request.opId],
                status: cancelled ? "cancelled" : "failed",
                error: message,
                updatedAt: new Date().toISOString(),
            };
            this.markLocalOperationsDirty();
            this.clearOperationWatchdog(request.opId);
            if (!cancelled) {
                this.lastError = message;
                this.recordActionError({ command, action, message, suggestion: actionErrorSuggestion(message) });
            }
            this.postState();
            if (cancelled)
                throw error;
            throw new Error(message);
        }
        finally {
            releaseWorkerAction();
        }
    }
    activeWorkerActionOperation(workerActionKey) {
        if (!workerActionKey)
            return void 0;
        for (const [operationId, value] of Object.entries(this.localOperations)) {
            if (!value || typeof value !== "object")
                continue;
            const item = value;
            if (String(item.workerActionKey || "") !== workerActionKey)
                continue;
            if (operationTerminal(item))
                continue;
            return {
                operationId: stringFromRecord(item, ["operationId", "opId", "id"]) || operationId,
                status: operationStatusOf(item),
            };
        }
        return void 0;
    }
    missingWorkerActionCapabilities(workerId, action) {
        workerId = this.resolveWorkerEndpointId(workerId) || workerId;
        const probe = this.lastWorkerProbes[workerId];
        if (!probe)
            return ["未检测 Worker Agent"];
        if (probe.status !== "ok")
            return [`Worker Agent ${probe.status}`];
        const caps = probe.capabilities;
        const endpoints = caps?.endpoints;
        const actions = caps?.actionEndpoints;
        if (!endpoints?.actions)
            return ["endpoints.actions"];
        return actions?.[action] === true ? [] : [`actions.${action}`];
    }
    async enterWorkerActionSlot(workerId) {
        const previousAdmission = this.workerActionAdmissionLocks.get(workerId) || Promise.resolve();
        let releaseAdmission = () => undefined;
        const currentAdmission = previousAdmission.catch(() => undefined).then(() => new Promise((resolve) => { releaseAdmission = resolve; }));
        this.workerActionAdmissionLocks.set(workerId, currentAdmission);
        await previousAdmission.catch(() => undefined);
        try {
            const settings = this.schedulerSettings();
            while ((this.workerActionInFlight.get(workerId) || 0) >= settings.workerActionMaxConcurrent) {
                await this.waitForWorkerActionRelease(workerId);
            }
            const lastAt = this.workerActionLastAt.get(workerId) || 0;
            const waitMs = Math.max(0, settings.workerActionMinIntervalMs - (Date.now() - lastAt));
            if (waitMs > 0)
                await sleep(waitMs);
            const currentInFlight = this.workerActionInFlight.get(workerId) || 0;
            this.workerActionInFlight.set(workerId, currentInFlight + 1);
            this.recordWorkerActionAt(workerId, Date.now(), settings.workerActionMinIntervalMs);
        }
        finally {
            releaseAdmission();
            if (this.workerActionAdmissionLocks.get(workerId) === currentAdmission)
                this.workerActionAdmissionLocks.delete(workerId);
        }
        let released = false;
        return () => {
            if (released)
                return;
            released = true;
            const current = this.workerActionInFlight.get(workerId) || 0;
            if (current <= 1)
                this.workerActionInFlight.delete(workerId);
            else
                this.workerActionInFlight.set(workerId, current - 1);
            this.recordWorkerActionAt(workerId);
            this.notifyWorkerActionRelease(workerId);
        };
    }
    recordWorkerActionAt(workerId, timestamp = Date.now(), maxAgeMs = this.schedulerSettings().workerActionMinIntervalMs) {
        const protectedKeys = new Set([
            ...this.workerActionInFlight.keys(),
            ...this.workerActionAdmissionLocks.keys(),
        ]);
        (0, BoundedTimestampMap_1.touchBoundedTimestampMap)(this.workerActionLastAt, workerId, timestamp, {
            limit: this.workerActionLastAtLimit,
            maxAgeMs,
            protectedKeys,
        });
    }
    waitForWorkerActionRelease(workerId) {
        return new Promise((resolve) => {
            const waiters = this.workerActionReleaseWaiters.get(workerId) || [];
            waiters.push(resolve);
            this.workerActionReleaseWaiters.set(workerId, waiters);
        });
    }
    notifyWorkerActionRelease(workerId) {
        const waiters = this.workerActionReleaseWaiters.get(workerId);
        if (!waiters?.length)
            return;
        this.workerActionReleaseWaiters.delete(workerId);
        for (const resolve of waiters)
            resolve();
    }
    scheduleOperationWatchdog(opId, action, workerId) {
        this.clearOperationWatchdog(opId);
        const timer = setTimeout(() => void this.finishOperationWatchdog(opId, action, workerId), 60000);
        timer.unref?.();
        this.operationTimers.set(opId, timer);
    }
    scheduleOperationStatusProbe(opId, action, workerId, attempt = 1) {
        this.clearOperationStatusProbe(opId);
        const timer = setTimeout(() => {
            this.operationProbeTimers.delete(opId);
            void this.refreshOperationStatus(opId, action, workerId, attempt);
        }, this.operationStatusProbeDelayMs(attempt));
        timer.unref?.();
        this.operationProbeTimers.set(opId, timer);
    }
    operationStatusProbeDelayMs(attempt = 1) {
        const settings = this.schedulerSettings();
        const baseMs = Math.max(1000, settings.operationEventMaxDelayMs);
        const backoffMs = baseMs * Math.max(1, Math.min(attempt, this.operationStatusProbeMaxAttempts));
        const jitterMs = Math.max(0, Math.min(settings.jitterSeconds * 1000, 30000));
        return Math.round(backoffMs + Math.random() * jitterMs);
    }
    operationManualWaitDelayMs(attempt = 1) {
        const settings = this.schedulerSettings();
        const baseMs = Math.max(1000, settings.operationEventMaxDelayMs);
        const backoffMs = Math.min(10_000, baseMs * Math.max(1, Math.min(attempt, 5)));
        const jitterMs = Math.min(2_000, Math.max(0, settings.jitterSeconds * 1000));
        return Math.round(backoffMs + Math.random() * jitterMs);
    }
    async waitForOperationTerminalResult(action, result, title, timeoutMs, workerId) {
        const status = resultStatus(result);
        if (!remoteActionPendingStatus(status))
            return result;
        const record = result && typeof result === "object" ? result : {};
        const opId = stringFromRecord(record, ["operationId", "opId", "id"]);
        if (!opId)
            return result;
        const started = Date.now();
        let attempt = 1;
        while (Date.now() - started < timeoutMs) {
            const delayMs = Math.min(this.operationManualWaitDelayMs(attempt), Math.max(0, timeoutMs - (Date.now() - started)));
            if (delayMs > 0)
                await sleep(delayMs);
            await this.refreshOperationStatus(opId, action, workerId, attempt).catch(() => false);
            const current = this.localOperations[opId];
            if (operationTerminal(current)) {
                const terminalStatus = resultStatus(current) || stringFromRecord(current || {}, ["status", "state"]);
                this.throwIfTerminalActionFailure(title, action, terminalStatus, current);
                return current;
            }
            attempt += 1;
        }
        throw new UiCommandRemotePending(`${title || action} 已提交到 Agent，等待 operation 终态 operationId=${opId}；按钮已恢复，可在“操作进度”查看。`);
    }
    async finishOperationWatchdog(opId, action, workerId) {
        await this.refreshOperationStatus(opId, action, workerId);
        this.clearOperationStatusProbe(opId);
        const current = this.localOperations[opId];
        if (operationTerminal(current))
            return;
        if (operationLongRunningAction(action) && operationSubmissionAccepted(current)) {
            this.scheduleOperationWatchdog(opId, action, workerId);
            this.postState();
            return;
        }
        this.localOperations[opId] = {
            ...(current || {}),
            operationId: opId,
            type: action,
            status: "stalled",
            message: `${workerId ? `Worker Agent ${workerId}` : "Hub Agent"} 未在 60s 内返回终态，UI 已恢复；请刷新或检查对应 Agent 日志。`,
            updatedAt: new Date().toISOString(),
        };
        this.markLocalOperationsDirty();
        this.operationTimers.delete(opId);
        this.postState();
    }
    async refreshOperationStatus(opId, action, workerId, probeAttempt = 0) {
        const current = this.localOperations[opId];
        if (operationTerminal(current)) {
            this.clearOperationStatusProbe(opId);
            return true;
        }
        try {
            const result = workerId
                ? await this.client.getWorkerOperation(workerId, opId)
                : await this.client.getOperation(opId);
            const status = resultStatus(result) || (result && typeof result === "object" && result.terminal === true ? "completed" : undefined);
            this.localOperations[opId] = {
                ...(current || {}),
                ...(result && typeof result === "object" ? result : {}),
                operationId: opId,
                type: action,
                status: status || stringFromRecord(result || {}, ["status", "state"]) || "running",
                updatedAt: new Date().toISOString(),
            };
            this.markLocalOperationsDirty();
            if (operationTerminal(this.localOperations[opId])) {
                this.clearOperationStatusProbe(opId);
                this.clearOperationWatchdog(opId);
                if (actionAffectsResultsSummary(action)) {
                    const planHint = operationResultPlanFile(this.localOperations[opId]);
                    if (actionRequiresResultReparse(action))
                        this.queueSelectedPlanResultParse("operation 完成", planHint);
                    await this.refreshResultsSummary(planHint);
                }
            }
            else if (this.shouldRetryOperationStatusProbe(opId, probeAttempt)) {
                this.scheduleOperationStatusProbe(opId, action, workerId, probeAttempt + 1);
            }
            this.postState();
            return true;
        }
        catch {
            return false;
        }
    }
    clearOperationWatchdog(opId) {
        const timer = this.operationTimers.get(opId);
        if (timer)
            clearTimeout(timer);
        this.operationTimers.delete(opId);
    }
    clearOperationStatusProbe(opId) {
        const timer = this.operationProbeTimers.get(opId);
        if (timer)
            clearTimeout(timer);
        this.operationProbeTimers.delete(opId);
    }
    shouldRetryOperationStatusProbe(opId, attempt) {
        if (attempt < 1 || attempt >= this.operationStatusProbeMaxAttempts)
            return false;
        if (!this.operationTimers.has(opId))
            return false;
        return !operationTerminal(this.localOperations[opId]);
    }
    actionBody(message) {
        const planTarget = this.actionPlanTarget(message);
        const planFile = planTarget.planFile;
        const selectedPlanId = planTarget.selectedPlanId;
        const messageRunKey = usableSelectionKey(stringField(message, "runKey"));
        const messageRunKeys = stringArrayField(message, "selectedRunKeys");
        const messageExperimentIds = stringArrayField(message, "selectedExperimentIds");
        const messageArchiveKeys = stringArrayField(message, "selectedArchiveKeys");
        const messageWorkerIds = stringArrayField(message, "selectedWorkerIds").map((id) => this.resolveWorkerEndpointId(id) || id);
        const messageTaskUiKeys = stringArrayField(message, "selectedTaskUiKeys");
        const messagePlanFiles = uniqueStrings(stringArrayField(message, "selectedPlanFiles").map(usableSelectionKey).filter(Boolean));
        const selectedTaskTargets = taskActionTargetsField(message).map((target) => ({
            ...target,
            workerId: this.resolveWorkerEndpointId(target.workerId || "") || target.workerId,
        }));
        const suppressGlobalTaskSelection = Boolean(message && typeof message === "object" && message.suppressGlobalTaskSelection === true);
        const messageWorkerId = this.resolveWorkerEndpointId(stringField(message, "workerId")) || usableSelectionKey(stringField(message, "workerId"));
        const experimentIndex = numberField(message, "experimentIndex");
        const gpuId = usableSelectionKey(stringField(message, "gpuId"));
        const confirmationPath = usableSelectionKey(stringField(message, "confirmationPath"));
        const artifactPath = stringField(message, "artifactPath");
        const resultPath = stringField(message, "resultPath");
        const logPath = stringField(message, "logPath");
        const manualStopType = usableSelectionKey(stringField(message, "manualStopType"));
        const stopReason = usableSelectionKey(stringField(message, "stopReason"));
        const debugMode = booleanField(message, "debugMode");
        const runKey = messageRunKey || (!suppressGlobalTaskSelection ? this.selectedRunKey : "");
        const messageExperimentId = usableSelectionKey(stringField(message, "experimentId"));
        const messageArchiveKey = usableSelectionKey(stringField(message, "archiveKey"));
        const experimentId = messageExperimentId || messageRunKey;
        const archiveKey = messageArchiveKey;
        const storedRunKeys = [...this.selectedRunKeys];
        const selectedExperimentIds = experimentId
            ? [experimentId]
            : (messageExperimentIds.length ? messageExperimentIds : (!suppressGlobalTaskSelection ? [...this.selectedExperimentIds] : []));
        const selectedRunKeys = messageRunKey
            ? [messageRunKey]
            : (messageRunKeys.length ? messageRunKeys : (!suppressGlobalTaskSelection && storedRunKeys.length ? storedRunKeys : (runKey ? [runKey] : [])));
        const selectedArchiveKeys = archiveKey
            ? [archiveKey]
            : (messageArchiveKeys.length ? messageArchiveKeys : (!suppressGlobalTaskSelection ? [...this.selectedArchiveKeys] : []));
        return {
            schemaVersion: 1,
            opId: "",
            selectedPlanId: selectedPlanId || undefined,
            runKey: runKey || undefined,
            experimentId: experimentId || undefined,
            archiveKey: archiveKey || undefined,
            experimentIndex,
            gpuId: gpuId || undefined,
            confirmationPath: confirmationPath || undefined,
            artifactPath: artifactPath || undefined,
            resultPath: resultPath || undefined,
            logPath: logPath || undefined,
            selectedExperimentIds,
            selectedRunKeys,
            selectedArchiveKeys,
            selectedTaskUiKeys: messageTaskUiKeys.length ? messageTaskUiKeys : (!suppressGlobalTaskSelection ? [...this.selectedTaskUiKeys] : []),
            selectedPlanFiles: messagePlanFiles,
            selectedTaskTargets,
            selectedWorkerIds: messageWorkerId ? [messageWorkerId] : uniqueStrings(messageWorkerIds),
            manualStopType: manualStopType || undefined,
            stopReason: stopReason || undefined,
            debugMode,
            options: {
                planFile,
                planId: selectedPlanId || undefined,
                selectedPlanFiles: messagePlanFiles,
                selectedTaskTargets,
                experimentIndex,
                gpuId: gpuId || undefined,
                confirmationPath: confirmationPath || undefined,
                pollSeconds: this.schedulerSettings().pollSeconds,
                jitterSeconds: this.schedulerSettings().jitterSeconds,
                workerStatusTtlSeconds: this.schedulerSettings().workerStatusTtlSeconds,
                workerAvailabilityPushSeconds: this.schedulerSettings().workerAvailabilityPushSeconds,
                operationEventMaxDelayMs: this.schedulerSettings().operationEventMaxDelayMs,
                workerActionMinIntervalMs: this.schedulerSettings().workerActionMinIntervalMs,
                workerActionMaxConcurrent: this.schedulerSettings().workerActionMaxConcurrent,
                manualStopType: manualStopType || undefined,
                stopReason: stopReason || undefined,
                debugMode,
                remotePath: stringField(message, "remotePath"),
                workers: this.workerActionTargets(),
            },
        };
    }
    actionPlanTarget(message) {
        const messagePlanFile = usableSelectionKey(stringField(message, "planFile") || stringField(message, "file"));
        const messagePlanId = usableSelectionKey(stringField(message, "selectedPlanId") || stringField(message, "planId"));
        const selectedPlanFiles = uniqueStrings(stringArrayField(message, "selectedPlanFiles").map(usableSelectionKey).filter(Boolean));
        const suppressGlobalPlan = Boolean(message && typeof message === "object" && message.suppressGlobalPlan === true);
        const inputPlan = usableSelectionKey(this.planFileInput || "");
        const selectedPlan = usableSelectionKey(this.selectedPlanId || "");
        const planFile = messagePlanFile || (selectedPlanFiles.length === 1 ? selectedPlanFiles[0] : "") || (!suppressGlobalPlan ? inputPlan || selectedPlan : "") || undefined;
        return {
            planFile,
            selectedPlanId: messagePlanId || messagePlanFile || (!suppressGlobalPlan ? selectedPlan || inputPlan : "") || planFile,
        };
    }
    localPlanForActionBody(body) {
        const planFile = usableSelectionKey(String(body.options?.planFile || ""));
        const planId = usableSelectionKey(body.selectedPlanId || "");
        return (this.localPlanMetadata.plans || []).find((plan) => Boolean((planFile && (plan.planFile === planFile || plan.file === planFile)) || (planId && (plan.planId === planId || plan.planFile === planId || plan.file === planId))));
    }
    planVersionForFile(planFile = "") {
        const target = usableSelectionKey(String(planFile || "").trim().replace(/\\/g, "/"));
        const resolved = this.resolveSelectedPlanFile(target) || target;
        const plan = (this.localPlanMetadata.plans || []).find((item) => samePlanSelection(item?.planFile || item?.file || item?.planId || "", resolved));
        return {
            revision: String(plan?.revision || "").trim(),
            updatedAt: String(plan?.updatedAt || "").trim(),
        };
    }
    filterResultsSummaryForPlan(summary, planFile = "") {
        const version = this.planVersionForFile(planFile);
        return filterResultsSummaryForSelectedPlan(summary, planFile, version.revision, version.updatedAt);
    }
    workerActionTargets() {
        const configs = new Map(this.setupConfig.workerTunnels.map((worker) => [worker.id, worker]));
        return this.workerCodeSyncTargets().map((worker) => {
            const config = configs.get(worker.id);
            const dirs = this.agentRuntimeDirs(config?.agentProjectDir || this.setupConfig.agentProjectDir);
            return ({
                id: worker.id,
                name: worker.label,
                worker_id: worker.id,
                worker_name: worker.label,
                project_dir: worker.remotePath,
                agent_runtime_dir: dirs.installDir,
                max_concurrent_gpus: config?.maxConcurrentGpus || 1,
                allowed_gpu_ids: config?.allowedGpuIds || [],
                conda_env: effectiveWorkerCondaEnv(config, this.setupConfig.condaEnv),
                condaEnv: effectiveWorkerCondaEnv(config, this.setupConfig.condaEnv),
                ssh_config_alias: config?.sshConfigAlias,
                sshConfigAlias: config?.sshConfigAlias,
                host: worker.host,
                worker_host: worker.host,
                user: worker.user,
                worker_user: worker.user,
                port: worker.port,
                ssh_port: worker.port,
                local_agent_url: this.workerAgentUrl(worker.id),
                aliases: this.workerAliasCandidates((config || {}), worker),
            });
        });
    }
    workerAgentUrl(workerId) {
        const resolved = this.resolveWorkerEndpointId(workerId) || workerId;
        const worker = this.setupConfig.workerTunnels.find((item) => item.id === resolved);
        const port = worker?.localForwardPort;
        return port ? `http://127.0.0.1:${port}` : "";
    }
    resolveWorkerEndpointId(value) {
        const key = workerAliasKey(value);
        if (!key)
            return "";
        const worker = this.setupConfig.workerTunnels.find((item) => this.workerAliasCandidates(item).some((alias) => workerAliasKey(alias) === key));
        return worker?.id || "";
    }
    workerAliasCandidates(worker, target) {
        const sessionName = String(worker.savedSessionPath || target?.savedSessionPath || "").replace(/\\/g, "/").split("/").pop()?.replace(/\.xsh$/i, "") || "";
        return uniqueStrings([
            worker.id,
            worker.displayName,
            worker.workerHost,
            worker.hubHost,
            worker.sshConfigAlias,
            worker.savedSessionPath,
            sessionName,
            target?.id,
            target?.label,
            target?.host,
            target?.sshConfigHost,
        ].map((value) => String(value || "").trim()).filter(Boolean));
    }
    async fetchSelectedLiveOutput(runKey, workerId) {
        const key = usableSelectionKey(runKey || "");
        if (!key || !this.isRealtimeMode())
            return;
        const resolvedWorkerId = this.resolveWorkerEndpointId(workerId) || "";
        try {
            await this.client.getLiveOutput(key, 0, resolvedWorkerId || undefined);
        }
        catch (error) {
            this.recordActionError({
                command: "selectLogRunKey",
                message: errorMessage(error),
                suggestion: resolvedWorkerId ? "请检测对应 Worker Agent，确认日志路径仍在项目目录内。" : "请检测 Hub Agent，确认日志路径仍在项目目录内。",
            });
        }
    }
    async refreshLocalPlanMetadata(options = true) {
        const post = typeof options === "boolean" ? options : options.post !== false;
        const force = typeof options === "object" && options.force === true;
        const root = workspaceRoot();
        const dir = planDirSafe();
        if (!root) {
            this.localPlanMetadata = { planDir: dir, detectedProject: {}, plans: [], archivedPlans: [], error: "No workspace folder open" };
            if (post)
                this.postState();
            return;
        }
        const key = `${root}::${dir}`;
        const recent = this.localPlanMetadataUpdatedAt && Date.now() - this.localPlanMetadataUpdatedAt < this.localPlanMetadataRefreshMinIntervalMs;
        if (!force && recent && this.localPlanMetadataFullRefresh && this.localPlanMetadataKey === key) {
            if (post)
                this.postState();
            return;
        }
        if (this.localPlanMetadataRefreshPromise) {
            await this.localPlanMetadataRefreshPromise;
            if (post)
                this.postState();
            return;
        }
        const generation = this.projectContextGeneration;
        const refresh = (async () => {
            try {
                const [plans, archivedPlans, detectedProject] = await Promise.all([
                    readLocalPlans(root, dir),
                    readArchivedLocalPlans(root, dir),
                    detectLocalProject(root, dir),
                ]);
                if (generation !== this.projectContextGeneration || root !== workspaceRoot())
                    return;
                this.localPlanMetadata = { planDir: dir, detectedProject, plans, archivedPlans };
                this.recentPlans = mergeRecentPlans(this.recentPlans, plans);
                this.reconcileProjectPlanSelection(plans);
                this.localPlanMetadataUpdatedAt = Date.now();
                this.localPlanMetadataActionUpdatedAt = Date.now();
                this.localPlanMetadataKey = key;
                this.localPlanMetadataFullRefresh = true;
                void this.persistProjectPlanSelectionState().catch(() => undefined);
                void this.persistProjectLocalPlanMetadataState().catch(() => undefined);
            }
            finally {
                if (this.localPlanMetadataRefreshPromise === refresh)
                    this.localPlanMetadataRefreshPromise = undefined;
            }
        })();
        this.localPlanMetadataRefreshPromise = refresh;
        await refresh;
        if (post)
            this.postState();
    }
    async refreshLocalPlanMetadataForAction(body, options = {}) {
        const root = workspaceRoot();
        const dir = planDirSafe();
        const generation = this.projectContextGeneration;
        if (!root) {
            this.localPlanMetadata = { planDir: dir, detectedProject: {}, plans: [], archivedPlans: [], error: "No workspace folder open" };
            return;
        }
        if (this.localPlanMetadataRefreshPromise) {
            await this.localPlanMetadataRefreshPromise;
        }
        const key = `${root}::${dir}`;
        const planFile = usableSelectionKey(String(body?.options?.planFile || body?.selectedPlanId || ""));
        const actionRecent = this.localPlanMetadataActionUpdatedAt &&
            Date.now() - this.localPlanMetadataActionUpdatedAt < this.localPlanMetadataActionRefreshMaxAgeMs &&
            this.localPlanMetadataKey === key &&
            !this.localPlanMetadata.error;
        const [plans, selectedPlan, detectedProject] = await Promise.all([
            options.allPlans || !actionRecent ? readLocalPlans(root, dir).catch(() => this.localPlanMetadata.plans || []) : Promise.resolve(this.localPlanMetadata.plans || []),
            planFile ? readLocalPlanSummary(root, dir, planFile).catch(() => undefined) : Promise.resolve(undefined),
            detectLocalProjectForActionGate(root, dir, this.localPlanMetadata.detectedProject).catch((error) => ({
                ...this.localPlanMetadata.detectedProject,
                metadataRefreshMode: "action_gate_failed",
                metadataPartialReason: `本地项目快速扫描失败，已沿用上次结果：${errorMessage(error)}`,
            })),
        ]);
        if (generation !== this.projectContextGeneration || root !== workspaceRoot())
            return;
        const nextPlans = selectedPlan ? upsertLocalPlanSummary(plans, selectedPlan) : plans;
        this.localPlanMetadata = {
            planDir: dir,
            detectedProject,
            plans: nextPlans,
            archivedPlans: this.localPlanMetadata.archivedPlans || [],
        };
        this.recentPlans = mergeRecentPlans(this.recentPlans, nextPlans);
        this.reconcileProjectPlanSelection(nextPlans);
        this.localPlanMetadataUpdatedAt = Date.now();
        this.localPlanMetadataActionUpdatedAt = Date.now();
        void this.persistProjectLocalPlanMetadataState().catch(() => undefined);
        this.localPlanMetadataKey = key;
        this.localPlanMetadataFullRefresh = false;
        void this.persistProjectPlanSelectionState().catch(() => undefined);
    }
    async openWorkspacePlanFromUi(message) {
        const file = stringField(message, "file") || stringField(message, "planFile");
        if (!file)
            return;
        await openWorkspaceFile(file);
        // Opening a workspace plan should also become the active selected plan for closed-loop parse/run.
        this.selectPlanFromUi({ planFile: file, planId: file });
    }
    async savePlanFromUi(message) {
        const file = stringField(message, "file") || stringField(message, "planFile");
        const text = stringField(message, "text");
        if (!file || !text) {
            this.recordActionError({ command: "savePlan", message: "缺少 plan 文件或内容" });
            this.postState();
            return;
        }
        const root = workspaceRoot();
        if (!root)
            throw new Error("需要先打开工作区。");
        const fullPath = safeWorkspacePlanPath(root, file, planDirSafe());
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        const backup = `${fullPath}.bak`;
        const oldText = await fs.readFile(fullPath, "utf8").catch(() => "");
        if (oldText)
            await fs.writeFile(backup, oldText, "utf8");
        await fs.writeFile(fullPath, ensurePlanPurposeHeader(text, path.basename(file)), "utf8");
        await this.refreshLocalPlanMetadata({ post: false, force: true });
        this.planFileInput = file;
        this.selectedPlanId = file;
        void this.persistProjectPlanSelectionState().catch(() => undefined);
        this.postState();
    }
    async archivePlanFromUi(message) {
        const root = workspaceRoot();
        if (!root)
            throw new Error("需要先打开工作区。");
        const file = stringField(message, "file") || stringField(message, "planFile") || this.planFileInput || this.selectedPlanId;
        if (!file)
            throw new Error("缺少要归档的 planFile。");
        const planDir = planDirSafe();
        const source = safeWorkspacePlanPath(root, file, planDir);
        const planRoot = path.resolve(root, planDir);
        const planText = await fs.readFile(source, "utf8");
        await this.refreshLocalPlanMetadataForAction(this.actionBody({ planFile: file }));
        const runGate = planArchiveRunGate(this.lastRealtimeState || this.lastSnapshot || this.client.currentState(), file);
        if (!runGate.ok)
            throw new Error(`暂不可归档 Plan：${runGate.reason}`);
        await this.refreshResultsSummary(file);
        const resultSummary = this.filterResultsSummaryForPlan(this.resultsSummary, file);
        const archiveGate = planArchiveGateFromResults(resultSummary, file);
        if (!archiveGate.ok)
            throw new Error(`暂不可归档 Plan：${archiveGate.reason}`);
        const resultSelection = planArchiveResultSelection(resultSummary, file);
        const resultSelectionFile = "evidence/result_selection.json";
        const configFiles = await planArchiveConfigFiles(root, planText);
        const configMigration = await planArchiveConfigMigration(root, planDir, source, configFiles);
        const environmentFiles = await detectEnvironmentFiles(root);
        const parameterSnapshot = await planArchiveParameterSnapshot(root, planText);
        const evidencePlan = planArchiveEvidencePlan(resultSummary, file);
        if (evidencePlan.missingRequired.length)
            throw new Error(`暂不可归档 Plan：结果摘要缺少 ${evidencePlan.missingRequired.join("、")}。请先重新解析当前 Plan 结果。`);
        if (evidencePlan.invalid.length)
            throw new Error(`暂不可归档 Plan：结果证据路径无效或不是受支持的轻量文件：${evidencePlan.invalid.join("、")}`);
        const canDownloadEvidence = this.effectiveConnectionMode() !== "offline_import" && this.missingCapabilities(["endpoints.fileDownload"]).length === 0;
        const evidenceMode = canDownloadEvidence ? "hub_download" : "local";
        if (evidenceMode === "local") {
            const localEvidence = await inspectLocalPlanArchiveEvidence(root, evidencePlan.files);
            if (localEvidence.missing.length)
                throw new Error(`暂不可归档 Plan：Hub 轻量文件下载不可用，且本地缺少结果证据：${localEvidence.missing.join("、")}。请恢复 Hub 连接或先同步这些文件。`);
            if (localEvidence.oversized.length)
                throw new Error(`暂不可归档 Plan：本地结果证据超过单文件 ${Math.round(PLAN_ARCHIVE_EVIDENCE_MAX_BYTES / 1024 / 1024)} MB 上限：${localEvidence.oversized.join("、")}`);
        }
        const evidenceFiles = evidencePlan.files;
        const movableEvidence = evidenceMode === "local" ? planArchiveMovableEvidenceFiles(evidenceFiles) : [];
        const parameterReviewCount = parameterSnapshot.unresolvedDeclarationCount + parameterSnapshot.dynamicDefaultCount + parameterSnapshot.parserFeatureCount + parameterSnapshot.missingEntries.length + parameterSnapshot.unresolvedCommands.length + parameterSnapshot.sourceScanWarnings.length;
        const relativeFromPlanDir = path.relative(planRoot, source).replace(/\\/g, "/");
        const parsed = path.parse(source);
        const bundleParent = path.join(planRoot, "_archived", path.dirname(relativeFromPlanDir));
        const bundleDir = await nextAvailableDirectory(bundleParent, `${parsed.name}__archive`);
        const bundleRelative = path.relative(root, bundleDir).replace(/\\/g, "/");
        const evidenceLines = evidencePlan.entries.map((entry) => `- ${entry.label}：${entry.path}\n  -> ${path.posix.join(bundleRelative, "evidence", entry.path)}`);
        const confirmLabel = "确认归档并同步证据";
        const answer = await vscode.window.showWarningMessage([
            "【Plan 归档位置确认】",
            "",
            `当前 Plan：${file}`,
            `归档包位置：${bundleRelative}`,
            `结果证据来源：${evidenceMode === "hub_download" ? "Hub 当前项目，只读下载" : "当前本地项目"}`,
            `最终有效结果：${archiveGate.includedCount} 条；未纳入：${archiveGate.excludedCount} 条`,
            `结果取舍清单：${path.posix.join(bundleRelative, resultSelectionFile)}`,
            `配置：迁移 ${configMigration.migrated.length} 个独占配置，保留 ${configMigration.retainedShared.length} 个共享配置`,
            `参数：${parameterSnapshot.entries.length} 个源码，${parameterSnapshot.parameterCount} 个 CLI 参数声明${parameterReviewCount ? `，${parameterReviewCount} 项待复核` : ""}`,
            "",
            "预期证据文件位置：",
            ...evidenceLines,
            "",
            "未纳入记录不会进入有效 CSV、统计或 PPT，但会按原状态完整保存到结果取舍清单。",
            "确认后才会创建归档包、同步轻量证据并迁移 Plan/独占配置；远端实验产物不会被删除。",
        ].join("\n"), { modal: true }, confirmLabel);
        if (answer !== confirmLabel)
            throw new UiCommandCancelled("Plan 归档已取消，未创建归档包或迁移文件。");
        const stagingDir = `${bundleDir}.staging`;
        let bundlePublished = false;
        try {
            await fs.mkdir(stagingDir, { recursive: true });
            await fs.writeFile(path.join(stagingDir, "plan.yaml"), planText, "utf8");
            const configs = await copyPlanArchiveFiles(root, stagingDir, "configs", configFiles);
            const environment = await copyPlanArchiveFiles(root, stagingDir, "environment", environmentFiles);
            const entryScripts = await copyPlanArchiveFiles(root, stagingDir, path.join("parameters", "entries"), parameterSnapshot.entryScripts);
            const parameterSnapshotPath = path.join(stagingDir, "parameters", "cli_parameters.json");
            await fs.mkdir(path.dirname(parameterSnapshotPath), { recursive: true });
            await fs.writeFile(parameterSnapshotPath, JSON.stringify(parameterSnapshot, null, 2) + "\n", "utf8");
            const resultSelectionPath = safeArchiveBundleChildPath(stagingDir, resultSelectionFile);
            await fs.mkdir(path.dirname(resultSelectionPath), { recursive: true });
            await fs.writeFile(resultSelectionPath, JSON.stringify(resultSelection, null, 2) + "\n", "utf8");
            const evidence = await materializePlanArchiveEvidenceFiles(this.client, root, stagingDir, evidenceFiles, evidenceMode);
            const excludedResults = planArchiveExcludedResults(resultSelection);
            await fs.writeFile(path.join(stagingDir, "archive_manifest.json"), JSON.stringify({
                schemaVersion: 5,
                archivedAt: new Date().toISOString(),
                originalPlanFile: file,
                runGate,
                runArchive: archiveGate,
                configs,
                environment,
                parameters: {
                    snapshot: "parameters/cli_parameters.json",
                    entryScripts,
                    parameterCount: parameterSnapshot.parameterCount,
                    parserDeclarationCount: parameterSnapshot.parserDeclarationCount,
                    unresolvedDeclarationCount: parameterSnapshot.unresolvedDeclarationCount,
                    dynamicDefaultCount: parameterSnapshot.dynamicDefaultCount,
                    parserFeatureCount: parameterSnapshot.parserFeatureCount,
                    scannedSourceCount: parameterSnapshot.scannedSourceCount,
                    sourceScanWarnings: parameterSnapshot.sourceScanWarnings,
                    reviewCount: parameterReviewCount,
                    missingEntries: parameterSnapshot.missingEntries,
                    unresolvedCommands: parameterSnapshot.unresolvedCommands,
                },
                evidence,
                evidenceSource: {
                    mode: evidenceMode,
                    planFile: file,
                    maxFileBytes: PLAN_ARCHIVE_EVIDENCE_MAX_BYTES,
                    remoteProjectRetained: evidenceMode === "hub_download",
                },
                resultSelection: {
                    path: resultSelectionFile,
                    inclusionPolicy: resultSelection.inclusionPolicy,
                    totalCount: resultSelection.totalCount,
                    includedCount: resultSelection.includedCount,
                    notIncludedCount: resultSelection.notIncludedCount,
                },
                configArchive: { migrated: configMigration.migrated, retainedShared: configMigration.retainedShared },
                resultArchive: { migrated: movableEvidence, retainedShared: evidenceFiles.filter((item) => !movableEvidence.includes(item)), sourceMode: evidenceMode },
                excludedResults,
                excludedResultsTotalCount: resultSelection.notIncludedCount,
                excludedResultsOmittedCount: Math.max(0, resultSelection.notIncludedCount - excludedResults.length),
                note: "本包保存可复用 Plan、关联配置、项目依赖环境清单、入口脚本与 CLI 默认参数快照，以及小型结果证据。参数只做静态读取，不导入或执行项目代码。大体积运行产物仍由既有 Hub/Worker 归档保存，路径见证据文件。",
            }, null, 2) + "\n", "utf8");
            await fs.rename(stagingDir, bundleDir);
            bundlePublished = true;
            await fs.unlink(source);
            await removeArchivedWorkspaceFiles(root, configMigration.migrated);
            await removeArchivedWorkspaceFiles(root, movableEvidence);
        }
        catch (error) {
            if (bundlePublished) {
                const rollbackErrors = [];
                let workspaceRestored = false;
                await restorePlanArchiveWorkspaceFiles(root, bundleDir, source, configMigration.migrated, movableEvidence)
                    .then(() => { workspaceRestored = true; })
                    .catch((rollbackError) => rollbackErrors.push(errorMessage(rollbackError)));
                if (workspaceRestored) {
                    await fs.rm(bundleDir, { recursive: true, force: true }).catch((rollbackError) => rollbackErrors.push(errorMessage(rollbackError)));
                }
                else {
                    rollbackErrors.push(`恢复失败，归档副本保留在 ${bundleRelative}`);
                }
                if (rollbackErrors.length)
                    throw new Error(`Plan 归档失败，自动回滚不完整：${rollbackErrors.join("；")}。原始错误：${errorMessage(error)}`);
            }
            else {
                await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => undefined);
            }
            throw error;
        }
        const archivedRelative = path.relative(root, bundleDir).replace(/\\/g, "/");
        if (this.planFileInput === file)
            this.planFileInput = undefined;
        if (this.selectedPlanId === file)
            this.selectedPlanId = undefined;
        await this.refreshLocalPlanMetadata({ post: false, force: true });
        void this.persistProjectPlanSelectionState().catch(() => undefined);
        this.postState();
        void vscode.window.showInformationMessage(`Plan 归档包已创建：${archivedRelative}`);
    }
    async restoreArchivedPlanFromUi(message) {
        const root = workspaceRoot();
        if (!root)
            throw new Error("需要先打开工作区。");
        const file = stringField(message, "file") || stringField(message, "planFile");
        if (!file)
            throw new Error("缺少要恢复的归档 Plan。");
        const planDir = planDirSafe();
        const source = safeWorkspacePlanPath(root, file, planDir);
        const archivedRoot = path.resolve(root, planDir, "_archived");
        const archivedRelative = path.relative(archivedRoot, source);
        if (archivedRelative.startsWith("..") || path.isAbsolute(archivedRelative) || path.basename(source).toLowerCase() !== "plan.yaml")
            throw new Error("只能恢复归档包根目录中的 plan.yaml。");
        const bundleDir = path.dirname(source);
        const bundle = await readPlanArchiveBundle(source);
        if (!bundle.schemaVersion || !stringField(bundle, "originalPlanFile"))
            throw new Error("归档包缺少 archive_manifest.json，无法安全恢复。");
        const planText = await fs.readFile(source, "utf8");
        const originalPlanFile = stringField(bundle, "originalPlanFile");
        const requestedTarget = safeWorkspacePlanPath(root, originalPlanFile, planDir);
        const planRoot = path.resolve(root, planDir);
        const originalRelative = path.relative(planRoot, requestedTarget).replace(/\\/g, "/");
        if (originalRelative === "_archived" || originalRelative.startsWith("_archived/"))
            throw new Error("归档包原始 Plan 路径无效。");
        const parsed = path.parse(requestedTarget);
        const target = await nextAvailableVersionedPlanFile(path.join(planRoot, "_restored", path.dirname(originalRelative)), parsed.name, parsed.ext);
        const restoredFile = path.relative(root, target).replace(/\\/g, "/");
        const planVersion = path.basename(target, parsed.ext).match(/__v(\d+)$/)?.[1] || "1";
        const outputNamespace = `__restored_v${planVersion}`;
        const restoredAssetRoot = path.posix.join("experiments", "restored_assets", safePlanToken(restoredFile));
        const configBundleFiles = archiveManifestFileList(bundle.configs);
        const environmentBundleFiles = archiveManifestFileList(bundle.environment);
        const parameterBundle = bundle.parameters && typeof bundle.parameters === "object" && !Array.isArray(bundle.parameters) ? bundle.parameters : {};
        const parameterBundleFiles = [stringField(parameterBundle, "snapshot"), ...archiveManifestFileList(parameterBundle.entryScripts)].filter(Boolean);
        const restoredPreview = restorePlanText(planText, { originalPlanFile, archivedPlanFile: file, restoredFile, planVersion, configPathMap: new Map() });
        const restoredOutputCandidates = uniqueStrings((0, PlanBuilder_1.parsePlanSummary)(restoredPreview).outputCandidates || []);
        const restoredOutputPreview = restoredOutputCandidates.slice(0, 12);
        const confirmLabel = "确认恢复独立版本";
        const answer = await vscode.window.showWarningMessage([
            "【恢复版本位置确认】",
            "",
            `归档来源：${file}`,
            `新 Plan：${restoredFile}`,
            `配置/环境/参数目录：${restoredAssetRoot}`,
            `运行输出命名空间：${outputNamespace}`,
            `预计恢复：配置 ${configBundleFiles.length} 个，环境 ${environmentBundleFiles.length} 个，参数资料 ${parameterBundleFiles.length} 个`,
            "",
            `预期结果文件位置（静态推断，已列 ${restoredOutputPreview.length} / 共 ${restoredOutputCandidates.length}）：`,
            ...(restoredOutputPreview.length ? restoredOutputPreview.map((item) => `  - ${item}`) : ["  - 未检测到固定结果位置；运行前校验将继续检查输出契约。"]),
            ...(restoredOutputCandidates.length > restoredOutputPreview.length ? [`其余 ${restoredOutputCandidates.length - restoredOutputPreview.length} 个预期位置使用同一版本命名空间。`] : []),
            "",
            "恢复后的输出目录、固定结果文件和命令内固定输出参数会自动加入该版本命名空间，避免覆盖历史结果。",
            "确认后才会写入新 Plan 和恢复资产；归档包不会改变。",
        ].join("\n"), { modal: true }, confirmLabel);
        if (answer !== confirmLabel)
            throw new UiCommandCancelled("恢复归档 Plan 已取消，未写入新版本或恢复资产。");
        let restoredConfigs = 0;
        let missingConfigs = 0;
        const configPathMap = new Map();
        for (const relative of configBundleFiles) {
            const configSource = safeArchiveBundleChildPath(path.join(bundleDir, "configs"), relative);
            const configTarget = safeWorkspaceChildPath(root, path.posix.join("experiments", "restored_assets", safePlanToken(restoredFile), "configs", relative));
            const stat = await fs.stat(configSource).catch(() => undefined);
            if (!stat?.isFile()) {
                missingConfigs += 1;
                continue;
            }
            await fs.mkdir(path.dirname(configTarget), { recursive: true });
            await fs.copyFile(configSource, configTarget);
            configPathMap.set(relative, path.relative(root, configTarget).replace(/\\/g, "/"));
            restoredConfigs += 1;
        }
        const environmentFiles = environmentBundleFiles;
        const restoredEnvironmentDir = environmentFiles.length ? path.posix.join("experiments", "restored_assets", safePlanToken(restoredFile), "environment") : "";
        const restoredEnvironmentFiles = [];
        let missingEnvironmentFiles = 0;
        for (const relative of environmentFiles) {
            const environmentSource = safeArchiveBundleChildPath(path.join(bundleDir, "environment"), relative);
            const environmentTarget = safeWorkspaceChildPath(root, path.posix.join("experiments", "restored_assets", safePlanToken(restoredFile), "environment", relative));
            const stat = await fs.stat(environmentSource).catch(() => undefined);
            if (!stat?.isFile()) {
                missingEnvironmentFiles += 1;
                continue;
            }
            await fs.mkdir(path.dirname(environmentTarget), { recursive: true });
            await fs.copyFile(environmentSource, environmentTarget);
            restoredEnvironmentFiles.push({ original: relative, restored: path.relative(root, environmentTarget).replace(/\\/g, "/") });
        }
        const parameterSnapshotFile = stringField(parameterBundle, "snapshot");
        const parameterEntryScripts = archiveManifestFileList(parameterBundle.entryScripts);
        const restoredParameterDir = parameterSnapshotFile || parameterEntryScripts.length ? path.posix.join("experiments", "restored_assets", safePlanToken(restoredFile), "parameters") : "";
        const restoredParameterFiles = [];
        let missingParameterFiles = 0;
        if (parameterSnapshotFile) {
            const parameterSource = safeArchiveBundleChildPath(bundleDir, parameterSnapshotFile);
            const parameterTarget = safeWorkspaceChildPath(root, path.posix.join(restoredParameterDir, "cli_parameters.json"));
            const stat = await fs.stat(parameterSource).catch(() => undefined);
            if (stat?.isFile()) {
                await fs.mkdir(path.dirname(parameterTarget), { recursive: true });
                await fs.copyFile(parameterSource, parameterTarget);
                restoredParameterFiles.push({ original: parameterSnapshotFile, restored: path.relative(root, parameterTarget).replace(/\\/g, "/") });
            }
            else {
                missingParameterFiles += 1;
            }
        }
        for (const relative of parameterEntryScripts) {
            const parameterSource = safeArchiveBundleChildPath(path.join(bundleDir, "parameters", "entries"), relative);
            const parameterTarget = safeWorkspaceChildPath(root, path.posix.join(restoredParameterDir, "entries", relative));
            const stat = await fs.stat(parameterSource).catch(() => undefined);
            if (!stat?.isFile()) {
                missingParameterFiles += 1;
                continue;
            }
            await fs.mkdir(path.dirname(parameterTarget), { recursive: true });
            await fs.copyFile(parameterSource, parameterTarget);
            restoredParameterFiles.push({ original: relative, restored: path.relative(root, parameterTarget).replace(/\\/g, "/") });
        }
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, restorePlanText(planText, { originalPlanFile, archivedPlanFile: file, restoredFile, planVersion, configPathMap, restoredEnvironmentDir, restoredParameterDir }), "utf8");
        const restoreRecordFile = safeWorkspaceChildPath(root, path.posix.join("zlk_cluster", "plan_restores", `${safePlanToken(restoredFile)}.json`));
        await fs.mkdir(path.dirname(restoreRecordFile), { recursive: true });
        await fs.writeFile(restoreRecordFile, JSON.stringify({
            schemaVersion: 1,
            restoredAt: new Date().toISOString(),
            planVersion: `v${planVersion}`,
            originalPlanFile,
            archivedPlanFile: file,
            restoredPlanFile: restoredFile,
            resultScopeFile: restoredFile,
            outputNamespace,
            restoredConfigs: [...configPathMap.entries()].map(([original, restored]) => ({ original, restored })),
            missingConfigFiles: missingConfigs,
            restoredEnvironmentDir,
            restoredEnvironmentFiles,
            missingEnvironmentFiles,
            restoredParameterDir,
            restoredParameterFiles,
            missingParameterFiles,
        }, null, 2) + "\n", "utf8");
        this.planFileInput = restoredFile;
        this.selectedPlanId = restoredFile;
        await this.refreshLocalPlanMetadata({ post: false, force: true });
        await this.persistProjectPlanSelectionState();
        this.postState();
        void vscode.window.showInformationMessage(`Plan 已恢复为独立版本 v${planVersion}：${restoredFile}；输出使用 ${outputNamespace} 命名空间，结果写入独立 Plan 范围。已恢复配置 ${restoredConfigs} 个、环境清单 ${restoredEnvironmentFiles.length} 个、参数资料 ${restoredParameterFiles.length} 个；缺失配置 ${missingConfigs} 个、环境清单 ${missingEnvironmentFiles} 个、参数资料 ${missingParameterFiles} 个。已自动切换到 Plan 工作台，可先检查恢复内容，再执行“校验并提交运行”。`);
    }
    async runAllPlansFromUi() {
        const topology = this.assertPlanTopologyReady("批量运行计划");
        await this.refreshLocalPlanMetadataForAction(undefined, { allPlans: true });
        const plans = this.localPlanMetadata.plans || [];
        if (!plans.length)
            throw new Error("没有可运行的计划文件。");
        this.assertExecutionWorkersReady();
        const blocked = plans
            .map((plan) => ({ plan, reason: projectOutputGateReason(this.localPlanMetadata.detectedProject, plan) }))
            .filter((item) => item.reason);
        if (blocked.length) {
            throw new Error(`有 ${blocked.length} 个计划缺少可用结果捕获规则，已阻止运行全部计划。` + blocked.slice(0, 5).map((item) => `${item.plan.planFile}: ${item.reason}`).join("；"));
        }
        const candidatePlans = [];
        for (const plan of plans) {
            const planFile = plan.planFile || plan.file;
            if (!planFile)
                throw new Error("计划元数据缺少 planFile，已停止批量运行；请刷新识别后重试。");
            const body = this.actionBody({ planFile, planId: plan.planId || planFile, selectedPlanId: plan.planId || planFile });
            this.stampPlanRevision(body, plan);
            await this.assertPlanLocalConfigFiles(body);
            candidatePlans.push({ planFile, body, plan });
        }
        this.assertExecutionAgentProjectsReady();
        const currentState = this.buildState();
        const activePlans = candidatePlans
            .map((candidate) => ({ planFile: candidate.planFile, activity: activePlanRunEvidence(currentState, candidate.planFile, candidate.plan) }))
            .filter((item) => item.activity.active);
        if (activePlans.length)
            throw new Error(`有 ${activePlans.length} 个 Plan 仍在排队或运行，已阻止重复批量提交：${activePlans.slice(0, 5).map((item) => `${item.planFile}${item.activity.historicalOnly ? "（旧 revision 仍活跃）" : ""}`).join("、")}。请先在“任务运行状态”处理。`);
        if (!await this.ensureSimpleSftpReadyForSetup("批量运行"))
            return;
        await this.confirmPlanBatchRunSubmission(candidatePlans.map((candidate) => candidate.plan));
        await this.ensureCodeReadyForRun();
        const preparedPlans = [];
        for (const candidate of candidatePlans) {
            const { planFile, body } = candidate;
            if (!await this.runPlanPreflight(body, `计划 ${planFile}`))
                throw new Error(`计划 ${planFile} 的校验或预演未返回有效结果，已停止整批提交。`);
            preparedPlans.push({ planFile, body });
        }
        let submitted = 0;
        let pendingSubmitted = 0;
        for (const prepared of preparedPlans) {
            const { planFile, body } = prepared;
            const result = await this.postPlanSchedulerAction("run-plan", body, {
                title: `运行计划 ${planFile}`,
                confirm: false,
                danger: false,
                requiresCapability: capabilityForAction("run-plan"),
            });
            if (remoteActionPendingStatus(resultStatus(result)))
                pendingSubmitted += 1;
            submitted += 1;
        }
        const schedulerLabel = topology.mode === "single_worker"
            ? `Worker ${this.planSchedulerWorkerId()} 本机调度队列`
            : topology.mode === "worker_pool"
                ? "各 Worker 独立分片调度队列"
                : "Hub 调度队列";
        void vscode.window.showInformationMessage(`全部 ${preparedPlans.length} 个计划已通过校验与预演，并提交 ${submitted}/${preparedPlans.length} 个到 ${schedulerLabel}；${pendingSubmitted} 个正在后台调度。`);
        this.postState();
        if (pendingSubmitted)
            throw new UiCommandRemotePending(`已提交 ${pendingSubmitted}/${submitted} 个计划到 ${schedulerLabel} 并进入后台调度；按钮已恢复，可在“任务”查看排队、运行与日志。`);
    }
    async generatePlanGuideFromUi(openAfterCreate = true) {
        const root = workspaceRoot();
        if (!root)
            throw new Error("需要先打开工作区。");
        const dir = path.join(root, planDirSafe());
        await fs.mkdir(dir, { recursive: true });
        const configs = (await discoverProjectConfigFiles(root))
            .map((file) => path.relative(root, file).replace(/\\/g, "/"));
        const suite = safePlanToken(path.basename(root) || "experiment");
        const fullPath = await nextAvailableFile(dir, "guided_plan", ".yaml");
        const relative = path.relative(root, fullPath).replace(/\\/g, "/");
        const entries = await detectEntryCandidates(root);
        const mode = await pickGuidedPlanMode(entries);
        const stages = guidedPlanStages(mode);
        let trainEntry = "";
        let trainCommand = "";
        let trainSuggestion = guidedPlanCommandInfo("", "train");
        if (stages.train) {
            const trainCommandStage = mode === "train" ? "train_result" : "train";
            trainEntry = await this.pickGuidedPlanEntry(root, entries.trainEntries, trainCommandStage);
            trainSuggestion = await guidedPlanCommandSuggestion(root, trainEntry, trainCommandStage);
            const value = await inputRequired("确认训练命令", trainSuggestion.command, "例如 python tools/train.py --config {config} --output-dir {output_dir}", guidedPlanCommandPrompt(trainSuggestion, trainCommandStage), "请填写当前项目可执行的训练命令。");
            if (value === undefined)
                throw new UiCommandCancelled("生成 Plan 已取消。");
            trainCommand = value;
        }
        let testEntry = "";
        let testCommand = "";
        let testSuggestion = guidedPlanCommandInfo("", "test");
        if (stages.test) {
            testEntry = await this.pickGuidedPlanEntry(root, entries.testEntries, "test");
            testSuggestion = await guidedPlanCommandSuggestion(root, testEntry, "test");
            const value = await inputRequired("确认评估命令", testSuggestion.command, "例如 python tools/test.py --config {config} --result-csv {result_csv}", guidedPlanCommandPrompt(testSuggestion, "test"), "请填写当前项目可执行的评估命令。");
            if (value === undefined)
                throw new UiCommandCancelled("生成 Plan 已取消。");
            testCommand = value;
        }
        const resultStage = mode === "train" ? "train" : "test";
        const resultCommand = resultStage === "train" ? trainCommand : testCommand;
        const resultSuggestion = resultStage === "train" ? trainSuggestion : testSuggestion;
        const resultReview = guidedPlanResultPathReview(resultCommand, suite, resultSuggestion.resultExtension);
        const resultPath = await inputPlanResultPath("确认最终结果文件", resultReview.path, "例如 {output_dir}/metrics_summary.csv", `建议来源：${resultReview.source}。${resultReview.needsReview ? "当前文件名包含静态推断，必须核对命令真实写出的文件。" : "已从命令中识别到明确结果位置，仍需确认与实际实现一致。"} 必须填写${resultStage === "train" ? "训练" : "评估"}命令实际生成的项目内结果文件。使用 {result_csv} 时该路径会注入命令；固定输出路径必须与命令完全一致。CSV、JSON、TXT、LOG 均可解析，后续归档、统计和 PPT 只读取此结果链路。`);
        if (resultPath === undefined)
            throw new UiCommandCancelled("生成 Plan 已取消。");
        const requiresConfig = guidedPlanCommandUsesConfig(trainCommand) || guidedPlanCommandUsesConfig(testCommand);
        const baseConfig = await this.pickPlanBaseConfig(configs, { root, suite, requiresConfig });
        const generatedFallbackConfig = !configs.length && !requiresConfig;
        const configReview = stages.train ? await guidedPlanConfigReview(root, baseConfig, generatedFallbackConfig) : { needsReview: false, summary: "仅评估，不启动训练", reason: "将直接运行评估命令。" };
        await confirmGuidedPlanCreation({ relative, mode, baseConfig, trainEntry, testEntry, trainCommand, testCommand, resultPath, resultReview, configReview });
        if (generatedFallbackConfig)
            await ensureGuidedFallbackConfig(root, baseConfig);
        const text = [
            "# 由 SimpleExperiment 生成。",
            "# 首次接入固定为单 case、单 seed；运行前请确认运行模式、配置规模、runner 命令和结果路径。",
            "# case/name/id 均可作为实验 case 名；case 内可覆盖 base_config、config、outputDir/output_dir 和 runner 命令。",
            `suite: ${suite}`,
            `base_config: ${baseConfig}`,
            `mode: ${mode}`,
            "seeds: [42]",
            "paper:",
            "  result_group: guided",
            `  result_csv: ${JSON.stringify(resultPath)}`,
            `  table_name: ${suite}`,
            "runner:",
            ...(stages.train ? [`  train_command: ${JSON.stringify(trainCommand)}`] : []),
            ...(stages.test ? [`  test_command: ${JSON.stringify(testCommand)}`] : []),
            "naming:",
            `  sweep_dir: work_dirs/multirun/${suite}`,
            "  job_name: ${index}_${case}_seed${seed}",
            "  experiment_name: ${suite}/${case}/seed_${seed}",
            "cases:",
            "  - case: baseline",
            "    description: baseline",
            `    outputDir: ${JSON.stringify(`work_dirs/multirun/${suite}/{index}_{case}_seed{seed}`)}`,
            "    expectedResults:",
            `      - ${JSON.stringify(resultPath)}`,
            "    overrides: {}",
            "",
        ].join("\n");
        await fs.writeFile(fullPath, text, "utf8");
        await this.refreshLocalPlanMetadata({ post: false, force: true });
        this.planFileInput = relative;
        this.selectedPlanId = relative;
        void this.persistProjectPlanSelectionState().catch(() => undefined);
        this.postState();
        this.queuePlanScopedResultParse("生成计划模板", relative, relative);
        if (openAfterCreate)
            await openWorkspaceFile(relative);
    }
    async pickGuidedPlanEntry(root, entries, stage) {
        const list = uniqueStrings(Array.isArray(entries) ? entries : []);
        if (list.length <= 1)
            return list[0] || "";
        const preferredNames = stage === "test" ? /^(?:test(?:_net)?|eval|evaluate)\.py$/i : /^(?:train(?:_net)?|fit|run(?:_experiment)?)\.py$/i;
        const recommended = list.find((file) => preferredNames.test(path.posix.basename(file)) && !file.includes("/")) || list.find((file) => preferredNames.test(path.posix.basename(file))) || list[0];
        const choices = await guidedPlanEntryChoiceItems(root, list, stage, recommended);
        const picked = await vscode.window.showQuickPick(choices, {
            title: stage === "test" ? "选择评估入口" : "选择训练入口",
            placeHolder: "核对建议命令和未识别参数；选择后仍可编辑完整命令。",
            ignoreFocusOut: true,
        });
        if (!picked)
            throw new UiCommandCancelled("生成 Plan 已取消。");
        return picked.label;
    }
    async pickPlanBaseConfig(configs, options = {}) {
        const list = Array.isArray(configs) ? configs : [];
        if (!list.length) {
            if (!options.requiresConfig)
                return guidedPlanFallbackConfigPath(options.suite);
            const selected = await inputExistingWorkspaceConfig(options.root);
            if (selected === undefined)
                throw new UiCommandCancelled("生成 Plan 已取消。");
            return selected;
        }
        const recommended = guidedPlanRecommendedConfig(list);
        if (list.length <= 1)
            return recommended;
        const choices = await guidedPlanConfigChoiceItems(options.root, list, recommended);
        const picked = await vscode.window.showQuickPick(choices, {
            title: "选择新 Plan 使用的配置",
            placeHolder: "优先选择已检测到小规模参数的配置；选择后仍会在创建前再次检查。",
            ignoreFocusOut: true,
        });
        if (!picked)
            throw new UiCommandCancelled("生成 Plan 已取消。");
        return picked.label;
    }
    async pickProjectBootstrapPlan(plans) {
        const selection = projectBootstrapPlanSelection(plans, this.planFileInput, this.selectedPlanId);
        if (selection.plan)
            return selection.plan;
        const picked = await vscode.window.showQuickPick(selection.plans.map((plan) => {
            const planFile = String(plan?.planFile || plan?.file || plan?.planId || "");
            const mode = String(plan?.mode || "train_test").replace(/_/g, " ");
            const jobs = Number(plan?.jobCount);
            return {
                label: String(plan?.suite || plan?.name || path.basename(planFile) || planFile),
                description: `${mode}${Number.isFinite(jobs) && jobs > 0 ? ` · ${Math.trunc(jobs)} 个任务` : ""}`,
                detail: planFile,
                plan,
            };
        }), {
            title: "选择要接入并运行的 Plan",
            placeHolder: "存在多个 Plan，必须明确选择本次目标；插件不会默认使用列表第一项。",
            ignoreFocusOut: true,
        });
        if (!picked)
            throw new UiCommandCancelled("项目接入已取消，未选择 Plan。");
        return picked.plan;
    }
    async bootstrapProjectFromUi() {
        const root = workspaceRoot();
        if (!root) {
            await this.openWorkspaceFolderForContinuation("接入当前项目", "bootstrapProject");
            return;
        }
        assertSingleProjectWorkspace("接入当前项目");
        await this.refreshLocalPlanMetadata({ post: false, force: true });
        let plans = this.localPlanMetadata.plans || [];
        const initialProjectState = Boolean(this.planFileInput || this.selectedPlanId || this.localPlanMetadata.error);
        let preferDebugFirstRun = false;
        for (let step = 0; step < NEW_PROJECT_INFRASTRUCTURE_MAX_STEPS; step += 1) {
            const prerequisite = projectBootstrapNewProjectPrerequisite({
                planCount: plans.length,
                hasExistingProjectState: initialProjectState,
                simpleSftp: simpleSftpIntegrationReadiness(),
                setupComplete: initialServerSetupComplete(this.setupConfig, this.projectTopologyAssessment().hubAllowed),
                workerCount: this.enabledWorkerConfigs().length,
            });
            if (!prerequisite)
                break;
            const next = await vscode.window.showInformationMessage(prerequisite.message, prerequisite.action, "稍后");
            const continueFlow = await this.handleProjectBootstrapAction(next, {});
            if (!continueFlow)
                return;
        }
        const remainingPrerequisite = projectBootstrapNewProjectPrerequisite({
            planCount: plans.length,
            hasExistingProjectState: initialProjectState,
            simpleSftp: simpleSftpIntegrationReadiness(),
            setupComplete: initialServerSetupComplete(this.setupConfig, this.projectTopologyAssessment().hubAllowed),
            workerCount: this.enabledWorkerConfigs().length,
        });
        if (remainingPrerequisite) {
            const open = await vscode.window.showWarningMessage(`新项目接入仍停留在基础设施配置：${remainingPrerequisite.message}`, "打开服务器设置", "稍后");
            if (open === "打开服务器设置")
                await this.openPanelAt("settings", "settings-servers");
            return;
        }
        if (!plans.length) {
            await this.generatePlanGuideFromUi(false);
            await this.refreshLocalPlanMetadata({ post: false, force: true });
            plans = this.localPlanMetadata.plans || [];
            if (!plans.length)
                throw new Error("未能生成项目 Plan，请检查 experiments/plans 写入权限。");
        }
        const selected = await this.pickProjectBootstrapPlan(plans);
        const planFile = String(selected?.planFile || selected?.file || selected?.planId || "");
        preferDebugFirstRun = !currentPlanRevisionHasRunEvidence(this.buildState(), selected);
        const selectionChanged = Boolean(planFile) && (!samePlanSelection(this.planFileInput || "", planFile) || !samePlanSelection(this.selectedPlanId || "", selected?.planId || planFile));
        if (planFile) {
            this.planFileInput = planFile;
            this.selectedPlanId = String(selected?.planId || planFile);
            await this.persistProjectPlanSelectionState();
        }
        let project = this.localPlanMetadata.detectedProject || {};
        let gateDiagnostics = projectOutputGateDiagnostics(project, selected);
        const gateReason = projectOutputGateReason(project, selected);
        if (gateReason && gateDiagnostics.nextLabel === "接入配置" && !project.adapterConfig) {
            await this.generateOutputAdapterFromUi();
            await this.refreshLocalPlanMetadata({ post: false, force: true });
            project = this.localPlanMetadata.detectedProject || {};
            gateDiagnostics = projectOutputGateDiagnostics(project, selected);
        }
        const finalGateReason = projectOutputGateReason(project, selected);
        const simpleSftp = simpleSftpIntegrationReadiness();
        const enabledWorkers = this.enabledWorkerConfigs();
        const currentRunState = () => {
            const state = this.buildState();
            return {
                activeRun: activePlanRunEvidence(state, planFile, selected),
                finishedRun: projectBootstrapFinishedRunOutcome(state, selected),
            };
        };
        const initialRunState = currentRunState();
        const endpointReadiness = projectBootstrapEndpointReadiness({
            hubStatus: this.lastProbe?.status || this.lastHealth?.state,
            hubSchedulerDependencies: this.lastProbe?.schedulerDependencies,
            workers: enabledWorkers.map((worker) => ({
                label: worker.displayName || worker.id,
                status: this.lastWorkerProbes[worker.id]?.status,
                schedulerDependencies: this.lastWorkerProbes[worker.id]?.schedulerDependencies,
            })),
        });
        if (projectBootstrapShouldProbeEndpoints({
            outputGateReason: finalGateReason,
            realtimeMode: this.isRealtimeMode(),
            setupComplete: initialServerSetupComplete(this.setupConfig, this.projectTopologyAssessment().hubAllowed),
            workerCount: enabledWorkers.length,
            simpleSftpReady: simpleSftp.ready,
            activeRun: initialRunState.activeRun,
            finishedRun: initialRunState.finishedRun,
            endpointsReady: projectBootstrapEndpointProbeReusable(endpointReadiness, this.lastFullEndpointProbeAt),
        }))
            await this.testTunnel(false);
        this.postState();
        if (selectionChanged)
            this.queueSelectedPlanResultParse("接入当前项目切换计划", planFile);
        const currentCompletion = () => {
            const currentWorkers = this.enabledWorkerConfigs();
            const { activeRun, finishedRun } = currentRunState();
            return projectBootstrapCompletion({
                outputGateReason: finalGateReason,
                outputGateNextLabel: gateDiagnostics.nextLabel,
                adapterConfig: project.adapterConfig,
                realtimeMode: this.isRealtimeMode(),
                offlineBundleActive: Boolean(this.offlineBundle),
                setupComplete: initialServerSetupComplete(this.setupConfig, this.projectTopologyAssessment().hubAllowed),
                simpleSftp,
                hubStatus: this.lastProbe?.status || this.lastHealth?.state,
                hubSchedulerDependencies: this.lastProbe?.schedulerDependencies,
                workers: currentWorkers.map((worker) => ({
                    label: worker.displayName || worker.id,
                    status: this.lastWorkerProbes[worker.id]?.status,
                    schedulerDependencies: this.lastWorkerProbes[worker.id]?.schedulerDependencies,
                })),
                activeRun,
                finishedRun,
                preferDebugFirstRun,
            });
        };
        const seenCompletions = new Set();
        const stopAtProjectPanel = async (completion) => {
            const open = await vscode.window.showWarningMessage(`项目接入仍停留在当前步骤：${completion.message}`, "打开实验准备", "稍后");
            if (open === "打开实验准备")
                await this.openPanelAt("plans", "plans-detected");
        };
        for (let step = 0; step < PROJECT_BOOTSTRAP_MAX_STEPS; step += 1) {
            const completion = currentCompletion();
            const completionKey = JSON.stringify([completion.state, completion.action, completion.secondaryAction, completion.message]);
            if (seenCompletions.has(completionKey)) {
                await stopAtProjectPanel(completion);
                return;
            }
            seenCompletions.add(completionKey);
            const completionActions = [completion.action, completion.secondaryAction, "稍后"].filter((action, index, items) => action && items.indexOf(action) === index);
            const next = completionActions.length
                ? await vscode.window.showInformationMessage(completion.message, ...completionActions)
                : await vscode.window.showInformationMessage(completion.message);
            const continueFlow = await this.handleProjectBootstrapAction(next, {
                planFile,
                planId: selected?.planId || planFile,
                adapterConfig: project.adapterConfig,
            });
            if (!continueFlow)
                return;
        }
        await stopAtProjectPanel(currentCompletion());
    }
    async handleProjectBootstrapAction(action, context) {
        const next = String(action || "");
        if (next === "开始一键配置")
            return this.quickSetup(false);
        if (next === "准备 Agent 并启动")
            return this.prepareAgentsForFirstRun(false);
        if (next === "添加 Worker")
            return this.addWorkerConfigFromUi(false);
        if (next === "打开配置说明") {
            await this.openSetupGuide();
            return false;
        }
        if (next === "打开连接设置") {
            await vscode.commands.executeCommand("workbench.action.openSettings", "zlkCluster.connectionMode");
            return false;
        }
        if (next === "恢复在线连接") {
            await this.clearOfflineImport();
            await this.ensureRealtimeConnected("resume from project onboarding");
            this.postState(true);
            return true;
        }
        if (next === "打开面板") {
            await this.openPanelAt("overview", "overview");
            return false;
        }
        if (next === "打开当前 Plan" && context.planFile) {
            await openWorkspaceFile(context.planFile);
            return false;
        }
        if (next === "打开接入配置" && context.adapterConfig) {
            await openWorkspaceFile(context.adapterConfig);
            return false;
        }
        if (next === "查看任务") {
            await this.openPanelAt("tasks", "tasks-list");
            return false;
        }
        if (next === "查看全部任务") {
            await this.openPanelAt("tasks", "tasks-list", { taskPlanScope: "all" });
            return false;
        }
        if (next === "查看结果") {
            await this.openPanelAt("results", "results");
            return false;
        }
        if (next === "查看提交进度") {
            await this.openPanelAt("operations", "operations-list");
            return false;
        }
        if (next === "查看依赖") {
            await this.openPanelAt("settings", "settings-servers");
            return false;
        }
        if (next === "Debug 首跑")
            await this.runActionCommand("runPlan", { planFile: context.planFile, planId: context.planId || context.planFile, selectedPlanId: context.planId || context.planFile, debugMode: true });
        if (next === "正式运行")
            await this.runActionCommand("runPlan", { planFile: context.planFile, planId: context.planId || context.planFile, selectedPlanId: context.planId || context.planFile, debugMode: false });
        if (next === "校验并提交运行")
            await this.runActionCommand("runPlan", { planFile: context.planFile, planId: context.planId || context.planFile, selectedPlanId: context.planId || context.planFile });
        return false;
    }
    async generateOutputAdapterFromUi() {
        const root = workspaceRoot();
        if (!root)
            throw new Error("需要先打开工作区。");
        const projectName = safePlanToken(path.basename(root) || "experiment");
        const templateFiles = await this.loadProjectAdapterTemplateFiles(projectName);
        const templateText = (relativePath) => {
            const found = templateFiles.find((file) => file.relativePath === relativePath);
            if (!found)
                throw new Error(`VSIX 项目接入模板缺少文件：${relativePath}`);
            return found.text;
        };
        const adapterDir = path.join(root, "experiments", "zlk_adapter");
        const experimentsDir = path.join(root, "experiments");
        const paperDir = path.join(root, "paper");
        const legacyTemplateDir = path.join(root, "zlk_cluster", "templates");
        const contractDir = path.join(root, "zlk_cluster", "contracts");
        const adapterPath = path.join(adapterDir, "result_writer.py");
        const readmePath = path.join(adapterDir, "README.md");
        const projectConfigPath = path.join(experimentsDir, "zlk_project.yaml");
        const claimsPath = path.join(paperDir, "claims.md");
        const guidePath = path.join(contractDir, "output_contract_guide.md");
        const writes = [
            { fullPath: adapterPath, text: templateText("result_writer.py") },
            { fullPath: path.join(adapterDir, "__init__.py"), text: templateText("__init__.py") },
            { fullPath: path.join(adapterDir, "collect_results.py"), text: templateText("collect_results.py") },
            { fullPath: path.join(adapterDir, "console_parser.py"), text: templateText("console_parser.py") },
            { fullPath: path.join(adapterDir, "factory_hooks.py"), text: templateText("factory_hooks.py") },
            { fullPath: path.join(adapterDir, "run_wrapper.py"), text: templateText("run_wrapper.py") },
            { fullPath: readmePath, text: templateText("README.md") },
            { fullPath: projectConfigPath, text: templateText("zlk_project.yaml") },
            { fullPath: claimsPath, text: templateText("claims.md") },
            { fullPath: path.join(legacyTemplateDir, "zlk_output_adapter.py"), text: templateText("result_writer.py") },
            { fullPath: path.join(legacyTemplateDir, "README.md"), text: templateText("README.md") },
            { fullPath: guidePath, text: templateText("output_contract_guide.md") },
        ];
        const plannedWrites = await previewAndConfirmWorkspaceWrites(root, writes, "生成输出接入模板");
        const changedWrites = plannedWrites.filter((write) => write.status !== "unchanged");
        const writeResults = [];
        for (const write of changedWrites)
            writeResults.push(await writeWorkspaceTextWithBackup(write.fullPath, write.text));
        await this.refreshLocalPlanMetadata({ post: false, force: true });
        this.postState();
        const summary = summarizeWorkspaceWriteResults(writeResults);
        void vscode.window.showInformationMessage(summary
            ? `输出接入模板已更新：${summary}。入口：experiments/zlk_adapter/result_writer.py。`
            : "输出接入模板已是最新，无需写入。入口：experiments/zlk_adapter/result_writer.py。");
        this.queueResultParseAfterProjectChange("生成输出接入模板", this.planFileInput || this.selectedPlanId, this.selectedPlanId || this.planFileInput);
        await openWorkspaceFile("experiments/zlk_adapter/README.md");
    }
    async savePptPlotConfigFromUi(message) {
        const patch = recordField(message, "patch");
        const current = this.pptPlotConfig();
        const presentationPath = stringPatch(patch, "presentationPath", current.presentationPath);
        const chartType = stringPatch(patch, "chartType", current.chartType || "auto") || "auto";
        const styleMode = stringPatch(patch, "styleMode", current.styleMode || "activePpt") || "activePpt";
        this.projectPptPlotConfig = normalizePptPlotConfig({ presentationPath, chartType, styleMode });
        await this.persistProjectPptPlotConfigState();
        await this.context.globalState.update(keys.pptPlotConfig, undefined);
        this.postState();
        void vscode.window.showInformationMessage(presentationPath ? "PPT 绘图配置已保存到当前项目：将追加到指定 PPT。" : "PPT 绘图配置已保存到当前项目：空路径会新建 PPT。");
    }
    async choosePptPathFromUi() {
        const current = this.pptPlotConfig().presentationPath;
        const picked = await vscode.window.showOpenDialog({
            title: "从资源管理器选择 PPT 文件",
            defaultUri: await pptDialogDefaultUri(current),
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: "选择 PPT",
            filters: { "PowerPoint": ["pptx", "pptm", "ppt"], "所有文件": ["*"] },
        });
        if (!picked)
            throw new UiCommandCancelled("选择 PPT 路径已取消。");
        await this.updatePptPresentationPath(picked[0]?.fsPath || "");
    }
    async chooseNewPptPathFromUi() {
        const current = this.pptPlotConfig().presentationPath;
        const picked = await vscode.window.showSaveDialog({
            title: "选择新 PPT 保存位置",
            defaultUri: await pptDialogDefaultUri(current),
            saveLabel: "使用此路径",
            filters: { "PowerPoint": ["pptx", "pptm", "ppt"], "所有文件": ["*"] },
        });
        if (!picked)
            throw new UiCommandCancelled("选择新 PPT 路径已取消。");
        await this.updatePptPresentationPath(picked.fsPath);
    }
    async updatePptPresentationPath(presentationPath) {
        if (!presentationPath)
            throw new UiCommandCancelled("选择 PPT 路径已取消。");
        this.projectPptPlotConfig = normalizePptPlotConfig({ ...this.pptPlotConfig(), presentationPath });
        await this.persistProjectPptPlotConfigState();
        await this.context.globalState.update(keys.pptPlotConfig, undefined);
        this.postState();
        void vscode.window.showInformationMessage(`PPT 路径已更新到当前项目：${presentationPath}`);
    }
    async refreshPptAutomationReadiness(start) {
        const previous = this.pptAutomationRefreshPromise || Promise.resolve();
        const current = previous.catch(() => undefined).then(async () => {
            const bridge = new PptPlotBridge_1.PptPlotBridge();
            try {
                this.pptAutomationReadiness = start
                    ? await bridge.prepareAutomation(this.pptPlotConfig().presentationPath)
                    : await bridge.inspectAutomation();
                return this.pptAutomationReadiness;
            }
            catch (error) {
                this.pptAutomationReadiness = (0, PptPlotBridge_1.pptAutomationReadinessFromError)(error);
                if (start)
                    throw error;
                return this.pptAutomationReadiness;
            }
            finally {
                this.postState(true);
            }
        });
        this.pptAutomationRefreshPromise = current;
        try {
            return await current;
        }
        finally {
            if (this.pptAutomationRefreshPromise === current)
                this.pptAutomationRefreshPromise = undefined;
        }
    }
    async openPptAutomationGuide() {
        const guide = path.join(this.context.extensionPath, "docs", "simple-experiment-setup.md");
        const uri = vscode.Uri.file(guide);
        try {
            await vscode.commands.executeCommand("markdown.showPreview", uri);
        }
        catch {
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document, { preview: true, viewColumn: vscode.ViewColumn.Active });
        }
        void vscode.window.showInformationMessage("PPT automation 修复说明已打开。请按“结果绘图与 PPT 插件”检查安装、PowerPoint 进程和 schemaVersion=1。");
    }
    async confirmPptPlotTarget(input) {
        const root = assertSingleProjectWorkspace("绘图到 PPT");
        await this.loadProjectPptPathConfirmationsState();
        const target = normalizePptPathConfirmationTarget(input.presentationPath, root);
        if (target.presentationPath)
            input.presentationPath = target.presentationPath;
        if (pptPathTargetConfirmed(this.confirmedPptPaths, target))
            return;
        const rememberLabel = target.presentationPath ? "确认，此后不再提醒该路径" : "确认，此后不再提醒新建 PPT";
        const answer = await vscode.window.showWarningMessage(pptPlotConfirmationDetail(input, target), { modal: true }, "确认位置并绘图", rememberLabel);
        if (!["确认位置并绘图", rememberLabel].includes(String(answer || "")))
            throw new UiCommandCancelled("PPT 绘图已取消，未调用 PPT 插件，也未写入绘图请求审计。");
        if (answer === rememberLabel) {
            this.confirmedPptPaths = mergePptPathConfirmations(this.confirmedPptPaths, [{ ...target, confirmedAt: new Date().toISOString() }]);
            await this.persistProjectPptPathConfirmationsState();
            this.postState(true);
        }
    }
    async plotResultsToPptFromUi(message) {
        const root = workspaceRoot();
        if (!root)
            throw new Error("需要先打开工作区，才能把结果绘图到 PPT。");
        const config = this.pptPlotConfig();
        const planTarget = this.actionPlanTarget(message);
        const planFile = this.resolveSelectedPlanFile(planTarget.planFile || this.planFileInput || this.selectedPlanId || "") || planTarget.planFile || this.planFileInput || this.selectedPlanId || "";
        await this.refreshLocalPlanMetadataForAction(this.actionBody({ planFile }));
        const rawSummary = this.resultsSummary && typeof this.resultsSummary === "object" ? this.resultsSummary : {};
        const summary = this.filterResultsSummaryForPlan(rawSummary, planFile);
        const validFinalSources = finalPlotSourcesFromSummary(summary);
        const requestedSources = uniqueStrings([
            stringField(message, "sourcePath"),
            ...stringArrayField(message, "sourcePaths"),
        ].map((item) => String(item || "").trim()).filter(Boolean));
        const sourcePaths = requestedSources.filter((item) => !isFinalStatisticsOrPaperPath(item) || validFinalSources.some((valid) => sameProjectRelativePath(valid, item)));
        if (!sourcePaths.length)
            sourcePaths.push(...validFinalSources);
        if (!sourcePaths.length)
            throw new Error("没有可用的最终结果。请先选择并归档有效记录，再运行统计或导出论文表格。");
        const preferredContract = stringFromRecord(summary, ["plottingContractPath", "plotting_contract_path"]);
        const contractPath = preferredContract || await (0, PptPlotBridge_1.ensureLocalPlottingContract)(root, planFile);
        const input = {
            projectRoot: root,
            planFile,
            sourcePaths,
            planRevision: this.planVersionForFile(planFile).revision,
            plottingContractPath: contractPath,
            selectedResultId: stringField(message, "resultId") || stringField(message, "experimentId") || stringField(message, "runKey"),
            runKey: stringField(message, "runKey"),
            archiveKey: stringField(message, "archiveKey"),
            chartType: stringField(message, "chartType") || config.chartType || "auto",
            presentationPath: stringField(message, "presentationPath") || config.presentationPath,
            styleMode: stringField(message, "styleMode") || config.styleMode || "activePpt",
            sourceLabel: stringField(message, "sourceLabel") || "SimpleExperiment 结果",
        };
        await this.confirmPptPlotTarget(input);
        try {
            const result = await new PptPlotBridge_1.PptPlotBridge().plot(input);
            this.pptAutomationReadiness = {
                state: "ready",
                ready: true,
                message: "PPT automation schemaVersion=1 已就绪。",
                actionCommand: "",
                actionLabel: "",
                schemaVersion: 1,
            };
            this.postState(true);
            const requestAuditPath = pptPlotAuditRelativePath(root, result.requestPath);
            const responseAuditPath = pptPlotAuditRelativePath(root, result.responsePath);
            void vscode.window.showInformationMessage(`绘图到 PPT 已提交：${result.requestId}。请求审计：${requestAuditPath}；响应审计：${responseAuditPath}`, "打开请求审计", "打开响应审计")
                .then((choice) => {
                const auditPath = choice === "打开请求审计" ? requestAuditPath : choice === "打开响应审计" ? responseAuditPath : "";
                if (auditPath)
                    return openWorkspaceFile(auditPath);
                return undefined;
            })
                .catch((error) => {
                void vscode.window.showErrorMessage(`打开 PPT 绘图审计失败：${errorMessage(error)}`);
            });
        }
        catch (error) {
            this.pptAutomationReadiness = (0, PptPlotBridge_1.pptAutomationReadinessFromError)(error);
            this.postState(true);
            throw error;
        }
    }
    async saveProjectAdapterRulesFromUi(message) {
        const root = workspaceRoot();
        if (!root)
            throw new Error("需要先打开工作区。");
        const patch = normalizeProjectAdapterRulesPatch(recordField(message, "patch"));
        const relative = "experiments/zlk_project.yaml";
        const fullPath = path.join(root, relative);
        const projectName = safePlanToken(path.basename(root) || "experiment");
        let text = await fs.readFile(fullPath, "utf8").catch(async () => {
            const templateFiles = await this.loadProjectAdapterTemplateFiles(projectName);
            return templateFiles.find((file) => file.relativePath === "zlk_project.yaml")?.text || (0, ProjectAdapterTemplates_1.projectAdapterTemplateFiles)(projectName).find((file) => file.relativePath === "zlk_project.yaml")?.text || "";
        });
        if (!text.trim())
            throw new Error("VSIX 缺少 zlk_project.yaml 接入模板，无法保存规则。");
        text = applyProjectAdapterRulesPatch(text, patch);
        const result = await writeWorkspaceTextWithBackup(fullPath, text);
        await this.refreshLocalPlanMetadata({ post: false, force: true });
        this.postState();
        void vscode.window.showInformationMessage(result.status === "unchanged"
            ? "项目接入规则已是最新：experiments/zlk_project.yaml。"
            : `项目接入规则已保存到 experiments/zlk_project.yaml（${workspaceWriteStatusText(result.status)}）。`);
        this.queueResultParseAfterProjectChange("保存接入规则", this.planFileInput || this.selectedPlanId, this.selectedPlanId || this.planFileInput);
    }
    async loadProjectAdapterTemplateFiles(projectName) {
        const templateDir = path.join(this.context.extensionPath, "dist", "templates", "project-adapter");
        const expected = (0, ProjectAdapterTemplates_1.projectAdapterTemplateFiles)("__ZLK_PROJECT_NAME__").map((file) => file.relativePath);
        try {
            const files = await Promise.all(expected.map(async (relativePath) => ({
                relativePath,
                text: (await fs.readFile(path.join(templateDir, relativePath), "utf8")).replace(/__ZLK_PROJECT_NAME__/g, projectName),
            })));
            return files;
        }
        catch {
            return (0, ProjectAdapterTemplates_1.projectAdapterTemplateFiles)(projectName);
        }
    }
    queuePlanScopedResultParse(reason, planFile, planId) {
        const nextPlanFile = usableSelectionKey(planFile || "") || undefined;
        const nextPlanId = usableSelectionKey(planId || "") || nextPlanFile;
        if (!nextPlanFile && !nextPlanId)
            return;
        if (!this.automaticResultParseReady())
            return;
        if (!this.automaticResultParsePlanReady(nextPlanFile || nextPlanId || ""))
            return;
        void this.runActionCommand("parseResults", {
            planFile: nextPlanFile || nextPlanId,
            planId: nextPlanId || nextPlanFile,
            selectedPlanId: nextPlanId || nextPlanFile,
            selectedPlanFiles: [nextPlanFile || nextPlanId].filter(Boolean),
        }).catch((error) => {
            this.recordActionError({
                command: "parseResults",
                message: errorMessage(error),
                suggestion: actionErrorSuggestion(errorMessage(error)) || `${reason}后自动解析失败，可手动点击“解析结果”。`,
            });
            this.postState();
        });
    }
    automaticResultParseReady() {
        const topology = this.projectTopologyAssessment();
        if (!topology.hubAllowed) {
            const workers = this.enabledWorkerConfigs();
            return this.isRealtimeMode() && workers.length > 0 && workers.every((worker) => {
                try {
                    assertAgentProjectProbeReady(this.lastWorkerProbes[worker.id], this.expectedWorkerAgentProjectRoot(worker.id), worker.displayName || worker.id);
                    return this.missingWorkerActionCapabilities(worker.id, "parse-results").length === 0;
                }
                catch {
                    return false;
                }
            });
        }
        return automaticResultParseReady({
            realtimeMode: this.isRealtimeMode(),
            setupComplete: initialServerSetupComplete(this.setupConfig, topology.hubAllowed),
            hubProbe: this.lastProbe,
            expectedProjectRoot: this.agentRuntimeDirs(this.setupConfig.agentProjectDir).workDir,
        });
    }
    automaticResultParsePlanReady(planFile) {
        const resolved = this.resolveSelectedPlanFile(planFile || "") || usableSelectionKey(planFile || "");
        const plan = (this.localPlanMetadata.plans || []).find((item) => samePlanSelection(item?.planFile || item?.file || item?.planId || "", resolved));
        if (!plan)
            return false;
        const summary = this.resultsSummary && typeof this.resultsSummary === "object" && !Array.isArray(this.resultsSummary) ? this.resultsSummary : {};
        const summaryPlan = normalizePlanSelectionKey(summary.planFile || summary.plan_file || "");
        const summaryRevision = String(summary.planRevision || summary.plan_revision || "").trim();
        const planRevision = String(plan.revision || "").trim();
        if (summaryPlan && samePlanSelection(summaryPlan, resolved) && planRevision && summaryRevision === planRevision)
            return true;
        return currentPlanRevisionHasRunEvidence(this.buildState(), plan);
    }
    queueSelectedPlanResultParse(reason, planHint) {
        const hint = usableSelectionKey(String(planHint || "").trim().replace(/\\/g, "/"));
        const selected = this.resolveSelectedPlanFile(this.planFileInput || this.selectedPlanId || "");
        const fromHint = hint ? this.resolveSelectedPlanFile(hint) || hint : "";
        // Only auto-parse the currently selected plan; dirty/other-plan hints never broaden scope.
        const planFile = selected || "";
        if (!planFile)
            return;
        if (fromHint && !this.shouldRefreshResultsSummaryForDirtyPlan(fromHint))
            return;
        this.queuePlanScopedResultParse(reason || "结果闭环", planFile, planFile);
    }
    disposeSelectedPlanFileWatchers() {
        for (const disposable of this.planFileWatchers || []) {
            try {
                disposable.dispose();
            }
            catch (_error) {
                // ignore watcher dispose failures
            }
        }
        this.planFileWatchers = [];
        this.planFileWatchRoot = "";
        this.planFileWatchPlanDir = "";
    }
    ensureSelectedPlanFileWatchers(_reason = "") {
        const root = workspaceRoot();
        const planDir = planDirSafe();
        if (!root) {
            this.disposeSelectedPlanFileWatchers();
            return;
        }
        if (this.planFileWatchRoot === root && this.planFileWatchPlanDir === planDir && Array.isArray(this.planFileWatchers) && this.planFileWatchers.length)
            return;
        this.disposeSelectedPlanFileWatchers();
        this.planFileWatchRoot = root;
        this.planFileWatchPlanDir = planDir;
        const pattern = new vscode.RelativePattern(root, `${planDir.replace(/\\/g, "/").replace(/\/+$/, "")}/**/*.{yml,yaml}`);
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        const onLocalPlanFsEvent = (uri) => void this.handleLocalPlanFileSystemEvent(uri);
        this.planFileWatchers = [
            watcher,
            watcher.onDidChange(onLocalPlanFsEvent),
            watcher.onDidCreate(onLocalPlanFsEvent),
            watcher.onDidDelete(onLocalPlanFsEvent),
            vscode.workspace.onDidSaveTextDocument((document) => this.handleLocalPlanTextDocumentSave(document)),
        ];
        for (const disposable of this.planFileWatchers)
            this.context.subscriptions.push(disposable);
    }
    handleLocalPlanTextDocumentSave(document) {
        if (!document || document.uri.scheme !== "file")
            return;
        void this.handleLocalPlanFileSystemEvent(document.uri);
    }
    async handleLocalPlanFileSystemEvent(uri) {
        const root = workspaceRoot();
        if (!root || !uri || uri.scheme !== "file")
            return;
        const fullPath = uri.fsPath;
        const relative = path.relative(root, fullPath).replace(/\\/g, "/");
        if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
            return;
        if (!/\.ya?ml$/i.test(relative))
            return;
        const planDir = String(planDirSafe() || "experiments/plans").replace(/\\/g, "/").replace(/\/+$/, "");
        if (!(relative === planDir || relative.startsWith(planDir + "/")))
            return;
        if (isArchivedPlanFile(root, planDir, fullPath))
            return;
        // Revision metadata must refresh before deciding whether old outputs may be parsed.
        try {
            await this.refreshLocalPlanMetadata({ post: true, force: true });
        }
        catch (error) {
            this.recordActionError({
                command: "refreshPlans",
                message: `Plan 文件变化后元数据刷新失败：${errorMessage(error)}`,
                suggestion: "旧结果未自动解析。请检查 Plan 文件权限和 YAML 内容，再保存一次。",
            });
            this.postState();
            return;
        }
        const selected = this.resolveSelectedPlanFile(this.planFileInput || this.selectedPlanId || "");
        if (!selected)
            return;
        if (!samePlanSelection(selected, relative) && !samePlanSelection(selected, fullPath))
            return;
        this.scheduleSelectedPlanLocalChangeParse("本地 plan 变更", selected);
    }
    scheduleSelectedPlanLocalChangeParse(reason, planFile) {
        const selected = this.resolveSelectedPlanFile(planFile || this.planFileInput || this.selectedPlanId || "");
        if (!selected)
            return;
        if (this.planLocalChangeParseTimer)
            clearTimeout(this.planLocalChangeParseTimer);
        this.planLocalChangeParseTimer = setTimeout(() => {
            this.planLocalChangeParseTimer = undefined;
            this.queueSelectedPlanResultParse(reason || "本地 plan 变更", selected);
        }, 450);
    }
    queueResultParseAfterProjectChange(reason, planFile, planId) {
        const nextPlanFile = usableSelectionKey(planFile || this.planFileInput || "") || undefined;
        const nextPlanId = usableSelectionKey(planId || this.selectedPlanId || "") || nextPlanFile;
        if (nextPlanFile || nextPlanId) {
            this.queuePlanScopedResultParse(reason, nextPlanFile, nextPlanId);
            return;
        }
        // No selected plan: skip unscoped full parse to avoid cross-plan contamination.
        this.recordActionError({
            command: "parseResults",
            message: `${reason}后未选择 plan，已跳过自动解析`,
            suggestion: "请先选择 plan，再点击“解析结果”。",
        });
        this.postState();
    }
    selectPlanFromUi(message) {
        const planFile = stringField(message, "planFile");
        const planId = stringField(message, "planId") || planFile;
        const resolvedPlanFile = this.resolveSelectedPlanFile(planFile || planId || "");
        const nextPlanFile = resolvedPlanFile || planFile || undefined;
        const nextPlanId = planId || nextPlanFile || undefined;
        const changed = (this.selectedPlanId || "") !== (nextPlanId || "") || (this.planFileInput || "") !== (nextPlanFile || "");
        this.selectedPlanId = nextPlanId;
        this.planFileInput = nextPlanFile;
        void this.persistProjectPlanSelectionState().catch(() => undefined);
        this.ensureSelectedPlanFileWatchers(changed ? "切换计划" : "选择计划");
        this.postState();
        if (changed)
            this.queuePlanScopedResultParse("切换计划", nextPlanFile, nextPlanId);
    }
    selectExperimentFromUi(message) {
        const taskUiKey = usableSelectionKey(stringField(message, "taskUiKey"));
        const runKey = usableSelectionKey(stringField(message, "runKey"));
        const messageExperimentId = usableSelectionKey(stringField(message, "experimentId"));
        const messageArchiveKey = usableSelectionKey(stringField(message, "archiveKey"));
        const experimentId = messageExperimentId || runKey;
        const archiveKey = messageArchiveKey;
        const selected = boolField(message, "selected", true);
        if (taskUiKey) {
            if (selected)
                this.selectedTaskUiKeys.add(taskUiKey);
            else
                this.selectedTaskUiKeys.delete(taskUiKey);
        }
        if (runKey) {
            if (selected) {
                this.selectedRunKeys.add(runKey);
                this.selectedRunKey = runKey;
            }
            else {
                this.selectedRunKeys.delete(runKey);
                if (this.selectedRunKey === runKey) {
                    const runKeys = Array.from(this.selectedRunKeys);
                    this.selectedRunKey = runKeys[runKeys.length - 1];
                }
            }
            this.selectedLogRunKey = stringField(message, "selectLog") ? runKey : this.selectedLogRunKey;
            this.client.setProtectedLogKeys(this.logProtectedKeys());
        }
        if (experimentId) {
            if (selected)
                this.selectedExperimentIds.add(experimentId);
            else
                this.selectedExperimentIds.delete(experimentId);
        }
        if (archiveKey) {
            if (selected)
                this.selectedArchiveKeys.add(archiveKey);
            else
                this.selectedArchiveKeys.delete(archiveKey);
        }
        void this.persistProjectTaskSelectionState().catch(() => undefined);
        this.postState();
    }
    async clearLegacyTasksFromUi(message) {
        const selectedLegacy = stringArrayField(message, "selectedLegacyTaskUiKeys");
        const selectedUiKeys = stringArrayField(message, "selectedTaskUiKeys");
        const directUiKey = usableSelectionKey(stringField(message, "taskUiKey"));
        const taskUiKeys = uniqueStrings([...(selectedLegacy.length ? selectedLegacy : selectedUiKeys), directUiKey || ""]);
        if (!taskUiKeys.length)
            throw new Error("请先勾选缺少可操作标识的旧任务。");
        for (const key of taskUiKeys)
            this.hiddenLegacyTaskUiKeys.add(key);
        this.selectedExperimentIds.clear();
        this.selectedRunKeys.clear();
        this.selectedRunKey = undefined;
        this.selectedArchiveKeys.clear();
        for (const key of taskUiKeys)
            this.selectedTaskUiKeys.delete(key);
        void this.persistProjectTaskSelectionState().catch(() => undefined);
        this.postState();
        void vscode.window.showInformationMessage(`已从本机面板隐藏 ${taskUiKeys.length} 条旧任务残留；未删除任何远端文件。`);
    }
    async downloadDebugBundle() {
        const pathFromOps = this.debugBundlePath || findDebugBundlePath(this.localOperations) || findDebugBundlePath(this.lastRealtimeState?.operations);
        if (!pathFromOps) {
            this.recordActionError({ command: "downloadDebugBundle", message: "未找到调试包", suggestion: "请先创建调试包，等待操作完成后再下载。" });
            this.postState();
            return;
        }
        const picked = await vscode.window.showSaveDialog({
            title: "保存调试包",
            defaultUri: vscode.Uri.file(path.join(workspaceRoot() || process.cwd(), path.basename(pathFromOps))),
        });
        if (!picked)
            return;
        try {
            await this.client.downloadFile(pathFromOps, picked.fsPath);
            this.lastError = undefined;
        }
        catch (error) {
            this.lastError = userFacingFileError(error);
            this.recordActionError({ command: "downloadDebugBundle", message: this.lastError, suggestion: actionErrorSuggestion(this.lastError) });
        }
        this.postState();
    }
    async downloadRemoteResultFromUi(message) {
        const root = workspaceRoot();
        if (!root)
            throw new Error("请先打开当前实验项目。");
        const planFile = this.resolveSelectedPlanFile(stringField(message, "planFile") || this.planFileInput || this.selectedPlanId || "");
        if (!planFile)
            throw new Error("无法确认结果文件所属 Plan，已阻止下载。");
        await this.refreshLocalPlanMetadataForAction(this.actionBody({ planFile }));
        const remotePath = normalizeRemoteResultInspectionPath(stringField(message, "remotePath"));
        if (!remotePath)
            throw new Error("只允许查看当前项目内的 CSV、JSON、TXT、LOG 或 OUT 轻量结果文件。");
        const version = this.planVersionForFile(planFile);
        const allowed = remoteResultInspectionCandidates([this.localOperations, this.lastRealtimeState?.operations], planFile, version.revision, version.updatedAt);
        if (!allowed.includes(remotePath))
            throw new Error("该文件不属于当前 Plan 最近输出契约检查返回的不可解析文件，已阻止下载。");
        const localRelative = remoteResultInspectionLocalRelativePath(remotePath, planFile);
        const localPath = safeWorkspaceChildPath(root, localRelative);
        const answer = await vscode.window.showWarningMessage([
            "【远端结果查看确认】",
            "",
            `当前 Plan：${planFile}`,
            `远端来源：${remotePath}`,
            `本地副本：${localPath}`,
            `大小上限：${Math.round(REMOTE_RESULT_INSPECTION_MAX_BYTES / 1024 / 1024)} MB`,
            "",
            "只会通过当前 Hub 的 Xshell 本地隧道下载只读副本，不会修改远端文件。",
        ].join("\n"), { modal: true }, "下载并打开");
        if (answer !== "下载并打开")
            throw new UiCommandCancelled("远端结果查看已取消，未下载文件。");
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        await this.client.downloadFile(remotePath, localPath, { maxBytes: REMOTE_RESULT_INSPECTION_MAX_BYTES });
        await openWorkspaceFile(localRelative);
        void vscode.window.showInformationMessage(`远端结果只读副本已打开：${localRelative}`);
    }
    async openResultArtifactFromUi(message) {
        const root = workspaceRoot();
        if (!root)
            throw new Error("请先打开当前实验项目。");
        const planFile = this.resolveSelectedPlanFile(stringField(message, "planFile") || this.planFileInput || this.selectedPlanId || "");
        if (!planFile)
            throw new Error("无法确认结果文件所属 Plan，已阻止打开。");
        await this.refreshLocalPlanMetadataForAction(this.actionBody({ planFile }));
        const artifactPath = normalizeRemoteResultInspectionPath(stringField(message, "remotePath") || stringField(message, "file"));
        if (!artifactPath)
            throw new Error("只允许打开当前项目内的 CSV、JSON、TXT、LOG 或 OUT 轻量结果文件。");
        const summary = this.filterResultsSummaryForPlan(this.resultsSummary, planFile);
        const allowed = resultSummaryInspectionCandidates(summary, planFile);
        if (!allowed.includes(artifactPath))
            throw new Error("该文件不属于当前 Plan 的最新结果摘要，已阻止打开。");
        const localArtifactPath = safeWorkspaceChildPath(root, artifactPath);
        const localStat = await fs.stat(localArtifactPath).catch(() => undefined);
        const hasLocalFile = Boolean(localStat?.isFile());
        if (this.effectiveConnectionMode() === "offline_import") {
            if (!hasLocalFile)
                throw new Error(`离线模式下没有该结果文件的本地副本：${artifactPath}`);
            await openWorkspaceFile(artifactPath);
            return;
        }
        const missing = this.missingCapabilities(["endpoints.fileDownload"]);
        if (missing.length) {
            if (hasLocalFile) {
                await openWorkspaceFile(artifactPath);
                return;
            }
            throw new Error(`Hub Agent 缺少结果文件下载能力：${missing.join(", ")}。请部署最新版 Agent；未修改当前 Plan 选择。`);
        }
        const localRelative = remoteResultInspectionLocalRelativePath(artifactPath, planFile);
        const localCopyPath = safeWorkspaceChildPath(root, localRelative);
        const downloadLabel = hasLocalFile ? "下载远端最新并打开" : "下载并打开";
        const choices = hasLocalFile ? [downloadLabel, "打开现有本地文件"] : [downloadLabel];
        const answer = await vscode.window.showWarningMessage([
            "【结果文件位置确认】",
            "",
            `当前 Plan：${planFile}`,
            `远端来源：${artifactPath}`,
            `预期本地只读副本：${localCopyPath}`,
            `工作区同路径文件：${hasLocalFile ? localArtifactPath : "不存在"}`,
            `大小上限：${Math.round(REMOTE_RESULT_INSPECTION_MAX_BYTES / 1024 / 1024)} MB`,
            "",
            "下载只通过当前 Hub 的 Xshell 本地隧道读取文件，不会修改远端结果，也不会切换当前 Plan。",
        ].join("\n"), { modal: true }, ...choices);
        if (answer === "打开现有本地文件") {
            await openWorkspaceFile(artifactPath);
            return;
        }
        if (answer !== downloadLabel)
            throw new UiCommandCancelled("结果文件打开已取消，未下载文件，也未切换当前 Plan。");
        await fs.mkdir(path.dirname(localCopyPath), { recursive: true });
        await this.client.downloadFile(artifactPath, localCopyPath, { maxBytes: REMOTE_RESULT_INSPECTION_MAX_BYTES });
        await openWorkspaceFile(localRelative);
        void vscode.window.showInformationMessage(`结果只读副本已打开：${localRelative}`);
    }
    async openAuditTail() {
        try {
            if (this.effectiveConnectionMode() === "offline_import") {
                const offlineAudit = this.offlineBundle?.auditTail;
                if (offlineAudit === undefined || offlineAudit === null)
                    throw new Error("离线 bundle 未包含 audit_tail.jsonl");
                this.auditTail = {
                    ...auditTailSummaryForWebview(offlineAudit),
                    __offlineImport: true,
                };
                const doc = await vscode.workspace.openTextDocument({ language: "jsonl", content: auditTailDocumentText(offlineAudit) });
                await vscode.window.showTextDocument(doc, { preview: true });
                this.lastError = undefined;
                this.postState();
                return;
            }
            const auditTail = await this.client.getAuditTail();
            this.auditTail = auditTailSummaryForWebview(auditTail);
            const doc = await vscode.workspace.openTextDocument({ language: "jsonl", content: auditTailDocumentText(auditTail) });
            await vscode.window.showTextDocument(doc, { preview: true });
            this.lastError = undefined;
        }
        catch (error) {
            this.lastError = errorMessage(error);
            this.recordActionError({ command: "openAuditTail", message: this.lastError, suggestion: actionErrorSuggestion(this.lastError) });
        }
        this.postState();
    }
    hasResultsSummaryEndpointCapability() {
        const topology = this.projectTopologyAssessment();
        if (topology.hubAllowed)
            return this.missingCapabilities(["endpoints.resultsSummary"]).length === 0;
        const workers = this.enabledWorkerConfigs();
        return workers.length > 0 && workers.every((worker) => hasCapability(this.lastWorkerProbes[worker.id]?.capabilities, this.lastWorkerProbes[worker.id]?.fileCapabilities, "endpoints.resultsSummary"));
    }
    recordResultsSummaryCapabilitySkip(command, reason) {
        const topology = this.projectTopologyAssessment();
        const missing = topology.hubAllowed
            ? this.missingCapabilities(["endpoints.resultsSummary"])
            : this.enabledWorkerConfigs().filter((worker) => !hasCapability(this.lastWorkerProbes[worker.id]?.capabilities, this.lastWorkerProbes[worker.id]?.fileCapabilities, "endpoints.resultsSummary")).map((worker) => `Worker ${worker.id}: endpoints.resultsSummary`);
        if (!missing.length)
            return;
        if (this.lastError && /\/api\/results\/summary|resultsSummary|结果摘要|404|not found/i.test(this.lastError))
            this.lastError = undefined;
        const key = [command || "refreshResults", missing.join(",")].join("::");
        if (key === this.lastResultsSummaryCapabilityWarningKey)
            return;
        this.lastResultsSummaryCapabilityWarningKey = key;
        this.recordActionError({
            command: command || "refreshResults",
            message: `结果摘要 API capability 缺失: ${missing.join(", ")}`,
            suggestion: `请部署最新版${topology.hubAllowed ? " Hub" : " Worker"} Agent 并重启对应 Agent 会话；${String(reason || "自动结果摘要刷新")} 已跳过，避免旧 Agent 反复请求 /api/results/summary。`,
            capabilityMissing: missing,
        });
    }
    async refreshResultsSummary(planHint = "") {
        const requestedPlan = usableSelectionKey(String(planHint || "").trim().replace(/\\/g, "/"));
        if (requestedPlan && !this.shouldRefreshResultsSummaryForDirtyPlan(requestedPlan))
            return;
        if (this.effectiveConnectionMode() === "offline_import") {
            this.applyOfflineResultsSummaryFromBundle(this.offlineBundle);
            this.lastError = undefined;
            this.lastResultsSummaryRealtimeErrorKey = "";
            this.lastResultsSummaryCapabilityWarningKey = "";
            this.postState();
            return;
        }
        if (!this.hasResultsSummaryEndpointCapability()) {
            this.recordResultsSummaryCapabilitySkip("refreshResults", "手动刷新结果");
            this.postState();
            return;
        }
        if (this.resultsSummaryRefreshInFlight) {
            this.pendingResultsSummaryDirtyKey = this.pendingResultsSummaryDirtyKey || `manual:${Date.now()}`;
            this.scheduleResultsSummaryTimer("manual_refresh_inflight", this.pendingResultsSummaryDirtyKey, 500 + Math.floor(Math.random() * 500));
            return;
        }
        const generation = this.projectContextGeneration;
        const client = this.client;
        try {
            this.resultsSummaryRefreshInFlight = true;
            const planFile = this.resolveSelectedPlanFile(requestedPlan || this.planFileInput || this.selectedPlanId || "");
            const summary = await client.getResultsSummary(planFile);
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.resultsSummary = summary;
            this.lastError = undefined;
            this.lastResultsSummaryRealtimeErrorKey = "";
            this.lastResultsSummaryCapabilityWarningKey = "";
        }
        catch (error) {
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.lastError = errorMessage(error);
            this.recordActionError({ command: "refreshResults", message: this.lastError, suggestion: actionErrorSuggestion(this.lastError) });
        }
        finally {
            if (generation === this.projectContextGeneration && client === this.client)
                this.resultsSummaryRefreshInFlight = false;
        }
        this.postState();
    }
    scheduleResultsSummaryRefreshFromRealtime(state) {
        const dirtyKey = stringValue(state.resultSummaryDirtyKey) || [
            state.resultSummaryDirtyType,
            state.resultSummaryDirtyAt,
            state.resultSummaryDirtySeq,
            state.resultSummaryDirtyPlanFile,
        ].filter((item) => item !== undefined && item !== "").join(":");
        if (!dirtyKey || dirtyKey === this.lastResultsSummaryRefreshedDirtyKey)
            return;
        if (!this.shouldRefreshResultsSummaryForDirtyPlan(state.resultSummaryDirtyPlanFile))
            return;
        if (!this.hasResultsSummaryEndpointCapability()) {
            const alreadySkipped = dirtyKey === this.lastResultsSummaryCapabilitySkippedDirtyKey;
            this.pendingResultsSummaryDirtyKey = dirtyKey;
            this.pendingResultsSummaryDirtyPlanFile = stringValue(state.resultSummaryDirtyPlanFile) || this.pendingResultsSummaryDirtyPlanFile || "";
            this.lastResultsSummaryCapabilitySkippedDirtyKey = dirtyKey;
            this.recordResultsSummaryCapabilitySkip("refreshResults", state.resultSummaryDirtyType || "自动结果摘要刷新");
            if (!alreadySkipped)
                this.postState();
            return;
        }
        this.lastResultsSummaryCapabilitySkippedDirtyKey = "";
        const samePending = dirtyKey === this.pendingResultsSummaryDirtyKey;
        if (!samePending) {
            this.pendingResultsSummaryDirtyKey = dirtyKey;
            this.pendingResultsSummaryDirtyPlanFile = stringValue(state.resultSummaryDirtyPlanFile) || "";
            this.resultsSummaryRefreshRetryCount = 0;
        }
        else if (!this.pendingResultsSummaryDirtyPlanFile && state.resultSummaryDirtyPlanFile) {
            this.pendingResultsSummaryDirtyPlanFile = stringValue(state.resultSummaryDirtyPlanFile) || "";
        }
        if (samePending && this.resultsSummaryRefreshTimer)
            return;
        this.queueSelectedPlanResultParse(state.resultSummaryDirtyType || "realtime", state.resultSummaryDirtyPlanFile || this.pendingResultsSummaryDirtyPlanFile || "");
        this.scheduleResultsSummaryTimer(state.resultSummaryDirtyType || "realtime", dirtyKey, 500);
    }
    async refreshResultsSummaryFromRealtime(reason, dirtyKey = this.pendingResultsSummaryDirtyKey) {
        if (this.effectiveConnectionMode() === "offline_import") {
            this.markResultsSummaryDirtyKeyRefreshed(dirtyKey);
            return;
        }
        if (!this.hasResultsSummaryEndpointCapability()) {
            const alreadySkipped = dirtyKey && dirtyKey === this.lastResultsSummaryCapabilitySkippedDirtyKey;
            if (dirtyKey)
                this.lastResultsSummaryCapabilitySkippedDirtyKey = dirtyKey;
            this.recordResultsSummaryCapabilitySkip("refreshResults", reason || "自动结果摘要刷新");
            if (!alreadySkipped)
                this.postState();
            return;
        }
        if (this.resultsSummaryRefreshInFlight) {
            if (dirtyKey && dirtyKey !== this.lastResultsSummaryRefreshedDirtyKey)
                this.pendingResultsSummaryDirtyKey = dirtyKey;
            this.scheduleResultsSummaryTimer("realtime_inflight", dirtyKey, 500 + Math.floor(Math.random() * 500));
            return;
        }
        const generation = this.projectContextGeneration;
        const client = this.client;
        try {
            this.resultsSummaryRefreshInFlight = true;
            // Fetch scope follows the currently selected plan only.
            // Dirty planFile only decides whether a refresh is relevant, never narrows an unselected multi-plan view.
            const selectedPlan = this.resolveSelectedPlanFile(this.planFileInput || this.selectedPlanId || "");
            const planFile = selectedPlan || "";
            const summary = await client.getResultsSummary(planFile);
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.resultsSummary = summary;
            this.lastError = undefined;
            this.lastResultsSummaryRealtimeErrorKey = "";
            this.lastResultsSummaryCapabilityWarningKey = "";
            this.lastResultsSummaryCapabilitySkippedDirtyKey = "";
            this.markResultsSummaryDirtyKeyRefreshed(dirtyKey);
        }
        catch (error) {
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            if (error instanceof RequestBudget_1.RequestBudgetDeniedError) {
                this.scheduleResultsSummaryBudgetRetryFromRealtime(error, reason, dirtyKey);
                return;
            }
            const message = errorMessage(error);
            const errorKey = [dirtyKey, String(reason || "realtime"), message].join("::");
            if (errorKey !== this.lastResultsSummaryRealtimeErrorKey) {
                this.lastResultsSummaryRealtimeErrorKey = errorKey;
                this.recordActionError({ command: "refreshResults", message, suggestion: `结果事件 ${String(reason || "realtime")} 后自动刷新摘要失败；后续同一错误会合并显示，可手动点击刷新结果。` });
            }
            this.scheduleResultsSummaryFailureRetryFromRealtime(reason, dirtyKey);
        }
        finally {
            if (generation === this.projectContextGeneration && client === this.client)
                this.resultsSummaryRefreshInFlight = false;
        }
        this.postState();
    }
    scheduleResultsSummaryBudgetRetryFromRealtime(error, reason, dirtyKey) {
        const blockReason = error.decision.reason;
        if (blockReason === "hidden")
            return;
        if (blockReason !== "cooldown" && blockReason !== "rate_limited")
            return;
        const baseDelay = Math.max(1_000, Math.min(60_000, Number(error.decision.retryAfterMs) || 60_000));
        const jitter = Math.floor(Math.random() * 1_000);
        this.scheduleResultsSummaryTimer(reason, dirtyKey, baseDelay + jitter);
    }
    retryPendingResultsSummaryOnVisible() {
        const dirtyKey = this.pendingResultsSummaryDirtyKey;
        if (!dirtyKey || dirtyKey === this.lastResultsSummaryRefreshedDirtyKey || this.resultsSummaryRefreshTimer)
            return;
        if (!this.hasResultsSummaryEndpointCapability()) {
            const alreadySkipped = dirtyKey === this.lastResultsSummaryCapabilitySkippedDirtyKey;
            this.lastResultsSummaryCapabilitySkippedDirtyKey = dirtyKey;
            this.recordResultsSummaryCapabilitySkip("refreshResults", "面板恢复可见后的结果摘要刷新");
            if (!alreadySkipped)
                this.postState();
            return;
        }
        this.scheduleResultsSummaryTimer("visible", dirtyKey, 0);
    }
    scheduleResultsSummaryFailureRetryFromRealtime(reason, dirtyKey) {
        if (!dirtyKey || dirtyKey !== this.pendingResultsSummaryDirtyKey || dirtyKey === this.lastResultsSummaryRefreshedDirtyKey)
            return;
        this.resultsSummaryRefreshRetryCount = Math.min(this.resultsSummaryRefreshRetryCount + 1, 6);
        const baseDelay = Math.min(60_000, 5_000 * 2 ** Math.max(0, this.resultsSummaryRefreshRetryCount - 1));
        const jitter = Math.floor(Math.random() * 1_000);
        this.scheduleResultsSummaryTimer(reason, dirtyKey, baseDelay + jitter);
    }
    scheduleResultsSummaryTimer(reason, dirtyKey, delayMs) {
        if (!dirtyKey || dirtyKey === this.lastResultsSummaryRefreshedDirtyKey)
            return;
        if (!this.hasResultsSummaryEndpointCapability()) {
            const alreadySkipped = dirtyKey === this.lastResultsSummaryCapabilitySkippedDirtyKey;
            this.lastResultsSummaryCapabilitySkippedDirtyKey = dirtyKey;
            this.recordResultsSummaryCapabilitySkip("refreshResults", reason || "自动结果摘要刷新");
            if (!alreadySkipped)
                this.postState();
            return;
        }
        if (this.resultsSummaryRefreshTimer)
            clearTimeout(this.resultsSummaryRefreshTimer);
        this.resultsSummaryRefreshTimer = setTimeout(() => {
            this.resultsSummaryRefreshTimer = undefined;
            if (this.resultsSummaryRefreshInFlight) {
                this.scheduleResultsSummaryTimer("inflight", dirtyKey, 500 + Math.floor(Math.random() * 500));
                return;
            }
            void this.refreshResultsSummaryFromRealtime(reason, dirtyKey);
        }, delayMs);
        this.resultsSummaryRefreshTimer.unref?.();
    }
    resolveSelectedPlanFile(hint = "") {
        return resolvePlanFileFromPlanList(this.localPlanMetadata?.plans || [], hint, [this.planFileInput || "", this.selectedPlanId || ""]);
    }
    shouldRefreshResultsSummaryForDirtyPlan(dirtyPlanFile) {
        const selected = this.resolveSelectedPlanFile(this.planFileInput || this.selectedPlanId || "");
        const dirty = this.resolveSelectedPlanFile(dirtyPlanFile || "");
        if (!selected || !dirty)
            return true;
        if (samePlanSelection(selected, dirty))
            return true;
        const selectedRaw = normalizePlanSelectionKey(this.planFileInput || this.selectedPlanId || "");
        const dirtyRaw = normalizePlanSelectionKey(dirtyPlanFile || "");
        return samePlanSelection(selectedRaw, dirtyRaw);
    }
    markResultsSummaryDirtyKeyRefreshed(dirtyKey) {
        if (!dirtyKey)
            return;
        this.lastResultsSummaryRefreshedDirtyKey = dirtyKey;
        if (this.pendingResultsSummaryDirtyKey === dirtyKey) {
            this.pendingResultsSummaryDirtyKey = "";
            this.pendingResultsSummaryDirtyPlanFile = "";
        }
        this.resultsSummaryRefreshRetryCount = 0;
    }
    throwIfTerminalActionFailure(command, action, status, result) {
        if (!operationTerminalStatus(status))
            return;
        const message = stringFromRecord(result && typeof result === "object" ? result : {}, ["message", "detail", "error"]) || status;
        if (operationCancelledTerminalStatus(status))
            throw new UiCommandCancelled(message);
        if (operationFailureTerminalStatus(status))
            throw new Error(message);
    }
    throwIfRemoteActionPending(command, action, result) {
        const status = resultStatus(result);
        if (!remoteActionPendingStatus(status))
            return;
        const record = result && typeof result === "object" ? result : {};
        const opId = stringFromRecord(record, ["operationId", "opId", "id"]);
        const suffix = opId ? ` operationId=${opId}` : "";
        const destination = operationLongRunningAction(action)
            ? "已进入后台调度；按钮已恢复，可在“任务”查看排队、运行与日志。"
            : "等待 operation 终态；按钮已恢复，可在“操作进度”查看。";
        throw new UiCommandRemotePending(`${command || action} 已提交到 Agent${suffix}；${destination}`);
    }
    missingCapabilities(keys) {
        const caps = this.lastProbe?.capabilities;
        const fileCaps = this.lastProbe?.fileCapabilities;
        return keys.filter((key) => !hasCapability(caps, fileCaps, key));
    }
    recordActionError(error) {
        const compact = compactUiActionError(error);
        if (recentUiActionErrorMatches(this.actionErrors[0], compact))
            return;
        this.actionErrors = [compact, ...this.actionErrors].slice(0, UI_ACTION_ERROR_RECORD_LIMIT);
        void this.persistProjectActionErrorsState().catch(() => undefined);
    }
    captureActionResult(action, result) {
        const item = result && typeof result === "object" ? result : {};
        const bundlePath = stringFromRecord(item, ["bundlePath", "bundle_path", "path", "remotePath"]);
        if (action === "create-debug-bundle" && bundlePath) {
            this.debugBundlePath = bundlePath;
            void this.persistProjectDebugBundleState().catch(() => undefined);
        }
    }
    loadTunnelConfig() {
        const saved = this.context.globalState.get(keys.tunnelConfig) || {};
        const config = vscode.workspace.getConfiguration("zlkCluster");
        return (0, TunnelGateway_1.normalizeTunnelGatewayConfig)({
            ...TunnelGateway_1.defaultTunnelGatewayConfig,
            ...saved,
            connectionMode: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "connectionMode", (0, TunnelGateway_1.isRealtimeConnectionMode)(saved.connectionMode) ? saved.connectionMode : TunnelGateway_1.xshellTunnelConnectionMode),
            localPort: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "tunnel.localForwardPort", saved.localPort || TunnelGateway_1.defaultTunnelGatewayConfig.localPort),
            remotePort: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "tunnel.remoteAgentPort", saved.remotePort || TunnelGateway_1.defaultTunnelGatewayConfig.remotePort),
            token: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "tunnel.agentToken", saved.token),
        });
    }
    loadSetupConfig() {
        const saved = this.context.globalState.get(keys.setupConfig) || {};
        const config = vscode.workspace.getConfiguration("zlkCluster");
        return (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)({
            ...XshellTunnelSetup_1.defaultXshellTunnelSetupConfig,
            ...saved,
            localForwardPort: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "tunnel.localForwardPort", saved.localForwardPort || this.tunnelConfig.localPort),
            remoteAgentPort: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "tunnel.remoteAgentPort", saved.remoteAgentPort || this.tunnelConfig.remotePort),
            xshellExePath: saved.xshellExePath || this.tunnelConfig.xshellExePath || "",
            hubDisplayName: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "tunnel.hubDisplayName", saved.hubDisplayName),
            condaEnv: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "tunnel.condaEnv", saved.condaEnv === undefined ? XshellTunnelSetup_1.defaultXshellTunnelSetupConfig.condaEnv : saved.condaEnv),
            workerRealtimeMode: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "tunnel.workerRealtimeMode", saved.workerRealtimeMode || (saved.workerTunnels?.some((worker) => worker.enabled !== false) ? "hub_plus_workers" : "hub_only")),
            workerTelemetryMode: saved.workerTelemetryMode || (saved.workerTunnels?.some((worker) => worker.enabled !== false) ? "hub_plus_worker_telemetry" : "hub_only"),
            workerTunnels: saved.workerTunnels?.length
                ? saved.workerTunnels
                : nonEmptyWorkerTunnelConfig((0, ConfigurationSettings_1.explicitConfigurationValue)(config, "tunnel.workerTunnels", undefined)),
        });
    }
    gpuOwnerConfig() {
        const config = vscode.workspace.getConfiguration("zlkCluster");
        const mode = config.get("gpu.myProcessMatchMode", "both");
        return {
            currentUser: config.get("gpu.currentUser", ""),
            currentUserAliases: stringArrayConfig(config.get("gpu.currentUserAliases", [])),
            myCommandKeywords: stringArrayConfig(config.get("gpu.myCommandKeywords", [])),
            myProcessMatchMode: mode === "username" || mode === "command_contains" || mode === "both" ? mode : "both",
            localUserHint: process.env.USERNAME || process.env.USER || "",
        };
    }
    pptPlotConfig() {
        if (this.projectPptPlotConfig)
            return normalizePptPlotConfig(this.projectPptPlotConfig);
        // Target presentation is project-local. Global preferences may only seed non-path defaults.
        const config = vscode.workspace.getConfiguration("zlkCluster");
        return normalizePptPlotConfig({
            presentationPath: "",
            chartType: config.get("ppt.chartType", "auto") || "auto",
            styleMode: config.get("ppt.styleMode", "activePpt") || "activePpt",
        });
    }
    async applySetupDraft(patch, options = {}) {
        let next = (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)({
            ...this.setupConfig,
            ...patch,
        });
        if (options.syncAssignmentsFromFields)
            next = this.withAssignmentsFromConfigFields(next);
        this.setupConfig = next;
        this.lastFullEndpointProbeAt = 0;
        if (this.lastProbe) {
            this.lastProbe = enforceExpectedAgentProjectRoot(this.lastProbe, this.agentRuntimeDirs(next.agentProjectDir).workDir, "Hub");
            this.lastHealth = this.healthFromProbe(this.lastProbe);
        }
        this.lastWorkerProbes = Object.fromEntries(next.workerTunnels
            .filter((worker) => worker.enabled !== false && this.lastWorkerProbes[worker.id])
            .map((worker) => [worker.id, enforceExpectedAgentProjectRoot(this.lastWorkerProbes[worker.id], this.agentRuntimeDirs(worker.agentProjectDir || next.agentProjectDir).workDir, worker.displayName || worker.id)]));
        this.tunnelConfig = (0, TunnelGateway_1.normalizeTunnelGatewayConfig)({
            ...this.tunnelConfig,
            connectionMode: TunnelGateway_1.xshellTunnelConnectionMode,
            localPort: next.localForwardPort,
            remotePort: next.remoteAgentPort,
            xshellExePath: next.xshellExePath,
            allowStreaming: true,
            refreshProfile: "realtime",
        });
        await this.saveState();
        this.resetClient();
        this.postState();
    }
    async saveState() {
        await this.context.globalState.update(keys.tunnelConfig, persistedTunnelGatewayConfig(this.tunnelConfig));
        await this.context.globalState.update(keys.setupConfig, persistedXshellSetupConfig(this.setupConfig));
    }
    async refreshXshellSessionLibrary(options = {}) {
        const dirs = xshellScanDirs(this.setupConfig);
        const dirsKey = JSON.stringify(dirs.map((dir) => localPathKey(dir)).sort());
        const recent = this.xshellLibraryUpdatedAt && Date.now() - this.xshellLibraryUpdatedAt < this.xshellLibraryRefreshMinIntervalMs;
        if (!options.force && recent && dirsKey === this.xshellLibraryDirsKey) {
            if (options.postState !== false)
                this.postState();
            return;
        }
        if (this.xshellLibraryRefreshPromise) {
            await this.xshellLibraryRefreshPromise;
            if (options.postState !== false)
                this.postState();
            return;
        }
        this.xshellLibraryRefreshPromise = (async () => {
            try {
                const library = await (0, XshellSessionScanner_1.scanXshellSessions)(dirs);
                const sessions = [...library.sessions];
                const seen = new Set(sessions.map((session) => localPathKey(session.filePath)));
                for (const filePath of this.configuredXshellSessionPaths()) {
                    const key = localPathKey(filePath);
                    if (seen.has(key))
                        continue;
                    const info = await (0, XshellSessionScanner_1.readXshellSessionFile)(filePath, path.dirname(filePath)).catch(() => undefined);
                    if (!info)
                        continue;
                    sessions.push(info);
                    seen.add(key);
                }
                this.xshellLibrary = { ...library, sessions: sessions.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN")) };
                this.xshellLibraryError = library.warning;
                this.xshellLibraryUpdatedAt = Date.now();
                this.xshellLibraryDirsKey = dirsKey;
            }
            catch (error) {
                this.xshellLibraryError = errorMessage(error);
            }
            finally {
                this.xshellLibraryRefreshPromise = undefined;
            }
        })();
        await this.xshellLibraryRefreshPromise;
        if (options.postState !== false)
            this.postState();
    }
    configuredXshellSessionPaths() {
        return uniqueStrings([
            this.setupConfig.savedSessionPath || "",
            this.setupConfig.agentSessionPath || "",
            ...this.setupConfig.workerTunnels.flatMap((worker) => [worker.savedSessionPath || "", worker.agentSessionPath || ""]),
        ]);
    }
    sessionInfoForPath(filePath) {
        if (!filePath)
            return undefined;
        const key = localPathKey(filePath);
        return this.xshellLibrary.sessions.find((session) => localPathKey(session.filePath) === key);
    }
    async ensureXshellSessionLoaded(filePath) {
        if (!filePath || this.sessionInfoForPath(filePath))
            return;
        const info = await (0, XshellSessionScanner_1.readXshellSessionFile)(filePath, path.dirname(filePath)).catch(() => undefined);
        if (!info)
            return;
        this.xshellLibrary = {
            ...this.xshellLibrary,
            sessions: [...this.xshellLibrary.sessions, info].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN")),
        };
    }
    async syncConfiguredXshellSessions(_reason) {
        const synced = this.withXshellDerivedFields(this.setupConfig);
        if (JSON.stringify((0, XshellTunnelSetup_1.publicXshellSetupSummary)(synced)) === JSON.stringify((0, XshellTunnelSetup_1.publicXshellSetupSummary)(this.setupConfig))) {
            this.postState();
            return;
        }
        await this.applySetupDraft(synced, { syncAssignmentsFromFields: true });
    }
    async syncXshellConfigBeforeNetwork(reason) {
        await this.refreshXshellSessionLibrary();
        await this.syncConfiguredXshellSessions(reason);
    }
    withXshellDerivedFields(config) {
        const hubInfo = this.sessionInfoForPath(config.savedSessionPath);
        const hubForward = chooseXshellForward(hubInfo, config.savedSessionForwardIndex, config.localForwardPort, config.remoteAgentPort);
        const workers = config.workerTunnels.map((worker) => {
            const info = this.sessionInfoForPath(worker.savedSessionPath);
            const forward = chooseXshellForward(info, worker.savedSessionForwardIndex, worker.localForwardPort, worker.remoteTelemetryPort || worker.remoteAgentPort);
            const workerHost = worker.workerHost || worker.hubHost || info?.host || "";
            const workerUser = worker.workerUser || worker.hubUser || info?.userName || "";
            const workerSshPort = worker.workerSshPort || worker.hubSshPort || info?.port || this.setupConfig.hubSshPort || 22;
            const remoteTelemetryPort = forward?.remotePort || worker.remoteTelemetryPort || worker.remoteAgentPort;
            return {
                ...worker,
                resolvedHost: currentSessionResolvedHost(info?.host, worker.resolvedHost),
                hubHost: workerHost,
                hubUser: workerUser,
                hubSshPort: workerSshPort,
                workerHost,
                workerUser,
                workerSshPort,
                sshConfigAlias: worker.sshConfigAlias || info?.name,
                localForwardPort: forward?.localPort || worker.localForwardPort,
                remoteAgentPort: remoteTelemetryPort,
                remoteTelemetryPort,
                savedSessionForwardIndex: forward?.index ?? worker.savedSessionForwardIndex,
                savedSessionRunner: "xshell",
            };
        });
        return (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)({
            ...config,
            resolvedHost: currentSessionResolvedHost(hubInfo?.host, config.resolvedHost),
            hubHost: config.hubHost || hubInfo?.host || "",
            hubUser: config.hubUser || hubInfo?.userName || "",
            hubSshPort: config.hubSshPort || hubInfo?.port || 22,
            sshConfigAlias: config.sshConfigAlias || hubInfo?.name,
            localForwardPort: hubForward?.localPort || config.localForwardPort,
            remoteAgentPort: hubForward?.remotePort || config.remoteAgentPort,
            savedSessionForwardIndex: hubForward?.index ?? config.savedSessionForwardIndex,
            launchMode: "open_saved_session",
            savedSessionRunner: "xshell",
            workerRealtimeMode: workers.some((worker) => worker.enabled !== false) ? "hub_plus_workers" : "hub_only",
            workerTelemetryMode: workers.some((worker) => worker.enabled !== false) ? "hub_plus_worker_telemetry" : "hub_only",
            workerTunnels: workers,
        });
    }
    withAssignmentsFromConfigFields(config) {
        const existing = new Map((config.ports.assignments || []).map((assignment) => [assignment.endpointId, assignment]));
        const now = new Date().toISOString();
        const makeBase = (id) => existing.get(id)?.assignedAt || now;
        const assignments = [
            {
                endpointId: "hub",
                role: "hub_control",
                displayName: config.hubDisplayName || config.sshConfigAlias || config.hubHost || "Hub",
                remoteHostLabel: config.hubHost || config.sshConfigAlias || "hub",
                sshConfigAlias: config.sshConfigAlias,
                localForwardHost: "127.0.0.1",
                localForwardPort: config.localForwardPort,
                remoteBindHost: "127.0.0.1",
                remoteServicePort: config.remoteAgentPort,
                assignedAt: makeBase("hub"),
                source: existing.get("hub")?.source || "imported",
            },
            ...config.workerTunnels.map((worker) => ({
                endpointId: worker.id,
                role: "worker_telemetry",
                displayName: worker.displayName,
                remoteHostLabel: worker.workerHost || worker.hubHost || worker.sshConfigAlias || worker.id,
                sshConfigAlias: worker.sshConfigAlias,
                localForwardHost: "127.0.0.1",
                localForwardPort: worker.localForwardPort,
                remoteBindHost: "127.0.0.1",
                remoteServicePort: worker.remoteTelemetryPort || worker.remoteAgentPort || TunnelPortConflict_1.defaultTunnelPorts.defaultWorkerTelemetryPort,
                assignedAt: makeBase(worker.id),
                source: existing.get(worker.id)?.source || "imported",
            })),
        ];
        return (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)({
            ...config,
            ports: {
                ...config.ports,
                assignments,
            },
        });
    }
    schedulerSettings() {
        const config = vscode.workspace.getConfiguration("zlkCluster");
        return {
            pollSeconds: Math.max(60, Number(config.get("scheduler.pollSeconds", 60)) || 60),
            jitterSeconds: Math.max(0, Number(config.get("scheduler.jitterSeconds", 30)) || 0),
            workerStatusTtlSeconds: Math.max(60, Number(config.get("scheduler.workerStatusTtlSeconds", 180)) || 180),
            localAvailabilityPushSeconds: Math.max(60, Number(config.get("scheduler.localAvailabilityPushSeconds", 60)) || 60),
            workerAvailabilityPushSeconds: Math.max(60, Number(config.get("scheduler.workerAvailabilityPushSeconds", 60)) || 60),
            operationEventMaxDelayMs: Math.max(100, Number(config.get("scheduler.operationEventMaxDelayMs", 1000)) || 1000),
            workerActionMinIntervalMs: Math.max(500, Number(config.get("scheduler.workerActionMinIntervalMs", 1500)) || 1500),
            workerActionMaxConcurrent: Math.max(1, Number(config.get("scheduler.workerActionMaxConcurrent", 1)) || 1),
        };
    }
    startAvailabilityPushLoop() {
        if (this.availabilityPushTimer)
            clearTimeout(this.availabilityPushTimer);
        this.availabilityPushTimer = undefined;
        if (!this.isRealtimeMode() || !this.projectTopologyAssessment().hubAllowed)
            return;
        const scheduleNext = () => {
            const settings = this.schedulerSettings();
            const delayMs = (settings.localAvailabilityPushSeconds + Math.random() * settings.jitterSeconds) * 1000;
            this.availabilityPushTimer = setTimeout(() => {
                void this.pushLocalWorkerAvailability(false).finally(scheduleNext);
            }, delayMs);
            this.availabilityPushTimer.unref?.();
        };
        scheduleNext();
    }
    availabilityPushMinIntervalMs(settings = this.schedulerSettings()) {
        return settings.localAvailabilityPushSeconds * 1000;
    }
    availabilityPushTtlSeconds(settings = this.schedulerSettings()) {
        return settings.workerStatusTtlSeconds;
    }
    private async pushLocalWorkerAvailability(force) {
        if (!this.isRealtimeMode() || !this.projectTopologyAssessment().hubAllowed)
            return;
        const settings = this.schedulerSettings();
        const nowMs = Date.now();
        if (!force && nowMs - this.lastAvailabilityPushAt < this.availabilityPushMinIntervalMs(settings))
            return;
        const workers = this.localWorkerAvailabilityRows(this.availabilityPushTtlSeconds(settings));
        if (!workers.length)
            return;
        this.lastAvailabilityPushAt = nowMs;
        try {
            await this.client.postAvailabilityBatch({
                schemaVersion: 1,
                source: "local_aggregator",
                generatedAt: new Date(nowMs).toISOString(),
                ttlSeconds: settings.workerStatusTtlSeconds,
                workers,
            });
        }
        catch (error) {
            this.lastError = errorMessage(error);
        }
    }
    private localWorkerAvailabilityRows(ttlSeconds) {
        const gpu = (this.lastRealtimeState?.gpu || {});
        return this.enabledWorkerConfigs().map((worker) => {
            const rows = Array.isArray(gpu[worker.id]) ? gpu[worker.id] : [];
            const allowed = new Set((worker.allowedGpuIds || []).map((item) => String(item || "").trim()).filter(Boolean));
            const availableGpuIds = [];
            const busyGpuIds = [];
            for (const row of rows) {
                const item = row && typeof row === "object" ? row : {};
                const gpuId = String(item.index ?? item.gpu_id ?? item.gpuId ?? item.id ?? "").trim();
                if (!gpuId || (allowed.size && !allowed.has(gpuId)))
                    continue;
                const processes = Array.isArray(item.processes) ? item.processes : Array.isArray(item.procs) ? item.procs : [];
                const processCount = Number(item.processCount ?? item.process_count ?? processes.length);
                if (processCount > 0)
                    busyGpuIds.push(gpuId);
                else
                    availableGpuIds.push(gpuId);
            }
            return {
                workerId: worker.id,
                available: availableGpuIds.length > 0,
                availableGpuIds,
                busyGpuIds,
                reason: availableGpuIds.length ? "ok" : (rows.length ? "all_busy_or_disallowed" : "no_local_gpu_snapshot"),
                source: "local_aggregator",
                updatedAt: new Date().toISOString(),
                ttlSeconds,
                capacityLimit: worker.maxConcurrentGpus || 1,
            };
        });
    }
    private resetClient() {
        const previous = this.client;
        this.gpuHistoryState.reset();
        this.budget = new RequestBudget_1.RequestBudget((0, TunnelGateway_1.requestBudgetConfigFromTunnel)(this.tunnelConfig));
        this.client = this.createClient();
        this.realtimeUiStateRefs = undefined;
        this.lastRealtimeHeartbeatPostAt = 0;
        this.lastAvailabilityGpuSignature = "";
        void previous?.disconnect("reconfigure").catch(() => undefined);
        this.startAvailabilityPushLoop();
    }
    private async applyTopologyRuntimeMode(mode, reason) {
        const normalized = (0, TopologyMode_1.normalizeTopologyMode)(mode);
        if (!normalized || normalized === this.topologyRuntimeMode)
            return false;
        this.topologyRuntimeMode = normalized;
        this.invalidateTopologyRuntimeCaches();
        this.resetClient();
        if (this.isRealtimeMode())
            await this.ensureRealtimeConnected(reason || "topology changed");
        return true;
    }
    private invalidateTopologyRuntimeCaches() {
        if (this.resultsSummaryRefreshTimer)
            clearTimeout(this.resultsSummaryRefreshTimer);
        this.resultsSummaryRefreshTimer = undefined;
        this.resultsSummaryRefreshInFlight = false;
        this.resultsSummaryRefreshRetryCount = 0;
        this.lastResultsSummaryRefreshedDirtyKey = "";
        this.pendingResultsSummaryDirtyKey = "";
        this.pendingResultsSummaryDirtyPlanFile = "";
        this.lastResultsSummaryRealtimeErrorKey = "";
        this.lastResultsSummaryCapabilityWarningKey = "";
        this.lastResultsSummaryCapabilitySkippedDirtyKey = "";
        if (!this.resultsSummary || this.resultsSummary.__offlineImport !== true)
            this.resultsSummary = undefined;
        this.lastSnapshot = undefined;
        this.lastRealtimeState = undefined;
        this.lastSnapshotAt = undefined;
        this.lastHealth = undefined;
        this.lastProbe = undefined;
        this.lastWorkerProbes = {};
        this.lastFullEndpointProbeAt = 0;
        this.lastIntegrationReport = undefined;
        this.auditTail = undefined;
        this.lastError = undefined;
        this.lastPostedStateSignature = "";
    }
    private createClient(): MultiEndpointRealtimeClient {
        const generation = this.projectContextGeneration;
        let client;
        client = new MultiEndpointRealtimeClient_1.MultiEndpointRealtimeClient(this.realtimeEndpoints(), (endpoint) => {
            if (endpoint.id === "hub")
                return this.budget;
            return new RequestBudget_1.RequestBudget((0, TunnelGateway_1.requestBudgetConfigFromTunnel)(this.tunnelConfig));
        }, this.realtimeRefreshPolicy(), (state) => {
            if (generation !== this.projectContextGeneration || client !== this.client)
                return;
            this.lastRealtimeState = state;
            this.scheduleResultsSummaryRefreshFromRealtime(state);
            const uiRefs = this.realtimeUiStateRefsFor(state);
            if (this.shouldPushLocalAvailabilityFromRealtime(uiRefs.gpu)) void this.pushLocalWorkerAvailability(false);
            if (this.shouldPostRealtimeStateForWebview(uiRefs)) this.postState();
        });
        client.setProtectedLogKeys(this.logProtectedKeys());
        return client;
    }
    private shouldPushLocalAvailabilityFromRealtime(signature) {
        if (this.lastAvailabilityGpuSignature === signature)
            return false;
        this.lastAvailabilityGpuSignature = signature;
        return true;
    }
    private shouldPostRealtimeStateForWebview(nextRefs) {
        const previous = this.realtimeUiStateRefs;
        this.realtimeUiStateRefs = nextRefs;
        if (!previous) {
            this.lastRealtimeHeartbeatPostAt = Date.now();
            return true;
        }
        const contentChanged = (previous.gpu !== nextRefs.gpu ||
            previous.schedulerStates !== nextRefs.schedulerStates ||
            previous.experimentTraces !== nextRefs.experimentTraces ||
            previous.logs !== nextRefs.logs ||
            previous.operations !== nextRefs.operations ||
            previous.diagnostics !== nextRefs.diagnostics ||
            previous.fileTransfers !== nextRefs.fileTransfers ||
            previous.workerHealth !== nextRefs.workerHealth ||
            previous.workerTasks !== nextRefs.workerTasks ||
            previous.warnings !== nextRefs.warnings ||
            previous.clientDiagnostics !== nextRefs.clientDiagnostics ||
            previous.resultSummaryDirtyKey !== nextRefs.resultSummaryDirtyKey);
        if (contentChanged) {
            this.lastRealtimeHeartbeatPostAt = Date.now();
            return true;
        }
        const nowMs = Date.now();
        if (nowMs - this.lastRealtimeHeartbeatPostAt < this.realtimeHeartbeatPostMinMs)
            return false;
        this.lastRealtimeHeartbeatPostAt = nowMs;
        return true;
    }
    private realtimeUiStateRefsFor(state) {
        return {
            gpu: realtimeUiFieldSignature(state.gpu),
            schedulerStates: realtimeUiFieldSignature(state.schedulerStates),
            experimentTraces: realtimeUiFieldSignature(state.experimentTraces),
            logs: realtimeUiFieldSignature(state.logs),
            operations: realtimeUiFieldSignature(state.operations),
            diagnostics: realtimeUiFieldSignature(state.diagnostics),
            fileTransfers: realtimeUiFieldSignature(state.fileTransfers),
            workerHealth: realtimeUiFieldSignature(state.workerHealth),
            workerTasks: realtimeUiFieldSignature(state.workerTasks),
            warnings: realtimeUiFieldSignature(state.warnings),
            clientDiagnostics: realtimeUiFieldSignature(compactRealtimeDiagnosticsForPostGate(this.client.diagnostics())),
            resultSummaryDirtyKey: String(state.resultSummaryDirtyKey || ""),
        };
    }
    private realtimeRefreshPolicy() {
        const hiddenPause = this.tunnelConfig.pauseWhenWebviewHidden !== false;
        const streaming = this.tunnelConfig.allowStreaming !== false && this.tunnelConfig.refreshProfile !== "manual_only";
        return {
            ...RealtimeTunnelClient_1.defaultRealtimeRefreshPolicy,
            mode: this.tunnelConfig.refreshProfile === "manual_only" ? "manual_only" : this.tunnelConfig.refreshProfile === "balanced" ? "balanced" : "realtime",
            preferWebSocket: streaming,
            fallbackToSse: streaming,
            fallbackToPolling: this.tunnelConfig.refreshProfile !== "manual_only",
            snapshotFallbackIntervalSeconds: Math.max(60, Number(this.tunnelConfig.snapshotPollIntervalSeconds) || 60),
            pauseWhenWebviewHidden: hiddenPause,
            keepAgentStreamWhenHidden: !hiddenPause,
        };
    }
    realtimeEndpoints() {
        const registry = (0, TunnelEndpointRegistry_1.buildTunnelEndpointRegistry)(this.setupConfig, { hub: this.lastProbe, ...this.lastWorkerProbes });
        const hubAllowed = this.projectTopologyAssessment().hubAllowed;
        return registry.endpoints.filter((endpoint) => endpoint.enabled && (hubAllowed || endpoint.role !== "hub_control")).map((endpoint) => ({
            id: endpoint.id,
            role: endpoint.role === "hub_control" ? "hub" : "worker",
            displayName: endpoint.displayName,
            localHost: "127.0.0.1",
            localPort: endpoint.tunnel.localPort,
            token: this.tunnelConfig.token,
            timeoutMs: 8_000,
            capabilities: endpointCapabilitiesFromProbe(endpoint.lastProbe),
        }));
    }
    tunnelLaunchItems() {
        const items = this.projectTopologyAssessment().hubAllowed ? [
            { id: "hub", role: "hub", config: (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)({ ...this.setupConfig, workerRealtimeMode: "hub_only", workerTelemetryMode: "hub_only", workerTunnels: [] }) },
        ] : [];
        for (const worker of this.enabledWorkerConfigs()) {
            items.push({ id: worker.id, role: "worker", config: (0, XshellTunnelSetup_1.workerTunnelToXshellSetupConfig)(this.setupConfig, worker) });
        }
        return items;
    }
    agentLaunchItems() {
        return this.tunnelLaunchItems()
            .filter((item) => item.config.savedSessionPath)
            .map((item) => ({
            id: `${item.id}-agent`,
            role: item.role,
            displayName: `${item.id} Agent`,
            sessionPath: item.config.savedSessionPath || "",
        }));
    }
    async launchUniqueXshellSessions(items) {
        const seen = new Set();
        const results = [];
        for (const item of items) {
            if (!item.sessionPath) {
                results.push(`${item.id}: 未配置 .xsh`);
                continue;
            }
            const key = localPathKey(item.sessionPath);
            if (seen.has(key)) {
                results.push(`${item.id}: 与前面会话相同，跳过重复打开`);
                continue;
            }
            seen.add(key);
            try {
                const launch = await (0, XshellSessionLauncher_1.launchXshellSavedSession)({
                    exePath: (0, XshellTunnelSetup_1.xshellExecutablePath)(this.setupConfig),
                    sessionPath: item.sessionPath,
                    displayName: item.displayName || item.id,
                });
                results.push(`${item.id}: ${launch.launched ? "已发出启动命令" : launch.message}`);
                if (!launch.launched && launch.error)
                    results.push(`${item.id}: ${launch.error}`);
                if (launch.launched)
                    await waitForXshellBatchLaunchSlot();
            }
            catch (error) {
                results.push(`${item.id}: ${errorMessage(error)}`);
            }
        }
        return results;
    }
    agentStartupTargets() {
        const targets = [];
        const hubPath = this.setupConfig.savedSessionPath;
        if (this.projectTopologyAssessment().hubAllowed && hubPath) {
            const dirs = this.agentRuntimeDirs(this.setupConfig.agentProjectDir);
            targets.push({
                id: "hub",
                filePath: hubPath,
                tmuxSessionName: (0, AgentTmuxPolicy_1.defaultAgentTmuxSessionName)("hub"),
                command: (0, AgentTmuxPolicy_1.agentTmuxStartupCommand)({ role: "hub", port: this.setupConfig.remoteAgentPort, installDir: dirs.installDir, workDir: dirs.workDir, condaEnv: this.setupConfig.condaEnv }),
            });
        }
        for (const worker of this.enabledWorkerConfigs()) {
            const filePath = worker.savedSessionPath;
            if (!filePath)
                continue;
            const dirs = this.agentRuntimeDirs(worker.agentProjectDir);
            const workerCommand = (0, AgentTmuxPolicy_1.agentTmuxStartupCommand)({ role: "worker", endpointId: worker.id, port: worker.remoteTelemetryPort || worker.remoteAgentPort, installDir: dirs.installDir, workDir: dirs.workDir, condaEnv: effectiveWorkerCondaEnv(worker, this.setupConfig.condaEnv) });
            targets.push({
                id: worker.id,
                filePath,
                tmuxSessionName: (0, AgentTmuxPolicy_1.defaultAgentTmuxSessionName)("worker", worker.id),
                command: this.projectTopologyAssessment().hubAllowed ? workerCommand : `unset ZLK_HUB_UPLINK_URL; ${workerCommand}`,
            });
        }
        return targets;
    }
    currentAgentPreparationBlockers() {
        return uniqueStrings([
            ...this.currentTunnelLaunchBlockers(),
            ...agentSessionReuseBlockers(this.agentStartupTargets()),
        ]);
    }
    currentTunnelLaunchBlockers() {
        const items = this.tunnelLaunchItems();
        const blockers = this.currentPortConflicts()
            .filter((conflict) => conflict.severity === "error")
            .map((conflict) => conflict.message || conflict.suggestion);
        for (const item of items) {
            blockers.push(...(0, XshellTunnelSetup_1.validateXshellSetupConfig)(item.config).map((error) => `${item.id}: ${error}`));
            const unsafeForward = this.unsafeXshellForwardMessage(item.config);
            if (unsafeForward)
                blockers.push(`${item.id}: ${unsafeForward}`);
        }
        return uniqueStrings(blockers);
    }
    agentSessionState() {
        const hubDirs = this.agentRuntimeDirs(this.setupConfig.agentProjectDir);
        return {
            mode: "xshell_saved_session_tmux",
            canWriteStartupCommands: this.agentStartupTargets().length > 0,
            preparationBlockers: this.currentAgentPreparationBlockers(),
            hub: {
                displayName: this.hubDisplayName(),
                configured: Boolean(this.setupConfig.savedSessionPath),
                sessionPath: this.setupConfig.savedSessionPath,
                tmuxSessionName: (0, AgentTmuxPolicy_1.defaultAgentTmuxSessionName)("hub"),
                actualWorkRoot: hubDirs.workRoot,
                installDir: hubDirs.installDir,
                workDir: hubDirs.workDir,
                projectName: hubDirs.projectName,
                condaEnv: this.setupConfig.condaEnv,
                startupCommand: (0, AgentTmuxPolicy_1.agentTmuxStartupCommand)({ role: "hub", port: this.setupConfig.remoteAgentPort, installDir: hubDirs.installDir, workDir: hubDirs.workDir, condaEnv: this.setupConfig.condaEnv }),
            },
            workers: this.setupConfig.workerTunnels.map((worker) => {
                const dirs = this.agentRuntimeDirs(worker.agentProjectDir);
                return {
                    id: worker.id,
                    displayName: worker.displayName,
                    enabled: worker.enabled !== false,
                    configured: Boolean(worker.savedSessionPath),
                    sessionPath: worker.savedSessionPath,
                    tmuxSessionName: (0, AgentTmuxPolicy_1.defaultAgentTmuxSessionName)("worker", worker.id),
                    actualWorkRoot: dirs.workRoot,
                    installDir: dirs.installDir,
                    workDir: dirs.workDir,
                    projectName: dirs.projectName,
                    condaEnv: effectiveWorkerCondaEnv(worker, this.setupConfig.condaEnv),
                    startupCommand: (0, AgentTmuxPolicy_1.agentTmuxStartupCommand)({ role: "worker", endpointId: worker.id, port: worker.remoteTelemetryPort || worker.remoteAgentPort, installDir: dirs.installDir, workDir: dirs.workDir, condaEnv: effectiveWorkerCondaEnv(worker, this.setupConfig.condaEnv) }),
                };
            }),
            note: "Agent 跟随 Xshell 隧道会话启动。插件只打开 .xsh 会话文件，不直接执行远端命令。",
        };
    }
    agentRuntimeDirs(actualWorkRoot) {
        const projectName = remoteProjectName();
        const root = normalizeRemoteWorkRoot(actualWorkRoot);
        if (!root)
            return { projectName };
        return {
            workRoot: root,
            installDir: `${root}/zlk_agent`,
            ...(projectName ? { workDir: `${root}/${projectName}` } : {}),
            projectName,
        };
    }
    currentAssignments() {
        if (this.currentAssignmentsCacheConfig === this.setupConfig)
            return this.currentAssignmentsCacheValue;
        const enabledWorkers = new Set(this.enabledWorkerConfigs().map((worker) => worker.id));
        const hubAllowed = this.projectTopologyAssessment().hubAllowed;
        const assignments = (0, TunnelEndpointRegistry_1.endpointAssignmentsFromConfig)(this.setupConfig).filter((assignment) => (hubAllowed && assignment.role === "hub_control") || enabledWorkers.has(assignment.endpointId));
        this.currentAssignmentsCacheConfig = this.setupConfig;
        this.currentAssignmentsCacheValue = assignments;
        return assignments;
    }
    currentPortConflicts() {
        const assignments = this.currentAssignments();
        const range = this.setupConfig.ports.workerLocalPortRange;
        const rangeKey = `${Number(range?.start || 0)}:${Number(range?.end || 0)}`;
        if (this.currentPortConflictsCacheAssignments === assignments && this.currentPortConflictsCacheRangeKey === rangeKey)
            return this.currentPortConflictsCacheValue;
        const conflicts = (0, TunnelPortAllocator_1.detectStaticTunnelPortConflicts)(assignments, range);
        this.currentPortConflictsCacheAssignments = assignments;
        this.currentPortConflictsCacheRangeKey = rangeKey;
        this.currentPortConflictsCacheValue = conflicts;
        return conflicts;
    }
    hubDisplayName() {
        return this.setupConfig.hubDisplayName || this.setupConfig.sshConfigAlias || this.setupConfig.hubHost || "Hub";
    }
    applyAssignmentsToSetup(config, assignments) {
        const hub = assignments.find((assignment) => assignment.endpointId === "hub");
        const byId = new Map(assignments.map((assignment) => [assignment.endpointId, assignment]));
        const workers = config.workerTunnels.map((worker) => {
            const assignment = byId.get(worker.id);
            return assignment ? {
                ...worker,
                localForwardPort: assignment.localForwardPort,
                remoteAgentPort: assignment.remoteServicePort,
                remoteTelemetryPort: assignment.remoteServicePort,
            } : worker;
        });
        return (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)({
            ...config,
            localForwardPort: hub?.localForwardPort || config.localForwardPort,
            remoteAgentPort: hub?.remoteServicePort || config.remoteAgentPort,
            workerRealtimeMode: workers.some((worker) => worker.enabled !== false) ? "hub_plus_workers" : "hub_only",
            workerTelemetryMode: workers.some((worker) => worker.enabled !== false) ? "hub_plus_worker_telemetry" : "hub_only",
            workerTunnels: workers,
            ports: {
                ...config.ports,
                assignments,
            },
        });
    }
    endpointRegistryState() {
        return {
            registry: (0, TunnelEndpointRegistry_1.buildTunnelEndpointRegistry)(this.setupConfig, { hub: this.lastProbe, ...this.lastWorkerProbes }),
            assignments: this.currentAssignments(),
            conflicts: this.currentPortConflicts(),
            policy: this.setupConfig.realtime,
            note: `插件不内置 ${"S" + "SH"}，也不会执行 ${"s" + "sh"}/${"s" + "cp"}/${"r" + "sync"}。Hub 和 Worker 连接都由 Xshell 会话本地端口转发提供；插件只访问 127.0.0.1 端口。配置保存在 VS Code 全局扩展状态中。`,
        };
    }
    configurationSourceState() {
        const config = vscode.workspace.getConfiguration("zlkCluster");
        const saved = this.context.globalState.get(keys.setupConfig) || {};
        const inspectedWorkers = config.inspect("tunnel.workerTunnels");
        const workspaceWorkers = inspectedWorkers?.workspaceFolderValue ?? inspectedWorkers?.workspaceValue ?? inspectedWorkers?.globalValue;
        const savedWorkerCount = saved.workerTunnels?.length || 0;
        return {
            primary: "VS Code globalState",
            endpointProfiles: savedWorkerCount || saved.savedSessionPath ? "已导入" : "未导入",
            savedHubSession: Boolean(saved.savedSessionPath),
            savedHubAgentSession: Boolean(saved.agentSessionPath),
            savedWorkerCount,
            enabledWorkerCount: this.enabledWorkerConfigs().length,
            workspaceWorkerConfigIgnored: Boolean(savedWorkerCount && Array.isArray(workspaceWorkers) && workspaceWorkers.length === 0),
            sessionLibraryCount: this.xshellLibrary.sessions.length,
            note: "服务器配置以插件全局状态为主；工作区只决定项目名、计划目录和实验接入文件。空 workerTunnels 设置不会覆盖已导入端点档案。",
        };
    }
    async detectPortOccupancy(port, endpointId) {
        if (await (0, XshellTunnelLauncher_1.isLocalPortAvailable)(port))
            return "available";
        const item = this.tunnelLaunchItems().find((entry) => entry.id === endpointId);
        try {
            if (item?.role === "worker") {
                const probe = await (0, XshellTunnelPortProbe_1.probeWorkerTelemetryTunnel)({ ...item.config, token: this.tunnelConfig.token }, { timeoutMs: 1500 });
                return probe.status === "ok" ? "current_tunnel" : "unknown_process";
            }
            const probe = await this.integration().probeLocalTunnel(this.setupConfig);
            return probe.status === "ok" || probe.status === "file_api_unavailable" ? "current_tunnel" : "unknown_process";
        }
        catch {
            return "unknown_process";
        }
    }
    async launchTunnelItem(item) {
        const errors = (0, XshellTunnelSetup_1.validateXshellSetupConfig)(item.config);
        if (errors.length) {
            void vscode.window.showErrorMessage(`${item.id}: ${errors.join(" ")}`);
            return;
        }
        const unsafeForward = this.unsafeXshellForwardMessage(item.config);
        if (unsafeForward) {
            void vscode.window.showErrorMessage(`${item.id}: ${unsafeForward}`);
            return;
        }
        const occupancy = await this.detectPortOccupancy(item.config.localForwardPort, item.id);
        if (occupancy === "current_tunnel") {
            return;
        }
        if (occupancy !== "available") {
            return;
        }
        const launch = await this.integration().launchTunnel(item.config);
        if (!launch.launched)
            void vscode.window.showErrorMessage(`${item.id}: ${launch.message} ${launch.error || ""}`.trim());
    }
    unsafeXshellForwardMessage(config) {
        const info = this.sessionInfoForPath(config.savedSessionPath);
        const unsafe = unsafeXshellForwardMessages(info);
        if (!unsafe.length)
            return "";
        return `Xshell 会话 ${info?.name || config.savedSessionPath || ""} 存在非本机回环 FwdReq：${unsafe.join("；")}。请把 Source 和 Host 都改为 127.0.0.1、localhost 或 ::1 后再启动。`;
    }
    private buildState(): WebviewClusterState {
        const schedulerConfig = this.schedulerSettings();
        const realtime = this.client.diagnostics();
        const connectionMode = this.effectiveConnectionMode();
        const realtimeState: RealtimeState | undefined = connectionMode === "offline_import"
            ? undefined
            : this.lastRealtimeState || this.client.currentState();
        const snapshot = this.lastSnapshot || realtimeState?.lastKnownGood;
        const offlineSnapshot = this.offlineBundle?.snapshot;
        const gpu = compactGpuForWebview(mergeFallbackRecords(offlineSnapshot?.gpu, snapshot?.gpu, realtimeState?.gpu));
        const selectedPlanKeys = uniqueStrings([this.planFileInput || "", this.selectedPlanId || ""]);
        const selectedTracePlanFile = this.resolveSelectedPlanFile(this.planFileInput || this.selectedPlanId || "") || this.planFileInput || this.selectedPlanId || "";
        const selectedTracePlanVersion = this.planVersionForFile(selectedTracePlanFile);
        const selectedTracePlan = { planFile: selectedTracePlanFile, planRevision: selectedTracePlanVersion.revision, planUpdatedAt: selectedTracePlanVersion.updatedAt };
        const schedulerProtectedKeys = this.schedulerProtectedKeys();
        const schedulerStates = compactSchedulerStates(mergeFallbackRows(compactFallbackRowSources([offlineSnapshot?.schedulerStates, snapshot?.schedulerStates, realtimeState?.schedulerStates], (rows) => compactSchedulerStates(rows, schedulerProtectedKeys)), schedulerFallbackRowKey, mergeSchedulerFallbackRow), schedulerProtectedKeys);
        const traceProtectedKeys = this.traceProtectedKeys();
        const experimentTraces = compactExperimentTraces(mergeFallbackRows(compactFallbackRowSources([offlineSnapshot?.experimentTraces, snapshot?.experimentTraces, realtimeState?.experimentTraces], (rows) => compactExperimentTraces(rows, traceProtectedKeys, selectedTracePlan)), experimentTraceFallbackRowKey), traceProtectedKeys, selectedTracePlan);
        const protectedLogKeys = this.logProtectedKeys();
        this.client.setProtectedLogKeys(protectedLogKeys);
        const logs = (0, RealtimeEventReducer_1.compactRealtimeLogs)(firstRecord(realtimeState?.logs), undefined, undefined, protectedLogKeys);
        this.queueProjectLocalOperationsStatePersistence();
        const operations = compactOperationRecords(mergeOperationRecords(this.localOperations, compactOperationRecords(operationsRecord(snapshot?.operations), STATE_OPERATION_RECORD_LIMIT, TERMINAL_OPERATION_RECORD_LIMIT), compactOperationRecords(operationsRecord(offlineSnapshot?.operations), STATE_OPERATION_RECORD_LIMIT, TERMINAL_OPERATION_RECORD_LIMIT), compactOperationRecords(realtimeState?.operations, STATE_OPERATION_RECORD_LIMIT, TERMINAL_OPERATION_RECORD_LIMIT)), STATE_OPERATION_RECORD_LIMIT, TERMINAL_OPERATION_RECORD_LIMIT);
        const fileTransfers = compactFileTransfersForWebview(firstRecord(realtimeState?.fileTransfers));
        const endpointRegistryState = this.endpointRegistryState();
        this.recentPlans = mergeRecentPlans(this.recentPlans, this.localPlanMetadata.plans, extractPlans(snapshot), extractPlans(offlineSnapshot), extractPlans((snapshot?.diagnostics || offlineSnapshot?.diagnostics)));
        const previousDebugBundlePath = this.debugBundlePath || "";
        this.debugBundlePath ||= findDebugBundlePath(operations);
        if ((this.debugBundlePath || "") && (this.debugBundlePath || "") !== previousDebugBundlePath)
            void this.persistProjectDebugBundleState().catch(() => undefined);
        const webviewProbe = compactProbeForWebview(this.lastProbe);
        const webviewWorkerProbes = compactWorkerProbesForWebview(this.lastWorkerProbes);
        const webviewCapabilities = compactCapabilitiesForWebview(this.lastProbe?.capabilities);
        const webviewFileCapabilities = compactFileCapabilitiesForWebview(this.lastProbe?.fileCapabilities);
        const agentSessions = this.agentSessionState();
        const configurationSources = this.configurationSourceState();
        const webviewIntegrationReport = compactIntegrationReportForWebview(this.lastIntegrationReport);
        const webviewEndpointRegistry = compactEndpointRegistryForWebview(endpointRegistryState.registry);
        const webviewTunnelPortAssignments = compactTunnelPortAssignmentsForWebview(endpointRegistryState.assignments);
        const webviewTunnelPortConflicts = compactTunnelPortConflictsForWebview(endpointRegistryState.conflicts);
        const webviewRealtimePolicy = compactRealtimePolicyForWebview(endpointRegistryState.policy);
        const webviewRealtime = compactRealtimeDiagnosticsForWebview(realtime);
        const webviewHealth = compactHealthForWebview(this.lastHealth);
        const webviewPlanScanError = this.localPlanMetadata.error ? compactSensitiveText(this.localPlanMetadata.error, 360) : undefined;
        const webviewDebugBundlePath = compactDebugBundlePathForWebview(this.debugBundlePath);
        const webviewLastError = this.lastError ? compactSensitiveText(this.lastError, 600) : undefined;
        const webviewPlans = compactLocalPlansForWebview(this.localPlanMetadata.plans, selectedPlanKeys, WEBVIEW_LOCAL_PLAN_LIMIT);
        const webviewArchivedPlans = compactLocalPlansForWebview(this.localPlanMetadata.archivedPlans || [], [], WEBVIEW_ARCHIVED_PLAN_LIMIT);
        const webviewDetectedProject = compactDetectedProjectForWebview(this.localPlanMetadata.detectedProject);
        webviewDetectedProject.missingOnboarding = projectOnboardingSuggestionsForSelection(this.localPlanMetadata.detectedProject, this.localPlanMetadata.plans, this.planFileInput, this.selectedPlanId);
        const integrations = { simpleSftp: simpleSftpIntegrationReadiness() };
        const workspace = workspaceContextForWebview();
        const topology = this.projectTopologyAssessment();
        const projectOnboarding = projectOnboardingStateForWebview({
            workspace,
            setup: this.setupConfig,
            simpleSftp: integrations.simpleSftp,
            promptShown: this.context.workspaceState.get(keys.projectOnboardingPrompt, 0),
            completed: this.context.workspaceState.get(keys.projectOnboardingCompleted, false) === true
                || projectOnboardingCompletedFromCodeSync(this.lastCodeSyncState),
        });
        return {
            extensionVersion: String(this.context.extension.packageJSON?.version || ""),
            connectionMode,
            localEndpoint: (0, TunnelGateway_1.localBaseUrl)(this.tunnelConfig),
            workspace,
            topology,
            setup: compactXshellSetupForWebview(this.setupConfig),
            schedulerConfig,
            pptPlotConfig: this.pptPlotConfig(),
            pptAutomation: this.pptAutomationReadiness,
            integrations,
            projectOnboarding,
            health: webviewHealth,
            realtime: webviewRealtime,
            gpuOwnerConfig: this.gpuOwnerConfig(),
            planDir: this.localPlanMetadata.planDir,
            detectedProject: webviewDetectedProject,
            plans: webviewPlans.plans,
            plansTotalCount: webviewPlans.totalCount,
            plansOmittedCount: webviewPlans.omittedCount,
            planArchive: { plans: webviewArchivedPlans.plans, totalCount: webviewArchivedPlans.totalCount, omittedCount: webviewArchivedPlans.omittedCount },
            planScanError: webviewPlanScanError,
            gpu,
            gpuHistory: this.gpuHistoryState.snapshot(),
            schedulerStates,
            experimentTraces,
            logs,
            operations,
            fileTransfers,
            codeSync: compactCodeSyncForWebview(this.lastCodeSyncState),
            remotePathConfirmations: {
                count: this.confirmedRemotePaths.length,
                stateFile: PROJECT_REMOTE_PATH_CONFIRMATIONS_PATH,
            },
            pptPathConfirmations: {
                count: this.confirmedPptPaths.length,
                stateFile: PROJECT_PPT_PATH_CONFIRMATIONS_PATH,
            },
            uiLayout: this.currentUiLayoutState(),
            selection: {
                selectedPlanId: this.selectedPlanId,
                selectedExperimentIds: [...this.selectedExperimentIds],
                selectedRunKeys: [...this.selectedRunKeys],
                selectedRunKey: this.selectedRunKey,
                selectedArchiveKeys: [...this.selectedArchiveKeys],
                selectedTaskUiKeys: [...this.selectedTaskUiKeys],
                hiddenLegacyTaskUiKeys: [...this.hiddenLegacyTaskUiKeys],
                selectedLogRunKey: this.selectedLogRunKey,
            },
            planFileInput: this.planFileInput,
            recentPlans: this.recentPlans,
            resultsSummary: compactResultsSummaryForWebview(this.filterResultsSummaryForPlan(this.resultsSummary, this.resolveSelectedPlanFile(this.selectedPlanId || this.planFileInput || ""))),
            auditTail: this.auditTail,
            debugBundlePath: webviewDebugBundlePath,
            actionErrors: this.actionErrors,
            selectedLogRunKey: this.selectedLogRunKey,
            probe: webviewProbe,
            workerProbes: webviewWorkerProbes,
            agentSessions,
            xshellSessions: compactXshellSessionLibraryForWebview(this.xshellLibrary, this.setupConfig, this.xshellLibraryError),
            endpointRegistry: webviewEndpointRegistry,
            configurationSources,
            tunnelPortAssignments: webviewTunnelPortAssignments,
            tunnelPortConflicts: webviewTunnelPortConflicts,
            realtimePolicy: webviewRealtimePolicy,
            hubControlStatus: buildHubControlStatus(endpointRegistryState.registry, this.lastProbe),
            workerTelemetryStatus: buildWorkerTelemetryStatus(endpointRegistryState.registry, this.lastWorkerProbes, webviewRealtime),
            integrationReport: webviewIntegrationReport,
            capabilities: webviewCapabilities,
            fileCapabilities: webviewFileCapabilities,
            lastSeq: webviewRealtime.lastSeq,
            lastHeartbeatAt: webviewRealtime.lastHeartbeatAt,
            lastSnapshotAt: this.lastSnapshotAt,
            lastKnownGood: this.compactLastKnownGood(realtimeState?.lastKnownGood || this.lastSnapshot || offlineSnapshot),
            offline: this.offlineBundle ? { lastImportedAt: this.offlineBundle.lastImportedAt, schemaVersion: this.offlineBundle.schemaVersion } : undefined,
            diagnostics: this.compactDiagnostics({
                connectionMode,
                localEndpoint: (0, TunnelGateway_1.localBaseUrl)(this.tunnelConfig),
                directAccessDisabled: true,
                requests: this.budget.snapshot(),
                endpointRequests: this.client.budgetSnapshots(),
                health: webviewHealth,
                realtime: webviewRealtime,
                probe: webviewProbe,
                workerProbes: webviewWorkerProbes,
                agentSessions,
                endpointRegistry: webviewEndpointRegistry,
                configurationSources,
                tunnelPortAssignments: webviewTunnelPortAssignments,
                tunnelPortConflicts: webviewTunnelPortConflicts,
                realtimePolicy: webviewRealtimePolicy,
                capabilities: webviewCapabilities,
                fileCapabilities: webviewFileCapabilities,
                integrationReport: webviewIntegrationReport,
                integrations,
                selection: {
                    selectedPlanId: this.selectedPlanId,
                    selectedExperimentIds: [...this.selectedExperimentIds],
                    selectedRunKeys: [...this.selectedRunKeys],
                    selectedRunKey: this.selectedRunKey,
                    selectedArchiveKeys: [...this.selectedArchiveKeys],
                },
                actionErrors: this.actionErrors,
                lastSnapshotAt: this.lastSnapshotAt,
                lastError: webviewLastError,
            }, {
                gpuServers: Object.keys((this.lastRealtimeState?.gpu || this.lastSnapshot?.gpu || {})).length,
                schedulerRows: (this.lastRealtimeState?.schedulerStates || this.lastSnapshot?.schedulerStates || []).length,
                schedulerPayloadBudget: SCHEDULER_STATE_RECORD_LIMIT,
                schedulerSourcePremergeBudget: SCHEDULER_STATE_RECORD_LIMIT,
                experimentTraces: (this.lastRealtimeState?.experimentTraces || this.lastSnapshot?.experimentTraces || []).length,
                experimentTracePayloadBudget: EXPERIMENT_TRACE_RECORD_LIMIT,
                experimentTraceSourcePremergeBudget: EXPERIMENT_TRACE_RECORD_LIMIT,
                operations: Object.keys(operations).length,
                operationSourcePremergeBudget: STATE_OPERATION_RECORD_LIMIT,
                fileTransfers: Object.keys(fileTransfers).length,
            }),
            lastError: webviewLastError,
        };
    }
    currentUiLayoutState() {
        const globalLayout = normalizeUiLayout(this.context.globalState.get(keys.uiLayout) || {});
        // Project file wins for project-specific layout. Global only seeds missing pinnedCommands.
        if (this.projectUiLayout) {
            const projectLayout = normalizeUiProjectLayoutState(this.projectUiLayout, defaultUiLayout);
            return mergeUiLayoutState(globalLayout, projectLayout);
        }
        return globalLayout;
    }
    private compactLastKnownGood(snapshot) {
        if (!snapshot)
            return undefined;
        return {
            generatedAt: snapshot.generatedAt,
            schemaVersion: snapshot.schemaVersion,
            gpuServers: Object.keys(snapshot.gpu || {}).length,
            schedulerRows: Array.isArray(snapshot.schedulerStates) ? snapshot.schedulerStates.length : 0,
            experimentTraces: Array.isArray(snapshot.experimentTraces) ? snapshot.experimentTraces.length : 0,
            diagnosticsAvailable: Boolean(snapshot.diagnostics),
        };
    }
    private compactDiagnostics(input, bulkCounts) {
        return (0, TunnelDiagnostics_1.redactTunnelDiagnostics)({
            ...input,
            bulkOmitted: {
                reason: "实时大字段已在 state 顶层提供；诊断 JSON 仅保留摘要，避免长时间运行重复传输大 payload。",
                fields: ["gpu", "schedulerStates", "experimentTraces", "operations", "fileTransfers", "lastKnownGood"],
            },
            bulkCounts,
        });
    }
    schedulerProtectedKeys() {
        return uniqueStrings([
            ...this.selectedRunKeys,
            ...this.selectedExperimentIds,
            ...this.selectedArchiveKeys,
            ...this.selectedTaskUiKeys,
            this.selectedRunKey,
            this.selectedLogRunKey,
        ].map((value) => String(value || "").trim()).filter(Boolean));
    }
    traceProtectedKeys() {
        return uniqueStrings([
            ...this.selectedRunKeys,
            ...this.selectedExperimentIds,
            ...this.selectedArchiveKeys,
            this.selectedRunKey,
        ].map((value) => String(value || "").trim()).filter(Boolean));
    }
    logProtectedKeys() {
        return uniqueStrings([
            this.selectedLogRunKey,
            this.selectedRunKey,
            ...this.selectedRunKeys,
            ...this.selectedTaskUiKeys,
        ].map((value) => String(value || "").trim()).filter(Boolean));
    }
    private postState(immediate = false): void {
        if (!this.view) return;
        if (immediate) {
            this.flushStatePost(true);
            return;
        }
        this.statePostPending = true;
        if (!this.view.visible) return;
        if (this.statePostTimer) return;
        this.statePostTimer = setTimeout(() => this.flushStatePost(false), this.statePostBatchMs);
        this.statePostTimer.unref?.();
    }
    private startPanelReadyWatchdog(): void {
        this.clearPanelReadyWatchdog();
        this.panelReadyWatchdogTimer = setTimeout(() => {
            this.panelReadyWatchdogTimer = undefined;
            if (this.view && !this.webviewReady)
                this.showPanelRecovery("面板在规定时间内没有完成启动握手。请重新加载面板。");
        }, 10_000);
        this.panelReadyWatchdogTimer.unref?.();
    }
    private clearPanelReadyWatchdog(): void {
        if (this.panelReadyWatchdogTimer)
            clearTimeout(this.panelReadyWatchdogTimer);
        this.panelReadyWatchdogTimer = undefined;
    }
    private showPanelRecovery(message: string): void {
        if (!this.view || this.webviewReady)
            return;
        this.clearPanelReadyWatchdog();
        this.view.webview.html = renderPanelRecoveryHtml(message);
    }
    private loadPanelHtml(): void {
        if (!this.view)
            return;
        this.webviewReady = false;
        const document = renderPanelBootstrapDocument(renderPanelHtml, renderPanelRecoveryHtml);
        this.view.webview.html = document.html;
        if (document.recovered) {
            this.clearPanelReadyWatchdog();
            this.lastError = document.error;
            this.recordActionError({ command: "panelBootstrap", message: document.error, suggestion: "点击“重新加载面板”；若仍失败，请执行 Developer: Reload Window。" });
            return;
        }
        if (!this.webviewReady)
            this.startPanelReadyWatchdog();
    }
    private reloadPanelHtml(): void {
        this.loadPanelHtml();
    }
    private buildPanelFallbackState(message: string): WebviewClusterState {
        let workspace = {
            open: false,
            name: "",
            root: "",
            hostPath: "",
            editorUri: "",
            containerPath: "",
            remote: false,
            mappingError: "",
            folderCount: 0,
            singleProject: false,
        };
        try {
            workspace = workspaceContextForWebview();
        }
        catch {
            // Keep recovery rendering independent from workspace path mapping.
        }
        const setup = { workerTunnels: [] };
        const simpleSftp = {
            ready: false,
            installed: false,
            extensionId: SIMPLE_SFTP_EXTENSION_ID,
            version: "",
            missingCommands: [...SIMPLE_SFTP_REQUIRED_COMMANDS],
            message: "面板状态暂不可用；请重新加载面板。",
        };
        let projectOnboarding;
        try {
            projectOnboarding = projectOnboardingStateForWebview({ workspace, setup, simpleSftp, completed: false });
        }
        catch {
            projectOnboarding = { required: false, completed: false, ready: false, blocked: false, missing: [], projectName: "当前项目", detail: "" };
        }
        const boundedMessage = compactSensitiveText(message, 600) || "面板状态生成失败。";
        return {
            extensionVersion: String(this.context.extension.packageJSON?.version || ""),
            connectionMode: "xshell_tunnel_realtime",
            localEndpoint: "http://127.0.0.1:18765",
            workspace,
            setup,
            schedulerConfig: {},
            pptPlotConfig: {},
            pptAutomation: {},
            integrations: { simpleSftp },
            projectOnboarding,
            health: { state: "unknown", status: "unknown", message: "面板状态暂不可用。" },
            realtime: { status: "disconnected", endpoints: [], lastSeq: 0 },
            gpuOwnerConfig: {},
            planDir: "experiments/plans",
            detectedProject: {},
            plans: [],
            plansTotalCount: 0,
            plansOmittedCount: 0,
            planArchive: { plans: [], totalCount: 0, omittedCount: 0 },
            planScanError: boundedMessage,
            gpu: [],
            gpuHistory: { status: "idle" },
            schedulerStates: [],
            experimentTraces: [],
            logs: [],
            operations: {},
            fileTransfers: {},
            codeSync: {},
            remotePathConfirmations: { count: 0, stateFile: "" },
            pptPathConfirmations: { count: 0, stateFile: "" },
            uiLayout: { order: [], collapsed: {}, resourceTreeChildren: {}, manual: false, treePinned: false, inspectorPinned: false, detailActions: [], pinnedActions: [] },
            selection: { selectedPlanId: "", selectedExperimentIds: [], selectedRunKeys: [], selectedRunKey: "", selectedArchiveKeys: [], hiddenLegacyTaskUiKeys: [], selectedLogRunKey: "" },
            planFileInput: "",
            recentPlans: [],
            resultsSummary: {},
            auditTail: undefined,
            debugBundlePath: "",
            actionErrors: [{ command: "panelState", message: boundedMessage, suggestion: "点击“重新加载面板”；若仍失败，请执行 Developer: Reload Window。" }],
            selectedLogRunKey: "",
            probe: {},
            workerProbes: {},
            agentSessions: [],
            xshellSessions: { sessions: [], error: boundedMessage },
            endpointRegistry: { endpoints: [], workers: [], conflicts: [] },
            configurationSources: [],
            tunnelPortAssignments: [],
            tunnelPortConflicts: [],
            realtimePolicy: {},
            hubControlStatus: {},
            workerTelemetryStatus: [],
            integrationReport: {},
            capabilities: {},
            fileCapabilities: {},
            lastSeq: 0,
            lastHeartbeatAt: undefined,
            lastSnapshotAt: undefined,
            lastKnownGood: undefined,
            diagnostics: { directAccessDisabled: true, panelStateBuildError: boundedMessage },
            lastError: boundedMessage,
        };
    }
    private flushStatePost(force): void {
        if (this.statePostTimer) clearTimeout(this.statePostTimer);
        this.statePostTimer = undefined;
        if (!this.view) return;
        if (this.statePostInFlight) {
            this.statePostPending = true;
            return;
        }
        if (!force && !this.statePostPending) return;
        if (!this.view.visible) return;
        this.statePostPending = false;
        let state: WebviewClusterState;
        try {
            state = this.buildState();
            this.lastStateBuildErrorSignature = "";
        }
        catch (error) {
            const message = errorMessage(error);
            this.lastError = `面板状态生成失败：${message}`;
            if (message !== this.lastStateBuildErrorSignature) {
                this.lastStateBuildErrorSignature = message;
                this.recordActionError({ command: "panelState", message: this.lastError, suggestion: "点击“重新加载面板”；若仍失败，请执行 Developer: Reload Window。" });
            }
            state = this.buildPanelFallbackState(this.lastError);
        }
        state.contextActionSignature = contextActionStatePostSignature(state);
        const signature = webviewStatePostSignature(state);
        if (!force && signature === this.lastPostedStateSignature) return;
        const reportPostError = (error) => {
            this.statePostInFlight = false;
            this.statePostPending = true;
            const message = `面板状态发送失败：${errorMessage(error)}`;
            if (message !== this.lastStatePostErrorSignature) {
                this.lastStatePostErrorSignature = message;
                this.recordActionError({ command: "panelStatePost", message, suggestion: "插件将有限次自动重试；仍失败时请重新加载面板。" });
            }
            this.scheduleStatePostRetry();
        };
        const completePost = (delivered) => {
            if (!delivered) {
                reportPostError(new Error("Webview 未接收状态消息"));
                return;
            }
            this.statePostInFlight = false;
            this.lastPostedStateSignature = signature;
            this.lastStatePostErrorSignature = "";
            this.statePostRetryCount = 0;
            if (this.statePostRetryTimer)
                clearTimeout(this.statePostRetryTimer);
            this.statePostRetryTimer = undefined;
            if (this.statePostPending)
                this.postState();
        };
        try {
            this.statePostInFlight = true;
            const posted = this.view.webview.postMessage({ type: "state", state });
            void Promise.resolve(posted).then(completePost, reportPostError);
        }
        catch (error) {
            reportPostError(error);
        }
    }
    private scheduleStatePostRetry(): void {
        if (this.statePostRetryTimer || this.statePostRetryCount >= this.statePostRetryMax)
            return;
        if (!this.view?.visible || !this.webviewReady)
            return;
        const delay = Math.min(this.statePostRetryBaseMs * (2 ** this.statePostRetryCount), 4000);
        this.statePostRetryCount += 1;
        this.statePostRetryTimer = setTimeout(() => {
            this.statePostRetryTimer = undefined;
            this.flushStatePost(true);
        }, delay);
        this.statePostRetryTimer.unref?.();
    }
    private integration() {
        return new XshellTunnelIntegration_1.XshellIntegration({
            configuredPath: (0, XshellTunnelSetup_1.xshellExecutablePath)(this.setupConfig),
            workspaceRoot: workspaceRoot(),
            token: this.tunnelConfig.token,
        });
    }
    showTunnelTestToast() {
        const completion = tunnelTestCompletion(this.setupConfig, this.lastProbe, this.lastHealth, this.lastWorkerProbes, this.projectTopologyAssessment().hubAllowed);
        if (completion.ready) {
            void vscode.window.showInformationMessage(completion.message);
        }
        else {
            void vscode.window.showWarningMessage(`${completion.message}。${completion.issues.join("；")}`.trim());
        }
    }
    healthFromProbe(probe) {
        const state = probe.status === "ok" ? "agent_ok" : probe.status === "file_api_unavailable" ? "file_api_unavailable" : probe.status === "local_port_closed" ? "local_port_closed" : probe.status === "agent_project_mismatch" ? "agent_project_mismatch" : "agent_unreachable";
        return {
            state,
            status: state,
            checkedAt: new Date().toISOString(),
            localForwardPort: probe.localForwardPort,
            remoteAgentPort: probe.remoteAgentPort,
            latencyMs: probe.latencyMs,
            agentVersion: probe.agentVersion,
            fileApiOk: probe.fileApiOk,
            projectRoot: probe.projectRoot,
            expectedProjectRoot: probe.expectedProjectRoot,
            message: probe.message,
        };
    }
}
function firstRecord(...values) {
    return values.find((value) => value && typeof value === "object") || {};
}
function mergeFallbackRecords(...values) {
    const out = {};
    for (const value of values) {
        if (!value || typeof value !== "object")
            continue;
        Object.assign(out, value);
    }
    return out;
}
function mergeFallbackRows(values, keyOf, mergeRow = mergeFallbackRow) {
    const keyed = new Map();
    const unkeyed = [];
    values.forEach((rows) => {
        if (!Array.isArray(rows))
            return;
        rows.forEach((row) => {
            const key = keyOf(row);
            if (!key) {
                unkeyed.push(row);
                return;
            }
            const existing = keyed.get(key);
            keyed.set(key, existing === undefined ? row : mergeRow(existing, row));
        });
    });
    return [...unkeyed, ...keyed.values()];
}
function compactFallbackRowSources(values, compact) {
    return values.map((rows) => compact(Array.isArray(rows) ? rows : []));
}
function mergeFallbackRow(previous, incoming) {
    if (previous && incoming && typeof previous === "object" && typeof incoming === "object")
        return { ...previous, ...incoming };
    return incoming === undefined ? previous : incoming;
}
function mergeSchedulerFallbackRow(previous, incoming) {
    if (!(previous && incoming && typeof previous === "object" && typeof incoming === "object"))
        return mergeFallbackRow(previous, incoming);
    const previousRecord = previous;
    const incomingRecord = incoming;
    if (!schedulerStatusTerminal(schedulerRowStatus(previousRecord)) || schedulerStatusTerminal(schedulerRowStatus(incomingRecord)))
        return { ...previousRecord, ...incomingRecord };
    const merged = { ...incomingRecord, ...previousRecord };
    for (const key of ["workerLiveStatus", "worker_live_status", "workerPid", "worker_pid", "workerGpuIds", "worker_gpu_ids", "workerTelemetryWarning", "worker_telemetry_warning", "lastHeartbeatAt", "last_heartbeat_at"]) {
        if (incomingRecord[key] !== undefined)
            merged[key] = incomingRecord[key];
    }
    return merged;
}
function schedulerFallbackRowKey(row) {
    return schedulerRowKey(row) || fallbackPathKey(row);
}
function experimentTraceFallbackRowKey(row) {
    return experimentTraceKey(row) || fallbackPathKey(row);
}
function fallbackPathKey(row) {
    if (!row || typeof row !== "object")
        return "";
    return stringFromRecord(row, ["hub_job_dir", "worker_job_dir", "native_job_dir", "artifactPath", "artifact_path", "resultPath", "result_path", "path", "file"]);
}
function compactExperimentTraces(rows, protectedKeys = [], selectedPlan = {}) {
    const input = Array.isArray(rows) ? rows : [];
    if (input.length <= EXPERIMENT_TRACE_RECORD_LIMIT)
        return input;
    const protectedSet = new Set(protectedKeys.map((item) => String(item || "").trim()).filter(Boolean));
    const sortedInput = sortExperimentTraces(input);
    const out = [];
    const selectedKeys = new Set();
    const protectedRows = [];
    const selectedPlanRows = [];
    const attentionRows = [];
    const add = (row) => {
        if (out.length >= EXPERIMENT_TRACE_RECORD_LIMIT)
            return;
        const key = experimentTraceKey(row);
        if (key && selectedKeys.has(key))
            return;
        if (key)
            selectedKeys.add(key);
        out.push(row);
    };
    for (const row of sortedInput) {
        if (experimentTraceMatchesProtectedKey(row, protectedSet))
            protectedRows.push(row);
        if (experimentTraceMatchesSelectedPlan(row, selectedPlan))
            selectedPlanRows.push(row);
        if (attentionRows.length < EXPERIMENT_TRACE_ATTENTION_LIMIT && experimentTraceNeedsAttention(row))
            attentionRows.push(row);
    }
    protectedRows.forEach(add);
    selectedPlanRows.forEach(add);
    attentionRows.forEach(add);
    sortedInput.forEach(add);
    return out;
}
function sortExperimentTraces(rows) {
    return rows.map((row, index) => ({
        row,
        index,
        rank: experimentTraceRank(row),
        time: experimentTraceTime(row),
    })).sort((a, b) => a.rank - b.rank || b.time - a.time || a.index - b.index).map((item) => item.row);
}
function experimentTraceMatchesProtectedKey(row, protectedSet) {
    if (!protectedSet.size)
        return false;
    const key = experimentTraceKey(row);
    return Boolean(key && protectedSet.has(key));
}
function experimentTraceNeedsAttention(row) {
    if (!row || typeof row !== "object")
        return false;
    const item = row;
    const text = [
        stringFromRecord(item, ["status", "state", "archiveStatus", "archive_status", "artifact_state"]),
        stringFromRecord(item, ["resultStatus", "result_status", "parseStatus", "parse_status"]),
        stringFromRecord(item, ["deleteStatus", "delete_status", "deleted", "residue"]),
        stringFromRecord(item, ["error", "lastError", "message"]),
    ].join(" ").toLowerCase();
    return /fail|error|stalled|residue|missing|unsupported|缺失|失败|残留/.test(text);
}
function experimentTraceRank(row) {
    if (experimentTraceNeedsAttention(row))
        return 0;
    const status = experimentTraceStatus(row);
    if (["running", "testing", "queued", "pending"].includes(status))
        return 1;
    if (["completed", "done", "archived", "deleted"].includes(status))
        return 3;
    return 2;
}
function experimentTraceStatus(row) {
    if (!row || typeof row !== "object")
        return "";
    return stringFromRecord(row, ["status", "state", "archiveStatus", "archive_status", "artifact_state"]).toLowerCase();
}
function experimentTraceTime(row) {
    if (!row || typeof row !== "object")
        return 0;
    const item = row;
    const raw = stringFromRecord(item, ["updatedAt", "updated_at", "synced_at", "finished_at", "finishedAt", "generatedAt", "generated_at"]);
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}
function experimentTraceKey(row) {
    if (!row || typeof row !== "object")
        return "";
    const item = row;
    return stringFromRecord(item, [
        "id",
        "experimentId",
        "experiment_id",
        "runKey",
        "run_key",
        "run_id",
        "archiveKey",
        "archive_key",
        "global_job_id",
        "session",
    ]);
}
const schedulerBucketKeys = [
    "running_experiments",
    "testing_experiments",
    "queued_experiments",
    "pending_experiments",
    "failed_experiments",
    "stopped_experiments",
    "completed_experiments",
];
function compactSchedulerStates(rows, protectedKeys = []) {
    const input = Array.isArray(rows) ? rows : [];
    const protectedSet = new Set(protectedKeys.map((item) => String(item || "").trim()).filter(Boolean));
    if (!input.length)
        return [];
    const hasBuckets = input.some((row) => row && typeof row === "object" && schedulerBucketKeys.some((key) => Array.isArray(row[key])));
    if (!hasBuckets)
        return compactFlatSchedulerRows(input, protectedSet);
    return compactSchedulerContainersByExpandedRows(input, protectedSet);
}
function compactSchedulerContainer(row, protectedSet) {
    if (!row || typeof row !== "object")
        return row;
    const item = row;
    const out = { ...item };
    let omitted = 0;
    for (const bucket of schedulerBucketKeys) {
        const value = item[bucket];
        if (!Array.isArray(value))
            continue;
        const limit = schedulerBucketLimit(bucket);
        const compacted = compactSchedulerBucket(value, bucket, limit, protectedSet);
        out[bucket] = compacted.rows;
        if (compacted.omitted > 0) {
            out[`${bucket}_omitted`] = compacted.omitted;
            omitted += compacted.omitted;
        }
    }
    if (omitted > 0) {
        out.uiOmittedSchedulerRows = omitted;
        out.uiPayloadBudget = SCHEDULER_STATE_RECORD_LIMIT;
    }
    return out;
}
function compactSchedulerContainersByExpandedRows(rows, protectedSet) {
    const entries = [];
    rows.forEach((container, containerIndex) => {
        if (!container || typeof container !== "object")
            return;
        const item = container;
        for (const bucket of schedulerBucketKeys) {
            const bucketRows = item[bucket];
            if (!Array.isArray(bucketRows))
                continue;
            bucketRows.forEach((row, originalIndex) => {
                const key = schedulerRowKey(row) || `${containerIndex}:${bucket}:${originalIndex}`;
                entries.push({
                    containerIndex,
                    bucket,
                    row,
                    originalIndex,
                    priority: schedulerEntryPriority(row, bucket, protectedSet),
                    time: schedulerRowTime(row),
                    key,
                });
            });
        }
    });
    if (entries.length <= SCHEDULER_STATE_RECORD_LIMIT && rows.length <= SCHEDULER_STATE_CONTAINER_LIMIT) {
        return sortSchedulerContainers(rows.map((row) => compactSchedulerContainer(row, protectedSet)));
    }
    const selected = new Map();
    const selectedContainers = new Set();
    const sortedEntries = [...entries].sort((a, b) => a.priority - b.priority ||
        b.time - a.time ||
        a.containerIndex - b.containerIndex ||
        a.originalIndex - b.originalIndex ||
        String(a.key).localeCompare(String(b.key)));
    for (const entry of sortedEntries) {
        if (selected.size >= SCHEDULER_STATE_RECORD_LIMIT)
            break;
        const uniqueKey = entry.key || `${entry.containerIndex}:${entry.bucket}:${entry.originalIndex}`;
        if (selected.has(uniqueKey))
            continue;
        if (!selectedContainers.has(entry.containerIndex) && selectedContainers.size >= SCHEDULER_STATE_CONTAINER_LIMIT)
            continue;
        selected.set(uniqueKey, entry);
        selectedContainers.add(entry.containerIndex);
    }
    const selectedByContainer = new Map();
    for (const entry of selected.values()) {
        if (!selectedByContainer.has(entry.containerIndex))
            selectedByContainer.set(entry.containerIndex, new Map());
        const byBucket = selectedByContainer.get(entry.containerIndex);
        if (!byBucket.has(entry.bucket))
            byBucket.set(entry.bucket, []);
        byBucket.get(entry.bucket).push(entry.row);
    }
    const out = [];
    for (const [containerIndex, byBucket] of selectedByContainer.entries()) {
        const source = rows[containerIndex];
        if (!source || typeof source !== "object")
            continue;
        const item = source;
        const next = { ...item };
        let omitted = 0;
        let total = 0;
        for (const bucket of schedulerBucketKeys) {
            const bucketRows = item[bucket];
            if (!Array.isArray(bucketRows))
                continue;
            const kept = uniqueSchedulerRows(byBucket.get(bucket) || []);
            next[bucket] = kept;
            total += bucketRows.length;
            const bucketOmitted = Math.max(0, bucketRows.length - kept.length);
            if (bucketOmitted > 0) {
                next[`${bucket}_omitted`] = bucketOmitted;
                omitted += bucketOmitted;
            }
            else {
                delete next[`${bucket}_omitted`];
            }
        }
        if (omitted > 0) {
            next.uiOmittedSchedulerRows = omitted;
            next.uiTotalSchedulerRows = total;
            next.uiPayloadBudget = SCHEDULER_STATE_RECORD_LIMIT;
        }
        out.push(next);
    }
    return sortSchedulerContainers(out);
}
function compactSchedulerBucket(rows, bucket, limit, protectedSet) {
    if (rows.length <= limit)
        return { rows, omitted: 0 };
    const selected = [];
    const rest = [];
    for (const row of rows)
        (schedulerRowMatchesProtectedKey(row, protectedSet) ? selected : rest).push(row);
    const sortedRest = bucket === "queued_experiments" || bucket === "pending_experiments" ? rest : sortSchedulerRows(rest);
    const output = uniqueSchedulerRows([...selected, ...sortedRest]).slice(0, limit);
    return { rows: output, omitted: Math.max(0, rows.length - output.length) };
}
function compactFlatSchedulerRows(rows, protectedSet) {
    if (rows.length <= SCHEDULER_STATE_RECORD_LIMIT)
        return rows;
    const active = [];
    const rest = [];
    for (const row of rows) {
        if (schedulerRowMatchesProtectedKey(row, protectedSet) || schedulerStatusRank(schedulerRowStatus(row)) <= 3)
            active.push(row);
        else
            rest.push(row);
    }
    return uniqueSchedulerRows([...sortSchedulerRows(active), ...sortSchedulerRows(rest)]).slice(0, SCHEDULER_STATE_RECORD_LIMIT);
}
function schedulerBucketLimit(bucket) {
    if (bucket === "completed_experiments")
        return SCHEDULER_TERMINAL_BUCKET_LIMIT;
    return SCHEDULER_ACTIVE_BUCKET_LIMIT;
}
function schedulerEntryPriority(row, bucket, protectedSet) {
    if (schedulerRowMatchesProtectedKey(row, protectedSet))
        return 0;
    const status = schedulerRowStatus(row) || bucketStatusFromSchedulerBucket(bucket);
    if (["running", "testing", "in_progress"].includes(status))
        return 1;
    if (["failed", "stalled", "stopped", "cancelled", "canceled"].includes(status))
        return 2;
    if (["queued", "pending"].includes(status))
        return 3;
    if (["completed", "done", "archived"].includes(status))
        return 5;
    return 4;
}
function bucketStatusFromSchedulerBucket(bucket) {
    return bucket.replace("_experiments", "").replace("pending", "queued");
}
function sortSchedulerContainers(rows) {
    return [...rows].sort((a, b) => schedulerRowTime(b) - schedulerRowTime(a));
}
function sortSchedulerRows(rows) {
    return [...rows].sort((a, b) => schedulerStatusRank(schedulerRowStatus(a)) - schedulerStatusRank(schedulerRowStatus(b)) || schedulerRowTime(b) - schedulerRowTime(a));
}
function uniqueSchedulerRows(rows) {
    const seen = new Set();
    const out = [];
    for (const row of rows) {
        const key = schedulerRowKey(row);
        if (key && seen.has(key))
            continue;
        if (key)
            seen.add(key);
        out.push(row);
    }
    return out;
}
function schedulerRowMatchesProtectedKey(row, protectedSet) {
    if (!protectedSet.size)
        return false;
    const text = schedulerRowKey(row);
    return Boolean(text && protectedSet.has(text));
}
function schedulerRowKey(row) {
    if (!row || typeof row !== "object")
        return "";
    const item = row;
    return stringFromRecord(item, [
        "runKey",
        "run_key",
        "experimentId",
        "experiment_id",
        "archiveKey",
        "archive_key",
        "global_job_id",
        "session",
        "jobId",
        "job_id",
        "taskId",
        "task_id",
        "id",
    ]);
}
function schedulerRowStatus(row) {
    if (!row || typeof row !== "object")
        return "";
    return schedulerStatusToken(stringFromRecord(row, ["status", "state", "runStatus", "run_status"]));
}
function experimentTraceMatchesSelectedPlan(row, selectedPlan) {
    if (!row || typeof row !== "object" || !selectedPlan || typeof selectedPlan !== "object")
        return false;
    const planFile = normalizePlanSelectionKey(selectedPlan.planFile || "");
    const rowPlan = normalizePlanSelectionKey(row.planFile || row.plan_file || row.plan || "");
    if (!planFile || !rowPlan || !samePlanSelection(rowPlan, planFile))
        return false;
    const planRevision = String(selectedPlan.planRevision || "").trim();
    const rowRevision = String(row.planRevision || row.plan_revision || "").trim();
    if (planRevision && rowRevision)
        return planRevision === rowRevision;
    const updatedAt = Date.parse(String(selectedPlan.planUpdatedAt || ""));
    if (Number.isFinite(updatedAt))
        return experimentTraceTime(row) >= updatedAt;
    return !planRevision;
}
function schedulerStatusToken(status) {
    const value = String(status || "").trim().toLowerCase();
    if (value === "canceled")
        return "cancelled";
    if (value === "normal_completed")
        return "completed";
    if (value === "completed_with_errors")
        return "failed";
    if (value.includes("manual_interrupted"))
        return "stopped";
    return value;
}
function schedulerStatusRank(status) {
    const value = schedulerStatusToken(status);
    if (["running", "testing", "in_progress"].includes(value))
        return 0;
    if (["queued", "pending"].includes(value))
        return 1;
    if (["failed", "stalled", "stopped", "cancelled", "canceled"].includes(value))
        return 2;
    if (["completed", "done", "archived"].includes(value))
        return 4;
    return 3;
}
function schedulerStatusTerminal(status) {
    return ["completed", "done", "failed", "error", "stalled", "stopped", "cancelled", "archived", "deleted"].includes(schedulerStatusToken(status));
}
function schedulerRowTime(row) {
    if (!row || typeof row !== "object")
        return 0;
    const item = row;
    const raw = stringFromRecord(item, ["updatedAt", "updated_at", "finishedAt", "finished_at", "startedAt", "started_at", "generatedAt", "generated_at", "synced_at"]);
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}
function operationsRecord(value) {
    if (!value)
        return undefined;
    if (!Array.isArray(value))
        return value;
    return Object.fromEntries(value.map((item, index) => {
        const row = item;
        const key = String(row.operationId || row.opId || row.id || `operation-${index}`);
        return [key, item];
    }));
}
function mergeOperationRecords(...records) {
    const out = {};
    for (const record of records) {
        for (const [key, value] of Object.entries(record || {})) {
            if (operationTerminal(out[key]) && !operationTerminal(value))
                continue;
            out[key] = { ...(out[key] || {}), ...value };
        }
    }
    return out;
}
function compactOperationRecords(record, limit = STATE_OPERATION_RECORD_LIMIT, terminalLimit = TERMINAL_OPERATION_RECORD_LIMIT) {
    const entries = Object.entries(record || {});
    if (entries.length <= limit)
        return record && typeof record === "object" ? record : {};
    const sortedEntries = sortOperationEntries(entries);
    const active = [];
    const abnormal = [];
    const terminal = [];
    for (const entry of sortedEntries) {
        if (!operationTerminal(entry[1]))
            active.push(entry);
        else if (operationFailureTerminalStatus(operationStatusOf(entry[1])))
            abnormal.push(entry);
        else
            terminal.push(entry);
    }
    const out = new Map();
    const add = ([key, value]) => {
        if (!out.has(key))
            out.set(key, value);
    };
    active.forEach(add);
    abnormal.slice(0, ABNORMAL_OPERATION_RECORD_LIMIT).forEach(add);
    terminal.slice(0, terminalLimit).forEach(add);
    if (out.size < limit)
        sortedEntries.forEach((entry) => {
            if (out.size < limit)
                add(entry);
        });
    return Object.fromEntries(out);
}
function sortOperationEntries(entries) {
    return [...entries].sort((a, b) => operationTime(b[1]) - operationTime(a[1]) || String(b[0]).localeCompare(String(a[0])));
}
function operationTime(value) {
    if (!value || typeof value !== "object")
        return 0;
    const item = value;
    const raw = stringFromRecord(item, ["updatedAt", "updated_at", "finishedAt", "finished_at", "startedAt", "started_at", "generatedAt", "generated_at"]);
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}
function operationStatusOf(value) {
    if (!value || typeof value !== "object")
        return "";
    const item = value;
    return String(item.status || item.state || item.type || "");
}
const OPERATION_TERMINAL_STATUSES = new Set(["completed", "operation_completed", "completed_with_errors", "failed", "operation_failed", "cancelled", "canceled", "stalled", "unsupported", "error"]);
const OPERATION_FAILURE_TERMINAL_STATUSES = new Set(["completed_with_errors", "failed", "operation_failed", "stalled", "unsupported", "error"]);
const OPERATION_CANCELLED_TERMINAL_STATUSES = new Set(["cancelled", "canceled"]);
const REMOTE_ACTION_PENDING_STATUSES = new Set(["accepted", "submitted", "queued", "pending", "running", "progress", "in_progress", "operation_started"]);
const LONG_RUNNING_OPERATION_ACTIONS = new Set(["run-plan", "reproduce-plan"]);
const PROJECT_BOOTSTRAP_SUCCEEDED_STATUSES = new Set(["completed", "operation_completed", "done", "success", "succeeded"]);
const RESULT_SUMMARY_RECORD_ARRAY_FIELDS = new Set(["results", "finalResults", "final_results", "pendingReviewRecords", "pending_review_records"]);
const RESULT_REPARSE_ACTIONS = new Set(["archive-artifacts", "exclude-results", "delete-artifacts", "archive-worker-artifacts", "delete-worker-artifacts"]);
const RESULT_SUMMARY_AFFECTING_ACTIONS = new Set([
    "parse-results",
    "refresh-results",
    "run-quality-gate",
    "run-statistics",
    "export-paper-table",
    "check-claim-evidence",
    "check-output-contract",
    "parse-case-level",
    "run-leakage-check",
    "run-subgroup-analysis",
    "export-case-analysis",
    "plan-checkpoint-retention",
    "inspect-dataset",
    "export-plotting-contract",
    "infer-config-from-run",
    "recover-plan-from-run",
    "diagnose-result-anomaly",
    "compare-with-best-config",
    "archive-artifacts",
    "exclude-results",
    "sync-artifacts",
    "complete-three-way",
    "delete-artifacts",
    "reconcile-deletions",
    "archive-worker-artifacts",
    "delete-worker-artifacts",
]);
function operationTerminal(value) {
    if (!value || typeof value !== "object")
        return false;
    return operationTerminalStatus(operationStatusOf(value));
}
function operationTerminalStatus(value) {
    const text = operationStatusToken(value);
    return OPERATION_TERMINAL_STATUSES.has(text);
}
function operationFailureTerminalStatus(value) {
    const text = operationStatusToken(value);
    return OPERATION_FAILURE_TERMINAL_STATUSES.has(text);
}
function operationCancelledTerminalStatus(value) {
    const text = operationStatusToken(value);
    return OPERATION_CANCELLED_TERMINAL_STATUSES.has(text);
}
function remoteActionPendingStatus(value) {
    const text = operationStatusToken(value);
    return REMOTE_ACTION_PENDING_STATUSES.has(text);
}
function operationLongRunningAction(action) {
    return LONG_RUNNING_OPERATION_ACTIONS.has(String(action || "").trim().toLowerCase());
}
function operationSubmissionAccepted(value) {
    if (!value || typeof value !== "object")
        return false;
    const item = value;
    const payload = item.payload && typeof item.payload === "object" ? item.payload : {};
    const latestEvent = item.latestEvent && typeof item.latestEvent === "object" ? item.latestEvent : {};
    const latestPayload = latestEvent.payload && typeof latestEvent.payload === "object" ? latestEvent.payload : {};
    return [item, payload, latestPayload].some((row) => row.submissionAccepted === true || row.schedulerStarted === true);
}
function operationPlanFields(request) {
    const body = request && typeof request === "object" ? request : {};
    const options = body.options && typeof body.options === "object" ? body.options : {};
    const planFile = usableSelectionKey(String(body.planFile || body.plan || body.selectedPlanId || options.planFile || options.plan || options.selectedPlanId || ""));
    const selectedPlanId = usableSelectionKey(String(body.selectedPlanId || options.selectedPlanId || planFile || ""));
    const planRevision = String(body.planRevision || body.plan_revision || options.planRevision || options.plan_revision || "").trim();
    const workerSetRevision = String(body.workerSetRevision || options.workerSetRevision || "").trim();
    const schedulerOwnerWorkerId = String(body.schedulerOwnerWorkerId || options.schedulerOwnerWorkerId || "").trim();
    const assignedExperimentIndices = uniqueNumbers(body.assignedExperimentIndices || options.assignedExperimentIndices || []);
    const debugMode = body.debugMode === true || options.debugMode === true;
    const debugRunId = String(body.debugRunId || options.debugRunId || "").trim();
    if (!planFile && !selectedPlanId)
        return {};
    return {
        ...(planFile ? { planFile } : {}),
        ...(selectedPlanId ? { selectedPlanId } : {}),
        ...(planRevision ? { planRevision } : {}),
        ...(workerSetRevision ? { workerSetRevision } : {}),
        ...(schedulerOwnerWorkerId ? { schedulerOwnerWorkerId, workerId: schedulerOwnerWorkerId } : {}),
        ...(assignedExperimentIndices.length ? { assignedExperimentIndices } : {}),
        debugMode,
        ...(debugRunId ? { debugRunId } : {}),
    };
}
function uniqueNumbers(values) {
    return [...new Set((Array.isArray(values) ? values : []).map(Number).filter((value) => Number.isInteger(value) && value >= 0))].sort((a, b) => a - b);
}
function sameNumberArray(left, right) {
    const a = uniqueNumbers(left);
    const b = uniqueNumbers(right);
    return a.length === b.length && a.every((value, index) => value === b[index]);
}
function planValidationExperimentIndices(result) {
    const item = result && typeof result === "object" ? result : {};
    const validation = item.validation && typeof item.validation === "object" ? item.validation : {};
    const jobs = Array.isArray(validation.jobs) ? validation.jobs : [];
    const indices = uniqueNumbers(jobs.map((job) => Number(job?.index)));
    if (indices.length)
        return indices;
    const count = Number(item.jobCount || validation.job_count || 0);
    return Number.isInteger(count) && count > 0 ? Array.from({ length: count }, (_, index) => index) : [];
}
function workerPoolAggregateResult(action, submissions, shardSet) {
    const rows = (Array.isArray(submissions) ? submissions : []).map(({ workerId, result }) => ({
        workerId,
        status: resultStatus(result) || "completed",
        operationId: stringFromRecord(result && typeof result === "object" ? result : {}, ["operationId", "opId", "id"]),
        result,
    }));
    const pending = rows.some((row) => remoteActionPendingStatus(row.status));
    return {
        schemaVersion: 1,
        action,
        status: pending ? "accepted" : "completed",
        workerSetRevision: shardSet.workerSetRevision,
        workerPlanShardSet: shardSet,
        workerSubmissions: rows,
        message: `${rows.length} 个 Worker ${pending ? "已接收独立分片，等待终态" : "已完成本机操作"}`,
    };
}
function workerResultAggregateResult(action, submissions) {
    const rows = (Array.isArray(submissions) ? submissions : []).map(({ workerId, result }) => ({
        workerId,
        status: resultStatus(result) || "completed",
        operationId: stringFromRecord(result && typeof result === "object" ? result : {}, ["operationId", "opId", "id"]),
        result,
    }));
    const failed = rows.filter((row) => operationFailureTerminalStatus(row.status) || operationCancelledTerminalStatus(row.status));
    const failedWorkerIds = failed.map((row) => row.workerId);
    const completedWorkerIds = rows.filter((row) => !failedWorkerIds.includes(row.workerId)).map((row) => row.workerId);
    return {
        schemaVersion: 1,
        action,
        status: failed.length ? "completed_with_errors" : "completed",
        workerSubmissions: rows,
        failedWorkerIds,
        completedWorkerIds,
        message: failed.length
            ? `${failed.length}/${rows.length} 个 Worker 结果操作未完成；失败 Worker：${failedWorkerIds.join("、")}${completedWorkerIds.length ? `；成功 Worker：${completedWorkerIds.join("、")}` : ""}`
            : `${rows.length} 个 Worker 已完成各自的结果操作`,
    };
}
function operationResultPlanFile(record) {
    const item = record && typeof record === "object" ? record : {};
    const options = item.options && typeof item.options === "object" ? item.options : {};
    const payload = item.payload && typeof item.payload === "object" ? item.payload : {};
    return usableSelectionKey(String(item.planFile || item.plan_file || item.plan || item.selectedPlanId || item.selected_plan_id || options.planFile || options.plan || options.selectedPlanId || payload.planFile || payload.plan || payload.selectedPlanId || ""));
}
function debugModeFromRecord(record) {
    const item = record && typeof record === "object" ? record : {};
    const options = item.options && typeof item.options === "object" ? item.options : {};
    const payload = item.payload && typeof item.payload === "object" ? item.payload : {};
    const latestEvent = item.latestEvent && typeof item.latestEvent === "object" ? item.latestEvent : {};
    const latestPayload = latestEvent.payload && typeof latestEvent.payload === "object" ? latestEvent.payload : {};
    return [item, options, payload, payload.options, latestEvent, latestPayload].some((row) => {
        if (!row || typeof row !== "object")
            return false;
        const mode = row.debugMode ?? row.debug_mode;
        if (mode === true || String(mode || "").trim().toLowerCase() === "true")
            return true;
        const output = String(row.debugOutputDir || row.debug_output_dir || "").replace(/\\/g, "/").replace(/^\/+/, "");
        return output.startsWith("zlk_cluster/debug_runs/");
    });
}
function operationDebugMode(record, payloads) {
    return [record, ...(Array.isArray(payloads) ? payloads : [])].some((item) => debugModeFromRecord(item));
}
function actionAffectsResultsSummary(action) {
    return RESULT_SUMMARY_AFFECTING_ACTIONS.has(action);
}
function operationStatusToken(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}
function extractPlans(value) {
    if (!value || typeof value !== "object")
        return [];
    const item = value;
    const rows = Array.isArray(item.plans)
        ? item.plans
        : Array.isArray(item.diagnostics?.plans)
            ? item.diagnostics.plans
            : [];
    const out = [];
    for (const row of rows) {
        const plan = row;
        const planFile = stringFromRecord(plan, ["planFile", "plan_file", "file", "path"]);
        if (!planFile)
            continue;
        out.push({
            planId: stringFromRecord(plan, ["planId", "plan_id", "id"]) || planFile,
            planFile,
            suite: stringFromRecord(plan, ["suite", "name"]),
            status: stringFromRecord(plan, ["status", "state"]),
        });
    }
    return out;
}
function mergeRecentPlans(...groups) {
    const map = new Map();
    for (const row of groups.flat()) {
        if (!row || typeof row !== "object")
            continue;
        const planId = String(row.planId || row.plan_id || row.id || "").trim();
        const planFile = String(row.planFile || row.plan_file || row.file || "").trim();
        const key = planId || planFile;
        if (!key)
            continue;
        map.set(key, {
            planId: planId || planFile,
            planFile: planFile || planId,
            suite: String(row.suite || row.name || "").trim(),
            status: String(row.status || row.state || "").trim(),
        });
    }
    return [...map.values()].slice(-20).reverse();
}
const PROJECT_PLAN_SELECTION_PATH = "zlk_cluster/ui/plan_selection.json";
async function readProjectPlanSelectionState(root) {
    if (!root)
        return undefined;
    const fullPath = path.join(root, ...PROJECT_PLAN_SELECTION_PATH.split("/"));
    try {
        const text = await fs.readFile(fullPath, "utf8");
        const data = JSON.parse(text);
        if (!data || typeof data !== "object")
            return undefined;
        return {
            selectedPlanId: usableSelectionKey(String(data.selectedPlanId || data.selected_plan_id || "")),
            planFileInput: usableSelectionKey(String(data.planFileInput || data.plan_file || data.planFile || "")),
            recentPlans: Array.isArray(data.recentPlans) ? data.recentPlans : Array.isArray(data.recent_plans) ? data.recent_plans : [],
            updatedAt: String(data.updatedAt || data.updated_at || ""),
        };
    }
    catch {
        return undefined;
    }
}
async function writeProjectPlanSelectionState(root, state) {
    if (!root)
        return;
    const fullPath = path.join(root, ...PROJECT_PLAN_SELECTION_PATH.split("/"));
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const payload = {
        schemaVersion: 1,
        selectedPlanId: usableSelectionKey(String(state?.selectedPlanId || "")),
        planFileInput: usableSelectionKey(String(state?.planFileInput || "")),
        recentPlans: mergeRecentPlans(state?.recentPlans || []),
        updatedAt: String(state?.updatedAt || new Date().toISOString()),
    };
    await fs.writeFile(fullPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
const PROJECT_TASK_SELECTION_PATH = "zlk_cluster/ui/task_selection.json";
function normalizeSelectionList(values, limit = 200) {
    return uniqueStrings((Array.isArray(values) ? values : []).map((item) => usableSelectionKey(String(item || ""))).filter(Boolean)).slice(0, limit);
}
async function readProjectTaskSelectionState(root) {
    if (!root)
        return undefined;
    const fullPath = path.join(root, ...PROJECT_TASK_SELECTION_PATH.split("/"));
    try {
        const text = await fs.readFile(fullPath, "utf8");
        const data = JSON.parse(text);
        if (!data || typeof data !== "object")
            return undefined;
        return {
            selectedExperimentIds: normalizeSelectionList(data.selectedExperimentIds || data.selected_experiment_ids),
            selectedRunKeys: normalizeSelectionList(data.selectedRunKeys || data.selected_run_keys),
            selectedArchiveKeys: normalizeSelectionList(data.selectedArchiveKeys || data.selected_archive_keys),
            selectedTaskUiKeys: normalizeSelectionList(data.selectedTaskUiKeys || data.selected_task_ui_keys),
            hiddenLegacyTaskUiKeys: normalizeSelectionList(data.hiddenLegacyTaskUiKeys || data.hidden_legacy_task_ui_keys, 500),
            selectedRunKey: usableSelectionKey(String(data.selectedRunKey || data.selected_run_key || "")),
            selectedLogRunKey: usableSelectionKey(String(data.selectedLogRunKey || data.selected_log_run_key || "")),
            updatedAt: String(data.updatedAt || data.updated_at || ""),
        };
    }
    catch {
        return undefined;
    }
}
async function writeProjectTaskSelectionState(root, state) {
    if (!root)
        return;
    const fullPath = path.join(root, ...PROJECT_TASK_SELECTION_PATH.split("/"));
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const selectedRunKeys = normalizeSelectionList(state?.selectedRunKeys);
    const selectedRunKey = usableSelectionKey(String(state?.selectedRunKey || "")) || selectedRunKeys[selectedRunKeys.length - 1] || "";
    const payload = {
        schemaVersion: 1,
        selectedExperimentIds: normalizeSelectionList(state?.selectedExperimentIds),
        selectedRunKeys,
        selectedArchiveKeys: normalizeSelectionList(state?.selectedArchiveKeys),
        selectedTaskUiKeys: normalizeSelectionList(state?.selectedTaskUiKeys),
        hiddenLegacyTaskUiKeys: normalizeSelectionList(state?.hiddenLegacyTaskUiKeys, 500),
        selectedRunKey,
        selectedLogRunKey: usableSelectionKey(String(state?.selectedLogRunKey || "")),
        updatedAt: String(state?.updatedAt || new Date().toISOString()),
    };
    await fs.writeFile(fullPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
const PROJECT_OFFLINE_BUNDLE_PATH = "zlk_cluster/ui/offline_bundle.json";
async function readProjectOfflineBundleState(root) {
    if (!root)
        return undefined;
    const fullPath = path.join(root, ...PROJECT_OFFLINE_BUNDLE_PATH.split("/"));
    try {
        const text = await fs.readFile(fullPath, "utf8");
        const data = JSON.parse(text);
        if (!data || typeof data !== "object")
            return undefined;
        if (data.bundle && typeof data.bundle === "object")
            return data.bundle;
        if (data.snapshot || data.lastImportedAt || data.schemaVersion)
            return data;
        return undefined;
    }
    catch {
        return undefined;
    }
}
async function writeProjectOfflineBundleState(root, bundle) {
    if (!root)
        return;
    const fullPath = path.join(root, ...PROJECT_OFFLINE_BUNDLE_PATH.split("/"));
    if (!bundle) {
        try {
            await fs.unlink(fullPath);
        }
        catch {
            // ignore missing file
        }
        return;
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const payload = {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        bundle,
    };
    await fs.writeFile(fullPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
const PROJECT_ACTION_ERRORS_PATH = "zlk_cluster/ui/action_errors.json";
function normalizeActionErrorRow(value) {
    const row = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const command = String(row.command || "").trim();
    const message = String(row.message || "").trim();
    if (!command && !message)
        return undefined;
    const capabilityMissing = Array.isArray(row.capabilityMissing)
        ? row.capabilityMissing.map((item) => String(item || "").trim()).filter(Boolean).slice(0, UI_ACTION_ERROR_CAPABILITY_LIMIT)
        : [];
    return {
        command: command || "unknown",
        ...(row.action ? { action: String(row.action) } : {}),
        message: message || "未知错误",
        ...(row.suggestion ? { suggestion: String(row.suggestion) } : {}),
        ...(capabilityMissing.length ? { capabilityMissing } : {}),
        timestamp: String(row.timestamp || new Date().toISOString()),
    };
}
async function readProjectActionErrorsState(root) {
    if (!root)
        return [];
    const fullPath = path.join(root, ...PROJECT_ACTION_ERRORS_PATH.split("/"));
    try {
        const text = await fs.readFile(fullPath, "utf8");
        const data = JSON.parse(text);
        const rows = Array.isArray(data)
            ? data
            : Array.isArray(data?.errors)
                ? data.errors
                : Array.isArray(data?.actionErrors)
                    ? data.actionErrors
                    : [];
        return rows.map(normalizeActionErrorRow).filter(Boolean).slice(0, UI_ACTION_ERROR_RECORD_LIMIT);
    }
    catch {
        return [];
    }
}
async function writeProjectActionErrorsState(root, errors) {
    if (!root)
        return;
    const fullPath = path.join(root, ...PROJECT_ACTION_ERRORS_PATH.split("/"));
    const rows = (Array.isArray(errors) ? errors : []).map(normalizeActionErrorRow).filter(Boolean).slice(0, UI_ACTION_ERROR_RECORD_LIMIT);
    if (!rows.length) {
        try {
            await fs.unlink(fullPath);
        }
        catch {
            // ignore missing file
        }
        return;
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const payload = {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        errors: rows,
    };
    await fs.writeFile(fullPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
const PROJECT_PPT_PLOT_CONFIG_PATH = "zlk_cluster/ui/ppt_plot_config.json";
function normalizePptPlotConfig(value) {
    const row = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const chartType = String(row.chartType || row.chart_type || "auto").trim() || "auto";
    const styleMode = String(row.styleMode || row.style_mode || "activePpt").trim() || "activePpt";
    return {
        presentationPath: String(row.presentationPath || row.presentation_path || "").trim(),
        chartType,
        styleMode,
    };
}
async function readProjectPptPlotConfigState(root) {
    if (!root)
        return undefined;
    const fullPath = path.join(root, ...PROJECT_PPT_PLOT_CONFIG_PATH.split("/"));
    try {
        const text = await fs.readFile(fullPath, "utf8");
        const data = JSON.parse(text);
        if (!data || typeof data !== "object")
            return undefined;
        const raw = data.config && typeof data.config === "object" ? data.config : data;
        return normalizePptPlotConfig(raw);
    }
    catch {
        return undefined;
    }
}
async function writeProjectPptPlotConfigState(root, config) {
    if (!root)
        return;
    const fullPath = path.join(root, ...PROJECT_PPT_PLOT_CONFIG_PATH.split("/"));
    if (!config) {
        try {
            await fs.unlink(fullPath);
        }
        catch {
            // ignore missing file
        }
        return;
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const payload = {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        config: normalizePptPlotConfig(config),
    };
    await fs.writeFile(fullPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
const PROJECT_PPT_PATH_CONFIRMATIONS_PATH = "zlk_cluster/ui/ppt_path_confirmations.json";
const PPT_PLOT_REQUEST_AUDIT_DIR = "zlk_cluster/results/ppt_plot_requests";
function normalizePptPathConfirmationTarget(presentationPath, projectRoot = "") {
    const raw = String(presentationPath || "").trim();
    if (!raw) {
        return {
            key: "ppt:<new-presentation>",
            presentationPath: "",
            displayPath: "新建 PPT（文件位置由 PPT 插件生成）",
            confirmedAt: "",
        };
    }
    const resolved = path.resolve(String(projectRoot || process.cwd()), raw);
    const canonical = (process.platform === "win32" ? resolved.toLowerCase() : resolved).replace(/\\/g, "/");
    return {
        key: `ppt:${canonical}`,
        presentationPath: resolved,
        displayPath: resolved,
        confirmedAt: "",
    };
}
function normalizePptPathConfirmations(rows) {
    const byKey = new Map();
    for (const raw of Array.isArray(rows) ? rows : []) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw))
            continue;
        const target = normalizePptPathConfirmationTarget(raw.presentationPath || raw.presentation_path || "", "");
        const key = String(raw.key || target.key).trim();
        if (!key)
            continue;
        byKey.set(key, {
            key,
            presentationPath: target.presentationPath,
            displayPath: String(raw.displayPath || raw.display_path || target.displayPath).trim() || target.displayPath,
            confirmedAt: String(raw.confirmedAt || raw.confirmed_at || "").trim(),
        });
    }
    return [...byKey.values()];
}
function mergePptPathConfirmations(...groups) {
    return normalizePptPathConfirmations(groups.flatMap((group) => Array.isArray(group) ? group : []))
        .sort((left, right) => String(right.confirmedAt || "").localeCompare(String(left.confirmedAt || "")))
        .slice(0, 100);
}
function pptPathTargetConfirmed(confirmations, target) {
    const key = String(target?.key || "").trim();
    return Boolean(key) && normalizePptPathConfirmations(confirmations).some((item) => item.key === key);
}
function pptPlotConfirmationDetail(input, target) {
    const sourcePaths = uniqueStrings((Array.isArray(input?.sourcePaths) ? input.sourcePaths : []).map((item) => String(item || "").trim()).filter(Boolean));
    const chartLabels = { auto: "自动", leaderboardBar: "柱状", meanStdErrorBar: "误差图", genericTable: "表格" };
    const styleLabels = { activePpt: "跟随当前 PPT", default: "默认样式" };
    const chartType = String(input?.chartType || "auto").trim() || "auto";
    const styleMode = String(input?.styleMode || "activePpt").trim() || "activePpt";
    const auditDir = path.join(String(input?.projectRoot || "").trim(), ...PPT_PLOT_REQUEST_AUDIT_DIR.split("/"));
    return [
        "【强制确认】绘图到 PPT",
        "",
        "请核对当前 Plan、最终结果源和完整 PPT 目标位置。确认前不会调用 PPT 插件，也不会生成绘图请求审计。",
        `本地项目目录：${String(input?.projectRoot || "未打开").trim() || "未打开"}`,
        `当前 Plan：${String(input?.planFile || "未选择").trim() || "未选择"}`,
        `Plan revision：${String(input?.planRevision || "未记录").trim() || "未记录"}`,
        "",
        "最终结果源文件：",
        ...(sourcePaths.length ? sourcePaths.map((item) => `  - ${item}`) : ["  - 未找到"]),
        `PPT 绘图契约：${String(input?.plottingContractPath || "未找到").trim() || "未找到"}`,
        `目标 PPT：${String(target?.displayPath || "新建 PPT").trim() || "新建 PPT"}`,
        `本地请求审计目录：${auditDir || PPT_PLOT_REQUEST_AUDIT_DIR}`,
        `图类型：${chartLabels[chartType] || chartType}`,
        `样式：${styleLabels[styleMode] || styleMode}`,
        "",
        "仅已归档结果生成的最终统计或论文表可作为数值绘图输入；临时预览 CSV 不会提交。",
        "执行绘图请求时会在上述目录写入轻量 JSON 请求和响应审计；取消不会创建请求审计或调用 PPT 插件。",
        "选择“不再提醒”只对当前本地项目和完全相同的 PPT 目标生效；目标路径变化后会再次确认。",
    ].join("\n");
}
function pptPlotAuditRelativePath(projectRoot, auditPath) {
    const root = path.resolve(String(projectRoot || ""));
    const fullPath = path.resolve(String(auditPath || ""));
    const relative = path.relative(root, fullPath);
    if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative))
        throw new Error(`PPT 绘图审计路径不在当前项目内：${String(auditPath || "未提供")}`);
    return relative.replace(/\\/g, "/");
}
async function readProjectPptPathConfirmationsState(root) {
    if (!root)
        return [];
    const fullPath = path.join(root, ...PROJECT_PPT_PATH_CONFIRMATIONS_PATH.split("/"));
    try {
        const text = await fs.readFile(fullPath, "utf8");
        const data = JSON.parse(text);
        return normalizePptPathConfirmations(Array.isArray(data) ? data : data?.confirmations);
    }
    catch {
        return [];
    }
}
async function writeProjectPptPathConfirmationsState(root, confirmations) {
    if (!root)
        return;
    const fullPath = path.join(root, ...PROJECT_PPT_PATH_CONFIRMATIONS_PATH.split("/"));
    const normalized = mergePptPathConfirmations(confirmations);
    if (!normalized.length) {
        try {
            await fs.unlink(fullPath);
        }
        catch {
            // ignore missing file
        }
        return;
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const payload = {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        confirmations: normalized,
    };
    await fs.writeFile(fullPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
const PROJECT_UI_LAYOUT_PATH = "zlk_cluster/ui/ui_layout.json";
async function readProjectUiLayoutState(root) {
    if (!root)
        return undefined;
    const fullPath = path.join(root, ...PROJECT_UI_LAYOUT_PATH.split("/"));
    try {
        const text = await fs.readFile(fullPath, "utf8");
        const data = JSON.parse(text);
        if (!data || typeof data !== "object")
            return undefined;
        const raw = data.layout && typeof data.layout === "object" ? data.layout : data;
        return normalizeUiProjectLayoutState(raw, defaultUiLayout);
    }
    catch {
        return undefined;
    }
}
async function writeProjectUiLayoutState(root, layout) {
    if (!root)
        return;
    const fullPath = path.join(root, ...PROJECT_UI_LAYOUT_PATH.split("/"));
    if (!layout) {
        try {
            await fs.unlink(fullPath);
        }
        catch {
            // ignore missing file
        }
        return;
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const payload = {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        layout: projectUiLayoutState(normalizeUiLayout({ ...defaultUiLayout, ...layout })),
    };
    await fs.writeFile(fullPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
const PROJECT_DEBUG_BUNDLE_PATH = "zlk_cluster/ui/debug_bundle.json";
function normalizeDebugBundlePath(value) {
    const text = String(value || "").trim().replace(/\\/g, "/");
    return text && text !== "-" ? text : "";
}
async function readProjectDebugBundleState(root) {
    if (!root)
        return undefined;
    const fullPath = path.join(root, ...PROJECT_DEBUG_BUNDLE_PATH.split("/"));
    try {
        const text = await fs.readFile(fullPath, "utf8");
        const data = JSON.parse(text);
        if (!data || typeof data !== "object")
            return undefined;
        const raw = data.debugBundlePath || data.bundlePath || data.path || data.debug_bundle_path || "";
        const normalized = normalizeDebugBundlePath(raw);
        return normalized || undefined;
    }
    catch {
        return undefined;
    }
}
async function writeProjectDebugBundleState(root, debugBundlePath) {
    if (!root)
        return;
    const fullPath = path.join(root, ...PROJECT_DEBUG_BUNDLE_PATH.split("/"));
    const normalized = normalizeDebugBundlePath(debugBundlePath);
    if (!normalized) {
        try {
            await fs.unlink(fullPath);
        }
        catch {
            // ignore missing file
        }
        return;
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const payload = {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        debugBundlePath: normalized,
    };
    await fs.writeFile(fullPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
const PROJECT_CODE_SYNC_PATH = "zlk_cluster/ui/code_sync.json";
const PROJECT_REMOTE_PATH_CONFIRMATIONS_PATH = "zlk_cluster/ui/remote_path_confirmations.json";
const PROJECT_LOCAL_OPERATIONS_PATH = "zlk_cluster/ui/local_operations.json";
const PROJECT_LOCAL_PLAN_METADATA_PATH = "zlk_cluster/ui/local_plan_metadata.json";
function normalizeRemoteWriteTargets(targets) {
    const byKey = new Map();
    for (const raw of Array.isArray(targets) ? targets : []) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw))
            continue;
        const host = String(raw.host || raw.sftpHost || raw.sshHost || "").trim();
        const user = String(raw.user || raw.username || "").trim();
        const portValue = Number(raw.port || raw.sshPort || 22);
        const port = Number.isFinite(portValue) && portValue > 0 ? Math.trunc(portValue) : 22;
        const remotePath = normalizeRemoteWorkRoot(raw.remotePath);
        if (!host || !user || !remotePath)
            continue;
        const relatedLocations = (Array.isArray(raw.relatedLocations) ? raw.relatedLocations : [])
            .map((item) => item && typeof item === "object" && !Array.isArray(item) ? {
            label: String(item.label || "关联位置").trim(),
            path: normalizeRemoteWorkRoot(item.path || item.remotePath),
        } : undefined)
            .filter((item) => item?.path)
            .slice(0, 8);
        const keyPaths = [remotePath, ...relatedLocations.map((item) => item.path)].sort((a, b) => a.localeCompare(b));
        const key = `${user}@${host.toLowerCase()}:${port}:${keyPaths.join("|")}`;
        const expectedFiles = uniqueStrings((Array.isArray(raw.expectedFiles) ? raw.expectedFiles : [])
            .map((file) => String(file || "").trim().replace(/\\/g, "/"))
            .filter(Boolean)).slice(0, 12);
        const expectedCountValue = Number(raw.expectedFileCount);
        const expectedFileCount = Number.isFinite(expectedCountValue) && expectedCountValue > 0
            ? Math.max(expectedFiles.length, Math.trunc(expectedCountValue))
            : expectedFiles.length;
        byKey.set(key, {
            key,
            id: String(raw.id || raw.targetId || "").trim(),
            role: String(raw.role || raw.targetRole || "").trim(),
            label: String(raw.label || raw.displayName || raw.id || raw.targetId || host).trim(),
            host,
            user,
            port,
            remotePath,
            relatedLocations,
            expectedFiles,
            expectedFileCount,
            confirmedAt: String(raw.confirmedAt || raw.confirmed_at || "").trim(),
        });
    }
    return [...byKey.values()];
}
function debugModeBlockedUiCommand(command) {
    return new Set([
        "runAllPlans", "archivePlan", "restoreArchivedPlan", "archiveArtifacts", "excludeResults", "syncArtifacts", "completeThreeWay", "deleteArtifacts", "reconcileDeletions",
        "parseResults", "refreshResults", "runQualityGate", "runStatistics", "checkClaimEvidence", "exportPaperTable", "checkOutputContract",
        "parseCaseLevel", "runLeakageCheck", "runSubgroupAnalysis", "exportCaseAnalysis", "planCheckpointRetention", "exportPlottingContract",
        "inspectDataset", "createOfflineBundle", "plotResultsToPpt", "inferConfigFromRun", "recoverPlanFromRun", "diagnoseResultAnomaly", "compareWithBestConfig",
    ]).has(String(command || ""));
}
function mergeRemotePathConfirmations(...groups) {
    const merged = normalizeRemoteWriteTargets(groups.flatMap((group) => Array.isArray(group) ? group : []));
    return merged
        .sort((left, right) => String(right.confirmedAt || "").localeCompare(String(left.confirmedAt || "")))
        .slice(0, 200);
}
function remoteWriteTargetsConfirmed(confirmations, targets) {
    const approved = new Set(normalizeRemoteWriteTargets(confirmations).map((item) => item.key));
    const requested = normalizeRemoteWriteTargets(targets);
    return requested.length > 0 && requested.every((item) => approved.has(item.key));
}
function remoteWriteConfirmationDetail(operation, targets, localProjectRoot = "") {
    const normalized = normalizeRemoteWriteTargets(targets);
    const lines = [
        `【强制路径确认】${String(operation || "远端写入")}`,
        "",
        "请核对服务器、账号以及完整预期位置。确认前不会写入远端文件。",
        `本地项目目录：${String(localProjectRoot || "未打开").trim() || "未打开"}`,
    ];
    for (const target of normalized) {
        const role = target.role ? ` / ${target.role}` : "";
        lines.push("", `${target.label}${role}  ${target.user}@${target.host}:${target.port}`, `预期远端目录：${target.remotePath}`);
        for (const location of target.relatedLocations)
            lines.push(`${location.label}：${location.path}`);
        if (target.expectedFiles.length)
            lines.push(`预期远端文件位置（已列 ${target.expectedFiles.length} / 共 ${target.expectedFileCount}）：`);
        for (const file of target.expectedFiles)
            lines.push(`  - ${file}`);
        if (target.expectedFileCount > target.expectedFiles.length)
            lines.push(`其余 ${target.expectedFileCount - target.expectedFiles.length} 个预期文件均位于上述远端目录内。`);
    }
    lines.push("", "选择“不再提醒”只对当前本地项目、当前服务器账号和完全相同的路径生效；服务器或路径变化后会再次确认。");
    return lines.join("\n");
}
function agentStartupWriteConfirmationDetail(startupTargets, runtimeTargets, includeRuntimeUpload) {
    const sessions = (Array.isArray(startupTargets) ? startupTargets : [])
        .filter((item) => item && typeof item === "object" && !Array.isArray(item) && String(item.filePath || "").trim());
    const runtimes = normalizeRemoteWriteTargets(runtimeTargets);
    const lines = [
        includeRuntimeUpload ? "【强制确认】准备 Agent 并启动" : "【强制确认】写入 Agent 自启动路径",
        "",
        `本地 Xshell 会话文件（${sessions.length} 个）：`,
        ...(sessions.length ? sessions.flatMap((item) => {
            const id = String(item.id || "Agent").trim() || "Agent";
            const filePath = String(item.filePath || "").trim();
            return [`- ${id} 会话：${filePath}`, `- ${id} 固定备份：${filePath}.zlk-backup`];
        }) : ["- 未配置"]),
        "",
        includeRuntimeUpload ? "预期上传的远端文件位置：" : "Agent 启动后使用的预期远端文件位置（本操作不上传）：",
    ];
    if (!runtimes.length) {
        lines.push("- 未配置");
    }
    for (const target of runtimes) {
        lines.push(`- ${target.label} / ${target.role || "Agent"}：${target.user}@${target.host}:${target.port}`);
        if (target.expectedFiles.length) {
            for (const file of target.expectedFiles)
                lines.push(`  - ${file}`);
        }
        else {
            lines.push(`  - ${target.remotePath}`);
        }
        for (const location of target.relatedLocations)
            lines.push(`  - ${location.label}：${location.path}`);
    }
    lines.push("");
    if (includeRuntimeUpload) {
        lines.push(`将一次完成 ${sessions.length} 个端点的首次准备：`, "1. 写入上述本地 .xsh 的受管 RemoteCommand，并创建固定备份", "2. 通过 SimpleSFTP 上传上述 Agent runtime 文件", "3. 打开 Hub/Worker Xshell 会话", "4. 等待启动后检测全部本地隧道");
    }
    else {
        lines.push("本操作只写入上述本地 .xsh 及固定备份，不上传远端文件，也不会修改 X11、Host、User、端口转发或其它会话项。");
    }
    lines.push("已有非 SimpleExperiment RemoteCommand 时会停止且不会覆盖。");
    return lines.join("\n");
}
function codeSyncConfirmationLabel(scope) {
    if (scope === "plan-check")
        return "校验或预演前上传 Hub 项目代码";
    if (scope === "run")
        return "提交实验前上传 Hub/Worker 项目代码";
    if (scope === "hub")
        return "上传项目代码到 Hub";
    if (scope === "workers")
        return "上传项目代码到 Worker";
    return "上传项目代码";
}
async function readProjectRemotePathConfirmationsState(root) {
    if (!root)
        return [];
    const fullPath = path.join(root, ...PROJECT_REMOTE_PATH_CONFIRMATIONS_PATH.split("/"));
    try {
        const text = await fs.readFile(fullPath, "utf8");
        const data = JSON.parse(text);
        return normalizeRemoteWriteTargets(Array.isArray(data) ? data : data?.confirmations);
    }
    catch {
        return [];
    }
}
async function writeProjectRemotePathConfirmationsState(root, confirmations) {
    if (!root)
        return;
    const fullPath = path.join(root, ...PROJECT_REMOTE_PATH_CONFIRMATIONS_PATH.split("/"));
    const normalized = mergeRemotePathConfirmations(confirmations);
    if (!normalized.length) {
        try {
            await fs.unlink(fullPath);
        }
        catch {
            // ignore missing file
        }
        return;
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const payload = {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        confirmations: normalized,
    };
    await fs.writeFile(fullPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
function normalizeCodeSyncState(value) {
    const row = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const fingerprint = String(row.fingerprint || row.sha256 || row.digest || "").trim();
    const scope = String(row.scope || "").trim();
    const hub = String(row.hub || "").trim();
    const workers = String(row.workers || "").trim();
    const error = String(row.error || row.message || row.reason || "").trim();
    const updatedAt = String(row.updatedAt || row.updated_at || "").trim();
    if (!fingerprint && !scope && !hub && !workers && !error && !updatedAt)
        return undefined;
    return {
        ...(fingerprint ? { fingerprint } : {}),
        ...(scope ? { scope } : {}),
        ...(hub ? { hub } : {}),
        ...(workers ? { workers } : {}),
        ...(error ? { error } : {}),
        ...(updatedAt ? { updatedAt } : { updatedAt: new Date().toISOString() }),
    };
}
async function readProjectCodeSyncState(root) {
    if (!root)
        return undefined;
    const fullPath = path.join(root, ...PROJECT_CODE_SYNC_PATH.split("/"));
    try {
        const text = await fs.readFile(fullPath, "utf8");
        const data = JSON.parse(text);
        if (!data || typeof data !== "object")
            return undefined;
        const raw = data.codeSync && typeof data.codeSync === "object" ? data.codeSync : data;
        return normalizeCodeSyncState(raw);
    }
    catch {
        return undefined;
    }
}
async function writeProjectCodeSyncState(root, codeSync) {
    if (!root)
        return;
    const fullPath = path.join(root, ...PROJECT_CODE_SYNC_PATH.split("/"));
    const normalized = normalizeCodeSyncState(codeSync);
    if (!normalized) {
        try {
            await fs.unlink(fullPath);
        }
        catch {
            // ignore missing file
        }
        return;
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const payload = {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        codeSync: normalized,
    };
    await fs.writeFile(fullPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
function normalizeLocalOperationsState(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return undefined;
    const out = {};
    for (const [key, raw] of Object.entries(value)) {
        if (!key || !raw || typeof raw !== "object" || Array.isArray(raw))
            continue;
        const row = raw;
        const operationId = String(row.operationId || row.opId || key || "").trim();
        if (!operationId)
            continue;
        out[operationId] = {
            ...row,
            operationId,
        };
    }
    return Object.keys(out).length ? out : undefined;
}
async function readProjectLocalOperationsState(root) {
    if (!root)
        return undefined;
    const fullPath = path.join(root, ...PROJECT_LOCAL_OPERATIONS_PATH.split("/"));
    try {
        const text = await fs.readFile(fullPath, "utf8");
        const data = JSON.parse(text);
        if (!data || typeof data !== "object")
            return undefined;
        const raw = data.operations && typeof data.operations === "object" && !Array.isArray(data.operations)
            ? data.operations
            : data;
        return normalizeLocalOperationsState(raw);
    }
    catch {
        return undefined;
    }
}
async function writeProjectLocalOperationsState(root, operations) {
    if (!root)
        return;
    const fullPath = path.join(root, ...PROJECT_LOCAL_OPERATIONS_PATH.split("/"));
    const normalized = normalizeLocalOperationsState(operations);
    if (!normalized) {
        try {
            await fs.unlink(fullPath);
        }
        catch {
            // ignore missing file
        }
        return;
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const payload = {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        operations: normalized,
    };
    await fs.writeFile(fullPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
function normalizeLocalPlanMetadataState(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return undefined;
    const row = value;
    const planDir = String(row.planDir || row.plan_dir || "experiments/plans").trim() || "experiments/plans";
    const plans = Array.isArray(row.plans) ? row.plans.filter((item) => item && typeof item === "object") : [];
    const archivedPlans = Array.isArray(row.archivedPlans)
        ? row.archivedPlans.filter((item) => item && typeof item === "object")
        : (Array.isArray(row.archived_plans) ? row.archived_plans.filter((item) => item && typeof item === "object") : []);
    const recentPlans = Array.isArray(row.recentPlans)
        ? row.recentPlans.filter((item) => item && typeof item === "object")
        : (Array.isArray(row.recent_plans) ? row.recent_plans.filter((item) => item && typeof item === "object") : []);
    const detectedProject = row.detectedProject && typeof row.detectedProject === "object" && !Array.isArray(row.detectedProject)
        ? row.detectedProject
        : (row.detected_project && typeof row.detected_project === "object" && !Array.isArray(row.detected_project) ? row.detected_project : {});
    const error = String(row.error || "").trim();
    if (!plans.length && !archivedPlans.length && !recentPlans.length && !error && !Object.keys(detectedProject || {}).length)
        return undefined;
    return {
        planDir,
        detectedProject,
        plans,
        archivedPlans,
        recentPlans,
        ...(error ? { error } : {}),
    };
}
async function readProjectLocalPlanMetadataState(root) {
    if (!root)
        return undefined;
    const fullPath = path.join(root, ...PROJECT_LOCAL_PLAN_METADATA_PATH.split("/"));
    try {
        const text = await fs.readFile(fullPath, "utf8");
        const data = JSON.parse(text);
        if (!data || typeof data !== "object")
            return undefined;
        const raw = data.localPlanMetadata && typeof data.localPlanMetadata === "object" ? data.localPlanMetadata : data;
        return normalizeLocalPlanMetadataState(raw);
    }
    catch {
        return undefined;
    }
}
async function writeProjectLocalPlanMetadataState(root, metadata) {
    if (!root)
        return;
    const fullPath = path.join(root, ...PROJECT_LOCAL_PLAN_METADATA_PATH.split("/"));
    const normalized = normalizeLocalPlanMetadataState(metadata);
    if (!normalized) {
        try {
            await fs.unlink(fullPath);
        }
        catch {
            // ignore missing file
        }
        return;
    }
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const payload = {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        localPlanMetadata: normalized,
    };
    await fs.writeFile(fullPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}
function compactLocalPlansForWebview(plans, selectedPlanKeys, limit = WEBVIEW_LOCAL_PLAN_LIMIT) {
    const rows = plans.map((plan, index) => ({ plan, index }));
    const selectedRows = [];
    const parseErrorRows = [];
    const selected = (plan) => planIdentityKeys(plan).some((key) => selectedPlanKeys.some((selectedKey) => samePlanSelection(key, selectedKey)));
    for (const row of rows) {
        if (selected(row.plan))
            selectedRows.push(row);
        else if (row.plan.parseError)
            parseErrorRows.push(row);
    }
    const picked = [];
    const seen = new Set();
    const add = (row) => {
        if (picked.length >= limit || seen.has(row.index))
            return;
        seen.add(row.index);
        picked.push(row);
    };
    selectedRows.forEach(add);
    parseErrorRows.forEach(add);
    rows.forEach(add);
    picked.sort((a, b) => a.index - b.index);
    return {
        plans: picked.map((row) => compactLocalPlanForWebview(row.plan, selected(row.plan))),
        totalCount: plans.length,
        omittedCount: Math.max(0, plans.length - picked.length),
    };
}
function compactLocalPlanForWebview(plan, selected) {
    const includeText = selected && !plan.metadataTruncated;
    const cases = compactPlanArrayForWebview(plan.cases, WEBVIEW_PLAN_CASE_LIMIT);
    const outputCandidates = compactPlanArrayForWebview(plan.outputCandidates || [], WEBVIEW_PLAN_OUTPUT_LIMIT);
    const outputSignals = compactPlanArrayForWebview(plan.outputSignals || [], WEBVIEW_PLAN_OUTPUT_LIMIT);
    return {
        ...plan,
        cases: cases.items,
        casesTotalCount: cases.totalCount,
        casesOmittedCount: cases.omittedCount || undefined,
        outputCandidates: outputCandidates.items,
        outputCandidatesTotalCount: outputCandidates.totalCount || undefined,
        outputCandidatesOmittedCount: outputCandidates.omittedCount || undefined,
        outputSignals: outputSignals.items,
        outputSignalsTotalCount: outputSignals.totalCount || undefined,
        outputSignalsOmittedCount: outputSignals.omittedCount || undefined,
        text: includeText ? plan.text : "",
        textOmitted: includeText ? plan.textOmitted : Boolean(plan.text),
    };
}
function normalizePlanSelectionKey(value) {
    return usableSelectionKey(String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, ""));
}
function planFileEquivalenceKeys(value) {
    const raw = normalizePlanSelectionKey(value);
    if (!raw)
        return [];
    const lower = raw.toLowerCase();
    const base = lower.split("/").pop() || lower;
    const noExt = base.replace(/\.(ya?ml|json)$/i, "");
    return uniqueStrings([
        lower,
        base,
        noExt,
        lower.replace(/^experiments\/plans\//, ""),
        lower.replace(/^plans\//, ""),
        lower.replace(/^\.\//, ""),
    ].filter(Boolean));
}
function samePlanSelection(left, right) {
    const a = planFileEquivalenceKeys(left);
    const b = new Set(planFileEquivalenceKeys(right));
    if (!a.length || !b.size)
        return false;
    return a.some((key) => b.has(key));
}
function planIdentityKeys(plan) {
    return [plan.planId, plan.planFile, plan.file, plan.name].map((value) => String(value || "")).filter(Boolean);
}
function resolvePlanFileFromPlanList(plans, hint, fallbackHints = []) {
    const list = Array.isArray(plans) ? plans : [];
    const candidates = uniqueStrings([hint, ...(Array.isArray(fallbackHints) ? fallbackHints : [])]
        .map((value) => normalizePlanSelectionKey(value))
        .filter(Boolean));
    if (!candidates.length)
        return "";
    for (const raw of candidates) {
        const byFile = list.find((plan) => samePlanSelection(plan.planFile || plan.file || "", raw));
        if (byFile)
            return normalizePlanSelectionKey(byFile.planFile || byFile.file || raw);
    }
    for (const raw of candidates) {
        const byId = list.find((plan) => planIdentityKeys(plan).some((key) => samePlanSelection(key, raw)));
        if (byId)
            return normalizePlanSelectionKey(byId.planFile || byId.file || raw);
    }
    const pathLike = candidates.find((item) => item.includes("/") || /\.(ya?ml|json)$/i.test(item));
    return pathLike || candidates[0];
}
function compactPlanArrayForWebview(value, limit) {
    const items = Array.isArray(value) ? value : [];
    return {
        items: items.slice(0, limit),
        totalCount: items.length,
        omittedCount: Math.max(0, items.length - limit),
    };
}
const detectedProjectArrayLimits = {
    configs: 120,
    plans: 120,
    environmentFiles: 40,
    resultFiles: 120,
    outputContractFiles: 80,
    factoryFiles: 80,
    factorySymbols: 80,
    multimodalHints: 40,
    missingOnboarding: 20,
};
function compactDetectedProjectForWebview(project) {
    const out = { ...project };
    for (const [key, limit] of Object.entries(detectedProjectArrayLimits)) {
        const value = project[key];
        if (!Array.isArray(value) || value.length <= limit)
            continue;
        out[key] = value.slice(0, limit);
        out[`${key}TotalCount`] = value.length;
        out[`${key}OmittedCount`] = value.length - limit;
    }
    const configSummaries = project.configSummaries;
    if (Array.isArray(configSummaries)) {
        const visible = configSummaries.slice(0, WEBVIEW_CONFIG_SUMMARY_LIMIT).map(compactConfigSummaryForWebview).filter(Boolean);
        out.configSummaries = visible;
        out.configSummariesTotalCount = configSummaries.length;
        out.configSummariesOmittedCount = Math.max(0, configSummaries.length - visible.length);
    }
    out.adapterRules = compactAdapterRulesForWebview(project.adapterRules);
    return out;
}
function compactConfigSummaryForWebview(summary) {
    const item = objectRecord(summary);
    if (!item)
        return undefined;
    const params = Array.isArray(item.params) ? item.params : [];
    const visibleParams = params.slice(0, WEBVIEW_CONFIG_SUMMARY_PARAM_LIMIT).map((param) => {
        const row = objectRecord(param);
        if (!row)
            return undefined;
        return dropUndefined({
            key: firstStringFieldForWebview(row, "key"),
            value: firstStringFieldForWebview(row, "value"),
            important: typeof row.important === "boolean" ? row.important : undefined,
            kind: firstStringFieldForWebview(row, "kind"),
        });
    }).filter((param) => Boolean(param));
    const existingOmitted = firstNumberFieldForWebview(item, "omittedParamCount", "paramsOmittedCount") || 0;
    return dropUndefined({
        file: firstStringFieldForWebview(item, "file"),
        folder: firstStringFieldForWebview(item, "folder"),
        params: visibleParams,
        omittedParamCount: existingOmitted + Math.max(0, params.length - visibleParams.length) || undefined,
        paramsTotalCount: params.length + existingOmitted,
        paramsOmittedCount: existingOmitted + Math.max(0, params.length - visibleParams.length) || undefined,
    });
}
function compactAdapterRulesForWebview(rules) {
    const item = objectRecord(rules);
    if (!item)
        return rules;
    const out = { ...item };
    for (const key of ["inferredPlanCandidateCsv", "inferredPlanCandidateJson", "inferredPlanConsoleLogs", "inferredPlanTextLogs"])
        delete out[key];
    let omittedFields = 0;
    for (const key of ["secondaryMetrics", "classificationMetrics", "segmentationMetrics", "candidateCsv", "candidateJson", "consoleLogs", "textLogs"]) {
        const compacted = compactAdapterRuleListForWebview(item[key], WEBVIEW_ADAPTER_RULE_LIST_LIMIT);
        if (!compacted)
            continue;
        out[key] = compacted.items;
        out[`${key}TotalCount`] = compacted.totalCount;
        if (compacted.omittedCount > 0) {
            out[`${key}OmittedCount`] = compacted.omittedCount;
            omittedFields += 1;
        }
    }
    for (const key of ["csvColumnMapping", "metricAliases"]) {
        const compacted = compactAdapterRuleMapForWebview(item[key], WEBVIEW_ADAPTER_RULE_MAP_LIMIT);
        if (!compacted)
            continue;
        out[key] = compacted.items;
        out[`${key}TotalCount`] = compacted.totalCount;
        if (compacted.omittedCount > 0) {
            out[`${key}OmittedCount`] = compacted.omittedCount;
            omittedFields += 1;
        }
    }
    const inferredSignals = compactAdapterRuleListForWebview(item.inferredSignals, WEBVIEW_ADAPTER_INFERRED_SIGNAL_LIMIT);
    if (inferredSignals) {
        out.inferredSignals = inferredSignals.items;
        out.inferredSignalsTotalCount = inferredSignals.totalCount;
        if (inferredSignals.omittedCount > 0) {
            out.inferredSignalsOmittedCount = inferredSignals.omittedCount;
            omittedFields += 1;
        }
    }
    if (omittedFields > 0) {
        out.adapterRulesPartial = true;
        out.adapterRulesOmittedFieldCount = omittedFields;
        out.adapterRulesPartialReason = "规则较多，Webview 只显示摘要；请打开 experiments/zlk_project.yaml 编辑完整规则。";
    }
    return out;
}
function compactAdapterRuleListForWebview(value, limit) {
    if (!Array.isArray(value))
        return undefined;
    const items = value.map((item) => String(item || "").trim()).filter(Boolean);
    return { items: items.slice(0, limit), totalCount: items.length, omittedCount: Math.max(0, items.length - limit) };
}
function compactAdapterRuleMapForWebview(value, limit) {
    const record = objectRecord(value);
    if (!record)
        return undefined;
    const entries = Object.entries(record).map(([key, item]) => [String(key || "").trim(), String(item || "").trim()]).filter(([key, item]) => key && item);
    return {
        items: Object.fromEntries(entries.slice(0, limit)),
        totalCount: entries.length,
        omittedCount: Math.max(0, entries.length - limit),
    };
}
const resultsSummaryArrayLimits = {
    results: 30,
    finalResults: 30,
    final_results: 30,
    pendingReviewRecords: 20,
    pending_review_records: 20,
    failures: 20,
    sources: 40,
    pairedComparisons: 20,
    paired_comparisons: 20,
    claimEvidencePreview: 12,
    claim_evidence_preview: 12,
    qualityIssues: 20,
    quality_issues: 20,
};
function compactResultsSummaryForWebview(summary) {
    if (!summary || typeof summary !== "object" || Array.isArray(summary))
        return summary;
    const out = { ...summary };
    for (const [key, limit] of Object.entries(resultsSummaryArrayLimits)) {
        compactArrayFieldForWebview(out, key, limit, resultSummaryRecordArrayField(key) ? compactResultRecordForWebview : undefined);
    }
    out.statistics = compactStatisticsSummaryForWebview(out.statistics);
    out.statistics_summary = compactStatisticsSummaryForWebview(out.statistics_summary);
    const claimEvidence = out.claimEvidence || out.claim_evidence;
    if (claimEvidence && typeof claimEvidence === "object" && !Array.isArray(claimEvidence)) {
        const compactClaimEvidence = { ...claimEvidence };
        compactArrayFieldForWebview(compactClaimEvidence, "claims", 12, compactClaimEvidenceRowForWebview);
        compactArrayFieldForWebview(compactClaimEvidence, "preview", 12, compactClaimEvidenceRowForWebview);
        compactArrayFieldForWebview(compactClaimEvidence, "catalog", 20);
        if (out.claimEvidence)
            out.claimEvidence = compactClaimEvidence;
        if (out.claim_evidence)
            out.claim_evidence = compactClaimEvidence;
    }
    return out;
}
function resultSummaryRecordArrayField(key) {
    return RESULT_SUMMARY_RECORD_ARRAY_FIELDS.has(key);
}
function resultRecordPlanFile(row) {
    const record = objectRecord(row) || {};
    const provenance = objectRecord(record.provenance) || {};
    return normalizePlanSelectionKey(record.planFile || record.plan_file || provenance.planFile || provenance.plan_file || "");
}
function planVersionTimestamp(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    const parsed = Date.parse(String(value || ""));
    return Number.isFinite(parsed) ? parsed : NaN;
}
function resultSummaryMatchesPlanVersion(summary, planRevision, planUpdatedAt) {
    const revision = String(summary?.planRevision || summary?.plan_revision || "").trim();
    if (planRevision && revision)
        return revision === planRevision;
    const updatedAt = planVersionTimestamp(planUpdatedAt);
    if (Number.isFinite(updatedAt)) {
        const parsedAt = planVersionTimestamp(summary?.lastParsedAt || summary?.last_parsed_at || summary?.generatedAt || summary?.generated_at);
        return Number.isFinite(parsedAt) && parsedAt >= updatedAt;
    }
    return !planRevision;
}
function filterResultsSummaryForSelectedPlan(summary, selectedPlan, planRevision = "", planUpdatedAt = "") {
    const plan = usableSelectionKey(String(selectedPlan || "").trim().replace(/\\/g, "/"));
    if (!summary || typeof summary !== "object" || Array.isArray(summary) || !plan)
        return summary;
    const summaryPlan = normalizePlanSelectionKey(summary.planFile || summary.plan_file || "");
    const summaryPlanMatches = Boolean(summaryPlan && samePlanSelection(summaryPlan, plan));
    const planVersion = String(planRevision || "").trim();
    const versionMatches = resultSummaryMatchesPlanVersion(summary, planVersion, planUpdatedAt);
    if ((summaryPlan && !samePlanSelection(summaryPlan, plan)) || !versionMatches) {
        const sourceCount = Number(summary.resultCount || summary.parsedResults || (Array.isArray(summary.results) ? summary.results.length : 0) || 0);
        return {
            schemaVersion: summary.schemaVersion || 1,
            planFile: plan,
            ...(planVersion ? { planRevision: planVersion } : {}),
            resultCount: 0,
            parsedResults: 0,
            finalResultCount: 0,
            pendingReviewCount: 0,
            results: [],
            finalResults: [],
            final_results: [],
            pendingReviewRecords: [],
            pending_review_records: [],
            sources: [],
            filteredByPlanFile: plan,
            filteredFromPlanFile: summaryPlan,
            filteredFromCount: sourceCount,
            staleSummarySuppressed: Boolean(summaryPlan && !samePlanSelection(summaryPlan, plan)),
            stalePlanVersionSuppressed: !versionMatches,
            filteredFromPlanRevision: String(summary.planRevision || summary.plan_revision || "").trim(),
            message: !versionMatches ? `当前 Plan 已修改，旧版本结果摘要已隐藏；请重新运行并解析 ${plan}。` : `已切换到 ${plan}，正在等待该 Plan 的结果摘要。`,
        };
    }
    const out = { ...summary };
    let filteredAny = false;
    for (const key of ["results", "finalResults", "final_results", "pendingReviewRecords", "pending_review_records"]) {
        if (!Array.isArray(out[key]))
            continue;
        const before = out[key];
        const filtered = before.filter((row) => {
            const rowPlan = resultRecordPlanFile(row);
            return rowPlan ? samePlanSelection(rowPlan, plan) : summaryPlanMatches;
        });
        if (filtered.length !== before.length)
            filteredAny = true;
        out[key] = filtered;
    }
    if (!filteredAny)
        return summary;
    const fallbackFinalResults = Array.isArray(out.finalResults) ? out.finalResults : Array.isArray(out.final_results) ? out.final_results : [];
    const fallbackPendingResults = Array.isArray(out.pendingReviewRecords) ? out.pendingReviewRecords : Array.isArray(out.pending_review_records) ? out.pending_review_records : [];
    const results = Array.isArray(out.results) ? out.results : [...fallbackFinalResults, ...fallbackPendingResults];
    const finalResults = results.filter((row) => String(row?.finalEvidenceState || row?.final_evidence_state || "").toLowerCase() === "archived");
    const pendingReviewRecords = results.filter((row) => String(row?.finalEvidenceState || row?.final_evidence_state || "").toLowerCase() !== "archived");
    return {
        schemaVersion: summary.schemaVersion || 1,
        planFile: plan,
        ...(planVersion ? { planRevision: planVersion } : {}),
        generatedAt: summary.generatedAt || summary.generated_at,
        lastParsedAt: summary.lastParsedAt || summary.last_parsed_at,
        resultCount: results.length,
        parsedResults: results.length,
        previewResultCount: results.length,
        finalResultCount: finalResults.length,
        effectiveArchivedResultCount: finalResults.length,
        pendingReviewCount: pendingReviewRecords.length,
        results,
        finalResults,
        final_results: finalResults,
        pendingReviewRecords,
        pending_review_records: pendingReviewRecords,
        inclusionPolicy: "archived_only",
        inclusionPolicyMessage: "混合摘要只保留当前 Plan 的已标记结果；分析产物需重新按当前 Plan 生成。",
        filteredByPlanFile: plan,
        filteredFromCount: Number(summary.resultCount || summary.parsedResults || (Array.isArray(summary.results) ? summary.results.length : 0) || 0),
        mixedSummaryAnalysisSuppressed: true,
        message: `已隔离 ${plan} 的结果记录；其他 Plan 的计数和分析产物已隐藏，请重新解析当前 Plan。`,
    };
}
function compactResultRecordForWebview(value) {
    const row = objectRecord(value);
    if (!row)
        return value;
    const primaryMetric = firstStringFieldForWebview(row, "primaryMetric", "primary_metric");
    return dropUndefined({
        schemaVersion: row.schemaVersion,
        resultId: firstStringFieldForWebview(row, "resultId", "result_id", "id"),
        experimentId: firstStringFieldForWebview(row, "experimentId", "experiment_id"),
        attemptId: firstStringFieldForWebview(row, "attemptId", "attempt_id"),
        runKey: firstStringFieldForWebview(row, "runKey", "run_key"),
        workerId: firstStringFieldForWebview(row, "workerId", "worker_id", "resultOwnerWorkerId"),
        resultOwnerWorkerId: firstStringFieldForWebview(row, "resultOwnerWorkerId", "workerId", "worker_id"),
        resultOwnershipKey: firstStringFieldForWebview(row, "resultOwnershipKey"),
        suite: firstStringFieldForWebview(row, "suite"),
        method: firstStringFieldForWebview(row, "method") || firstStringFieldForWebview(objectRecord(row.dimensions) || {}, "method"),
        planFile: firstStringFieldForWebview(row, "planFile", "plan_file") || firstStringFieldForWebview(objectRecord(row.provenance) || {}, "planFile", "plan_file"),
        experimentName: firstStringFieldForWebview(row, "experimentName", "experiment_name", "name"),
        status: firstStringFieldForWebview(row, "status", "state"),
        tags: compactStringArrayForWebview(row.tags, 8, 80),
        eligibleForFinalAnalysis: typeof row.eligibleForFinalAnalysis === "boolean" ? row.eligibleForFinalAnalysis : undefined,
        finalEvidenceState: firstStringFieldForWebview(row, "finalEvidenceState", "final_evidence_state"),
        finalEvidenceReason: row.finalEvidenceReason ? compactSensitiveText(row.finalEvidenceReason, 180) : undefined,
        primaryMetric,
        higherIsBetter: typeof row.higherIsBetter === "boolean" ? row.higherIsBetter : undefined,
        metricCount: objectRecord(row.metrics) ? Object.keys(objectRecord(row.metrics) || {}).length : undefined,
        metrics: compactMetricsRecordForWebview(row.metrics, primaryMetric),
        dimensionCount: objectRecord(row.dimensions) ? Object.keys(objectRecord(row.dimensions) || {}).length : undefined,
        dimensions: compactPrimitiveRecordForWebview(row.dimensions, 16, 120),
        sourceFiles: compactSourceFilesForWebview(row.sourceFiles),
        sourceFilesTotalCount: Array.isArray(row.sourceFiles) ? row.sourceFiles.length : undefined,
        provenance: compactResultProvenanceForWebview(row.provenance),
        parsedAt: firstStringFieldForWebview(row, "parsedAt", "parsed_at"),
        validatedAt: firstStringFieldForWebview(row, "validatedAt", "validated_at"),
        createdAt: firstStringFieldForWebview(row, "createdAt", "created_at"),
        updatedAt: firstStringFieldForWebview(row, "updatedAt", "updated_at"),
    });
}
function compactMetricsRecordForWebview(value, primaryMetric) {
    const record = objectRecord(value);
    if (!record)
        return undefined;
    const entries = Object.entries(record);
    const picked = [];
    const seen = new Set();
    const add = (entry) => {
        if (!entry || seen.has(entry[0]) || picked.length >= 16)
            return;
        seen.add(entry[0]);
        picked.push(entry);
    };
    if (primaryMetric)
        add(entries.find(([key]) => key === primaryMetric));
    entries.forEach(add);
    const out = {};
    for (const [key, item] of picked) {
        const metric = objectRecord(item);
        out[key] = metric ? dropUndefined({
            value: metric.value,
            unit: firstStringFieldForWebview(metric, "unit"),
            higherIsBetter: typeof metric.higherIsBetter === "boolean" ? metric.higherIsBetter : undefined,
            split: firstStringFieldForWebview(metric, "split"),
            dataset: firstStringFieldForWebview(metric, "dataset"),
            fold: metric.fold,
            seed: metric.seed,
        }) : item;
    }
    if (entries.length > picked.length)
        out.__omittedCount = entries.length - picked.length;
    return out;
}
function compactPrimitiveRecordForWebview(value, limit, itemLimit) {
    const record = objectRecord(value);
    if (!record)
        return undefined;
    const entries = Object.entries(record).slice(0, limit);
    const out = {};
    for (const [key, item] of entries) {
        out[key] = typeof item === "string" ? compactSensitiveText(item, itemLimit) : item;
    }
    if (Object.keys(record).length > entries.length)
        out.__omittedCount = Object.keys(record).length - entries.length;
    return out;
}
function compactSourceFilesForWebview(value) {
    if (!Array.isArray(value))
        return undefined;
    return value.slice(0, 4).map((item) => {
        const row = objectRecord(item);
        if (!row)
            return item;
        return dropUndefined({
            path: firstStringFieldForWebview(row, "path"),
            type: firstStringFieldForWebview(row, "type"),
            endpoint: firstStringFieldForWebview(row, "endpoint"),
            size: row.size,
            sha256: firstStringFieldForWebview(row, "sha256")?.slice(0, 16),
        });
    });
}
function compactResultProvenanceForWebview(value) {
    const row = objectRecord(value);
    if (!row)
        return undefined;
    return dropUndefined({
        planFile: firstStringFieldForWebview(row, "planFile", "plan_file"),
        configPath: firstStringFieldForWebview(row, "configPath", "config_path"),
        workerId: firstStringFieldForWebview(row, "workerId", "worker_id"),
        gpuIds: compactStringArrayForWebview(row.gpuIds || row.gpu_ids, 8, 32),
        commit: firstStringFieldForWebview(row, "commit")?.slice(0, 16),
        artifactKey: firstStringFieldForWebview(row, "artifactKey", "artifact_key"),
    });
}
function compactClaimEvidenceRowForWebview(value) {
    const row = objectRecord(value);
    if (!row)
        return value;
    return dropUndefined({
        claimId: firstStringFieldForWebview(row, "claimId", "claim_id", "id"),
        line: row.line,
        status: firstStringFieldForWebview(row, "status"),
        text: row.text ? compactSensitiveText(row.text, 260) : undefined,
        evidenceRefs: compactStringArrayForWebview(row.evidenceRefs || row.evidence_refs, 8, 160),
        matchedKeys: compactStringArrayForWebview(row.matchedKeys || row.matched_keys, 8, 160),
        missingRefs: compactStringArrayForWebview(row.missingRefs || row.missing_refs, 8, 160),
    });
}
function compactStatisticsSummaryForWebview(value) {
    const row = objectRecord(value);
    if (!row)
        return value;
    const out = { ...row };
    compactArrayFieldForWebview(out, "rows", 40);
    compactArrayFieldForWebview(out, "pairedComparisons", 20);
    compactArrayFieldForWebview(out, "paired_comparisons", 20);
    return out;
}
function compactArrayFieldForWebview(record, key, limit, mapper) {
    const value = record[key];
    if (!Array.isArray(value))
        return;
    const sliced = value.slice(0, limit);
    record[key] = mapper ? sliced.map(mapper) : sliced;
    if (value.length <= limit)
        return;
    record[`${key}TotalCount`] = value.length;
    record[`${key}OmittedCount`] = value.length - limit;
}
const XSHELL_SESSION_WEBVIEW_LIMIT = 120;
function compactXshellSetupForWebview(config) {
    return dropUndefined({
        hubDisplayName: config.hubDisplayName,
        hubHost: config.hubHost,
        hubUser: config.hubUser,
        hubSshPort: config.hubSshPort,
        transferHost: config.transferHost,
        resolvedHost: config.resolvedHost,
        sftpHost: config.sftpHost,
        sshHost: config.sshHost,
        localForwardHost: config.localForwardHost,
        localForwardPort: config.localForwardPort,
        remoteAgentHost: config.remoteAgentHost,
        remoteAgentPort: config.remoteAgentPort,
        sshConfigAlias: config.sshConfigAlias,
        savedSessionPath: config.savedSessionPath,
        savedSessionForwardIndex: config.savedSessionForwardIndex,
        agentProjectDir: config.agentProjectDir,
        condaEnv: config.condaEnv,
        workerRealtimeMode: config.workerRealtimeMode,
        workerTelemetryMode: config.workerTelemetryMode,
        realtimeEnabled: config.realtimeEnabled,
        fileTransferEnabled: config.fileTransferEnabled,
        autoStartTunnelOnExtensionActivation: config.autoStartTunnelOnExtensionActivation,
        autoTestTunnelAfterStart: config.autoTestTunnelAfterStart,
        workerTunnels: config.workerTunnels.map(compactWorkerSetupForWebview),
    });
}
function compactWorkerSetupForWebview(worker) {
    return dropUndefined({
        id: worker.id,
        displayName: worker.displayName,
        hubHost: worker.hubHost,
        hubUser: worker.hubUser,
        hubSshPort: worker.hubSshPort,
        workerHost: worker.workerHost,
        workerUser: worker.workerUser,
        workerSshPort: worker.workerSshPort,
        transferHost: worker.transferHost,
        resolvedHost: worker.resolvedHost,
        sftpHost: worker.sftpHost,
        sshHost: worker.sshHost,
        localForwardHost: worker.localForwardHost,
        localForwardPort: worker.localForwardPort,
        remoteAgentHost: worker.remoteAgentHost,
        remoteAgentPort: worker.remoteAgentPort,
        remoteTelemetryPort: worker.remoteTelemetryPort,
        sshConfigAlias: worker.sshConfigAlias,
        savedSessionPath: worker.savedSessionPath,
        savedSessionForwardIndex: worker.savedSessionForwardIndex,
        agentProjectDir: worker.agentProjectDir,
        condaEnv: worker.condaEnv,
        maxConcurrentGpus: worker.maxConcurrentGpus,
        allowedGpuIds: worker.allowedGpuIds,
        enabled: worker.enabled,
    });
}
function compactXshellSessionLibraryForWebview(library, setup, error) {
    const protectedSessionPaths = new Set(uniqueStrings([
        setup.savedSessionPath,
        setup.agentSessionPath,
        ...((setup.workerTunnels || []).flatMap((worker) => [worker.savedSessionPath, worker.agentSessionPath])),
    ].map((value) => localPathKey(String(value || ""))).filter(Boolean)));
    let ordinaryCount = 0;
    const sessions = [];
    for (const session of library.sessions || []) {
        const protectedSession = protectedSessionPaths.has(localPathKey(session.filePath || ""));
        if (!protectedSession && ordinaryCount >= XSHELL_SESSION_WEBVIEW_LIMIT)
            continue;
        if (!protectedSession)
            ordinaryCount += 1;
        sessions.push(publicXshellSessionForWebview(session));
    }
    return {
        searchedDirs: library.searchedDirs,
        existingDirs: library.existingDirs,
        error: error ? compactSensitiveText(error, 360) : undefined,
        limited: Boolean(library.limited),
        scannedDirectoryCount: library.scannedDirectoryCount || 0,
        scannedFileCount: library.scannedFileCount || 0,
        skippedDirectoryCount: library.skippedDirectoryCount || 0,
        totalCount: (library.sessions || []).length,
        visibleCount: sessions.length,
        omittedCount: Math.max(0, (library.sessions || []).length - sessions.length),
        sessions,
    };
}
function compactDebugBundlePathForWebview(value) {
    if (typeof value !== "string" || !value.trim())
        return undefined;
    const normalized = value.replace(/\\/g, "/");
    return compactSensitiveText(path.basename(normalized) || normalized, 160);
}
function publicXshellSessionForWebview(session) {
    return {
        name: session.name,
        filePath: session.filePath,
        relativePath: session.relativePath,
        host: session.host,
        userName: session.userName,
        port: session.port,
        loginCommand: Boolean(session.loginCommand),
        forwards: session.forwards,
    };
}
function offlineBundleObjectField(bundle, keys) {
    if (!bundle || typeof bundle !== "object")
        return undefined;
    for (const key of keys) {
        const value = bundle[key];
        if (value && typeof value === "object" && !Array.isArray(value))
            return value;
    }
    return undefined;
}
function auditTailSummaryForWebview(value) {
    const text = auditTailRawText(value);
    if (!text)
        return undefined;
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    return {
        lineCount: lines.length,
        bytes: Buffer.byteLength(text, "utf8"),
        preview: lines.slice(-5),
        updatedAt: new Date().toISOString(),
    };
}
function auditTailDocumentText(value) {
    const text = auditTailRawText(value);
    if (text)
        return text.endsWith("\n") ? text : `${text}\n`;
    return `${JSON.stringify(value ?? {}, null, 2)}\n`;
}
function auditTailRawText(value) {
    if (typeof value === "string")
        return value;
    if (value && typeof value === "object") {
        const tail = value.tail;
        if (typeof tail === "string")
            return tail;
    }
    return "";
}
function compactProbeForWebview(probe) {
    if (!probe)
        return undefined;
    return dropUndefined({
        status: probe.status,
        localForwardPort: probe.localForwardPort,
        remoteAgentPort: probe.remoteAgentPort,
        tcpOpen: probe.tcpOpen,
        healthOk: probe.healthOk,
        capabilitiesOk: probe.capabilitiesOk,
        fileApiOk: probe.fileApiOk,
        streamApiOk: probe.streamApiOk,
        latencyMs: probe.latencyMs,
        agentVersion: probe.agentVersion,
        apiVersion: probe.apiVersion,
        expectedAgentVersion: probe.expectedAgentVersion,
        projectRoot: probe.projectRoot,
        expectedProjectRoot: probe.expectedProjectRoot,
        schedulerDependencies: compactSchedulerDependenciesForWebview(probe.schedulerDependencies),
        capabilities: compactCapabilitiesForWebview(probe.capabilities),
        fileCapabilities: compactFileCapabilitiesForWebview(probe.fileCapabilities),
        missingCapabilities: compactStringArrayForWebview(probe.missingCapabilities, 40, 160),
        message: compactSensitiveText(probe.message, 600),
        suggestion: probe.suggestion ? compactSensitiveText(probe.suggestion, 400) : undefined,
    });
}
function compactWorkerProbesForWebview(probes) {
    const out = {};
    for (const [workerId, probe] of Object.entries(probes || {}))
        out[workerId] = compactWorkerProbeForWebview(probe);
    return out;
}
function compactWorkerProbeForWebview(probe) {
    return dropUndefined({
        status: probe.status,
        localForwardPort: probe.localForwardPort,
        remoteTelemetryPort: probe.remoteTelemetryPort,
        tcpOpen: probe.tcpOpen,
        healthOk: probe.healthOk,
        capabilitiesOk: probe.capabilitiesOk,
        streamApiOk: probe.streamApiOk,
        gpuApiOk: probe.gpuApiOk,
        workerTasksApiOk: probe.workerTasksApiOk,
        latencyMs: probe.latencyMs,
        projectRoot: probe.projectRoot,
        expectedProjectRoot: probe.expectedProjectRoot,
        schedulerDependencies: compactSchedulerDependenciesForWebview(probe.schedulerDependencies),
        capabilities: compactCapabilitiesForWebview(probe.capabilities),
        warnings: compactStringArrayForWebview(probe.warnings, 20, 160),
        message: compactSensitiveText(probe.message, 600),
        suggestion: probe.suggestion ? compactSensitiveText(probe.suggestion, 400) : undefined,
    });
}
function compactCapabilitiesForWebview(capabilities) {
    const caps = objectRecord(capabilities);
    if (!caps)
        return undefined;
    const limits = objectRecord(caps.limits);
    const auth = objectRecord(caps.auth);
    return dropUndefined({
        schemaVersion: caps.schemaVersion,
        apiVersion: caps.apiVersion,
        agentVersion: caps.agentVersion,
        mode: caps.mode,
        endpoints: compactBooleanRecord(caps.endpoints, 80),
        actionEndpoints: compactBooleanRecord(caps.actionEndpoints, 80),
        limits: limits ? dropUndefined({
            maxUploadChunkBytes: limits.maxUploadChunkBytes,
            maxDownloadChunkBytes: limits.maxDownloadChunkBytes,
            maxConcurrentTransfers: limits.maxConcurrentTransfers,
            maxPathLength: limits.maxPathLength,
        }) : undefined,
        auth: auth ? dropUndefined({
            required: typeof auth.required === "boolean" ? auth.required : undefined,
            scheme: typeof auth.scheme === "string" ? auth.scheme : undefined,
        }) : undefined,
    });
}
function compactFileCapabilitiesForWebview(fileCapabilities) {
    const caps = objectRecord(fileCapabilities);
    if (!caps)
        return undefined;
    return dropUndefined({
        schemaVersion: caps.schemaVersion,
        rootPolicy: caps.rootPolicy,
        supportsList: caps.supportsList,
        supportsStat: caps.supportsStat,
        supportsDownload: caps.supportsDownload,
        supportsRangeDownload: caps.supportsRangeDownload,
        supportsUploadChunk: caps.supportsUploadChunk,
        supportsSha256: caps.supportsSha256,
        supportsResume: caps.supportsResume,
        maxUploadChunkBytes: caps.maxUploadChunkBytes,
        safeRootCount: Array.isArray(caps.safeRoots) ? caps.safeRoots.length : undefined,
    });
}
function compactIntegrationReportForWebview(report) {
    if (!report)
        return undefined;
    return dropUndefined({
        schemaVersion: report.schemaVersion,
        generatedAt: report.generatedAt,
        overall: report.overall,
        xshell: {
            found: report.xshell.found,
            launchAttempted: report.xshell.launchAttempted,
            launchSucceeded: report.xshell.launchSucceeded,
            exeName: path.basename(String(report.xshell.exePath || "")) || undefined,
        },
        tunnel: dropUndefined({
            localForwardPort: report.tunnel.localForwardPort,
            remoteAgentPort: report.tunnel.remoteAgentPort,
            localPortOpen: report.tunnel.localPortOpen,
            healthOk: report.tunnel.healthOk,
            latencyMs: report.tunnel.latencyMs,
        }),
        agent: dropUndefined({
            reachable: report.agent.reachable,
            agentVersion: report.agent.agentVersion,
            apiVersion: report.agent.apiVersion,
            capabilitiesOk: report.agent.capabilitiesOk,
            missingCapabilities: compactStringArrayForWebview(report.agent.missingCapabilities, 20, 160),
        }),
        realtime: report.realtime,
        fileTransfer: dropUndefined({
            listOk: report.fileTransfer.listOk,
            downloadOk: report.fileTransfer.downloadOk,
            uploadOk: report.fileTransfer.uploadOk,
            sha256Ok: report.fileTransfer.sha256Ok,
            message: report.fileTransfer.message ? compactSensitiveText(report.fileTransfer.message, 240) : undefined,
        }),
        suggestions: compactStringArrayForWebview(report.suggestions, 8, 240),
    });
}
function compactFileTransfersForWebview(fileTransfers) {
    const entries = fileTransferEntries(fileTransfers);
    if (!entries.length)
        return {};
    const active = entries
        .filter(([, row]) => !isTerminalTransferForWebview(row))
        .sort((a, b) => rowTimeForWebview(b[1]) - rowTimeForWebview(a[1]))
        .slice(0, WEBVIEW_FILE_TRANSFER_ACTIVE_LIMIT);
    const terminal = entries
        .filter(([, row]) => isTerminalTransferForWebview(row))
        .sort((a, b) => rowTimeForWebview(b[1]) - rowTimeForWebview(a[1]))
        .slice(0, WEBVIEW_FILE_TRANSFER_TERMINAL_LIMIT);
    return Object.fromEntries([...active, ...terminal].map(([id, row]) => [id, compactFileTransferForWebview(id, row)]));
}
function compactCodeSyncForWebview(codeSync) {
    const sync = objectRecord(codeSync);
    if (!sync)
        return {};
    const error = firstStringFieldForWebview(sync, "error", "message", "reason");
    return dropUndefined({
        fingerprint: firstStringFieldForWebview(sync, "fingerprint", "sha256", "digest"),
        scope: firstStringFieldForWebview(sync, "scope"),
        hub: firstStringFieldForWebview(sync, "hub"),
        workers: firstStringFieldForWebview(sync, "workers"),
        updatedAt: firstStringFieldForWebview(sync, "updatedAt", "updated_at"),
        failureCount: firstNumberFieldForWebview(sync, "failureCount", "failure_count") || (error ? splitSyncFailures(error).length : undefined),
        error: error ? compactSensitiveText(splitSyncFailures(error).slice(0, 3).join("；"), 480) : undefined,
    });
}
function splitSyncFailures(error) {
    return String(error || "").split(/\s*;\s*/).map((item) => item.trim()).filter(Boolean);
}
function compactRealtimeDiagnosticsForWebview(realtime) {
    const item = objectRecord(realtime);
    if (!item)
        return {};
    const rawEndpoints = Array.isArray(item.endpoints) ? item.endpoints : [];
    const endpoints = rawEndpoints.slice(0, 80).map(compactRealtimeEndpointForWebview).filter(Boolean);
    const lastError = firstStringFieldForWebview(item, "lastError", "error", "message");
    return dropUndefined({
        streamStatus: firstStringFieldForWebview(item, "streamStatus", "status"),
        lastSeq: firstNumberFieldForWebview(item, "lastSeq", "seq"),
        lastHeartbeatAt: firstStringFieldForWebview(item, "lastHeartbeatAt", "last_heartbeat_at"),
        reconnectCount: firstNumberFieldForWebview(item, "reconnectCount", "reconnect_count"),
        lastError: lastError ? compactSensitiveText(lastError, 360) : undefined,
        endpoints,
        endpointCount: rawEndpoints.length,
        endpointOmittedCount: Math.max(0, rawEndpoints.length - endpoints.length),
    });
}
function compactRealtimeDiagnosticsForPostGate(realtime) {
    const item = objectRecord(realtime);
    if (!item)
        return {};
    const rawEndpoints = Array.isArray(item.endpoints) ? item.endpoints : [];
    const endpoints = rawEndpoints.slice(0, 80).map(compactRealtimeEndpointForPostGate).filter(Boolean);
    const lastError = firstStringFieldForWebview(item, "lastError", "error", "message");
    return dropUndefined({
        streamStatus: firstStringFieldForWebview(item, "streamStatus", "status"),
        reconnectCount: firstNumberFieldForWebview(item, "reconnectCount", "reconnect_count"),
        lastError: lastError ? compactSensitiveText(lastError, 360) : undefined,
        endpoints,
        endpointCount: rawEndpoints.length,
        endpointOmittedCount: Math.max(0, rawEndpoints.length - endpoints.length),
    });
}
function compactHealthForWebview(health) {
    const item = objectRecord(health);
    if (!item)
        return { state: "unknown", checkedAt: "" };
    const message = firstStringFieldForWebview(item, "message", "error", "reason");
    return dropUndefined({
        state: firstStringFieldForWebview(item, "state", "status") || "unknown",
        status: firstStringFieldForWebview(item, "status", "state"),
        localForwardPort: firstNumberFieldForWebview(item, "localForwardPort", "local_forward_port", "localPort"),
        remoteAgentPort: firstNumberFieldForWebview(item, "remoteAgentPort", "remote_agent_port", "remotePort"),
        latencyMs: firstNumberFieldForWebview(item, "latencyMs", "latency_ms"),
        agentVersion: firstStringFieldForWebview(item, "agentVersion", "agent_version"),
        projectRoot: firstStringFieldForWebview(item, "projectRoot", "project_root"),
        expectedProjectRoot: firstStringFieldForWebview(item, "expectedProjectRoot", "expected_project_root"),
        snapshotAge: firstNumberFieldForWebview(item, "snapshotAge", "snapshot_age"),
        workerCount: firstNumberFieldForWebview(item, "workerCount", "worker_count"),
        lastHeartbeatAt: firstStringFieldForWebview(item, "lastHeartbeatAt", "last_heartbeat_at"),
        lastSeq: firstNumberFieldForWebview(item, "lastSeq", "seq"),
        fileApiOk: typeof item.fileApiOk === "boolean" ? item.fileApiOk : undefined,
        checkedAt: firstStringFieldForWebview(item, "checkedAt", "checked_at"),
        message: message ? compactSensitiveText(message, 360) : undefined,
    });
}
function compactGpuForWebview(gpu) {
    const out = {};
    for (const [serverId, value] of Object.entries(gpu || {})) {
        const server = objectRecord(value);
        const rows = Array.isArray(value)
            ? value
            : Array.isArray(server?.gpus)
                ? server.gpus
                : Array.isArray(server?.gpu)
                    ? server.gpu
                    : Array.isArray(server?.rows)
                        ? server.rows
                        : [];
        const compactRows = rows.map(compactGpuRowForWebview).filter(Boolean);
        if (Array.isArray(value)) {
            out[serverId] = compactRows;
            continue;
        }
        out[serverId] = dropUndefined({
            workerId: firstStringFieldForWebview(server || {}, "workerId", "worker_id", "worker") || serverId,
            status: firstStringFieldForWebview(server || {}, "status", "state"),
            updatedAt: firstStringFieldForWebview(server || {}, "updatedAt", "updated_at", "generatedAt", "generated_at", "timestamp"),
            source: firstStringFieldForWebview(server || {}, "source", "telemetrySource", "telemetry_source"),
            gpus: compactRows,
            gpuCount: compactRows.length,
        });
    }
    return out;
}
function compactGpuRowForWebview(row) {
    const item = objectRecord(row);
    if (!item)
        return undefined;
    const processes = compactGpuProcessesForWebview(item.processes || item.procs);
    const processCount = firstNumberFieldForWebview(item, "processCount", "process_count", "processesTotalCount", "processes_total_count") || gpuProcessEntries(item.processes || item.procs).length;
    const runKey = firstStringFieldForWebview(item, "runKey", "run_key", "assignedExperiment", "assignedRunKey", "experiment", "experimentId");
    return dropUndefined({
        index: item.index ?? item.gpu_index ?? item.gpuId ?? item.gpu_id ?? item.id,
        id: item.id ?? item.gpuId ?? item.gpu_id ?? item.uuid,
        name: firstStringFieldForWebview(item, "name", "gpu_name", "model"),
        memoryUsedMb: firstNumberFieldForWebview(item, "memoryUsedMb", "memory_used_mb", "memoryUsed", "used"),
        memoryTotalMb: firstNumberFieldForWebview(item, "memoryTotalMb", "memory_total_mb", "memoryTotal", "total"),
        utilizationPercent: firstNumberFieldForWebview(item, "utilization", "utilizationPercent", "gpu_util", "utilization_gpu"),
        temperature: firstNumberFieldForWebview(item, "temperature", "temperatureGpu", "temperature_gpu", "temp"),
        processCount,
        processes,
        processesTotalCount: processCount,
        processesOmittedCount: Math.max(0, processCount - processes.length),
        runKey,
    });
}
function compactGpuProcessesForWebview(value) {
    return gpuProcessEntries(value).slice(0, WEBVIEW_GPU_PROCESS_LIMIT).map(compactGpuProcessForWebview).filter((item) => Boolean(item));
}
function gpuProcessEntries(value) {
    return Array.isArray(value) ? value.map(objectRecord).filter((item) => Boolean(item)) : [];
}
function compactGpuProcessForWebview(proc) {
    return dropUndefined({
        pid: proc.pid ?? proc.processId ?? proc.process_id,
        name: compactSensitiveText(firstStringFieldForWebview(proc, "processName", "process_name", "name", "exe", "program") || "-", 160),
        memoryMb: firstNumberFieldForWebview(proc, "usedMemoryMb", "used_memory_mb", "memoryMb", "memory"),
        user: firstStringFieldForWebview(proc, "username", "user", "owner"),
        command: compactSensitiveText(firstStringFieldForWebview(proc, "command", "cmd", "commandLine", "cmdline", "args") || "-", WEBVIEW_GPU_PROCESS_COMMAND_LIMIT),
    });
}
function compactRealtimeEndpointForWebview(endpoint) {
    const item = objectRecord(endpoint);
    if (!item)
        return undefined;
    const lastError = firstStringFieldForWebview(item, "lastError", "error", "message");
    return dropUndefined({
        id: firstStringFieldForWebview(item, "id", "endpointId"),
        role: firstStringFieldForWebview(item, "role"),
        displayName: firstStringFieldForWebview(item, "displayName", "name"),
        localPort: firstNumberFieldForWebview(item, "localPort", "localForwardPort"),
        streamStatus: firstStringFieldForWebview(item, "streamStatus", "status"),
        lastSeq: firstNumberFieldForWebview(item, "lastSeq", "seq"),
        lastHeartbeatAt: firstStringFieldForWebview(item, "lastHeartbeatAt", "last_heartbeat_at"),
        reconnectCount: firstNumberFieldForWebview(item, "reconnectCount", "reconnect_count"),
        lastError: lastError ? compactSensitiveText(lastError, 240) : undefined,
    });
}
function compactRealtimeEndpointForPostGate(endpoint) {
    const item = objectRecord(endpoint);
    if (!item)
        return undefined;
    const lastError = firstStringFieldForWebview(item, "lastError", "error", "message");
    return dropUndefined({
        id: firstStringFieldForWebview(item, "id", "endpointId"),
        role: firstStringFieldForWebview(item, "role"),
        displayName: firstStringFieldForWebview(item, "displayName", "name"),
        localPort: firstNumberFieldForWebview(item, "localPort", "localForwardPort"),
        streamStatus: firstStringFieldForWebview(item, "streamStatus", "status"),
        reconnectCount: firstNumberFieldForWebview(item, "reconnectCount", "reconnect_count"),
        lastError: lastError ? compactSensitiveText(lastError, 240) : undefined,
    });
}
function fileTransferEntries(fileTransfers) {
    if (Array.isArray(fileTransfers)) {
        return fileTransfers.map((row, index) => {
            const item = objectRecord(row) || {};
            return [String(item.transferId || item.transfer_id || item.id || `transfer-${index}`), item];
        });
    }
    const record = objectRecord(fileTransfers);
    if (!record)
        return [];
    return Object.entries(record).map(([id, row]) => [id, objectRecord(row) || {}]);
}
function compactFileTransferForWebview(id, row) {
    const transferId = String(row.transferId || row.transfer_id || row.id || id);
    const remotePath = firstStringFieldForWebview(row, "remotePath", "remote_path", "path");
    const error = firstStringFieldForWebview(row, "error", "message", "reason");
    return dropUndefined({
        transferId: compactSensitiveText(transferId, 120),
        direction: firstStringFieldForWebview(row, "direction", "type"),
        status: firstStringFieldForWebview(row, "status", "state"),
        remotePath: remotePath ? compactSensitiveText(remotePath, 240) : undefined,
        remoteName: remotePath ? path.basename(remotePath.replace(/\\/g, "/")) : undefined,
        transferredBytes: firstNumberFieldForWebview(row, "transferredBytes", "transferred_bytes", "receivedBytes", "sentBytes", "doneBytes"),
        totalBytes: firstNumberFieldForWebview(row, "totalBytes", "total_bytes", "size", "contentLength"),
        speedBytesPerSecond: firstNumberFieldForWebview(row, "speedBytesPerSecond", "speed_bytes_per_second"),
        etaSeconds: firstNumberFieldForWebview(row, "etaSeconds", "eta_seconds"),
        startedAt: firstStringFieldForWebview(row, "startedAt", "started_at", "createdAt", "generatedAt"),
        updatedAt: firstStringFieldForWebview(row, "updatedAt", "updated_at", "completedAt", "completed_at", "finishedAt", "finished_at", "generatedAt"),
        seq: firstNumberFieldForWebview(row, "seq"),
        error: error ? compactSensitiveText(error, 320) : undefined,
    });
}
function isTerminalTransferForWebview(row) {
    const status = String(row.status || row.state || "").toLowerCase();
    return ["completed", "failed", "cancelled", "canceled"].includes(status);
}
function rowTimeForWebview(row) {
    const raw = firstStringFieldForWebview(row, "updatedAt", "updated_at", "completedAt", "completed_at", "finishedAt", "finished_at", "startedAt", "started_at", "generatedAt", "generated_at");
    const parsed = Date.parse(raw || "");
    if (Number.isFinite(parsed))
        return parsed;
    return firstNumberFieldForWebview(row, "seq") || 0;
}
function firstStringFieldForWebview(row, ...keys) {
    for (const key of keys) {
        const value = row[key];
        if (typeof value === "string" && value.trim())
            return value.trim();
    }
    return undefined;
}
function firstNumberFieldForWebview(row, ...keys) {
    for (const key of keys) {
        const value = row[key];
        const numberValue = typeof value === "number" ? value : Number(value);
        if (Number.isFinite(numberValue))
            return Math.trunc(numberValue);
    }
    return undefined;
}
function compactEndpointRegistryForWebview(registry) {
    const record = objectRecord(registry);
    if (!record)
        return undefined;
    const endpoints = Array.isArray(record.endpoints) ? record.endpoints.map(compactEndpointForWebview).filter(Boolean) : [];
    const hub = compactEndpointForWebview(record.hub);
    const workers = Array.isArray(record.workers) ? record.workers.map(compactEndpointForWebview).filter(Boolean) : [];
    return dropUndefined({
        endpoints,
        hub,
        workers,
        endpointCount: endpoints.length,
        workerCount: workers.length,
    });
}
function compactEndpointForWebview(endpoint) {
    const item = objectRecord(endpoint);
    if (!item)
        return undefined;
    const tunnel = objectRecord(item.tunnel);
    const api = objectRecord(item.api);
    const probe = compactEndpointProbeForWebview(item.lastProbe);
    return dropUndefined({
        id: typeof item.id === "string" ? item.id : undefined,
        role: typeof item.role === "string" ? item.role : undefined,
        displayName: typeof item.displayName === "string" ? compactSensitiveText(item.displayName, 120) : undefined,
        enabled: typeof item.enabled === "boolean" ? item.enabled : undefined,
        tunnel: tunnel ? dropUndefined({
            localHost: tunnel.localHost,
            localPort: tunnel.localPort,
            remoteHost: tunnel.remoteHost,
            remotePort: tunnel.remotePort,
        }) : undefined,
        api: api ? dropUndefined({
            mode: api.mode,
            expectedCapabilities: compactStringArrayForWebview(api.expectedCapabilities, 24, 120),
        }) : undefined,
        lastProbe: probe,
    });
}
function compactEndpointProbeForWebview(probe) {
    const item = objectRecord(probe);
    if (!item)
        return undefined;
    return dropUndefined({
        status: item.status,
        latencyMs: item.latencyMs,
        agentVersion: item.agentVersion,
        apiVersion: item.apiVersion,
        localForwardPort: item.localForwardPort,
        remoteAgentPort: item.remoteAgentPort,
        remoteTelemetryPort: item.remoteTelemetryPort,
        healthOk: item.healthOk,
        capabilitiesOk: item.capabilitiesOk,
        streamApiOk: item.streamApiOk,
        fileApiOk: item.fileApiOk,
        gpuApiOk: item.gpuApiOk,
        workerTasksApiOk: item.workerTasksApiOk,
        message: item.message ? compactSensitiveText(item.message, 240) : undefined,
    });
}
function compactTunnelPortAssignmentsForWebview(assignments) {
    if (!Array.isArray(assignments))
        return [];
    return assignments.slice(0, 240).map((assignment) => {
        const item = objectRecord(assignment);
        if (!item)
            return undefined;
        return dropUndefined({
            endpointId: item.endpointId,
            role: item.role,
            displayName: typeof item.displayName === "string" ? compactSensitiveText(item.displayName, 120) : undefined,
            remoteHostLabel: typeof item.remoteHostLabel === "string" ? compactSensitiveText(item.remoteHostLabel, 120) : undefined,
            sshConfigAlias: typeof item.sshConfigAlias === "string" ? compactSensitiveText(item.sshConfigAlias, 120) : undefined,
            localForwardHost: item.localForwardHost,
            localForwardPort: item.localForwardPort,
            remoteBindHost: item.remoteBindHost,
            remoteServicePort: item.remoteServicePort,
            assignedAt: item.assignedAt,
            source: item.source,
        });
    }).filter((item) => Boolean(item));
}
function compactTunnelPortConflictsForWebview(conflicts) {
    if (!Array.isArray(conflicts))
        return [];
    return conflicts.slice(0, 120).map((conflict) => {
        const item = objectRecord(conflict);
        if (!item)
            return undefined;
        return dropUndefined({
            endpointId: item.endpointId,
            requestedPort: item.requestedPort,
            conflictType: item.conflictType,
            severity: item.severity,
            message: item.message ? compactSensitiveText(item.message, 240) : undefined,
            suggestion: item.suggestion ? compactSensitiveText(item.suggestion, 240) : undefined,
        });
    }).filter((item) => Boolean(item));
}
function compactRealtimePolicyForWebview(policy) {
    const item = objectRecord(policy);
    if (!item)
        return undefined;
    return dropUndefined({
        hubPollSeconds: item.hubPollSeconds,
        workerPollSeconds: item.workerPollSeconds,
        workerStatusTtlSeconds: item.workerStatusTtlSeconds,
        localAvailabilityPushSeconds: item.localAvailabilityPushSeconds,
        workerAvailabilityPushSeconds: item.workerAvailabilityPushSeconds,
        jitterSeconds: item.jitterSeconds,
        operationEventMaxDelayMs: item.operationEventMaxDelayMs,
        workerActionMinIntervalMs: item.workerActionMinIntervalMs,
        workerActionMaxConcurrent: item.workerActionMaxConcurrent,
        uiBatchMs: item.uiBatchMs,
    });
}
function webviewStatePostSignature(state: WebviewClusterState): string {
    return realtimeUiTopLevelSignature(state);
}
function contextActionStatePostSignature(state: WebviewClusterState): string {
    return realtimeUiTopLevelSignature({
        connectionMode: state.connectionMode,
        setup: state.setup,
        integrations: state.integrations,
        health: state.health,
        realtime: state.realtime,
        lastSnapshotAt: state.lastSnapshotAt,
        capabilities: state.capabilities,
        fileCapabilities: state.fileCapabilities,
        selection: state.selection,
        planFileInput: state.planFileInput,
        debugBundlePath: state.debugBundlePath,
        probe: state.probe,
        workerProbes: state.workerProbes,
        agentSessions: state.agentSessions,
        plans: state.plans,
        recentPlans: state.recentPlans,
        plansOmittedCount: state.plansOmittedCount,
        detectedProject: state.detectedProject,
        schedulerStates: state.schedulerStates,
        operations: state.operations,
        resultsSummary: state.resultsSummary,
    });
}
function realtimeUiFieldSignature(value: unknown): string {
    const digest = createRealtimeUiHash();
    realtimeUiStableHash(value, 0, digest);
    return `${digest.length}:${digest.hash >>> 0}:${digest.nodes}`;
}
function realtimeUiTopLevelSignature(value: Record<string, unknown>): string {
    return Object.keys(value).sort().map((key) => `${JSON.stringify(key)}=${realtimeUiFieldSignature(value[key])}`).join("|");
}
function createRealtimeUiHash() {
    return { length: 0, hash: 0, nodes: 0, truncated: false };
}
const REALTIME_UI_HASH_MAX_DEPTH = 8;
const REALTIME_UI_HASH_MAX_ITEMS = 240;
const REALTIME_UI_HASH_MAX_NODES = 4096;
function realtimeUiHashToken(digest, token) {
    const text = String(token || "");
    digest.length += text.length;
    for (let i = 0; i < text.length; i += 1)
        digest.hash = ((digest.hash << 5) - digest.hash + text.charCodeAt(i)) | 0;
}
function realtimeUiHashBudgetAvailable(digest) {
    if (digest.nodes < REALTIME_UI_HASH_MAX_NODES)
        return true;
    if (!digest.truncated) {
        digest.truncated = true;
        realtimeUiHashToken(digest, "[budget]");
    }
    return false;
}
function realtimeUiSampleIndexes(length, limit = REALTIME_UI_HASH_MAX_ITEMS) {
    if (length <= 0)
        return [];
    if (length <= limit)
        return Array.from({ length }, (_, index) => index);
    return Array.from({ length: limit }, (_, index) => Math.floor(index * (length - 1) / (limit - 1)));
}
function realtimeUiSampleText(value, limit = REALTIME_UI_HASH_MAX_ITEMS) {
    if (value.length <= limit)
        return value;
    return realtimeUiSampleIndexes(value.length, limit).map((index) => value[index]).join("");
}
function realtimeUiStableHash(value, depth, digest) {
    if (!realtimeUiHashBudgetAvailable(digest))
        return;
    digest.nodes += 1;
    if (value === null || value === undefined) {
        realtimeUiHashToken(digest, "");
        return;
    }
    if (typeof value === "string") {
        realtimeUiHashToken(digest, `${value.length}:${JSON.stringify(realtimeUiSampleText(value))}`);
        return;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        realtimeUiHashToken(digest, JSON.stringify(value));
        return;
    }
    if (depth >= REALTIME_UI_HASH_MAX_DEPTH) {
        realtimeUiHashToken(digest, Array.isArray(value) ? "[array]" : "{object}");
        return;
    }
    if (Array.isArray(value)) {
        realtimeUiHashToken(digest, `[${value.length}:`);
        for (const index of realtimeUiSampleIndexes(value.length)) {
            if (!realtimeUiHashBudgetAvailable(digest))
                break;
            if (index > 0)
                realtimeUiHashToken(digest, ",");
            realtimeUiHashToken(digest, `${index}:`);
            realtimeUiStableHash(value[index], depth + 1, digest);
        }
        realtimeUiHashToken(digest, "]");
        return;
    }
    if (typeof value !== "object") {
        realtimeUiHashToken(digest, JSON.stringify(String(value)));
        return;
    }
    const record = value;
    const keys = Object.keys(record).sort();
    realtimeUiHashToken(digest, `{${keys.length}:`);
    for (const index of realtimeUiSampleIndexes(keys.length)) {
        if (!realtimeUiHashBudgetAvailable(digest))
            break;
        if (index > 0)
            realtimeUiHashToken(digest, ",");
        const key = keys[index];
        realtimeUiHashToken(digest, `${JSON.stringify(key)}:`);
        realtimeUiStableHash(record[key], depth + 1, digest);
    }
    realtimeUiHashToken(digest, "}");
}
function objectRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}
function endpointCapabilitiesFromProbe(probe) {
    return objectRecord(objectRecord(probe)?.capabilities);
}
function compactBooleanRecord(value, limit) {
    const record = objectRecord(value);
    if (!record)
        return undefined;
    const out = {};
    for (const [key, item] of Object.entries(record).slice(0, limit)) {
        if (typeof item === "boolean")
            out[key] = item;
    }
    return out;
}
function compactStringArrayForWebview(value, limit, itemLimit) {
    if (!Array.isArray(value))
        return undefined;
    return value.slice(0, limit).map((item) => compactSensitiveText(item, itemLimit));
}
function dropUndefined(record) {
    return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}
function buildHubControlStatus(registryState, probe) {
    const registry = registryState;
    const hub = registry.hub || {};
    const tunnel = (hub.tunnel || {});
    const capabilities = probe?.capabilities || {};
    const endpoints = (capabilities.endpoints || {});
    return {
        endpointId: hub.id || "hub",
        localEndpoint: `http://127.0.0.1:${tunnel.localPort || "-"}`,
        health: probe?.status || "unknown",
        actionApi: Boolean(endpoints.actions),
        fileApi: Boolean(endpoints.fileList || endpoints.fileDownload || endpoints.fileUploadChunk),
        schedulerApi: Boolean(endpoints.scheduler),
        resultApi: Boolean(endpoints.resultsSummary),
        lastHeartbeat: probe?.checkedAt,
        controlActionsEnabled: Boolean(endpoints.actions),
    };
}
function buildWorkerTelemetryStatus(registryState, probes, realtime) {
    const registry = registryState;
    const realtimeEndpoints = new Map((realtime?.endpoints || []).map((endpoint) => [String(endpoint.id), endpoint]));
    return (registry.workers || []).map((worker) => {
        const tunnel = (worker.tunnel || {});
        const probe = probes[String(worker.id)];
        const stream = realtimeEndpoints.get(String(worker.id));
        const status = probe?.status === "ok" || stream?.streamStatus === "websocket" || stream?.streamStatus === "sse"
            ? "online"
            : stream?.streamStatus === "polling"
                ? "stale"
                : probe?.status === "local_port_closed"
                    ? "offline"
                    : probe?.status ? "conflict" : "unknown";
        return {
            workerId: worker.id,
            localEndpoint: `http://127.0.0.1:${tunnel.localPort || "-"}`,
            gpuTelemetry: Boolean(probe?.capabilities?.endpoints ? (probe?.capabilities).endpoints.gpu : true),
            workerTaskTelemetry: Boolean(probe?.capabilities?.endpoints ? (probe?.capabilities).endpoints.workerTasks : true),
            eventStream: stream?.streamStatus || "disconnected",
            lastHeartbeat: stream?.lastHeartbeatAt,
            localPort: tunnel.localPort,
            status,
        };
    });
}
function getSafeCommand(message) {
    const command = stringField(message, "command");
    return SAFE_WEBVIEW_COMMANDS.has(command) || uiActionCommands.has(command) ? command : "";
}
const hostOperationUiCommands = new Set([
    "quickSetup", "configureSessions", "configureAgentSessions", "writeAgentCommands",
    "saveTopologyMode", "saveHubConfig", "saveSchedulerConfig", "saveWorkerConfig", "addWorkerConfig", "deleteWorkerConfig",
    "startTunnelEndpoint", "startAgentEndpoint", "configureWorkers", "configurePorts", "repairPorts", "configure",
    "startHub", "startWorker", "start", "startAll", "startAgents", "startAllConnections", "prepareAgents",
    "restart", "pauseStream", "resumeStream", "pauseAll", "resumeNetwork", "script", "offline",
    "savePlan", "archivePlan", "restoreArchivedPlan", "runAllPlans", "generatePlanGuide", "bootstrapProject",
    "generateOutputAdapter", "saveProjectAdapterRules", "savePptPlotConfig", "choosePptPath", "chooseNewPptPath",
    "plotResultsToPpt", "startPptAutomation", "publishGithub", "syncGithub", "overwriteGithub",
    "uploadProjectToHub", "uploadProjectToWorkers", "distributeCodeToWorkers", "deployLatestAgent", "configureSftpIgnores",
    "downloadDebugBundle", "downloadRemoteResult", "openResultArtifact",
]);
function hostOperationLeaseActionForUiCommand(command) {
    if (!command)
        return "";
    if (actionCommandMap[command])
        return command;
    return hostOperationUiCommands.has(command) ? command : "";
}
function hostOperationLeaseActionLabel(command) {
    const labels = {
        quickSetup: "一键配置",
        configureSessions: "配置 Xshell 会话",
        configureAgentSessions: "配置 Agent 会话",
        writeAgentCommands: "写入 Agent 启动命令",
        startTunnelEndpoint: "启动隧道端点",
        startAgentEndpoint: "启动 Agent 端点",
        startHub: "启动 Hub 隧道",
        startWorker: "启动 Worker 隧道",
        start: "启动 Xshell 隧道",
        startAll: "启动全部隧道",
        startAgents: "启动 Agent 会话",
        startAllConnections: "启动全部连接",
        prepareAgents: "准备 Agent",
        runPlan: "运行计划",
        reproducePlan: "恢复并重新运行",
        runAllPlans: "运行全部计划",
        archivePlan: "归档计划",
        restoreArchivedPlan: "恢复归档计划",
        archiveArtifacts: "归档结果",
        deleteArtifacts: "删除结果",
        uploadProjectToHub: "上传项目到 Hub",
        uploadProjectToWorkers: "上传项目到 Worker",
        distributeCodeToWorkers: "分发代码到 Worker",
        deployLatestAgent: "部署 Agent runtime",
        configureSftpIgnores: "配置 SFTP 忽略规则",
        downloadDebugBundle: "下载调试包",
        downloadRemoteResult: "下载远端结果",
        openResultArtifact: "打开或下载结果文件",
    };
    return labels[command] || command;
}
function commandNeedsUiStatus(command) {
    return Boolean(command) && !COMMANDS_WITHOUT_UI_STATUS.has(command);
}
function localCommandReleasesAfterTrigger(command) {
    return LOCAL_COMMAND_RELEASES_AFTER_TRIGGER.has(String(command || ""));
}
function normalizeUiLayout(input) {
    const orderInput = Array.isArray(input.order) ? input.order.map((item) => String(item)) : [];
    const order = [
        ...orderInput.filter((item) => UI_LAYOUT_SECTION_KEYS.has(item)),
        ...defaultUiSectionOrder.filter((item) => !orderInput.includes(item)),
    ];
    const collapsedInput = input.collapsed && typeof input.collapsed === "object" && !Array.isArray(input.collapsed)
        ? input.collapsed
        : {};
    const collapsed = { ...defaultUiLayout.collapsed };
    for (const key of defaultUiSectionOrder) {
        if (typeof collapsedInput[key] === "boolean")
            collapsed[key] = Boolean(collapsedInput[key]);
    }
    return {
        order,
        collapsed,
        resourceTreeChildren: normalizeResourceTreeChildOrders(input.resourceTreeChildren),
        manual: typeof input.manual === "boolean" ? input.manual : Boolean(input.manual),
        columns: normalizeUiLayoutColumns(input.columns),
        treePinned: Boolean(input.treePinned),
        inspectorPinned: Boolean(input.inspectorPinned),
        pinnedCommands: normalizePinnedCommands(input.pinnedCommands),
        detailActions: normalizeUiButtonActions(input.detailActions, 40),
        pinnedActions: normalizeUiButtonActions(input.pinnedActions, 16),
    };
}
function normalizeResourceTreeChildOrders(input) {
    const record = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const out = {};
    for (const [section, raw] of Object.entries(record)) {
        if (!UI_LAYOUT_SECTION_KEYS.has(section) || !Array.isArray(raw))
            continue;
        const unique = [];
        for (const item of raw.map((value) => String(value || "").trim()).filter(Boolean)) {
            if (!unique.includes(item))
                unique.push(item);
        }
        if (unique.length)
            out[section] = unique.slice(0, 80);
    }
    return out;
}
function globalUiLayoutState(layout) {
    // Global template only: never store project order/columns/collapsed here.
    return {
        pinnedCommands: layout.pinnedCommands,
    };
}
function projectUiLayoutState(layout) {
    return {
        order: layout.order,
        collapsed: layout.collapsed,
        resourceTreeChildren: layout.resourceTreeChildren,
        manual: layout.manual,
        columns: layout.columns,
        treePinned: layout.treePinned,
        inspectorPinned: layout.inspectorPinned,
        pinnedCommands: layout.pinnedCommands,
        detailActions: layout.detailActions,
        pinnedActions: layout.pinnedActions,
    };
}
function mergeUiLayoutState(globalLayout, projectLayout) {
    // Project fields override. pinnedCommands prefer project when present, else global template.
    const projectPinned = Array.isArray(projectLayout.pinnedCommands) ? projectLayout.pinnedCommands : undefined;
    return {
        ...globalLayout,
        order: Array.isArray(projectLayout.order) ? normalizeUiLayout({ order: projectLayout.order }).order : globalLayout.order,
        collapsed: normalizeUiLayout({ collapsed: projectLayout.collapsed || globalLayout.collapsed }).collapsed,
        resourceTreeChildren: normalizeResourceTreeChildOrders(projectLayout.resourceTreeChildren || globalLayout.resourceTreeChildren),
        manual: typeof projectLayout.manual === "boolean" ? projectLayout.manual : globalLayout.manual,
        columns: normalizeUiLayoutColumns(projectLayout.columns || globalLayout.columns),
        treePinned: typeof projectLayout.treePinned === "boolean" ? projectLayout.treePinned : globalLayout.treePinned,
        inspectorPinned: typeof projectLayout.inspectorPinned === "boolean" ? projectLayout.inspectorPinned : globalLayout.inspectorPinned,
        pinnedCommands: normalizePinnedCommands(projectPinned && projectPinned.length ? projectPinned : globalLayout.pinnedCommands),
        detailActions: normalizeUiButtonActions(projectLayout.detailActions || globalLayout.detailActions, 40),
        pinnedActions: normalizeUiButtonActions(projectLayout.pinnedActions || globalLayout.pinnedActions, 16),
    };
}
function normalizeUiProjectLayoutState(input, fallback) {
    const record = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const hasPinned = Array.isArray(record.pinnedCommands);
    return {
        order: Array.isArray(record.order) ? normalizeUiLayout({ order: record.order }).order : fallback.order,
        collapsed: normalizeUiLayout({ collapsed: record.collapsed || fallback.collapsed }).collapsed,
        resourceTreeChildren: normalizeResourceTreeChildOrders(record.resourceTreeChildren || fallback.resourceTreeChildren),
        manual: typeof record.manual === "boolean" ? record.manual : fallback.manual,
        columns: normalizeUiLayoutColumns(record.columns || fallback.columns),
        treePinned: typeof record.treePinned === "boolean" ? record.treePinned : fallback.treePinned,
        inspectorPinned: typeof record.inspectorPinned === "boolean" ? record.inspectorPinned : fallback.inspectorPinned,
        pinnedCommands: normalizePinnedCommands(hasPinned ? record.pinnedCommands : fallback.pinnedCommands),
        detailActions: normalizeUiButtonActions(record.detailActions || fallback.detailActions, 40),
        pinnedActions: normalizeUiButtonActions(record.pinnedActions || fallback.pinnedActions, 16),
    };
}
function normalizeUiLayoutColumns(input) {
    const record = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    return {
        tree: clampUiNumber(record.tree, 220, 420, defaultUiLayout.columns.tree),
        inspector: clampUiNumber(record.inspector, 280, 520, defaultUiLayout.columns.inspector),
    };
}
function normalizePinnedCommands(input) {
    const source = Array.isArray(input) ? input : defaultUiLayout.pinnedCommands;
    const unique = [];
    for (const command of source.map((item) => String(item || ""))) {
        if (PINNED_UI_COMMANDS.has(command) && !unique.includes(command))
            unique.push(command);
    }
    return unique.slice(0, 8);
}
function normalizeUiButtonActions(input, limit) {
    if (!Array.isArray(input))
        return [];
    const out = [];
    const seen = new Set();
    for (const raw of input) {
        const record = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
        const command = typeof record.command === "string" ? record.command.trim() : "";
        if (!UI_BUTTON_ACTION_COMMANDS.has(command))
            continue;
        const payload = normalizeUiButtonPayload(record.payload);
        const section = typeof record.section === "string" ? record.section.trim() : "";
        const label = typeof record.label === "string" && record.label.trim() ? record.label.trim().slice(0, 48) : command;
        const id = typeof record.id === "string" && record.id.trim()
            ? record.id.trim().slice(0, 240)
            : [section, command, Object.keys(payload).sort().map((key) => `${key}=${payload[key]}`).join("|"), label].join("|").slice(0, 240);
        if (seen.has(id))
            continue;
        seen.add(id);
        out.push({
            id,
            command,
            label,
            section,
            payload,
            confirm: record.confirm === true,
            danger: record.danger === true,
            batch: record.batch === true,
            configScope: typeof record.configScope === "string" ? record.configScope.trim().slice(0, 80) : "",
        });
        if (out.length >= limit)
            break;
    }
    return out;
}
function normalizeUiButtonPayload(input) {
    const record = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const out = {};
    for (const [key, value] of Object.entries(record)) {
        if (!UI_BUTTON_PAYLOAD_KEYS.has(key))
            continue;
        if (typeof value === "string")
            out[key] = value.slice(0, 500);
        else if (typeof value === "number" && Number.isFinite(value))
            out[key] = value;
        else if (typeof value === "boolean")
            out[key] = value;
    }
    return out;
}
function clampUiNumber(input, min, max, fallback) {
    const value = typeof input === "number" ? input : Number(input);
    if (!Number.isFinite(value))
        return fallback;
    return Math.max(min, Math.min(max, Math.round(value)));
}
function stringField(message, key) {
    if (!message || typeof message !== "object")
        return "";
    const value = message[key];
    return typeof value === "string" ? value.trim() : "";
}
function stringValue(value) {
    return typeof value === "string" ? value.trim() : "";
}
function stringArrayField(message, key) {
    if (!message || typeof message !== "object")
        return [];
    const value = message[key];
    if (!Array.isArray(value))
        return [];
    return Array.from(new Set(value.map((item) => usableSelectionKey(typeof item === "string" ? item.trim() : "")).filter(Boolean)));
}
function taskActionTargetsField(message) {
    if (!message || typeof message !== "object")
        return [];
    const value = message.selectedTaskTargets;
    if (!Array.isArray(value))
        return [];
    const targets = value.map((item) => {
        const row = item && typeof item === "object" && !Array.isArray(item) ? item : {};
        return {
            workerId: usableSelectionKey(stringValue(row.workerId)),
            taskUiKey: usableSelectionKey(stringValue(row.taskUiKey)),
            runKey: usableSelectionKey(stringValue(row.runKey)),
            experimentId: usableSelectionKey(stringValue(row.experimentId)),
            archiveKey: usableSelectionKey(stringValue(row.archiveKey)),
            planFile: usableSelectionKey(stringValue(row.planFile)),
            artifactPath: stringValue(row.artifactPath),
            resultPath: stringValue(row.resultPath),
            logPath: stringValue(row.logPath),
        };
    }).filter((target) => target.workerId || target.taskUiKey || target.runKey || target.experimentId || target.archiveKey);
    const seen = new Set();
    return targets.filter((target) => {
        const key = [target.workerId, target.taskUiKey, target.runKey, target.experimentId, target.archiveKey, target.planFile].join("|");
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function firstNonEmpty(...values) {
    for (const value of values) {
        const text = String(value || "").trim();
        if (text)
            return text;
    }
    return "";
}
function resolveSftpTransferHost(label, values) {
    const invalid = [];
    for (const value of values) {
        const text = String(value || "").trim();
        if (!text)
            continue;
        if (looksLikeConcreteSftpHost(text))
            return text;
        invalid.push(text);
    }
    const suffix = invalid.length ? `已忽略不可用地址：${uniqueStrings(invalid).join("、")}。` : "";
    throw new Error(`${label || "目标"} 缺少可用于 SFTP 文件传输的真实服务器地址。请在服务器管理中填写真实 IP/域名，或确认 Xshell .xsh 会话能解析出 Host；显示名、会话名和不可解析别名不会作为文件传输地址。${suffix}`);
}
function looksLikeConcreteSftpHost(value) {
    const text = String(value || "").trim();
    if (!text || /[\s\\/@]/.test(text))
        return false;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(text)) {
        return text.split(".").every((part) => Number(part) >= 0 && Number(part) <= 255);
    }
    if (text.includes(":") && /^[0-9a-fA-F:]+$/.test(text))
        return true;
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(text))
        return false;
    const labels = text.split(".");
    if (labels.some((label) => !label || label.length > 63 || label.startsWith("-") || label.endsWith("-")))
        return false;
    if (labels.length > 1 && /^\d+$/.test(labels[labels.length - 1]))
        return false;
    return true;
}
function numberField(message, key) {
    if (!message || typeof message !== "object")
        return undefined;
    const value = message[key];
    const numberValue = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numberValue) ? Math.trunc(numberValue) : undefined;
}
function stringArrayConfig(value) {
    return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}
function arrayFromRecord(record, key) {
    const value = record[key];
    return Array.isArray(value) ? value : [];
}
function nestedRecord(record, key) {
    const value = record[key];
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function projectOutputGateReason(project, plan) {
    const diagnostics = projectOutputGateDiagnostics(project || {}, plan);
    if (diagnostics.ok)
        return "";
    const next = diagnostics.nextStep || projectOutputGateFixes(diagnostics.missing, plan, project)[0] || "";
    return `运行前检查未通过。缺少：${diagnostics.missing.join("、")}。${next ? `下一步：${next}。` : ""}推荐 metrics_summary.csv 列：experiment_id,suite,method,dataset,split,seed,metric,value。`;
}
function projectOutputGateDiagnostics(project, plan) {
    const rules = nestedRecord(project || {}, "adapterRules");
    const contractReady = !plan || plan.planContractOk !== false;
    const configFile = String(plan?.baseConfig || plan?.base_config || "").trim();
    const configReady = !configFile || /[{}$]/.test(configFile) || arrayFromRecord(project || {}, "configs").includes(configFile);
    const planSignals = contractReady ? planOutputEvidenceSignals(plan) : [];
    const planCandidates = contractReady ? planOutputEvidenceCandidates(plan) : [];
    const planReady = planSignals.length > 0 && planCandidates.length > 0;
    const ruleCandidateCount = actionableAdapterRuleSignals(rules) ? adapterRuleResultCandidates(rules).length : 0;
    const candidateCount = ruleCandidateCount + planCandidates.length;
    const projectContractCount = arrayFromRecord(project || {}, "outputContractFiles").length;
    const planContractCount = planCandidates.filter((file) => /(^|\/)(metrics_summary\.csv|metrics_case\.csv)$/i.test(file)).length;
    const parseablePreview = planScopedResultParsePreviews(arrayFromRecord(project || {}, "resultParsePreviews"), plan, rules).items.some(resultPreviewHasRecords);
    const adapterReady = Boolean(stringPatch(project || {}, "adapterConfig"));
    const explicitAdapterReady = adapterReady && ruleCandidateCount > 0;
    const accessReady = planReady || ruleCandidateCount > 0;
    const outputReady = planReady || ruleCandidateCount > 0;
    const checks = [
        { label: "计划强契约", ok: contractReady, fix: planContractFixText(plan) },
        { label: "配置文件", ok: configReady, fix: `在工作区创建或在 Plan 中改为可用配置：${configFile || "configs/*.yaml"}` },
        { label: "接入配置", ok: explicitAdapterReady || planReady || ruleCandidateCount > 0, fix: adapterReady ? "打开 experiments/zlk_project.yaml 补充候选结果规则，或在当前 plan 中声明 result_csv、metrics_summary.csv、stdout/stderr 捕获" : "先在“实验准备 > 项目接入”点击“生成输出接入模板”，生成 experiments/zlk_project.yaml，或在当前 plan 中声明 result_csv、metrics_summary.csv、stdout/stderr 捕获" },
        { label: "计划输出", ok: planReady || ruleCandidateCount > 0, fix: "在 plan 的 paper.result_csv、当前 mode 实际执行命令的结果参数或 expectedResults 中写明可解析结果位置" },
        { label: "候选结果规则", ok: candidateCount > 0 || planReady, fix: "补充 candidateCsv / candidateJson / consoleLogs / textLogs / metricRegex，或点击“保存接入规则”写入推断结果" },
        { label: "标准结果契约", ok: planContractCount > 0 || ruleCandidateCount > 0 || (projectContractCount > 0 && planReady), fix: "推荐让测试代码输出 metrics_summary.csv，或使用 run_wrapper 捕获 stdout/stderr 后归一化" },
        { label: "解析预览", ok: parseablePreview || planReady || ruleCandidateCount > 0, fix: "保存接入规则后点击“刷新识别”，确认至少一个候选输出能解析出指标" },
    ];
    const missing = checks.filter((item) => !item.ok).map((item) => item.label);
    const next = checks.find((item) => !item.ok);
    return {
        ok: contractReady && configReady && accessReady && outputReady,
        rows: checks,
        missing,
        nextLabel: next ? next.label : "",
        nextStep: next ? (next.fix || "") : "",
    };
}
function actionableAdapterRuleSignals(rules) {
    const inferred = rules.inferredFromProject === true;
    const inferredSignals = arrayFromRecord(rules, "inferredSignals");
    if (inferred && inferredSignals.length === 0)
        return false;
    return adapterRuleResultCandidates(rules).length > 0;
}
function compactSchedulerDependenciesForWebview(value) {
    const item = objectRecord(value);
    if (!item)
        return undefined;
    const environment = objectRecord(item.environment);
    return dropUndefined({
        ok: item.ok === true,
        missingRuntime: item.missingRuntime === true,
        environment: environment ? dropUndefined({
            kind: environment.kind,
            name: compactSensitiveText(environment.name, 120),
            label: compactSensitiveText(environment.label, 180),
            python: compactSensitiveText(environment.python, 360),
        }) : undefined,
        missingModules: Array.isArray(item.missingModules) ? item.missingModules.slice(0, 12).map((row) => ({ module: String(row?.module || ""), package: String(row?.package || "") })) : [],
        installCommand: compactSensitiveText(item.installCommand, 600),
        message: compactSensitiveText(item.message, 800),
        checkedAt: item.checkedAt,
    });
}
function booleanField(message, key) {
    if (!message || typeof message !== "object")
        return false;
    const value = message[key];
    if (typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return value !== 0;
    const text = String(value || "").trim().toLowerCase();
    return ["1", "true", "yes", "on"].includes(text);
}
function adapterRuleResultCandidates(rules) {
    return uniqueStrings([
        ...arrayFromRecord(rules, "candidateCsv"),
        ...arrayFromRecord(rules, "candidateJson"),
        ...arrayFromRecord(rules, "consoleLogs"),
        ...arrayFromRecord(rules, "textLogs"),
    ].map((item) => String(item || "").trim()).filter(isParseableResultCandidate));
}
function inferredPlanAdapterRuleCandidates(rules) {
    return uniqueStrings([
        ...arrayFromRecord(rules, "inferredPlanCandidateCsv"),
        ...arrayFromRecord(rules, "inferredPlanCandidateJson"),
        ...arrayFromRecord(rules, "inferredPlanConsoleLogs"),
        ...arrayFromRecord(rules, "inferredPlanTextLogs"),
    ].map((item) => String(item || "").trim()).filter(isParseableResultCandidate));
}
function projectOutputGateFixes(missing, plan, project) {
    const adapterReady = Boolean(stringPatch(project || {}, "adapterConfig"));
    const fixes = {
        计划强契约: planContractFixText(plan),
        配置文件: `在工作区创建或在 Plan 中改为可用配置：${String(plan?.baseConfig || plan?.base_config || "configs/*.yaml")}`,
        接入配置: adapterReady ? "打开 experiments/zlk_project.yaml 补充候选结果规则，或在当前 plan 中声明 result_csv、metrics_summary.csv、stdout/stderr 捕获" : "先在“实验准备 > 项目接入”点击“生成输出接入模板”，生成 experiments/zlk_project.yaml，或在当前 plan 中声明 result_csv、metrics_summary.csv、stdout/stderr 捕获",
        计划输出: "在 plan 的 paper.result_csv、当前 mode 实际执行命令的结果参数或 expectedResults 中写明可解析结果位置",
        候选结果规则: "补充 candidateCsv / candidateJson / consoleLogs / textLogs / metricRegex，或点击“保存接入规则”写入推断结果",
        标准结果契约: "推荐让测试代码输出 metrics_summary.csv，或使用 run_wrapper 捕获 stdout/stderr 后归一化",
        解析预览: "保存接入规则后点击“刷新识别”，确认至少一个候选输出能解析出指标",
    };
    return uniqueStrings(missing.map((item) => fixes[item] || "").filter(Boolean));
}
function planContractFixText(plan) {
    const issues = Array.isArray(plan?.planContractIssues) ? plan.planContractIssues : [];
    const fixes = issues.map((item) => item.fix).filter(Boolean);
    if (fixes.length)
        return fixes.join("；");
    const missing = Array.isArray(plan?.planContractMissing) && plan.planContractMissing.length ? plan.planContractMissing.join("、") : "suite、base_config/config、seeds、cases、训练命令、测试命令、结果输出";
    return `按共享 plan 契约补齐：${missing}`;
}
function resultPreviewHasRecords(item) {
    const row = item && typeof item === "object" ? item : {};
    return row.parseable === true && Number(row.records || row.recordCount || row.rows || row.rowCount || 0) > 0;
}
function normalizeResultCandidatePath(value) {
    return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
}
function compileResultCandidatePatterns(candidates, plan) {
    plan = plan || {};
    const known = {
        suite: String(plan?.suite || "").trim(),
        plan: String(plan?.planFile || plan?.file || plan?.planId || "").trim(),
        plan_file: String(plan?.planFile || plan?.file || "").trim(),
    };
    const basenames = new Set();
    const exactPaths = new Set();
    const patterns = [];
    for (const candidate of candidates) {
        const pattern = normalizeResultCandidatePath(candidate);
        if (!pattern)
            continue;
        if (!/[?*]/.test(pattern) && !pattern.includes(String.fromCharCode(123))) {
            if (pattern.includes("/"))
                exactPaths.add(pattern.toLowerCase());
            else
                basenames.add(pattern.toLowerCase());
            continue;
        }
        let source = "^";
        for (let index = 0; index < pattern.length;) {
            const placeholder = pattern.slice(index).match(/^\{+([A-Za-z0-9_.-]+)\}+/);
            if (placeholder) {
                const key = placeholder[1];
                const value = known[key];
                source += value ? escapeRegExp(value.replace(/\\/g, "/")) : /output_?dir/i.test(key) ? ".+" : "[^/]+";
                index += placeholder[0].length;
                continue;
            }
            const char = pattern[index];
            if (char === "*") {
                if (pattern[index + 1] === "*") {
                    source += ".*";
                    index += 2;
                }
                else {
                    source += "[^/]*";
                    index += 1;
                }
                continue;
            }
            if (char === "?") {
                source += "[^/]";
                index += 1;
                continue;
            }
            source += escapeRegExp(char);
            index += 1;
        }
        try {
            patterns.push(new RegExp(`${source}$`, "i"));
        }
        catch {
            // Ignore malformed candidates while retaining valid matchers.
        }
    }
    return { basenames, exactPaths, patterns };
}
function compiledResultCandidatesMatchFile(compiled, file) {
    const target = normalizeResultCandidatePath(file);
    if (!target)
        return false;
    const normalized = target.toLowerCase();
    return compiled.exactPaths.has(normalized)
        || compiled.basenames.has(path.posix.basename(target).toLowerCase())
        || compiled.patterns.some((pattern) => pattern.test(target));
}
function resultCandidatePatternMatchesFile(candidate, file, plan) {
    return compiledResultCandidatesMatchFile(compileResultCandidatePatterns([candidate], plan), file);
}
function planScopedResultParsePreviews(previews, plan, rules) {
    const all = (Array.isArray(previews) ? previews : []).filter((item) => item && typeof item === "object");
    const selected = Boolean(plan && (plan.planFile || plan.file || plan.planId || plan.suite));
    if (!selected)
        return { items: all, totalCount: all.length, hiddenCount: 0, candidateCount: 0, scoped: false };
    const candidates = uniqueStrings([
        ...planOutputEvidenceCandidates(plan),
        ...adapterRuleResultCandidates(rules || {}),
    ]);
    const compiled = compileResultCandidatePatterns(candidates, plan);
    const items = candidates.length ? all.filter((item) => compiledResultCandidatesMatchFile(compiled, item.file || item.path || "")) : [];
    return { items, totalCount: all.length, hiddenCount: Math.max(0, all.length - items.length), candidateCount: candidates.length, scoped: true };
}
function planOutputCandidates(plan) {
    return uniqueStrings((plan?.outputCandidates || []).map((item) => String(item || "").trim()).filter(Boolean));
}
function planOutputEvidenceCandidates(plan) {
    return planOutputCandidates(plan).filter(isParseableResultCandidate);
}
function planOutputEvidenceSignals(plan) {
    return uniqueStrings((plan?.outputSignals || [])
        .map((item) => String(item || "").trim())
        .filter((item) => /result_csv|results_csv|metrics_csv|summary_csv|标准契约|结果文件|结果目录|命令参数|文本日志|classification_report|stdout|stderr|metricRegex/i.test(item)));
}
function isParseableResultCandidate(value) {
    const text = String(value || "").trim().replace(/\\/g, "/");
    const base = text.split("/").pop() || "";
    if (!text || /^zlk_cluster\/results\//i.test(text)
        || /^(?:jobs\.csv|artifact_manifest\.json|checkpoint_manifest\.json|manifest\.json|metadata\.json|status\.json|state\.json|progress\.json|job\.json|jobs\.json|env_snapshot\.json|config_snapshot\.(?:json|ya?ml))$/i.test(base)
        || /(?:_snapshot|_manifest|_status|_state|_progress)\.json$/i.test(base))
        return false;
    return /\.(csv|json|txt|log|out)$/i.test(text);
}
function usableSelectionKey(value) {
    const text = value.trim();
    return text && text !== "-" ? text : "";
}
function workerAliasKey(value) {
    const text = String(value || "").trim();
    if (!text || text === "-")
        return "";
    const basename = text.replace(/\\/g, "/").split("/").pop() || text;
    return basename
        .replace(/\.xsh$/i, "")
        .replace(/^worker:/i, "")
        .replace(/^ssh-config:/i, "")
        .trim()
        .toLowerCase();
}
function recordField(message, key) {
    if (!message || typeof message !== "object")
        return {};
    const value = message[key];
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function boolField(message, key, fallback) {
    if (!message || typeof message !== "object")
        return fallback;
    const value = message[key];
    return typeof value === "boolean" ? value : fallback;
}
function nonEmptyWorkerTunnelConfig(value) {
    return Array.isArray(value) && value.length ? value : [];
}
function topologyModeLabel(value) {
    if (value === "single_worker")
        return "单 Worker模式";
    if (value === "worker_pool")
        return "仅多 Worker模式";
    if (value === "hub_worker")
        return "Hub 可用模式";
    return "尚未确认";
}
function stringPatch(patch, key, fallback = "") {
    const value = patch[key];
    return typeof value === "string" ? value.trim() : fallback;
}
function preservedStringPatch(patch, key, fallback = "") {
    const value = patch[key];
    if (typeof value !== "string")
        return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
}
function optionalStringPatch(patch, key, fallback) {
    const value = stringPatch(patch, key, fallback || "");
    return value || undefined;
}
function preservedOptionalStringPatch(patch, key, fallback) {
    const value = preservedStringPatch(patch, key, fallback || "");
    return value || undefined;
}
function condaEnvPatch(patch, key, fallback = "") {
    if (!Object.prototype.hasOwnProperty.call(patch, key))
        return String(fallback || "").trim();
    const value = patch[key];
    return typeof value === "string" ? value.trim() : String(fallback || "").trim();
}
function effectiveWorkerCondaEnv(worker, fallback = "") {
    if (worker && worker.condaEnv !== undefined)
        return String(worker.condaEnv || "").trim();
    return String(fallback || "").trim();
}
function executionEnvironmentLabel(value) {
    const condaEnv = String(value || "").trim();
    return condaEnv ? `Conda ${condaEnv}` : "系统 Python（未指定 Conda）";
}
function clearableOptionalStringPatch(patch, key, fallback) {
    if (!Object.prototype.hasOwnProperty.call(patch, key))
        return fallback || undefined;
    const value = patch[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function sessionScopedOptionalStringPatch(patch, key, fallback, sessionChanged) {
    if (!Object.prototype.hasOwnProperty.call(patch, key))
        return sessionChanged ? undefined : fallback || undefined;
    const value = patch[key];
    if (typeof value !== "string")
        return sessionChanged ? undefined : fallback || undefined;
    const trimmed = value.trim();
    if (!trimmed)
        return undefined;
    if (sessionChanged && fallback && trimmed === fallback.trim())
        return undefined;
    return trimmed;
}
function sessionPathChanged(previous, next) {
    return localPathKey(previous || "") !== localPathKey(next || "");
}
function currentSessionResolvedHost(sessionHost, current) {
    const fromSession = String(sessionHost || "").trim();
    const existing = String(current || "").trim();
    if (fromSession && looksLikeConcreteSftpHost(fromSession))
        return fromSession;
    if (existing && looksLikeConcreteSftpHost(existing))
        return existing;
    return fromSession || existing || undefined;
}
function numberPatch(patch, key, fallback) {
    if (!hasNumericPatchValue(patch, key))
        return fallback;
    const value = Number(patch[key]);
    return Number.isFinite(value) && value >= 1 && value <= 65535 ? Math.trunc(value) : fallback;
}
function numberRangePatch(patch, key, fallback, min, max) {
    if (!hasNumericPatchValue(patch, key))
        return fallback;
    const value = Number(patch[key]);
    if (!Number.isFinite(value))
        return fallback;
    return Math.max(min, Math.min(max, Math.trunc(value)));
}
function forwardIndexPatch(patch, key, fallback) {
    if (!hasNumericPatchValue(patch, key))
        return fallback;
    const value = Number(patch[key]);
    return Number.isInteger(value) && value >= 0 ? value : fallback;
}
function hasNumericPatchValue(patch, key) {
    if (!Object.prototype.hasOwnProperty.call(patch, key))
        return false;
    const value = patch[key];
    if (value === undefined || value === null)
        return false;
    if (typeof value === "string" && value.trim() === "")
        return false;
    return true;
}
function boolishPatch(patch, key, fallback) {
    const value = patch[key];
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string")
        return value === "true" || value === "1" || value === "yes";
    return fallback;
}
function stringArrayPatch(patch, key, fallback = []) {
    const value = patch[key];
    if (Array.isArray(value)) {
        return Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)));
    }
    if (typeof value === "string") {
        return Array.from(new Set(value.split(/[,\s]+/).map((item) => item.trim()).filter(Boolean)));
    }
    return [...fallback];
}
function makeOpId(action) {
    return `${action}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function workerActionDedupKey(action, workerId, body) {
    const options = nestedRecord(body || {}, "options");
    const targets = taskActionTargetsField(body)
        .map((target) => [
        target.workerId,
        target.taskUiKey,
        target.runKey,
        target.experimentId,
        target.archiveKey,
        target.planFile,
    ].map((value) => value || "-").join(":"))
        .sort();
    const selected = [
        ["run", uniqueStrings([usableSelectionKey(stringValue(body.runKey)), ...stringArrayField(body, "selectedRunKeys")]).sort()],
        ["experiment", uniqueStrings([usableSelectionKey(stringValue(body.experimentId)), ...stringArrayField(body, "selectedExperimentIds")]).sort()],
        ["archive", uniqueStrings([usableSelectionKey(stringValue(body.archiveKey)), ...stringArrayField(body, "selectedArchiveKeys")]).sort()],
        ["task", uniqueStrings(stringArrayField(body, "selectedTaskUiKeys")).sort()],
        ["plan", uniqueStrings([
                usableSelectionKey(stringValue(body.planFile)),
                usableSelectionKey(stringValue(options.planFile)),
                ...stringArrayField(body, "selectedPlanFiles"),
                ...stringArrayField(options, "selectedPlanFiles"),
            ]).sort()],
    ].filter(([, values]) => Array.isArray(values) && values.length);
    const targetPart = targets.length
        ? `targets=${targets.join(";")}`
        : selected.length
            ? selected.map(([key, values]) => `${key}=${values.join(",")}`).join(";")
            : "target=untargeted";
    return ["worker-action", action, workerId || "worker", targetPart].join("|");
}
function chooseXshellForward(info, selectedIndex, currentLocalPort, currentRemotePort) {
    if (!info?.forwards.length)
        return undefined;
    const safeForwards = info.forwards.filter(xshellForwardIsLoopback);
    if (!safeForwards.length)
        return undefined;
    if (selectedIndex !== undefined) {
        const byIndex = safeForwards.find((forward) => forward.index === selectedIndex);
        if (byIndex)
            return byIndex;
    }
    const byPorts = safeForwards.find((forward) => forward.localPort === currentLocalPort && forward.remotePort === currentRemotePort);
    return byPorts || (0, XshellSessionScanner_1.preferredZlkForward)({ ...info, forwards: safeForwards });
}
function xshellForwardIsLoopback(forward) {
    return xshellForwardHostIsLoopback(forward.localHost) && xshellForwardHostIsLoopback(forward.remoteHost);
}
function xshellForwardHostIsLoopback(value) {
    const text = String(value || "").trim().toLowerCase();
    return !text || text === "127.0.0.1" || text === "localhost" || text === "::1" || text === "[::1]";
}
function unsafeXshellForwardMessages(info) {
    return (info?.forwards || [])
        .filter((forward) => !xshellForwardIsLoopback(forward))
        .map((forward) => `FwdReq_${forward.index} ${forward.localHost || "-"}:${forward.localPort} -> ${forward.remoteHost || "-"}:${forward.remotePort}`);
}
function capabilityForAction(action) {
    return ["endpoints.actions", `actions.${action}`];
}
function capabilityForUiCommand(command, action) {
    const keys = capabilityForAction(action);
    if (command === "refreshResults")
        return [...keys, "endpoints.resultsSummary"];
    return keys;
}
function hasCapability(caps, fileCaps, key) {
    if (key === "endpoints.fileList")
        return Boolean(caps?.endpoints?.fileList || fileCaps?.supportsList);
    if (key === "endpoints.fileDownload")
        return Boolean(caps?.endpoints?.fileDownload || fileCaps?.supportsDownload);
    if (key === "endpoints.fileUploadChunk")
        return Boolean(caps?.endpoints?.fileUploadChunk || fileCaps?.supportsUploadChunk);
    if (key.startsWith("endpoints."))
        return Boolean(caps?.endpoints?.[key.slice("endpoints.".length)]);
    if (key.startsWith("actions.")) {
        const action = key.slice("actions.".length);
        const endpoints = caps?.endpoints;
        const actions = caps?.actionEndpoints;
        return Boolean(endpoints?.actions && actions?.[action] === true);
    }
    return false;
}
function resultStatus(result) {
    if (!result || typeof result !== "object")
        return undefined;
    const item = result;
    return stringFromRecord(item, ["status", "state"]) || (item.accepted ? "accepted" : undefined);
}
function actionRequiresResultReparse(action) {
    return RESULT_REPARSE_ACTIONS.has(String(action || ""));
}
function normalizeActionSubmissionResult(result, operationId, status) {
    const item = result && typeof result === "object" ? result : {};
    return {
        ...item,
        operationId,
        opId: operationId,
        status: String(status || resultStatus(item) || "accepted"),
        ...(!Object.keys(item).length ? { accepted: true } : {}),
    };
}
function stringFromRecord(item, keys) {
    for (const key of keys) {
        const value = item[key];
        if (typeof value === "string" && value.trim())
            return value.trim();
    }
    return "";
}
function planDirSafe() {
    try {
        return vscode.workspace.getConfiguration("zlkCluster").get("planDir", "experiments/plans").replace(/\\/g, "/");
    }
    catch {
        return "experiments/plans";
    }
}
const localPlanSummaryReadBudgetBytes = 512 * 1024;
const localPlanSummaryConcurrency = 8;
async function readLocalPlans(root, planDir) {
    const dir = path.join(root, planDir);
    const files = await walkYaml(dir).catch(() => []);
    return mapLimited(files.filter((fullPath) => !isArchivedPlanFile(root, planDir, fullPath)), localPlanSummaryConcurrency, async (fullPath) => {
        const text = await readUtf8Preview(fullPath, localPlanSummaryReadBudgetBytes);
        const stat = await fs.stat(fullPath).catch(() => undefined);
        const relative = path.relative(root, fullPath).replace(/\\/g, "/");
        return { ...parseLocalPlanText(relative, text), updatedAt: stat?.mtime?.toISOString?.(), metadataTruncated: Boolean(stat && stat.size > localPlanSummaryReadBudgetBytes) };
    });
}
async function readArchivedLocalPlans(root, planDir) {
    const dir = path.join(root, planDir, "_archived");
    const files = await walkYaml(dir).catch(() => []);
    const rows = await mapLimited(files, localPlanSummaryConcurrency, async (fullPath) => {
        const bundle = await readPlanArchiveBundle(fullPath);
        if (bundle.schemaVersion && path.basename(fullPath).toLowerCase() !== "plan.yaml")
            return undefined;
        const text = await readUtf8Preview(fullPath, localPlanSummaryReadBudgetBytes);
        const stat = await fs.stat(fullPath).catch(() => undefined);
        const relative = path.relative(root, fullPath).replace(/\\/g, "/");
        const summary = parseLocalPlanText(relative, text);
        const resultSelectionPath = normalizePlanArchiveEvidencePath(stringField(bundle.resultSelection || {}, "path"));
        return { ...summary, metadataTruncated: Boolean(stat && stat.size > localPlanSummaryReadBudgetBytes), status: "archived", archivedFile: relative, archivedAt: bundle.archivedAt || stat?.mtime?.toISOString?.(), originalFile: bundle.originalPlanFile || summary.planFile.replace(/(^|\/)_archived\//, "$1"), archiveBundle: Boolean(bundle.schemaVersion), archiveConfigCount: Array.isArray(bundle.configs) ? bundle.configs.length : 0, archiveEnvironmentCount: Array.isArray(bundle.environment) ? bundle.environment.length : 0, archiveParameterCount: Number(bundle.parameters?.parameterCount || 0), archiveParameterReviewCount: Number(bundle.parameters?.reviewCount || 0), archiveEntryScriptCount: archiveManifestFileList(bundle.parameters?.entryScripts).length, archiveEvidenceCount: Array.isArray(bundle.evidence) ? bundle.evidence.length : 0, archiveEvidenceSourceMode: String(bundle.evidenceSource?.mode || bundle.resultArchive?.sourceMode || ""), archiveResultSelectionFile: resultSelectionPath ? path.posix.join(path.posix.dirname(relative), resultSelectionPath) : "", archiveResultSelectionTotalCount: Number(bundle.resultSelection?.totalCount || 0), archiveResultSelectionIncludedCount: Number(bundle.resultSelection?.includedCount || 0), archiveResultSelectionNotIncludedCount: Number(bundle.resultSelection?.notIncludedCount || 0), archiveConfigMigratedCount: archiveManifestFileList(bundle.configArchive?.migrated).length, archiveConfigRetainedCount: archiveManifestFileList(bundle.configArchive?.retainedShared).length, archiveResultMigratedCount: archiveManifestFileList(bundle.resultArchive?.migrated).length };
    });
    return rows.filter(Boolean);
}
function numberFromRecord(item, keys) {
    for (const key of keys) {
        const value = Number(item?.[key]);
        if (Number.isFinite(value))
            return value;
    }
    return 0;
}
function sameProjectRelativePath(left, right) {
    return String(left || "").trim().replace(/\\/g, "/").toLowerCase() === String(right || "").trim().replace(/\\/g, "/").toLowerCase();
}
function isFinalStatisticsOrPaperPath(value) {
    const pathValue = String(value || "").trim().replace(/\\/g, "/").toLowerCase();
    return /(^|\/)statistics\.json$/.test(pathValue) || /(^|\/)zlk_results_table(?:__[^/]+)?\.(?:csv|md)$/.test(pathValue);
}
function finalPlotSourcesFromSummary(summary) {
    const item = summary && typeof summary === "object" ? summary : {};
    const archivedCount = numberFromRecord(item, ["effectiveArchivedResultCount", "effective_archived_result_count", "finalResultCount", "final_result_count"]);
    if (archivedCount <= 0)
        return [];
    const out = [];
    const statisticsPath = stringFromRecord(item, ["statisticsPath", "statistics_path"]);
    const statisticsCount = numberFromRecord(item, ["statisticsResultCount", "statistics_result_count"]);
    if (statisticsPath && statisticsCount === archivedCount)
        out.push(statisticsPath);
    const paperTablePath = stringFromRecord(item, ["paperTableCsvPath", "paper_table_csv_path", "paperTablePath", "paper_table_path", "exportPath"]);
    const paperTableCount = numberFromRecord(item, ["paperTableResultCount", "paper_table_result_count"]);
    if (paperTablePath && paperTableCount === archivedCount)
        out.push(paperTablePath);
    return uniqueStrings(out);
}
function serverSetupMissingItems(setup, hubRequired = true) {
    const config = setup && typeof setup === "object" ? setup : {};
    const missing = [];
    if (hubRequired && !String(config.savedSessionPath || "").trim())
        missing.push("Hub Xshell 会话");
    if (hubRequired && !String(config.agentProjectDir || "").trim())
        missing.push("Hub 项目父目录");
    const workers = Array.isArray(config.workerTunnels) ? config.workerTunnels.filter((worker) => worker && worker.enabled !== false) : [];
    for (const worker of workers) {
        const label = String(worker.displayName || worker.id || "Worker");
        if (!String(worker.savedSessionPath || "").trim())
            missing.push(`${label} Xshell 会话`);
        if (!String(worker.agentProjectDir || "").trim())
            missing.push(`${label} 项目父目录`);
    }
    return missing;
}
function noHubWorkerHealth(workerProbes) {
    const probes = Object.values(workerProbes || {});
    const ready = probes.length > 0 && probes.every((probe) => String(probe?.status || "").toLowerCase() === "ok");
    return {
        state: ready ? "agent_ok" : "worker_unavailable",
        status: ready ? "agent_ok" : "worker_unavailable",
        checkedAt: new Date().toISOString(),
        message: ready ? "无 Hub 拓扑的 Worker Agent 检测通过。" : "无 Hub 拓扑至少有一个 Worker Agent 未通过检测。",
    };
}
function tunnelTestCompletion(setup, hubProbe, health, workerProbes, hubRequired = true) {
    const hub = hubProbe && typeof hubProbe === "object" ? hubProbe : {};
    const fallbackHealth = health && typeof health === "object" ? health : {};
    const probes = workerProbes && typeof workerProbes === "object" ? workerProbes : {};
    const hubStatus = String(hub.status || fallbackHealth.state || "unknown").toLowerCase();
    const hubReady = ["ok", "file_api_unavailable", "agent_ok"].includes(hubStatus);
    const enabledWorkers = Array.isArray(setup?.workerTunnels)
        ? setup.workerTunnels.filter((worker) => worker && worker.enabled !== false)
        : [];
    const workers = enabledWorkers.map((worker) => {
        const id = String(worker.id || worker.displayName || "Worker");
        const label = String(worker.displayName || worker.id || "Worker");
        const probe = probes[id] && typeof probes[id] === "object" ? probes[id] : {};
        const status = String(probe.status || "未检测").toLowerCase();
        return { id, label, status, ready: status === "ok", probe };
    });
    const dependencyIssues = [{ label: "Hub", probe: hub }, ...workers].filter((row) => hubRequired || row.label !== "Hub").flatMap((row) => {
        const dependency = row?.probe?.schedulerDependencies;
        if (!dependency || dependency.ok !== false)
            return [];
        const install = String(dependency.installCommand || "").trim();
        const message = String(dependency.message || "Scheduler 依赖缺失").trim();
        return [`${String(row.label || "端点")} Scheduler：${message}${install && !message.includes(install) ? `；安装命令：${install}` : ""}`];
    });
    const issues = [];
    if (hubRequired && !hubReady)
        issues.push(`Hub：${String(hub.suggestion || hub.message || fallbackHealth.message || "未检测或不可达")}`);
    for (const worker of workers) {
        if (worker.ready)
            continue;
        const detail = String(worker.probe.suggestion || worker.probe.message || (worker.status === "未检测" ? "未执行检测，请检查 Xshell 会话配置" : "未通过检测"));
        issues.push(`${worker.label}：${detail}`);
    }
    issues.push(...dependencyIssues);
    const workerSummary = workers.length
        ? workers.map((worker) => `${worker.label}:${worker.status}`).join(", ")
        : "未配置 Worker";
    return {
        ready: (!hubRequired || hubReady) && workers.every((worker) => worker.ready) && dependencyIssues.length === 0,
        hubReady: hubRequired ? hubReady : true,
        workerReady: workers.every((worker) => worker.ready),
        message: `隧道检测完成。Hub:${hubRequired ? hubStatus : "当前拓扑不使用"}; Worker:${workerSummary}`,
        issues,
    };
}
function initialServerSetupComplete(setup, hubRequired = true) {
    return serverSetupMissingItems(setup, hubRequired).length === 0;
}
function projectOnboardingCompletedFromCodeSync(codeSync) {
    const item = codeSync && typeof codeSync === "object" ? codeSync : {};
    return successfulSyncStatus(item.hub) && successfulSyncStatus(item.workers);
}
function projectOnboardingStateForWebview(options) {
    const item = options || {};
    const workspace = item.workspace && typeof item.workspace === "object" ? item.workspace : {};
    const setup = item.setup && typeof item.setup === "object" ? item.setup : {};
    const simpleSftp = item.simpleSftp && typeof item.simpleSftp === "object" ? item.simpleSftp : {};
    const enabledWorkerCount = Array.isArray(setup.workerTunnels)
        ? setup.workerTunnels.filter((worker) => worker && worker.enabled !== false).length
        : 0;
    const hasProject = Boolean(workspace.root) && workspace.singleProject === true;
    const missing = [
        ...serverSetupMissingItems(setup),
        ...(simpleSftp.ready === true ? [] : [String(simpleSftp.message || "配套 SimpleSFTP 未就绪")]),
        ...(enabledWorkerCount > 0 ? [] : ["至少一个启用的执行 Worker"]),
    ];
    const projectReady = hasProject && missing.length === 0;
    const promptShown = Number(item.promptShown || 0);
    const completed = hasProject && item.completed === true;
    const projectName = String(workspace.name || path.basename(String(workspace.root || "")) || "当前项目").trim();
    const detail = !hasProject
        ? ""
        : completed
            ? `当前项目 ${projectName} 已完成接入。`
            : projectReady
                ? `当前项目 ${projectName} 尚未完成接入；点击“接入当前项目”继续。`
                : `当前项目 ${projectName} 尚未完成接入；先补全：${[...new Set(missing.filter(Boolean))].join("、")}，然后点击“接入当前项目”。`;
    const missingItems = [...new Set(missing.filter(Boolean))];
    return {
        required: hasProject && !completed,
        completed,
        ready: projectReady,
        blocked: hasProject && !projectReady && !completed,
        missing: missingItems,
        projectName,
        promptShown,
        detail,
    };
}
function agentSessionReuseBlockers(targets) {
    const blockers = [];
    const owners = new Map();
    for (const target of Array.isArray(targets) ? targets : []) {
        const filePath = String(target?.filePath || "").trim();
        if (!filePath)
            continue;
        const key = localPathKey(filePath);
        const owner = owners.get(key);
        if (owner && owner !== target.id)
            blockers.push(`${owner} 与 ${target.id} 复用了同一个 Xshell 会话；每个 Agent 端点必须使用独立的 .xsh 会话。`);
        else
            owners.set(key, target.id);
    }
    return uniqueStrings(blockers);
}
function projectBootstrapPlanSelection(plans, planFileInput, selectedPlanId) {
    const list = Array.isArray(plans) ? plans.filter((plan) => plan && typeof plan === "object") : [];
    const requested = [planFileInput, selectedPlanId].map((value) => String(value || "").trim()).filter(Boolean);
    const plan = requested.map((value) => list.find((item) => [item.planFile, item.file, item.planId].some((identity) => String(identity || "").trim() === value))).find(Boolean)
        || (list.length === 1 ? list[0] : undefined);
    return { plans: list, plan, needsChoice: !plan && list.length > 1 };
}
function simpleSftpIntegrationReadiness(extensionRegistry = vscode.extensions) {
    const extension = extensionRegistry?.getExtension?.(SIMPLE_SFTP_EXTENSION_ID);
    if (!extension) {
        return {
            ready: false,
            installed: false,
            extensionId: SIMPLE_SFTP_EXTENSION_ID,
            version: "",
            missingCommands: [...SIMPLE_SFTP_REQUIRED_COMMANDS],
            message: "未安装或未启用配套 SimpleSFTP。请运行公开离线包中的 install-public-release.ps1，安装后执行 Developer: Reload Window。",
        };
    }
    const declaredCommands = new Set((Array.isArray(extension.packageJSON?.contributes?.commands) ? extension.packageJSON.contributes.commands : [])
        .map((item) => String(item?.command || "").trim())
        .filter(Boolean));
    const missingCommands = SIMPLE_SFTP_REQUIRED_COMMANDS.filter((command) => !declaredCommands.has(command));
    const version = String(extension.packageJSON?.version || "").trim();
    const legacySftp = legacySftpInstallationState(extensionRegistry);
    return {
        ready: missingCommands.length === 0,
        installed: true,
        extensionId: SIMPLE_SFTP_EXTENSION_ID,
        version,
        missingCommands,
        legacyInstalled: legacySftp.installed,
        legacyVersion: legacySftp.version,
        message: missingCommands.length
            ? `SimpleSFTP ${version || "当前版本"} 缺少编排命令：${missingCommands.join("、")}。请使用配套公开离线包升级两个插件并重载窗口。`
            : `SimpleSFTP ${version || "已安装"} 的上传 ABI 已就绪。`,
    };
}
function legacySftpInstallationState(extensionRegistry = vscode.extensions) {
    const extension = extensionRegistry?.getExtension?.(LEGACY_SFTP_EXTENSION_ID);
    return { installed: Boolean(extension), extensionId: LEGACY_SFTP_EXTENSION_ID, version: String(extension?.packageJSON?.version || "").trim() };
}
const NEW_PROJECT_INFRASTRUCTURE_MAX_STEPS = 3;
const PROJECT_BOOTSTRAP_MAX_STEPS = 8;
function projectBootstrapNewProjectPrerequisite(options) {
    const item = options || {};
    if (Number(item.planCount || 0) > 0 || item.hasExistingProjectState === true)
        return undefined;
    const simpleSftp = item.simpleSftp && typeof item.simpleSftp === "object" ? item.simpleSftp : undefined;
    if (simpleSftp?.ready === false) {
        return {
            state: "simple_sftp_required",
            message: `当前项目还没有 Plan。生成任何 Plan 或接入模板前，先完成配套插件安装：${String(simpleSftp.message || "SimpleSFTP 未就绪。")}`,
            action: "打开配置说明",
        };
    }
    if (item.setupComplete !== true) {
        return {
            state: "server_setup_required",
            message: "当前项目还没有 Plan。生成任何 Plan 或接入模板前，先选择 Hub/Worker 的 Xshell 会话并填写服务器项目父目录。",
            action: "开始一键配置",
        };
    }
    if (Number(item.workerCount || 0) <= 0) {
        return {
            state: "worker_required",
            message: "当前项目还没有 Plan，服务器目前只有 Hub。生成任何 Plan 或接入模板前，先添加至少一个执行 Worker。",
            action: "添加 Worker",
        };
    }
    return undefined;
}
function projectBootstrapEndpointReadiness(options) {
    const item = options || {};
    const hubStatus = String(item.hubStatus || "").toLowerCase();
    const hubReady = ["ok", "agent_ok", "file_api_unavailable"].includes(hubStatus);
    const workers = Array.isArray(item.workers) ? item.workers : [];
    const unavailableWorkers = workers.filter((worker) => String(worker?.status || "").toLowerCase() !== "ok");
    const dependencyIssues = [{ label: "Hub", dependency: item.hubSchedulerDependencies }, ...workers.map((worker) => ({ label: worker?.label, dependency: worker?.schedulerDependencies }))].flatMap((row) => {
        const dependency = row?.dependency;
        if (!dependency || dependency.ok !== false)
            return [];
        const install = String(dependency.installCommand || "").trim();
        return [`${String(row.label || "端点")} Scheduler 依赖缺失${install ? `；安装命令：${install}` : ""}`];
    });
    return {
        ready: hubReady && unavailableWorkers.length === 0 && dependencyIssues.length === 0,
        hubReady,
        unavailableWorkers,
        dependencyIssues,
        missing: [
            ...(!hubReady ? ["Hub"] : []),
            ...unavailableWorkers.map((worker) => String(worker?.label || "Worker")),
            ...dependencyIssues,
        ],
    };
}
function projectBootstrapEndpointProbeReusable(readiness, checkedAt, nowMs = Date.now(), maxAgeMs = 60_000) {
    if (!readiness?.ready)
        return false;
    const checked = Number(checkedAt || 0);
    const now = Number(nowMs || 0);
    const maxAge = Math.max(1, Number(maxAgeMs || 0));
    return Number.isFinite(checked) && checked > 0 && Number.isFinite(now) && now >= checked && now - checked <= maxAge;
}
function projectBootstrapShouldProbeEndpoints(options) {
    const item = options || {};
    return !String(item.outputGateReason || "").trim()
        && item.realtimeMode === true
        && item.setupComplete === true
        && item.simpleSftpReady !== false
        && Number(item.workerCount || 0) > 0
        && item.activeRun?.active !== true
        && !item.finishedRun
        && item.endpointsReady !== true;
}
function projectBootstrapFinishedRunOutcome(state, plan) {
    const item = plan && typeof plan === "object" ? plan : {};
    const planFile = normalizePlanSelectionKey(item.planFile || item.file || item.planId || "");
    if (!planFile)
        return undefined;
    const planRevision = String(item.revision || "").trim();
    const planUpdatedAt = Date.parse(String(item.updatedAt || ""));
    const operations = state?.operations && typeof state.operations === "object"
        ? (Array.isArray(state.operations) ? state.operations : Object.values(state.operations))
        : [];
    const candidates = [];
    for (const row of operations) {
        if (!row || typeof row !== "object")
            continue;
        const payloads = remoteResultOperationPayloads(row);
        const actions = payloads.map((entry) => String(entry.action || entry.type || "").trim().toLowerCase());
        if (!actions.some((action) => ["run-plan", "reproduce-plan"].includes(action)))
            continue;
        const rowPlan = payloads.map((entry) => operationResultPlanFile(entry)).find(Boolean);
        if (!samePlanSelection(rowPlan, planFile))
            continue;
        const operationRevision = payloads.map((entry) => stringFromRecord(entry, ["planRevision", "plan_revision"])).find(Boolean) || "";
        if (planRevision ? operationRevision !== planRevision : Number.isFinite(planUpdatedAt) && operationTime(row) < planUpdatedAt)
            continue;
        candidates.push({ row, payloads });
    }
    candidates.sort((left, right) => operationTime(right.row) - operationTime(left.row));
    const latest = candidates[0];
    if (!latest)
        return projectBootstrapFinishedTaskOutcome(state, planFile, planRevision, planUpdatedAt);
    const status = operationStatusToken(operationStatusOf(latest.row));
    const failed = operationFailureTerminalStatus(status) || operationCancelledTerminalStatus(status);
    const succeeded = PROJECT_BOOTSTRAP_SUCCEEDED_STATUSES.has(status);
    const schedulerFinished = latest.payloads.some((entry) => entry.schedulerFinished === true || entry.scheduler_finished === true);
    if ((!failed && !succeeded) || (!operationSubmissionAccepted(latest.row) && !schedulerFinished))
        return undefined;
    if (operationDebugMode(latest.row, latest.payloads)) {
        return {
            state: "finished_debug_review",
            message: failed
                ? "当前 Debug 运行已结束且存在失败、停止或取消任务。Debug 产物不进入正式结果链；下一步：查看任务和日志。"
                : "当前 Debug 运行已结束。Debug 产物不进入正式结果链；下一步：查看任务和日志，确认后再切换正式运行。",
            action: "查看任务",
            secondaryAction: failed ? undefined : "正式运行",
        };
    }
    if (failed) {
        return {
            state: "finished_run_review",
            message: "当前版本 Plan 的调度已结束且存在失败、停止或取消任务。下一步：查看任务和日志，按需重试。",
            action: "查看任务",
        };
    }
    return {
        state: "finished_run_results",
        message: "当前版本 Plan 已完成运行。下一步：查看结果解析、筛选与归档状态。",
        action: "查看结果",
    };
}
function schedulerTaskMatchesPlanVersion(row, planRevision, planUpdatedAt) {
    const revision = stringFromRecord(row, ["planRevision", "plan_revision"]);
    if (planRevision && revision)
        return revision === planRevision;
    if (Number.isFinite(planUpdatedAt)) {
        const taskAt = schedulerRowTime(row);
        return taskAt > 0 && taskAt >= planUpdatedAt;
    }
    return !planRevision;
}
function currentPlanRevisionHasRunEvidence(state, plan) {
    const item = plan && typeof plan === "object" ? plan : {};
    const planFile = normalizePlanSelectionKey(item.planFile || item.file || item.planId || "");
    if (!planFile)
        return false;
    const planRevision = String(item.revision || "").trim();
    const planUpdatedAt = Date.parse(String(item.updatedAt || ""));
    const operations = state?.operations && typeof state.operations === "object"
        ? (Array.isArray(state.operations) ? state.operations : Object.values(state.operations))
        : [];
    const matchingOperation = operations.some((row) => {
        if (!row || typeof row !== "object" || !operationSubmissionAccepted(row))
            return false;
        const payloads = remoteResultOperationPayloads(row);
        const actions = payloads.map((entry) => String(entry.action || entry.type || "").trim().toLowerCase());
        if (!actions.some((action) => ["run-plan", "reproduce-plan"].includes(action)))
            return false;
        const rowPlan = payloads.map((entry) => operationResultPlanFile(entry)).find(Boolean);
        if (!samePlanSelection(rowPlan, planFile))
            return false;
        const operationRevision = payloads.map((entry) => stringFromRecord(entry, ["planRevision", "plan_revision"])).find(Boolean) || "";
        if (operationRevision)
            return !planRevision || operationRevision === planRevision;
        const updatedAt = operationTime(row);
        return Number.isFinite(planUpdatedAt) ? updatedAt > 0 && updatedAt >= planUpdatedAt : !planRevision;
    });
    if (matchingOperation)
        return true;
    return flattenPlanArchiveSchedulerRows(state?.schedulerStates || []).some((row) => samePlanSelection(String(row.planFile || row.plan || ""), planFile)
        && schedulerTaskMatchesPlanVersion(row, planRevision, planUpdatedAt));
}
function projectBootstrapFinishedTaskOutcome(state, planFile, planRevision, planUpdatedAt) {
    const matching = flattenPlanArchiveSchedulerRows(state?.schedulerStates || []).filter((row) => samePlanSelection(String(row.planFile || row.plan || ""), planFile)
        && schedulerTaskMatchesPlanVersion(row, planRevision, planUpdatedAt));
    if (!matching.length || matching.some((row) => !schedulerStatusTerminal(row.status || row.state || "")))
        return undefined;
    const failed = matching.some((row) => ["failed", "error", "stalled", "stopped", "cancelled"].includes(schedulerStatusToken(row.status || row.state || "")));
    if (matching.some((row) => debugModeFromRecord(row))) {
        return {
            state: "finished_debug_review",
            message: failed
                ? "当前 Debug 任务已结束且存在失败、停止或取消记录。Debug 产物不进入正式结果链；下一步：查看任务和日志。"
                : "当前 Debug 任务已结束。Debug 产物不进入正式结果链；下一步：查看任务和日志，确认后再切换正式运行。",
            action: "查看任务",
            secondaryAction: failed ? undefined : "正式运行",
        };
    }
    if (failed) {
        return {
            state: "finished_run_review",
            message: "当前版本 Plan 的调度任务均已结束且存在失败、停止或取消记录。下一步：查看任务和日志，按需重试。",
            action: "查看任务",
        };
    }
    return {
        state: "finished_run_results",
        message: "当前版本 Plan 的调度任务均已完成。下一步：查看结果解析、筛选与归档状态。",
        action: "查看结果",
    };
}
function projectBootstrapCompletion(options) {
    options = options || {};
    const activeRun = options.activeRun && typeof options.activeRun === "object" ? options.activeRun : {};
    if (activeRun.active) {
        const taskCount = Math.max(0, Number(activeRun.taskCount) || 0);
        const operationCount = Math.max(0, Number(activeRun.operationCount) || 0);
        const historicalOnly = activeRun.historicalOnly === true;
        return {
            state: historicalOnly ? "historical_active_run" : "active_run",
            message: historicalOnly
                ? `同一路径的旧 Plan revision 仍有 ${taskCount} 个任务、${operationCount} 个提交操作未结束。为保护旧任务，当前版本暂不提交；下一步：${taskCount > 0 ? "查看全部任务" : "查看提交进度"}。`
                : `当前 Plan 已有未结束运行：${taskCount} 个任务、${operationCount} 个提交操作。下一步：查看现有进度，避免重复提交。`,
            action: historicalOnly && taskCount > 0 ? "查看全部任务" : taskCount > 0 ? "查看任务" : "查看提交进度",
        };
    }
    const finishedRun = options.finishedRun && typeof options.finishedRun === "object" ? options.finishedRun : undefined;
    if (finishedRun?.action) {
        return {
            state: String(finishedRun.state || "finished_run"),
            message: String(finishedRun.message || "当前 Plan 已有已结束运行。下一步：查看现有结果或任务。"),
            action: String(finishedRun.action),
            secondaryAction: finishedRun.secondaryAction,
        };
    }
    const outputGateReason = String(options.outputGateReason || "").trim();
    if (outputGateReason) {
        const adapterConfig = String(options.adapterConfig || "").trim();
        const openAdapter = String(options.outputGateNextLabel || "").trim() === "接入配置" && Boolean(adapterConfig);
        return {
            state: "output_incomplete",
            message: `项目基础接入已完成；当前 Plan 仍未通过结果输出门禁。下一步：${outputGateReason}`,
            action: openAdapter ? "打开接入配置" : "打开当前 Plan",
        };
    }
    const simpleSftp = options.simpleSftp && typeof options.simpleSftp === "object" ? options.simpleSftp : undefined;
    if (simpleSftp?.ready === false) {
        return {
            state: "simple_sftp_required",
            message: `Plan 与结果接入已完成，但文件传输依赖未就绪：${String(simpleSftp.message || "未安装或未启用配套 SimpleSFTP。")} 下一步：打开配置说明并使用配套离线包安装。`,
            action: "打开配置说明",
        };
    }
    if (!options.setupComplete) {
        return {
            state: "server_setup_required",
            message: "Plan 与结果接入已完成。下一步：配置 Hub/Worker 的 Xshell 会话和项目父目录。",
            action: "开始一键配置",
        };
    }
    const workers = Array.isArray(options.workers) ? options.workers : [];
    if (!workers.length) {
        return {
            state: "worker_required",
            message: "Plan 与结果接入已完成，但还没有启用的执行 Worker。下一步：在“设置 > 服务器”添加 Worker。",
            action: "添加 Worker",
        };
    }
    if (!options.realtimeMode) {
        if (options.offlineBundleActive) {
            return {
                state: "offline_import",
                message: "Plan 与结果接入已完成，但当前项目仍在使用离线导入结果。下一步：恢复在线连接。",
                action: "恢复在线连接",
            };
        }
        return {
            state: "offline_import",
            message: "Plan 与结果接入已完成，但连接模式设置为离线导入。下一步：切换为 Xshell 实时隧道模式。",
            action: "打开连接设置",
        };
    }
    const endpointReadiness = projectBootstrapEndpointReadiness(options);
    if (!endpointReadiness.ready) {
        if (endpointReadiness.dependencyIssues.length) {
            return {
                state: "scheduler_dependencies_required",
                message: `Plan 与服务器连接已完成，但 Scheduler 依赖未就绪：${endpointReadiness.dependencyIssues.join("；")}`,
                action: "查看依赖",
            };
        }
        return {
            state: "agents_required",
            message: `Plan 与结果接入已完成，但 ${endpointReadiness.missing.join("、")} Agent 未通过当前项目检测。下一步：准备 Agent 并启动。`,
            action: "准备 Agent 并启动",
        };
    }
    if (options.preferDebugFirstRun === true) {
        return {
            state: "ready",
            message: "当前 Plan revision 尚无真实运行证据，且 Hub/Worker 检测已完成。建议先用 Debug 验证首个任务、日志和结果输出；确认无误后再执行正式运行。",
            action: "Debug 首跑",
            secondaryAction: "正式运行",
        };
    }
    return {
        state: "ready",
        message: "当前 Plan 与 Hub/Worker 检测均已完成，可以使用“校验并提交运行”启动当前计划。",
        action: "校验并提交运行",
    };
}
function automaticResultParseReady(options) {
    options = options || {};
    if (!options.realtimeMode || !options.setupComplete)
        return false;
    const checked = enforceExpectedAgentProjectRoot(options.hubProbe, options.expectedProjectRoot, "Hub");
    return ["ok", "file_api_unavailable"].includes(String(checked?.status || "").toLowerCase());
}
function activePlanRunEvidence(state, planFile, plan) {
    const selectedPlan = normalizePlanSelectionKey(planFile);
    if (!selectedPlan)
        return { active: false, operationCount: 0, taskCount: 0 };
    const selectedPlanRecord = plan && typeof plan === "object" ? plan : {};
    const planRevision = String(selectedPlanRecord.revision || selectedPlanRecord.planRevision || selectedPlanRecord.plan_revision || "").trim();
    const planUpdatedAt = Date.parse(String(selectedPlanRecord.updatedAt || selectedPlanRecord.updated_at || ""));
    const matchesCurrentVersion = (row, payloads = []) => {
        const records = [row, ...payloads].filter((item) => item && typeof item === "object");
        const revision = records.map((item) => String(item.planRevision || item.plan_revision || "").trim()).find(Boolean) || "";
        if (planRevision && revision)
            return revision === planRevision;
        if (Number.isFinite(planUpdatedAt)) {
            const recordAt = Math.max(0, ...records.map((item) => Date.parse(String(item.updatedAt || item.updated_at || item.startedAt || item.started_at || item.createdAt || item.created_at || ""))).filter(Number.isFinite));
            return recordAt > 0 && recordAt >= planUpdatedAt;
        }
        return !planRevision;
    };
    const activeStatuses = new Set(["accepted", "submitted", "queued", "pending", "running", "testing", "progress", "in_progress", "operation_started", "started"]);
    const operations = state?.operations && typeof state.operations === "object"
        ? (Array.isArray(state.operations) ? state.operations : Object.values(state.operations))
        : [];
    const activeOperationRows = operations.map((row) => {
        if (!row || typeof row !== "object")
            return undefined;
        const payloads = remoteResultOperationPayloads(row);
        const action = payloads.map((item) => String(item.action || item.type || "").toLowerCase()).join(" ");
        const rowPlan = payloads.map((item) => operationResultPlanFile(item)).find(Boolean);
        const schedulerFinished = payloads.some((item) => item.schedulerFinished === true || item.scheduler_finished === true);
        const active = !schedulerFinished
            && /(?:^|\s)(?:run-plan|reproduce-plan)(?:\s|$)/.test(action)
            && samePlanSelection(rowPlan, selectedPlan)
            && activeStatuses.has(operationStatusToken(operationStatusOf(row)));
        return active ? { row, payloads } : undefined;
    }).filter(Boolean);
    const schedulerRows = flattenPlanArchiveSchedulerRows(state?.schedulerStates || []);
    const activeTasks = schedulerRows.filter((row) => samePlanSelection(String(row.planFile || row.plan || ""), selectedPlan)
        && activeStatuses.has(operationStatusToken(row.status || row.state || "")));
    const currentOperations = activeOperationRows.filter((item) => matchesCurrentVersion(item.row, item.payloads));
    const currentTasks = activeTasks.filter((row) => matchesCurrentVersion(row));
    const operationCount = activeOperationRows.length;
    const taskCount = activeTasks.length;
    const currentOperationCount = currentOperations.length;
    const currentTaskCount = currentTasks.length;
    const active = operationCount > 0 || taskCount > 0;
    const currentActive = currentOperationCount > 0 || currentTaskCount > 0;
    return {
        active,
        currentActive,
        historicalActive: active && (currentOperationCount < operationCount || currentTaskCount < taskCount),
        historicalOnly: active && !currentActive,
        operationCount,
        taskCount,
        currentOperationCount,
        currentTaskCount,
        historicalOperationCount: operationCount - currentOperationCount,
        historicalTaskCount: taskCount - currentTaskCount,
    };
}
async function readPlanArchiveBundle(planFile) {
    try {
        const text = await fs.readFile(path.join(path.dirname(planFile), "archive_manifest.json"), "utf8");
        const value = JSON.parse(text);
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    }
    catch {
        return {};
    }
}
function planArchiveGateFromResults(summary, planFile) {
    const plan = normalizePlanSelectionKey(planFile);
    const rows = Array.isArray(summary?.results) ? summary.results : [];
    const records = rows.filter((row) => samePlanSelection(resultRecordPlanFile(row), plan));
    if (!records.length)
        return { ok: false, reason: "没有该 Plan 的已解析结果，无法确认哪些结果应纳入归档。", totalCount: 0, includedCount: 0, excludedCount: 0, archivedCount: 0 };
    const included = records.filter((row) => String(row?.finalEvidenceState || row?.final_evidence_state || "").toLowerCase() === "archived");
    if (!included.length)
        return { ok: false, reason: "该 Plan 尚无已归档的有效结果。请先在完整预览中至少归档一条结果；不采用的结果可继续保留为排除记录。", totalCount: records.length, includedCount: 0, excludedCount: records.length, archivedCount: 0 };
    return { ok: true, reason: "已归档结果将作为有效结果；未归档结果保留为排除记录。", totalCount: records.length, includedCount: included.length, excludedCount: records.length - included.length, archivedCount: included.length };
}
function planArchiveRunGate(state, planFile) {
    const rows = flattenPlanArchiveSchedulerRows(state?.schedulerStates || []);
    const matching = rows.filter((row) => samePlanSelection(String(row.planFile || row.plan || ""), planFile));
    const active = matching.filter((row) => !schedulerStatusTerminal(row.status || row.state || ""));
    if (active.length)
        return { ok: false, reason: `仍有 ${active.length} 个任务未结束。`, knownRunCount: matching.length, activeRunCount: active.length };
    return { ok: true, reason: matching.length ? "已知任务均已结束。" : "未保留调度历史，继续按结果归档证据校验。", knownRunCount: matching.length, activeRunCount: 0 };
}
function flattenPlanArchiveSchedulerRows(value) {
    const out = [];
    for (const parent of Array.isArray(value) ? value : []) {
        if (!parent || typeof parent !== "object")
            continue;
        const parentPlan = parent.planFile || parent.plan_file || parent.plan || parent.file || "";
        const parentRevision = parent.planRevision || parent.plan_revision || "";
        const buckets = {
            running_experiments: "running",
            testing_experiments: "testing",
            queued_experiments: "queued",
            pending_experiments: "pending",
            completed_experiments: "completed",
            failed_experiments: "failed",
            stopped_experiments: "stopped",
        };
        let expanded = false;
        for (const [key, status] of Object.entries(buckets)) {
            if (!Array.isArray(parent[key]))
                continue;
            expanded = true;
            for (const row of parent[key])
                out.push({ ...(row || {}), status: row?.status || row?.state || status, planFile: row?.planFile || row?.plan_file || parentPlan, planRevision: row?.planRevision || row?.plan_revision || parentRevision });
        }
        if (!expanded)
            out.push(parent);
    }
    return out;
}
function planArchiveResultSelection(summary, planFile) {
    const selectedPlan = normalizePlanSelectionKey(planFile);
    const rows = (Array.isArray(summary?.results) ? summary.results : [])
        .filter((row) => samePlanSelection(resultRecordPlanFile(row), selectedPlan))
        .map((row) => {
        const dimensions = row?.dimensions && typeof row.dimensions === "object" && !Array.isArray(row.dimensions) ? row.dimensions : {};
        const state = String(row?.finalEvidenceState || row?.final_evidence_state || "pending_review").toLowerCase() || "pending_review";
        return {
            resultId: row?.resultId || row?.result_id || "",
            experimentId: row?.experimentId || row?.experiment_id || "",
            runKey: row?.runKey || row?.run_key || "",
            planFile: resultRecordPlanFile(row) || selectedPlan,
            method: dimensions.method || row?.method || "",
            dataset: dimensions.dataset || row?.dataset || "",
            split: dimensions.split || row?.split || "",
            seed: dimensions.seed ?? row?.seed ?? "",
            sourceFile: row?.sourceFile || row?.source || "",
            artifactPath: row?.artifactPath || row?.artifact_path || "",
            finalEvidenceState: state,
            finalEvidenceReason: row?.finalEvidenceReason || row?.final_evidence_reason || (state === "archived" ? "已纳入有效结果" : "未纳入有效结果"),
            eligibleForFinalAnalysis: state === "archived" && row?.eligibleForFinalAnalysis !== false,
            disposition: state === "archived" ? "included" : "not_included",
            metricCount: row?.metrics && typeof row.metrics === "object" && !Array.isArray(row.metrics) ? Object.keys(row.metrics).length : 0,
        };
    });
    const includedCount = rows.filter((row) => row.disposition === "included").length;
    return {
        schemaVersion: 1,
        capturedAt: new Date().toISOString(),
        planFile: selectedPlan,
        inclusionPolicy: "archived_only",
        totalCount: rows.length,
        includedCount,
        notIncludedCount: rows.length - includedCount,
        records: rows,
    };
}
function planArchiveExcludedResults(selection) {
    return (Array.isArray(selection?.records) ? selection.records : [])
        .filter((row) => row?.disposition !== "included")
        .slice(0, 200);
}
async function planArchiveConfigFiles(root, planText) {
    const out = new Set();
    for (const value of planStaticConfigReferences(planText)) {
        const fullPath = safeWorkspaceChildPath(root, value);
        const stat = await fs.stat(fullPath).catch(() => undefined);
        if (stat?.isFile())
            out.add(path.relative(root, fullPath).replace(/\\/g, "/"));
    }
    return [...out].sort();
}
async function planArchiveParameterSnapshot(root, planText) {
    const summary = (0, PlanBuilder_1.parsePlanSummary)(String(planText || ""));
    const commands = uniqueStrings([...planCommandValues(planText), summary.trainCommand, summary.testCommand].map((value) => String(value || "").trim()).filter(Boolean));
    const referencedEntryScripts = uniqueStrings(commands.flatMap(pythonCommandArchiveEntryReferences)).sort();
    const entries = [];
    const missingEntries = [];
    const entryScripts = [];
    const sourceScanWarnings = [];
    const queue = referencedEntryScripts.map((file) => ({ requested: file, candidates: [file, file.replace(/\.py$/i, "/__main__.py")], required: true, depth: 0 }));
    const queued = new Set(queue.map((item) => item.candidates.join("|")));
    const scanned = new Set();
    let scannedBytes = 0;
    const maxSourceFiles = 256;
    const maxSourceBytes = 16 * 1024 * 1024;
    while (queue.length) {
        const item = queue.shift();
        let file = "";
        let fullPath = "";
        let stat;
        for (const candidate of item.candidates) {
            try {
                const candidatePath = safeWorkspaceChildPath(root, candidate);
                const candidateStat = await fs.stat(candidatePath).catch(() => undefined);
                if (candidateStat?.isFile()) {
                    file = path.relative(root, candidatePath).replace(/\\/g, "/");
                    fullPath = candidatePath;
                    stat = candidateStat;
                    break;
                }
            }
            catch {
            }
        }
        if (!file || !stat) {
            if (item.required)
                missingEntries.push({ file: item.requested, reason: "not_found" });
            continue;
        }
        if (scanned.has(file))
            continue;
        if (scanned.size >= maxSourceFiles || scannedBytes + stat.size > maxSourceBytes) {
            sourceScanWarnings.push({ file, reason: "source_scan_budget_exceeded", maxSourceFiles, maxSourceBytes });
            break;
        }
        if (stat.size > 2 * 1024 * 1024) {
            const warning = { file, reason: "larger_than_2mb", size: stat.size };
            if (item.required)
                missingEntries.push(warning);
            else
                sourceScanWarnings.push(warning);
            continue;
        }
        scanned.add(file);
        scannedBytes += stat.size;
        const source = await fs.readFile(fullPath, "utf8");
        const parameterAudit = pythonCliParameterAudit(source);
        const parameters = parameterAudit.parameters;
        const hasCliEvidence = item.required || parameters.length || parameterAudit.parserDeclarations.length || parameterAudit.unresolvedDeclarations.length || parameterAudit.parserFeatures.length;
        if (hasCliEvidence) {
            entryScripts.push(file);
            entries.push({ file, sourceRole: item.required ? "command_entry" : "imported_cli_source", importDepth: item.depth, size: stat.size, sha256: sha256Text(source), parameters, audit: {
                    parserDeclarations: parameterAudit.parserDeclarations,
                    unresolvedDeclarations: parameterAudit.unresolvedDeclarations,
                    dynamicDefaults: parameterAudit.dynamicDefaults,
                    parserFeatures: parameterAudit.parserFeatures,
                } });
        }
        for (const imported of pythonLocalImportReferences(source, file)) {
            const key = imported.candidates.join("|");
            if (queued.has(key))
                continue;
            queued.add(key);
            queue.push({ requested: imported.module, candidates: imported.candidates, required: false, depth: item.depth + 1 });
        }
    }
    return {
        schemaVersion: 2,
        generatedAt: new Date().toISOString(),
        captureMethod: "static_recursive_local_source_scan_no_import_or_execution",
        commands,
        entries,
        entryScripts: uniqueStrings(entryScripts).sort(),
        scannedSourceCount: scanned.size,
        scannedSourceBytes: scannedBytes,
        sourceScanWarnings,
        parameterCount: entries.reduce((sum, entry) => sum + entry.parameters.length, 0),
        parserDeclarationCount: entries.reduce((sum, entry) => sum + entry.audit.parserDeclarations.length, 0),
        unresolvedDeclarationCount: entries.reduce((sum, entry) => sum + entry.audit.unresolvedDeclarations.length, 0),
        dynamicDefaultCount: entries.reduce((sum, entry) => sum + entry.audit.dynamicDefaults.length, 0),
        parserFeatureCount: entries.reduce((sum, entry) => sum + entry.audit.parserFeatures.length, 0),
        missingEntries,
        unresolvedCommands: commands.filter((command) => pythonCommandArchiveEntryReferences(command).length === 0),
        note: "Plan 内联参数保留在 plan.yaml，配置参数保留在 configs/。本文件递归静态扫描入口脚本及其项目内 Python import，记录 argparse parser/子命令声明、Click 和 Typer CLI 声明、全部关键字表达式、显式及框架隐式默认值；entries/ 保存入口及包含 CLI 证据的间接源码。dynamicDefaults、unresolvedDeclarations、parserFeatures 和 sourceScanWarnings 必须用运行时 config_snapshot 或 command.txt 复核。",
    };
}
function planCommandValues(planText, mode = "train_test") {
    const out = [];
    const modeValue = String(mode || "train_test").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const normalizedMode = ["train", "training", "train_only"].includes(modeValue) ? "train" : ["test", "eval", "evaluate", "evaluation", "test_only", "eval_only"].includes(modeValue) ? "test" : "train_test";
    const acceptedKeys = normalizedMode === "train" ? new Set(["train_command", "trainCommand", "command"]) : normalizedMode === "test" ? new Set(["test_command", "testCommand"]) : new Set(["train_command", "trainCommand", "test_command", "testCommand", "command"]);
    const lines = String(planText || "").replace(/\r\n/g, "\n").split("\n");
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const match = line.match(/^\s*(?:-\s*)?(train_command|trainCommand|test_command|testCommand|command)\s*:\s*(.+?)\s*$/);
        if (!match || !acceptedKeys.has(match[1]))
            continue;
        const raw = stripYamlComment(String(match[2] || "")).trim();
        if (!raw)
            continue;
        if (/^[|>][+-]?\d*$/.test(raw)) {
            const baseIndent = line.match(/^\s*/)?.[0].length || 0;
            const blockLines = [];
            let blockIndent = -1;
            for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
                const nested = lines[cursor];
                if (!nested.trim()) {
                    if (blockIndent >= 0)
                        blockLines.push("");
                    continue;
                }
                const indent = nested.match(/^\s*/)?.[0].length || 0;
                if (indent <= baseIndent)
                    break;
                if (blockIndent < 0)
                    blockIndent = indent;
                blockLines.push(nested.slice(Math.min(indent, blockIndent)));
            }
            const value = raw.startsWith(">") ? blockLines.map((item) => item.trim()).filter(Boolean).join(" ") : blockLines.join("\n");
            if (value.trim())
                out.push(value.trim());
            continue;
        }
        if (raw.startsWith('"')) {
            try {
                out.push(JSON.parse(raw));
                continue;
            }
            catch {
            }
        }
        out.push(raw.startsWith("'") && raw.endsWith("'") ? raw.slice(1, -1).replace(/''/g, "'") : raw);
    }
    const flowPattern = /(?:^|[,{}])\s*(train_command|trainCommand|test_command|testCommand|command)\s*:\s*("(?:\\.|[^"\\])*"|'(?:''|[^'])*')/gm;
    for (const match of String(planText || "").matchAll(flowPattern)) {
        if (!acceptedKeys.has(match[1]))
            continue;
        const raw = match[2];
        if (raw.startsWith('"')) {
            try {
                out.push(JSON.parse(raw));
                continue;
            }
            catch {
            }
        }
        out.push(raw.slice(1, -1).replace(/''/g, "'"));
    }
    return uniqueStrings(out.map((value) => String(value || "").trim()).filter(Boolean));
}
function pythonCommandEntryReferences(command) {
    const text = String(command || "").replace(/\\\s*\r?\n\s*/g, " ");
    const pattern = /(?:^|[\s;&|])(?:python(?:3(?:\.\d+)?)?|torchrun)\s+([^;&|]+)/gi;
    const out = [];
    for (const match of text.matchAll(pattern)) {
        const tokens = [...String(match[1] || "").matchAll(/"([^"]+)"|'([^']+)'|([^\s]+)/g)].map((token) => token[1] || token[2] || token[3] || "");
        const value = String(tokens.find((token) => /\.py$/i.test(token) && !token.startsWith("-")) || "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
        if (!value || value.includes("{") || value.includes("$") || path.posix.isAbsolute(value) || /^[A-Za-z]:\//.test(value))
            continue;
        out.push(value);
    }
    return uniqueStrings(out);
}
function pythonCommandArchiveEntryReferences(command) {
    const direct = pythonCommandEntryReferences(command);
    if (direct.length)
        return direct;
    const text = String(command || "").replace(/\\\s*\r?\n\s*/g, " ");
    const pattern = /(?:^|[\s;&|])python(?:3(?:\.\d+)?)?\s+([^;&|]+)/gi;
    const out = [];
    for (const match of text.matchAll(pattern)) {
        const tokens = [...String(match[1] || "").matchAll(/"([^"]+)"|'([^']+)'|([^\s]+)/g)].map((token) => token[1] || token[2] || token[3] || "");
        const moduleIndex = tokens.findIndex((token) => token === "-m");
        const moduleName = moduleIndex >= 0 ? String(tokens[moduleIndex + 1] || "") : "";
        if (/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*$/.test(moduleName))
            out.push(`${moduleName.replace(/\./g, "/")}.py`);
    }
    return uniqueStrings(out);
}
async function planArchiveConfigMigration(root, planDir, sourcePlan, configFiles) {
    const sourceKey = path.resolve(sourcePlan);
    const shared = new Set();
    const activePlans = await walkYaml(path.join(root, planDir)).catch(() => []);
    for (const candidate of activePlans) {
        if (path.resolve(candidate) === sourceKey || isArchivedPlanFile(root, planDir, candidate))
            continue;
        const text = await readUtf8Preview(candidate, localPlanSummaryReadBudgetBytes);
        for (const config of await planArchiveConfigFiles(root, text))
            shared.add(config);
    }
    const migrated = configFiles.filter((file) => !shared.has(file));
    return { migrated, retainedShared: configFiles.filter((file) => shared.has(file)) };
}
function planArchiveMovableEvidenceFiles(files) {
    return files.filter((file) => /^zlk_cluster\/results\/by_plan\/[^/]+\//.test(String(file || "").replace(/\\/g, "/")));
}
const PLAN_ARCHIVE_EVIDENCE_MAX_BYTES = 4 * 1024 * 1024;
function normalizePlanArchiveEvidencePath(value) {
    const normalized = String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
    if (!(0, FileTransferTypes_1.isSafeRemotePath)(normalized))
        return "";
    return /\.(csv|json|txt|md|log|out|ya?ml)$/i.test(normalized) ? normalized : "";
}
function planArchiveEvidencePlan(summary, planFile) {
    const selectedPlan = normalizePlanSelectionKey(planFile);
    const summaryPlan = normalizePlanSelectionKey(summary?.planFile || summary?.plan_file || "");
    if (summaryPlan && selectedPlan && !samePlanSelection(summaryPlan, selectedPlan))
        return { entries: [], files: [], missingRequired: ["当前 Plan 结果摘要"], invalid: [] };
    const fields = [
        { label: "结果摘要", keys: ["summaryPath", "summary_path"] },
        { label: "SCI 统计", keys: ["statisticsPath", "statistics_path"] },
        { label: "质量门禁", keys: ["qualityGatePath", "quality_gate_path"] },
        { label: "claim 证据", keys: ["claimEvidencePath", "claim_evidence_path"] },
        { label: "论文表格", keys: ["paperTablePath", "paper_table_path"] },
        { label: "论文表格 CSV", keys: ["paperTableCsvPath", "paper_table_csv_path"] },
        { label: "PPT 绘图契约", keys: ["plottingContractPath", "plotting_contract_path"] },
        { label: "完整预览 CSV", keys: ["previewCsvPath", "preview_csv_path"], required: true },
        { label: "有效结果 CSV", keys: ["effectiveResultsCsvPath", "effective_results_csv_path"], required: true },
    ];
    const entries = [];
    const missingRequired = [];
    const invalid = [];
    for (const field of fields) {
        const raw = field.keys.map((key) => String(summary?.[key] || "").trim()).find(Boolean) || "";
        if (!raw) {
            if (field.required)
                missingRequired.push(field.label);
            continue;
        }
        const normalized = normalizePlanArchiveEvidencePath(raw);
        if (!normalized) {
            invalid.push(`${field.label}=${raw}`);
            continue;
        }
        entries.push({ label: field.label, path: normalized, required: Boolean(field.required) });
    }
    const byPath = new Map();
    for (const entry of entries) {
        const current = byPath.get(entry.path);
        if (!current) {
            byPath.set(entry.path, entry);
            continue;
        }
        current.required = current.required || entry.required;
        if (!current.label.includes(entry.label))
            current.label += ` / ${entry.label}`;
    }
    const uniqueEntries = [...byPath.values()];
    return { entries: uniqueEntries, files: uniqueEntries.map((entry) => entry.path), missingRequired, invalid };
}
async function inspectLocalPlanArchiveEvidence(root, files) {
    const missing = [];
    const oversized = [];
    for (const relative of files) {
        const stat = await fs.stat(safeWorkspaceChildPath(root, relative)).catch(() => undefined);
        if (!stat?.isFile()) {
            missing.push(relative);
            continue;
        }
        if (stat.size > PLAN_ARCHIVE_EVIDENCE_MAX_BYTES)
            oversized.push(relative);
    }
    return { missing, oversized };
}
async function materializePlanArchiveEvidenceFiles(client, root, bundleDir, files, mode) {
    const copied = [];
    const evidenceRoot = path.join(bundleDir, "evidence");
    for (const relative of files) {
        const target = safeArchiveBundleChildPath(evidenceRoot, relative);
        await fs.mkdir(path.dirname(target), { recursive: true });
        if (mode === "hub_download") {
            await client.downloadFile(relative, target, { maxBytes: PLAN_ARCHIVE_EVIDENCE_MAX_BYTES });
        }
        else {
            const source = safeWorkspaceChildPath(root, relative);
            const stat = await fs.stat(source);
            if (!stat.isFile() || stat.size > PLAN_ARCHIVE_EVIDENCE_MAX_BYTES)
                throw new Error(`Plan 归档证据不可用：${relative}`);
            await fs.copyFile(source, target);
        }
        copied.push(relative);
    }
    return copied;
}
async function removeArchivedWorkspaceFiles(root, files) {
    for (const relative of files) {
        const source = safeWorkspaceChildPath(root, relative);
        await fs.unlink(source);
    }
}
async function restorePlanArchiveWorkspaceFiles(root, bundleDir, sourcePlan, configFiles, evidenceFiles) {
    await fs.mkdir(path.dirname(sourcePlan), { recursive: true });
    await fs.copyFile(path.join(bundleDir, "plan.yaml"), sourcePlan);
    for (const relative of configFiles) {
        const source = safeArchiveBundleChildPath(path.join(bundleDir, "configs"), relative);
        const target = safeWorkspaceChildPath(root, relative);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(source, target);
    }
    for (const relative of evidenceFiles) {
        const source = safeArchiveBundleChildPath(path.join(bundleDir, "evidence"), relative);
        const target = safeWorkspaceChildPath(root, relative);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(source, target);
    }
}
async function copyPlanArchiveFiles(root, bundleDir, category, files) {
    const copied = [];
    for (const relative of files) {
        const source = safeWorkspaceChildPath(root, relative);
        const target = path.join(bundleDir, category, ...String(relative).split("/"));
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(source, target);
        copied.push(relative);
    }
    return copied;
}
async function readLocalPlanSummary(root, planDir, file) {
    const fullPath = safeWorkspacePlanPath(root, file, planDir);
    const stat = await fs.stat(fullPath).catch(() => undefined);
    if (!stat || !stat.isFile())
        return undefined;
    const text = await readUtf8Preview(fullPath, localPlanSummaryReadBudgetBytes);
    const relative = path.relative(root, fullPath).replace(/\\/g, "/");
    return { ...parseLocalPlanText(relative, text), updatedAt: stat.mtime?.toISOString?.(), metadataTruncated: stat.size > localPlanSummaryReadBudgetBytes };
}
function upsertLocalPlanSummary(plans, plan) {
    const key = plan.planFile || plan.file;
    const out = [...plans];
    const index = out.findIndex((item) => (item.planFile || item.file) === key);
    if (index >= 0)
        out[index] = plan;
    else
        out.unshift(plan);
    return out.sort((a, b) => (a.planFile || a.file).localeCompare(b.planFile || b.file));
}
async function mapLimited(items, limit, worker) {
    const out = new Array(items.length);
    let next = 0;
    const concurrency = Math.max(1, Math.min(limit, items.length || 1));
    await Promise.all(Array.from({ length: concurrency }, async () => {
        for (;;) {
            const index = next;
            next += 1;
            if (index >= items.length)
                return;
            out[index] = await worker(items[index], index);
        }
    }));
    return out;
}
function isArchivedPlanFile(root, planDir, fullPath) {
    const relative = path.relative(path.join(root, planDir), fullPath).replace(/\\/g, "/");
    return relative === "_archived" || relative.startsWith("_archived/");
}
function projectOnboardingSuggestions(options) {
    options = options || {};
    const planCount = Math.max(0, Math.trunc(Number(options.planCount || 0) || 0));
    const hasActionableOutput = options.hasActionableOutput === true;
    const adapterConfig = String(options.adapterConfig || "").trim();
    const resultFileCount = Math.max(0, Math.trunc(Number(options.resultFileCount || 0) || 0));
    const parseableResultCount = Math.max(0, Math.trunc(Number(options.parseableResultCount || 0) || 0));
    if (!planCount)
        return ["在 experiments/plans 下创建或放入 YAML Plan；也可点击“新建模板”。"];
    if (!hasActionableOutput) {
        return [adapterConfig
                ? "当前 Plan 尚未声明可解析结果位置；请补充 Plan 输出，或完善 experiments/zlk_project.yaml。"
                : "当前 Plan 尚未声明可解析结果位置；请补充 Plan 输出，或点击“生成模板”创建接入配置。"];
    }
    if (resultFileCount > 0 && parseableResultCount === 0)
        return ["已发现结果文件但未解析出指标；请检查列映射、metric 别名或文本指标规则后刷新识别。"];
    return [];
}
function projectOnboardingSuggestionsForSelection(project, plans, planFileInput, selectedPlanId) {
    const item = project && typeof project === "object" && !Array.isArray(project) ? project : {};
    const list = (Array.isArray(plans) ? plans : []).filter((plan) => plan && typeof plan === "object" && !Array.isArray(plan));
    if (!list.length)
        return projectOnboardingSuggestions({ planCount: 0 });
    const selectedFile = resolvePlanFileFromPlanList(list, planFileInput, [selectedPlanId]);
    const selectedPlan = selectedFile
        ? list.find((plan) => samePlanSelection(plan.planFile || plan.file || plan.planId || "", selectedFile))
        : undefined;
    if (!selectedPlan)
        return [`发现 ${list.length} 个 Plan；请先明确选择本次要接入并运行的 Plan。`];
    const rules = nestedRecord(item, "adapterRules");
    const scopedPreviews = planScopedResultParsePreviews(arrayFromRecord(item, "resultParsePreviews"), selectedPlan, rules).items;
    const planOutputReady = planOutputEvidenceSignals(selectedPlan).length > 0
        && planOutputEvidenceCandidates(selectedPlan).length > 0;
    return projectOnboardingSuggestions({
        planCount: list.length,
        hasActionableOutput: planOutputReady || actionableAdapterRuleSignals(rules),
        adapterConfig: String(item.adapterConfig || "").trim(),
        resultFileCount: scopedPreviews.length,
        parseableResultCount: scopedPreviews.filter(resultPreviewHasRecords).length,
    });
}
async function detectLocalProject(root, planDir) {
    const exists = async (relative) => (await existsAt(path.join(root, relative))) ? relative : "";
    const configs = [
        ...await discoverProjectConfigFiles(root),
        ...await walkYaml(path.join(root, "zlk_cluster", "restored_configs"), { includeJson: true, includePython: true }).catch(() => []),
    ];
    const plans = (await walkYaml(path.join(root, planDir)).catch(() => [])).filter((file) => !isArchivedPlanFile(root, planDir, file));
    const configFiles = configs.map((file) => path.relative(root, file).replace(/\\/g, "/"));
    const planFiles = plans.map((file) => path.relative(root, file).replace(/\\/g, "/"));
    const [entryCandidates, factory, environmentFiles] = await Promise.all([
        detectEntryCandidates(root),
        detectFactoryPatterns(root),
        detectEnvironmentFiles(root),
    ]);
    const configSummaryFiles = configSummaryTargets(configFiles);
    const configSummaries = await Promise.all(configSummaryFiles.map((file) => summarizeConfigFile(root, file)));
    const adapterConfig = await exists("experiments/zlk_project.yaml");
    const inferredRules = await inferProjectAdapterRules(root, configFiles, factory, planFiles);
    const adapterRules = adapterConfig ? mergeProjectAdapterRules(await readProjectAdapterRules(root, adapterConfig), inferredRules) : inferredRules;
    const resultOutputs = await detectResultOutputs(root, adapterRules);
    const parseableResultCount = resultOutputs.previews.filter((item) => item.parseable && Number(item.records || item.recordCount || item.rows || item.rowCount || 0) > 0).length;
    return {
        trainEntry: entryCandidates.trainEntries[0] || await exists("train.py"),
        testEntry: entryCandidates.testEntries[0] || await exists("test.py"),
        entryCandidates,
        plans: planFiles,
        configs: configFiles,
        configSummaries,
        configSummaryOmittedCount: Math.max(0, configFiles.length - configSummaryFiles.length),
        resultsDir: await exists("experiments/results"),
        workDir: await exists("work_dirs"),
        requirements: environmentFiles.find((file) => /(^|\/)requirements(?:[-_.][^/]*)?\.(?:txt|in)$/i.test(file)) || "",
        environmentFiles,
        adapterConfig,
        factoryFiles: factory.files,
        factorySymbols: factory.symbols,
        multimodalStyle: factory.multimodalStyle,
        multimodalHints: factory.multimodalHints,
        resultFiles: resultOutputs.files,
        outputContractFiles: resultOutputs.contractFiles,
        resultParsePreviews: resultOutputs.previews,
        adapterRules,
        missingOnboarding: projectOnboardingSuggestions({
            planCount: planFiles.length,
            hasActionableOutput: actionableAdapterRuleSignals(adapterRules) || inferredPlanAdapterRuleCandidates(adapterRules).length > 0,
            adapterConfig,
            resultFileCount: resultOutputs.files.length,
            parseableResultCount,
        }),
    };
}
async function detectLocalProjectForActionGate(root, planDir, previous = {}) {
    const adapterConfig = await existsAt(path.join(root, "experiments", "zlk_project.yaml")) ? "experiments/zlk_project.yaml" : "";
    const previousRules = objectRecord(previous.adapterRules);
    const explicitRules = adapterConfig ? await readProjectAdapterRules(root, adapterConfig) : undefined;
    const adapterRules = explicitRules || previousRules || emptyProjectAdapterRules();
    const exact = await existingRelativeFiles(root, [
        "metrics_summary.csv",
        "metrics_case.csv",
        "results.csv",
        "summary.txt",
        "metrics.json",
        "result.json",
        "results.json",
        "work_dirs/results.csv",
        "experiments/results.csv",
        ...adapterRuleExactFiles(adapterRules),
    ]).then((files) => files.filter(isParseableResultCandidate));
    const adapterExpanded = await expandAdapterResultCandidates(root, adapterRules, 48);
    const discovered = [
        ...await walkProjectFiles(path.join(root, "experiments", "results"), root, resultCandidateFile, 30, 2, 0, undefined, { maxDirs: 60 }),
        ...await walkProjectFiles(path.join(root, "work_dirs"), root, resultCandidateFile, 24, 2, 0, undefined, { maxDirs: 80 }),
        ...await walkProjectFiles(path.join(root, "results"), root, resultCandidateFile, 24, 2, 0, undefined, { maxDirs: 60 }),
        ...await walkProjectFiles(path.join(root, "runs"), root, resultCandidateFile, 24, 2, 0, undefined, { maxDirs: 60 }),
        ...await walkProjectFiles(path.join(root, "logs"), root, resultCandidateFile, 16, 2, 0, undefined, { maxDirs: 40 }),
    ];
    const files = uniqueStrings([...exact, ...adapterExpanded, ...discovered].filter(isParseableResultCandidate)).sort();
    return {
        ...previous,
        planDir,
        adapterConfig: adapterConfig || stringPatch(previous, "adapterConfig") || undefined,
        adapterRules,
        resultFiles: files,
        outputContractFiles: files.filter((file) => /(^|\/)(metrics_summary\.csv|metrics_case\.csv)$/i.test(file)),
        resultParsePreviews: await previewLocalResultFiles(root, files, adapterRules),
        metadataRefreshMode: "action_gate",
        metadataPartialReason: "运行/校验前只执行轻量扫描；完整项目接入摘要由后台刷新。",
    };
}
function emptyProjectAdapterRules() {
    return {
        secondaryMetrics: [],
        classificationMetrics: [],
        segmentationMetrics: [],
        candidateCsv: [],
        candidateJson: [],
        consoleLogs: [],
        textLogs: [],
        csvColumnMapping: {},
        metricAliases: {},
    };
}
const localConfigSummaryLimit = 80;
const guidedPlanConfigPickerSummaryLimit = 24;
const guidedPlanEntryPickerSummaryLimit = 12;
function configSummaryTargets(files) {
    return [...files]
        .sort((a, b) => configSummaryPriority(a) - configSummaryPriority(b) || a.localeCompare(b))
        .slice(0, localConfigSummaryLimit);
}
function configSummaryPriority(file) {
    const normalized = file.replace(/\\/g, "/").toLowerCase();
    const guidedPriority = guidedPlanConfigRecommendationPriority(normalized);
    if (guidedPriority < 10)
        return guidedPriority;
    if (/(dataset|data|runtime|output|train|test|eval|model|method)/.test(normalized))
        return 3;
    return 10;
}
async function discoverProjectConfigFiles(root) {
    const directories = ["configs", "config", "conf", "cfg", "experiments/configs", "experiments/config"];
    const rootFiles = ["config.yaml", "config.yml", "config.json", "config.py", "hparams.yaml", "hparams.yml", "hparams.json", "hparams.py", "params.yaml", "params.yml", "params.json", "params.py", "settings.yaml", "settings.yml", "settings.json", "settings.py"];
    const nested = await Promise.all(directories.map((relative) => walkYaml(path.join(root, ...relative.split("/")), {
        root,
        includeJson: true,
        includePython: true,
        maxFiles: 200,
        maxDirs: 300,
        maxDepth: 6,
    }).catch(() => [])));
    const direct = await Promise.all(rootFiles.map(async (relative) => {
        const full = path.join(root, relative);
        const stat = await fs.stat(full).catch(() => undefined);
        return stat?.isFile() ? full : undefined;
    }));
    return uniqueStrings([...nested.flat(), ...direct.filter(Boolean)])
        .sort((left, right) => {
        const a = path.relative(root, left).replace(/\\/g, "/");
        const b = path.relative(root, right).replace(/\\/g, "/");
        return configSummaryPriority(a) - configSummaryPriority(b) || a.localeCompare(b);
    })
        .slice(0, defaultYamlScanBudget.maxFiles);
}
async function readProjectAdapterRules(root, relative) {
    const text = await readUtf8Preview(path.join(root, relative));
    return parseProjectAdapterRules(text);
}
function parseProjectAdapterRules(text) {
    const lines = text.split(/\r?\n/);
    const strip = (value) => value.trim().replace(/^["']|["']$/g, "");
    const sectionRange = (section) => {
        const start = lines.findIndex((line) => new RegExp(`^${escapeRegExp(section)}:\\s*$`).test(line));
        if (start < 0)
            return [-1, -1];
        let end = lines.length;
        for (let index = start + 1; index < lines.length; index += 1) {
            if (/^[A-Za-z0-9_-]+:\s*/.test(lines[index])) {
                end = index;
                break;
            }
        }
        return [start + 1, end];
    };
    const findKeyLine = (name, indent, start = 0, end = lines.length) => {
        const pattern = new RegExp(`^\\s{${indent}}${escapeRegExp(name)}:\\s*(.*?)\\s*$`);
        for (let index = start; index < end; index += 1) {
            if (pattern.test(lines[index]))
                return index;
        }
        return -1;
    };
    const listAfter = (name, indent, start = 0, end = lines.length) => {
        const out = [];
        const lineIndex = findKeyLine(name, indent, start, end);
        if (lineIndex < 0)
            return out;
        const itemIndent = indent + 2;
        const nextKey = new RegExp(`^\\s{${indent}}[A-Za-z0-9_-]+:\\s*`);
        for (let index = lineIndex + 1; index < end; index += 1) {
            const line = lines[index];
            if (nextKey.test(line))
                break;
            const match = line.match(new RegExp(`^\\s{${itemIndent}}-\\s*(.+?)\\s*$`));
            if (match)
                out.push(strip(match[1]));
        }
        return out;
    };
    const scalar = (name, indent, start = 0, end = lines.length) => {
        const lineIndex = findKeyLine(name, indent, start, end);
        if (lineIndex < 0)
            return "";
        const match = lines[lineIndex].match(new RegExp(`^\\s{${indent}}${escapeRegExp(name)}:\\s*(.+?)\\s*$`));
        return match ? strip(match[1]) : "";
    };
    const mapAfter = (name, indent, start = 0, end = lines.length) => {
        const out = {};
        const lineIndex = findKeyLine(name, indent, start, end);
        if (lineIndex < 0)
            return out;
        const itemIndent = indent + 2;
        const nextKey = new RegExp(`^\\s{${indent}}[A-Za-z0-9_-]+:\\s*`);
        for (let index = lineIndex + 1; index < end; index += 1) {
            const line = lines[index];
            if (nextKey.test(line))
                break;
            const match = line.match(new RegExp(`^\\s{${itemIndent}}([^:#]+):\\s*(.+?)\\s*$`));
            if (match)
                out[strip(match[1])] = strip(match[2]);
        }
        return out;
    };
    const [outputsStart, outputsEnd] = sectionRange("outputs");
    const outputScalar = (name) => outputsStart >= 0 ? scalar(name, 2, outputsStart, outputsEnd) : "";
    const outputList = (name) => outputsStart >= 0 ? listAfter(name, 2, outputsStart, outputsEnd) : [];
    const outputMap = (name) => outputsStart >= 0 ? mapAfter(name, 2, outputsStart, outputsEnd) : {};
    return {
        taskType: scalar("taskType", 0) || outputScalar("taskType") || undefined,
        primaryMetric: scalar("primaryMetric", 0) || outputScalar("primaryMetric") || undefined,
        secondaryMetrics: listAfter("secondaryMetrics", 0),
        classificationMetrics: listAfter("classificationMetrics", 0),
        segmentationMetrics: listAfter("segmentationMetrics", 0),
        candidateCsv: outputList("candidateCsv").length ? outputList("candidateCsv") : listAfter("candidateCsv", 0),
        candidateJson: outputList("candidateJson").length ? outputList("candidateJson") : listAfter("candidateJson", 0),
        consoleLogs: outputList("consoleLogs").length ? outputList("consoleLogs") : listAfter("consoleLogs", 0),
        textLogs: outputList("textLogs").length ? outputList("textLogs") : listAfter("textLogs", 0),
        metricRegex: outputScalar("metricRegex") || scalar("metricRegex", 0) || undefined,
        csvColumnMapping: Object.keys(outputMap("csvColumnMapping")).length ? outputMap("csvColumnMapping") : mapAfter("csvColumnMapping", 0),
        metricAliases: Object.keys(outputMap("metricAliases")).length ? outputMap("metricAliases") : mapAfter("metricAliases", 0),
    };
}
async function inferProjectAdapterRules(root, configFiles, factory, planFiles = []) {
    const texts = await Promise.all(configFiles.slice(0, 80).map(async (file) => ({
        file,
        text: await readUtf8Preview(path.join(root, file)),
    })));
    const planTexts = await Promise.all((planFiles || []).slice(0, 40).map(async (file) => ({
        file,
        text: await readUtf8Preview(path.join(root, file)),
    })));
    const taskSignals = new Set();
    const metrics = new Set();
    const csv = new Set();
    const json = new Set();
    const consoleLogs = new Set();
    const textLogs = new Set();
    const planCsv = new Set();
    const planJson = new Set();
    const planConsoleLogs = new Set();
    const planTextLogs = new Set();
    const planSignals = new Set();
    for (const item of texts) {
        const evidenceText = configEvidenceText(item.file, item.text);
        for (const task of extractYamlStringValues(evidenceText, "task"))
            taskSignals.add(`${item.file}: task=${task}`);
        for (const metric of extractYamlStringValues(evidenceText, "metric"))
            metrics.add(metric);
        for (const metric of extractYamlListValues(evidenceText, "metrics"))
            metrics.add(metric);
        for (const resultPath of inferResultFileCandidatesFromConfig(evidenceText)) {
            if (/\.(json)$/i.test(resultPath))
                json.add(resultPath);
            else if (/\.(txt|log|out)$/i.test(resultPath))
                textLogs.add(resultPath);
            else
                csv.add(resultPath);
        }
    }
    for (const item of planTexts) {
        const evidence = (0, PlanBuilder_1.parsePlanOutputEvidence)(item.text);
        for (const resultPath of evidence.outputCandidates || []) {
            if (/\.(json)$/i.test(resultPath))
                planJson.add(resultPath);
            else if (/(^|\/)(stdout|stderr)(?:[._-][^/]*)?\.(txt|log|out)$/i.test(resultPath))
                planConsoleLogs.add(resultPath);
            else if (/\.(txt|log|out)$/i.test(resultPath))
                planTextLogs.add(resultPath);
            else
                planCsv.add(resultPath);
        }
        for (const signal of evidence.outputSignals || [])
            planSignals.add(`plan:${path.basename(item.file)}:${signal}`);
        if ((evidence.outputCandidates || []).length)
            planSignals.add(`plan:${path.basename(item.file)}:outputCandidates=${(evidence.outputCandidates || []).length}`);
    }
    if (factory.files.includes("experiments/common.py") || factory.symbols.includes("append_results")) {
        csv.add("experiments/results/*.csv");
        csv.add("work_dirs/results.csv");
    }
    if (factory.files.includes("experiments/collect_results.py")) {
        textLogs.add("work_dirs/*/test_results/summary.txt");
        csv.add("work_dirs/results.csv");
    }
    if (factory.files.includes("experiments/zlk_adapter/factory_hooks.py") || factory.symbols.includes("DefaultDeepLearningAdapter")) {
        csv.add("metrics_summary.csv");
        csv.add("work_dirs/*/metrics_summary.csv");
        csv.add("work_dirs/results.csv");
        consoleLogs.add("stdout.log");
        consoleLogs.add("stderr.log");
    }
    if (factory.symbols.includes("Registry") || factory.symbols.includes("build_model") || factory.symbols.includes("build_dataset")) {
        csv.add("work_dirs/*/metrics_summary.csv");
        csv.add("work_dirs/*/results.csv");
        json.add("work_dirs/*/metrics.json");
        textLogs.add("work_dirs/*/summary.txt");
    }
    if (factory.symbols.includes("Trainer") || factory.symbols.includes("LightningModule")) {
        csv.add("lightning_logs/*/metrics.csv");
        csv.add("logs/*/metrics.csv");
    }
    if (factory.symbols.includes("classification_report")) {
        csv.add("classification_report.csv");
        textLogs.add("classification_report.txt");
    }
    const hasSegmentationTask = [...taskSignals].some((item) => /segmentation|seg\b/i.test(item));
    const hasClassificationTask = [...taskSignals].some((item) => /classification|multimodal_classification/i.test(item));
    const taskType = hasSegmentationTask && !hasClassificationTask ? "segmentation" : "classification";
    const normalizedMetrics = uniqueStrings([...metrics].map(normalizeMetricName).filter(Boolean));
    const classification = uniqueStrings([
        ...normalizedMetrics.filter((item) => !/dice|dsc|iou|hd95|asd|hausdorff/i.test(item)),
        "AUC",
        "accuracy",
        "F1",
        "AUPRC",
        "precision",
        "recall",
        "specificity",
        "balanced_accuracy",
        "loss",
    ]);
    const segmentation = uniqueStrings([
        ...normalizedMetrics.filter((item) => /dice|dsc|iou|hd95|asd|hausdorff/i.test(item)),
        "Dice",
        "DSC",
        "IoU",
        "HD95",
        "ASD",
    ]);
    return {
        taskType,
        primaryMetric: classification.includes("AUC") ? "AUC" : classification[0] || "accuracy",
        secondaryMetrics: classification.filter((item) => item !== "AUC").slice(0, 8),
        classificationMetrics: classification,
        segmentationMetrics: segmentation,
        candidateCsv: uniqueStrings([...csv].map((item) => item.replace(/\\/g, "/"))),
        candidateJson: uniqueStrings([...json]),
        consoleLogs: uniqueStrings([...consoleLogs]),
        textLogs: uniqueStrings([...textLogs]),
        inferredPlanCandidateCsv: uniqueStrings([...planCsv].map((item) => item.replace(/\\/g, "/"))),
        inferredPlanCandidateJson: uniqueStrings([...planJson]),
        inferredPlanConsoleLogs: uniqueStrings([...planConsoleLogs]),
        inferredPlanTextLogs: uniqueStrings([...planTextLogs]),
        metricRegex: undefined,
        csvColumnMapping: { metric: "metric", value: "value", method: "method", dataset: "dataset", seed: "seed", suite: "suite", split: "split" },
        metricAliases: defaultMetricAliases(),
        inferredFromProject: true,
        inferredSignals: uniqueStrings([
            ...taskSignals,
            ...planSignals,
            ...factory.multimodalHints.map((item) => `MultiModal: ${item}`),
            ...factory.symbols.map((item) => `symbol: ${item}`),
            ...normalizedMetrics.slice(0, 16).map((item) => `metric: ${item}`),
        ]).slice(0, 32),
    };
}
function mergeProjectAdapterRules(explicitRules, inferredRules) {
    const hasMap = (value) => Object.keys(value || {}).length > 0;
    const unionList = (...lists) => uniqueStrings(lists.flatMap((list) => Array.isArray(list) ? list : []).map((item) => String(item || "").trim().replace(/\\/g, "/")).filter(Boolean));
    return {
        taskType: explicitRules.taskType || inferredRules.taskType,
        primaryMetric: explicitRules.primaryMetric || inferredRules.primaryMetric,
        secondaryMetrics: explicitRules.secondaryMetrics?.length ? explicitRules.secondaryMetrics : inferredRules.secondaryMetrics,
        classificationMetrics: explicitRules.classificationMetrics?.length ? explicitRules.classificationMetrics : inferredRules.classificationMetrics,
        segmentationMetrics: explicitRules.segmentationMetrics?.length ? explicitRules.segmentationMetrics : inferredRules.segmentationMetrics,
        candidateCsv: unionList(explicitRules.candidateCsv, inferredRules.candidateCsv),
        candidateJson: unionList(explicitRules.candidateJson, inferredRules.candidateJson),
        consoleLogs: unionList(explicitRules.consoleLogs, inferredRules.consoleLogs),
        textLogs: unionList(explicitRules.textLogs, inferredRules.textLogs),
        inferredPlanCandidateCsv: unionList(inferredRules.inferredPlanCandidateCsv),
        inferredPlanCandidateJson: unionList(inferredRules.inferredPlanCandidateJson),
        inferredPlanConsoleLogs: unionList(inferredRules.inferredPlanConsoleLogs),
        inferredPlanTextLogs: unionList(inferredRules.inferredPlanTextLogs),
        metricRegex: explicitRules.metricRegex || inferredRules.metricRegex,
        csvColumnMapping: hasMap(explicitRules.csvColumnMapping) ? explicitRules.csvColumnMapping : inferredRules.csvColumnMapping,
        metricAliases: hasMap(explicitRules.metricAliases) ? explicitRules.metricAliases : inferredRules.metricAliases,
        inferredFromProject: false,
        inferredSignals: inferredRules.inferredSignals || [],
    };
}
function extractYamlStringValues(text, key) {
    const values = [];
    const pattern = new RegExp(`^\\s*${escapeRegExp(key)}:\\s*["']?([^"'#\\r\\n]+)`, "gim");
    let match;
    while ((match = pattern.exec(text)))
        values.push(match[1].trim());
    return values;
}
function extractYamlListValues(text, key) {
    const values = [];
    const inline = text.match(new RegExp(`^\\s*${escapeRegExp(key)}:\\s*\\[(.*?)\\]`, "im"));
    if (inline)
        values.push(...inline[1].split(/[,，]/).map((item) => item.trim().replace(/^["']|["']$/g, "")).filter(Boolean));
    const block = text.match(new RegExp(`^\\s*${escapeRegExp(key)}:\\s*\\n((?:\\s+-.*(?:\\r?\\n|$))+)`, "im"));
    if (block) {
        for (const line of block[1].split(/\r?\n/)) {
            const item = line.match(/^\s*-\s*["']?([^"'#\r\n]+)/);
            if (item)
                values.push(item[1].trim());
        }
    }
    return values;
}
function inferResultFileCandidatesFromConfig(text) {
    return (0, PlanBuilder_1.parsePlanOutputEvidence)(text).outputCandidates;
}
function configEvidenceText(file, text) {
    const name = String(file || "");
    if (/\.py$/i.test(name))
        return pythonConfigEvidenceText(text);
    if (/\.json$/i.test(name)) {
        try {
            return jsonConfigEvidenceText(JSON.parse(String(text || "")));
        }
        catch {
            return String(text || "");
        }
    }
    return String(text || "");
}
function jsonConfigEvidenceText(value) {
    const lines = [];
    const maxLines = 2000;
    const visit = (item, indent) => {
        if (lines.length >= maxLines || !item || typeof item !== "object" || Array.isArray(item))
            return;
        for (const [key, child] of Object.entries(item)) {
            if (lines.length >= maxLines)
                break;
            const prefix = " ".repeat(indent) + yamlMapKey(key) + ":";
            if (Array.isArray(child)) {
                lines.push(prefix);
                for (const entry of child.slice(0, 100)) {
                    if (lines.length >= maxLines)
                        break;
                    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
                        lines.push(" ".repeat(indent + 2) + "-");
                        visit(entry, indent + 4);
                    }
                    else {
                        lines.push(" ".repeat(indent + 2) + "- " + yamlScalar(entry));
                    }
                }
            }
            else if (child && typeof child === "object") {
                lines.push(prefix);
                visit(child, indent + 2);
            }
            else {
                lines.push(prefix + " " + yamlScalar(child));
            }
        }
    };
    visit(value, 0);
    return lines.join("\n");
}
function pythonConfigEvidenceText(text) {
    const outputKeys = new Set([
        "result_csv", "results_csv", "metrics_csv", "summary_csv", "output_csv",
        "result_json", "metrics_json", "summary_txt", "log_file", "output_dir",
        "result_dir", "results_dir", "work_dir", "workdir", "save_dir", "log_dir",
    ]);
    const lines = [];
    const seen = new Set();
    const addScalar = (key, value) => {
        const normalizedKey = key === "task_type" ? "task" : key === "primary_metric" ? "metric" : key;
        const token = `${normalizedKey}\u0000${value}`;
        if (!normalizedKey || !String(value || "").trim() || seen.has(token))
            return;
        seen.add(token);
        lines.push(`${yamlMapKey(normalizedKey)}: ${yamlScalar(value)}`);
    };
    const addList = (key, values) => {
        const normalized = uniqueStrings(values.map((item) => String(item || "").trim()).filter(Boolean));
        if (!normalized.length)
            return;
        const token = `${key}\u0000${normalized.join("\u0000")}`;
        if (seen.has(token))
            return;
        seen.add(token);
        lines.push(`${yamlMapKey(key)}:`);
        for (const value of normalized.slice(0, 100))
            lines.push(`  - ${yamlScalar(value)}`);
    };
    for (const assignment of pythonTopLevelAssignments(text)) {
        const scalar = pythonScalarLiteral(assignment.value);
        if (scalar !== undefined && (["task", "task_type", "metric", "primary_metric"].includes(assignment.key) || outputKeys.has(assignment.key)))
            addScalar(assignment.key, scalar);
        if (["metric", "metrics", "secondary_metrics", "classification_metrics", "segmentation_metrics"].includes(assignment.key))
            addList(assignment.key === "metric" ? "metrics" : assignment.key, pythonStringList(assignment.value));
    }
    const staticText = String(text || "").split(/\r?\n/).map(stripPythonComment).join("\n");
    const nestedScalar = /\b(task|task_type|metric|primary_metric|result_csv|results_csv|metrics_csv|summary_csv|output_csv|result_json|metrics_json|summary_txt|log_file|output_dir|result_dir|results_dir|work_dir|workdir|save_dir|log_dir)\s*(?:=|:)\s*(?:[rRuUfF]{0,2})(["'])([^\r\n]*?)\2/g;
    let match;
    while ((match = nestedScalar.exec(staticText)))
        addScalar(match[1], match[3].replace(/\\([\\"'])/g, "$1"));
    const nestedLists = /\b(metrics|secondary_metrics|classification_metrics|segmentation_metrics)\s*(?:=|:)\s*([\[(][^\])]*[\])])/g;
    while ((match = nestedLists.exec(staticText)))
        addList(match[1], pythonStringList(match[2]));
    return lines.join("\n");
}
function normalizeCandidateDir(value) {
    const text = normalizeCandidatePath(value).replace(/\/+$/, "");
    if (!text || /^(none|null|false)$/i.test(text))
        return "";
    if (/\.(csv|json|txt|log|out)$/i.test(text))
        return path.posix.dirname(text);
    return text;
}
function normalizeCandidatePath(value) {
    const text = value.trim().replace(/^["']|["']$/g, "").replace(/\\/g, "/");
    if (!text || /^(none|null|false)$/i.test(text))
        return "";
    if (/^(https?:|s3:|gs:|oss:)/i.test(text))
        return "";
    if (/^(?:[A-Za-z]:)?\//.test(text))
        return "";
    if (text.startsWith("$") || text.includes("://"))
        return "";
    return text.replace(/^\.\//, "");
}
function normalizeMetricName(value) {
    const text = value.trim().replace(/^["']|["']$/g, "");
    const aliases = defaultMetricAliases();
    return aliases[text] || aliases[text.toLowerCase()] || text;
}
function defaultMetricAliases() {
    return {
        acc: "accuracy",
        val_acc: "accuracy",
        test_acc: "accuracy",
        best_acc: "accuracy",
        top1: "top1_accuracy",
        top_1: "top1_accuracy",
        top1_acc: "top1_accuracy",
        top5: "top5_accuracy",
        top_5: "top5_accuracy",
        top5_acc: "top5_accuracy",
        auc: "AUC",
        auroc: "AUC",
        roc_auc: "AUC",
        val_auc: "AUC",
        test_auc: "AUC",
        auprc: "AUPRC",
        pr_auc: "AUPRC",
        average_precision: "AUPRC",
        ap: "AUPRC",
        f1_score: "F1",
        macro_f1: "F1",
        micro_f1: "F1",
        weighted_f1: "F1",
        sensitivity: "recall",
        tpr: "recall",
        ppv: "precision",
        tnr: "specificity",
        bal_acc: "balanced_accuracy",
        balanced_acc: "balanced_accuracy",
        acc1: "top1_accuracy",
        "acc@1": "top1_accuracy",
        top_1_acc: "top1_accuracy",
        acc5: "top5_accuracy",
        "acc@5": "top5_accuracy",
        auc_roc: "AUC",
        "roc-auc": "AUC",
        "pr-auc": "AUPRC",
        f1_macro: "F1",
        f1_micro: "F1",
        f1_weighted: "F1",
        matthews_corrcoef: "MCC",
        cohen_kappa: "kappa",
        dice: "DSC",
        dice_score: "DSC",
        dsc: "DSC",
        hausdorff: "HD95",
    };
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalizeProjectAdapterRulesPatch(patch) {
    return {
        taskType: stringPatchValue(patch.taskType),
        primaryMetric: stringPatchValue(patch.primaryMetric),
        secondaryMetrics: splitUiList(patch.secondaryMetrics),
        classificationMetrics: splitUiList(patch.classificationMetrics),
        segmentationMetrics: splitUiList(patch.segmentationMetrics),
        candidateCsv: splitUiList(patch.candidateCsv),
        candidateJson: splitUiList(patch.candidateJson),
        consoleLogs: splitUiList(patch.consoleLogs),
        textLogs: splitUiList(patch.textLogs),
        metricRegex: stringPatchValue(patch.metricRegex),
        csvColumnMapping: splitUiMap(patch.csvColumnMapping),
        metricAliases: splitUiMap(patch.metricAliases),
    };
}
function applyProjectAdapterRulesPatch(text, patch) {
    let out = text.replace(/\r\n/g, "\n");
    out = replaceTopLevelScalar(out, "taskType", patch.taskType || "classification");
    out = replaceTopLevelScalar(out, "primaryMetric", patch.primaryMetric || "AUC");
    out = replaceTopLevelList(out, "secondaryMetrics", patch.secondaryMetrics || []);
    out = replaceTopLevelList(out, "classificationMetrics", patch.classificationMetrics || []);
    out = replaceTopLevelList(out, "segmentationMetrics", patch.segmentationMetrics || []);
    out = ensureTopLevelSection(out, "outputs");
    out = replaceNestedScalar(out, "outputs", "metricRegex", patch.metricRegex || "");
    out = replaceNestedList(out, "outputs", "consoleLogs", patch.consoleLogs || []);
    out = replaceNestedList(out, "outputs", "textLogs", patch.textLogs || []);
    out = replaceNestedList(out, "outputs", "candidateCsv", patch.candidateCsv || []);
    out = replaceNestedList(out, "outputs", "candidateJson", patch.candidateJson || []);
    out = replaceNestedMap(out, "outputs", "csvColumnMapping", patch.csvColumnMapping || {});
    out = replaceNestedMap(out, "outputs", "metricAliases", patch.metricAliases || {});
    return out.endsWith("\n") ? out : `${out}\n`;
}
function stringPatchValue(value) {
    const text = typeof value === "string" ? value.trim() : "";
    return text || undefined;
}
function splitUiList(value) {
    const text = typeof value === "string" ? value : Array.isArray(value) ? value.join("\n") : "";
    return Array.from(new Set(text.split(/[\n,，]+/).map((item) => item.trim()).filter(Boolean)));
}
function splitUiMap(value) {
    const text = typeof value === "string" ? value : "";
    const out = {};
    for (const raw of text.split(/\r?\n|,|，/)) {
        const line = raw.trim();
        if (!line)
            continue;
        const match = line.match(/^(.+?)(?:=>|=|:)\s*(.+)$/);
        if (match)
            out[match[1].trim()] = match[2].trim();
    }
    return out;
}
function replaceTopLevelScalar(text, key, value) {
    return replaceTopLevelBlock(text, key, [`${key}: ${yamlScalar(value)}`]);
}
function replaceTopLevelList(text, key, values) {
    if (!values.length)
        return replaceTopLevelBlock(text, key, [`${key}: []`]);
    return replaceTopLevelBlock(text, key, [`${key}:`, ...values.map((item) => `  - ${yamlScalar(item)}`)]);
}
function replaceNestedScalar(text, section, key, value) {
    return replaceNestedBlock(text, section, key, [`  ${key}: ${yamlScalar(value)}`]);
}
function replaceNestedList(text, section, key, values) {
    if (!values.length)
        return replaceNestedBlock(text, section, key, [`  ${key}: []`]);
    return replaceNestedBlock(text, section, key, [`  ${key}:`, ...values.map((item) => `    - ${yamlScalar(item)}`)]);
}
function replaceNestedMap(text, section, key, values) {
    const entries = Object.entries(values);
    if (!entries.length)
        return replaceNestedBlock(text, section, key, [`  ${key}: {}`]);
    return replaceNestedBlock(text, section, key, [`  ${key}:`, ...entries.map(([name, value]) => `    ${yamlMapKey(name)}: ${yamlScalar(value)}`)]);
}
function replaceTopLevelBlock(text, key, block) {
    const lines = text.split("\n");
    const start = lines.findIndex((line) => new RegExp(`^${escapeRegExp(key)}:\\s*`).test(line));
    if (start >= 0) {
        const end = nextTopLevelIndex(lines, start + 1);
        lines.splice(start, end - start, ...block);
        return lines.join("\n");
    }
    const insertAt = topLevelInsertIndex(lines, ["primaryMetric", "taskType", "projectName", "schemaVersion"]);
    lines.splice(insertAt, 0, ...block);
    return lines.join("\n");
}
function replaceNestedBlock(text, section, key, block) {
    const ensured = ensureTopLevelSection(text, section);
    const lines = ensured.split("\n");
    const sectionStart = lines.findIndex((line) => new RegExp(`^${escapeRegExp(section)}:\\s*$`).test(line));
    if (sectionStart < 0)
        return ensured;
    const sectionEnd = nextTopLevelIndex(lines, sectionStart + 1);
    const keyPattern = new RegExp(`^\\s{2}${escapeRegExp(key)}:\\s*`);
    const keyIndex = lines.findIndex((line, index) => index > sectionStart && index < sectionEnd && keyPattern.test(line));
    if (keyIndex >= 0) {
        const end = nextNestedIndex(lines, keyIndex + 1, sectionEnd, 2);
        lines.splice(keyIndex, end - keyIndex, ...block);
    }
    else {
        lines.splice(sectionEnd, 0, ...block);
    }
    return lines.join("\n");
}
function ensureTopLevelSection(text, section) {
    if (new RegExp(`^${escapeRegExp(section)}:\\s*$`, "m").test(text))
        return text;
    return `${text.replace(/\s*$/, "\n")}${section}:\n`;
}
function nextTopLevelIndex(lines, start) {
    for (let index = start; index < lines.length; index += 1) {
        if (/^[A-Za-z0-9_-]+:\s*/.test(lines[index]))
            return index;
    }
    return lines.length;
}
function nextNestedIndex(lines, start, end, indent) {
    const pattern = new RegExp(`^\\s{${indent}}[A-Za-z0-9_-]+:\\s*`);
    for (let index = start; index < end; index += 1) {
        if (pattern.test(lines[index]))
            return index;
    }
    return end;
}
function topLevelInsertIndex(lines, preferredKeys) {
    for (const key of preferredKeys) {
        const start = lines.findIndex((line) => new RegExp(`^${escapeRegExp(key)}:\\s*`).test(line));
        if (start >= 0)
            return nextTopLevelIndex(lines, start + 1);
    }
    return 0;
}
function yamlScalar(value) {
    const text = String(value ?? "").trim();
    if (!text)
        return "\"\"";
    if (/^[A-Za-z0-9_./*{}@+\-]+$/.test(text) && !/^(true|false|null|yes|no)$/i.test(text))
        return text;
    return JSON.stringify(text);
}
function yamlMapKey(value) {
    const text = String(value ?? "").trim();
    return /^[A-Za-z0-9_.\-]+$/.test(text) ? text : JSON.stringify(text);
}
async function detectEntryCandidates(root) {
    const candidates = [
        "train.py",
        "test.py",
        "main.py",
        "main_worker.py",
        "train_net.py",
        "eval.py",
        "evaluate.py",
        "scripts/train.py",
        "scripts/test.py",
        "src/train.py",
        "src/test.py",
        "src/eval.py",
        "tools/train.py",
        "tools/test.py",
        "tools/eval.py",
    ];
    const exact = await existingRelativeFiles(root, candidates);
    const discoveredGroups = await Promise.all(["scripts", "src", "tools", "experiments"].map((relative) => {
        const dir = path.join(root, relative);
        return walkProjectFiles(dir, root, experimentEntryFileName, 20, 3, 0, dir, { maxDirs: 60, visited: { count: 0 } });
    }));
    const discovered = discoveredGroups.flat();
    const existing = uniqueStrings([...exact, ...discovered]);
    return {
        trainEntries: existing.filter(isTrainEntryCandidate),
        testEntries: existing.filter(isTestEntryCandidate),
        all: existing,
    };
}
function experimentEntryFileName(name) {
    return /^(?:train(?:_net)?|main(?:_worker)?|run(?:_experiment)?|fit|test(?:_net)?|eval|evaluate)\.py$/i.test(String(name || ""));
}
function isTrainEntryCandidate(file) {
    return /^(?:train(?:_net)?|main(?:_worker)?|run(?:_experiment)?|fit)\.py$/i.test(path.posix.basename(String(file || "").replace(/\\/g, "/")));
}
function isTestEntryCandidate(file) {
    return /^(?:test(?:_net)?|eval|evaluate)\.py$/i.test(path.posix.basename(String(file || "").replace(/\\/g, "/")));
}
async function guidedPlanCommandSuggestion(root, entry, stage) {
    const file = String(entry || "").trim().replace(/\\/g, "/");
    const source = file ? await readUtf8Preview(path.join(root, ...file.split("/"))).catch(() => "") : "";
    return guidedPlanCommandInfo(file, stage, source);
}
function guidedPlanEntryChoiceItem(file, recommended, suggestion, stage, previewed = true) {
    const warnings = previewed ? guidedPlanCommandWarnings(suggestion, stage) : [];
    const labels = [];
    if (file === recommended)
        labels.push("推荐");
    labels.push(!previewed ? "未预读参数" : warnings.length ? "需核对参数" : "参数已识别");
    const detail = previewed
        ? `建议命令：${guidedPlanSummaryValue(suggestion?.command || `python ${JSON.stringify(file)}`, 180)}${warnings.length ? `；${warnings.join("；")}` : ""}`
        : `尚未静态读取；仅预读前 ${guidedPlanEntryPickerSummaryLimit} 个高优先级入口，选择后会在命令确认中检查。`;
    return { label: file, description: labels.join(" · "), detail };
}
async function guidedPlanEntryChoiceItems(root, files, stage, recommended) {
    const list = Array.isArray(files) ? files : [];
    const previewFiles = root ? uniqueStrings([recommended, ...list]).slice(0, guidedPlanEntryPickerSummaryLimit) : [];
    const suggestions = new Map(await mapLimited(previewFiles, 6, async (file) => [file, await guidedPlanCommandSuggestion(root, file, stage)]));
    const previewed = new Set(previewFiles);
    return list.map((file) => guidedPlanEntryChoiceItem(file, recommended, suggestions.get(file), stage, previewed.has(file)));
}
function guidedPlanScaleKey(value) {
    return /(?:^|\.)(?:epochs?|max_epochs?|num_epochs?|total_epochs?|steps?|max_steps?|train_steps?|iterations?|max_iters?|limit_train_batches|num_train_samples|train_samples)(?:$|\.)/i.test(String(value || ""));
}
function guidedPlanScaleReview(file, params, generatedFallbackConfig = false) {
    const rows = (Array.isArray(params) ? params : []).filter((item) => guidedPlanScaleKey(item?.key)).slice(0, 8);
    const fileSignalsSmall = /(?:^|[\/_.-])(?:smoke|debug|tiny|mini|quick)(?:[\/_.-]|$)/i.test(String(file || ""));
    const numericSignalsSmall = rows.some((item) => {
        const key = String(item?.key || "").toLowerCase();
        const value = Number(String(item?.value ?? "").trim());
        if (!Number.isFinite(value))
            return false;
        if (/(?:^|\.)(?:epochs?|max_epochs?|num_epochs?|total_epochs?)$/.test(key))
            return value > 0 && value <= 5;
        if (/(?:^|\.)(?:steps?|max_steps?|train_steps?|iterations?|max_iters?)$/.test(key))
            return value > 0 && value <= 500;
        if (/(?:^|\.)limit_train_batches$/.test(key))
            return value > 0 && value <= 100;
        if (/(?:^|\.)(?:num_train_samples|train_samples)$/.test(key))
            return value > 0 && value <= 1000;
        return false;
    });
    const scaleText = rows.length ? rows.map((item) => `${item.key}=${item.value}`).join("；") : "未识别到 epochs、steps 或样本数限制";
    if (generatedFallbackConfig) {
        return {
            needsReview: true,
            summary: `训练规模由脚本默认参数决定；${scaleText}`,
            reason: "入口命令不使用配置，最小空配置只满足调度契约，不会自动缩小训练规模。",
        };
    }
    const smokeSignal = numericSignalsSmall;
    const signalLabel = smokeSignal ? "检测到小规模参数" : fileSignalsSmall ? "仅检测到 smoke/debug 文件名，未检测到明确数值限制" : "未检测到明确小规模线索";
    return {
        needsReview: !smokeSignal,
        summary: `${signalLabel}；${scaleText}`,
        reason: smokeSignal ? "仍需确认数据子集、epoch 和 step 限制符合首跑预期。" : "首次运行前请确认不会直接启动完整训练。",
    };
}
async function guidedPlanConfigReview(root, baseConfig, generatedFallbackConfig) {
    if (generatedFallbackConfig)
        return guidedPlanScaleReview(baseConfig, [], true);
    const text = await readUtf8Preview(safeWorkspaceChildPath(root, baseConfig));
    const params = /\.json$/i.test(baseConfig)
        ? extractJsonParams(text)
        : /\.py$/i.test(baseConfig)
            ? extractPythonConfigParams(text)
            : extractYamlParams(text);
    return guidedPlanScaleReview(baseConfig, params, false);
}
function guidedPlanConfigChoiceItem(file, recommended, review, previewed = true) {
    const labels = [];
    if (file === recommended)
        labels.push("推荐首跑");
    labels.push(!previewed ? "未预读规模" : review?.needsReview === false ? "小规模参数" : "需核对规模");
    const summary = previewed
        ? `${review?.summary || "未识别到可用规模参数"}${review?.reason ? `；${review.reason}` : ""}`
        : `未预读；仅静态检查前 ${guidedPlanConfigPickerSummaryLimit} 个高优先级配置，选择后会在创建前再次检查。`;
    return {
        label: file,
        description: labels.join(" · "),
        detail: `规模证据：${summary}`,
    };
}
async function guidedPlanConfigChoiceItems(root, files, recommended) {
    const list = Array.isArray(files) ? files : [];
    const previewFiles = root ? configSummaryTargets(list).slice(0, guidedPlanConfigPickerSummaryLimit) : [];
    const reviews = new Map(await mapLimited(previewFiles, 8, async (file) => {
        try {
            return [file, await guidedPlanConfigReview(root, file, false)];
        }
        catch {
            return [file, { needsReview: true, summary: "无法静态读取配置", reason: "选择后请人工核对配置内容。" }];
        }
    }));
    const previewed = new Set(previewFiles);
    return list.map((file) => guidedPlanConfigChoiceItem(file, recommended, reviews.get(file), previewed.has(file)));
}
function guidedPlanSummaryValue(value, limit = Number.MAX_SAFE_INTEGER) {
    const text = String(value || "未设置").replace(/\s+/g, " ").trim();
    return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}
function remoteActionTargetPreview(body, limit = 12) {
    const item = body && typeof body === "object" ? body : {};
    const options = item.options && typeof item.options === "object" ? item.options : {};
    const paths = [];
    const identifiers = [];
    const pathSeen = new Set();
    const identifierSeen = new Set();
    const addPath = (value) => {
        const text = String(value || "").trim();
        if (!text || text === "-" || pathSeen.has(text))
            return;
        pathSeen.add(text);
        paths.push(text);
    };
    const addIdentifier = (value) => {
        const text = String(value || "").trim();
        if (!text || text === "-" || identifierSeen.has(text) || pathSeen.has(text))
            return;
        if (/[\\/]/.test(text)) {
            addPath(text);
            return;
        }
        identifierSeen.add(text);
        identifiers.push(text);
    };
    for (const source of [item, options]) {
        for (const key of ["confirmationPath", "remotePath", "path", "artifactPath", "resultPath", "logPath"])
            addPath(source[key]);
        (Array.isArray(source.confirmationPaths) ? source.confirmationPaths : []).forEach(addPath);
        for (const key of ["archiveKey", "runKey", "experimentId"])
            addIdentifier(source[key]);
        for (const key of ["selectedArchiveKeys", "selectedRunKeys", "selectedExperimentIds"])
            (Array.isArray(source[key]) ? source[key] : []).forEach(addIdentifier);
        for (const target of Array.isArray(source.selectedTaskTargets) ? source.selectedTaskTargets : []) {
            if (!target || typeof target !== "object")
                continue;
            for (const key of ["resultPath", "artifactPath", "remotePath", "path", "logPath"])
                addPath(target[key]);
            for (const key of ["archiveKey", "runKey", "experimentId"])
                addIdentifier(target[key]);
        }
    }
    const visibleLimit = Math.max(1, Math.trunc(Number(limit) || 12));
    return {
        values: [...paths, ...identifiers],
        visible: [...paths, ...identifiers].slice(0, visibleLimit),
        paths,
        visiblePaths: paths.slice(0, visibleLimit),
        identifiers,
        visibleIdentifiers: identifiers.slice(0, visibleLimit),
    };
}
function remoteActionDisplayName(command, action) {
    const names = {
        stopExperiment: "停止任务",
        retryExperiment: "重试任务",
        archiveArtifacts: "准备归档",
        excludeResults: "排除结果并保留预览",
        syncArtifacts: "检查同步清单",
        completeThreeWay: "校验三方一致",
        deleteArtifacts: "删除产物",
    };
    return names[String(command || "")] || String(action || command || "远端操作");
}
function remoteActionConfirmationDetail(command, action, body) {
    const displayName = remoteActionDisplayName(command, action);
    const preview = remoteActionTargetPreview(body);
    const item = body && typeof body === "object" ? body : {};
    const options = item.options && typeof item.options === "object" ? item.options : {};
    const planFile = String(item.planFile || item.selectedPlanId || options.planFile || options.selectedPlanId || "").trim();
    const lines = [
        `【强制确认】${displayName}`,
        ...(planFile ? [`Plan：${planFile}`] : []),
        `文件位置：${preview.paths.length} 个；任务标识：${preview.identifiers.length} 个`,
        "预期操作文件位置：",
        ...(preview.visiblePaths.length ? preview.visiblePaths.map((value) => `- ${value}`) : ["- 未能从当前选择中展开文件位置，Hub Agent 将按下列任务标识解析"]),
        ...(preview.paths.length > preview.visiblePaths.length ? [`- 其余 ${preview.paths.length - preview.visiblePaths.length} 个文件位置未展开`] : []),
        ...(preview.visibleIdentifiers.length ? ["", "任务标识：", ...preview.visibleIdentifiers.map((value) => `- ${value}`)] : []),
        ...(preview.identifiers.length > preview.visibleIdentifiers.length ? [`- 其余 ${preview.identifiers.length - preview.visibleIdentifiers.length} 个任务标识未展开`] : []),
        "",
    ];
    if (action === "sync-artifacts") {
        lines.push("此操作只检查目标并生成同步 manifest。", "不会上传、下载或移动文件，也不会把目标标记为已归档。", "完成后仍需通过实际文件同步流程传输产物，再运行“三方一致校验”。");
    }
    else {
        lines.push(`${displayName} 将通过 Hub Agent 执行；请确认以上位置属于目标实验。`);
    }
    return lines.join("\n");
}
function workerRemoteActionConfirmationDetail(command, action, body, workerIds) {
    const ids = [...new Set((Array.isArray(workerIds) ? workerIds : [])
            .map((value) => String(value || "").trim())
            .filter(Boolean))];
    const route = ids.length === 1
        ? `执行通道：本机 Xshell 隧道直达 Worker Agent ${ids[0]}`
        : `执行通道：本机 Xshell 隧道分别直达 ${ids.length} 个 Worker Agent：${ids.join("、")}`;
    return [
        remoteActionConfirmationDetail(command, action, body),
        "",
        route,
        "不会改写 Hub 全局 plan 控制文件。",
    ].join("\n");
}
function guidedPlanModeLabel(mode) {
    const normalized = (0, PlanBuilder_1.normalizePlanMode)(mode);
    return normalized === "train" ? "仅训练" : normalized === "test" ? "仅评估" : "训练并评估";
}
function planRunOutputLocationSummary(plan, limit = 3) {
    const item = plan && typeof plan === "object" ? plan : {};
    const paper = item.paper && typeof item.paper === "object" ? item.paper : {};
    const direct = uniqueStrings([
        ...(Array.isArray(item.outputCandidates) ? item.outputCandidates : []),
        ...(Array.isArray(item.expectedResults) ? item.expectedResults : []),
        item.resultCsv,
        item.result_csv,
        paper.resultCsv,
        paper.result_csv,
    ].map((value) => String(value || "").trim()).filter(Boolean));
    const fallback = uniqueStrings((Array.isArray(item.confirmationOutputCandidates) ? item.confirmationOutputCandidates : [])
        .map((value) => String(value || "").trim()).filter(Boolean));
    const values = direct.length ? direct : fallback;
    const visible = values.slice(0, Math.max(1, Math.trunc(Number(limit) || 3)));
    return {
        source: direct.length ? "Plan" : fallback.length ? "接入配置" : "未声明",
        values,
        text: visible.length ? visible.join("、") + (values.length > visible.length ? ` 等 ${values.length} 项` : "") : "未声明",
    };
}
function planRunCommandSummary(plan, limit = 240) {
    const item = plan && typeof plan === "object" ? plan : {};
    const runner = item.runner && typeof item.runner === "object" ? item.runner : {};
    const mode = String(item.mode || "train_test").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const trainOnly = ["train", "training", "train_only"].includes(mode);
    const testOnly = ["test", "eval", "evaluate", "evaluation", "test_only", "eval_only"].includes(mode);
    const train = item.trainCommand || item.train_command || runner.trainCommand || runner.train_command || item.command || "";
    const test = item.testCommand || item.test_command || runner.testCommand || runner.test_command || "";
    const summarize = (label, value) => `${label}：${guidedPlanSummaryValue(value || "未声明（运行前校验会阻断）", limit)}`;
    const rows = [];
    if (!testOnly)
        rows.push(summarize("训练", train));
    if (!trainOnly)
        rows.push(summarize("评估", test));
    return rows.length ? rows : [summarize("命令", train || test)];
}
function planRunTargetLocations(values) {
    const seen = new Set();
    const out = [];
    for (const raw of Array.isArray(values) ? values : []) {
        const item = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : { label: raw, role: "worker", remotePath: "" };
        const label = String(item.label || item.id || item.role || "目标").trim();
        const role = String(item.role || "worker").trim().toLowerCase();
        const remotePath = normalizeRemoteWorkRoot(item.remotePath || item.path || "");
        const capacityValue = Number(item.maxConcurrentGpus || item.max_concurrent_gpus || 1);
        const maxConcurrentGpus = Number.isFinite(capacityValue) && capacityValue > 0 ? Math.trunc(capacityValue) : 1;
        const allowedGpuIds = uniqueStrings((Array.isArray(item.allowedGpuIds) ? item.allowedGpuIds : Array.isArray(item.allowed_gpu_ids) ? item.allowed_gpu_ids : [])
            .map((value) => String(value || "").trim()).filter(Boolean));
        const condaEnv = String(item.condaEnv || item.conda_env || "").trim();
        const key = `${role}:${label.toLowerCase()}:${remotePath}`;
        if (!label || seen.has(key))
            continue;
        seen.add(key);
        out.push({ label, role, remotePath, maxConcurrentGpus, allowedGpuIds, condaEnv });
    }
    return out;
}
function planRunWorkerCapacitySummary(target) {
    const item = target && typeof target === "object" ? target : {};
    const limit = Math.max(1, Math.trunc(Number(item.maxConcurrentGpus || item.max_concurrent_gpus || 1) || 1));
    const allowed = uniqueStrings((Array.isArray(item.allowedGpuIds) ? item.allowedGpuIds : Array.isArray(item.allowed_gpu_ids) ? item.allowed_gpu_ids : [])
        .map((value) => String(value || "").trim()).filter(Boolean));
    const condaEnv = String(item.condaEnv || item.conda_env || "").trim();
    return `${String(item.label || item.id || "Worker")}：执行环境 ${executionEnvironmentLabel(condaEnv)}；并发占卡上限 ${limit}；允许 GPU ${allowed.length ? allowed.join("、") : "不限"}`;
}
function planRunKnownJobCount(plan) {
    const item = plan && typeof plan === "object" ? plan : {};
    const explicitValue = Number(item.jobCount || item.job_count || 0);
    if (Number.isFinite(explicitValue) && explicitValue > 0)
        return Math.trunc(explicitValue);
    const cases = Array.isArray(item.cases) ? item.cases : [];
    const seeds = Array.isArray(item.seeds) ? item.seeds : [];
    return cases.length && seeds.length ? cases.length * seeds.length : 0;
}
function planRunScaleSummary(plan) {
    const item = plan && typeof plan === "object" ? plan : {};
    const cases = Array.isArray(item.cases) ? item.cases : [];
    const seeds = Array.isArray(item.seeds) ? item.seeds : [];
    const caseCount = cases.length;
    const seedCount = seeds.length;
    const jobCount = planRunKnownJobCount(item);
    if (!caseCount || !seedCount)
        return jobCount ? `任务规模：${jobCount} 个任务（实验项或随机种子数量待校验）` : "任务规模：待校验";
    const expandedCount = caseCount * seedCount;
    const mismatch = jobCount && jobCount !== expandedCount ? `；当前记录 ${jobCount} 个任务，运行前校验为准` : "";
    return `任务规模：${caseCount} 个实验项 × ${seedCount} 个随机种子 = ${expandedCount} 个任务${mismatch}`;
}
function planRunConfiguredCapacitySummary(jobCount, targets) {
    const workers = planRunTargetLocations(targets).filter((target) => target.role === "worker");
    const capacity = workers.reduce((sum, target) => {
        const limit = Math.max(1, Math.trunc(Number(target.maxConcurrentGpus || 1) || 1));
        const allowedCount = Array.isArray(target.allowedGpuIds) ? target.allowedGpuIds.length : 0;
        return sum + (allowedCount ? Math.min(limit, allowedCount) : limit);
    }, 0);
    if (!workers.length)
        return "静态配置容量：未配置 Worker，无法运行任务";
    const countValue = Number(jobCount || 0);
    if (!Number.isFinite(countValue) || countValue <= 0)
        return `静态配置容量：${capacity} 个并发任务（${workers.length} 个 Worker）；任务数待校验，暂不估算排队量`;
    const count = Math.trunc(countValue);
    const firstWave = Math.min(count, capacity);
    const queued = Math.max(0, count - capacity);
    return `静态配置容量：${capacity} 个并发任务（${workers.length} 个 Worker）；${count} 个任务中首轮最多运行 ${firstWave} 个，至少排队 ${queued} 个`;
}
function planRunExpectedRemoteLocations(output, targets, limit = 12) {
    const resultPaths = Array.isArray(output?.values) ? output.values : [];
    const locations = [];
    for (const target of planRunTargetLocations(targets)) {
        if (!target.remotePath)
            continue;
        for (const resultPath of resultPaths) {
            const candidate = String(resultPath || "").trim().replace(/\\/g, "/");
            if (!candidate)
                continue;
            const fullPath = candidate.startsWith("/") ? candidate : `${target.remotePath.replace(/\/+$/, "")}/${candidate.replace(/^\/+/, "")}`;
            locations.push(`${target.label}${target.role === "hub" ? "（同步后汇总）" : "（运行生成）"}：${fullPath}`);
            if (locations.length >= Math.max(1, Math.trunc(Number(limit) || 12)))
                return locations;
        }
    }
    return locations;
}
function planRunConfirmationDetail(command, plan, remoteTargets) {
    const item = plan && typeof plan === "object" ? plan : {};
    const planFile = String(item.planFile || item.file || item.planId || "未选择");
    const baseConfig = String(item.baseConfig || item.base_config || item.configSource || "未声明");
    const jobCount = planRunKnownJobCount(item);
    const targets = planRunTargetLocations(remoteTargets);
    const workers = targets.filter((target) => target.role === "worker");
    const output = planRunOutputLocationSummary(item);
    const expectedLocations = planRunExpectedRemoteLocations(output, targets);
    const debugMode = item.debugMode === true;
    return [
        debugMode ? "Debug 运行" : (command === "reproducePlan" ? "复现实验" : "运行计划"),
        `Plan：${planFile}`,
        `运行类型：${debugMode ? "Debug（仅首个任务，独立目录，不进入正式结果链）" : "正式运行"}`,
        `模式：${guidedPlanModeLabel(item.mode)}`,
        `任务：${jobCount > 0 ? jobCount : "待校验"}`,
        planRunScaleSummary(item),
        planRunConfiguredCapacitySummary(jobCount, targets),
        `配置：${baseConfig}`,
        "实际执行命令：",
        ...planRunCommandSummary(item).map((value) => `- ${value}`),
        debugMode ? "Debug 输出：zlk_cluster/debug_runs/<plan>/<run>/" : `结果位置（${output.source}）：${output.text}`,
        `Worker：${workers.length ? workers.map((target) => target.label).join("、") : "未配置"}`,
        "Worker 调度配置：",
        ...(workers.length ? workers.map((target) => `- ${planRunWorkerCapacitySummary(target)}`) : ["- 未配置"]),
        "远端项目位置：",
        ...(targets.length ? targets.map((target) => `- ${target.label}：${target.remotePath || "未配置"}`) : ["- 未配置"]),
        "预期结果文件位置（模板）：",
        ...(expectedLocations.length ? expectedLocations.map((value) => `- ${value}`) : ["- 未能静态推断，请先补全 Plan 输出契约"]),
        "",
        "结果路径中的 {output_dir} 会按每个任务展开为实际任务输出目录；固定相对路径按 Plan 原样保留，并相对于远端项目执行目录解析。",
        "任务规模来自本地 Plan 的实验项（case）与随机种子（seed）展开；静态配置容量不代表当前空闲 GPU，实时分配和实际排队以预演和任务页为准。",
        "结果先在执行 Worker 的项目目录生成；Hub 行仅表示同步后的预期汇总位置。“检查同步清单”不会传输文件，是否已到达 Hub 须以实际文件同步流程和“三方一致校验”结果为准。",
        debugMode ? "确认后将同步代码、校验并预演，只提交首个任务；调试产物不能归档、解析为有效结果或用于统计、论文和 PPT。" : "确认后将依次同步 Hub/Worker 代码、核验代码指纹、校验 Plan、预演调度，全部通过后才提交正式任务。",
    ].join("\n");
}
function planBatchRunConfirmationDetail(plans, remoteTargets) {
    const rows = (Array.isArray(plans) ? plans : []).filter((plan) => plan && typeof plan === "object");
    const targets = planRunTargetLocations(remoteTargets);
    const workers = targets.filter((target) => target.role === "worker");
    const knownJobs = rows.map((plan) => planRunKnownJobCount(plan)).filter((count) => Number.isFinite(count) && count > 0);
    const unknownJobs = rows.length - knownJobs.length;
    const visible = rows.slice(0, 12).map((plan) => {
        const planFile = String(plan.planFile || plan.file || plan.planId || "缺少 planFile");
        const config = String(plan.baseConfig || plan.base_config || plan.configSource || "未声明");
        const output = planRunOutputLocationSummary(plan, 2);
        const commands = planRunCommandSummary(plan, 120).join("；");
        return `- ${planFile} | ${guidedPlanModeLabel(plan.mode)} | ${planRunScaleSummary(plan).replace(/^任务规模：/, "")} | ${config} | 命令 ${commands} | 结果(${output.source}) ${output.text}`;
    });
    const expectedLocations = [];
    for (const plan of rows.slice(0, 6)) {
        const planFile = String(plan.planFile || plan.file || plan.planId || "缺少 planFile");
        const output = planRunOutputLocationSummary(plan, 2);
        for (const location of planRunExpectedRemoteLocations(output, targets, 4)) {
            expectedLocations.push(`${planFile} | ${location}`);
            if (expectedLocations.length >= 16)
                break;
        }
        if (expectedLocations.length >= 16)
            break;
    }
    return [
        "【批量运行确认】运行全部计划",
        `计划：${rows.length} 个`,
        `任务：${knownJobs.reduce((sum, count) => sum + Math.trunc(count), 0)} 个已识别${unknownJobs ? `，${unknownJobs} 个 Plan 待校验` : ""}`,
        planRunConfiguredCapacitySummary(unknownJobs ? 0 : knownJobs.reduce((sum, count) => sum + Math.trunc(count), 0), targets),
        `Worker：${workers.length ? workers.map((target) => target.label).join("、") : "未配置"}`,
        "Worker 调度配置：",
        ...(workers.length ? workers.map((target) => `- ${planRunWorkerCapacitySummary(target)}`) : ["- 未配置"]),
        "远端项目位置：",
        ...(targets.length ? targets.map((target) => `- ${target.label}：${target.remotePath || "未配置"}`) : ["- 未配置"]),
        "",
        ...visible,
        ...(rows.length > visible.length ? [`- 其余 ${rows.length - visible.length} 个 Plan 也会纳入批量运行`] : []),
        "",
        "预期结果文件位置（模板）：",
        ...(expectedLocations.length ? expectedLocations.map((value) => `- ${value}`) : ["- 未能静态推断，请先补全各 Plan 输出契约"]),
        "",
        "{output_dir} 会按各任务展开为实际任务输出目录；固定相对路径按 Plan 原样保留，并相对于远端项目执行目录解析。",
        "任务规模来自本地 Plan 的实验项（case）与随机种子（seed）展开；静态配置容量不代表当前空闲 GPU，实时分配和实际排队以预演和任务页为准。",
        "各 Plan 结果先写入执行 Worker；Hub 目录仅是同步后的预期汇总位置。“检查同步清单”不会传输文件，是否已到达 Hub 须以实际文件同步流程和“三方一致校验”结果为准。",
        "确认后才会同步 Hub/Worker 代码并核验代码指纹；随后逐个校验和预演。任一 Plan 未通过时整批停止提交，全部通过后才按顺序进入 Hub 调度队列。",
    ].join("\n");
}
function guidedPlanStages(mode) {
    const normalized = (0, PlanBuilder_1.normalizePlanMode)(mode);
    return { train: normalized !== "test", test: normalized !== "train" };
}
function guidedPlanModeEntrySummary(files, label) {
    const list = uniqueStrings(Array.isArray(files) ? files : []);
    if (!list.length)
        return `${label}入口：未识别，选择后需手动填写命令`;
    if (list.length === 1)
        return `${label}入口：${list[0]}`;
    return `${label}入口：已识别 ${list.length} 个，下一步明确选择`;
}
function guidedPlanModeChoices(entries) {
    const trainEntries = uniqueStrings(Array.isArray(entries?.trainEntries) ? entries.trainEntries : []);
    const testEntries = uniqueStrings(Array.isArray(entries?.testEntries) ? entries.testEntries : []);
    const hasTrain = trainEntries.length > 0;
    const hasTest = testEntries.length > 0;
    const recommended = hasTrain && hasTest ? "train_test" : hasTrain ? "train" : hasTest ? "test" : "train_test";
    const trainSummary = guidedPlanModeEntrySummary(trainEntries, "训练");
    const testSummary = guidedPlanModeEntrySummary(testEntries, "评估");
    return [
        { value: "train_test", label: "训练并评估", detail: `${trainSummary}；${testSummary}`, missing: !hasTrain || !hasTest },
        { value: "train", label: "仅训练", detail: `${trainSummary}；仅执行训练，训练命令必须生成最终结果`, missing: !hasTrain },
        { value: "test", label: "仅评估", detail: `${testSummary}；跳过训练，直接评估已有模型`, missing: !hasTest },
    ].sort((a, b) => Number(b.value === recommended) - Number(a.value === recommended)).map((item) => ({
        ...item,
        description: [item.value === recommended ? "推荐" : "", item.missing ? "需手动命令" : ""].filter(Boolean).join(" · "),
    }));
}
async function pickGuidedPlanMode(entries) {
    const choices = guidedPlanModeChoices(entries);
    const picked = await vscode.window.showQuickPick(choices, {
        title: "选择 Plan 运行模式",
        placeHolder: "根据已识别入口选择模式；缺失入口仍可手动填写命令。",
        ignoreFocusOut: true,
    });
    if (!picked)
        throw new UiCommandCancelled("生成 Plan 已取消。");
    return picked.value;
}
async function confirmGuidedPlanCreation(context) {
    const review = context.configReview || { needsReview: true, summary: "未检查训练规模", reason: "请人工确认。" };
    const stages = guidedPlanStages(context.mode);
    const detail = [
        `Plan：${context.relative}`,
        `运行模式：${guidedPlanModeLabel(context.mode)}`,
        "任务规模：1 个实验项 × 1 个随机种子 = 1 个任务",
        `基础配置：${context.baseConfig}`,
        ...(stages.train ? [`训练入口：${context.trainEntry || "手动命令"}`, `训练命令：${guidedPlanSummaryValue(context.trainCommand)}`] : []),
        ...(stages.test ? [`评估入口：${context.testEntry || "手动命令"}`, `评估命令：${guidedPlanSummaryValue(context.testCommand)}`] : []),
        `最终结果：${context.resultPath}`,
        `结果依据：${context.resultReview?.source || "人工确认"}${context.resultReview?.needsReview ? "（包含静态推断）" : ""}`,
        `规模检查：${review.summary}`,
        review.reason,
    ].join("\n");
    const label = "创建 Plan";
    const answer = review.needsReview
        ? await vscode.window.showWarningMessage(detail, { modal: true }, label)
        : await vscode.window.showInformationMessage(detail, { modal: true }, label);
    if (answer !== label)
        throw new UiCommandCancelled("生成 Plan 已取消。");
}
function guidedPlanCommandUsesConfig(command) {
    return /\{(?:config|config_path|base_config|base_config_path)\}/i.test(String(command || ""));
}
function guidedPlanFallbackConfigPath(suite) {
    return path.posix.join("configs", `${safePlanToken(suite || "experiment")}_simple_experiment.yaml`);
}
function guidedPlanConfigRecommendationPriority(file) {
    const normalized = String(file || "").replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
    const relative = normalized.replace(/^configs?\//, "");
    if (/(?:^|[\/_.-])(?:smoke|sanity|debug|quick|tiny|mini|small|toy)(?:[\/_.-]|$)/.test(relative))
        return 0;
    if (/^(?:base|default|config)\.(?:ya?ml|json|py)$/.test(path.posix.basename(relative)))
        return 1;
    if (/(?:^|[\/_.-])(?:base|default)(?:[\/_.-]|$)/.test(relative))
        return 2;
    return 10;
}
function guidedPlanRecommendedConfig(files) {
    const list = Array.isArray(files) ? files.filter((file) => String(file || "").trim()) : [];
    return list.reduce((best, file) => !best || guidedPlanConfigRecommendationPriority(file) < guidedPlanConfigRecommendationPriority(best) ? file : best, "");
}
async function ensureGuidedFallbackConfig(root, relative) {
    const fullPath = safeWorkspaceChildPath(root, relative);
    const stat = await fs.stat(fullPath).catch(() => undefined);
    if (stat?.isFile())
        return relative;
    if (stat)
        throw new Error(`无法生成最小配置，目标不是文件：${relative}`);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, "# Generated by SimpleExperiment for a command without a config argument.\n{}\n", "utf8");
    return relative;
}
async function inputExistingWorkspaceConfig(root) {
    const raw = await vscode.window.showInputBox({
        title: "填写训练或评估使用的配置文件",
        placeHolder: "例如 configs/smoke.yaml",
        prompt: "入口命令声明了 {config}，但项目中未发现配置文件。请先创建配置，再填写项目内相对路径。",
        ignoreFocusOut: true,
        validateInput: async (value) => {
            const relative = String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
            if (!relative)
                return "请填写项目内配置文件路径。";
            if (!/\.(?:ya?ml|json|py)$/i.test(relative))
                return "配置文件必须是 YAML、JSON 或 Python 文件。";
            try {
                const stat = await fs.stat(safeWorkspaceChildPath(root, relative)).catch(() => undefined);
                return stat?.isFile() ? undefined : `配置文件不存在：${relative}`;
            }
            catch {
                return "配置文件必须位于当前工作区内。";
            }
        },
    });
    return raw === undefined ? undefined : String(raw).trim().replace(/\\/g, "/").replace(/^\.\//, "");
}
function guidedPlanCommand(entry, stage, source = "") {
    return guidedPlanCommandInfo(entry, stage, source).command;
}
function guidedPlanCommandInfo(entry, stage, source = "") {
    const file = String(entry || "").trim().replace(/\\/g, "/");
    if (!file)
        return { command: "", detectedArguments: false, usesConfig: false, usesResultOutput: false, ignoredPositionals: [], resultExtension: ".csv" };
    const argumentsFound = staticPythonCliArguments(source);
    const parts = [`python ${JSON.stringify(file)}`];
    const placeholders = new Set();
    const ignoredPositionals = [];
    let resultExtension = ".csv";
    for (const argument of argumentsFound) {
        const placeholder = planPlaceholderForCliArgument(argument.name, stage);
        if (!placeholder) {
            if (argument.positional)
                ignoredPositionals.push(argument.name);
            continue;
        }
        if (placeholders.has(placeholder))
            continue;
        placeholders.add(placeholder);
        if (placeholder === "{result_csv}" && /json/.test(argument.name))
            resultExtension = ".json";
        if (argument.positional)
            parts.push(placeholder);
        else
            parts.push(`${argument.flag} ${placeholder}`);
    }
    return {
        command: parts.join(" "),
        detectedArguments: argumentsFound.length > 0,
        usesConfig: placeholders.has("{config}"),
        usesResultOutput: placeholders.has("{result_csv}") || placeholders.has("{output_dir}"),
        ignoredPositionals: uniqueStrings(ignoredPositionals),
        resultExtension,
    };
}
function staticPythonCliArguments(source) {
    const text = String(source || "").split(/\r?\n/).map(stripPythonComment).join("\n");
    const groups = [];
    const addGroups = (pattern) => {
        let call;
        while ((call = pattern.exec(text))) {
            const aliases = pythonQuotedCliTokens(call[1]);
            if (aliases.length)
                groups.push(aliases);
        }
    };
    const leadingQuotedArguments = "((?:(?:[rRuUbBfF]{0,2})?[\\\"'][^\\\"'\\r\\n]+[\\\"']\\s*,?\\s*)+)";
    addGroups(new RegExp(`(?:add_argument|(?:click\\.)?option)\\s*\\(\\s*${leadingQuotedArguments}`, "g"));
    addGroups(/typer\.Option\s*\(([^)\r\n]*)\)/g);
    const inferredTyper = /\b([A-Za-z_]\w*)\s*:\s*[^=\r\n]+?=\s*typer\.(Option|Argument)\s*\(/g;
    let typerMatch;
    while ((typerMatch = inferredTyper.exec(text))) {
        groups.push(typerMatch[2] === "Argument" ? [typerMatch[1]] : [`--${typerMatch[1].replace(/_/g, "-")}`]);
    }
    const seen = new Set();
    const out = [];
    for (const aliases of groups) {
        const flags = aliases.filter((item) => item.startsWith("-"));
        const positional = flags.length === 0;
        const flag = flags.find((item) => item.startsWith("--")) || flags[0] || "";
        const rawName = positional ? aliases[0] : flag;
        const name = String(rawName || "").replace(/^-+/, "").replace(/-/g, "_").trim();
        const key = `${positional ? "pos" : "opt"}:${name}`;
        if (!name || seen.has(key))
            continue;
        seen.add(key);
        out.push({ name, positional, flag });
    }
    return out;
}
function pythonQuotedCliTokens(text) {
    const out = [];
    const pattern = /(?:[rRuUbBfF]{0,2})?(["'])(.*?)\1/g;
    let match;
    while ((match = pattern.exec(String(text || ""))))
        out.push(match[2]);
    return out;
}
function planPlaceholderForCliArgument(name, stage) {
    const value = String(name || "").toLowerCase().replace(/-/g, "_");
    if (/^(?:config|cfg|config_file|config_path|base_config)$/.test(value))
        return "{config}";
    if (/^(?:seed|random_seed|rng_seed)$/.test(value))
        return "{seed}";
    if (/^(?:output|out|output_dir|out_dir|work_dir|save_dir|result_dir|results_dir|log_dir)$/.test(value))
        return "{output_dir}";
    if ((stage === "test" || stage === "train_result") && /^(?:result_csv|results_csv|metrics_csv|summary_csv|output_csv|result_json|metrics_json|result_file|results_file)$/.test(value))
        return "{result_csv}";
    if (/^(?:case|case_name|experiment|experiment_name)$/.test(value))
        return "{case}";
    if (/^(?:suite|study)$/.test(value))
        return "{suite}";
    if (stage.startsWith("train") && /^(?:worker|worker_id)$/.test(value))
        return "{worker_id}";
    return "";
}
function guidedPlanCommandWarnings(suggestion, stage) {
    const messages = [];
    if (!suggestion?.detectedArguments)
        messages.push("未识别 argparse/Click/Typer 参数");
    if (!suggestion?.usesConfig)
        messages.push("未识别配置参数 {config}");
    if ((stage === "test" || stage === "train_result") && !suggestion?.usesResultOutput)
        messages.push("未识别结果参数 {result_csv}/{output_dir}");
    if (suggestion?.ignoredPositionals?.length)
        messages.push(`未自动填写位置参数：${suggestion.ignoredPositionals.join("、")}`);
    return messages;
}
function guidedPlanCommandPrompt(suggestion, stage) {
    const messages = [stage === "test"
            ? "将写入 runner.test_command。命令必须生成可解析结果文件；校验和预演不会执行评估。"
            : "将写入 runner.train_command。校验和预演不会执行训练。"];
    messages.push(...guidedPlanCommandWarnings(suggestion, stage).map((message) => `${message}，请在确认命令时核对。`));
    return messages.join(" ");
}
function guidedPlanResultPath(command, suite, fallbackExtension = ".csv") {
    return guidedPlanResultPathReview(command, suite, fallbackExtension).path;
}
function guidedPlanResultPathReview(command, suite, fallbackExtension = ".csv") {
    const text = String(command || "").replace(/\\[ \t]*\r?\n[ \t]*/g, " ").replace(/\r?\n/g, " ");
    const safeSuite = String(suite || "experiment").trim() || "experiment";
    const fallbackMatch = String(fallbackExtension || "").match(/\.(csv|json|txt|log|out)$/i);
    let extension = fallbackMatch ? `.${fallbackMatch[1].toLowerCase()}` : ".csv";
    let outputDir = "";
    let resultAliasUsed = false;
    const explicitPaths = [];
    const resultFlagExtensions = new Map([
        ["result-csv", ".csv"], ["results-csv", ".csv"], ["metrics-csv", ".csv"], ["summary-csv", ".csv"], ["output-csv", ".csv"],
        ["result-json", ".json"], ["metrics-json", ".json"], ["summary-txt", ".txt"], ["log-file", ".log"], ["stdout", ".log"], ["stderr", ".log"],
    ]);
    const outputDirFlags = new Set([
        "output", "out", "output-dir", "out-dir", "result-dir", "results-dir", "work-dir", "workdir", "save-dir", "log-dir",
        "logging-dir", "loggingdir", "tensorboard-log-dir", "tensorboardlogdir", "tb-log-dir", "tblogdir", "run-dir", "rundir",
        "default-root-dir", "defaultrootdir", "dirpath", "hydra.run.dir", "hydra.sweep.dir", "logger.save-dir", "trainer.default-root-dir",
    ]);
    const normalizeValue = (value) => String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
    const resultAlias = /^\{(?:result_csv|resultCsv|results_csv|resultsCsv|metrics_csv|metricsCsv|summary_csv|summaryCsv|output_csv|outputCsv|result_json|resultJson|metrics_json|metricsJson|summary_txt|summaryTxt|log_file|logFile)\}$/;
    const optionPattern = /(?:^|[\s;&|])--([A-Za-z][A-Za-z0-9_.-]*)(?:=(?:"([^"]+)"|'([^']+)'|([^\s;&|<>]+))|[ \t]+(?:"([^"]+)"|'([^']+)'|([^\s;&|<>]+)))?/g;
    for (const match of text.matchAll(optionPattern)) {
        const flag = String(match[1] || "").replace(/_/g, "-").toLowerCase();
        const value = normalizeValue(match[2] || match[3] || match[4] || match[5] || match[6] || match[7] || "");
        if (resultFlagExtensions.has(flag)) {
            extension = resultFlagExtensions.get(flag);
            const valueExtension = value.match(/\.(csv|json|txt|log|out)$/i);
            if (valueExtension)
                extension = `.${valueExtension[1].toLowerCase()}`;
            if (value && !resultAlias.test(value) && valueExtension)
                explicitPaths.push({ path: value, source: "命令中的固定结果参数" });
            if (resultAlias.test(value))
                resultAliasUsed = true;
            continue;
        }
        if (outputDirFlags.has(flag) && value && !outputDir)
            outputDir = value;
    }
    const assignmentPattern = /(?:^|[\s;&|])([A-Za-z][A-Za-z0-9_.-]*)=(?:"([^"]+)"|'([^']+)'|([^\s;&|<>]+))/g;
    for (const match of text.matchAll(assignmentPattern)) {
        const key = String(match[1] || "").replace(/_/g, "-").toLowerCase();
        const value = normalizeValue(match[2] || match[3] || match[4] || "");
        if (resultFlagExtensions.has(key)) {
            extension = resultFlagExtensions.get(key);
            const valueExtension = value.match(/\.(csv|json|txt|log|out)$/i);
            if (valueExtension) {
                extension = `.${valueExtension[1].toLowerCase()}`;
                if (!resultAlias.test(value))
                    explicitPaths.push({ path: value, source: "命令中的固定结果参数" });
            }
            if (resultAlias.test(value))
                resultAliasUsed = true;
            continue;
        }
        if (outputDirFlags.has(key) && value && !outputDir)
            outputDir = value;
    }
    const redirectPattern = /(?:^|[\s;&|])(?:1?>|2>)[ \t]*(?:"([^"]+)"|'([^']+)'|([^\s;&|<>]+))/g;
    for (const match of text.matchAll(redirectPattern)) {
        const value = normalizeValue(match[1] || match[2] || match[3] || "");
        const valueExtension = value.match(/\.(csv|json|txt|log|out)$/i);
        if (valueExtension) {
            extension = `.${valueExtension[1].toLowerCase()}`;
            explicitPaths.push({ path: value, source: "命令输出重定向" });
        }
    }
    if (explicitPaths.length)
        return { path: explicitPaths[0].path, source: explicitPaths[0].source, needsReview: false };
    const defaultFile = {
        ".csv": "metrics_summary.csv",
        ".json": "metrics.json",
        ".txt": "summary.txt",
        ".log": "stdout.log",
        ".out": "output.out",
    }[extension] || "metrics_summary.csv";
    if (resultAliasUsed)
        return { path: `{output_dir}/${defaultFile}`, source: "命令中的结果占位参数", needsReview: false };
    if (outputDir && !/\.(csv|json|txt|log|out)$/i.test(outputDir))
        return { path: `${outputDir}/${defaultFile}`.replace(/\/{2,}/g, "/"), source: "命令中的输出目录，文件名按标准结果名推断", needsReview: true };
    return { path: `experiments/results/${safeSuite}${extension}`, source: "未识别结果或输出参数，使用项目级默认路径", needsReview: true };
}
async function detectFactoryPatterns(root) {
    const candidates = [
        "experiments/common.py",
        "experiments/collect_results.py",
        "experiments/run_plan.py",
        "experiments/zlk_adapter/factory_hooks.py",
        "experiments/zlk_adapter/result_writer.py",
        "models/builder.py",
        "models/registry.py",
        "models/__init__.py",
        "comparison_methods/registry.py",
        "comparison_methods/builder.py",
        "data/builder.py",
        "data/registry.py",
        "data/utils.py",
        "datasets/builder.py",
        "datasets/registry.py",
        "metrics/builder.py",
        "metrics/registry.py",
        "losses/builder.py",
        "trainers/builder.py",
        "trainer.py",
        "lit_module.py",
        "lightning_module.py",
        "engine/trainer.py",
        "engine/evaluator.py",
        "utils/metrics.py",
        "utils/registry.py",
        "registry.py",
        "mmcv_custom/registry.py",
        "mmseg/datasets/builder.py",
        "mmdet/datasets/builder.py",
    ];
    const files = await existingRelativeFiles(root, candidates);
    const hintFiles = await existingRelativeFiles(root, [
        "work_dirs/results.csv",
        "experiments/results/jobs.csv",
        "artifact_manifest.json",
        "metrics_summary.csv",
        "summary.txt",
    ]);
    const symbols = new Set();
    for (const file of files) {
        const text = await readUtf8Preview(path.join(root, file));
        for (const [name, pattern] of Object.entries({
            RESULT_COLUMNS: /\bRESULT_COLUMNS\b/,
            append_results: /\bappend_results\b/,
            build_model: /\bbuild_model\b/,
            build_dataset: /\bbuild_dataset\b/,
            build_dataloader: /\bbuild_(data)?loader\b|\bbuild_dataloader\b/,
            build_metrics: /\bbuild_metrics\b/,
            build_loss: /\bbuild_loss\b/,
            Trainer: /\bTrainer\b/,
            LightningModule: /\bLightningModule\b/,
            classification_report: /\bclassification_report\b/,
            register: /@register_|\bregister\(/,
            Registry: /\bRegistry\b|\bMODELS\b|\bDATASETS\b|\bMETRICS\b/,
            DefaultDeepLearningAdapter: /\bDefaultDeepLearningAdapter\b|\bregister_adapter\b/,
        })) {
            if (pattern.test(text))
                symbols.add(name);
        }
    }
    const hints = new Set();
    if (files.includes("experiments/common.py"))
        hints.add("experiments/common.py");
    if (files.includes("experiments/collect_results.py"))
        hints.add("experiments/collect_results.py");
    if (files.includes("experiments/run_plan.py"))
        hints.add("experiments/run_plan.py");
    if (files.includes("comparison_methods/registry.py"))
        hints.add("comparison_methods/registry.py");
    if (files.includes("experiments/zlk_adapter/factory_hooks.py"))
        hints.add("experiments/zlk_adapter/factory_hooks.py");
    if (symbols.has("RESULT_COLUMNS"))
        hints.add("RESULT_COLUMNS");
    if (symbols.has("append_results"))
        hints.add("append_results()");
    if (symbols.has("build_model"))
        hints.add("build_model()");
    if (symbols.has("build_dataset"))
        hints.add("build_dataset()");
    if (symbols.has("Registry"))
        hints.add("Registry");
    if (symbols.has("DefaultDeepLearningAdapter"))
        hints.add("DefaultDeepLearningAdapter");
    if (symbols.has("Trainer"))
        hints.add("Trainer");
    if (symbols.has("LightningModule"))
        hints.add("LightningModule");
    if (symbols.has("classification_report"))
        hints.add("classification_report");
    if (hintFiles.includes("work_dirs/results.csv"))
        hints.add("work_dirs/results.csv");
    if (hintFiles.includes("experiments/results/jobs.csv"))
        hints.add("experiments/results/jobs.csv");
    if (hintFiles.includes("artifact_manifest.json"))
        hints.add("artifact_manifest.json");
    if (hintFiles.includes("summary.txt"))
        hints.add("summary.txt");
    return {
        files,
        symbols: [...symbols].sort(),
        multimodalStyle: hints.size >= 2 || (files.includes("experiments/common.py") && (symbols.has("RESULT_COLUMNS") || symbols.has("append_results"))),
        multimodalHints: [...hints].sort(),
    };
}
async function detectResultOutputs(root, adapterRules) {
    const exact = await existingRelativeFiles(root, [
        "metrics_summary.csv",
        "metrics_case.csv",
        "results.csv",
        "summary.txt",
        "metrics.json",
        "result.json",
        "work_dirs/results.csv",
        "experiments/results.csv",
        "metrics.json",
        "result.json",
        "results.json",
        ...adapterRuleExactFiles(adapterRules),
    ]).then((files) => files.filter(isParseableResultCandidate));
    const adapterExpanded = await expandAdapterResultCandidates(root, adapterRules, 160);
    const discovered = [
        ...await walkProjectFiles(path.join(root, "experiments", "results"), root, resultCandidateFile, 120),
        ...await walkProjectFiles(path.join(root, "work_dirs"), root, resultCandidateFile, 80, 3),
        ...await walkProjectFiles(path.join(root, "outputs"), root, resultCandidateFile, 80, 3),
        ...await walkProjectFiles(path.join(root, "runs"), root, resultCandidateFile, 80, 3),
        ...await walkProjectFiles(path.join(root, "logs"), root, resultCandidateFile, 80, 3),
        ...await walkProjectFiles(path.join(root, "results"), root, resultCandidateFile, 80, 3),
        ...await walkProjectFiles(path.join(root, "test_results"), root, resultCandidateFile, 80, 3),
    ];
    const files = uniqueStrings([...exact, ...adapterExpanded, ...discovered].filter(isParseableResultCandidate)).sort();
    return {
        files,
        contractFiles: files.filter((file) => /(^|\/)(metrics_summary\.csv|metrics_case\.csv)$/i.test(file)),
        previews: await previewLocalResultFiles(root, files, adapterRules),
    };
}
function adapterRuleCandidatePatterns(adapterRules) {
    if (!adapterRules)
        return [];
    return uniqueStrings([
        ...(adapterRules.candidateCsv || []),
        ...(adapterRules.candidateJson || []),
        ...(adapterRules.consoleLogs || []),
        ...(adapterRules.textLogs || []),
        ...(adapterRules.inferredPlanCandidateCsv || []),
        ...(adapterRules.inferredPlanCandidateJson || []),
        ...(adapterRules.inferredPlanConsoleLogs || []),
        ...(adapterRules.inferredPlanTextLogs || []),
    ].map((file) => String(file || "").trim().replace(/\\/g, "/").replace(/\{+[A-Za-z0-9_.-]+\}+/g, "*").replace(/^\.\//, "")).filter(isParseableResultCandidate));
}
function adapterRuleExactFiles(adapterRules) {
    return adapterRuleCandidatePatterns(adapterRules).filter((file) => !/[*?[\]]/.test(file));
}
async function expandAdapterResultCandidates(root, adapterRules, limit = 120) {
    const patterns = adapterRuleCandidatePatterns(adapterRules);
    const out = [];
    for (const pattern of patterns) {
        if (out.length >= limit)
            break;
        const matches = await expandRelativeGlob(root, pattern, Math.max(1, limit - out.length));
        for (const item of matches) {
            if (!isParseableResultCandidate(item))
                continue;
            out.push(item);
            if (out.length >= limit)
                break;
        }
    }
    return uniqueStrings(out);
}
async function expandRelativeGlob(root, pattern, limit = 80) {
    const normalized = String(pattern || "").trim().replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");
    if (!normalized || normalized.includes(".."))
        return [];
    if (!/[*?[\]]/.test(normalized)) {
        return (await existsAt(path.join(root, ...normalized.split("/")))) ? [normalized] : [];
    }
    const out = [];
    const parts = normalized.split("/").filter(Boolean);
    await walkGlobParts(root, "", parts, 0, out, limit);
    return uniqueStrings(out);
}
async function walkGlobParts(root, prefix, parts, index, out, limit) {
    if (out.length >= limit || index >= parts.length)
        return;
    const part = parts[index];
    const isLast = index === parts.length - 1;
    if (!/[*?]/.test(part)) {
        const next = prefix ? `${prefix}/${part}` : part;
        const full = path.join(root, ...next.split("/"));
        const stat = await fs.stat(full).catch(() => undefined);
        if (!stat)
            return;
        if (isLast) {
            if (stat.isFile())
                out.push(next);
            return;
        }
        if (stat.isDirectory())
            await walkGlobParts(root, next, parts, index + 1, out, limit);
        return;
    }
    const parentFull = prefix ? path.join(root, ...prefix.split("/")) : root;
    const entries = await fs.readdir(parentFull, { withFileTypes: true }).catch(() => []);
    const matcher = globPartToRegExp(part);
    for (const entry of entries) {
        if (out.length >= limit)
            break;
        if (!matcher.test(entry.name))
            continue;
        const next = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (isLast) {
            if (entry.isFile())
                out.push(next);
            continue;
        }
        if (entry.isDirectory())
            await walkGlobParts(root, next, parts, index + 1, out, limit);
    }
}
function globPartToRegExp(part) {
    let body = "";
    for (let i = 0; i < part.length; i += 1) {
        const ch = part[i];
        if (ch === "*")
            body += ".*";
        else if (ch === "?")
            body += ".";
        else
            body += escapeRegExp(ch);
    }
    return new RegExp(`^${body}$`, "i");
}
async function previewLocalResultFiles(root, files, adapterRules) {
    const targets = resultPreviewTargets(files);
    const maxPreviewBytes = 1_000_000;
    const previews = [];
    for (const file of targets) {
        const fullPath = path.join(root, file);
        try {
            const stat = await fs.stat(fullPath);
            if (stat.size > maxPreviewBytes) {
                previews.push({ file, parseable: false, error: `文件超过 ${Math.round(maxPreviewBytes / 1024 / 1024)}MB，已跳过本地预览。` });
                continue;
            }
            if (/\.(txt|log|out)$/i.test(file)) {
                const text = await readUtf8Preview(fullPath, maxPreviewBytes);
                const preview = (0, Results_1.previewTextMetricParse)(text, file, { metricRegex: adapterRules?.metricRegex, metricAliases: adapterRules?.metricAliases });
                previews.push({
                    file,
                    presetId: preview.ruleId,
                    format: "text_regex",
                    rows: preview.lines,
                    records: preview.records,
                    columns: ["metric", "value", "line", "snippet"],
                    warnings: preview.warnings,
                    sampleMetrics: preview.metrics,
                    sourceType: "text_metric",
                    ruleId: preview.ruleId,
                    parsedAt: preview.parsedAt,
                    snippets: preview.samples.map((item) => ({ metric: item.metric, value: item.value, line: item.line, snippet: item.snippet })),
                    parseable: preview.records > 0,
                    error: preview.records > 0 ? undefined : "未从文本中捕获指标。",
                });
                continue;
            }
            const text = await readUtf8Preview(fullPath, maxPreviewBytes);
            const preset = { ...(0, Results_1.selectResultPreset)(file), metricAliases: adapterRules?.metricAliases };
            const parserConfig = Object.keys(adapterRules?.csvColumnMapping || {}).length ? { columnMapping: adapterRules?.csvColumnMapping } : {};
            const preview = (0, Results_1.previewResultParse)(text, file, preset, parserConfig);
            previews.push({
                file,
                presetId: preview.presetId,
                format: preview.format,
                rows: preview.rows,
                records: preview.records,
                columns: preview.columns.slice(0, 12),
                missingRequiredColumns: preview.missingRequiredColumns,
                warnings: preview.warnings.slice(0, 6),
                sampleMetrics: Object.keys(preview.sampleMetrics || {}).slice(0, 8),
                sourceType: "structured",
                parsedAt: new Date().toISOString(),
                parseable: preview.records > 0,
                error: preview.records > 0 ? undefined : "未解析出标准记录。",
            });
        }
        catch (error) {
            previews.push({ file, parseable: false, error: errorMessage(error) });
        }
    }
    return previews;
}
function resultPreviewTargets(files) {
    return files
        .filter((file) => /\.(csv|json|txt|log|out)$/i.test(file))
        .filter((file) => !isSchedulerResultIndexFile(file))
        .sort((a, b) => resultPreviewPriority(a) - resultPreviewPriority(b) || a.localeCompare(b))
        .slice(0, 6);
}
function resultPreviewPriority(file) {
    const name = path.posix.basename(file.replace(/\\/g, "/")).toLowerCase();
    if (name === "metrics_summary.csv")
        return 0;
    if (name === "metrics_case.csv")
        return 1;
    if (name === "results.csv" || name === "result.csv")
        return 2;
    if (name === "scores.csv" || name === "score.csv")
        return 3;
    if (name.startsWith("classification_report"))
        return 4;
    if (/^(test_metrics|detailed_metrics|metrics)\.csv$/i.test(name))
        return 5;
    if (/\.(json)$/i.test(name))
        return 10;
    if (/\.(txt|log|out)$/i.test(name))
        return 20;
    return 50;
}
function isSchedulerResultIndexFile(file) {
    return /(^|\/)experiments\/results\/jobs\.csv$/i.test(file.replace(/\\/g, "/"));
}
async function existingRelativeFiles(root, relatives) {
    const out = [];
    for (const relative of relatives) {
        if (await existsAt(path.join(root, relative)))
            out.push(relative.replace(/\\/g, "/"));
    }
    return out;
}
async function detectEnvironmentFiles(root) {
    const exact = await existingRelativeFiles(root, [
        "environment.yml",
        "environment.yaml",
        "conda-lock.yml",
        "conda-lock.yaml",
        "requirements.txt",
        "requirements-dev.txt",
        "requirements_test.txt",
        "pyproject.toml",
        "setup.py",
        "setup.cfg",
        "Pipfile",
        "Pipfile.lock",
        "poetry.lock",
        "uv.lock",
    ]);
    const rootManifests = await walkProjectFiles(root, root, environmentRootManifestFileName, 40, 0, 0, root, { maxDirs: 1, visited: { count: 0 } });
    const nested = await walkProjectFiles(path.join(root, "requirements"), root, environmentManifestFileName, 40, 3, 0, path.join(root, "requirements"), { maxDirs: 60, visited: { count: 0 } });
    return uniqueStrings([...exact, ...rootManifests, ...nested]).sort((a, b) => environmentManifestPriority(a) - environmentManifestPriority(b) || a.localeCompare(b));
}
function environmentRootManifestFileName(name) {
    return /^(?:environment.*\.ya?ml|conda-lock\.ya?ml|requirements.*\.(?:txt|in)|pyproject\.toml|setup\.(?:py|cfg)|Pipfile(?:\.lock)?|poetry\.lock|uv\.lock)$/i.test(String(name || ""));
}
function environmentManifestFileName(name) {
    return /\.(?:txt|in|ya?ml|toml|lock|cfg)$/i.test(String(name || ""));
}
function environmentManifestPriority(file) {
    const name = path.posix.basename(String(file || "").replace(/\\/g, "/")).toLowerCase();
    if (/^environment\.ya?ml$/.test(name))
        return 0;
    if (name === "pyproject.toml")
        return 1;
    if (name === "requirements.txt")
        return 2;
    if (/^requirements.*\.(?:txt|in)$/.test(name))
        return 3;
    if (/^(?:uv|poetry|pipfile|conda-lock).*\.lock$/.test(name) || /^conda-lock\.ya?ml$/.test(name))
        return 4;
    return 10;
}
const projectFileWalkMaxDirs = 300;
async function walkProjectFiles(dir, root, accept, limit = 100, maxDepth = 4, depth = 0, scanRoot = dir, budget) {
    if (depth > maxDepth)
        return [];
    const activeBudget = budget || { maxDirs: projectFileWalkMaxDirs, visited: { count: 0 } };
    const visited = activeBudget.visited || (activeBudget.visited = { count: 0 });
    if (visited.count >= (activeBudget.maxDirs || projectFileWalkMaxDirs))
        return [];
    visited.count += 1;
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    const out = [];
    for (const entry of entries) {
        if (out.length >= limit)
            break;
        const full = path.join(dir, entry.name);
        const relative = path.relative(root, full).replace(/\\/g, "/");
        if (entry.isDirectory()) {
            const scanRelative = path.relative(scanRoot, full).replace(/\\/g, "/");
            if (isHeavyProjectDir(scanRelative))
                continue;
            out.push(...await walkProjectFiles(full, root, accept, limit - out.length, maxDepth, depth + 1, scanRoot, activeBudget));
        }
        else if (entry.isFile() && accept(entry.name)) {
            out.push(relative);
        }
    }
    return out;
}
function resultCandidateFile(name) {
    return /^(metrics_summary|metrics_case|results?|summary|test_metrics|detailed_metrics|metrics|scores|score|classification_report)\.csv$/i.test(name)
        || /^(metrics|result|results|summary|classification_report)\.json$/i.test(name)
        || /^(summary|result|results|metrics|classification_report)\.txt$/i.test(name)
        || /^(stdout|stderr|console|train|test|eval|evaluate|output)\.(log|out)$/i.test(name);
}
function isHeavyProjectDir(relative) {
    const heavy = new Set([".git", ".hg", ".svn", ".venv", "venv", "env", "__pycache__", ".mypy_cache", ".pytest_cache", "node_modules", "datasets", "dataset", "data", "checkpoints", "checkpoint", "weights", "pretrained", "outputs", "output", "runs", "work_dirs", "lightning_logs", "wandb", "dist", "build"]);
    return relative.split(/[\\/]+/).map((part) => part.toLowerCase()).some((part) => heavy.has(part));
}
async function summarizeConfigFile(root, file) {
    const text = await readUtf8Preview(path.join(root, file));
    const params = /\.json$/i.test(file)
        ? extractJsonParams(text)
        : /\.py$/i.test(file)
            ? extractPythonConfigParams(text)
            : extractYamlParams(text);
    const compacted = compactConfigParams(params);
    return {
        file,
        folder: path.dirname(file).replace(/\\/g, "/"),
        params: compacted.params,
        omittedParamCount: compacted.omitted || undefined,
    };
}
const localTextReadBudgetBytes = 256 * 1024;
const localConfigParamLimit = 80;
const localConfigParamValueLimit = 180;
async function readUtf8Preview(file, maxBytes = localTextReadBudgetBytes) {
    const handle = await fs.open(file, "r").catch(() => undefined);
    if (!handle)
        return "";
    try {
        const buffer = Buffer.alloc(Math.max(1, maxBytes));
        const result = await handle.read(buffer, 0, buffer.length, 0);
        return buffer.subarray(0, result.bytesRead).toString("utf8");
    }
    finally {
        await handle.close().catch(() => undefined);
    }
}
function extractYamlParams(text) {
    const stack = [];
    const params = [];
    for (const raw of text.split(/\r?\n/)) {
        if (!raw.trim() || raw.trimStart().startsWith("#"))
            continue;
        const match = raw.match(/^(\s*)([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);
        if (!match)
            continue;
        const indent = match[1].length;
        const key = match[2].trim();
        let value = stripYamlComment(match[3]).trim();
        while (stack.length && stack[stack.length - 1].indent >= indent)
            stack.pop();
        const fullKey = [...stack.map((item) => item.key), key].join(".");
        if (!value) {
            stack.push({ indent, key });
            continue;
        }
        value = value.replace(/^["']|["']$/g, "");
        params.push({ key: fullKey, value, important: isImportantParam(fullKey, value), kind: paramKind(fullKey, value) });
    }
    return params.sort((a, b) => Number(b.important) - Number(a.important) || a.key.localeCompare(b.key));
}
function extractJsonParams(text) {
    let value;
    try {
        value = JSON.parse(String(text || ""));
    }
    catch {
        return [];
    }
    const params = [];
    const maxParams = localConfigParamLimit * 4;
    const visit = (item, keys, depth) => {
        if (params.length >= maxParams || depth > 10)
            return;
        if (Array.isArray(item)) {
            if (item.every((entry) => entry === null || ["string", "number", "boolean"].includes(typeof entry))) {
                const key = keys.join(".");
                const textValue = JSON.stringify(item);
                params.push({ key, value: textValue, important: isImportantParam(key, textValue), kind: paramKind(key, textValue) });
                return;
            }
            item.slice(0, 40).forEach((entry, index) => visit(entry, [...keys, String(index)], depth + 1));
            return;
        }
        if (item && typeof item === "object") {
            for (const [key, child] of Object.entries(item)) {
                visit(child, [...keys, key], depth + 1);
                if (params.length >= maxParams)
                    break;
            }
            return;
        }
        if (!keys.length)
            return;
        const key = keys.join(".");
        const textValue = item === null ? "null" : String(item);
        params.push({ key, value: textValue, important: isImportantParam(key, textValue), kind: paramKind(key, textValue) });
    };
    visit(value, [], 0);
    return params.sort((a, b) => Number(b.important) - Number(a.important) || a.key.localeCompare(b.key));
}
function extractPythonConfigParams(text) {
    const params = pythonTopLevelAssignments(text).map((assignment) => {
        const scalar = pythonScalarLiteral(assignment.value);
        const value = scalar === undefined ? assignment.value.replace(/\s+/g, " ").trim() : scalar;
        return { key: assignment.key, value, important: isImportantParam(assignment.key, value), kind: paramKind(assignment.key, value) };
    });
    const existing = new Set(params.map((item) => item.key));
    for (const item of extractYamlParams(pythonConfigEvidenceText(text))) {
        if (!existing.has(item.key)) {
            params.push(item);
            existing.add(item.key);
        }
    }
    return params.sort((a, b) => Number(b.important) - Number(a.important) || a.key.localeCompare(b.key));
}
function pythonTopLevelAssignments(text) {
    const out = [];
    let current;
    for (const raw of String(text || "").split(/\r?\n/)) {
        const line = stripPythonComment(raw);
        if (!current) {
            const match = line.match(/^([A-Za-z_]\w*)(?:\s*:\s*[^=]+)?\s*=\s*(.*)$/);
            if (!match)
                continue;
            current = { key: match[1], chunks: [match[2]], balance: pythonBracketDelta(match[2]) };
        }
        else {
            current.chunks.push(line.trim());
            current.balance += pythonBracketDelta(line);
        }
        if (current.balance <= 0 && !/\\\s*$/.test(line)) {
            out.push({ key: current.key, value: current.chunks.join(" ").trim() });
            current = undefined;
        }
    }
    if (current)
        out.push({ key: current.key, value: current.chunks.join(" ").trim() });
    return out;
}
function stripPythonComment(value) {
    let quote = "";
    let escaped = false;
    for (let index = 0; index < value.length; index += 1) {
        const ch = value[index];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === "\\" && quote) {
            escaped = true;
            continue;
        }
        if ((ch === "\"" || ch === "'") && (!quote || quote === ch)) {
            quote = quote === ch ? "" : ch;
            continue;
        }
        if (ch === "#" && !quote)
            return value.slice(0, index);
    }
    return value;
}
function pythonBracketDelta(value) {
    let quote = "";
    let escaped = false;
    let delta = 0;
    for (const ch of value) {
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === "\\" && quote) {
            escaped = true;
            continue;
        }
        if ((ch === "\"" || ch === "'") && (!quote || quote === ch)) {
            quote = quote === ch ? "" : ch;
            continue;
        }
        if (quote)
            continue;
        if ("([{".includes(ch))
            delta += 1;
        else if (")]}".includes(ch))
            delta -= 1;
    }
    return delta;
}
function pythonScalarLiteral(value) {
    const text = String(value || "").trim();
    const quoted = text.match(/^(?:[rRuUfF]{0,2})(["'])([\s\S]*)\1$/);
    if (quoted)
        return quoted[2].replace(/\\([\\"'])/g, "$1");
    if (/^(?:true|false|none)$/i.test(text))
        return text.toLowerCase() === "none" ? "null" : text.toLowerCase();
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text))
        return text;
    return undefined;
}
function pythonStringList(value) {
    const text = String(value || "").trim();
    if (!/^[\[(]/.test(text))
        return [];
    const out = [];
    const pattern = /(?:[rRuUfF]{0,2})(["'])([^\r\n]*?)\1/g;
    let match;
    while ((match = pattern.exec(text)))
        out.push(match[2].replace(/\\([\\"'])/g, "$1"));
    return out;
}
function compactConfigParams(params) {
    const compacted = params.slice(0, localConfigParamLimit).map((param) => ({
        ...param,
        value: truncateConfigParamValue(param.value),
    }));
    return { params: compacted, omitted: Math.max(0, params.length - compacted.length) };
}
function truncateConfigParamValue(value) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > localConfigParamValueLimit ? `${text.slice(0, localConfigParamValueLimit - 3)}...` : text;
}
function stripYamlComment(value) {
    let quote = "";
    for (let i = 0; i < value.length; i += 1) {
        const ch = value[i];
        if ((ch === "\"" || ch === "'") && value[i - 1] !== "\\")
            quote = quote === ch ? "" : quote || ch;
        if (ch === "#" && !quote)
            return value.slice(0, i);
    }
    return value;
}
function isImportantParam(key, value) {
    const text = `${key} ${value}`.toLowerCase();
    return text.includes("dataset") || text.includes("data.") || text.includes("data_dir") || text.includes("path")
        || text.includes("output_dir") || text.includes("work_dir") || text.includes("seed") || text.includes("runtime.");
}
function paramKind(key, value) {
    const text = `${key} ${value}`.toLowerCase();
    if (text.includes("dataset"))
        return "dataset";
    if (text.includes("output_dir") || text.includes("work_dir") || text.includes("runtime."))
        return "output";
    if (text.includes("seed"))
        return "seed";
    if (text.includes("path") || text.includes("dir"))
        return "path";
    return "param";
}
const defaultYamlScanBudget = { maxFiles: 500, maxDirs: 800, maxDepth: 8 };
async function walkYaml(dir, options = {}) {
    const budget = {
        maxFiles: Math.max(1, options.maxFiles ?? defaultYamlScanBudget.maxFiles),
        maxDirs: Math.max(1, options.maxDirs ?? defaultYamlScanBudget.maxDirs),
        maxDepth: Math.max(1, options.maxDepth ?? defaultYamlScanBudget.maxDepth),
        root: path.resolve(options.root || dir),
        skipHeavyDirs: options.skipHeavyDirs !== false,
        includeJson: options.includeJson === true,
        includePython: options.includePython === true,
    };
    const out = [];
    const stack = [{ dir: path.resolve(dir), depth: 0 }];
    let visitedDirs = 0;
    while (stack.length && out.length < budget.maxFiles && visitedDirs < budget.maxDirs) {
        const current = stack.pop();
        if (!current)
            break;
        visitedDirs += 1;
        const entries = await fs.readdir(current.dir, { withFileTypes: true }).catch(() => []);
        for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
            const full = path.join(current.dir, entry.name);
            const relative = path.relative(budget.root, full).replace(/\\/g, "/");
            if (entry.isDirectory()) {
                if (current.depth + 1 > budget.maxDepth)
                    continue;
                if (budget.skipHeavyDirs && isHeavyProjectDir(relative))
                    continue;
                stack.push({ dir: full, depth: current.depth + 1 });
                continue;
            }
            if (entry.isFile() && (/\.ya?ml$/i.test(entry.name) || (budget.includeJson && /\.json$/i.test(entry.name)) || (budget.includePython && /\.py$/i.test(entry.name)))) {
                out.push(full);
                if (out.length >= budget.maxFiles)
                    break;
            }
        }
    }
    return out;
}
function parseLocalPlanText(file, text) {
    const summary = (0, PlanBuilder_1.parsePlanSummary)(text);
    const contract = (0, PlanBuilder_1.validateDeepLearningPlanContract)(text);
    const suite = summary.suite || "";
    const mode = summary.mode || "";
    const baseConfig = summary.baseConfig || "";
    const configSource = summary.configSource || baseConfig;
    const seeds = summary.seeds;
    const cases = summary.cases;
    const trainCommand = summary.trainCommand || "";
    const testCommand = summary.testCommand || "";
    const outputCandidates = summary.outputCandidates;
    const outputSignals = summary.outputSignals;
    const restoreVersion = String(text || "").match(/^# ZLK restore version:\s*(v\d+)\s*$/m)?.[1] || "";
    const restoreSource = String(text || "").match(/^# ZLK archived source:\s*(.+?)\s*$/m)?.[1] || "";
    const restoreOutputNamespace = String(text || "").match(/^# ZLK restored output namespace:\s*(.+?)\s*$/m)?.[1] || "";
    const restoreEnvironmentDir = String(text || "").match(/^# ZLK restored environment:\s*(.+?)\s*$/m)?.[1] || "";
    const restoreParameterDir = String(text || "").match(/^# ZLK restored parameters:\s*(.+?)\s*$/m)?.[1] || "";
    const parseError = contract.ok
        ? undefined
        : contract.missing.includes("suite") || contract.missing.includes("base_config/config")
            ? "缺少 suite 或 base_config/config"
            : `计划强契约缺少：${contract.missing.join("、")}`;
    return {
        planId: file,
        planFile: file,
        file,
        revision: sha256Text(String(text || "")),
        name: path.basename(file),
        suite,
        status: parseError ? "invalid" : "ready",
        mode,
        baseConfig,
        configSource,
        inlineConfig: summary.inlineConfig === true,
        caseConfig: summary.caseConfig === true,
        seeds,
        cases,
        trainCommand,
        testCommand,
        outputCandidates,
        outputSignals,
        restoreVersion,
        restoreSource,
        restoreOutputNamespace,
        restoreEnvironmentDir,
        restoreParameterDir,
        planContractOk: contract.ok,
        planContractMissing: contract.missing,
        planContractIssues: contract.issues,
        jobCount: Math.max(1, seeds.length || 1) * Math.max(1, cases.length),
        parseError,
        text,
    };
}
function ensurePlanPurposeHeader(text, name) {
    if (text.startsWith("# Generated by SimpleExperiment") || text.startsWith("# Generated by ZLK Cluster Orchestrator") || text.startsWith("# 本文件作用："))
        return text;
    return `# Generated by SimpleExperiment. Plan: ${name}\n${text}`;
}
async function writeWorkspaceTextWithBackup(fullPath, text) {
    const root = workspaceRoot();
    if (!root)
        throw new Error("需要先打开工作区。");
    const relative = path.relative(root, path.resolve(fullPath)).replace(/\\/g, "/");
    if (relative.startsWith("..") || path.isAbsolute(relative))
        throw new Error(`只能写入工作区内文件：${fullPath}`);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    const previous = await fs.readFile(fullPath, "utf8").catch(() => undefined);
    if (previous === text)
        return { fullPath, relative, status: "unchanged" };
    let backupPath;
    if (previous !== undefined) {
        backupPath = await nextWorkspaceBackupPath(fullPath);
        await fs.writeFile(backupPath, previous, "utf8");
    }
    await fs.writeFile(fullPath, text, "utf8");
    return { fullPath, relative, status: previous === undefined ? "created" : "updated", backupPath };
}
async function nextWorkspaceBackupPath(fullPath) {
    const first = `${fullPath}.bak`;
    if (!await existsAt(first))
        return first;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    let candidate = `${fullPath}.${stamp}.bak`;
    let index = 2;
    while (await existsAt(candidate)) {
        candidate = `${fullPath}.${stamp}.${index}.bak`;
        index += 1;
    }
    return candidate;
}
function workspaceWriteStatusText(status) {
    if (status === "created")
        return "新增";
    if (status === "updated")
        return "更新";
    return "不变";
}
function summarizeWorkspaceWriteResults(results) {
    const created = results.filter((item) => item.status === "created").length;
    const updated = results.filter((item) => item.status === "updated").length;
    return [
        created ? `新增 ${created}` : "",
        updated ? `更新 ${updated}` : "",
    ].filter(Boolean).join("，");
}
async function previewAndConfirmWorkspaceWrites(root, writes, title) {
    const entries = await Promise.all(writes.map(async (write) => {
        const relative = path.relative(root, path.resolve(write.fullPath)).replace(/\\/g, "/");
        if (relative.startsWith("..") || path.isAbsolute(relative))
            throw new Error(`只能写入工作区内文件：${write.fullPath}`);
        const previous = await fs.readFile(write.fullPath, "utf8").catch(() => undefined);
        const status = previous === undefined ? "created" : previous === write.text ? "unchanged" : "updated";
        return {
            ...write,
            relative,
            status,
            previousLines: previous === undefined ? 0 : previous.split(/\r?\n/).length,
            nextLines: write.text.split(/\r?\n/).length,
            preview: write.text.split(/\r?\n/).slice(0, 16).join("\n"),
        };
    }));
    const changed = entries.filter((entry) => entry.status !== "unchanged");
    if (!changed.length)
        return entries;
    const markdown = [
        `# ${title}：写入前预览`,
        "",
        "插件只会新增或更新下面这些轻量接入文件，不会修改训练、测试、模型或数据集代码。",
        "",
        "| 状态 | 文件 | 当前行数 | 写入后行数 |",
        "| --- | --- | ---: | ---: |",
        ...entries.map((entry) => `| ${workspaceWriteStatusText(entry.status)} | \`${entry.relative}\` | ${entry.previousLines} | ${entry.nextLines} |`),
        "",
        "## 内容片段",
        ...changed.map((entry) => [
            "",
            `### ${workspaceWriteStatusText(entry.status)} ${entry.relative}`,
            "```text",
            entry.preview.replace(/```/g, "` ` `"),
            "```",
        ].join("\n")),
        "",
    ].join("\n");
    const doc = await vscode.workspace.openTextDocument({ content: markdown, language: "markdown" });
    await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
    const answer = await vscode.window.showWarningMessage(`${title} 将写入 ${changed.length} 个文件。请先查看刚打开的预览，再确认是否继续。`, { modal: false }, "写入模板");
    if (answer !== "写入模板")
        throw new UiCommandCancelled(`${title} 已取消，未写入文件。`);
    return entries;
}
async function openWorkspaceFile(file) {
    const root = workspaceRoot();
    if (!root)
        throw new Error("需要先打开工作区。");
    const fullPath = safeWorkspaceChildPath(root, file);
    const stat = await fs.stat(fullPath).catch(() => undefined);
    if (!stat || (!stat.isFile() && !stat.isDirectory()))
        throw new Error(`文件不存在：${file}`);
    if (stat.isDirectory()) {
        await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(fullPath));
        return;
    }
    const doc = await vscode.workspace.openTextDocument(workspaceEditorUriForFile(file));
    await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.Active });
}
function safeWorkspacePlanPath(root, file, planDir) {
    const fullPath = safeWorkspaceChildPath(root, file);
    const planRoot = path.resolve(root, planDir);
    const relative = path.relative(planRoot, fullPath);
    if (relative.startsWith("..") || path.isAbsolute(relative) || !/\.ya?ml$/i.test(fullPath)) {
        throw new Error("只能写入实验计划目录下的 YAML plan。");
    }
    return fullPath;
}
function safeWorkspaceChildPath(root, file) {
    const fullPath = path.resolve(root, String(file || ""));
    const relative = path.relative(root, fullPath);
    if (!file || relative.startsWith("..") || path.isAbsolute(relative))
        throw new Error(`只能访问工作区内文件：${file}`);
    return fullPath;
}
async function existsAt(file) {
    try {
        await fs.access(file);
        return true;
    }
    catch {
        return false;
    }
}
async function nextAvailableFile(dir, stem, ext) {
    for (let index = 0; index < 1000; index += 1) {
        const suffix = index ? `_${index + 1}` : "";
        const file = path.join(dir, `${stem}${suffix}${ext}`);
        if (!(await existsAt(file)))
            return file;
    }
    throw new Error("无法生成唯一文件名。");
}
async function nextAvailableVersionedPlanFile(dir, stem, ext) {
    for (let version = 1; version < 1000; version += 1) {
        const file = path.join(dir, `${stem}__v${version}${ext}`);
        if (!(await existsAt(file)))
            return file;
    }
    throw new Error("无法生成唯一恢复 Plan 版本。");
}
function safeArchiveBundleChildPath(bundleDir, file) {
    const fullPath = path.resolve(bundleDir, String(file || ""));
    const relative = path.relative(bundleDir, fullPath);
    if (!file || relative.startsWith("..") || path.isAbsolute(relative))
        throw new Error(`归档包文件路径无效：${file}`);
    return fullPath;
}
function archiveManifestFileList(value) {
    return Array.isArray(value) ? value.map((item) => String(item || "").replace(/\\/g, "/")).filter(Boolean) : [];
}
async function nextAvailableDirectory(parent, stem) {
    for (let index = 0; index < 1000; index += 1) {
        const suffix = index ? `_${index + 1}` : "";
        const dir = path.join(parent, `${stem}${suffix}`);
        if (!(await existsAt(dir)))
            return dir;
    }
    throw new Error("无法生成唯一 Plan 归档目录。");
}
function safePlanToken(value) {
    return String(value || "experiment").replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "experiment";
}
function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function actionErrorSuggestion(message) {
    if (/capability|endpoint|404|not found/i.test(message))
        return "需要升级 Hub Agent 或运行真实对接检测。";
    if (/ECONNREFUSED|fetch failed|tunnel|AbortError|closed/i.test(message))
        return "请确认 Xshell 隧道已启动并通过检测。";
    if (/401|403|token/i.test(message))
        return "请检查 Hub Agent token。";
    if (/path|safe|允许|traversal/i.test(message))
        return "请选择允许根目录内的路径。";
    return "查看诊断 JSON 和操作进度。";
}
function compactUiActionError(error) {
    return {
        command: compactSensitiveText(error.command, 160),
        ...(error.action ? { action: error.action } : {}),
        message: compactSensitiveText(error.message, UI_ACTION_ERROR_MESSAGE_LIMIT),
        ...(error.suggestion ? { suggestion: compactSensitiveText(error.suggestion, UI_ACTION_ERROR_SUGGESTION_LIMIT) } : {}),
        ...(error.capabilityMissing?.length ? { capabilityMissing: error.capabilityMissing.slice(0, UI_ACTION_ERROR_CAPABILITY_LIMIT).map((item) => compactSensitiveText(item, 96)) } : {}),
        timestamp: new Date().toISOString(),
    };
}
function recentUiActionErrorMatches(previous, current, windowMs = 2000) {
    if (!previous || !current)
        return false;
    const previousAction = String(previous.action || "");
    const currentAction = String(current.action || "");
    if (String(previous.command || "") !== String(current.command || "")
        || (previousAction && currentAction && previousAction !== currentAction)
        || String(previous.message || "") !== String(current.message || ""))
        return false;
    const previousAt = Date.parse(String(previous.timestamp || ""));
    const currentAt = Date.parse(String(current.timestamp || ""));
    return Number.isFinite(previousAt) && Number.isFinite(currentAt) && currentAt >= previousAt && currentAt - previousAt <= windowMs;
}
function compactSensitiveText(value, limit) {
    const redacted = redactSensitiveText(String(value ?? ""));
    if (redacted.length <= limit)
        return redacted;
    const tail = redacted.slice(-limit);
    return `[已截断错误文本 ${redacted.length - limit} 字符]\n${tail}`;
}
function redactSensitiveText(value) {
    return value
        .replace(/(agentToken|token|password|passwd|secret|privateKey|private_key|Authorization)\s*[:=]\s*["']?[^"'\s,;]+/gi, "$1=<已脱敏>")
        .replace(/(Bearer)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 <已脱敏>")
        .replace(/(-----BEGIN [^-]+ PRIVATE KEY-----)[\s\S]*?(-----END [^-]+ PRIVATE KEY-----)/gi, "$1<已脱敏>$2");
}
function userFacingFileError(error) {
    const message = errorMessage(error);
    if (/允许|safe|path|traversal/i.test(message))
        return `safe path reject: ${message}`;
    return message;
}
const REMOTE_RESULT_INSPECTION_MAX_BYTES = 5 * 1024 * 1024;
function normalizeRemoteResultInspectionPath(value) {
    const normalized = String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
    if (!(0, FileTransferTypes_1.isSafeRemotePath)(normalized))
        return "";
    return /\.(csv|json|txt|log|out)$/i.test(normalized) ? normalized : "";
}
function remoteResultInspectionLocalRelativePath(remotePath, planFile, timestamp = new Date().toISOString()) {
    const normalized = normalizeRemoteResultInspectionPath(remotePath);
    if (!normalized)
        throw new Error("不支持的远端结果文件。");
    const extension = path.posix.extname(normalized).toLowerCase();
    const name = path.posix.basename(normalized, extension).replace(/[^\w.-]+/g, "_").slice(0, 64) || "result";
    const remoteKey = crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 10);
    const stamp = String(timestamp || "").replace(/[^0-9]/g, "").slice(0, 14) || String(Date.now());
    return path.posix.join("zlk_cluster", "downloads", "result_inspection", safePlanToken(planFile), `${name}__${remoteKey}__${stamp}${extension}`);
}
function remoteResultInspectionCandidates(operationGroups, planFile, planRevision = "", planUpdatedAt = "") {
    const selectedPlan = normalizePlanSelectionKey(planFile);
    if (!selectedPlan)
        return [];
    const checks = [];
    for (const operations of Array.isArray(operationGroups) ? operationGroups : []) {
        const rows = Array.isArray(operations) ? operations : (operations && typeof operations === "object" ? Object.values(operations) : []);
        for (const row of rows) {
            if (!row || typeof row !== "object")
                continue;
            const payloads = remoteResultOperationPayloads(row);
            const rowPlan = payloads.map((item) => operationResultPlanFile(item)).find(Boolean);
            if (!rowPlan || !samePlanSelection(rowPlan, selectedPlan))
                continue;
            const operationRevision = payloads.map((item) => stringFromRecord(item, ["planRevision", "plan_revision"])).find(Boolean) || "";
            if (operationRevision && planRevision) {
                if (operationRevision !== planRevision)
                    continue;
            }
            else if (!operationRevision || !planRevision) {
                const updatedAt = planVersionTimestamp(planUpdatedAt);
                const operationAt = Math.max(0, ...payloads.map((item) => planVersionTimestamp(item.updatedAt || item.updated_at || item.finishedAt || item.finished_at || item.checkedAt || item.checked_at || item.generatedAt || item.generated_at || item.startedAt || item.started_at)).filter(Number.isFinite));
                if ((planRevision || Number.isFinite(updatedAt)) && (!Number.isFinite(updatedAt) || operationAt < updatedAt))
                    continue;
            }
            const operationType = payloads.map((item) => String(item.type || item.action || "")).join(" ").toLowerCase();
            const hasContractReport = payloads.some((item) => item.contractReport && typeof item.contractReport === "object");
            if (!operationType.includes("check-output-contract") && !hasContractReport)
                continue;
            const files = [];
            for (const item of payloads) {
                const values = [item.unparseableFiles, item.unparseable_files];
                for (const value of values) {
                    for (const file of Array.isArray(value) ? value : []) {
                        const normalized = normalizeRemoteResultInspectionPath(file);
                        if (normalized)
                            files.push(normalized);
                    }
                }
                for (const entry of Array.isArray(item.unparseable) ? item.unparseable : []) {
                    const normalized = normalizeRemoteResultInspectionPath(entry && typeof entry === "object" ? entry.path : entry);
                    if (normalized)
                        files.push(normalized);
                }
            }
            const times = payloads.map((item) => Date.parse(String(item.updatedAt || item.updated_at || item.finishedAt || item.finished_at || item.checkedAt || item.checked_at || item.generatedAt || item.generated_at || item.startedAt || item.started_at || ""))).filter(Number.isFinite);
            const seqs = payloads.map((item) => Number(item.seq || 0)).filter(Number.isFinite);
            checks.push({ files: uniqueStrings(files), time: times.length ? Math.max(...times) : 0, seq: seqs.length ? Math.max(...seqs) : 0 });
        }
    }
    checks.sort((left, right) => right.time - left.time || right.seq - left.seq || right.files.length - left.files.length);
    return checks[0]?.files || [];
}
function resultSummaryInspectionCandidates(summary, planFile) {
    const selectedPlan = normalizePlanSelectionKey(planFile);
    if (!selectedPlan || !summary || typeof summary !== "object" || Array.isArray(summary))
        return [];
    const item = summary;
    const summaryPlan = normalizePlanSelectionKey(item.planFile || item.plan_file || "");
    if (summaryPlan && !samePlanSelection(summaryPlan, selectedPlan))
        return [];
    const claimEvidence = item.claimEvidence && typeof item.claimEvidence === "object" ? item.claimEvidence : item.claim_evidence && typeof item.claim_evidence === "object" ? item.claim_evidence : {};
    return uniqueStrings([
        item.previewCsvPath,
        item.preview_csv_path,
        item.effectiveResultsCsvPath,
        item.effective_results_csv_path,
        item.qualityGatePath,
        item.quality_gate_path,
        item.statisticsPath,
        item.statistics_path,
        item.paperTablePath,
        item.paper_table_path,
        item.paperTableCsvPath,
        item.paper_table_csv_path,
        item.claimEvidencePath,
        item.claim_evidence_path,
        claimEvidence.path,
    ].map(normalizeRemoteResultInspectionPath).filter(Boolean));
}
function remoteResultOperationPayloads(row) {
    const item = row && typeof row === "object" ? row : {};
    const payload = item.payload && typeof item.payload === "object" ? item.payload : {};
    const latestEvent = item.latestEvent && typeof item.latestEvent === "object" ? item.latestEvent : {};
    const latestPayload = latestEvent.payload && typeof latestEvent.payload === "object" ? latestEvent.payload : {};
    const base = [item, payload, latestEvent, latestPayload];
    const reports = base.map((entry) => entry.contractReport).filter((entry) => entry && typeof entry === "object");
    return [...base, ...reports];
}
function findDebugBundlePath(operations) {
    if (!operations || typeof operations !== "object")
        return undefined;
    const rows = Array.isArray(operations) ? operations : Object.values(operations);
    for (const row of rows.reverse()) {
        if (!row || typeof row !== "object")
            continue;
        const item = row;
        const type = String(item.type || item.action || "");
        const pathValue = stringFromRecord(item, ["bundlePath", "bundle_path", "path", "remotePath"]);
        if (pathValue && /debug|bundle|create-debug-bundle/.test(`${type} ${pathValue}`))
            return pathValue;
    }
    return undefined;
}
function renderHtml() {
    const nonce = String(Date.now());
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SimpleExperiment</title>
  <style>
    body { margin: 0; padding: 16px; font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-sideBar-background); }
    h2 { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
    h3 { margin: 18px 0 8px; font-size: 13px; font-weight: 600; }
    .row { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 8px; padding: 4px 0; }
    .label { color: var(--vscode-descriptionForeground); cursor: help; text-decoration: underline dotted; text-underline-offset: 3px; }
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
  <h2 title="Xshell 负责保持本地隧道；插件只访问你电脑上的 127.0.0.1 本地端口。">Xshell 本地隧道</h2>
  <div id="summary"></div>
  <div class="toolbar">
    <button data-command="configureSessions" title="选择 Xshell .xsh 会话文件，并从会话内读取本地端口转发。">选择 Xshell 会话</button>
    <button data-command="configure" title="填写 Xshell 路径、服务器 IP/域名、用户名和端口。每一步都会保存。">配置</button>
    <button data-command="start" title="用 Xshell 打开本地端口转发。插件不会自己 SSH。">启动 Xshell</button>
    <button data-command="startAll" title="启动 Hub 和所有已启用 Worker 的 Xshell 本地隧道。">启动全部隧道</button>
    <button data-command="test" title="检查 127.0.0.1 本地端口、Hub Agent 健康状态和文件 API。">检测隧道</button>
    <button data-command="restart" title="重新连接实时事件通道，不会重启 Xshell。">重启实时流</button>
    <button data-command="pauseStream" class="secondary" title="暂停实时事件刷新，但不关闭 Xshell。">暂停实时流</button>
    <button data-command="resumeStream" class="secondary" title="恢复实时事件刷新。">恢复实时流</button>
    <button data-command="pauseAll" class="secondary" title="暂停插件所有本地隧道请求。">暂停全部网络</button>
    <button data-command="resumeNetwork" class="secondary" title="恢复插件访问 127.0.0.1 本地隧道端口。">恢复网络</button>
    <button data-command="snapshot" class="secondary" title="手动读取一次当前状态。">手动快照</button>
    <button data-command="script" class="secondary" title="生成可手动运行的 Xshell 隧道脚本。">生成脚本</button>
    <button data-command="realCheck" class="secondary" title="逐层检查 Xshell、端口、Hub Agent、实时通道和文件 API。">真实对接检测</button>
    <button data-command="status" class="secondary" title="打开完整状态 JSON，便于排查问题。">状态详情</button>
    <button data-command="offline" class="secondary" title="不使用网络，导入离线结果包。">导入离线包</button>
  </div>
  <h3 title="显示 Hub Agent 当前支持哪些功能。不可用时通常需要升级或重启 Hub Agent。">能力状态</h3>
  <div id="capabilities"></div>
  <h3 title="轻量状态摘要。完整脱敏 JSON 请点击“状态详情”，避免实时刷新时反复序列化大对象。">状态摘要</h3>
  <pre id="details">等待状态...</pre>
  <h3 title="解释插件如何联网，以及哪些连接方式已被禁用。">连接策略</h3>
  <pre>插件当前通过 Xshell 本地端口转发连接 Hub Agent。
插件不会直接 SSH 到 Hub 或 Worker。
实时状态、日志、文件传输均只访问 127.0.0.1:&lt;port&gt;。
如果隧道不可用，请修复 Xshell 本地隧道，或改用 offline_import。</pre>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const summary = document.getElementById("summary");
    const capabilities = document.getElementById("capabilities");
    const details = document.getElementById("details");
    const termTips = {
      "连接模式": "当前插件使用的连接方式。正常应为 Xshell 本地隧道或离线导入。",
      "服务器 IP/域名": "你平时登录服务器时用的地址，例如 10.10.10.8 或 login.example.edu。",
      "登录用户名": "你登录服务器时使用的用户名。插件不会保存 SSH 密码。",
      "SSH 端口号": "Xshell 会话登录服务器使用的端口，常见值是 22。它不是本地隧道端口。",
      "Xshell 登录别名": "仅用于显示和目标标识。插件仍只打开 .xsh 会话或访问 127.0.0.1 本地隧道。",
      "本地端点": "插件实际访问的本机地址，只应是 127.0.0.1:本地隧道端口。",
      "服务器 Agent 端口": "服务器上 Hub Agent 监听的端口，要和 python cluster_agent.py serve --port 一致。",
      "隧道健康": "检测 Xshell 本地隧道和 Hub Agent 是否可用。",
      "实时流": "Hub Agent 推送状态变化的通道，优先 WebSocket，其次 SSE，再退到快照。",
      "心跳": "Hub Agent 最近一次证明自己仍在线的时间。",
      "重连次数": "实时流断开后自动恢复连接的次数。",
      "API 版本": "Hub Agent 接口版本。过旧会导致部分按钮禁用。",
      "网络状态": "只有手动暂停所有网络活动时才显示。",
      "最后错误": "最近一次隧道、Agent 或文件 API 错误。",
      "健康检查": "Hub Agent /api/health 是否可用。",
      "实时通道": "WebSocket/SSE/快照三种刷新方式。WebSocket 最实时。",
      "文件列表": "能否浏览服务器允许目录内的文件。",
      "下载": "能否通过 HTTP 从服务器下载文件。",
      "Range 下载": "分段下载，用于大文件和断点续传预留。",
      "上传": "能否通过 HTTP 分片上传文件到服务器。",
      "sha256": "文件校验值，用来确认上传下载没有损坏。",
      "对接检测": "真实检查 Xshell、端口、Agent、实时通道和文件 API 的结果。"
    };
    document.querySelectorAll("button[data-command]").forEach((button) => {
      button.addEventListener("click", () => vscode.postMessage({ command: button.dataset.command }));
    });
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.type !== "state") return;
      const state = event.data.state;
      const health = state.health || {};
      const realtime = state.realtime || {};
      const caps = state.capabilities || {};
      const endpoints = caps.endpoints || {};
      const fileCaps = state.fileCapabilities || {};
      const report = state.integrationReport || {};
      const setup = state.setup || {};
      const paused = state.diagnostics && state.diagnostics.requests && state.diagnostics.requests.paused;
      const summaryRows = [
        row("连接模式", labelStatus(state.connectionMode)),
        row("服务器 IP/域名", setup.hubHost || "-"),
        row("登录用户名", setup.hubUser || "-"),
        row("SSH 端口号", String(setup.hubSshPort || "-")),
        row("Xshell 登录别名", setup.sshConfigAlias || "未使用"),
        row("本地端点", state.localEndpoint),
        row("服务器 Agent 端口", String(setup.remoteAgentPort || "-")),
        row("隧道健康", labelStatus(health.state || "unknown"), health.state === "agent_ok" || health.state === "stream_connected" ? "ok" : "warn"),
        row("实时流", labelStatus(realtime.streamStatus || "disconnected")),
        row("心跳", realtime.lastHeartbeatAt || "-"),
        row("重连次数", String(realtime.reconnectCount || 0)),
        row("API 版本", caps.apiVersion || "-"),
        row("最后错误", state.lastError || "-"),
      ];
      if (paused) summaryRows.splice(summaryRows.length - 1, 0, row("网络状态", "已暂停", "warn"));
      summary.innerHTML = summaryRows.join("");
      capabilities.innerHTML = [
        row("健康检查", endpoints.health ? "可用" : "未知", endpoints.health ? "ok" : "warn"),
        row("实时通道", endpoints.websocketEvents ? "WebSocket" : (endpoints.sseEvents ? "SSE" : "快照"), endpoints.sseEvents || endpoints.websocketEvents ? "ok" : "warn"),
        row("文件列表", fileCaps.supportsList ? "可用" : "不可用", fileCaps.supportsList ? "ok" : "warn"),
        row("下载", fileCaps.supportsDownload ? "可用" : "不可用", fileCaps.supportsDownload ? "ok" : "warn"),
        row("Range 下载", fileCaps.supportsRangeDownload ? "可用" : "禁用", fileCaps.supportsRangeDownload ? "ok" : "warn"),
        row("上传", fileCaps.supportsUploadChunk ? "可用" : "不可用", fileCaps.supportsUploadChunk ? "ok" : "warn"),
        row("sha256", fileCaps.supportsSha256 ? "可用" : "禁用", fileCaps.supportsSha256 ? "ok" : "warn"),
        row("对接检测", labelStatus(report.overall || "-")),
      ].join("");
      details.textContent = diagnosticSummary(state);
    });
    function diagnosticSummary(state) {
      const diagnostics = state.diagnostics || {};
      const requests = diagnostics.requests || {};
      const actionErrors = Array.isArray(state.actionErrors) ? state.actionErrors : (Array.isArray(diagnostics.errors) ? diagnostics.errors : []);
      return [
        "网络状态：" + (requests.paused ? "已暂停" : "运行中"),
        "最后错误：" + (state.lastError || diagnostics.lastError || "-"),
        "操作错误：" + String(actionErrors.length || 0),
        "调试包：" + (diagnostics.debugBundlePath || "-"),
        "完整 JSON：点击“状态详情”。"
      ].join("\\n");
    }
    function row(label, value, klass) {
      const tip = termTips[label] || "暂无解释。";
      return '<div class="row"><div class="label" title="' + esc(tip) + '">' + esc(label) + '</div><div class="value ' + (klass || "") + '" title="' + esc(String(value || "-")) + '">' + esc(value || "-") + '</div></div>';
    }
    function labelStatus(value) {
      const map = {
        xshell_tunnel_realtime: "Xshell 本地隧道",
        offline_import: "离线导入",
        unknown: "未知",
        not_configured: "未配置",
        xshell_not_found: "未找到 Xshell",
        local_port_closed: "本地端口未打开",
        agent_unreachable: "Agent 不可达",
        agent_ok: "Agent 正常",
        stream_connected: "实时流已连接",
        stream_stale: "实时流已过期",
        file_api_unavailable: "文件 API 不可用",
        stale: "数据过期",
        paused: "已暂停",
        rate_limited: "已限频",
        disconnected: "未连接",
        connecting: "连接中",
        websocket: "WebSocket",
        sse: "SSE",
        polling: "快照轮询",
        ok: "正常",
        warning: "警告",
        failed: "失败"
      };
      return map[value] || value;
    }
    function esc(value) {
      return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    }
  </script>
</body>
</html>`;
}
async function promptWorkerTunnel(current, index, base) {
    let seed = current;
    const suggestedPort = seed?.localForwardPort || await nextAvailableLocalPort(TunnelPortConflict_1.defaultTunnelPorts.workerLocalPortRange.start + index, new Set([base.localForwardPort, ...base.workerTunnels.map((worker) => worker.localForwardPort)]));
    const displayName = await input("Worker 显示名称", seed?.displayName || seed?.id || `worker-${index + 1}`, "例如 nwpu5");
    if (displayName === undefined)
        return undefined;
    const host = await input("Worker 地址", seed?.workerHost || seed?.hubHost || "", "IP 或域名，例如 10.0.0.5");
    if (host === undefined)
        return undefined;
    const user = await input("登录用户名", seed?.workerUser || seed?.hubUser || base.hubUser, "例如 zlk");
    if (user === undefined)
        return undefined;
    const sshPort = await inputPort("登录端口", seed?.workerSshPort || seed?.hubSshPort || 22, { min: 1, description: "登录端口" });
    if (sshPort === undefined)
        return undefined;
    const localForwardPort = await inputPort("本地隧道端口", suggestedPort, { min: 1024, description: "本地隧道端口" });
    if (localForwardPort === undefined)
        return undefined;
    const remoteTelemetryPort = await inputPort("Worker Telemetry 远端端口", seed?.remoteTelemetryPort || seed?.remoteAgentPort || base.remoteAgentPort, { min: 1024, description: "Worker Telemetry 远端端口" });
    if (remoteTelemetryPort === undefined)
        return undefined;
    const authMethod = await pickAuthMethod(seed?.authMethod || "password");
    if (!authMethod)
        return undefined;
    const privateKeyPath = authMethod === "key" ? await pickPrivateKeyPath(seed?.privateKeyPath) : undefined;
    if (authMethod === "key" && !privateKeyPath)
        return undefined;
    return {
        id: seed?.id || sanitizeWorkerId(displayName || host || `worker-${index + 1}`),
        displayName: displayName || host,
        hubHost: host,
        hubUser: user,
        hubSshPort: sshPort,
        workerHost: host,
        workerUser: user,
        workerSshPort: sshPort,
        localForwardHost: "127.0.0.1",
        localForwardPort,
        remoteAgentHost: "127.0.0.1",
        remoteAgentPort: remoteTelemetryPort,
        remoteTelemetryPort,
        sshConfigAlias: seed?.sshConfigAlias,
        privateKeyPath,
        agentSessionPath: seed?.agentSessionPath,
        authMethod,
        enabled: seed?.enabled !== false,
    };
}
async function promptSavedSessionWorker(current, index, remoteTelemetryPortFallback, hubLocalPort, sessions = [], defaultDir) {
    const pickedSession = await pickXshellSessionForward("选择 Worker 的 Xshell 隧道端口对", sessions, current?.savedSessionPath, defaultDir);
    const sessionInfo = pickedSession?.session;
    const sessionPath = sessionInfo?.filePath || current?.savedSessionPath || "";
    if (!sessionPath)
        return undefined;
    const forward = pickedSession?.forward;
    const defaultName = path.basename(sessionPath, path.extname(sessionPath)) || current?.displayName || current?.id || `worker-${index + 1}`;
    const displayName = await input("Worker 名称", current?.displayName || defaultName, "例如 nwpu5");
    if (displayName === undefined)
        return undefined;
    const localForwardPort = forward?.localPort || await inputPort("Worker 本地端口", current?.localForwardPort || Math.max(hubLocalPort + index + 1, TunnelPortConflict_1.defaultTunnelPorts.workerLocalPortRange.start + index), {
        min: 1024,
        description: "Worker 本地端口",
        prompt: "未从 Xshell 会话解析到隧道端口，请手动填写。",
    });
    if (localForwardPort === undefined)
        return undefined;
    const remoteTelemetryPort = forward?.remotePort || await inputPort("Worker Telemetry 远端端口", current?.remoteTelemetryPort || current?.remoteAgentPort || remoteTelemetryPortFallback, {
        min: 1024,
        description: "Worker Telemetry 远端端口",
        prompt: "未从 Xshell 会话解析到远端端口，请手动填写。通常是 18765。",
    });
    if (remoteTelemetryPort === undefined)
        return undefined;
    const id = current?.id || sanitizeWorkerId(displayName || defaultName || `worker-${index + 1}`);
    const workerHost = sessionInfo?.host || current?.workerHost || current?.hubHost || "";
    const workerUser = sessionInfo?.userName || current?.workerUser || current?.hubUser || "";
    const workerSshPort = sessionInfo?.port || current?.workerSshPort || current?.hubSshPort || 22;
    const agentProjectDir = await inputActualWorkRoot("Worker 项目父目录", current?.agentProjectDir || "", displayName || id);
    if (agentProjectDir === undefined)
        return undefined;
    return {
        id,
        displayName: displayName || id,
        hubHost: workerHost,
        hubUser: workerUser,
        hubSshPort: workerSshPort,
        workerHost,
        workerUser,
        workerSshPort,
        resolvedHost: sessionInfo?.host || current?.resolvedHost,
        transferHost: current?.transferHost,
        sftpHost: current?.sftpHost,
        sshHost: current?.sshHost,
        localForwardHost: "127.0.0.1",
        localForwardPort,
        remoteAgentHost: "127.0.0.1",
        remoteAgentPort: remoteTelemetryPort,
        remoteTelemetryPort,
        sshConfigAlias: current?.sshConfigAlias || sessionInfo?.name,
        savedSessionRunner: "xshell",
        savedSessionPath: sessionPath,
        savedSessionForwardIndex: forward?.index,
        agentSessionPath: current?.agentSessionPath,
        agentProjectDir,
        authMethod: "password",
        enabled: current?.enabled !== false,
    };
}
async function pickXshellSession(title, sessions, current, defaultDir) {
    const currentInfo = current ? await (0, XshellSessionScanner_1.readXshellSessionFile)(current, path.dirname(current)).catch(() => undefined) : undefined;
    const items = [];
    if (currentInfo) {
        items.push({
            label: `继续使用：${currentInfo.name}`,
            description: forwardSummary(currentInfo) || currentInfo.filePath,
            detail: currentInfo.filePath,
            info: currentInfo,
        });
    }
    const currentKey = currentInfo ? localPathKey(currentInfo.filePath) : "";
    for (const info of sessions) {
        if (currentKey && localPathKey(info.filePath) === currentKey)
            continue;
        items.push({
            label: info.name,
            description: `${forwardSummary(info) || "未解析到端口转发"}${info.host ? ` · ${info.userName || "-"}@${info.host}` : ""}`,
            detail: info.relativePath || info.filePath,
            info,
        });
    }
    items.push({
        label: "手动选择 .xsh 文件",
        description: defaultDir ? `默认目录：${defaultDir}` : "未扫描到时使用",
        manual: true,
    });
    const picked = await vscode.window.showQuickPick(items, { title, ignoreFocusOut: true, matchOnDescription: true, matchOnDetail: true });
    if (!picked)
        return undefined;
    if (!picked.manual)
        return picked.info;
    const selected = await pickOptionalXshellSession(title, current, defaultDir);
    return selected ? (0, XshellSessionScanner_1.readXshellSessionFile)(selected, path.dirname(selected)).catch(() => ({
        name: path.basename(selected, path.extname(selected)),
        filePath: selected,
        forwards: [],
    })) : undefined;
}
async function pickXshellSessionForward(title, sessions, current, defaultDir) {
    const currentInfo = current ? await (0, XshellSessionScanner_1.readXshellSessionFile)(current, path.dirname(current)).catch(() => undefined) : undefined;
    const items = [];
    const pushSession = (info, prefix = "") => {
        if (info.forwards.length) {
            for (const forward of info.forwards) {
                items.push({
                    label: `${prefix}${info.name}`,
                    description: forwardPairLabel(forward),
                    detail: `${forward.remoteHost}:${forward.remotePort} · ${info.userName || "-"}@${info.host || "-"} · ${info.relativePath || info.filePath}`,
                    session: info,
                    forward,
                });
            }
        }
        else {
            items.push({
                label: `${prefix}${info.name}`,
                description: "未解析到端口转发，选择后手动填写端口",
                detail: `${info.userName || "-"}@${info.host || "-"} · ${info.relativePath || info.filePath}`,
                session: info,
            });
        }
    };
    if (currentInfo)
        pushSession(currentInfo, "继续使用：");
    const currentKey = currentInfo ? localPathKey(currentInfo.filePath) : "";
    for (const info of sessions) {
        if (currentKey && localPathKey(info.filePath) === currentKey)
            continue;
        pushSession(info);
    }
    items.push({
        label: "手动选择 .xsh 文件",
        description: defaultDir ? `默认目录：${defaultDir}` : "未扫描到时使用",
        manual: true,
    });
    const picked = await vscode.window.showQuickPick(items, {
        title,
        placeHolder: "每一行都是一个完整端口对：本地端口 -> 远端端口。",
        ignoreFocusOut: true,
        matchOnDescription: true,
        matchOnDetail: true,
    });
    if (!picked)
        return undefined;
    if (!picked.manual && picked.session)
        return { session: picked.session, forward: picked.forward };
    const selected = await pickOptionalXshellSession(title, current, defaultDir);
    if (!selected)
        return undefined;
    const session = await (0, XshellSessionScanner_1.readXshellSessionFile)(selected, path.dirname(selected)).catch(() => ({
        name: path.basename(selected, path.extname(selected)),
        filePath: selected,
        forwards: [],
    }));
    return { session, forward: await pickXshellForward("选择端口对", session) };
}
async function pickXshellForward(title, session) {
    const forwards = session?.forwards || [];
    if (forwards.length <= 1)
        return forwards[0];
    const picked = await vscode.window.showQuickPick(forwards.map((forward) => ({
        label: `${forward.localHost}:${forward.localPort} -> ${forward.remoteHost}:${forward.remotePort}`,
        description: `FwdReq_${forward.index}`,
        detail: session?.filePath,
        forward,
    })), {
        title,
        placeHolder: "该 Xshell 会话包含多个隧道，请选择插件要使用的 127.0.0.1 本地转发。",
        ignoreFocusOut: true,
    });
    return picked?.forward;
}
function forwardPairLabel(forward) {
    return `本地 ${forward.localHost}:${forward.localPort} -> 远端 ${forward.remoteHost}:${forward.remotePort} (FwdReq_${forward.index})`;
}
async function pickAgentSessionPath(options) {
    const items = [];
    if (options.tunnelSessionPath) {
        items.push({
            label: "复用当前隧道会话（推荐）",
            description: "同一个 Xshell 会话登录后自动启动受管 Agent tmux，再保持隧道",
            detail: options.tunnelSessionPath,
            value: options.tunnelSessionPath,
        });
    }
    if (options.current && options.current !== options.tunnelSessionPath) {
        items.push({
            label: "继续使用已配置 Agent 会话",
            description: options.current,
            value: options.current,
        });
    }
    const usedPaths = new Set([options.tunnelSessionPath, options.current].filter(Boolean).map((item) => localPathKey(String(item))));
    for (const info of options.sessions) {
        if (usedPaths.has(localPathKey(info.filePath)))
            continue;
        items.push({
            label: info.name,
            description: info.loginCommand ? "包含登录后命令" : (forwardSummary(info) || "Xshell 会话"),
            detail: info.relativePath || info.filePath,
            value: info.filePath,
        });
    }
    items.push({ label: "手动选择 Agent .xsh 文件", description: options.defaultDir ? `默认目录：${options.defaultDir}` : undefined, choose: true });
    items.push({ label: "暂不配置", description: "稍后仍可配置" });
    const picked = await vscode.window.showQuickPick(items, { title: options.title, ignoreFocusOut: true, matchOnDescription: true, matchOnDetail: true });
    if (!picked)
        return undefined;
    if (picked.choose)
        return pickOptionalXshellSession(options.title, options.current, options.defaultDir);
    return picked.value;
}
async function pickOptionalXshellSession(title, current, defaultDir) {
    const picked = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        title,
        defaultUri: defaultDir ? vscode.Uri.file(defaultDir) : undefined,
        filters: { "Xshell session": ["xsh"], "All files": ["*"] },
    });
    return picked?.[0]?.fsPath || current;
}
function xshellScanDirs(config) {
    const sessionFiles = [
        config.savedSessionPath,
        config.agentSessionPath,
        ...config.workerTunnels.flatMap((worker) => [worker.savedSessionPath, worker.agentSessionPath]),
    ].filter((item) => Boolean(item));
    return uniqueStrings([...(0, XshellSessionScanner_1.defaultXshellSessionDirs)(), ...sessionFiles.map((file) => path.dirname(file))]);
}
function forwardSummary(info) {
    if (!info?.forwards.length)
        return "";
    return info.forwards.map((item) => `${item.localHost}:${item.localPort} -> ${item.remoteHost}:${item.remotePort}`).join("; ");
}
function uniqueStrings(values) {
    return [...new Set(values.filter(Boolean))];
}
function localPathKey(value) {
    const resolved = path.resolve(value);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
function waitForXshellBatchLaunchSlot() {
    return new Promise((resolve) => setTimeout(resolve, XSHELL_BATCH_LAUNCH_DELAY_MS));
}
async function pickAuthMethod(current) {
    const picked = await vscode.window.showQuickPick([
        { label: "密码登录", description: "默认。Xshell 打开后输入服务器密码，不使用私钥。", value: "password", picked: current === "password" },
        { label: "密钥登录", description: "启动命令会带 -i <private key>。", value: "key", picked: current === "key" },
        { label: "自动", description: "兼容旧配置；有私钥路径时使用私钥。", value: "auto", picked: current === "auto" },
    ], { title: "认证方式", ignoreFocusOut: true });
    return picked?.value;
}
async function pickPrivateKeyPath(current) {
    const picked = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        title: "选择私钥文件",
    });
    return picked?.[0]?.fsPath || current;
}
function authMethodLabel(value) {
    if (value === "key")
        return "密钥";
    if (value === "auto")
        return "自动";
    return "密码";
}
async function nextAvailableLocalPort(start, usedPorts) {
    let candidate = Math.max(1024, Math.min(65535, start));
    while (usedPorts.has(candidate))
        candidate += 1;
    let port = await (0, XshellTunnelLauncher_1.recommendAvailableLocalPort)(candidate);
    while (usedPorts.has(port))
        port = await (0, XshellTunnelLauncher_1.recommendAvailableLocalPort)(port + 1);
    return port;
}
function sanitizeWorkerId(value) {
    return String(value || "worker").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "worker";
}
async function input(title, value, placeHolder, prompt) {
    return vscode.window.showInputBox({ title, value, placeHolder, prompt, ignoreFocusOut: true });
}
async function inputRequired(title, value, placeHolder, prompt, validationMessage) {
    const raw = await vscode.window.showInputBox({
        title,
        value: String(value || ""),
        placeHolder,
        prompt,
        ignoreFocusOut: true,
        validateInput: (text) => String(text || "").trim() ? undefined : validationMessage,
    });
    return raw === undefined ? undefined : raw.trim();
}
async function inputActualWorkRoot(title, value, label) {
    let current = String(value || "");
    for (;;) {
        const raw = await vscode.window.showInputBox({
            title,
            value: current,
            placeHolder: "/home/your_name/projects",
            prompt: "填写项目父目录。SimpleSFTP 会自动追加当前项目名，Agent runtime 会写入同级 zlk_agent。",
            ignoreFocusOut: true,
            validateInput: (text) => actualWorkRootValidationMessage(text, remoteProjectName(), label),
        });
        if (raw === undefined)
            return undefined;
        const normalized = normalizeRemoteWorkRoot(raw);
        const warning = actualWorkRootAmbiguityMessage(normalized, remoteProjectName(), label);
        if (!warning)
            return normalized;
        const suggestedRoot = remoteParentWorkRoot(normalized);
        const suggestedLabel = suggestedRoot ? "自动改为上一级" : "返回修改";
        const answer = await vscode.window.showWarningMessage(warning, { modal: true }, suggestedLabel, "仍按当前目录使用");
        if (answer === "仍按当前目录使用")
            return normalized;
        if (suggestedRoot && answer === suggestedLabel)
            return suggestedRoot;
        if (answer !== suggestedLabel)
            return undefined;
        current = normalized || raw;
    }
}
async function inputPlanResultPath(title, value, placeHolder, prompt) {
    const raw = await vscode.window.showInputBox({
        title,
        value: String(value || ""),
        placeHolder,
        prompt,
        ignoreFocusOut: true,
        validateInput: (inputValue) => planResultPathValidationMessage(inputValue),
    });
    return raw === undefined ? undefined : raw.trim().replace(/\\/g, "/").replace(/^\.\//, "");
}
function planResultPathValidationMessage(value) {
    const text = String(value || "").trim().replace(/\\/g, "/");
    if (!text)
        return "请填写评估命令实际生成的结果文件。";
    if (/^(?:[A-Za-z]:)?\//.test(text) || /^(?:https?:|s3:|gs:|oss:)/i.test(text) || text.includes("://"))
        return "结果文件必须位于项目内，请填写相对路径。";
    if (text.split("/").some((part) => part === ".."))
        return "结果文件不能离开项目目录。";
    if (!/\.(csv|json|txt|log|out)$/i.test(text))
        return "结果文件必须使用 .csv、.json、.txt、.log 或 .out 扩展名。";
    return undefined;
}
async function inputPort(title, value, options = {}) {
    const min = options.min ?? 1024;
    const max = options.max ?? 65535;
    const description = options.description || "端口";
    const raw = await vscode.window.showInputBox({
        title,
        value: String(value),
        placeHolder: min <= 22 ? "例如 22" : "例如 18765",
        prompt: options.prompt,
        ignoreFocusOut: true,
        validateInput: (text) => {
            const port = Number(text);
            return Number.isInteger(port) && port >= min && port <= max ? undefined : `${description}必须在 ${min}-${max} 之间。`;
        },
    });
    return raw === undefined ? undefined : Number(raw);
}
async function runVsCodeShellTask(name, command, cwd) {
    const task = new vscode.Task({ type: "shell", task: name }, vscode.TaskScope.Workspace, name, "zlkCluster", new vscode.ShellExecution(command, { cwd }));
    const execution = await vscode.tasks.executeTask(task);
    await new Promise((resolve, reject) => {
        const disposable = vscode.tasks.onDidEndTaskProcess((event) => {
            if (event.execution !== execution)
                return;
            disposable.dispose();
            if (event.exitCode === 0)
                resolve();
            else
                reject(new Error(`${name} 执行失败，退出码 ${event.exitCode}`));
        });
    });
}
function gitRepositoryHasChanges(repo) {
    const state = repo?.state || {};
    return Boolean((state.workingTreeChanges || []).length || (state.indexChanges || []).length || (state.mergeChanges || []).length);
}
function gitRepositoryHasRemote(repo) {
    const remotes = repo?.state?.remotes || [];
    return remotes.some((remote) => String(remote?.name || "").trim() || String(remote?.fetchUrl || remote?.pushUrl || "").trim());
}
function timestampCommitMessage() {
    return `zlk sync ${new Date().toISOString()}`;
}
function samePath(a, b) {
    if (!a || !b)
        return false;
    return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
}
async function buildLocalCodeManifest(root) {
    const files = await walkCodeFiles(root);
    const manifest = {};
    for (const relative of files) {
        const full = path.join(root, relative);
        const stat = await fs.stat(full);
        manifest[relative.replace(/\\/g, "/")] = {
            size: stat.size,
            sha256: await sha256File(full),
        };
    }
    return manifest;
}
function fingerprintFromManifest(manifest) {
    const stable = Object.keys(manifest).sort().map((key) => [key, manifest[key]]);
    return crypto.createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}
function sha256Text(text) {
    return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}
async function sha256File(file) {
    const hash = crypto.createHash("sha256");
    hash.update(await fs.readFile(file));
    return hash.digest("hex");
}
async function walkCodeFiles(root, dir = root) {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    const out = [];
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const relative = path.relative(root, full).replace(/\\/g, "/");
        if (isExcludedCodePath(relative, entry.isDirectory()))
            continue;
        if (entry.isDirectory())
            out.push(...await walkCodeFiles(root, full));
        else if (entry.isFile())
            out.push(relative);
    }
    return out.sort();
}
const protectedCodeSyncTopLevelDirs = new Set([
    ".git",
    ".vscode",
    ".idea",
    ".runtime",
    ".local-gpt",
    ".codex",
    "zlk_cluster",
    "node_modules",
    "dist",
    "build",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".cache",
    ".tox",
    "data",
    "dataset",
    "datasets",
    "checkpoints",
    "checkpoint",
    "weights",
    "weight",
    "pretrained",
    "pretrained_ckpt",
    "runs",
    "work_dirs",
    "wandb",
    "tensorboard",
    "logs",
    "log",
    "outputs",
    "output",
    "results",
    "result",
    "backup",
    "tmp",
    "temp",
]);
const protectedCodeSyncFilePattern = /\.(pth|pt|ckpt|onnx|engine|h5|hdf5|pkl|pickle|joblib|nii|gz|mha|mhd|dcm|png|jpg|jpeg|bmp|tif|tiff|npy|npz|zip|tar|tgz|rar|7z|log|out|err|csv|tsv|xlsx|xls|vsix)$/i;
function isExcludedCodePath(relative, directory) {
    const value = relative.replace(/\\/g, "/");
    const lower = value.toLowerCase();
    const top = lower.split("/")[0];
    if (protectedCodeSyncTopLevelDirs.has(top))
        return true;
    if (directory)
        return false;
    if (/^\.env($|\.)/i.test(path.posix.basename(value)))
        return true;
    return protectedCodeSyncFilePattern.test(value);
}
function sftpUploadSucceeded(result, fingerprint) {
    if (!result || typeof result !== "object")
        return false;
    return sftpUploadRecordSucceeded(result, fingerprint);
}
function sftpUploadFilesSucceeded(record) {
    return sftpUploadRecordSucceeded(record, "");
}
function sftpUploadRecordSucceeded(record, fingerprint) {
    if (!record || typeof record !== "object")
        return false;
    const status = String(record.status || record.result || "").toLowerCase();
    if (record.ok === false || ["failed", "error", "cancelled", "stalled"].includes(status))
        return false;
    const rows = Array.isArray(record.results) ? record.results : (Array.isArray(record.targets) ? record.targets : []);
    if (rows.length)
        return rows.every((row) => {
            const item = row && typeof row === "object" ? row : {};
            return sftpUploadRecordSucceeded(item, fingerprint);
        });
    return (record.ok === true || ["completed", "success", "succeeded", "done"].includes(status)) && sftpFingerprintMatches(record, fingerprint);
}
function sftpFingerprintMatches(record, fingerprint) {
    if (!fingerprint)
        return true;
    const actual = stringFromRecord(record, ["fingerprint", "workspaceFingerprint", "codeFingerprint", "manifestFingerprint"]);
    return !actual || actual === fingerprint;
}
function resultError(result) {
    return result && typeof result === "object" ? String(result.error || "") : "";
}
function syncRoleStatus(targets, previous = {}, fingerprint = "") {
    const hubCount = targets.filter((target) => target.role === "hub").length;
    const workerCount = targets.filter((target) => target.role === "worker").length;
    const sameFingerprint = Boolean(fingerprint) && String(previous?.fingerprint || "") === fingerprint;
    const previousHub = sameFingerprint && successfulSyncStatus(previous?.hub) ? String(previous.hub) : "待同步";
    const previousWorkers = sameFingerprint && successfulSyncStatus(previous?.workers) ? String(previous.workers) : "待同步";
    return {
        hubRunning: hubCount ? "running" : previousHub,
        workersRunning: workerCount ? "running" : previousWorkers,
        hubSuccess: hubCount ? "已同步" : previousHub,
        workersSuccess: workerCount ? `已同步 ${workerCount} 台` : previousWorkers,
    };
}
function successfulSyncStatus(value) {
    const text = String(value || "").trim().toLowerCase();
    return Boolean(text && !["-", "待同步", "pending", "unknown", "running", "已跳过", "未参与本次同步"].includes(text) && !text.includes("fail") && !text.includes("error") && !text.includes("未参与") && !text.includes("skip"));
}
function persistedTunnelGatewayConfig(config) {
    return { ...config };
}
function persistedXshellSetupConfig(config) {
    return {
        ...config,
        workerTunnels: config.workerTunnels.map((worker) => ({ ...worker })),
    };
}
function workspaceMappingConfig() {
    const config = vscode.workspace.getConfiguration?.("zlkCluster");
    return {
        hostRoot: config?.get?.("workspaceHostRoot", "") || "",
        containerRoot: config?.get?.("workspaceContainerRoot", "") || "",
        remoteScheme: "vscode-remote",
    };
}
function workspaceLocationForFolder(folder) {
    const uri = folder?.uri;
    if (!uri)
        return undefined;
    return (0, WorkspacePathMapper_1.resolveWorkspaceLocation)({
        scheme: uri.scheme,
        path: uri.path,
        fsPath: uri.fsPath,
        external: uri.toString?.(true),
    }, workspaceMappingConfig());
}
function currentWorkspaceLocation() {
    const folder = Array.isArray(vscode.workspace.workspaceFolders) ? vscode.workspace.workspaceFolders[0] : undefined;
    return workspaceLocationForFolder(folder);
}
function workspaceRoot() {
    try {
        return currentWorkspaceLocation()?.hostPath;
    }
    catch {
        return undefined;
    }
}
function currentHostOperationLeaseContext() {
    if (process.platform !== "win32")
        throw new Error("SimpleExperiment 宿主副作用必须由 Windows UI Extension Host 执行。");
    const folders = Array.isArray(vscode.workspace.workspaceFolders) ? vscode.workspace.workspaceFolders : [];
    if (folders.length > 1)
        throw new Error("检测到多个工作区文件夹，已阻止宿主副作用操作。请在独立窗口中只打开一个目标项目。");
    const folder = folders[0];
    if (!folder?.uri) {
        return { workspaceUri: "untitled://simple-experiment/no-workspace", hostProjectPath: "(未打开工作区)" };
    }
    const location = workspaceLocationForFolder(folder);
    if (!location?.hostPath)
        throw new Error("无法解析当前工作区宿主路径，已阻止宿主副作用操作。");
    return {
        workspaceUri: String(location.editorUri || folder.uri.toString?.(true) || ""),
        hostProjectPath: location.hostPath,
    };
}
function workspaceContextForWebview() {
    const folders = Array.isArray(vscode.workspace.workspaceFolders) ? vscode.workspace.workspaceFolders : [];
    let location;
    let mappingError = "";
    try {
        location = currentWorkspaceLocation();
    }
    catch (error) {
        mappingError = errorMessage(error);
    }
    const root = location?.hostPath || "";
    const uri = folders[0]?.uri;
    const name = root ? path.basename(root).trim() : path.basename(String(uri?.path || "")).trim();
    return {
        open: Boolean(uri),
        name,
        root,
        hostPath: root,
        editorUri: location?.editorUri || String(uri?.toString?.(true) || ""),
        containerPath: location?.remote ? String(uri?.path || "") : "",
        remote: Boolean(location?.remote),
        mappingError,
        folderCount: folders.length,
        singleProject: folders.length === 1,
    };
}
function assertSingleProjectWorkspace(operation = "当前操作") {
    const folders = Array.isArray(vscode.workspace.workspaceFolders) ? vscode.workspace.workspaceFolders : [];
    if (!folders.length)
        throw new Error(`${operation}需要先打开一个本地实验项目。`);
    if (folders.length > 1)
        throw new Error(`检测到 ${folders.length} 个工作区文件夹，已阻止${operation}。SimpleExperiment 的 Plan、项目状态、上传目录和 Agent 工作目录必须属于同一个项目；请在独立 VS Code 窗口中只打开目标实验项目后重试。`);
    try {
        const location = workspaceLocationForFolder(folders[0]);
        if (location?.remote && process.platform !== "win32")
            throw new Error("远程工作区必须由 Windows UI Extension Host 执行。请确认 SimpleExperiment 未运行于 Linux workspace host。");
        if (!location?.hostPath)
            throw new Error("无法解析当前工作区宿主路径。");
        return location.hostPath;
    }
    catch (error) {
        throw new Error(`${operation}无法使用当前工作区：${errorMessage(error)}`);
    }
}
function workspaceEditorUriForFile(file) {
    const folder = Array.isArray(vscode.workspace.workspaceFolders) ? vscode.workspace.workspaceFolders[0] : undefined;
    if (!folder?.uri)
        throw new Error("需要先打开工作区。");
    const location = workspaceLocationForFolder(folder);
    const relative = String(file || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (location?.remote) {
        const segments = relative.split("/").filter(Boolean);
        return vscode.Uri.joinPath(folder.uri, ...segments);
    }
    return vscode.Uri.file(path.resolve(location.hostPath, relative));
}
async function pptDialogDefaultUri(currentPath) {
    const fallbackName = "simple-experiment-results.pptx";
    const root = workspaceRoot() || os.homedir();
    const current = String(currentPath || "").trim();
    if (!current)
        return vscode.Uri.file(path.join(root, fallbackName));
    try {
        const stat = await fs.stat(current);
        return vscode.Uri.file(stat.isDirectory() ? path.join(current, fallbackName) : current);
    }
    catch {
        const dir = path.dirname(current);
        try {
            const stat = await fs.stat(dir);
            if (stat.isDirectory())
                return vscode.Uri.file(path.join(dir, path.basename(current) || fallbackName));
        }
        catch {
            // Fall through to workspace default when the saved path no longer exists.
        }
        return vscode.Uri.file(path.join(root, path.basename(current) || fallbackName));
    }
}
function remoteProjectName() {
    const root = workspaceRoot();
    if (!root)
        return "";
    const name = path.basename(root).trim();
    return name && name !== "." && name !== ".." ? name : "";
}
function normalizeRemoteWorkRoot(value) {
    const text = String(value || "").trim().replace(/\\/g, "/").replace(/\/+/g, "/");
    if (!text || text === "/" || text === "." || text === "..")
        return undefined;
    return text.replace(/\/+$/, "");
}
function remoteParentWorkRoot(value) {
    const root = normalizeRemoteWorkRoot(value);
    if (!root)
        return undefined;
    const separator = root.lastIndexOf("/");
    if (separator <= 0)
        return undefined;
    return normalizeRemoteWorkRoot(root.slice(0, separator));
}
function actualWorkRootValidationMessage(value, projectName = remoteProjectName(), label = "服务器") {
    const root = normalizeRemoteWorkRoot(value);
    const displayLabel = String(label || "服务器").trim() || "服务器";
    if (!root)
        return `请填写 ${displayLabel} 上用于存放项目的父目录。`;
    const segments = root.split("/").filter(Boolean);
    const lowerSegments = segments.map((item) => item.toLowerCase());
    if (lowerSegments.includes("zlk_agent"))
        return `${displayLabel} 项目父目录不能包含 zlk_agent；插件会自动管理同级 Agent runtime。`;
    return undefined;
}
function actualWorkRootAmbiguityMessage(value, projectName = remoteProjectName(), label = "服务器") {
    const root = normalizeRemoteWorkRoot(value);
    if (!root || !String(projectName || "").trim())
        return undefined;
    const segments = root.split("/").filter(Boolean);
    const expectedProjectName = String(projectName).trim();
    if (!segments.length || segments[segments.length - 1].toLowerCase() !== expectedProjectName.toLowerCase())
        return undefined;
    const displayLabel = String(label || "服务器").trim() || "服务器";
    const suggestedRoot = remoteParentWorkRoot(root);
    return `${displayLabel} 路径末级与当前项目名相同：${root}。插件仍会自动追加 /${expectedProjectName}，最终代码目录会重复。${suggestedRoot ? `建议改为项目父目录：${suggestedRoot}。` : "请返回填写项目父目录。"}`;
}
async function confirmActualWorkRootAmbiguity(value, label, confirmLabel) {
    const warning = actualWorkRootAmbiguityMessage(value, remoteProjectName(), label);
    if (!warning)
        return normalizeRemoteWorkRoot(value);
    const suggestedRoot = remoteParentWorkRoot(value);
    const suggestedLabel = suggestedRoot ? "自动改为上一级" : undefined;
    const choices = [suggestedLabel, confirmLabel].filter(Boolean);
    const answer = await vscode.window.showWarningMessage(warning, { modal: true }, ...choices);
    if (suggestedRoot && answer === suggestedLabel)
        return suggestedRoot;
    if (answer === confirmLabel)
        return normalizeRemoteWorkRoot(value);
    throw new UiCommandCancelled(`${label || "服务器"} 项目父目录保存已取消。`);
}
function assertActualWorkRoot(value, label) {
    const issue = actualWorkRootValidationMessage(value, remoteProjectName(), label);
    if (issue)
        throw new Error(issue);
}
function assertConfiguredActualWorkRoots(config) {
    assertActualWorkRoot(config?.agentProjectDir, "Hub");
    for (const worker of config?.workerTunnels || []) {
        if (worker.enabled === false)
            continue;
        assertActualWorkRoot(worker.agentProjectDir, worker.displayName || worker.id || "Worker");
    }
}
function normalizeAgentProjectRoot(value) {
    const text = String(value || "").trim().replace(/\\/g, "/").replace(/\/+/g, "/");
    if (!text)
        return "";
    if (/^[A-Za-z]:\//.test(text))
        return `${text[0].toLowerCase()}${text.slice(1)}`.replace(/\/+$/, "");
    return text.length > 1 ? text.replace(/\/+$/, "") : text;
}
function enforceExpectedAgentProjectRoot(probe, expectedRoot, label) {
    const rawStatus = String(probe?.status || "").toLowerCase();
    const validatedStatus = rawStatus === "agent_project_mismatch" ? String(probe?.projectRootValidatedStatus || "ok").toLowerCase() : rawStatus;
    if (!probe || !["ok", "file_api_unavailable"].includes(validatedStatus))
        return probe;
    const projectRoot = normalizeAgentProjectRoot(probe.projectRoot);
    const expectedProjectRoot = normalizeAgentProjectRoot(expectedRoot);
    if (projectRoot && expectedProjectRoot && projectRoot === expectedProjectRoot)
        return { ...probe, status: validatedStatus, projectRoot, expectedProjectRoot, projectRootValidatedStatus: undefined };
    const actual = projectRoot || "未返回";
    const expected = expectedProjectRoot || "未配置";
    return {
        ...probe,
        status: "agent_project_mismatch",
        projectRootValidatedStatus: validatedStatus,
        projectRoot,
        expectedProjectRoot,
        message: `${label || "Agent"} Agent 当前项目目录与本工作区不一致：${actual}；期望：${expected}。`,
        suggestion: "请点击“准备 Agent 并启动”，重写当前项目的自启动命令并重新检测。",
    };
}
function assertAgentProjectProbeReady(probe, expectedRoot, label) {
    const checked = enforceExpectedAgentProjectRoot(probe, expectedRoot, label);
    if (["ok", "file_api_unavailable"].includes(String(checked?.status || "").toLowerCase()))
        return;
    if (checked?.status === "agent_project_mismatch")
        throw new Error(`${checked.message} ${checked.suggestion}`);
    throw new Error(`${label || "Agent"} Agent 尚未通过当前项目检测。请点击“准备 Agent 并启动”或“检测全部”。`);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isXshellExecutablePath(value) {
    return path.basename(value || "").toLowerCase() === "xshell.exe";
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
function xshellLoginCommandUpdateLabel(skippedReason, changed) {
    switch (skippedReason) {
        case "existing_zlk_command":
            return "已存在当前 SimpleExperiment Agent 命令，跳过";
        case "non_zlk_remote_command":
            return "检测到已有非 SimpleExperiment 登录后命令，已跳过，未覆盖用户自定义命令";
        case "different_zlk_agent_session":
            return "检测到其它 SimpleExperiment Agent 会话命令，已跳过，避免覆盖";
        default:
            return changed ? "已写入" : "无需变更";
    }
}
function isUiCommandCancelled(error) {
    return error instanceof UiCommandCancelled;
}
function isUiCommandRemotePending(error) {
    return error instanceof UiCommandRemotePending;
}
async function confirmUiCommand(title, detail, danger) {
    const label = danger ? "确认危险操作" : "确认执行";
    const answer = await vscode.window.showWarningMessage(`${title}\n\n${detail}`, { modal: danger }, label);
    if (answer !== label)
        throw new UiCommandCancelled(`${title} 已取消。`);
}
