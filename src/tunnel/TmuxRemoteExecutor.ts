/**
 * TmuxRemoteExecutor — 远端指令唯一入口
 * 所有远端命令必须经此封装走 tmux load-buffer/paste-buffer 围栏，禁止直接 ssh "command" 在宿主 shell 执行
 * 约束来源：docs/troubleshooting.md#tmux-围栏 与 zlk-server-tmux Skill
 */

import * as child_process from "child_process";

export interface TmuxRemoteOptions {
  host?: string; // 默认 NWPU3
  target?: string; // 默认 zlk1:0.0
  timeoutMs?: number;
}

const DEFAULT_HOST = "NWPU3";
const DEFAULT_TARGET = "zlk1:0.0";

function buildTmuxRemoteCommand(target: string): string {
  return `tmux load-buffer -; tmux paste-buffer -t ${target}; tmux send-keys -t ${target} Enter`;
}

export function tmuxExecViaBuffer(command: string, options: TmuxRemoteOptions = {}): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const host = options.host || DEFAULT_HOST;
  const target = options.target || DEFAULT_TARGET;
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

export function tmuxCapturePane(host: string = DEFAULT_HOST, target: string = DEFAULT_TARGET, lines: number = 80): Promise<string> {
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
export async function assertTmuxPaneAlive(host: string = DEFAULT_HOST, target: string = DEFAULT_TARGET): Promise<void> {
  const inspect = `tmux display-message -p -t ${target} '#{session_name}:#{window_index}.#{pane_index} #{pane_current_path}'`;
  await new Promise<void>((resolve, reject) => {
    child_process.exec(`ssh.exe ${host} "${inspect}"`, (err, stdout) => {
      if (err || !String(stdout).includes(target.split(":")[0])) reject(new Error(`pane ${target} not alive on ${host}`));
      else resolve();
    });
  });
}
