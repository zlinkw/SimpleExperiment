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
// @ts-nocheck
/**
 * src/ui/WebviewRenderState.ts - Facade (RenderState Refactor v0.4.92)
 * 瘦身门面：re-export legacy 保持兼容，新增模块见 src/ui/renderState/
 * 原 328 行已拆分为 renderState/RenderStateTypes + Store + Mapper
 */
__exportStar(require("./WebviewRenderState.legacy"), exports);
