"use strict";
/**
 * TmuxRemoteExecutor — 远端指令唯一入口
 * 所有远端命令必须经此封装走 tmux load-buffer/paste-buffer 围栏，禁止直接 ssh "command" 在宿主 shell 执行
 * 约束来源：docs/troubleshooting.md#tmux-围栏 与 zlk-server-tmux Skill
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
const DEFAULT_TARGET = "zlk1:0.0";
// 围栏：禁止重型调度/agent 指令落入主 shell zlk1:0.0（仅允许 zlk-sch-*/zlk-gpu-*/zlk-worker-*-agent 等子窗口）
function isMainShellTarget(target) {
    const s = String(target || "").trim();
    if (!s)
        return true;
    if (s === "zlk1:0.0" || s === "zlk1:0" || s === "0.0")
        return true;
    if (s.startsWith("zlk1") && !s.includes("-sch-") && !s.includes("-gpu-") && !s.includes("-agent"))
        return true;
    if (s.endsWith(":0.0") && !s.includes("-sch-") && !s.includes("-gpu-") && !s.includes("-agent"))
        return true;
    return false;
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
    const target = options.target || DEFAULT_TARGET;
    if (isMainShellTarget(target) && isHeavySchedulerCommand(command)) {
        throw new Error(`refusing heavy scheduler command on main shell target ${target}: ${String(command).slice(0, 120)}`);
    }
    const remote = buildTmuxRemoteCommand(target);
    return new Promise((resolve, reject) => {
        const proc = child_process.spawn("ssh.exe", [host, remote], { stdio: ["pipe", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        proc.stdout?.on("data", (d) => (stdout += String(d)));
        proc.stderr?.on("data", (d) => (stderr += String(d)));
        proc.on("error", reject);
        proc.on("close", (code) => resolve({ stdout, stderr, exitCode: code ?? 0 }));
        proc.stdin?.write(command, "utf8");
        proc.stdin?.end();
    });
}
function tmuxCapturePane(host, target = DEFAULT_TARGET, lines = 80) {
    return new Promise((resolve, reject) => {
        const proc = child_process.spawn("ssh.exe", [host, `tmux capture-pane -pt ${target} -S -${lines}`], { stdio: ["pipe", "pipe", "pipe"] });
        let out = "";
        let err = "";
        proc.stdout?.on("data", (d) => (out += String(d)));
        proc.stderr?.on("data", (d) => (err += String(d)));
        proc.on("error", reject);
        proc.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(err || `capture failed ${code}`))));
    });
}
// 兼容旧调用：提供同步校验 pane 存在的 helper
async function assertTmuxPaneAlive(host, target = DEFAULT_TARGET) {
    const inspect = `tmux display-message -p -t ${target} '#{session_name}:#{window_index}.#{pane_index} #{pane_current_path}'`;
    await new Promise((resolve, reject) => {
        child_process.exec(`ssh.exe ${host} "${inspect}"`, (err, stdout) => {
            if (err || !String(stdout).includes(target.split(":")[0]))
                reject(new Error(`pane ${target} not alive on ${host}`));
            else
                resolve();
        });
    });
}
