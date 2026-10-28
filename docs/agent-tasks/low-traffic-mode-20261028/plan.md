# SimpleExperiment 低流量模式实施计划

- 修订：r2，2026-10-28，purpose=plan；GPT medium 增量修订。r1 未受影响的指导与验收条款逐字保留；r2 变更索引、逐项分类和补充验收见 §10。
- 状态：r2 规划完成；实施者已获准先做不受本次修订影响的按钮、消息链、持久化与测试骨架，实际完成状态由其日志认定。本文不是测试、打包、发行或安装成功凭证。
- 本轮唯一写入：docs/agent-tasks/low-traffic-mode-20261028/plan.md。不写源码、依赖、其他证据、索引或 Git 状态。
- 基线：7a6062fa10441cc5852166a34138781a2604d9e9；据已通过只读预检等于 GitHub zlinkw/SimpleExperiment master。
- 唯一实施副本：D:/GitRepo/MCP/zlk-cluster-orchestrator-low-traffic-20261028；分支 feat/low-traffic-mode-20261028。
- 保护主线：D:/GitRepo/MCP/zlk-cluster-orchestrator；node_modules Junction 不改、不重装。
- 权威证据：同目录 evidence.md r1，SHA256 0a954db8c79f8206b7d89eecfb00523eb8ac6066a9839d7b4f702e51cca9e7ce；handoff.json 的候选哈希及 readers 原文共同绑定本文源码行号。所有行号均指冻结基线，而非实现后行号。

## 1. 用户契约与交付边界

### 1.1 原始要求（一字不改）

> 目前插件还缺一个低流量模式，我的部分服务器的流量是收费的，而目前的插件完全没有为节省流量设计。需要优化出一个新版本。交给gpt规划，确保功能完整的同时，用户选择低流量模式后能正常使用。注意，默认还是正常模式，只是要加个按钮在顶部颜色条后面，点击后开启，再次点击后关闭。开启时尽可能节省和服务器间通信消耗的流量

> 需要基于目前github master最新版复制，本地不一定是最新版

### 1.2 结果、输入和环境

交付一个默认关闭、跨重载保留、宿主权威的全局低流量开关，以及只在开启时减少重复后台通信的策略。正常模式零行为差异是硬要求，不能把全局默认值改成低频，也不能把已有“平衡”配置偷偷改名为低流量。

适用于当前原生 Windows、Git for Windows Bash / pwsh 7、Node 24.18.0、npm 11.16.0 和明确启用的 Worker。适用现有实时隧道、WS/SSE 与 HTTP 回退、协议 2 和现存 worker_pool；非实时/离线路径不新增远程通信。端点从每服务器配置动态解析。对正常模式保留全部已有配置语义。

低流量是本用户 profile 的偏好，不是每服务器配置；开启影响当前扩展宿主所管理的全部已启用 Worker。支持已有 globalState 的跨重载/重开恢复，不承诺多个已打开窗口的跨进程瞬时广播，见 §3。按钮须说明“全局偏好；其他已打开窗口重载后应用”，不能让用户误以为一处点击已原子改变所有窗口。

非目标：新压缩协议、新服务端聚合 API、科研环境检查、计费判断、按服务器计费配置、修改 Scheduler availability 协议、重写结果格式、改变同步范围、自动更新远端 Agent、工厂面板重构。不得把本计划的降频承诺扩大为流量字节或费用比例承诺。

保护区：原目录、其他任务/冻结祖先、科研数据、远端机器、用户配置端点、删除保护、任务身份、完成确认、显式同步选择、原始错误。没有新增远端写入授权；实施现场测试通过现有插件 API 和明确授权环境，不直接 SSH/SCP。

### 1.3 阶段与停止条件

实施→受影响正确性/安全回归→规定测试覆盖完整→版本递增→构建/打包→GPT medium 最终候选审核→任务分支 PR→合并→核对远端 master→稳定 Release→显式本机安装→用户重载后 UI 验收→干净主线基准仅快进同步。

编译是测试前置；有新源码/版本输入时按真实影响补验证。打包复用同一最终编译产物和测试准备，不在验证中改候选、不机械重复全仓测试。最终审核前可以按功能块审核；发布必须有最终候选审核通过。本轮仅生成此计划，不执行上述链路。

停止并交主控/GPT：正常模式差异、功能缺失、真实错误被吞、必需测试失败/超时/取消/未知、20 秒测试不退出、未知写入结果、端点/身份冲突、PR 冲突、基线变化使证据失效、发布同版本不同字节或远端已有更高稳定版。未知不算通过；不 force、不降级、不重放未知破坏性操作。只修机械问题一次，逻辑/安全不明交 GPT。机器通知不代用户确认。

## 2. 三个明确技术裁决

### D1：低流量是可持久化偏好；暂停和 manual_only 是更强约束，不互相篡改

有效优先级：
1. 明确 pauseAll / 离线生命周期的既有暂停语义；
2. tunnelConfig.pauseAllBackgroundTraffic=true 或 refreshProfile=manual_only 的既有后台约束；
3. lowTrafficMode=true 的分类策略：A 展示仅手动，B 正确性推进降频，C 主动请求即时；
4. 原正常策略。

不互斥存储，互斥的是有效运行状态。开启低流量不调用 resumeNetwork，不清离线包，不修改 refreshProfile、allowStreaming 或 pauseAllBackgroundTraffic；关闭也不自动恢复这些独立限制。pauseAll 不抹掉低流量偏好；resumeNetwork 仅恢复既有暂停通道，再按低流量偏好及原配置派生策略。manual_only 的 health=0/snapshot=0/stream=false 不可被低流量改成周期刷新。所有组合在状态中回显 requested、effective、blockedBy 和原因，不得静默覆盖。

暂停/手动模式下仍允许本地点击切换偏好。文案例：“低流量：开（网络已暂停，恢复后生效）”“低流量：开（仅手动刷新）”“低流量：开（后台通信已停）”。不为本功能新持久化 pauseAll；原有暂停生命周期不变，原 tunnelConfig 持久化不变。

依据：evidence §8.1；legacy.ts:6140–6157 pauseAllNetworkActivity/resumeNetwork，6758–6763 消息入口；TunnelGateway.ts:18–59、78–83 refreshProfiles/default/normalize。此优先级是新开关的合成规则，不授权修正正常模式的历史行为。

### D2：唯一策略源选 realtimeRefreshPolicy() 派生值；每个通信发起处消费它

扩展 legacy.ts:25561–25574 的 realtimeRefreshPolicy()，抽取/返回同一 effectiveTrafficPolicy（新符号，集中管理 requested/effective/blockedBy、queueMs、progressMs、displayAutoRefresh（低流量为false）、tmuxMs/snapshotSeconds（低流量均为0；0表示禁用，不是立即执行））。正常分支逐项等于原实现，不修改默认配置。宿主队列/进度定时器和 Webview 也必须消费该派生值；不能只改客户端快照参数。

不选散落修改定时器字面量：会漏掉恢复、重载和回退。也不选 RequestBudget.minIntervalByPurpose：当前默认 {} 且 decide 根本不执行该限频逻辑（§8.2），填值不会生效；复活它会误拒绝用户操作并撤销历史修复。

实现机制：正常模式仍使用原 500ms / 2000ms 定时器回调与早退；低流量进入独立可重排的定时器分支，切换时清旧 timer、仅建一组，dispose 清理完整。低流量每轮开始前读有效策略，异步结束验证 project/client generation，不让旧轮次重装 timer。无需为省流量更改 50ms 本地看门狗。Webview 接收宿主 displayAutoRefresh/tmuxMs；低流量清除展示 interval，不建 0ms timer；切回正常模式才重建原唯一 interval。同一状态帧不得反复重建 timer 或强制远程刷新。

### D3：保留 maxRequestsPerMinute=0，不恢复全局配额或 purpose 限频

本轮补充只读历史确认：f7f773a8b117e8c9d41b6bf98272c7097907e49e，标题“fix: remove tunnel request quotas and worker control throttling”，明确删除限频/配额和 worker 控制串行阻塞。完整日志：
D:/OpenChamber-AgentConfig/Pi/host-native/diagnostics/host-windows/e5f6cba8-19c0-41f4-b373-2cf45cc54a5f-stdout.log
git show exit 0；非测试。

因此 TunnelGateway.ts:98–105 requestBudgetConfigFromTunnel、RequestBudget.ts:92–105/367–400 的配额禁用语义保持；现有并发隔离、传输预算、隐藏门控、紧急操作通道照旧。替代方式是发起层定时调度、相同请求单飞、增量读取和减少无关后台查询，不以 cooldown 错误模拟省流量。本轮原则上不改这两个文件。

## 3. 开关、消息链与持久化

### 3.1 UI 位置、回显和点击协议

- 修改 src/ui/PanelHtml.legacy.ts:1337–1351：在 statusLegend 之后的 topbar-actions 内第一个子项、bootstrapProject 按钮之前，放唯一 button，id=lowTrafficModeButton，data-command=toggleLowTrafficMode，type=button。保留颜色图例和其他按钮顺序。
- 复用 :122–125、1035–1043、1270 顶栏/窄屏样式；开启态只加局部 is-active/aria-pressed 样式，不影响布局和“低效果模式”。
- 初始未握手显示“低流量：读取中”，disabled=true；首个权威状态后显示“低流量：开/关”，aria-pressed=true/false。tooltip 解释全局范围、展示自动刷新已关闭/仅手动刷新、手动操作与同步不变、其他窗口重载语义。
- 纯本地开关不因 Agent 离线、宿主独占租约或网络暂停禁用。仅在未获权威状态、当前切换提交中、面板 reload_required/维护时禁用；理由可见。
- :3717–3797 通用 data-command 分发复用。为该命令组装 enabled=当前宿主状态的反值、documentGeneration 和 requestId，不发送任意配置/URL。宿主验证布尔值、当前文档代际，重复相同 requestId 不二次翻转；采用“设置目标值”而非盲目反转，防止双击/重送翻两次。请求提交后本地禁用，不能先把权威开关画成成功。
- 独立轻量本地回执 lowTrafficModeUpdated（requestId、ok、enabled、error），不走通用远端 pending。成功仅在 Memento 写入及本地策略应用成功后；失败保留原值、显示真实错误并解除 pending。本地回执丢失在现有握手/状态重读中收敛；超时显示未知并允许重新读取，不自动重发切换。
- 状态渲染在 :4393–4512 handleIncomingWebviewMessage → lastState → scheduleStateRender 链中更新按钮。不让 transientPanelStateNeedsRestore 的选择态覆盖低流量字段；不靠 reload HTML 来切换模式。

### 3.2 必须同改/明确不改的集合

src/extension/legacy.ts：
- :614–643 SAFE_WEBVIEW_COMMANDS 加 toggleLowTrafficMode。
- :648 COMMANDS_WITHOUT_UI_STATUS 加同名命令：它是本地设置，不触发通用远端 UI 状态/通知；本节专用回执负责禁用态收尾。
- :636–638 API_INTERNAL_COMMANDS 加同名命令，避免把 Webview 专用开关暴露成任意 CLI action。:644–647 API_EXECUTABLE_COMMANDS 的 filter 自动排除它。
- :6503+ handleMessageCore 新 case，调用单一 setLowTrafficMode(enabled, requestId)（新符号）；对并发点击串行提交，不占 host lease。
- 不加 :238–297 WebviewActionCommand、:560–612 uiActionCommands 或 actionCommandMap；不加 :31150–31168 hostOperationUiCommands / hostOperationLeaseActionForUiCommand，不能抢宿主独占租约。面板 commandNeedsLoading 也不增加此命令。
- Webview 的通用确认/能力禁用规则不得把该本地按钮误判为远端动作；复用 actionButtonsCapability seam 校验。

### 3.3 键名与宿主权威

- :378–399 keys 新 lowTrafficMode: "simpleExperiment.lowTrafficMode"。
- :403–421 API_STATE_KEYS 新 lowTrafficMode: {store:"global", label:"低流量模式", writable:false}。选择只读 API 状态，避免 apiStateSet 绕过 timer/客户端策略应用；外部设置不在本版需求内。
- :3176 apiStateValue 使用既有键表读取；:439 normalizeApiStateValue 不新增写通道；:3211–3239 apiStateSet 对只读键拒绝，不伪称已支持 CLI 切换。
- 构造器 :1350–1369 在建立 budget/client/timer 前读取 globalState.get(keys.lowTrafficMode) === true，缺键默认 false；只认布尔 true，旧版无迁移行为。
- setter 先验证、await context.globalState.update，成功后更新内存、重排策略并 postState(true)，本地回执成功。若应用失败，明确错误/当前实际策略，不静默回滚成功；在同一串行事务中恢复旧偏好并重建原策略，恢复失败标记未知并阻断下一次切换直到重载。不得重置任务队列、完成证据、同步或停止意图。
- globalState 是权威；Webview setState/localStorage 不存权威值。package.json panel.retainContextWhenHidden 默认 false 不改。面板销毁、重开和 Reload Window 都从宿主 buildState 获取。
- buildState :26287+ 无条件顶层包含 trafficMode={enabled,effective,blockedBy,intervals,scope}，panelProjection 精简不可裁掉；buildPanelDegradedState :26254–26266 继续保留，buildMinimalPanelDegradedState :26267–26286 与 buildPanelFallbackState :27281+ 显式补字段。即使降级也能看到真实偏好而非默认“关”。
- :4259–4277 requestInitialPanelState 及 :4490–4512 状态收敛复用；webviewReady 首帧恢复，旧 seq/旧代际不得覆盖新按钮。

### 3.4 多窗口与灰度路径

本版明确不新增跨进程广播服务。每个已运行扩展宿主以其最近成功加载/设置的值运行，其他已打开窗口必须重载后应用；UI tooltip 与说明保留该限制，不宣称全窗口即时一致。后写偏好用于下次加载；当前窗口点击前重新读取持久偏好，重复设置幂等。并发窗口没有全局 compare-and-swap 保证，不能用 getState 假装原子一致。

PanelHtml.ts 默认委托 legacy（证据 §7/E01）；FEATURE_FACTORY_PANEL=1 的真实返回是否有 topbar，由原实现负责人在 F1 定向核对 facade :1–80 与 renderer 返回。若仍回 legacy则同样受覆盖；若能成功返回工厂页，则必须让同一共享顶栏/开关出现在该路径并走同一消息链，不允许用户 opt-in 后按钮消失。只允许必要共享顶栏补齐，不重写八段工厂页；超出此最小范围交 GPT 更新计划。

## 4. 低流量量化行为表（调度设计值，不是实测节省率）

除另述外，只有 lowTraffic=true 且有效运行态才执行右列；正常模式源码分支和配置优先级保持原样。

| 通信/触发点（证据路径、符号、基线行） | 原行为 | 低流量行为 | 不可牺牲项 |
|---|---|---|---|
| extension/legacy.ts:1361 queueTimer → :14951+ tickDistributedQueueCore | 500ms tick；有 plans/实时协议才发网 | 5000ms 周期；无 plans 保留早退。提交/停止/明确终态触发一次本轮即时协调，不等下个周期 | 队列本地意图、取消围栏和服务器协议2独立调度不变 |
| :1364–1368 progressTimer → :2726 refreshServerPlanProgress | 2000ms及原早退 | B：仅未终态任务/未完成同步收集义务的必要主动确认10000ms；纯展示分支A自动请求0 | 与5s库存读同语义部分单飞，必要manifest/日志不省；不得以面板隐藏阻断终态确认 |
| ui/PanelHtml.legacy.ts:1959、2649–2654 tmux list/capture | 5000ms，可见性门控及原进入视图行为 | A：自动0；进入/切Worker/选窗口/焦点/恢复可见均不发请求，仅点对应刷新按钮读取一轮 | C手动刷新及B关闭后精确窗口核实不延迟；不能顺带刷新所有窗口截屏 |
| tunnel/RealtimeTunnelClient.legacy.ts:34–52、:550 快照回退 | WS→SSE→poll；poll=5s及原首次/可见刷新 | A：自动snapshot=0，展示WS/SSE订阅关闭且不回退poll；进入/焦点/恢复/握手均不拉一次。C手动快照单次请求 | B不依赖展示snapshot/stream，走精确任务/操作查询；不把断开展示通道标成任务离线或全局paused |
| :39 heartbeat、:41–42 GPU合并/UI投递 | 5s / 500ms / 100ms 默认字段 | A展示stream关闭，其心跳/自动GPU事件为0；本地合并值保留但不驱动远程请求 | B错误/终态由主动查询回传，不依赖该流；不改服务端发布速率/协议 |
| :46 logTailIntervalSeconds=1、默认 logTail 关闭；TunnelClient live-output/since | 默认关；用户原有显式实时尾读行为保留 | A：包括之前显式开启的展示尾读也暂停；点“刷新日志”才按选中run/since单轮读取，不自动续订/下一轮 | B终态日志异常核实不暂停；C完整日志/错误详情原样可用，切回正常恢复原选择而非默认打开 |
| legacy.ts:14217、14969 queuePlanArtifactSyncStatusCheck | 每tick检查，pending去抖，完成后force | 保留 pending 去抖；依附5s协调及真实完成后force；相同在途状态请求合并，不额外插入全量轮询 | 每个job完成后同步不延迟到人工触发 |
| legacy.ts:14963 testTunnel / distributedNextProbeAt | 30s冷却；:874 激活版本校验一次 | 均保留；同在途 probe 可共享，不能以低频跳过正式就绪/版本检查 | 来源哈希/版本/所有启用Worker和动态端点完整 |
| PlanCleanupPanel.ts:203、legacy.ts:17681–17709 pending探针 | 1500ms清理；1–5s后台/0.5–3s前台退避 | 原样保留（仅活动操作）。不把pending轮询改成30s | 操作实际结束/失败推进及时，未知不无限busy |
| legacy.ts:9407–9415 同步验证 | 800ms，30s硬超时 | 原样保留 | 正式校验完整，不改超时求绿 |
| legacy.ts:1168、24600+、27251 本地heartbeat/看门狗/投递 | 本机IPC/观测 | 不改 | 本机UI流量不能冒充服务器节省 |
| updates/Bootstrap.ts:167 / ReleaseClient ETag | 30分钟 | 不改 | GitHub更新不属于本次服务器计费控制 |
| clusterSchedulerRuntime.legacy.ts:54–55 availability | 10s窗口/5s超时 | 不改 | 不改变服务端派发/就绪语义或新增远端升级要求 |
| legacy.ts:10053/10088/10804、22199/22416/22517、ResultCollectionHost.ts:154–167 | 事件驱动范围同步/结果收集 | 保留原语义，只复用已有单飞/当前任务增量，避免相同在途请求重复 | 不减少范围、不默认改metricsOnly、不取消结果下载 |

周期触发频率的r2设计变化为 B queue 2Hz→0.2Hz、B必要终态确认0.5Hz→0.1Hz；A tmux、快照、展示日志和展示push自动刷新均为0。纯展示进度无独立自动请求。C手动/生命周期必要通信不计入此零值；不是总请求数或字节节省比例。展示请求仍可由用户逐次发起，产物同步可能主导字节。

### 4.1 调度、单飞和隐藏语义细则

- 复用 SharedReadCoalescer（src/core/SharedReadCoalescer.ts:9）和 HttpTunnelClient subscribeRead（TunnelClient.legacy.ts:338–351）、snapshotInFlight。单飞键包含 Worker、规范项目、generation、purpose、用户/自动标记、apiPath、POST体；不同声明/commandId/查询模式不共用。
- progressRefreshRequests（legacy.ts:2619）与 readWorkerTaskSnapshotBatch :2656、refreshWorkerTaskSnapshot :2761 是合并落点。executionOnly 只共享轻量库存部分，不以它直接确认完整产物；完整查询保留 excludeVerifiedCompleted，避免为每个已确认完成 job 再读 manifest/日志。
- 不新增跨轮缓存作为任务完成/停止/删除事实。resultCatalogTtlMs=5000 保留；缓存和 since 仅缩减重复展示或增量日志，主动操作要求新鲜证据仍主动查。REALTIME_UI_HASH/合并UI帧仅省本机IPC，不计作省公网。
- 切换策略不调用 resetClient() 重置运行状态。RealtimeTunnelClient 增加最小 updateRefreshPolicy（新符号），低流量停止展示订阅、pollTimer和展示reconnectTimer，保留lastSeq、snapshot及任务/操作状态；正常模式入口不变，关闭低流量时受D1约束恢复先前stream偏好和原5s快照回退。必须显式displayAutoRefresh布尔守卫connect:100–152（含初始snapshot）、setHidden:414–427、scheduleSnapshotFallbackPoll:550+及恢复回调；不能只设置snapshotSeconds=0（旧Math.max(5, ... || 5)会重新变5s）。不重建整个客户端，不以disconnect("paused")伪造用户全局暂停。
- 低流量下无论隐藏或可见，A展示型tmux/snapshot/log/stream均停止自动请求；B后台queue 5s、必要终态确认10s、pending与完成后同步继续。B确认不能沿用展示progress的view.visible早退，需拆分必要协调入口；正常模式原可见性早退不变。不能仅依赖budget.hidden。
- 低流量进入视图/面板重新获得焦点/从隐藏恢复/重载/握手/切换选择，均不允许自动拉取A数据，哪怕一次；只读本地已有快照，显示上次成功刷新时间或“尚未手动刷新”。本地握手/渲染仍立即执行；B只按已有活动任务/意图推进，不借可见性事件刷新展示。正常模式原进入/恢复行为不改。
- 用户动作和必要状态推进不受上述展示周期限制；同类自动请求在途时只等共享结果或安排一轮后续，不积压每个错过的 timer tick、不补发历史轮次。
- push可作为加速刷新提示，不能作为唯一完成事实或替代协议2主动查询。事件丢失由低频主动协调补偿，Scheduler/任务不依赖VS Code窗口存活。

## 5. 完整性不可回退规则

1. **job完成与自动同步**：每个job依据新鲜远端退出码0、产物manifest完整、日志无异常确认；精确绑定Worker/项目/commandId/任务索引/声明路径，既有完成事实跨重载不被TTL/断线降级。完成后仍将“该job最新产物∩当前勾选范围”同步至全部已启用Worker，默认整个work_dirs/兼容work_dir；tmp/result合法。不得延迟为手动、取消镜像或偷偷缩范围。合并不能跨job丢掉同步义务。
2. **结果收集**：保留全部原请求的下载/目录/结果汇总能力。memoryOnly/metricsOnly 仅在原调用语义本来如此或用户主动选择时用，不为低流量改变结果完整性；不把原始指标同步到本机磁盘。用户主动收集立即执行，自动收集照既有job事件触发，重复在途合并。
3. **主动操作**：提交、停止、同步、清理、文件操作、手动刷新即时受理，原pending/回执/错误链保留。展示自动读取仅手动、必要后台协调降频，不延迟取消围栏、精确tmux窗口停止和停止后主动确认。完成/停止/删除确认依主动查询，不以接收回执当成功。
4. **必要校验**：自动同步、静态入口命令探针、所有启用Worker就绪、正式输出目录创建、独占服务锁、UID/项目/Worker/socket/容器/状态锁、代码来源哈希和实际运行版本全部保留。健康和版本别名放行，不要求科研Conda和Agent解释器相同；不自动导入torch、安装科研依赖或运行科研结果校验。
5. **真实反馈**：真实异常原样回传；未查询显示未检查/未知和lastCheckedAt，不沿用旧成功时间假装新鲜。手动模式/断线不假成功、不静默降级或回退固定地址，不自动重跑/重复派发。
6. **删除/清理**：低流量不能改变精确路径两次确认、固定类型/指纹、链接/越界检查、安全根、直接父目录规范路径与成功cd、物理pwd和 ./直接子项保护。保留 confirmed_paths 规则及查询失败可重查但不盲重发破坏性操作；不新增PID/句柄扫描或历史队列阻断。
7. **按需替代**：低流量展示仅显式手动刷新，日志用since增量、同在途读合并；关闭低流量恢复原WS/SSE及since行为。保留B有限周期主动协调，事件驱动只加速不替代真值核实。进入/恢复可见不再作为低流量展示刷新授权。

## 6. TODO 分块与验证矩阵

当前候选状态以文末承接记录为准。下表“已完成”描述此前已验候选；§20 及本次增量尚未完成 build/package，不继承为当前候选通过。

实施由主控续接原任务的实现负责人，GPT medium 对方向/最终候选负责；本规划代理不派发实现者、不在本轮跑测试。下表顺序整合，单个功能块稳定后再验证，避免多写入者同时改 legacy.ts。

| 块/状态 | 依赖与读范围 | 预计写范围（均为后续实施） | 检查命令/断言与预期 |
|---|---|---|---|
| F0 已完成：最小接口复核 | 本文§7必须查清项；keys/API/constructor/client/工厂返回 | 必要事实增量记原任务证据（由原负责人） | 只读引用追踪/测试夹具闭包；确认策略消费者可达、工厂路径结论、手动请求标记不混用 |
| F1 已完成：本地开关闭环（r2 复核：按钮/消息链/持久化/回执不变） | F0；证据§7 E01–E13 | PanelHtml.legacy.ts、extension/legacy.ts；必要时最小共享factory顶栏 | T1–T5、T7；首次默认关，点击开/关，aria/禁用/错误/重复请求正确，握手/隐藏销毁/降级恢复一致，不占lease |
| F2 已完成：统一策略和定时器（r2 定稿 A 类 displayAutoRefresh=false、tmuxMs/snapshotFallback=0，B 类 5/10s） | F1；§8 E14、queue/progress/client | extension/legacy.ts、RealtimeTunnelClient.legacy.ts；扩展既有适用测试 | T4、T6、T8；正常模式原值/原轨迹，低流量B为5/10s、A自动0且手动单轮；热切换无重复timer，旧代际不发包，manual_only/暂停不被恢复 |
| F3 已完成：读合并与功能保真（displayReadOnce 单飞，B 类隐藏窗口仍运行） | F2；§4同步/结果点、§8.4 | 优先只改extension读调度；只有已证必要才改共享coalescer/client | T6、T8及受影响域；相同读单飞、不同身份不合并，完成后同步/结果/错误/pending即时不丢，隐藏仍有必要协调 |
| F4 已完成：最终候选回归（受影响单文件全部真实 exit=0，见证据§11） | F1–F3稳定；scripts/test-workflow.json真实清单 | 既有测试文件最小新增断言；不降断言/改超时 | T1–T9；串行单文件覆盖，真实受影响域完整；全部真实exit0，无超时/未知 |
| F5 已完成：版本 0.5.422 + package 门禁 overall=passed，VSIX 身份与 SHA256 见证据§11 | F4通过；§8 | package.json、package-lock.json、src/runtime/RuntimeManifest.ts及既有生成runtime；必要版本模板位 | build + vm双门禁、package；版本全为0.5.422，同一VSIX及SHA；GPT审最终diff/日志，非“计划已审”等于候选已审 |
| F6 进行中：PR 由本轮提交；Release 发布、本机安装、重载验收由主控确认后执行 | F5审核通过 | 任务分支提交、既有Release、本机安装；仅快进干净基准 | §8门禁；PR合并证据、Latest真实可见/指纹一致、本机只装一次、用户重载后按钮和功能验证，主控确认最终完成 |

### 6.1 本轮规定测试命令（已逐个单文件串行执行，结果见证据 §14.4；两条失败分流的取证见证据 §15）

在上述唯一副本 cwd 执行。T1–T9 是正确性/安全检查，不是性能测试。先执行不依赖dist的目标单文件；依赖dist的用例在必要build后运行。不使用裸 npm test，不用通配符一次启动全仓，也不存在 test:ui。

统一单文件形状：
    node --test --test-force-exit --test-timeout 20000 <单个文件>

| 编号 | 单文件/命令（上式逐个替换） | 必需验证内容 |
|---|---|---|
| T1 | test/features/panelWebviewScriptHealth.test.js | 真实渲染含唯一按钮、位置、脚本可解析；build域已含，不重复无变化执行 |
| T2 | test/ui/panelInlineScriptSyntax.test.js | 抽取实际输出内联script逐个new vm.Script，不能只解析外层模块 |
| T3 | test/ui/webviewButtonsHandled.test.js、test/ui/webviewActionAllowlist.test.js（分别单跑） | data-command宿主可达/白名单、不引入任意shell/URL API |
| T4 | test/features/panelMessageDispatch.test.js | 扩展本地setter/请求代际/专用回执/失败、暂停组合、旧正常分支 |
| T5 | test/ui/actionButtonsCapability.test.js、test/ui/panelTransientStorage.test.js（分别单跑） | 不因远端能力阻塞本地按钮；存储不可用不破握手、权威不来自Webview |
| T6 | test/tunnel/requestBudget.test.js | 既有暂停/隐藏/并发/紧急操作保护不变，配额仍禁用；不在此复活限频 |
| T7 | npm run build；随后下面独立vm命令 | tsc/生成runtime及node-c门禁全部exit0；实际内联script另由T1/T2核查 |
| T8 | 从既有 test:plan-run、test:preflight-stages、test:latest-artifacts、test:submission-truth、test:tmux-lifecycle、test:multi-tunnel 选择真实受影响单文件 | 协议2主动归并、完成同步、结果收集、停止、端点与tmux、低频假时钟断言；F0展开清单绑定确切文件，不把未知覆盖当已通过 |
| T9 | test/factories_integration.test.js、test/factories_tunnel.test.js（分别单跑）及下面端点检索 | src业务无10890，动态配置端点不回退固定探测 |

T7 第二门禁原样命令：
    node -e "new (require('vm').Script)(require('fs').readFileSync('dist/ui/PanelHtml.js','utf8'))"

该vm命令解析模块本身，不单独证明模板展开后内联script健康，故T1/T2不可省。PanelHtml外层模板新增内层script禁止裸单反斜杠转义，必须双写反斜杠或String.fromCharCode(10)；改前定向搜正则/字符串，审diff所有新转义。PanelHtml.ts是门面，实际检查对象包含legacy渲染输出。

端点P0静态检查（pwsh 7，未来执行）：
    Get-ChildItem -LiteralPath src,dist -Recurse -File | Select-String -Pattern "10890"
预期业务零命中；另定向搜固定“127.0.0.1:18765”并人工核对仅兼容默认而非探测回退。测试至少用两套非默认host/port配置，经localBaseUrl(config)和端点注册表正确到达；隧道健康/版本/worker_telemetry别名检查保留。

T8复用 evidence §10.2/10.5 与 scripts/test-workflow.js 对应域清单，不直接并发运行域。首次需由原负责人展开sourceScript及pre/post钩子，按真实文件身份去重后逐文件串行，保留全部受影响/关键/未知项；未入manifest的T2/T3/T5必须显式运行。如组脚本会并行或额外跑全仓，不直接执行该组，消费其中对应单文件。没有授权退役任何用例。

新增断言优先加既有seam：readSource门面→legacy映射、legacyMethod AST抽取、VM假时钟和假的HTTP/插件传输。假时钟验证B的5/10秒调度、A自动请求0/手动单轮及切回原节奏的真实调用数属于确定性逻辑测试，不测吞吐/费用、不加性能阈值。新增helper/import进入抽取函数闭包时同步补原夹具，不靠源码行号/字符窗口自证。确无适用归属才增单个集成测试文件，并说明隔离需要。

同一时间只一个node/python测试进程，不并行工具跑测试；20秒未退出立即停止、不重试，不改生产逻辑“修测试”。Python只抽函数及必要import，不exec完整Agent/Scheduler，不进入wait_for_plan_queue睡眠；spawnSync timeout<=10000、windowsHide:true、断言status===0。不用python -c长脚本。本功能原则不新增Python测试进程。

每命令保存完整stdout/stderr、真实退出码、cwd/argv、冻结输入身份、适用清单；失败/超时/取消/未知均阻断。复用现有执行器和准备，不每命令造脚本。所有未执行项目标not-run。

### 6.2 明确的功能验收场景（重载后现场与可重复夹具互补）

- 缺键/关闭：所有旧timer、早退、pause/手动配置保持，原功能不变；无为新开关发起的远程请求。
- 开启/关闭/快速重复/写入失败/回执延迟：状态与权威一致；存储失败不假成功；不占lease，不重复timer。
- 重载/隐藏销毁/重新显示/状态降级/握手重试：同一偏好恢复；暂停下不自行联网；低流量显示/焦点/选择/握手均无A拉取，缓存/未刷新提示可见。
- 正常模式WS/SSE/poll及重连原样；低流量无展示stream/回退poll/重连，B独立确认及错误照常。关闭低流量恢复since与原5s回退，无重复timer/补发历史轮次。
- 多Worker不同端点；提交/停止/用户刷新/精确清理查询/文件操作pending：即时反馈和推进不受展示仅手动策略影响。
- 单job及多个已存在job的完成事实：轻量库存后仍主动核manifest/日志、同步当前选择范围至全部启用Worker、结果收集完整、已确认完成不反复重读；不扩大为性能规模测试。
- 工厂opt-in路径按F0实际返回结论验证；多窗口限制在tooltip可见，不声称热广播。
- 未获训练服务器写入授权的场景只用现有夹具/API授权环境验证；现场未做明确写未验，不捏造成功。

## 7. 未知项逐一处置（不留笼统待定）

“本轮必须查清”指下一实施轮F0/F2在改相应功能前由原实现负责人查清；本规划轮不执行测试。规划已能决定的项不再反复调查。

| 未知 | 判定与负责人/办法 |
|---|---|
| 轮询是否跨计费公网、Scheduler↔Worker availability是否跨计费 | 不影响本计划，明确排除计费拓扑识别/服务端降频。无需用户答复才开发；主控可后续问拓扑用于收益解释，不作为交付门槛 |
| 典型Worker/job/GPU数、并发和可接受等待 | 不影响本计划，明确排除规模/性能门槛。后续由主控先问用户再决定性能实验；当前功能测试用最小充分夹具 |
| 真实WS/SSE push与poll占比 | 不影响本计划，明确排除收益归因实测；正常模式三条回退路径、低流量全部展示通道关闭及B独立推进均作正确性覆盖，不能称push一定最省 |
| 隐藏时500ms tick是否被budget挡住 | 本轮必须查清实际调用链。已读legacy.ts:5169–5191 setHidden及RequestBudget.ts:389–400，job_dispatch/job_reconcile豁免hidden，故不能依赖预算。F2原实现者用隐藏视图+假的HTTP执行queue路径、断言5秒必要协调仍有/展示查询无，查purpose/visibleBypass；正常分支保持原状 |
| 每类响应平均/峰值字节 | 不影响本计划，明确排除抓包、字节/费用测量与目标比例；保留定性大响应判断，不写实测结论 |
| pushLocalWorkerAvailability是否死代码 | 不影响本计划，明确排除启用/删除/优化此路径。legacy.ts:25283–25285裸return使后续体不可达；F0原负责人只追踪6277/6313/25267/25446调用，确认没有本任务新增调用即可，不以其“节流”计收益，也不把这条函数代表所有availability通信 |
| requestBudgetConfigFromTunnel归零历史 | 本规划已查清，D3保留保护，git show日志已列；不再让实现者为了低流量复活配额 |
| API_INTERNAL_COMMANDS成员 | 本规划已读取legacy.ts:636–638，按§3加入；不再待定 |
| panelProjection/降级是否裁字段 | 本规划已读buildState:26287+及两级降级；F1必须按§3显式保留，T1/T4覆盖fallback/minimal，不假设Record自动保留 |
| 多窗口广播 | 本版不实现跨进程即时广播，明确范围和限制；F1文案/重载恢复覆盖，不引入额外网络或IPC轮询 |
| FEATURE_FACTORY_PANEL真实返回 | F0必须查清：原实现者定向读PanelHtml.ts及renderer门控；分别渲染默认/opt-in，确认最终选择及按钮。可达工厂页缺顶栏按§3.4最小补齐，超范围交GPT，不无声忽略 |

**未获用户确认，不列为必做项或交付门槛**：任何流量字节数/费用的量化实测、性能测试规模、压测、并发吞吐、耗时阈值或“节省X%”目标。须先确认实际人数、worker数、job数/并发和可接受等待，再由主控决定是否另立实验。确定性调度正确性断言不等于流量实测。不能据此降低既有安全/正确性覆盖。

## 8. 版本、PR和完整交付门禁（后续阶段）

1. 目标补丁版本 **0.5.422**（基线0.5.421+1）。F4通过后同步package.json.version、package-lock.json顶层version及packages[""].version、src/runtime/RuntimeManifest.ts的CURRENT_RUNTIME_VERSION。检查现有runtime模板版本位，不保留不一致源码常量。
2. 复用scripts/write-agent-runtime.js:7–31单源version机制及:46+生成链：Agent/Scheduler的AGENT_VERSION/RUNTIME_VERSION/PLUGIN_VERSION/SCHEDULER_VERSION、dist/runtime/*.py、manifest/指纹均应由既有生成器统一到0.5.422。不要手改dist伪装一致；生成后如源码被自动纠正需把真实diff纳入审核与输入冻结。不因版本升级自动写远端Agent。
3. 最终候选执行npm run build、§6的vm.Script双门禁及规定测试，随后npm run package（仅构建/生成VSIX，不安装/上传）。若package复用已验证输出不得人为强制全量重编；版本输入改变后必需重新生成/核对身份，未变测试按技能有效证据复用。
4. GPT medium审核最终实际源码diff、测试真实日志、正常分支无变化、包的版本/平台/运行闭包及秘密排除。根据已有docs/release-delivery.md与打包器门禁，执行既有verify:package-runtime和现有VSIX身份检查入口；确切参数由原负责人读取脚本帮助/文档获取，不猜接口。本次用户已明确完整发行，这些既有发行检查不是新增独立包后审计。不得另加不相关归档审计/冒烟。
5. 只在任务分支按范围提交/普通push，建立PR并以已审候选整合；不直接写脏主线。PR通过后按既有授权合并；fetch核对合并提交已包含在origin/master，记录PR/合并SHA。若合并产生实际新差异，按影响补审/验证，不把旧候选证据套上新提交。主线基准同步放到末尾，仅干净且获批准者快进；保护其他活动副本/冻结祖先。
6. 从既有更新客户端与origin核对发行源zlinkw/SimpleExperiment，发布绑定已验证master提交的稳定Release。Release非draft、非prerelease，tag和资产不覆盖；已有同版同提交同指纹可幂等跳过，否则立即阻断。远端更高版时不降级Latest，版本占用交主控调整计划。
7. 资产必须是此次最终VSIX和绑定精确文件名的逐包.vsix.sha256；记录实际文件名/大小/SHA256。发布/安装复用完全相同字节。重新读真实公开/releases/latest，核对repo/tag/绑定提交/资产/大小/SHA，并经实际更新解析逻辑证明旧Windows版本看到适配更新，不能用mock JSON替代。相关必要隔离读取按既有发行规范执行，不覆盖历史资产。
8. 本功能原则不改SimpleSFTP协议/依赖；现有一致发布包可复用。若真实实现要求新配套版本，必须先证明它在自己更新源可取得，未经证据不得为凑批次升级或降级。
9. 全部修改/打包审核结束、发行就绪后显式一次npm run install:latest。同版跳过、不降级、不默认--force，每目标版本最多安装一次。立即核对VS Code已安装版本和simpleex入口，然后停止操作当前面板；磁盘/运行版本不符应显示“需要重载窗口”。
10. 用户执行Developer: Reload Window后，才按§6.2做真实UI验收，不在旧Extension Host上假验收。尚未重载明确标“待重载/待UI验收”。最后主控核对源码、发行URL/资产指纹、安装/重载、远端Agent未自动更新、主线快进真实状态后确认交付。
11. 网络/权限/Latest不可见/配套包/校验失败：如实写“源码已推送，远端发行未完成”及具体阻断；四个状态分开，不将源码push/本机VSIX/安装替代远端发行，不偷换更新源。

## 9. 主要风险及本轮记录

最大风险：只改快照或预算字段会留下500ms/2s高频路径，或把必要任务协调误当展示流量暂停。本计划要求同源策略覆盖四处周期、主动动作例外、假时钟与实际调用链正确性断言，并用正常分支对照阻断回归。

第二风险：为了减少下载而把结果收集改成metricsOnly、延后job完成同步，违反功能完整要求；本版明确不做。第三风险：产物同步及B/C必要通信可能占主要字节，展示自动请求置零仍不能保证总流量大幅下降。多窗口立即一致未实现，必须明示；后续如用户要求再单独设计。

本轮实际仅只读AGENTS/技能/主证据/定向源码/历史提交并写此计划；无实现、无编译、无测试、无打包、无安装、无Git写入。git log与git show两条只读命令exit0，历史日志引用见D3；其余验证全部not-run。实施与整轮交付尚未开始，不能将本文当作最终候选通过报告。

## 10. r2 增补：展示型信息仅手动刷新

### 10.1 需求与本块变更索引

用户增补原文（一字未改）：

> 优化方案，那些只用来展示给用户的信息可以改为在低流量模式下仅手动刷新

r2只调整本次受影响部分：修订头/状态，D1策略描述，D2派生字段与timer处理，§3.1提示文案，§4中的进度/tmux/snapshot/stream/log及频率摘要，§4.1展示生命周期与正确性拆分，§5.7按需规则，F2/T8假时钟及§6.2相关场景，§7回退覆盖描述；新增本§10分类、交互、执行TODO和断言。其余r1条款原文保留，包括持久化/命令链、D3配额保护、功能保真、P0、测试超时/串行、性能确认、版本和发行门禁。

默认仍是正常模式、默认零行为差异硬要求不变。§10是r2补充细化，不授权把A=0扩成全部网络暂停。下表按“调用目的+触发来源”分类，而不是只看endpoint：同一个URL用于展示是A，用于任务证据是B，用户显式点击是C。共享URL不得用purpose=snapshot或路径级黑名单一刀切；每个发起入口必须带明确origin（display-auto / correctness / user），宿主推导而非信任前端任意指定。用户点击低流量开关本身不是刷新授权。

计数口径：去重后的可实施规则条目 **A 7项、B 27项、C 6项**。证据§4的18个通信点和S1–S3、§5全部常量逐项映射在下表；同一证据条目如同时包含自动和用户调用须拆目的，故不是原表行数相加。常量别名/同一机制合并在一项，表中明确列出所有名字。路径无src前缀者均在src下；行号绑定冻结基线，不用实施中的新行号覆盖证据。

### 10.2 分类与完整行为对照表：A（7项）

A定义：只获取展示信息，低流量关闭所有自动远端刷新，包括timer、订阅、事件触发的补拉、首次拉取、恢复/重连补拉。B已合法取得的数据可用于更新任务卡和错误提示，不为填充展示额外发请求；不能称这种附带信息是“手动刷新成功”。

| ID/证据映射 | endpoint / 定时器 / 常量及基线位置 | 正常模式 | 低流量模式 |
|---|---|---|---|
| A01 §4#3；§5 snapshotFallbackIntervalSeconds | GET /api/snapshot；tunnel/RealtimeTunnelClient.legacy.ts:40、100–152、550+ pollTimer/scheduleSnapshotFallbackPoll | 原5s回退、原首次/恢复读取 | 自动0；不建立pollTimer，不调用connect内的初始snapshot；仅C05手动单轮快照 |
| A02 §4#6；§5 TMUX_POLL_MS | ui/PanelHtml.legacy.ts:1959、2649–2654 refreshTmuxList/Capture；宿主tmux RPC（证据未给固定URL，不新增URL） | 原5s及可见性/选择触发 | 自动列表/截屏0；当前列表和选中window截屏各由对应按钮刷新，不能后台遍历窗口 |
| A03 §5 logTailIntervalSeconds、logTailMode/maxConcurrentLogTails | GET /api/live-output?runKey=&since=；RealtimeTunnelClient.legacy.ts:46；WorkerTelemetryApi.ts:165–166（selected_run_only、并发1） | 默认关；原用户显式开启的1s尾读语义不变 | 展示尾读timer/订阅自动0，即使切换前已打开；C05点一次取一次增量，保留since；B终态异常检查不在此停用 |
| A04 §4#4、#17展示通道；§5 heartbeatIntervalSeconds/gpuEventCoalesceMs/uiBatchMs及stream重连 | /api/events?since、/api/events/sse?since；RealtimeTunnelClient.legacy.ts:39–42、48–49、472/501；workerReconnect见B27 | 原WS/SSE、5s心跳、500ms GPU合并、100ms本地投递、3/60s重连 | 展示连接关闭，自动心跳/GPU推送及重连0；合并/投递常量不修改但无自动输入；手动刷新不建立永久stream。错误由B查询保真 |
| A05 §4#1中非dispatch用途GPU展示、§5 GPU合并关联 | GET /api/gpu、/api/gpu/history；tunnel/TunnelClient.legacy.ts:200–217；不同于/api/gpu?dispatch的B01 | 原GPU即时/历史展示刷新及进入行为 | 自动0；C05只拉当前GPU区需要的数据，历史范围沿用用户选择；B01调度获取GPU不受此限制 |
| A06 §4 S2中纯结果浏览、§5 resultCatalogTtlMs展示使用 | GET /api/results/summary；legacy.ts:1148、22199/22416/22517；ResultCollectionHost.ts:154–167 | 原展示目录/结果刷新，5s缓存语义 | 无任务完成/收集义务时，自动展示summary/目录/下载0；C04/C05显式刷新按原选择读取；B14自动完成收集不省 |
| A07 §4控制点关联诊断（§6 endpoint补充，避免漏掉展示入口） | GET /api/diagnostics、/api/worker/tasks/diagnostics；TunnelClient.legacy.ts:113–120、338–351 | 原主动/自动展示行为 | 自动展示0；C05“刷新诊断”一轮。B失败定位所需原始错误正文/任务异常核查不屏蔽 |

### 10.3 分类与完整行为对照表：B（27项，每项写明停止后具体损坏）

B只允许为明确任务/操作/宿主协议维持正确性，不能借“健康”“错误”名义恢复所有展示推送。B发起结果可以显示，但必须附证据采样时间与“任务推进附带更新”；A区的“上次手动刷新”时间不因此改写。无活动任务/意图/义务时，B01/B02/B07/B14/B15不得扫描全部历史任务刷卡片。

| ID/证据映射 | endpoint / 定时器 / 常量及基线位置 | 正常模式 | 低流量模式；停止会导致的具体失效 |
|---|---|---|---|
| B01 §4#1；§5 queueTimer | POST /api/worker/tasks/query executionOnly、GET /api/gpu?dispatch；legacy.ts:1361、14951+ | 原500ms及早退 | 5s；提交/停止意图即时触发协调，不等周期。若只手动，本机待派任务不能自动推进、取消围栏可能迟于晚到启动；只查当前队列必要Worker |
| B02 §4#2；§5 progressTimer | /api/worker/tasks/query必要完整查询/manifest/日志；legacy.ts:1364–1368、2726、2761 | 原2s和原可见性条件 | 10s必要确认，与B01相同语义读单飞；隐藏也能确认。若只手动，远端结束永远不变本机确认完成，完成后的同步/结果收集不会触发。纯进度展示分支归A而非全量10s刷卡 |
| B03 §4#5；§5 probeWatch | legacy.ts:15012，本地50ms看门狗 | 保留 | 保留、无网络。停用会使卡住tick不能detach，后续队列轮次被堵 |
| B04 §4#7；§5 PlanCleanup轮询 | PlanCleanupPanel.ts:203 postMessage poll→operation状态 | 活动时1500ms | 保留。停用会使已确认清理永久executing/无法识别未知执行器，诱发重复删除；非活动不轮询 |
| B05 §4#8；§5 operationStatusProbeDelayMs | legacy.ts:17681–17692 refreshOperationStatus | min(5000,1000*attempt) | 保留。停用会使已派停止/文件操作等pending不能退出、无法确认远端结果 |
| B06 §4#11；§5 distributedNextProbeAt | health/version；legacy.ts:14634区域、14963 testTunnel | 原30s冷却 | 原30s及必要就绪探测，不扩成全量snapshot。停用会使未建立可用隧道的队列无法恢复/误用旧就绪证据 |
| B07 §4#12 | legacy.ts:14217/14969 queuePlanArtifactSyncStatusCheck，Worker状态查询 | 每tick去抖/完成后force | 随5s必要协调，完成后force及在途单飞保留。停用会使已完成同步无法确认，后续阶段/缺镜像补齐无法推进 |
| B08 §4#13；§5 panelHostEventLoopTimer | legacy.ts:24600–24606，本地10s | 保留 | 保留、无网络。停用会失去既有面板卡顿/超时定位证据，不是省服务器流量 |
| B09 §4#14；§5 panelHeartbeatIntervalMs | legacy.ts:1168、27251，本机IPC 30s | 保留 | 保留。停用会破坏面板存活/恢复判断，按钮可能永久等待握手 |
| B10 §4#15；§5 updates Bootstrap check | updates/Bootstrap.ts:167，GitHub /releases/latest，ETag，1800000ms | 保留 | 保留、非用户服务器流量。停用会改变既有更新源发现/版本提示契约；不借本次模式改发行更新生命周期 |
| B11 §4#16 | legacy.ts:874 remoteVersionCheckTimer→checkRemoteAgentVersionAndNotify；health/version别名 | 激活一次 | 保留，不以显示用途跳过。停用会把过期Agent运行协议当可用，破坏实际版本核验 |
| B12 §4#18；§5 WORKER_AVAILABILITY_REFRESH_WINDOW_SECONDS/TIMEOUT_SECONDS | clusterSchedulerRuntime.legacy.ts:55/54，/api/worker/availability | 10s窗口/5s超时 | 保留。停用会让服务端Scheduler按陈旧资源派发，违反所有启用Worker就绪规则；不改远端协议 |
| B13 §4 S1派发/自动同步部分；§4#10自动同步验证部分 | legacy.ts:10053/10088 runSyncScopeTreeBatch、10804 runSyncScopeBatch；9407–9415 _verifyTimeoutMs=30000/_verifyIntervalMs=800，code-sync inspect/plan-scope | 原范围同步和校验 | 保留。停用会在代码未同步/来源未经核实的Worker上启动；不能省整work_dirs、静态入口探针、正式目录 |
| B14 §4 S2自动完成结果收集部分 | legacy.ts:22199/22416/22517、ResultCollectionHost.ts:154–167 sync.downloadMappedPaths | job完成事件原收集 | 保留。停用会缺结果/汇总或迟至用户手动才出现，功能不完整；不偷改metricsOnly/memoryOnly |
| B15 §4 S3 | legacy.ts:14963附近completed job mirror→server-to-server fpsync | 完成且缺镜像时触发 | 保留。停用会使其他已启用Worker缺少该job声明产物，下一任务输入/恢复失败 |
| B16 §5 staleWorkerTelemetrySeconds | WorkerTelemetryApi.ts:169，180s | 原过期判定 | 保留本地时间判定，不为消除stale而发A请求。停用会把手动保留的旧遥测当新鲜就绪；B就绪需主动证据 |
| B17 §5 statePostMinimumIntervalMs/statePostBatchMs/statePostDeliveryTimeoutMs | legacy.ts:1153/1152/1120，1000/100/7000ms，本地IPC背压 | 保留 | 保留。停用会丢失/阻塞命令回执和状态ACK，手动刷新一直pending；timer不得夹带A请求 |
| B18 §5 resultCatalogTtlMs缓存基础设施 | legacy.ts:1148，5000ms | 原缓存规则 | 保留缓存有效期判定，不由TTL到期触发A请求。停用/延长到永不过期会使用户手动刷新仍拿旧目录或越过当前声明；必要新鲜读取按原契约 |
| B19 §5 localPlanMetadataRefreshMinIntervalMs/draftPlansRefreshMinIntervalMs/xshellLibraryRefreshMinIntervalMs | legacy.ts:1272/1277/1284，5000/5000/15000ms，本地文件元数据 | 保留 | 保留纯本地工作区/草稿/配置变更发现，不新增远程探测。停用会使提交选到已修改旧PLAN/已撤配置；本地更新不冒充远端刷新 |
| B20 §5 XSHELL_BATCH_LAUNCH_DELAY_MS | legacy.ts:547，本地1500ms批量启动间隔 | 保留 | 保留。停用/置零会改变既有启动排序和批量就绪流程，不属于展示刷新 |
| B21 §5 RUN_OPERATION_RECONCILE_GRACE_MS | legacy.ts:28179，90000ms | 保留 | 保留。停用/改值会使刚派任务过早被判协调失败或长期悬挂 |
| B22 §5 availabilityPushMinIntervalMs | legacy.ts:25277–25279，max(5000,localAvailabilityPushSeconds*1000或10000)；25283–25285裸return | 保持原不可达/禁用形态 | 不启用、不计节省；若其他可达availability路径参与就绪，按B12核实。删/启用这条死路径会引入非本次授权的资源发布行为，不能为了省流量重写它 |
| B23 §5 scheduler.operationEventMaxDelayMs/workerActionMinIntervalMs | legacy.ts:25238/25239，默认200(100..10000)/500(200..60000)ms | 保留 | 保留。停用/改配置会影响操作事件兑现、Worker动作协调顺序，不是卡片刷新timer |
| B24 §5 DEFAULT_SSE_TIMEOUT_MS | api/LocalApiServer.legacy.ts:12，本机loopback SSE 30000ms | 保留 | 保留、非跨服务器展示stream。停用会改变CLI/API本地等待终态和超时反馈 |
| B25 §5 HOST_OPERATION_LEASE_HEARTBEAT_MS/TTL_MS | core/HostOperationLease.legacy.ts:10–11，本地5000/30000ms | 保留 | 保留。停心跳会使仍执行操作租约过期/并发互斥失效；本地开关不占此lease |
| B26 §5 LEASE_POLL_BASE/MAX_MS | core/ResourceOperationLease.ts:16–17，本地20/250ms | 保留 | 保留。停用会使等待资源的操作不获租约/无法按现有退避推进 |
| B27 §4#17和§5 workerReconnectInitial/MaxDelaySeconds的必要连接部分 | RealtimeTunnelClient.legacy.ts:48–49；WorkerTelemetryApi.ts:167–168，3/60s | 原重连 | 展示stream重连归A04并停止；真正承载B查询的传输失败按原3/60s退避及原错误处理（不新造HTTP重试/无限等待）。停必要连接恢复会使断线后的已派操作/任务永远无法确认；不能为了“重连”调用connect顺带拉A快照 |

### 10.4 分类与完整行为对照表：C（6项）

| ID/证据映射 | endpoint / 定时器 / 常量及基线位置 | 正常模式 | 低流量模式 |
|---|---|---|---|
| C01 §4#9；§5 operationManualWaitDelayMs | legacy.ts:17709 waitForOperationTerminalResult、17695 min(3000,500*attempt)，refreshOperationStatus(user) | 原前台等待 | 原样即时，等待期间的必要探针不变；跨回调进入B05也必须推进 |
| C02 §4#10用户触发验证；§5 _verifyIntervalMs/_verifyTimeoutMs | legacy.ts:9407–9415，800/30000ms，code-sync inspect/plan-scope及哈希/能力核实 | 原验证 | 原样，不能以仅手动模式跳过当前这次操作必需校验；自动派发所需验证属B13 |
| C03 §4 S1用户同步部分 | legacy.ts:10053/10088/10804 fpsync代码/范围同步 | 原显式范围和反馈 | 原样即时，不缩范围/不改压缩选择/不新增同步；其pending属B05 |
| C04 §4 S2用户结果收集部分 | legacy.ts:22199/22416/22517、ResultCollectionHost.ts:154–167 sync.downloadMappedPaths | 原显式结果请求 | 原样完整执行，结果刷新/收集按原声明范围；不默认只取metrics |
| C05 A01–A07各手动刷新入口 | snapshot/GPU历史、tmux RPC、live-output since、results summary、diagnostics；路径位置逐项见A表 | 每个原按钮保持原行为 | 每次点击只执行该区一轮逻辑读取；不建timer/stream，不顺带刷新其他区块。相同在途点击共享一轮、不队列补发 |
| C06 §4#1/#11/#16用户启动/停止/探测入口的主动分支 | legacy.ts:6503+ handleMessageCore；14963 testTunnel；9407+、874关联显式校验；/api/actions/*、/api/tmux/kill-window、health/version/capabilities、文件API按现有入口 | 原提交/停止/清理/文件/就绪和版本反馈 | 原样即时。单次动作所需的精确窗口/FS/来源哈希核实属于本次动作，不是额外全局展示刷新；后续pending归B，确认规则不省 |

证据§4每行覆盖核对：#1 B01/C06（非dispatch GPU另A05），#2 B02（纯展示拆出A），#3 A01，#4 A04，#5 B03，#6 A02/C05，#7 B04，#8 B05，#9 C01，#10 B13/C02，#11 B06/C06，#12 B07，#13 B08，#14 B09，#15 B10，#16 B11/C06，#17 A04/B27，#18 B12；S1 B13/C03，S2 A06/B14/C04，S3 B15。§5各常量均在A/B/C表具名，不以“其余保留”漏登记。

### 10.5 仅手动刷新交互与最终决断

**最终选择：不允许进入视图、恢复焦点、从隐藏恢复、切Worker/选窗口、首次握手或重开面板自动拉一次A数据。** 用户要求“仅手动刷新”，这些生命周期不等于点击刷新，不做例外。缓存缺失时明确呈现空态而非空白页面；已有缓存显示带时间戳的旧数据，不把它称新鲜。

- 顶栏低流量按钮只切模式，不兼作刷新。复用各区既有“刷新”入口：GPU/历史刷新、tmux列表刷新与选中窗口截屏刷新、日志刷新、结果刷新/收集、诊断刷新。若某展示区无独立入口，原实现者只在该区标题旁补一个“刷新本区”，不新增全局全部Worker全量刷新的默认按钮。
- tmux选窗口本身只选本地状态，不隐式抓截屏；没有该窗口缓存显示“尚未刷新此窗口”及“刷新截屏”。日志选run同理。GPU历史修改范围只更新选择，用户点击后读取；不在change监听里联网。
- 每个区常驻提示“低流量模式：自动刷新已关闭；上次手动刷新：时间”。无成功记录显示“尚未手动刷新”；已有普通模式旧数据则显示“当前缓存采样于：时间；本模式尚未手动刷新”。切模式不清缓存、不伪造刷新时间。
- 记录按Worker/规范项目/区块/选择身份绑定的 lastSuccessfulFetchAt（数据真正取得时间）和 lastManualRefreshAt；成功后才更新。失败保留旧内容/旧成功时间，显示本轮失败；B查询的任务/错误信息用自己的采样时间，不能刷新A手动时间。
- 点击使用原白名单命令，宿主只执行所选区块必要endpoint和当前身份。单次“一轮”按endpoint/Worker/选择key计数：列表一次，选中截屏一次；一个区本来需两个不同请求可各一次，但不能把“恰好一次”解释为整个多Worker动作只能一个HTTP。同key在途重复点击不新增网络，按钮pending，取消/错误/超时如实退出；下一次独立点击允许新一轮。
- 手动刷新必须显式标为userInitiated且只授权该次读取；不能调用会先开WS/SSE再定时poll的connect。snapshot/GPU等通过单次get方法；本来由stream首次填充的数据改成单次查询，不把manual_only的旧connect首拉拿来绕过显示禁用。
- 切换开启立即停止A timer/stream/续订：未发出的自动请求取消，能安全取消的在途展示读abort；无法取消的旧响应不作为“本模式手动成功”、不重新装timer。策略generation使旧finally/重连回调失效。不得abort B/C、清队列或使budget整体paused。
- 关闭低流量按原配置恢复**原始**queue500ms/progress2s、tmux5s、快照回退5s、WS/SSE、用户原有日志尾读选择及原进入/恢复规则，不保留r1的30s降频。原本pause/manual_only/allowStreaming等仍优先；不强行联网，不补发低流量期间错过的timer轮次。
- B返回错误须即时回传并更新错误卡；手动展示停止不等于忽略正在运行任务的真实失败。没有任务/操作时不新增“为了错误回传”的全局A日志轮询。

### 10.6 r2 受影响TODO、整合顺序和断言补丁

r1表中未受影响F0/F1/F4–F6及全部执行安全条款保留；下表细化/替换受影响预期，不重启已有实现负责人、不另派写入者。当前实施状态未知，不把“实施者先做”记录成已通过。

| 顺序/块 | 受影响范围/依赖 | r2新增或修改内容 | 验收命令及预期 |
|---|---|---|---|
| 1 F0补充可达性核对 | A表入口/streams、B02终态调用链、MultiEndpoint及client适配层；依赖已完成接口调查 | 原实现者追踪每个自动入口/connect初始snapshot/可见性恢复/日志订阅；证明B终态/错误不依赖A stream，不能只在Webview挡timer | 只读引用与假HTTP夹具准备；不抓包/压测。没有证明B独立推进前不得交付A全部关闭 |
| 2 F1增量UI | 保留已在做的markup/消息/持久化，补每区刷新与时间提示 | 不改顶栏toggle为refresh；无缓存空态、pending/error及lastManualRefreshAt；补新按钮白名单/handler（仅确需新增命令时） | T1/T2/T3/T5对应原单文件命令；位置/文案/禁用正确，模板/按钮可达检查通过 |
| 3 F2改策略定稿 | 统一派生值、RealtimeTunnelClient及实际MultiEndpoint消费者、PanelHtml各展示入口 | A=0，B=5/10s，C单轮；布尔禁用guard而非0经Math.max变5；就地停展示stream，恢复原值不变用户配置 | T4及T8对应单文件：低流量跨多个假时钟周期、进入/恢复/握手/选择A请求与stream连接均0；B按5/10秒推进 |
| 4 F3改合并/保真 | 继承B确认/同步/错误路径，拆展示和必要确认的view.visible早退 | 同URL不同origin不误挡，手动单轮不重建timer；B/C不被展示abort；完成触发B14/B15 | T4/T6/T8：每key手动一次成功=一次网络，重复在途=仍一次；任务退出确认、manifest/日志、全部Worker同步/结果收集不需手动 |
| 5 F4补回归后冻结 | F1–F3稳定 | 删去r1“低流量tmux/poll30秒”“进入一次”“保留展示push/连续尾读”的旧期望，保留全部不冲突覆盖 | T1–T9按r1单文件串行规则；关闭模式后原500/2000/5000/5000ms恢复、正常模式从未开启时轨迹完全一致，pause/manual_only组合不被覆盖 |
| 6 F5/F6 | 最终候选 | 版本0.5.422、打包/审查/PR/发行/安装/重载后UI/基准同步不变 | 继续r1 §8；build+vm.Script双门禁和实际内联脚本检查缺一不可，本修订不运行这些命令 |

所有测试使用r1原单文件命令 node --test --test-force-exit --test-timeout 20000 <单个文件>，一次一个node/python进程，20秒未退出即停、不重试。具体断言归属：
- T1/T2：真实渲染中提示、空态、各区刷新入口及内联脚本语法；双写反斜杠/String.fromCharCode红线原样。
- T3：若补命令则检查data-command/白名单/handler，且不占hostOperationUiCommands租约。
- T4：宿主依据origin/模式/代际判定；不信任前端伪造correctness；手动不启动自动连接，模式切换后旧回调不重装timer；持久化与暂停组合原断言保留。
- T5：手动刷新pending/失败/未知后可恢复、lastManualRefreshAt仅成功更新、Webview重建只取宿主状态不联网。
- T6：RequestBudget配额禁用、隐藏/并发/紧急保护原断言不减；A停发是在发起层，不以budget拒绝所有snapshot实现。
- T8：给真实client适配层及queue/progress seam补假时钟和假HTTP/stream计数；无B义务的纯展示各endpoint自动0、单次显式刷新每key恰好1、连续点击在途合并、结束后下一次可再取1。加入同URL B合法请求不误判成A违规的场景；隐藏B终态确认后同步/收集和错误照常。正常→低流量→正常恢复且没有多个timer；初始默认正常全轨迹不变。若现有seam无法容纳才按r1规则增最小集成文件，不每endpoint新建进程。
- T7/T9：原build内置node-c +额外vm.Script、实际内联script测试和动态端点/端口硬编码门禁全部保留，不因仅文案/策略修订略过实施后的必需验证。

**功能保真与所有P0不变**：结果文件同步/收集、C即时反馈和B pending/停止/清理意图推进、隧道/实际版本及代码来源核验、错误如实回传、未检查不算通过、不得假成功/静默回退；禁止硬编码隧道端口/IP，仍从每服务器动态端点解析。不得把纯展示0请求断言套到B/C必须访问的相同URL上，也不得用缓存页面证明真实任务完成。

**未获用户确认，不列为必做项或交付门槛**：流量字节数/费用量化实测、性能测试规模及未确认Worker/job并发，继续按r1 §7待确认；本修订不要求用户补充答复才能实施。仅本次r2计划文件更新/回读，未实现、未编译、未测试、未打包，也不改实施者源码或Git状态。


## 11. 交审前失败分流状态（只补证据，不改生产代码）

- F4-FAIL-1 hostOperationLease 首轮 package 失败：分类为既有并发时序抖动，非本改动引入。取证（证据 §15.1）：该用例只依赖 node 内置与 dist/core/HostOperationLease，对本次改动的模块引用 0 命中；测试与 core 实现三个文件的 sha256 与基线一致；git archive 基线树在 16 个 CPU spinner 同等并发下 4/4 复现同一用例失败（TypeError 读 actionLabel / 缺少 HostOperationLeaseConflictError 拒绝 / HostOperationLeaseLostError RESOURCE_LEASE_LOST 三种同族表现），当前副本同负载 2/2 复现，无负载双方 14/14 通过；第二轮 package overall=passed files=238。
- F4-FAIL-2 新模块行数门禁：基线既有技术债。取证（证据 §15.2）：git show 基线字节 CacheCleanupPanel.ts 478 行、PlanCleanupHost.ts 430 行（wc -l），门禁按 split 换行 计数为 479/431，本副本数字完全相同且这两个文件未被触碰；该测试不在 npm run package 的 238 文件集合内（workflow 配置与三轮日志均 0 命中，238 个枚举文件不含它），仅在按 T9 显式单跑时暴露。
- handoff.json 状态：上述两条均以 status=failed、exitCode=1 原样保留并指向完整日志；复跑与基线复现另列为 status=passed/failed 的诊断条目；required 只标在真正的必需验收（package、compile、vm 双门禁、本任务新增/扩展测试）上，诊断类 required=false。
- F0–F5 状态维持 §6 表中「已完成」，F6 仍为「进行中：PR 已提交（#25），发行/安装/重载验收待主控」。

## 12. r2-final-1 最终审核结论（purpose=final，2026-10-28）

### 12.1 结论、范围和候选身份

**结论：必须回原实施者返修；当前不得合并 PR #25，不得发行/安装当前0.5.422包。** 已完成的编译/测试不撤销为“没跑”，但不能覆盖以下实际代码缺陷；§11“F0–F5已完成”是实施者交审状态，不等于本次审核通过。本章只追加审核结论，未改任何源码、测试、版本、索引或Git状态，未执行新测试/编译/打包。

审核冻结身份：
- 基线：7a6062fa10441cc5852166a34138781a2604d9e9。
- 实现：8f77844458790451d52ab7d98dbe2d54bdfb733f；取证文档HEAD：1d920cc80ed05e76246b47ef82a3071dcdcbb8bb。
- 交审索引SHA256：8abcbb13e266f69a455d0ca47a25e1fb022fe402b155aac8414d4fe35ae29ed8，purpose=final；candidate.revision仍指基线，其notes明确绑定实现提交，不误认基线为已实现HEAD。
- 版本0.5.422；simple-experiment-0.5.422.vsix，2683707字节，SHA256 **7bb4f147da77f2bcf4520fe62158162bd9efdbeecec9e0f3dd69fbe42f7a73a0**。
- 审核前只读核验候选20项、登记artifacts及全部checks日志共47个文件，哈希全部一致，无缺失；索引哈希、HEAD和根目录VSIX实物大小/完整哈希一致。审核前git status为空、未暂存。追加本章后plan的哈希必然变化，主控应更新交接索引，不沿用旧plan哈希假装未变；本审核者不写索引/提交。
- 身份核验原始日志：D:/OpenChamber-AgentConfig/Pi/host-native/diagnostics/host-windows/66f4174f-d530-4b05-b3d0-3e8d115a8876-stdout.log；真实exitCode=0。
- 实际源码diff已对照基线读取，包含宿主策略/消息/单飞、两个实时客户端、面板及测试调整；生成物、版本与新策略文件均在哈希核验范围。审核是静态调用链与现有真实日志审查，以下缺陷未新运行复现，不把代码推导写成实测。

### 12.2 必须返修（6组，均是当前契约缺口/真实代码风险）

#### R1 / high：A类未全覆盖，且首帧前仍可能自动联网，展示时间提示仅tmux落地

位置与证据：
- src/ui/PanelHtml.legacy.ts:4167、4176：展开GPU历史就直接requestGpuHistory(...,true)；:11843–11877 requestGpuHistory/requestGpuHistoryRemote在无Worker时直接发loadGpuHistory、有Worker时本地ring为空/800ms超时也发远程请求，没有displayAutoAllowed或明确手动刷新origin守卫。src/extension/legacy.ts:6498–6524 loadGpuHistoryFromUi继而client.getGpuHistory，亦无A自动来源闸门。这违反r2 A05“不在展开/切选择时自动拉一次”；cooldown不是零调用。
- 面板:1966默认tmuxDisplayAutoHint=true，:2666–2670在未有trafficMode时接受该hint，:4403–4404仍有800/1400ms首次拉取。retainContextWhenHidden=false或重载无Webview状态时，慢于800ms的宿主首帧会让已持久化低流量的用户先拉tmux；宿主fetchTmuxListFromUi/Capture也没有依据权威模式拒绝自动来源。
- :2521写lowTrafficDisplayAuto为 !displayAutoAllowed("auto")，而:1966/:2746将该键理解为“是否允许自动”；正反语义不一致，会把下一次初始允许/禁止提示颠倒。
- :2688–2696 renderDisplayAutoNotices只更新tmux列表/截屏；A01/A03/A05/A06/A07各展示区没有本计划要求的常驻“自动刷新已关闭/上次成功手动刷新/尚未手动刷新”闭环。tmuxList使用单一全局key、无Worker/项目身份；多Worker部分失败时最后一条成功也可能将整区显示成刚成功刷新。

通过条件：
- 按§10 A01–A07逐个发起入口区分自动/手动/正确性，阻止展开/焦点/选择/初始重试/ring回退的A远程调用；不能仅封tmux。
- 用宿主注入的权威启动状态或其他不改变正常模式轨迹的方式封住低流量首帧前窗口；修hint正反语义，Webview缓存不作权威。
- 每区/精确身份显示真实采样与手动成功时间，无缓存空态和失败旧数据明确；不以B附带数据假装A手动成功。
- 加真实渲染脚本+假HTTP/ring调用计数：低流量首次握手延迟、无缓存、展开GPU、切Worker、选择、隐藏恢复、初始失败重试均A自动0；独立手动点击每key一轮；正常模式未开启的入口轨迹与基线一致。新增测试目前只检查tmux正则/单client，不满足此覆盖。

#### R2 / high：共享policy原地修改使多Worker退出低流量时只恢复第一个端点，并污染默认策略

位置与证据：
- src/tunnel/MultiEndpointRealtimeClient.legacy.ts:49–66把同一个policy对象传给所有子client，:85–87依次updateRefreshPolicy。
- src/tunnel/RealtimeTunnelClient.legacy.ts:98–104默认policy直接引用defaultRealtimeRefreshPolicy，:454–471原地写this.policy；恢复时:459以“displayAutoRefresh=true且cadence未改变”直接返回。
- 低→正常第一次子client把共享snapshot间隔从0写成5并安排自身重连；第二及后续子client看到共享值已为5，于:459直接返回，不清理/恢复自己的disconnected生命周期。构造时默认引用也可能被单个client切模式污染，影响后来构造的正常client。问题不是间隔表的数字，而是对象别名与每client副作用被全局值替代。

通过条件：
- 各client拥有自己的策略快照，或每个client都独立核对前/后模式并执行连接状态迁移；默认策略常量不可被实例写入。不能用强制重建整组client清掉运行状态来绕过。
- 至少两个真实子client（同一aggregator）、正常→低→正常，分别验证stream/poll/reconnect恢复，默认值保持5且新建正常client未被前一个污染；重复策略不重复timer。不能像现测试在update后手动再调用client.connect来掩盖漏恢复。

#### R3 / high：正确关闭展示通道被宿主误判为隧道不可用，违反真实反馈

位置与证据：
- RealtimeTunnelClient.legacy.ts:112–118低流量connect合法早退，updateRefreshPolicy通过disconnect("display-auto")使status=disconnected；这是主动关闭展示而非网络失败。
- src/extension/legacy.ts:5601–5633 ensureRealtimeConnected在client.connect之后仍以所有streamStatus=disconnected判定unavailable，:5618设置lastError="tunnel_unavailable"，无lastHealth时还设置local_port_closed。持久化低流量后resolve/就绪探测/冷恢复均能走此入口，健康HTTP可成功但被展示策略假报离线。

通过条件：
- 把“展示自动刷新关闭”与网络未探测/真实连接失败分离；不伪造在线，也不能以合法关闭stream伪造端口关闭。
- 假HTTP健康/版本可达且displayAutoRefresh=false的实际宿主调用链中，不出现tunnel_unavailable/local_port_closed；真实HTTP失败继续回传。已有B终态、pending、完成同步/结果收集保留，在隐藏、全部展示流关闭状态下验证真实协调链而非仅stub计数。

#### R4 / high：blockedBy把A闸门重新打开，“更强约束”实际没有保证展示已停；恢复路径策略不收敛

位置与证据：
- src/extension/legacy.ts:1402–1413：manual_only/background_traffic_paused/paused时intervals恢复NORMAL，displayAutoRefresh=!(enabled&&!blockedBy)变true。
- Webview只消费这些值，于是低流量+manual_only仍装5s tmux timer；RealtimeTunnelClient manual_only的connect原分支还主动取一次snapshot（:124附近），并非按钮文案所称“后台周期本已停止”。低流量不应因另一开关静默丢失A=0保证。
- :6317–6324 resumeNetwork先resume预算再applyTrafficScheduling，但effectiveTrafficPolicy仍读取原lastHealth=paused；没有在此清理/重核旧paused依据，可能继续派生NORMAL/允许展示。pauseAll只scheduleTrafficTimers未同步client策略；配置resetClient路径同样需要核对queue/progress重排，不能仅在点击toggle时更新。

通过条件：
- 对低流量requested=true，A始终不被更强暂停/手动约束重新启用；B/C维持各原约束，存储不篡改。分离展示闸门与B有效节奏，不把“blocked”简单等同“正常自动展示”。
- 对所有pause/resume、manual_only/后台开关配置变化、resetClient和重载场景验证最终策略收敛。低流量resume后应为B5/10s且A0；全暂停时不能私自联网；manual_only不能因低流量新增周期；正常模式既有配置行为不改。当前测试反而断言blockedEcho.displayAutoRefresh=true，应按真实约束修正而不是以此作通过依据。

#### R5 / medium：单飞合并丢掉加入者requestId/身份，并无条件改变正常模式的调用行为

位置与证据：
- src/extension/legacy.ts:24124–24138 displayReadOnce仅返回首个reader的promise，fetchOneTmuxListFromUi在reader内部用首个requestId发布回执(:24151–24175)，加入者没有自己的发布；key仅Worker或Worker/window，没有规范项目/客户端代际。
- 面板:2481–2487允许20s超时后重新刷新，:2507–2508只接受当前tmuxListRequestId。若旧读仍在途，新手动请求加入旧promise，只会收到旧requestId，不能结束新轮pending/更新手动成功时间。新Webview重置requestId、项目/连接切换也可能加入旧读。
- 这些包装没有lowTrafficMode判断，在正常模式也取代原每调用各回执的行为；仅常量逐值相同不足以证明“零调用/行为差异”。

通过条件：
- 原正常分支行为保留；低流量共享底层网络读但为每个当前有效调用者发布匹配requestId的结果，不复用跨项目/client/generation旧读。必要停止后closeCheck新鲜核实不能加入展示旧结果。
- 加“原读尚未完成→UI超时/重建→再次手动请求→原读返回”的闭环断言，当前按钮能退出pending且显示本轮真实结果；不同项目/代际不共享，失败/abort能释放key。正常模式对照原调用数和回执，不只测Map读次数。

#### R6 / medium：成功回执后立即再次点击，可能仍发送同一个目标，未实现可靠再次点击关闭

位置与证据：
- src/ui/PanelHtml.legacy.ts:2789成功回执只暂存lowTrafficReceiptDisplay并解除pending；显示/aria-pressed使用该值。
- :3878–3885点击目标却只取lastState.trafficMode.enabled，不取已收到的确认值。若成功回执先于节流/ACK背压下的新state，按钮显示“开”且可点击，但lastState仍“关”，再次点击仍发送enabled=true，不会关闭；反向同理。
- 回执处理先clearLowTrafficReceiptTimer再核对requestId，也会让不匹配旧回执取消当前请求超时保障。

通过条件：
- 显示与下一次目标使用同一份宿主已确认值（或保持禁用直到对应权威state）；先校验回执身份再取消定时器，旧回执不能影响新pending。
- 用乱序/延迟state与回执的实际脚本断言：关→点击→成功回执（暂不发state）→再点击应发送false，反向亦然；旧requestId不结束新pending，写入失败不改变确认值。不能只以源码包含“失败/回执”文字作验收。

### 12.3 已通过项与验收完整性判断

- 默认读取globalState严格===true、缺键默认false；keys/API只读global键、SAFE/INTERNAL/COMMANDS_WITHOUT_UI_STATUS、文档代际与本地回执链落地，未进入hostOperationUiCommands；按现有写入失败分支确实恢复旧内存值并发送ok=false，不是假成功。但R6交互、R2恢复/R4合成未通过，故不能整体称开关闭环已完成。
- NORMAL表500/2000/5000/5逐值等于基线；B原queue/progress早退与10s确认调用存在，pending/清理探针、同步、结果收集、动态端点、完成证据代码未削减。本次未发现刻意跳过同步/metricsOnly替代完整结果。仍须补R3/R4的真实链路组合覆盖，不能由“旧B模块未改”推定关闭stream后所有行为都正确。
- P0语法与端点检查有真实日志：logs/65-dual-gate.log记录node-c两项、vm.Script exit=0及10890 src/dist零命中、固定127.0.0.1:18765 src零命中；logs/63-package2.log显示build域和语法门禁真实运行。审阅新增内层script未发现本次裸反斜杠；内联script原测试也通过。不是用模块vm校验替代实际内联脚本检查。
- handoff.checks共有14条，required=true共7条，均complete=true/status=passed/exitCode=0，日志哈希与原文件一致；63-package2.log末尾overall=passed files=238、maxObservedConcurrent=1、按需未执行0项属实。另有4条failed记录，对应两类历史问题及复现，不是只有两个failed对象；未被悄改passed。
- **登记验收真实，但功能覆盖尚不完整。** panelWebviewScriptHealth新增A零请求主要为正则检查；panelLowTrafficModePolicy单client/宿主stub没有覆盖GPU展开、首帧慢、共享多端点恢复、假离线、相同URL的B/C分流及回执交错。7条required全部passed不能替代r2要求的完整行为证据。返修须按实际影响扩展现有seam，正常模式与低流量组合均补断言，禁止降低原断言/改超时求绿。
- 字节/费用节省率确未实测，evidence §14.6正确写为未知，不当作通过证据，也不列交付门槛；不要求额外压测/真实收费服务器实验。

### 12.4 非阻塞建议（2条，均是历史既有项，非本次相关真实回归）

1. **历史租约时序用例后续治理**：同意F4-FAIL-1定性为既有负载敏感失败，不因它要求本次修改core/超时。已查看首轮60-package.log的完整失败摘要与基线73-baseline-load-hostOperationLease-run3.log：基线同一用例同一TypeError；其余基线/当前负载日志与无负载日志哈希均核实，失败依赖链不加载本次修改模块，相关core/测试在实际diff无变化。同类TTL/心跳失败的基线复现+相同输入+单跑及第二轮包真实通过，足以排除本次相关回归。不把基线复现失败记成通过，不批准修改TTL/断言或自动隔离。
2. **历史行数门禁后续治理**：同意F4-FAIL-2为既有超阈值技术债。30-test-test_factories_integration_test_js.log实际7/8且失败只在行数，P0端点及vm测试通过；基线/候选相同字节及split口径479/431解释成立，未改的CacheCleanupPanel/PlanCleanupHost不因本次突然超限。该套件不属于本次package238集合，“package通过”不宣称该套件通过。可另任务决定拆分，不自动放宽阈值/停跑测试。

两条历史失败分类证据足够，无需为此次分类再跑负载或修无关模块。它们非阻塞不等于R1–R6非阻塞。

### 12.5 返修整合与停止条件

原实施者续接当前副本处理R1–R6，先统一策略/身份和生命周期，再补各展示入口及回执闭环；不重派、不碰主线、不扩服务器协议。受影响单文件仍按r1/r2规定串行、20秒上限，复用真实未失效覆盖；最终修复候选必须重做必要编译/模板双门禁、相关回归和打包，替换本轮尚未发行的候选包并更新其真实身份，不能把当前VSIX指纹继续套用。若版本已被他处发布/占用，停止交主控决定，不覆写历史资产。

交审时带新提交、更新索引、原始日志和上述通过条件的行为证据；GPT只补审实际变化及其影响，不机械重审无变化历史失败。当前PR #25继续保持未合并，Release/安装/重载验收均待审核通过后按长期授权办理。本审核阶段完成，整体交付仍阻塞，返修时间暂无法可靠估算。


## 13. r2-final-1 返修完成记录（worker，2026-10-28）

六组必改项 R1–R6 全部按 §12 的原文验收语义实现，未改动 GPT 的验收条款；两条非阻断建议（lease 计时、行数门禁）按 §12 明确不在本轮范围，未触碰。

- 实现与逐条证据：见 `evidence.md` §16（含每条改动的文件:行位与验证日志编号）。
- 新增测试：`test/features/lowTrafficDisplayRework.test.js`（9 项，R1/R2/R3/R4/R6 直证）；`test/features/panelLowTrafficModePolicy.test.js` 更新为 R4/R5 新语义（16 项）。
- 受影响 69 个测试文件串行回归：66 绿；3 个失败为基线既有（`factories_integration` 行数门禁、`distributedRerunAndWorkerDelta` 缺 GitHub 阶段文案、`gpuWindowPanelWiring` 毫秒/秒口径漂移），取证见 evidence §15、§16.8，未放宽任何阈值。
- 版本保持 0.5.422；`npm run package` 通过，VSIX 指纹见 evidence §16.7。未安装、未发布 Release、未合并，等主控确认。
- 待主控决定一项：`gpuWindowPanelWiring` 的时间口径测试是否随本 PR 一并修正（测试侧，生产行为按注释为既有设计）。

## 14. gpuWindowPanelWiring 失败项定性与收口（终审放行前补取证）

粗帧只被 `src/ui/PanelHtml.legacy.ts:11905-11906` 的 `bucketEpoch < points[0].bucketEpoch` 比较丢掉：夹具把缓存粗帧与期望值写成 epoch 毫秒，而真实链路面板入缓存即 `Math.round(collectedAt/1000)`＝epoch 秒（`GpuCollector.ts:415` ISO → `GpuSampleRing.ts:27` 毫秒 → `PanelHtml:11891` 秒；远端桶 `clusterAgentRuntime.legacy.ts:2159-2168` + `:2096` gmtime 同为秒；面板 24 小时窗口 `:12164` 亦按秒）。判为夹具口径不一致，走分支 2：只改测试输入数据（`test:61-74`、`:113`），断言文本/数量/阈值不动，复跑 exit=0、6 pass 0 fail（`logs/101-*`）。该文件此前并非绿：基线探针 exit=1、3 pass 3 fail，两条用例在 `ReferenceError: mergeGpuHistorySegments is not defined` 处异常终止，断言根本没跑到（`logs/100-*`），且它不在 build 228/package 238 作业集合内。详见 evidence §17。

## 15. r2-final-2 第二轮最终审核结论（GPT reviewer，2026-10-28）

### 15.1 结论与候选身份

**仍需返修：R3、R6各有一个连续状态漏洞；当前不能合并PR #25，不能发行或安装本次0.5.422 VSIX。** 本轮只追加本章节，未修改源码、测试、版本、索引，未执行测试/构建/打包或Git写操作；不把已有通过日志当作缺失场景的行为证明。

审查对象：工作分支feat/low-traffic-mode-20261028，冻结基线7a6062fa10441cc5852166a34138781a2604d9e9，实际HEAD **021e239319fbf6ac44233ab6aa89c558fd8d9973**。handoff索引SHA256 **9df780cadec6712e0dd967ab6e3b5209c6512fa80b51c4785a53bdc535282e90**；29个candidate.files、6个artifacts、22条checks。递归核验127条带path/sha256的候选、配置、日志及产物引用全部相符，核验前工作区干净、无暂存文件。package.json/package-lock.json均0.5.422；VSIX 2688906字节，SHA256 **77a86a93911924876becadebc28b33826fce15bf46fcbec007768cc444c1f2b5**。追加本章后plan哈希必然变化，主控须更新handoff该项，不能继续声称索引全部未变化。

身份核验完整原始日志：host-native/diagnostics/host-windows/77c4e762-3a4c-4d48-b141-6aad9dbee68a-stdout.log；检查摘要日志：同目录e8412e46-5f52-4b89-aa9b-341d8c8fb75f-stdout.log；两条只读命令均exit=0。

### 15.2 上轮六组逐项复核

- **R1主要漏闸与提示极性已修复**：GPU展开及ring回退都进displayAutoAllowed(origin)，宿主GPU/tmux读也二次门控；lowTrafficDisplayAutoOff读写同极性封住首帧前宿主联网，GPU各key手动按钮与成功时间回执已落地。新增真实函数测试比原正则门禁更强。正常模式自动来源继续放行。
- **R2已关闭**：默认策略冻结，实例复制调用方policy，每端点按自身旧策略恢复；aggregator只转发partial，不再共享改写。9项新增测试中包含双端点与恢复计数证据。
- **R3只修复假离线的一半，未关闭**：合法展示关闭不再直接伪造local_port_closed，但真实断连标记会被后续策略收敛覆盖，见15.3 B1。
- **R4已修复原逻辑问题**：displayAutoRefresh=!enabled，不再由blockedBy重新开启；pause/resume/reset/ensure应用统一策略，resume清陈旧paused依据。B/C原有约束和NORMAL常量未被本轮返修改写。
- **R5已关闭原合并/回执问题**：displayMergeEnabled仅在低流量展示关闭时为真；正常分支走原每调用一轮，低流量共享网络结果但每workerId:requestId各自发布。key含项目代际与workspaceRoot，closeCheck不合并，signal调用不合并。16项策略测试明确核对正常两调用/两轮与低流量两Worker四回执；NORMAL 500/2000/5000/5逐值不变。未发现本轮在正常模式继续启用单飞的情况。
- **R6只修复匹配pending和下一目标的一半，未关闭**：点击与显示共用确认值、旧回执不再取消另一pending定时器，但pending结束后旧成功仍被接受，见15.3 B2。

### 15.3 必须返修（2项）

#### B1 / high / R3：策略重复应用会把真实断连重新解释为主动关闭

位置：src/tunnel/RealtimeTunnelClient.legacy.ts:123–130 connect，:490–498 updateRefreshPolicy；宿主src/extension/legacy.ts:5616–5642 ensureRealtimeConnected。

静态可执行路径：低流量关闭展示后，connectionLost("socket hang up")正确置displayAutoClosed=false、保存真实lastError；但再次connect()在disconnected且低流量时无条件置true，或重复updateRefreshPolicy({displayAutoRefresh:false})在disconnected分支同样置true。前者发生于宿主ensure先connect再取diagnostics，后者发生于该方法末尾applyTrafficScheduling及其他策略收敛入口。此后aggregator所有端点均被标为displayAutoClosed=true，宿主displayGuarded为真并把lastError/tunnel_unavailable置为undefined。端点lastError字段虽然仍在，不代表宿主错误判定正确；“实际断连”已被重新归因为“策略主动关闭”，违背保留真实错误的契约。硬错误requiresManualReconnect能挡住connect早退，却挡不住重复updateRefreshPolicy覆盖。

现有新增r3真实client测试只在connectionLost后立即读diagnostics；宿主测试用固定diagnostics stub，且“真实失败”stub把displayAutoRefreshDisabled设成false，未走“仍为低流量→再应用同策略/ensure”的组合，因而9/9通过不能排除此缺陷。

通过条件：主动关闭只记录真实的策略关闭转移，不覆盖既有真实错误/断连归因；未探测保持未探测、不伪造在线。补真实client/aggregator→宿主组合断言：真实软/硬断连后重复相同policy、connect及ensure，错误依据仍保留且不被标为策略关闭；纯主动关流不出现假离线；仍不得为验证错误而恢复A类自动联网。

#### B2 / medium / R6：没有pending时，过期成功回执仍能倒退显示和下一次点击目标

位置：src/ui/PanelHtml.legacy.ts:2817–2840 handleLowTrafficModeReceipt，:2754–2757 lowTrafficDisplayEnabled。

静态路径：身份检查只有pending存在且双方requestId非空时才拒绝；pending为空时任何ok=true回执都写lowTrafficReceiptDisplay并优先覆盖权威state五秒。例如已确认ltm-2=false（pending已清空），迟到/重复的ltm-1成功enabled=true仍被接受，按钮显示开、下一点击发送false，而最新已确认状态其实为关。ltm-1曾超时、ltm-2成功后再收到旧成功也相同。已有代码只对无pending的旧失败做return，成功没有对应保护。回执没有requestId时还可越过现有pending的身份检查。

现有r6测试覆盖“旧成功遇到新pending”和“无pending旧失败”，没有覆盖“新成功结束后旧成功”，因此漏掉此分支。这不是请求在途合并问题，不应通过扩大单飞或更改正常网络行为解决。

通过条件：回执必须绑定当前有效请求/最新确认代际；不匹配、缺少身份、已废弃及旧成功均无显示/定时器/下一目标副作用。补确认ltm-2后再到ltm-1成功、超时→新请求成功→旧成功、重复回执与缺requestId测试；正反切换、写入失败及延迟state仍正确。只修回执消费，不自动重发设置。

### 15.4 验证日志、夹具与基线失败定性

12条required均complete=true/status=passed/exitCode=0；22条checks中的历史failed如实保留。logs/94-build-r1r6.log记录build 228文件通过，logs/95-package-r1r6.log记录package 238文件通过、maxObservedConcurrent=1；logs/83-compile-r1r6b.log与97-dual-gate-r1r6.log的node-c两项和vm.Script均exit=0。97记录10890 src/dist=0、固定127.0.0.1:18765 src=0。logs/98-7-panelInlineScriptSyntax.log实际内联脚本2/2；没有拿模块vm校验替代模板剥离后的内联检查。相关新模板片段未发现裸反斜杠。98-1策略16/16、98-2返修9/9、101 GPU夹具6/6均有真实汇总，无cancelled/skipped；日志真实不等于B1/B2场景已经覆盖。

GPU夹具时间修正合规：ISO→ring毫秒→面板Math.round(/1000)秒、远端粗桶及24小时窗口均按秒；改t0Ms/t0及两小时前粗帧输入而不改断言/条数/阈值，没有改生产合并逻辑来求绿。补齐真实merge函数依赖后断言首次被实际执行，6/6可作为本轮单文件证据；基线探针的模块缺失失败只算探针环境限制，不夸大为第三个基线产品缺陷。历史未入build/package是测试登记缺口，不因本任务已显式运行而倒推此前通过。

factories_integration行数失败与distributedRerunAndWorkerDelta文案失败均可列非阻塞：前者相关源码字节及split行数基线/HEAD一致；后者预期文案在两者均0命中且本次未删除。既有hostOperationLease高负载抖动沿用12.4已核分类，不另加负载实验、不降低TTL/门禁。真实失败继续保留failed，不记为通过。字节/费用节省率未实测，不能作通过证据，也不是此次门槛。

### 15.5 非阻塞建议（3条）与续接条件

1. 将已补齐依赖的gpuWindowPanelWiring及本次两个低流量专项测试纳入合适的长期按需工作流，避免以后仅靠手工登记；不据此声称当前build/package已包含它们。
2. 另任务治理factories行数技术债与distributedRerun文案测试漂移，保持失败透明，不放宽阈值；既有租约时序建议沿用12.4。
3. 补强组合状态测试：项目代际测试应保持旧读在途时发新读，端点恢复除connect计数外可逐项验证原stream/poll/reconnect节奏；这些不替代本轮B1/B2必须断言。

原实施者同副本续接B1/B2；修复后按影响验证并重新生成与源码一致的候选包/日志/索引，再做增量终审。不重复治理无变化历史失败，不要求性能/收费实验，不自动扩大任务。仅审核阶段完成；合并、稳定Release与同字节一次安装仍待通过，暂无法可靠估算返修耗时。


## 16. r2-final-2 返修完成记录（worker，2026-10-28；不改 §15 的审核指导）

- TODO 状态：B1（R3 真实断连归因）已改并按三步连续序列验证；B2（R6 无 pending 过期回执）已改并按连续回执序列验证；R1/R2/R4/R5 与两条基线既有失败按 §15 结论未触碰；§15.5 三条非阻塞建议未实施（未纳入工作流登记、未治理技术债、未扩测）。
- 实现与逐条证据：见 evidence.md §18（B1 在 src/tunnel/RealtimeTunnelClient.legacy.ts:128/195/480-483/510，B2 在 src/ui/PanelHtml.legacy.ts:2817-2837）。
- 新增连续状态断言 3 项（lowTrafficDisplayRework 9→12，断言只增不减）；受影响 69 个文件串行重跑 67 绿，2 条失败为已定性的基线既有项（logs/112-serial-summary.txt）。
- 双重门禁与打包：build 228 通过含两处 node -c、vm.Script 零反斜杠问题、grep 10890=0；package 238 通过，VSIX 2689215 字节、SHA256 ca3baaf11e770110724d2c4160edb03b38704dc4092f1003aa5a96a407cbac7f，版本保持 0.5.422，未安装/未发行/未合并。
- 流程更正：对照探针今后一律放仓库外 probes/ 目录，本轮未在工作副本内建任何临时目录。

## 17. r2-final-3 第三轮最终审核结论（GPT reviewer，2026-10-28）

### 17.1 结论与范围

**继续返修：B2已关闭；B1仍有1组必须返修（暂停/未完成重连状态绕过归因保护）。当前不能合并PR #25，不能发行或安装本次0.5.422。** 本轮只读核验第二轮后真实diff、代码状态转移、测试和既有原始日志，只追加本章节；未改源码、测试、版本或Git索引，未运行新测试、构建、打包或服务器操作。本审核阶段结束，返修耗时暂无法可靠估算。

### 17.2 候选与证据身份

- 实际分支feat/low-traffic-mode-20261028，基线7a6062fa10441cc5852166a34138781a2604d9e9，8个提交，HEAD **0e0b86476cb6a8b20460e2a339128df778febcb1**。本轮实现63e3bc77及索引提交0e0b8647的增量与所述B1/B2范围一致。
- 索引SHA256 **128ce4afef3b2216cdfcc35f939df72af039d620526f2e38e718a78943272615**；29个candidate.files、6个artifacts、23条checks。递归核验本索引全部108条path/sha256引用，无缺失/不一致；核验前工作区干净且无暂存文件。引用数量与第二轮不同，不能沿用上一轮127条数字。
- package.json及package-lock.json均0.5.422；VSIX **2689215字节**、SHA256 **ca3baaf11e770110724d2c4160edb03b38704dc4092f1003aa5a96a407cbac7f**，指纹与包登记一致。追加本章后plan哈希失效，须由主控更新handoff；不能声称追加后的索引仍全部一致。
- 只读身份/diff核验exit=0原始日志：host-native/diagnostics/host-windows/92def298-313d-4c9d-bfe6-c2a2d061b6f6-stdout.log；门禁日志摘要读取exit=0：同目录123b9367-a0f0-478e-8a4f-2ae717e143db-stdout.log。未重新查询GitHub PR/发行状态，以交审提供的OPEN/MERGEABLE为交接状态，不冒充本轮远端实测。

### 17.3 B1未关闭：helper把paused/connecting都误当成已有健康活动流

**必须返修 / high。** 位置：src/tunnel/RealtimeTunnelClient.legacy.ts:480–483 markDisplayAutoClosed，:194–196 disconnect，:506–510 updateRefreshPolicy；宿主src/extension/legacy.ts:6304–6341暂停/恢复入口与:5616–5642 ensureRealtimeConnected。

本次确实修复了“disconnected + lastError/requiresManualReconnect”下重复policy/connect的归因覆盖，新增软/硬错误连续断言也真实执行。但helper只在status===disconnected时保护错误；status!==disconnected并不等于“流仍健康活着”。至少以下两条既有入口可达：

1. 低流量下真实软/硬错误已置displayAutoClosed=false并保存lastError（硬错还置requiresManualReconnect=true）→用户暂停流/暂停网络经disconnect("paused")置status=paused、保留错误→再次应用当前低流量策略，updateRefreshPolicy因paused!=disconnected调用disconnect("display-auto")→helper跳过其唯一保护条件，写displayAutoClosed=true并转disconnected。恢复时markDisplayAutoClosed虽然因错误return，却不撤销已经错误写入的true；全部端点同此状态时宿主displayGuarded=true，再次把真实不可用归因为策略关闭。pauseRealtimeStream明确直接调用disconnect("paused")；pauseAllNetworkActivity在暂停后直接applyTrafficScheduling，resumeNetwork也重新apply，非假设中的新入口。
2. 真实软断连→关闭低流量开始恢复连接，connect把status置connecting（尚未成功，旧lastError仍在）→握手完成前再次开启低流量→helper因connecting!=disconnected认领主动关闭。实际没有新的连接成功证据，却把旧失败归因覆盖成策略关闭。本轮恢复测试把child.connect换成只计数的stub、故意保持disconnected，没有覆盖真实connecting中再切回低流量。

端点lastError文本仍在不等于宿主错误分类正确；这两条路径可让宿主不再报tunnel_unavailable，而硬错仍实际限制请求。不得用“暂停是用户意图”推定旧故障已被恢复，尤其恢复后错误仍受限的情形。

通过条件：把“当前流有真实成功证据/本次策略主动关闭”与“暂停或重试未完成”明确区分；未获成功证据前，暂停/重复策略/重连尝试不能抹掉尚未解除的软/硬故障归因，也不能遗留错误的displayAutoClosed=true。不要简单把所有非disconnected都视为健康，不通过恢复A类自动请求来探活求绿。补真实client+aggregator+宿主组合序列：软/硬错→paused→重复policy→resume/ensure仍正确报错；软错→connecting→再开低流量仍保留未恢复错误；无错的纯主动关流仍无假离线。正常模式原有节奏与行为不改。

### 17.4 B2已关闭，严格requestId不会造成永久switching

src/ui/PanelHtml.legacy.ts:2817–2837先要求pending和双方非空且相同requestId，再处理成功/失败；无pending、旧成功、重复、缺身份回执均在写显示/清timer前返回。新增整段乱序序列保留原9项并扩至12项，断言真实消费函数与下一目标，修复符合15.3 B2。

合法点击在发送消息前beginLowTrafficToggle(target,payload.requestId)，宿主postLowTrafficModeReceipt原样回传requestId；正常匹配成功和失败都会清pending。被拒回执不会取消当前超时，原8秒定时器仍会解除pending并提示结果未知；超时后迟到回执丢弃，由权威state收敛，不自动重发。这可能诚实显示一次“结果未知”，但不会永久卡在switching，不应为兼容无身份回执重新打开漏洞。本轮未发现B2引入新的必改项。

### 17.5 自报lastError恢复残留：非阻塞建议（1条，本轮新增）

真正成功后泛用WS/SSE/non-telemetry polling路径未统一清lastError是既有残留：onopen/:567和SSE/:605只改status/reset；readSnapshot成功清错当前在:711–716的manual_only条件与Worker telemetry分支。不能宣称所有兼容路径恢复后诊断错误都自动清掉。

不据此增加本任务必改：当前生产realtimeEndpoints仅启用Worker，RealtimeTunnelClient:294–296按role==="worker"即归为telemetry；正常建立Worker通道后走成功snapshot并在:716清错，失败则按真实失败保留；非telemetry兼容路径不是当前受支持执行目标。泛用路径旧lastError可能出现在“最后错误”诊断，但连接可用与否仍按streamStatus判定，requiresManualReconnect在发起有效重连时重置；本次未把旧lastError用作已连接状态的阻塞门禁，未发现它在当前Worker成功恢复后制造错误可用状态或错误受限原因。后续可单独统一“已验证恢复清旧错”的兼容语义，不将未成功尝试当成功；此建议不能豁免17.3已证实的paused/connecting错误归因。

### 17.6 验证完整性、旧失败与续接

12条required均complete=true/status=passed/exitCode=0；原始日志与索引引用均一致。logs/110-compile-r2final2.log、113-build-r2final2.log及115-package-r2final2.log记录node-c两项gate exit=0；build overall=passed files=228，package overall=passed files=238，maxObservedConcurrent=1。logs/114-dual-gate-r2final2.log的vm.Script exit=0、10890 src/dist=0、固定127.0.0.1:18765 src=0；该日志还保留一次自查命令被多层引号损坏的SyntaxError，之后脚本文件机械修正的backslash_check_exit=0、片段反斜杠0及中文/身份guard检查成立。不是把失败命令改记通过；最终语法/自查门禁有效。

logs/112-8为12/12，112-11为16/16；112-61实际内联脚本2/2，112-7 GPU夹具6/6。部分required仍引用未失效的98日志，受影响项另有112本轮实际重跑，不虚构全部索引字段都换成新日志。116串行汇总为69文件、67个exit0、2个exit1，逐项真实退出码可查，旧失败仍为factories行数与distributedRerun文案，沿用已核基线分类、非阻塞；历史租约/基线GPU探针failed记录也未被改为通过。GPU夹具口径结论沿用15.4，不新增治理要求。

**登记验证真实有效，但17.3状态组合尚缺，12项required通过不等于B1整体关闭。** 字节/费用节省率仍未实测、待确认，不作通过证据，不列门槛。此前非阻塞建议保持原分类，不自动扩为本轮TODO；本轮新增非阻塞建议1条见17.5。

原实施者同副本只续接17.3，补相关组合断言、必要编译/模板门禁、按影响验证与新候选包/索引后再补审。当前Release与本机安装继续暂停，不宣布最终交付完成。


## 18. r2-final-3 返修完成记录（worker，2026-10-28；不改 §17 的审核指导）

### 18.1 §17.3 必改项处置（已实现）

- 认领条件按 §17.3 通过条件补全，判定集中在 `src/tunnel/RealtimeTunnelClient.legacy.ts` 的 `markDisplayAutoClosed()`：`connecting`（握手从未完成，从未成功过）一律拒绝；`lastError`/`requiresManualReconnect` 仍在时，只有"之后真的成功过一轮且流仍活着"才允许认领（暂停不算恢复证据）；完全无故障证据时，关掉活的或暂停中的展示通道、或从未打开过通道，才算策略主动关闭。被拒绝的认领同时把 `displayAutoClosed` 写回 false，不遗留错误的 true。
- 成功证据由新字段 `verifiedDisplayRound` 表示，只在三处真实成功点写入（WebSocket `onopen`、SSE 建立、快照被接受），在真实断连与除 `display-auto`/`paused` 之外的关闭方式清零；`startPolling`（快照尚未成功）刻意不写。没有把所有非 disconnected 视为健康，也没有用恢复 A 类自动请求探活求绿。
- §17.3 列出的两条可达路径分别有真实组合断言覆盖（真实 client + 真实 aggregator + 抽取的真实宿主方法，逐步断言归因与宿主可用判定，序列见 evidence.md §19.2）：软/硬错→paused→重复策略→resume/ensure 仍正确报错；软错→connecting→再开低流量仍保留未恢复错误；无错纯主动关流仍无假离线（含健康暂停后再应用策略的反证）。正常模式的节奏与行为未改（`updateRefreshPolicy` 的恢复正常分支、原有节奏常量都未动）。

### 18.2 本轮 TODO 状态

| 项目 | 状态 | 依据 |
| --- | --- | --- |
| §17.3 认领条件补全（paused / 未完成 connecting / lastError / requiresManualReconnect 一律拒绝改写） | 已完成 | 代码见上；`test/features/lowTrafficDisplayRework.test.js` 15/15 通过，exit=0 |
| §17.3 要求的连续组合断言（只增不减） | 已完成，12 项 → 15 项，原 12 项一条未减 | `logs/121-2-lowTrafficDisplayRework-r2final3.log`；两次重复运行 `logs/121-3-rework-repeat{1,2}.log` 均 exit=0 |
| §17.4 B2 | 本轮未触碰，保持已关闭状态 | `panelLowTrafficModePolicy` 16/16 重跑通过 |
| §17.5 lastError 泛用非 telemetry 旧路径治理 | 按主控指令本轮不动，仍为非阻塞建议 | 未改 `:691`/`:711-716` 分支语义 |
| §17.6 验证完整性 | 已完成本轮真实验证：compile/build 双 `node -c`、`vm.Script`、裸反斜杠自查、`grep 10890`=0、固定端点=0、69 文件串行回归、重新打包 | evidence.md §19.3 的日志与真实退出码 |
| 版本 / 打包 / 发行 / 合并 | 版本保持 0.5.422；已重新 `npm run package`（新指纹），未 install:latest、未发 Release、未合并 | evidence.md §19.3 |

### 18.3 遗留（不冒充通过）

- 串行回归仍有 2 条已登记的基线既有失败（行数门、GitHub 发布文案），本轮退出码与原因逐字记录，未改生产代码规避。
- 字节/费用节省率仍未实测；本轮不新增任何阈值或门槛。
- 远端发行与本机安装保持暂停，最终交付由主控确认。

## 19. r2-final-4 第四轮最终审核结论（GPT reviewer，2026-10-28）

### 19.1 结论与身份

**仍需返修，必须返修1项：新markDisplayAutoClosed在“成功活流但lastError仍非空”分支不幂等，同一关闭会因重复策略从主动关闭变成假离线。** §17.3原来的paused/未成功connecting绕过已修复；B2保持关闭，但不能因此批准整体候选。当前不能按长期授权合并PR #25、发行或安装本次0.5.422。本轮只追加本章，未改源码、测试、版本、Git索引，未运行新测试、构建、打包或外部服务器操作；本人审核阶段完成，返修耗时暂无法可靠估算。

- 实际HEAD **ca130b164227668e2da8eab9dfeba71c42c82d0f**，基线7a6062fa10441cc5852166a34138781a2604d9e9至HEAD为10个提交；增量9c153ed7实现与ca130b16登记符合本轮范围。
- 索引SHA256 **1e95fd33bb4bdc01def2062ed51e94f383f2208a1c3e74f3cab433e087a69b7a**；29个candidate.files、6个artifacts、23条checks。全部96条带path/sha256的引用核验相符，核验前工作区干净。package.json/package-lock.json均0.5.422；VSIX **2689768字节**，SHA256 **dc682f25bc2fb30083e9aa2dc61f15a2162894771d9e3dada0a3919b2db06758**，包登记与实际字节一致。
- 身份/增量核验exit=0原始日志：host-native/diagnostics/host-windows/27ad43b7-04cf-4378-be16-7c4d6511015e-stdout.log；已有门禁/重复运行摘要读取exit=0：同目录afbefc43-d445-4096-8541-502c90dada49-stdout.log。本轮未重新查询远端PR、Latest或安装状态，不把交审OPEN/MERGEABLE当本轮远端实测。
- 追加本章后plan指纹变化，主控须更新handoff该项；96条全匹配只指追加前冻结候选，不适用于追加后的原索引。

### 19.2 §17.3已修复部分与新回归（必须返修 / high / 1项）

位置：src/tunnel/RealtimeTunnelClient.legacy.ts:494–503（特别:499–501）、:194–205 disconnect、:523–535重复updateRefreshPolicy；真实Worker软错误入口:724–729；宿主ensureRealtimeConnected的connect/diagnostics/applyTrafficScheduling链见src/extension/legacy.ts:5605–5642。

本轮显式成功字段在真实WS onopen（实际:591）、SSE建立（:630）、成功接受snapshot（:737）写入；connectionLost与非paused/display-auto关闭清零。现有新增组合断言能证明软/硬故障→paused、故障→未完成connecting不再被重认领；未成功startPolling不写成功字段也正确。无错暂停后主动关闭不伪造离线。上述原缺口已关闭。

**但helper新增的有错误分支，既允许在live+verified时认领，又在关流后的下一次相同调用中撤销认领。** 静态确定的状态表如下（期间没有任何新连接故障）：

| 步骤 | status | lastError | verifiedDisplayRound | helper写displayAutoClosed |
| --- | --- | --- | --- | --- |
| 有真实成功证据的活流，存在未清的错误/警告 | sse或websocket | 非空 | true | 尚未调用 |
| 开启低流量，disconnect("display-auto")进入helper | live=true | 同一非空值 | true | **true** |
| disconnect结束，只因策略变成disconnected | disconnected | 同一非空值 | true（刻意保留） | true |
| 再次同policy或connect低流量早退，重新进入helper | live=false | 同一非空值 | true | **false** |

最后一步是:501的live && verifiedDisplayRound直接赋值导致，不是新故障证据；所有端点相同时，聚合displayAutoClosed从true变false，宿主下一次ensure据此报tunnel_unavailable，可能制造local_port_closed。重复策略在宿主多入口必定可用，不是未来假设。

这不只涉及§17.5已排除的泛用非telemetry旧路径：**真实Worker活跃SSE/WS建立后verified=true，某次GPU快照软失败会走:729，仅写“遥测查询待核实：...”而明确不关闭独立活流，也不撤销verified。** 此时点击低流量即进入上表；第一次合法主动关流到第二次收敛之间没有新端口失败，却变为离线。反过来，verified布尔值只表示该连接曾成功，不能证明成功发生在lastError之后；本次“有错但verified即已恢复”的条件也不能自动视为更新成功证据。不应通过清掉真实快照错误文本求幂等。

新增15项测试（含两次重复）都未触达live=true、verified=true、lastError非空的新增分支：故障序列在connectionLost后verified已清零，恢复仍是只计数stub；反证序列完全没有lastError。重复执行这些用例不能覆盖上述状态。

通过条件：对同一真实关闭原因重复policy/connect必须幂等；只有新的真实故障证据才能把合法主动关闭改成故障归因，只有相对该故障更新的实际成功证据才可解除真实故障。保留Worker软遥测失败的真实提示，但不能把仍可用的独立流被策略关掉解释成端口关闭；不得恢复A类自动请求来探活或无条件清lastError。补真实client/aggregator/宿主序列：实际流成功→快照软失败仍保持流→开启低流量→重复同policy/connect/ensure，逐步核对归因不凭空翻转、无假离线；同时保留真实软/硬故障、paused、connecting原组合。实现可复用现有关闭原因/成功证据，不要求治理整个泛用连接层或扩大协议。

### 19.3 合法恢复、暂停与既有残留定性

正常Worker成功snapshot仍在:744附近清lastError，下一次纯策略关闭可稳定认领；paused本身不证明故障恢复，现新条件在有错且非live时拒绝并写false符合§17.3。B2及正常模式原节奏本轮未改，未发现其新增问题。问题集中在19.2的有错活流关闭后重复应用，不要求为未成功连接假报在线。

§17.5泛用非telemetry成功后未统一清lastError的全局治理仍是非阻塞建议，本轮保留1条、没有新增非阻塞建议；不要求借本任务重构全部清错策略。**本轮新helper直接读取lastError并影响归因的实际Worker回归则是必改，不能套用旧路径非阻塞结论放过。** 先前工作流登记/历史技术债建议保持原分类，不自动扩大本轮TODO。

### 19.4 必需验证真实性与续接

12条required全部complete=true/status=passed/exitCode=0，原始日志和输入引用指纹相符。logs/120-compile-r2final3.log、124-build-r2final3.log、126-package-r2final3.log均有node-c两个gate exit=0；build overall=passed files=228，package overall=passed files=238、maxObservedConcurrent=1。logs/125-dual-gate-r2final3.log记录vm_script_ok、内层片段反斜杠0、中文/身份guard自查、10890 src/dist=0及固定127.0.0.1:18765 src=0；本轮PanelHtml未改，实际内联脚本122-61仍2/2通过，不拿模块语法检查代替内联检查。

logs/121-2返修15/15、121-3两次重复各15/15，122-11策略16/16；123串行回归69文件记录67个exit0、2个exit1，仍为已核基线行数门和GitHub阶段文案失败，不放宽门禁、不要求治理无变化历史问题。23条checks中历史失败按原分类保留，未将failed伪装成passed。字节/费用节省率仍未实测，不能作通过证据，也不是门槛。

验证真实与19.2缺失行为覆盖须分开。原实施者同副本续接这一组必改，冻结后补相关真实断言、必要门禁及与源码一致的新VSIX/索引，再增量补审。当前不合并、不发稳定Release、不执行install:latest；最终交付仍由主控确认。

## 20. 展示主动关闭认领判定的完整决策表（GPT规划，2026-10-28）

### 20.1 固定范围与统一语义

本节一次性替代§17.3、§19.2中零散的helper分支建议，作为同一B1必改项的完整实现/验收契约，不覆盖历史记录。本节不是通过结论：当前候选仍未获准合并/发行。本轮仅追加计划，没有修改实现、测试、版本或Git索引，也没有执行测试。

**核心决定：关闭归因只由“本次关闭原因 + 尚未解除的真实传输/硬故障”决定，不由关闭前后status或lastError字符串是否为空决定。** 软展示查询错误必须保留，但不是独立活流断线证据；无错误的未完成握手被用户模式取消，也不是网络故障。认领只解释为何没有展示通道，绝不证明服务器在线、健康检查通过或任务完成。

为此允许在现有client内最小增加/调整内存归因字段，区分故障来源与先后顺序；不能只在当前布尔表达式上继续加status分支。不得引入额外远端探活、科研环境检查、请求配额、协议或持久化状态文件。正常模式既有网络行为不变；本节只约束展示关闭归因与与其直接相关的假离线抑制。

### 20.2 全部输入维度、取值及有效集合

| 输入 | 取值与含义 | 对判定的约束 |
| --- | --- | --- |
| endpoint/clientGeneration | 当前精确端点与client连接代际；当前/已失效 | 旧代际回调不得改当前归因 |
| K：本次操作 | passive（只查询/正常策略无关闭动作）；close（显式处理关闭）；stale（失效回调） | passive/stale不做新认领，不得顺便改归因 |
| G：展示闸门 | enabled/disabled（displayAutoRefresh true/false） | close(display-auto)只在disabled有效；enabled时请求该原因按passive处理，不伪造一次关闭 |
| S：连接状态 | D=disconnected；C=connecting；P=paused；E=已建立websocket/sse；Q=polling | 不把Q（正在等首个snapshot）当成功；E区分WS/SSE实现但归因规则相同 |
| V：verifiedDisplayRound | false/true | 只是成功证据输入，不单独说明成功晚于故障；不得用live && V决定关闭归因 |
| successRelation | none；beforeFault；afterFault（含成功类别、端点、代际及顺序） | 只有同身份、能验证对应失败通道且更晚的成功才能解除该故障 |
| L：lastError | empty/nonempty；文本原样保留 | 文本不是故障分类器，不解析中文/英文字符串判定来源 |
| M：requiresManualReconnect | false/true | true优先归为硬故障，绝不能因普通展示成功或策略切换自动解除 |
| evidenceOrigin | none；soft-display；transport；hard；resolved-history；unknown | 来自实际写错/成功入口，不从S、V、L倒猜 |
| faultPending | none；transport；hard（独立于最后一条文本） | 后来的软提示或清文本不能抹掉尚未解除的真实故障 |
| T：策略调用类型 | 首次初始化到低流量；真实正常→低流量转移；同策略重复应用 | 前两者合为表中“新应用”，第三者为“重复”；状态查询不算策略应用 |
| I：是否首次关流 | 当前client生命周期从未处理过display-auto / 已处理过 | 两者均覆盖；首次初始化可以就是同策略重复调用，不能把T和I强行等同 |
| R：本次关闭原因 | display-auto；paused；other（manual/reconnect/dispose/deactivate等原原因） | 一次调用只能有一个原因；原因不等于传输健康 |
| C：上次关闭原因 | none/display-auto/paused/other | 记录精确原因；不能由当前disconnected反推；最新真实故障撤销旧display-auto解释 |
| A：原displayAutoClosed | false/true | 必须覆盖两个原值，包括错误遗留true；不能靠初始值碰巧正确 |
| budget/用户全暂停 | paused/not-paused | 不新增联网，不改变预算；全暂停时不发布网络不可用，故障证据仍保留到恢复后 |

有效集合用有限枚举的**笛卡尔积 + 下列约束**定义，不暗留“其它分支”：
1. S的WS/SSE合为E但至少各有一条真实入口轨迹；C必须覆盖V=false和V=true（Worker快照可在WS onopen前先成功），Q也必须覆盖V=false/true，P/D同样两值。不能以“connecting从未成功”排除C,V=true。
2. 当前原生入口稳定状态中E,V=false以及M=true且S为C/E/Q一般不能由正常成功回调产生，但本轮**统一列为必须覆盖的保守输入**，不借“不可达”删除；结果仍由下表决定。M=true无论其它字段如何都不得认领。
3. “原因同时是paused和display-auto”“一个枚举同时取两个值”“同一回调既当前又失效”是定义矛盾，排除；拆成按实际顺序的两个事件，而不是生成一行。T只有一个值；I不与T绑定。successRelation=afterFault必须有匹配身份/类别的真实成功事件，否则归入unknown，不能自证成功。
4. K=close、R=display-auto、G=enabled这一矛盾请求归一化成passive；stale优先于所有其它输入。disposed旧实例回调按stale，不作为活动client的第六个状态。
5. 除上述定义矛盾，所有枚举组合均落入下表的全称通配范围，**不得再以未经证实的不可达为理由漏测**。本节不存在需留待下一轮猜测的状态组合。

### 20.3 故障证据归一化表（8行，按优先顺序；输出F）

F只取N（无未解除故障，可含已解除历史文本）、W（仅软展示错误）、T（未解除传输错误）、H（未解除硬错）。先按20.5的事件规则更新证据，再按本表分类。表内“任意”涵盖20.2有效集合全部剩余取值。

| 行 | 有效输入条件（排除更高优先行） | F | 必须保留内容 |
| --- | --- | --- | --- |
| N01 | M=true，不论L/V/S及其它证据 | H | 硬错与人工重连限制，不能认领主动关流 |
| N02 | M=false，但faultPending=hard且尚无获授权、匹配的新成功 | H | 硬错归因；开始重连不算解除 |
| N03 | faultPending=transport，L=nonempty | T | 传输故障，后续软提示覆盖文本也不能改分类 |
| N04 | faultPending=transport，L=empty | T | 清空文本不等于修复故障 |
| N05 | 无H/T，L=nonempty且来源unknown/none/未标注，或被标作transport/hard/resolved-history但无匹配解除证据；明确soft-display除外 | T | 明确记“连接证据未知”，保守不认领；不能展示为已验证端口关闭 |
| N06 | 无H/T，仅soft-display错误（L可空或非空） | W | 原软错误/未检查提示；不升级成端口关闭 |
| N07 | 无H/T/W，L=nonempty，且只是已由匹配新成功解除的历史文本 | N | 可保留历史诊断；不再作为当前故障门禁 |
| N08 | 无H/T/W，L=empty | N | 未探测仍未探测，不能发明在线证据 |

N05不是未来兼容功能：现有lastError多入口写入必须逐一标注来源；setHidden连接失败catch、connect的WS/SSE fallback错误、ws.onerror、journal-gap snapshot失败等不能遗漏。实现应让当前正常入口进入N01–N04/N06–N08；N05作为来源确实缺失时的显式未知边界必须断言，不允许静默归为健康。不得只靠清L使N05变N08而丢掉未知归因，应将其保留为faultPending，直到匹配成功或明确确认它只是软展示问题。

### 20.4 关闭动作决策表（18行，互斥且穷尽）

每行S/V/L/M/I/C/A均取20.2有效集合中**与归一化F一致的全部值**；G、代际和K先按20.2归一化。列“写回”表示把A及原因收敛为确定值；若值已相同可物理跳过赋值，但不能漏做结果/故障断言。除stale外，错误文本不能被本判定清除。

发布列是**由本次归因允许新增/保持的宿主错误**，不是承诺健康：不得伪造在线、checkedAt或local_port_closed。全暂停时一律不新发tunnel_unavailable；暂停解除后仍按保留故障重新判断。聚合规则见20.6。

| 行 | K / R / T | F | A结果 | 认领本次展示关闭 | 写回/原因 | 故障归因 | tunnel_unavailable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A01 | stale，任意R/T | 任意 | 保持 | 否 | 不写 | 当前全部保持 | 不因旧回调新增/撤销 |
| A02 | passive，任意R/T | 任意 | 保持 | 否 | 不写 | 全部保持 | 沿原正常/暂停规则；不由本判定增删 |
| A03 | close / paused | N | false | 否 | 写false，原因paused | 未探测不改为通过 | 否（本次是用户暂停） |
| A04 | close / paused | W | false | 否 | 同上 | 保留软错误 | 否 |
| A05 | close / paused | T | false | 否 | 同上 | 保留传输错误 | 暂停期间否，恢复后可报真实错误 |
| A06 | close / paused | H | false | 否 | 同上 | 保留硬错/限制 | 暂停期间否，恢复后可报真实错误 |
| A07 | close / other | N | false | 否 | 写false，原因other | 无新故障 | 正常模式沿原规则；不能称已验证端口故障 |
| A08 | close / other | W | false | 否 | 同上 | 保留软错误 | 正常模式沿原规则，不能由W证明端口故障 |
| A09 | close / other | T | false | 否 | 同上 | 保留传输错误 | 可（活动当前端点确实不可用时；N05显示未知） |
| A10 | close / other | H | false | 否 | 同上 | 保留硬错/限制 | 可（不能将401解释为已证实端口关闭） |
| A11 | close / display-auto / 新应用 | N | true | 是 | 写true，原因display-auto | 保持未探测/历史事实 | 否 |
| A12 | close / display-auto / 新应用 | W | true | 是 | 同上 | **保留软错误** | **否** |
| A13 | close / display-auto / 新应用 | T | false | 否 | 写false；不得用display-auto覆盖故障原因 | **保留传输错误** | 可；N05只能报连接未知，不声称已检查端口关闭 |
| A14 | close / display-auto / 新应用 | H | false | 否 | 同上 | 保留硬错/限制 | 可；保持真实认证/配置原因 |
| A15 | close / display-auto / 同策略重复 | N | true | 是（重申同一原因，不是新故障/新请求） | 同A11 | 保持 | 否 |
| A16 | close / display-auto / 同策略重复 | W | true | 是（同上） | **同A12，不能因S变D改false** | **保留软错误** | **否** |
| A17 | close / display-auto / 同策略重复 | T | false | 否 | 同A13；纠正遗留true | 保留传输错误 | 同A13 |
| A18 | close / display-auto / 同策略重复 | H | false | 否 | 同A14；纠正遗留true | 保留硬错/限制 | 同A14 |

“新应用”包括初始化低流量与真实正常→低流量转移；须分别实例化。A13/A17必须覆盖首次关流I=true和I=false；A11/A15同样覆盖，不能用“不是第一次”维持错误true。C和A错误遗留也必须按本表纠正。由此“首次认领”和“同策略重复”不再有不同的健康推理。

### 20.5 事件更新与参考判定（不新增网络）

归因的事件来源必须闭合，不能把顺序语义藏进verified布尔值：
- 当前代际connectionLost、真实握手/stream故障、ws.onerror且尚无更新的有效恢复证据：置相应T/H，撤销旧display-auto归因。硬错误保留人工重连限制。**pause、切策略、disconnect均不是恢复事件。**
- 独立活流保持建立时GPU快照/展示查询软失败：记W并保留真实提示，不置T，不撤销合法主动关闭原因；若此前已有T/H则仍为T/H，不能被W覆盖。
- 当前代际、匹配失败类别的实际WS/SSE建立，或polling对应snapshot被接受：才可解除被其证明恢复的T。成功早于故障、仅startPolling、仅connect调用/计数、排入队列、旧回调都不算。HTTP展示快照成功不自动证明另一个WS通道故障已恢复；记录最小source/序号或等价因果状态即可。
- H只能在既有显式人工重连/重新检测流程授权后，由匹配的新成功解除；本地提前把M=false不等于清H。不能为本功能自动重连硬故障。
- verifiedDisplayRound仍可供诊断/成功证据使用；其true只有连同身份、类别和先后关系才能说明恢复。无须给所有操作新增独立历史账本，只存当前未解除故障与最近相关成功的最小证据。
- 新实例明确初始化无继承故障，不把另一个client/Worker的成功复制过来。源码中所有lastError写入口须对照这四种来源作一次清单；没有来源的值按N05，不新增解析文本的兜底。
- 低流量下允许用户主动的真实手动刷新；其成功仅解除自己确实验证的故障，不借机创建展示自动流或把未知标在线。

参考伪代码（唯一认领式；evidenceReducer按上述事件语义执行，测试必须同时覆盖reducer和调用链）：

    function decide(input, previous):
        if input.isStale:
            return KEEP_ALL
        if input.kind == passive or
           (input.reason == displayAuto and input.displayAutoRefresh == true):
            return KEEP_ALL
        F = classifyCurrentEvidence(input)  // N01..N08，已处理当前事件，非解析lastError
        claim = (input.reason == displayAuto) and (F == N or F == W)
        return { displayAutoClosed: claim,
                 closureReason: claim ? displayAuto : actualNonDisplayOrFaultReason(input),
                 preserveFaultAndWarning: true,
                 noNewNetwork: true }

其中actualNonDisplayOrFaultReason：R=paused/other记录原原因；R=display-auto但F=T/H保留原fault/unknown原因，不把错误close原因改写成display-auto。A01/A02不调用此函数产生写回。paused/other允许保留独立故障字段，不能只有一个互相覆盖的reason字符串。

**幂等性：同一身份、原因及未解除证据下，f(f(x))=f(x)；策略关流导致S由E/C/Q/P变D不算新故障，也不改变F。** 首轮A12到重复A16永远true，N也同理；T/H首轮及重复永远false。仅新故障/匹配恢复、明确新关闭原因或代际变化才能改变结论。无新事件时重复调用不得改变错误文本、M、证据时间或重新发请求。

### 20.6 宿主汇总/错误呈现的有限配套边界

单client表不能被宿主“全disconnected就端口关闭”重新推翻：
1. 全部当前启用端点为A11/A12/A15/A16：禁止由展示通道状态新增tunnel_unavailable/local_port_closed，也不得生成在线状态。
2. 端点为T/H且无可用传输，保留真实错误（认证错仍是认证错，未知仍是未知）；另一健康/策略关闭端点不能吞掉它。多Worker混合状态必须保留逐端点故障，不要求为一个故障把所有Worker报离线。
3. 全暂停/用户paused只展示暂停和已有诊断，不把暂停自身报网络断线；resume不是恢复证明，恢复后T/H仍按表上报。不得因budget暂停早退清掉故障。
4. 正常模式无display-auto请求时不由本功能改写原有连接节奏、任务接口、同步或整体健康状态；本次只修与主动关流有关的错误归因。不能据此改掉其它独立错误/安全校验。

### 20.7 穷尽性与实施验收（本次固定，不再猜分支）

**表的穷尽口径是8行证据归一化 × 18行动作分区的组合有效域，而非只测试26个幸运样例。** 每个原始有效输入先唯一命中N01–N08，再唯一命中A01–A18；passive/stale无须重新分类也不能漏保留证据。所有“任意”是全称量词，不是实施者自由挑一个代表。用纯内存表驱动生成20.2有限取值，过滤仅限其明确的定义矛盾；对每个有效向量断言输出、认领、写回/保持、故障、发布许可，并重复一次断言幂等。可按等价类压缩重复fixture，但必须报告被覆盖的维度取值集合/笛卡尔积映射，不能只给26行各一个值却声称全组合。

最低登记是**26个逐行表驱动用例（N01–N08、A01–A18，每行至少一个非空断言集合）+ 以下10条连续调用链**；通配值展开产生的额外实例也必须执行。这个数量来自本契约的语义分区，不是新增性能/覆盖率百分比门槛，不能通过改数字免测。保留原15项相关断言，等价参数化可以合并进程，不删除其语义。

连续链至少：
1. 真实Worker SSE成功→GPU快照软失败、独立流仍活→首次低流量→重复policy/connect/ensure，A12→A16，无假离线且软提示保留。
2. 同1的WS成功路径，确认onopen与旧代际onopen不能交叉写证据。
3. polling首snapshot尚未成功→被模式取消且无故障，N/A11→A15，不把取消报故障；另加snapshot真实失败反证进入T。
4. 真实软传输断连→paused→重复策略→resume，A05/A13/A17，不能因暂停/恢复消除T。
5. 真实硬错（401）→同4，M/H保持；普通snapshot/同策略不能解除限制。
6. 真实失败→恢复握手尚未完成→再开低流量，T保持；反证：无故障的C,V=false及C,V=true取消均不能发明离线。
7. 错误之后匹配新成功→再低流量，N或W稳定true；反证：错误之前的成功及其它端点/代际成功均不能清T/H。
8. 合法策略关闭后新真实故障→重复策略，true必须转false；没有新故障时不得转false。清L但faultPending仍在也不得转true。
9. 两Worker：一个纯策略关闭、另一个T/H；逐端点真实错误保留、不串成功证据、不把全部展示关流报成全部端口关闭。
10. 重复调用、无效的display-auto+正常G、旧回调/已销毁client、用户全暂停及resume先后；无新网络、无越代写回，正常模式原调用轨迹保留。

本表列出的当前入口、分类及混合组合就是本次归因功能验收范围。实现与表不一致须返修；之后不能只凭“还可能有其它status分支”扩充门槛。若后续证据确实证明本节未枚举的新外部协议/新状态/新故障来源，必须先标明它不在本次封闭模型中、给出现实可达证据并交主控决定范围，而不是静默增补分支测试。当前已知范围没有残留未知：远端错误内容不确定但已由来源分类/unknown覆盖；网络延迟与回调任意顺序由代际及事件顺序覆盖，不需要收费服务器或压测。

### 20.8 与历史结论的对应及交接停止条件

- §17.3的“有故障paused/未完成connecting不能认领”由N01–N05+A05/A06/A13/A14/A17/A18及连续链4–7接管，保留故障这一结论不变。
- **取代其过宽说法**：“connecting一律拒绝”仅适用于有未解除故障；没有故障、纯因模式取消握手按A11/A15，不得制造离线。“paused一律拒绝”同样不是完整规则，无故障时按A11/A15，预算暂停仍不联网。
- §19.2的“成功活流+非空lastError”必须拆成来源：仅W或已解除历史文本按A12/A16或A11/A15；未解除T/H按A13/A17或A14/A18。非空字符串与V=true不再直接决定健康，首轮/重复分支不得相反。
- §17.5全局泛用lastError清理仍不是本任务重构目标；但它与本判定交汇的历史文本按N07/unknown按N05已完整覆盖，不能再以旧建议豁免本表。
- B2、A展示自动请求为0、B/C任务正确性、同步/结果收集、停止/清理安全、正常模式默认和原节奏均沿原契约；本节不重开这些已关闭问题。
- 实施者按本节一次完成归因证据/reducer、认领函数和表驱动断言，冻结后按实际影响验证、必要编译/模板门禁、打包并更新handoff。只汇报表行覆盖、真实失败与产物身份，不再请求GPT逐分支猜测。未通过前仍不合并/发行/安装。计划新增后更新plan指纹由主控/实施者在交审登记时办理，本规划阶段不改索引或Git状态。

## 21. 承接实施状态（2026-10-28，原 GPT 指导不变）

| 项目 | 当前状态 | 证据 / 剩余 |
| --- | --- | --- |
| 已验证原候选 | c08b49a7 已提交并普通推送，fetch核实相等 | 0.5.422；205 build228 / 202 package238、双node-c、201 vm、230/231包门禁、235/240预检通过；旧失败保留 |
| 用户新增授权 | 允许合入最新master、改0.5.424继续交付 | 原“保持0.5.422”已被本次明确答复替代；禁止降级Latest继续有效 |
| 固定祖先 / 整合基线 | 原始7a6062fa不改；本轮合入7d2fbc6c | PR26现有master，Latest0.5.423；243重新fetch确认，v0.5.424尚不存在；不是重新创建副本或改写历史 |
| 合并冲突 | 内容已解决，merge commit待验证后提交 | 版本改424；生成文件由247 compile重建；测试scratch场景保留本任务字节断言及新主线拆组；源Panel自动合并保留双方逻辑 |
| 本机依赖 | 任务目录独立锁定依赖已安装 | 原junction仅重命名保留在本树ignored cache，目标主仓未变；245/246证据；qs6.17.0与新lock一致，ignore-scripts，无主仓写入 |
| §20实现 / 覆盖 | 保留c08完整表驱动实现，待整合后重验 | N8/A18、kernel746496 / 映射8957952 / 10链 / 原15项均保留；未加性能阈值 |
| 当前版本 / 编译 | 0.5.424，247 compile passed | package/lock/runtime源同步，双node-c通过；生成脚本重算py与清单 |
| 必需验证 | 17个目标文件与259完整build通过 | 248 Git36/36；249–258及269–274均exit0；259作业265/去重文件228全部passed、exit0、566664ms；261 vm exit0、262端点零命中 |
| PR / 终审 / 发行 / 安装 | PR25；本轮自动验证与实包全部通过，待预检/提交/第五轮终审 | 259 build265作业 / 260 package304作业均exit0；261 vm、262端点、263身份/308文件字节匹配、264/265内容与闭包均通过；未合并PR、发行、安装或同步主仓 |

当前 TODO：刷新已完成全部验证的索引指纹并只读预检ok:true → scoped合并提交并普通push任务分支、fetch核实 → GPT openai/gpt-6.1-sol medium第五轮终审（正文含索引marker及三条原始要求）。只有新实际候选终审通过后才连续合并PR、重新fetch确认merge commit进master、稳定Release与逐包checksum、真实Latest复核、同版本至多一次install:latest、通知用户Developer: Reload Window，再仓库外备份并快进同步主线基准。

历史口径保留：151/176整文件20秒看门狗终止与旧TMP碰撞均不通过；用户随后明确授权按原用例限时，183完整26/26通过。184准备成本失败、199/225表内反证失败均保留，后续通过不改旧记录。新主线已把C5等复合用例拆组，并由执行器统一20000ms，本轮仅合入其已批准状态，不改任何仓库阈值；外层总保护仍只取当前冻结文件原用例预算之和。真实流量字节和费用仍待实测，不作已验证结论。原GPT§20全文保持不变。

交审冻结后的操作状态以仓库外 D:/GitRepo/MCP/.agent-evidence/low-traffic-mode-20261028/delivery-0.5.424.json 为权威输出；实际候选SHA与后续命令原日志同处保留，不在终审后反写已冻结源索引。证据见evidence§20.18。
