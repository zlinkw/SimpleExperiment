"use strict";
/**
 * 保留的显式目标 tmux 帮助器。插件主流程使用 Agent/SimpleSFTP API。
 * 目标必须由调用方按当前配置明确提供，不能猜测其他用户的主终端。
 */
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
exports.tmuxExecViaBuffer = tmuxExecViaBuffer;
exports.tmuxCapturePane = tmuxCapturePane;
exports.assertTmuxPaneAlive = assertTmuxPaneAlive;
const child_process = __importStar(require("child_process"));
const DEFAULT_HOST = "";
function requireTmuxTarget(value) {
    const target = String(value || "").trim();
    if (!/^(?:[@%][0-9]+|[A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+)$/.test(target))
        throw new Error("TMUX_TARGET_REQUIRED：请选择精确窗口或 pane；没有可自动附着的缺省目标。");
    return target;
}
// 未配置为专用任务或服务的首窗口不能接收重型调度命令。
function isMainShellTarget(target) {
    const s = String(target || "").trim();
    if (!s)
        return true;
    const managed = s.includes("-sch-") || s.includes("-gpu-") || s.includes("-agent");
    return !managed && /:(?:0|0\.0)$/.test(s);
}
function isHeavySchedulerCommand(command) {
    const c = String(command || "");
    if (c.includes("cluster_scheduler.py") || c.includes("cluster_scheduler") || c.includes("SIMPLE_TMUX_READY") || c.includes("SIMPLE_EXPERIMENT_TMUX") || c.includes("SIMPLE_EXPERIMENT_EXIT_CODE"))
        return true;
    if (c.includes("conda activate"))
        return true;
    if (/^\s*cd\s+/.test(c) && c.includes("/data"))
        return true;
    if (c.includes("printf") && c.includes("exit_code"))
        return true;
    return false;
}
function buildTmuxRemoteCommand(target) {
    return `tmux load-buffer -; tmux paste-buffer -t ${target}; tmux send-keys -t ${target} Enter`;
}
function tmuxExecViaBuffer(command, options = {}) {
    const host = String(options.host || DEFAULT_HOST).trim();
    if (!host)
        throw new Error("tmux host 未配置：请按拓扑传入 worker/host 配置");
    const target = requireTmuxTarget(options.target);
    if (isMainShellTarget(target) && isHeavySchedulerCommand(command)) {
        throw new Error(`refusing heavy scheduler command on main shell target ${target}: ${String(command).slice(0, 120)}`);
    }
    const remote = buildTmuxRemoteCommand(target);
    return new Promise((resolve, reject) => {
        const proc = child_process.spawn("ssh.exe", [host, remote], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        proc.stdout?.on("data", (d) => (stdout += String(d)));
        proc.stderr?.on("data", (d) => (stderr += String(d)));
        proc.on("error", reject);
        proc.on("close", (code) => resolve({ stdout, stderr, exitCode: code ?? 1 }));
        proc.stdin?.write(command, "utf8");
        proc.stdin?.end();
    });
}
function tmuxCapturePane(host, target, lines = 80) {
    if (!String(host || "").trim())
        throw new Error("tmux host 未配置");
    const exactTarget = requireTmuxTarget(target);
    return new Promise((resolve, reject) => {
        const proc = child_process.spawn("ssh.exe", [host, `tmux capture-pane -pt ${exactTarget} -S -${lines}`], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
        let out = "";
        let err = "";
        proc.stdout?.on("data", (d) => (out += String(d)));
        proc.stderr?.on("data", (d) => (err += String(d)));
        proc.on("error", reject);
        proc.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(err || `capture failed ${code}`))));
    });
}
// 核实调用方选定的 pane 是否存在。
async function assertTmuxPaneAlive(host, target) {
    if (!String(host || "").trim())
        throw new Error("tmux host 未配置");
    const exactTarget = requireTmuxTarget(target);
    const inspect = `tmux display-message -p -t ${exactTarget} '#{session_name}:#{window_index}.#{pane_index}'`;
    await new Promise((resolve, reject) => {
        child_process.execFile("ssh.exe", [host, inspect], { windowsHide: true }, (err, stdout) => {
            if (err || !String(stdout).trim())
                reject(new Error(`pane ${exactTarget} not alive on ${host}`));
            else
                resolve();
        });
    });
}
