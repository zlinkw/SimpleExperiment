# C 前置证据：如何用现有 API/队列/结果证明「该创新分支在此源码版本、所选 PLAN 下已验证」

只读调查，冻结 master=a9fc3d36629eeeb6bb71b183d59731e209ccac5a（tree 82e27df5）。全部经
`git -C /repos/MCP/zlk-cluster-orchestrator show/grep <a9>:path` 读取，未读作者变动工作树。
SimpleExperiment v0.5.409。不做实现、不编译测试、不联网、不跑真实科研。
本片段供原 GPT 决定 C 最小实现；不替 A 的写入者决定字段名。跨项目统一 GPU 属 B，非本范围。

---

## Q1 现有 state / results.list / queue 能提供哪组身份与完成证据

### 1.1 队列侧（本机内存权威 + 落盘投影）
`src/features/DistributedPlanQueue.ts:99-129` `QueuedPlan` 真实字段（节录原文）：
```
export type QueuedPlan = {
  executionSource?: { digest: string; manifest: Record<string, { size: number; sha256: string }> };
  id: string;
  /** Explicit top-level PLAN identity, retained across a recorded rename. */
  stablePlanId?: string;
  executionMode?: PlanExecutionMode;
  resultPathPolicy?: "declared";
  executionModeSource?: "validation" | "matching_plan_revision" | "worker_receipt";
  projectId?: string; planJobCount?: number;
  /** Full validation count, even when this submission only fills missing jobs. */
  fullPlanJobCount?: number;
  planFile: string; revision: string; codeFingerprint: string;
  enqueuedAt: string; jobs: QueuedJob[]; ... }
```
job 侧身份与观测字段（同文件 `:34`、`:192-197`、`:203-213`）：
`verifiedCompletion?: VerifiedCompletion`、`status`、`executionState`、`resultState`、`completionState`、
`runtimeDiagnostics`、`exitCode`、`statusQueryError`、`verificationQueryError`、`lastObservedAt`、
`finishedAt`、`history[{attempt,status,workerId,commandId,outputDir,finishedAt,...}]`、`workerId`、`commandId`、`runKey`、`gpuId`。

### 1.2 真实 VerifiedCompletion 投影（已存在，非静态校验）
`src/features/VerifiedCompletion.ts:5-36` 关键正文：
```
export type VerifiedCompletion = { schemaVersion: 1; identity: string; verifiedAt: string; exitCode: 0 };
export function completionIdentity(plan, job) {
  return JSON.stringify([plan.projectId, plan.id, job.index, job.workerId, job.commandId, job.outputDir,
                         job.collectionResultCsv || ""]);
}
export function hasVerifiedCompletion(plan, job): boolean {
  const proof = job.verifiedCompletion;
  return Boolean(!job.unavailable && !job.retainExistingOutputs && job.commandId && plan.projectId && job.workerId
    && job.outputDir && proof?.schemaVersion === 1 && proof.exitCode === 0
    && Number.isFinite(Date.parse(proof.verifiedAt)) && proof.identity === completionIdentity(plan, job));
}
export function verifiedCompletionProjection(plan, job) {
  if (!hasVerifiedCompletion(plan, job)) return {};
  return { status: "completed", executionState: "exited", resultState: "complete", completionState: "verified",
    exitCode: 0, ..., runtimeDiagnostics: { schemaVersion: 1, commandId, runId: commandId, state: "clear", count: 0, scanComplete: true } };
}
```
`nextVerifiedCompletion`（同文件 `:23-36`）在 exact 观测（`!observation.queryError`）且
`state.status==="completed" && state.result==="complete" && state.completionState==="verified" && state.exitCode===0`
时才签发；并且对更新的证据通道做反向核查（`artifactIssue/executionIssue/runtimeIssue` 任一成立即返回 `undefined` 撤证）。

**关键结论**：`completionIdentity` 绑定 projectId/planId/jobIndex/workerId/commandId/outputDir/resultCsv，
**不含 plan.revision 与 plan.codeFingerprint**。「该源码版本」必须靠调用方用 QueuedPlan.revision/codeFingerprint 另行核对
（现成先例见 Q3 的 `clearedJobBelongsToPlan`）。

### 1.3 旧结果/磁盘历史不会被当成"验证成功"（现成保护，必须复用）
- `clearNativeProjection`（`DistributedPlanQueue.ts:192-200`，序列化时调用）：先把 job 打回
  `unknown/pending/cancelled` 并删除 `completionState` 等运行态字段，**只有 `hasVerifiedCompletion` 成立才重新贴回 verified**。
  同文件 `:202` 注释：`Metadata writes keep the current in-memory observation; disk history never supplies runtime truth.`
- `keepCurrentObservations`（`:203-215`）：只搬 ≤30s 内、`commandId`+`workerId` 均相同的当前观测。
- `updateVerifiedCompletions`（`:229-241`，`maxAgeMs = 20_000`）：只持久化"紧凑确证事实"，
  注释明确 `never raw observations, log text, metrics or a replayable remote task registration`。
→ C 的「已验证」判定必须走这些活路径，**不得把持久化 queue JSON 当运行时真值**。

### 1.4 results.list 的真实输出构造（含源码版本绑定）
API 注册：`src/extension/legacy.ts:1458` `"results.list": async (params, _server, context) => this.apiResultsList(params, context.signal)`
构造：`src/extension/legacy.ts:1598-1603`
```
async apiResultsList(params = {}, signal?) {
    const report = await resultCollectionHost(this).update(signal);
    const selected = stringField(params, "planFile") || stringField(params, "planId") || "";
    const results = (report.results || []).filter(row => !selected || samePlanSelection(row.planFile, selected));
    return { source: "active_query", planFile: selected, results: results.slice(0, 200), summary: { ...report, results } };
}
```
每行结果真实字段（`src/extension/ResultCollectionHost.ts:220-227`）：
```
results: result.records.map(row => ({ planFile, workerId, runId,
  dimensions: { case, seed, method, dataset, rate_percent, eval_protocol }, metrics,
  sourceFiles: [{ path: row.jobDir }],
  aggregationState: result.jobs.find(job => job.commandId === row.runId)?.aggregationState,
  workflowId: row.workflowId, revision: row.revision, codeFingerprint: row.codeFingerprint,
  executionWorkerId: row.executionWorkerId,
  completionState: result.jobs.find(job => job.commandId === row.runId)?.completionState,
  runtimeDiagnostics: ... })),
```
job 侧新鲜度与绑定（`src/results/FreshResults.ts:145-167`）：
`item.state="complete"`、`item.workflowId/codeFingerprint = owner?.codeFingerprint || report.codeFingerprint`、
`item.revision = owner?.revision || report.planRevision`、`item.executionState`（按 tmux 退出码，缺 pane 记 `missing`）、
`item.completionState = completionState(item.runtimeDiagnostics, source.runId)`、
`aggregationState = (executionState==="failed" || report.status==="failed" || source.executionStatus==="failed") ? "review_required" : "eligible"`；
**任何读取异常 → `item.state = "unknown"` 并写 error**（`:167`），绝不静默通过。
PLAN 一致性硬闸（`ResultCollectionHost.ts:115-118`）：`queryComplete !== true || capabilities?.resultCollection !== 1` → 报错；
`declaredJobs.some(job => job.planHash !== plan.revision)` → `throw Error("服务器 PLAN 与当前本机声明不一致，未使用旧路径")`。
覆盖度字段（`ResultCollectionHost.ts:205-219`）：`planCoverage[{included, expected, completed, artifactsComplete, reviewRequired}]`、
`missing[]`（`state !== "complete"` 逐条 case/seed + 原因）、`unobservedDeclarations`、`skipped`。

### 1.5 Git 提交身份在结果中不存在（重要缺口，别当已有）
全树（含 dist/legacy）计数：`sourceGitCommit: 0`、`commitSha: 0`、`gitBranch: 0`、`revParse: 0`；
`gitCommit` 21 处仅出现在 agent 运行时/legacy 恢复逻辑，未进入结果或队列身份。
→ 现有结果**不记录运行时的 Git commit/branch/dirty**；源码版本身份是**内容寻址**（见 Q2）。

### 1.6 科学质量/统计只由用户主动触发（不得自动跑、不加阈值）
`runQualityGate`/`runStatistics`/`compareWithBestConfig` 只在 `uiActionCommands`
（`legacy.ts:556-609`）与命名命令映射（`:688 run-quality-gate`、`:689 run-statistics`、`:703 compare-with-best-config`）出现；
本轮 grep 未发现定时器/自动调用路径。静态检查是另一件事：`runCheckStatic`/静态检查报告
（`legacy.ts:21312-21379`，`CommandFactory.ts:77-78`）只校验 PLAN 结构/输出接口/路径安全，
`validatePlan`/`plan.validate` 是提交前校验——**都不是"运行验证"**，UI 不得把它们显示成已验证。

---

## Q2 计划提交冻结点：branch/HEAD/dirty 该挂哪、以及"同内容不必重跑"的最小绑定

### 2.1 正确冻结点（现有实现原文）
`src/extension/PlanRunHost.ts:133-137`：
```
const sourcePlan = { ...plan, projectId: plan?.projectId || canonicalProjectId(this.root), planFile: body.planFile,
  revision: body.planRevision, codeFingerprint: plan?.codeFingerprint || h.lastCodeSyncState?.fingerprint };
const executionSource = body.executionSource || await resolvePlanExecutionSource(h, sourcePlan);
if (executionSource) { await verifyLocalPlanSource(this.root, executionSource, h.projectFileObservationIndex?.()); body.executionSource = executionSource; }
const expectedFingerprint = executionSource?.digest || h.lastCodeSyncState?.fingerprint || "";
```
本机重验 `verifyLocalPlanSource`（`src/extension/PlanCodeScopeHost.ts:88-101+`）：逐条 manifest 项做
路径合法性 + 逐级 `lstat` 拒符号链接 + `stat.size !== expected.size || sha256(file) !== expected.sha256` → 抛错。
Worker 侧 `inspect_plan_code_scope` / `verify_plan_execution_source`（`src/runtime/PlanCodeScope.ts:169-215`）：
`plan_source_digest(manifest) !== source.digest` → `PLAN_SOURCE_BASELINE_INVALID`；
`manifest[planFile].sha256 !== planRevision` → `PLAN_SOURCE_REVISION_MISMATCH`；
重算依赖闭合并要求 `set(paths) === set(manifest)` 否则 `PLAN_SOURCE_DEPENDENCIES_CHANGED`；再逐文件 `verify_content=True`。
可从 `code_sync_proof` 凭据或任务窗口按 `projectId+planFile+planRevision+codeFingerprint` 找回原始 manifest（`:193-206`）。
`codeFingerprint` 语义 = `durable_code_manifest_digest(manifest)`（`src/clusterAgentRuntime.legacy.ts:2798-2802`：
按 key 的 utf-16-be 排序后 `[[key, {size,sha256}]]` 的 sha256）；本机侧同值写入见 `legacy.ts:10745`
（`codeFingerprint: fingerprint, manifestDigest: fingerprint, scopeSignature, codeManifest: manifest`）。

### 2.2 该把 branch/HEAD/dirty 挂在哪
只有 2.1 这一层（以及构造同一身份元组的兄弟提交路径 `legacy.ts:12470`、`:11472`、`:7136`）能同时拿到
`projectId / planFile / revision / codeFingerprint / executionSource`，是正确附加点。
可用只读来源（都已在生产使用，无需新依赖）：
- `src/features/GitBackup.ts:53-69` `runGit(args, cwd, timeoutMs=15000)`：`execFileSync("git", …)`，
  `GIT_TERMINAL_PROMPT:"0"`，返回 `{ok, stdout, stderr}`；`:71-75` `findRepoRoot` = `rev-parse --show-toplevel`；
  `:102-110` `listRemotes` = `git remote`；`:239-242` `checkRemoteAccess` = `ls-remote --exit-code <remote> HEAD`；
  分支读取范式已在 `:172` 使用 `git symbolic-ref --short HEAD`。
- VS Code Git API：`legacy.ts:11013-11022` `primaryGitRepository()`；
  `legacy.ts:35531-35534` `gitRepositoryHasChanges(repo)` = `state.workingTreeChanges|indexChanges|mergeChanges` 任一非空 —— **这就是现成的 dirty 读取**；
  `:35535-35538` `gitRepositoryHasRemote(repo)` 读 `state.remotes[].name/fetchUrl/pushUrl`。

### 2.3 "运行时 dirty、后来提交但源码字节完全一致" → 最小绑定方法（依据现有指纹即可）
建议语义（给 GPT 决定，不是字段规定）：
1. **权威身份仍是内容**：`executionSource.digest` / `codeFingerprint` + per-file `{size, sha256}` manifest。
   branch 名与 headCommit 只能作为**非权威出处标注（provenance 标注）**随提交记录一起保存，
   绝不进入验证判定；branch 名可被 rebase/改名，天然不是不可变身份。
2. 因此 dirty→clean 的纯 Git 元数据变化**不改变 manifest → 不改变 codeFingerprint → 不需要重跑科研**；
   出处标注里的 headCommit/dirty 变干净即可，内容等式由 `verifyLocalPlanSource`（本机）
   与 Worker `verify_plan_execution_source`（闭合重算 + 逐文件内容校验）双向证明。
   提交后如果代码真的变了，`PLAN_SOURCE_CHANGED` / `PLAN_SOURCE_DEPENDENCIES_CHANGED` / 指纹不等会自然阻断复用。
3. **必须如实声明的边界（现证据不足之处）**：manifest 覆盖的是**该 PLAN 的代码依赖闭包**，不是整个仓库；
   动态导入无法静态解析时走保守并入集 `conservative`（`src/runtime/PlanCodeScope.ts:150-171`，随结果返回），
   数据/权重/仓外输入不在闭包内（`plan_scope_generated` 明确排除 results/logs/weights/checkpoints/raw/processed 等，`:26-28`）。
   所以"同内容已验证"的可主张范围 = 已验证闭包内；若某候选的差异只落在闭包外（例如只换数据），
   **现有证据不足以证明等价**，必须显式标 unknown 并要求用户自行判断，不得由 UI 宣称等价或重跑结论。
4. 若需要"该分支当时确实跑过"的可追溯性：把 provenance（branch/headCommit/dirty/采集时刻）作为**追加式记录**
   与提交记录同存即可；不要用 branch 名做 key，也不要把 headCommit 变化当成失效条件。

---

## Q3 用户"选优"= 人工挑选有真实证据的候选（不自动判科研优劣）

用现有字段即可组装，不需新数据库/新审批平台。三层合取：
1. **PLAN 身份全等**：对人工选定的**非空** PLAN 集合逐个核
   `{projectId, planFile(或 plan.id/stablePlanId), revision, codeFingerprint}` 与队列条目一致。
   现成先例：`DistributedPlanQueue.ts:463-466`
   ```
   entry.planId === plan.id && entry.planFile === plan.planFile
     && entry.planRevision === plan.revision && entry.codeFingerprint === plan.codeFingerprint
   ```
   以及 12 字段身份键 `clearedJobIdentityKey`（`:453-461`）。
2. **每 job 有真实完成确证**：`hasVerifiedCompletion(plan, job)` 为真；
   等价显示口径先例：`legacy.ts:1480` `successful: job.status === "completed" && job.completionState === "verified"`、
   `DistributedPlanQueue.ts:1647` `(job.lifecycleProtocol !== 2 || job.completionState === "verified")`。
3. **结果行可绑定**：`results.list` 行的 `revision`、`codeFingerprint` 与所选候选全等，
   且 `aggregationState === "eligible"`；`review_required`、`state === "unknown"`、
   落在 `missing[]` / `unobservedDeclarations` / 计数缺失的，一律**不得标通过**，只能显示原因。

判定口径（建议）：`pass` 仅当「集合非空 ∧ 身份全等 ∧ 每 job hasVerifiedCompletion ∧ 结果绑定全等且 eligible ∧ missing=0 ∧ unobserved=0」；
其余一律 `unknown`/`fail` 并带原因。空集合必须 fail-closed——先例：
`docs/adr/023-all-plan-auto-queue.md`「空目录、无效路径或不支持自动排队时整批不提交，不回退到手选服务器。
显式空选择仍然报错，不扩大为全部」。
数据新鲜度：判定必须走活路径（`apiResultsList` 的 `source:"active_query"`、`updateVerifiedCompletions` 20s 窗口、
`keepCurrentObservations` 30s 窗口、`clearNativeProjection`），不得读旧 JSON 快照。
**不自动跑科研**：不调 `runQualityGate`/`runStatistics`/`compareWithBestConfig`，不加任何新阈值；
`compareWithBestConfig` 只是结果比较（`legacy.ts:703`），不是"优劣判决"。

### 建议的只读视图模型（与 A 的模型兼容，字段名由 A 写入者定）
- 输入：人工选定候选 = `{ projectId, branch(标注), headCommit(标注), dirty(标注), selectedPlans:[{planFile, revision, codeFingerprint}] }`
- 输出（逐 plan）：`{ identityMatched, expected, completedEligible, reviewRequired, missingCount, unobservedCount,
  jobs:[{index, case, seed, verified: hasVerifiedCompletion, completionState, aggregationState, workerId, commandId, outputDir}] }`
- 逐 plan 汇总 + 逐 job 原因，全部来源于 §1 已有构造，不新造数值、不自造期望。

---

## Q4 现有 Git 相关能力：可复用的只读读取与安全确认范式（无 PR 接口，不假称）

- `syncToGitHub`（`legacy.ts:8009-8025`）：`git.stageAll` → 有变更则 `repo.commit(message)`+`repo.push()`，无变更仅 `push()`；
  依赖 VS Code 内置 Git API，**没有 PR/merge 调用**。
- `publishToGitHub`（`legacy.ts:8026-8060`）：有 remote 时转 `syncToGitHub(false)`；无 remote 时先探测
  `gh --version`，缺失即 `showErrorMessage` 引导安装并抛错；仅在**首次建库**时执行
  `gh repo create --source . --remote origin --private --push`。**全树无 `gh pr` / GitHub REST / merge API**。
- `overwriteFromGitHub`（`legacy.ts:8073-8081`）：`confirmUiCommand("从 GitHub 覆盖本机", "将执行 git reset --hard 和 git clean，删除本地未提交改动。", true)`
  → `git fetch --all --prune && git reset --hard @{u} && git clean -fd`。破坏性、modal 双确认范式可复用；**不得用于"合并祖先"**。
- `uploadProjectToHub`（`legacy.ts:8082-8084`）：`throw new Error("HUB_REMOVED：Hub 功能已移除，请选择 Worker。")`。
- 可直接复用的只读件：`runGit`/`findRepoRoot`/`listRemotes`/`checkRemoteAccess`/`symbolic-ref` 分支读取
  （`GitBackup.ts:53-110,172,239-242`）、`primaryGitRepository()` + `gitRepositoryHasChanges` + `gitRepositoryHasRemote`
  （`legacy.ts:11013-11022,35531-35538`）。
- 结论：**可复用 = 本机 origin/branch/dirty/远端可达性读取 + modal 双确认范式**；
  **PR / merge / 祖先推进在现有代码里不存在**，未来只能由用户 UI 明确操作，且真实 push/PR/merge 归宿主 GPT 现有授权。
  本任务只允许 Windows 临时 Git 夹具验证绑定语义，不跑真实科研、不改消费仓。
  不设计远端 Worker 账本或新审批平台，不调用 gh。

---

## 必要现有测试域（C 改动应扩这些既有套件，不新建单函数文件）
- 作业级确证与提交真值：`test/features/verifiedCompletion.test.js`、`test/features/currentSubmissionTruth.test.js`、
  `test/features/completedJobAutoRecheckSuppression.test.js`、`test/features/planArtifactSyncStatus.test.js`
- 源码闭包/executionSource：`test/features/planCodeScope.test.js`（配 `planCodeScope.fixture.py`）、
  `test/agent/codeSyncProof.test.js`、`test/agent/durablePlanQueue.test.js`
- 结果绑定与新鲜度：`test/features/freshResults.test.js`、`test/features/freshResultRuntime.test.js`
  （`freshResultRuntime.fixture.py`）、`test/features/freshResultHost.test.js`、`test/_helpers/resultCollectionScenario.js`、
  `test/features/metricsDownloadEndToEnd.test.js`
- UI/消息与白名单（新入口必须进 `uiActionCommands`/`SAFE_WEBVIEW_COMMANDS`，否则被 `legacy.ts:28610` getSafeCommand 拦）：
  `test/ui/webviewActionAllowlist.test.js`、`test/features/webviewCommandWhitelistConsistency.test.js`、
  `test/ui/webviewButtonsHandled.test.js`、`test/ui/webviewStateShape.test.js`、`test/features/panelMessageDispatch.test.js`
- 队列语义 fail-closed 参考：`docs/adr/023-all-plan-auto-queue.md`

## 剩余未知 / 不在本范围
- Worker Agent 需具备 `capabilities.endpoints.planCodeScope === 1`（`PlanCodeScopeHost.ts:10`）与
  `capabilities.resultCollection === 1`（`ResultCollectionHost.ts:115,147`）；现场实际 Agent 版本/能力由主控经宿主核实。
- 跨项目统一 GPU 调度由 B（9bc… 本机统一派发）研究；A 界面/注册/API 实例继续由 fa53… 负责。
- 宿主实际渲染/日志须主控 host_windows 采集，本 reader 未枚举宿主目录、未联网。
- 本片段是 C 的数据接口与检查边界证据，不声明任何任务已完成。
