"use strict";
/**
 * CommandFactory - 命令工厂
 * 表驱动注册所有 VS Code commands，与 package.json#contributes.commands 单源契约
 * 遵循 docs/architecture-factory-refactor-plan.md §3.6
 * contributes.commands 38 项保持不动，此处 COMMAND_MANIFEST 为表驱动镜像
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultCommandFactory = exports.COMMAND_MANIFEST = void 0;
function tryRequire(id) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id);
    }
    catch {
        return undefined;
    }
}
function getHostOperationLease() {
    return tryRequire("../core/HostOperationLease");
}
function getVscode() {
    return tryRequire("vscode");
}
// 与 package.json contributes.commands 单源（生成脚本可覆盖此表）
exports.COMMAND_MANIFEST = [
    { id: "simpleExperiment.openPanel", title: "SimpleExperiment：打开面板" },
    { id: "simpleExperiment.quickSetup", title: "SimpleExperiment：检查服务器配置" },
    { id: "simpleExperiment.bootstrapProject", title: "SimpleExperiment：接入当前项目" },
    { id: "simpleExperiment.prepareAgents", title: "SimpleExperiment：准备 Agent 并启动" },
    { id: "simpleExperiment.openSetupGuide", title: "SimpleExperiment：打开配置说明" },
    { id: "simpleExperiment.configureXshellSavedSessions", title: "SimpleExperiment：配置 Xshell 会话文件" },
    { id: "simpleExperiment.writeXshellAgentStartupCommands", title: "SimpleExperiment：写入 Agent 自启动 RemoteCommand" },
    { id: "simpleExperiment.configureWorkerTunnels", title: "SimpleExperiment：配置 Worker 隧道" },
    { id: "simpleExperiment.configureTunnelPorts", title: "SimpleExperiment：配置隧道端口" },
    { id: "simpleExperiment.configureXshellRealtimeTunnel", title: "SimpleExperiment：旧自动隧道配置（不推荐）" },
    { id: "simpleExperiment.startHubTunnel", title: "SimpleExperiment：启动 Hub 隧道" },
    { id: "simpleExperiment.startWorkerTunnel", title: "SimpleExperiment：启动 Worker 隧道" },
    { id: "simpleExperiment.startXshellRealtimeTunnel", title: "SimpleExperiment：启动 Hub Xshell 会话" },
    { id: "simpleExperiment.startAllXshellRealtimeTunnels", title: "SimpleExperiment：启动全部 Xshell 会话" },
    { id: "simpleExperiment.startAllXshellConnections", title: "SimpleExperiment：启动全部 Xshell 连接" },
    { id: "simpleExperiment.testAllTunnels", title: "SimpleExperiment：检测全部隧道" },
    { id: "simpleExperiment.showTunnelEndpointRegistry", title: "SimpleExperiment：显示隧道端点清单" },
    { id: "simpleExperiment.testXshellTunnel", title: "SimpleExperiment：检测 Xshell 隧道" },
    { id: "simpleExperiment.restartRealtimeStream", title: "SimpleExperiment：重启实时流" },
    { id: "simpleExperiment.pauseRealtimeStream", title: "SimpleExperiment：暂停实时流" },
    { id: "simpleExperiment.resumeRealtimeStream", title: "SimpleExperiment：恢复实时流" },
    { id: "simpleExperiment.pauseAllNetworkActivity", title: "SimpleExperiment：暂停全部网络活动" },
    { id: "simpleExperiment.generateXshellTunnelScript", title: "SimpleExperiment：生成 Xshell 会话启动脚本" },
    { id: "simpleExperiment.openTunnelStatus", title: "SimpleExperiment：打开隧道状态" },
    { id: "simpleExperiment.runXshellRealIntegrationCheck", title: "SimpleExperiment：运行 Xshell 真实对接检测" },
    { id: "simpleExperiment.manualRefresh", title: "SimpleExperiment：手动快照" },
    { id: "simpleExperiment.importOfflineBundle", title: "SimpleExperiment：导入离线包" },
    { id: "simpleExperiment.clearCache", title: "SimpleExperiment：清除缓存" },
    { id: "simpleExperiment.verifyAgentVersion", title: "SimpleExperiment：校验 Agent 版本" },
];
function defaultHandlerFor(id) {
    return (...args) => {
        // Phase1: 占位 handler，后续由 FeatureFactory / HostOperationLease 包装
        return { command: id, args, ok: true, delegated: true };
    };
}
class DefaultCommandFactory {
    deps;
    constructor(deps = {}) {
        this.deps = deps;
    }
    createDescriptors(_ctx) {
        const handlerMap = this.deps["handlerMap"];
        return exports.COMMAND_MANIFEST.map((item) => ({
            ...item,
            withLease: true,
            leaseLabel: item.id,
            handler: handlerMap?.[item.id] || defaultHandlerFor(item.id),
        }));
    }
    createByName(id, _ctx) {
        const found = exports.COMMAND_MANIFEST.find((c) => c.id === id);
        if (!found)
            return undefined;
        const handlerMap = this.deps["handlerMap"];
        return {
            ...found,
            withLease: true,
            leaseLabel: found.id,
            handler: handlerMap?.[found.id] || defaultHandlerFor(found.id),
        };
    }
    createAll(ctx) {
        return this.createDescriptors(ctx);
    }
    registerAll(ctx, factoryCtx) {
        const descriptors = this.createDescriptors(factoryCtx);
        const disposables = [];
        const vscode = getVscode();
        for (const d of descriptors) {
            try {
                const vsc = vscode;
                if (vsc?.commands?.registerCommand) {
                    const wrapped = d.withLease ? withLeaseWrapper(d) : d.handler;
                    const disp = vsc.commands.registerCommand(d.id, wrapped);
                    if (ctx.subscriptions && typeof ctx.subscriptions.push === "function")
                        ctx.subscriptions.push(disp);
                    disposables.push(disp);
                }
                else {
                    disposables.push({ id: d.id, handler: d.handler, dispose() { } });
                }
            }
            catch {
                disposables.push({ id: d.id, handler: d.handler, dispose() { } });
            }
        }
        return disposables;
    }
}
exports.DefaultCommandFactory = DefaultCommandFactory;
function withLeaseWrapper(descriptor) {
    return async (...args) => {
        const mod = getHostOperationLease();
        if (mod && typeof mod.withHostOperationLease === "function") {
            return await mod.withHostOperationLease(descriptor.leaseLabel || descriptor.id, () => descriptor.handler(...args));
        }
        return descriptor.handler(...args);
    };
}
