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
