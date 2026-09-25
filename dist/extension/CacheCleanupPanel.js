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
exports.openCacheCleanupPanel = openCacheCleanupPanel;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const crypto = __importStar(require("node:crypto"));
const node_child_process_1 = require("node:child_process");
const html = (nonce) => `<!doctype html><html lang="zh"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'"><style>
body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);padding:18px;line-height:1.5}h1{font-size:20px}p{color:var(--vscode-descriptionForeground)}button{color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;padding:7px 12px;cursor:pointer;margin-right:8px}button:disabled{opacity:.5;cursor:default}.secondary{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}.summary{padding:12px;background:var(--vscode-editorWidget-background);margin:12px 0}.group{border:1px solid var(--vscode-panel-border);margin:10px 0}.group>summary{padding:9px;cursor:pointer;font-weight:bold}.rows{padding:4px 12px 12px}.row{display:flex;gap:9px;align-items:flex-start;padding:6px;border-top:1px solid var(--vscode-panel-border)}.row span{min-width:0;overflow-wrap:anywhere}.meta{color:var(--vscode-descriptionForeground)}.path{font-family:var(--vscode-editor-font-family);font-size:12px}.warning{color:var(--vscode-errorForeground)}#review{border:2px solid var(--vscode-errorForeground);padding:12px;margin-top:15px}#reviewPaths{max-height:260px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;background:var(--vscode-editor-background);padding:10px}#status{margin:12px 0;white-space:pre-wrap;overflow-wrap:anywhere}
</style></head><body><h1>缓存回收审核</h1><p>仅列出超过 7 天的临时文件和运行日志。Worker 有活动任务时不列候选；结果、权重、TensorBoard、原始测试结果表和机器状态保留。按本机或服务器的目录分组审核，勾选目录会选中其中展示的文件。</p><button id="refresh" class="secondary">刷新候选</button><button id="selectAll" class="secondary">全选候选</button><button id="deselectAll" class="secondary">清空选择</button><div id="summary" class="summary">正在读取…</div><div id="tree"></div><button id="reviewButton" disabled>审核所选路径</button><div id="review" hidden><h2>确认完整路径</h2><p id="reviewHint"></p><div id="reviewPaths"></div><button id="confirmButton">确认这些完整路径</button><button id="cancelButton" class="secondary">返回</button></div><div id="status" role="status"></div><script nonce="${nonce}">
const vscode=acquireVsCodeApi();let rows=[],stage=0,reviewKeys=[];const tree=document.getElementById('tree'),summary=document.getElementById('summary'),status=document.getElementById('status'),review=document.getElementById('review');
function selected(){return Array.from(document.querySelectorAll('input[data-key]:checked')).map(x=>x.dataset.key)}
function updateButton(){document.getElementById('reviewButton').disabled=!selected().length}
function render(){tree.replaceChildren();const groups=new Map();for(const row of rows){const folder=row.path.slice(0,row.path.lastIndexOf('/'))||'.',key=row.workerId+'|'+folder;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}for(const [key,items] of groups){const d=document.createElement('details');d.className='group';const s=document.createElement('summary');const box=document.createElement('input');box.type='checkbox';box.title='勾选此目录内列出的候选文件';box.addEventListener('click',e=>e.stopPropagation());box.addEventListener('change',()=>{for(const c of d.querySelectorAll('input[data-key]'))c.checked=box.checked;updateButton()});s.append(box,' '+items[0].workerId+' · '+items[0].path.slice(0,items[0].path.lastIndexOf('/'))+' · '+items.length+' 个候选 · '+items[0].purpose);d.append(s);const list=document.createElement('div');list.className='rows';for(const row of items){const wrap=document.createElement('label');wrap.className='row';const check=document.createElement('input');check.type='checkbox';check.dataset.key=row.workerId+'|'+row.path;check.addEventListener('change',()=>{box.checked=Array.from(d.querySelectorAll('input[data-key]')).every(x=>x.checked);updateButton()});const content=document.createElement('span');const name=document.createElement('div');name.className='path';name.textContent=row.fullPath;const meta=document.createElement('div');meta.className='meta';meta.textContent=(row.bytes/1048576).toFixed(2)+' MB · '+new Date(row.modifiedAt*1000).toLocaleString('zh-CN',{hour12:false})+' · '+row.purpose;content.append(name,meta);wrap.append(check,content);list.append(wrap)}d.append(list);tree.append(d)}summary.textContent=rows.length+' 个候选 · '+(rows.reduce((n,r)=>n+r.bytes,0)/1048576).toFixed(2)+' MB';updateButton()}
function showReview(){review.hidden=false;document.getElementById('reviewPaths').textContent=reviewKeys.map(k=>{const r=rows.find(x=>x.workerId+'|'+x.path===k);return r?r.workerId+'  '+r.fullPath:''}).join(String.fromCharCode(10));document.getElementById('reviewHint').textContent=stage===0?'第一次确认：核对每个服务器和完整路径。':'第二次确认：再次核对同一批完整路径，确认后永久删除。';document.getElementById('confirmButton').textContent=stage===0?'第一次确认完整路径':'第二次确认并永久删除';review.scrollIntoView({block:'nearest'})}
document.getElementById('refresh').onclick=()=>{review.hidden=true;stage=0;status.textContent='正在刷新候选…';vscode.postMessage({type:'refresh'})};document.getElementById('selectAll').onclick=()=>{document.querySelectorAll('input[data-key]').forEach(x=>x.checked=true);document.querySelectorAll('.group>summary input').forEach(x=>x.checked=true);updateButton()};document.getElementById('deselectAll').onclick=()=>{document.querySelectorAll('input').forEach(x=>x.checked=false);updateButton()};document.getElementById('reviewButton').onclick=()=>{reviewKeys=selected();stage=0;vscode.postMessage({type:'review',keys:reviewKeys});showReview()};document.getElementById('cancelButton').onclick=()=>{review.hidden=true;stage=0;vscode.postMessage({type:'cancelReview'})};document.getElementById('confirmButton').onclick=()=>{if(stage===0){stage=1;vscode.postMessage({type:'confirmFirst',keys:reviewKeys});showReview();return}review.hidden=true;status.textContent='正在逐台删除所选候选…';vscode.postMessage({type:'confirmSecond',keys:reviewKeys})};window.addEventListener('message',event=>{const m=event.data;if(m.type==='data'){rows=m.rows||[];render();status.textContent=m.note||''}if(m.type==='error')status.textContent=m.message||'操作失败';if(m.type==='busy')status.textContent=m.message||'正在处理…'});vscode.postMessage({type:'refresh'});
</script></body></html>`;
const candidateExtensions = new Set([".log", ".tmp", ".bak", ".part"]);
const protectedMarkers = ["tensorboard", "tb_log", "checkpoint", "weight", "model_cache", "dataset"];
const protectedName = (name) => protectedMarkers.some(marker => name.toLowerCase().includes(marker));
async function localCandidates(root) {
    const realRoot = await fs.realpath(root);
    const rootDevice = (await fs.stat(realRoot)).dev;
    const cutoff = Date.now() - 7 * 86400000;
    const rows = [];
    for (const baseRelative of ["simple_cluster/tmp", "tmp"]) {
        const base = path.join(realRoot, ...baseRelative.split("/"));
        let baseStat;
        try {
            baseStat = await fs.lstat(base);
        }
        catch {
            continue;
        }
        if (!baseStat.isDirectory() || baseStat.isSymbolicLink() || baseStat.dev !== rootDevice || await fs.realpath(base) !== base)
            continue;
        const queue = [base];
        while (queue.length) {
            const parent = queue.shift();
            if ((await fs.stat(parent)).dev !== rootDevice || await fs.realpath(parent) !== parent)
                continue;
            for (const entry of await fs.readdir(parent, { withFileTypes: true })) {
                const full = path.join(parent, entry.name);
                if (entry.isSymbolicLink())
                    continue;
                if (entry.isDirectory()) {
                    if (!protectedName(entry.name))
                        queue.push(full);
                    continue;
                }
                const dryRun = /^dry-run-workers-\d+-[0-9a-f]{12}\.json$/.test(entry.name);
                if (!entry.isFile() || protectedName(entry.name) || (!candidateExtensions.has(path.extname(entry.name).toLowerCase()) && !dryRun))
                    continue;
                const stat = await fs.lstat(full);
                if (stat.dev !== rootDevice || stat.mtimeMs > cutoff)
                    continue;
                const relative = path.relative(realRoot, full).split(path.sep).join("/");
                const token = crypto.createHash("sha256").update(`${relative}|${stat.dev}|${stat.ino}|${stat.size}|${stat.mtimeMs}`).digest("hex");
                const purpose = relative.includes("/cluster_scheduler/logs/") ? "单个 Job 的训练或测试输出日志，旧内容用于历史排错" : relative.includes("/cluster_scheduler/") && relative.endsWith(".log") ? "Plan 调度过程日志" : dryRun ? "Plan 预演的 Worker 分配快照" : relative.includes("/tmux_logs/") ? "tmux 会话输出副本" : "插件临时工作文件";
                rows.push({ workerId: "local", path: relative, fullPath: full, type: "file", bytes: stat.size, modifiedAt: stat.mtimeMs / 1000, purpose, token });
                if (rows.length > 20000)
                    throw new Error("本机候选文件过多，请缩小审核范围");
            }
        }
    }
    return rows;
}
async function deleteLocalCandidate(root, row) {
    const realRoot = await fs.realpath(root);
    const parts = row.path.split("/");
    if (parts.some(part => !part || part === "." || part === "..") || !(parts[0] === "tmp" || parts[0] === "simple_cluster" && parts[1] === "tmp"))
        throw new Error("缓存路径超出允许范围");
    const full = path.join(realRoot, ...parts);
    const stat = await fs.lstat(full);
    const token = crypto.createHash("sha256").update(`${row.path}|${stat.dev}|${stat.ino}|${stat.size}|${stat.mtimeMs}`).digest("hex");
    if (!stat.isFile() || stat.isSymbolicLink() || token !== row.token || stat.mtimeMs > Date.now() - 7 * 86400000)
        throw new Error(`本机候选已变化：${row.path}`);
    const parent = path.dirname(full);
    const leaf = path.basename(full);
    if (!leaf || leaf === "." || leaf === ".." || leaf.includes("/") || leaf.includes("\\") || await fs.realpath(parent) !== parent || !parent.startsWith(realRoot + path.sep))
        throw new Error("PARENT_CD_FAILED");
    const base64 = (value) => Buffer.from(value, "utf8").toString("base64");
    const script = `$ErrorActionPreference='Stop'; $p=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${base64(parent)}')); $leaf=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${base64(leaf)}')); Set-Location -LiteralPath $p; if (-not [string]::Equals((Get-Location).ProviderPath,$p,[StringComparison]::OrdinalIgnoreCase)) { throw 'PARENT_CD_FAILED' }; Remove-Item -LiteralPath ('./'+$leaf) -Force -ErrorAction Stop`;
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    await new Promise((resolve, reject) => {
        const child = (0, node_child_process_1.spawn)("pwsh.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], { cwd: parent, windowsHide: true, stdio: ["ignore", "ignore", "pipe"] });
        let error = "";
        child.stderr.on("data", data => { error = (error + String(data)).slice(-500); });
        child.on("error", reject);
        child.on("exit", code => code === 0 ? resolve() : reject(new Error(error || "PARENT_CD_FAILED")));
    });
    try {
        await fs.lstat(full);
    }
    catch (error) {
        if (error?.code === "ENOENT")
            return;
        throw error;
    }
    throw new Error(`本机删除后仍存在：${row.path}`);
}
function openCacheCleanupPanel(client, endpointProvider, localRoot) {
    const panel = vscode.window.createWebviewPanel("simpleExperimentCacheCleanup", "缓存回收审核", vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true });
    let current = new Map();
    let busy = false;
    let reviewedKeys = [];
    let approvalStage = 0;
    const refresh = async () => {
        if (busy)
            return;
        busy = true;
        reviewedKeys = [];
        approvalStage = 0;
        panel.webview.postMessage({ type: "busy", message: "正在读取各服务器的旧临时文件…" });
        try {
            const endpoints = endpointProvider().filter(e => e.role === "worker");
            const settled = await Promise.allSettled(endpoints.map(async (e) => {
                const result = await client.postWorkerAction(e.id, "preview-cache-cleanup", { opId: `cache-preview-${Date.now()}-${e.id}` });
                if (result.status === "failed")
                    throw new Error(String(result.message || "清单读取失败"));
                return { id: e.id, rows: result.candidates };
            }));
            const rows = [];
            const errors = [];
            if (localRoot) {
                try {
                    rows.push(...await localCandidates(localRoot));
                }
                catch (error) {
                    errors.push(`本机: ${String(error)}`);
                }
            }
            settled.forEach((result, index) => {
                if (result.status === "rejected")
                    errors.push(`${endpoints[index].id}: ${String(result.reason)}`);
                else
                    for (const row of result.value.rows || [])
                        rows.push({ ...row, workerId: result.value.id });
            });
            current = new Map(rows.map(row => [`${row.workerId}|${row.path}`, row]));
            panel.webview.postMessage({ type: "data", rows, note: errors.join("\n") });
        }
        catch (error) {
            panel.webview.postMessage({ type: "error", message: String(error) });
        }
        finally {
            busy = false;
        }
    };
    panel.webview.onDidReceiveMessage(async (message) => {
        if (message?.type === "refresh") {
            await refresh();
            return;
        }
        if (message?.type === "cancelReview") {
            reviewedKeys = [];
            approvalStage = 0;
            return;
        }
        if (message?.type === "review") {
            const keys = message.keys;
            if (!Array.isArray(keys) || !keys.length || keys.length > 2000 || new Set(keys).size !== keys.length || keys.some(key => !current.has(key))) {
                panel.webview.postMessage({ type: "error", message: "选择已失效，请刷新后重新审核" });
                return;
            }
            reviewedKeys = keys.slice();
            approvalStage = 0;
            return;
        }
        if (message?.type === "confirmFirst") {
            if (!busy && approvalStage === 0 && JSON.stringify(message.keys) === JSON.stringify(reviewedKeys) && reviewedKeys.length)
                approvalStage = 1;
            return;
        }
        if (message?.type !== "confirmSecond" || busy || approvalStage !== 1 || JSON.stringify(message.keys) !== JSON.stringify(reviewedKeys))
            return;
        const keys = message.keys;
        if (!Array.isArray(keys) || !keys.length || keys.length > 2000 || new Set(keys).size !== keys.length || keys.some(key => !current.has(key))) {
            panel.webview.postMessage({ type: "error", message: "选择已失效，请刷新后重新审核" });
            return;
        }
        busy = true;
        approvalStage = 0;
        try {
            const byWorker = new Map();
            for (const key of keys) {
                const row = current.get(key);
                if (!byWorker.has(row.workerId))
                    byWorker.set(row.workerId, []);
                byWorker.get(row.workerId).push(row);
            }
            for (const [workerId, rows] of byWorker) {
                panel.webview.postMessage({ type: "busy", message: `正在删除 ${workerId} 的 ${rows.length} 个已确认路径…` });
                if (workerId === "local") {
                    if (!localRoot)
                        throw new Error("本机项目根目录已失效");
                    for (const row of rows)
                        await deleteLocalCandidate(localRoot, row);
                }
                else {
                    const result = await client.postWorkerAction(workerId, "delete-cache-candidates", { opId: `cache-delete-${Date.now()}-${workerId}`, candidates: rows.map(row => ({ path: row.path, token: row.token })), confirm: true, pathConfirmed: true });
                    if (result.status === "failed")
                        throw new Error(`${workerId}: ${String(result.message || "删除失败")}`);
                }
            }
            busy = false;
            await refresh();
        }
        catch (error) {
            panel.webview.postMessage({ type: "error", message: String(error) });
        }
        finally {
            busy = false;
        }
    });
    panel.webview.html = html(crypto.randomBytes(16).toString("base64"));
}
