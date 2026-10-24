# plan-run-single-batch 证据（证据阶段，未改任何运行代码）

## 范围与保护
- 基线 origin/master 冻结 b65d9b36d8795fd9695459d581c2f7f627df6232；worktree /repos/MCP/zlk-cluster-orchestrator-plan-run-failure-20261024，分支 fix-plan-run-single-batch-20261024（扁平命名，root-owned fix/ 命名空间被绕开，见 /tmp/plan-state-guard-logs/planrun-worktree-add-1.log 失败255与 planrun-selfcleanup-1.log）。
- 非目标：不补丁、不测速、不修 CLI、不查科研/远端、不追 401 面板旧错误、不读 9 万行 operations 原文（用 focused-plan-failure.json 快照）。

## 故障事实（宿主快照 e=/host/c/Users/ZLK/AppData/Local/Temp/plan-run-diagnosis-P3E2p8/）
- operationId=plan-submit-selected-plan-5601f774-7f35-4fc1-a87b-5a470cab48c8，status=failed，message/error 精确 `planFile is not defined`。
- qmf.yaml validateMs=3249 / validateTerminalWaitMs=3179；enqueue/workerSnapshot/gpuSnapshot/dispatch/clickToEnqueue 全 0；pendingRemoteOperationId=validate-plan-1792830145523-5d3g50；planRevision 空 ⇒ 错误窗口=**校验终态之后、入队之前**。
- 失败发生在 08:22（405/107 在位期间）；08:42 重载后当前 406/108（runningBuildId=diskBuildId=c73dcc94…，doctor exit0）。不能声称 406 已复现，也不能排除。
- 单选与多选批量都失败 ⇒ 共同提交路径。

## 调用链（b65，文件 sha256）
- 批量入口 SelectedPlanBatchHost.ts(sha 8ba79834…)：runSelectedPlans L10-14 → runPlanBatch L21；L56-57 生成 clientActionId="selected-plan-"+uuid（=失败 operationId 的字面来源）；L80 `host.runActionCommand("runPlan", message)`；L85-93 catch 把 error.message 原样写进行级 failed（=宿主看到的裸文案，无“校验失败”前缀）。
- 单选入口 legacy.ts(sha c966021a…)：面板 runPlan → 确认链同样进 runActionCommand；恢复分支 L7060-7080 同样汇合；L5809 selectionOnly/planFiles 分流批量。
- 汇合：runActionCommand L6184 → runActionCommandLeased L6200/6201 → runActionCommandCore L6315（actionCommandMap L677）→ **L6473 finishDistributedPlanSubmission（L10892）**；timing 记录点：preflight validate L6854-6878、enqueueMs L11917、workerSnapshotMs L12238、gpuSnapshotMs L12338。快照显示 snapshot/enqueue 计时全 0 ⇒ 失败在 10892→11917 前置段或进入前的 core 段。
- ledger 锁释放子进程脚本（PlanIsolatedBatchLedger.ts sha 0f0bfafb…，L141 `-e` releaseScript）为静态串，无 planFile。

## 排除矩阵（Linux，全部只读源码/临时副本）
1. 字面串 `"planFile is not defined"` 与 `is not defined`：src、dist/runtime 全库 grep **0 命中**（非显式抛出文案）。
2. TS 全量语义：legacy.ts 首行 **@ts-nocheck**（编译不查此类文件）→ 临时副本删 nocheck 后 `tsc -p .`：4522 诊断中 **TS2304 唯一一条为 legacy.ts:22531 `MultiEndpointRealtimeClient`（类型位置，运行期擦除，无关）**；无任何 `Cannot find name 'planFile'`（/tmp/plan-state-guard-logs/planrun-tsc-nocheck-1.log，exit2=既有噪音）。b65 源码不存在静态自由 planFile。
3. dist 陈旧性：临时副本重编译与 tracked dist **逐字节一致**（extension/legacy.js 8775a82a4d6c5133a032acd2b4860a2160dd868bf8687e8186e0869dfcd90a1d；SelectedPlanBatchHost.js 18d5c66d79725c0aac5251678a981a34bd2c0073bbca41855e1f1436e6b3582e；extension.js 63ddfdbd…）⇒ 仓库 dist==fresh compile，无“脏缓存编译产物”混入仓库。
4. 动态求值面：src 内 new Function 仅 MatrixGenerator 三处且 try/catch 吞错；无 vm/eval/插值脚本含 planFile。
5. Ambient `declare planFile`：无。

## 缺陷定位（GPT 精读反证后确立；上文排除矩阵保留原文，其中"b65 不可能 ReferenceError/优先安装污染"推论已被反证：只筛 TS2304 漏了对象简写的 TS18004）

缺陷=finishDistributedPlanSubmission 内两处**对象属性简写**在函数作用域无 planFile 绑定（原 tsc 日志 /tmp/plan-state-guard-logs/planrun-tsc-nocheck-1.log:1563/1565 TS18004；全库 TS18004 恰此 2 条）：

```ts
// legacy.ts 10996-10998（缺陷1，外层 catch 原样 rethrow → 批量行级 failed 裸文案 = 宿主所见）
if (batch && body.existingOutputCount && ["rerun_all", "rerun_missing"].includes(body.existingOutputChoice)) {
    this.planIsolatedReplacementsLocal ||= new Map();
    this.planIsolatedReplacementsLocal.set(operationId, { planFile, count: body.existingOutputCount });   // ← planFile 无绑定
```
```ts
// legacy.ts 11004-11008（缺陷2，11008 catch{} 吞错——断言必须读真实账本）
    if (isolatedBatchInfo && isolatedLedgerFile) {
    try { await attachIsolatedCleanup(isolatedLedgerFile, isolatedBatchInfo, { submissionOperationId: operationId,
        planFile, revision: body.planRevision || "", ... }); }                                        // ← 同样无绑定，被吞
    catch { /* 账本写入失败：… */ }
```

**canonical 值来源（修复取值已证同源）**：actionBody(legacy.ts:15596)→actionPlanTarget(15688-15699) `planFile=messagePlanFile||…`→body.planFile；批量消息由 SelectedPlanBatchHost.ts:56 携带 cleanupRelative 后的 canonical 相对路径，与 freezeBatchScope/markPlanTerminal 使用的 files[i] 同源同值（PlanSubmissionBatch.verify L60-64 也以 body.planFile 为键比对 revision）。单选 UI 与多选批量都经 runSelectedPlans（operationId 前缀 plan-submit-selected-plan-* 只产于批量入口 L56-57，宿主失败记录本身即 UI payload 证据）；恢复路(7075)无 submissionBatchLocal，`if(batch&&…)` 整块跳过。

## 红线/绿灯（同套新回归 test/features/planRunSharedSubmission.test.js，5 用例）
- RED（未打补丁源码）：exit 1，恰 2 条缺陷路（多选双 Plan、单选 UI 路）行级 message 逐字 `planFile is not defined`；控制组 keep_existing/无旧产物/恢复路绿 ⇒ 失败域=隔离块。/tmp/pi-test-0bu8h572/000.raw.log（首轮 /tmp/pi-test-cnopqa77 混有本夹具缺桩噪音，如实保留）。
- GREEN（补丁后）：5/5 exit 0，/tmp/pi-test-erybfqmy/000.raw.log——map 写入按 operationId 各记本 Plan canonical 路径+count；账本 cleanup 挂接 token/targets/revision(文件实算 sha)/codeFingerprint 逐项断言（覆盖第二处吞错面）；enqueue 抵达且身份不串。
- 受影响既有套（反查 10 文件）：82/82 exit 0，/tmp/pi-test-gifhsn2n/000.raw.log。注：既有 planBatchPhysicalPipeline 等真实链此前也过=测试盲区（未触达 finish 的隔离块），新套为首个真实触达该块的夹具。
- 夹具真实面：runSelectedPlans/PlanSubmissionBatch/PlanIsolatedBatchLedger/WorkflowWorkspaceBinding/DistributedPlanQueue 真实模块+legacy 方法体转译（既有 extractMethodBody 同法）；桩仅远端提交/预检确认/恢复存储/conda 检查/工作区根。
（本节当时误判：排除只筛 TS2304，漏了对象简写 TS18004；真实缺陷见下节。宿主哈希比对/DevTools 抓栈请求全部作废，不再执行。）

## 现行停止条件（GPT 当前批准阶段）
最小补丁已通过 high 审核（两处显式 body.planFile）；现行为：版本 0.5.407 同步→纯编译/生成→权威清单发现核验→精确 stage/commit 冻结候选→交主控 Windows 全量。不远程、不打包、不发行、不安装、不再建实现副本；本块不跑含全量的 build/package。

## 过程更正（如实）
407 阶段上一轮汇报曾把未执行落盘的版本/登记/编译描述为进行中——实际当时仅文档更新持久化；本轮已逐项真实执行并留证（版本落盘 grep、manifest 单行 diff、compile exit0 门日志、dry-run 219）。该失误为本会话汇报纪律问题，非代码/测试问题；RED/GREEN/82 套证据不受影响。

## Windows 407 全量 package（第一轮冻结 34b66f32）与本项返修
- 原生 runner receipt：/repos/MCP/zlk-planrun407-win/simple_cluster/reports/test-workflow/2026-10-24T09-19-08-573Z-69372-package/run.json；exit 1，448595ms（≈7.5 分钟；本文件早前"数小时级"估时作废=未知/实测约 7.5 分）。
- 结果：218/219 通过；唯一失败 job-219 testWorkflowRunner.test.js（本 runner 数量契约断言未随登记同步，非新缺陷——Linux 侧 5/26 断言组过期）。2052 源输入零漂移；419 生成物与 Linux 逐字节一致；新测试 planRunSharedSubmission 在 Windows 已真实 pass；未组装/未发行。
- 返修（GPT 批准最小测试维护）：同测试内整组计数一次同步 218→219（jobs/dedup/independent+exclusive）、build 208→209、test/test:features 基座 208→209，并新增 package/build/check:full 中 planRunSharedSubmission 按规范身份各仅一次的绑定断言；磁盘棘轮/argv 矩阵/hooks/npm 映射/分类路径全部原样保留，无 >= 放宽、未动 runner 生产脚本与 manifest。
- 本项复验：manifest 原 extraFiles argv（--test-force-exit --test-timeout 20000）单文件 26/26 exit 0，/tmp/pi-test-xpmng04h/000.raw.log（SPEC 已填 testFileArgs=[5]+requiredFiles）。
- 原失败证据保留：Windows full-package-run.json/stdout/stderr + job-219 out.log（/host/c/Users/ZLK/AppData/Local/Temp/plan-run-407-tgiHLs/）。
