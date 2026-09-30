"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPanelRecoveryHtml = renderPanelRecoveryHtml;
exports.renderPanelReloadRequiredHtml = renderPanelReloadRequiredHtml;
function renderPanelRecoveryHtml(message = "面板脚本启动失败或响应超时。") {
    const nonce = String(Date.now());
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    const escaped = String(message).replace(/[&<>"']/g, (ch) => entities[ch] || ch);
    return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"><style>body{font-family:var(--vscode-font-family);color:var(--vscode-editor-foreground);padding:18px;line-height:1.5}button{color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;border-radius:4px;padding:7px 12px;cursor:pointer}</style></head><body><h3>SimpleExperiment 面板暂时不可用</h3><p>${escaped}</p><button id="reload" type="button">重新加载面板</button><script nonce="${nonce}">const vscode=acquireVsCodeApi();document.getElementById("reload").addEventListener("click",()=>vscode.postMessage({command:"reloadPanel"}));</script></body></html>`;
}
function renderPanelReloadRequiredHtml(versions) {
    const nonce = String(Date.now());
    const escape = (value) => String(value || "未知").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
    return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:var(--vscode-font-family);color:var(--vscode-editor-foreground);padding:20px;line-height:1.6}button{color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;border-radius:4px;padding:8px 14px;cursor:pointer}code{font-family:var(--vscode-editor-font-family)}</style></head><body><h2>SimpleExperiment 已更新</h2><p>正在运行：<code>${escape(versions.runningVersion)}</code><br>已安装：<code>${escape(versions.installedVersion)}</code></p><p>需要重载 VS Code 窗口才能切换到新版本。当前项目和运行中的远端任务不会因此重新提交。</p><button id="reload-window" type="button">重载窗口</button><script nonce="${nonce}">const vscode=acquireVsCodeApi();document.getElementById("reload-window").addEventListener("click",()=>vscode.postMessage({command:"reloadWindow"}));</script></body></html>`;
}
