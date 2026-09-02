// @ts-nocheck
/**
 * Activation - 新的 activate 入口，使用 ServiceFactory 组装，<150 行
 * 搬运自 src/extension.ts activate / activateExtension / deactivate，保持兼容门面可运行
 */

import type { FactoryContext } from "../factories/types";
import { DefaultServiceFactory } from "../factories/ServiceFactory";
import { toFactoryContext } from "./ExtensionContext";
import { registerProviderCommands } from "./ProviderCommands";

let _provider: unknown | undefined;

export async function activate(context: unknown): Promise<void> {
  return activateExtension(context as any);
}

export async function activateExtension(context: any): Promise<void> {
  const { migrateRenamedExtensionState } = require("../config/RenamedExtensionStateMigration");
  await migrateRenamedExtensionState(context).catch(() => undefined);

  const factoryContext: FactoryContext = toFactoryContext(context);
  const services = new DefaultServiceFactory();

  // 单一工厂路径：优先经 ServiceFactory 创建，可回退到 legacy 直连
  let provider: any;
  try {
    provider = services.createPanelProvider(factoryContext);
  } catch {
    provider = undefined;
  }
  if (!provider) {
    try {
      const { RealtimeTunnelPanelProvider } = require("./legacy");
      provider = RealtimeTunnelPanelProvider ? new RealtimeTunnelPanelProvider(context) : undefined;
    } catch {
      provider = undefined;
    }
  }
  _provider = provider;

  // 注册命令（委托给 CommandFactory）
  try {
    registerProviderCommands({ factoryContext, commandFactory: services.commands as any, provider }, context);
  } catch {}

  // 复刻原 activate 的后置启动逻辑（简化版，保持可运行）
  try { provider?.startLocalApiServer?.(); } catch {}
  try { void provider?.reconcileStalePlanRunOperations?.({ reason: "activation" }); } catch {}
  try { void provider?.runActivationOnboarding?.(); } catch {}
  setTimeout(() => { try { void provider?.checkRemoteAgentVersionAndNotify?.(false); } catch {} }, 8000);

  // 配置变更监听（与原逻辑一致）
  try {
    const vscode = require("vscode");
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: unknown) => void (provider as any)?.handleConfigurationChanged?.(e)));
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => void (provider as any)?.handleWorkspaceFoldersChanged?.()));
  } catch {}
}

export function deactivate(): void {
  try { (_provider as any)?.dispose?.(); } catch {}
  _provider = undefined;
}

export function getProvider(): unknown { return _provider; }
