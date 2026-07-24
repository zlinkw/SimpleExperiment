"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPanelRecoveryHtml = renderPanelRecoveryHtml;
function renderPanelRecoveryHtml(message = "面板脚本启动失败或响应超时。") {
    const nonce = String(Date.now());
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    const escaped = String(message).replace(/[&<>"']/g, (ch) => entities[ch] || ch);
    return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"><style>body{font-family:var(--vscode-font-family);color:var(--vscode-editor-foreground);padding:18px;line-height:1.5}button{color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;border-radius:4px;padding:7px 12px;cursor:pointer}</style></head><body><h3>SimpleExperiment 面板暂时不可用</h3><p>${escaped}</p><button id="reload" type="button">重新加载面板</button><script nonce="${nonce}">const vscode=acquireVsCodeApi();document.getElementById("reload").addEventListener("click",()=>vscode.postMessage({command:"reloadPanel"}));</script></body></html>`;
}
