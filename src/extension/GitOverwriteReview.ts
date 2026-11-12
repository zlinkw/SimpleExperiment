import * as vscode from "vscode";
import { randomBytes } from "node:crypto";
import { previewGitOverwrite, assertGitOverwriteCurrent, executeGitOverwrite } from "../project/GitOverwrite";
import { UiCommandCancelled } from "../core/UiCommandCancelled";

export async function reviewGitOverwrite(root: string, call: (method: string, params: Record<string, any>) => Promise<any>): Promise<void> {
  const preview = await previewGitOverwrite(root, call);
  const panel = vscode.window.createWebviewPanel("simpleExperiment.gitOverwriteReview", "Git 工作区覆盖审核", vscode.ViewColumn.Active, { enableScripts: true });
  const nonce = randomBytes(16).toString("hex");
  const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
  let phase = 0, busy = false, settled = false, disposed = false;
  await new Promise<void>((resolve, reject) => {
    const subscription = panel.webview.onDidReceiveMessage(async message => {
      if (busy || settled || message?.type !== "confirm" || message.phase !== phase + 1 || phase >= 2) return;
      busy = true;
      try {
        if (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath !== root) throw Error("WORKSPACE_CHANGED");
        await assertGitOverwriteCurrent(preview);
        if (preview.cleanup) {
          const current = await call("files.cleanup.status", { token: preview.cleanup.token, consumerRoot: preview.root });
          if (current.digest !== preview.cleanup.digest || current.confirmations !== phase) throw Error("CLEANUP_TARGET_CHANGED");
          await call("files.cleanup.confirm", { token: current.token, digest: current.digest, phase: phase + 1, confirm: true, consumerRoot: preview.root,
            exactTargets: current.targets.filter((target: any) => !target.missing).map((target: any) => target.absolutePath) });
        }
        if (disposed) throw new UiCommandCancelled("Git 覆盖审核已关闭，未执行覆盖。");
        phase++;
        await panel.webview.postMessage({ type: "phase", phase });
        if (phase === 2) {
          await executeGitOverwrite(preview, call);
          settled = true;
          await panel.webview.postMessage({ type: "complete" });
          resolve();
        }
      } catch (error: any) {
        settled = true;
        await panel.webview.postMessage({ type: "error", message: String(error.message || error) });
        reject(error);
      } finally {
        busy = false;
        if (disposed && !settled && phase < 2) { settled = true; reject(new UiCommandCancelled("Git 覆盖已取消，未执行覆盖。")); }
      }
    });
    panel.onDidDispose(() => { disposed = true; subscription.dispose(); if (!settled && !busy) { settled = true; reject(new UiCommandCancelled("Git 覆盖已取消，未执行覆盖。")); } });
    const indexRows = preview.indexChanges.filter(file => !preview.writes.includes(file) && !preview.deletes.includes(file))
      .map(file => `<tr><td>仅将暂存区恢复为目标提交，保留当前工作文件</td><td class="path">${escape(preview.root + "/" + file)}</td></tr>`).join("");
    panel.webview.html = `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'"><style>body{font:var(--vscode-font-size) var(--vscode-font-family);padding:20px;color:var(--vscode-foreground);background:var(--vscode-editor-background)}td,th{border:1px solid var(--vscode-panel-border);padding:8px;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%}button{padding:12px;margin-top:20px}.path{white-space:pre-wrap}</style></head><body><h2 id="heading">Git 覆盖审核 1 / 2</h2><p>项目：${escape(preview.root)}</p><p>分支：${escape(preview.branch)}；来源：${escape(preview.upstream)}；目标提交：${escape(preview.target)}</p><p>本页需本人两次确认。第二次确认后执行下列删除和写入，并将当前分支与索引切换到目标提交；未列出的忽略文件保留，空目录保留。不会执行 git clean 或 reset --hard。</p><table><tr><th>操作</th><th>完整路径</th></tr>${preview.deletes.map(file => `<tr><td>永久删除${preview.writes.includes(file) ? "，随后写入远端版本" : ""}</td><td class="path">${escape(preview.root + "/" + file)}</td></tr>`).join("")}${preview.writes.filter(file => !preview.deletes.includes(file)).map(file => `<tr><td>写入远端版本</td><td class="path">${escape(preview.root + "/" + file)}</td></tr>`).join("")}${indexRows}</table><p id="message">请完整核对项目、提交和每条路径。</p><button id="confirm">第一次确认以上精确路径和覆盖目标</button><script nonce="${nonce}">const api=acquireVsCodeApi(),button=document.getElementById('confirm'),heading=document.getElementById('heading'),message=document.getElementById('message');let phase=0;button.onclick=()=>{button.disabled=true;api.postMessage({type:'confirm',phase:phase+1});};window.addEventListener('message',event=>{const value=event.data;if(value.type==='phase'){phase=value.phase;heading.textContent='Git 覆盖审核 2 / 2';button.textContent=phase===1?'第二次确认：永久删除并覆盖以上路径':'正在执行';button.disabled=phase!==1;}else if(value.type==='complete'){message.textContent='已核实覆盖完成。';button.textContent='覆盖已完成';button.disabled=true;}else if(value.type==='error'){message.textContent=value.message;button.disabled=true;}});</script></body></html>`;
  });
}
