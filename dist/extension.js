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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeTunnelPanelProvider = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
/**
 * src/extension.ts - Facade (Factory Refactor v0.4.92)
 * 瘦身门面：委托给 src/extension/Activation.ts 的工厂化实现
 * 原 22288 行逻辑已迁移至 src/extension/legacy.ts
 */
__exportStar(require("./extension/legacy"), exports);
var legacy_1 = require("./extension/legacy");
Object.defineProperty(exports, "RealtimeTunnelPanelProvider", { enumerable: true, get: function () { return legacy_1.RealtimeTunnelPanelProvider; } });
// 覆盖 activate/deactivate 走工厂路径
const activation = require("./extension/Activation");
async function activate(context) {
    // 工厂激活是异步的；等待结果，避免 Promise rejection 越过同步 try/catch。
    try {
        if (activation && typeof activation.activate === "function") {
            await activation.activate(context);
            return;
        }
    }
    catch (e) {
        console.error("[extension facade] factory activate failed", e);
        // 若新路径已创建 Provider，避免再次注册整套命令与监听器。
        if (typeof activation?.getProvider === "function" && activation.getProvider())
            return;
    }
    const legacy = require("./extension/legacy");
    await legacy.activate(context);
}
async function deactivate() {
    try {
        if (activation && typeof activation.deactivate === "function") {
            await activation.deactivate();
            return;
        }
    }
    catch (error) {
        console.error("[extension facade] factory deactivate failed", error);
    }
    try {
        const legacy = require("./extension/legacy");
        if (typeof legacy.deactivate === "function")
            await legacy.deactivate();
    }
    catch (error) {
        console.error("[extension facade] legacy deactivate failed", error);
    }
}
