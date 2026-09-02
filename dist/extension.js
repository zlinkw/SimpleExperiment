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
exports.activate = activate;
exports.deactivate = deactivate;
// @ts-nocheck
/**
 * src/extension.ts - Facade (Factory Refactor v0.4.92)
 * 瘦身门面：委托给 src/extension/Activation.ts 的工厂化实现
 * 原 22288 行逻辑已迁移至 src/extension/legacy.ts
 */
__exportStar(require("./extension/legacy"), exports);
// 覆盖 activate/deactivate 走工厂路径
const activation = require("./extension/Activation");
function activate(context) {
    // 优先工厂化路径，失败回退 legacy
    try {
        if (activation && typeof activation.activate === "function") {
            return activation.activate(context);
        }
    }
    catch (e) {
        console.error("[extension facade] factory activate failed, fallback to legacy", e);
    }
    const legacy = require("./extension/legacy");
    return legacy.activate(context);
}
function deactivate() {
    try {
        if (activation && typeof activation.deactivate === "function") {
            return activation.deactivate();
        }
    }
    catch { }
    try {
        const legacy = require("./extension/legacy");
        if (typeof legacy.deactivate === "function")
            return legacy.deactivate();
    }
    catch { }
}
