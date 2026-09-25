import * as vscode from "vscode";
import * as crypto from "node:crypto";

export type ScopeEntry = { name: string; path: string; directory: boolean; selectable?: boolean; locations?: string[]; held?: boolean };
export type ScopeStatus = { state: "same" | "different" | "remote-only" | "unknown"; detail: string; versions?: Record<string, { sha256: string; modifiedAtMs: number; latest?: "plan" | "local" | "candidate" | "same" | "manual" }>; copies?: Record<string, { modifiedAtMs: number; present: number; missing: number; needsSync: number; conflict: number; unverified: number }>; held?: boolean; unverified?: boolean };
export type ScopeRoot = {
  id: string;
  label: string;
  detail: string;
  selected: string[];
  rootSelectable?: boolean;
  excludable?: boolean;
  list: (relative: string) => Promise<ScopeEntry[]>;
  refresh: (relative: string) => Promise<Record<string, ScopeStatus>>;
  save: (paths: string[], excluded?: string[]) => Promise<void>;
  remove?: (relative: string, endpointId: string, directory: boolean, report?: (stage: string) => void) => Promise<boolean | void>;
  removeAllWorkers?: (relative: string, directory: boolean, report?: (stage: string) => void) => Promise<boolean | void>;
  retain?: (relative: string, endpointId: string, directory: boolean, report?: (stage: string) => void) => Promise<boolean | void>;
};

export function openSyncScopeTree(title: string, roots: ScopeRoot[]): void {
  const panel = vscode.window.createWebviewPanel("simpleExperiment.syncScopeTree", title, vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true });
  const nonce = crypto.randomBytes(16).toString("base64");
  panel.webview.html = scopeTreeHtml(nonce);
  panel.webview.onDidReceiveMessage(async (message: any) => {
    const id = String(message?.id || "");
    const root = roots.find((item) => item.id === message?.rootId);
    try {
      if (message?.type === "ready") {
        await panel.webview.postMessage({ type: "init", roots: roots.map(({ id, label, detail, selected, rootSelectable, excludable }) => ({ id, label, detail, selected, rootSelectable, excludable })) });
        return;
      }
      if (!root) throw new Error("同步范围目标已失效。");
      if (message.type === "list") {
        const relative = String(message.path || ".");
        if (relative !== "." && (relative.startsWith("/") || relative.split("/").some((part: string) => !part || part === "." || part === "..")))
          throw new Error("目录路径不安全。");
        await panel.webview.postMessage({ type: "children", id, rootId: root.id, path: relative, entries: await root.list(relative) });
      } else if (message.type === "refresh") {
        const relative = String(message.path || ".");
        if (relative !== "." && (relative.startsWith("/") || relative.split("/").some((part: string) => !part || part === "." || part === "..")))
          throw new Error("校验目录路径不安全。");
        await panel.webview.postMessage({ type: "status", id, rootId: root.id, path: relative, statuses: await root.refresh(relative), refreshedAt: new Date().toISOString() });
      } else if (message.type === "save") {
        const paths = Array.isArray(message.paths) ? message.paths.map(String) : [];
        const excluded = Array.isArray(message.excluded) ? message.excluded.map(String) : [];
        if (paths.some((value: string) => value !== "." && (value.startsWith("/") || value.split("/").some((part: string) => !part || part === "." || part === ".."))))
          throw new Error("选择路径不安全。");
        if (excluded.some((value: string) => !value || value === "." || value.startsWith("/") || value.split("/").some((part: string) => !part || part === "." || part === "..")))
          throw new Error("排除路径不安全。");
        await root.save(paths, excluded);
        root.selected = paths;
        await panel.webview.postMessage({ type: "saved", id, rootId: root.id, paths });
      } else if (message.type === "remove" || message.type === "removeAllWorkers" || message.type === "retain") {
        const relative = String(message.path || "");
        if (!relative || relative === "." || relative.startsWith("/") || relative.split("/").some((part: string) => !part || part === "." || part === "..")) throw new Error("操作路径不安全。");
        const endpointId = String(message.endpointId || "");
        if (message.type !== "removeAllWorkers" && !endpointId) throw new Error("请明确选择一个目标位置。");
        let changed: boolean | void;
        const report = (stage: string) => { void panel.webview.postMessage({ type: "actionProgress", id, rootId: root.id, path: relative, stage }); };
        if (message.type === "remove") {
          if (!root.remove) throw new Error("当前范围不支持删除。");
          changed = await root.remove(relative, endpointId, message.directory === true, report);
        } else if (message.type === "removeAllWorkers") {
          if (!root.removeAllWorkers) throw new Error("当前范围不支持批量删除。");
          changed = await root.removeAllWorkers(relative, message.directory === true, report);
        } else {
          if (!root.retain) throw new Error("当前范围不支持选定版本。");
          changed = await root.retain(relative, endpointId, message.directory === true, report);
        }
        await panel.webview.postMessage({ type: changed === false ? "actionCancelled" : "actionDone", id, rootId: root.id, path: relative, action: message.type, directory: message.directory === true });
      }
    } catch (error) {
      await panel.webview.postMessage({ type: "error", id, requestType: message?.type, rootId: root?.id, path: String(message?.path || "."), message: error instanceof Error ? error.message : String(error) });
    }
  });
}

function scopeTreeHtml(nonce: string): string {
  return String.raw`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'">
<style nonce="${nonce}">
body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:16px}
h2{font-size:16px;margin:0 0 10px}.muted{color:var(--vscode-descriptionForeground);margin:6px 0 12px}
#tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}button{font:inherit;color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;padding:5px 10px;cursor:pointer}
button.secondary{color:var(--vscode-foreground);background:var(--vscode-button-secondaryBackground)}button.active{outline:1px solid var(--vscode-focusBorder)}
#tree{border:1px solid var(--vscode-panel-border);max-height:65vh;overflow:auto;padding:6px}.row{display:flex;align-items:center;min-height:30px;gap:7px;white-space:nowrap;border-radius:3px}.row:hover{background:var(--vscode-list-hoverBackground)}
.row label{cursor:pointer;min-width:150px;max-width:32%;overflow:hidden;text-overflow:ellipsis}.row .name.same{color:var(--vscode-testing-iconPassed,#43a047)}.row .name.different{color:var(--vscode-testing-iconFailed,#e53935)}.row .name.remote-only{color:var(--vscode-editorWarning-foreground,#d9822b)}.row .name.unknown{color:var(--vscode-descriptionForeground)}.row input{accent-color:var(--vscode-focusBorder)}.twisty{width:21px;min-width:21px;text-align:center;padding:0;background:transparent;color:var(--vscode-foreground)}.row-detail{display:flex;gap:6px;flex-wrap:wrap;padding:7px 8px;background:var(--vscode-editorWidget-background);border-left:2px solid var(--vscode-focusBorder)}.version{border:1px solid var(--vscode-panel-border);padding:3px 6px;overflow-wrap:anywhere;max-width:360px;font-size:11px}.version button{font-size:11px;padding:2px 5px;margin-left:4px}.more{margin-left:auto;white-space:nowrap;font-size:11px;padding:3px 7px}.candidate{color:var(--vscode-editorWarning-foreground,#d9822b)}.held{color:var(--vscode-editorWarning-foreground,#d9822b);font-size:11px}
#status{min-height:20px;margin:8px 0;color:var(--vscode-descriptionForeground);white-space:pre-wrap;overflow-wrap:anywhere}#status.busy::before{content:'◌';display:inline-block;margin-right:7px;animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}#save{margin-top:8px}.badge{margin-left:8px;font-size:12px;white-space:pre-line;overflow-wrap:anywhere;max-width:60%;min-width:0}.badge.same{display:none}.badge span{display:block;white-space:normal;overflow-wrap:anywhere;max-width:100%}.same{color:var(--vscode-testing-iconPassed,#43a047)}.different{color:var(--vscode-testing-iconFailed,#e53935)}.remote-only{color:var(--vscode-editorWarning-foreground,#d9822b)}.unknown{color:var(--vscode-descriptionForeground)}.focus-conflict{outline:1px solid var(--vscode-focusBorder);background:var(--vscode-list-focusBackground)}
</style></head><body><h2>同步范围</h2><div class="muted">单击展开；勾选根目录可全选本机文件，再取消产物目录。点击“版本与操作”查看各副本。状态通过刷新按钮更新。</div><div class="muted"><span class="same">绿色：同版</span>　<span class="remote-only">橙色：仅 Worker 同版</span>　<span class="different">红色：待更新或冲突</span></div><div id="tabs"></div><div id="detail" class="muted"></div><button id="refresh" class="secondary">刷新同步状态</button> <button id="nextConflict" class="secondary">定位下一个冲突</button><div id="tree"></div><div id="status" role="status"></div><button id="save">保存当前范围</button>
<script nonce="${nonce}">
const vscode=acquireVsCodeApi();let roots=[],active=null,serial=0;const views=new Map();
const tabs=document.getElementById('tabs'),tree=document.getElementById('tree'),status=document.getElementById('status'),detail=document.getElementById('detail');
function state(){return views.get(active.id)}
function sendAction(type,entry,endpointId){const view=state();if(view.busyAction)return;view.busyAction={type,path:entry.path};status.className='busy';status.textContent='正在准备 '+entry.path+'，请核对确认页中的完整路径…';renderTree();vscode.postMessage({type,id:String(++serial),rootId:active.id,path:entry.path,endpointId,directory:entry.directory})}
function isExcluded(path){return [...state().excluded].some(item=>item===path||path.startsWith(item+'/'))}
function selected(path){if(isExcluded(path))return false;return [...state().selected].some(item=>item==='.'||item===path||path.startsWith(item+'/'))}
function childSelected(path){return [...state().selected].some(item=>path==='.'||item.startsWith(path+'/'))||selected(path)&&[...state().excluded].some(item=>item.startsWith(path+'/'))}
function hasExcludedChild(path){return [...state().excluded].some(item=>item.startsWith(path+'/'))}
function setSelection(path,checked){const view=state(),set=view.selected,excluded=view.excluded;if(path==='.') {set.clear();excluded.clear();if(checked){if(!active.excludable)set.add('.');else for(const item of view.children.get('.')||[])if(item.selectable!==false)set.add(item.path)}}else if(checked){for(const item of [...excluded])if(item===path||item.startsWith(path+'/'))excluded.delete(item);if(!selected(path)){for(const item of [...set])if(item.startsWith(path+'/'))set.delete(item);set.add(path)}}else{for(const item of [...set])if(item===path||item.startsWith(path+'/'))set.delete(item);if([...set].some(item=>item==='.'||path.startsWith(item+'/')))excluded.add(path);else for(const item of [...excluded])if(item===path||item.startsWith(path+'/'))excluded.delete(item)}renderTree()}
function versionTime(version){if(!version?.modifiedAtMs)return '时间未知';const date=new Date(version.modifiedAtMs);if(Number.isNaN(date.getTime()))return '时间未知';const two=value=>String(value).padStart(2,'0');return date.getFullYear()+'-'+two(date.getMonth()+1)+'-'+two(date.getDate())+' '+two(date.getHours())+':'+two(date.getMinutes())+':'+two(date.getSeconds())}
function versionRole(version){return version?.latest==='plan'?'Plan 最新运行':version?.latest==='manual'?'手动选定':version?.latest==='local'?'本机基准':version?.latest==='candidate'?'时间最新候选':version?.latest==='same'?'与其他 Worker 同内容':''}
function folderCopyText(id,copy,present){const name=id==='local'?'本机':id;if(!present)return name+' 全部缺失';const issues=[copy.missing?'缺失 '+copy.missing:'',copy.needsSync?'需同步 '+copy.needsSync:'',copy.conflict?'内容冲突 '+copy.conflict:'',copy.unverified?'未校验 '+copy.unverified:''].filter(Boolean);return name+' 最新文件 '+versionTime(copy)+(issues.length?' · '+issues.join(' · '):'')}
function paintStatus(badge,health,directory,locations){if(!health){badge.textContent='待刷新';return}if(health.state==='same')return;if(directory){const copies=Object.entries(health.copies||{});if(copies.length){const fullMissing=copies.some(([id])=>locations&&!locations.includes(id));const summary=[];if(!fullMissing)for(const part of health.detail.split(' · ')){const count=Number(part.match(/^([0-9]+) /)?.[1]||0);if(!count)continue;if(part.includes('待更新或冲突'))summary.push(count+' 个文件内容不同或缺失');else if(part.includes('仅 Worker 一致'))summary.push(count+' 个文件本机缺失或不同');else if(part.includes('未确认'))summary.push(count+' 个文件未完成校验')}badge.textContent=[...summary,...copies.map(([id,copy])=>folderCopyText(id,copy,!locations||locations.includes(id)))].join(String.fromCharCode(10));return}badge.textContent=health.detail;return}for(const part of health.detail.split(' · ')){if(part==='Worker 内容基准'||part.startsWith('Plan 归属：'))continue;let text=part;const copy=part.match(/^(本机|[^ ]+) (最新版|同版|缺失|不同版|待更新|冲突|未校验(?:，待核对)?)$/);if(copy){const id=copy[1],version=health.versions?.[id==='本机'?'local':id],role=versionRole(version);const issue=copy[2]==='缺失'||!version&&copy[2]==='待更新'?'缺失':copy[2]==='待更新'||copy[2]==='不同版'?'需同步':copy[2]==='冲突'?'内容冲突':copy[2].startsWith('未校验')?'未校验':'';text=id+(version?' '+versionTime(version):'')+(role?' · '+role:'')+(issue?' · '+issue:'')}else if(part==='内容冲突，无法判定最新版')text='最新版未确定';const item=document.createElement('span');item.textContent=text;badge.appendChild(item)}}
function folderHealth(path){const view=state();if(view.statuses[path])return view.statuses[path];const failed=[...view.refreshErrors.entries()].find(([root])=>root==='.'||path===root||path.startsWith(root+'/'));if(failed)return {state:'unknown',detail:'清单校验失败：'+failed[1]};const checked=[...view.refreshedPaths].find(root=>root==='.'||path===root||path.startsWith(root+'/'));if(checked){const parent=view.statuses[checked];if(parent?.detail?.includes('清单校验失败'))return {state:'unknown',detail:parent.detail};return {state:'unknown',detail:'目录内无可校验文件'}}return {state:'unknown',detail:'待校验'}}
function row(entry,depth){
  const view=state(),el=document.createElement('div');el.className='row';el.style.paddingLeft=(depth*18)+'px';
  const toggle=document.createElement('button');toggle.className='twisty';toggle.textContent=entry.directory?(view.expanded.has(entry.path)?'▾':'▸'):' ';toggle.disabled=!entry.directory;
  toggle.onclick=()=>{if(view.expanded.has(entry.path)){view.expanded.delete(entry.path);renderTree()}else{view.expanded.add(entry.path);renderTree();load(entry.path)}};el.appendChild(toggle);
  const box=document.createElement('input');box.type='checkbox';
  if(entry.path==='.') {const eligible=(view.children.get('.')||[]).filter(item=>item.selectable!==false);const count=eligible.filter(item=>selected(item.path)).length;box.checked=active.excludable?eligible.length>0&&count===eligible.length&&!eligible.some(item=>hasExcludedChild(item.path)):view.selected.has('.');box.indeterminate=active.excludable&&count>0&&!box.checked;box.disabled=entry.selectable===false||active.excludable&&!eligible.length}
  else{box.checked=selected(entry.path)&&!hasExcludedChild(entry.path);box.indeterminate=!box.checked&&childSelected(entry.path);box.disabled=entry.selectable===false||!active.excludable&&[...view.selected].some(item=>item==='.'||item!==entry.path&&entry.path.startsWith(item+'/'))}
  box.onchange=()=>setSelection(entry.path,box.checked);el.appendChild(box);
  const health=entry.directory?folderHealth(entry.path):view.statuses[entry.path];
  const label=document.createElement('label');label.className='name '+(health?.state||'unknown');label.textContent=(entry.directory?'📁 ':'📄 ')+entry.name;label.title=entry.path+(health?.state!=='same'&&health?.detail?' · '+health.detail:'');label.onclick=()=>entry.directory&&toggle.click();el.appendChild(label);
  const badge=document.createElement('span');badge.className='badge '+(health?.state||'unknown');paintStatus(badge,health,entry.directory,entry.locations);badge.title=badge.textContent||health?.detail||'待刷新';el.appendChild(badge);
  if(health?.held||entry.held){const mark=document.createElement('span');mark.className='held';mark.textContent='同步暂停';el.appendChild(mark)}
  if(entry.path!=='.'){
    const more=document.createElement('button');more.className='secondary more';more.textContent=view.detailPath===entry.path?'收起':'版本与操作';more.onclick=()=>{view.detailPath=view.detailPath===entry.path?null:entry.path;renderTree()};el.appendChild(more);
  }
  tree.appendChild(el);
  if(entry.path===view.focus){el.className+=' focus-conflict';if(view.pendingFocusScroll===entry.path){view.pendingFocusScroll=null;view.scrollTarget=el}}
  if(entry.path!=='.'&&view.detailPath===entry.path){
    const actions=document.createElement('div');actions.className='row-detail';actions.style.paddingLeft=(depth*18+48)+'px';
    const locations=entry.directory&&health?.copies?[...new Set([...(entry.locations||[]),...Object.keys(health.copies)])]:entry.locations||Object.keys(health?.versions||{});
    for(const id of locations){const v=health?.versions?.[id],copy=entry.directory?health?.copies?.[id]:null,item=document.createElement('span');item.className='version '+(v?.latest==='candidate'?'candidate':v?.latest?'same':'');if(entry.directory&&copy&&!(entry.locations||[]).includes(id)){item.textContent=(id==='local'?'本机':id)+' · 全部缺失';actions.appendChild(item);continue}item.textContent=id+(copy?' · 最新文件 '+versionTime(copy)+(copy.missing?' · 缺失 '+copy.missing:'')+(copy.needsSync?' · 需同步 '+copy.needsSync:'')+(copy.conflict?' · 内容冲突 '+copy.conflict:'')+(copy.unverified?' · 未校验 '+copy.unverified:''):v?' · '+versionTime(v)+(versionRole(v)?' · '+versionRole(v):''):entry.directory&&health&&health.state!=='unknown'?' · 目录内容已校验':' · 尚未校验');
      const retain=document.createElement('button');retain.className='secondary';retain.textContent='以此版同步到其他位置';retain.disabled=Boolean(view.busyAction)||(!v&&!entry.directory)||!health||health.state==='unknown'||health.unverified===true;retain.title=retain.disabled?'请先完成此路径的内容校验':id==='local'?'同步到所有已启用 Worker 并逐台校验内容':'同步到其他已启用 Worker 和本机，并逐处校验内容';retain.onclick=()=>sendAction('retain',entry,id);item.appendChild(retain);
      const remove=document.createElement('button');remove.className='secondary';remove.textContent='删除';remove.disabled=Boolean(view.busyAction);remove.onclick=()=>sendAction('remove',entry,id);item.appendChild(remove);actions.appendChild(item)}
    const present=entry.locations||[];if(present.some(id=>id!=='local')&&(!present.includes('local')||entry.directory&&health?.copies?.local?.present===0&&health.copies.local.missing>0)){const removeAll=document.createElement('button');removeAll.className='secondary';removeAll.textContent='删除所有 Worker 副本';removeAll.disabled=Boolean(view.busyAction);removeAll.title='本机不会删除；执行前显示每台 Worker 的完整路径并二次确认';removeAll.onclick=()=>sendAction('removeAllWorkers',entry);actions.appendChild(removeAll)}
    tree.appendChild(actions);
  }
  if(entry.directory&&view.expanded.has(entry.path)){const children=view.children.get(entry.path);if(children)children.forEach(child=>row(child,depth+1));else{const wait=document.createElement('div');wait.className='muted';wait.style.paddingLeft=((depth+1)*18)+'px';wait.textContent='读取中…';tree.appendChild(wait)}}
}function renderTree(){if(!active)return;const view=state(),scrollTop=tree.scrollTop;view.scrollTarget=null;tree.replaceChildren();row({name:active.label,path:'.',directory:true,selectable:active.rootSelectable!==false},0);tree.scrollTop=scrollTop;if(view.scrollTarget){view.scrollTarget.scrollIntoView?.({block:'center'});view.scrollTarget=null}}
function renderTabs(){tabs.replaceChildren();for(const root of roots){const button=document.createElement('button');button.textContent=root.label;button.className=root.id===active?.id?'active':'secondary';button.onclick=()=>{active=root;detail.textContent=root.detail;renderTabs();renderTree();if(!state().children.has('.'))load('.')};tabs.appendChild(button)}}
function load(path,rootId=active.id){vscode.postMessage({type:'list',id:String(++serial),rootId,path})}
function parentPath(path){const index=path.lastIndexOf('/');return index<0?'.':path.slice(0,index)}
function enqueueRefresh(rootId,paths){const view=views.get(rootId);if(!view)return;for(const path of paths)if(!view.refreshQueue.includes(path))view.refreshQueue.push(path);pumpRefresh(rootId)}
function pumpRefresh(rootId){const view=views.get(rootId);if(!view||view.pending.size||!view.refreshQueue.length)return;const path=view.refreshQueue.shift();view.pending.add(path);if(active?.id===rootId)status.textContent='正在校验 '+path+' 的全部文件…';vscode.postMessage({type:'refresh',id:String(++serial),rootId,path})}
function refreshVisible(){if(!active)return;enqueueRefresh(active.id,['.'])}
document.getElementById('refresh').onclick=refreshVisible;
function revealConflict(path){const view=state();view.focus=path;view.pendingFocusScroll=path;let parent=parentPath(path);while(parent!=='.'){view.expanded.add(parent);if(!view.children.has(parent)&&!view.listPending.has(parent)){view.listPending.add(parent);load(parent)}parent=parentPath(parent)}renderTree()}
document.getElementById('nextConflict').onclick=()=>{if(!active)return;const view=state();const all=Object.keys(view.statuses).filter(path=>path!=='.'&&view.statuses[path].state==='different');const paths=all.filter(path=>!all.some(other=>other.startsWith(path+'/'))).sort();if(!paths.length){status.textContent='没有已校验的冲突；请点击刷新同步状态';return}const index=paths.findIndex(path=>path>String(view.focus||''));const next=paths[index<0?0:index];revealConflict(next);status.textContent='冲突位置：'+next};
document.getElementById('save').onclick=()=>{if(!active)return;status.textContent='保存中…';vscode.postMessage({type:'save',id:String(++serial),rootId:active.id,paths:[...state().selected].sort(),excluded:[...state().excluded].sort()})};
window.addEventListener('message',event=>{
  const message=event.data;
  if(message.type==='init'){
    roots=message.roots;
    for(const root of roots)views.set(root.id,{selected:new Set(root.selected),excluded:new Set(),expanded:new Set(['.']),children:new Map(),listPending:new Set(),pending:new Set(),refreshedPaths:new Set(),refreshErrors:new Map(),refreshQueue:[],mutationParent:null,focus:null,pendingFocusScroll:null,busyAction:null,statuses:{}});
    active=roots[0];renderTabs();detail.textContent=active.detail;renderTree();load('.');
  }else if(message.type==='children'){
    const view=views.get(message.rootId);if(!view)return;
    view.listPending.delete(message.path);
    view.children.set(message.path,message.entries);
    if(view.mutationParent===message.path){view.mutationParent=null;enqueueRefresh(message.rootId,[message.path])}
    if(active?.id===message.rootId)renderTree();
  }else if(message.type==='status'){
    const view=views.get(message.rootId);if(!view)return;
    view.pending.delete(message.path);
    view.refreshedPaths.add(message.path);view.refreshErrors.delete(message.path);
    for(const key of Object.keys(view.statuses))if(key===message.path||message.path==='.'||key.startsWith(message.path+'/'))delete view.statuses[key];
    Object.assign(view.statuses,message.statuses||{});
    if(active?.id===message.rootId){if(!view.busyAction)status.className='';status.textContent='已校验 '+message.path+'：'+message.refreshedAt;renderTree()}
    pumpRefresh(message.rootId);
  }else if(message.type==='saved'){
    const view=views.get(message.rootId);if(view){view.statuses={};view.refreshedPaths.clear();view.refreshErrors.clear();view.refreshQueue=[]}
    if(active?.id===message.rootId){status.textContent='已保存，请点击刷新同步状态';renderTree()}
  }else if(message.type==='actionProgress'){
    if(active?.id===message.rootId){status.className='busy';status.textContent=message.stage+' · '+message.path}
  }else if(message.type==='actionCancelled'){
    const view=views.get(message.rootId);if(view)view.busyAction=null;
    if(active?.id===message.rootId){status.className='';status.textContent='操作已取消';renderTree()}
  }else if(message.type==='actionDone'){
    const operated=views.get(message.rootId);if(operated)operated.busyAction=null;
    const parent=parentPath(message.path);
    for(const [rootId,view] of views){
      for(const key of Object.keys(view.statuses))if(key===message.path||key.startsWith(message.path+'/'))delete view.statuses[key];
      let ancestor=parent;
      for(;;){view.statuses[ancestor]={state:'unknown',detail:'目录内容已变化，点击刷新同步状态'};if(ancestor==='.')break;ancestor=parentPath(ancestor)}
      if(message.directory){
        for(const path of [...view.children.keys()])if(path===message.path||path.startsWith(message.path+'/'))view.children.delete(path);
      }
      if(rootId!==message.rootId)continue;
      view.children.delete(parent);view.mutationParent=parent;
      if(message.directory)for(const path of [...view.expanded])if(path===message.path||path.startsWith(message.path+'/'))load(path,rootId);
    }
    if(active?.id===message.rootId){status.className='busy';status.textContent='正在更新 '+parent+'…';renderTree()}
    load(parent,message.rootId);
  }else if(message.type==='error'){
    const view=views.get(message.rootId);
    if(view){
      if(['remove','removeAllWorkers','retain'].includes(message.requestType))view.busyAction=null;
      if(message.requestType==='list')view.listPending.delete(message.path);
      if(message.requestType==='refresh'){view.pending.delete(message.path);view.refreshErrors.set(message.path,message.message)}
      if(message.requestType==='list'&&view.mutationParent===message.path){view.mutationParent=null;enqueueRefresh(message.rootId,[message.path])}
      view.statuses[message.path]={state:'unknown',detail:'清单校验失败：'+message.message};
    }
    if(active?.id===message.rootId){status.className='';status.textContent='操作失败 '+message.path+'：'+message.message;renderTree()}
    if(message.requestType==='refresh')pumpRefresh(message.rootId);
  }
});vscode.postMessage({type:'ready'});
</script></body></html>`;
}
