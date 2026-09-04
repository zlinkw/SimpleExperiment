/**
 * CommandFactory - 命令工厂
 * 表驱动注册所有 VS Code commands，与 package.json#contributes.commands 单源契约
 * 遵循 docs/architecture-factory-refactor-plan.md §3.6
 * contributes.commands 38 项保持不动，此处 COMMAND_MANIFEST 为表驱动镜像
 */

import type { FactoryContext } from "./types";

function tryRequire<T>(id: string): T | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(id) as T;
  } catch {
    return undefined;
  }
}

type HostOperationLeaseMod = {
  withHostOperationLease?: (label: string, fn: () => unknown | Promise<unknown>) => Promise<unknown>;
};

type VscodeMod = {
  commands?: { registerCommand: (id: string, fn: (...a: unknown[]) => unknown) => unknown };
};

function getHostOperationLease(): HostOperationLeaseMod | undefined {
  return tryRequire<HostOperationLeaseMod>("../core/HostOperationLease");
}

function getVscode(): VscodeMod | undefined {
  return tryRequire<VscodeMod>("vscode");
}

export interface CommandDescriptor {
  readonly id: string;
  readonly title: string;
  readonly category?: string;
  readonly when?: string;
  readonly handler: (...args: unknown[]) => unknown;
  readonly withLease?: boolean;
  readonly leaseLabel?: string;
}

// 与 package.json contributes.commands 单源（生成脚本可覆盖此表）
export const COMMAND_MANIFEST: ReadonlyArray<Omit<CommandDescriptor, "handler">> = [
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

export interface CommandFactory {
  createDescriptors(ctx: FactoryContext): CommandDescriptor[];
  createByName(id: string, ctx: FactoryContext): CommandDescriptor | undefined;
  createAll(ctx: FactoryContext): CommandDescriptor[];
  registerAll(ctx: { subscriptions: { push(...args: unknown[]): unknown } } & Record<string, unknown>, factoryCtx: FactoryContext): unknown[];
}

function defaultHandlerFor(id: string): (...args: unknown[]) => unknown {
  return (...args: unknown[]) => {
    // 未绑定命令必须抛错，禁止返回假成功占位，避免面板静默“成功”实际未提交。
    throw new Error(`未绑定命令处理器：${id}。请检查 handlerMap 注册或经 handleMessageCore/runActionCommandCore 通道调用。args=${JSON.stringify(args || []).slice(0, 200)}`);
  };
}

export class DefaultCommandFactory implements CommandFactory {
  private readonly deps: Record<string, unknown>;
  constructor(deps: Record<string, unknown> = {}) {
    this.deps = deps;
  }

  createDescriptors(_ctx: FactoryContext): CommandDescriptor[] {
    const handlerMap = this.deps["handlerMap"] as Record<string, (...a: unknown[]) => unknown> | undefined;
    return COMMAND_MANIFEST.map((item) => ({
      ...item,
      withLease: true,
      leaseLabel: item.id,
      handler: handlerMap?.[item.id] || defaultHandlerFor(item.id),
    }));
  }

  createByName(id: string, _ctx: FactoryContext): CommandDescriptor | undefined {
    const found = COMMAND_MANIFEST.find((c) => c.id === id);
    if (!found) return undefined;
    const handlerMap = this.deps["handlerMap"] as Record<string, (...a: unknown[]) => unknown> | undefined;
    return {
      ...found,
      withLease: true,
      leaseLabel: found.id,
      handler: handlerMap?.[found.id] || defaultHandlerFor(found.id),
    };
  }

  createAll(ctx: FactoryContext): CommandDescriptor[] {
    return this.createDescriptors(ctx);
  }

  registerAll(
    ctx: { subscriptions: { push(...args: unknown[]): unknown } } & Record<string, unknown>,
    factoryCtx: FactoryContext,
  ): unknown[] {
    const descriptors = this.createDescriptors(factoryCtx);
    const disposables: unknown[] = [];
    const vscode = getVscode();
    for (const d of descriptors) {
      try {
        const vsc = vscode as VscodeMod | undefined;
        if (vsc?.commands?.registerCommand) {
          const wrapped = d.withLease ? withLeaseWrapper(d) : d.handler;
          const disp = vsc.commands.registerCommand(d.id, wrapped);
          if (ctx.subscriptions && typeof ctx.subscriptions.push === "function") ctx.subscriptions.push(disp);
          disposables.push(disp);
        } else {
          disposables.push({ id: d.id, handler: d.handler, dispose() {} });
        }
      } catch {
        disposables.push({ id: d.id, handler: d.handler, dispose() {} });
      }
    }
    return disposables;
  }
}

function withLeaseWrapper(descriptor: CommandDescriptor): (...args: unknown[]) => unknown {
  return async (...args: unknown[]) => {
    const mod = getHostOperationLease();
    if (mod && typeof mod.withHostOperationLease === "function") {
      return await mod.withHostOperationLease(descriptor.leaseLabel || descriptor.id, () => descriptor.handler(...args));
    }
    return descriptor.handler(...args);
  };
}
