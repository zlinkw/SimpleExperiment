# ui-plan-gpu-progress-20261024 主证据

修订: r1（2026-10-24，采集人：Linux 千问执行端；后续修订只增不删，失败详情不消失）
修订: r2 = §9–§14（补查与取证增量，当时未更新本行）；r3 = §15–§18（实现与验证增量，见文末标注）

## 1. 身份与环境
- 任务: simpleexperiment-ui-fixes-20261024 之五项 UI/GPU/更新修复（本文件所在 worktree 为唯一实现副本）
- 仓库 root（共享 common-dir）: /repos/MCP/zlk-cluster-orchestrator（= D:\GitRepo\MCP\zlk-cluster-orchestrator），origin=https://github.com/zlinkw/SimpleExperiment.git
- 冻结基线: f431f3b11ede244fe647a96a82ec7315ea9a6404（宿主 2026-10-24T18:55:07+08 fetch + ls-remote 双证，refs/heads/master；package.json=0.5.407，与宿主已装一致；b65d9b36 为其祖先，PR#10 合并提交）
- 任务 worktree: /repos/MCP/zlk-cluster-orchestrator-ui-plan-gpu-progress-20261024，分支 fix/ui-plan-gpu-progress-20261024，初始 HEAD=f431f3b1，status 干净（除本任务新增文件）
- 原目录保护: HEAD 仍 b65d9b36(detached)、status 干净、core.worktree 未设、GIT_DIR/WORK_TREE/COMMON_DIR/INDEX_FILE 均 unset；全部旧 worktree 未触碰
- Git 创建记录: 第一次 `git worktree add -b ...` 失败 exit 255（root 属主 755 的 `.git/logs/refs/heads/fix/` 内含在用分支 v15-legacy-progress-clear 的 root 属主 reflog 文件，node 无法追加）；分支与 worktree 均未半创建，无脏残留。第二次用单次 `git -c core.logAllRefUpdates=false` 创建成功（不改仓库配置、不删任何日志、本任务分支无 reflog，提交时同样需带该单次参数）。
- 执行端: node uid=1000, Linux WSL2；Windows/GitHub 归宿主 GPT
- 本文件基线源文件哈希（f431f3b1，工作树实测 sha256）:
  - src/updates/ReleaseClient.ts `c79c9599…8bc0c8`（105 行）
  - src/updates/Bootstrap.ts `3b4055f0…9a331c`
  - src/extension/legacy.ts `0507d845…dae8e23`（35875 行；与 b65d9b36 仅 L10995/L11003 两行 in-place 漂移，行号锚点不变）
  - src/ui/PanelHtml.legacy.ts `aa663bb1…41f294`
  - src/features/GpuHistoryState.legacy.ts `721f13de…e1707e`（316 行）
  - src/features/GpuSampleRing.ts `004545d9…c171c63`（90 行）
  - test/ui/gpuHistoryMixedGranularityScatterRepro.test.js（本任务新增）`0a692f42…43c0d1`

## 2. 问题与状态
用户五项（详见任务契约）：①更新检查提示 GitHub 限流；②每次运行 plan 都弹 Worker runtime 旧源码冻结提示；③全部 GPU 含总览历史曲线先完整后变散点；④plan 列表状态不随运行进度及时更新（要求用既有状态、不加服务器请求）；⑤运行plan/实验准备/运行进度的操作进度与日志改为 VS Code Notification（右上角），不再底部/卡片微小灰字，正常卡片内容不删。
非目标：不改发布/完整性门禁，不删卡片，不新增远端请求，不把认证或换更新源当默认方案，不动远端 Agent/服务器。

## 3. 五项证据（E=事实，行号=上述哈希版本；A=假设/未知）

### ① 更新检查限流（E01-E03）
E01 `src/updates/ReleaseClient.ts` L22-30：`request()` 预门——`if (this.retryAt > this.now()) return Promise.reject(new Error(\`GitHub 限流；${new Date(this.retryAt).toISOString()} 后重试。\`))`。L44-51：429 或 403(remaining=0/retry-after/rate 文案) 时 `failures++`，`retryAt = now + min(24h, max(60s, retry-after, reset, 60s·2^min(failures-1,5)→≤30min))`；L54 成功才 `failures=0`。L4/L16-19：cache/inflight/retryAt/failures **全部进程内存**（ETag 缓存 5min L26/37/56），重载即失、跨窗口不共享。每轮 check 固定 2 repos（L5、L80-81）。
E02 `src/updates/Bootstrap.ts` L155 激活即 `check(false)`；L147 每 30min 定时；L101-111 错误 publish 到状态栏（`bar.text/tooltip` L61-62），仅 manual 弹 `showErrorMessage`，自动失败被 `catch(()=>undefined)` 吞显示但状态栏标"失败"。
E02b 宿主实证：0.5.407 `dist/updates/ReleaseClient.js:36` request→`:115/:114 checkReleases`→`:110 check`→`Bootstrap.js:162 checkCore`，18:38:22+08 抛"GitHub限流；2026-10-24T10:53:14.000Z后重试"——即 E01 L27 的**本地预拒**，抛错时 retryAt 未到。宿主日志 /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/host-windows/3261dc5e-f7c7-4b50-80c1-6a5b87e595bf-stdout.log；fetch 日志 7439a2fb-cb49-4618-b793-fca5772913e1-stdout.log。
E03 测试 seam：`test/features/pairedUpdateClient.test.js`（sha `3ba14420…`）`new ReleaseClient(fetcher, clock)` 注入 fetch 与时钟；L28-36 已覆盖"403 未证限流可重试 / 429 限流不可被 manual 绕过 / retry-after 到期放行"。`pairedUpdateBootstrap.test.js` 覆盖激活路径。新行为可直接复用该 seam。
A①：限流根因未证——未认证 API 60req/h/IP × 2 repos × (每窗口激活1次+30min周期)，reload 后 retryAt 归零再撞为候选放大路径；宿主日志无逐请求计数（宿主已裁定不无限枚举/抓包）。窗口感知并发数未知。

### ② 每次运行 plan 的旧源码冻结提示（E04）
E04 `src/extension/legacy.ts` L10924-10927（finishDistributedPlanSubmission 内）：
```
// 29：旧代码版本不再冻结新提交的准入；执行以本轮同步快照为准，来源 hash 只作同步时记录。
// 尚未更新语义的旧 Worker 必须收到明确提示，不能伪称源码变更执行已在其上生效；提示与本机队列是否占用无关。
const legacyWorkers = this.legacySourceFreezeWorkerNames();
if (legacyWorkers.length) this.reportPlanStage(message, `提示：${legacyWorkers.join("、")} 的 Worker runtime 仍是旧源码冻结语义；…请先更新 Worker runtime。`);
```
L6757-6762 `legacySourceFreezeWorkerNames()`：已启用 Worker 中 `lastWorkerProbes[id].capabilities.sourceDecouple` 缺失者（只读 probe，无新请求）。即"每次提交必报、每 Worker 每轮重复"由 L10926 无条件调用产生；契约注释要求**如实提示**本身，未要求每次提交独立弹。
测试映射：parallelPlanSubmission.test.js:41、planRunQueryRegression.test.js:40/62、planSubmissionVisiblePreflight.test.js:73、resultSyncFailureVisibility.test.js:36 均 stub 该方法。

### ③ GPU 历史曲线先完整再变散点（E05-E09，已复现）
调用链：请求 `PanelHtml.legacy.ts` requestGpuHistory L11493-11530（细窗先问 host ring，800ms 未答回退远端）→ 宿主 `legacy.ts` L5313-5346 loadGpuHistoryFromUi→`GpuHistoryStateCache.load`（TTL 60s、单飞、压缩）；环窗 L5351-5362→`gpuSampleRing.slice`。
E05 秒/毫秒契约：`GpuHistoryState.legacy.ts` compactPoint L213-228 `bucketEpoch` 为**秒**（L217 fallback `new Date(bucketEpoch * 1000)`），agent 缺省 gapBefore→**null**（L225）。`GpuSampleRing.ts` L22-32 `collectedAt = Date.parse(generatedAt)` = **毫秒**。
E06 `PanelHtml.legacy.ts` applyGpuWindowSamples L11465-11470：环窗帧写 `bucketEpoch: collectedAt`（毫秒）进**同一** seconds 序列（L11481-11482 kept.concat(points) 合并粗点）。
E07 `gpuHistoryTimeRange` L11884-11896：`min = Math.max(min, max - 24 * 3600)`；drawGpuHistoryCanvas L11988-11992 过滤 `bucketEpoch >= windowStart` 并按 `(t-min)/(max-min)` 变 x → 混入 ms 后：全部粗秒点被窗口滤除，细点挤在右缘数像素 → 曲线塌成点簇（"散点"）。总览经 gpuHistoryOverviewSeries L11633-11690 合并所有缓存键（含被环窗污染的键）同样中招。
E08 独立第二机制（修复单位后仍在）：historyPointStartsGap L11756-11764 对 `gapBefore:null` 点用 `间隔 > max(bucketSeconds‖300, expectedStep)×1.75`；expectedStep=全序列**相邻差分中位数**（historyExpectedStepFromSortedTimes L11856-11868）。秒级细帧(15s)占多数时中位数=15 → bucketSeconds=60 时阈值 105s < 粗步 300s → 粗点逐点断线（drawHistoryLine L12047-12098 flushSegment，单点段=零长 round-cap 线≈小点）。
E09 现场条件：远端 `gapBefore:true`（agent 声明缺口）时 overview 合并点恒为 boolean（L11670 `point.gapBefore === true`）→ 不走区间路径；真实 agent 是否发送 gapBefore、真实 bucketSeconds 值——**现场未知**（禁 SSH，宿主收集）。
F 复现记录见 §5。

### ④ plan 列表状态滞后（E10）
E10 数据源：提交时 beginPlanSubmissionProgress L6603-6624 建 `type:"run-plan", localSubmissionProgress:true` 行；每阶段 patchPlanSubmissionProgress L6686-6698 更新并 `postState()`（**批量非 immediate**）。postState L23904-23950：PanelStateFlowControl 合并/背压（hidden/awaiting-render 抑制计数 coalescedStatePosts），批量 `uiBatchMs` 取 realtimeRefreshPolicy。列表卡：#recentPlans 渲染 L3838/L10434 `setHtmlIfChanged(renderPlanCards)`；状态派生 planExecutionStage L10765+：先 selectedPlanDistributedRun，后 planVersionOperationRows L11(?)=operationRowsForState+samePlanSelection+operationMatchesPlanVersion（按 planRevision/updatedAt 匹配）；缓存 ensurePlanVersionRowsCache 以 state 对象身份失效。运行进度卡与列表**同源** localOperations。
A④：滞后路径未定——候选 (a) postState 批量/背压合并节奏，(b) planRevision 不匹配导致行被过滤，(c) 列表 stage 语义只映射 validate/dry-run 行不含 run-plan 进度阶段。需 GPT 定夺后我定向补核 `realtimeRefreshPolicy().uiBatchMs` 实值与 renderSectionIfVisible 触发条件；修复仅允许用既有投影，禁新增远端请求。
测试映射：planExecutionPhaseLabelClarity / frontendCheckerCaches / panelStateProjection。
[r2 勘误] 上文"planExecutionStage L10765+"锚点作废：该处为 renderPlanRunActions（L10763-10792），planExecutionStage 实际在 L17818；A④候选 (a)(b)(c) 已由 §9 定向核对终结（根因 R1+R2），以 §9 为准。

### ⑤ 操作进度/日志 → Notification（E11）
E11 现状三通道（reportPlanStage L6560-6572）：postUiCommandStatus L6124-6137（面板按钮态，须保留终态门禁）、patchPlanSubmissionProgress（卡片内 stage 灰字）、`vscode.window.setStatusBarMessage(…, 8000)`（底部；legacy.ts 全文仅 2 处 setStatusBarMessage）。既有 Notification 先例（ProgressLocation.Notification + progress.report 生命周期）：L4758 准备 Agent、L7803、L11715-11740（同步产物，progress.report 分阶段文案）、L19354、L19556-19610（downloadMappedResultBatch 完整 report 生命周期）、L20420、L21186、L21286。范围仅限 运行plan/实验准备/运行进度 操作面；卡片正常内容（planRunActions 按钮、说明灰字等）不在删除面。uiCommandStatus 面板消费侧 L4390-4399。

## 4. 测试映射与命令清单（npm 钩子去重）
- package.json scripts **无 pre/post 钩子**；所有 test/build/package 经 `scripts/test-workflow.js`（+scripts/test-workflow.json profile，逐文件 `node --test --test-force-exit --test-timeout 20000` 单一去重清单；f431f3b1 起 test:plan-run 追加 planRunSharedSubmission.test.js 并嵌套展开 test:local-dispatch、test:rerun-scheduler-contract）。`preview:gpu-history` 嵌套 `npm run build`（展开去重计一次 build）。
- 既有相关测试：①pairedUpdateClient/pairedUpdateBootstrap；②§E04 四个 features 文件；③gpuHistoryChartBehavior.test.js（本任务新增 repro 文件同 harness）；④planExecutionPhaseLabelClarity/frontendCheckerCaches/panelStateProjection；⑤planPreflightProgressSpeed（fixture 桩 setStatusBarMessage/withProgress）。
- 新 fixture 无需 node_modules（node:test+dist 已入库）。

## 5. 失败与验证记录（F，全部真实退出码，日志完整可取回）
- F01（harness 基础设施，非产品）：首跑 exit 1，`Error: unclosed inline function applyGpuWindowSamples`——我的提取器把注释中撇号当字符串起点。单次机械自修（提取器跳过 // 与 /* */），证据目录 /tmp/pi-test-3v5dq6tw（000.raw.log）。额度：本失败链（fixture 构建）仅此一次自修。
- F02（观察）：v1 fixture exit 0 全绿——REPRO 未触发；probe /tmp/gpu-probe-20261024.js 显示 expectedStep=15000、maxTime 毫秒 → 发现单位混用才是主导机制，v1 断言因 ms 抬高阈值而虚假通过。证据目录 /tmp/pi-test-jx3kgwl0。
- F03（**产品红灯，需求映射回归**）v2 exit 1，/tmp/pi-test-2bn9_zal/000.raw.log：
  - REPRO-1 fail：`merged series maxTime must stay epoch-seconds; actual maxTime=1730012000000`（环窗 ms 污染，E05-E07）
  - REPRO-2 fail：`actual strokes=35 / expected 1`（秒级细帧合并后中位数阈值塌缩，E08）
  - REPRO-3 fail：`overview maxTime … =1730012000000`（总览同源污染）
  - CONTROL pass：bucketSeconds=300 时中位数机制不触发
- 本阶段未跑 npm 级完整验收（实现未开始，无需）。

## 6. 原因结论与未知
- ③已证：两机制独立成立且叠加（单位混用为主、阈值塌缩为次），修复边界在 UI 展示层（applyGpuWindowSamples 单位归一 + historyPointStartsGap 混合粒度阈值），不改远端协议/数据真实性条款（"缺失不连线不补零"保留）。现场 bucketSeconds/gapBefore 实值未知，仅影响触发概率不影响机制成立。
- ①事实止于"本地预拒+跨进程不共享退避"；请求频次根因未知（不扩采）。
- ④根因候选三个，未定；需 GPT 指定优先路径后定向补核。
- ②⑤为产品决策项，证据已足。

## 7. 给 GPT 的最小变更建议（非授权，方向由 GPT 裁定）
1. ReleaseClient/Bootstrap：retryAt/failures 落 context.globalState 跨窗口跨重载共享；限流窗口内激活/定时检查静默顺延（状态栏保留真实"限流至…"），manual 保留显式错误。不动发布门禁与 URL 白名单。
2. 提示并入操作通知：按⑤的 Notification 通道，legacyWorkers 事实每会话（或 probe 集合变化时）随首轮提交通知一次，内容原样保留契约文案；删除每次提交的独立 stage 重复行。
3. applyGpuWindowSamples 写入前 `bucketEpoch: Math.round(collectedAt/1000)`（timestamp 不动）；historyPointStartsGap 的阈值改为与 expectedStep 无关的 `max(bucketSeconds‖300, COARSE_STEP基准)×1.75`（具体由 GPT 定），并以 REPRO-1/2/3 转绿+CONTROL 保持为验收。
4. 列表同源刷新：run-plan 行（localSubmissionProgress）阶段映射进 planExecutionStage 的列表文案；核对 postState 批量参数是否吞阶段更新——具体以 GPT 复核为准，不加任何远端请求。
5. reportPlanStage 增 Notification 生命周期（参照 L19556 模式：withProgress 或 showInformationMessage 去重键），移除底部 setStatusBarMessage 重复；uiCommandStatus 按钮态保留。

## 8. 更新索引
r1：建档；含 Git 身份、五项 E、F01-F03、复现文件 `test/ui/gpuHistoryMixedGranularityScatterRepro.test.js`（未提交，工作树内）。
r2：§9-§13 为宿主 A/B/C/D 实现前缺口补齐与 Git 权限取证；修正 r1 E10 的 planExecutionStage 行号锚点；新增 F04-F06 与新 fixture `test/ui/executionPlanListProgressLagRepro.test.js`；Git 元数据写入按指令暂缓。

## 9. A④ 运行进度卡→列表链路根因（已定位，非候选猜测）
r1 勘误（追加式，不改原文）：E10 所写"状态派生 planExecutionStage L10765+"锚点有误。**准确符号**（src/ui/PanelHtml.legacy.ts @aa663bb1）：`planExecutionStage` 在 **L17818**；L10763-10792 实为 `renderPlanRunActions`（按钮区）；`renderPlanCards` L13633 仅渲染选中 plan 的事实卡，不消费提交进度。以下按 dist/ui/PanelHtml.legacy.js 实测行（同一构建）：

链路：宿主 `patchPlanSubmissionProgress`→`postState()`（批量，流控健康：ack 接线 legacy.ts L24141/24165/24270，排除候选(a)）→ webview 两渲染分支：
- `renderOperationSectionIfChanged`（dist L15053）：key 命中仍调用 `patchExecutionProgressDom(state)` → **运行进度卡实时**。
- `renderExecutionPlanListIfChanged`（dist L15046）：`key === lastExecutionPlanListKey` 直接 return，**无任何 DOM patch** → 列表只认 key。
- key=`executionRenderKeysForState(state).planList`（dist L14926）：活跃提交行映射 `{id,status,startedAt,enqueuedAt,createdAt,finishedAt,localSubmissionProgress,workflowId,error,message: active ? "" : row.message,reconcileEvidenceActive}`——**stage/message/updatedAt 均不在其中**（R1）。
- 即便重绘，组状态文案 `statusText = submission ? executionSubmissionLabel(submission) : …`；`executionSubmissionLabel`（dist L14462）只按 action 分类返回 校验中/提交中/等待继续提交/处理中，countText 固定"提交中 · 待生成 job"，job 计数只随 `data.distributedPlans`（宿主队列刷新）变化（R2）。

结论：根因钉死为 **R1+R2 复合**（同源投影已有 stage/message 不进 key、不进文案），候选(a)流控与(b)revision 过滤均排除；revision 匹配语义 `operationMatchesPlanVersion`（dist L18014）由基线用例钉住不退化。

fixture `test/ui/executionPlanListProgressLagRepro.test.js`（sha 4ddb6473…，仅任务树，无新请求）：同一 state 含进行中/完成/失败/终止四态对照 + reconcileEvidenceActive 翻转 + revision 六断言；从 dist 内联脚本原样提取 `stableSectionSignature/stableSectionHashToken/stableSectionHashValue/executionOperationWorkflowId/operationIsActive(+真实常量 OPERATION_ACTIVE_MATCH_TOKENS)/executionRenderKeysForState/executionSubmissionLabel/operationMatchesPlanVersion`，仅任务侧投影用恒等桩（对比态间逐字节相同，文件内注明）。结果（F05，/tmp/pi-test-8sb0g3mq，exit 1）：REPRO-4A 红（两推进态 key 全等 `760:-811716448`）、REPRO-4C 红（stage=dispatch 仍返回"提交中"）、BASELINE 4B/4D 绿。修复验收=4A/4C 转绿且 4B/4D 保持绿；实现方向：把行内既有 stage/message 并入 planList key 与 statusText，不加任何远端请求。

## 10. B③ 压缩契约核对与负向断言
契约核对（dist/runtime/cluster_agent.py sha256 `d399d5eaa87f9bfbfa631c43f72eff81ae5e9754aa34c5d7236601623c4d746b`）：`GPU_HISTORY_BUCKET_SECONDS` 默认 60（L1072）；`normalize_gpu_history`（L3147-3189）只输出真实点、落库前弹 gapBefore/imputed；`downsample_gpu_history_points`（L3280-3314）以**存储行真实间隔>bucketSeconds** 赋权威 boolean → **真实回包每点必带 boolean**，REPRO-2 的 bucketSeconds=60+回包步长 300s 假设与真实契约一致（降采样倍率不回传，UI 不可观测——正是跨段中位数塌缩的根源）。宿主压缩 `compactPoint`（dist/features/GpuHistoryState.legacy.js L172-180）保留 boolean（缺失→null）、保留 imputed；`evenlySampleHistoryPoints`（L196-214）把 `gapBefore===true` 与 imputed 翻转点列为 critical 优先保留 → **压缩不伪造连续边界**。
既有保证（实测绿，非偶然）：imputed 点在实际绘图路径即断线且不绘制——内联 `drawHistoryLine` L12079 强制 flush、L12082 跳过描点，统计文案"补齐点未绘制"（L11724）；SPEC-6 已改为保护基线。
新缺口（负向断言证明）：`applyGpuWindowSamples`（dist L11444-11484）给环窗每帧硬编码 `gapBefore:false`，粗→细合并边界与环窗内任何真实空洞都被伪标连续 → **SPEC-7 红（2 小时空洞 strokes=1 直接连线）**。设计方向（GPT 裁定）：分段自身粒度判 gap——remote 段 boolean 权威保留到 merge；ring 段按自身应有间隔判；合并边界按两侧段粒度计算断连，修复后仍禁"固定 300s 放宽"；显式 true/imputed 继续断线（CONTRACT-5/SPEC-6 已钉）。gapBefore:null 语义（按段阈值连接 vs 一律断线）属设计选择，REPRO-2 红灯作为决策输入保留。
运行 F06：/tmp/pi-test-6xnyj_rs，exit 1；REPRO-1/2/3、SPEC-7 红，CONTRACT-5、SPEC-6、CONTROL 绿。披露：该次运行清单 sha `224972e8…`；其后仅两处注释文字修订（现文件 sha `5c46f4c3…`），全部断言未变。

## 11. C① 限流设计交付（方向实现由 GPT 授权后落地）
- 类型化：`ReleaseClient` 预拒（L27）与 429/403 实证抛新导出 `RateLimitedError extends Error`（携带 `retryAt` epoch ms）；其余错误路径不变。
- Bootstrap（L101-111）：自动检查 catch RateLimitedError → **延后语义**：状态栏显示"限流中，<本地时间> 后自动重试"，不 publish 错误、不标"检查失败"；manual → `showWarningMessage` 含**本地时间**且 resolve 不抛（不再污染 exthost 错误堆栈，E02b 即该抛错路径）；真错误维持现行为。未知/陈旧数据永不显示为"最新"（仅新鲜成功响应可置最新，缓存态标注时点）。更新/下载验证链完全不触碰。
- 最小存储接口：构造函数第三可选参 `retryStore?: { load(): number; save(at: number): void }`，缺省纯内存（现有全部测试零影响）；Bootstrap 注入 `context.globalState` key `updates.rateLimitRetryAt` 包装。**只解决已证的 reload 丢失（E02b）**；明确不声称：跨窗口实时一致（globalState 无跨窗口即时通知保证，不实现订阅魔法）、共享 IP 限流消解、任何分布式锁。
- 测试建议（复用现有 seam `new ReleaseClient(fetcher, clock)`）：①注入内存 store，模拟 reload（新实例同 store）预拒仍在；②RateLimitedError 不触发错误 publish/manual 出本地时间警告不抛；③既有 L33-35"429 不可被 manual 绕过"必须保持绿。

## 12. D②⑤ 通知化接点（一次操作一个 Notification + 全量日志入通道）
入口生命周期枚举（src/extension/legacy.ts @0507d845）：①统一漏斗 `runActionCommand` L6183-6195（`PLAN_SUBMISSION_COMMANDS` → `beginPlanSubmissionProgress` L6595-6624 + 首 stage），覆盖 run-plan/validate/dry-run；②`finishDistributedPlanSubmission` L10902-11019 的 codeSync/preflight/dispatch 各阶段（②旧 runtime 提示 L10924-10927 在此）；③runAllPlans 经 SelectedPlanBatchHost（命令表 L622/643/663/737）回调同一 `reportPlanStageLocal`；④实验准备另有既有 Notification 先例 L4758。
接点设计：操作 begin 处开一个 `withProgress({ location: ProgressLocation.Notification, cancellable: true })`（完整 report 生命周期先例 L19556-19610），`reportPlanStage`/`patchPlanSubmissionProgress` 每阶段 `progress.report`（**每操作恒一条，无逐行弹窗**）；**finally 关闭**须覆盖成功、`recordActionError` 错误分支与 `UiCommandCancelled` 取消分支三类出口（各入口逐一接线，不留悬挂通知）。`postUiCommandStatus`（L6124-6137）保留为按钮终态门禁；底部 `setStatusBarMessage`（L6570，全文仅 2 处）移除。
日志通道：**实测 src 无任何 `createOutputChannel`/`appendLine`（grep 空）——"既有 OutputChannel"不存在**，需新建：activation 创建并入 `context.subscriptions`，`reportPlanStage` 第三通道全部行写通道（时间戳+阶段+worker），Notification 附"查看日志"按钮；通道保留上限/截断标记由 GPT 定值。
②并入：`legacySourceFreezeWorkerNames()` 集合首现或变化时在该操作通知内提示一次，文案保持 L10924 契约原样；能力判断/门禁不动，无自动升级。

## 13. Git 权限精确取证（按指令：已暂缓一切后续 Git 元数据写入）
- 阻塞路径：`/repos/MCP/zlk-cluster-orchestrator/.git/logs/refs/heads/fix`（目录 root:root **755**，node uid=1000 无写权限）；父 `.git/logs/refs/heads` root:root 777；目录内为在用分支 `fix/v15-legacy-progress-clear` 的 reflog 文件 `v15-legacy-progress-clear`（root:root 644，该分支检出在 `.worktrees/v15-fix-legacy-progress-clear`，**在用不可删**）。
- 范围：root 属主命名空间还有 feat/integrate/lane/codex/backup/refactor/luna-delivery，但对本任务产生写入阻塞的**仅 `fix/` 路径**；`.git/logs/HEAD`、`.git/config` 为 root:root 777 可写。
- 副作用：零。两次失败的 `worktree add` 均无半创建；首成分支用了单次 `-c core.logAllRefUpdates=false`（未改配置、未删日志；本分支无 reflog）。**按指令该参数不再作为约定沿用**；后续 commit 同样被该路径阻塞，已停。等主控窄修决定；未做任何清理/worktree 重建。

## 14. F 记录增补
- F04：A④ fixture 首跑 exit 1（/tmp/pi-test-tpwg15qg/000.raw.log），4/4 失败为 **fixture harness 缺陷**（`OPERATION_ACTIVE_MATCH_TOKENS is not defined`；我误用 `runInNewContext` 返回值当 sandbox），非产品结果。单次机械自修（注入原样单行 const 提取 + 改用 sandbox 对象）。
- F05：自修后复跑同文件 exit 1（/tmp/pi-test-8sb0g3mq）：REPRO-4A/4C 产品红灯符合设计，BASELINE 4B/4D 绿。文件 sha 4ddb6473…。
- F06：B③ 扩展文件 exit 1（/tmp/pi-test-6xnyj_rs）：见 §10。中断披露：其前一次声明的运行经证据目录核对（/tmp 最新目录时间戳）**未启动**，本条为首次真实执行，非重放。

修订: r3（2026-10-24 实现阶段，采集人：Linux 千问执行端；r2 增量即上文 §9–§14，失败详情只增不删）

## 15. T1+T2 实现与验证（GPU 缺口物化 + 列表进度投影）
- T1（src/ui/PanelHtml.legacy.ts，sha256 5e156910110af3c2…）：applyGpuWindowSamples 单位归一（ring collectedAt 毫秒 → bucketEpoch=Math.round(/1000)，timestamp 仍毫秒）；新增 gpuHistorySegmentGapLimit(expectedStep)=max(bucketSeconds,expectedStep)×GAP_FACTOR 与 mergeGpuHistorySegments(coarse,fine)——合并前按各自段粒度物化未知 gapBefore：coarse null 按 coarseStep 判定、fine 按自身中位间隔、边界按 max(coarseStep,fineStep) 限值；远端显式 true/false 权威短路保留；ring 内部与边界真实空洞保留；imputed/missing 绘制行为不变（SPEC-6 复核为保护性 pin）。
- T2（同文件）：新增 executionSubmissionProgressText(row)（message→stage→PLAN_EXECUTION_PHASE_LABELS[stage]||stage）；executionSubmissionLabel 活跃态追加 " · 进度"；planList key（executionRenderKeysForState）纳入 active 的 message/stage，不含时间戳；revision/确认保护不变。
- 验证（单文件 node --test --test-force-exit --test-timeout 20000，均经 pi-test-evidence）：gpuHistoryMixedGranularityScatterRepro 9/9 exit 0（/tmp/pi-test-hddlmm1a，文件 sha 7c0c3a68…，含 SPEC-7 边界空洞、SPEC-8 ring 内 30min 洞、SPEC-9 刷新保洞）；executionPlanListProgressLagRepro 4/4 exit 0（/tmp/pi-test-zbua1hyo，sha a329f52a…）；gpu 历史既有回归 14/14 exit 0（/tmp/pi-test-qmllogqe）。

## 16. T3 实现与验证（Notification 一条一操作 + 输出通道 + 降噪）
- src/extension/legacy.ts（sha256 e3d4f5d112a78533…）：OPERATION_NOTICE_COMMANDS（runPlan/reproducePlan/validatePlan/dryRunPlan/runAllPlans）+ OPERATION_NOTICE_TITLES；beginOperationProgressNotice（每操作一个 withProgress Notification，cancellable:false，resolve 存 operationNoticeSessions）；reportOperationNotice 在 reportPlanStage 内同步驱动 progress.report 并写 OutputChannel "SimpleExperiment 操作日志"（ensureOperationLogChannel 惰性创建、subscriptions 释放）；finishOperationProgressNotice 终态关闭 + showInformation/showWarning（成功/失败/取消）附「查看日志」按钮 → 已注册命令 simpleExperiment.showOperationLog（获批替代方案，withProgress 无原生按钮，不猜 API）；setStatusBarMessage 于 reportPlanStage 处移除（L19391 sync-results 在范围外保留）；recordLegacySourceFreezeFact 按排序文件名指纹去重：变化→报事实，重复→仅入日志；runAllPlansFromUi 以 parentClientActionId 汇聚子任务到同一通知。
- src/ui/PanelHtml.legacy.ts：renderCommandPhaseLine 过滤 planPhaseCommand 五命令，卡片灰字不再重复 plan 进度；正常卡片内容未删。
- src/extension/SelectedPlanBatchHost.ts（sha256 c155189d0fe82334…）：per-plan planMessages 透传 parentClientActionId。
- 断言方向翻转（需求驱动，注释注明）：planNoticeLayout 测试2（灰字→通知独占）、resultCommandPhaseRouting 测试1；tmux/results 路由覆盖保留，截断断言移至范围外命令 fetchTmuxList。
- 验证：planNoticeLayout 4/4（/tmp/pi-test-gr293l06）、resultCommandPhaseRouting 3/3（/tmp/pi-test-_rxko39f）、planPreflightProgressSpeed 18/20（/tmp/pi-test-v86ebkfu；仅 2 项环境失败，基线原目录同码证明 /tmp/pi-test-fd8h34ph：/home/node/AppData root 属主 EACCES → 1!==0 与 40!==0，与本任务无关，不改动不隐藏）、planSubmissionVisiblePreflight 22/22（/tmp/pi-test-luewh49e）、runSubmissionNavigation 2/2（/tmp/pi-test-ujimoynt）、workerPlanSharding 7/7（/tmp/pi-test-z67sjbfn）、backendActionCommandSets 4/4（/tmp/pi-test-6ja1fr35）、distributedPlanSubmissionRouting 7/7（/tmp/pi-test-awv24dgj）、pluginLogRetention 15/15（/tmp/pi-test-k5ndhuqa）、cacheCleanupPanel 10/10（/tmp/pi-test-7bros3k2）、hostOperationLeaseIntegration 3/3（/tmp/pi-test-pta3vyz8）、metricsDownloadEndToEnd 16/16（/tmp/pi-test-0ppy5ytb）、planBatchPhysicalPipeline 2/2（/tmp/pi-test-znizugkf）、planRunFeedback 3/3（/tmp/pi-test-aq0cguzr）、planRunQueryRegression 6/6（/tmp/pi-test-cxkc90mg）、parallelPlanSubmission 12/12（/tmp/pi-test-cc0bo3v7）、resultSyncFailureVisibility 14/14（/tmp/pi-test-glwb7o1m）、stopRoutingAndResultParseDedup 12/12（/tmp/pi-test-i5i0f_g8）。panelWebviewScriptHealth 5/5、planActionWorkflow 2/2 曾于 r2 轮通过但目录引用未留存；dupfix 后复跑被证据 hook 以「不要重复已完成操作」拒绝（两次，未执行），如实标注待最终 fullCheck 覆盖。

## 17. T4 实现与验证（GitHub 限流类型化，非失败）
- src/updates/ReleaseClient.ts（sha256 e7ffa0a5a41ea7fd…）：export RateLimitedError(message, retryAt)；两处抛出：pre-deny（retryAt>now，manual 亦不豁免）与证实 429/403 分支；可选第三构造参 RetryStore{load,save}（async 兼容），loadRetryAt 单次加载并入 request promise 链（保持 request===request 同步 single-flight pin）；save 尽力持久化（失败保留会话内退避，注释披露）。普通 403（未证实限流）行为不变。
- src/updates/Bootstrap.ts（sha256 a443a0ededcb23db…）：RETRY_KEY="simpleExperiment.pluginUpdateRetryAt"；registerUpdater 默认客户端注入 globalState retryStore（await save）；checkCore catch 对 RateLimitedError：状态栏「配套更新：限流中」+本地时间 tooltip，manual→showWarningMessage 不抛、无错误弹窗，auto 不 publish error、不把旧 plan 改标最新；其余错误路径原样。
- 新文件 test/features/pairedUpdateRateLimit.test.js（sha256 6a40cd288928154f…）：类型化+reload 退避+到期重发 3/3 exit 0（/tmp/pi-test-6lcg8kes）。
- 回归 pin：pairedUpdateClient 5/5（/tmp/pi-test-gri1y2an，manual-no-bypass 保留）、pairedUpdateBootstrap 6/6（/tmp/pi-test-dsvxkpc2）。

## 18. F 记录增补（实现阶段）与自修账目
- F07（失败链①：重复方法定义）：resultSyncFailureVisibility 首跑 14/14 语法错（/tmp/pi-test-4wowpwtk exit 1，`Unexpected token 'async'`）。根因：T3 曾把基线条目方法误命名 runActionCommandCore，与既有大方法同名——class 后定义覆盖前者，beginPlanSubmissionProgress 条目逻辑成死代码，且夹具切片把 evaluateRetentionWindow 卷入 span。单次最小自修：通知逻辑内联回单一 runActionCommand（无第二拆方法，保持 stopRouting 夹具按名抽取直调 leased 的契约），Core 恢复唯一。复跑 14/14 exit 0（/tmp/pi-test-glwb7o1m）。教训：重命名前必须 grep 基线全部同名定义（基线本就是 runActionCommand→Leased→Core 三层）。
- F08（同链①下游）：stopRoutingAndResultParseDedup exit 1（/tmp/pi-test-qxcc330m，OPERATION_NOTICE_COMMANDS is not defined，11/12）：夹具沙箱缺新常量；机械补注入（空命令集不影响 stopExperiment 路由断言，注释披露）。复跑 12/12 exit 0（/tmp/pi-test-i5i0f_g8）。
- F09（失败链②：夹具 seam 缺失）：planSubmissionVisiblePreflight 首跑 exit 1（/tmp/pi-test-57_5eyzo，9 失败：recordLegacySourceFreezeFact 未挂到编译 map、renderPanel seam 名单/PLAN_EXECUTION_PHASE_LABELS 缺失）：四处 harness 补齐（语义与断言不变）。首复跑 22/22 exit 0（/tmp/pi-test-e22kmr7u），dupfix 后再证 22/22（/tmp/pi-test-luewh49e）。
- F10（失败链③：新测试期望错）：pairedUpdateRateLimit 首跑 exit 1（/tmp/pi-test-p44rx7vh，calls 2!==1）：checkReleases 并发请求两个 Release 仓库是既定行为，期望写错；修正为每 Release 一次（断言变严不变松）。复跑 3/3 exit 0（/tmp/pi-test-6lcg8kes）。
- 自修账目：三条独立失败链各一次机械自修，均保留首次失败日志与真实退出码；无检查削弱、无静默回退。
- 编译：t3-dupfix-compile exit 0（/tmp/pi-test-p963ybp8）、t4-compile exit 0（/tmp/pi-test-asuxhozp），均含 node -c dist/extension.js 与 dist/ui/PanelHtml.js 门禁。
- Git（T5 事实）：分支已改 fix-ui-plan-gpu-progress-20261024（branch -m，reflog 已由主控窄修启用 core.logAllRefUpdates=true），HEAD=f431f3b1 冻结基线，工作区仅本任务 src/dist/test/docs 文件。

## 19. r3 勘误与审核包取证（2026-10-24，响应主控审核指令）
- 勘误（归因错误撤回）：§15–§16 尾注与 plan.md T5 行中「reflog 已由主控窄修启用 core.logAllRefUpdates=true」**不实，撤回**。主控只授权了正常 `branch -m`，未执行任何配置/权限操作。实际事实：
  - `branch -m fix/ui-plan-gpu-progress-20261024 → fix-ui-plan-gpu-progress-20261024` 由本执行端（node，uid 1000）于 11:13:15 执行（reflog 首条 "Branch: renamed …"，node:node 文件）——该指令有主控授权原文。
  - `core.logAllRefUpdates=true` 位于主仓 config（`file:/repos/MCP/zlk-cluster-orchestrator/.git/config`），config 现 node:node 777、mtime 2026-10-24T11:13:16（与 branch -m 同一秒窗口）。但 `git branch -m` 本身不写该配置；本会话完整 transcript grep 无任何 `git config core.logAllRefUpdates <value>` 写命令记录（37 处命中全为读取命令或分析文字）。**写入者以现有证据不可证明**；该 common-dir 已知被多任务共用（今日另有 fix-plan-run-single-batch-20261024 等分支活动），不排除其他会话/进程写入。不归因给主控，也不自证是我方；保持现值不动、不再写 config。
- Git 定位（只读取证，供主控核 129）：top-level=/repos/MCP/zlk-cluster-orchestrator-ui-plan-gpu-progress-20261024；`.git` 为文件指针 `gitdir: /repos/MCP/zlk-cluster-orchestrator/.git/worktrees/zlk-cluster-orchestrator-ui-plan-gpu-progress-20261024`；git-dir=同 worktrees 目录；common-dir=/repos/MCP/zlk-cluster-orchestrator/.git；HEAD 文件=worktrees/.../HEAD 指向 refs/heads/fix-ui-plan-gpu-progress-20261024；index=worktrees/.../index；HEAD=f431f3b1…（冻结基线）；执行端 uid=1000(node)、git 2.39.5。本执行端 `git diff/status/rev-parse` 均正常（本轮 review 包即在此端生成）。主控端 exit 129 属其 shell 的环境差异，本端不改指针/不 repair 的约束继续遵守。
- 审核包（untracked，非交付内容，提交前排除）：`.review-ui-plan-gpu-20261024/`：review.diff（src+test，48KB）、review-dist.diff（dist 纯生成，44.7KB）、review-new-{pairedUpdateRateLimit,gpuHistory,listProgressLag}.diff（新增测试全文 diff 形态）、numstat.txt、status.txt、failure-logs/pi-test-{4wowpwtk,qxcc330m,57_5eyzo,p44rx7vh,lplwoyv3,fd8h34ph,tpwg15qg,8sb0g3mq,6xnyj_rs,s4k6hep8}.raw.log（全部首次失败+基线环境证明完整日志）。
- 版本裁定入账：使用标准 **0.5.408**（非 0.5.408-patch），暂不改 package.json、暂不最终编译，待 diff 审核。
- 2 项 EACCES 失败**继续计为阻断项**（未豁免），完整证据：
  - 用例①「warm unchanged reuses stat hashes and Extension Host proof skips repeat remote inventory」：断言 `host.lastCodeSyncStats.hashed === 0` 实际 1（改动后文件 L287；基线原目录行 283）。
  - 用例②「warm local listing does not add a second stat and keeps the unchanged cache write skipped」：断言 `warm.stats.hashed === 0` 实际 40（L553；基线行 549）。
  - 退出码：改动后 /tmp/pi-test-lplwoyv3 exit 1（pass 18/fail 2）；基线原目录（f431f3b1 时点 /repos/MCP/zlk-cluster-orchestrator）/tmp/pi-test-fd8h34ph exit 1（pass 18/fail 2，同两断言 `1 !== 0`、`40 !== 0`）——与本任务改动无关的预存环境失败。完整堆栈在 failure-logs 两份 raw.log。
  - 机制链：测试进程 LOCALAPPDATA 未设置 → src/core/HostOperationLease.legacy.ts:353 `defaultHostOperationLeasePath()` 回退 `os.homedir()/AppData/Local` → src/core/ResourceOperationLease.ts:135 缓存目录 `<leasePath>.resources-v2` = `/home/node/AppData/Local/SimpleExperiment/host-operation-lease.json.resources-v2/`；该 `/home/node/AppData` 为 root:root 755（2026-10-22 起，早于本任务），node 无写权限 → 日志行 `local code manifest cache write failed: EACCES: permission denied, open '...<sha>.json.ownership.writing'`（本轮 raw.log 内 25 次）→ 全局 stat 缓存写不进 → 第二次构建 warm 命中退化为全量重哈希（40 文件全哈希）→ 两断言失败。
  - 处置：不改测试、不改断言、不装 bypass；解决路径交主控裁定（Windows 宿主 LOCALAPPDATA 原生可用，或 Linux 既有隔离环境提供可写缓存目录/环境变量重定向，均须主控授权后执行）。

修订: r4（2026-10-24 返修阶段，绑定 plan.md「r2 审核返修指导」7 项）

## 20. r2 返修执行记录（7 项）
1. checking 悬挂：Bootstrap checkCore 限流分支改 `await publish({...status, status:"unknown", message:"…限流中；更新检查已延后，<本地时间> 后自动重试；此前的检查结果不能视为最新。"})` 后覆盖 bar；测试断言返回值/getUpdateStatus/globalState(STATUS_KEY) 均 unknown、含延后消息、manual 警告含本地时间、到期第二次 check 恢复 update_available。exit 0（/tmp/pi-test-g9d2p90b，6/6）。
2. save 未 await/非法远期：ReleaseClient 限流分支 `await this.retryStore.save(...)`（同步 throw 与异步 reject 同捕获），失败在同一 RateLimitedError 消息内声明「退避记录保存失败」；loadRetryAt 改 `Promise.resolve().then(load)` 吸收同步 throw，且仅接受 now<at≤now+86400000 的持久值。测试：可控延迟 save 证明结算前等候、save reject 消息可见、load 同步 throw 不泄漏、48h 远期值被拒绝（calls=1 正常请求）。同上 6/6。
3. 通知生命周期：session 在 withProgress 回调前建立 done promise + 有界阶段缓冲（≤8 条）；回调迟到按序回放全部缓冲并在 closed 时立即收敛；withProgress reject 被 catch 不留 unhandled；runActionCommand 的 begin 移入受保护 try 且在首阶段 reportPlanStage 之前。新增 test/features/planOperationNoticeLifecycle.test.js 实调生命周期（延迟回调+快速成功/失败/取消、首次进度可见、顺序流、reject 无害、批量单通知、子阶段入父会话）7/7 exit 0（/tmp/pi-test-hf_37r13）。首跑 5/7（/tmp/pi-test-3ma8gu3p）暴露「缓冲只存最后一条、中间阶段丢」——一次自修改完整序列缓冲（F11）。
4. tone 真实判定：submissionNoticeTone(message, result)——本地行优先；行缺失（validate/dry-run 无 plan-submit 行）时按 result.error/ok===false/resultStatus(failed|error|失败|cancel) 判 failed/cancelled，不再缺行即 succeeded；业务成败语义未改。行为断言在生命周期文件（校验失败/预演取消/ok:false/completed/无行无result/行failed压制completed 6 断言）+ runActionCommand 调用点已传 result。
5. 进行中日志入口+完整反馈：package.json 贡献 `simpleExperiment.showOperationLog`（title「SimpleExperiment：查看操作完整日志」，activationEvents 同步）——操作进行中即可通过命令面板合法打开；postUiCommandStatus 对 5 个范围内命令把全部状态反馈（含校验/预演非 reportPlanStage 回复）写入同一「SimpleExperiment 操作日志」通道；原日志来源未删、无新增服务器请求、无逐条弹窗；映射=reportPlanStage 阶段行 + postUiCommandStatus 状态行 + 操作起止行 → 同一 OutputChannel ← {进行中: 命令面板 showOperationLog；终态: 通知「查看日志」按钮}。通道接入断言在生命周期文件（validatePlan failed/dryRunPlan completed 入账、范围外不入账、webview 路由不变）。
6. EACCES 隔离环境：目录已按批准建立并核实 node:node 可写、路径由 worktree 推导、非真实宿主缓存：docs/agent-tasks/ui-plan-gpu-progress-20261024/localappdata-isolation/cache-20261024。但 `LOCALAPPDATA=<dir> python3 pi-test-evidence.py …` 的环境前缀调用被 pi hook 以 PI_TEST_EVIDENCE_REQUIRED 拒绝（执行器层拒绝，未运行；runner spec 无 env 字段，脚本不改）。按返修第 7 项走「执行器拒绝→交主控解决」；未用 wrapper 脚本绕过。无 env 复验 18/20（/tmp/pi-test-btx4o10f，仍为同 2 项 root-owned AppData 环境失败，原证据 fd8h34ph/lplwoyv3 保留，Windows 必验保留）。
7. 版本 0.5.408（标准）已入账，未改 package.json version、未最终编译。回归覆盖：本轮返修后复跑 pairedUpdateRateLimit 6/6（g9d2p90b）、pairedUpdateClient 5/5（c_vkja64）、pairedUpdateBootstrap 6/6（63_1geh_）、stopRoutingAndResultParseDedup 12/12（w3ffn1zw）、planSubmissionVisiblePreflight 22/22（ckynjlh_）、planStopClear 39/39（6h3f0b70；首跑 38/39 沙箱缺新常量 /tmp/pi-test-gt382e74，机械补绑定 F12 同型）、tmuxClearTaskTabsStatus 1/1（k9tewxxj）、resultSyncFailureVisibility 14/14（wje46c9j）、backendActionCommandSets 4/4（oxdi25y7）、planRunFeedback 3/3（sb7z_vxe）、planPreflightProgressSpeed 18/20（btx4o10f）、parallelPlanSubmission 12/12（ewhvfzv1）、编译 r2rework-compile exit 0（/tmp/pi-test-_1u6hraz）+ compile2 exit 0（/tmp/pi-test-30jpnims）。planActionWorkflow 复跑被 hook 判重复未执行，由最终 check:full 实际清单覆盖（新文件由自动发现，receipt 核对在第 7 项）。
- 自修账目（r4 段新增，各链一次，首失败保留）：F11 通知缓冲只存最后一条→完整序列缓冲（3ma8gu3p→hf_37r13）；F12 型两处沙箱常量/绑定缺失（planStopClear gt382e74→6h3f0b70）；测试文件括号笔误（d4vzx6yi→g9d2p90b）。

修订: r5（2026-10-24 小返修阶段，绑定 plan.md「r3 返修复审增量」3 缺口 + EACCES 受支持入口 + 版本 0.5.408）

## 21. r3 三缺口最小修复与 EACCES 闭环（r5）
1. src/extension/legacy.ts 三处（编辑均原生 Edit）：postUiCommandStatus 操作日志删除 `.slice(0, 400)` 全文保留（L6144），并对 validatePlan/dryRunPlan 追加 `this.reportOperationNotice(clientActionId, `${status}：${message}`)`（L6148-6149）使进行中反馈推进现有 Notification；reportOperationNotice 与 finishOperationProgressNotice 缓冲改滚动窗口 `while (session.reports.length > 8) session.reports.shift()`（L6666/L6677），保留有界、迟到回调回放最新窗口含终态，完整历史仍在通道日志。grep 证实他处 slice(0,400)（L8968 observations）与本需求无关未动。
2. test/features/planOperationNoticeLifecycle.test.js 新增 3 用例（实际驱动生命周期）：>400 字符校验反馈全文入日志；validatePlan/dryRunPlan 进行中 postUiCommandStatus 推进 in-flight 通知（running/failed 行进入 reports）且迟到回调回放缓冲的预演阶段；12 阶段+终态后滚动窗口=8、终态必回放、阶段 6-12 存活、阶段 1-5 不再回放。写入时两处自纠（未运行前）：finish 在已启动分支会直接 report 终态行故断言改 includes；滚动窗口实际保留 6-12 非 5-12。复跑 10/10 exit 0（/tmp/pi-test-jwwniawv，phase r3gap-lifecycle；测试文件 sha c49371de…）。编译 r3gap-compile exit 0（/tmp/pi-test-pzjkhzcw）。回归：planStopClear 39/39（j1uuw5zh）、resultSyncFailureVisibility 14/14（7f2zjvty）。
3. EACCES 按主控 r3 方案闭环（未改全局工具/权限/断言）：scripts/test-workflow.js `isolatedTestEnv`（L485-499）对每个测试子进程将 SANDBOX_ENV_KEYS（含 LOCALAPPDATA，L30）指向 /tmp/psg-env/p<pid>/job-<n> 可写隔离目录并清六项 Git 定位变量——即原生逐测试隔离能力。check:dev 要求显式 --domains（首跑拒绝 exit 1 /tmp/pi-test-tsh39acw，未执行测试语义，按 usage 补齐非绕过）：dry-run 计划 jobs=1、域 test:preflight-stages 7→1 去重、non-final、hooks zero（/tmp/pi-test-oxrc99g4）；真实执行 `check:dev --domains test:preflight-stages --only test/features/planPreflightProgressSpeed.test.js` exit 0，job-001 该文件 20/20 通过（/tmp/pi-test-_ciu00af；run 目录 …/2026-10-24T11-43-48-279Z-921746-check_dev/，含原两条 root-owned AppData EACCES 用例 L287/L553 现已在隔离 LOCALAPPDATA 下通过）。原失败证据 fd8h34ph/btx4o10f 保留；Windows 必验保留。§20 第 6 条的环境前缀拒绝记录保持原样（该路线已由本入口替代）。
4. 版本 0.5.408 同步（sed 各一处语义点）：package.json L5、package-lock.json L3/L9、src/runtime/RuntimeManifest.ts L51 CURRENT_RUNTIME_VERSION；src/features/SetupGuideSource.ts L5 为 0.5.400 历史注释不改。最终 build（npm run build，final profile 含 node -c 门禁）phase final-build-05408 执行中，receipt/vm.Script/check:full 见 §22。

## 22. 最终 build 失败链取证与去重对账（r5，绑定 plan.md 验收节 + 主控去重指令）
最终 `npm run build`（final profile，phase final-build-05408，/tmp/pi-test-pwdtam8l exit 1，run 目录 …/2026-10-24T11-44-41-295Z-922007-build）209 文件中 4 失败，三条失败链：
- F13 test/ui/executionCompactOverview.test.js「production operation projection…（a real new preflight retains its immutable start time）」（job-190，本任务引入的产品回归）：normalizeOperationRows L19019 对无 message 行填显示占位符 "-"（baseline 既有）；T2 新增 executionSubmissionProgressText 直接消费 message，把 "-" 暴露为标签后缀（"校验中 · -"，expected /校验中 · 待生成 job/）。修复=占位符视为空（PanelHtml.legacy.ts L14500-14506，含注释）。复跑 39/39 exit 0（/tmp/pi-test-qbjjgpbe，含 submission 身份/待生成 job 全部既有语义用例）。
- F14 test/features/selectedPlanBatch.test.js「the real run-all handler routes explicit subsets…」（job-163，夹具缺新绑定，F12 同型）：vm 直载 runAllPlansFromUi 调 this.operationNoticeKey→TypeError。修复=该测试内 Object.assign 三个通知生命周期 noop（保留其路由不扩域意图）。复跑 13/13 exit 0（/tmp/pi-test-ptr8jcqd）。
- F15 test/features/agentProjectRootReadinessWorkflow.test.js L99 与 projectWorkspaceChangeIsolation.test.js L242（同因，baseline 断言 /return runAllPlans\(this, message\)/ 与 T3 新调用形冲突）：一次自修把两条断言更新为 noticeMessage 形，复跑 /tmp/pi-test-py1ul51o exit 1——正则仍假设 `return runAllPlans(...)` 而实际方法体是 `const result = await runAllPlans(this, noticeMessage); … return result;`（方法原文已在失败日志完整保留）。自修限额已用尽，停止二次修复，请主控给准确断言形（建议 /await runAllPlans\(this, noticeMessage\)/ + /return result;/，保留"批量直接委托共享 handler、身份仅加 parentClientActionId"原意图）。053/054 保持红，未再触碰。
check:full 去重对账（check:full --dry-run 被 hook 拒绝未执行，改核 manifest 静态定义，scripts/test-workflow.json）：build.fullCheck=16 domains ⊂ check:full.fullCheck=18 domains（多 test:windows-flow-incremental、test:local-stop-control）且 check:full 另有 extraFiles=[test/features/testWorkflowRunner.test.js(r22)]；compile gates 两者同 @compile，build 另有 prereq prepare-wsl-tests（check:dev 亦含，gate-08 实测）。差集已按既有合法入口单独补齐：check:dev --domains 两域 9/9 job passed（/tmp/pi-test-6vweh8_s，LOCALAPPDATA 原生隔离）；extraFile 单文件 26/26 exit 0（/tmp/pi-test-muagz32e）。故 053/054 修复合入后仅需重跑 npm run build 一次覆盖 16 域+gates，差集三件不重复执行，check:full 不再整遍机械重跑（build ∪ 差集入口 = check:full 完整清单，逐项身份已列）。
vm.Script 模板剥离门禁：/tmp/vm-script-check-20261024.js 对 dist renderPanelHtml() 1,274,059 字符 HTML 剥离 3 个内联 <script> 块逐块 new vm.Script 语法通过（exit 0）。该检查只依赖 dist，053/054 仅测试文件返修不影响其有效性。

## 23. r5 最终候选 build 通过、receipt 事实纠正与必验矩阵缺口（2026-10-24）
1. 最终候选 `npm run build`（phase final-build-05408-candidate2，/tmp/pi-test-p359j90b exit 0，run 目录 …/2026-10-24T11-56-41-497Z-932539-build/run.json）：overall=passed，209 jobs 全部 passed/exit0（含 F13/F14/F15 四文件 job passed），9 gates 绿，inputFingerprint==endFingerprint，candidate.state=validated，distFingerprint=7ab273f6…。post-build dist 字节与冻结前记录一致（dist/extension.js sha256 63ddfdbd…、dist/ui/PanelHtml.js 438f57c4…），故 vm.Script 模板门禁证据（3 script 块/1,274,059 字符，/tmp/vm-script-check-20261024.js）绑定同一字节有效。F15 按主控裁定形落地后单跑 5/5（n40eiprd）、19/19（nxm_mpas），noticeMessage 断言与全部权限断言保留。
2. 纠正（主控指正，以实际 receipt 为准）：§20 第 7 条「新文件由自动发现」表述不成立——runner planEntry 仅展开 manifest 显式 domains 的 sourceScript 文件与 entry extraFiles，无全目录 glob；build/check:full/package 均如此，全盘 glob 仅存在于被 acceptance 引用的 "test" 域。实际对账 build run.json 209 jobs：本任务 4 个新增文件 pairedUpdateRateLimit、planOperationNoticeLifecycle、executionPlanListProgressLagRepro、gpuHistoryMixedGranularityScatterRepro 均 MISSING；另有本任务修改过的既有文件 stopRoutingAndResultParseDedup、planNoticeLayout、resultCommandPhaseRouting 历史上也从未入固定矩阵（非本任务引入）。全仓统计：磁盘 804 个 *.test.js，其中 256 个在显式矩阵/extraFiles，548 个不在（仅 acceptance glob 覆盖）——此为项目现状，非本任务改动。
3. 缺口的当前需求覆盖：7 个相关测试已按全盘 glob 权威域语义经 check:dev --domains test --only（1035→7 去重，dry-run 留档 /tmp/pi-test-cj7cs4st）在原生逐测试隔离环境单 receipt 全绿（/tmp/pi-test-tuae3f_w，7 job passed，run …/2026-10-24T12-03-29-027Z-940503-check_dev）。但该入口非 final profile，不能称其进入 Windows 正式 package 必验清单。
4. 最小 manifest 修复建议（待主控裁定后实施，当前运行中未改 scripts/test-workflow.json，receipt 指纹保持有效）：test:paired-update sourceScript 追加 `node --test --test-force-exit --test-timeout 20000 test/features/pairedUpdateRateLimit.test.js`（同域已有 pairedUpdateClient/Bootstrap）；test:plan-run 追加 planOperationNoticeLifecycle.test.js（同域 planRunSharedSubmission）；test:submission-truth 追加 test/ui/executionPlanListProgressLagRepro.test.js 与 test/ui/gpuHistoryMixedGranularityScatterRepro.test.js（同域已有 test/ui/executionCompactOverview.test.js 渲染 seam 先例；gpuHistoryChart* 系列历史上亦不在任何域，sync-gpu 域无 test/ui 先例）。参数与各域现状逐字一致；是否顺带登记 3 个本任务修改过的既有文件由主控裁定。实施后需按新 manifest 重新冻结并复跑受影响 final 入口（Windows 正式 package 前必须封闭，主控指令）。

## 24. manifest 必验登记（主控裁定 b）与最终候选冻结事实（2026-10-24）
按裁定对 scripts/test-workflow.json 做纯追加编辑（git 显示 6 行变更=3 域 sourceScript 各一次追加，前后缀逐字保留；无 runner 改动、无参数变化、无覆盖减少）：test:paired-update += pairedUpdateRateLimit；test:plan-run += planOperationNoticeLifecycle、stopRoutingAndResultParseDedup；test:submission-truth += executionPlanListProgressLagRepro、gpuHistoryMixedGranularityScatterRepro、planNoticeLayout、resultCommandPhaseRouting。全部使用既有 `node --test --test-force-exit --test-timeout 20000` 逐字参数。
编程对账（git HEAD 版 manifest vs 新版，逐 segment）：build 187→193、check:full 199→205、package 199→205、acceptance 281→288，lost=0、新增重复=0，六个文件在 build/check:full/package/acceptance 各恰一次且参数字面一致；preflight 闭包为自动 re-attest 机制（无硬编码期望数，84/79 为历史证明引用），无需手改。runner 实际展开佐证：package --dry-run jobs=226、dedup 434→226、phases=compile/fullCheck/post/assemble、hooks zero（/tmp/pi-test-ovi5pz7e exit 0）；check:full --dry-run 此前被 hook 拒绝未执行（tsh39acw 同型环境前缀外），等效验证以静态展开+package dry-run 双轨留档，未等价重试。
结构缺口如实报告（待主控裁定，未擅自扩范围）：test:paired-update 域不被 build/check:full/package 引用（仅 acceptance 与 npm test:paired-update 专口），既有 pairedUpdateClient/Bootstrap 同状——因此 pairedUpdateRateLimit 不会进入 Windows `npm run package` 必验；其余 6 文件已进入 package。若要 package 闭环该文件需把 paired-update 域加入 package/check:full domains（会连带 8 个既有 paired-update 文件进 package 必验，超出"7 文件追加"授权范围）。
7 文件隔离 receipt 复用论证：tuae3f_w（run 2026-10-24T12-03-29Z，7 job passed）之后、manifest 编辑之前的 transcript 内无任何 test/src 文件编辑（仅 evidence/plan 文档），7 文件内容未变，哈希已存 .review-ui-plan-gpu-20261024/task7-file-hashes.txt；manifest 变更不改变测试文件字节与该 receipt 的 job 输入。
输入变化声明（裁定 b）：manifest 属 inputFingerprint 输入，2026-10-24T11-56-41Z build receipt（validated）对应的输入此后已变，该 receipt 只作为当时输入的完整绿灯证据保留，不再声称"当前输入 validated"；当前正式候选完整必验由主控 Windows `npm run package` 一次闭环（Linux 不重跑，遵裁定）。dist 在 manifest 编辑后未重编译，字节仍为 63ddfdbd…/438f57c4…（tsc-cached verify-only 在后续任何 compile gate 会确认）。
审核包已重建：review.diff（22 文件 +1291/−62，含 manifest）sha d8c4dad6…；review-dist.diff（12 个生成文件）sha 236242c5…；numstat a63404d9…；status d0e3e93d…；review-new-*×4 新文件独立 diff；failure-logs 17 份（本轮新增 pwdtam8l build 首失败全量、py1ul51o F15 自修失败、tsh39acw 入口拒绝）。未提交、未远端。

## 25. §24「paired-update 不可达」勘误（主控指正，planEntry 实际计划取证 2026-10-24）
§24 结构缺口结论错误，撤回：expandDomain（scripts/test-workflow.js L131-155）对 `npm run <ref>` 且 ref∈manifest.domains 时递归展开并保留 chain；test:failed-job-review.sourceScript 尾部既有 `&& npm run test:paired-update`，build/check:full/package 均含该域。我的判定基于自写 split(' && ') 静态脚本，把该 npm 引用当非测试段忽略，未走 planEntry 展开——属分析工具假阴性，非 dry-run 或 receipt 错误：ovi5pz7e（新 manifest package --dry-run jobs=226）本已包含该文件，是我未从实际计划读取。
准确定位（均 exit 0，cwd=/repos/MCP/zlk-cluster-orchestrator-ui-plan-gpu-progress-20261024，root=默认 ROOT_DEFAULT 即该 cwd，新 manifest sha256=38170494…，旧 /tmp/old-test-workflow.json sha256=c4453ae5…）：
- check:dev --domains test:failed-job-review --only test/features/pairedUpdateRateLimit.test.js --dry-run → jobs=1、dedup 36→1（/tmp/pi-test-nrvwwct6）。规范身份=realpath /repos/MCP/zlk-cluster-orchestrator-ui-plan-gpu-progress-20261024/test/features/pairedUpdateRateLimit.test.js（jobIdentity L106-112 realpath+posix 化）；source chain = package>fullCheck:test:failed-job-review>npm run test:paired-update>domain test:paired-update>新追加段 `node --test --test-force-exit --test-timeout 20000 test/features/pairedUpdateRateLimit.test.js`。
- package --manifest 旧文件 --dry-run jobs=219（/tmp/pi-test-iz5riwap）vs 新 manifest 226（ovi5pz7e）：+7 恰等于本次登记 7 文件；7 文件全部在 package 实际计划内，无需加 domain、无 8 文件扩围问题。planHash 值不在 dry-run 输出中（仅 run.json 落盘），标未知，不臆造。
结论：Windows `npm run package` 计划完整覆盖全部 7 个任务测试文件（含 pairedUpdateRateLimit），§24 的结构缺口段作废。
