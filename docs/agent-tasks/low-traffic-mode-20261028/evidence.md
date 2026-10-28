# 低流量模式（服务器通信流量优化）v1 — 主证据（阶段一：只读交接索引）

## 0. 文档修订与负责人

| 项 | 值 |
|---|---|
| 任务ID | low-traffic-mode-20261028 |
| 文档修订 | r1（阶段一汇总版；正文中标为「原文」的 E 编号块逐字取自两名只读调查者 r1，未改写） |
| 本文件负责人 | worker（子代理，阶段一：证据汇总 + 规划交接索引，本副本唯一写入者） |
| 调查者A（通信流量面） | scout（readers/traffic），本文 §4/§5/§6/§9/§10.4/§11.1-11.3 引用其原文 |
| 调查者B（UI 与设置面） | scout（readers/ui-settings），本文 §7/§8.1/§10.2/§10.3/§11.4 引用其 E01–E18 |
| 下游 | GPT（openai/gpt-6.1-sol，medium）制定详细计划；主控千问 xhigh 负责调度与最终交付核对 |
| 本轮性质 | 只读汇总。未写业务代码、未编译、未运行测试、未做任何 git 写操作 |

## 1. 仓库身份、基线、工作副本与执行环境

| 项 | 值 |
|---|---|
| 插件 | SimpleExperiment（本地仓库目录名 zlk-cluster-orchestrator） |
| GitHub | zlinkw/SimpleExperiment（origin https://github.com/zlinkw/SimpleExperiment.git） |
| 冻结基线 SHA | 7a6062fa10441cc5852166a34138781a2604d9e9（已核实等于 GitHub 上 master 最新提交） |
| 工作副本（唯一写入位置） | D:/GitRepo/MCP/zlk-cluster-orchestrator-low-traffic-20261028 |
| 任务分支 | feat/low-traffic-mode-20261028（本轮 `git branch --show-current` 实测） |
| 副本 HEAD 实测 | 7a6062fa10441cc5852166a34138781a2604d9e9（`git rev-parse HEAD` exit 0） |
| 副本工作区状态实测 | `git status --porcelain` 仅一行 `?? docs/agent-tasks/low-traffic-mode-20261028/`，即只有本次新增的未跟踪文档，无任何已跟踪文件改动 |
| 主线基准（本轮禁止写入） | D:/GitRepo/MCP/zlk-cluster-orchestrator |
| 执行环境 | 原生 Windows（win32）+ Git for Windows Bash；node v24.18.0、npm 11.16.0；副本 `node_modules` 为指向主仓库的 Windows Junction（未执行 npm install） |
| 当前插件版本 | package.json `version` = 0.5.421（阶段 1 交付时按 AGENTS 递增一个补丁版本，本轮未改） |

## 2. 用户原始需求原文（一字不改）

> 目前插件还缺一个低流量模式，我的部分服务器的流量是收费的，而目前的插件完全没有为节省流量设计。需要优化出一个新版本。交给gpt规划，确保功能完整的同时，用户选择低流量模式后能正常使用。注意，默认还是正常模式，只是要加个按钮在顶部颜色条后面，点击后开启，再次点击后关闭。开启时尽可能节省和服务器间通信消耗的流量

需求中不可动摇的硬点（逐字对应）：默认仍是正常模式；按钮位置在「顶部颜色条后面」；点击开启、再次点击关闭；开启时尽可能节省与服务器间通信的流量；功能必须保持完整可用。

## 3. 两名调查者片段：路径与哈希（sha256sum 实测）

| 面 | 原始外部证据（项目外） | 工作副本内镜像（字节一致） | 大小 | SHA256 |
|---|---|---|---|---|
| 通信流量 | D:/GitRepo/MCP/.agent-evidence/low-traffic-mode-20261028/readers/traffic/evidence.md | docs/agent-tasks/low-traffic-mode-20261028/readers/traffic/evidence.md | 25046 B | bad433234c0a4c8eae897204076aac3c8df2fa3e1d9097d958e36ec2b51dfdfa |
| UI 与设置 | D:/GitRepo/MCP/.agent-evidence/low-traffic-mode-20261028/readers/ui-settings/evidence.md | docs/agent-tasks/low-traffic-mode-20261028/readers/ui-settings/evidence.md | 54503 B | f1de4be91f6ad39a21d46f7f7a5c04af042c78c9287e1f34ca1b6066597a516f |

- 复制方式：`cp -f` 后对源与目标同时 `sha256sum`，两两相同（traffic 均为 bad4332…、ui-settings 均为 f1de4be…），逐字节一致，内容未改写。
- 关键源码文件哈希在两名调查者记录中互相一致；本轮在工作副本再次实测一致（PanelHtml.legacy.ts 394cbfa…、extension/legacy.ts 21237a6…、TunnelGateway.ts 229716a…、RequestBudget.ts ac1b692…、RealtimeTunnelClient.legacy.ts 52ba675…、TunnelClient.legacy.ts c14a3ff…）。即工作副本与调查时点是同一字节版本，证据未过期。

## 4. 通信点清单表（全文，含文件同步触发点）

以下为调查者A的清单原文，路径为仓库相对路径，行号按基线 7a6062f：

### 原文·调查者A 4. 通信点清单表（触发源 | endpoint/同步动作 | 触发时机与间隔 | 请求体量级 | 响应体量级 | 低频化建议）

| # | 触发源(文件:行) | endpoint / 同步动作 | 触发时机与间隔 | 请求体量级 | 响应体量级 | 低频化/合并/跳过建议 |
|---|---|---|---|---|---|---|
| 1 | `extension/legacy.ts:1361` queueTimer `setInterval(...,500)` → `tickDistributedQueue`→`tickDistributedQueueCore:14951` | `POST /api/worker/tasks/query`（executionOnly 库存，batch）+ `GET /api/gpu?dispatch` | 500ms；**仅 isRealtimeMode 且 (protocol==2 或 worker_pool) 且有 plans 时**才发网络（14963/14962 早退） | 小 JSON（executionOnly 查询）| **中**：worker 库存含 gpuSample 顺带返回 | **首要降频项**：500ms 太密。低流量下建议提到数秒、空闲/无运行 job 时暂停或改由 push 事件驱动 |
| 2 | `extension/legacy.ts:1364` progressTimer `setInterval(...,2000)` → `refreshServerPlanProgress({automatic:true}):2726` | `/api/worker/tasks/query`（executionOnly + 全量查询，automatic 排除已确认完成 job）| 2000ms；isRealtimeMode + health≠paused 才发（2728 早退） | 小-中（含 queries 数组）| **中-大**（全量查询含 manifest/日志读，executionOnly 库存较轻）| 降频到 5–10s；与 #1 合并同轮；已确认完成 job 已被 excludeVerifiedCompleted 跳过（复用该能力）|
| 3 | `RealtimeTunnelClient` 快照回退 `snapshotFallbackIntervalSeconds=5` + `armPoll`（pollTimer）| `GET /api/snapshot` | WS/SSE 不可用时 5s 轮询快照；WS/SSE 正常时不轮询（push） | 小 | **大**：ClusterSnapshot 含 workers/gpu/schedulerStates/experimentTraces（TunnelClient:25-31）| 低流量优先保留 WS/SSE push；WS 可用即停轮询（现状已如此）。若只能轮询，5s→更大 |
| 4 | `RealtimeTunnelClient` WS/SSE 心跳 `heartbeatIntervalSeconds=5` | `/api/events?since` 心跳帧 | 5s 应用层心跳（push 通道内） | 极小 | 极小 | 低流量可放宽到 15–30s，但会延迟掉线感知 |
| 5 | `extension/legacy.ts:15012` probeWatch `setInterval(...,50)` | 无网络（仅看门狗，detach 卡死 tick） | 50ms，仅 tick 内 | 无 | 无 | 不涉及流量，无需改 |
| 6 | `ui/PanelHtml.legacy.ts:1959` TMUX_POLL_MS=5000，`:2649` setInterval → refreshTmuxList/Capture | 经 postMessage→host 拉 tmux 列表/截屏（host 侧 tmux RPC） | 5000ms；**已按 document.hidden + 元素可见性双门控**（2651-2654 不可见即 return）| 小 | 中（窗口列表/文本截屏）| 已具备可见性门控；低流量可加“面板隐藏时彻底停”和降频 |
| 7 | `extension/PlanCleanupPanel.ts:203` webview `setInterval(...,1500)` | postMessage 'poll' → host 查清理 operation 状态 | 1500ms；仅 `busy/executing` 且 operationId 存在时 | 小 | 小-中 | 独立清理面板，仅活跃时轮询；低流量可 3–5s |
| 8 | `extension/legacy.ts:17681` operationProbeTimer → operationStatusProbeDelayMs | 操作状态查询（refreshOperationStatus）| 退避 `min(5000,1000*attempt)`（17692）；仅 operation 处于 pending | 小 | 小-中 | 已是退避且仅 pending；可接受 |
| 9 | `extension/legacy.ts:17709` waitForOperationTerminalResult → operationManualWaitDelayMs | refreshOperationStatus(user) | 退避 `min(3000,500*attempt)`（17695）；仅前台等待用户动作 | 小 | 小-中 | 用户主动触发，保留 |
| 10 | `extension/legacy.ts:9407-9415` 代码同步校验 `_verifyIntervalMs=800` | 校验/inspect 循环 | 800ms，硬超时 30s（_verifyTimeoutMs） | 小 | 小 | 一次性校验窗口，保留 |
| 11 | `extension/legacy.ts:14963` testTunnel（`distributedNextProbeAt=+30_000`）| 隧道/健康探测（health/version） | 无健康探针时约 30s 冷却 | 极小 | 小 | 已有 30s 冷却，保留 |
| 12 | `extension/legacy.ts:14217/14969` queuePlanArtifactSyncStatusCheck | 产物同步状态检查（Worker 查询） | 每 tick 调用但有 pending 标志去抖；完成后 force | 小 | 中 | 低流量可只在完成事件时查，去掉每 tick |
| 13 | `extension/legacy.ts:24600` panelHostEventLoopTimer `setInterval(...,10_000)` | 无网络（事件循环延迟直方图）| 10s | 无 | 无 | 本地，无流量 |
| 14 | `extension/legacy.ts:27251` panelHeartbeatIntervalMs=30_000 | host→Webview postMessage 心跳（`extension/legacy.ts:1168`）| 30s | 无网络 | 无 | 本机 IPC，无跨机流量 |
| 15 | `updates/Bootstrap.ts:167` `setInterval(...,30*60*1000)` | GitHub `/releases/latest`（ReleaseClient，带 ETag/If-None-Match）| 30 分钟 | 极小 | 小 | 非服务器流量；ReleaseClient 已用 ETag 304 |
| 16 | `extension/legacy.ts:874` remoteVersionCheckTimer（setTimeout，激活一次性）| `checkRemoteAgentVersionAndNotify` | 激活一次性 | 极小 | 小 | 一次性，保留 |
| 17 | `RealtimeReconnect` reconnectInitial/Max=3/60s | 重连 WS/SSE | 断线退避 | 极小 | — | 保留 |
| 18 | `clusterSchedulerRuntime.legacy.ts:54-55`（服务器端 Python Scheduler）| Worker `/api/worker/availability` | window 10s / timeout 5.0 | 小 | 中 | 服务器↔Worker 内部；仅跨计量链路时相关，需拓扑确认（未知） |

### 文件同步触发点（SFTP / rsync，经 SimpleSFTP，事件驱动、非定时）

| # | 触发源 | 动作 | 触发时机 | 体量级 | 低频化建议 |
|---|---|---|---|---|---|
| S1 | `extension/legacy.ts:10053/10088` runSyncScopeTreeBatch、`10804` runSyncScopeBatch | 代码/范围批量同步（fpsync） | 用户/派发触发 | **大**（整 work_dirs，见 AGENTS.md）| 低流量可缩范围/降频率，但属功能动作，非后台轮询 |
| S2 | `extension/legacy.ts:22199/22416/22517` + `ResultCollectionHost.ts:154-167` | `sync.downloadMappedPaths` 结果收集 | 结果刷新/收集（update() 事件驱动） | **大**（产物下载，可 memoryOnly/metricsOnly）| 低流量优先 metricsOnly/memoryOnly；避免重复全量下载（已有 resultCatalogTtlMs 缓存） |
| S3 | tickCore `14963` testTunnel + completed job mirror 检查 | server-to-server fpsync 补镜像 | job 完成且某 worker 未镜像时 | **大**（Worker↔Worker work_dirs）| 低流量可延迟/合并镜像批次 |

---


## 5. 全部间隔常量（全文，含 500ms 队列 tick、2s 计划进度刷新、Webview tmux 5s、快照回退 5s、隧道/版本探测 30s 冷却）

### 原文·调查者A 5. 全部间隔常量（常量名 | 值 | 文件:行）

| 常量 / 表达式 | 值 | 文件:行 | 说明 |
|---|---|---|---|
| queueTimer 间隔 | 500 ms | extension/legacy.ts:1361 | 500ms tick（首要降频项）|
| progressTimer 间隔 | 2000 ms | extension/legacy.ts:1368 | 2s 计划进度刷新 |
| probeWatch 间隔 | 50 ms | extension/legacy.ts:15012 | tick 看门狗，无网络 |
| snapshotFallbackIntervalSeconds | 5 s | tunnel/RealtimeTunnelClient.legacy.ts:40 | 快照轮询回退 |
| heartbeatIntervalSeconds | 5 s | tunnel/RealtimeTunnelClient.legacy.ts:39 | WS/SSE 心跳 |
| gpuEventCoalesceMs | 500 ms | RealtimeTunnelClient.legacy.ts:41 | GPU 事件合并窗口 |
| uiBatchMs | 100 ms | RealtimeTunnelClient.legacy.ts:42 | UI 批量投递 |
| logTailIntervalSeconds | 1 s | RealtimeTunnelClient.legacy.ts:46 | 日志尾轮询（默认关：logTailEnabledByDefault=false）|
| logTailMode | "selected_run_only" / maxConcurrentLogTails=1 | tunnel/WorkerTelemetryApi.ts: defaultMultiWorkerRealtimePolicy | 仅选中 run 拉日志 |
| staleWorkerTelemetrySeconds | 180 s | WorkerTelemetryApi.ts（default policy）| 遥测过期阈值 |
| workerReconnectInitial/MaxDelaySeconds | 3 / 60 s | RealtimeTunnelClient.legacy.ts（policy）+ WorkerTelemetryApi.ts | 重连退避 |
| TMUX_POLL_MS | 5000 ms | ui/PanelHtml.legacy.ts:1959（setInterval @2649）| Webview tmux 轮询，可见性门控 |
| PlanCleanup 轮询 | 1500 ms | extension/PlanCleanupPanel.ts:203 | 仅活跃操作时 |
| operationStatusProbeDelayMs | min(5000, 1000*attempt) ms | extension/legacy.ts:17692 | 操作状态退避 |
| operationManualWaitDelayMs | min(3000, 500*attempt) ms | extension/legacy.ts:17695 | 前台等待退避 |
| _verifyIntervalMs / _verifyTimeoutMs | 800 / 30000 ms | extension/legacy.ts:9408 / 9407 | 代码同步校验 |
| distributedNextProbeAt 冷却 | +30_000 ms | extension/legacy.ts:14634 区域（tickCore :14963 使用）| testTunnel 冷却 |
| panelHostEventLoopTimer | 10_000 ms | extension/legacy.ts:24606 | 事件循环直方图（本地）|
| panelHeartbeatIntervalMs | 30_000 ms | extension/legacy.ts:1168（用于 27251）| host→Webview 心跳（本机）|
| statePostMinimumIntervalMs | 1000 ms | extension/legacy.ts:1153 | host→Webview 全量投递最小间隔 |
| statePostBatchMs | 100 ms | extension/legacy.ts:1152 | host→Webview 批量 |
| statePostDeliveryTimeoutMs | 7000 ms | extension/legacy.ts:1120 | 投递超时 |
| resultCatalogTtlMs | 5000 ms | extension/legacy.ts:1148 | 结果目录缓存 TTL |
| localPlanMetadataRefreshMinIntervalMs | 5000 ms | extension/legacy.ts:1272 | 本地计划元数据刷新最小间隔 |
| draftPlansRefreshMinIntervalMs | 5000 ms | extension/legacy.ts:1277 | 草稿计划刷新最小间隔 |
| xshellLibraryRefreshMinIntervalMs | 15000 ms | extension/legacy.ts:1284 | Xshell 库刷新最小间隔 |
| XSHELL_BATCH_LAUNCH_DELAY_MS | 1500 ms | extension/legacy.ts:547 | 批量启动间隔（本地）|
| RUN_OPERATION_RECONCILE_GRACE_MS | 90_000 ms | extension/legacy.ts:28179 | 运行操作协调宽限 |
| availabilityPushMinIntervalMs | max(5000, localAvailabilityPushSeconds*1000 \|\| 10000) | extension/legacy.ts:25277-25279 | 见下方“未知/死代码” |
| scheduler.operationEventMaxDelayMs | 默认 200（100..10000）| extension/legacy.ts:25238 | 配置项 |
| scheduler.workerActionMinIntervalMs | 默认 500（200..60000）| extension/legacy.ts:25239 | Worker 动作最小间隔配置 |
| updates Bootstrap check | 30*60*1000 = 1,800,000 ms | updates/Bootstrap.ts:167 | GitHub 更新检查（非服务器）|
| WORKER_AVAILABILITY_REFRESH_WINDOW_SECONDS | 10.0 s | clusterSchedulerRuntime.legacy.ts:55 | 服务器端 Scheduler（内部）|
| WORKER_AVAILABILITY_REFRESH_TIMEOUT_SECONDS | 5.0 s | clusterSchedulerRuntime.legacy.ts:54 | 服务器端 Scheduler |
| DEFAULT_SSE_TIMEOUT_MS | 30000 ms | api/LocalApiServer.legacy.ts:12 | 本机 loopback SSE，无跨机流量 |
| HOST_OPERATION_LEASE_HEARTBEAT_MS / TTL_MS | 5000 / 30000 ms | core/HostOperationLease.legacy.ts:10-11 | 本机租约，无跨机流量 |
| LEASE_POLL_BASE/MAX_MS | 20 / 250 ms | core/ResourceOperationLease.ts:16-17 | 本机资源租约退避 |

---


## 6. 控制面封装、endpoint 全集与响应体上限（原文）

### 原文·调查者A 2. 控制面 HTTP 客户端封装位置（事实）

- 封装类 `HttpTunnelClient`（`src/tunnel/TunnelClient.legacy.ts`）。所有控制面 GET/POST 经 `requestJson`→`subscribeRead`→`executeRequestJson`。
- 端点→purpose 映射（`TunnelClient.legacy.ts:113-120`）：
```
["/api/health", "health"], ["/api/snapshot", "snapshot"], ["/api/gpu", "snapshot"],
["/api/live-output", "live_output"], ["/api/results/summary", "snapshot"], ["/api/diagnostics", "diagnostics"],
```
- GET 与少量 POST（`/api/worker/tasks/query`、`/api/worker/tasks/diagnostics`、`/api/code-sync/plan-scope`）走 `subscribeRead` 合并：
```
// TunnelClient.legacy.ts:338-340
if (options.method === "GET" || options.method === "POST" && ["/api/worker/tasks/query", "/api/worker/tasks/diagnostics", "/api/code-sync/plan-scope"].includes(apiPath))
  return this.subscribeRead<T>(apiPath, purpose, body, options);
return this.executeRequestJson<T>(apiPath, purpose, body, options);
```
`subscribeRead`（约 :343 起）按 `readKey=purpose+user/background+apiPath+POST体` 去重并发请求，命中即 `budget.noteCoalescedRequest()`，不重复发网络。
- 实时通道 `RealtimeTunnelClient`（`src/tunnel/RealtimeTunnelClient.legacy.ts`）优先 WebSocket `/api/events?since=<seq>`，退 SSE，再退快照轮询；多端点聚合在 `MultiEndpointRealtimeClient`。
- 裸 `fetch(`${base}/...`) 形式散布在 legacy.ts 的探测/隧道函数里（health/version/capabilities/fs/sha256/code-sync/inspect/tmux kill 等，见清单表）。
- 响应体量硬上限（`src/tunnel/BoundedResponse.ts`）：`MAX_CONTROL_RESPONSE_BYTES = 32*1024*1024`（32MiB），`MAX_SSE_EVENT_BYTES = 1024*1024`（1MiB/帧）；超限抛错（不静默截断）。
```
// BoundedResponse.ts:1-2
export const MAX_CONTROL_RESPONSE_BYTES = 32 * 1024 * 1024;
export const MAX_SSE_EVENT_BYTES = 1024 * 1024;
```

---

### 原文·调查者A 3. 被调用的远端 endpoint 全集（事实，源自 WorkerTelemetryApi + TunnelClient + legacy.ts）

`src/tunnel/WorkerTelemetryApi.ts:9-18` 列出 Worker Telemetry 必需端点：
```
export const workerTelemetryRequiredEndpoints = [
  "/api/health", "/api/capabilities", "/api/gpu", "/api/worker/tasks",
  "/api/results/summary", "/api/live-output?runKey=<key>&since=<offset>",
  "/api/diagnostics", "GET /api/events/sse?since=<seq>",
] as const;
```
其余实际调用：
- `/api/health`、`/health`、`/api/version`、`/api/version`（健康/版本别名探测；legacy.ts:9634/9642/9650/9801/9807/9877/9882/9887）
- `/api/capabilities`（能力协商；legacy.ts:9839）
- `/api/snapshot`（集群快照；TunnelClient getSnapshot :185/:192）
- `/api/gpu`、`/api/gpu/history`（GPU 实时/历史；TunnelClient :200-217）
- `/api/worker/tasks`（全量任务查询，含 artifact-manifest 与逐行日志读，体积大）、`/api/worker/tasks/query`（executionOnly 轻量库存）、`/api/worker/tasks/diagnostics`
- `/api/results/summary`（结果汇总）
- `/api/live-output?runKey=&since=`（日志尾，**增量 since 游标**）
- `/api/diagnostics`
- `/api/events?since=<seq>`（WebSocket）、`/api/events/sse?since=<seq>`（SSE）
- `/api/code-sync/inspect`、`/api/code-sync/plan-scope`（代码同步文件清单，体积可能大）
- `/api/fs/sha256?path=`（单文件哈希，小）
- `/api/tmux/kill-window`（POST 关闭窗口）、tensorboard 代理端点
- `POST /api/actions/<name>`（派发/停止/解析等控制动作，名字白名单见 WorkerTelemetryApi 的 workerTelemetryActionNames / workerLocalSchedulerActionNames / workerResultActionNames）
- 禁用面（Worker Telemetry 明确禁止）：`GET /api/files/list`、`POST /api/files/*`、文件写入类（WorkerTelemetryApi forbidden 列表）。

---


## 7. UI 与消息链路原文（顶栏 markup、按钮分发、命令白名单、持久化、状态回显）

以下原文来自调查者B §3（E 编号沿用其编号；路径为工作副本相对路径，行号按基线 7a6062f；文件哈希见 §3/§13）。

### 7.0 门面与真实文件（先读，避免改错文件）

### E01 面板 HTML 门面默认委托 legacy
`src/ui/PanelHtml.ts` 符号 `renderPanelHtml`，行 1-45（节选，文件共 49 行；完整文件 SHA256 见 §0）。

```ts
/**
 * src/ui/PanelHtml.ts - Facade (Factory Refactor v0.4.92) - HOTFIX
 * 紧急回退：直接委托 legacy，确保握手 JS 完整
 * 工厂路径仅在显式开启时使用，待 JS 补全后再切回
 */
import { withRunConfirmation } from "./RunConfirmation";
export function renderPanelHtml(): string {
  let factoryFailure = "";
  let legacyFailure = "";
  // 工厂灰度开关：仅当环境变量或全局标记显式开启时走工厂，否则直接 legacy
  try {
    const useFactory = (typeof process !== "undefined" && process.env && process.env.FEATURE_FACTORY_PANEL === "1")
      || (typeof (globalThis as any).__panelFactoryOptIn !== "undefined" && String((globalThis as any).__panelFactoryOptIn) === "1");
    if (useFactory) {
      /* 工厂路径：需含 data-manual-dispatch / acquireVsCodeApi / requestInitialPanelState /
         handleIncomingWebviewMessage，且 new (require("vm").Script)(renderer.renderScript()) 通过才采用 */
    }
  } catch (e) {
    factoryFailure = String((e as Error)?.message || e).slice(0, 400);
    try { console.error("[PanelHtml facade] factory failed, fallback to legacy", e); } catch {}
  }
  // 默认回退 legacy - 保证 958k 完整 HTML + 831k JS + 握手
  try {
    const legacy = require("./PanelHtml.legacy");
    if (legacy && typeof legacy.renderPanelHtml === "function") {
      return withRunConfirmation(legacy.renderPanelHtml());
    }
  } catch (e) { legacyFailure = String((e as Error)?.message || e).slice(0, 400); }
```

含义：改 UI 要改 `PanelHtml.legacy.ts`；若要保持工厂灰度一致，需同步 `src/ui/sections/*`（`sections/index.ts` 的 `createAllSections` 只有 sync/plans/gpu/tmux/execution/results/diagnostics/settings 八段，topbar 不在其中）。


### 7.1 顶部「颜色条」与顶部按钮容器真实 markup（E02，按钮唯一插入位置）

### E02 顶部「颜色条」与顶部按钮容器真实 markup（唯一按钮插入位置证据）
`src/ui/PanelHtml.legacy.ts` 行 1337-1351（外层是 `return ```...```` 模板字符串，落盘即最终 HTML）。

```html
  <div class="app-shell">
    <header class="topbar" aria-label="状态图例与全局快捷操作">
      <div class="statusLegend" aria-label="状态颜色图例"><span class="legendItem"><span class="legendDot good"></span>正常</span><span class="legendItem"><span class="legendDot info"></span>运行 / 信息</span><span class="legendItem"><span class="legendDot warn"></span>等待 / 注意</span><span class="legendItem"><span class="legendDot error"></span>异常 / 失败</span><span class="legendItem"><span class="legendDot mine"></span>我的任务 / 重点</span></div>
      <div class="topbar-actions">
        <button data-command="bootstrapProject" type="button" title="扫描工作区，识别 experiments/plans 下的实验计划与项目配置&amp;#10;同时检查服务器与 Agent 等前置条件&amp;#10;已有的计划与接入配置不会重复写入">识别工作区</button>
        <span class="status-chip">Xshell</span>
        <span class="status-chip">全局配置</span>
        <span class="status-chip status-completed">仅本机端口</span>
        <button data-command="verifyAgentVersion" class="secondary" type="button" title="校验 Agent 版本&amp;#10;对比本机与各服务器上的 Agent 版本&amp;#10;不一致时提示升级">校验 Agent 版本</button>
        <button data-command="clearCache" class="secondary" type="button" title="查看各 Worker 已结束任务超过 7 天的临时文件与日志，审核完整路径后才可删除">缓存回收审核</button>
        <button data-command="openSetupGuide" class="secondary" type="button" title="打开该步骤的处理说明&amp;#10;含配置步骤与常见问题排查">配置说明</button>
        <span class="status-chip pluginVersionChip" id="pluginVersionChip" title="当前插件版本">v${PLUGIN_VERSION}</span>
        <button type="button" class="secondary topbarIconButton" data-section-target="settings" data-anchor-target="settings" title="设置" aria-label="设置">&amp;#9881;</button>
      </div>
    </header>
```

结论：`statusLegend`（1339）即「顶部颜色条」；同一 `header.topbar` 内的 `.topbar-actions`（1340-1350）是唯一合适的按钮位置，1340 与 1341 之间即「颜色条后面」。


### 7.2 顶栏现成样式与可做开启态的徽章（E03+E04）

### E03 颜色条样式
`src/ui/PanelHtml.legacy.ts` 行 1035-1043。

```css
    .statusLegend { position: relative; z-index: 3; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-width: 0; flex: 1 1 auto; padding: 0; border: 0; background: transparent; backdrop-filter: none; color: #475569; box-shadow: none; }
    .legendItem { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 750; white-space: nowrap; }
    .legendDot { width: 8px; height: 8px; border-radius: 999px; background: #2563EB; box-shadow: 0 0 0 3px rgba(37, 99, 235, .10); }
    .legendDot.good { background: #16A34A; box-shadow-color: rgba(22, 163, 74, .12); }
    .legendDot.info { background: #2563EB; }
    .legendDot.warn { background: #D97706; box-shadow-color: rgba(217, 119, 6, .12); }
    .legendDot.error { background: #DC2626; box-shadow-color: rgba(220, 38, 38, .12); }
    .legendDot.mine { background: #7C3AED; box-shadow-color: rgba(124, 58, 237, .12); }
```

### E04 顶部按钮/徽章现成样式（新按钮可直接复用）
`src/ui/PanelHtml.legacy.ts` 行 122-125：

```css
    .topbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; min-width: 0; }
    .topbar-actions { margin-left: auto; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; min-width: 0; }
    .topbar-actions button { min-height: 24px; padding: 3px 8px; font-size: 12px; }
    .topbar-actions .topbarIconButton { width: 28px; height: 28px; min-width: 28px; padding: 0; font-size: 15px; }
```

行 791（徽章 `.status-chip`，可做「开启态」视觉）：

```css
    .pill, .status-chip { display: inline-flex; align-items: center; gap: 5px; min-height: 20px; border: 1px solid var(--border); border-radius: 999px; padding: 1px 7px; background: var(--subtle-bg); color: var(--muted); font-size: 12px; }
```

另：行 1036 `.topbar-actions { align-items: center; }`；行 1270 窄屏 `.topbar-actions { justify-content: flex-start; margin-left: 0; }`。


### 7.3 现成「顶部开关 + 状态回显」先例：低效果模式完整链路（E05）

### E05 现成「顶部开关 + 状态回显」完整先例：低效果模式（宿主注入按钮）
`src/extension/legacy.ts` 行 1108、26908-26937、24540。

```ts
    private panelLowEffectsMode = false;                                   // 1108
```

```ts
        const document = renderPanelBootstrapDocument(renderPanelHtml, renderPanelRecoveryHtml);   // 26910
        const generation = ++this.panelDocumentGeneration;
        const html = this.panelLowEffectsMode && !document.recovered
            ? document.html.replace("<body>", '<body class="panel-low-effects">')
                .replace('<div class="topbar-actions">', '<div class="topbar-actions"><button data-command="reloadPanel" type="button" title="重新加载并恢复标准视觉效果">恢复标准视觉</button>')
            : document.html;
        this.view.webview.html = this.stampPanelDocument(html, generation);
```

```ts
    private reloadPanelHtml(): void | Promise<void {                        // 26928
        if (this.panelNeedsWebviewReset) return this.resetUnresponsivePanelRenderer();
        this.panelLowEffectsMode = false;
        this.loadPanelHtml();
    }
    private reloadPanelLowEffects(): void | Promise<void {                  // 26933
        if (this.panelNeedsWebviewReset) return this.resetUnresponsivePanelRenderer();
        this.panelLowEffectsMode = true;
        this.loadPanelHtml();
    }
```

状态回显（写进诊断载荷，行 24540）：`lowEffectsMode: this.panelLowEffectsMode,`
样式开关（`src/ui/PanelHtml.legacy.ts` 行 1322-1323）：`body.panel-low-effects * @{ ... }`。
注意：该先例是**不持久化的进程内字段**（`panelLowEffectsMode` 从不写 Memento），且靠宿主字符串 `replace` 注入按钮。低流量要求跨重载保持，不能照抄这一半。


### 7.4 面板按钮点击分发与按钮生成器（E06+E07）

### E06 面板按钮通用点击分发（新按钮无需自绑事件，只要 data-command）
`src/ui/PanelHtml.legacy.ts` 行 3717-3718、3730-3731、3797。

```js
      const button = event.target.closest("button[data-command]");
      if (button && !button.disabled) {
        /* 3720-3757：工作详情分组滚动 + 少数命令专用 payload 组装 */
        const command = button.dataset.command;
        const payload = payloadFromButton(button);
        /* 3758-3796：commandNeedsLoading(command) 决定是否登记 pending / 发 clientActionId */
          vscode.postMessage(Object.assign({ command }, payload));
        }
        return;
      }
```

要点：`button.disabled` 直接短路（禁用态只需渲染期加 `disabled`）；未被 `commandNeedsLoading` 列入的命令不发 `clientActionId`、不进 pending，适合纯本地开关。

### E07 按钮 markup / 禁用态生成器（状态回显与禁用理由的标准写法）
`src/ui/PanelHtml.legacy.ts` 行 17461-17481，符号 `actionButton`。

```js
    function actionButton(label, command, options) {
      if (["archiveArtifacts", "deleteArtifacts", "archivePlanCopy"].includes(command)) return "";
      options = options || {};
      const savedPayload = sanitizeActionPayload(options.payload || {});
      const batchPayload = options.batch ? Object.assign({ batchSelected: "true" }, selectedTaskPayloadFromState(lastState || {})) : {};
      const pendingPayload = Object.assign({}, savedPayload, batchPayload);
      const reason = options.disabledReason || actionButtonDisableReason(command, pendingPayload, options);
      const pendingKey = pendingKeyForAction(command, pendingPayload);
      const pending = pendingButtonKeys?.has(pendingKey);
      const disabled = reason || pending ? " disabled" : "";
      const titleText = reason || (pending ? "执行中" : commandHelp(command));
      const title = titleText ? ' title="' + escAttr(titleText) + '" aria-label="' + escAttr(label + "：" + titleText) + '"' : "";
      const confirmAttr = options.confirm ? ' data-confirm="true"' : "";
      const dangerAttr = options.danger ? ' data-danger="true"' : "";
      /* 17475-17480：actionId / actionSection / configScope 等 data-* 属性 */
      return '<button data-command="' + escAttr(command) + '" data-pending-key="' + escAttr(pendingKey) + '"' + buttonPayloadAttributes(savedPayload) + actionIdAttr + actionSectionAttr + ' data-context-action="true"' + disabled + title + confirmAttr + dangerAttr + batchAttr + configScopeAttr + '>' + loadingPrefix(pending) + esc(label) + '</button>';
    }
```

开关态回显的另一先例是 `aria-pressed`（行 1362 抽屉固定按钮、2138/2147/2220 tmux 筛选按钮），例如行 2138：
```js
      html += '<button type="button" class="tmuxWindowCard other' + (allActive ? ' is-active' : '') + '" data-tmux-filter="all" aria-pressed="' + (allActive ? "true" : "false") + '" title="显示 GPU 任务概览；普通会话可在下方展开"><span>GPU 总览</span><b>' + String(gpuCandidates.length) + '</b></button>';
```
顶部 topbar 目前是**静态 HTML，无任何 JS 改写 `.topbar` 的代码**；开启/关闭文案与 `aria-pressed` 需在状态渲染链上改写（落点见 E13）。


### 7.5 宿主接收消息、命令白名单与 handleMessageCore 分发（E08+E09）

### E08 宿主接收消息与分发
`src/extension/legacy.ts` 行 5173-5181（注册处，在 `resolveWebviewView` 内，带 view/代际守卫）：

```ts
        this.viewLifetimeDisposables.push(webviewView.webview.onDidReceiveMessage((message) => {
            if (this.view !== webviewView || this.viewGeneration !== viewGeneration) return;
            void this.handleMessage(message).catch((e) => {
                if (this.view !== webviewView || this.viewGeneration !== viewGeneration) return;
                console.error("[legacy] handleMessage unhandled", e);
                try { this.recordActionError(String(e?.message || e)); } catch {}
                try { this.postState(); } catch {}
                try { const vscode = require("vscode"); vscode.window.showErrorMessage(String(e?.message || e)); } catch {}
            });
        }));
```

行 6474-6486（`handleMessage`：白名单不过 → 记录错误 + `postState()`，即错误回执形态；原文逐字）：

```ts
    async handleMessage(message) {
        console.log("[legacy] handleMessage", message?.command, message);
        console.log("[diag] handleMessage entry", { command: stringField(message, "command"), clientActionId: stringField(message, "clientActionId") });
        const rawCommand = stringField(message, "command");
        const command = getSafeCommand(message);
        const clientActionId = stringField(message, "clientActionId");
        if (rawCommand && !command) {
            const text = ```未知或未放行的前端命令：${rawCommand}```;
            if (clientActionId)
                this.postUiCommandStatus(clientActionId, "failed", rawCommand, text);
            this.recordActionError({ command: rawCommand, message: text, suggestion: "请更新插件或清除旧布局中的失效按钮。" });
            this.postState();
            return;
        }
        /* 6487-6501：commandNeedsUiStatus / hostOperationLease 包装（见 E09 提示） */
        await this.handleMessageCore(message, command);
    }
```

行 6503-6505 与 6623-6630、6758-6763（分发链与本地型命令先例）：

```ts
    async handleMessageCore(message, command = getSafeCommand(message)) {
        if (command === "answerRunConfirmation") { this.runConfirmation.answer(message); return; }
        if (command === "retryPlanSubmission") return this.resumePlanSubmission(String(message.operationId || ""));
        /* ... 6507-6513：webview* 类消息须过 isCurrentPanelDocumentMessage；reloadRequired / 生命周期门禁 ... */
            case "reloadPanel":                                     // 6623
                await this.reloadPanelHtml();
                break;
            case "reloadPanelLowEffects":                           // 6626
                await this.reloadPanelLowEffects();
                break;
            case "pauseAll":                                        // 6758
                await this.pauseAllNetworkActivity();
                break;
            case "resumeNetwork":                                   // 6761
                this.resumeNetwork();
                break;
```

错误回执第二路径：`postUiCommandStatus(clientActionId, status, command, text)` → 面板 `item.type === "uiCommandStatus"` 分支（E13，行 4407-4419）。纯本地开关若不带 `clientActionId`，只需 `postState()` 让状态字段回显。

### E09 命令白名单（新增一条消息必须同改的集合）
`src/extension/legacy.ts`：
- 行 238-297：`type WebviewActionCommand = | "validatePlan" | ... | "cleanupDrafts";`（附注释「Update commands are intentionally local-only and do not enter the remote action map.」）
- 行 560-612：`const uiActionCommands = new Set<WebviewActionCommand>([ ... ]);`
- 行 613-643：`const SAFE_WEBVIEW_COMMANDS = new Set([ ... ]);`，含本地/诊断类命令（原文片段）：

```ts
    "webviewNotice", "webviewReady", "webviewHeartbeatAck", "webviewStateRendered", "webviewSectionInterest", "webviewSectionTelemetry", "webviewLayoutEvidence", "webviewBootstrapPhase", "webviewBootstrapError", "webviewRuntimeIncident", "webviewRenderError", "webviewVisibility", "copyPanelDiagnostics", "reloadPanel", "reloadPanelLowEffects", "reloadWindow", "recallPlanToLocalQueue", "quickSetup", /* ... */ "pauseAll",
    "resumeNetwork", "snapshot", "manualGpuSnapshot", /* ... */ "saveUiLayout", "resetUiLayout",
```

- 行 31138-31141（放行函数，逐字）：

```ts
function getSafeCommand(message) {
    const command = stringField(message, "command");
    return SAFE_WEBVIEW_COMMANDS.has(command) || uiActionCommands.has(command) ? command : "";
}
```

- 行 648：`const COMMANDS_WITHOUT_UI_STATUS = new Set(["webviewNotice", "selectPlan", "selectExperiment", "selectLogRunKey", "openPlan", "status"]);`
  行 31220-31222：`function commandNeedsUiStatus(command) { return Boolean(command) && !COMMANDS_WITHOUT_UI_STATUS.has(command); }` —— 纯 UI 切换若想避免宿主弹通知/进行中态，需加入该集合。
- 行 644-647：`const API_EXECUTABLE_COMMANDS = new Set([...uiActionCommands, ...SAFE_WEBVIEW_COMMANDS].filter((command) => !API_INTERNAL_COMMANDS.has(command)));` —— 若不希望该命令被 `simpleex` CLI/API 触发，需同时进 `API_INTERNAL_COMMANDS`（成员未取原文，见 §6）。
- 行 31150-31168：`hostOperationUiCommands` / `hostOperationLeaseActionForUiCommand` / `READ_ONLY_HOST_LEASE_UI_COMMANDS`；该处注释明确「只读查看入口不得占用宿主独占租约」→ 本地开关**不要**加入 `hostOperationUiCommands`。


### 7.6 持久化一：Memento 键表与 store:"global" 用法（E10）

### E10 持久化方式一：VS Code Memento（本项目主用，键表集中）
`src/extension/legacy.ts` 行 378-399（键表，节选）：

```ts
 const keys = {
    tunnelConfig: "simpleExperiment.tunnelGatewayConfig",
    setupConfig: "simpleExperiment.xshellRealtimeTunnelConfig",
    migrationShown: "simpleExperiment.legacyRemoteMigrationShown",
    offlineBundle: "simpleExperiment.offlineBundle",
    uiLayout: "simpleExperiment.uiLayout",
    uiProjectActions: "simpleExperiment.uiProjectActions",
    uiProjectLayout: "simpleExperiment.uiProjectLayout",
    hiddenLegacyTaskUiKeys: "simpleExperiment.hiddenLegacyTaskUiKeys",
    executionHistoryCutoffs: "simpleExperiment.executionHistoryCutoffs",
    executionHistoryHiddenOperationIds: "simpleExperiment.executionHistoryHiddenOperationIds",
    retiredOperationIds: "simpleExperiment.retiredOperationIds",
    pptPlotConfig: "simpleExperiment.pptPlotConfig",
    /* ... */
    pluginUpdateStatus: "simpleExperiment.pluginUpdateStatus",
    setupConfigurationSignature: "simpleExperiment.setupConfigurationSignature",
 };
```

行 403-421（`API_STATE_KEYS`：声明每键属 global 还是 workspace，CLI 据此读写）：

```ts
 const API_STATE_KEYS = {
    tunnelConfig: { store: "global", label: "隧道网关配置", writable: true },
    setupConfig: { store: "global", label: "Xshell 会话与服务器配置", writable: true },
    pptPlotConfig: { store: "global", label: "PPT 绘图配置（项目优先）", writable: true },
    uiLayout: { store: "global", label: "SimpleExperiment 面板布局", writable: true },
    hiddenLegacyTaskUiKeys: { store: "global", label: "隐藏旧任务 UI 键", writable: true },
    offlineBundle: { store: "workspace", label: "离线导入包", writable: false },
    uiProjectLayout: { store: "workspace", label: "项目面板布局", writable: true },
    uiProjectActions: { store: "workspace", label: "项目固定操作", writable: true },
    /* ... */
 } as Record<string, { store: "global" | "workspace"; label: string; writable: boolean }>;
```

行 3211-3239（真实写路径，节选）：

```ts
    async apiStateSet(params = {}) {
        const key = stringField(params, "key");
        const meta = API_STATE_KEYS[key];
        if (!meta) throw new Error(```未知 SimpleExperiment 状态：${key}```);
        if (!meta.writable) throw new Error(```SimpleExperiment 状态 ${key} 只读，请使用对应功能入口修改。```);
        if (params.confirm !== true) throw confirmationRequired({ operation: "state.set", requires: ["confirm"], key, current: redactApiStateValue(key, this.apiStateValue(key)) });
        const value = normalizeApiStateValue(key, params.value);
        const stateKey = (keys as Record<string, string>)[key];
        if (meta.store === "global") await this.context.globalState.update(stateKey, value);
        else await this.context.workspaceState.update(stateKey, value);
        if (key === "tunnelConfig" || key === "setupConfig") {
            this.tunnelConfig = this.loadTunnelConfig();
            this.setupConfig = this.loadSetupConfig();
            this.resetClient();
        }
        this.postState();
        return { ok: true, key, store: meta.store, value: redactApiStateValue(key, this.apiStateValue(key)) };
    }
```

行 24892-24900（读取合并顺序：globalState 存储 → settings.json 显式值覆盖）：

```ts
    loadTunnelConfig() {
        const saved = this.context.globalState.get(keys.tunnelConfig) || {};
        const config = vscode.workspace.getConfiguration("simpleExperiment");
        return (0, TunnelGateway_1.normalizeTunnelGatewayConfig)({
            ...TunnelGateway_1.defaultTunnelGatewayConfig,
            ...saved,
            connectionMode: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "connectionMode", (0, TunnelGateway_1.isRealtimeConnectionMode)(saved.connectionMode) ? saved.connectionMode : TunnelGateway_1.xshellTunnelConnectionMode),
            localPort: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "tunnel.localForwardPort", saved.localPort || TunnelGateway_1.defaultTunnelGatewayConfig.localPort),
            remotePort: (0, ConfigurationSettings_1.explicitConfigurationValue)(config, "tunnel.remoteAgentPort", saved.remotePort || TunnelGateway_1.defaultTunnelGatewayConfig.remotePort),
```

行 1420（workspaceState 另一处直接用法）：`void this.context.workspaceState.update("simpleExperiment.localApiPort", discovery.port).then(undefined, () => undefined);`
`src/extension/ExtensionContext.ts` 行 46-47、62-84 提供 `readGlobalState/writeGlobalState/readWorkspaceState/writeWorkspaceState` 包装（工厂路径用它）。
`api.json` 只是本地 API 发现文件（`legacy.ts:376-377`：%APPDATA%/SimpleExperiment/api.json），不是 UI 状态存储。
`package.json` 的 `contributes.configuration`（行 352 起）现有项都是 `simpleExperiment.*`（`panel.retainContextWhenHidden`（default false）、`topologyMode`、`showAdvancedCommands` 等），无 refreshProfile 项。

多窗口语义（只述事实）：`globalState` 随用户 profile 全局共享；`workspaceState` 随工作区共享（同工作区多窗口读同一份）。写 Memento 不会出现「每窗口各一份」，但两窗口同时切换会后写覆盖前写，且一方切换不会自动推送给另一方面板（面板只在宿主 `postState` 时刷新）。


### 7.7 持久化二：Webview setState 及其限制（E11）

### E11 持久化方式二：Webview setState（面板 UI 态）
`src/ui/PanelHtml.legacy.ts` 行 15569-15585（逐字）：

```js
    function readStoredWebviewState(api) {
      try {
        const value = typeof api.getState === "function" ? api.getState() : null;
        return value && typeof value === "object" && !Array.isArray(value) ? value : {};
      } catch (_) { return {}; }
    }

    function persistWebviewState(patch) {
      if (typeof vscode.setState !== "function") return false;
      try {
        vscode.setState(Object.assign({}, readStoredWebviewState(vscode), patch || {}));
        return true;
      } catch (_) {
        // Storage failure must not abort a render/ACK or destroy in-memory edits.
        return false;
      }
    }
```

行 1945 启动读回：`const restoredWebviewState = readStoredWebviewState(vscode);`
行 15467：`function normalizeStoredPanelMap(value, nested)`（有界化 + `__proto____BT@ 防护）。
用法示例（行 4434）：`persistWebviewState({ tmuxSelectedWorkerId: tmuxSelectedWorkerId });`
另有 GPU 表格列宽直接用 `window.localStorage`（行 11092-11141、12307-12319），仅适合纯视觉偏好。
限制（据 E11 + E13 的 `transientPanelStateNeedsRestore` 逻辑）：webview setState 只在同一 Webview 文档恢复链有效；`retainContextWhenHidden` 默认 false（`package.json` 配置项 default false）时隐藏面板即释放上下文，宿主重载 HTML 不保证读得到旧值。跨重载/跨窗口的权威值必须由宿主 Memento 提供。


### 7.8 宿主→面板状态载荷与面板侧收敛/握手恢复（E12+E13，回显落点）

### E12 宿主 → 面板状态载荷形态（新增回显字段的位置）
`src/extension/legacy.ts:190`：`type WebviewClusterState = Record<string, unknown>;`（无字段表，新增字段不需改接口声明）
行 26803-26850（`postState` 节选）：

```ts
    private postState(immediate = false, bootstrap = false): void {
        if (["disposed", "maintenance", "reload_required"].includes(this.panelLifecycleState)) return;
        if (this.extensionRuntimeVersionState().reloadRequired) { this.showPanelReloadRequired(); return; }
        if (!this.view) return;
        this.syncPanelStateFlowVisibility();
        const decision = PanelStateFlowControl_1.requestPanelStateFlowPost(this.panelStateFlow, immediate, bootstrap);
        /* ... 隐藏 / awaiting-render / 背压 抑制分支 ... */
        if (!this.webviewReady) { return; }
        if (immediate) { /* 清 timer */ this.flushStatePost(true); return; }
        /* ... */
        this.statePostTimer = setTimeout(() => this.flushStatePost(false), delayMs);
        this.statePostTimer.unref?.();
    }
```

行 27381-27459（`flushStatePost` 节选，含真实消息形状与体积门禁）：

```ts
    private flushStatePost(force, bootstrap = false): void {
        /* ... 生命周期 / 可见性 / outstandingRenderSeq 门禁 ... */
        let state: WebviewClusterState;
        const buildStartedAt = Date.now();
        try {
            state = this.buildState({ panelProjection: true });
            this.lastStateBuildErrorSignature = "";
        }
        catch (error) {
            const message = errorMessage(error);
            this.lastError = ```面板状态生成失败：${message}```;
            /* recordActionError + this.buildPanelFallbackState(this.lastError) */
        }
        /* ... */
        let stateMessage = { type: "state", seq: ++this.stateSequence, state };
        let serializedMessage = JSON.stringify(stateMessage);
        let payloadBytes = Buffer.byteLength(serializedMessage, "utf8");
        if (payloadBytes > this.statePayloadSoftLimitBytes) this.recordPanelLifecycleDiagnostic("statePayloadSoftLimit");
        if (payloadBytes > this.statePayloadHardLimitBytes) { state = this.buildPanelDegradedState(state, "面板数据量过大，已进入精简模式。"); /* 重序列化，仍超限再 buildMinimalPanelDegradedState */ }
```

宿主已有「状态体积软/硬上限 + 两级降级」；`docs/plugin-stability-improvement-plan.md:308` 明确该统计是 Host→Webview，不等于隧道流量。

### E13 面板侧状态收敛/握手恢复（UI 回显与重载恢复落点）
`src/ui/PanelHtml.legacy.ts` 行 4259-4277（握手，逐字）：

```js
    function requestInitialPanelState() {
      console.log("[webview] post webviewReady");
      try { window.dispatchEvent(new Event("simple-panel-bootstrap-ready")); } catch (_) {}
      const notice = el("initialStateNotice");
      const retry = el("initialStateRetry");
      if (notice) notice.hidden = false;
      if (retry) retry.hidden = true;
      el("initialStateMessage").textContent = "正在读取本地面板状态...";
      document.body.setAttribute("aria-busy", "true");
      vscode.postMessage({ command: "webviewReady", documentGeneration: panelDocumentGeneration, extensionVersion: panelRunningVersion, documentBuildId: panelDocumentBuildId });
      if (initialStateTimer) clearTimeout(initialStateTimer);
      initialStateTimer = window.setTimeout(() => { /* 8s 未收到 → 文案改「尚未收到本地面板状态。」+ 显示「重新读取」 */ }, 8000);
    }
```

行 4220-4221：`el("initialStateRetry").addEventListener("click", requestInitialPanelState); requestInitialPanelState();`

行 4393-4412（宿主消息入口，节选）：

```js
    function handleIncomingWebviewMessage(message) {
      if (!message) return;
      if (message.type === "panelHeartbeat") { vscode.postMessage({ command: "webviewHeartbeatAck", /* ... */ }); return; }
      const messages = flattenIncomingWebviewMessages(message);
      let latestStateMessage = null;
      let latestNavigationMessage = null;
      for (const item of messages) {
        if (!item) continue;
        if (item.type === "uiCommandStatus") { /* 4407-4419：更新 planStopClear / tmux busy / handleUiCommandStatus(item); continue; */ }
        if (item.type === "gpuWindowSamples") { applyGpuWindowSamples(item); continue; }
        if (item.type === "tmuxList") { /* 4423-4447：缓存 + persistWebviewState({ tmuxSelectedWorkerId }) + 渲染 */ }
```

行 4490-4512（状态帧收敛 → 渲染；低流量按钮 UI 回显应在此链上的渲染函数改写 topbar）：

```js
      if (latestStateMessage) {
        const incomingSeq = Number(latestStateMessage.seq);
        if (Number.isSafeInteger(incomingSeq) && incomingSeq > lastReceivedStateSeq) {
          lastReceivedStateSeq = incomingSeq;
          /* ... */ completeInitialPanelState();
          const incomingState = latestStateMessage.state || {};
          if (transientPanelStateNeedsRestore && transientPlanSelectionDirty) {
            const selectedPlanFile = restoredTransientPanelState.selectedPlanFile;
            lastState = Object.assign({}, incomingState, { /* 本机未确认的选择优先 */ });
            if (selectedPlanFile !== String(incomingState.planFileInput || ((incomingState.selection || {}).selectedPlanId || ""))) {
              vscode.postMessage({ command: "selectPlan", planFile: selectedPlanFile });
            }
          } else lastState = incomingState;
          pendingRenderSeq = incomingSeq;
          pendingRenderState = lastState;
          awaitingVisibleStateRefresh = false;
          rememberGpuHistoryState(lastState.gpuHistory);
          invalidateSelectedTaskPayload();
          clearCompletedPendingButtons(lastState);
          scheduleStateRender();
```


## 8. 节流挂点原文（低流量的可复用接入面）

### 8.1 realtimeRefreshPolicy、refreshProfiles、requestBudgetConfigFromTunnel（含 maxRequestsPerMinute 被硬置 0 处）、pauseAll/resumeNetwork（E14）

### E14 节流既有能力（低流量模式的可复用挂点）
E14a `src/extension/legacy.ts` 行 25561-25574（逐字）：

```ts
    private realtimeRefreshPolicy() {
        const hiddenPause = this.tunnelConfig.pauseWhenWebviewHidden !== false;
        const streaming = this.tunnelConfig.allowStreaming !== false && this.tunnelConfig.refreshProfile !== "manual_only";
        return {
            ...RealtimeTunnelClient_1.defaultRealtimeRefreshPolicy,
            mode: this.tunnelConfig.refreshProfile === "manual_only" ? "manual_only" : this.tunnelConfig.refreshProfile === "balanced" ? "balanced" : "realtime",
            preferWebSocket: streaming,
            fallbackToSse: streaming,
            fallbackToPolling: this.tunnelConfig.refreshProfile !== "manual_only",
            snapshotFallbackIntervalSeconds: 5,
            pauseWhenWebviewHidden: hiddenPause,
            keepAgentStreamWhenHidden: true,
        };
    }
```

E14b `src/tunnel/TunnelGateway.ts` 行 18-59、78-83、99-105：

```ts
  healthCheckIntervalSeconds: number;
  snapshotPollIntervalSeconds: number;
  maxRequestsPerMinute: number;
  allowStreaming: boolean;
  streamingRequiresExplicitConfirm: boolean;
  pauseWhenWebviewHidden: boolean;
  pauseAllBackgroundTraffic: boolean;
  refreshProfile: RefreshProfile;
}

export interface RefreshProfileConfig { health: number; snapshot: number; stream: boolean; }

export const refreshProfiles: Record<RefreshProfile, RefreshProfileConfig> = {
  realtime: { health: 5, snapshot: 30, stream: true },
  balanced: { health: 10, snapshot: 60, stream: true },
  manual_only: { health: 0, snapshot: 0, stream: false },
};

export const defaultTunnelGatewayConfig: TunnelGatewayConfig = {
  enabled: true, connectionMode: xshellTunnelConnectionMode, provider: "xshell",
  localHost: "127.0.0.1", localPort: 18765, remoteHost: "127.0.0.1", remotePort: 18765,
  hubServerId: "", tunnelStartMode: "manual",
  healthCheckIntervalSeconds: 30, snapshotPollIntervalSeconds: 30, maxRequestsPerMinute: 0,
  allowStreaming: true, streamingRequiresExplicitConfirm: false,
  pauseWhenWebviewHidden: true, pauseAllBackgroundTraffic: false, refreshProfile: "realtime",
};
```

```ts
    refreshProfile: input.refreshProfile && refreshProfiles[input.refreshProfile] ? input.refreshProfile : defaultTunnelGatewayConfig.refreshProfile,
    allowStreaming: input.refreshProfile === "manual_only" ? false : input.allowStreaming !== false,
```

```ts
export function requestBudgetConfigFromTunnel(config: TunnelGatewayConfig): RequestBudgetConfig {
  return { ...defaultRequestBudgetConfig, maxRequestsPerMinute: 0, pauseWhenHidden: config.pauseWhenWebviewHidden };
}
```

事实：`maxRequestsPerMinute` 在此被无条件置 0，配置里的同名字段不生效 —— 低流量若要走限流必须改这里（实现面事实，非本轮结论）。

E14c `src/extension/legacy.ts` 行 6140-6157（`pauseAll`/`resumeNetwork` 的真实语义，已存在，可被低流量复用或互斥）：

```ts
        await client.disconnect("paused");
        if (generation !== this.projectContextGeneration || client !== this.client) return;
        this.lastHealth = { state: "paused", status: "paused", checkedAt: new Date().toISOString(), message: "所有网络活动已暂停。" };
        this.postState();
    }
    async resumeNetwork() {
        const generation = this.projectContextGeneration;
        await this.clearOfflineImport();
        if (generation !== this.projectContextGeneration) return;
        this.client.resume();
        void this.ensureRealtimeConnected("resume network");
        this.postState();
    }
```


### 8.2 RequestBudget 的 paused / hidden / 合并计数入口（工作副本源码原文）

`src/tunnel/RequestBudget.ts`（文件 SHA256 ac1b692a038b6e8b7e12fa28d05c059c649323fce78bd37cbe18dd4b785bd5b1）符号 `defaultRequestBudgetConfig`，行 92-105：

```ts
export const defaultRequestBudgetConfig: RequestBudgetConfig = {
  maxRequestsPerMinute: 0,
  maxConcurrentRequests: 0,
  maxConcurrentRequestsPerWorker: 4,
  maxConcurrentRequestsGlobal: 8,
  maxConcurrentTransfersPerWorker: 1,
  maxConcurrentTransfersGlobal: 2,
  maxConcurrentEmergencyRequests: 2,
  maxQueuedRequests: 256,
  pauseWhenHidden: true,
  allowManualOverride: true,
  disabledPurposes: [],
  minIntervalByPurpose: {},
};
```

同文件符号 `class RequestBudget` 的 `noteCoalescedRequest` / `setHidden` / `pauseAll` / `resume` / `isPaused` / `decide`，行 367-400：

```ts
  noteCoalescedRequest(): void { this.coalescedRequests += 1; }
  noteRetry(): void { this.retries += 1; }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.coordinator.notifyStateChanged();
  }

  pauseAll(): void {
    this.paused = true;
    this.coordinator.notifyStateChanged();
  }

  resume(): void {
    this.paused = false;
    this.coordinator.notifyStateChanged();
  }

  isPaused(): boolean {
    return this.paused;
  }

  decide(purpose: TunnelRequestPurpose, options: RequestBudgetRunOptions = {}): RequestBudgetDecision {
    const now = Date.now();
    this.prune(now);

    const manualHealthOverride = options.userInitiated && purpose === "health" && this.config.allowManualOverride;
    if (this.paused && !manualHealthOverride) return this.deny(now, purpose, "paused");
    if (this.config.disabledPurposes?.includes(purpose)) return this.deny(now, purpose, "offline");
    if (this.config.pauseWhenHidden && this.hidden && !options.userInitiated && !options.visibleBypass && purpose !== "health" && purpose !== "job_dispatch" && purpose !== "job_reconcile") {
      return this.deny(now, purpose, "hidden");
    }
    return { allowed: true };
  }
```

事实：`decide()` 只有 `paused`、`disabledPurposes`、`pauseWhenHidden && hidden` 三条拒绝路径；`minIntervalByPurpose` 默认 `{}`（第 104 行），即当前完全没有按 purpose 的限频在生效；`pauseAll()` / `resume()` 是现成的全局暂停通道（由 `pauseAll` / `resumeNetwork` 命令使用，见 §8.1）。

### 8.3 默认实时刷新策略（快照回退与隐藏暂停的真实默认值）

`src/tunnel/RealtimeTunnelClient.legacy.ts`（文件 SHA256 52ba675bca6c53e686007fe9c3f95e75171073d4c6c56bf5521a3f9f611fa625）符号 `defaultRealtimeRefreshPolicy`，行 34-52：

```ts
export const defaultRealtimeRefreshPolicy: RealtimeRefreshPolicy = {
  mode: "realtime",
  preferWebSocket: true,
  fallbackToSse: true,
  fallbackToPolling: true,
  heartbeatIntervalSeconds: 5,
  snapshotFallbackIntervalSeconds: 5,
  gpuEventCoalesceMs: 500,
  uiBatchMs: 100,
  logTailEnabledByDefault: false,
  logTailOnlyForSelectedExperiment: true,
  logTailIntervalSeconds: 1,
  fileTransferManualOnly: true,
  fileTransferMaxConcurrent: 1,
  reconnectInitialDelaySeconds: 3,
  reconnectMaxDelaySeconds: 60,
  pauseWhenWebviewHidden: false,
  keepAgentStreamWhenHidden: true,
};
```

事实：该默认值中 `pauseWhenWebviewHidden: false`，而 `defaultRequestBudgetConfig.pauseWhenHidden: true`（§8.2）；最终生效值由 `realtimeRefreshPolicy()`（§8.1）从 `tunnelConfig` 派生 —— 这正是调查者A列为「未知」的「隐藏时 500ms tick 是否真被 budget 拦住」的根源。

### 8.4 并发读合并入口（SharedReadCoalescer 与 subscribeRead）

`src/core/SharedReadCoalescer.ts:9` 为 `export class SharedReadCoalescer`（本轮实测）。实时客户端调用点：`src/tunnel/RealtimeTunnelClient.legacy.ts:82` `private readonly sharedReads = new SharedReadCoalescer(64);`（本轮实测）。HTTP 侧合并入口见 §6 原文中的 `TunnelClient.legacy.ts:338-340`；`subscribeRead` 声明在第 344 行，`readKey` 由 `purpose\0user/background\0apiPath\0POST体JSON` 组成（第 351 行，本轮实测），命中即 `budget.noteCoalescedRequest()`（§8.2 第 367 行）不重复发网络。

## 9. 现有省流量设施与「明确没有」的清单（原文，含响应体量级定性）

### 原文·调查者A 6. 现有可复用的省流量机制（事实）

**已有（可复用）：**
- 并发读合并 `SharedReadCoalescer` + `HttpTunnelClient.subscribeRead`（同 purpose+path+body 并发只发一次；命中计数 coalescedRequests）。文件：TunnelClient.legacy.ts:343 起；RealtimeTunnelClient 用 `SharedReadCoalescer(64)`。
- `RequestBudget` / `RequestBudgetCoordinator`（`tunnel/RequestBudget.ts`）：按 purpose、并发上限（worker=4/global=8）、队列、coalescing、`isPaused()`、`setHidden()`、`minIntervalByPurpose`（默认空 {}）、`pauseWhenHidden`（默认 true）。是天然的“低流量开关”接入点。
- 快照去重：`RealtimeTunnelClient.snapshotInFlight`/`snapshotPromise` 单飞。
- Worker 快照缓存与跳过：`cachedWorkerTaskSnapshot`/`storeWorkerTaskSnapshot`；`excludeVerifiedCompleted` 自动轮询不再复查已确认完成 job（refreshServerPlanProgress:2733/2751）。
- 轻量库存：`executionOnly` 查询只取 tmux 库存，跳过 artifact-manifest/日志全量读（refreshWorkerTaskSnapshot:2778-2790 注释明确）。
- 增量游标：`/api/live-output?...&since=<offset>`（日志尾增量）、WS/SSE `/api/events?since=<seq>`（事件增量）。
- 遥测事件类型限流：`logTailMode=selected_run_only`、`maxConcurrentLogTails=1`、`logTailEnabledByDefault=false`（默认不全量拉日志）。
- GPU/UI 合并：`gpuEventCoalesceMs=500`、`uiBatchMs=100`；GPU 采样本地环形缓冲 `gpuSampleRing`。
- 结果目录缓存 `resultCatalogTtlMs=5000`；结果收集支持 `memoryOnly/metricsOnly` 只读内存指标（ResultCollectionHost:154-157、legacy.ts:22155）。
- 实时 push 优先：WS→SSE→快照，WS/SSE 正常时不轮询（RealtimeTunnelClient.connect:113-138）。
- 可见性/隐藏暂停：`RequestBudget.setHidden`、`RealtimeTunnelClient.setHidden`（hidden 时清 pollTimer/reconnectTimer :416-418）、Webview tmux 轮询 document.hidden 门控、`refreshServerPlanProgress` 检查 view.visible。
- 文件传输压缩：SFTP 层 `compression auto|gzip|zstd|none`（cli/plugins.ts、help.ts）；FileTransferClient 走流式。

**没有（明确“无”）：**
- **控制面 HTTP 无 HTTP 缓存/条件请求**：全仓 `If-None-Match`/`ETag`/`If-Modified`/`Accept-Encoding`/`gzip`/`Content-Encoding` 仅出现在 (a) GitHub 更新客户端 `updates/ReleaseClient.ts:58`（`If-None-Match`）和 (b) SFTP 传输压缩参数（cli/plugins.ts、cli/help.ts）。**Agent 控制面 HTTP 请求不带 ETag/If-None-Match/If-Modified-Since，也不请求 gzip 压缩。**
- **无跨轮次快照内容哈希/变化检测**去抑制轮询（REALTIME_UI_HASH 只用于 Webview 渲染 diff，不抑制网络请求）。
- 控制面无批量“多 worker 一次请求”聚合接口（batch 是本地 Promise.all 多次单 worker 调用，readWorkerTaskSnapshotBatch 仍按 worker 逐个查）。

---

### 原文·调查者A 7. 响应体量级定性（事实+推断）

- 最大响应（跨机）：
  1. `/api/worker/tasks` 全量查询：AGENTS 与 refreshWorkerTaskSnapshot 注释明确「legacy task_query answers with artifact-manifest and dead-pane log reads for EVERY inventory row」——**逐行含 manifest + 日志读，最大**。低流量已有 executionOnly 轻量替代 + excludeVerifiedCompleted 跳过。
  2. `/api/snapshot`：ClusterSnapshot 含 workers/gpu/schedulerStates/experimentTraces 大数组（TunnelClient:25-31，上限 32MiB）。
  3. `/api/gpu`、`/api/gpu/history`：GPU 时序数组，中等。
  4. SFTP `downloadMappedPaths` / fpsync：整 work_dirs，**按字节最大**（但事件驱动、非定时）。
  5. `/api/code-sync/inspect`、`/api/code-sync/plan-scope`：文件清单，可能大。
- 小响应：`/api/health`、`/api/version`、`/api/capabilities`、`/api/fs/sha256`、心跳/状态操作。
- 最大请求体：`/api/worker/tasks/query`（可含 queries/discovery 数组，中等）、SFTP 传输清单 JSON（可达 MAPPED_RESULT_DOWNLOAD_MAX_ENTRIES=256 项）。控制面 GET 无请求体。

---


## 10. 验证（本轮全部未执行）与可复用测试入口

### 10.1 本轮（阶段一汇总）逐项状态

| 项 | 状态 | 说明 |
|---|---|---|
| 工作副本 `git rev-parse HEAD` / `git branch --show-current` / `git status --porcelain` | passed（exit 0） | HEAD=7a6062f…；分支 feat/low-traffic-mode-20261028；仅 1 行未跟踪 docs/agent-tasks 新增 |
| 两份调查证据复制 + 源/目标 `sha256sum` 核对 | passed（exit 0） | 两两相同，见 §3 |
| 候选文件存在性与当前 SHA256（§13） | passed（exit 0） | 全部存在，哈希与两名调查者记录一致 |
| `grep -rniE "lowTraffic|低流量|low-traffic" src` | passed（exit 1 = 零命中） | 复核 E18：当前无任何低流量实现或残留 |
| `npm run build` / `npm run compile` / `node --test …` / `npm run package` / `npm install` | 未执行（not-run） | 本轮任务硬性禁止，不得记为通过 |
| AGENTS 要求的 `vm.Script` 双重校验 | 未执行（not-run） | 属实现阶段门禁 |
| 打包、安装、发布、远端 Agent 更新 | 未执行（not-run） | 不属阶段一 |

### 10.2 可复用测试夹具、seam 与对应 npm script 名（原文，未运行）

### E15 可复用测试夹具与 seam（只列出，本轮未运行）
1. `test/ui/webviewButtonsHandled.test.js` —— 「面板每个 `data-command` 必须有宿主处理器」的硬门禁，**新增按钮直接被它约束**（从 `readSource("src/ui/PanelHtml.ts")` 抓命令，再与 `src/extension.ts` 的 `case "...">`、`dist/extension/legacy.js` 中 `handleMessageCore(` 的 `command === "X"`、`uiActionCommands` 取并集，缺失即 `assert.deepEqual(missing, [])` 失败）。关键原文：

```js
  const html = readSource("src/ui/PanelHtml.ts");
  const extension = readSource("src/extension.ts");
  const commands = new Set();
  for (const match of html.matchAll(/data-command="([A-Za-z][A-Za-z0-9]+)"/g)) commands.add(match[1]);
  const core = require("../_helpers/legacyMethod")(fs.readFileSync(path.join(root, "dist/extension/legacy.js"), "utf8"), "handleMessageCore(");
  for (const match of core.matchAll(/command === "([A-Za-z][A-Za-z0-9]+)"/g)) handled.add(match[1]);
  const uiActionBlock = extension.match(/const uiActionCommands = new Set<WebviewActionCommand>\(\[([\s\S]*?)\]\);/);
  assert.deepEqual(missing, []);
```
   该测试读取 `dist/`，属于「先 build 才有意义」的 seam。
2. `test/ui/webviewActionAllowlist.test.js` —— 断言 `src/extension.ts` 存在 `type WebviewActionCommand`、`const uiActionCommands = new Set<WebviewActionCommand>`、`const actionCommandMap`、`function getSafeCommand`，且源码不出现 `apiPath|shellCommand|remoteCommand`。改集合形状时不得破坏这些字面量。
3. `test/ui/panelTransientStorage.test.js` —— 用 `vm.createContext` + 从 legacy 源码切 `    function <name>(` 片段（`functions(["readStoredWebviewState","persistWebviewState"])`、`["normalizeStoredPanelMap"]`）直接执行面板函数，断言存储不可用不中断启动。**若低流量开关还要用 webview setState，这是现成模板。**
4. `test/ui/panelInlineScriptSyntax.test.js` + `test/features/panelWebviewScriptHealth.test.js` —— 面板内联脚本 `new vm.Script(script)` 语法/内容门禁；后者用 `ts.transpileModule` 直接加载源码渲染器（无需 build）并断言若干命令名与文案存在，是「新增按钮后写断言」的首选 seam。
5. `test/ui/actionButtonsCapability.test.js` —— 断言 HTML 含 `uiCapabilityMap`、`button.disabled`，并以 sandbox 注入方式单测 `disableReason` 链路（禁用态 seam）。
6. `test/features/panelMessageDispatch.test.js` —— 宿主消息分发回归（在 `test:plan-run` 域内）。
7. `test/_helpers/sourceReader.js` —— `IMPLEMENTATION_OF` 门面→legacy 映射表（含 `"src/extension.ts": "src/extension/legacy.ts"`）；新增断言请经 `readSource`，不要直接 `readFileSync` 门面路径。
8. `test/_helpers/legacyMethod.js` —— 按 TS AST 从 `RealtimeTunnelPanelProvider` 类精确取方法体，供断言 `handleMessageCore` 等。
9. `test/features/panelWebviewScriptHealth.test.js` 已在 build 域强制运行（E16），改 `PanelHtml.legacy.ts` 必然触发。

单文件直跑形状（项目规范，**未执行**）：`node --test --test-force-exit --test-timeout 20000 test/ui/<file>.test.js`。
npm script 对应关系（`package.json` 行 935-991 + `scripts/test-workflow.json`）：
- 上述 `panelInlineScriptSyntax / webviewButtonsHandled / webviewActionAllowlist / panelTransientStorage / actionButtonsCapability` **不属于任何 manifest domain**（在 `scripts/test-workflow.json` 对这些文件名零命中）→ 只能显式单文件运行；`npm test`（domain 源码 `npm run build && node --test test/*.test.js test/**/*.test.js`）会覆盖到它们。
- 已入组、含 UI 测试的现成入口：`test:multi-tunnel`（`test/ui/multiTunnelPortAssignmentsRender.test.js`、`hubWorkerTelemetryStatusRender.test.js`）、`test:latest-artifacts`（`syncScopeTree.test.js`）、`test:submission-truth`（多个 `test/ui/*`）、`test:failed-job-review`（`cacheCleanupPanel.test.js`）、`test:tmux-lifecycle`（`tmuxOtherSessionsDisclosure.test.js`）。
- **没有 `test:ui` 这个 script。**


### 10.3 build 门禁与 AGENTS P0 红线原文（实现阶段必跑）

### E16 build 门禁原文
`package.json` 行 935-961（节选）：

```json
    "build": "node scripts/test-workflow.js build",
    "compile": "node scripts/test-workflow.js compile",
    "typecheck": "node node_modules/typescript/bin/tsc -p . --pretty false",
    "test": "node scripts/test-workflow.js test",
    "package": "node scripts/test-workflow.js package",
    "package:assemble": "node scripts/test-workflow.js package:assemble",
    "verify:package-runtime": "node scripts/verify-vsix-runtime.js",
    "install:latest": "node scripts/install-latest.js",
```

`scripts/test-workflow.json` 行 16-24（`compileGates`，build/compile/package/check:full 共用）：

```json
  "compileGates": [
   "npm run compact:plan",
   "node scripts/tsc-cached.js",
   "node scripts/bundle-semver.js",
   "node scripts/write-agent-runtime.js",
   "node scripts/write-panel-build-manifest.js",
   "node -c dist/extension.js",
   "node -c dist/ui/PanelHtml.js"
  ],
```

`scripts/test-workflow.json` 行 27（build 域 `sourceScript` 头部节选）：

```text
npm run compact:plan && node scripts/tsc-cached.js --verify-only && node scripts/bundle-semver.js && node scripts/write-agent-runtime.js && node scripts/write-panel-build-manifest.js && node -c dist/extension.js && node -c dist/ui/PanelHtml.js && node --test --test-force-exit --test-timeout 20000 test/features/panelWebviewScriptHealth.test.js && ...
```

AGENTS.md 要求的第二条校验（原文摘录）：`node -e "new (require('vm').Script)(require('fs').readFileSync('dist/ui/PanelHtml.js','utf8'))"`。

### E17 AGENTS.md 红线要点（原文摘录，`AGENTS.md` SHA256 见 §0）

「P0 — 外层模板剥离坑：`src/ui/PanelHtml.ts` 的 `return <模板> 外层模板吞噬正则反斜杠」要点：

> **严禁** 在 PanelHtml.ts 最外层 return 模板字符串内部裸写任何单反斜杠转义的正则/字符串字面量（\s \d \w \. \/ \{ \} \( \) \n \t 等），**严禁** 直接写 /\s+/ 或 "\n" 这类裸反斜杠。
>
> - 现象：面板握手超时，控制台 Unexpected token 'const' / Invalid or unexpected token，26 处正则的反斜杠被外层模板层剥离后语法断裂，内层 script 直接解析失败。
> - 根因：外层是 JS 模板字符串，内层脚本中的 \s \d 等会被外层模板预解析为转义序列（\s→s、\n→真实换行），落盘后正则已损坏。
> - **正确写法（二选一，择一即合规）**：
>   1. **双写转义**：正则/字符串内的每个反斜杠都写成两个，如 /\\s+/、/\\d\\{-\\d\\{-\\d\\{-\\d\\{-\\d\\{/、"\\n"。经外层模板一层剥离后落盘恰好还原为 /\s+/。
>   2. **`String.fromCharCode` 规避**：需换行时用 `String.fromCharCode(10)` 替代换行字面量（已有先例 PanelHtml.ts:2529）。
> - **门禁（提交前必跑，双重校验缺一不可）**：
>   1. `npm run build` 已内置 `node -c dist/extension.js && node -c dist/ui/PanelHtml.js` 语法门禁（见 package.json#scripts.build），**严禁** 跳过 build 直接提交。
>   2. 额外 `vm.Script` 校验：`node -e "new (require('vm').Script)(require('fs').readFileSync('dist/ui/PanelHtml.js','utf8'))"` 或等效脚本，必须零异常；`node -c` 只查语法，`vm.Script` 进一步确保模板剥离后仍为合法 JS。
> - **自检口诀**：改 PanelHtml.ts 内层脚本前，先全局搜索外层模板内的斜杠+反斜杠与引号+反斜杠；凡见裸反斜杠即视为 P0 缺陷，批量替换为双写后再验证门禁。

（说明：AGENTS.md 写作 `PanelHtml.ts`，实际外层模板在 `src/ui/PanelHtml.legacy.ts`，E01 证明门面默认委托 legacy；改 legacy 内层脚本即受该红线约束。工厂路径另有规避工具 `src/ui/PanelTemplateEscaper.ts` 行 20-26 的 `escapeForOuterTemplate`，把反斜杠翻倍、反引号与模板插值加转义，但默认路径不使用它。）

「P0 — 禁止硬编码隧道端口/IP，隧道按每服务器用户配置动态解析」要点：

> **严禁** 在任何业务逻辑中硬编码隧道端口（如 10890）或固定假设 `127.0.0.1:18765` 为唯一可达的 Agent 地址。隧道由用户为每台服务器通过 Xshell/SSH 配置（*.xsh 会话、~/.ssh/config、settings.json 的每服务器 host/port/forward 配置）动态决定，必须在运行时从该配置解析实际 `localForwardHost/localForwardPort/remoteAgentHost/remoteAgentPort`。
>
> - 现象：10890 写死导致用户自定义隧道不可用；写死 `127.0.0.1:18765` 导致 Worker Telemetry 校验无回调、GPU tmux 无法打开、job 调度静默失败（ModuleNotFoundError: torch 等未回传到 UI）。
> - 正确做法：1) 所有探活/校验/版本比对必须读取 `TunnelEndpointConfig`/`XshellRealtimeTunnelConfig`/`TunnelEndpointPortAssignment` 中的 localForwardHost/localForwardPort 与 remoteAgentHost/remoteAgentPort，动态拼装 baseUrl，不得回退到固定端口检测；2) 展示层（PanelHtml.ts）端口输入框以配置为准，`TunnelGateway`/`XshellTunnelSetup` 不得 throw 限制只能 127.0.0.1；默认值可为 `127.0.0.1:18765` 做兼容，但校验逻辑需接受任意 host:port；3) Agent 侧兼容：/health 与 /api/health（以及 /version 与 /api/version）均为健康检查别名，worker_telemetry 模式必须放行健康与版本接口，避免前端 404 无回调。
> - 门禁：`Select-String -Pattern "10890"` 在 src/** 与 dist/** 业务逻辑中必须零命中（仅允许在 docs/ 与 AGENTS.md 约束说明中出现）；`127.0.0.1:18765` 不得作为探测硬编码，改为读取配置；`npm run build` 与 `vm.Script` 双重校验仍需通过。

对应现存回归测试（可复用为门禁）：`test/factories_integration.test.js:126-156`（遍历 src 断言 10890 零命中）、`test/factories_tunnel.test.js:43-134`（非法端口回退到默认而非 10890）。
低流量模式的直接推论：开关本身与端口/IP 无关，不得为「省流量」写任何固定 host:port 探测；节流只应改「多久问一次/问什么」，地址解析继续走 `localBaseUrl(config)`（E14b）与端点注册表。

### E18 「低流量」当前不存在（零命中证据）
`grep -rniE "lowTraffic|低流量|low-traffic" src` → No matches found（本轮实测）。


### 10.4 调查者A的只读验证记录（原文）

### 原文·调查者A 9. 验证（只读）

- 命令：`git rev-parse HEAD origin/master master`（exit 0，三行均为 7a6062fa10441cc5852166a34138781a2604d9e9）；`git status --porcelain`（无输出）。日志：`D:\\OpenChamber-AgentConfig\\Pi\\host-native\\diagnostics\\host-windows\\66b58277-*`。
- 命令：`wc -l`、`sha256sum`（见文首哈希）。
- 未编译、未装依赖、未运行测试、未做 git 写操作（符合只读约束）。
- 全文 grep 证据（caching/etag/global）：ETag/If-None-Match/gzip/If-Modified/Accept-Encoding 仅命中 cli/plugins.ts、cli/help.ts（SFTP 压缩参数）与 updates/ReleaseClient.ts:58（GitHub）；控制面零命中。

---


### 10.5 可复用测试清单汇总（名称齐全，本轮均未执行）

- 直接约束「新增按钮必须有宿主处理器」等按钮/命令一致性（读取 `dist/`，须先 build）：`test/ui/webviewButtonsHandled.test.js`、`test/ui/webviewActionAllowlist.test.js`、`test/ui/actionButtonsCapability.test.js`。
- 面板内联脚本语法与内容门禁：`test/ui/panelInlineScriptSyntax.test.js`、`test/features/panelWebviewScriptHealth.test.js`（后者已在 build 域内强制运行）。
- 面板存储 seam（若开关还需 webview setState）：`test/ui/panelTransientStorage.test.js`。
- 宿主消息分发回归：`test/features/panelMessageDispatch.test.js`（`test:plan-run` 域内）。
- 请求预算侧现成回归：`test/tunnel/requestBudget.test.js`（在 `npm run test:preflight-stages` 域内，本轮 grep 实测命中）。
- 端口/IP 硬编码 P0 门禁：`test/factories_integration.test.js`（遍历 src 断言 10890 零命中）、`test/factories_tunnel.test.js`。
- 本轮实测 `scripts/test-workflow.json` 的文件名命中情况：`panelWebviewScriptHealth`、`panelMessageDispatch` 命中；`webviewButtonsHandled`、`webviewActionAllowlist`、`panelInlineScriptSyntax`、`panelTransientStorage`、`actionButtonsCapability` 零命中 → 这五个只能显式单文件运行，或由 `npm test` 全量覆盖。
- **没有 `test:ui` 这个 npm script**。
- 单文件直跑形状（项目规范，本轮未执行）：`node --test --test-force-exit --test-timeout 20000 test/ui/<file>.test.js`。
- 现成含 UI/相关测试的组入口名：`test:multi-tunnel`、`test:latest-artifacts`、`test:submission-truth`、`test:failed-job-review`、`test:tmux-lifecycle`、`test:preflight-stages`、`test:plan-run`；build/compile/package/check:full 共用 §10.3 的 compileGates。

## 11. 事实 / 假设 / 未知（分栏）

### 11.1 事实（调查者A原文：已核源码或实测命令）


**事实（已核源码/命令）：**
- 基线三 ref 同为 7a6062f，工作区干净。
- 500ms queue 轮询 + 2000ms 进度轮询 + 5s 快照回退 + 5s 心跳 + Webview 5000ms tmux（可见性门控）+ 各退避常量如上表。
- 500ms/2000ms 轮询仅在 `isRealtimeMode()` 且（protocol==2 或 worker_pool）且有 plans/health≠paused 时才发网络。
- 控制面 HTTP 无 ETag/If-None-Match/If-Modified/gzip；已有 SharedReadCoalescer 并发合并、快照单飞、excludeVerifiedCompleted、executionOnly 轻量库存、live-output/since、SSE since、resultCatalogTtl、RequestBudget(pause/hidden/并发/合并)。
- 文件同步经 SimpleSFTP，事件驱动（job 完成镜像、结果收集、代码同步），支持 gzip/zstd 压缩，可 metricsOnly。


### 11.2 假设（调查者A原文：未独立证明，设计前需验证）

**假设（未独立证明，低流量设计前需验证）：**
- 假设当前 500ms/2000ms 是跨机流量主因（源码支持，但未做实际抓包/字节计数）。
- 假设“顶部颜色条按钮”开关可复用 RequestBudget.setPaused / pauseWhenHidden 语义实现全局降频（RequestBudget 已有 paused 与 hidden 通道，但控制面 minIntervalByPurpose 默认空）。
- 假设多数部署走 WS/SSE push；若默认落到快照轮询回退，则快照是主流量。

**未知（需向用户/后续确认）：**

### 11.3 未知（调查者A原文：不得写成事实）

- 计量网络拓扑：500ms 轮询打的是本机↔Worker（经隧道，可能跨计量公网）还是全在局域网内？服务器端 Scheduler↔Worker 的 availability（10s）是否跨计费链路？
- 典型 worker 数、plan/job 数、GPU 卡数（决定每轮响应体量级与 500ms×N worker 的放大）。
- `availabilityPushMinIntervalMs` 对应的 `pushLocalWorkerAvailability` 函数体首行 inFlight 判断后有裸 `return;`（legacy.ts:25284-25285 区域），疑为**已禁用/死路径**——是否仍产生 availability 推送流量未确认。
- RequestBudget.pauseWhenHidden 默认 true 与 RealtimeRefreshPolicy.pauseWhenWebviewHidden 默认 false 同时存在（tunnelConfig.refreshProfile / allowStreaming 决定实际），**隐藏时 500ms tick 是否真正被 budget 拦截**未端到端验证。
- 实际每类响应的平均/峰值字节未测量（文档只给定性 + 上限）。

---


### 11.4 调查者B的未知项 / 残余风险（原文）

### 原文·调查者B §6 未知项 / 残余风险

- `API_INTERNAL_COMMANDS` 的定义行与成员未取原文（仅知其在 `API_EXECUTABLE_COMMANDS` 的 filter 中使用）；低流量命令是否要排除 CLI 调用需实现阶段核实。
- `buildState({ panelProjection: true })` 的完整构造未逐行读（只确认 `flushStatePost` 调用与降级分支）；新增字段是否会被 `panelProjection` 精简路径裁掉未证实。
- 是否已有 `onDidChangeWindowState` 类多窗口广播未核实；若无，多窗口会出现「一边已生效、另一边显示旧态」。
- `requestBudgetConfigFromTunnel` 强制 `maxRequestsPerMinute: 0` 的历史原因（裁定还是遗留）未查 commit/文档；改动前需核实，避免撤销既有保护。
- 用户环境是否设置过 `FEATURE_FACTORY_PANEL=1` 未验证；若为 1，工厂段缺少 topbar 会导致按钮不出现（E01）。
- 本轮只读：未编译、未运行任何测试，「测试可直接跑通」只是清单事实，不是执行结果。

### 11.5 本轮汇总补充确认的未知（同样不得当事实）

- 轮询是否真的跨计费公网：500ms/2000ms 打的是本机↔Worker（经隧道，可能跨计量公网）还是全在局域网内；服务器端 Scheduler↔Worker 的 10s availability 是否跨计费链路 —— 未知，需用户确认拓扑。
- 典型 worker 数、plan/job 数、GPU 卡数（决定每轮响应字节与 500ms × N worker 的放大倍数）—— 未知，需用户提供规模。
- push（WS/SSE）与轮询在真实部署中的实际占比 —— 未知；若多数部署落到快照回退，主流量项与首要降频项就不是同一项。
- 面板/窗口隐藏时 500ms 队列 tick 是否真被 `RequestBudget` 拦住 —— 未端到端验证（§8.2/§8.3 默认值互相矛盾即为线索）。
- 各类响应的实测平均/峰值字节 —— 未测量，现有证据只有定性 + 32MiB/1MiB 上限。
- `pushLocalWorkerAvailability`（`src/extension/legacy.ts:25283` 起）在 `if (this.availabilityPushInFlight) return;` 之后紧跟一条裸 `return;`（本轮实测 25283-25285），后续函数体不可达 —— 疑为已禁用的死路径。本轮只确认代码形态，不判定它是否为有意禁用，也不判定是否仍有其它 availability 推送路径。
- `requestBudgetConfigFromTunnel` 把 `maxRequestsPerMinute` 无条件置 0 的历史原因（有意裁定还是遗留）未查 commit/文档。
- 用户环境是否设置过 `FEATURE_FACTORY_PANEL=1`（若为 1，工厂段无 topbar，按钮不会出现）。
- 是否存在窗口级状态广播（`onDidChangeWindowState` 类）未核实；若无，多窗口会「一边已生效、另一边显示旧态」。

## 12. 需要 GPT 决断的点，以及两处证据的口径差异

1. **已有三个近义开关，语义必须先裁定再接线**：`pauseAll`/`resumeNetwork`（§8.1，全量暂停/恢复网络）、`tunnelConfig.refreshProfile`（`realtime|balanced|manual_only`，manual_only 为 health=0、snapshot=0、stream=false）、`defaultTunnelGatewayConfig.pauseAllBackgroundTraffic`（`src/tunnel/TunnelGateway.ts:52`，默认 false）。低流量模式与它们的优先级、互斥、回显与持久化关系需 GPT 决断，不能默默叠加。
2. **降频落点必须选清（三者效果不同、互不覆盖）**：宿主定时器字面量（`queueTimer` 500ms @ legacy.ts:1361、`progressTimer` 2000ms @ legacy.ts:1364-1368，均非配置项）、`realtimeRefreshPolicy()` 的派生值（快照回退/心跳/push 开关）、以及 `RequestBudget.minIntervalByPurpose`（默认空 {}，即按 purpose 限频完全未启用）。
3. `maxRequestsPerMinute` 被 `requestBudgetConfigFromTunnel`（`src/tunnel/TunnelGateway.ts:98`）无条件置 0：低流量若要走限流必须改这里，但它可能是有意保护（§11.3），需 GPT 判断能否动。
4. 口径差异（非矛盾）：调查者A把 2s 进度定时器在 §5 表写作 `extension/legacy.ts:1368`、在 §4 表写作 `extension/legacy.ts:1364`。本轮实测二者分别是 `setInterval(` 语句的起始行与 `}, 2000);` 实参行，同一语句，事实一致。
5. 口径差异（按实测为准）：`const SAFE_WEBVIEW_COMMANDS = new Set([` 实测在 `src/extension/legacy.ts:614`（调查者B写 613-643，起止口径差 1 行）；`AGENTS.md` 的 P0 标题写 `src/ui/PanelHtml.ts`，而外层模板实际位于 `src/ui/PanelHtml.legacy.ts`（E01 已证门面默认委托 legacy）。双重门禁 `npm run build` + `vm.Script` 仍按 AGENTS 原文对 `dist/ui/PanelHtml.js` 执行。
6. `webviewButtonsHandled.test.js` 用 `readSource("src/ui/PanelHtml.ts")` 抓命令，实测 `test/_helpers/sourceReader.js:53` 存在 `"src/ui/PanelHtml.ts": "src/ui/PanelHtml.legacy.ts"` 映射（第 26 行同法映射 extension），因此新按钮加在 legacy 文件仍会被该门禁覆盖，不会漏检；写断言时须走 `readSource`，不要直接 `readFileSync` 门面路径。
7. **功能不可回退项（供计划直接引用）**：自动同步、静态入口命令探针、全部已启用 Worker 就绪检查、正式输出目录创建、独占服务锁/来源哈希/实际运行版本核验、永久删除双确认与直接父目录保护，均不得因省流量被跳过或伪装通过；优化只允许合并重复工作（AGENTS 明文）。
8. 需向用户确认才能定量的事（GPT 可先按区间规划）：计量拓扑、规模量级、push/轮询占比（§11.5 前三条）。这三项决定「低流量模式能省多少」能否被验证，也可能影响是否新增测试。

## 13. 本轮变更索引与候选改动面（预计，未实现）

- 本目录新增（均未跟踪）：`evidence.md`（本文件）、`readers/traffic/evidence.md`、`readers/ui-settings/evidence.md`、`handoff.json`；`readers/.gitkeep` 为副本建立时已有；`plan.md` 为主控既有占位文件，本轮未改写。
- 无任何已跟踪文件被修改；`git status --porcelain` 仅 `?? docs/agent-tasks/low-traffic-mode-20261028/`。
- 预计要改的真实文件（绝对路径 + 当前字节 SHA256 见 `handoff.json` 的 candidate.files，已逐个核实存在且为当前字节）：
  - `src/ui/PanelHtml.legacy.ts` —— 顶栏按钮 markup、状态渲染回显、tmux 轮询门控
  - `src/extension/legacy.ts` —— 配置键表 `keys`（378）与 `API_STATE_KEYS`（403）、`SAFE_WEBVIEW_COMMANDS`（614）、`handleMessageCore`、`buildState`、`realtimeRefreshPolicy`（25561）、队列/进度定时器（1361/1364）
  - `src/tunnel/TunnelGateway.ts` —— `refreshProfiles`、`defaultTunnelGatewayConfig`、`normalizeTunnelGatewayConfig`、`requestBudgetConfigFromTunnel`（98）
  - `src/tunnel/RequestBudget.ts` —— `minIntervalByPurpose`、paused/hidden/合并计数
  - `src/tunnel/RealtimeTunnelClient.legacy.ts` —— `defaultRealtimeRefreshPolicy`（34）、心跳与快照回退、setHidden
  - `package.json`、`package-lock.json` —— 阶段 1 补丁版本递增（与 runtime 版本同步），本轮未动
- 未解决事项见 §11.3、§11.5、§12；本轮未执行编译、测试、打包、安装、发布、远端部署（按任务约束）。

---

## 14. 阶段3实施与验证记录（r2 定稿，实现负责人 worker）

### 14.1 统一策略源（唯一定稿点）

- `src/extension/legacy.ts:485` NORMAL_TRAFFIC_INTERVALS = { queueMs: 500, progressMs: 2000, tmuxMs: 5000, snapshotFallbackSeconds: 5 }（与原常量逐值相同，普通模式零差异）。
- `src/extension/legacy.ts:486` LOW_TRAFFIC_INTERVALS = { queueMs: 5000, progressMs: 10000, tmuxMs: 0, snapshotFallbackSeconds: 0 }（r2 定稿：A 类展示读用 0 加布尔关，不做「变慢」处理）。
- `effectiveTrafficPolicy()` 返回 enabled/effective/blockedBy/displayAutoRefresh/intervals/scope=global；displayAutoRefresh = !(enabled && !blockedBy)，避免下游 Math.max(5,...) 把 0 秒钳回 5 秒。
- 宿主两个周期定时器统一由 `scheduleTrafficTimers()`（legacy.ts:1424）按 intervals.queueMs/progressMs 装配；节奏未变不重建定时器；进度定时器不再因面板隐藏而跳过（B 类终态确认必须在隐藏时继续）。
- Webview tmux 轮询读 trafficMode.intervals.tmuxMs，为 0 时 scheduleTmuxPoll() 直接返回，不创建 timer。
- 展示读单飞：displayReadOnce(key, reader, signal) 按 key 合并在途读，fetchTmuxListFromUi / fetchTmuxCaptureFromUi 逐 Worker、逐窗口键共用一轮。
- `src/tunnel/RealtimeTunnelClient.legacy.ts` 策略新增 displayAutoRefresh；connect()、startPolling()、scheduleSnapshotFallbackPoll()、scheduleAutomaticReconnect() 在展示自动刷新关闭时不开不续定时器；updateRefreshPolicy() 原地切换并清/续 timer，不重建连接、不清 since/lastSeq。

### 14.2 行为对照表（项目 | 普通模式 | 低流量模式）

| 项目 | 普通模式 | 低流量模式 |
|---|---|---|
| 队列 tick（B） | 500ms | 5000ms |
| 计划进度与终态确认（B） | 2000ms，隐藏也跑 | 10000ms，隐藏仍跑 |
| WS/SSE 实时通道（A） | 连接即订阅并按策略轮询 | 不自动开自动轮询与自动重连 |
| 快照回退轮询（A） | 5s | 0，不排程 |
| tmux 列表与抓取轮询（A） | 5s | 0，无 timer |
| 点开展示区、切 Worker、切页签、回到可见、初始重试（A） | 自动拉一轮 | 一律不自动拉，缓存加采样时间小字 |
| tmux「列出 sessions」「刷新 capture」按钮（C） | 用户点击 | 用户点击（origin user），低流量下照常一轮 |
| 跳转日志、关闭窗口等用户操作后的确认刷新（B/C） | 立即 | 立即（origin user，不被展示闸门拦） |
| 停止与清理意图推进、pending、错误回执（B） | 原节奏 | 原节奏，不延后 |
| job 完成后产物同步与结果收集（B） | 原触发 | 原触发，同身份在途合并不丢义务 |
| 手动刷新入口（C） | 保留 | 保留，且为低流量唯一取新数据途径 |
| 暂停、manual_only、后台流量暂停 | 生效 | 作为更强约束记入 blockedBy，不互相篡改 |
| 配额 maxRequestsPerMinute=0 | 保留 | 保留，不复活全局限频 |

### 14.3 F1–F4 断言落点

- F1（A 类自动请求为 0）：test/features/panelLowTrafficModePolicy.test.js 断言低流量下真实 RealtimeTunnelClient 不排程任何展示轮询/自动重连、切回恢复正常；test/features/panelWebviewScriptHealth.test.js 断言按钮位置、提示文案、tmuxPollIntervalMs=0 时不建 timer、自动调用点均不带 user 标记。
- F2（手动刷新只一轮且在途合并）：panelLowTrafficModePolicy 断言 displayReadOnce 按 key 单飞；test/ui/tmuxWorkerAndRichLog.test.js 断言每 Worker 扇出经 displayReadOnce 且保留 fetchOneTmuxListFromUi 调用。
- F3（切换模式不遗留定时器/订阅）：panelLowTrafficModePolicy 断言正常→低流量→正常后节奏恢复、无额外 timer；客户端 updateRefreshPolicy 原地切换不断连。
- F4（关掉展示自动刷新后 B 类不受影响）：panelLowTrafficModePolicy 断言隐藏面板下进度终态确认仍执行；completedJobLatestSync 25、planArtifactSyncStatus 16、verifiedCompletion 8、automaticSyncReadiness 3、jobArtifactSyncIdentity 6 等全绿。

### 14.4 实际执行与真实退出码（完整日志目录 D:/GitRepo/MCP/.agent-evidence/low-traffic-mode-20261028/logs）

- 编译双门禁：npm run compile exit=0（21-compile6.log）；node -c dist/extension.js、node -c dist/ui/PanelHtml.js、vm.Script dist/ui/PanelHtml.js 全 exit=0（50-build.log 同批）。
- 新增与扩展：panelLowTrafficModePolicy 16/16、panelWebviewScriptHealth 7/7、panelMessageDispatch 13/13、panelInlineScriptSyntax 2/2（24/22/23/30-*.log）。
- 受影响单文件串行全绿：webviewButtonsHandled 1、webviewActionAllowlist 1、actionButtonsCapability 2、panelTransientStorage 2、requestBudget 12、panelStateProjection 5、factories_tunnel 14、verifiedCompletion 8、taskProgressStability 10、logicalPlanProgress 4、progressEvidenceFreshness 20、progressDiagnosticsQueue 9、progressDispatchFreshness 9、completedJobLatestSync 25、planArtifactSyncStatus 16、automaticSyncReadiness 3、jobArtifactSyncIdentity 6、tmuxTaskLifecycle 3、tmuxOtherSessionsDisclosure 17、tmuxWorkerAndRichLog 5、planNoticeLayout 4、jobTmuxLogNavigation 10、pulledTaskControl 5、probeConnectionContinuity 3、gpuSampleCarryChannel 4、gpuSampleCarryRealChain 3、multiWorkerReconnectIsolation 1、gpuWorkerSnapshotRecovery 13、boundedResponse 5、planPreflightProgressSpeed 20、executionPlanListProgressLagRepro 4、tunnelTestCompletionClarity 6、tunnelEndpointRegistry 1、tmuxCaptureHistory 3、panelStateProgress 13、noDirectSshRealtime 1、realtimeReconnect 4、realtimeSnapshotFallback 2、extensionStatePost 5、tmuxClearTaskTabsClick 2、tmuxPaneSwitch 2、tmuxTaskTabCloseClick 1、schedulerContract 3（30/40/41/42/43/44/45/51-*.log）。
- 端点 P0：grep -rn 10890 在 src 与 dist 均 0 命中；127.0.0.1:18765 在 src 业务代码 0 命中。
- 全量门禁：npm run package exit=0，overall=passed files=238 dedupRemoved=217（63-package2.log）。
- 版本与包：0.5.422（package.json:5、package-lock.json:3 与 :9、src/runtime/RuntimeManifest.ts:51、dist/runtime/RuntimeManifest.js）；simple-experiment-0.5.422.vsix 2683707 字节，SHA256 7bb4f147da77f2bcf4520fe62158162bd9efdbeecec9e0f3dd69fbe42f7a73a0，解包 package.json 版本 0.5.422、面板脚本含 toggleLowTrafficMode（64-vsix-identity.log）。

### 14.5 非本任务失败与夹具适配说明

- test/factories_integration.test.js 的「新模块行数门禁 (<400)」为基线既有失败：主仓同一基线 CacheCleanupPanel.ts 478 行、PlanCleanupHost.ts 430 行（wc -l 实测），本任务未触碰这两个文件；npm run build 域内该门禁不计入 package 域清单，故 package overall=passed。
- test/features/executionShellPreflight.test.js 在默认 shell 环境失败于 a real local Git Bash is required：where.exe git 先返回 D:\Git\ucrt64\bin\git.exe，推导出的 D:\Git\ucrt64\bin\bash.exe 不存在；把 /d/Git/cmd 前置 PATH 后同一测试通过（纯环境，未改任何 shell 逻辑）。
- test/core/hostOperationLease.test.js 在 package 首轮高并发下 1 例因心跳被饿失败；单独连跑 3 次 14/14 通过，package 第二轮 overall=passed（负载抖动，非本改动）。
- 既有 seam 随生产调用形状最小更新：schedulerContract 由内联 500ms 改为断言策略表 500ms 加 intervals.queueMs；tmuxWorkerAndRichLog、planNoticeLayout、tmuxOtherSessionsDisclosure、jobTmuxLogNavigation 补 displayAutoAllowed 等夹具与新签名；未删断言、未放宽超时。

### 14.6 剩余未知

- pushLocalWorkerAvailability 相关死代码路径按原样保留，未验证可否清理。
- GPU 历史曲线为冷却节流而非定时器，本轮未改其节流阈值。
- 未实测节省率（无两台真实 Worker 环境），表中为调度设计值。
- Release 发布、本机安装、重载后 UI 验收由主控确认，本阶段未执行。

---

## 15. 交审前失败分流补证（F4-FAIL-1、F4-FAIL-2；本轮只补证据，未改任何生产代码）

### 15.1 F4-FAIL-1 test/core/hostOperationLease.test.js 在首轮 package 门禁失败

| 项 | 值 |
|---|---|
| 命令 | npm run package（node scripts/test-workflow.js package），runner 以 exclusive 调度执行 test/core/hostOperationLease.test.js |
| 平台 | win32（Git for Windows Bash，原生 Windows） |
| 该 job 退出码 | 1（整轮 package 退出码 1，1 job not passed） |
| 失败用例全名 | test\core\hostOperationLease.test.js:91 continuous heartbeat preserves ownership beyond lease TTL and keeps UTF-8 labels (410.6306ms) |
| 错误与堆栈 | TypeError: Cannot read properties of undefined (reading actionLabel)，at TestContext.<anonymous> test\core\hostOperationLease.test.js:95:20，at async Test.run node:internal/test_runner/test:1332:7，at async Test.processPendingSubtests node:internal/test_runner/test:911:7 |
| 汇总日志 | D:/GitRepo/MCP/.agent-evidence/low-traffic-mode-20261028/logs/60-package.log 第 237 行（job failed exit=1 ... job-222），失败摘要在同文件 227-241 段、完整堆栈在 264-270 段 |
| job-222 完整日志 | D:/GitRepo/MCP/zlk-cluster-orchestrator-low-traffic-20261028/simple_cluster/reports/test-workflow/2026-10-28T01-54-33-605Z-54792-package/job-222-hostOperationLease.test.out.log（sha256 26a67cc752f682db138c4d6b84e8dce80887386ac393aa89f465c08a58bc2433）与同目录 job-222-hostOperationLease.test.err.log |
| 失败点语义 | 用例第 95 行先 await held.assertHeld()，再从 (await a.inspect()).records 中 find 本租约并读 actionLabel；记录被 TTL 清除时 find 返回 undefined，故抛 TypeError |
| 该用例时序 | manager(a, ttlMs 120, heartbeatMs 20) 后等待 190ms，要求两次心跳周期内租约仍存活 |

复跑记录（真实退出码，日志目录 D:/GitRepo/MCP/.agent-evidence/low-traffic-mode-20261028/logs）：

| 记录 | 方式 | 结果 |
|---|---|---|
| 61-test-hostOperationLease.log | 单文件 node --test --test-force-exit --test-timeout 20000 | exit=0，14/14 |
| 62-test-hostOperationLease-rerun1.log、rerun2.log | 同上再跑两次 | 各 exit=0，14/14 |
| 63-package2.log | 第二次 npm run package | exit=0，overall=passed files=238，hostOperationLease passed |
| 70-baseline-noload-hostOperationLease.log | 基线树（不含本任务改动）单跑 | exit=0，14/14 |
| 71/72/73/74-baseline-load-hostOperationLease-run1..4.log | 基线树 + 16 个 CPU spinner 同等并发 | 4/4 次 exit=1，同一用例失败 |
| 75/76-current-load-hostOperationLease-run1..2.log | 当前副本 + 同样 16 spinner | 2/2 次 exit=1，同一用例失败 |

分类结论：既有并发时序抖动（该用例 120ms TTL 与 20ms 心跳的余量在 CPU 饥饿下不足），不是本次改动引入的新风险。依据逐条可核查：

1. 依赖面无关：该测试 require 仅 node:test、node:assert、node:fs、node:os、node:path 与 ../../dist/core/HostOperationLease；对 extension/legacy、dist/extension、PanelHtml、RealtimeTunnelClient、MultiEndpoint、RuntimeManifest 的引用命中数为 0。测试进程不启动扩展宿主，本次改动的调度入口 effectiveTrafficPolicy、scheduleTrafficTimers、updateRefreshPolicy 不在该进程内。
2. 代码身份与基线一致：git diff --name-only 7a6062fa..HEAD 过滤 lease 或 core 命中 0；git diff --stat 7a6062fa..HEAD -- test/core/hostOperationLease.test.js src/core dist/core 输出为空；sha256 实测测试文件 110cf3d3be82a875bc9b06e639bf2af8bec3f30e2e4743537ef151a521c3a1a1、src/core/HostOperationLease.ts 84a54dce5f733d37562d2b21dcc53d569778a79b6e2e3537727504b9a41f2b1d、dist/core/HostOperationLease.js 75c23f592c7ff19545a55e36abb4fc77deb3c3f8788d3ef62b55b898613f8473，均与基线字节一致。失败发生在本次改动路径之外。
3. 基线同等并发可复现：git archive 7a6062fa10441cc5852166a34138781a2604d9e9 导出到 D:/GitRepo/MCP/.agent-evidence/low-traffic-mode-20261028/baseline-repro（不含本任务任何改动），16 spinner 同等并发下该用例 4/4 失败，当前副本同负载 2/2 失败，无负载双方均 14/14 通过。
4. 三种表现同源于同一时序机制：run3 为 TypeError 读 actionLabel（记录已清除）；run1、run2 为 AssertionError Missing expected rejection (HostOperationLeaseConflictError)（租约已过期，第二次 acquire 反而成功）；run4 与 current run2 为 Error [HostOperationLeaseLostError] 宿主操作租约已失效，code RESOURCE_LEASE_LOST、outcomeUnknown true，堆栈落在 dist/core/HostOperationLease.legacy.js:458 与 dist/core/ResourceOperationLease.js:392 与 :41。均为心跳回调错过 20ms 周期、120ms TTL 到期的同族结果。
5. 两轮 package 唯一差别是机器负载：files=238、maxParallel=2、maxObservedConcurrent=1 相同，首轮有其它独占 job 抢占 CPU；本次改动未新增或修改任何 core 层定时器，只改扩展宿主的队列/进度节奏与实时客户端策略。

处置：未修改该测试与任何生产代码。handoff.json 中以 status=failed、exitCode=1、complete=true 原样保留该失败（logs 指向 job-222 完整 out/err 日志与 60-package.log），并附单跑复现、基线同等并发复现、第二轮 package 通过记录。

### 15.2 F4-FAIL-2 test/factories_integration.test.js 新模块行数门禁 (<400，目标 <300)

只读核实数字：

| 文件 | 基线 wc -l（git show 7a6062fa） | 本副本 wc -l | 门禁口径 split 换行计数（基线 / 本副本） |
|---|---|---|---|
| src/extension/CacheCleanupPanel.ts | 478 | 478 | 479 / 479 |
| src/extension/PlanCleanupHost.ts | 430 | 430 | 431 / 431 |

- 口径差原因：test/factories_integration.test.js 第 352-354 行按 readFileSync(file,utf8).split 换行 的长度计数，文件以换行结尾时比 wc -l 多 1，故断言输出为 479 与 431；主仓同一基线 wc -l 亦为 478 与 430，基线字节本身已超阈值，门禁在基线上同样失败。
- 与本任务无关：git diff --stat 7a6062fa..HEAD -- src/extension/CacheCleanupPanel.ts src/extension/PlanCleanupHost.ts 输出为空；本次 src 改动仅 extension/legacy.ts、runtime/RuntimeManifest.ts、tunnel/MultiEndpointRealtimeClient.legacy.ts、tunnel/RealtimeTunnelClient.legacy.ts、ui/PanelHtml.legacy.ts。
- 是否在 npm run package 的 238 文件集合内：不在。依据：scripts/test-workflow.json 中 factories_integration 出现 0 次，package.json 与 scripts 目录检索 0 次；60-package.log、63-package2.log、50-build.log 中出现 0 次；63-package2.log 实际枚举的唯一测试文件路径恰为 238 个，其中不含 factories_integration。package overall=passed 未掩盖该门禁，它仅在按 T9 显式单跑时暴露（30-test-test_factories_integration_test_js.log，exit=1，8 tests 7 pass 1 fail）。
- 处置：未改生产代码、未放宽门禁阈值；结论为基线既有技术债，是否拆分这两个文件由主控决定。

## 16. r2-final-1 六组必改返修（GPT 终审必改项，返回修改）

原始要求逐字：「低流量模式必须真的把 A 类展示读取降为 0，不能只是把间隔改长；关闭展示通道不能伪装成隧道断连；策略对象不能被多个端点共享改写；正常模式的行为轨迹必须零差异；回执身份与界面显示必须来自同一份已确认值。」

### 16.1 R1 A 类展示真正归零（不只是拉长间隔）

- 展示闸门：`displayAutoRefresh = !enabled`（`effectiveTrafficPolicy()`），`tmuxMs=0`、`snapshotFallbackSeconds=0`，`scheduleTrafficTimers()` 在 `tmuxMs === 0` 时直接不建定时器；面板侧 `tmuxPollIntervalMs = 0` 同样不建定时器。
- 来源门控：面板 `displayAutoAllowed(origin)` 只放行显式手动来源；`requestGpuHistory(query, force, origin)`、`requestGpuHistoryRemote(payload, origin)`、展开/焦点/初始重试/`gpuRingSamples` 回退全部传 `"auto"` 并被拦截。宿主侧二次把关：`loadGpuHistoryFromUi`、`fetchTmuxListFromUi`、`fetchTmuxCaptureFromUi` 在 `displayReadBlockedFor(message)` 为真时直接拒绝，自动来源一轮 Worker 联网都不发生。
- 手动入口：每个 GPU 历史卡片有独立 `data-gpu-history-manual` 按钮（`gpuLowTrafficControlsMarkup(key)`），提示行与按钮同 key 渲染，`renderDisplayAutoNotices()` 在每次渲染后回填；手动刷新成功后宿主发布带 `fetchedAt`/`origin` 的 `gpuHistoryResult` 帧，`displaySampleNotice(key, cachedFallback)` 回落旧缓存时仍给出诚实提示。
- 提示正反语义修正：持久化键改为 `lowTrafficDisplayAutoOff`（true=自动已关），写入与读取同极性，Webview 缓存不再被当权威；权威首帧前窗口由宿主拦截封住。

### 16.2 R2 策略对象不被共享改写

- `defaultRealtimeRefreshPolicy()` 返回 `Object.freeze({})`；构造函数 `this.policy = { ...policyArgument }`，每个客户端持有自己的副本。
- `updateRefreshPolicy(partial)` 入参为 `Partial`，与**自身上一份视图**比较，只在真正变化时重启对应定时器；恢复时经 `connect()` 按各自视图重新起时，不再被首个端点写回后提前 return。

### 16.3 R3 关闭展示通道不等于隧道断连

- `RealtimeClientDiagnostics` 新增 `displayAutoRefreshDisabled`、`displayAutoClosed`；`disconnect("display-auto")` 置位，`connectionLost()` 清除；`MultiEndpointDiagnostics` 聚合。
- 宿主 `ensureRealtimeConnected` 先判 `displayGuarded` 再判 `tunnel_unavailable` / `local_port_closed`，低流量收口不再发布断连状态；真实断连路径未改，仍如实上报。

### 16.4 R4 A 类门控只看已持久化开关

- `displayAutoRefresh = !enabled`，`blockedBy`（`manual_only` / `paused` / `background`）只影响 B/C 类节奏，**不再把展示闸门改回开启**。
- `pauseAllNetworkActivity()`、`resumeNetwork()`（清陈旧暂停标记）、`resetClient()`、`ensureRealtimeConnected()` 连接后统一调用 `applyTrafficScheduling()` 收敛到当前策略。

### 16.5 R5 合并只用于轮询、正常模式零差异、每个 requestId 都回执

- `displayMergeEnabled()` 仅在 `displayAutoRefresh === false` 时为真，正常模式每请求一轮（行为轨迹零差异）。
- `displayReadKey()` 含 `projectContextGeneration|workspaceRoot|身份`，切换项目/代际不复用同 key；`resetClient()` 清空 `displayReadInFlight`，读取失败即释放，不留下永久挂起的调用方。
- `fetchTmuxListForCaller()`：低流量下多个调用方共享一轮网络读（`readTmuxListNetwork` + `displayReadOnce`），但各自 `publishTmuxList(workerId, result, requestId)`，回执身份独立。

### 16.6 R6 回执身份与界面显示同一份已确认值

- `handleLowTrafficModeReceipt()` 先校验 `requestId` 再清定时器，过期回执直接返回、无副作用。
- 点击目标由 `lowTrafficDisplayEnabled(...)`（已确认回执值）取反得出，标签、`aria-pressed` 与下一次点击目标共用同一份值。

### 16.7 本轮验证（全部单文件串行，`node --test --test-force-exit --test-timeout 20000`）

- 新增 `test/features/lowTrafficDisplayRework.test.js`：9 项，覆盖 R1（GPU 自动拦截 / 手动放行 / 提示极性）、R2（默认策略冻结、端点互不改写）、R3（受控关闭 ≠ 断连、宿主不发布 `tunnel_unavailable`）、R4（pause/resume/reset 收敛策略）、R6（回执时序、过期 requestId）。日志 `logs/87-*`、`logs/90-*`，exit=0，9 pass 0 fail。
- 更新 `test/features/panelLowTrafficModePolicy.test.js`：16 项全绿（含 R4 新语义 `displayAutoRefresh===false` 即使 `blockedBy` 存在、R5 按 `workerId:requestId` 配对回执）。
- 受影响 69 个测试文件按 `logs/affected-files.txt` 串行跑完（日志 `logs/88-*`、`91-*`、`92-*`、`93-*`、`96-*`）：66 个文件全绿。
- 因本轮改动需要跟改的 3 个既有测试（均为测试侧、不改生产语义）：`tmuxWorkerAndRichLog.test.js`（改为断言 R5 新形状 `fetchTmuxListForCaller` + 每个 requestId 各自回执，5 项全绿，`logs/96-*`）、`gpuWindowPanelWiring.test.js`（harness 补齐 `displayAutoAllowed`/`mergeGpuHistorySegments` 等被抽取函数的真实依赖）、`probeConnectionContinuity.test.js`（mock 宿主补 `applyTrafficScheduling` 并计数收敛次数，3 项全绿，`logs/92-2-*`）。
- 双重门禁：`npm run compile` exit=0（`logs/83-compile-r1r6b.log`）；`npm run build` exit=0、`overall=passed files=228`（`logs/94-build-r1r6.log`，内含 `node -c dist/extension.js`、`node -c dist/ui/PanelHtml.js` 两项 gate ok）；`vm.Script dist/ui/PanelHtml.js` 零异常；`grep 10890 src dist` = 0 命中，`grep 127.0.0.1:18765 src` = 0 命中（`logs/97-dual-gate-r1r6.log`）。
- 打包：`npm run package` exit=0、`overall=passed files=238`（`logs/95-package-r1r6.log`）；`simple-experiment-0.5.422.vsix` 2688906 字节，SHA256 `77a86a93911924876becadebc28b33826fce15bf46fcbec007768cc444c1f2b5`（版本按主控要求保持 0.5.422，未安装、未发布 Release、未合并）。

### 16.8 本轮 3 个失败项的真实状态（未掩盖）

- `test/features/factories_integration.test.js`：行数门禁，基线既有技术债，取证见 §15，且不在 build/package 的 228/238 作业集合内（作业名核对：`simple_cluster/reports/test-workflow/2026-10-28T03-02-04-246Z-54940-package` 无该作业）。
- `test/features/distributedRerunAndWorkerDelta.test.js`：断言 `legacy.ts` 含 GitHub 发布阶段文案，基线与本轮 HEAD 均无该字符串，属基线既有缺口，与本任务无关。
- `test/features/gpuWindowPanelWiring.test.js`：本轮补齐 harness 后该用例真正开始执行，暴露测试仍按「epoch 毫秒」写时间，而生产 `applyGpuWindowSamples` 已按注释改为「epoch 秒」（`src/ui/PanelHtml.legacy.ts:11891`），5 项通过、1 项因该口径差异失败。**未修改其断言、未放宽阈值**；是否随本 PR 修正该测试的时间口径，请主控决定。
- `test/features/hostOperationLease.test.js` 与 §15 的并发计时抖动记录保持原样；本轮无负载条件下该文件按批内串行运行通过。

## 17. gpuWindowPanelWiring 失败项的确切机制与处置（终审放行前补取证）

### 17.1 粗帧被丢掉的确切判断点

丢帧发生在唯一一处比较，不是 gapLimit、也不是期望步长：

- `src/ui/PanelHtml.legacy.ts:11905-11906`
  `const kept = existing && Array.isArray(existing.points) ? existing.points.filter(function (row) { return Number(row && row.bucketEpoch) < points[0].bucketEpoch; }) : [];`

数值推演（用夹具真实数值，`t0 = Date.now()` 当时约 1793157725017）：

| 量 | 修正前（夹具按毫秒） | 修正后（夹具按秒） |
| --- | --- | --- |
| 细帧 `points[0].bucketEpoch` = `Math.round(collectedAt/1000)`（:11891） | 1793157725 | 1793157725 |
| 粗帧 `bucketEpoch`（夹具写入） | `t0-7200000` = 1793150525017 | `t0-7200` = 1793150525 |
| 11906 判断 `粗 < 细` | `1793150525017 < 1793157725` → **false** → `kept=[]` | `1793150525 < 1793157725` → true → `kept=[粗帧]` |
| `mergeGpuHistorySegments`（:11829）结果 | 只有 1 个细帧 → `points.length=1` | 粗帧 + 细帧 = 2 → 断言 2 通过 |
| 边界 gap 标注（:11854-11855） | 不执行（`kept` 为空） | `boundary=7200`，`boundaryLimit=max(bucketSeconds||0, 期望步长 300)×1.75=525` → `fine[0].gapBefore=true`（2 小时空档如实标为断点，不参与断言） |

`gapLimit`（:11826-11828）与 `historyExpectedStepFromSortedTimes`（:12298-12308，单点时回落 `gpuHistoryMeta.bucketSeconds || 300`）只在 `mergeGpuHistorySegments` 内给 `gapBefore` 打标记，从不删元素；真正删掉粗帧的只有 11906 的 `<` 比较，被比的是两侧不同单位的时间。

### 17.2 真实上报的 bucketEpoch 单位＝epoch 秒（从生产与数据契约取证，不从夹具反推）

1. Worker 侧细帧只发 ISO 时间：`src/runtime/GpuCollector.ts:415` `"collectedAt": now_iso()`。
2. 宿主 ring 把 ISO 解析成 epoch 毫秒：`src/features/GpuSampleRing.ts:16` `collectedAt: number`、`:27` `Date.parse(String(item.generatedAt))`、`:76` 用毫秒窗口过滤，宿主 `gpuWindowSamplesFromUi`（`src/extension/legacy.ts:6582`）原样把该 samples 回给面板。
3. 面板把它换算成 epoch 秒再入缓存：`src/ui/PanelHtml.legacy.ts:11891` `bucketEpoch: Math.round(collectedAt / 1000)`（:11889-11890 注释明确「历史管线是 epoch-SECONDS 尺度，GpuSampleRing.collectedAt 是 epoch 毫秒」）。
4. 粗帧（远端历史桶）也是 epoch 秒：`src/clusterAgentRuntime.legacy.ts:2159-2168` `epoch = gpu_history_epoch(...)` → `bucket = int(epoch // GPU_HISTORY_BUCKET_SECONDS) * GPU_HISTORY_BUCKET_SECONDS`（:65 默认 60 秒）→ `"timestamp": gpu_history_iso(bucket)`，而 `gpu_history_iso`（:2096-2097）= `time.gmtime(float(epoch))`，即输入是秒。
5. 面板消费侧同样按秒比较：`src/ui/PanelHtml.legacy.ts:12164` `const windowStart = latest - 24 * 3600;` 与 `:12166` `Number(point.bucketEpoch) >= windowStart`；若 bucketEpoch 是毫秒，24 小时窗口等于把全部历史滤空。

结论：真实 Worker 上报经宿主入缓存后，`bucketEpoch` 一律是 epoch **秒**；夹具把粗帧与期望值写成毫秒，才让 11906 把粗帧当「晚于细帧」丢掉。

### 17.3 处置：走「夹具口径修正」分支，未动生产合并逻辑与任何断言

- 只改夹具输入数据：`test/features/gpuWindowPanelWiring.test.js:61-74` 引入 `t0Ms = Date.now()`（Worker 真实毫秒）与 `t0 = Math.round(t0Ms / 1000)`（管线真实秒），`collectedAt: t0Ms`，粗帧 `bucketEpoch: t0 - 7200`（仍是同一「2 小时前」意图）；附契约注释。
- 断言文本、断言数量、阈值一律未动：`:119`、`:120`、`:124` 仍逐字为 `'the older coarse frame is kept and the fine frame added, nothing synthesized'`、`'the fine frame keeps the Worker collected time'`、`'both carried GPUs are applied'`，比较对象仍是 `t0` 与阈值 2/1/0，条数仍 6 项。
- 复跑：`node --test --test-force-exit --test-timeout 20000 test/features/gpuWindowPanelWiring.test.js` → **exit=0，tests 6 / pass 6 / fail 0**，完整日志 `logs/101-gpuWindowPanelWiring-fixturefix.log`。
- 生产侧确认未被触碰：`git diff 7a6062fa..HEAD -- src/ui/PanelHtml.legacy.ts` 中 `applyGpuWindowSamples`、`mergeGpuHistorySegments`、`gpuHistorySegmentGapLimit`、`historyExpectedStepFromSortedTimes`、`gpuHistorySeriesCache` 相关行为无改动，只给 `requestGpuHistory`/`requestGpuHistoryRemote` 增加 `origin` 参数与拦截分支。

### 17.4 为什么该文件此前「看起来是绿的」——它其实从未通过

- 基线取证：把基线的 `PanelHtml.legacy.ts` 与该测试文件按原目录结构复制到工作副本 `_baseline_probe/` 原样运行（探针目录已按删除规程核实父目录后 `./_baseline_probe` 移除），结果 **exit=1，tests 6 / pass 3 / fail 3**，日志 `logs/100-baseline-probe-gpuWindowPanelWiring.log`：
  - `answers are consumed only by their own request...` → `ReferenceError: mergeGpuHistorySegments is not defined`
  - `carried fine frames update the existing chart series...`（本次这条）→ 同一 `ReferenceError`
  - 第 3 条失败是探针副本缺少同级模块 `../features/PanelProgressDom`，属探针环境限制，不算基线缺陷
- 也就是：基线 harness 的 `extractFunction` 清单里没有 `mergeGpuHistorySegments`，被抽取的 `applyGpuWindowSamples` 在沙箱里调用到未定义标识符就抛错，**1≠2 那条断言根本没被执行到**（替代路径＝在 `:11908` 之前抛 ReferenceError，测试以异常终止，而不是以断言失败终止）。
- CI 也照不到它：该文件不在 `npm run build`（228 个作业）与 `npm run package`（238 个作业）的作业名集合内（逐名核对 `simple_cluster/reports/test-workflow/2026-10-28T02-52-32-855Z-28036-build`、`.../2026-10-28T03-02-04-246Z-54940-package`），所以基线的红一直没被工作流暴露。
- 本轮把真实函数接进沙箱后该用例第一次真正执行，才暴露出夹具的单位口径问题：这是覆盖率由「假绿/异常终止」变真实带来的发现，不是把原来绿的改成绿的。

### 17.5 另两条失败的登记数字（基线既有、非本任务引入）

- `test/features/distributedRerunAndWorkerDelta.test.js`：期望文案 `GitHub 已完成，正在准备 Worker 上传` 在 `git show 7a6062fa:src/extension/legacy.ts` 中出现 **0** 次，在 `git show HEAD:src/extension/legacy.ts` 中出现 **0** 次，本次 `git diff 7a6062fa..HEAD -- src/extension/legacy.ts` 中该文案出现 **0** 次（未被本次改动触碰）。基线上一次发布进度合并改版替换了文案而未同步测试。
- `test/factories_integration.test.js` 行数门禁：`src/extension/CacheCleanupPanel.ts`、`src/extension/PlanCleanupHost.ts` 基线 `wc -l` = **478 / 430**，HEAD 仍 **478 / 430**，本次 diff 对这两个文件的改动行数 **0**；门禁按 `readFileSync().split` 计数得 479 / 431（文件以换行结尾多一格），阈值 400/300 早已超线（§15）。
- 两条均按 `status:"failed"`、`required:false` 如实保留在 `handoff.json`，未改测试、未改生产代码、未放宽阈值。

## 18. r2-final-2 两项必改（B1 归因、B2 回执）与连续状态断言

原始要求逐字（plan.md §15.3）：「真实断连必须仍然如实报为不可用，只有我们自己主动关掉的展示流才不报离线」「没有 pending 时任何 ok=true 回执都写 lowTrafficReceiptDisplay 并优先覆盖权威 state」「回执必须绑定当前有效请求/最新确认代际；不匹配、缺少身份、已废弃及旧成功均无显示/定时器/下一目标副作用」。

### 18.1 B1：真实断连不再被重复应用的策略改写成主动关流

- 根因：`connect()` 与 `updateRefreshPolicy()` 在低流量分支无条件 `this.displayAutoClosed = true`，`disconnect("display-auto")` 也按 reason 直接赋值。真实软/硬断连后（`connectionLost` 已置 `displayAutoClosed=false` 并保存 `lastError`），宿主 `ensureRealtimeConnected` 先 `connect()` 再取 diagnostics、方法末尾又 `applyTrafficScheduling()`，同一策略被重复应用时该端点被重新标成「策略关闭」，聚合后 `displayAutoClosed=true` → 宿主把 `lastError`/`tunnel_unavailable` 置空，真实断连被吞。
- 改法（只改归因，不动节奏、不动 A 类闸门）：`src/tunnel/RealtimeTunnelClient.legacy.ts:480-483` 新增 `markDisplayAutoClosed()`，规则是「只有真实策略转移才可认领关流」——流仍活着（`status !== "disconnected"`）时关流是真实转移；已经 disconnected 且仍有失败依据（`lastError` 或 `requiresManualReconnect`）时拒绝认领，真实断连的归因保持到真正建立新连接为止；三个原本直接写 true 的位置改为调用它：`:128`（connect 低流量早退）、`:195`（`disconnect("display-auto")`）、`:510`（`updateRefreshPolicy` 已断开分支）。全文件仅剩 `:482` 在 helper 内写 `true`（`grep -n "displayAutoClosed = true"` 已核）。不伪造在线：未连上时 `streamStatus` 仍是 `disconnected`。
- 连续状态断言（真实 client + 真实 aggregator + 抽取的真实宿主方法，不再用 diagnostics stub）：
  - `r3/b1: a real outage keeps its attribution through guard, loss, repeated policy, connect and host ensure`：步骤一主动关流 → `displayAutoClosed=true`、无任何 lastError、宿主不发布 `tunnel_unavailable` 也不伪造 `local_port_closed`；步骤二真实软断连（`socket hang up`）后重复同一 policy + 重复 `connect()` + 再次宿主 ensure → 仍 `displayAutoClosed=false`、`lastError` 保留、宿主 `lastError="tunnel_unavailable"`、`lastHealth.status="local_port_closed"`；步骤三恢复正常节奏 → 重新发起真实连接（计数 1）、仍未连上不改标为策略关闭、失败依据保留。
  - `r3/b1: a hard authentication failure stays a manual-reconnect outage through repeated policy and ensure`：硬错（`HTTP 401 unauthorized`）后重复 policy + 宿主 ensure → 端点 `requiresManualReconnect=true`（真实 client diagnostics）、聚合 `lastError` 仍含 401、宿主仍报不可用。

### 18.2 B2：没有 pending 时的过期回执彻底无副作用

- 根因：`handleLowTrafficModeReceipt` 只在「有 pending 且双方都有 requestId」时做身份比对，pending 为空时任何 `ok=true` 回执都会写入 `lowTrafficReceiptDisplay` 并在 5 秒内压过权威 state，显示与下一次点击目标一起倒退；缺 requestId 的回执还能越过身份检查。
- 改法（只修回执消费，不自动重发设置、不改网络行为）：`src/ui/PanelHtml.legacy.ts:2817-2837` 改为「回执必须属于当前仍在途的那一个请求」——`if (!pending || !requestId || !pending.requestId || requestId !== pending.requestId) return;`，无 pending、缺身份、已废弃、重复回执、旧成功一律直接返回，不动显示、不动定时器、不动 pending、不动下一次点击目标；确认成功的回执额外记录自身 `requestId` 便于调试。点击目标仍与显示共用同一份已确认值（`:3924` 未改）。
- 连续状态断言（`panelFunction` 取渲染后的真实生产函数）：`r6/b2: a receipt without an outstanding request has no display, timer or next-target effect through the whole sequence`，一段连续序列：ltm-1 提交 → 显示提交目标；超时 → 提示结果未知、显示回落到已落盘偏好、下一目标仍为「开」；ltm-2 提交并成功（关）→ 显示与下一目标同步为「关/开」，且只清掉它自己那一个定时器；迟到的 ltm-1 成功 → 显示、定时器、pending、下一目标全部零变化；ltm-2 重复回执、无 requestId 回执同样零变化；ltm-3 失败 → 提示真实失败原因、不记为已确认值、显示与下一目标回到已落盘偏好。
- 断言只增不减：`test/features/lowTrafficDisplayRework.test.js` 由 9 项增至 12 项（原 9 项一条未删），`test/features/panelLowTrafficModePolicy.test.js` 保持 16 项全绿。

### 18.3 本轮验证（全部单文件串行，一次一个 node 进程，`node --test --test-force-exit --test-timeout 20000`）

- `npm run compile` exit=0，两个 `node -c` gate ok（`logs/110-compile-r2final2.log`）。
- `test/features/lowTrafficDisplayRework.test.js`：12 tests / 12 pass / 0 fail，真实 exit=0；`test/features/panelLowTrafficModePolicy.test.js`：16/16（`logs/111-*`，逐文件退出码另见 112 汇总）。
- 受影响 69 个文件重跑（清单 `logs/affected-files-r2final2.txt`＝上轮 69 项，含本轮新增用例文件）：**67 个 exit=0，2 个失败为上轮已定性的基线既有项**（`test/factories_integration.test.js` 行数门禁、`test/features/distributedRerunAndWorkerDelta.test.js` 文案缺口）。逐文件退出码/通过数与日志名见 `logs/112-serial-summary.txt`（由 `run-serial.sh` 逐文件 `rc=$?` 真实采集，先取退出码再做任何命令替换）。
- 双重门禁：`npm run build` exit=0、`overall=passed files=228`，`node -c dist/extension.js`、`node -c dist/ui/PanelHtml.js` 两个 gate 均 ok（`logs/113-build-r2final2.log`）；`vm.Script dist/ui/PanelHtml.js` 零异常、`grep 10890 src dist`=0、固定 `127.0.0.1:18765` src=0（`logs/114-dual-gate-r2final2.log`）。同一日志补充：新改动的内层 `handleLowTrafficModeReceipt` 片段裸反斜杠 0 个、中文文案未被外层模板剥离破坏、宿主侧认领点 3 处均走 helper。
- 打包：`npm run package` exit=0、`overall=passed files=238`（`logs/115-package-r2final2.log`）；`simple-experiment-0.5.422.vsix` **2689215 字节**，SHA256 `ca3baaf11e770110724d2c4160edb03b38704dc4092f1003aa5a96a407cbac7f`（与上轮 2688906/`77a86a93…` 不同，符合「改了 dist 必须重打」）。版本仍 0.5.422，未安装、未发 Release、未合并。

### 18.4 流程更正：基线/对照探针一律放仓库外

上轮 `_baseline_probe` 建在任务工作副本内又删除，属流程偏差。本轮起所有对照探针改放 `D:/GitRepo/MCP/.agent-evidence/low-traffic-mode-20261028/probes/<名字>`（仓库外），本轮未在工作副本内创建任何临时目录；`git status` 全程只出现本任务的源码/测试/文档改动。

## 19. r2-final-3 必改项（§17.3 认领条件补全）与组合断言（worker，2026-10-28）

本节按 plan.md §17.3 的通过条件返修，只动 B1 的认领条件与配套断言；§17.5 的 lastError 泛用非 telemetry 旧路径治理按指令本轮不动，§15.5 的三条非阻塞建议同样不动。

### 19.1 改动位置与一句话说明

- `src/tunnel/RealtimeTunnelClient.legacy.ts:104-110`：新增私有字段 `verifiedDisplayRound`（本轮连接是否真的有成功证据：流建立成功或快照被接受），只在真实断连与非展示类关闭时清零。
- `src/tunnel/RealtimeTunnelClient.legacy.ts:481-505`（`markDisplayAutoClosed`）：认领条件补全为三条——`connecting`（握手从未完成）一律拒绝；有 `lastError` 或 `requiresManualReconnect` 时，只有「之后真的成功过且流仍活着」才可认领，暂停不算恢复证据；完全无故障证据时，关掉活的/暂停的展示通道或从未打开过才算策略主动关闭。被拒绝的认领同时把 `displayAutoClosed` 写回 false，不遗留错误的 true。
- `src/tunnel/RealtimeTunnelClient.legacy.ts:199-205`（`disconnect`）：`display-auto` 与 `paused` 保留成功证据，其余关闭方式视为开始新的连接故事，清零成功证据。
- `src/tunnel/RealtimeTunnelClient.legacy.ts:233-237`（`connectionLost`）：真实断连同时撤销成功证据。
- `src/tunnel/RealtimeTunnelClient.legacy.ts:597 / 636 / 741-744`：WebSocket `onopen`、SSE 建立、快照成功三处写入成功证据；`startPolling`（快照尚未成功）刻意不写，避免把未成功当成功。
- `test/features/lowTrafficDisplayRework.test.js`：断言只增不减，12 项 → 15 项，新增 3 条连续状态组合序列（真实 client + 真实 aggregator + 抽取的真实宿主方法 `ensureRealtimeConnected`）。

### 19.2 新增组合断言与结果（单文件串行，`node --test --test-force-exit --test-timeout 20000`）

| 断言名 | 覆盖序列 | 结果 |
| --- | --- | --- |
| `r3/b1: a real loss keeps its attribution through pause, repeated policy and resume (soft and hard)` | 低流量下真实软错/硬错 → `disconnect("paused")` → 再次应用同一低流量策略（关流把 paused 变 disconnected）→ 宿主 ensure → 恢复展示轮询 → 再 ensure；逐步断言 `displayAutoClosed`、`lastError`、`requiresManualReconnect`、`streamStatus`、宿主 `tunnel_unavailable`/`local_port_closed` | 通过（`logs/121-2-lowTrafficDisplayRework-r2final3.log`，15 tests 15 pass 0 fail，exit=0） |
| `r3/b1: a failure during a never-succeeded connecting handshake keeps its attribution` | 从未成功过 → 真实软错 → 关低流量开始恢复（真实 `connect()` 卡在 `connecting`，用悬挂预算，不触碰任何网络）→ 再次开低流量并重复策略 → `connect` 早退 → 聚合层与宿主 ensure 仍报不可用 | 同上，通过 |
| `r3/b1 reverse: a guard closure without any fault evidence is never reported as an outage` | 无任何故障证据的纯主动关流 → 健康通道暂停后再应用策略 → 两步都必须仍算策略关闭且不得写 `tunnel_unavailable`/`local_port_closed`；同段反证：一旦出现真实失败，同一序列立即撤销认领并如实报离线 | 同上，通过 |

稳定性：同一文件额外连续重复两次，`repeat1_rc=0`、`repeat2_rc=0`，15/15 全绿（`logs/121-3-rework-repeat1.log`、`logs/121-3-rework-repeat2.log`）。`disconnect` 内 `status` 赋值在任何 `await` 之前完成，策略更新后 `await tick()` 的断言不依赖竞态。

### 19.3 受影响集合与门禁（本轮真实退出码）

- 串行回归 69 个文件（一次一个 node 进程，`logs/123-serial-summary-r2final3.txt`）：67 个 exit=0，2 个 exit=1，仍是已登记的基线既有失败——`test/factories_integration.test.js`（行数门 `extension\CacheCleanupPanel.ts: 479 行, extension\PlanCleanupHost.ts: 431 行`，`logs/122-3-factories_integration.log`）、`test/features/distributedRerunAndWorkerDelta.test.js`（GitHub 发布文案正则，`logs/122-5-distributedRerunAndWorkerDelta.log`）；两者与本任务无因果，结论沿用 §15/§16 的基线取证，未改生产代码去"修测试"。
- `npm run compile` exit=0（`logs/120-compile-r2final3.log`，tsc + 两处 `node -c` gate ok）；`npm run build` exit=0、`overall=passed files=228`、`node -c dist/extension.js` 与 `node -c dist/ui/PanelHtml.js` 双 gate ok（`logs/124-build-r2final3.log`）。
- `vm.Script dist/ui/PanelHtml.js` exit=0；内层脚本裸反斜杠自查 exit=0（`client_claim_sites=3`、`client_direct_claims_left=1` 即 helper 内唯一赋值点）；`grep 10890` 在 src+dist 零命中；固定 `127.0.0.1:18765` 在 src 零命中（`logs/125-dual-gate-r2final3.log`）。本轮未改 `PanelHtml.legacy.ts`，双重门禁仍全量重跑。
- `npm run package` exit=0、`overall=passed files=238`、`maxObservedConcurrent=1`（`logs/126-package-r2final3.log`）。改了 `dist/tunnel/RealtimeTunnelClient.legacy.js` 必须重打：新包 `simple-experiment-0.5.422.vsix` 2689768 字节，SHA256 `dc682f25bc2fb30083e9aa2dc61f15a2162894771d9e3dada0a3919b2db06758`（与上一轮 `ca3baaf1…` 不同，符合预期）。版本保持 0.5.422；未 `install:latest`、未发 Release、未合并。
- 对照探针一律放在仓库外 `D:/GitRepo/MCP/.agent-evidence/low-traffic-mode-20261028/`；本轮无需新增探针（`connecting` 悬挂由测试内的悬挂预算实现，不在工作副本内创建或删除目录）。

### 19.4 边界与未做

- 未新增测试阈值、未降低覆盖、未把 §17.5 的 lastError 泛用旧路径治理纳入本轮；该条仍按 GPT 判定为非阻塞建议保留。
- 未做安装、远端发行、Release 与 PR 合并；主仓 `D:/GitRepo/MCP/zlk-cluster-orchestrator` 保持零写入，仍停在基线 `7a6062fa`。
- 字节/费用节省率仍未实测，不作为通过证据。
- 交审自报：`handoff.json` 引用的 diff 工件按上一轮同样方式在 handoff 之后重新生成，因此 diff 内嵌的 handoff 副本比最终文件早一步（diff 文件本身的 SHA256 与 handoff 记录一致）。

## 20. 承接与 §20 决策表完整性修正（2026-10-28）

### 20.1 身份与首项测试

- 唯一源码写入目录仍为 `D:/GitRepo/MCP/zlk-cluster-orchestrator-low-traffic-20261028`；任务分支 `feat/low-traffic-mode-20261028`，HEAD `ca130b164227668e2da8eab9dfeba71c42c82d0f`。主仓只读核实为干净 master / `7a6062fa10441cc5852166a34138781a2604d9e9`。全部原未提交文件保留。
- 首项命令：`node --test --test-force-exit --test-timeout 20000 test/project/branchProjectRegistry.test.js`，由仓库外 `probes/run-single-validation.ps1` 先创建独占 stdout/stderr 文件，再启动子进程，20 秒外层终止并等待退出，随后读取日志。临时 Git 夹具只落规定 probes 根；未删除。
- 完整原日志：`logs/151-branchProjectRegistry-takeover.out.log`、`.err.log`；结果：`.result.json`，真实子进程 exitCode=-1，timedOut=true，wallMs=20190。仅前 7 个测试有成功输出，没有整文件终态，因此整文件不通过。未重试、未改超时、未为本项更改生产代码或其测试。开跑时进程清单为空不等于持续采集宿主负载，不能声称严格排除了期间其它任务或环境负载；也不能将原 build 失败定性为纯并发超时。
- 下一项 formalJobPreflightFailure 的启动预检发现其它任务占用测试窗口，拒绝启动；这次拒绝不算目标用例已运行。用户指示等待，期间已明确允许检查并修改实现；未停止其它任务。

### 20.2 与固定表对应的补齐

| 表范围 | 原增量缺口 | 本次修正及断言位置 |
| --- | --- | --- |
| N01–N04 / §20.5 | 单一 fault 可被另一通道或后续软传输错误覆盖 | 按 stream/snapshot/unknown 保存最小未解除故障；硬错优先；匹配成功只解除自身通道；reducer matrix 覆盖两种严重度和两个通道的乘积 |
| N05 | 未标注文本清空后直接变 N08；resolved-history 无匹配成功证明 | 决策写入前保留 unknown fault，匹配恢复证据单独记录；未知通道不能被普通 snapshot 成功洗白；独立 oracle 及未知来源矩阵覆盖 |
| N06–N08 | 空文本软来源未按 W 分类；旧缓存可被当新成功 | W 不依赖文本是否为空；复用 carry sample 不写新成功证据；gpuSampleCarryChannel 新反证保持原去重与采样时间 |
| A01 / A02 | disposed 当前代际 helper 仍可改字段；journal-gap 失败回调缺代际核对 | disposed / stale 早退；journal-gap 与重连 catch 核代际；全字段保留断言，原 10 链保留 |
| A03–A18 / §20.6 | 宿主从展示断连生成 local_port_closed 与 checkedAt，401/未知也被误报端口关闭 | 仅低流量禁止该推断，保留逐端点真实故障及 tunnel_unavailable；正常模式原路径不变。旧低流量健康断言修正为“不伪造检查”，同步增加真实故障保留断言，未减少用例或断言数量 |
| §20.7 全称量词 | 原逐行用例只展开部分维度 | 新增纯内存独立 evidence/action oracle，展开 origin/pending/text/M/resolved × status/V/G/K/R/A/C，每向量两次幂等断言；T/I/budget 等价因子映射另测；实际计数以本轮测试输出为准，未运行前不写通过 |

所有 lastError 写入口核对清单：WS/SSE connect catch 依据真实失败阶段区分 stream/snapshot；connectionLost 写传输或硬错并在通知前登记；setHidden catch 核连接代际；ws.onerror 核 socket 与代际；活流展示失败写 soft-display；journal-gap catch 核代际、销毁和预算取消；snapshot 成功仅以实际新读取解除对应故障。未解析错误文本来猜来源，未增加网络请求或科研检查。

### 20.3 中间验证与阻塞

- `npm run compile -- --max-parallel 1` exit=0、overall=passed files=0，两道 node-c 均通过。完整日志 `logs/153-compile-takeover.log` 与 `.exit.txt`。编译后还有源码增量，因此只是中间证据，最终候选须重验。
- `vm.Script dist/ui/PanelHtml.js` exit=0，完整日志 `logs/154-vmScript-takeover.log` 与 `.exit.txt`。端点检索 `logs/155-endpoint-audit-takeover.json`：src/dist 中 10890 和 127.0.0.1:18765 都为零命中。本轮未改 PanelHtml 内层脚本。
- 尚未运行本轮新增专项；完整 build 未通过；151 timeout 仍按 required 阻塞。不能重跑同一超时文件或修改阈值来满足 build，不能把 required 改 false。旧 149 failed、150 interrupted 原记录保留。
- 0.5.422 不变，旧 VSIX 未重打、未安装；PR #25 尚未更新/合并，未发 Release，主仓未同步。最新远端只读核实仍为 v0.5.421、master=7a6062fa；不以此替代后续发布前重新核实。节省字节/费用均未实测。

### 20.4 已运行专项及原 build 失败补充

- formalJobPreflightFailure：`logs/152-formalJobPreflightFailure-takeover.{out.log,err.log,result.json}`，exit=0，1/1，wallMs=10564。原 150 日志实际失败点为 `assert.ok(result.elapsedVirtualSeconds < 90)`，不是 ETIMEDOUT，也不是 Python 子进程 status 非零。夹具 `formalJobPreflightProgress.fixture.py:133-135,337` 将真实 monotonic 耗时乘 30 再检查，确会受宿主进程启动/负载影响；本次单跑通过只能证明本次候选在当次条件下通过，不能证明原失败只由并发造成。未改 90、scale、任何 timeout 或生产逻辑。
- 交接时 150 仍无汇总；重新只读核实时该原日志 LastWriteTime=2026-10-28 13:29:37，已出现 `overall=failed files=228 maxObservedConcurrent=1`，唯一 failed 是 formalJobPreflightFailure。总时长 715641ms，runner 已结算。新增事实保留，不能继续声称原文件永远没有汇总；此处不反推外层 shell 未捕获的真实退出码。
- 决策表 `logs/157-displayClosureDecisionTable-takeover.*`：14/14，exit=0，wallMs=1967。纯模型 kernel=248832，双次幂等；T/I/budget 等价因子 12，映射完整域 2985984；真实入口逐行证据 88 组合，动作 768 组合，原 chain1–chain10 全部通过。
- `logs/158-lowTrafficDisplayRework-takeover.*`：15/15、exit=0、wallMs=2141；`logs/159-gpuSampleCarryChannel-takeover.*`：5/5、exit=0、wallMs=692；`logs/160-panelLowTrafficModePolicy-takeover.*`：16/16、exit=0、wallMs=1321。
- 冻结产品输入后的 compile：`logs/156-compile-final-input-takeover.log` / `.exit.txt`，exit=0、overall=passed，两道 node-c gate 通过。其后仅测试准备和文档继续修改，产品源码未变。

逐行映射（同名 node:test 内每个标签均执行真实 client；另有独立 oracle 覆盖全部有限域）：

| 行 | 逐行测试 / 标签 |
| --- | --- |
| N01 | §20.3 N01-N08 / N01@STATUS_KEYS |
| N02 | §20.3 N01-N08 / N02@STATUS_KEYS |
| N03 | §20.3 N01-N08 / N03@STATUS_KEYS |
| N04 | §20.3 N01-N08 / N04@STATUS_KEYS |
| N05 | §20.3 N01-N08 / N05@STATUS_KEYS；reducer unknown 来源矩阵 |
| N06 | §20.3 N01-N08 / N06@STATUS_KEYS；chain1 |
| N07 | §20.3 N01-N08 / N07@STATUS_KEYS；chain7 |
| N08 | §20.3 N01-N08 / N08@STATUS_KEYS；chain3/6 |
| A01 | §20.4 A01-A18 / A01；kernel stale；chain2/10 |
| A02 | §20.4 A01-A18 / A02；kernel passive/G-enabled |
| A03 | §20.4 A01-A18 / A03 |
| A04 | §20.4 A01-A18 / A04 |
| A05 | §20.4 A01-A18 / A05；chain4 |
| A06 | §20.4 A01-A18 / A06；chain5 |
| A07 | §20.4 A01-A18 / A07 |
| A08 | §20.4 A01-A18 / A08 |
| A09 | §20.4 A01-A18 / A09 |
| A10 | §20.4 A01-A18 / A10 |
| A11 | §20.4 A01-A18 / A11；chain3/6 |
| A12 | §20.4 A01-A18 / A12；chain1 |
| A13 | §20.4 A01-A18 / A13；chain4/6/8 |
| A14 | §20.4 A01-A18 / A14；chain5 |
| A15 | §20.4 A01-A18 / A15；kernel 第二次应用；chain3 |
| A16 | §20.4 A01-A18 / A16；kernel 第二次应用；chain1 |
| A17 | §20.4 A01-A18 / A17；kernel 第二次应用；chain4/8 |
| A18 | §20.4 A01-A18 / A18；kernel 第二次应用；chain5 |

### 20.5 获准排查 branchProjectRegistry 准备成本

用户明确允许“排查准备成本并验证一次”，保持全部断言、20 秒上限，不为此修改生产代码。原测试自身已有 C5 30 秒显式超时（2026-10-26 批准记录，约 196 次真实 Git spawn；历史独立 C5 19.56/20.05/20.21 秒），本轮一字未改该值、Node 参数或外层 20 秒终止。首次 151 在前 7 项后到达整文件上限，不等同于原 C5 30 秒超时已复现。

- 准备修正：makeRepo 由一次真实 clone + remote remove 改为同一只读模板的完整独立字节复制；每目标缺失才复制，拒绝链接，逐文件确认无硬链接，Git 元数据归本夹具。其它测试中真正被测的 clone/init/worktree/fetch/ff 与全部断言不变，无共享可写仓库。
- 安全修正：旧 `git rm` 改为只移除 index 条目、保留磁盘字节；旧 scratch 文件删除改为夹具专属 exclude，使同一 clean Git 输入恢复，同时原字节保留并新增断言。未执行任何永久删除，未改宿主 Git 配置。
- 这只是准备成本修正，不能保证包含 26 个串行用例的整文件能在 20 秒完成。获准的一次修正后验证尚待测试窗口，不提前标通过。

### 20.6 一次准备修正验证、隔离更正与限时口径授权

- 获准的一次验证 `logs/176-branchProjectRegistry-prep-takeover.*`：真实子进程 exit=-1、timedOut=true、wallMs=20302。前 7 项内有 1 项失败，未产生完整整文件终态，不计通过，未隐瞒或覆盖。
- 该项额外失败是本轮执行器的临时父目录隔离错误：151、176 的 TMP/TEMP 同为 probes 根，测试硬编码兄弟目录 `child-worktree`。现存 `probes/child-worktree/.git` 精确指向 151 的 `se-branch-relation-1vOjGN/.git/worktrees/child-worktree`（创建 13:31:53），176 的仓为 `se-branch-relation-4nB6Tx`（13:56:26），因此新 worktree 创建遇旧目录。此问题不是产品回归或模板复制断言通过的证明。已修执行器为每次独占 `<LogStem>.environment`，目标已存在则拒绝；保留全部旧夹具，不清理、不覆盖。
- 原 149 runner receipt 的 branchProjectRegistry 为 argv=[]、wallMs=163875；完整 TAP 为 26 项、25 pass、1 cancelled，唯一 C5 `test timed out after 30000ms`。它与本轮“整个文件 20 秒”外层看门狗口径不同，不能混作同一超时复现。
- 用户随后明确授权“按原用例限时重新验证”：撤销本轮新增的整文件 20 秒看门狗，保留 Node `--test-timeout 20000` 与仓库中 C5 既有 `timeout:30000`，用独立临时目录重新验证完整文件一次。执行器额外总进程保护预算仅取冻结文件原用例限时之和（26×20s+原 C5 额外10s=530s），不改任何仓库内阈值。183 是此授权下的新验证，151/176 的失败与超时完整保留。
- 新冻结产品输入 `logs/179-compile-frozen-takeover.*` exit=0、overall=passed、双 node-c 通过；`logs/180-vmScript-frozen-takeover.*` exit=0；冻结决策表 `logs/182-displayClosureDecisionTable-frozen-takeover.*` 14/14、exit=0，含未知故障不被后来已知通道故障改写的新增反证。
- 直接受影响连接回归 15 个文件全部单文件串行 exit=0，真实结果/完整日志为 `logs/161-*` 至 `175-*` 的 `.result.json/.out.log/.err.log`，没有超时/取消/失败。执行期间一个文件结束并确认退出后才启动下一个。

### 20.7 183 完整通过与 184 新构建失败

- `logs/183-branchProjectRegistry-original-limits-takeover.*`：26/26、exit=0、无取消/超时、wallMs=84005；C5 实测 15691.5624ms。独立临时目录内全部真实 Git 行为与新增保留字节/无硬链接断言通过。151/176 是已撤销的整文件口径/旧隔离输入的历史非通过，保留原始日志，不改成 passed。
- `logs/184-build-frozen-takeover.log` 与 `.exit.txt`：真实 exit=1，`overall=failed files=228 maxParallel=1 maxObservedConcurrent=1`，totalWallMs=574405。branchProjectRegistry（job-226）以及另 226 项通过；唯一失败为 formalJobPreflightProgress（job-006），不是先前 formalJobPreflightFailure。两道 node-c gate 通过不等于整体通过。
- 真实失败为 `durableAccepted` 期望 true、实际 false。回执 `FORMAL_JOB_PREFLIGHT_STALLED`，阶段 starting，`progressCount=0`、`elapsedVirtualSeconds=30.732248998247087`，未启动科研执行。说明首次真实资产进度之前已耗尽当前夹具 ×30 的启动窗口；不是外层 Node 20 秒或 Python 10 秒进程超时。
- 该夹具原本让子进程先解析整个 Scheduler 源文件的 AST、做静态依赖提取，然后才开始发真实资产进度。AST 提取是测试隔离准备，并非被测 Worker 资产进度。保留真实 Python 子进程和函数实现，将这一纯准备移到父进程、scaled clock 之前：公共 helper 新增 `compile_runtime_functions`，与原接口共享同一节点选择函数；父进程每次从当前源码新鲜提取，仅把选中函数和必要 import 的 code object 写入本次私有目录；子进程仍独立导入必要依赖并执行真实函数，不执行完整 runtime 或 main。
- 未改任何断言、90 秒界限、scale=30、inactivity=30、Node 20 秒、spawnSync=10 秒或轮询/取消规则；不提前发假 heartbeat、不伪造资产计数，不改生产代码。该准备只消除测试专有的 AST 分析成本，`elapsedVirtualSeconds>10` 仍须由真实资产读取/进度达到。
- 新增 scope 为 `test/_helpers/extractRuntimeFunctions.py` 与 `test/features/formalJobPreflightProgress.fixture.py`，均不入运行包。原 extractor 接口及 namespace 注入的语义保持，节点选择代码原样提取共用。先单文件验证该 fixture 的六个消费者，再重跑完整 build；在其完成前仍阻塞 package/提交/终审/发行/安装。

### 20.8 准备修正后六项单跑

全部按原 Node 20000ms、单文件串行执行，完整 stdout/stderr 和真实退出码均先落盘；无超时/取消，未修改任何用例断言、时间值或生产代码。

| 文件 | 日志前缀 | exit / wallMs |
| --- | --- | --- |
| formalJobPreflightProgress.test.js | 187-formalJobPreflightProgress-prepared-takeover | 0 / 3970 |
| formalJobPreflightFailure.test.js | 188-formalJobPreflightFailure-prepared-takeover | 0 / 10041 |
| formalJobPreflightStructure.test.js | 189-formalJobPreflightStructure-prepared-takeover | 0 / 6882 |
| formalJobPreflightEnvironment.test.js | 190-formalJobPreflightEnvironment-prepared-takeover | 0 / 2358 |
| formalJobPreflightRejections.test.js | 191-formalJobPreflightRejections-prepared-takeover | 0 / 7567 |
| formalJobPreflightApi.test.js | 192-formalJobPreflightApi-prepared-takeover | 0 / 4953 |

仅这六项通过不代替完整 build；下一轮日志为 186-build-prepared-takeover。此前 184 失败原日志继续保留。再次核实远端 master 仍为冻结基线 7a6062fa，PR #25 OPEN/MERGEABLE、head=ca130b16、无 GitHub check rollup；真实 Latest 仍为 v0.5.421。本轮仍未提交/发行/安装。

### 20.9 完整 build 门禁已通过（准备修正后的冻结候选）

- `logs/186-build-prepared-takeover.log` / `.exit.txt`：真实 exit=0，`entry=build overall=passed files=228 maxParallel=1 maxObservedConcurrent=1`，总时长 565569ms；全部 228 个 job passed，按需未运行数为 0。逐子项完整 stdout/stderr 和 run.json 在 `simple_cluster/reports/test-workflow/2026-10-28T06-35-02-719Z-69064-build/`。
- 该 run 的 compile gates 包含并通过 `node -c dist/extension.js` 与 `node -c dist/ui/PanelHtml.js`；编译缓存按原项目机制复用，未减少任何测试或断言。formalJobPreflightProgress、Failure 与 branchProjectRegistry 均通过。
- 构建后独立 `vm.Script dist/ui/PanelHtml.js`：`logs/193-vmScript-build-takeover.log` / `.exit.txt`，exit=0，零异常。`logs/194-endpoint-audit-build-takeover.json`：src/dist 中 10890 和固定 127.0.0.1:18765 零命中。本轮 PanelHtml 源码未更改。
- package.json / lock 根 / lock packages[""] 均为 0.5.422，runtime 源清单未产生差异；版本不再递增。之前旧 VSIX 已复制到仓库外 `previous-simple-experiment-0.5.422-ca130b16.vsix`，2689768 字节、SHA256 dc682f25bc2fb30083e9aa2dc61f15a2162894771d9e3dada0a3919b2db06758，保留原字节供对照。
- 当前已满足完整 build 与双重语法门禁；下一步仅重打包并补齐同一新包证据。旧失败 149/150/151/176/184 的性质和日志保留；不把它们改成通过。尚未提交、push、终审、合并、发行或安装。

### 20.10 中间 package 通过与最终整表反证修正

- 185-package-frozen-takeover：真实 exit0、overall=passed、238 项通过、maxParallel / maxObservedConcurrent 均为 1，总时长 653689ms。中间 VSIX 为 2692568 字节、SHA256 c37f9aa12433aeb210b4058ca28b43c9964c7672d6e170f3994f03ac93e68c47，仓库外保留 intermediate-185-simple-experiment-0.5.422.vsix。此包产生后又修正源码，明确不是最终交付包。
- 将原 §20 有限域的故障通道展开为 stream / snapshot / unknown，kernel 从 248832 扩大为 746496；T×I×budget 等价映射由 2985984 扩大为 8957952。199 真实 exit1 暴露 M=true 与 unknown 通道传输证据并存时，F 已为 H 而 closureReason 仍为 unknown-fault；按 N01 仅在统一决策函数调整 H 优先，204 全部 14 项通过。
- reducer 矩阵追加 N05 / N07 的原契约反证：已知通道恢复不能把其后无匹配来源的其它错误文本认证为 resolved-history；覆盖 none / unknown / transport / hard / 未证明 resolved-history 五种来源。225 真实 exit1，原 lastError 被误认证为 N。修正为只允许真实 noteDisplayFault 入口记录的来源及同一文本在匹配恢复后成为历史，其它文本转入既有 unknown 故障保留机制；不解析错误内容，不新增网络或持久化账本。
- 226-display-evidence-witness-fixed-takeover：exit0、14/14、无超时，包含全部有限域、N 88 组合 / A 768 组合、10 条连续链与增补 reducer 反证。206–223 的 18 个直接相关文件在 N01 修正后亦全部 exit0；最终小范围来源证明修正仍必须经过新的完整 205 build / 202 package，不能借 186 / 185 旧候选记录交付。
- 以上均为 §20 已列语义的表内反证和统一 reducer 修正，原 GPT 指导、所有断言和超时阈值保留；没有新增外部协议/性能指标或收费服务器实验。当前尚未提交、push、交审、合并、发行或安装。

### 20.11 远端并行任务推进造成新的交付阻塞

最终 205 build 进行中重新查询真实 GitHub 更新源，最新稳定 Release 已为 v0.5.423（published_at 2026-10-28T06:32:16Z），绑定 7d2fbc6c68cef6f40669fbf115dd71441822ac46；git ls-remote 及 fetch 确认该提交也是当前 origin/master。PR #26（插件审计）已合入，修改 58 个文件，包含 runtime / Panel / 更新客户端安全修正及测试准备。PR #25 重新查询为 CONFLICTING，不能合并或把 0.5.422 提升为 Latest。

真实原始回执：logs/228-live-latest-before-review.json、logs/229-fetch-new-master.log。未改任务分支、原工作区源码、版本或已发布资产；用户原要求保持 0.5.422，与禁止降级 Latest 无法同时完成后续发行。已请求用户选择是否允许在同一副本合入新 master、处理冲突并使用 0.5.424 后重新验证；答复前只完成既有候选的独立验证，不擅自整合或发布旧版。原基线 7a6062fa 仍是本任务冻结祖先，不以新远端引用冒充原基线。

### 20.12 最终 0.5.422 候选完整 build 通过

- logs/205-build-final-takeover.log / .exit.txt：真实 exit0、entry=build、overall=passed、228 项全部通过、maxParallel=1 / maxObservedConcurrent=1、未运行 0，总时长 630266ms。完整逐项原日志与回执：simple_cluster/reports/test-workflow/2026-10-28T07-41-45-240Z-53756-build/。此候选包含 §20.10 的最终来源证明修正，不借旧候选通过。
- 两道 node-c gate 在本次 build 中通过；随后 logs/201-vmScript-final-takeover.log / .exit.txt 的独立 vm.Script exit0，零异常。logs/227-endpoint-audit-final-takeover.json 检查 src / dist 共 818 个列出文件，业务文本内 10890 与固定 127.0.0.1:18765 零命中。
- 原 0.5.422 候选 package 202 继续完成已授权的独立验证，尚未结算，不先计通过。远端 0.5.423 / PR25 冲突的阻塞独立存在；验证通过不会自动豁免版本规则、授权整合或允许降级 Latest。

### 20.13 最终 0.5.422 实包验证完成，后续交付因主线推进阻塞

- logs/202-package-final-takeover.log / .exit.txt：真实 exit0，entry=package、overall=passed、238 项全部 passed，maxParallel=1 / maxObservedConcurrent=1，未运行 0；总时长 720082ms。逐项完整日志与回执为 simple_cluster/reports/test-workflow/2026-10-28T07-53-42-350Z-72488-package/，组装 gate12 成功，不包含 live install。
- 最终 simple-experiment-0.5.422.vsix：2692706 字节，SHA256 b0d5b59eb108241201b09c4db0b2aec686ca8efbd6c440812d630c5053e4a253。逐包 .vsix.sha256 为 UTF-8 无 BOM，绑定精确文件名。此包未发行、未安装。
- logs/232-package-identity-closure-final.log、195-package-runtime-inputs.json、195-package-evidence.json：真实归档身份 simple-local.simple-experiment、版本0.5.422、universal、VS Code ^1.100.0；package/lock/编译 runtime 版本一致。对真实 ZIP 内274个运行闭包/面板/资源文件逐项唯一存在与当前字节 SHA256 比对（package.json 检查身份和 engine）；Agent / Scheduler 内容哈希与清单相符。
- logs/230-vsix-manifest-final.log / .exit.txt：exit0，351 ZIP 条目、leakHits=0、missingRequired=0、readmeViolations=0。logs/231-vsix-runtime-final.log / .exit.txt：exit0，268 本机模块、2 个入口闭包验证通过。未对运行中的面板、远端服务器或 Agent 执行验收或写入。
- 当前代码验证与包证据已完成，但不等于交付完成。真实稳定 Latest 已为0.5.423、master为7d2fbc6c、PR25 CONFLICTING。用户关于同副本整合并使用0.5.424的选择仍待答复；保留全部改动与旧失败原文，未以旧0.5.422覆盖或降低Latest，尚未提交本轮增量、push、第五轮终审、合并、发行、安装或同步主仓。

### 20.14 全索引预检与冻结提交边界

234-final-preflight-takeover：只读 node D:/OpenChamber-AgentConfig/OpenChamberProjectSandbox/pi-task-preflight.mjs <handoff.json> 真实 exit0、ok:true、purpose=final、candidateFiles=34、artifacts=11、checks=82、semanticApproval=false。全部历史失败保留原状态；151/176 被用户新口径183完整通过替代，199/225 被统一 reducer 修正后226整表与205/202最终门禁替代，均在索引明确标历史，不伪造转绿。规定最终 build/package/vm/包门禁均为 required。

索引生成器一度因预期的 git diff --no-index 返回1残留在 LASTEXITCODE，使调用层误报刷新失败；文件已成功生成，当时未启动预检。仅修仓库外生成器在全部原生状态检查、写入和UTF-8回读完成后显式退出0，之后234预检通过。此记录与最后文档状态写入后仍须重算全部 sha256 并执行同一只读预检，最终回执留在仓库外，避免索引自引用。

本轮进入原任务分支的 scoped 提交/普通推送阶段，实际新 SHA 与 push/fetch 确认在仓库外日志登记；handoff.revision 明确仅为快照父提交 ca130b16，不冒充最终 HEAD。只发布本分支的已验证源码，不整合 master、不声称可合并，不运行第五轮终审或任何发行/安装操作。版本/冲突决策仍待用户答复；当前 .vsix 与逐包清单保留，不上传历史版本。
