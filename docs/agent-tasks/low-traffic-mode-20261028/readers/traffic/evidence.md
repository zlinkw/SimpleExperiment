# 证据文档 — 任务A：通信流量清单（低流量模式事实收集）

- 任务ID：low-traffic-mode-20261028 / 任务A（通信流量清单，只读调查）
- 文档修订：r1
- 负责人实例ID：scout（子代理，只读调查角色）
- 采集时间：本轮（原生 Windows）
- 仓库身份：SimpleExperiment 插件，本地目录 `D:/GitRepo/MCP/zlk-cluster-orchestrator`，GitHub `zlinkw/SimpleExperiment`
- 核实基线：`git rev-parse HEAD origin/master master` 三者均为 `7a6062fa10441cc5852166a34138781a2604d9e9`（实测，见下方“验证”）；工作区 `git status --porcelain` 无输出（干净）
- 执行环境：原生 Windows，Git Bash 取行；只读源码，未编译/未安装/未运行测试/未做任何 git 写操作
- 关键文件 SHA256（只读计算，sha256sum）：
  - `src/extension/legacy.ts` = 21237a6a847413c8e0a5a98956d992a43899f51e3d0352e4b3212eea233f590e（38837 行）
  - `src/ui/PanelHtml.legacy.ts` = 394cbfaac95a5fd9faa218441b6a79a5217ce50c956ab044830bea0508c6c5c6（19441 行）
  - `src/tunnel/TunnelClient.legacy.ts` = 750475d21700e8b9d68cf53a56f622e1c48123bf32090d510e172a7ef0b49e6b
  - `src/tunnel/RealtimeTunnelClient.legacy.ts` = 52ba675bca6c53e686007fe9c3f95e75171073d4c6c56bf5521a3f9f611fa625
  - `src/tunnel/WorkerTelemetryApi.ts` = 63a810f5264fa3aac505f5a194cd723de77f5de1f3de252d3b0fd92c6eb66c21
  - `src/tunnel/RequestBudget.ts` = ac1b692a038b6e8b7e12fa28d05c059c649323fce78bd37cbe18dd4b785bd5b1（532 行）
  - `src/tunnel/BoundedResponse.ts` = 31c75fa3c18c5762fa444a29ec222832cae1942a46b1f2f03fd8e4ef8944b7c3
  - `src/extension/ResultCollectionHost.ts` = 5d9df2d1a70554f5b823c2023acd9e1784bf1f55bedb5d63a591965bd837a5b5
  - `src/services/AgentService.ts` = d930d582753a027ffae1cdcb0c7078dc0b2f3735a11f0a0a064fd44c7e1f9629
  - `src/extension/PlanCleanupPanel.ts` = 2d2e13a494c96a9f9c92b1c5d6f47a85a524d8f1c32a86c2958fb3a2427c6cf3

---

## 1. 架构与边界（事实）

- 入口 `src/extension.ts`（36 行）是门面，`export * from "./extension/legacy"`，实际运行逻辑在 `src/extension/legacy.ts`（38837 行）。这与 AGENTS.md「runtime candidate: src/extension.legacy.ts（38836 行）」一致；行号按本次基线为 38837。
- 面板真实脚本是 `src/ui/PanelHtml.legacy.ts`（19441 行）。门面 `src/ui/PanelHtml.ts`（49 行）默认回退 legacy（`renderPanelHtml` 直接 `require("./PanelHtml.legacy")`）；工厂路径仅 `FEATURE_FACTORY_PANEL=1` 时启用。故 Webview 自主行为以 PanelHtml.legacy.ts 为准。
- 本机↔远端通信分两类：
  1. **控制面 HTTP/WebSocket/SSE**：`src/tunnel/*` 封装，经本地隧道转发端口（Xshell/SSH 本地转发）访问 Worker Agent。
  2. **文件传输面 SFTP/rsync**：经 SimpleSFTP 插件（`simpleSftpApiCall`）执行 fpsync / server-to-server / downloadMappedPaths。
- **本机回环 API**（`api/LocalApiServer.ts`、`cli/LocalApiClient.ts`、`core/SimpleSftpProgressWait.ts`、端口 `LOCAL_API_PREFERRED_PORT=19765`）是扩展自身给 CLI 的 loopback RPC，**不产生跨机流量**，不计入本清单的低流量目标。
- 远端服务器内部还有 tmux Scheduler（`clusterSchedulerRuntime*`，Python，运行在服务器上）轮询其它 Worker 的 `/api/worker/availability`。这是 **服务器↔Worker 内部** 流量；只有跨计量链路时才计入，需用户确认网络拓扑（列入未知）。

---

## 2. 控制面 HTTP 客户端封装位置（事实）

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

## 3. 被调用的远端 endpoint 全集（事实，源自 WorkerTelemetryApi + TunnelClient + legacy.ts）

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

## 4. 通信点清单表（触发源 | endpoint/同步动作 | 触发时机与间隔 | 请求体量级 | 响应体量级 | 低频化建议）

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

## 5. 全部间隔常量（常量名 | 值 | 文件:行）

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

## 6. 现有可复用的省流量机制（事实）

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

## 7. 响应体量级定性（事实+推断）

- 最大响应（跨机）：
  1. `/api/worker/tasks` 全量查询：AGENTS 与 refreshWorkerTaskSnapshot 注释明确「legacy task_query answers with artifact-manifest and dead-pane log reads for EVERY inventory row」——**逐行含 manifest + 日志读，最大**。低流量已有 executionOnly 轻量替代 + excludeVerifiedCompleted 跳过。
  2. `/api/snapshot`：ClusterSnapshot 含 workers/gpu/schedulerStates/experimentTraces 大数组（TunnelClient:25-31，上限 32MiB）。
  3. `/api/gpu`、`/api/gpu/history`：GPU 时序数组，中等。
  4. SFTP `downloadMappedPaths` / fpsync：整 work_dirs，**按字节最大**（但事件驱动、非定时）。
  5. `/api/code-sync/inspect`、`/api/code-sync/plan-scope`：文件清单，可能大。
- 小响应：`/api/health`、`/api/version`、`/api/capabilities`、`/api/fs/sha256`、心跳/状态操作。
- 最大请求体：`/api/worker/tasks/query`（可含 queries/discovery 数组，中等）、SFTP 传输清单 JSON（可达 MAPPED_RESULT_DOWNLOAD_MAX_ENTRIES=256 项）。控制面 GET 无请求体。

---

## 8. 事实 / 假设 / 未知 分栏

**事实（已核源码/命令）：**
- 基线三 ref 同为 7a6062f，工作区干净。
- 500ms queue 轮询 + 2000ms 进度轮询 + 5s 快照回退 + 5s 心跳 + Webview 5000ms tmux（可见性门控）+ 各退避常量如上表。
- 500ms/2000ms 轮询仅在 `isRealtimeMode()` 且（protocol==2 或 worker_pool）且有 plans/health≠paused 时才发网络。
- 控制面 HTTP 无 ETag/If-None-Match/If-Modified/gzip；已有 SharedReadCoalescer 并发合并、快照单飞、excludeVerifiedCompleted、executionOnly 轻量库存、live-output/since、SSE since、resultCatalogTtl、RequestBudget(pause/hidden/并发/合并)。
- 文件同步经 SimpleSFTP，事件驱动（job 完成镜像、结果收集、代码同步），支持 gzip/zstd 压缩，可 metricsOnly。

**假设（未独立证明，低流量设计前需验证）：**
- 假设当前 500ms/2000ms 是跨机流量主因（源码支持，但未做实际抓包/字节计数）。
- 假设“顶部颜色条按钮”开关可复用 RequestBudget.setPaused / pauseWhenHidden 语义实现全局降频（RequestBudget 已有 paused 与 hidden 通道，但控制面 minIntervalByPurpose 默认空）。
- 假设多数部署走 WS/SSE push；若默认落到快照轮询回退，则快照是主流量。

**未知（需向用户/后续确认）：**
- 计量网络拓扑：500ms 轮询打的是本机↔Worker（经隧道，可能跨计量公网）还是全在局域网内？服务器端 Scheduler↔Worker 的 availability（10s）是否跨计费链路？
- 典型 worker 数、plan/job 数、GPU 卡数（决定每轮响应体量级与 500ms×N worker 的放大）。
- `availabilityPushMinIntervalMs` 对应的 `pushLocalWorkerAvailability` 函数体首行 inFlight 判断后有裸 `return;`（legacy.ts:25284-25285 区域），疑为**已禁用/死路径**——是否仍产生 availability 推送流量未确认。
- RequestBudget.pauseWhenHidden 默认 true 与 RealtimeRefreshPolicy.pauseWhenWebviewHidden 默认 false 同时存在（tunnelConfig.refreshProfile / allowStreaming 决定实际），**隐藏时 500ms tick 是否真正被 budget 拦截**未端到端验证。
- 实际每类响应的平均/峰值字节未测量（文档只给定性 + 上限）。

---

## 9. 验证（只读）

- 命令：`git rev-parse HEAD origin/master master`（exit 0，三行均为 7a6062fa10441cc5852166a34138781a2604d9e9）；`git status --porcelain`（无输出）。日志：`D:\\OpenChamber-AgentConfig\\Pi\\host-native\\diagnostics\\host-windows\\66b58277-*`。
- 命令：`wc -l`、`sha256sum`（见文首哈希）。
- 未编译、未装依赖、未运行测试、未做 git 写操作（符合只读约束）。
- 全文 grep 证据（caching/etag/global）：ETag/If-None-Match/gzip/If-Modified/Accept-Encoding 仅命中 cli/plugins.ts、cli/help.ts（SFTP 压缩参数）与 updates/ReleaseClient.ts:58（GitHub）；控制面零命中。

---

## 10. 本轮变更索引

- 新增 E 编号事实：E01 通信点清单表；E02 间隔常量表；E03 现有省流量机制；E04 无控制面 HTTP 缓存/压缩的否定证据。
- 无旧证据失效（任务A首轮）。
- 未解决/待办见第 8 节“未知”，交下游（GPT 规划 / 流量优化方案）前建议补：计量拓扑、规模量级、push vs polling 实际占比、隐藏时是否真降频。
