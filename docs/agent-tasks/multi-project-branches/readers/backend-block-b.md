# 块B evidence：本机统一排队/一处同意派发 最小正确接入（reader=backend，2026-10-25，只读）

冻结身份：commit a9fc3d36…（tree 82e27df5…，rev-parse 实测一致），全部读自 /tmp/pi-reader-backend-a9/frozen（a9 导出副本，已校验 tree）。未读实现树变化文件。行号=a9。主控已读区（tick 12527/内存计数 12725/workers 12903/allocateAvailable 13099/save先于parallel send 13115）本轮已全文复核并补齐上下文。

## 1. 全部实际“新 command 发送”入口（穷举，含旁路）

host 侧唯一 transport 出口 = `sendDistributedJob`（legacy.ts:12402-12514）→ `client.postWorkerAction(workerId,"start-worker-task",request)`；protocol-2 直发（12495-12507：`transmissionStarted=true` 后 `void post…`，本地立即记 unknown 由查询核实）；旧 transport 走 `withRemoteActionResource(workerId,"start-worker-task",…)`（12483）。`sendDistributedJob` 调用者仅 4 处：

1. **tick 内 pinnedRetry**（legacy.ts:12767-12824）：`retryPinnedDispatch`（原 worker/gpu/commandId），门禁 `pinnedRetryPlanAllowed`（DPQ:1029，server_prequeue 需 localDispatchOverride===true 或有 localQueueOnly dispatching/unknown）；循环 save(12783)→send→回执核对→save(12822)。distributedLaunchInFlight 键控 `distributedJobControlKey`。
2. **tick 主分配（durable/protocol-2 路径）**（12916-13048）：workers 快照数组(12896-12915) → `localSchedulingQueue` 投影(12921) → `allocateAvailable(queue,workers,{requireIdleGpuAdmission:true,localIdleOnly:true})`(12923) → **save 先行**(12938) → `Promise.all` 并行 send(12955-13035)，回执按到达序串行提交（receiptCommits 链 12978-13032）。含 hosted retries 合并(12925-12931)。
3. **tick 旧兼容路径（非 durable 队列）**（13091-13159）：`allocateAvailable(queue,workers)` 无选项(13104) → save 先行(13110) → `Promise.all` launches(13115-13129) → 逐条 setJobState+save(13134-13158)。仅当 `durableQueue` 假（12711：无 projectId===canonical 的 plan 且无 recall）时到达。
4. **手动派发/服务器队列共用 ready 通道**：`dispatchReadyManualJobs`（ManualJobDispatch.ts:103-125）在 tick 头部条件调用（12537-12539）与 ServerQueueHost/ManualDispatchHost 的 ports.tick（ServerQueueHost:64、ManualDispatchHost:43）。其内逐 job：分配 `workerId/gpuId/commandId(=nextCommandId)`+status=dispatching+manualDispatch.stage="sent" → **save(120行注释“Persist exact identity before the one and only POST”)** → `ports.send`→ManualDispatchHost send→`sendDistributedJob`（ManualDispatchHost:42）→ 再 save。
5. **迁移/再分配（stop 释放后由下一次主分配重启）**（12826-12894）：`releaseQueuedForReassignment`+`reassignmentWorkerId`/`migrationReserved` 预留，不直接发 start。
6. **Worker 自治 drain（不经 host，不能由本机统一决策直接控制）**：Worker Agent durable queue processor（clusterAgentRuntime.legacy.ts:3828-3965 处理器、`DISTRIBUTED_GPU_RESERVATIONS` :282、`reserve_distributed_gpu` :4034-4103、`release_distributed_gpu_reservation` :4105）。仅启动**已被 host 提交且 worker 准入排队**的 job（server_prequeue 模式，schedulingMode 于 12463-12464 依 `manualDispatch.origin==="server_queue"` 判定）；其占位通过各队列文件 job 的 queued/starting/running 观察回到 host 视野（见 §3）。旧 worker 端整 Plan 调度（clusterSchedulerRuntime `wait_for_plan_queue`，AGENTS.md P0 节所述）为历史模式，不在 durable 流内。
   `allocateServerPrequeue`（DistributedSchedulingPolicy.ts:70-102）在 a9 host TS **无调用者**（grep 0）；服务器预排队现仅由显式按钮 ServerQueueHost.dispatch 产生（ServerQueueHost.ts:7 注释“explicit button…no PLAN-wide persistent prequeue switch”）。

结论：旁路=入口4（ready 通道与 tick 主分配并行但被 `manualDispatchInFlight` 与队列 CAS 围栏隔开）与入口6（worker 自治）。统一决策若只改 §1.2 的 allocator 会漏 1/3/4/6。

## 2. 提交前持久身份与 reconcile/释放边界（防孤儿）

- 身份字段（DistributedPlanQueue.ts QueuedJob:14-98）：`workerId/gpuId/commandId/runKey/attempt/startIntent{commandId,workerId,gpuId}/nextCommandId/manualDispatch{workerId,gpuId,stage,origin,batchId}/localQueueOnly/reassignmentWorkerId/lastDispatchAttemptAt/dispatchAcknowledgedAt`；plan 级 `projectId/revision/codeFingerprint`；`durableCommandId(plan,job,worker,gpu)`（:374）。
- 所有路径先 save 后 send；save 统一 `saveDistributedQueue`（legacy.ts:11567-…）：窗口内 `distributedQueueWritePromise` 串行 + `withQueueWriteResource`(11560-11566) = hostOperationLease（actionType "queue-write"，resource {server:"local",project:dirname,target:队列文件}，waitForConflict:true）+ **CAS**：`distributedQueueBaseSignature`（读盘 sha256，Symbol 附着 :158-172）不等当前盘签 → `conflict()`（11611-11614“另一窗口已更新该项目队列…”）；`mutateLatest` 在租约事务内重读最新并打补丁（11636-11649）——**跨窗口原子保存的原生原语**。generation 围栏 11576-11583（STALE_QUEUE_ROUND，500ms tick 自然重驱）。
- 队列文件=消费项目内 `simple_cluster/state/…/distributed-plan-queues/<projectStateId>.json`（distributedQueuePath :968-974，“Two windows share one queue per project, projects never share queue files”）。
- 发送失败释放：`dispatchNotSent`（transmissionStarted 前抛，12510-12512）→ `releaseUnsentDistributedJob`(12515-12526)→`resetUnsentDispatch`；`gpu_busy` 精确回执 → `resetBusyRejectedDispatch`（12794-12797/12997-13000）；preflight 拒 → `applyPreflightRejectedDispatch`；其余未核实 → status=unknown **保留原 worker/gpu/commandId 禁止重派**（13024-13026）。
- reconcile：`mergeDurableWorkerSnapshots` + `nativeStartProof` 粘性证明（QueuedJob:36-39）；`jobHasLiveExecution`（:925-934）精确定义占位：protocol-2 = startIntent 匹配且 status∈{dispatching,unknown,queued}，或 executionState∈{queued,starting,running}，或 unknown+查询错/tmux 证据，或 dispatching 未观察；executionState==="missing" 且无 statusQueryError → 不再占位（释放点）。legacy = status∈{dispatching,queued,running,unknown}。

## 3. 双计数/配额语义（gpuJobsPerCard、weights、queued/starting/unknown 占位）

两层视图，互不混用：
- **整卡占用视图**：`activeGpuReservations`（DPQ:937-945）——`occupiedGpuIds` 含任何 `jobHasLiveExecution` 且非 manualDispatch 的 (worker:gpu)；用于 `canReceive.freeGpuIds` 过滤(12755-12756)与 `workers[].idleGpuIds` 过滤(12912)。手动派发故意排除（UI 允许选忙卡“忙卡可用，允许多个 job 同时运行”，ManualDispatchHost:75）。
- **逐卡配额槽视图**：`quotaPlacement(rows, memoryCounts, policy)`（GpuQuotaScheduling.ts:59-86）——`remaining = gpuJobsPerCard(cardSettings 逐卡 override) − counts[gpu]`；`memoryCounts`（12731）**只计真正显存消费者**（`executionState!=="queued" && jobHasLiveExecution`）→ worker 端 queued（已准入未起）不占配额但占整卡视图；starting/running/占位中 unknown 计配额；`gpuMaxConcurrentCards` 上限只在此层生效（cap 分支 :74-79），`idleByWorker` 证据查询故意置 cap=undefined（12743-12745 注释）。
- **异步 RPC 前占位保留**：allocateAvailable 在**内存队列**里就把 job 置 dispatching+startIntent(1105-1110)，slot `shift()` 消费(1103)，同轮不重复取；12938 先落盘；下一 tick 由 occupiedGpuIds/counts 接管。RPC 并行期间回执提交链独立(12978)，不会二次占用。
- **不同 GPU 并行**：slots 展开为重复 gpuId 列表（quotaPlacement :81-83 先铺卡再填额），allocateAvailable 每 job `shift()` 一个槽（跨卡互不阻塞），Promise.all 各 job 独立 send；唯一跨 job 的排他=同 `distributedLaunchInFlight` key。
- **服务器队列 weights**：`serverQueueCards`+`quotaQueuePlacements`（ServerQueueDispatch.ts，全函数已核）：weights=逐卡 gpuJobsPerCard，与实时空闲无关（注释“independent of today's free slots”）；最大余数法保 1:6 比例；审核削减后**重算 distribution** 再 placement（ServerQueueHost:53-54），且提交时逐 job 复核 identity JSON 与 `remainingQueueJobs`（:57-61）。

## 4. 统一决策复用方案（不新造 Worker 锁；供 GPT 决策，非实施指令）

现成原语即满足“登记项目独立状态 + 决策期跨队列读取 + 原子保存”：
1. **租约**：`ResourceOperationLeaseManager`（ResourceOperationLease.ts:118-305）是**跨窗口（跨进程）bakery**：每窗口一个 registry 文件（`<leasePath>.resources-v2/sha256(owner).json`，ownership 双槽），admission（:205-240）票据全局排序，**临界区内 operation(rows) 能读所有窗口 registry**；冲突=同 server 且 target 嵌套（:52-58）；一次性持有多资源（record.resources 全列，无分步持有 → 无 hold-and-wait，无死锁）；waitForConflict 30s 上界；心跳/TTL/lost 证明齐备。`HostOperationLeaseManager` 继承之（HostOperationLease.legacy.ts:494-502）。
2. **最小接入**：新增一个“统一决策”动作 = `hostOperationLease.run({actionType:"unified-dispatch", resources:[各参与项目队列文件(target=path.dirname→file,server:"local")…]}, critical)`。持有多队列文件租约后：逐项目 `loadDistributedQueue`（各队列文件仍归各项目）→ 汇总 occupiedGpuIds/counts/GPU 快照 → 一次 `allocateAvailable`（每项目各调，workers 槽位从**全局** remaining 扣减——见缺口）→ 各项目结果经各自 `saveDistributedQueue(root,undefined,{controlMutation:true,mutateLatest})` CAS 落盘。决策完成后由各项目窗口原 500ms tick 照常 send（save-before-send 语义不变）或决策者直接按 §1 既有 send 路径发。
3. **为何不需要新平台/Worker 账本**：登记项目独立状态=现状；跨项目占位事实已经存在于各项目队列文件（§2/§3 语义原样复用）；跨窗口串行=bakery 租约+CAS。窗口发现可先用最小显式登记（如各项目 save 时已在 lease registry 留有 workspaceUri/hostProjectPath；或用户配置列表），不必新注册服务。
4. **旧入口处置**：全部保留。统一决策窗口应临时抑制自身自动分配（等价 `localDispatchOverride`/开关，最小=新设置位），其余窗口照常（它们对他人队列文件的写会被租约挡住到决策结束 ≤TTL 级，`waitForConflict` 已保证，但决策事务必须保持短，<1s 量级——这是主要风险点）；pinnedRetry/ready-manual/旧兼容块继续作为兜底旁路。

## 5. 服务器预排队与本机统一派发并存的最小兼容

- 现状不冲突：prequeue 仅显式按钮产生；被派 job 变 manualDispatch(stage ready→sent)+localQueueOnly，host 不再为其分配槽（queued 后 occupiedGpuIds 计入）；worker drain 自启后续 job（§1.6），其占位经该 job 自身 queued/running 观察进入所在项目队列 → 统一决策读该队列即见，无需感知 worker 内部。
- 最小兼容规则（不删旧入口）：a) 统一决策沿用 `allocateAvailable` 的 localIdleOnly 语义（server_prequeue 且无 localDispatchOverride 的 pending 不本地分配——现被 `localSchedulingQueue`(DPQ policy:45-48) 全量投影为 override=true，**这是当前行为**，统一模式下若要保持“冻结在服务器队列”需给该投影加开关而非删按钮）；b) ServerQueueHost 的按钮提交仍是 mutateLatest CAS，与统一决策天然互斥（同队列文件租约）；c) `manualDispatchInFlight` 检查照抄（ServerQueueHost:18、tick 12309）。

## 6. 缺口/风险（供主控与块A协调者裁决）

- 缺口1：`allocateAvailable` 是**每项目队列内**分配器；统一决策需把多项目 pending 合并决策但**写回必须按项目分队列 CAS**——现函数签名可原样多次调用，但 worker 槽位 Map 若逐次独立调用会重复发同一槽。最小改法=调用方按项目顺序串行调用并在每项目分配后从共享 slots 中扣除已发槽（allocateAvailable 返回 dispatches 含 workerId/gpuId，外层扣除即可），或新增薄包装；**不改** allocateAvailable 本体语义。风险：与 A 块若同时动 legacy.ts tick 需协调文件重叠。
- 缺口2：跨窗口决策期间，他窗口 tick 也在写自己队列（CAS 拒旧基但**成功即改变占位**）——统一决策的读-算-写必须整体在租约临界区（§4.2），且发送前用 controlMutation mutateLatest 复核 pending 身份（仿 ServerQueueHost:57-58），失败即整批放弃重算。
- 风险3：30s admission/heartbeat 上界；决策事务超时=RESOURCE_CONFLICT 噪声而非损坏（conflict 只读盘发布快照，11611-11614 不写队列）。
- 风险4：入口6（worker drain）不受本机决策约束——若统一模式要求“一处同意才发”，server_prequeue 已准入 job 的 worker 自启属既有契约，不能靠本机改动取消；文档/交互需明示，不擅删。
- 风险5：`localSchedulingQueue` 当前把 server_prequeue 一律投影为本地可分配（policy:45-48），意味着“服务器预排队冻结”语义在 tick 主分配里已弱化；统一功能若依赖该语义，先与用户确认这是否预期，勿顺手改。

## 7. 准确已有测试域（a9 test/，改这些路径的回归清单）

distributedPlanQueue.test.js / distributedQueueStartup(+Mirrors/Recovery).test.js / distributedQueueCacheStability.test.js / idleGpuDurableDispatch.test.js / idleGpuDispatchLifecycle.integration.test.js / idleGpuDurableAdmission.test.js / manualJobDispatch.test.js / manualDispatchHost.test.js / manualTmuxAdmission.test.js / manualWorkerReassignment.test.js / dispatchGpuPreference / dispatchWake.test.js / serverQueueDispatch.test.js / serverQueueLifecycle.integration.test.js / gpuQuotaScheduling.test.js / gpuCardLimit / gpuMemoryScheduling.test.js / pairedUpdateLegacyLease.test.js / resourceMutationRouting.test.js / test/tunnel/hostOperationLeaseIntegration.test.js / test/agent/planQueue.test.js / serverPlanQueue.test.js / durablePlanQueue.test.js / prequeueRecall.test.js。AGENTS.md P0 测试红线（禁整包 import cluster_agent/scheduler、单文件 node --test 等）对新增测试同样生效。

## 8. 剩余未知

- Worker 端“queued→自启”的准入等待时长/公平性参数在 runtime python 内（:3828-3965 只核了占位与释放结构），未逐行核；不影响本机统一决策方案成立性。
- 已安装 409 与实际 Worker 行为未取证（原片段§8 同）。
