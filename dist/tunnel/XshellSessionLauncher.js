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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildXshellSavedSessionPreview = buildXshellSavedSessionPreview;
exports.launchXshellSavedSession = launchXshellSavedSession;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
function buildXshellSavedSessionPreview(request) {
    validateXshellSavedSessionRequest(request);
    return [windowsQuote(request.exePath), windowsQuote(request.sessionPath)].join(" ");
}
async function launchXshellSavedSession(request) {
    const commandPreview = buildXshellSavedSessionPreview(request);
    return new Promise((resolve) => {
        let settled = false;
        const child = (0, child_process_1.spawn)(request.exePath, [request.sessionPath], {
            detached: false,
            windowsHide: false,
            stdio: "ignore",
        });
        const settle = (result) => {
            if (settled)
                return;
            settled = true;
            resolve(result);
        };
        child.once("error", (error) => settle({
            attempted: true,
            launched: false,
            commandPreview,
            message: `${request.displayName || "Xshell"} 会话启动失败。`,
            error: error.message,
        }));
        setTimeout(() => settle({
            attempted: true,
            launched: true,
            pid: child.pid,
            commandPreview,
            message: `${request.displayName || "Xshell"} 会话启动命令已发出。`,
        }), 300).unref?.();
    });
}
function validateXshellSavedSessionRequest(request) {
    if (path.basename(request.exePath || "").toLowerCase() !== "xshell.exe")
        throw new Error("需要配置 Xshell.exe。");
    if (!request.sessionPath?.trim())
        throw new Error("需要选择 Xshell .xsh 会话文件。");
}
function windowsQuote(value) {
    return /[\s"]/g.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}
