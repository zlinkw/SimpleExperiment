"use strict";
/**
 * ProviderCommands - 命令注册逻辑抽离 (Phase 2)
 * 搬运自 src/extension.ts 18000-20000 段 命令注册，保持原逻辑不变，委托给 CommandFactory
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderCommands = void 0;
exports.resolveCommandHandlerMap = resolveCommandHandlerMap;
exports.registerProviderCommands = registerProviderCommands;
function resolveCommandHandlerMap(provider) {
    if (!provider)
        return {};
    // 映射与 extension.ts hostCommand 注册保持一致；注册阶段会拒绝任何漏绑项。
    const map = {};
    const bind = (cmdId, method) => {
        const fn = provider[method];
        if (typeof fn === "function")
            map[cmdId] = (...args) => fn.apply(provider, args);
    };
    bind("simpleExperiment.openPanel", "openPanel");
    bind("simpleExperiment.copyPanelDiagnostics", "copyPanelDiagnosticsFromUi");
    bind("simpleExperiment.restorePanel", "restorePanelFromUi");
    bind("simpleExperiment.quickSetup", "quickSetup");
    bind("simpleExperiment.configureXshellSavedSessions", "configureXshellSavedSessions");
    bind("simpleExperiment.configureXshellAgentSessions", "configureXshellAgentSessions");
    bind("simpleExperiment.writeXshellAgentStartupCommands", "writeXshellAgentStartupCommands");
    bind("simpleExperiment.configureWorkerTunnels", "configureWorkerTunnels");
    bind("simpleExperiment.configureTunnelPorts", "configureTunnelPorts");
    bind("simpleExperiment.configureXshellRealtimeTunnel", "configureXshellRealtimeTunnel");
    bind("simpleExperiment.startHubTunnel", "startHubTunnel");
    bind("simpleExperiment.startWorkerTunnel", "startWorkerTunnel");
    bind("simpleExperiment.startXshellRealtimeTunnel", "startXshellRealtimeTunnel");
    bind("simpleExperiment.startAllXshellRealtimeTunnels", "startAllXshellRealtimeTunnels");
    bind("simpleExperiment.startAllXshellAgentSessions", "startAllXshellAgentSessions");
    bind("simpleExperiment.startAllXshellConnections", "startAllXshellConnections");
    bind("simpleExperiment.testAllTunnels", "testTunnel");
    bind("simpleExperiment.showTunnelEndpointRegistry", "showTunnelEndpointRegistry");
    bind("simpleExperiment.testXshellTunnel", "testTunnel");
    bind("simpleExperiment.restartRealtimeStream", "restartRealtimeStream");
    bind("simpleExperiment.pauseRealtimeStream", "pauseRealtimeStream");
    bind("simpleExperiment.resumeRealtimeStream", "resumeRealtimeStream");
    bind("simpleExperiment.pauseAllNetworkActivity", "pauseAllNetworkActivity");
    bind("simpleExperiment.generateXshellTunnelScript", "generateTunnelScript");
    bind("simpleExperiment.openTunnelStatus", "openTunnelStatus");
    bind("simpleExperiment.runXshellRealIntegrationCheck", "runXshellRealIntegrationCheck");
    bind("simpleExperiment.manualRefresh", "manualSnapshot");
    bind("simpleExperiment.importOfflineBundle", "importOffline");
    bind("simpleExperiment.clearCache", "clearCacheFromUi");
    bind("simpleExperiment.bootstrapProject", "bootstrapProjectFromUi");
    bind("simpleExperiment.prepareAgents", "prepareAgentsForFirstRun");
    bind("simpleExperiment.verifyAgentVersion", "verifyAgentVersionManually");
    bind("simpleExperiment.openSetupGuide", "openSetupGuide");
    bind("simpleExperiment.openLastCheckStaticReport", "openLastCheckStaticReportFromUi");
    bind("simpleExperiment.copyLastCheckStaticReport", "copyLastCheckStaticReportFromUi");
    bind("simpleExperiment.runCheckStatic", "runCheckStaticFromUi");
    return map;
}
function registerProviderCommands(deps, vscodeContext) {
    // 委托给 CommandFactory.registerAll，保持编排与 extension.ts activate 中一致
    const handlerMap = resolveCommandHandlerMap(deps.provider);
    const factoryContext = { ...deps.factoryContext, handlerMap };
    return deps.commandFactory.registerAll(vscodeContext, factoryContext);
}
class ProviderCommands {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    register(vscodeContext) {
        return registerProviderCommands(this.deps, vscodeContext);
    }
    descriptors() {
        return (this.deps.commandFactory.createDescriptors?.(this.deps.factoryContext) || []);
    }
}
exports.ProviderCommands = ProviderCommands;
