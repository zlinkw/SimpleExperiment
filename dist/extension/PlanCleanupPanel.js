"use strict";
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
exports.openPlanCleanupPanel = openPlanCleanupPanel;
const vscode = __importStar(require("vscode"));
const node_crypto_1 = require("node:crypto");
async function openPlanCleanupPanel(host, planFile) {
    const panel = vscode.window.createWebviewPanel("simpleExperiment.planCleanup", "清除 PLAN 及关联产物", vscode.ViewColumn.Active, { enableScripts: true });
    const nonce = (0, node_crypto_1.randomBytes)(16).toString("hex");
    panel.webview.html = `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'"><style>
body{font:var(--vscode-font-size) var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:16px}button,select{margin:4px;padding:6px}table{border-collapse:collapse;width:100%}td,th{border:1px solid var(--vscode-panel-border);padding:6px;text-align:left;overflow-wrap:anywhere}code{font-size:11px}summary{cursor:pointer}#status{white-space:pre-wrap}.warning{color:var(--vscode-editorWarning-foreground)}
</style></head><body><h2>清除 PLAN 及关联产物</h2><p>默认移入各安全根 clean_dir，保留恢复证据。活动任务不会自动停止。共享资产和正式/历史结果保留。</p>
<select id="action"><option value="move">移入 clean_dir（可恢复）</option><option value="delete">永久删除（不可恢复，两次完整路径确认）</option></select>
<label><input type="checkbox" id="partial">仅处理已验证节点（结论为部分完成）</label><button id="preview">完整预览</button>
<p><select id="history"><option value="">历史清理操作</option></select><button id="load">查看状态/恢复</button></p><p id="status" role="status"></p><div id="review"></div><button id="confirm" disabled>确认完整路径</button><button id="execute" disabled>执行</button><button id="cancel" disabled>暂停操作</button><button id="resume" disabled>幂等恢复未完成项</button><button id="restore" disabled>预览恢复已移动项</button>
<script nonce="${nonce}">
const api=acquireVsCodeApi();let model=null,operationId='',phase=0,busy=false,executing=false;
const get=id=>document.getElementById(id),esc=value=>String(value===undefined?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function send(type){if(type==='execute'||type==='resume'){executing=true;get('execute').disabled=true;get('status').textContent='正在处理已确认的精确目标…'}api.postMessage({type,action:get('action').value,verifiedOnly:get('partial').checked})}
function show(m){model=m;operationId='';phase=0;get('confirm').disabled=!m.rows.some(r=>r.disposition===m.action);get('execute').disabled=true;get('cancel').disabled=get('resume').disabled=get('restore').disabled=true;
get('review').innerHTML='<p>'+esc(m.scope?.planFile||'')+' '+esc(m.scope?.planHash||'')+'</p><p class="warning">'+esc(m.blockers.map(b=>b.code+': '+b.nodeId+' '+b.detail).join(String.fromCharCode(10)))+'</p><table><thead><tr><th>主机 / 端口 / 安全根</th><th>类别 / 精确路径 / 类型 / 大小</th><th>指纹 / 所有权 / 依赖</th><th>处理方式</th></tr></thead><tbody>'+m.rows.map(r=>'<tr><td>'+esc(r.node.id+' '+(r.node.user||'当前本机用户')+'@'+(r.node.host||'本机')+':'+(r.node.port||'')+' '+r.node.root)+'</td><td>'+esc(r.category||'')+'<br>'+esc(r.absolutePath)+'<br>'+esc(r.type+' '+(r.size===undefined?'未核实':r.size+' bytes'))+'<br>目标：'+esc(r.node.root+'/'+r.destination)+'</td><td><code>'+esc(r.fingerprint||'未核实')+'</code><br>'+esc(r.evidence.join('；'))+'<br>'+esc(r.dependencies.join('；'))+'<details><summary>逐文件清单</summary>'+esc(JSON.stringify(r.inventory||[]))+'</details></td><td>'+esc(r.disposition+' '+(r.protectedReason||r.error||''))+'</td></tr>').join('')+'</tbody></table>';get('confirm').textContent=m.action==='delete'?'第一次确认上述精确路径':'确认上述精确路径';}
get('preview').onclick=()=>send('preview');get('confirm').onclick=()=>{if(model&&!busy){busy=true;api.postMessage({type:'confirm',phase:phase+1})}};
get('execute').onclick=()=>send('execute');get('resume').onclick=()=>send('resume');get('cancel').onclick=()=>send('cancel');get('restore').onclick=()=>send('restore');
get('load').onclick=()=>api.postMessage({type:'status',operationId:get('history').value});
setInterval(()=>{if(executing&&operationId)api.postMessage({type:'poll',operationId})},1000);
get('action').onchange=get('partial').onchange=()=>{model=null;operationId='';get('confirm').disabled=true;get('execute').disabled=true;get('cancel').disabled=get('resume').disabled=get('restore').disabled=true;get('status').textContent='选择已变化，请重新完整预览。'};
window.addEventListener('message',event=>{const m=event.data;busy=false;if(m.type==='progress'){get('status').textContent=m.message;return}if(m.type==='history'){get('history').innerHTML='<option value="">历史清理操作</option>'+m.rows.map(row=>'<option value="'+esc(row.id)+'">'+esc(row.planFile+' '+row.state+' '+row.updatedAt)+'</option>').join('');send('preview')}else if(m.type==='preview'){show(m.preview);get('status').textContent='只读预览完成。核对每个服务器及精确目标后再确认。'}else if(m.type==='confirmed'){operationId=m.operation.id;phase=m.operation.preview.confirmations;get('cancel').disabled=false;get('execute').disabled=phase!==(model.action==='delete'?2:1);get('confirm').disabled=!get('execute').disabled;get('confirm').textContent='第二次确认同一批精确路径';get('status').textContent='路径确认 '+phase+' 次；尚未执行。'}else if(m.type==='operation'){executing=false;show(m.operation.preview);operationId=m.operation.id;get('status').textContent='操作 '+operationId+'：'+m.operation.state+'；保留/未核实 '+model.rows.filter(r=>['protected','unverified'].includes(r.disposition)).length+' 项；未处理节点：'+m.operation.pendingNodes.join('、');get('resume').disabled=m.operation.state==='completed';get('restore').disabled=model.action!=='move'||m.operation.restoredBy||!Object.values(m.operation.targets).some(t=>t.state==='completed');get('cancel').disabled=m.operation.state==='completed';get('execute').disabled=true;get('confirm').disabled=true}else{executing=false;get('status').textContent=m.message||'';get('resume').disabled=!operationId}});send('history');
</script></body></html>`;
    let preview, operationId = "", working = false;
    const subscription = panel.webview.onDidReceiveMessage(async (message) => {
        if (working && !["cancel", "poll"].includes(message.type))
            return;
        if (!["cancel", "poll"].includes(message.type))
            working = true;
        try {
            if (message.type === "poll") {
                const operation = await host.service.status(String(message.operationId || ""));
                const states = Object.values(operation.targets);
                await panel.webview.postMessage({ type: "progress", message: operation.state + " · 已处理 " + states.filter(row => row.state === "completed").length + "/" + states.length });
            }
            else if (message.type === "history") {
                await panel.webview.postMessage({ type: "history", rows: await host.service.list() });
            }
            else if (message.type === "status") {
                const operation = await host.service.status(String(message.operationId || ""));
                operationId = operation.id;
                preview = operation.preview;
                await panel.webview.postMessage({ type: "operation", operation });
            }
            else if (message.type === "preview") {
                preview = await host.service.preview({ planFile, action: message.action, verifiedOnly: message.verifiedOnly });
                await panel.webview.postMessage({ type: "preview", preview });
            }
            else if (message.type === "confirm" && preview) {
                const operation = await host.service.confirm({ token: preview.token, digest: preview.digest, phase: message.phase, confirm: true,
                    exactTargets: preview.rows.filter(row => row.disposition === preview.action).map(row => row.node.id + ":" + row.absolutePath) });
                preview = operation.preview;
                operationId = operation.id;
                await panel.webview.postMessage({ type: "confirmed", operation });
            }
            else if (["execute", "resume"].includes(message.type) && operationId) {
                const operation = await host.execute(operationId);
                await panel.webview.postMessage({ type: "operation", operation });
            }
            else if (message.type === "cancel" && operationId) {
                const operation = await host.service.cancel(operationId);
                await panel.webview.postMessage({ type: "operation", operation });
            }
            else if (message.type === "restore" && operationId) {
                preview = await host.service.restorePreview(operationId);
                await panel.webview.postMessage({ type: "preview", preview });
            }
        }
        catch (error) {
            await panel.webview.postMessage({ type: "error", message: error.message });
        }
        finally {
            if (!["cancel", "poll"].includes(message.type))
                working = false;
        }
    });
    panel.onDidDispose(() => subscription.dispose());
    return panel;
}
