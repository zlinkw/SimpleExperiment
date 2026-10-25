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

## §26 r4 同任务返修：截图产物同步进度（P1 实现+验证，2026-10-24）
基线：原任务分支已按授权 `git merge --ff-only origin/master` fee4476c→e9795ad0（exit 0，plan r4 未提交改动保留，grep 确认）。
实现（4 源文件）：legacy.ts OPERATION_NOTICE_TITLES+4 中文标题；withUiCommandStatus 保持单一方法形（F16 裁定2），四命令 retryJobArtifactSync/refreshJobArtifacts/syncPendingPlanArtifacts/syncAllResultArtifacts 在真实漏斗开闭现有 Notification（begin 在 try 内，finally 按归类后 result 关闭；completed&&!resultSync.partial→succeeded，cancelled→cancelled，failed/submitted→warning，绝不把 partial/submitted 报成功；异常无 result 用"产物同步操作异常结束"兜底，无悬挂）；postUiCommandStatus 四命令全文日志+推进通知；PanelHtml.legacy.ts artifactSyncNoticeCommand+renderCommandPhaseLine 仅过滤四命令（rebuildProjectResultTables/tmux/其它命令原路由，pending 行保留→按钮转圈/防重复/终态不变）。
测试（先红后绿）：红灯 A=/tmp/pi-test-681ykb17（5 用例：无通知/标题缺失）、B=/tmp/pi-test-8x3huqmw（artifactSyncNoticeCommand missing）。首败保留：h1rbugfe（funnelFixture 双方法对象拼接 SyntaxError，一次机械自修）、a3o5e6m8（B 共存行断言矛盾，一次自修）、fcm6br4s（check:dev 缺 --domains 拒绝）。F16（方法拆分波及 9 夹具文本抽取，首红批 batch-l65ov6ut receipt 全留）按裁定2回退单方法形后复验。
复验全绿：compile 7门禁 ch9t09i7+8y1950bo；A 16/16=3zd0ltvt、B 3/3=x1jiydhv；回归 teq907lm 批 6 绿（selected-batch hdoxugjq、preflight-visibility exv5maz3、sftp-once k5glidkk、runtime-log avezaphl、tmux-clear _70rs_eb、action-lifecycle mta8t7vr）；l65ov6ut 批既有绿 7（stop-clear n9tkazzr、stop-routing lw6ibzvw、job-unavail 11v5v1dt、result-catalog 960l6729、state-post gmpdzysi、whitelist 7qh72smp、notice-layout 64qhmwh7）；resultSyncFailureVisibility 14/14=5w8u29wn（按裁定补真实生命周期依赖：stringField/TITLES/withProgress/createOutputChannel+operationNoticeKey…submissionNoticeTone 链+sessions/context；首败 6a2w2w6l 提取锚点缺缩进一次自修）；panelMessageDispatch 11/11=1zxzxdsp（该分发夹具按既有 stub 契约注入 5 个通知面 stub，断言未动；首败 6oau8gve）；planPreflightProgressSpeed 属既有 HOME 环境要求，按 r3 裁定走 check:dev --domains test:preflight-stages --only 恰1项 dedup=6 exit0（sn9ag3n9）。
覆盖登记：本轮仅修改既有测试文件（planOperationNoticeLifecycle/resultCommandPhaseRouting/resultSyncFailureVisibility/panelMessageDispatch），无新增测试文件，manifest 必验清单无需追加；四命令新用例均在既有已登记文件内。
P2 只读源证据（不改码）：错误1 MACHINE_STATE_PATH_PROTECTED=插件宿主 assertTransferRootSafety（legacy.ts:20306-20318，sync.serverToServerFpsync 对 source/destination 各查 targetRootGuard；guard null/unknown 同样拒绝=严格 fail-closed；targetRootGuard L9150+ 依赖 probe 绑定与 workerTunnels.agentProjectDir 等映射）→ qmf idx1 scope 是正常相对 outputDir，拒绝源于端点映射/probe 不可证，非范围真命中状态根；宿主需采 nwpu5/10.69.24.150 会话 probe 状态与 workerTunnels 行 agentProjectDir/agentInstallDir/agentStateDir/workerStateDir 实际值。错误2 TRANSFER_STAGE_PENDING=simple-sftp staged-tar-receive.py claim（L257-320）两代 slot fail-closed，等待已确认 managed cleanup，属合法保护；宿主需采目标端 10.69.24.150 simple_cluster/.simple-sftp-staging/d-<identity>/ 列表+journal。错误3 "没有可靠的最新版"=SyncLatestMerge.planLatestWorkerMerge L20：scope 内文件无任何端点带 manual/plan/candidate/same 最新版→保守 skip；涉事路径均为 outputDir 内残留（.training_outputs_before_quality_<id>/ 备份目录、旧 tb_logs event、.job_metrics.csv.<id>.pending 中间件），非本轮产物丢失、非 reload 内存故障、非自动清理授权。

§26 勘误（主控指正，2026-10-24 宿主 settings 采集后）：上文 P2 段三处结论越界，更正如下，原文保留：
1) "非 reload 内存故障、非自动清理授权"等绝对断定撤回。已证：三类错误文本各自的抛出机制与源码位置（assertTransferRootSafety 的 null/unknown fail-closed；staged-tar-receive 两代 slot fail-closed；planLatestWorkerMerge 无最新版即 skip）。未知：错误1 的实际诱因（probe 冷启动时序/映射解析/配置缺失均未有证据区分；宿主已证 workspace 与用户 settings 均无 workerTunnels/agent*Dir 配置，setupConfig 真实持久来源待源证）；错误2 的 slot 占用者与"传输恢复逻辑是否有 bug"未证；错误3 的残留路径是否属当前 job 契约范围未证（仅目录名不足以断定过期，"本轮产物未丢失"亦未证——summation resultState=complete 只说明完成登记，不证明 scope 内每个文件当前有效）。
2) TODO P2 行"无一是 reload 内存故障"同此作废。
3) 采集方向修正：不再以 settings JSONC 为 workerTunnels 来源假设；setupConfig/lastWorkerProbes 的真实持久层与只读获取方法见 §27。

## §27 P2 补查：setupConfig/probe 持久层、冷启动自动同步链、产物清单来源、13:10 新批快照增量对比（只读，2026-10-24）
1) setupConfig 真实持久来源（已证，源码）：loadSetupConfig（legacy.ts:22242-22282）主源=`this.context.globalState.get("simpleExperiment.xshellRealtimeTunnelConfig")`（keys.setupConfig L368；相关键 setupConfigurationSignature="simpleExperiment.setupConfigurationSignature" L386、tunnelConfig="simpleExperiment.tunnelGatewayConfig" L367）。workerTunnels 取值：`saved.workerTunnels?.length ? saved.workerTunnels : settings 回退 simpleExperiment.tunnel.workerTunnels`（L22277-22279）。即 **worker 映射正常持久化在 VS Code globalState，不在任何 settings.jsonc**——宿主两处 JSONC 无该键与此完全一致，settings 缺失≠配置缺失。globalState 落盘文件=用户 globalStorage 根下 state.vscdb（SQLite ItemTable 键值）。宿主只读取法（不触发任何刷新/同步/Worker 查询）：复制 state.vscdb 副本后用宿主已有 sqlite3 只读查询 `SELECT value FROM ItemTable WHERE key IN ('simpleExperiment.xshellRealtimeTunnelConfig','simpleExperiment.setupConfigurationSignature','simpleExperiment.tunnelGatewayConfig')`；worker 映射=value JSON 的 workerTunnels[]（id/enabled/agentProjectDir/agentInstallDir/agentStateDir/workerStateDir）。宿主无 sqlite3 则报阻塞，不装工具。
2) lastWorkerProbes（已证=仅内存，无持久化）：全仓写入点均为内存字段（声明 L973、reset L3575、全量 probe L5039、失败清空 L5058、code-sync 冻结注入 L9300、stamp 更新 L11901/L11999），无 globalState/磁盘写入点；最新队列快照 grep probe 类键 0 命中（batch 0708dd37），旧快照同。**结论：cached lastWorkerProbes 无磁盘来源，唯一持有者是运行中 extension host（pid 31820）内存；未发现现成不触发 Worker 查询的只读外部导出面（grep probes:/probeSnapshot/diagnosticProbes 0 命中）——宿主侧不可离线取证，标未知。**
3) 重载冷启动→自动产物同步→guard 拒绝链（源码级已证，诱因归属仍未知）：自动链=队列 tick 的 postprocess 调度点 L11632-11636 调 syncCompletedPlanArtifacts(context)，其中 **taskLifecycleProtocol===2 分支 L11689-11691 直接 new CompletedJobSyncHost(...).run(scopes)，不检查 lastWorkerProbes**；对照非 protocol-2 镜像分支 L11697-11699 要求 `lastWorkerProbes[id]?.status==="ok"`。UI 四命令链 artifactSyncFromUi→run（L11676）同样无 probe 门。run→mergeLatestWorkerVersions（CompletedJobSyncHost.ts:69）→sync.serverToServerFpsync→assertTransferRootSafety→targetRootGuard（L9150）：冷启动 lastWorkerProbes={} 时 observed=null，且 L9157-9159 `if (this.lastWorkerProbes && !observed && !target?.workerStateDir && !config?.workerStateDir) guard.unknown=true`→fail-closed 拒绝=MACHINE_STATE_PATH_PROTECTED 文本。对照准备面：**prepareCodeSyncRootGuards（L9223；注释 L9162-9164 明言仅 code-sync 路径可只读重探一次）全仓唯一调用点=代码同步 L10310，产物同步链确无同类绑定准备（已证）**。但 qmf idx1 跨 13:01/13:10 两批、30s retryAfter 自动重试仍同一拒绝，与"瞬态冷启动空白应自愈"不符——配置缺失/绑定不匹配/其他均未证，待 1) 的 state.vscdb 值区分（未知）。
4) per-job 产物清单来源（已证，代码契约）：jobArtifactScopes（LatestJobArtifacts.ts:17-30）=job 自身声明 outputDir（+非 train 的 collectionResultCsv）∩ 用户勾选 serverSync.paths，**scope 只含当前 job own 的两个路径，不含任何旧 pending/backup 路径登记**；执行走 mergeLatestWorkerVersions(root,targets,scopes,".",{completedJob:{sourceId:job.workerId}})。错误3 的旧备份/pending 路径是目录级 scope 内**逐文件最新版合并枚举**的产物（outputDir 下历史文件天然在目录交集内），无可靠最新版→skip 该文件，不传输、不阻塞其他文件；skip 聚合进错误文本造成噪声。代码实现与"job own∩勾选"契约一致；目录粒度是否满足"仅当前 job 文件"的意图、skip 聚合为错误是否属 UI 语义缺陷，交主控裁定。
5) 13:10:55 新批快照（artifact-latest-2d3cf1a5…/queue.redacted.json）与旧快照增量对比（同因合并）：qmf idx1 MACHINE_STATE（L9016）原样；qmf 三个 slot 拒绝仍同一 claim L320，入口分布 chunk_state(653→537)×2、receive(661→376)×1；summation 4 项"没有可靠的最新版"仍在。新增=summation idx0/1（L9798/9865 区）"跨 Worker 压缩打包传输失败（退出码 1）"=receive(661→376→claim 320) TRANSFER_STAGE_PENDING 之后紧跟第二栈 `File "<string>", line 5 … BrokenPipeError: [Errno 32]`。因果已代码证实：接收端 staged receive 在 claim 抛出即退出（staged-tar-receive.py:320；加载器 extension.js:1862-1865 exec 名即 simple_sftp_staged_receive），源端管道尾部 telemetry counter 脚本（extension.js:1817，逐行数第 5 行正是 `sys.stdout.buffer.write(b); sys.stdout.buffer.flush()`，pipeline 组装 tarPackingCommand L1810-1818/分块 L1930）对已关闭通道写入→EPIPE。两栈合并进同一远端 stderr。**BrokenPipeError 是同一 slot 门禁拒绝的派生后继，非独立缺陷，无独立修复对象**；与 qmf idx2/3/4 同因合并。12 错误归并后仍=3 个机制类：MACHINE_STATE×1、slot 门禁×7（含 BrokenPipe 派生×2）、无可靠最新版 skip 聚合×4。
6) P2 边界重申：本轮全部只读（源读+快照定向 grep），未改另仓、未触发真实同步/服务器读写、未动队列。P1 已代码审核通过；冻结/提交与 P2 修复均待主控计划授权。

## §28 P2 实际输入 guard fixture：错误1 分支分类闭合 + slot journal 精确取证清单 + P1 最终清单准备（只读，2026-10-24）
1) 真实配置白名单核对（宿主 setup.redacted.json，只读）：4 个 enabled worker（nwpu3 10.70.50.180/nwpu2 10.69.24.150 均 agentProjectDir=/data/qgking/zlk local 18767/18766；nwpu5 10.68.10.238 agentProjectDir=/mnt/3bb01a96-4d48-4134-9dcc-1e1cdd11daa3/zlk local 18765；jqg_zlk /opt/jqg/zlk local 18769 localForwardHost=127.0.0.1）+rjj_8 disabled。白名单 grep 全 55 命中中 **agentInstallDir/agentStateDir/workerStateDir 三键 0 出现（已证：全 worker 无显式 state/install 根）**；global 顶层 agentProjectDir=/media/npu/Data/zlk 为历史 hub 字段，targetRootGuard 只读 workerTunnels 行，不参与。
2) 实际输入 guard fixture（/tmp/p2-guard-fixture-20261024.js；提取 dist 真实编译 codeSyncRootProbeConfig/targetRootGuard/assertTransferRootSafety/agentRuntimeDirs + 真实 ProjectRootMap.js/ProjectFileIndex.js；配置行=快照原值；remoteProjectName 注入宿主已证 workspace D:/GitRepo/MultiModal → codeRoot=agentProjectDir+"/MultiModal" 为源码推导非猜填）。首跑 r1（/tmp/p2-guard-fixture-20261024.log）fixture 自身缺陷：destination(nwpu3) 未同场景绑定致 bound_ok 误 THROW，如实保留；一次修正后 r2 全矩阵 21 用例 exit0（/tmp/p2-guard-fixture-20261024-r2.log）。结果：全部 4 端点 **bound_ok（probe 与配置严格一致）→ guard{prefixes:[],unknown:false} → PASS = 配置本就合法已证**；cold{}/projectRoot 不一致/host 不一致/protocol=1 无 state 目录四场景 → 均 guard{prefixes:[],unknown:true} → 同一 MACHINE_STATE_PATH_PROTECTED 文本；真实配置下 prefixes 恒空 → **真实 state 根前缀命中分支不可达**；示意案例（HYPOTHETICAL，显式 workerStateDir，非现场）证明该分支文本同样不可区分。
3) 错误1 结论（已证/未知分级）：qmf idx1 拒绝可排除"配置缺失型"（agentProjectDir 存在且 bound_ok PASS）与"真实 state 根冲突型"（prefixes 恒空）。剩余分支族={当前绑定缺失}：a 冷启动瞬态（与跨 13:01/13:10 两批+30s 自动重试仍拒不符，弱候选）b probe transport/project 永久不匹配（含 nwpu5 /mnt/<uuid> 挂载漂移使 Agent 上报 projectRoot≠配置 codeRoot）c gpuCollectorProtocol===1 且未上报 worker/agentStateDir（legacy.ts:9156）。现场子类**未知**（probe 无磁盘副本无导出面，不以 fixture 冒充现场健康）。区分性只读磁盘线索：SSH 读目录存在性——nwpu5 /mnt/3bb01a96-4d48-4134-9dcc-1e1cdd11daa3/zlk/MultiModal、nwpu3 与 nwpu2 /data/qgking/zlk/MultiModal（存在性检查不触发任何查询/写入）。
4) slot 两代占用 SSH journal 只读取证清单（交宿主执行，仅读，不 cleanup/不重传/不新实例/不改门禁）：目标=nwpu2（10.69.24.150，用户 qgking，既有会话 qgking.2），receiver root=destination.remotePath=codeRoot=/data/qgking/zlk/MultiModal（extension.js:1879 chunkTransferCommand root=target.remotePath）。identity 为源码确定性推导（非猜测）：identity=sha256('["project-files",<lane>]')（extension.js:1835-1840 stagedLogicalKey+transferScope64，fpsync 非目录 scope="project-files"，lane∈{0,1}），did="d-"+identity 前 24 hex（staged-tar-receive.py:135）→ lane0=d-47be3d71ec8655f9def472a5（identity 47be3d71ec8655f9def472a53f1b669900b7ab708609a3f30608d24dd54c33e9）、lane1=d-008f3730da9c1d317a22a395（identity 008f3730da9c1d317a22a395722eb1ce5b989252d380cbb8ddefcecb26cb7aa1）。读法：ls <root>/simple_cluster/.simple-sftp-staging/{d-47be…24,d-008f…24}/{0,1}/ 及 cat 各 slot manifest.json（上限 1MiB，staged-tar-receive.py:24/69-78）；所需字段 identity/generation/state（committed|failed 为终态两代）/createdAt/updatedAt/entries[].path；generation=sha256(operationId) 只能从 journal 读。两 slot 的 generation+state+updatedAt 即可判定"两代未决等待 managed cleanup"是既有 failed 残留还是异 generation 竞争，无需任何写操作。
5) P1 最终测试域/清单准备（不冻结）：r4 修改 4 测试文件在 package 实际必验覆盖核对（package fullCheck domains 含 test:sync-gpu，L215-241 实读；dry-run 226 jobs receipt /tmp/pi-test-ruj9rnjd exit0）：planOperationNoticeLifecycle（test:plan-run，§24 已登记）✓、resultCommandPhaseRouting（test:submission-truth，§24 已登记）✓、resultSyncFailureVisibility（test:sync-gpu 域 sourceScript L120 原生包含）✓；**panelMessageDispatch 不在任何 domain/extraFiles=不在 package 必验（acceptance 全 glob 覆盖，属项目历史现状）**——交主控裁定是否按 §24 纯追加先例登记（建议域 test:plan-run 或 test:execution-shell，逐字参数 node --test --test-force-exit --test-timeout 20000）。manifest 本轮未改动；P2 原因未闭合，未冻结版本、未提交。

## §29 现成 SimpleSFTP 只读 API 核实：stagedSlots / agents.lifecycle inspect 最小调用与边界（只读，2026-10-24）
背景：宿主证实 qgking.2/qgking.5 非有效 OpenSSH alias（未做任何 SSH），已改用 SimpleSFTP 认证 API 采集 capabilities/openapi/servers（复用 sftp-surface-d4ddd434…）。§28-4 的"SSH 读 journal 原文"路线作废，且**journal 原文经任何现成 API 亦不可读**（见 3），属 API 边界，不绕过。
1) files.cleanup.stagedSlots（能力声明 readOnly:true+incomingGenerationPreview L1697；handler extension.js:4163-4173；远端 staged-tar-receive.py stale_report L148-257 严格只读：O_NOFOLLOW 只开目录、lock 文件不存在不创建、flock 非阻塞探测、journal 只读、无任何写路径；不经 zlk 插件 assertTransferRootSafety 面）：
   - params：{node:{kind:"remote",host,user,port,root}, retentionKey?:string, identity?:64hex, generation?:stable-run-id}。无 identity 时 retentionKey 必填否则 INVALID_REQUEST（L4168）；identity/generation 均须 64hex（stagedSlotStaleReport L1895）。
   - 返回：{candidates:[{relativePath:"simple_cluster/.simple-sftp-staging/d-<24hex>/<0|1>",type:"directory",status,logicalKey(64hex),generation(64hex),updatedAt}], held:计数, identities:[lane0,lane1]}。**held 明细不回传**（handler L1770-1772 仅 reduce 计数）。
   - 分类语义（stale_report L213-253，全部 fail-closed）：identity 异→held(unresolved)；非终态→held；locked/不可读→held；无 generation（inventory 模式）终态两代也全入 held、零候选；有 generation 且两 slot 均为**其他**终态代→最旧一进入 candidates（仅预览，删除仍须 preview+双确认+execute，本调用零写）。
   - 诊断力：candidates=0 且 held=2 ⇒ 当前拒绝现场=在飞/锁定/异 identity/未决代（合法门禁且无自动清理空间）；candidates=1（status/generation/updatedAt 可见）⇒ 两终态他代滞留，等待已确认 managed cleanup。**若候选/滞留代的 logicalKey ≠ 错误链 identity（project-files lane0/1）即跨链/跨 job 残留同 root——真实恢复逻辑 bug 候选，交主控定修**。
2) §28-4 did 精确化（不改结论）：错误链 CompletedJobSyncHost→mergeLatestWorkerVersions→fpsync（legacy.ts:9485-9488）不传 retentionKey/generation → scope="project-files"，lane0/1 推导仍有效；但 legacy.ts:13195-13196 的 Plan 产物链用 retentionKey=JSON(["job-artifacts",planFile,index,case,seed])、generation=plan.id——同 root 会有其它 identity 目录。故**不要预设 did**：用 retentionKey 入参让 handler 自推导，响应 identities 即错误链两 lane 的权威值（可与 47be3d71…/008f3730… 互验）。
3) journal 原文不可达证明：sync.downloadMappedPaths 的路径守卫 downloadScopeBlockedPath（extension.js:2905-2918）——simple_cluster 子树仅 results/debug_runs/tmp(具体) 放行，`.simple-sftp-staging` 落入兜底 return true=拒绝；files.cleanup.inspect（cleanup-file-api.js:426-433）只回 target inventory 元数据不回内容。API 缺口如实报告，不绕过。
4) agents.lifecycle inspect（inspectZeroWrites:true L1689；**仅 inspect 免双确认**：非 inspect 才要求 confirm+pathConfirmed，L4148；远端 lifecycle_control 默认 action=inspect→lifecycle_inspect agent-lifecycle.py:408-453，返回 contract{projectRoot/agentInstallDir/stateDir}、status:running|unhealthy|absent、tmuxWindow、activeTasks、runningVersion、schedulerRuntime{protocol,status,workerId,…}、identity=agentIdentity）：参数=agentPayload 固定白名单（agent-lifecycle.js:19-23：action,projectDir,installDir,stateDir,workerStateDir,mode,workerId,host,port,condaEnv,expectedVersion,files,sessionPrefix,tmuxSession,tmuxWindow,agentToken,migrationDigest）；传输身份 apiTransferSftp 取 params.server{host,port,username,remotePath}（L4736-4746）。观测面正好区分错误1 三分支：status≠running→无绑定来源；contract.projectRoot≠配置 codeRoot→永久不匹配；schedulerRuntime.protocol+state 目录字段→protocol1 型。**注意**：lifecycle_contract 必填子集未逐行读，缺项会报 INVALID/契约错——首个调用 4xx 原文回传即可判缺项，无需扫仓。
5) 最小调用 JSON（宿主经现有认证 local API；全部零写，无 ensure/restart/deploy/连接/同步；stagedSlots 的 generation 仅是 admission 预览入参，非重传）：
   - 错误链槽位（nwpu2=目标端）：{"method":"files.cleanup.stagedSlots","params":{"node":{"kind":"remote","host":"10.69.24.150","user":"qgking","port":22,"root":"/data/qgking/zlk/MultiModal"},"retentionKey":"project-files","generation":"<sha256(\"p2-admission-preview-20261024\")>"}}（纯清点变体=去掉 generation）
   - qmf idx2/3/4 各 job 另发：{"…":"…","retentionKey":"[\"job-artifacts\",<queue planFile>,<job.index>,<job.case>,<job.seed>]","generation":"<该 job 所在 plan.id 原值>"}（与 13195 链逐字同构）
   - runtime roots/协议（每端点一次）：{"method":"agents.lifecycle","params":{"action":"inspect","server":{"host":"<profile host>","port":22,"username":"<qgking|zlk>"},"projectDir":"/mnt/3bb01a96-4d48-4134-9dcc-1e1cdd11daa3/zlk/MultiModal" 或 "/data/qgking/zlk/MultiModal","mode":"worker_telemetry","workerId":"<nwpu5|nwpu2|nwpu3>"}}
6) P1 裁定确认记录：panelMessageDispatch 按主控裁定**不改构建脚本/manifest**——由 acceptance 全 glob 覆盖并在同一正式闭环内以额外显式命令记录通过（Linux 侧既有 receipt 1zxzxdsp 11/11 可作为该显式命令的等效证据引用，Windows 闭环时由主控执行同参数显式命令）；四修改测试文件其余 3 个已在 package 必验域内。manifest 保持 §24 冻结态，无新改动。

## §30 held=4 首回传分析 + agents.lifecycle inspect 真实必填 + job-artifacts 具体参数（只读，2026-10-24）
1) 首次 stagedSlots（宿主 13:22Z，project-files 无 generation，exit0，/host/d/…/artifact-slots-17f62456…/project-files.json）：candidates=[]，**held=4**，identities=[47be3d71…,008f3730…]——与 §27/§29 推导逐字一致（错误链 identity=project-files 两 lane 现场实证）。代码解释（stale_report L213-253）：inventory 模式每占用 slot 一行入 held，**held=4=两 lane×各两 slot 全部占用且全部 fail-closed**（各自 status 未回传——handler 只 reduce 计数，明细属 API 不可见，未知）。candidates=[] 在 inventory 模式是设计必然（保留窗口终态也入 held），**不证明"合法无 bug"**；held 归属（终态滞留 vs 异 identity vs 锁定/未决）未知，须 admission 预览（下）或后续观测。
2) **generation 复用契约差异（已证源码，恢复逻辑 bug 候选，交主控定修）**：SimpleSFTP 契约 fpsync generation="stable-run-id"（extension.js:1701）；Plan 产物链（syncDistributedJobArtifacts legacy.ts:13196）generation=plan.id 稳定→重试可命中 own generation 恢复（stale_report own_generation_seen/resume 语义）。**错误链**（mergeLatestWorkerVersions L9485-9488 不传 generation）→ SimpleSFTP L2129 `generation: options.generation||_operationId||transferController?.operationId||nextTransferId("staging")` —— 每次重试（30s 自动）都是**新 generation**，永远无法命中自身两代 slot，只能等外部 managed cleanup → 与 13:01/13:09/13:10 三批持续 TRANSFER_STAGE_PENDING 一致。修复与否/形状由主控裁定；本轮不改。
3) agents.lifecycle inspect 真实必填（agent-lifecycle.py lifecycle_contract L76-99，已证）：**projectDir（必须存在，无 symlink 父链）、installDir（params["installDir"] 直接键→必填，路径可不存在 exists=False）、mode="worker_telemetry"、workerId 非空、host∈{localhost,127.0.0.1,::1}(loopback)、port=int 1-65535**；stateDir/condaEnv/agentToken 协议可省略（stateDir 省略→<installDir>/state/projects/<basename>.<sha16>）。agentPayload 白名单（agent-lifecycle.js:19-23）字段名=action/projectDir/installDir/stateDir/workerStateDir/mode/workerId/host/port/condaEnv/agentToken。inspect 免双确认（extension.js:4148）。inspect 值取自真实配置（nwpu5：codeRoot=/mnt/3bb01a96-4d48-4134-9dcc-1e1cdd11daa3/zlk/MultiModal，installDir=<agentProjectDir>/simple_agent=agentRuntimeDirs 推导 L24632，remoteAgentPort=18765）：
   {"method":"agents.lifecycle","params":{"action":"inspect","server":{"host":"10.68.10.238","port":22,"username":"zlk"},"projectDir":"/mnt/3bb01a96-4d48-4134-9dcc-1e1cdd11daa3/zlk/MultiModal","installDir":"/mnt/3bb01a96-4d48-4134-9dcc-1e1cdd11daa3/zlk/simple_agent","mode":"worker_telemetry","workerId":"nwpu5","host":"localhost","port":18765}}
   nwpu3/nwpu2 同形（server host 10.70.50.180/10.69.24.150 user qgking，projectDir/installDir 前缀 /data/qgking/zlk）。返回中 contract=按入参派生的映射、status/schedulerRuntime.protocol/runningVersion=现场实况；owner 不匹配（AGENT_LEGACY_STATE_UNVERIFIED 等）本身即根因证据。
4) job-artifacts 变体具体参数（快照真值，均 nwpu3→同 root 取证在 nwpu2 端）：retentionKey=JSON.stringify 的**字符串**（handler L4167 直接传字符串，scope 不再 stringify）；plan.id="distributed-plan-1792838325758-ena14l"（快照 L9242）、planFile="experiments/plans/comparison/qmf.yaml"（L8337）、idx2 case="qmf_bus_p100" seed=44、idx3 case="qmf_pad_p100" seed=42、idx4 case="qmf_pad_p100" seed=43（L9036-9175 job 头实字段）。三例（idx2 形）：{"method":"files.cleanup.stagedSlots","params":{"node":{"kind":"remote","host":"10.69.24.150","user":"qgking","port":22,"root":"/data/qgking/zlk/MultiModal"},"retentionKey":"[\"job-artifacts\",\"experiments/plans/comparison/qmf.yaml\",2,\"qmf_bus_p100\",44]","generation":"<sha256(\"p2-admission-preview-20261024\")>"}}；idx3/4 同形改 3/4、case、seed。project-files admission 预览（held 归属判定关键一发）：retentionKey="project-files"+同 preview generation。错误链 slot 内 journal 的 generation 来自 fpsync 每次调用 transferController.operationId 的 sha256（≠job commandId），故**无需也无法用 commandId 复现原 generation**；预览用固定 marker sha256 即可，两代均他终态时最旧代入 candidates（带 status/generation/updatedAt）。
5) 边界重申：held=4 不等同合法门禁；候选=0 不授权清理；无跨 identity 绕过。API 数据回传后归属/契约缺陷分析归本端。

## §31 admission 五件套分析：slot 死锁结构闭合 + inspect 参数机械修正 JSON + 最小修复计划建议（未实现，2026-10-24）
1) project-files-admission（宿主 13:22:49Z，params generation=609bd3fa…（marker 预览），HTTP200）：candidates=2=d-47be…/slot0 与 d-008f…/slot0，**status 均 committed、generation 同为 1072c6c5…**（一次 fpsync 操作共享两 lane），updatedAt=1792842425/1792842574s≈12:27:05/12:29:34Z（与 plan 入队 epoch 1792838325=11:18:45Z 同时钟源）；held=2=每 lane 另一 slot 的最新他代（**明细不回传，其 status/generation 未知**）。eviction 条件（stale_report L238-247）=每 lane 两 slot 全为他终态代→最旧入 candidates：**已证两 lane 均被"两个其他终态 generation"占满，任何新 generation（含每次 30s 自动重试）必被 claim L320 拒**。
2) qmf-2/3/4 admission：candidates=[] held=0——job-artifacts identity（例 13cbd8bf…/0d8d7f4a…）**从未落盘**→错误确走 mergeLatestWorkerVersions project-files 链而非 plan 专用链（与 §30-2 一致；不存在跨链残留）。主控边界接受：禁止为绕槽换 job key/generation 绕过现存 project-files 残留。
3) **slot 死锁结构闭合（已证部分+未知部分）**：已证=①错误链 generation 不稳定（每次调用新值，§30-2）；②错误链 identity=project-files 为 root 级恒定，多 job（qmf2/3/4+summation）共享两 lane；③最后成功 commit 在 12:27-12:29（1072c6c5），此后所有重试为新 generation 他代→永久 PENDING；④SimpleSFTP 设计=slot 释放必须 files.cleanup.preview(confirmed_paths)+双确认+execute（L1883-1886 注释明言 never auto-confirmed），而 zlk 产物同步链**从未接入该确认释放通道**→首批使用后 slot 永不释放=结构性缺陷候选（非瞬态、非用户配置）。未知=held 两 slot 的具体 status/generation（API 不可见）；1072c6c5 对应的具体 job 集。
4) nwpu5-inspect：result.ok=false AGENT_TMUX_WINDOW_MISSING 'simple-worker-nwpu5-agent'。RPC envelope 正常≠runtime 健康；但 lifecycle_health 失败返回 {}（L336-337 falsy），lifecycle_inspect 仅在 **health 非空**时 raise TMUX_WINDOW_MISSING（L447-449）⇒**已证 nwpu5 agent HTTP(:18765/api/health) 正在响应**。报错原因=调用入参缺 sessionPrefix，lifecycle_tmux_config 用默认 "simple"（L145）；真实 globalState remoteTmuxSessionPrefix="zlk"（快照 L8）。agentPayload 白名单含 sessionPrefix（agent-lifecycle.js:22）→**可证一次参数机械修正**复查：
   {"method":"agents.lifecycle","params":{"action":"inspect","server":{"host":"10.68.10.238","port":22,"username":"zlk"},"projectDir":"/mnt/3bb01a96-4d48-4134-9dcc-1e1cdd11daa3/zlk/MultiModal","installDir":"/mnt/3bb01a96-4d48-4134-9dcc-1e1cdd11daa3/zlk/simple_agent","mode":"worker_telemetry","workerId":"nwpu5","host":"localhost","port":18765,"sessionPrefix":"zlk"}}
   （期望 session=zlk-worker-nwpu5-agent，满足 session 正则 L152；nwpu3/nwpu2 同样需带 sessionPrefix="zlk"，若其 session 命名不同以报错名再证，不猜）。复查后若报 AGENT_PROCESS_UNVERIFIED，其 differences 列表=contract 与 agent 实例差异（roots/协议），仍为根因证据，非故障。
5) 最小源码计划建议（**交主控裁定，本端未实现**）：
   P2-a（解锁现场，零代码）：现存 candidates 两条（committed 1072c6c5 最旧代）已由 stagedSlots 呈现——按 SimpleSFTP 既有确认通道 files.cleanup.preview(confirmed_paths)+双确认+execute 释放；属宿主显式授权操作，不属于代码修复，是否执行由主控/用户决定。
   P2-b（generation 稳定，zlk 侧最小改动）：mergeLatestWorkerVersions completedJob 分支 fpsync 传逻辑稳定 generation（含 scope 文件集+各文件 sha256+destination 的稳定摘要）：内容未变→同代命中 own resume/幂等（claim 允许 journal 携带本代续传）；**内容变化（产物哈希/文件集变）必然新代**且两代保留门禁原样保留。仅此项不能让"新内容在满槽"落盘，须配 P2-c。
   P2-c（释放闭环，结构主修）：产物同步遇 TRANSFER_STAGE_PENDING 时把 stagedSlots 候选经现有 UI 确认流（非自动）交给用户释放，或按主控裁定的其它显式入口；不改 SimpleSFTP 双确认语义、不自动清槽。
   P2-d（可选低优先，错误1 侧）：targetRootGuard 绑定缺失与真实状态根命中分流错误文本，提升可诊断性。
   建议顺序：nwpu5 复查（4）→ 错误1 子类闭合 → 主控定 P2-b/c 形状与授权范围 → 实现+先红后绿夹具→完整验收；P1 冻结仍待 P2 计划定形。

## §32 §27-4 勘误（主控指正，2026-10-24，原文保留）
§27-4（本文 L247）"无可靠最新版→skip 该文件，不传输、**不阻塞其他文件**；skip 聚合进错误文本造成噪声"不精确，撤回后半句。源证（mergeLatestWorkerVersions completedJob 分支，legacy.ts L9444-9499）：planned.skipped（"版本未校验"/"没有可靠的最新版"，SyncLatestMerge.ts L12/L20）与 work 过滤追加的 codeOwned skip 合并入同一 skipped 数组（L9443），L9470 `if (skipped.length) throw new Error(skipped.join("；"));` 位于 groups 建立（L9471）与任何 fpsync 之前——**任一非空 skipped 使整个 job 的最新产物同步未完成**（runCore catch→latestArtifactSync=partial+retryAfter 30s，CompletedJobSyncHost.ts L79-84），不是 UI 噪声。对照：同函数非 completedJob 分支把 skipped 并入返回值 errors 且不抛（L9499 `if (!work.length) return { completed: [], errors: skipped };`、L9510-9511），verifyOnly 也以 errors 表达"待同步"（L9475）。

## §33 nwpu5 inspect 复查（一次可证参数机械修正后，只读）
sessionPrefix="zlk" 修正后 HTTP200/RPC ok=true，status=running，exit0；快照 /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/artifact-runtime-33974069-db5f-455a-aa79-f6df2ab3a13d/nwpu5-inspect.json，日志 75526738-284a-4d9d-ac3e-e224b7e8682d。首败（默认 prefix "simple"→AGENT_TMUX_WINDOW_MISSING）证据 §31-4 保留。
1) 现场事实（13:24:30Z）：runtime projectDir/installDir 与配置推导完全相同；stateDir=/mnt/3bb01a96-4d48-4134-9dcc-1e1cdd11daa3/zlk/simple_agent/state/projects/MultiModal.3945a8342900d872——与代码根 …/zlk/MultiModal 为 sibling 而非其后缀，再次支持"状态根 prefix 命中拒绝不可达"；runningVersion=0.5.408，workerId=nwpu5。
2) schedulerRuntime.protocol=1、status=current 是 **scheduler 协议，不是 gpuCollectorProtocol**，不得据此认定 probe=协议1缺根（主控提醒，采纳）。
3) 候选排除更新：根目录/挂载 UUID 漂移、agent 未运行两候选被当前 inspect **否定**；未知仍是 cached lastWorkerProbes 内存内容（guard 拒绝时刻的实际字段）与当时 gpuCollectorProtocol 值——inspect 只证当前 runtime，不证缓存健康。错误1 现场子类（冷启动瞬态/probe 永久不匹配/protocol1 未报 state 目录）归属未定；nwpu3/nwpu2 inspect（带 sessionPrefix="zlk"）待回传。
3a) nwpu3/nwpu2 inspect 复查回传（主控 13:29:55–56Z 采集，宿主快照 /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/artifact-runtime-pair-d6c4ba4a-031a-4082-8459-5e0ba26e7d90/nwpu3.json 与 nwpu2.json，日志 ef094117-073e-468e-9118-e59ba2d0eac8 exit0）：两端 business ok=true、status=running、runningVersion=0.5.408；contract projectDir=/data/qgking/zlk/MultiModal、installDir=/data/qgking/zlk/simple_agent、stateDir=/data/qgking/zlk/simple_agent/state/projects/MultiModal.39490353939b4066（state 为代码根 sibling，同 nwpu5 形态）；activeTasks[] 存在；scheduler 协议事实不作 gpu 协议解读。**当前 inspect 三端均合法**；cached probe 仍未知，非缓存健康证据。错误1 保留"当前绑定准备缺口"的准确调用建议+现场未知边界交主控裁定，不再泛查服务器。

## §34 可实施最小形状+接口/测试影响面（本端分析，交主控计划；本端未实现）
约束逐条对齐：稳定 job/run 身份从 CompletedJobSyncHost 调用方补传；不用 sourceId+outputDir 恒定 generation；不为躲 project-files 旧槽随意换 identity；内容变化不得复用同代；与既有专用链兼容；cleanup preview+execute 全程不授权，外部服务器只读，候选即便 committed 也不释放。
A) 身份链（错误2 主修）：
   - 签名：mergeLatestWorkerVersions options.completedJob 由 {sourceId} 扩为 {sourceId, retentionKey, generation}；merge 自身不推导身份，只透传给 L9485-9488 fpsync 调用对象（与专用链 L13195-13196 同形）。SimpleSFTP 侧不改（retentionKey/generation 入参与 L2129 回退链保持）。
   - 调用方 runCore 逐 job 循环内已持全部字段（CompletedJobSyncHost.ts L47-69；job 选择/替代检测契约即 {plan.id,index,commandId} 三元组，L42-45/L57）：retentionKey=JSON.stringify(["job-artifacts",plan.planFile,job.index,job.case,job.seed])——与专用链逐字同构，identity 空间不新增、不换 key（project-files 旧槽与本形状无关，其释放仍仅走既有双确认人工通道）；generation=`${plan.id}:${job.commandId}`——run(plan.id)+dispatch(commandId) 两级，commandId 每次派发必变（L11524/L12367 队列语义），新运行/attempt/内容变化⇒新代，杜绝同代错误复用；两代保留门禁原样。
   - 专用链同步改用同一表达式（提取单一纯函数如 artifactSyncRunGeneration(plan,job)，两链一处定义），否则同一 job identity 下混两种 generation 语义；专用链现行 String(plan.id) 在 plan 内 job 重试（新 commandId 同 plan.id）时同代复用，是本约束已存在的缺陷面，统一修正属兼容而非破坏。切换后旧代 slot 由两代门禁自然轮替为 stale 分类，不发生任何清理。
   - 不用 sourceId+outputDir 恒定 generation 的理由（已证）：outputDir 跨 plan 稳定复用、sourceId 按 worker 稳定→恒定代会覆盖新运行身份；不用任意新 key：job-artifacts key 是既有专用链契约身份，per-job fpsync 语义一致（completedJob 分支单次调用只处理当前 job 的 scopes/groups）。
B) skipped 语义（错误3，判为真实缺陷候选，最终裁定权在主控）：依据=①同函数两分支语义不一致（A 段 §32 对照）；②涉事路径为工具链自产残留（.training_outputs_before_quality_*/旧 tb_events/.job_metrics.csv.<id>.pending），必然出现在 job own outputDir 目录级 scope 内且永远无 manual/plan/candidate/same 最新版→该 job 永久 partial、30s 死循环重试（与错误3 三 job 持续报错一致）；③落地安全不依赖该 throw（ambiguous 文件本就不进 files/groups，"文件内容与本次最新产物不符"校验只针对已传输 batch）。最小形状：completedJob 分支仅对"版本未校验"类保留 throw（可能为未校验真产物）；"没有可靠的最新版"/codeOwned 类改为结构化返回（如 skipped 字段），runCore 只在 errors 非空时 throw，skipped 记入 latestArtifactSync 观测字段而不阻断 synced。注意 runCore L70 现把任何非空 errors 也 throw→仅改 errors 分类无效，必须结构化。不改：scope 契约、扩展名排除、文件删除、unverified 与 hash 校验强度。
C) 保留计划项：P2-a 现存 project-files 候选释放=纯人工既有双确认通道（本轮一律不授权）；P2-c "安全拒绝→既有明确确认 UI"评估=复用 files.cleanup.stagedSlots 只读预览面+既有确认 UI，不新增默认删除、代码不调用 cleanup、不改另仓；P2-d 错误1 文本分流低优先。
D) 接口影响面：legacy.ts mergeLatestWorkerVersions 签名+L9485 fpsync 入参、syncDistributedJobArtifacts L13196 generation 表达式、CompletedJobSyncHost.runCore L69 调用点+L70 结果分类（B 项）、一个新增纯函数（features/ 下，随现有导出模式）。SimpleSFTP 仓库零改动。
E) 测试影响面（grep 实证全集）：
   - 直接：test/features/completedJobLatestSync.test.js（AST 抽 mergeLatestWorkerVersions+真实 CompletedJobSyncHost，L12/L29-31/L85/L133-155；transfers 断言需带新 retentionKey/generation，fixture job 需含 planFile/case/seed/commandId；B 项需新增 ambiguous 不阻塞用例并核 L36 errors 断言语义）。
   - SyncLatestMerge 输出若结构化：test/features/syncLatestMerge.test.js、syncScopeMetadata.test.js、syncScopeWorkerAuthority.test.js（三处 require 实证）。
   - 专用链方法抽取夹具（generation 表达式改动波及；方法边界不动则锚点稳，新纯函数需在 vm sandbox 补依赖）：distributedQueueStartup.test.js+distributedQueueStartup.support.cjs、distributedQueueStartupMirrors.test.js、distributedQueueStartupRecovery.test.js、manualDistributedResultSync.test.js（L47 抽方法、L124/L139 调用断言）、idleGpuDispatchLifecycle.integration.test.js（stub）、completedPlanWorkerMirror.test.js（L16 方法名清单锚）。
   - 与 P1 已登记四测试文件无交叉；若实现新增测试文件须追加 package 必验清单。

## §35 r5 P2 身份块实施+验证（2026-10-24，同 worktree/同实例，未提交未冻结）
1) **协议前置取证（simple-sftp 只读，未改另仓/协议）**：①capability L1701 generation="stable-run-id"、retainedGenerations:2；②stagedLogicalKey（extension.js:1826-1841）scope=options.retentionKey||（directory?"directory:"+rel:"project-files"），identity=transferScope64(JSON([scope,lane]))，注释契约"the same logical source keeps ONE two-generation slot across workers and reruns; generation is the caller's stable run/command id (**retries and extra batches reuse it**)"；③fpsync 入口 L2129-2131：调用方 generation 显式传入优先，内部 partitionTransferPaths 把一次调用拆多批**共用同一 effectiveOptions.generation**——同代多批为协议原生假设；④staged-tar-receive.py claim（L257-330）：空槽可占；**同 identity+同 generation 的终态槽可原地 resume/re-run**（L306-308"resume/re-run in place, no new generation"；锁下重校验 L321-330）；他代（终态或在飞）永不覆盖，两槽全他代→TRANSFER_STAGE_PENDING"a third generation must not land"（模块 docstring 与 L316-320 一致）；chunk 路径 L540-542 注释：committed 重跑/failed 重试/崩溃态合法复用同代槽。→ **形状兼容结论：无冲突，可实施**；"generation 不能仅 plan.id:commandId 声称覆盖内容变化"由冻结源清单绑定解决。
2) **实现（P2 身份块 diff=.review-ui-plan-gpu-20261024/review-r5-identity-part.diff，3 hunks+4 文件）**：①新增 src/features/JobArtifactSyncIdentity.ts：jobArtifactRetentionKey（既有 job-artifacts 五元组逐字同构，非随机 key）+ jobArtifactRunGeneration=sha256(JSON(["job-artifact-run",plan.id,commandId,规范排序[path,小写SHA]清单]))（64hex 经 transferScope64 直通）；②CompletedJobSyncHost.runCore L69 completedJob 补传 {planId,commandId,retentionKey}（全部取自真实队列行，pending 过滤 L40 保证 commandId/workerId 非空，无臆造）；③mergeLatestWorkerVersions 签名 completedJob 扩展三字段，completedJob 分支 fpsync（L9486-9490）透传 retentionKey+generation（源清单=该函数冻结 files map=sourceId SHA 全集，不含目标端信息）；④测试夹具 vm sandbox 补 jobArtifactRunGeneration 依赖（单点，未拆方法边界）。**语义矩阵**：同输入重试/重载→同清单同 commandId→同代（命中 own resume）；新 commandId/新 plan/任一 SHA 变/文件集变→新代；**目标端缺失集合不进任何输入**→目标进度不换代（r5 逐项满足）。
3) **专用链决定（交主控确认）**：syncDistributedJobArtifacts 方法体未改——其 retentionKey 与纯函数值逐字节相等（新纯函数测试以字面量钉住该形状防漂移）；改方法体需 6 个 vm 夹具补依赖而零行为收益，r5"如需…仅改此已证接口一致性"条件不成立。其 generation=String(plan.id) 现状保留（plan 内重试同代复用为既有面、无现场证据、r5 未授权改）。两链在同一 job identity 下各持一稳定代（G_run/G_planid），各自 own-gen 复用自己的槽，两槽满时第三新代 PENDING=既有两代门禁预期（人工释放通道不变）；project-files 残留槽不受影响，P2-a 人工通道不变、未授权。
4) **验证矩阵（全经 pi-test-evidence/batch_verify，真实退出码）**：首红①jobArtifactSyncIdentity 模块缺失 /tmp/pi-test-3lcj8zyl exit1；首红②completedJobLatestSync 15 绿+新断言 2 红（retentionKey undefined）/tmp/pi-test-oqre4k63 exit1；compile 门禁绿 /tmp/pi-test-r98xg95y exit0（closure src[3]/test[2]）；实施后 ou8bkrcw 19/20——失败=我的新用例未造 delta 而无传输（delta-only 为既有正确行为，非源码缺陷），一次修正补真实 delta；9hf7agq7 19/20——失败=新断言 generations[1] 恒 undefined 的机械笔误（after.length==2 与 includes(g0) 已绿、语义自证），二修正改 find 形式；最终 /tmp/pi-test-t7636i_m **20/20 exit0**。**如实交裁**：同一新用例断言构造链上两轮测试侧修正（均为我新增测试自身问题，源码未再动，两败日志保留）。
5) **受影响回归（batch_verify receipt batch-eaz14pru，串行）**：syncLatestMerge/syncScopeMetadata/syncScopeWorkerAuthority/completedPlanWorkerMirror/distributedQueueStartup(+Mirrors/Recovery)/idleGpuDispatchLifecycle 8 文件全绿（dmnzcjsi、x6veo9by、ljckthyo、2yb6yy4u、wdbizpc6、z56et2au、kvp29yfv、iadcinks）；**manualDistributedResultSync 3 例失败**（108!==1/2!==1/20!==1，ad15er6r）——**基线对照同败**：原冻结目录 /repos/MCP/zlk-cluster-orchestrator 同测试同断言行相同失败（/tmp/pi-test-xv04c9x5），且该文件不在 check:full/package 显式域清单（test-workflow.json L179-211 domains 全枚举+manifest 全文 grep 无此项）→ 既有门域外失败，与本块无因果（专用链方法体零改动），r5 保护区不改，列待审（是否修复由主控裁定）。
6) **manifest**：新增 test/features/jobArtifactSyncIdentity.test.js 未入必验域，构建脚本未改（与 r4 panelMessageDispatch 裁定同形）——本块已实际经 pi-test-evidence 执行，正式闭环由主控在同一验收内以显式命令记录（文件路径+argv 同上）。
7) **保护区遵守**：无服务器写入/同步触发（全部 tmp fixture）；未调用 files.cleanup.*；未动两代门禁/确认语义/队列完成事实；错误3 与错误1 源码未动（错误1 仅保留 §33 绑定准备缺口+现场未知边界交主控）；未提交、版本未冻结。

## §36 r6 返修：基线因果勘误+专用链身份统一+跨入口/真实 receiver 行为证据（2026-10-24，同 worktree/同实例，未提交未冻结）
1) **§35-5 基线说法勘误（r6 必须项2，主控只读实证原目录 HEAD=b65d9b36≠本轮基线 e9795ad0）**：xv04c9x5（b65 工作区运行）不能直接作当前基线豁免。取证：①`git merge-base --is-ancestor e9795ad0 b65d9b36` exit=1（b65 非本轮基线后代，两者输入不同源）；②b65 vs e9795ad0 diff：src 217 行/dist 243 行差异、manualDistributedResultSync.test.js 无差异；③用既有 **/repos/MCP/zlk-cluster-orchestrator-master-ancestor**（干净 e9795ad0 检出副本，非 /tmp 缺闭包拷贝）同参数运行该测试：**同 3 败 108!==1（L126）/2!==1（L268）/20!==1（L360）**，日志 /tmp/pi-test-7w7pb_0k exit1。**因果分类：该 3 败为当前基线 e9795ad0 上的既有失败**（非本轮分支引入，也不因门域外而忽略——本次受影响检查仍逐项跑并分类）。原目录未动、无新 writer。
2) **r6 必须项1 实施（专用链复用同一 jobArtifactRunGeneration）**：legacy.ts syncDistributedJobArtifacts groups 传输循环 L13200-13204，generation 由 `String(first.plan.id)` 改为 `jobArtifactRunGeneration(first.plan.id, first.job.commandId, Object.fromEntries(paths.map(file=>[file, lower(job.artifacts[file]||"")])))`。输入=**真实 plan.id/commandId+分批前完整冻结清单**（paths 为 L13192 分批前全集 `[...new Set(items.flatMap(item=>item.paths))].sort()`，非当前 5000 批次子集；job.artifacts 在 collected 合并（L13133）后为完整 SHA 域）。retentionKey 字面量与批次/协议/方法边界未动，未放开第三代。跨入口同域成立依据：B 链 bulk+needsInventory 的 collected=collectDistributedJobArtifacts(outputDir,inventory)=目录全集（排除 lock/pid/exit_code、仅 64hex、需含 .log），与 A 链 merge 冻结 files（sourceId SHA 全集）同 inventory 时同 manifest。多 attempt 组说明（如实登记）：groups key 不含 attempt，若同 job 多 completed attempt 入同组，generation 取 first（队列序首见）；既有 post-transfer 校验本就按 per-item `checked[path]===job.artifacts[path]` 消歧（不同 SHA 必有一项 failJob），retentionKey 亦不含 attempt——本次改动不新增该面行为。
3) **跨入口+真实 receiver 行为回归（新文件 test/features/jobArtifactStagedSlotIntegration.test.js，2 用例）**：入口 A=真实 CompletedJobSyncHost→vm 抽 TS 的 mergeLatestWorkerVersions→fpsync 捕获；入口 B=真实 vm 抽 dist 的 syncDistributedJobArtifacts("bulk",verifyAll=true)→fpsync 捕获（fixture 依赖照 manual 夹具最小补齐：NativeResultManifest_1/PlanOutputRetention/DistributedJobArtifacts_1/jobEvidenceName 编译为 NativeResultManifest_1 引用/lastWorkerProbes 直设；automatic 保持 falsy=真实 4 参调用面，不触 mirror-owner）。断言：同五元组 retentionKey 逐字相等；**跨入口 generation 相等（64hex）**；同入口重试同代；内容变→新代且跨入口仍同代；新 command 同清单新代（纯函数契约）。receiver 部分**不用恒成功 stub**：直调现成 /repos/MCP/simple-sftp/staged-tar-receive.py（只读 co-located，`python3 -I`+b64 deflateRaw payload+stdin 自构 tar，assert 存在不静默跳过），identity=sha256(JSON([retentionKey,0]))（extension.js L1835-1840 stagedLogicalKey 契约）。行为序列全绿：G1 receive exit0 committed→**跨入口同代重放仍仅 1 槽**→G2（V2 真实内容变化）exit0 两槽→G3（V3 第三真实不同内容代）**exit≠0 且 stderr 含 TRANSFER_STAGE_PENDING、不落任何槽**；被拒代不释放既有槽（两代门禁原样）。
4) **验证矩阵（全经 batch_verify/pi-test-evidence 真实退出码；compile 为构建检查走原生 Bash）**：首红①夹具 required 缺证据文件（B 链 required 含 jobEvidenceName(protocol2)="artifact_manifest.json"，NativeResultManifest.ts L3-5/L13114-13116）/tmp/pi-test-2bkijbr0 exit1——修夹具（三版本清单各补该文件，两链共享同一 files 域）；首红②（目标行为红）**改源码前**跨入口断言红：B 链 generation='plan' 非 64hex（q1l4lsok L182 actual:'plan'），且真实 receiver 对 generation='plan' 直接 `ValueError: invalid transfer scope`（IDENTITY_TOKEN ^[0-9a-f]{8,64}$，L30/L124-125）——**String(plan.id) 形态在接收端本就不协议合法，实际链靠 extension transferScope64 回退 sha256('plan') 恒成单代→内容变化永不开新代=本次已证回归**；compile 门禁绿（run 2026-10-24T13-44-26-914Z-953770，7 门 exit0，closure src[1]/test[2]）；实施+命名空间依赖修正后集成 **2/2 exit0**（batch-ydfzd1m0/pi-test-98qf0sr9）。
5) **受影响回归（batch-uuix_d1n 16 文件串行）+补依赖复核（batch-ei37o7xe）**：manualOnlyResultSync、distributedQueueStartup(+Mirrors/Recovery)、prequeueRecallBulkSync、serverPlanQueueRecovery、resultMergePreflight、syncScopeWorkerAuthority、syncScopeWriteLease、planStopClear、idleGpuDispatchLifecycle、completedJobLatestSync、jobArtifactSyncIdentity 11 文件全绿；workerFpsyncTaskLabel/completedPlanWorkerMirror/manualDistributedResultSync 三败均为 **JobArtifactSyncIdentity_1/jobArtifactRunGeneration 未定义**（r6 授权的最小 vm 夹具依赖补全：dist 抽取注入命名空间、TS 抽取注入裸函数，均取 dist/features/JobArtifactSyncIdentity.js）；复核后 workerFpsyncTaskLabel（8o7ldcgd）、completedPlanWorkerMirror（d9b_wha8）**绿**，manualDistributedResultSync（iay4v4cw）回到**仅 §36-1 既有 3 败**，断言值逐项一致（108!==1/2!==1/20!==1），无 JobArtifactSyncIdentity 相关新败。
6) **一次自修政策执行登记（r6 L60 指正后）**：本轮三条独立失败链各一次修正——①夹具 required 证据文件缺失→FILES 补全（2bkijbr0→修）；②exact generation 期望重算与 merge 内部 scoped 域不符（含范围目录键，形状属实现细节）→改关系断言（跨入口相等/重试同代/内容变新代），**如实说明：该修正系同轮内识别后立即执行，属事后在此补登**；③dist 编译形态为 JobArtifactSyncIdentity_1 命名空间引用（r5 只覆盖 TS 抽取的裸函数面）→新测试 sandbox 换注入形式。三条均测试/夹具侧、原因有源码实证；源码改动仅 §36-2 一处（r6 授权核心），无逻辑侧自修。
7) **manifest 与保护区**：新增 test/features/jobArtifactStagedSlotIntegration.test.js 未入必验域（构建脚本未改，同 r4/r5 裁定形），本块已实际执行（文件路径+argv 见 §36-4/5）；正式闭环仍由主控在同一验收内显式记录。改动文件全集：src/extension/legacy.ts（1 处表达式+注释）、test/features/jobArtifactStagedSlotIntegration.test.js（新）、test/features/workerFpsyncTaskLabel.test.js/completedPlanWorkerMirror.test.js/manualDistributedResultSync.test.js（各 1 行 sandbox 依赖）、dist 相应再生。保护区遵守：无服务器写入/未触发同步/未调 files.cleanup.*；两代门禁、verifyOnly/assertCurrent/哈希不匹配原断言、传输协议、批次 5000 语义、方法边界未动；错误1/错误3 源码未动；未提交、版本未冻结；原目录与所有副本/日志保留。

## §37 r7 夹具交付修正：跨平台分离+显式注入（2026-10-24，同 worktree/同实例，未提交未冻结；业务源码零改动）
1) **三点修正（r7 具体项逐一对应）**：①入口 A/B root 由固定 "C:/jobA/C:/jobB" 改 **os.mkdtempSync(os.tmpdir()/simpleex-slot-{jobA|jobB}-)** 独占目录（support fixtureRoot，每次 run 新建）；②**平台分离**：原 jobArtifactStagedSlotIntegration.test.js（226 行）拆为 jobArtifactStagedSlotIdentity.test.js（可移植跨入口身份回归，纯 JS、零 receiver/python/固定路径引用——Windows 完整闭环可执行）+ jobArtifactStagedSlotReceiver.test.js（Linux 专属真实 receiver 两代断言，POSIX python3/fcntl 依赖，**平台适用性随最终清单记录**）；共享夹具入 jobArtifactStagedSlot.support.cjs（断言 1:1 迁移，无删减、无 skip、无假 receiver；旧文件全文永久留存于 .review review-r6-dedicated-chain.diff，拆分后该文件删除——任务工作副本内自有未提交文件的迁移性重组，非证据清理）；③**receiver 显式注入+SHA 绑定**：ZLK_SFTP_RECEIVER（路径）与 ZLK_SFTP_RECEIVER_SHA256（=7a262d1b753bb70e5f1c3d4740cfb7942ded0e3febcdcde9152d55e2f55ba274，本次 r5/r6 取证的 receiver 源码）双 env，缺一/不符均硬失败；解释器复用既有 process.env.PYTHON 注入面，默认 python3。
2) **接口取证（r7"先核现成 evidence/env/argv 入口，不能猜接口"）**：node --test 固定参数无自定义注入口；项目既有外部资源注入先例=idleGpuDispatchLifecycle.integration.test.js L214 process.env.PYTHON||'python' 与 syncScopeHashCache.test.js SCOPE_* env——采用同类 env 显式注入，非新建绕门禁工具（不放宽任何断言，缺资源=fail）。项目内不存在指向旁边 simple-sftp 仓的既有配置/env（grep 无 ZLK_SFTP_RECEIVER 既有引用）；测试不再默认解析 ../../../simple-sftp，本机实际值由验收命令 env 传入。**现有接口限制如实报告**：test-workflow/package 必验域按文件路径执行、无 env 注入面，故 Linux receiver 项以"显式命令+env"作为任务级必验（同 r4 panelMessageDispatch 显式命令裁定形），不为本项改构建脚本、不要求 Windows 发行机旁边有 simple-sftp 源码或 POSIX Python。
3) **验证（r7"只重跑受影响两项+必要语法，不变回归复用"）**：可移植身份 1/1 绿（batch-nq01h92k/pi-test-p8d07d6m exit0）；Linux receiver（env 注入）1/1 绿（pi-test-4fa90hi6 exit0，含日志打印 verified receiver sha256）；语法 node --check 三文件全绿（/tmp/pi-test-vff6fy8c、9n3u07op、b_aeoga5）；**缺注入硬失败属性证明**：无 env 运行 receiver 套件 exit1、fail=1、skipped=0（/tmp/pi-test-e70199cs）——非 skip 求绿。§36-5 十六文件回归不重跑：r7 仅新增/拆分测试夹具，legacy.ts/CompletedJobSyncIdentity 相关既有测试输入未变（e9795ad0 基线 3 败因果分类仍适用；后续相关源码变化须按 r7 重算因果）。
4) **最终清单平台适用性记录（交主控入验收包）**：`test/features/jobArtifactStagedSlotIdentity.test.js`=跨平台可移植必验（Windows/Linux 均可执行）；`test/features/jobArtifactStagedSlotReceiver.test.js`=**Linux 专属必验**，验收命令 `env ZLK_SFTP_RECEIVER=<staged-tar-receive.py 路径> ZLK_SFTP_RECEIVER_SHA256=7a262d1b753bb70e5f1c3d4740cfb7942ded0e3febcdcde9152d55e2f55ba274 node --test --test-force-exit --test-timeout 60000 test/features/jobArtifactStagedSlotReceiver.test.js`（本机取证路径 /repos/MCP/simple-sftp/staged-tar-receive.py）；两文件均未入构建必验域（同 r4/r5/r6 裁定形，显式命令记录交主控）。
5) **保护区**：业务源码零改动（r6 的 legacy.ts hunk 保持原样）；错误1/3 未动；无服务器写入；cleanup 未调用；未提交未冻结。

## §38 r8：completedJob 产物链只读根绑定准备实施（2026-10-24，plan L67-73 授权；同 worktree/同实例，未提交未冻结）
1) **源码三处（仅 legacy.ts，merge 路径）**：①L9442-9453 prepare 块——仅 `artifactCopy && !options.verifyOnly` 进入；准备前后各显式 `await options.assertCurrent?.()`（原队列 fence 语义不变）；**prepare 回调为同步契约**：传入 `() => { checkCancelled(); assertArtifactBindingsCurrent(); }` 两个同步条件，不把 async 队列 assertCurrent 传入后不 await 悬空；guard 绑定证明保持本操作局部（guards Map + assertBindingsCurrent 返回值），未新增任何共享全局 guard。②L9463-9475 `machinePrefixesFor`——本次实际 path 验证只消费冻结 `artifactGuards.guards`（无 `|| 共享缓存` 回退；缺键 throw"缺少本次产物同步的机器状态绑定快照，未同步。"、unknown throw"机器状态映射未知，产物同步未传输。"）；替换 work 过滤（reachable）与 files 过滤（源状态+本机状态双端点映射）两处调用；非产物复制路径保持原 `machineStatePrefixesById` 实时语义不变。③L9513-9516 每传输批次 `await options.assertCurrent?.()` 后、fpsync 前同步 `assertArtifactBindingsCurrent()`。范围约束核验：准备仅遍历本次 targets、每未知端点至多一次现有 bounded 只读 GET（probeWorkerTelemetryTunnel 20s/8s 现有 bounded 面）；已有合法可绑定缓存零 GET；真实状态根覆盖仍拒绝（冻结 guard 消费）；未调用 testTunnel/prepareAgents/lifecycle ensure；`simpleSftpApiCall→assertTransferRootSafety` 实时复核原样保留=双重检查不替代；失效证明不回写缓存（prepare L9298-9301 仅全 fence 后写共享缓存，本操作只读冻结 map）；verifyOnly 不触发准备（L9444 条件），无需网络写前准备即报告未决；SimpleSFTP RPC/通用传输接口未动、无内部 proof 上送。
2) **编译**：`npm run compile` exit0（run 2026-10-24T13-56-25-646Z-956287）；dist 标记"缺少本次产物同步的机器状态绑定快照"核实在 dist/extension/legacy.js L9890。
3) **新测试** `test/features/completedJobArtifactRootBinding.test.js`（6 用例全绿，exit0，batch-nifrsq_p/pi-test-kt49hvfl）：执行 dist 抽取的真实 codeSyncRootProbeConfig/targetRootGuard/prepareCodeSyncRootGuards/assertCodeSyncProbeBindingCurrent/mergeLatestWorkerVersions（同 planSubmissionStateGuard 真实方法先例，stub 边界=GET 内核+状态/清单/传输 host 桩；静态前置断言锁定执行的 merge 含 prepare 调用与缺键 fail-closed 文案）。覆盖 r8 测试面逐条：合法已绑定零 GET+r5/r6 身份（retentionKey 逐字、generation=对冻结 files 现算 jobArtifactRunGeneration 全等，非仅 64hex 形状）；冷/旧缓存各恰一次 GET 后传输+准备前后 assertCurrent≥3；真实 state 覆盖仍拒绝（2 GET 均 ok 且 worker 身份各自正确→files 空、fpsync 0、completed 0，随后后台缓存替换为健康观测不恢复传输=冻结保护不丢）；GET 失败/错 worker/旧形态回执三类 fail-closed 且 fpsync 0；准备中工作区/token/端点/配置四类变化各自取消且 fpsync 0（改端口同时改 worker 字段，断言取"配置已变化"族语义）；verifyOnly 零 GET 零传输保持"待同步"报告。原 assertCurrent/SHA 错误测试与 completedJobLatestSync 身份断言未动；后者与 slot 夹具各补 1 处 prepare 桩（真实方法零 GET 冻结形态，r8"最小补已有 fixture 依赖"）。
4) **失败/自修登记（首败全保留不覆盖）**：夹具依赖闭包链 §36 备注形（081y3dcv→owqe8c4d）已录。本轮新链：首败 uly8twou（files={}）→决定性探针 kkrqfc3q 定位=夹具把 globalStorage 与 workspace root 同置 os.tmpdir()，真实 localMachineStateGuard 对"codeRoot 嵌套于 state 根内"**合法**得出 prefixes [""] 全保护——夹具形态失真非产品缺陷（真实 globalStorage 不在工作区根内；ProjectRootMap L189-200/L147-159 语义核对），修正=双 mkdtemp 兄弟目录+夹具形态自检断言；修正批 yurxb38r 暴露两缺口：默认 GET 回执身份公式在第二次调用返回不存在的 nwpu4（改为按不可绑定子集顺序，判据与真实"旧形态绝不直绑"一致性注明）、vm 跨 realm 对象 deepStrictEqual 原型域比较（主 realm 展开归一后比内容）。6/6 绿。首败与中间态日志 uly8twou/kkrqfc3q/yurxb38r 均在 batch-results 留存。
5) **受影响回归 15 项（batch-pfqeos4d）**：14 项 exit0——completedJobLatestSync、clearedOutputReplacement、manifestCleanup、planJobDeleteRequeueProduction、planSubmissionStateGuard、projectFileIndex、projectRootMap、resultMergePreflight、syncScopeDeletionRefresh、syncScopeWriteLease、syncScopeWorkerAuthority、syncScopeTransferBatch、jobArtifactStagedSlotIdentity、jobArtifactStagedSlotReceiver（env 注入 argv，SHA 绑定同 §37）。planPreflightProgressSpeed 裸跑 2 红（L287 1!==0、L553 40!==0）=§150/§198 既有 AppData 属主 EACCES 环境要求（同签名先例 fd8h34ph/btx4o10f/_ciu00af），该文件不经过 merge 改动路径；按 r3 裁定入口 `check:dev --domains test:preflight-stages --only <该文件>` job passed exit0（batch-tpqrsykm/pi-test-yua64vze，run 2026-10-24T14-03-39-824Z-958016-check_dev）。裸跑红日志 pi-test-eip2hwus 保留，未改断言/未隐藏。
6) **错误3 并行只读分类（r8 授权；两快照 artifact-queue-ed92440e[13:01] 与 artifact-latest-2d3cf1a5[13:10] 的 queue.redacted.json，分析脚本 /tmp/err3-classify/，宿主快照仅读、零写入、未新增任何服务器查询）**：
   a) **失败 job 必要集**：11 个 partial job（qmf idx1-4、summation idx0/1/2/3/5、text_only idx2/4/5；status=completed、latestArtifactSync.state=partial）与 5 个 unknown job 的 **job.artifacts 全部=∅**（两快照一致）；对照同快照 completed+synced job 均 49 项。→ 队列快照内失败 job 无任何产物记录，"必要集与 ambiguous 交集"=∅（因前者为空）。
   b) **ambiguous 集**（错误文案"没有可靠的最新版"，仅 summation idx2/3/5 三 job、各 9 项共 27 路径、跨 job 零交集）三分结构：①scope 内 `.training_outputs_before_quality_<32hex>/` 隐藏历史快照目录×7（artifact_manifest.json、config_snapshot.yaml、env_snapshot.json、metrics_case.csv、metrics_case.README.md、metrics_summary.csv、metrics_summary.README.md）②`tb_logs/events.out.tfevents.<ts>.<host>.<pid>.0`×1③`test_results/.job_metrics.csv.<uuid>.pending`×1。27 项全部 ∉ 任何非空 artifact 记录。**未凭名称排除任何项**：.pending/.training_outputs_before_quality 是错误文本内实际条目的事实分类，非排除依据；亦未为"整 job 绿"丢任何未校验文件。
   c) **"仅见于非当前 source 的路径"**：队列快照内每个 outputDir 仅一个 source job（多 source 分组=0），队列不持有跨端点可见性→**该维度以现有队列快照不可证，标 unknown**；需跨端点 inventory 对照，超出 r8 授权（服务器只读，未发起新查询）。
   d) 机制归并与 §248 一致：MACHINE_STATE×1（qmf idx1）、TRANSFER_STAGE_PENDING slot 门禁×8（qmf2/3/4+summation0/1+text_only2/4/5，BrokenPipe 派生已并入 claim 拒绝）、无可靠最新版×3 job 行（27 文件项）。
7) **审包两项澄清（事实报告，未自行改构建脚本、未隐藏必需断言）**：①**receiver test 与 acceptance 全 glob**：scripts/test-workflow.json L54 `sourceScript: npm run build && node --test test/features/*.test.js` 与 L371 acceptance 域 glob `test/features/*.test.js` 均会自动发现 `jobArtifactStagedSlotReceiver.test.js`；该文件无 env 时硬失败（e70199cs exit1、skipped=0），且必验域无 env 注入面——**Windows/无 env 通道整跑 acceptance glob 必因此红**。项目存在 node:test skip 平台先例（incrementalMetadata.test.js L98、localMetadataChanges、pairedUpdateLegacyLease win32 专属）；"沿用先例给该文件加平台/env gate"或"保持硬失败+验收命令显式 env"二选一**交主控裁定**，未自行加 gate。②**package 无 env 与平台清单关系**：package 必验域同样无 env 注入面，故 §37-4 Linux receiver 显式命令为任务级必验；与①同源冲突（同一文件被 glob 域吸收），解法一并待裁定。
8) **保护区**：错误3 源码/cleanup/队列完成语义零改动；无服务器读写（仅本地 /host/d 只读快照分析）；SimpleSFTP 仓库/协议未动；原两代门禁与断言完整；未提交未冻结。

## §39 r9：逐目标冻结保护 + 平台归属闭合 + 错误3 metadata 准备包（2026-10-24，plan r9 节授权；同 worktree/同实例，未提交未冻结）
1) **冻结保护缺口修复（legacy.ts merge，仅产物复制分支，四处）**：①work 过滤——`destinations.some(allowed)` 结果保留原语义（r9"无保护命中路径原语义不变"），但 artifactCopy 且全部目标受保护时显式 `skipped.push(…均保护该路径，未同步。)` 入既有 L9501 整体 fail-closed 漏斗，不再静默过滤；②files 过滤重写为分层判定——通用临时/排除规则（与端点无关）维持原静默排除，来源/本机**冻结映射命中**（`isUnderMachineStatePrefixes`，已 import L117，非新公共面）显式入 skipped（禁"空 files+空 errors 假成功"，CompletedJobSyncHost L78 errors 非空→catch→partial L90，L80 synced+全 mirrored 仅可达于真无保护命中路径）；③**groups 按目标各自冻结 guard 构组**：混合形态（source 合法/B 保护/C 允许）下 B 入组即 throw（`…冻结机器状态映射保护 <path>，产物未向该端点上传。`），半发送不存在（发送循环在构组之后）；④每批发送前对来源+该目标用冻结 guard 复核**全部批次路径**（`isUnderMachineStatePrefixes(file, prefixes, true)` 含祖先覆盖 fail-closed），`simpleSftpApiCall→assertTransferRootSafety` 实时复核原样保留=双重检查。非产物复制（syncCodeTargets/retain）路径零改动；缺键/unknown 硬错保持。
2) **compile 绿**（run 2026-10-24T14-12-08-660Z-959273）。
3) **新增/改写测试断言（r9 要求全覆盖）**：①`completedJobArtifactRootBinding.test.js` 7/7 绿（batch-z_laxjqn/pi-test-14kbfhmd）——fixture 参数化 ids 三端；新增 r9 混合端点用例（source 合法/B 可绑定但缓存带覆盖/C 合法，prepare 后共享缓存经**队列 fence 真实回调路径**（assertCurrent 第二次调用）确定性替换为安全形态→`rejects /nwpu4 的本次冻结机器状态映射保护/`、零 GET、swapped 证明替换已发生、fpsync=0）；state 覆盖用例改为显式拒绝断言（rejects + fpsync 0，拒绝发生在替换之后）；静态前置断言 +2（/本次冻结机器状态映射保护/、/含祖先覆盖/）钉住所执行 dist 片段含 r9 逻辑。②真实 host 不假成功（`jobArtifactStagedSlotIdentity.test.js` 3/3 绿，batch-ynkxgpcu/pi-test-ygqtcpq2，**可移植——Windows 必执行**）：目标保护用例（transfers=0、report.synced=0、errors×1 含"均保护"、jobs[0].latestArtifactSync.state==="partial"、mirroredWorkerIds 未写）+ 源保护用例（transfers=0、"来源 a 的本次冻结机器状态映射保护"、partial、无 mirrored 证明）；support 入口 A 增 options.freezeGuard/runWithReport（断言消费真实 CompletedJobSyncHost.run 返回值）。首败两条独立链各一次机械自修留档：amqtunxz（rootBinding 状态桩括号笔误）、cc84ci1n（completedJobLatestSync vm 沙箱缺 isUnderMachineStatePrefixes 注入=r9 merge 新引用，按"最小补已有 fixture 依赖"授权面补 1 行，补后 i_99h_wu exit0）。
4) **回归（r9 输入变化域全部重跑）**：mri5anxq 批 13/14（packageContentPolicy/completedJobLatestSync 见上/receiver 新路径/clearedOutputReplacement/manifestCleanup/planJobDeleteRequeueProduction/planSubmissionStateGuard/projectFileIndex/projectRootMap/resultMergePreflight/syncScopeDeletionRefresh/syncScopeWriteLease/syncScopeWorkerAuthority/syncScopeTransferBatch 全 exit0）；cotjho88 批：completedPlanWorkerMirror/workerFpsyncTaskLabel 绿，**manualDistributedResultSync=22pass/3fail 与冻结基线 iay4v4cw 逐项同签名同值**（108!==1、2!==1、20!==1）=既有失败无新增；preflight-speed 按裁定 check:dev 路径复跑 job passed exit0（batch-293jo73f/pi-test-q5d2wtjh，dist 输入已变故重验）。
5) **平台归属闭合（r9 裁定执行）**：`test/features/jobArtifactStagedSlotReceiver.test.js` → **`verification/linux/jobArtifactStagedSlotReceiver.test.js` 一对一迁移**（断言逐字保留；仅头注迁移记录 + support 相对路径 `../../test/features/jobArtifactStagedSlot.support.cjs`——support 留原位与身份套件共享单夹具，无副本无分叉）。迁移后 `test/features/*.test.js` 通道 0 个 Receiver（`ls` 证明），Windows/无 env acceptance glob 不再吸收；Linux 最终必跑命令（更新版）：`env ZLK_SFTP_RECEIVER=<path> ZLK_SFTP_RECEIVER_SHA256=7a262d1b… node --test --test-force-exit --test-timeout 60000 verification/linux/jobArtifactStagedSlotReceiver.test.js`（新路径实跑绿 mri5anxq/3jgzn2c1）。**此为新增平台归属重定位，非退役/隔离既有覆盖**（旧路径全文存 §37/review-r7/r8 diff）。发行包排除双落点：`.vscodeignore` 增 `verification/**`（实际打包输入排除）+ `scripts/package-content-policy.json` forbidden_ordered 新类别 `linux-verification`（path_prefixes ["verification/"]，单源分类规则）；packageContentPolicy.test.js 绿（4feti1kf）。
6) **纯 JS 新文件去重核对（r9"先查重复不改门禁脚本"）**：`test:features` 域 `test/features/*.test.js` glob 于计划期展开（scripts/test-workflow.json L343-377 + L54 sourceScript）→ completedJobArtifactRootBinding / jobArtifactStagedSlotIdentity / jobArtifactSyncIdentity **已被既有域自动覆盖，零追加零重复，test-workflow.json 未改**；receiver 已出 glob。既有必需项全部保留。
7) **错误3 metadata 准备包（r9 授权只读，交付主控经已验 profile 执行；本代理未调用宿主/外部服务器）**：`.review-ui-plan-gpu-20261024/err3-metadata-request.json`——summation idx2/3/5 各 9 条已报错路径白名单（自 13:10 快照 latestArtifactSync.error 逐字提取，共 27）+ 每 job commandId/scope + 端点集=队列快照记录 {nwpu3,nwpu2,nwpu5,jqg_zlk}（source=nwpu3+镜像=其余，12 calls 上限，不扩枚举）；请求形状=**源码已证两型**：SHA/存在性用 `{source, relativePath:".", recursive:true, scopePaths:<白名单>, timeoutMs:120000}`（capability gate contentIdentity===1，≥0.2.101，legacy.ts L9057-9062；响应按 requireCompleteScopeInventory 语义，缺键=不存在）；如仅需存在性另有 metadataOnly 型（L9032-9040，≥0.2.97，无 SHA）。连接参数由宿主按端点 id 从已验证配置填充（清单不含秘密）。错误3 成功/失败语义源码未动（无证据前不改）。
8) **保护区**：cleanup/preview/execute 未调用；服务器零读写（本地 /host/d 快照只读）；SimpleSFTP 仓库/协议未动；队列完成语义/通用入口未扩；两代门禁与既有断言完整；未提交未冻结（HEAD e9795ad0）。

### §39-9 r9 复审返修：files 层旧禁止后缀 regex 恢复（主控精读发现，确定性回归）
1) **缺口**：§39-1② 分层重写时丢失旧 files filter 显式 `!/(?:\.lock|\.pid|\.exit_code)$/i.test(basename)`——scopeInventoryPathAllowed 不等价（SyncScopeStatus.ts L147-168 仅排 .csv.lock/.tb_mean.lock/.writing/.pending/.tmp/.upload.*，不含 .pid/.exit_code/通用 .lock），三类文件可能进 source 清单/generation 输入/host queue.artifacts。
2) **修复**：通用排除分支原样恢复该行（work 层原 regex 未动，未扩新排除名）；仅局部修改。compile 绿（run 2026-10-24T14-19-01-210Z-960907）。
3) **控制断言（同 fixture，三层+落点）**：rootBinding 状态桩直喂 `.lock/.pid/.exit_code` 三行绕过上游清单→test1 断言 files 仅 model.pth、`Object.keys(files).filter(禁止后缀)==[]`（generation 输入同源，equal 断言已钉）、`[...fpsync[0].relativePaths]===["work_dirs/p/job0/model.pth"]`（传输批次）、静态钉 `mergeSlice` 含两处该 regex 字面串（work+files，防再次悄悄丢失）——**7/7 exit0**（batch-t3psvp75/pi-test-mppduw1b）。queue.artifacts 正常面：identity 套件 runWithReport 断言 `report.synced=1` 且 `jobs[0].artifacts` 恰为 V1 全集（host L82 `{...job.artifacts,...result.files}` 唯一输入已控）——**3/3 exit0**（batch-iahc_iv3/pi-test-_si3gkq6）。
4) **过程首败留档**：hcljw3m0（静态计数 matchAll 转义写成无斜杠形式，0!==2——dist 实际已含 2 处，计数法错误非源码缺失）、oybxekp3（vm realm 数组 deepStrictEqual 原型域，内容相同仍红；改 `[...]` 展开）。均为测试侧机械自修各一次，源码未回滚。
5) **回归复用**（主控明示）：其余 r9 套件输入未再变化（files regex=恢复旧行为子集；latestSync 等 scoped 无此类行，r9 绿结论仍成立），未全量重跑；未触服务器；未提交未冻结。

### §40 r10：completedJob 当前来源与他端历史副本分类（错误3实施，plan r10 授权）
1) **事实输入**：宿主 2026-10-24 14:19Z 只读 metadata 快照（artifact-metadata-cde58e21-…，request SHA 9d4c8d68…，12 calls 全 ok/无 unverified/exit0；完整 stdout host-windows/4d07a4a7-…-stdout.log）：3 summation job×9 报错路径在真实 source nwpu3 全 present=0；nwpu2/nwpu5 各 8、jqg_zlk 各 9；跨端 sha 全一致（0 ambiguous，本代理脚本核对）。
2) **实现（仅 completedJob 局部，通用手动合并零改动）**：①SyncLatestMerge 附加 `skippedPaths:{path,kind:"unverified"|"no-latest"}[]`（与 skipped 1:1，additive，旧调用面不变）；②merge completedJob 分支新增分类：scoped 已校验行（非 unverified/unknown/范围外/copies/relative 行）来源无版本+他端版本内容一致(size==1 hash 集)→foreign-only 保留副本，不入 files/generation/fpsync/queue.artifacts，从 planned.skipped 精确滤除（不靠中文串反解析）；来源冲突、本操作冻结映射（来源/本机前缀）、codeOwned、必要项一律不放行仍走原阻断；`.pending`/tfevents 等真实形态按同一归属规则分类，不按文件名规则；③必要项强校验：host 传 `requiredArtifacts`=job.artifacts∩selectedScopes（其它 scope 不强加），merge 要求当前来源已校验版本覆盖，foreign-only/缺失 fail-closed；④覆盖门：每个选定 scope 必须有 files（源文件全集含全部一致项，非 work delta）覆盖，否则 partial（空来源≠无必需产物；选定 CSV 只在他端=不得用同目录冒充）；⑤观测：完整路径+原因入既有操作日志（host report→logOperationFact，原先 `()=>{}` 无通道）+latestArtifactSync 最小可选 `skipped?:string[]`（DistributedPlanQueue schema 注释扩展；读侧 projectJobArtifactSync spread 透传、cache key/旧写面兼容；仅成功且非空时写入，partial 不写）；⑥身份摘要输入=files（不含 foreign-only/临时排除）不变。
3) **读法（主控 r10 复审已确认采用）**：plan"必要产物…SHA 不符"取"来源以本次明确的当前最新版为准"既有契约——旧 job.artifacts 在此仅核必要路径存在性（当前来源有已校验版本），foreign-only/缺失阻断；冻结后来源漂移照常开新代重传并更新记录，复制落地 SHA 与本次冻结清单不符仍逐文件阻断（verifiedSftpProjectInventory），专用链正式镜像冲突原规则不动。该选择依据是既有契约与真实数据语义（job 完成后来源文件可被新运行合法更新），不是"因为测试会红"；r5 受保护绿断言"源清单 SHA 变化必须开新代"（completedJobLatestSync L189）与此契约同向。
4) **测试（新文件 test/features/completedJobForeignSourceClassify.test.js 6 用例全绿 n1k9ix36，test:features glob 自动覆盖，零门禁改动）**：正例（任意普通文件名 foreign 不进 fpsync/files/摘要/artifacts，skipped 字段=路径+原因，他端字节原样留存不拉回）；27 真实快照事实参数化（三 job 逐条分类集合+真实 sha 留存+generation=干净源清单+mirrored 全量）；必要项∩foreign 仍败/范围外条目不强加/漂移重同步开新代；源空与选定 CSV 缺失保持 partial 无 synced/mirrored、无 scope 原 excluded；保留阻断五面（unverified/清单失败/codeOwned/他端冲突/冻结映射∩foreign）；全部一致无 delta 成功+手动合并对冲突 foreign 行仍进 errors。
5) **首败留档与自修（每链一次，均测试/期望形状侧+一处语义读法）**：batch-40fzrqsf 四红——2122360u/wemhdo15（既有套件 deepStrictEqual 严格对象形状遇 additive skippedPaths，两处 expected 精确补 skippedPaths，覆盖只增不减）；fcnbcquse（r5 源漂移用例被严格 SHA-mismatch 读法阻断→按上条裁定收窄 required 门并同步改本块 e2 用例断言漂移重同步）；e4sjt8c8（本块手动用例误达确认步：单持有一致 foreign 在手动链本就是合并候选=既有语义，改用他端冲突形态断言 errors，未注入 confirm 桩）。修复后全绿：r10b 批（65ytwpt8：n1k9ix36/_ike17wu/vtpvdcp7/fmj9li4z 全 exit0）+新 dist 复核 rootBinding pda4n6jg、identity hvsunf1a、receiver 注入 b78drlj4（env 双注入契约，缺注入硬失败=wl3gymqq 为设计内非回归；14jl9jlm 前置拒绝未执行）。compile 绿 962189/962812。
6) **回归对账**：manualDistributedResultSync 3 败与冻结基线逐值同签名（108!==1/2!==1/20!==1，vty6pt3b；失败用例名同 §35-5 三项，test-at 行号 110/258/336 与本分支文件新增夹具依赖行导致的偏移一致）=既有失败无新增；resultMergePreflight/syncScope 三件绿（fmj9li4z）。hashes=.review r10-file-hashes.txt；diff=review-r10-foreign-classify.diff（含 legacy -U25 全量增量与新测试全文）。
7) **保护区**：未触服务器/未同步/未 cleanup/未提交未冻结；两代门禁、r5/r6 身份、r8/r9 冻结保护与 regex 控制用例原断言未动（rootBinding/identity 全绿复用）；通用手动合并/SimpleSFTP/队列完成事实/清理 UI/专用链来源选择未动；无新增用户操作。

### §41 r11：0.5.409 同步与最终候选准备（主控 r11 授权；host 注释修正同批）
1) **r10 复审尾项（零逻辑改动）**：CompletedJobSyncHost requiredArtifacts 注释与 §40-3 改为"来源以本次明确最新版为准"契约表述——旧 job.artifacts 仅核必要路径存在（foreign-only/缺失 partial），冻结后漂移开新代、复制落地 SHA 与本次冻结清单不符仍逐文件阻断；专用链正式镜像冲突原规则不动。compile 绿 963900。
2) **版本同步 0.5.408→0.5.409（宿主 gh 证 master=e9795ad0、Latest=0.5.408、v0.5.409 tag/release 真 404）**：package.json L5、package-lock.json L3/L9 共 3 处；gate 派生 runtime 输入（bundle-semver/write-agent-runtime 自动再生）=src/runtime/RuntimeManifest.ts+dist/runtime/{RuntimeManifest.js,json,cluster_agent.py,cluster_scheduler.py}(+.sha256×2)，diff 仅版本串+再生哈希（r11-version-0.5.409.diff 与候选清单注记）。
3) **覆盖核对（r11 核心：test:features glob ≠ 正式执行集）**：静态展开 check:full/package 权威 18 域 sourceScript→175 测试文件，对候选 M/?? 测试集（14）逐路径差集=7 个不在正式域。**纯追加（无 glob、diff 恰 2 行）**：test:latest-artifacts +=rootBinding/stagedSlotIdentity/syncIdentity/foreignClassify/workerFpsyncTaskLabel、test:plan-run +=panelMessageDispatch；dryrun 前/后 226→232 unique jobs（requestedSlots 434→446、duplicatesRemoved 214，runner 去重零重复启动；receipt qocwvgev/s_6xjgl5）。**manualDistributedResultSync 不入域**（3 败=基线既有，入域即擅改放行）→既有同闭环显式差集 receipt g_w9jis_（22 pass/3 fail 同签名同值，uvj_775o）。4 新纯 JS+workerFpsyncTaskLabel/panelMessageDispatch 为可移植 JS（mkdtemp/vm，无 POSIX/receiver）Windows 同域跑；receiver 保持 Linux-only 显式注入必验（r11 注入绿 9irpkkf8，SHA=7a262d1b753bb70e…实际计算匹配）。
4) **发行闭包两洞（r11 "不留运行闭包漏洞"+ignored 列表）**：①`dist/features/JobArtifactSyncIdentity.js` 被 .gitignore L19 `dist/` 拦截（tracked dist 历史特例），checkout 侧不存在→候选清单标注"提交需 git add -f"；legacy.js 3 处 require、vscodeignore 未排除=包内需含。②`.review-*` 审阅/取证目录不在 .vscodeignore→纯追加 `.review-*/**`（内部报告绝不入包；docs/**、simple_cluster/**、test/**、verification/** 既有条目复核在位）。
5) **Git 身份实值**：worktree HEAD=e9795ad098ff99059c980058f2a1a0605704f7da=冻结基线、分支 fix-ui-plan-gpu-progress-20261024、common-dir=/repos/MCP/zlk-cluster-orchestrator/.git、非 master；未暂存未提交。候选清单=M34（含 gate 派生 runtime 7 文件+文档 2+门禁 2+排除 1；交付前二次 `git status` 实数与清单逐路径 diff 全等，早前"M33/??6"为汇总笔误，清单正文 34 项一直无误）+??7 交付（6 文件+verification/linux receiver 1）+ignored 1（add -f）+非候选（.review 取证/runner 锁瞬态/node_modules）=r11-candidate-inventory.txt。
6) **最终 check:full（0.5.409，三跑全原生完成、无残留进程、lockReleased）**：
   - retry0 964548：gate-09 `tsc-cached --verify-only` fail（no-complete-state,tsbuildinfo-missing=输入漂移后防漂移设计，非候选缺陷）→npm run compile 重建 complete-state（964859）→verify-only ok（首败留档）。
   - retry1 965009 与 retry2 975495（warm，fullCheck wall=386s/TOTAL 402s，pi-test evidenceDirectory=final-0.5.409-retry2）：**files=232 稳定 231 绿，唯一红=job-232 testWorkflowRunner.test.js `timeout exit=null`（两次逐项同形态）**——外层预算=整文件进程 `--test-timeout 20000 + killGraceMs 30000 = 50s`（runner L511/L636 实读）。23/26 用例 ✔ 后被 kill。
   - 定位证据：瓶颈单条=`runner: real-repo plan reconciles with an independently expanded manifest contract` 实测 **37.98s（当前树）**；对照实验（临时复原 HEAD manifest 后单跑再原样恢复、恢复后 diff 与审阅备份核验一致）=**33.76s（onek4rgm）**→ 候选树 HEAD 形态本已超 50s 整文件预算（r26 先例基线 14.5s 在本机 WSL+当前盘规模不成立），本块 6 文件追加贡献约 +4.2s。全文件隔离 exit0（n7opxefo，无外层约束）。被 kill 尾 3 条中 r28×2 隔离仅 0.27/0.19s=纯连坐。
   - **处置**：timeout 调整非授权面（父会话明示不改超时/不跳过）——未改任何 timeout/断言/skip，红如实保留；裁定请求已交（位置=check:full/package/smoke 三 extraFiles 行 `--test-timeout 20000`，旧 20000/建议 60000=r26 前原值，实测 34–38s 单条，影响仅该文件三入口 kill 预算）。check:full 最终判定=231/232 绿+该结构性超时红待父会话裁定或带红验收决定。
7) **跨端交付 identity**（宿主 Windows 接 package 用）：候选=本 worktree 未提交工作集（清单 §41-5）；基线 e9795ad0；版本 0.5.409；Linux 已证：check:full 232 集=231 绿+唯一红 job-232 testWorkflowRunner 外层 50s 结构性超时（retry1 965009/retry2 975495 同形态、HEAD manifest 对照 33.76s 已超预算、隔离全文件绿 n7opxefo、单条瓶颈 37.98s，超时调整建议 20000→60000 已交主控裁定未自改，详见 §41-6）+receiver 注入绿 b78drlj4+manual 差集对账（3 败同基线签名）；Windows 需跑 package（真实 vsix manifest 逐路径核 policy：forensics 规则不覆盖 .review-*，由 r11 新增 vscodeignore 行拦截——Windows 端 dryrun/实包清单必须证明 `.review-*/**`、docs/、test/、verification/ 均不在包）+checkout 后 dist/features/JobArtifactSyncIdentity.js 存在性（add -f 后）。服务器只读、用户 job 未重试状态未动。

## §42 r12 超时预算恢复+最终 check:full（2026-10-24）

1) **裁定前原文核对（通过）**：965009/975495 run.json job-232 实字段=`status=timeout、signal=SIGKILL、timedOut=true、exitCode=null、wallMs=50013/50020（=20000+killGrace 30000）`，argv `--test-timeout 20000`；stdout 至 kill 点全 ✔ 无 ✖（err 中 "cannot resolve totally-unknown-bin" ERROR 系负向用例预期输出）——与 r12 所述"进程预算终止、非断言失败"一致，实施获准。
2) **证据可读路径闭合（父此前不可读的原因）**：check:full 日志实际持久在 **`simple_cluster/reports/test-workflow/<run>/`**（run.json+每 job out/err），非主仓根 `reports/`（该 glob 零项属路径层级差，非日志缺失）。retry1/retry2 完整 run.json+job-232 out/err、隔离 n7opxefo、HEAD 对照 onek4rgm 收据已全部复制至 **`.review-ui-plan-gpu-20261024/r12-timeout-evidence/`**（父可读挂载；/tmp 与 Linux runtime 路径不再作为唯一引用）。
3) **三行机械修改（仅获准面）**：scripts/test-workflow.json 中 check:full/package/smoke 各 `phases/fullCheck.extraFiles[testWorkflowRunner].argv` 的 `"20000"→"60000"`（全文件该独立 token 恰 3 处=该三行，域 sourceScript 字符串内文本不动）+r26TimeoutRestored 说明追加 r12 实测依据（历史对照保留）。diff 恰 6/6 行（其余 2 行为 r11 既有纯追加）；JSON 有效；三入口解析后该文件 argv 唯一=60000、无同入口重复；外层预算 90s。killGraceMs=30000/runRunner 内部 19000/断言/skip/集合/其它 timeout 全未动。
4) **门禁预备**：manifest 改动不触编译输入，`tsc-cached --verify-only` 绿（inputs=378 哈希一致、输出无漂移），已知 verify-only 未准备风险消除。
5) **最终 check:full 完整一次（989961，phase=final-0.5.409-r12，fullCheck wall=386207ms/TOTAL 402854ms，exit 1，lockReleased，无残留）**：**job-232 testWorkflowRunner 26/26 完成 exit0 绿（r12 预算恢复生效）**；files=232 中 231 绿，**新红（首败完整留档）=job-211 `test/features/resultCollectionPerformance.test.js` failed exit=1（wall 6753ms，非 timeout）**：用例 "PLAN-specific HTTP errors cannot quarantine the server for later declaration batches" 5048.6ms 后抛 `结果文件正在其他窗口更新，请稍后重试`（栈 LatestResultExport.ts:78 withResultWriter）。
6) **新红分类（不确定因果，按规则不自修、不重复全量、不增预算）**：机制=结果写锁是 fixture 根路径哈希派生的 loopback 独占 listen（`port=49152+digest%16384`，与 Linux 临时端口带重叠；EADDRINUSE 重试 5000ms 耗尽即硬错）。同文件 retry1/2 均 1.6~1.9s 绿；本轮该 job exclusive 且窗口内无任何并发 job；隔离复验 exit0（ivpyo5oq）；相关三个源文件本块零改动。子类（邻近批 job 的 TIME_WAIT/外部 socket 稳定占端口 vs 进程内不同 fixture 根端口生日碰撞）无法事后取证（端口占用瞬时）→ 归既有测试设计的环境性端口竞态候选，r12 调度时移仅暴露之。**待父会话裁定**：允许定向重跑复现（单文件/单域）、判 flaky 记录放行，或给修复指导；本代理未自修。
7) **状态**：check:full 终局=231/232（job-232 绿、job-211 红待裁定）；receipt：`.review-ui-plan-gpu-20261024/r12-timeout-evidence/final-989961-{run.json,job211.out.log,job211.err.log,stdout.raw.log}`+`rcp-isolated-ivpyo5oq/`；停点未变=HEAD e9795ad0 未暂存未提交，工作集 M34（test-workflow.json 已在列）+??7+ignored 1；Windows package 用同一批准预算。

## §43 r13 定向机制取证：结果写锁端口竞态（一次实验，停审不实施）

1) **只读前提**：①`/proc/sys/net/ipv4/ip_local_port_range`=`32768 60999`（快照已归档）——产品锁端口窗 `49152+digest%16384`=49152–65535，其中 **49152–60999 共 7848/16384≈48% 落在本机临时端口带内**，任何普通出站连接的 ephemeral 分配都可能先占锁端口。②基线等价：`git diff --exit-code e9795ad0 -- LatestResultExport.ts FreshResults.ts ResultCollectionHost.ts resultCollectionPerformance.test.js freshResultHost.js` **exit 0**（5 文件与基线逐字节一致，非本块引入）。③fixture root=mkdtemp（freshResultHost.js L6）→ 每进程 canonical 不同→随机派生端口，历史占用者不可事后取证。
2) **探针设计（获准边界内）**：/tmp 探针复用既有 `Module._extensions['.ts']` transpile 夹具 + `test/_helpers/freshResultHost.fixture()` + **产品真实模块**（resultDigest/resultPath/service.update→collect→publishLatestResult→withResultWriter 全真链，零复制锁实现、零源码/测试/timeout 改动），经 pi-test-evidence.py 执行（exit 0，证据目录 o6y6t_zg，raw.log+探针脚本+port_range 快照已复制 `.review-ui-plan-gpu-20261024/r12-timeout-evidence/r13-probe-o6y6t_zg/`）。
3) **三阶段实测（canonical=/tmp/simple-fresh-results-OtG25A/experiments/results，digest=cb347fc0…，port=52020∈ephemeral 带）**：phase1 产品无关 `net.createServer` 直接 bind 52020 成功（=该端口当时无预占者）；phase2 真实 `service.update()` **5044ms** 后抛 `结果文件正在其他窗口更新，请稍后重试；未读取旧锁记录。`，栈 `LatestResultExport.ts:78 → withResultWriter:91 → ResultCollectionHost.collect:293 → update:109` 与现场 job-211 失败栈**逐帧同行号一致**；phase3 仅关闭本人 listener 后同 root 再调用成功且 latest-results.json 落盘。
4) **机制结论（该实验可证/不可证）**：可证——**结果目录不存在任何其他结果 writer 时，任意普通 TCP 占用（含 OS ephemeral 分配、与产品无关的进程）即令真实写链在 ~5s EADDRINUSE 重试耗尽后报"另一窗口更新"硬错，释放后自愈**；这完整解释 989961 job-211 的 5048.6ms/同栈形态。不可证——历史瞬间该端口的实际占用者身份（ephemeral 占用瞬时、无留存），不得反推为"已确认某邻居 job"。综合 §42：分类坐实为**产品既有锁设计的 Linux/非 win32 环境性端口竞态**（r12 调度时移仅暴露之），非本块回归、非业务断言失败。
5) **平台/跨版本互斥影响面**（供新方案评审）：win32 走命名管道 `\\.\pipe\simpleex-results-<digest>`（digest 精确名，无端口空间，不同 root 不相撞）→ 本竞态仅影响全部非 win32（Linux/macOS 同一 TCP 分支）；同 root 跨版本互斥仍成立（同 canonical→同端口公式）；不同 root 的锁可互相误撞（16384 宽生日空间，同进程并发 writer 罕见但批进程外 ephemeral 流量常态存在）；digest casefold 仅 win32。
6) **可选最小修复候选（仅呈报，先停审、未实施）**：A. 锁锚点离开 TCP 端口空间（非 win32 改 AF_UNIX socket，路径含 digest；需裁定"kernel-owned 无锁文件"设计约束是否视 socket 文件为锁记录）。B. 占用者身份握手：现 server `socket.destroy()` 无协议，加 digest 握手后 EADDRINUSE 时区分"同 digest writer 忙"（现错误）vs"端口被无关进程占据"（新可区分错误+不同处置）——涉及跨版本兼容（旧版无握手）。C. 派生端口避开 ephemeral 带——系统间无统一安全带，只能降概率不能根除。D. 测试侧豁免该错误=削弱断言，不建议。**任何一项均超出"清单/说明"授权，待主控/用户按原约定裁定新方案后再实施。**

## §44 r15 Mac AF_UNIX 新方案依赖取证（用户已批仅 Windows+Mac、Linux 产品不修；未写产品代码）

1) **边界**：Windows named pipe 分支不动；仅非 win32-TCP（Mac）换**不占普通网络端口**的协调通道；新版本、不兼容并跑旧版（旧 TCP 锁与新 unix 锁互不可见=用户已接受的代价，冻结文本须写明）；协调资源全部在**项目外插件管理命名空间**（独立短目录+digest 命名），绝不读/删/移动项目内任何旧文件，绝不要求用户清理。
2) **本仓依赖面（只读实核）**：runtime 依赖仅 `semver@7.7.3`——无 IPC/锁包、无 native helper、无 python 面；src 使用 node:net 仅 4 处且全部 TCP（LatestResultExport/TensorBoardLocalProxy/Xshell×2），**产品无既有 AF_UNIX seam**；平台 seam 仅 verification/linux（receiver），无 Mac seam、本机无 Mac 执行工具。
3) **路径长度（官方+实测）**：nodejs.org net 文档原文："It will throw an error when the length of pathname is greater than the length of `sizeof(sockaddr_un.sun_path)`. **Typical values are 107 bytes on Linux and 103 bytes on macOS**."（即 darwin 实际可用 pathname ≤103 字符）；Linux 本机实测 listen 103/104/105 成功、108 EINVAL=OS 级强制存在。命名预算示例 `/tmp/zlk-<uid>/<digest12>.sock`≈33 字符，余量充足；darwin TMPDIR(/var/folders/**/T) 过长不宜，冻结用固定短前缀目录。
4) **节点运行时行为（node v24.22.0 Linux 实测探针，pi-test-evidence exit0，receipt .review…/r12-timeout-evidence/r14-unix-primitives-xuhw5j2n/，10/10 checks）**：①live 碰撞 listen→**EADDRINUSE，不动他人 socket**（inode 不变+仍可 connect）——无危险 auto-unlink；②崩溃遗留（SIGKILL）路径保留、再 listen 同 EADDRINUSE、connect 遗留=**ECONNREFUSED**；③正常 close 由 node unlink 自建 socket（文档语义），崩溃遗留是唯一残留源；④**rename(2) 原子 take 是安全恢复原语**：stale take→connect 验证 ECONNREFUSED→仅删自己 take 名→重 bind 成功；**live writer 被 take 后在其名下仍 CONNECTED，rename 回同名 inode 不变仍 CONNECTED**=take+restore 不销毁活 writer 通道；两进程并发恢复仅一方 rename 成功（另一方 ENOENT 不动作）=无竞态、connect 拒绝后无防护 unlink 被结构性排除。
5) **macOS 内核级差异（xnu 源码 uipc_usrreq.c，权威）**：`vp->v_socket==0 → ECONNREFUSED`（无监听者=stale 判据）；**`(so_options&SO_ACCEPTCONN)==0 || sonewconn()==0 → ECONNREFUSED`——accept 队列满在 macOS 也回 ECONNREFUSED（无 ENOBUFS 路径）**→"connect 拒绝"单点不能证明 stale（活 writer accept 队列瞬时饱和同样拒绝）→ 恢复协议必须 **多次 connect 重试后**才判定，且判定为 stale 后**只做 rename-sweep（可逆）不做原地 unlink**；本产品锁 server `socket→destroy()` 即时 accept，持续饱和仅可能出现在扩展宿主事件循环长时间卡顿，残余风险=该场景下活 writer 通道被 sweep 走名（通道本体存活、可被"connect 成功即 restore"回迁），冻结文本须写明。
6) **最小可实施形状（供 GPT 冻结，未实施）**：`darwin && !win32` 分支（win32 保持命名管道原样）：①canonical 通道名=项目外 `/tmp/zlk-<uid>/<sha256(canonical)[0:12]>.sock`（≤103 字符满足）；②listen 成功=持锁（kernel 级，进程死自动释放 socket 语义由 rename-sweep 处理残留名）；碰撞 EADDRINUSE→connect 重试（总预算沿用现 5s deadline 语义）：成功=他端活 writer→等待（现"另一窗口"错误语义不变）；连续失败→rename 到唯一 take 名→再 connect 验证（成功=restore 回原名+等待；失败=保留 sweep 名稍后自清理，不原地 unlink）→重新 listen；③sweep 只处理自己命名空间内 `*.take-*` 且 connect-重试验证失败的条目；④与 in-process writers Map 组合语义不动；业务入口 publish/regenerate 不改。
7) **需要的 Mac 执行条件（当前缺口，冻结须含）**：本机无任何 Mac 执行工具——darwin 侧三事实（103 字符上限实际生效、connect/ECONNREFUSED 语义与 xnu 源码一致、VS Code 扩展宿主内置 node 与探针 node v24 行为一致=对他人 socket 无 auto-unlink）须由 Mac 主机/CI seam 执行同一探针脚本验证；无 Mac 执行面则该项只能标注平台限制，不得以 Linux 探针冒充 Mac 验收。Linux 旧 TCP 故障按用户决定不修、§42/§43 原样保留；规定验收若与"不修 Linux"冲突交主控分类，不伪装通过。

## §45 r16 统一 simple_cluster 路径/生命周期合同——只读调查（两插件，未改任何代码）

0) **边界**：仅调查+方案；SimpleSFTP 原仓 /repos/MCP/simple-sftp（HEAD 452872c2）只读；历史混合旧文件不扫描/不删改；无固定数量/体积上限，生命周期=代次终态/心跳过期/任务收尾，不以预算数值替代；§27–44 事实复用。Mac 产品实现暂停（r15"项目外永久空协调文件"与新要求冲突，未实施）。

1) **类别→当前路径推导→建议 simple_cluster 子目录→创建/释放/可删时机→必须保留/确认依据**：

| # | 类别 | 当前路径推导（实证） | 建议 | 时机 | 保留/确认依据 |
|---|---|---|---|---|---|
| A1 | 分布式队列（项目恢复事实） | `globalStorage/distributed-plan-queues/<sha256(resolve(root))[win32 lower]>.json`（DistributedPlanQueue.ts L967-971） | `simple_cluster/state/queues/` | 创建=入队；释放=**永久保留**至项目废弃（**非用后即删**：job 完成事实/重试预算的唯一持久权威） | 项目级恢复状态，符合"项目相关"；须新增同步排除前缀防跨端镜像互污（§45-3 确认项） |
| A2 | sync-holds（用户删除/暂停声明） | `globalStorage/sync-holds/<sha256>.json`（SyncResolution.ts L34-38） | `simple_cluster/state/sync-holds/` | 永久保留（数据安全护栏，删=危险；现有 r9 冻结映射依赖其语义） | 同上；迁移=单向复制+读回退，不删旧、不提示清理 |
| A3 | plan-cleanup 台账（**用户真实文件受管两代清理记录**） | `globalStorage/plan-cleanup/<digest>/…`（PlanCleanupHost L318）；SimpleSFTP `globalStorage/cleanup-operations`（extension.js L294） | `simple_cluster/state/cleanup-ledger/` | 永久保留；**受原两代门禁+人工双确认管辖，不适用自动清理** | "新自动清理"仅 plugin 自造临时资源；用户真实文件域（results/work_dirs/archive/holds）边界不动 |
| A4 | run-submissions 在飞回执 | `globalStorage/run-submissions/<digest>/…`（PlanRunHost L13） | `simple_cluster/state/run-submissions/` | 创建=提交首阶段；释放=该行终态且收敛后可删（有在飞引用不可删——r6 租约/恢复依赖） | 用后即删适用，但删条件=终态+无引用，非"任务结束一刀删" |
| A5 | setupConfig（端点配置） | VS Code **globalState/state.vscdb**（§27 实证） | **保留原位** | 平台强制位置；扩展身份根不可选 | VS Code 不提供改写 state.vscdb 位置的能力；含端点非秘密配置也属跨窗口恢复根 |
| B1 | 本地传输暂存代 | SimpleSFTP 已在项目内：`<root>/simple_cluster/.simple-sftp-staging`（extension.js L6172-6182，注释明言"确定名/不再散落"——统一方向已有先例） | 保持，规范化为 `simple_cluster/staging/` | 代(bind代)成功 settle→即删；失败代=重试队列内保留，代废弃(replace/retire)即删 | 服务器 settle/cleanup 执行仍未授权——只定合同不动现场 |
| B2 | 插件更新暂存 | `globalStorage/updates/staging`（legacy.ts L7938） | 生命周期定合同即可：安装终态即删；如需迁移 `simple_cluster/staging/updates/` | 用后即删适用（更新包=自造临时物） | 更新机制属平台面，迁移需主控确认无签名校验依赖 |
| B3 | 开发工具链报告/缓存 | 已在项目：`simple_cluster/reports/**`、`simple_cluster/cache/{tsc,npm}`；唯 **`.test-workflow-batch.lock/` 在仓根**（瞬态 owner.json） | runner 锁移入 `simple_cluster/.runner-lock/`（vscodeignore 已排除入包，路径单点改） | 锁=批次结束即删（现 owner.json 已有）；reports receipt=用户取证的恢复事实，保留至用户裁定清理；cache=每次使用按代清理旧代 | receipt 属证据类：任务/验收闭环前不可字面用后即删 |
| C1 | SSH 端点发现 | `~/.ssh/config` 只读解析（SimpleSFTP L449） | **保留原位** | 平台标准发现通道 | 塞进 Git 项目=破坏平台语义+泄共享拓扑 |
| C2 | 端点认证 | SimpleSFTP 走用户级 settings（`cfg.get`；无 secretStorage；输出已遮蔽 L2032 password/token/privateKey 等） | **保留原位** | 全局认证 | **绝不能入 Git 项目**：项目会同步/分发=泄密；现有遮蔽是输出层保护，非存储加密 |
| C3 | host/resource 操作租约 | `%LOCALAPPDATA%/SimpleExperiment/host-operation-lease.json`（host-operation-lease L208-209；TTL+心跳 JSON 原子租约，resource-operation-lease sha256(owner).json 池） | **保留原位** | 跨项目/跨窗口的主机级单实例协调，塞任何单一项目=破坏其跨项目职能 | stale 恢复已有=心跳过期可剥夺（admissionExpiresAt），无 unlink 问题 |
| D1 | 结果写锁 win32 | 命名管道 `\\.\pipe\simpleex-results-<digest>`（无文件形态） | 不动（用户裁定） | 无 unlink 面 | — |
| D2 | 结果写锁 Mac（暂停） | 若按新要求放项目内：**AF_UNIX 有硬伤**——sun_path≤103 字符而项目绝对路径不可控（深路径必 EINVAL）；**可行替代=项目内永久空锁文件+内核 advisory 锁（O_EXLOCK/OFD，主控已取证可行性）**：锁语义在 fd 上，进程死内核自动释放、**永不 unlink**（无 TOCTOU/无遗留恢复）——安全不可 unlink 条件="文件永久成员+只经 fd 加锁"；与"用后即删"的字面冲突（空锁文件属永久协调成员，非临时资源）需用户/主控冻结裁定位置与例外 | 冻结输入，未实施 | 永久成员或代次删除二选一 | §44-4/5 rename-take 仍是无内核锁时的备选；两形态都不触碰项目旧混合文件 |

2) **必须澄清的三条合同语义**：①"用后即删"适用于**插件自造临时资源**（B1/B2/锁票/A4 终态回执），**不适用**任务结束仍有用的恢复事实（A1–A4 台账本体、receipt）与用户真实文件域；②全局认证（C2）与平台发现（C1/C3）保留平台位置=例外清单须用户显式批准，否则跨项目协调与认证会泄进 Git/被同步镜像；③历史混合旧文件：新版本只写新命名空间，旧文件不扫描/不迁移/不删、也不新增"请手动删除"类提示（SimpleSFTP L2380-2383 现存两条此类提示是否移除交主控裁定）。

2b) **per-projectRoot 明确化（用户 2026-10-25 同范围补充）**：simple_cluster 路径合同锚定在**每个实际消费项目自己的 projectRoot 内**（运行时解析），不是插件源码仓全局共用、不是用户目录/tmp 单一共享根；A 类现推导本就按 `sha256(resolve(projectRoot))` per-root 隔离（迁移后 `simple_cluster/state/...` 目录天然含 root 身份，多项目并行各写各的，清理 A 项目不可能触 B——路径包含关系即可证隔离）；**例外保持**：账号凭据/已批准系统配置在平台位置（C2/C1）、跨项目主机租约 host-operation-lease 属系统级**不得塞进任何单一项目**（C3）；SE/SFTP 开发 worktree 只是实现代码位置，任何路径 helper 不得写死开发 cwd；r17 将加双项目并发+跨项目清理隔离+路径根真实身份测试。

3) **需主控/用户确认项**：①`simple_cluster/state/**` 与 `staging/**` 的**同步/镜像排除前缀**（否则本机恢复事实被跨端同步=新故障源；涉及 syncState.legacy 前缀表与 ProjectRootMap 保护面扩项）；②globalStorage→项目 的迁移策略（单向复制+读回退兼容 Windows+Mac 新版本并存期；旧 globalStorage 不删）；③D2 空锁文件"永久成员 vs 用后即删"冲突裁定；④是否把"reports receipt 保留期"定义为用户显式清理前永久。全部冻结前不写项目源码/测试/不迁移/不删任何文件。

## §46 r17 Block A 实施+目标回归（路径单源+旧精确快照兼容；Linux 本地；未暂存未提交）

1) **源改动（7 文件，compile 完整态 batch-qy3sn_49 exit 0）**：`src/features/ProjectStatePaths.ts`（新单源：五桶派生、空 root fail-closed、link 原子迁移、目录白名单字节复制、temp 释放）；`DistributedPlanQueue.ts`/`SyncResolution.ts`/`PlanArtifactSync.ts`（路径改项目内+保留 legacy 精确推导只读源）；`PlanCleanupHost.ts`（storageRoot→项目、jsonWithMigration invalid-legacy 透传、records 迁移、pluginState/恢复记录写项目位；**返修**：`validateIsolationReview` 回调补 `ensureOperationRecordsMigrated` await——回归实测 `service.isolatedDeletePreview` 直接进入可绕过 execute 入口的迁移=真实兼容缺口，首败 receipt batch-y4pw7y5w/pi-test-4kr95lvd，修复后 5/5 绿 batch-tkmj86az）；`PlanRunHost.ts`（receipts 项目位+迁移）；`legacy.ts`（loadDistributedQueue 迁移+invalid-legacy 原字节透传；localMachineStateGuard machineStateDirs += projectManagedDirs）。
2) **新目标测试** `test/features/projectStatePaths.test.js` 9 用例全绿（batch-ioaqvfbj；compile 后新 dist 复跑 batch-h5shza2y）：两真实 root（含中文空格）互不包含、cwd 不参与、空 root throw、身份 sha256 稳定、holds/队列新旧路径形状与同身份文件名、迁移四态+坏旧透传+坏新不回退、双窗口 link 恰好一方发布、目录白名单幂等、machine-state 五桶前缀映射+allowlist（results/tmux_logs）不受吞、receipts 迁移。首跑 2 败=本测试自身预期笔误（sort 顺序）与"未映射普通目录"错误前提（`scopeInventoryPathAllowed` 对 simple_cluster 有既有名单级 allowlist，SyncScopeStatus.ts:164-169），首败留档 batch-tg9dxlew。
3) **目标回归（串行经 batch_verify，真实逐项 exit）**：planCleanup ✅ batch-bwe1yug9；planRunHoldClearedChain ✅ batch-2d35ycec（夹具 `root`→`h.root` 笔误一次自修，首败 batch-bwe1yug9）；planCleanupReconnect/syncLatestMerge/syncScopeMetadata/completedJobLatestSync ✅ batch-3y7r5o2f；completedJobForeignSourceClassify/projectMirror ✅ batch-ibv9_pz0；planArtifactSync ✅ batch-u6w2rxur（夹具台账位置断言按 r17-A 批准合同对齐+新增"旧位置保留只读源"断言，首败 batch-ibv9_pz0）；distributedQueueStartup(+Recovery) ✅ batch-u6w2rxur；projectRootMap ✅ batch-y4pw7y5w；planIsolatedReview ✅（见 1) 返修）。
4) **两个既有红（均非 Block A 回归，基线 e979 复跑坐实，留裁不修）**：①syncResolution 第 3 用例 `localDeleteScript`——win32 盘符路径在 Linux `path.resolve` 拼接语义，实现/夹具与基线逐字一致（src/test diff 均零），基线树隔离复跑同败（batch-sqb912_q，同 regex 失败；基线树=/tmp/r17-baseline-check/head8 e979 archive）；②planPreflightProgressSpeed 2/20——`/home/node/AppData/**` 全部 root:root（Oct 19/21 他任务残留）致 `host-operation-lease.json.resources-v2` 缓存写 EACCES，基线同树复跑 20/18/2 **与候选完全一致**（batch-1gty3j18 vs 候选 batch-y4pw7y5w）。两者历史 check:full 绿的差异成因（job 分组环境）留待最终全量对账；本块不改权限、不动 root 残留、不改测试求绿。
5) **合同不变项**：现存两代/双确认/现场服务器只读未触；旧文件字节只读；未暂存未提交；version 0.5.409 候选不变。17-D（SFTP cleanup rootIdentity 归组）按主控指令等其补充事实，未动。

## §47 r17 A/B 返修+Windows 首次失败+Block C（回执释放）+r3 隔离入口首败与一次机械自修

Windows 阶段验证（父独立 425 文件 snapshot，哈希稳定，真实 exit 1 非 timeout）：
`snapshot .review-ui-plan-gpu-20261024/win-stage-r17-n7r0Iv/{result.json,inputs.json}`，
完整 stdout `/host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/host-windows/11c50864-d1e5-43ac-aaa1-2462255304ab-stdout.log`。
syncResolution 3/3 全绿（盘符断言本属 Windows，Linux 裸跑红 batch-2b5m7ogv 原样保留，父证据保留至相关源变化前）；
latestResultExportDarwinLock 5/6——唯一红为用例6：Windows 下 chmod 0755 后 st_mode 不承载 POSIX 语义，`0o022` 位检查误拒。

按"不改 Win 产品逻辑/不删测试/不 skip/不放行"返修（Linux 复跑全绿 batch-06b6ozxr、batch-j2arpdss、batch-nz_0c_rj）：
- `assertResultLockDirectory` 改可注入 lstat/chmod/getuid/platform seam + 纯谓词 `managedWriteBitsAllowed(mode,platform)`；
  规则表用例（0755→收紧0700、0770/0720 拒、链接/非目录/异 uid 拒、拒绝路径不写盘）在**所有平台**跑同一决策路径；
  POSIX 真实 chmod/链接效果与 Windows 真实 ACL 强制**另列平台原生必验**，注入不冒充原生。其余 5 用例断言一字未减。
- B 源路径更正：实际为 `src/results/LatestResultExport.ts`（此前阶段 pendingWrites 误写 features 路径）。
  darwin 分支 `fs.mkdir` 处接入 A 的 `ensureProjectManagedDirectory` 逐层守卫——父链 `simple_cluster/locks` 若为 symlink 不再可能把本项目锁落进别项目（叶级检查不足）。
- 文案更正：0x20 在 Linux **不是** O_APPEND（Linux O_APPEND=1024，数值不同）；src 注释与测试注释均改为"该位不是 Linux O_EXLOCK、禁止复用"。平台拒绝逻辑不变。

A 三项必须返修落地（返修#1-#3）：
1. `projectManagedRoot/projectManagedDirs` 强制 `path.isAbsolute`——相对 root 在任何 cwd 一律报错，不随 cwd 派生；legacy 精确路径旧身份 sha256(resolve) 算法一字未动。
2. 迁移 temp 独占创建（单文件 `wx`、目录 `COPYFILE_EXCL`），仅本调用确实创建才删，删除失败显式传播不吞错；`ensureProjectManagedDirectory` 逐层 mkdir(0700)+lstat 拒绝 symlink/非目录/组或其他可写，受管子树写入前跨 root 即拒（测试断"拒绝前未向 B 写入任何字节"）。
3. 迁移完成事实持久化：目录迁移 marker 在全部 link 之后写、`marker.importing` journal 表"正在进行"；`projectMigrationIsSettled` 供 `PlanRunHost.releaseSettled` 终态释放前有界等待（50ms/5s，超时显式拒绝）。测试证明"迁移→终态释放→再次调用不重导（不复活）→legacy 字节全程不动"；仅内存 Promise 复活路径关闭。

Block C 其余：runner 批锁迁入 `<root>/simple_cluster/locks/simple-experiment/test-workflow/batch.lock`（准入/owner/外来不回收/自释放语义不变，testWorkflowRunner 全绿）；failed/cancelled 回执保留（resume 依赖其错误语义）。

r3 隔离入口复用（不重查 root 权限、不再裸跑基线）：
- 首败保留：batch-4mip9506 exit 1，job-001 日志
  `simple_cluster/reports/test-workflow/2026-10-24T19-08-03-061Z-1020962-check_dev/job-001-planPreflightProgressSpeed.test.out.log`
  ——19/20，唯一红 `ReferenceError: PlanRunHost_1 is not defined`。根因是**本任务 Block C 回归**：`finishPlanSubmissionProgress`
  直接 `new PlanRunHost(this, workspaceRoot())`，该测试 harness 按方法从 dist 切片进 `new Function` 沙箱并只注入固定别名清单（先例：
  `this.planSubmissionBatchFor?.()`），新模块别名不在其中。隔离 LOCALAPPDATA 本身生效（cacheWriteSkipped=1）。
- 一次机械自修：释放调用迁入类方法 `releaseSettledPlanSubmissionReceipt`，切片方法体仅 `this.releaseSettledPlanSubmissionReceipt?.(operationId)`
  可选调用；生产同一类恒有该方法，语义/断言未动。编译绿（…19-10-32-861Z-1021383-compile，gates 7/7）；同 spec 复跑
  batch-4knjpfyv exit 0，job passed（…19-11-09-539Z-1021527-check_dev/job-001），20/20。
  全仓 `compiled("finishPlanSubmissionProgress")` 切片仅该 harness 一处，无其他受影响入口。

Block C 只读核查（未改代码）：
- 本地代码清单缓存 `LocalCodeManifestCache`：同键覆盖 = cacheWrites 串行 + HostOperationLease(actionType=hash-cache-write) + atomicWriteText 全文档原子写；
  失效回收 = 每行 dev/ino/size/mtime/ctime/birthtime 身份复核，不符即重哈希，写出时剪除不在本次清单的行（stats.pruned）；读失败仅降级全量重哈希，不改清单正确性。
  生命周期唯一缺口：废弃项目的 `<sha256(root)>.json` 整文件不回收，增长以"曾用项目数"为界、可重建、无正确性影响——按历史文件保护合同只记事实，不迁移不删。
- 更新安装消费者：`src/updates/*` 仅写 `globalStorage/updates/verified/<sha256>.vsix`（wx+0600，内容寻址，无 temp/staging/rename 残留），跨项目安装工件按合同保留平台位置；
  `src/features/ExtensionUpdates.ts` 纯版本/资产解析零磁盘写。更新路径无需单独阻塞项。SFTP local staging 废弃清理缺口属 SFTP reader 事实范围，双确认槽门禁不改。

r17 候选增量（暂存前标注，防丢失；实际暂存仍待最终候选审核）：untracked 新增
`src/features/ProjectStatePaths.ts`、`test/features/projectStatePaths.test.js`、`test/features/latestResultExportDarwinLock.test.js`；
ignored-new 需 `git add -f`：`dist/features/ProjectStatePaths.js`（`.gitignore dist/` 掩盖，同 r11 JobArtifactSyncIdentity 先例）。

## §48 r18 审核返修落地（marker 租约协议/根漂移/缓存归属）+ SFTP worktree 建立

B 的 Windows 复验 7/7 全绿 exit0 snapshotStable（snapshot win-stage-r17-ZAATLW，stdout
`/host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/host-windows/a27801bf-cd64-46bb-a58b-d197f53143f2-stdout.log`；首次红 win-stage-r17-n7r0Iv 留存）。
- 返修①平台写位：`managedWriteBitsAllowed(mode,platform)` 单源移入 `ProjectStatePaths`（features 层），
  `ensureRealManagedDirectory` 按其判定（Windows st_mode 不承载 ACL→位规则豁免，真实 ACL 平台原生必验）；
  `LatestResultExport` 改为 import+re-export，B 契约 API 与既有 7/7 证据一致、断言未动。
- 返修②marker 协议重做（journal 协议整体移除，不留 .importing 恢复语义）：
  `ensureProjectDirectorySnapshotsMigrated(marker)` 全程在**现有跨进程 HostOperationLease**内执行——scope 公式与
  legacy.ts:20336 `withPluginStateFileLease` 一致（resources=[{server:local,project:dirname(marker),target:marker}]，waitForConflict）；
  租约内 recheck marker→整批导入→**仅全部成功后** publish marker；EEXIST 不再"继续搬"，中途失败绝不标 done（重启可补完）。
  `releaseMigratedProjectSnapshotRecord`/`PlanRunHost.releaseSettled` 取**同一 markerFile scope**（嵌套同 scope 复用父租约）：
  marker 未落定→pending-migration 拒绝删除；记录 root/operationId 校验不符→保留；队列经 `receipt.input.submissionWorkflowId→plan.id`
  仍有非终态 job→in-flight 保留（不凭显示终态猜删）。C 释放**启用仍冻结**：`finishPlanSubmissionProgress` 不再调用，
  启用形状已注释固定（`releaseSettledPlanSubmissionReceipt(operationId, current.receiptRoot)`）。
- 返修③根漂移：提交链在 `recoveryStore.save` 后把**冻结 submissionRoot** 持久进 `localOperations[id].receiptRoot`；
  helper 签名 `(operationId, frozenRoot)`——非绝对/缺失→明确保留+日志，绝不在终态取 workspaceRoot。
  测试"在飞保留→切 root not-found 且 B 树零创建→队列终态按冻结 root 释放"（开始A→切B→只释放A、B不变）。
- 新增/更新测试（可控 barrier 排程 B 导入中 A/C 排队）：projectStatePaths 14/14 exit0（batch-rapgmj8l；
  首败 batch-t4qbc9ia EACCES/夹具、batch-mb53wega 夹具各留档）。6 个受租约影响测试文件顶部加
  `LOCALAPPDATA` 自隔离（与 r3 isolatedTestEnv 同约定；沙箱 /home/node/AppData 为 root 属主，产品路径不变）。
- r18#5 缓存归属：`localCodeManifestCachePath/localScopeHashCachePath` 新写各消费项目
  `simple_cluster/cache/simple-experiment/{code-manifest-cache,scope-hash-cache}`；写入前过
  `ensureProjectManagedCacheFileDirectory`（受管树内 symlink/组可写即拒；非受管历史夹具路径行为不变）；
  身份公式/rows/schema/容量上限/租约写锁/剪除复用语义一字未动；旧 globalStorage 缓存只留原位不迁移不删；
  legacy wrapper 非绝对 root 保持无缓存降级。三夹具更新+新增两项目互不串/旧位置零写入/重载复用回归全绿
  （batch-9nk7dbm1；首败 batch-8j4b51_j 留档）。更新程序 verified/staging 分类核实：内容寻址 wx 于 globalStorage/updates/verified，
  属系统级安装资产保留平台位置，无项目 tmp 混写，无单独阻塞项。
- SFTP worktree（Linux 本地 Git，串行）：只读预检 toplevel=/repos/MCP/simple-sftp、HEAD=452872c2…=父核 origin/master、
  干净、分支/路径未占用→`git worktree add -b fix/project-state-lifecycle-20261025 /repos/MCP/simple-sftp-project-state-lifecycle-20261025 452872c2…` 成功；
  初 HEAD=基线、worktree 干净；原仓 HEAD/branch/index 未动（porcelain 0 行）；prunable 旧登记项未清理。

## §49 r24 真跨进程 barrier+r21 缺口、fullCheck 夹具债返修、两处真实产品修复（Linux 本地；未暂存未提交）

r24 两条真跨进程 barrier（test/_helpers/projectStateMigrationWorker.js 四模式 migrate/release/receipt-hold/receipt-release，
spawn 独立 node 进程）+r21 三条缺口测试落地，projectStatePaths 18/18 exit0（batch-wy9wenzi/pi-test-rz0xgyf7；
首败 batch-1jp6ujby 前形态 16/18 留档）。关键取证：裸 `acquire()` 不建 AsyncLocalStorage 持有上下文——外层裸 acquire 后
生产 `run()` 进同 scope 会命中 parent 复用而自我排队死锁；屏障/断言必须置于生产 `run()`/`withProjectStateMigrationLease`
回调内（嵌套 acquire 命中 parent→assertHeld 即持有上下文内跨进程验证）。目录级：B worker 生产 ensure 租约内发布 f1 后
assertHeld+signal+gate，C=release 第三进程（B 未完即被 pending-migration 阻塞，gate 落定后精确删除一次 f1，f2/f3 字节对，
legacy 不动，无 .migrating 残留），A=并行 migrate（marker 命中 published=0 跳过）。回执级：A 在真实持有上下文内
assertOwned→gate→load(opId)→再 assertHeld；C=receipt-release 第三进程阻塞至落定后删 op-x 恰一次、op-y 字节对、
in-process releaseSettled 幂等 not-found。r21 缺口：同记录三并发 release 恰一 released 其余 not-found、目录伪装记录
rm EISDIR 透出 inner 保留；POSIX 真实 chmod 0o777 拒绝且拒在写入前/0700 恢复通过/非项目路径早退不变（win32 跳过）。
- 真实产品修复①：`src/cli/parse.ts` applyFlag 缺 `--consumer-root` 分支（VALUE_FLAGS 已声明→运行时 unknown option throw），
  补分支后 CLI↔真实 17-D 引擎端到端绿（batch-6sl6bz9d，argv 带 env SIMPLE_TEST_SFTP_ROOT 前缀+testFileArgs）。
- 真实产品修复②：`PlanCleanupHost.openIsolatedBatchReviews` 未先 `ensureOperationRecordsMigrated`（155/156 OPERATION_NOT_FOUND
  为真实缺口非夹具漂移）——桥接前加迁移等待（r17-B anchor 规则），dist 同步。
- 真实产品修复③（r24 尾部）：`legacy.ts loadDistributedQueue` 迁移前置 `ensureProjectSnapshotMigrated` 原在 stale 回退 try
  **之外**，其对非 ENOENT 磁盘错误照实上抛→真实磁盘故障绕过批准的 last-known-good/stale 回退（088 :398 disk-failure 测试
  暴露，首败 batch-tue8hmxb/5xyuu5dg、批跑 batch-5xyuu5dg/pi-test-difjmrle 留档）。修复=migration 声明前置、await 移入
  同 try，catch 回退逻辑一字未动；`node scripts/tsc-cached.js` result=ok emitted=380，dist:12211 确认携带。切片消费者仅两个：
  distributedQueueCacheStability 18/18（batch-ezah04e3/pi-test-uj_hc87p）、distributedPlanExecutionMode 10/10（batch-rlsdhlt0）；
  其余 168 处 loadDistributedQueue 皆为桩替换或非跨编辑区切片，不受影响。
- fullCheck 首跑（batch-w8rbgk5d）暴露 10 个 r17 时代夹具红，除上述产品修复②外全部机械适配：vm 切片补
  `ProjectStatePaths_1` 映射/stub（152、088 内存盘 shim 同生产语义）、假项目根改真实/resolve 绝对根（091/142/179、
  staleQueueRoundBehavior 两 fixture+workspaceRoot 注入、syncScopeTransferBatch 平台三元）、LOCALAPPDATA 自隔离
  （planCleanupReconnect、isolatedReviewWorld helper）、completedJobArtifactRootBinding guard 前缀过滤 simple_cluster。
  绿 receipt：batch-kwxyr6ot、batch-lbki47zg、batch-93fjlv2w、batch-4q03_i80、batch-5asnh2u7（agents 5/5 含新
  --consumer-root 缺失/相对根拒绝断言）。
- 已知保留红（非本任务回归，基线即红）：publicCliAliases（HEAD package.json bin=./bin/simpleex.cjs vs 期望 ./dist/cli.js；
  本任务 package.json diff 仅 version 0.5.408→0.5.409）、syncResolution Linux 已知红、SFTP mapped 20 既有 Linux 红。
- C 释放启用仍冻结（Win A 复验通过前不动）；r22 接线/r23 发行未启动。两 worktree 均不暂存不提交；本块后续写入范围声明见
  report_stage（batch 目录 /home/node/.local/share/pi-claude/config/runtime/batch-results/）。

## §50 Win A 通过 + C 启用生命周期闭环只读判定（未接线；父计划前冻结）

- Win A 真实 14/14 exit0 无 skip：独立 snapshot win-stage-r17-1Bqrug，完整 dist/src/TS5.9.3/helper 闭包 938 项哈希稳定；
  日志 /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/host-windows/c76cbd9a-6ed9-41ba-a752-687a1d77ff92-stdout.log。
  父已精读确认新 marker 移除 journal 并复用同 scope HostOperationLease——该已证问题关闭，不再重查/加锁协议。
- C 启用判定（本小块 source-backed，全部只读）：
  1) 回执写入全部在提交流内、队列 durable 写之前且均 await：finishDistributedPlanSubmission 内 save :11246(开始)/:11309(codeSync 后)/
     :11330(preflight 后)/:11392(catch 记 lastError/cancelled，await 后才 finish)；enqueueDistributedPlan :12228 生成 submissionWorkflowId→
     :12229 save（白名单含 submissionWorkflowId，PlanRunHost.ts:74）→ :12230 起才读队列、后续才写队列。enqueue 成功后全链无 save。
     即 succeeded 终态时刻"本 operation 所有 save 已结束"由流形状保证。
  2) 终态后 load() 消费者仅两个：resumePlanSubmission :7283、cancelPlanRunSubmission :7303（load→改 recovery.cancelled→save 写回执）。
     入口：面板命令 retryPlanSubmission/cancelPlanSubmission :5511-5512 + API apiWorkflowRun{operationId} :3043（仅 resume 向）。
     面板按钮门控 `row.retryableSubmission && historyId`（PanelHtml.legacy:15492，经 PanelHtml.ts:37-39 委托为活动渲染）；
     retryableSubmission 只在记录上写入于 :11397（失败分支，随后 finish 即 failed/cancelled），resume :7294 复位 false，
     :12156/WorkerTaskQuery:29 是错误对象属性非记录——succeeded 记录恒不带该标志→UI 在成功终态不出现 retry/cancel 按钮。
  3) 结论：提交 durable 后回执无实际恢复/在飞读写消费者。安全释放形状=明确 status=succeeded 终态 + 回执自带 input.submissionWorkflowId
     + 持久队列读回存在同 id plan（durable 关联已建立）+ 本流 save 已结束（1 已证）→ 在 succeeded 终态回调内即时释放；
     缺 workflowId/缺 loadDistributedQueue 函数/队列读回无该 plan/读队列失败→一律明确保留。现有 :54-58 的 jobs-running in-flight
     判定把远端任务状态等同本地回执消费者：succeeded 时刻 plan 恒为 pending→C 永久 no-op（回收目标失效），而 workflowId 缺失路径
     反而径直删（危险面）——两段都应由上述"提交终态+durable 关联"判据替代，无需新增终态回调/回收接点/轮询。
  4) 唯一语义变化点：API apiWorkflowRun 对 succeeded+已释放 operation 的 resume 从幂等成功（:11249 队列命中"已恢复原提交"）变为
     显式错误（PlanRunHost.load ENOENT 直抛；建议接线时给 resume 侧明确 not-found 文案，删除行为本身不变）。
  5) receiptRoot 持久化属实非内存赋值：:11248 写 localOperations[operationId].receiptRoot（submissionRoot 冻结）→
     markLocalOperationsDirty(:4079，200ms 防抖) → writeProjectLocalOperationsState :26885 落
     simple_cluster/ui/local_operations.json（schemaVersion 1）；normalizeLocalOperationsState :26849 `{...row, operationId}` 全字段保留，
     readProjectLocalOperationsState :26867 读回、:4071-4076 恢复进 this.localOperations——跨重启读回保留。compactOperationRecords
     :25596 只做条数修剪不裁字段。
- 本小块零写入（除本文档），C 接线仍冻结；SFTP 17-D 已全绿无待写入者。

## §51 Win A r24 唯一红返修（测试合同两项，产品零改动；Linux 18/18，待父同脚本单文件复验）

- Win A r24 复验事实：17/18 exit1 非 timeout——新增两条真跨进程 barrier（目录级/回执级）均绿；唯一红 :181 旧释放合同测试——
  先启动 release Promise 再并发启动 import 无法保证先拿锁，Windows 本次 import 先落定 marker 后 release 合理返回 released，
  :187 硬期望 pending-migration 属调度运气断言。完整日志 /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/
  host-windows/4f87493c-fd5d-4482-ad3c-e5f63ef3d321-stdout.log；snapshot win-stage-r17-xzweD8/{inputs,result}.json，939 项闭包
  稳定，LOCALAPPDATA 等完全隔离，预算原 20000 未改。首败链另含 r21 chmod 用例 Windows 分支开头 return=0 断言假绿（父发现）。
- 返修①（:181，确定性机械）：marker 落定前**单独 await** 释放→严格断言 pending-migration 且 legacy 源字节未被删（首败
  batch-b0jrl3jp/pi-test-7awb5v6t 留档：改序后导入前 target/f1 本就不存在，"没删任何东西"的正确事实=legacy 原样，一次机械
  自修并补"导入落定后 target 存在"钉桩）→再 await 导入→原精确释放 released/幂等 not-found/f9 用户新文件不受影响/noLegacy
  落定断言全保留。真实并行覆盖由 r24 两条真跨进程 barrier 用例承担，不允许多结果放宽、未改产品、未碰绿。
- 返修②（r21 chmod 用例）：废除 Windows 空 return。Windows 分支真实跑守卫三断言：chmod 0o777 后 ensureProjectManagedCacheFileDirectory
  按平台写位豁免**真实创建**缓存目录（存在性）+创建只落本项目 simple_cluster 子树（归属）+异项目路径早退绝不代建（原行为）；
  POSIX 分支原 chmod 全断言逐字保留（拒绝发生在写入前/0700 恢复通过/非项目路径不变）。Mac 原生 ACL 仍另列。
- Linux 复验：test/features/projectStatePaths.test.js 18/18 exit0 skipped=0（batch-icmruhbm/pi-test-4n352l70）。产品/dist 输入未变
  （本轮唯一改动=该测试文件），待父用原脚本仅该文件在原 snapshot 闭包复验；C/r22 三项写入仍冻结至此。r20 接线计划已按父指示
  直读 plan.md §r20（三真 succeeded 释放/移除 jobs-running 门禁/围栏不减），Win 通过后执行，不重做只读调查。SFTP 17-D 独立就绪
  结果保留，未重复实现/验证。

## §52 r20 C 接线实施（Win A r25 通过后按 plan.md §r20 执行；Linux 全矩阵绿，待父 Windows 重验）

- 产品改动两处：①`PlanRunHost.releaseSettled(id, successFact?)`——删除 r18/19 的队列 jobs-running 门禁与队列读取，
  唯一删除授权=显式 `"submission-succeeded"` 业务事实（缺→`no-success-fact` 明确保留，不默认无引用）；marker 同 scope
  HostOperationLease、迁移重核、root/operationId 匹配、损坏/foreign/pending-migration 围栏一字未动。
  ②`finishPlanSubmissionProgress` succeeded 分支单点接线 `void this.releaseSettledPlanSubmissionReceipt?.(operationId,
  current.receiptRoot)`（三真成功分支——正常 durable :11414、durable 短恢复 :11250、keep_existing :11361——唯一漏斗；
  `?.` 保证无 helper 的 vm 切片零破坏，planSubmissionVisiblePreflight 切片绿为证）；helper 内固定传成功事实、缺冻结 root
  保留+warn 原样。failed/cancelled/queued 与 :6904 取消守卫不触碰。keep_existing 无 workflowId/新 plan 不虚构。
- 测试合同更新（父批准的错误前提修正）：:199 合同测试改"缺成功事实/root 不符保留；running job 非回执消费者（hostStub
  loadDistributedQueue=assert.fail 钉住释放不再读队列）；冻结 root 即时释放"；#19 新增 producer 矩阵（vm 真 finish→真 helper→
  真 PlanRunHost/租约/文件，同步点=被接线捕获的返回 Promise，无 sleep/轮询）：正常 durable/keep_existing 即时释放、损坏回执
  字节不动、缺 receiptRoot 保留+warn、已取消+迟到 succeeded 守卫保留、failed/queued 保留、同目录其它文件不动、重复终态幂等、
  两项目交错只动冻结 root；r24 worker receipt-release 与测试内 in-process 释放随签名带成功事实。
- 夹具债（接线后首次触达租约注册表，按 r18 既有约定补 LOCALAPPDATA 自隔离）：currentSubmissionTruth、planRunQueryRegression、
  planPreflightProgressSpeed 顶部各 1 行；首败 batch-1w3ydq53 三例 EACCES(/home/node/AppData…)、batch-omo0zp71 中两例
  realpathSync 拼写自误（本人笔误非产品）均留档，终绿 batch-omo0zp71+batch-nl15xqdk。
- Linux 全矩阵 receipt：projectStatePaths 19/19 exit0 skipped=0（batch-9zalq9jo；首败 batch-pw54np2z=vm host 缺 context 夹具，
  一次机械自修）；调用域 13 文件（batch-1w3ydq53：vispreflight/sharedsubmission/parallelsub/noticelifecycle/ownerreconcile/
  panelmsg/panelresultcatalog/jobsyncvis/jobunavail/noticecodebatch 全绿）+3 返修绿（nl15xqdk）；dist 全文件哈希变化补跑
  distributedQueueCacheStability 18/18+distributedPlanExecutionMode 10/10（batch-x13ghb65）。tsc-cached result=ok emitted=380，
  dist/extension/legacy.js:7118 接线与 PlanRunHost.js:82 门禁就位。
- Windows 重验变化输入（相对 win-stage-r17-LlnjrI）：src/extension/{legacy.ts,PlanRunHost.ts}、dist/extension/{legacy.js,
  PlanRunHost.js}（tsc 全重建）、test/features/projectStatePaths.test.js、test/_helpers/projectStateMigrationWorker.js、
  test/features/{currentSubmissionTruth,planRunQueryRegression,planPreflightProgressSpeed}.test.js。其余 939 闭包项不变。
  C/r22 冻结解除即本实施；r23 发行与 final gates 仍待父整合审阅；未提交未暂存；未触服务器。SFTP 17-D diff/测试证据原样保留
  供父独立阅源码，未重跑同候选。

## §53 SFTP r26 会话记录位置修复（17-D 同范围遗漏；Linux 10/10，待父纯 JS 快照变更域重验）

- 父证遗漏：SFTP extension.js writeLocalSessionRecord 新写 .vscode/simple-sftp-session.json、:5451 同位读——插件会话状态
  （动作/时间/设备/远端路径事实，消费者仅 getUploadBaselineMs fallback，无平台外部合同），属"项目状态入 simple_cluster"
  已授权范围。修复镜像 upload-state 单源模式：新写只落 <消费项目>/simple_cluster/state/simple-sftp/session.json
  （复用 ensureManagedSegmentsSync 逐段链接/写位守卫，覆盖单固定文件、无会话历史堆积）；读=新文件存在即胜（损坏→null
  绝不复活旧值）、缺新才读精确旧 .vscode 文件（只读）；旧文件不迁移/不删/字节不动、不枚举旧项目；无新协议/异步签名/配置。
  __test 导出 readLocalSessionRecord/writeLocalSessionRecord/projectSessionPath/getUploadBaselineMs。
- 测试矩阵入既有同源 cleanupConsumerRoot.test.js（不新建文件）：两 root 交错互不串写、同项目新值获胜+旧字节原样、
  坏新不回退、缺新读旧、managed 链接拒绝（win32 junction/Linux dir 双平台形状）、getUploadBaselineMs 优先级
  upload-state→session→initial 不变+坏 upload-state 落穿 session（既有语义，仅 session 源移位）。
  10/10 exit0 skipped=0（batch-izmfaflt/pi-test-mc9ndel6；旧 6/6 测试全保留未动）。
- 金丝雀：cleanupExplicitTarget/cleanupExecuteSelfBusy 绿（batch-uzy7yme6）；compressionNegotiation 两红=HEAD 已含
  "文件副作用必须由 Windows UI Extension Host 执行"平台守卫（git show HEAD:extension.js 4 处命中）=Linux 既有拒绝族，
  非本轮回归；Windows 侧由父同快照执行器覆盖。
- 变更域（相对 win-stage-r17-fezGOH 23 项）：extension.js、test/cleanupConsumerRoot.test.js 两文件；其余输入哈希不变。
  其它分类按父裁定未动：.vscode/sftp.json 原位（disableExternalUploadOnSave 外部读取器合同）、AGENTS/.git-info-exclude
  不动、远端 handoff marker 范围待父另界定，未触任何服务器。C/SE 源码本轮零改动（供 Win 验证稳定）。SFTP worktree
  未暂存未提交。
- report_stage 本块 stage=g1n_t__1；前两次调用（5jgr9ydq/uxmcqjin）因本人漏传必填 phase 被校验器以"Heartbeat"措辞拒绝——
  经只读核 pi-claude-batch.py:86 证实为形状错误（非跨仓限制），补 phase 一次通过。

## §54 C 接线 Windows 闭环 + 待用户确认范围登记（Linux/两 worktree 未暂存未提交）

- C（r20 接线）Win A 真实 **19/19 exit0 skipped0**（含 producer 成功/失败矩阵与两条真跨进程 barrier），939 项独立输入
  稳定、原 20 秒预算：/host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/host-windows/
  ed792c33-8581-4dcc-95a2-f8b6ed5ca9df-stdout.log，snapshot win-stage-r17-eXXeVJ。§52 的"待父 Windows 重验"关闭为
  通过；未变输入不重跑。
- SFTP session 块（r26）状态不变：已实施+Linux 10/10（§53），stage g1n_t__1 已交；待父 fezGOH 变更域两项重验
  （extension.js、cleanupConsumerRoot.test.js）。已授权范围内无剩余未完成项。
- 待用户集中确认、明确不写的两个范围（父向用户提请）：①远端交接 marker——现状 getRemoteMarkerPath=远端 root+basename、
  跨设备协议+用户可自定名，是否统一新写路径未批准（readonlyserver 边界只约束现场操作，不等于禁止未来代码，但涉协议须先授权）；
  ②Mac 原生 CI——父已核 GitHub 现有 Actions 两仓 total_count=0（日志 b06aca77-10eb-40a8-8bfc-5edfb47f65bb），
  当前无可复用 Mac 执行面；Mac 结果写锁/原生 ACL 仍为已登记验收缺口，不用 Linux 注入或 Windows 通过冒充。
  本轮未创建/修改任何 CI 文件、未 push、未开 runner、未动远端路径或执行服务器操作。
- 其它保持项不变：.vscode/sftp.json 原位（外部读取器合同）、AGENTS/.git/info/exclude 不动；full/package/提交/发行未启动。

## §55 SFTP session 块 Windows 闭环（分块证据；整体交付未完成）

- SFTP session 变更域 Win 真实 **10/10 exit0 skipped0**，23 输入独立快照稳定、原 20 秒预算：
  /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/host-windows/0d870d74-ea63-4975-b0aa-af71f62b2c5c-stdout.log，
  snapshot win-stage-r17-fCSS2z/{inputs,result}.json。SFTP 已授权本地 session 目标（写迁移/读优先新/缺新读旧/坏新不回退/
  旧字节不动/链接拒绝/baseline 三优先级）验证闭环于 §53+本条：Linux 10/10（izmfaflt）+ Windows 10/10 双端一致，未重跑。
- 状态口径：C Win 19/19（§54）+ SFTP 10/10 均为**分块证据**；未跑 full、未 package、候选未最终审核、未 PR/提交——
  不得据本条称整体交付完成。final gates/最终差异与验收计划归父。
- plan r27 两项父向用户请示中（本侧源码零变更维持）：①远端 marker 是否统一新写（若批准=保留旧只读、不实际写服务器）；
  ②是否新增两仓 Mac 原生 Actions 验证（当前两仓 0 workflow、无现成 Mac 执行面、资源费用未知）。未批准前不创建
  CI/runner、不 push、不做实际远端操作；其它当前源码保持未暂存未提交。

## §56 r28 远端交接 marker 新写位置实施（Linux 8/8 新套件 + 受影响 4 套件绿；零实际远端操作，待父 Windows 变更域重验）

- 用户答复"1是，2先不测"后按 plan.md §r28 实施。SFTP worktree `simple-sftp-project-state-lifecycle-20261025`
  产品改动全部在 `extension.js`：①`getRemoteMarkerPath` 改单源新位置 `<remoteRoot去尾斜杠>/simple_cluster/state/
  simple-sftp/handoff/<posix.basename(自定义名||默认名)>`，新增模块级 `REMOTE_HANDOFF_MANAGED_SEGMENTS`、
  `requireRemoteRoot`（root 缺失/空/仅斜杠→抛错，不回落其它位置）与 `safeHandoffMarkerName`（"."/"..")→抛错；
  ②新增 `legacyRemoteMarkerPath`＝原精确旧推导（root+basename），仅 `readRemoteHandoffMarker` 旧读使用；
  ③reader 单往返哨兵：`R<内容>`=新文件可读（空→null、坏 JSON→抛，均不读旧）、`U`=链接/目录（抛，禁读旧）、
  `M`=真缺失（仅此情形跑一次原样旧命令 `if [ -f '<旧路径>' ]; then cat …; fi`）、哨兵丢失→抛不回旧；
  ④writer 单 shell 链：四段管理目录逐个 `{ if [ -L 段 ]; then exit 65; fi; mkdir -p -m 0700 段; }` 再
  `{ if [ -L 新marker ]; then exit 66; fi; printf %s <quote(JSON)> > <quote(新marker)>; }`，`&&` 短链；沿用原
  `withFileResourceLease("写入交接标记", sftp.remotePath, [markerPath], remoteResourceServer(sftp), …)`——
  仅资源精确指向新 marker；写失败原样上抛，无回退/重试；marker JSON（schema/业务 timestamp/action 字段与
  `JSON.stringify(marker,null,2)+"\n"` 字节格式）零改动。`getUploadBaselineMs/remoteToLocal/markHandoffReadyCore`
  优先级与业务顺序未触碰（workspaceIntegration 门禁顺序断言 + cleanupConsumerRoot baseline 三优先级链均绿）。
- 传输 manifest 核实（真实调用闭包）：远端 python 清单过滤（extension.js:1112-1125 `allowed()` 与 :6604-6614
  `blocked_path()`）对 `simple_cluster` 非 `results/debug_runs/tmp/*` 子路径**默认拒绝**——新 handoff 路径任意
  basename 本就不进带 scope 的真实清单，未重复加宽；非 scope 的裸 root tar（`createRemoteTarCommand` :6583）
  原仅排除默认 basename（`X`/`./X`/`*/X`，默认名深层已被覆盖）、自定义名会漏入——已在 `getTarExcludeArgs` 增
  `simple_cluster/state/simple-sftp` 前缀排除（含 `./` 变体），测试钉住 `simple_cluster` 整体未被排除
  （`simple_cluster/results` 不受影响）。README 增源码级"新写位置/旧只读/不清洗旧文件/不进传输"说明（源仓文档，
  不在发行包面）。`__test` 增 `getRemoteMarkerPath, legacyRemoteMarkerPath` 纯路径钩子。
- 新测试 `test/handoffMarkerPlacement.test.js`（8 用例，vm 提取真实函数+脚本化 runSsh/lease 夹具，无任何真实
  ssh/sftp/网络）：两 remoteRoot 分离与同 root 稳定路径、自定义/穿越 basename、空格/中文/单引号 `'\''` quote、
  新读优先仅一次往返、仅 `M` 才读旧且旧命令逐字不变、坏新/空新/`U`/哨兵丢失/传输失败五路均不回退且调用数=1、
  写命令四段管理目录顺序+`exit 65/66` 链接拒绝+`printf >` 覆盖非 `>>`、两次写目标同一路径无时间戳历史、
  lease 操作名/project 原值/paths=[新marker]/server=host小写:port、payload 字节=原 JSON 格式、tar 排除矩阵。
  首败 batch-6_ypfzb7（7 例红：夹具缺 `REMOTE_HANDOFF_MANAGED_SEGMENTS` const 注入——机械自修1）→
  batch-d986of1_（4 例红：vm 跨 realm 深比较与 vm SyntaxError 非主域实例、endsWith 漏 `; }` 后缀——夹具层机械自修2，
  产品零改动）→ 终 **8/8 exit0** batch-mexs7w5s/pi-test-6aulixws/000.raw.log。
- 受影响既有套件（改动输入 extension.js 的读取/require 闭包）同批 **4/4 exit0**：workspaceIntegration（marker 写
  入门禁顺序断言）、cleanupFiles（tar 排除成员断言）、cleanupConsumerRoot（session/baseline 优先级链）、
  downloadScope（源切片定位未受插入影响）——batch-6_ypfzb7/{pi-test-qobfwcct,pi-test-gqd4ackc,pi-test-x8yo2u8u,
  pi-test-npxroihh}/000.raw.log，此后 extension.js 零改动、仅测试夹具变化，未重跑。compressionNegotiation 未重跑：
  平台守卫族 Linux 既有 2 红（§前已录），与本变更域无调用交集。
- 安全边界维持：本块未调用任何真实 `runSsh`/SSH/SFTP、无 sync/hand-off/job 重试、服务器零接触；旧 marker 永不
  写/删/改名、无远端目录扫描、无新增用户清旧提示；`.vscode/sftp.json`、AGENTS、Git 元数据、两代 staging/受管删除
  双确认、Worker 版本、部署均未动。Mac 原生验证（答复"2先不测"）：未新增 CI/runner、未申请 GitHub 额度，
  Mac 仍如实标未实机验证。SFTP worktree 仍未暂存未提交；待父按变更域（extension.js+handoffMarkerPlacement.test.js+
  README.md+cleanupFiles.test.js 输入闭包）Windows 重验；full/package/提交/push/发行未启动。

## §57 r28 Windows 闭环 + r29 最终源证目录（只读采集；业务源码/门禁零改动，A/B-package 交集归口主控 reader）

- **r28 Windows 闭环**：handoffMarkerPlacement + cleanupConsumerRoot 经既有 r17 隔离验证器真实 **18/18 exit0 skipped0**，
  24 输入 snapshotStable=true，snapshot win-stage-r17-XR2Z9u（本仓 .review 目录内），driver SHA
  e68cc76b26545f942815f902ec1517d289b14a78222eaa82a252030c362e387d，完整 stdout
  /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/host-windows/f8d89c05-ac96-4f89-b225-bcf717e13f8f-stdout.log，
  无实际 SSH。§56 的"待父 Windows 变更域重验"关闭为通过；Linux 8/8（batch-mexs7w5s）+ Windows 18/18 双端一致，未重跑。
- **最终源证目录**（`.review-ui-plan-gpu-20261024/final-source-evidence-r29/`，manifest.txt 自描述+manifest-hashes.txt）：
  ①两仓 git 身份=branch/HEAD/common-dir/git-dir/index 路径+index SHA256+完整 status：SE
  HEAD=e9795ad0（冻结基线）、分支 fix-ui-plan-gpu-progress-20261024、common-dir=/repos/MCP/zlk-cluster-orchestrator/.git、
  index SHA256=18ab4a8b…；SFTP HEAD=452872c2（冻结基线 origin/master）、分支 fix/project-state-lifecycle-20261025、
  common-dir=/repos/MCP/simple-sftp/.git、index SHA256=744f83bd…；两者均非 master、未暂存未提交。
  ②tracked 原始完整 diff 未截断存 se-tracked-diff-full.patch（5094 行/84 文件，+2451/-411）与
  sftp-tracked-diff-full.patch（1547 行/17 文件，+437/-228），分块范围=numstat+`diff --git` 行偏移见
  {se,sftp}-tracked-diff-index.txt。③untracked 业务文件 SHA256 清单：SE 11 项（含门禁新 A/B
  projectStatePaths=db6d2919…、latestResultExportDarwinLock=090ceb40…）、SFTP 2 项
  （cleanupConsumerRoot=d91f2b14…、handoffMarkerPlacement=8ca6ea12…）。首采脚本对 git 引号路径/node_modules
  符号链接过滤失当（仅取证脚本问题，一次修正重采；首轮 stderr 全留档于会话记录）。
- **提交清单语义更正**（详见 semantics-note.txt）：`verification/**` 只排除发行包（vscodeignore+content-policy 双落点，
  r9 既有）——`verification/linux/jobArtifactStagedSlotReceiver.test.js`（SHA 5b6b5254…）是获准一对一迁移的正式
  Linux 协议覆盖，**应入源码 Git**，禁止整目录一律排除提交；support `test/features/jobArtifactStagedSlot.support.cjs`
  （SHA e47a1f90…）留原位共享单夹具、同入 Git。`.review-ui-plan-gpu-20261024/**` 与 node_modules 符号链接不交付。
  ignored 中需 `git add -f` 的 dist 产物本次核出 **2 个**（JobArtifactSyncIdentity.js a9e83cac… 之外新见
  **ProjectStatePaths.js c58f26cd…**，§41 登记 1 个与此前汇总口径差异交主控对账）；其余 ignored 全部为
  simple_cluster/** 缓存/日志/runner 报告（3644 行），SFTP ignored 仅 1 个 pyc。
- **A/B-package 交集归口**：SE `npm test`=统一 runner、`test:features` 域 glob 单点含 A/B 且无显式重复枚举（只读核过）；
  但 test 入口与 package 是否重复、package 是否选择 test:features 由主控所派独立只读 reader 冻结审查中——本侧未改
  任何脚本、未宣称 package 覆盖，待具体计划由本实例返修。其它无关代码维持冻结；两 worktree 保持未暂存未提交，
  full/package/暂存提交/远程操作零执行。

## §58 r29 marker 读取安全返修（三已证边界；Linux vm 8/8 + 真实 POSIX shell 9/9，待父变化域 Windows 重验）

- 仅修 r28 helper 及其测试（SFTP 树原负责人，无新写入者）：①`requireRemoteRoot` 现要求 POSIX 绝对路径——相对根
  （`srv/x`、`./rel`、`../up`）、Windows 形根、空值、纯 `/` 全拒绝，合法空格/中文/单引号与尾斜杠处理保留；
  ②reader 改 `createRemoteHandoffReadCommand`：单条只读命令先证根可搜索目录（否则 stderr+exit 61），再按单源
  segments 逐层证管理父目录——symlink→exit 62、非目录→exit 63、不可搜索→exit 64（均立即结束、绝不读旧），
  已证可搜索父链下父段确实缺失→即刻 `M` 结束；③最终 marker 仅 `-e` 在其父链已证后可信：链接/目录→U、存在→
  `R`+cat（不可读→cat 非零上抛，不回退）、缺失→M。M/U/R 之外的 stdout 与任何 transport/父链失败一律不读旧文件。
  旧精确读取命令、JSON/schema、lease 身份、quoting、写失败不回退旧路径全部未动；writer 复用同一根约束（同函数），
  无新增扫描/迁移/删除/真实远端操作。
- 真实 shell 行为证据（非预制哨兵）：新增 Linux-only 夹具 `verification/linux/handoffMarkerShellProtocol.test.js`
  （隔离 /bin/sh spawn 驱动真实生成命令，无 SSH/网络；不在 test/ 目录，Windows 通用套件与 npm test 均不吸收，
  显式单独执行；未借 Mac 暂缓 skip）9 用例全绿：真缺失（父链缺失/链全在仅缺 marker 两形）→M→逐字旧命令读旧
  端到端、新可读端到端、**管理父目录 symlink 指向另一项目→exit 62 且对方 marker 内容绝不外显、零旧读**、
  父段普通文件→exit 63、**不可搜索父目录→exit 64（r29 假 M 边界）非 M、零旧读**、根不可搜索→exit 61、
  不可读新文件→R 分支 cat 失败上抛且旧文件字节不变、坏新→一次往返后解析失败、marker 本体链接→真实 U、
  相对根在 transport 前拒绝（零 spawn）。vm 模拟契约矩阵保留并更新（相对根拒绝+命令含五层父证+61/62/63/64
  分支断言）。首败 batch-dimwlqm8：vm 夹具缺新函数提取 + node t.after FIFO 顺序致恢复 chmod 晚于 rm +
  assert.rejects 返回值误用——三处均夹具层一次机械自修（产品代码在首败后未再改动），终 **vm 8/8 + shell 9/9
  exit0** batch-ox51_psz/{pi-test-v5pawg0x,pi-test-k9izesai}/000.raw.log。
- 既有影响域以 r29 版 extension.js 同批全绿：workspaceIntegration/cleanupFiles/cleanupConsumerRoot/downloadScope
  （batch-dimwlqm8/{pi-test-wo2w2da3,pi-test-h4580ma1,pi-test-vo63ztaz,pi-test-tapqfpsw}），此后仅测试夹具变化未重跑。
  原 20s 预算未改、断言未删。旧 Win 18/18（§57）仅证明旧版本，返修变化域（extension.js、handoffMarkerPlacement、
  新增 verification/linux 夹具在 Windows 不运行的说明）待父重验；正式门禁 reader 私有 cwd 阻塞归父处理，未重复调查。
- 最终源证已按返修后候选重采：`.review-ui-plan-gpu-20261024/final-source-evidence-r29/`（manifest.txt 标注
  post-r29；SE patch/index、SFTP patch/index、untracked SHA——SFTP 现 3 项含 shell 夹具、ignored 分类
  2 个 dist add -f 不变）。两 worktree 仍未暂存未提交；full/package/提交/push/发行零执行；服务器只读维持。

## §59 r30-块1 r29 Windows 闭环 + 普通文件契约返修（FIFO 真实回归；Linux shell 10/10 + vm 8/8，待父变化域重验）

- **r29 Windows 闭环**：marker+consumerRoot 变化域 Win 真实 **18/18 exit0 skipped0**、24 输入稳定，snapshot
  win-stage-r17-orU7LQ，stdout /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/host-windows/
  a69a8c20-cb3a-4720-9c94-0e08c3c85d15-stdout.log；根/管理父链三项修复经 Win 复验通过（§58 待验关闭）。
- **r30 普通文件契约返修（已证回归，非新增加固）**：r29 reader 末段 `-L/-d` 后 `-e`→cat，FIFO/设备会进入 cat 阻塞；
  旧 reader `-f` 不读 FIFO。`createRemoteHandoffReadCommand` 末段改为 `-L||-d`→U、**`-f`**→R+cat（普通不可读仍
  cat 真实错误）、存在非普通→U、仅真缺失→M。其余 reader 父链/旧读/writer/lease/quoting 零改动，未扩硬链接/并发协议。
- 真实 FIFO 回归（本机已有 /usr/bin/mkfifo coreutils 9.1，未安装；不运行旧坏版本等超时）：shell 夹具新增用例
  mkfifo 造 marker→真实命令立即回 U、reject、单命令零旧读、<5s 断言防阻塞回归；vm Windows 模拟契约同步钉住
  末段 `-f`→R/cat→`-e`→U→M 字节顺序。真实 shell **10/10 exit0**、vm **8/8**，既有 4 套件以新 extension.js 输入
  同批全绿：batch-3nojyokh/{pi-test-2yj37mbv,pi-test-7_joz91u,pi-test-838zf_ft,pi-test-2_faxikp,pi-test-yuy0tvb8,
  pi-test-b0fw39x2}/000.raw.log，无失败轮（首提交即绿）。旧 Win 证据按版本标记保留（XR2Z9u=r28 版、orU7LQ=r29 版），
  本返修变化域（extension.js 末段+两测试文件）待父重验。

## §60 r30-块2 SE 正式门禁唯一登记（A/B 各恰一次，r11 六项保持；dry-run+runner 回归绿，正式 package 归 Windows 一次）

- 仅改 `scripts/test-workflow.json` 两处 sourceScript 尾追加：test:plan-run += `node --test --test-force-exit
  --test-timeout 20000 test/features/projectStatePaths.test.js`；test:fresh-results += 同参数
  `test/features/latestResultExportDarwinLock.test.js`。其余域/参数/runner 三处获批 60000/post/assemble/安全门禁
  零改动；未并入全 test glob、未动 test:features 通道、无固定总数断言。
- 身份/argv 集合核证（runner 本体 `planEntry` 展开，非猜测）：package 与 check:full 两正式入口各 234 test-jobs 中
  projectStatePaths、latestResultExportDarwinLock **各恰 1 次**，argv=[--test-force-exit,--test-timeout,20000]；
  r11 原六项（panelMessageDispatch@plan-run；completedJobArtifactRootBinding/jobArtifactStagedSlotIdentity/
  jobArtifactSyncIdentity/completedJobForeignSourceClassify/workerFpsyncTaskLabel@latest-artifacts）**各恰 1 次**；
  通配身份 job=0。manifest JSON 层重复枚举=无。dry-run 摘要 jobs=234、dedup 450→234(-216)、hooksVerified=zero、
  phases=compile/fullCheck/post/assemble 不变。batch-z14dzua7/{pi-test-39u9rtq2,pi-test-r4_lk44w,pi-test-je8u_5wm}
  全 exit0（package/check:full dry-run + testWorkflowRunner 等价回归套件）。
- 域外历史失败未触碰、不宣称通过。**正式 Windows `npm run package` 仅运行一次（内含全部既定 fullCheck）归主控
  放行后执行**；Linux 侧本块未跑 full/package。Mac 注入契约≠原生实机验证。

## §61 r30-块3 SFTP package 去重改造（build 30 身份⊆test-serial 68；首败短路源码实证）

- 仅改 `package.json` 一行：`package` = `node scripts/verify-runtime.js && node scripts/test-serial.js &&
  node scripts/package-vsix.js`；`test`/`test:isolation-contract`/`build`/`install:latest` 原入口逐字未动，
  无 pre/post hook（scripts 键全举：test、test:isolation-contract、build、package、install:latest）。
- 等价覆盖源证：原 build 显式 27 文件 + 嵌套 test:isolation-contract 3 文件 = 30 身份**全部**位于 test-serial
  readdir 发现集（当前 68 个 test/*.test.js，missing=NONE，build 内无重复枚举）；test-serial 子进程 argv=
  `--test --test-force-exit --test-timeout 20000 --test-reporter=spec`（scripts/test-serial.js:83），默认预算
  20000 且 timeoutLimit 只可缩至 250 下界绝不放大（:6-17）；NODE_TEST_CONTEXT 仅删该单变量其余环境原样（:81-82），
  spec reporter/日志/清变量不改变断言——由既有回归钉住并全绿：batch-eour9rfn/{pi-test-m18khmyg,
  pi-test-c7c4g2p2,pi-test-0qd2x_i0}/000.raw.log（OutputPreservation/FailureMetadata/LogIdentity exit0）。
- reader"test-serial 不短路"更正（源码实证）：main() `for (const file of files)`+await Promise 无逐项 catch
  （:76-118），任一失败/spawn 错误/超时即 reject → `main().catch(→exitCode=1)`（:121-122）首败阻断；仅执行顺序
  遵循 readdir().sort() 字典序（:74）。未发现顺序/参数依赖导致不等价，无需停止条款。
- SFTP `package.files` 显式 allowlist 不含 verification（新增两协议夹具入源码 Git、不入包，本块未动 files 面）；
  patch 版本拟递增但按 r30 当前不改版本、宿主 GitHub 最新版本查询归主控；未提交、未 package、未安装、未发布。

## §62 r30-块1 Windows 闭环 + r31 SFTP 候选版本 0.2.109（版本来源单源核验；正式 package 仍待放行）

- r30 块1（-f 普通文件契约+FIFO 回归）变化域宿主 Win 真实 **18/18 exit0 skipped0**、24 输入快照稳定，
  snapshot win-stage-r17-x6kNUZ，stdout /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/
  host-windows/5689dea2-8e3a-4e43-b12b-98809252e0ad-stdout.log——只绑定该独立快照（XR2Z9u=r28、orU7LQ=r29、
  x6kNUZ=r30 版本标记各自保留）。
- r31 宿主只读前置（转录父交事实，Linux 侧未自行远程查询）：两仓 master 未前移（SE e9795ad0、SFTP 452872c2）；
  Latest v0.5.408/v0.2.108（日志 65729630-c0b1-4958-b154-f29b81dcdf56-stdout.log）；拟发 v0.5.409/v0.2.109
  release 与精确 Git 标签均明确 HTTP 404、gh 每条真实 exit1（3b351ca1-7c26-466d-a3c3-b9b802dbe2f5-stdout/stderr.log，
  不改写为工具 exit0）；pi-delivery-check 前置 receipt def08871-…/809b3f57-…（当时 manifest 0.5.409/0.2.108，
  仅证明列举文件与查询时刻，不作最终全树检查/写入凭据）。
- SFTP 候选版本同步 **0.2.109**：package.json `version`、package-lock.json 根与 `packages[""]` 共 3 处；
  实际运行版本来源核验为单源——extension.js:302 运行上报与 scripts/package-vsix.js:6 产物命名均读
  package.json，仓内 0.2.108 残留=0；未全仓替换历史版本、未改协议/Worker。SE 保持 0.5.409 零改动。
- 状态：r30 三块 Linux 侧全部闭环（块1 另 Win x6kNUZ）；正式 Windows 完整 package（SFTP 新 package 链与 SE
  package 一次）仍待主控核候选版本/完整输入/独立输出后放行；两 worktree 未暂存未提交、无远程操作。

## §63 r32 两夹具返修（正式 package 首验 job-161/229；Linux 目标全绿，待父覆入 Native 树重验）

- 首验事实转录（宿主）：独立树 D:/GitRepo/MCP/.win-se-delivery-scpfFp（固定祖先 e9795ad0、2071 文件 SHA 一致）
  `npm run package` 真实 **exit1**：234 全执行、232 绿、compile 九步过、post/assemble 未执行、无包；
  仅 localCodeManifestCache(job-161)/clearedOutputReplacement(job-229) 红；run.json
  /host/d/GitRepo/MCP/.win-se-delivery-scpfFp/simple_cluster/reports/test-workflow/2026-10-25T03-42-31-388Z-62336-package/run.json，
  全日志 d80e5264-…-stdout/stderr.log，总 451721ms；首次失败与既有 Native 输出/缓存全保留。
- 返修1 `test/features/localCodeManifestCache.test.js`：:121 期望按原平台契约独立构造
  （win32→resolve 后 toLowerCase、非 Win 保持大小写），与产品 LocalCodeManifestCache.ts:59 原公式一致；
  路径形状/两项目隔离/旧 globalStorage 零写/重载 hash&reuse 断言全保留，产品零改动。
- 返修2 `test/features/clearedOutputReplacement.test.js`：vm 夹具按已修复 Host 模式一次补齐 r17 新增调用闭包——
  真实 `src/features/ProjectStatePaths.ts` 四导出（projectStateDir/projectStateFile/
  ensureProjectDirectorySnapshotsMigrated/ensureProjectSnapshotMigrated）+ 模块级 jsonWithMigration AST 拼接
  （先核类体自由标识符全集仅这些）；真实迁移/机器状态守卫生效。首败 EACCES 命中沙箱只读 AppData 租约注册表——
  即"该流程所需 host 租约接口"实触达，按 r17 既有约定补 LOCALAPPDATA 隔离行（与 planRunQueryRegression 等
  三夹具同型，产品路径不变）；collect/execute/状态与队列字节不变断言全保留。
- Linux（原 20000 预算，evidence 执行器完整日志）：localCodeManifestCache **exit0**
  batch-4928vq9o/pi-test-xcd7ywg3/000.raw.log；clearedOutputReplacement **5/5 exit0**
  batch-0xihm_a4/pi-test-ug1t1n1d/000.raw.log（首败留档 batch-4928vq9o/pi-test-cwh2ev_4）。
  两文件 SHA256 见 stage/manifest；交父覆入 Native 树（先目标域、后完整 npm run package 重跑全部 234，
  不以 232 绿跳过）。Linux 侧未跑 full/package；两 worktree 未暂存未提交、无远程。

## §64 r33 SFTP api.test.js:447 布局代理返修（正式 package 首败 api 19/20；Linux 目标 20/20）

- 首败事实（父转录 + 独立 reader 冻结证据 /repos/.delivery-gates-reader-8lmo6c9h/frozen/r33-sftp-api、r33-fragment.md）：SFTP 首次正式 package runtime 22 过、串行前 2 文件过、api.test.js 19/20 首败停（log b5654918…）。失败断言 :447 `/module\.exports[\s\S]{0,200}apiTransferSftp/`：baseline 字面距离 73<200 真通过，candidate 因 r17-D/r26/r28 test hooks 插入 `__test:` 块（candidate-extension.js:7045-7053）推到 826>200；apiTransferSftp 定义（:4736 同行号）、12 处调用点、exports `__test:` 成员（:7054）两侧完好，测试 SHA 两侧相同——纯布局脆弱，非 API 丢失。
- 返修（仅 test/api.test.js，产品 exports/其余断言/预算/skip 零改动）：顶部 +`const vm = require("node:vm")`；新增 exportedObjectText(source)——锚定唯一 `\nmodule.exports = {`（split 计数断言唯一），括号配平扫描（跳过 // 行注释、/* */ 块注释、引号段）到真正闭合括号取完整对象字面量，非固定距离、非无闭合边界 `.*`；:447 替换为 vm 仅求值导出声明式对象（不跑整个扩展）：Proxy 哨兵 has→true/get→`sentinel:<name>` 捕获全部自由标识符，断言 `Object.hasOwn(exported,"__test")`、`Object.hasOwn(exported.__test,"apiTransferSftp")`（own 成员，移出块/移入其它嵌套即败）、`exported.__test.apiTransferSftp === "sentinel:apiTransferSftp"`（正确同名绑定，别名即败）。:445 {0,700}、:446、:438 {0,120} 及其余断言逐字保留（margin 519/85，reader §3 证本轮不复发）。
- Linux 验证：node --test --test-force-exit --test-timeout 20000 test/api.test.js → tests 20 pass 20 fail 0 skipped 0，EXIT 0（batch-e3j62n79/pi-test-_2zsu_g9/000.raw.log）。
- 改后文件 SHA256：test/api.test.js = d13e19f3696badcbeca74c054fa582b931ab5ce7f13d722d8415883b2d4ae58f。待父覆入独立 Native SFTP 副本重验目标域并续跑完整正式 package；本侧未做 full/package/提交/远程。

## 65. 主控接续：正式Windows验收与末项消费项目夹具
- 用户要求剩余由主控直接做，不再派子代理；原实现者/reader已完成且未续跑。
- SE最终完整package：234/234、13 gates、exit0，Native run=2026-10-25T04-01-16-282Z-67756-package；完整宿主stdout=74a93022-a50f-4bd1-809f-1019afa5bf77。包后清单342项，leakHits=0/missingRequired=0。首轮两测试失败及r17缺helper证据不覆盖，Mac原生仍未实测。
- SFTP r33 API Win20/20后full首败isolateBusyFailClosedGate：缺consumerRoot导致8例先报CONSUMER_ROOT_INVALID，非实际守卫放行。仅该夹具独立消费根贯穿preview/confirm/execute，断言零删改；SHA=f5509bf7d3ba1ceda5bca7bf97bc58c9b7708e95097a9687da26c3ccff6279d4。node(uid1000) Linux经pi-test-evidence 9/9 exit0，完整/tmp/pi-test-vxt7aqkt/，宿主日志6f743a79-9437-4211-939c-878f2db7ce23。待Native目标及full，不宣称后续覆盖通过。

## 66. 最终包、源码对应与主控收尾审核
- SFTP r34 Windows目标9/9及正式npm run package均exit0，完整发现集68文件/419断言通过，runtime22文件gate通过，产物25归档成员；stdout321f90b6-4bf8-4c87-b55c-72908356f852，独立环境sftp-final-8wpeBp，未安装/发行。首次r33后续首败与源fixture缺consumerRoot记录不覆盖。
- 确定SE包：simple-experiment-0.5.409.vsix，2529449字节，SHA256=7c6f7bdaa692a2211874a4e795c95279ba6e5a29adfe54809af87c9ce50c22d1。确定SFTP包：simple-sftp-0.2.109.vsix，220735字节，SHA256=5d20dfc27dacce6e97ba851c441cb2247bc2473205a645dd979e429f2a9fbac9。同名UTF-8 sha256清单已独占生成，日志58624d56-8d55-46e3-9f84-5dd94ebf058f；后续上传/安装不得换包。
- 实际归档核查：SE342/SFTP25成员，无重复/越界/文档目录/测试/verification/备份/日志/依赖树；SFTP成员集合与package.files+包元数据精确相等。根README及LICENSE是既有VSCE强制的根工具链/法律元数据例外，其余指南/取证材料仅源码。勘误：r28称README在包外不准确，实际根readme.md随VSCE元数据保留，不将该说法作为验收事实。
- 固定verify-install仅借用作“包→已验收构建树”字节比较（不称已安装）：SFTP23/23全匹配，receipt d0d6de51-ba32-4ff2-8f87-b090dc1c5fb9；SE340成员中唯一readme.md差异（53c5d537-de13-45d9-a20a-b323c0c2f943），已精读证实仅VSCE把7个相对docs链接变为既定仓库blob/HEAD绝对URL，运行文件全部匹配；这是构建树不等于安装树的已知工具处理，不放宽固定安装校验器。真实安装后仍必须用原固定校验器严格核archive/installedRoot。
- Native全部输入对源树再次逐文件SHA：SE2071、SFTP146；唯一差异为源码归档计划/证据两Markdown（不入运行包/测试消费），全部运行源码、测试、脚本、依赖配置及生成文件一致。仅dist/panel-build-manifest.json此前未重生成，已从通过完整验收的Native输出精确回写（SHA c9ceb92a9441dc64000a54c2db68e2fc93faccd1011fbc71d84caf8e077e0f2a），旧字节保存在r35-panel-manifest-before.json；实际JS均早已相同，未重新编译或换包。
- 主控审阅最终差异与相关完整验证：通知/确定产物身份/两代staging/机器状态保护/foreign-only限域保持；每项目路径与迁移互斥/成功回执回收/SFTP归属/远端marker读取异常关闭符合已批范围；r32/r33/r34仅夹具保持原断言，不跳测试、不增时、不删除旧状态。当前无已证必须返修项，可以精确暂存提交并发起两PR；合并及发行遵循SKILL审核和授权，不直接推master。Mac原生按用户决定未做，历史Linux全量红保留，远端服务器/Worker从未写入或升级。

## 67. r36 多Plan逐Job自动同步组合验证与真实现场核查
- 已有nativeFixture确实把scheduleDistributedPostprocess替成no-op，原completedJobLatestSync则直接调用Host；因此增加连接处组合断言，直接并入idleGpuDispatchLifecycle.integration.test.js。真实生产tick→完成事件→scheduleDistributedPostprocess→syncCompletedPlanArtifacts→CompletedJobSyncHost→mergeLatestWorkerVersions→真实临时文件/SHA→patchDistributedJob全部相连；仅Worker执行/网络运输模拟。两个Plan四Job交错及同轮完成，三Worker每目标文件实际内容与SHA一致，重复观察不重传、不重跑训练，原21案保留。实际项目根用运行平台临时目录，源码不写Linux绝对路径。
- Linux证据入口r36-plan-chain-linux.json被NativePlatformRequired拒绝，exit2、steps空，未执行产品测试；不作为通过。后续按更新平台规则仅Windows/macOS原生验证，原生完整验收树复用，不新增Linux适配或CI；新本机角色需空闲冷启，此会话保持host_windows且按用户要求不派代理。
- Windows首次新增VM连接用例缺normalizeMirrorScopePaths绑定，21/22，日志25d15b02-673c-4e54-af77-95061fd29da7、se-plan-chain-iKUjtl保留。精确对照legacy.ts从ProjectMirror的真实import后仅补同一导出上下文，未改产品/断言/20秒；修后整文件22/22、0skip、exit0、1414ms。当前文件SHA e5de5a2114240efa74fe4e558fc25891ae3a5f41dd1dbbd26e3cc308d6e01b58；日志f385e60c-6331-4ada-8d89-276cd9feb2a3，se-plan-chain-dVYqhK。新增测试输入变化，SE最终正式package仍需重验，不能把r35旧完整验收冒称新断言已在正式链执行。SFTP源码/验收输入未变，原完整68/419及确定包证据可复用。
- 实际实例是0.5.408/0.2.108、PID31820，且对应MultiModal workspaceStorage79f70296a24b94aafea78570864d1c47（既有exthost日志确认）；与待发409/109严格区分。
- 精确旧队列读取稳定，SHA228fd14a8c1655095c28a5a011ebdfaeb901d9f53e02f80869641d80a1a41cf7：10Plan/60Job，56completed、4unknown；完成者43synced、13partial。13类为1 MACHINE_STATE_PATH_PROTECTED、9 TRANSFER_STAGE_PENDING、3 summation foreign-only无可靠最新版；与此前已证修复范围一致，但当前旧版现场尚未采用修复。完整原文aa8e1fcf-851f-446b-a9a3-15d4cfd43d99及摘要badd91e0-92bd-4501-953f-2f7ea22d77dd，不用统计代替单项状态。
- 4unknown均nwpu3：summation index4/seed43，text_only index0/seed42、index1/seed43、index3/seed42。完整commandId与精确路径见3256eb60-2959-4947-8ba7-1e4f3c9a7166；该次队列SHA676b87045089127dfdc9015674613f01c3242eb11933f1fc1e95f4a8646c26c4，旧App仍在自行刷新，不将两快照说成同一输入。
- 对nwpu3只做一次agents.lifecycle inspect，running0.5.408，当前安装/状态根及UID1001确认，activeTasks空；8dc7bd8a-a751-40e8-8e93-4e9b422a4caa。当前配置05c7383f-5506-4514-8ec4-834941c37217确认10.70.50.180/qgking:22、项目/data/qgking/zlk/MultiModal；OpenSSH qgking.3解析不匹配被拒绝，eff152c5-7c7a-4d35-b18a-97a8fed44186保留。随后仅对当前配置已明确的字面端点做BatchMode/严格既有hostkey只读SSH，不改认证或别名。
- 只读SSH实际输出fb2ec9c1-87ed-449d-b8bb-410c5fa53822证明4个manifest/小CSV存在且CSV SHA匹配，但均是2026-10-18旧输出，simpleExperiment.runId四项全不匹配当前队列commandId，不能收为本轮完成证明。当前lifecycle已确认state根中的worker_task_snapshot.json及distributed_plan_queue.json按4个ID精确查询均无对应行（1253f875-a2aa-491e-b9c9-62e448ff204a，文件读取稳定）；这不证明历史目录从未执行，未扫描/迁移旧资产，也不据此重派或改写成功。
- 因此不能宣布“现场所有Plan已跑完”：4项缺本轮完成证据仍是明确未完成项，不以存在旧CSV绕过身份检查。新组合模拟证明正常多Plan逐Job自动同步链，不等于真实科研全量实跑。所有现场操作只有读取，没有同步/清理/启动任务/Worker升级/部署。若要重提4项或处理旧输出，必须先给具体影响/目标并另获授权；不得自动重放未知任务。

## 68. r36正式完整验收与确定包更新
- SE原生最终package完整234文件全部passed、13gate均exit0，新组合用例所在idleGpuDispatchLifecycle.integration.test.js在正式计划恰好一次（job138/22案），不是目标绿替代正式全量。run=2026-10-25T04-55-38-976Z-65500-package/run.json；完整宿主stdout530d3444-68b5-4ee3-afbb-037c3da65516，结果se-final-chain-JiaMXL/result.json，1650非生成输入前后完全稳定，完整耗时453210ms。
- 本次确定SE包SHA更新为1e43da8207df2b91e1725bcd73460f1a0a0280f29244f30e336f649ecffeb77b（2529449字节）。与§66前包实际342成员集合及每个内容完全相同，只有ZIP成员顺序/容器字节不同；Windows只读核实0870338e-7bcd-44bf-8095-042d980f17c3。前包及原SHA已保存se-final-chain-zYxC2x；新SHA清单已精确更新且旧清单独占保存在final-checksum-mEsF9L，8fad717f-e6b9-4da6-a2fc-eb72a1aae14c。后续只允许本段新确定SE包，不误用旧7c6f清单；SFTP仍为§66的5d20dfc27dacce6e97ba851c441cb2247bc2473205a645dd979e429f2a9fbac9。
- 正式启动前执行器曾误取env普通对象ComSpec而实际键是COMSPEC，走cmd入口报The syntax of the command is incorrect，未进入npm/编译/测试；b09c9661-6115-496f-b0d6-b4b111b7a348首败完整保留。只读查明同一Node24.18/npm11.16真实入口（ed032223-455d-46c2-98bd-275cf3d9ab13）后改Node直接调用同一npm-cli.js run package，项目命令、超时/覆盖/钩子未变，且没有活动验收重放。一次只读归档对比脚本误要求ZIP顺序一致的AssertionError也保留c82241d3-6ebd-4280-adc1-f57d2a69bb8c，未据此改产品/测试；原生按成员身份及实际内容核对正确。
- 正式验收后再次对照SE2071/SFTP146冻结输入：当前源树与通过验收Native树的源码/测试/脚本/依赖配置及所有生成物相同，仅归档计划/证据两Markdown不同。新加测试默认进入原有套件，不新建测试进程，不删旧案。无新产品源码差异需要再编译。
- 主控最终代码审核：原批准功能块及新增调度-同步连接处正常路径通过；当前没有已证代码必须返修项，可精确提交/PR。现场4unknown缺本轮可信事实和13旧版partial保持§67结论，不能宣称实际所有Plan已完成，不能通过改状态/收旧结果/重跑来掩盖；实际科研重提/输出处置不在本次自动交付授权内。Mac原生仍未验证。合并/发行/安装仍按原审核授权流程，不以本条冒充已发布或已安装。


## 69. r38 409现场回归：临时文件排除被误报为机器状态保护
- 当前实际版本 SE409/SFTP109，PID20924；精确当前日志 Code/logs/20261025T133446/window1/exthost/output_logging_20261025T133449/4-SimpleExperiment 操作日志.log，宿主脱敏完整快照 b04c36fd-4ba2-42b5-98db-f879d55c30f1。05:36:57Z summation job0 commandId7632e028c00ac590c54c75a5f77739db、05:37:53Z text_only job4 commandIdd1fc79a15a30db70f720b2ac1eafdfa1，均因 .job_metrics.csv.<hex>.pending 失败。它们不是此前4个unknown任务，不能混同。
- Windows最小复现使用完整既有Native树/现有fixture，真实CompletedJobSyncHost、真实merge和真实scope过滤；正式V1文件+来源pending文件、所有prefixes空。scopeInventoryPathAllowed=false但isUnderMachineStatePrefixes=false，报告所有目标机器状态保护，synced0/transfers0；断言预期1实际0，原进程exit1/无超时。完整日志 host-windows/b94b0404-cf1a-49da-bf78-9a78ff9f035c-{stdout,stderr}.log。
- 当前 SyncScopeStatus.ts 的一般过滤已排除 pending/writing/tmp/upload；legacy.ts 先用合并的一般过滤+映射过滤计算reachable，再不加区别地报机器状态保护，实际临时文件的源清单过滤位于更后方而未阻止误报。先在现有适用套件增加真实source临时文件与verifyOnly模式断言，不新增进程/不删旧断言。只复现了同步分类错误，不能由此证明或否定本轮job实际执行。
- 用户正在UI运行新unimix_ad计划，日志已到用户确认后隔离旧输出阶段；主控未发起、重复、取消或介入该操作。现场状态取证须绑定明确commandId与采集时刻，不将新旧运行混为一谈。

- 正式修复前红灯：Windows同现有 completedJobForeignSourceClassify.test.js（源码SHA9b43401a007085b7a9bf96df31923fb93cc7fa93ced8860aa032759fbfb1e3af），6项原用例通过、新r38用例失败，4种既有临时排除(pending/writing/tmp/upload)均误报机器保护；真实exit1、无skip/超时，完整日志3b50f630-79c7-4b75-86dd-5c5910c7d843。工具intent误写“原7项”，以真实原6+新1输出为准，不以固定数量作为门禁。
- 最小修复仅在artifactCopy的work项、计算endpoint reachable之前使用既有scopeInventoryPathAllowed(path,false,[])排除普通非产物；通用手动merge不改，后续真实冻结映射检查/两个禁止后缀正则/必要产物/SHA/guard unknown/双代staging均原样。未新增mtime规则、未更改job执行状态、未动远端。


## 70. r39 Worker误报与用户通知要求
- r38目标套件Windows7/7通过、exit0、skip0；新增场景增量同步与verifyOnly两模式均执行，完整日志1754ba9f-a7d5-4fce-a652-b6f46f9048b9；源legacy.ts SHA76db67cb19726cc6c9aa35d8ca8e9fadaa2abbdcc7a3afb1b5099495e47e704d。尚非最终候选或完整验收。
- 当前四Worker及Scheduler均409：实际本机SE409 live capabilities确认agents.lifecycle后，仅action inspect（无确认、零远端写）核nwpu3/nwpu2/nwpu5/jqg_zlk，全部runningVersion0.5.409。完整宿主日志d4686972-b44f-42e4-bc50-22116a0b8b3b。读到源码能力字段顶层/嵌套错位和假测试形状，既有旧Runtime提示不能据此解释为用户更新失败。
- 用户截图2f31c04a-d2bd-4e8b-9f69-04b647d2a9f0.png明确所指为VS Code原生Notifications中心（识别工作区/打开面板交互按钮）。不再按自建列表解释。
- 精确隔离账本只读元数据：globalStorage/simple-local.simple-experiment/se-plan-isolated-batches.json，version2、6批、14448字节、mtime2026-10-24T12:24:09.042Z、SHA1d109eb1a6da249dc47dee137af1c215793c22fc075d23924ffa7851b16d5534；前三项均MultiModal。完整日志5cc32a37-9143-4e53-9563-a155f92dd3e1。此为元数据，未据此断言坏结构或陈旧锁。

- r39修复前Windows可见提交套件：20通过、2项真实误报复现失败，另1项夹具版本不一致失败，exit1，完整日志c4fcf9c0-05cb-4840-9002-9bba3dd18044。新增真实cap.agentVersion后，原cache测试只改顶层agentVersion而不改cap.agentVersion；生产优先读后者（legacy planValidationCacheKey）已证明，执行一次机械自修：两个版本字段同步变更/恢复，保留全部cache身份差异断言，不改生产缓存语义。
- 生产误报最小修复：只在status=ok且有实际capabilities文档时，读取endpoints.sourceDecouple!==1决定旧语义；未知/失败探测不伪称旧runtime。部署、健康、源码proof、调度、确认链不改。顶层sourceDecouple不是已知telemetry协议，不添加为假测试兼容。


## 71. r40 原生交互通知与当前证据
- 能力块Windows23/23通过，exit0、skip0，真实Source能力嵌套与unknown分类/原cache全部身份断言保持；完整日志3a3b93d4-d6c6-496c-95c1-614b3bd90840。
- UI契约修复前红灯：既有jobTmuxLogNavigation 9项通过、用户变更契约的1项失败（期待1个native消息、实际0），exit1、skip0，完整日志0f893cec-7f14-40ea-b4b1-ab9d21291109；保留原窗口身份/不猜任务/计时器等断言，旧DOM浮条断言随用户明确要求改成native桥、无DOM/无自动消失计时器。
- 生产最小UI桥：showToast名保留以覆盖既有20处调用，实际仅post webviewNotice+当前document代际，Host白名单和API internal拒外部调用、代际拒旧文档；信息/警告/错误走原生通知+查看日志/打开面板，完整文本全量日志，既有5秒显示周期转为重复抑制，无新持久存储。runAllPlans原本已有全量原生终态，删除网页重复的480字截断；其它有用结果转Native桥不再截断。操作失败说明改非modal；真实确认及双确认未动。
- 账本真因：生产loadIsolatedBatchLedger读取该旧文件成功、6批；但其固定.lock存在为空的普通非链接文件，mtime2026-10-24T12:33:58.131Z。acquireLedgerLock源明确wx唯一所有权、EEXIST600ms后ISOLATED_BATCH_LEDGER_LOCKED，禁止自动摘遗留/未知身份锁。完整宿主只读日志7d0d18e2-f6e3-41ed-9ca8-a4b20ce4c657。未获取/清除锁、未改账本/隔离区，禁删准入保留；此项不是科研执行状态证据。

- 用户收紧范围后取消尚未实施的远端tick通知hook/新增进度投影；当前未改tick、任务生命周期、调度、产物身份、删除/覆盖确认或账本。计划r41为后续有效边界。三只读实例只写私有证据，未实施/测试/改Git；实现与原生验证均主控。最终候选补丁定为410，不覆盖409包/tag。

## 72. r41 410候选验收/中断证据（2026-10-25，文档维护块）

- 410三处已证修复：①临时非产物误报保护（r38方向）；②endpoints.sourceDecouple/unknown能力误判最小修复（r39方向）；③既有Webview通知转原生按钮通知+重复抑制（r40方向）。用户收紧边界保持：未加tick通知hook、未加新进度投影/轮询，账本/科研未动（承接§71取消声明）。
- 编译门禁：Pi diagnostics se410-compile-ZvOPbP/result.json+inputs.json —— 7编译门禁exit0、10输入冻结；编译run.json路径见 /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/host-windows/48891e37-d4ff-4d9d-8406-19389e42293b-stdout.log。
- 开发正式check:dev：D:/GitRepo/MCP/.win-se-delivery-scpfFp/simple_cluster/reports/test-workflow/2026-10-25T06-06-11-886Z-70284-check_dev/run.json exit0；12物理测试文件、22参数行，其中10文件重复展开为无参和 --test-force-exit --test-timeout 20000 两行——流程重复已留证，不把22当唯一覆盖，未改构建脚本扩范围。
- package planner物理路径审计：se410-final-D6d0BK/identity-audit.json —— 234行=234唯一物理路径、无重复；数量不作未来固定门禁。
- 首次410 package中断：cancelled=true、exit1，run.json/外层result缺失，停于job092附近；中断日志不作通过。完整只读恢复证据 se410-package-recovery-Q7xK3m/receipt.json。
- 用户已批准『同意移走保留锁，并重新验收』：原Windows负责人1dc056d6-09be-4717-ac93-882cd01fcc50接续，安全根 D:/GitRepo/MCP/.win-se-delivery-scpfFp/simple_cluster/ 内唯一 locks/simple-experiment/test-workflow/batch.lock → clean_dir/locks/simple-experiment/test-workflow/batch.lock 保留式移动，随后完整原生 npm run package。截至本节尚无最终通过、无410 VSIX、无发布/安装事实；Mac仍未实机验证。
- 剩余阶段（归Windows负责人/主控）：完整原生package重跑 → 最终候选完整验收 → 发布决策。
- 维护边界：本段后父不再写本文件；仅追加，旧证据与有效r41计划未重写。本块写入范围仅此文件，零运行源码/测试/版本/生成物写入、零Git写入。本worktree身份复核：HEAD a9fc3d36629eeeb6bb71b183d59731e209ccac5a、分支fix-ui-plan-gpu-progress-20261024、r38-r41未提交项在场。事实观察（未触碰）：原cwd主仓当前实际为 feat-multi-project-branches-20261025 @ a9fc3d36，与早期描述"detached b65"不符，交主控辨识。

## 73. r42 410正式package首败与resultSyncFailureVisibility测试契约返修（2026-10-25）

- 首败保留（不是通过）：D:/GitRepo/MCP/.win-se-delivery-scpfFp/simple_cluster/reports/test-workflow/2026-10-25T06-25-09-265Z-42260-package/run.json overall=failed/exit1；234唯一文件全跑、233 exit0，仅job214 exit1。job-214-resultSyncFailureVisibility.test.out.log：14 tests/13 pass/1 fail，test:155 在 :162 assert.equal(f.alerts[0][1].modal,true) 得 actual undefined。编译/前置全过、输入无漂移、自持锁正常释放、未assemble、无410 VSIX。
- 根因（父逐行核源，本侧复核）：r40 起 legacy.ts:6149-6154 catch failed 且无 resultSync、非 artifactNoticeKey 时按用户要求改非 modal showErrorMessage(`${action}未完成：${完整原因}`,"查看日志")，选"查看日志"才调 this.showOperationLogFromUi()；失败反馈非破坏性确认，真正删除/覆盖/运行范围/停止确认与双确认未动。测试旧 modal:true 预期失效。
- 返修（仅 test/features/resultSyncFailureVisibility.test.js，产品/其它测试/版本/生成物/Git 零写入）：fixture({errorChoice}) 忠实模拟 Native showErrorMessage Thenable（记录 args 后 resolve 选项或 undefined）；host 增最小可观察 showOperationLogFromUi 计数（不伪造被测 callback，按钮分支由产品真实 .then 驱动）；test:155 内循环两选择 case，断言：statuses 终态 failed、terminal 终态 failed 且 resultSync undefined（绝不转 partial 成功）、恰好 1 条原生 error、publication transaction failed 同现于消息与终态记录、slice(1) 深等于 ["查看日志"]（唯一按钮且无 modal/options 对象）、点击才调用日志宿主而 dismiss 不调用、warnings/information 均 0。其余 13 项断言/取消/partial/SHA/source 语义逐字未动。改后 SHA256 dce1b40166cd697cd5f26cd92604336164cd7592cdd7da9c3cdd7c52cae9817c，diff +28/-11。
- Linux 侧限制如实：本沙箱 dist/extension/legacy.js 为旧编译形（:6237 仍 modal+知道了），本套件本地运行无效且被禁；node --check 亦被 PI_NATIVE_PLATFORM_REQUIRED hook 拒绝（未执行，未重试等价工具）。验证唯一路径=父把该单文件同步入 .win-se-delivery-scpfFp Native 完整树（新编译 dist 为 6149-6154 新形），先跑 job214 目标回归，再最终完整 package（约9分钟，234 全量），不缓存跳过原 233 绿。Mac 仍未实机验证。

## 74. r43 最终 Windows package 全绿事实与生成物回拷（2026-10-25）

- 最终全绿（父核原始 run.json，本侧转录）：D:/GitRepo/MCP/.win-se-delivery-scpfFp/simple_cluster/reports/test-workflow/2026-10-25T06-38-05-260Z-68864-package run.json overall=passed、final=true；234行=234唯一身份全真实exit0；13 gates全0；inputFingerprint==endFingerprint；candidate.state=validated；packaged VSIX=0.5.410，SHA256 0bde3f45ebf24c1f72ad1e671a98f62ea97ac31936e5543b18ea2f69774eaedd，2529967字节。完整证据 /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/se410-package-final2-T5nQ2r/final-receipt.json。§73首败（42260）、此前取消、保留锁处置与Mac未实机验证事实均保留不变。
- 生成物回拷（r37 惯例复用，Linux node 身份，无 Git 写）：git ls-files dist 共421个已跟踪文件，与完整冻结 Native 同相对路径 sha 全量比对仅9个差异，全部对应本轮输入：legacy.js←legacy.ts(r38-42)；PanelHtml.legacy.js←PanelHtml.legacy.ts(r40)；RuntimeManifest.js/.json←RuntimeManifest.ts+版本410；panel-build-manifest.json←面板构建410；cluster_agent.py/cluster_scheduler.py 及各自 .sha256←版本烙入（内容级唯一差异=AGENT/RUNTIME/PLUGIN_VERSION 三行 0.5.409→0.5.410，字节数两侧一致，两侧 .sha256 各自自描述一致）。Native 编译输入归属证明：src/extension/legacy.ts、src/ui/PanelHtml.legacy.ts、src/runtime/RuntimeManifest.ts、package.json、package-lock.json、test/features/resultSyncFailureVisibility.test.js 六个关键输入 Native↔本worktree SHA 逐一相同；Native package.json=0.5.410。
- 回拷程序证：旧字节先存 .review-ui-plan-gpu-20261024/r43-dist-backup-precopy/（备份 sha 与拷前 worktree 逐一相等=BACKUP_VERIFIED）；cp Native→worktree 后 worktree 与 Native 9文件 SHA 逐一相等=COPYBACK_SHA_MATCH；status 由13 M变22 M（恰+9 dist），其余稳定测试/源码输入未动。maps 不在已跟踪惯例（421中0个 .map）故不回拷；dist/runtime/cluster_agent.py.patched 无差异未动；VSIX/node_modules/cache/reports/clean_dir/整个工作树均未拷回。

## 75. r46 A 块开工：所选 Job 等待生命周期红灯（2026-10-25）

- 契约（用户原话转录）："后台自己静默同步，不影响plan完成状态；真的同步报错再弹信息让我手动重试；任务清退立即结束对应排队请求，不打断其它复制、不放松保护；验证排队→清退→及时退出真实流程"。本轮目标新 patch 0.5.411（Latest 仍 0.5.410，不覆盖）；SFTP 109 本轮不改。
- 基线事实：host 证据（d8b799bf…stdout / 0fa880eb…stdout）GitHub master=origin/master=FETCH_HEAD=任务 HEAD=a3ea50a81d460597db0710cdd79eb79d3a510643，fetch-exit0、双向 rev-list 0/0；Linux 副本复核 HEAD/分支/worktree git-dir/common-dir 正确、tracked clean。准备阶段两处非零探测保留（git -C Linux 指针 rc=128、.git 目录按文件读 EISDIR rc=1），非产品失败。
- 红灯（本轮唯一改动 test/features/completedJobLatestSync.test.js，SHA256 605a6a2f1424be9a51545af0ae3e3d81adbd3bbd7aa56c6f7183ceee6a6fc337）：新用例两场景（清退/身份替换）——无关 Job1 复制挂住期间发目标 Job 的 retry+refresh 排队者，经生产纯函数 removeConfirmedDistributedPlan+复刻 save 成功尾提交，断言两等待者在放行前以 UiCommandCancelled 结束、目标零 SFTP 派发、零结果写入、无关复制完成且 SHA 一致、订阅释放。既有用例全部保留。当前 Host.run 无等待伴跑退出 ⇒ 预期红。
- 入口实测更正：该 suite 属 `test:latest-artifacts` 域而非 sync-gpu（sync-gpu 实际 5 文件清单见 .review r46 证据）；红灯 argv=`node scripts/test-workflow.js test:latest-artifacts -- --only completedJobLatestSync.test.js`（--only 按 test-workflow.js:258 精确文件匹配）。Linux 侧 `node --check` 被 PI_NATIVE_PLATFORM_REQUIRED hook 执行前拒绝=未执行，语法由 Native 首跑承担。
- 冻结输入闭包与实施设计（save 成功尾 observer、run 排队前资格一次+runCore 重验保留、race 取消不清他人 active、错误走既有 cancelled 通路）：.review-ui-plan-gpu-20261024/r46-a-block-evidence.md（§1.5/§2/§4）。
- r47 第二红（不重叠冻结 17 文件）：staleQueueRoundBehavior.test.js 追加集成用例（SHA256 4023b955d2cb1f38ad627c60c0a45aeec60a0deb5f2a58e29ba642b11279373b，域 test:local-dispatch，argv=`node scripts/test-workflow.js test:local-dispatch -- --only staleQueueRoundBehavior.test.js`）——真实 saveDistributedQueue/loadDistributedQueue/patchDistributedJob/mergeLatestWorkerVersions 方法体+真实落盘+真实文件 SHA 复制；断言围栏拒绝的保存不叫醒等待者、真实清退成功尾及时 UiCommandCancelled、清退=队列记录不删产物、无关复制完成证明落盘。observer 容器须 lazy-init（vm 提取无字段初始化阶段）。B 实施与回归闭包计划同见 .review §5。
- r48 A+B 生产实施完成（绿灯前冻结）：取消类迁 `src/core/UiCommandCancelled.ts`（legacy instanceof 判定不变，Host 抛真实类型 code=SELECTED_JOB_CLEARED）；save 成功尾锁外同步通知 observer；run 排队前置资格一次+等待 race（清退/替换/current 失效即取消，不清他人 active）；finishOperationProgressNotice 增最小 silent（仅 A 清退，session/日志照旧，普通取消 warning 保留）；B=自动轮真实失败经 showNativePanelMessage 同签名恰一次+外层 diagnostics 类型化去重，手动不重复、正常静默、30s 自动恢复与同代 reconcile 保留。首败修复：夹具 projectId 作用域笔误、忠实生产取消类型、真实 verifiedCompletion 完成证明（clearNativeProjection 保守归一已证）、active 首败捕获+load 资格快照断言。lazy-init 强制契约按父令撤销。全量 SHA/绿灯批次（@compile 门禁+三域 --only 一次去重）见 .review §6。idleGpuDispatch 完成态分离用例因 fire-and-forget reject 形态未核留待父裁定，未动该套件。本阶段块≠交付完成。
- r49 三缺口返修（Linux 侧源码/夹具完成，Native 批次验证）：①Host.run 等待重构——abort 拒绝通路先接、观察者+projectContextAbortController 信号（已 aborted 亦处理）全订阅后立即 wake(self) 基于已提交快照与上下文复核一次，工作区切换保留真实取消原因不谎称清退，finally 拆全部订阅，空选择请求时本地拒绝不无界排队；A suite 增两竞态用例（载入/提交竞态窗口丢唤醒、上下文中止 during/before）+空选择用例。②B 通知复核分流——复核读不到队列=未知而非已证清退，通知照发并附"队列复核暂不可用：<原因>"；在途已证替换静默断言补齐（completedJobLatestSync nativeNotes=0）。③idleGpuDispatch 完成态分离用例落地——真实 tick+生产 scheduleDistributedPostprocess（delete no-op 与 G4 同配方）+可控 pending 同步体，释放 await 生产 distributedPostprocessPromise reject，断言完成态不受后台失败改写、diagnostics/恰一条原生通知分离。迁类影响闭包（编译产物 UiCommandCancelled_1）：静态扫描 legacy.ts 73 个类使用成员×69 个 dist 消费文件→15 候选，7 个纯文本断言不改，5 个执行切片夹具已修（completedJobArtifactRootBinding/planSubmissionStateGuard 改为真实 core 模块断言+裸别名；distributedQueueCacheStability/resultSyncFailureVisibility 注 UiCommandCancelled_1；stopRoutingAndResultParseDedup 注裸类）。版本 0.5.411 已烙入 package.json/package-lock.json/RuntimeManifest.ts。Linux 验证门变更：pi-test-evidence 现对 /repos 一律 PI_NATIVE_PLATFORM_REQUIRED（含批次执行器 prepare），本轮 tsc/suite 全部交 Native 冻结批次执行，Linux 未执行任何产品验证（语法仅 vm.Script/ts 解析级自检）。三源码 diff：.review-ui-plan-gpu-20261024/r49-source-diff.patch。冻结 SHA256：Host=d8e3c8f2c03133aba048618d2257b6e458d1260fb2632a94d0dbd9da2acde100、legacy=e92914ee2863a69a9c04d9968f4cc0e33cdb8e295be9b32b985a3cde0ade5fff、core/UiCommandCancelled=b79acdbdd1534dbdf88ebd6ed12d8d32e0fbb54dff1bccb113718754ad5fdad7、RuntimeManifest=a525cef4c2334ec9a42cb9bf977ed40a847f72fb59e308694dc72f28f981d49f、package.json=70535345b30d9c79d0fac23210e71e7942152905f3b414535a3706b214169eea、package-lock=5bd6a2a15f96bf6e1248979019cfb348b5ca67664c1e50be7baf0101cb457128、completedJobLatestSync=2c0a8396ef952027001b786089d88f0020938b0fbafa39d64be998cbdcbda12b、resultSyncFailureVisibility=61a248bf9e4a99f3361c6842606591a999a64e0b2355a7408c4299898411c555、idleGpuDispatchLifecycle=3e2e6bf2f7ff42b370425b6e4e66b3e84b9ec5657c6eb374dfd6e55f690b6485、completedJobArtifactRootBinding=489e631f243c9a43c3e7efac3d8bd8d4e3eebe0703713c66faa8efa6f01d9f6e、planSubmissionStateGuard=8af9f6db7d01085692543a454f252a813095d885d02fc9c8b37e4f0a283dfe53、distributedQueueCacheStability=7e26426aa634400d82746d57a73c0796407d4dac3ae6b8a0667811ef46a4277a、stopRoutingAndResultParseDedup=af350296765ac826cca61831b9a71b6eb0f39b21fa247780b37c309d3b59aa21、staleQueueRoundBehavior=25fa83499e3553a6059111dd7e73ad7f2cb6f17208af119f12b0c9ee7cc340a2。本阶段块≠交付完成。
- r50 三红返修+已证源码守卫（同 Owner 连续返修，原断言全保留）：①completedJobLatestSync 空选择用例无关轮缺 job1 来源致如实 partial——抽 giveJob1Source helper（与清退用例同配方三件套）用于三个新用例，空选择补无关复制 synced/commandId 不变/零通知/零错误断言。②idleGpu 完成态分离用例改用 :170 已证配方 own(0,'running')+publish(0,'completed')+job1 running，真实完成事件→newTerminal→生产 schedule；无手动冒充触发。③staleQueueRoundBehavior：hostMethods 基础 VM 注真实 src/core UiCommandCancelled 生产类（instanceof 忠实），queueFixture 补 showNativePanelMessage 记录 notes，:143 用例补真实失败第一次恰一条通知（完整原因+Job 行指引）、同原因持续失败不刷屏、成功复位后同原因再通知（去重随诊断复位失效）。④已证源码分支（父核证 r49-source-diff）：scheduleDistributedPostprocess 外层失败 callback 发通知前加既有 projectContextIsCurrent(context)/panelDisposed 守卫（与 finally 同款），旧轮 stale 失败不再弹进切换后新项目面板；诊断/完成状态/无关 copy 不变；idleGpu 新增 stale-context 用例（pending 中切换→释放拒绝→通知 0、diagnostics 照留、promise 清空）。r50 SHA256：legacy=0e6ea0e46530579a3c247b32625fd771f8aa12938dadbf0cd42c6ba363ac8586（schedule 守卫，其余同 r49）、Host 不变 d8e3c8f2、completedJobLatestSync=5405be46c07e6d053ce676fb37b6e8fc37ea4274d9be40bfe9241965ac75742a、idleGpuDispatchLifecycle=f50c71373d8d399908f04fbd930fed5eae3fa1c964888afe8a1f9a3add92f4a0、staleQueueRoundBehavior=73ad9493e5ad2d8ca9da48ff7989ce98639f1c0ec319d8e5a307858bde6b21ab、distributedQueueCacheStability 文件不变 7e26426a（但 schedule 切片文本随 legacy 变更，Native 需增量复验）。Native 增量建议：compile→completedJobLatestSync/idleGpuDispatchLifecycle/staleQueueRoundBehavior 三域 --only + distributedQueueCacheStability（schedule 切片受影响）；五个已绿且不含 schedule 切片的套件文件与依赖未变。diff：.review r50-source-diff.patch。本阶段块≠交付完成。
- r51 两旧夹具最小修正（仅测试，生产/脚本/配置/manifest/依赖/411 全冻结；r50 生产六文件 SHA 复核零漂移：legacy=0e6ea0e4、Host=d8e3c8f2、core=b79acdbd、RuntimeManifest=a525cef4、package=70535345、lock=5bd6a2a1）：①completedPlanWorkerMirror.test.js——sandbox 注入真实生产取消类（require dist/core/UiCommandCancelled.js，与其余 dist 依赖一致，非造假 name 类）；Object.assign 补 showNativePanelMessage 记录 nativeNotes（非 no-op）；新增用例核当前 scope 真实冲突故障恰一次原生通知（完整原因+Job 行指引）、在途 generation 前进后旧轮失败对新 scope 零通知、诊断照留；12 例既有冲突/来源/锁/旧 attempt 零覆盖断言全保留。②planOperationNoticeLifecycle.test.js——四处切片锚点（:46/:47/:253/:254）由旧三参数完整签名改为行首四空格方法名前缀 'finishOperationProgressNotice('（method 工具自带 4 空格行首锚，dist 定义行唯一 grep -c=1，调用点均带 this. 不误命中；17 项通知生命周期断言全保留）。定向排查：旧签名锚点全 test/ 仅此文件 4 处命中，无其它套件需同因修。新 SHA256：completedPlanWorkerMirror=1fa61b3a8a3496f1fc4af73ee257a9c235b939f02df37eeb6cf9209fff4d61db、planOperationNoticeLifecycle=c66e08606d852cb0bd0a0c8bce57fb7533e1fafc0d8788b2df5afdd2a62298a0。官方 manifest 域（scripts/test-workflow.json）：completedPlanWorkerMirror→domains.build、planOperationNoticeLifecycle→domains.test:plan-run；精确域复验 argv=`node scripts/test-workflow.js build -- --only completedPlanWorkerMirror.test.js`、`node scripts/test-workflow.js test:plan-run -- --only planOperationNoticeLifecycle.test.js`（--only 语义 test-workflow.js:258 精确文件匹配，r46 已证）。两套全绿后按规定完整 `npm run package` 一次（不先单独 check:full，上轮 232 绿不替代本轮 full，不改超时）。本阶段块≠交付完成，等原生结果与 GPT 实际候选审核。
- r52 最终 Native 完整 package 成功（父离线核 run.json）：234 jobs 全 passed、13 gates 全 exit0/无 timeout/tree confirmed；input 指纹=end=a737bcdfe684ac892ff5670179b28fa96ec4faeb70208a57603a608cb82490ef；run 日志 /host/d/GitRepo/MCP/.win-se-delivery-scpfFp/simple_cluster/reports/test-workflow/2026-10-25T10-36-33-162Z-45376-package/run.json（旧红 2026-10-25T10-14-10-680Z-47440-package 及前序日志全部保留）。正式资产 simple-experiment-0.5.411.vsix 2,534,338B SHA256=84e1fce0f6c4d1416d2f30292b4218fc6e6313e42bd4604ed024903c1ae1ce18（包 SHA，非 Git 候选 SHA；尚无提交/PR/发布/安装）。
- 入口订正补记（文档订正，不改 manifest）：completedPlanWorkerMirror 精确域复验的现有官方入口为 `check:dev --domains build --only completedPlanWorkerMirror.test.js`；此前 `build` FINAL 拒绝与双 test argv ABORT 记录保留有效。
- 候选封装（Linux 写、Native 只读复用）：tracked dist 421 文件逐路径 SHA 对齐——差异恰 9（extension/CompletedJobSyncHost.js、extension/legacy.js、panel-build-manifest.json、runtime/RuntimeManifest.js/.json、runtime/cluster_agent.py(+.sha256)、runtime/cluster_scheduler.py(+.sha256)）+ Native 新增未 tracked 1（dist/core/UiCommandCancelled.js），其余 412 tracked dist 逐字节一致、missingInNative=0、无整仓/换行漂移；411 烙入在 RuntimeManifest.json/panel-build-manifest.json 内核对存在。回拷后 10/10 路径 SHA 与 Native 一致（回拷内容不变，不触发重测）。Native 绑定 SHA：CompletedJobSyncHost.js=5660d250、legacy.js=f6ed3604、panel-build-manifest=74ffde2e、RuntimeManifest.js=eec2bf77/.json=98cb00d0、cluster_agent.py=5e0d1b45(.sha256 dc9dc27b)、cluster_scheduler.py=264704fb(.sha256 3241da4f)、core/UiCommandCancelled.js=c2060567。
- r53 通知去重上下文隔离返修（父审核 r53-main-review-blocked.json，唯一阻塞项；52e/84e1fce0 保留为已验旧证据不覆盖）：当前故障轨迹=错误回调先写 diagnostics{failed,reason} 再经 current/disposed 守卫 return（旧轮不提示），新项目同 reason 首败命中 `previousStatus.reason===reason` 全局去重被静默抑制（字段全文件仅 5 处引用、无项目切换复位）。修复边界内实现：noticeScope=JSON.stringify([捕获 context.root,context.generation])（仅标量，不存 signal/client）；仅 current 且非 UiCommandCancelled/STALE/REQUEST_REPLACED、确实调用 showNativePanelMessage 的分支登记 key；诊断重建时同 reason 延续 notifiedScopes 列表（含被抑制轮，第三轮同 scope 不再弹）；ready 复位新建对象自然丢弃列表；consecutiveFailures/diagnostics/完成态分离/force/取消过滤全保留，无新状态机/Map/timer。旧码反证理由：旧实现两场景（A 未提示、A 已提示）下 B 首条同 reason 失败均被全局 reason 匹配吞掉→新断言 "B 首错恰 1" 必红，Native 阶段1 用旧生产 0e6ea0e4+新测试跑 idleGpu suite 留真实红（测试从 src 抽 legacy AST，测试文件即换即红，无需新文件/进程）。回归扩展=原 idleGpu stale-context 用例改写为 {root,generation} 事实驱动双场景矩阵（aNoticedBeforeSwitch=false 保留原 r50 全部断言：旧轮 0 提示/诊断留/promise 清空；true 场景先真实提示 1 条），断言链 A pending→切 B(generation 前进)→B 首同 reason 恰 1→B 同 scope 连续再两失败总和不追加且 key 保留→ready 复位→同错再提示 +1。r53 SHA256：legacy=05a8478769d03c0c8c7ed0369373c4566861423c9957668e2bbe23775c14d845、idleGpuDispatchLifecycle=425e9bcab6a4d0c9958f166e3abb75e506abeda84016f1030bf582431da7d2d3；其余生产/测试/版本/manifest/runner/预算冻结（Host=d8e3c8f2、core=b79acdbd、三版本件 70535345/5bd6a2a1/a525cef4 不变）。Linux 自检仅解析级：ts.createSourceFile parseDiagnostics=0（legacy.ts 与测试文件）、transpile 0 诊断；`node --check` 被 PI_NATIVE_PLATFORM_REQUIRED 执行前拒绝=未执行，产品验证全部 Native。受影响闭包（实际抽 schedule 回调切片的套件，同 r50 已证集合）：idleGpuDispatchLifecycle→`node scripts/test-workflow.js test:rerun-scheduler-contract -- --only idleGpuDispatchLifecycle.integration.test.js`、completedPlanWorkerMirror→`check:dev --domains build --only completedPlanWorkerMirror.test.js`（dist 依赖）、staleQueueRoundBehavior→`node scripts/test-workflow.js test:local-dispatch -- --only staleQueueRoundBehavior.test.js`（同原因去重断言用同 scope fixture，与新语义兼容：同 scope 重试仍抑制、复位后再提示）、distributedQueueCacheStability→test:terminal-history 域 --only。顺序：阶段1 旧树仅同步新 idleGpu 测试→该 suite 必红留证；阶段2 同步新 legacy→官方缓存编译→上述定向复验全绿→完整 `npm run package` 一次。patch=.review r53-source-test-diff.patch（113 行，仅 2 文件）。本阶段块≠交付完成。
- r53 Native 整阶段真实结果（原批次，首败保留不覆盖）：阶段1 旧生产 0e6ea0e4+新 idleGpu 测试真实红=唯一新增 case actual 0 / expected 1（24 cases：23 pass / 1 fail），证实旧全局 reason 去重压掉 B scope 首条真提示；阶段2 新码 05a84787 经原 7 compile 门禁+4 目标套件（test:rerun-scheduler-contract/build/test:local-dispatch/test:terminal-history --only）全绿；最终 package 批次 2026-10-25T12-37-10-032Z-33640-package：234/234 jobs passed、13/13 gates exit0、inputs 无漂移、自然退出/锁释放。完整原文=/host/d/GitRepo/MCP/.win-se-delivery-scpfFp/simple_cluster/reports/test-workflow/2026-10-25T12-37-10-032Z-33640-package/run.json；审计=/host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/se410-r46a-red-Z3mD8k/r53-package-audit-2026-10-25T12-46-38-425Z.json。新 411 VSIX=2534845B SHA256=c7d737093abcb8b9a7c7d402821af5a1184a9b9a627ed8f6efc52667763dc53f（资产 SHA，非 Git SHA）；旧 84e1fce0 未发布 411 包已按原 Native 复制备份保留，409/410/52e 历史与全部失败日志不动。Native 有效输入复核=legacy 05a84787、idleGpu 425e9bca、Host d8e3c8f2、core b79acdbd、三版本件 70535345/5bd6a2a1/a525cef4 全部 SRC=NATIVE 零漂移。Linux 收尾回拷（本端写、逐路径 SHA 实证）：422 tracked dist 逐路径哈希 Native 对比差异恰 2——dist/extension/legacy.js→42ad98ceabc8769c68a3027ef7fbab5eab04cbc0c483e1a565275f83b9aa9920、dist/panel-build-manifest.json→ab7384e5ca1219ece64eda20d2d0228dcb66034b150896b9364e5fb67404ad6a，其余 420 逐字节一致；回拷后复验 422/422 对齐 0 差异，无新增未登记生成物、未复制缓存/VSIX/临时证据、未动未跟踪与 .git 指针。本阶段块≠交付完成，候选待父最终增量审核绑定新 Git SHA+包 c7d 后由原 host 连续交付。
- SE-412 整合轮（用户裁定：并入最新 master a76=PR#14 0.5.411 已发，本修复顺延 0.5.412，不覆盖 411；两读者片段 A/B 父已亲读）。父 GPT 实际本地三方整合：`git merge --no-commit --no-ff a76cd635306231981df4cd46798cd0317ce629ea` 真实 exit1，唯一 UU=src/extension/legacy.ts，其余含 idleGpu 测试全部自动并集入索引；MERGE_HEAD=a76、HEAD=8fce79bf 保持，未 commit/未推。完整日志 /host/d/OpenChamber-AgentConfig/Pi/host-sandbox/diagnostics/linux-bash/beec686a-de0a-440c-b3b7-0e43a7aa87ce.log。只读 A/B 片段：/repos/.se412-code-wpy9ob1e/fragment.md、/repos/.se412-checks-v3tk7oyf/fragment.md。
- 冲突融合（本 Owner，两段同在 saveDistributedQueue，父已读原文）：头段=上游 unifiedDomain.blocked 锁前围栏+`const unifiedEngage=options.dispatchAdmission===true` 完整保留，接我方 `const work=…then(async()=>{const committed=await this.withQueueWriteResource(root,async()=>{` 包裹；尾段=上游 `return dispatchReceipt; }, unifiedEngage?{unifiedDispatch:true}:{});` 结束回调+我方 cache 发布后 observer 循环+`return committed;`+then 收束；方法尾 `return await work;` 取上游（receipt 接口扩展）。上游 a76 withQueueWriteResource 三参统一资源全程覆盖、computeUnifiedDispatchAdmission 事务、trace/trustedTerminalProof 零删减；我方 UiCommandCancelled core 迁移、SELECTED_JOB_CLEARED 静默、notice 按 root+generation scope 去重、Host、observer 全保留；队列纯函数取上游（自动并集）。融合后 marker 残留 0、ts parseDiagnostics=0、transpile 0 诊断；上游两 AST harness 全部 21 提取成员名+我方扩展名齐备（syncCompletedPlanArtifacts 为 private async 形态实存 :13016）。
- 412 版本三源声明：package.json#version、package-lock 根+packages[""]、RuntimeManifest CURRENT_RUNTIME_VERSION=0.5.412；lock 相对 merge 索引恰两行版本元数据、140 依赖条目零变化、JSON parse OK；未手改任何 dist/py 派生版本（Windows compile 门再生）；已发布 411 与本轮旧 c7d 包/409/410 历史全保留。
- 组合接口回归（扩既有 staleQueueRoundBehavior.test.js，无新文件/进程）：queueFixture 加向后兼容参数（globals/names）；新用例断言 a) 无 admission 保存返回值 undefined、仅队列 file 资源、成功尾 observer 恰一次（旧语义逐项不变）；b) 域未成立 receipt 仍 undefined、双资源（项目队列+真实 unifiedDispatchResource(discovery)）同一临界区持有、真实事务进入；c) 域成立 computeUnifiedDispatchAdmission 回执经 committed 结构原样传出（旧包裹吞返回值即红——合并关键点反证）；d) STALE 锁内拒绝与 blocked 域锁前拒绝均零叫醒、盘上字节逐字节不变、统一资源覆盖拒绝路径。UnifiedDispatchAdmission 注真实生产模块，lease 用记录 stub（两进程互斥归上游 unifiedDispatchAdmission 套件，不重复）。JS parse 0 诊断。
- Linux 自检止于解析级（node --check/planner 曾被 hook 执行前拒绝，不再尝试）；产品验证全部原生。受影响域（合并后 scripts/test-workflow.json 实解析，a76 extraFiles 登记采用、不设历史总数门禁）：test:rerun-scheduler-contract（idle/dispatchWake 同域另含 distributedQueueStartupMirrors/Recovery/distributedPlanExecutionMode/prequeueRecallLifecycle/workerCodeVersionIsolation）、test:local-dispatch（staleQueueRoundBehavior/dispatchWake）、build --only completedPlanWorkerMirror（check:dev 入口）、test:terminal-history（distributedQueueCacheStability/planStopClear）、test:plan-run（panelMessageDispatch/planSubmissionVisiblePreflight/planOperationNoticeLifecycle/stopRoutingAndResultParseDedup/planSubmissionStateGuard/workerPreparationPipeline）、test:latest-artifacts（completedJobLatestSync/completedJobArtifactRootBinding）、test:submission-truth（currentSubmissionTruth）、test:sync-gpu（resultSyncFailureVisibility）、test:worker-mode（manualJobDispatch）、test:preflight-stages（preflightDispatchRejection）、test:mac-parity/test:windows-flow（localApi）；branchProjectRegistry/unifiedDispatchAdmission 经 a76 final extraFiles+glob 覆盖；webviewCommandWhitelistConsistency/formalIdentityContract 由 glob 域+全量覆盖。save/withQueueWriteResource 体被真实提取的其余套件（planStopClear/planBatchDispatchFirst/serverQueueDispatch 等）与上游 12 法身 harness 由 compile 门+AST 自证+全量 package 兜底。顺序：Native 官方缓存 compile（含 @compile gates+py 版本派生）→ 上述域 `node scripts/test-workflow.js <域> -- --only <file>` 一次去重定向 → 全绿后 `npm run package` 全量一次（prereq=prepare-wsl-tests，不先 check:full 再重复）；Native 树择树/win2 缓存复用/新 win3+名相交检查归原 host 按 B 片段 §7 决定。Git 写入（含冲突解决 add 与最终合并 commit）归父 GPT；本端未 add/commit。
- SE-412 最终 Native 绑定（短记录，全部明细与逐 SHA 清单在 .review/se412-final-* 私有材料）：定向 31 jobs 全绿（11 官方入口去重）；package 批次 2026-10-25T13-32-41-634Z-61960-package 237 jobs 全 passed、13/13 gates exit0、input=end=cdb6eedb…、自然退出锁释放；412 包 2620563B SHA256=684d2ca16e8d12d0e677a827de323c2b1c6f4fdce53a38ed6a9c999e80c3b81c（资产 SHA）。回拷=tracked dist 修改 16 + dist/project 新增 7，回拷后 422/422 tracked 逐路径 0 差异、关键输入 SRC=NATIVE 全匹配；旧 409/410/411(c7d)/84e 原字节保留。本段仅 docs/（不在 runner inputFingerprint 闭包 scripts/test-workflow.js:306-311，无测试消费），不改任何产品输入。Git 整合（add 清单见私有 staging-list、最终 merge commit）归父 GPT。本阶段块≠交付完成。
