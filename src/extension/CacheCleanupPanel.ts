import * as vscode from "vscode";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { spawn } from "node:child_process";
import { isStaleRetentionRow, retentionOwnership, RetentionIndex } from "../features/PluginLogRetention";

type Candidate = { path: string; fullPath: string; type: "file"; bytes: number; modifiedAt: number; purpose: string; token: string; workerId: string; retentionStale?: boolean; previewOnly?: boolean };
type Endpoint = { id: string; role: string; identity?: string; nodeIdentity?: string };
type WorkerScan = { id: string; count: number; bytes: number; status: "loading" | "ready" | "unavailable"; error?: string };
type BlockedRow = { path: string; reason: string; workers: string[]; planFile: string };
type CleanupContext = { client: any; endpoints: Endpoint[]; localRoot?: string; generation: number; cleanupState: (root: string, mode: string, rows?: PendingCleanup[]) => Promise<PendingCleanup[]>; reviewPlanOutputs?: () => Promise<void>; retentionIndex?: () => Promise<RetentionIndex>; retentionHolds?: () => Promise<string[]>; retentionBlocked?: () => Promise<BlockedRow[]>; withRetentionLease?: (work: (lease: any) => Promise<void>) => Promise<void> };
type PendingCleanup = { root: string; workerId: string; endpointIdentity?: string; nodeIdentity?: string; operationId: string; paths: string[]; settled: boolean };

// A blocked admission names the exact leaving generations that hold an incoming run out of the
// two-generation window; the review must surface them as confirmed-cleanup candidates, otherwise
// a user waiting on a third generation has no path forward at all.
function blockedPurpose(row: BlockedRow): string {
  return `第三代提交正被该退出代阻挡：按虚拟“当前＋上一次”窗口，经确认清理退场后即可落盘（原因 ${row.reason}，来源 ${row.planFile || "队列"}）`;
}
// Unknown claims state is fail-closed: without a fresh holds list, managed stale rows cannot be
// assumed unheld.
function retentionRowHeld(row: Candidate, retention: RetentionIndex | undefined, holds: Set<string> | undefined): boolean {
  if (holds === undefined) return true;
  if (!retention) return true;
  const stale = isStaleRetentionRow(retention, row.path);
  if (!stale) return false;
  return holds.has(`${stale.planFile}|${stale.taskKey}`);
}
function applyRetention(rows: Candidate[], retention: RetentionIndex | undefined, holds: Set<string> | undefined, blocked: Map<string, BlockedRow>): Candidate[] {
  return rows.map(row => {
    const ownership = retention ? retentionOwnership(retention, row.path) : "unknown-manifest";
    const blockedRow = blocked.get(row.path);
    const notes = [row.purpose, `保留归属：${ownership}`];
    if (blockedRow) notes.push(blockedPurpose(blockedRow));
    if (holds === undefined) notes.push("在途保留声明不可读取");
    else if (retentionRowHeld(row, retention, holds)) notes.push("在途提交声明保留此代际");
    else if (holds.size) notes.push("存在在途保留声明，具体关联需核对");
    return { ...row, previewOnly: undefined, purpose: notes.join("；") };
  });
}

const html = (nonce: string) => `<!doctype html><html lang="zh"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'"><style>
body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);padding:18px;line-height:1.5}h1{font-size:20px}p{color:var(--vscode-descriptionForeground)}button{color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:0;padding:7px 12px;cursor:pointer;margin-right:8px}button:disabled{opacity:.5;cursor:default}.secondary{background:var(--vscode-button-secondaryBackground);color:var(--vscode-button-secondaryForeground)}.summary{padding:12px;background:var(--vscode-editorWidget-background);margin:12px 0}.group{border:1px solid var(--vscode-panel-border);margin:10px 0}.group>summary{padding:9px;cursor:pointer;font-weight:bold}.rows{padding:4px 12px 12px}.row{display:flex;gap:9px;align-items:flex-start;padding:6px;border-top:1px solid var(--vscode-panel-border)}.row span{min-width:0;overflow-wrap:anywhere}.meta{color:var(--vscode-descriptionForeground)}.path{font-family:var(--vscode-editor-font-family);font-size:12px}.warning{color:var(--vscode-errorForeground)}#review{border:2px solid var(--vscode-errorForeground);padding:12px;margin-top:15px}#reviewPaths{max-height:260px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;background:var(--vscode-editor-background);padding:10px}#status{margin:12px 0;white-space:pre-wrap;overflow-wrap:anywhere}
</style></head><body><h1>缓存回收审核</h1><p>请核对每个缓存文件的完整路径和保留提示；两次确认后按所选路径删除。结果、权重、TensorBoard、原始测试结果表和机器状态不在本入口范围。Plan 历史产物通过单独入口审核。清理结果未知时请先重新核实；未确认原执行器结束前不能重复删除。</p><button id="planOutputs" class="secondary">Plan 历史产物审核</button><button id="refresh" class="secondary">刷新候选</button><button id="recheckPending" class="secondary">重新核实未完成清理</button><button id="selectAll" class="secondary">全选候选</button><button id="deselectAll" class="secondary">清空选择</button><div id="summary" class="summary">正在读取…</div><div id="tree"></div><button id="reviewButton" disabled>审核所选路径</button><div id="review" hidden><h2>确认完整路径</h2><p id="reviewHint"></p><div id="reviewPaths"></div><button id="confirmButton">确认这些完整路径</button><button id="cancelButton" class="secondary">返回</button></div><div id="status" role="status"></div><script nonce="${nonce}">
const vscode=acquireVsCodeApi();let rows=[],stage=0,reviewKeys=[],scanning=false;const tree=document.getElementById('tree'),summary=document.getElementById('summary'),status=document.getElementById('status'),review=document.getElementById('review');
document.getElementById('planOutputs').onclick=()=>vscode.postMessage({type:'planOutputs'});document.getElementById('recheckPending').onclick=()=>vscode.postMessage({type:'recheckPending'});
function selected(){return Array.from(document.querySelectorAll('input[data-key]:checked')).map(x=>x.dataset.key)}
function updateButton(){document.getElementById('reviewButton').disabled=scanning||!selected().length;document.getElementById('refresh').disabled=scanning;document.getElementById('selectAll').disabled=scanning;document.getElementById('deselectAll').disabled=scanning}
function render(scans){tree.replaceChildren();const groups=new Map();for(const row of rows){const folder=row.path.slice(0,row.path.lastIndexOf('/'))||'.',key=row.workerId+'|'+folder;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}for(const [key,items] of groups){const d=document.createElement('details');d.className='group';const s=document.createElement('summary');const box=document.createElement('input');box.type='checkbox';box.title='勾选此目录内列出的候选文件';box.addEventListener('click',e=>e.stopPropagation());box.addEventListener('change',()=>{for(const c of d.querySelectorAll('input[data-key]'))if(!c.disabled)c.checked=box.checked;updateButton()});s.append(box,' '+items[0].workerId+' · '+items[0].path.slice(0,items[0].path.lastIndexOf('/'))+' · '+items.length+' 个候选 · '+items[0].purpose);d.append(s);const list=document.createElement('div');list.className='rows';for(const row of items){const wrap=document.createElement('label');wrap.className='row';const check=document.createElement('input');check.type='checkbox';if(row.previewOnly)check.disabled=true;else check.dataset.key=row.workerId+'|'+row.path;check.addEventListener('change',()=>{box.checked=Array.from(d.querySelectorAll('input[data-key]')).filter(x=>!x.disabled).every(x=>x.checked);updateButton()});const content=document.createElement('span');const name=document.createElement('div');name.className='path';name.textContent=row.fullPath;const meta=document.createElement('div');meta.className='meta';meta.textContent=(row.bytes/1048576).toFixed(2)+' MB · '+new Date(row.modifiedAt*1000).toLocaleString('zh-CN',{hour12:false})+' · '+row.purpose;content.append(name,meta);wrap.append(check,content);list.append(wrap)}d.append(list);tree.append(d)}summary.textContent=rows.length+' 个候选 · '+(rows.reduce((n,r)=>n+r.bytes,0)/1048576).toFixed(2)+' MB'+String.fromCharCode(10)+(scans||[]).map(s=>s.id+'：'+(s.status==='loading'?'正在读取…':s.error?'未完成 · '+s.error:s.count+' 个候选（含仅预览） · '+(s.bytes/1048576).toFixed(2)+' MB')).join(String.fromCharCode(10));summary.style.whiteSpace='pre-wrap';updateButton()}
function showReview(){review.hidden=false;document.getElementById('reviewPaths').textContent=reviewKeys.map(k=>{const r=rows.find(x=>x.workerId+'|'+x.path===k);return r?r.workerId+'  '+r.fullPath:''}).join(String.fromCharCode(10));document.getElementById('reviewHint').textContent=stage===0?'第一次确认：核对每个服务器和完整路径。':'第二次确认：再次核对同一批完整路径，确认后永久删除。';document.getElementById('confirmButton').textContent=stage===0?'第一次确认完整路径':'第二次确认并永久删除';review.scrollIntoView({block:'nearest'})}
document.getElementById('refresh').onclick=()=>{review.hidden=true;stage=0;status.textContent='正在刷新候选…';vscode.postMessage({type:'refresh'})};document.getElementById('selectAll').onclick=()=>{document.querySelectorAll('input[data-key]').forEach(x=>{if(!x.disabled)x.checked=true});document.querySelectorAll('.group>summary input').forEach(x=>x.checked=true);updateButton()};document.getElementById('deselectAll').onclick=()=>{document.querySelectorAll('input').forEach(x=>x.checked=false);updateButton()};document.getElementById('reviewButton').onclick=()=>{reviewKeys=selected();stage=0;vscode.postMessage({type:'review',keys:reviewKeys});showReview()};document.getElementById('cancelButton').onclick=()=>{review.hidden=true;stage=0;vscode.postMessage({type:'cancelReview'})};document.getElementById('confirmButton').onclick=()=>{if(stage===0){stage=1;vscode.postMessage({type:'confirmFirst',keys:reviewKeys});showReview();return}review.hidden=true;status.textContent='正在逐台删除所选候选…';vscode.postMessage({type:'confirmSecond',keys:reviewKeys})};window.addEventListener('message',event=>{const m=event.data;if(m.type==='data'){scanning=m.busy===true;review.hidden=true;stage=0;reviewKeys=[];rows=m.rows||[];render(m.scans);status.textContent=m.note||''}if(m.type==='error'){if(m.busy===false)scanning=false;status.textContent=m.message||'操作失败';updateButton()}if(m.type==='busy'){scanning=true;review.hidden=true;status.textContent=m.message||'正在处理…';updateButton()}});vscode.postMessage({type:'refresh'});
</script></body></html>`;

const candidateExtensions = new Set([".log", ".tmp", ".bak", ".part", ".zip"]);
const protectedMarkers = ["tensorboard", "tb_log", "checkpoint", "weight", "model_cache", "dataset"];
const MAX_SCAN_DIRECTORIES = 10_000;
const MAX_SCAN_ENTRIES = 100_000;
const MAX_CLEANUP_CANDIDATES = 20_000;
const protectedName = (name: string) => protectedMarkers.some(marker => name.toLowerCase().includes(marker));

function candidateIdentity(relative: string, stat: { dev: number | bigint; ino: number | bigint; size: number | bigint; mtimeNs: bigint; nlink: number | bigint }): string {
  return crypto.createHash("sha256").update(`${relative}|${stat.dev}|${stat.ino}|${stat.size}|${stat.mtimeNs}|${stat.nlink}`).digest("hex");
}

function schedulerStateCleanupOwnerMatches(root: string, fullPath: string, state: any): boolean {
  try {
    const owner = state?.cleanupOwner;
    if (owner?.schemaVersion !== 1 || owner.purpose !== "scheduler-state") return false;
    const comparablePath = (value: string) => process.platform === "win32" ? path.normalize(value).toLowerCase() : path.normalize(value);
    const normalizedRoot = comparablePath(root);
    if (comparablePath(realPathSync(String(owner.projectRoot || ""))) !== normalizedRoot) return false;
    const normalizedFile = comparablePath(fullPath);
    if (comparablePath(realPathSync(String(owner.statePath || ""))) !== normalizedFile) return false;
    const expectedDir = path.join(root, "simple_cluster", "tmp", "cluster_scheduler");
    if (comparablePath(path.dirname(fullPath)) !== comparablePath(expectedDir) || !/^[A-Za-z0-9._-]+_state\.json$/.test(path.basename(fullPath))) return false;
    const normalizePlan = (value: unknown) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
    const plan = normalizePlan(state?.plan);
    if (!plan || normalizePlan(owner.planFile) !== plan) return false;
    const operationId = String(owner.operationId || "").trim();
    const runId = String(owner.runId || "").trim();
    if (!operationId || !runId || operationId !== runId || !String(owner.attemptId || "").trim()) return false;
    return state?.schedulerTerminal === true && !(state.running_experiments || []).length && !(state.testing_experiments || []).length;
  } catch { return false; }
}

function realPathSync(value: string): string {
  return require("node:fs").realpathSync(value);
}

async function localCandidates(root: string, signal?: AbortSignal, retention?: RetentionIndex): Promise<Candidate[]> {
  signal?.throwIfAborted();
  const rootInfo = await fs.lstat(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("本机项目根目录不是普通目录；已停止扫描。");
  const realRoot = await fs.realpath(root);
  const rootDevice = (await fs.stat(realRoot)).dev;
  const rows: Candidate[] = [];
  for (const baseRelative of ["simple_cluster/tmp", "tmp", "simple_cluster/console_logs", "simple_cluster/tmux_logs"]) {
    const base = path.join(realRoot, ...baseRelative.split("/"));
    let baseStat;
    try { baseStat = await fs.lstat(base); } catch (error: any) { if (error?.code === "ENOENT") continue; throw error; }
    if (!baseStat.isDirectory() || baseStat.isSymbolicLink() || baseStat.dev !== rootDevice || await fs.realpath(base) !== base) continue;
    const queue = [base];
    let scannedDirectories = 0;
    let scannedEntries = 0;
    while (queue.length) {
      signal?.throwIfAborted();
      const parent = queue.shift()!;
      scannedDirectories += 1;
      if (scannedDirectories > MAX_SCAN_DIRECTORIES) throw new Error(`本机临时目录超过 ${MAX_SCAN_DIRECTORIES} 个，已停止不完整扫描`);
      if ((await fs.stat(parent)).dev !== rootDevice || await fs.realpath(parent) !== parent) continue;
      const directory = await fs.opendir(parent);
      try {
        for await (const entry of directory) {
          signal?.throwIfAborted();
          scannedEntries += 1;
          if (scannedEntries > MAX_SCAN_ENTRIES) throw new Error(`本机临时目录超过 ${MAX_SCAN_ENTRIES} 个条目，已停止不完整扫描`);
          const full = path.join(parent, entry.name);
          if (entry.isSymbolicLink()) continue;
          if (entry.isDirectory()) { if (!protectedName(entry.name)) queue.push(full); continue; }
          const dryRun = /^dry-run-workers-\d+-[0-9a-f]{12}\.json$/.test(entry.name);
          const relative = path.relative(realRoot, full).split(path.sep).join("/");
          const schedulerState = relative.startsWith("simple_cluster/tmp/cluster_scheduler/") && relative.endsWith("_state.json");
          if (!entry.isFile() || protectedName(entry.name) || (!candidateExtensions.has(path.extname(entry.name).toLowerCase()) && !dryRun && !schedulerState)) continue;
          const stat = await fs.lstat(full, { bigint: true });
          if (stat.dev !== BigInt(rootDevice) || stat.nlink !== 1n || schedulerState && stat.size > 2n * 1024n * 1024n) continue;
          const token = candidateIdentity(relative, stat);
          const ownership = retention ? retentionOwnership(retention, relative) : "unknown-manifest";
          const staleRetention = ownership === "stale" ? isStaleRetentionRow(retention!, relative) : undefined;
          // Backup history copies are version-bound ("original + at most one"), never age-bound:
          // they are offered as confirmed-cleanup candidates immediately, because refusing new
          // writes forever until 7 days pass would deadlock the very editor flow they protect.
          const backupCopy = relative.startsWith("simple_cluster/tmp/backups/") && entry.name.endsWith(".bak");
          if (schedulerState) {
            let state: any;
            try { state = JSON.parse(await fs.readFile(full, "utf8")); } catch { continue; }
            if (!schedulerStateCleanupOwnerMatches(realRoot, full, state)) continue;
          }
          const purpose = backupCopy ? "原文件的历史副本（每个来源最多一份；确认清理后同名写入才会生成新副本）" : staleRetention ? `已超出该任务两代保留窗口（当前＋上一次）：${staleRetention.taskKey.slice(0, 120)}` : relative.includes("/cluster_scheduler/logs/") ? "单个 Job 的训练或测试输出日志，旧内容用于历史排错" : relative.includes("/cluster_scheduler/") && relative.endsWith(".log") ? "Plan 调度过程日志" : schedulerState ? "已终止 Plan 的专属调度状态（按代际审核）" : dryRun ? "Plan 预演的 Worker 分配快照" : relative.includes("/tmux_logs/") ? "tmux 会话输出副本" : "插件临时工作文件";
          rows.push({ workerId: "local", path: relative, fullPath: full, type: "file", bytes: Number(stat.size), modifiedAt: Number(stat.mtimeMs) / 1000, purpose, token, retentionStale: staleRetention || backupCopy ? true : undefined });
          if (rows.length > MAX_CLEANUP_CANDIDATES) throw new Error(`本机候选文件超过 ${MAX_CLEANUP_CANDIDATES} 个，请缩小审核范围`);
        }
      } finally { await directory.close().catch(() => undefined); }
    }
  }
  return rows;
}

async function deleteLocalCandidates(root: string, rows: Candidate[], skipped: string[], workerId: string, preflightOnly = false, onExecutorExit?: () => void, onExecutorStart?: () => void): Promise<void> {
  const rootInfo = await fs.lstat(root).catch((error: Error) => { throw new Error(`PARENT_CD_FAILED：无法核验本机项目根目录：${error.message}`); });
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("PARENT_CD_FAILED：本机项目根目录不是普通目录。");
  const realRoot = await fs.realpath(root).catch((error: Error) => { throw new Error(`PARENT_CD_FAILED：无法解析本机项目根目录：${error.message}`); });
  const normalizedRoot = path.resolve(root);
  if ((process.platform === "win32" ? realRoot.toLowerCase() !== normalizedRoot.toLowerCase() : realRoot !== normalizedRoot))
    throw new Error("PARENT_CD_FAILED：项目根目录包含链接或已变化。");
  type Entry = { i: number; parent: string; leaf: string; dev: string; ino: string; links: string; size: string; ticks: string };
  const entries: Entry[] = [];
  for (const [index, row] of rows.entries()) {
    try {
      const parts = row.path.split("/");
      if (row.type !== "file") throw new Error("缓存目标类型已变化");
      const allowedRoot = parts[0] === "tmp"
        || parts[0] === "simple_cluster" && ["tmp", "console_logs", "tmux_logs"].includes(parts[1]);
      if (parts.some(part => !part || part === "." || part === "..") || !allowedRoot) throw new Error("缓存路径超出允许范围");
      const full = path.join(realRoot, ...parts);
      if (path.normalize(row.fullPath) !== full) throw new Error("审核路径与实际目标不一致");
      const parent = path.dirname(full);
      const leaf = path.basename(full);
      const parentInfo = await fs.lstat(parent).catch((error: Error) => { throw new Error(`PARENT_CD_FAILED：无法核验目标父目录：${error.message}`); });
      const parentReal = await fs.realpath(parent).catch((error: Error) => { throw new Error(`PARENT_CD_FAILED：无法解析目标父目录：${error.message}`); });
      const parentRelative = path.relative(realRoot, parentReal);
      if (!leaf || leaf === "." || leaf === ".." || leaf.includes("/") || leaf.includes("\\")
        || !parentInfo.isDirectory() || parentInfo.isSymbolicLink() || parentInfo.dev !== rootInfo.dev
        || parentReal !== parent || parentRelative === ".." || parentRelative.startsWith(`..${path.sep}`) || path.isAbsolute(parentRelative)) throw new Error("PARENT_CD_FAILED");
      let stat;
      try { stat = await fs.lstat(full, { bigint: true }); }
      catch (error: any) {
        if (error?.code === "ENOENT") { skipped.push(`${workerId} · ${row.path}（已确认不存在）`); continue; }
        throw error;
      }
      if (!stat.isFile() || stat.isSymbolicLink() || stat.dev !== BigInt(rootInfo.dev) || stat.nlink !== 1n || candidateIdentity(row.path, stat) !== row.token) throw new Error(`本机候选已变化：${row.path}`);
      const modifiedTicks = (621355968000000000n + stat.mtimeNs / 100n).toString();
      entries.push({ i: index, parent, leaf, dev: String(stat.dev), ino: String(stat.ino), links: String(stat.nlink), size: String(stat.size), ticks: modifiedTicks });
    } catch (error) { throw new Error(`${workerId} · ${row.path}：${String(error && (error as Error).message || error)}`, { cause: error }); }
  }
  if (preflightOnly || !entries.length) return;
  // ONE guarded executor invocation per confirmed batch: every entry keeps the full per-target
  // discipline (cd to the verified parent, physical-pwd check, "./"+leaf, reparse/type/size/mtime
  // re-verification) inside the executor; deletions are never issued as one spawn per file.
  const payload = JSON.stringify({ root: realRoot, items: entries });
  const identityType = String.raw`using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class CacheFileIdentity {
  [StructLayout(LayoutKind.Sequential)] struct FT { public uint Low, High; }
  [StructLayout(LayoutKind.Sequential)] struct Info { public uint Attributes; public FT Created, Accessed, Written; public uint Volume, SizeHigh, SizeLow, Links, IndexHigh, IndexLow; }
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern SafeFileHandle CreateFile(string name, uint access, uint share, IntPtr security, uint creation, uint flags, IntPtr template);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool GetFileInformationByHandle(SafeFileHandle handle, out Info info);
  public static string[] Read(string name) {
    using (var handle = CreateFile(name, 0x80, 7, IntPtr.Zero, 3, 0x00200000, IntPtr.Zero)) {
      if (handle.IsInvalid) throw new Win32Exception(Marshal.GetLastWin32Error());
      Info info; if (!GetFileInformationByHandle(handle, out info)) throw new Win32Exception(Marshal.GetLastWin32Error());
      ulong index = ((ulong)info.IndexHigh << 32) | info.IndexLow;
      ulong size = ((ulong)info.SizeHigh << 32) | info.SizeLow;
      ulong written = (((ulong)info.Written.High << 32) | info.Written.Low) + 504911232000000000UL;
      return new[] { info.Volume.ToString(), index.ToString(), info.Links.ToString(), size.ToString(), written.ToString(), info.Attributes.ToString() };
    }
  }
}`;
  const script = `$ErrorActionPreference='Stop'; [Console]::InputEncoding=[Text.UTF8Encoding]::new($false); Add-Type -TypeDefinition '${identityType}'; $batch=ConvertFrom-Json -InputObject ([Console]::In.ReadToEnd()); $safeRoot=[string]$batch.root; $items=$batch.items; foreach ($it in $items) { try { $walk=Get-Item -LiteralPath $it.parent -ErrorAction Stop; while ($walk) { if (($walk.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'PARENT_CD_FAILED' }; if ([string]::Equals($walk.FullName,$safeRoot,[StringComparison]::OrdinalIgnoreCase)) { break }; $walk=$walk.Parent }; if (-not $walk) { throw 'PARENT_CD_FAILED' }; Set-Location -LiteralPath $it.parent -ErrorAction Stop; $cwd=[IO.Path]::GetFullPath((Get-Location).ProviderPath); if (-not [string]::Equals($cwd,$it.parent,[StringComparison]::OrdinalIgnoreCase)) { throw 'PARENT_CD_FAILED' }; [Environment]::CurrentDirectory=$cwd; if (-not [string]::Equals([Environment]::CurrentDirectory,$cwd,[StringComparison]::OrdinalIgnoreCase)) { throw 'PARENT_CD_FAILED' }; $target=Get-Item -LiteralPath ('./'+$it.leaf) -ErrorAction Stop; if ((($target.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) -or $target -isnot [IO.FileInfo] -or $target.LinkType -eq 'HardLink') { throw 'TARGET_CHANGED' }; $id=[CacheFileIdentity]::Read('./'+$it.leaf); if (($id[5] -as [uint32]) -band 0x410) { throw 'TARGET_CHANGED' }; if ($id[0] -ne [string]$it.dev -or $id[1] -ne [string]$it.ino -or $id[2] -ne [string]$it.links -or $id[3] -ne [string]$it.size -or $id[4] -ne [string]$it.ticks) { throw 'TARGET_CHANGED' }; Remove-Item -LiteralPath ('./'+$it.leaf) -ErrorAction Stop; if (Test-Path -LiteralPath ('./'+$it.leaf)) { throw 'TARGET_REMAINS' }; Write-Output ('OK:'+$it.i) } catch { Write-Output ('ERR:'+$it.i); throw } }`;
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  const outcomes = await new Promise<Map<number, boolean>>((resolve, reject) => {
    const child = spawn("pwsh.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], { cwd: realRoot, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    onExecutorStart?.();
    let inputError: Error | undefined;
    child.stdin.on("error", error => { inputError = error; });
    child.stdin.end(payload, "utf8");
    let out = "";
    let error = "";
    child.stdout.on("data", data => { out += String(data); });
    child.stderr.on("data", data => { error = (error + String(data)).slice(-500); });
    child.on("error", spawnError => { onExecutorExit?.(); reject(new Error(`PARENT_CD_FAILED：无法在已核验工作目录启动批量删除程序：${String(spawnError)}`)); });
    child.on("exit", code => {
      onExecutorExit?.();
      if (inputError) { reject(inputError); return; }
      if (code !== 0) { reject(new Error(error || "PARENT_CD_FAILED：批次已停止，请刷新核对已执行路径。")); return; }
      const map = new Map<number, boolean>();
      for (const line of out.split(/\r?\n/)) {
        const match = /^(OK|ERR):(\d+)$/.exec(line.trim());
        if (match) map.set(Number(match[2]), match[1] === "OK");
      }
      resolve(map);
    });
  });
  for (const entry of entries) {
    const row = rows[entry.i]!;
    let stillThere = true;
    try { await fs.lstat(path.join(realRoot, ...row.path.split("/"))); }
    catch (error: any) { if (error?.code === "ENOENT") stillThere = false; else throw error; }
    if (!stillThere) continue;
    if (outcomes.get(entry.i) === true) throw new Error(`本机删除后仍存在：${row.path}`);
    skipped.push(`${workerId} · ${row.path}（执行器复核发现目标已变化，未删除）`);
  }
}

function cleanupReadError(error: any): string {
  const code = String(error?.cause?.code || error?.code || "").slice(0, 80);
  const message = String(error?.message || error || "清单读取失败").slice(0, 300);
  return /fetch failed|ECONNREFUSED|ECONNRESET|ETIMEDOUT/i.test(`${message} ${code}`)
    ? `Agent 连接尚未就绪或已中断${code ? `（${code}）` : ""}；连接恢复后会重新读取，也可点击刷新候选。`
    : message;
}

function completedCleanupCandidates(result: any): Candidate[] {
  if (result?.status !== "completed" || !Array.isArray(result.candidates))
    throw new Error(String(result?.message || "服务器未返回完整候选清单；请刷新候选，不能将此响应视为零候选。"));
  if (result.candidates.length > MAX_CLEANUP_CANDIDATES) throw new Error("服务器候选清单超过审核上限");
  const paths = new Set<string>();
  for (const row of result.candidates) {
    const parts = typeof row?.path === "string" ? row.path.split("/") : [];
    if (row?.type !== "file" || !parts.length || parts.some((part: string) => !part || part === "." || part === ".." || part.includes("\\"))
      || !(parts[0] === "tmp" || (parts[0] === "simple_cluster" && ["tmp", "console_logs", "tmux_logs"].includes(parts[1])) || (parts[0] === "tmp" && ["console_logs", "tmux_logs"].includes(parts[1])))
      || typeof row.fullPath !== "string" || !path.posix.isAbsolute(row.fullPath)
      || typeof row.token !== "string" || !row.token || row.token.length > 256 || paths.has(row.path)
      || !Number.isFinite(row.bytes) || row.bytes < 0 || !Number.isFinite(row.modifiedAt))
      throw new Error("服务器候选清单格式或路径无效；已停止审核，请刷新候选。");
    paths.add(row.path);
  }
  return result.candidates;
}

export function openCacheCleanupPanel(contextProvider: () => CleanupContext, onDidChangeContext?: vscode.Event<void>): void {
  const panel = vscode.window.createWebviewPanel("simpleExperimentCacheCleanup", "缓存回收审核", vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: true });
  let current = new Map<string, Candidate>();
  let busy = false;
  let disposed = false;
  let deleting = false;
  let refreshPending = false;
  let scanGeneration = 0;
  let scanAbort: AbortController | undefined;
  let loadedContext: CleanupContext | undefined;
  let reviewedKeys: string[] = [];
  let approvalStage = 0;
  const post = (message: any) => { if (!disposed) void panel.webview.postMessage(message); };
  const contextMatches = (context?: CleanupContext) => {
    const latest = contextProvider();
    return Boolean(context && context.client === latest.client && context.generation === latest.generation && context.localRoot === latest.localRoot
      && JSON.stringify(context.endpoints) === JSON.stringify(latest.endpoints));
  };
  const pendingContextMatches = (context: CleanupContext, row: PendingCleanup) => {
    const latest = contextProvider();
    const endpoint = latest.endpoints.find(item => item.id === row.workerId && item.role === "worker");
    return context.client === latest.client && context.generation === latest.generation && context.localRoot === latest.localRoot
      && endpoint?.identity === row.endpointIdentity && Boolean(endpoint);
  };
  const invalidateReview = () => { current.clear(); reviewedKeys = []; approvalStage = 0; loadedContext = undefined; };
  const refresh = async (contextChanged = false) => {
    if (disposed || deleting) { refreshPending = !disposed; return; }
    if (busy && !contextChanged) return;
    scanAbort?.abort();
    const abort = new AbortController();
    scanAbort = abort;
    const generation = ++scanGeneration;
    busy = true;
    invalidateReview();
    post({ type: "busy", message: "正在读取本机和各服务器的旧临时文件…" });
    try {
      const context = { ...contextProvider() };
      const endpoints = context.endpoints.filter(e => e.role === "worker");
      let retention: RetentionIndex | undefined;
      if (context.retentionIndex) {
        try { retention = await context.retentionIndex(); } catch { retention = undefined; }
      }
      let holds: Set<string> | undefined;
      try { holds = context.retentionHolds ? new Set(await context.retentionHolds()) : undefined; } catch { holds = undefined; }
      let blocked = new Map<string, BlockedRow>();
      try { blocked = new Map(((context.retentionBlocked ? await context.retentionBlocked() : undefined) || []).map(row => [row.path, row])); } catch { blocked = new Map(); }
      const scans: WorkerScan[] = [...(context.localRoot ? [{ id: "本机", count: 0, bytes: 0, status: "loading" as const }] : []), ...endpoints.map(e => ({ id: e.id, count: 0, bytes: 0, status: "loading" as const }))];
      const rowsBySource = new Map<string, Candidate[]>();
      const isCurrent = () => !disposed && !abort.signal.aborted && generation === scanGeneration && contextMatches(context);
      const publish = () => {
        if (!isCurrent()) return;
        const rows = [...rowsBySource.values()].flat();
        current = new Map(rows.map(row => [`${row.workerId}|${row.path}`, row]));
        const incomplete = scans.some(scan => scan.status === "unavailable");
        post({ type: "data", rows, scans: scans.map(scan => ({ ...scan })), busy,
          note: incomplete ? "候选读取未完整完成；连接失败或暂停审核的服务器不计为零候选。可审核已成功读取的路径。" : busy ? "正在读取；各来源完成后独立更新。" : "" });
      };
      publish();
      const readSource = async (id: string, workerId: string, read: () => Promise<Candidate[]>) => {
        try {
          const rows = await read();
          if (!isCurrent()) return;
          rowsBySource.set(id, rows.map(row => ({ ...row, workerId })));
          Object.assign(scans.find(scan => scan.id === id)!, { status: "ready", count: rows.length, bytes: rows.reduce((sum, row) => sum + row.bytes, 0) });
        } catch (error) {
          if (!isCurrent()) return;
          Object.assign(scans.find(scan => scan.id === id)!, { status: "unavailable", error: cleanupReadError(error) });
        }
        publish();
      };
      await Promise.all([
        ...(context.localRoot ? [readSource("本机", "local", async () => applyRetention(await localCandidates(context.localRoot!, abort.signal, retention), retention, holds, blocked))] : []),
        ...endpoints.map(e => readSource(e.id, e.id, async () => applyRetention(completedCleanupCandidates(await context.client.postWorkerAction(e.id, "preview-cache-cleanup", { opId: `cache-preview-${Date.now()}-${e.id}` }, { signal: abort.signal })), retention, holds, blocked))),
      ]);
      if (isCurrent()) { loadedContext = context; busy = false; publish(); }
    } catch (error) { if (generation === scanGeneration) post({ type: "error", message: cleanupReadError(error), busy: false }); }
    finally { if (generation === scanGeneration) busy = false; }
  };
  const contextSubscription = onDidChangeContext?.(() => {
    scanAbort?.abort();
    invalidateReview();
    if (deleting) { refreshPending = true; return; }
    void refresh(true);
  });
  panel.onDidDispose(() => { disposed = true; scanGeneration++; scanAbort?.abort(); invalidateReview(); contextSubscription?.dispose(); messageSubscription.dispose(); });
  const messageSubscription = panel.webview.onDidReceiveMessage(async message => {
    if (disposed) return;
    if (message?.type === "recheckPending") {
      if (busy || deleting) { post({ type: "error", message: "当前操作尚未结束，请稍后核实。" }); return; }
      const context = contextProvider();
      busy = true;
      try {
        if (!context.localRoot) throw new Error("当前项目根目录不可用");
        const pending = (await context.cleanupState(context.localRoot, "list")).filter(row => !row.settled);
        if (!pending.length) { post({ type: "error", message: "当前项目没有待核清理。" }); return; }
        const notes: string[] = [];
        for (const row of pending) {
          if (row.workerId === "local") { notes.push("本机：原执行器结束状态未知，不能重复删除"); continue; }
          const endpoint = context.endpoints.find(item => item.id === row.workerId && item.role === "worker");
          if (!endpoint || endpoint.identity !== row.endpointIdentity || !pendingContextMatches(context, row)) { notes.push(`${row.workerId}：节点已变化，原请求仍未知`); continue; }
          try {
            const result: any = await context.client.postWorkerAction(row.workerId, "query-confirmed-cache-cleanup", {
              opId: `cache-query-${crypto.randomBytes(12).toString("hex")}`, workerId: row.workerId, targetOperationId: row.operationId,
            });
            if (!pendingContextMatches(context, row) || disposed) throw new Error("项目或节点已变化");
            if (result?.workerId !== row.workerId || result.targetOperationId !== row.operationId) throw new Error("响应身份不一致");
            if (result.status === "settled") { await context.cleanupState(context.localRoot, "settle", [row]); notes.push(`${row.workerId}：原清理已结束，请刷新路径状态`); }
            else notes.push(`${row.workerId}：${result.status === "live" ? "原清理仍在执行" : "原清理结果未知"}`);
          } catch (error) { notes.push(`${row.workerId}：本轮核实失败，原请求仍未知（${cleanupReadError(error)}）`); }
        }
        post({ type: "error", message: notes.join("；") });
      } catch (error) { post({ type: "error", message: cleanupReadError(error) }); } finally { busy = false; }
      return;
    }
    if (message?.type === "planOutputs") {
      if (deleting) { post({ type: "error", message: "当前清理尚未结束，请稍后审核 Plan 历史产物。" }); return; }
      const context = contextProvider();
      if (!context.reviewPlanOutputs) { post({ type: "error", message: "Plan 历史产物审核入口尚不可用。" }); return; }
      try { await context.reviewPlanOutputs(); }
      catch (error) { post({ type: "error", message: cleanupReadError(error) }); }
      return;
    }
    if (message?.type === "refresh") { await refresh(); return; }
    if (message?.type === "cancelReview") { reviewedKeys = []; approvalStage = 0; return; }
    if (message?.type === "review") {
      if (busy || !contextMatches(loadedContext)) { post({ type: "error", message: "连接或项目已变化，请刷新后重新审核" }); return; }
      const keys = message.keys;
      if (!Array.isArray(keys) || !keys.length || keys.length > 2000 || new Set(keys).size !== keys.length || keys.some(key => !current.has(key))) {
        panel.webview.postMessage({ type: "error", message: "选择已失效，请刷新后重新审核" }); return;
      }
      reviewedKeys = keys.slice(); approvalStage = 0; return;
    }
    if (message?.type === "confirmFirst") {
      if (!busy && contextMatches(loadedContext) && approvalStage === 0 && JSON.stringify(message.keys) === JSON.stringify(reviewedKeys) && reviewedKeys.length) approvalStage = 1;
      return;
    }
    if (message?.type !== "confirmSecond" || busy || approvalStage !== 1 || JSON.stringify(message.keys) !== JSON.stringify(reviewedKeys)) return;
    if (!contextMatches(loadedContext)) { invalidateReview(); post({ type: "error", message: "连接或项目已变化，请刷新后重新审核" }); return; }
    const context = loadedContext!;
    const keys = message.keys;
    if (!Array.isArray(keys) || !keys.length || keys.length > 2000 || new Set(keys).size !== keys.length || keys.some(key => !current.has(key))) {
      panel.webview.postMessage({ type: "error", message: "选择已失效，请刷新后重新审核" }); return;
    }
    busy = true;
    deleting = true;
    approvalStage = 0;
    let deletionAttempted = false;
    const completedNodes: string[] = [];
    let reserved: PendingCleanup[] = [];
    const started = new Set<string>();
    try {
      const skipped: string[] = [];
      if (!context.localRoot) throw new Error("当前项目根目录不可用，请重新审核");
      const byWorker = new Map<string, Candidate[]>();
      for (const key of keys) { const row = current.get(key)!; if (!byWorker.has(row.workerId)) byWorker.set(row.workerId, []); byWorker.get(row.workerId)!.push(row); }
      const proposed = [...byWorker].map(([workerId, rows]) => ({ root: context.localRoot!, workerId,
        endpointIdentity: context.endpoints.find(item => item.id === workerId && item.role === "worker")?.identity,
        nodeIdentity: context.endpoints.find(item => item.id === workerId && item.role === "worker")?.nodeIdentity,
        operationId: `cache-delete-${crypto.randomBytes(12).toString("hex")}`, paths: rows.map(row => row.path), settled: false }));
      await context.cleanupState(context.localRoot, "reserve", proposed);
      reserved = proposed;
      const readyByWorker = new Map<string, Candidate[]>();
      for (const [workerId, rows] of byWorker) {
        if (disposed || !contextMatches(context)) throw new Error("连接或项目已变化，请重新审核");
        if (workerId === "local") {
          if (!context.localRoot) throw new Error("本机项目根目录已失效");
          await deleteLocalCandidates(context.localRoot, rows, [], workerId, true);
          readyByWorker.set(workerId, rows);
        } else {
          const candidates = rows.map(row => ({ path: row.path, type: row.type, token: row.token }));
          const checkId = `cache-check-${crypto.randomBytes(12).toString("hex")}`;
          const check: any = await context.client.postWorkerAction(workerId, "check-confirmed-cache-candidates", { opId: checkId, workerId, candidates, confirm: true, pathConfirmed: true, authorizationMode: "confirmed_paths" });
          if (!contextMatches(context) || disposed) throw new Error("连接或项目已变化，请重新审核");
          if (check?.status !== "completed" || check.opId !== checkId || check.authorizationMode !== "confirmed_paths" || check.workerId !== workerId
            || typeof check.root !== "string" || !path.posix.isAbsolute(check.root) || check.root === "/"
            || JSON.stringify(check.candidates) !== JSON.stringify(candidates) || !Array.isArray(check.absent)
            || new Set(check.absent).size !== check.absent.length || check.absent.some((item: unknown) => !rows.some(row => row.path === item))
            || rows.some(row => path.posix.join(check.root, row.path) !== row.fullPath))
            throw new Error(`${workerId}：无法核实所选节点和精确路径，请刷新后重新审核`);
          for (const missing of check.absent) skipped.push(`${workerId} · ${missing}（已确认不存在）`);
          readyByWorker.set(workerId, rows.filter(row => !check.absent.includes(row.path)));
        }
      }
      for (const [workerId, rows] of readyByWorker) {
        if (disposed || !contextMatches(context)) throw new Error("连接或项目已变化，已停止后续删除，请重新审核");
        if (!rows.length) continue;
        const pending = reserved.find(row => row.workerId === workerId)!;
        post({ type: "busy", message: `正在删除 ${workerId} 的 ${rows.length} 个已确认路径…` });
        if (workerId === "local") {
          if (!context.localRoot) throw new Error("本机项目根目录已失效");
          deletionAttempted = true;
          started.add(pending.operationId);
          let launched = false, exited = false;
          try { await deleteLocalCandidates(context.localRoot, rows, skipped, workerId, false, () => { exited = true; }, () => { launched = true; }); exited = true; }
          finally { if (!launched || exited) await context.cleanupState(context.localRoot, "settle", [pending]); }
        } else {
          deletionAttempted = true;
          const operationId = pending.operationId;
          started.add(operationId);
          const result: any = await context.client.postWorkerAction(workerId, "delete-confirmed-cache-candidates", { opId: operationId, operationId, workerId, candidates: rows.map(row => ({ path: row.path, type: row.type, token: row.token })), confirm: true, pathConfirmed: true, authorizationMode: "confirmed_paths" });
          if (result?.status === "rejected" && result.notStarted === true && result.operationId === operationId && result.workerId === workerId) {
            await context.cleanupState(context.localRoot!, "settle", [pending]);
            throw new Error(`${workerId}：${String(result.message || "原清理仍在执行")}`);
          }
          if (result?.status !== "completed" || result.operationId !== operationId || result.workerId !== workerId
            || !Array.isArray(result.absent) || new Set(result.absent).size !== result.absent.length
            || result.absent.some((item: unknown) => !rows.some(row => row.path === item))
            || !Number.isInteger(result.deletedCount) || result.deletedCount + result.absent.length !== rows.length)
            throw new Error(`${workerId}: ${String(result?.message || "删除尚未确认完成，请重新核实；不会自动重发删除。")}`);
          await context.cleanupState(context.localRoot!, "settle", [pending]);
          for (const missing of result.absent || []) skipped.push(`${workerId} · ${missing}（已确认不存在）`);
        }
        completedNodes.push(workerId);
      }
      busy = false;
      deleting = false;
      refreshPending = false;
      await refresh();
      if (skipped.length) post({ type: "error", message: `以下路径已不存在：${skipped.join("；")}` });
    } catch (error) {
      const message = `${String(error)}${completedNodes.length ? `；已完成节点：${completedNodes.join("、")}；其余目标未确认，请先核查后再操作` : ""}`;
      if (deletionAttempted) {
        busy = false;
        deleting = false;
        refreshPending = false;
        await refresh();
      }
      post({ type: "error", message, busy: false });
    }
    finally {
      if (context.localRoot && reserved.length) {
        try { await context.cleanupState(context.localRoot, "settle", reserved.filter(row => !started.has(row.operationId))); }
        catch (error) { post({ type: "error", message: `未发送的清理记录保存失败：${cleanupReadError(error)}` }); }
      }
      busy = false; deleting = false; if (refreshPending) { refreshPending = false; await refresh(); }
    }
  });
  panel.webview.html = html(crypto.randomBytes(16).toString("base64"));
}
