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
exports.openSyncScopeTree = openSyncScopeTree;
const vscode = __importStar(require("vscode"));
const crypto = __importStar(require("node:crypto"));
function openSyncScopeTree(title, roots, refreshIntervalMs) {
    const panel = vscode.window.createWebviewPanel("simpleExperiment.syncScopeTree", title, vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true });
    const nonce = crypto.randomBytes(16).toString("base64");
    panel.webview.html = scopeTreeHtml(nonce);
    panel.webview.onDidReceiveMessage(async (message) => {
        const id = String(message?.id || "");
        const root = roots.find((item) => item.id === message?.rootId);
        try {
            if (message?.type === "ready") {
                await panel.webview.postMessage({ type: "init", roots: roots.map(({ id, label, detail, selected, rootSelectable }) => ({ id, label, detail, selected, rootSelectable })), refreshIntervalMs });
                return;
            }
            if (!root)
                throw new Error("同步范围目标已失效。");
            if (message.type === "list") {
                const relative = String(message.path || ".");
                if (relative !== "." && (relative.startsWith("/") || relative.split("/").some((part) => !part || part === "." || part === "..")))
                    throw new Error("目录路径不安全。");
                await panel.webview.postMessage({ type: "children", id, rootId: root.id, path: relative, entries: await root.list(relative) });
            }
            else if (message.type === "refresh") {
                await panel.webview.postMessage({ type: "status", id, rootId: root.id, statuses: await root.refresh(), refreshedAt: new Date().toISOString() });
            }
            else if (message.type === "save") {
                const paths = Array.isArray(message.paths) ? message.paths.map(String) : [];
                if (paths.some((value) => value !== "." && (value.startsWith("/") || value.split("/").some((part) => !part || part === "." || part === ".."))))
                    throw new Error("选择路径不安全。");
                await root.save(paths);
                root.selected = paths;
                await panel.webview.postMessage({ type: "saved", id, rootId: root.id, paths });
            }
        }
        catch (error) {
            await panel.webview.postMessage({ type: "error", id, message: error instanceof Error ? error.message : String(error) });
        }
    });
}
function scopeTreeHtml(nonce) {
    return String.raw `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'">
<style nonce="${nonce}">
body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:16px}
h2{font-size:16px;margin:0 0 10px}.muted{color:var(--vscode-descriptionForeground);margin:6px 0 12px}
#tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}button{font:inherit;color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;padding:5px 10px;cursor:pointer}
button.secondary{color:var(--vscode-foreground);background:var(--vscode-button-secondaryBackground)}button.active{outline:1px solid var(--vscode-focusBorder)}
#tree{border:1px solid var(--vscode-panel-border);max-height:65vh;overflow:auto;padding:6px}.row{display:flex;align-items:center;min-height:25px;gap:5px;white-space:nowrap}
.row label{cursor:pointer}.row input{accent-color:var(--vscode-focusBorder)}.twisty{width:21px;min-width:21px;text-align:center;padding:0;background:transparent;color:var(--vscode-foreground)}
#status{min-height:20px;margin:8px 0;color:var(--vscode-descriptionForeground)}#save{margin-top:8px}.badge{margin-left:10px;font-size:12px;white-space:normal}.badge span{margin-right:6px}.same{color:var(--vscode-testing-iconPassed,#43a047)}.different{color:var(--vscode-testing-iconFailed,#e53935)}.remote-only{color:var(--vscode-editorWarning-foreground,#d9822b)}.unknown{color:var(--vscode-descriptionForeground)}
</style></head><body><h2>同步范围</h2><div class="muted">按目录展开，勾选文件或整个目录；选中目录包含其中所有文件。机器状态目录始终排除。选择按路径保存，不限制文件类型和大小。</div><div class="muted"><span class="same">绿色：本机及 Worker 同版</span>　<span class="remote-only">橙色：Worker 同版，本机缺失或不同</span>　<span class="different">红色：待更新或内容冲突</span></div><div id="tabs"></div><div id="detail" class="muted"></div><button id="refresh" class="secondary">刷新同步状态</button><div id="tree"></div><div id="status" role="status"></div><button id="save">保存当前范围</button>
<script nonce="${nonce}">
const vscode=acquireVsCodeApi();let roots=[],active=null,serial=0,refreshInterval=10000,refreshing=false;const views=new Map();
const tabs=document.getElementById('tabs'),tree=document.getElementById('tree'),status=document.getElementById('status'),detail=document.getElementById('detail');
function state(){return views.get(active.id)}
function selected(path){const set=state().selected;return [...set].some(item=>item==='.'||item===path||path.startsWith(item+'/'))}
function childSelected(path){return [...state().selected].some(item=>item.startsWith(path+'/'))}
function setSelection(path,checked){const set=state().selected;if(checked){for(const item of [...set])if(item===path||item.startsWith(path+'/'))set.delete(item);set.add(path)}else{set.delete(path);for(const item of [...set])if(item.startsWith(path+'/'))set.delete(item)}renderTree()}
function paintStatus(badge,health,directory){if(!health){badge.textContent='待刷新';return}if(directory){badge.textContent=health.detail;return}for(const part of health.detail.split(' · ')){const item=document.createElement('span');item.textContent=part;item.className=part.includes('最新版')||part.includes('同版')?'same':part.includes('待更新')||part.includes('冲突')||part.includes('缺失')&&!part.startsWith('本机')?'different':part.includes('缺失')||part.includes('不同版')?'remote-only':'unknown';badge.appendChild(item)}}
function row(entry,depth){const el=document.createElement('div');el.className='row';el.style.paddingLeft=(depth*18)+'px';const toggle=document.createElement('button');toggle.className='twisty';toggle.textContent=entry.directory?(state().expanded.has(entry.path)?'▾':'▸'):' ';toggle.disabled=!entry.directory;toggle.onclick=()=>{if(state().expanded.has(entry.path)){state().expanded.delete(entry.path);renderTree()}else{state().expanded.add(entry.path);load(entry.path)}};el.appendChild(toggle);const box=document.createElement('input');box.type='checkbox';box.checked=selected(entry.path);box.indeterminate=!box.checked&&childSelected(entry.path);box.disabled=entry.selectable===false||entry.path!=='.'&&[...state().selected].some(item=>item==='.'||item!==entry.path&&entry.path.startsWith(item+'/'));box.onchange=()=>setSelection(entry.path,box.checked);el.appendChild(box);const label=document.createElement('label');label.textContent=(entry.directory?'📁 ':'📄 ')+entry.name;label.onclick=()=>entry.directory&&toggle.click();el.appendChild(label);const health=state().statuses[entry.path];const badge=document.createElement('span');badge.className='badge '+(health?.state||'unknown');paintStatus(badge,health,entry.directory);el.appendChild(badge);tree.appendChild(el);if(entry.directory&&state().expanded.has(entry.path)){const children=state().children.get(entry.path);if(children)children.forEach(child=>row(child,depth+1));else{const wait=document.createElement('div');wait.className='muted';wait.style.paddingLeft=((depth+1)*18)+'px';wait.textContent='读取中…';tree.appendChild(wait)}}}
function renderTree(){if(!active)return;tree.replaceChildren();row({name:active.label,path:'.',directory:true,selectable:active.rootSelectable!==false},0)}
function renderTabs(){tabs.replaceChildren();for(const root of roots){const button=document.createElement('button');button.textContent=root.label;button.className=root.id===active?.id?'active':'secondary';button.onclick=()=>{active=root;detail.textContent=root.detail;renderTabs();renderTree();refresh()};tabs.appendChild(button)}}
function load(path){const id=String(++serial);vscode.postMessage({type:'list',id,rootId:active.id,path})}
function refresh(){if(!active||refreshing)return;refreshing=true;status.textContent='正在按内容校验同步状态…';vscode.postMessage({type:'refresh',id:String(++serial),rootId:active.id})}
document.getElementById('refresh').onclick=refresh;
document.getElementById('save').onclick=()=>{if(!active)return;status.textContent='保存中…';vscode.postMessage({type:'save',id:String(++serial),rootId:active.id,paths:[...state().selected].sort()})};
window.addEventListener('message',event=>{const message=event.data;if(message.type==='init'){roots=message.roots;refreshInterval=Number(message.refreshIntervalMs)||10000;for(const root of roots)views.set(root.id,{selected:new Set(root.selected),expanded:new Set(['.']),children:new Map(),statuses:{}});active=roots[0];renderTabs();detail.textContent=active.detail;renderTree();load('.');setInterval(()=>{if(!document.hidden)refresh()},refreshInterval)}else if(message.type==='children'){const view=views.get(message.rootId);if(!view)return;view.children.set(message.path,message.entries);if(active?.id===message.rootId){renderTree();if(message.path==='.'&&!Object.keys(view.statuses).length)refresh()}}else if(message.type==='status'){refreshing=false;const view=views.get(message.rootId);if(view)view.statuses=message.statuses||{};status.textContent='已刷新：'+message.refreshedAt;if(active?.id===message.rootId)renderTree()}else if(message.type==='saved'){status.textContent='已保存 '+message.paths.length+' 条路径';refresh()}else if(message.type==='error'){refreshing=false;status.textContent='失败：'+message.message}});
vscode.postMessage({type:'ready'});
</script></body></html>`;
}
