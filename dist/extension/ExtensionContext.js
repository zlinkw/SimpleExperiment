"use strict";
// @ts-nocheck
/**
 * ExtensionContext - 扩展上下文封装 (Phase 2 模块化)
 * 搬运自 src/extension.ts 的上下文访问逻辑，不改原逻辑，仅通过 FactoryContext 注入。
 * 职责：封装 vscode.ExtensionContext 的工厂化访问，供 ServiceFactory / Activation 统一组装。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toFactoryContext = toFactoryContext;
exports.createExtensionContextFacade = createExtensionContextFacade;
exports.getGlobalStateValue = getGlobalStateValue;
exports.updateGlobalState = updateGlobalState;
exports.getWorkspaceStateValue = getWorkspaceStateValue;
exports.updateWorkspaceState = updateWorkspaceState;
exports.extensionContextKeys = extensionContextKeys;
/**
 * 将 vscode.ExtensionContext 适配为 FactoryContext
 * 原逻辑搬运自 extension.ts 中多处对 context.globalState / workspaceState 的直接访问
 */
function toFactoryContext(vscodeContext, overrides = {}) {
    return {
        extensionUri: vscodeContext.extensionUri ?? vscodeContext.extensionPath,
        globalState: vscodeContext.globalState,
        workspaceState: vscodeContext.workspaceState,
        secrets: vscodeContext.secrets,
        // 透传常见扩展字段，保持渐进兼容
        extensionPath: vscodeContext.extensionPath,
        subscriptions: vscodeContext.subscriptions,
        ...overrides,
    };
}
function createExtensionContextFacade(vscodeContext) {
    return vscodeContext;
}
function getGlobalStateValue(ctx, key, defaultValue) {
    try {
        return ctx.globalState.get(key, defaultValue);
    }
    catch {
        return defaultValue;
    }
}
async function updateGlobalState(ctx, key, value) {
    try {
        await ctx.globalState.update(key, value);
    }
    catch { }
}
function getWorkspaceStateValue(ctx, key, defaultValue) {
    try {
        return ctx.workspaceState.get(key, defaultValue);
    }
    catch {
        return defaultValue;
    }
}
async function updateWorkspaceState(ctx, key, value) {
    try {
        await ctx.workspaceState.update(key, value);
    }
    catch { }
}
function extensionContextKeys() {
    // 搬运自 extension.ts 顶部 keys 常量的子集，保持兼容门面可运行
    return {
        setupConfig: "simpleExperiment.setupConfig",
        tunnelConfig: "simpleExperiment.tunnelConfig",
        projectOnboardingPrompt: "simpleExperiment.projectOnboardingPrompt",
        projectOnboardingCompleted: "simpleExperiment.projectOnboardingCompleted",
    };
}
