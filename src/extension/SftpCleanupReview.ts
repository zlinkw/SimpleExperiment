import * as vscode from "vscode";
import { randomBytes } from "node:crypto";

/** The MCP never supplies confirmation factors. Only this local human review bridge can do so. */
export function openSftpCleanupReview(root: string, initial: any, call: (method: string, params: Record<string, any>) => Promise<any>): void {
  const panel = vscode.window.createWebviewPanel("simpleExperiment.fileCleanupReview", "精确文件路径审核", vscode.ViewColumn.Active, { enableScripts: true });
  const nonce = randomBytes(16).toString("hex");
  let busy = false;
  const reply = (value: unknown) => panel.webview.postMessage(value);
  const subscription = panel.webview.onDidReceiveMessage(async message => {
    if (busy || message?.type !== "confirm") return;
    busy = true;
    try {
      if (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath !== root) throw Error("WORKSPACE_CHANGED");
      const current = await call("files.cleanup.status", { token: initial.token });
      if (current.digest !== initial.digest || JSON.stringify(current.node) !== JSON.stringify(initial.node)) throw Error("CLEANUP_TARGET_CHANGED");
      const phase = current.confirmations + 1;
      if (message.phase !== phase || phase > (current.action === "delete" ? 2 : 1)) throw Error("CONFIRM_REQUIRED");
      const result = await call("files.cleanup.confirm", { token: current.token, digest: current.digest, phase, confirm: true,
        exactTargets: current.targets.filter((target: any) => !target.missing).map((target: any) => target.absolutePath) });
      await reply({ type: "confirmed", phase: result.confirmations, required: current.action === "delete" ? 2 : 1 });
    } catch (error: any) { await reply({ type: "error", message: String(error.message || error) }); }
    finally { busy = false; }
  });
  panel.onDidDispose(() => subscription.dispose());
  const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
  const required = initial.action === "delete" ? 2 : 1;
  panel.webview.html = `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'"><style>
body{font:var(--vscode-font-size) var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:20px}td,th{border:1px solid var(--vscode-panel-border);padding:8px;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse}button{padding:10px;margin-top:16px}.path{white-space:pre-wrap}#message{white-space:pre-wrap}
</style></head><body><h2 id="title">路径审核</h2><p>项目：${escape(root)}</p><p>节点：${escape(JSON.stringify(initial.node))}</p><p>操作：${escape(initial.action)}。请完整核对下列精确路径。审核后由 AI 接续同一个请求；本页只保存确认，不自动删除。</p><table><thead><tr><th>类型</th><th>精确路径</th><th>状态</th></tr></thead><tbody>${initial.targets.map((target: any) => `<tr><td>${escape(target.type)}</td><td class="path">${escape(target.absolutePath)}</td><td>${target.missing ? "不存在，不执行" : "待审核"}</td></tr>`).join("")}</tbody></table><p id="message"></p><button id="confirm">确认以上精确路径</button><script nonce="${nonce}">
const api=acquireVsCodeApi(),required=${required};let phase=${Number(initial.confirmations) || 0};const button=document.getElementById('confirm'),title=document.getElementById('title'),message=document.getElementById('message');
function render(){title.textContent='路径审核 '+Math.min(phase+1,required)+' / '+required;button.disabled=phase>=required;button.textContent=phase>=required?'审核已完成':phase===0?'第一次确认以上精确路径':'第二次确认：永久删除以上路径';message.textContent=phase>=required?'已保存确认。AI 可接续原请求并主动查询最终结果。':'确认 '+(phase+1)+' / '+required+'：请逐项核对路径。';}
button.onclick=()=>{button.disabled=true;api.postMessage({type:'confirm',phase:phase+1});};window.addEventListener('message',event=>{const value=event.data;if(value.type==='confirmed'){phase=value.phase;render();}else if(value.type==='error'){message.textContent=value.message;button.disabled=false;}});render();
</script></body></html>`;
}
