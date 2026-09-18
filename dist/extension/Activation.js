"use strict";
/**
 * Activation - 新的 activate 入口，使用 ServiceFactory 组装，<150 行
 * 搬运自 src/extension.ts activate / activateExtension / deactivate，保持兼容门面可运行
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.activateExtension = activateExtension;
exports.deactivate = deactivate;
exports.getProvider = getProvider;
const ServiceFactory_1 = require("../factories/ServiceFactory");
const ExtensionContext_1 = require("./ExtensionContext");
const ProviderCommands_1 = require("./ProviderCommands");
const GitBackupSetup_1 = require("./GitBackupSetup");
let _provider;
function tryRequire(id) {
    try {
        return require(id);
    }
    catch {
        return undefined;
    }
}
async function activate(context) {
    console.log("[Activation] enter", new Date().toISOString(), "process.env.FEATURE_FACTORY_PANEL", process.env.FEATURE_FACTORY_PANEL);
    return activateExtension(context);
}
async function activateExtension(context) {
    console.log("[Activation] enter", new Date().toISOString(), "process.env.FEATURE_FACTORY_PANEL", process.env.FEATURE_FACTORY_PANEL);
    const mod = tryRequire("../config/RenamedExtensionStateMigration");
    await mod?.migrateRenamedExtensionState(context).catch(() => undefined);
    const factoryContext = (0, ExtensionContext_1.toFactoryContext)(context);
    const services = new ServiceFactory_1.DefaultServiceFactory();
    // 单一工厂路径：优先经 ServiceFactory 创建，可回退到 legacy 直连
    // FIX: 传入原始 vscode.ExtensionContext 而非简化的 factoryContext，确保 this.context.extension.packageJSON 可用
    let provider;
    try {
        console.log("[Activation] try factory");
        provider = services.createPanelProvider(context);
        if (provider && typeof provider.resolveWebviewView !== "function")
            throw new Error("not real provider");
    }
    catch (e) {
        console.error("[Activation] factory failed", e);
        provider = undefined;
    }
    if (!provider || typeof provider.resolveWebviewView !== "function") {
        try {
            const legacy = tryRequire("./legacy");
            const RealtimeTunnelPanelProvider = legacy?.RealtimeTunnelPanelProvider;
            provider = RealtimeTunnelPanelProvider ? new RealtimeTunnelPanelProvider(context) : undefined;
        }
        catch {
            provider = undefined;
        }
    }
    _provider = provider;
    console.log("[Activation] provider", !!provider, typeof provider?.resolveWebviewView);
    if (provider && typeof provider.resolveWebviewView === "function") {
        try {
            const vscode = tryRequire("vscode");
            if (vscode && vscode.window && typeof vscode.window.registerWebviewViewProvider === "function") {
                console.log("[Activation] registerWebviewViewProvider", "simpleExperiment.panel");
                context.subscriptions.push(vscode.window.registerWebviewViewProvider("simpleExperiment.panel", provider, { webviewOptions: { retainContextWhenHidden: true } }));
            }
        }
        catch { }
    }
    else {
        // provider 无 resolveWebviewView，说明拿到桩，回退 legacy
        try {
            const legacy = tryRequire("./legacy");
            if (legacy && typeof legacy.activate === "function") {
                return legacy.activate(context);
            }
        }
        catch { }
    }
    // 注册命令（委托给 CommandFactory）
    try {
        (0, ProviderCommands_1.registerProviderCommands)({ factoryContext, commandFactory: services.commands, provider }, context);
    }
    catch { }
    // 注册 git 提交备份命令（独立注册，不耦合 legacy provider）
    try {
        (0, GitBackupSetup_1.registerGitBackupCommands)(context);
    }
    catch { }
    // 把既有的面板式 GitHub 同步方法补上命令面板入口（仅转发 provider 方法）
    try {
        (0, GitBackupSetup_1.registerGitHubSyncCommands)(context, provider);
    }
    catch { }
    // 复刻原 activate 的后置启动逻辑（简化版，保持可运行）
    try {
        provider?.startLocalApiServer?.();
    }
    catch { }
    try {
        void provider?.reconcileStalePlanRunOperations?.({ reason: "activation" });
    }
    catch { }
    try {
        void provider?.runActivationOnboarding?.();
    }
    catch { }
    setTimeout(() => { try {
        void provider?.checkRemoteAgentVersionAndNotify?.(false);
    }
    catch { } }, 8000);
    // 自动配置 git 提交备份：条件不满足只提示、不写入 hook
    setTimeout(() => {
        void (0, GitBackupSetup_1.maybeAutoInstallGitBackup)(context).catch(() => undefined);
    }, 3000);
    // 配置变更监听（与原逻辑一致）
    try {
        const vscode = tryRequire("vscode");
        if (vscode) {
            context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => void provider?.handleConfigurationChanged?.(e)));
            context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => void provider?.handleWorkspaceFoldersChanged?.()));
        }
    }
    catch { }
}
function deactivate() {
    try {
        _provider?.dispose?.();
    }
    catch { }
    _provider = undefined;
}
function getProvider() { return _provider; }
