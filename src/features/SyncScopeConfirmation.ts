import * as vscode from "vscode";
import * as crypto from "node:crypto";

export type ConfirmationPath = { label: string; path: string };

function htmlText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function confirmSyncScopePaths(title: string, note: string, paths: ConfirmationPath[], finalLabel: string): Promise<boolean> {
  const panel = vscode.window.createWebviewPanel("simpleExperiment.syncScopeConfirmation", title, vscode.ViewColumn.Active, { enableScripts: true });
  const nonce = crypto.randomBytes(16).toString("base64");
  const rows = paths.map(({ label, path }) => `<div class="path"><strong>${htmlText(label)}</strong><code>${htmlText(path)}</code></div>`).join("");
  panel.webview.html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'">
<style nonce="${nonce}">
body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:20px;max-width:960px;margin:auto}
h2{font-size:18px;margin:0 0 10px}.note{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}.paths{max-height:55vh;overflow:auto;border:1px solid var(--vscode-panel-border);padding:12px;margin:14px 0}.path{padding:9px 0;border-bottom:1px solid var(--vscode-panel-border)}.path:last-child{border:0}
strong{display:block;margin-bottom:5px}code{display:block;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;user-select:text;font:var(--vscode-editor-font-size) var(--vscode-editor-font-family)}
.actions{display:flex;justify-content:flex-end;gap:10px;position:sticky;bottom:0;background:var(--vscode-editor-background);padding:12px 0}button{font:inherit;border:0;padding:7px 12px;cursor:pointer;color:var(--vscode-button-foreground);background:var(--vscode-button-background)}button.secondary{color:var(--vscode-foreground);background:var(--vscode-button-secondaryBackground)}#stage{color:var(--vscode-editorWarning-foreground);font-weight:bold}
</style></head><body><h2>${htmlText(title)}</h2><p id="stage">第一次确认：逐项核对下方完整路径</p><p class="note">${htmlText(note)}</p><div class="paths">${rows}</div>
<div class="actions"><button id="cancel" class="secondary">取消</button><button id="confirm" data-final="${htmlText(finalLabel)}">确认路径并继续</button></div>
<script nonce="${nonce}">const vscode=acquireVsCodeApi();let stage=1;const confirm=document.getElementById('confirm');document.getElementById('cancel').onclick=()=>vscode.postMessage({type:'cancel'});confirm.onclick=()=>vscode.postMessage({type:stage===1?'reviewed':'confirm'});window.addEventListener('message',event=>{if(event.data?.type==='secondStage'){stage=2;document.getElementById('stage').textContent='第二次确认：再次核对完整路径';confirm.textContent=confirm.dataset.final}});</script></body></html>`;
  return new Promise((resolve) => {
    let stage = 1;
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
      panel.dispose();
    };
    panel.onDidDispose(() => finish(false));
    panel.webview.onDidReceiveMessage((message: { type?: string }) => {
      if (message?.type === "cancel") finish(false);
      else if (message?.type === "reviewed" && stage === 1) {
        stage = 2;
        void panel.webview.postMessage({ type: "secondStage" });
      } else if (message?.type === "confirm" && stage === 2) finish(true);
    });
  });
}
