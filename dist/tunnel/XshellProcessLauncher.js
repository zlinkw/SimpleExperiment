"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchXshellTunnelProcess = launchXshellTunnelProcess;
const child_process_1 = require("child_process");
const XshellTunnelCommandBuilder_1 = require("./XshellTunnelCommandBuilder");
async function launchXshellTunnelProcess(config) {
    const preview = (0, XshellTunnelCommandBuilder_1.buildXshellTunnelCommand)(config);
    return new Promise((resolve) => {
        let settled = false;
        const child = (0, child_process_1.spawn)(config.xshellExePath, preview.args, {
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
            commandPreview: preview.redactedShellCommand,
            message: "Xshell 会话启动失败。",
            error: error.message,
        }));
        setTimeout(() => settle({
            attempted: true,
            launched: true,
            pid: child.pid,
            commandPreview: preview.redactedShellCommand,
            message: "Xshell 会话启动命令已发出，请通过本地隧道检测确认是否可用。",
        }), 300).unref?.();
    });
}
