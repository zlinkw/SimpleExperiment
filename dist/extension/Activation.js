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
    return activateExtension(context);
}
async function activateExtension(context) {
    const mod = tryRequire("../config/RenamedExtensionStateMigration");
    await mod?.migrateRenamedExtensionState(context).catch(() => undefined);
    const factoryContext = (0, ExtensionContext_1.toFactoryContext)(context);
    const services = new ServiceFactory_1.DefaultServiceFactory();
    // 单一工厂路径：优先经 ServiceFactory 创建，可回退到 legacy 直连
    let provider;
    try {
        provider = services.createPanelProvider(factoryContext);
    }
    catch {
        provider = undefined;
    }
    if (!provider) {
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
    // 注册命令（委托给 CommandFactory）
    try {
        (0, ProviderCommands_1.registerProviderCommands)({ factoryContext, commandFactory: services.commands, provider }, context);
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
