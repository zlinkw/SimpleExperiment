/**
 * 保留的显式目标 tmux 帮助器。插件主流程使用 Agent/SimpleSFTP API。
 * 目标必须由调用方按当前配置明确提供，不能猜测其他用户的主终端。
 */

import * as child_process from "child_process";

export interface TmuxRemoteOptions {
  host?: string; // 需由调用方按拓扑配置传入，无默认值
  target?: string; // 精确窗口或 pane，无缺省目标
  timeoutMs?: number;
}

const DEFAULT_HOST = "";
function requireTmuxTarget(value?: string): string {
  const target = String(value || "").trim();
  if (!/^(?:[@%][0-9]+|[A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+)$/.test(target))
    throw new Error("TMUX_TARGET_REQUIRED：请选择精确窗口或 pane；没有可自动附着的缺省目标。");
  return target;
}

// 未配置为专用任务或服务的首窗口不能接收重型调度命令。
function isMainShellTarget(target: string): boolean {
  const s = String(target || "").trim();
  if (!s) return true;
  const managed = s.includes("-sch-") || s.includes("-gpu-") || s.includes("-agent");
  return !managed && /:(?:0|0\.0)$/.test(s);
}
function isHeavySchedulerCommand(command: string): boolean {
  const c = String(command || "");
  if (c.includes("cluster_scheduler.py") || c.includes("cluster_scheduler") || c.includes("SIMPLE_TMUX_READY") || c.includes("SIMPLE_EXPERIMENT_TMUX") || c.includes("SIMPLE_EXPERIMENT_EXIT_CODE")) return true;
  if (c.includes("conda activate")) return true;
  if (/^\s*cd\s+/.test(c) && c.includes("/data")) return true;
  if (c.includes("printf") && c.includes("exit_code")) return true;
  return false;
}

function buildTmuxRemoteCommand(target: string): string {
  return `tmux load-buffer -; tmux paste-buffer -t ${target}; tmux send-keys -t ${target} Enter`;
}

export function tmuxExecViaBuffer(command: string, options: TmuxRemoteOptions = {}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const host = String(options.host || DEFAULT_HOST).trim();
  if (!host) throw new Error("tmux host 未配置：请按拓扑传入 worker/host 配置");
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

export function tmuxCapturePane(host: string, target?: string, lines: number = 80): Promise<string> {
  if (!String(host || "").trim()) throw new Error("tmux host 未配置");
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
export async function assertTmuxPaneAlive(host: string, target?: string): Promise<void> {
  if (!String(host || "").trim()) throw new Error("tmux host 未配置");
  const exactTarget = requireTmuxTarget(target);
  const inspect = `tmux display-message -p -t ${exactTarget} '#{session_name}:#{window_index}.#{pane_index}'`;
  await new Promise<void>((resolve, reject) => {
    child_process.execFile("ssh.exe", [host, inspect], { windowsHide: true }, (err, stdout) => {
      if (err || !String(stdout).trim()) reject(new Error(`pane ${exactTarget} not alive on ${host}`));
      else resolve();
    });
  });
}
