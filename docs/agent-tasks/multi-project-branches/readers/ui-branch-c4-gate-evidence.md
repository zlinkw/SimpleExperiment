# C4' 门禁前置证据：现 C3 能复用哪些已存在函数/字段构造「非空 PLAN 集逐项真实完成 + 该提交含相同清单 + 写前重核」

只读调查。冻结源 `/repos/MCP/zlk-multi-project-branches-win-20261025`
HEAD=`92fcd8e8196b0beeec5a4da730c2a9de0e92fc1d`、tree=`09f1b18fd3f6a498ac9fada101bad01b2ebc335a`（本轮实测 `git rev-parse` 二者一致）。
该工作区含未提交 dist 改动，故全部经 `git -C <root> show 92fcd8e8:<path>` / `git grep <92fcd8e8>` 读对象，未把活动工作树当冻结源。
C4 冻结 diff `/repos/MCP/zlk-c4-handoff-20261025/candidate-92fcd8e8-to-4e118a2f.diff`
实测 sha256=`da27576b49e63ad29f5ea90ae466ff7aa3b4829b504fa1b46bd9ab168c796a6b`、75599 字节、752 行 —— 与给定一致。
不编译、不跑产品测试、不联网、不写实现/测试/Git/公共 plan、不嵌套代理。

---

## 0. C3 现有可复用面（先给结论）
C3 已落地的可复用积木（无需新服务、无新 Worker 协议、无数据/权重哈希系统）：

| 用途 | 现成符号（冻结源锚点） |
|---|---|
| 逐登记根读队列磁盘投影 | `legacy.ts:2022 branchQueueSnapshotFor(root)` → `{state:"ok"|"missing"|"corrupt", queue?, error?}` |
| 跨根结果对比（人工选优事实基础） | `legacy.ts:2033 compareBranchResults(reason)`、`:2079 compareBranchResultsFromUi()` |
| 单 PLAN「该提交含相同清单」证明 | `src/project/BranchHeadBinding.ts:146 bindPlanSourceToCommit(options)` |
| 提交树 vs manifest 逐文件核对 | `:93 verifyCommitTreeAgainstManifest({runner,cwd,commit,manifest})`；`:48 parseLsTreeZ`；`:27 runGitBinary` |
| 清单摘要/路径口径（与 Worker 同口径） | `src/extension/PlanCodeScopeHost.ts:11 planExecutionSourceDigest`、`:13 planManifestPathSafe` |
| 真实完成确证（身份绑定，可跨落盘） | `src/features/VerifiedCompletion.ts` `hasVerifiedCompletion` / `completionIdentity` |
| 终端确证（**不等于**已验证） | :24 TrustedTerminalProof、:25 trustedTerminalProofFor`、`:28 hasTrustedTerminalProof |
| Git 身份/dirty 三态/祖先关系 | `src/project/GitIdentityProbe.ts:102 readGitIdentity`、`:172 compareAncestorRelation`、`:142 listWorktrees`、`:32 sanitizeGitEnv` |
| 登记卡只读验证（含 git 快照） | `src/project/BranchProjectService.ts:120 verifyAll() → RegistryProjection`；`:34 AncestorVerification`、`:45 BranchVerification` |
| 运行溯源（分支/commit/dirty 三态） | `legacy.ts:8109 collectRunGitProvenance`、`:8140 recordRunGitProvenance`、`:8173 queueGitProvenance`；字段 `DistributedPlanQueue.ts:111 QueuedPlan.gitProvenance` |

---

## 1. C4' 最小门禁：用现成函数怎么拼（调用与数据形状）

### 1.1 「用户选非空 PLAN 集」
数据形状已存在：`compareBranchResults` 的 `state.roots[].plans[]`
```
{ planId, planFile, revision: <前24字符>, hasExecutionSource: boolean,
  gitProvenance?: { branch, localCommit, githubCommit, dirty|null, recordedAt },
  jobs, verified, running, waiting, unknown, failed, cancelled }
```
（`legacy.ts:2062-2071`）
注意：这里 `revision` 被 `slice(0, 24)` 截断，**不能作为身份比较值**；身份比较必须回到队列原值
（`branchQueueSnapshotFor(root).queue.plans[].revision` / `.codeFingerprint` 全值，`DistributedPlanQueue.ts:124-125`）。
非空判定必须 fail-closed：集合为空/含身份不全条目 ⇒ 直接拒绝，参考既有口径
`docs/adr/023-all-plan-auto-queue.md`「显式空选择仍然报错，不扩大为全部」。

### 1.2 「逐项证明真实完成」——只用身份绑定确证
现成谓词（`src/features/VerifiedCompletion.ts`，纯函数、无 TTL）：
```
completionIdentity(plan, job) = JSON.stringify([plan.projectId, plan.id, job.index,
   job.workerId, job.commandId, job.outputDir, job.collectionResultCsv || ""])
hasVerifiedCompletion(plan, job) = !job.unavailable && !job.retainExistingOutputs && job.commandId
   && plan.projectId && job.workerId && job.outputDir
   && proof.schemaVersion === 1 && proof.exitCode === 0
   && Number.isFinite(Date.parse(proof.verifiedAt)) && proof.identity === completionIdentity(plan, job)
```
逐 PLAN 门禁建议口径（全部现成字段，不新造计数）：
- `plan.jobs.length > 0` 且 **每个** job `hasVerifiedCompletion(plan, job)` 为真；
- 且 plan 级身份全等 `{projectId, planFile(或 plan.id), revision, codeFingerprint}`
  （先例 `DistributedPlanQueue.ts:463-466 clearedJobBelongsToPlan` 逐字段比较 `planRevision/codeFingerprint`）。
  原因：`completionIdentity` **不含** `revision`/`codeFingerprint`，源码版本必须 plan 级另核。
- 展示层可继续用 `PanelPlanStatusSummary` 的既有 `successful` 口径先例
  （`legacy.ts:1480 job.status === "completed" && job.completionState === "verified"`）。
- **不得**用 `hasTrustedTerminalProof` 代替完成确证：其类型注释明确
  `proves this exact command ended (integer exit, proven cancellation, or server-recorded terminal state),
  never that results verified`（`VerifiedCompletion.ts:21-24` 注释与类型），且它在
  `UnifiedDispatchAdmission.ts:116` 只服务于「名额/释放」判定。

### 1.3 「该提交含相同清单」——直接调 `bindPlanSourceToCommit`
```
const identity = readGitIdentityProbe(root);           // 现成：branch/headCommit/dirty/toplevel/error
if (identity.error || !identity.headCommit || canonicalComparablePath(identity.toplevel) !== canonicalComparablePath(root)) 拒绝;
const binding = await BranchHeadBinding.bindPlanSourceToCommit({
  runner: BranchHeadBinding.runGitBinary, cwd: identity.toplevel, headCommit: identity.headCommit,
  executionSource: plan.executionSource, planFile: plan.planFile, revision: plan.revision });
// → { ok, coveredFiles, coveredBytes, failures[{path,reason}], note, headCommit, reason? }
```
（现成调用范例 `legacy.ts:2107-2110`）它自带的失败关闭已经够用，**C4' 不需要新写哈希**：
清单缺失/超 4096、`source.digest !== planExecutionSourceDigest(manifest)`、
`manifest[planFile].sha256 !== revision`、路径非法、提交不存在、树读取失败、
`mode 120000` 符号链接、非普通文件、blob 缺失/非 blob/帧截断、size 不等、内容 SHA 不等
（`BranchHeadBinding.ts:146-175`、`:93-141`）。
其 `note` 已如实限定覆盖范围：
`覆盖范围仅为本 PLAN 已验清单内的源码与配置；数据、权重与仓外输入不在清单内，不构成整仓或科研结论等价。`（`:139`）

### 1.4 「写前重核」的现成模式
C3/C4 已有的三段式可直接沿用，不需新框架：
`preview → confirmDigest 一致才写`（`BranchProjectStore.ts:160 createBranchPreviewDigest`、
`CreateBranchRequest.confirmDigest`、服务层「摘要一致才写」既有测试
`test/project/branchProjectRegistry.test.js:215`）+ 写前重新 `readGitIdentity`/`bindPlanSourceToCommit`
（`legacy.ts:2103-2110` 已是"点按钮即重读"的形态）+ 祖先快进前置
`identity.dirty ⇒ blocked`（diff 中 `if (identity.dirty) return { status: "blocked", reason: "祖先工作区不干净，跳过快进（不 stash、不覆盖任何文件）。" }`）。
即：C4' 只需把 1.2 的 per-job 确证与 1.3 的绑定放进同一次「写前重核」调用序列，
把两个结果一起放进 preview 摘要，**不要新建服务或新存储**。

---

## 2. C3 里把「仅 manifest 存在」说成「已验」的误导文字（精确锚点）
manifest 的真实语义 = **已冻结/已核的源码闭包清单（指纹）**，由 `resolvePlanExecutionSource`/
`verifyLocalPlanSource` 与同步登记产生，只证明"这些文件的 size/sha256 被冻结且自校验一致"，
**不证明这批代码跑过、更不证明结果被确证**。以下文字把它说成"已验"，会被读成"该 PLAN 已验证"：

1. `legacy.ts:2091` modal 文案：`该分支队列内没有带已验源码清单（executionSource）的 PLAN，无法证明任何 HEAD。`
   → "已验源码清单"应为"已冻结源码清单/已核源码指纹清单"。
2. `legacy.ts:2099` QuickPick description：`${Object.keys(plan.executionSource.manifest).length} 个已验文件`。
3. `PanelHtml.legacy.ts:4762` 按钮 tooltip（else 标签在 `:4763`） `对比已验源码清单` 与 else 分支标签 `· 无已验清单`。
4. `BranchHeadBinding.ts` 头注释 `把 PLAN 的已验 executionSource 精确绑定到仓库当前提交树`（命名沿用"已验"）。
5. **最需注意的语义缺口**：`legacy.ts:2089` 候选筛选只看 `plan.executionSource?.manifest` 非空，
   `verifyBranchHeadBindingFromUi` 全程**未调用** `hasVerifiedCompletion`；于是
   `legacy.ts:2129` 在 `binding.ok && !sameCommit` 时输出
   `已提交内容与验证时字节一致：… 按契约验证可复用，不需要重跑科研`，
   以及标题 `此 HEAD 可由已验清单证明`（`:2132`）。
   ⇒ **一个 0 个确证 job 的 PLAN 也能得到"验证可复用/可证明"的结论**。
   （C3 已如实声明"这不是重新验证，只是绑定证明"并限定覆盖范围，所以是**措辞/口径**问题，不是哈希逻辑错误；
   C4' 若要给出"该分支已验证"级别的门禁，必须补 1.2 的 per-job 确证 + plan 级身份全等，
   否则文案只能停留在"该提交内容与冻结清单一致"。）

对照：C3 已经写对的地方（C4' 应沿用，不要倒退）——
`PanelHtml.legacy.ts:4745` 结果对比抬头
`"已确证"=身份绑定的完成证明，不等于科研结论通过；优劣由用户判断`；
`BranchProjectService.ts:52-53` `researchValidated: false` + 注释
`Honest verification posture: research validation is a separate pipeline; this only proves git identity.`；
`compareBranchResults` 注释 `不判科学优劣、不新造排行`（`legacy.ts:2032`）。
**人工科学选优不得改成机器自动评分**：以上三处正是既有防线，C4' 不得引入任何排序/评分字段。

---

## 3. 结果未知与真实撤证的处理（现状可直接复用）
- **未知不是通过**：`JobState` 含 `unknown`（`DistributedPlanQueue.ts:10`），
  `restoreFormalJobQueue`/`clearNativeProjection` 在有 `commandId` 但无确证时把 status 打回 `"unknown"`（`:204`）；
  对比计数里 `unknown` 单列（`legacy.ts:2058`），面板如实显示"未知"（`PanelHtml.legacy.ts:4757`）。
- **真实撤证**（身份绑定谓词天然做到，无需额外机制）：`hasVerifiedCompletion` 每次用
  `completionIdentity(plan, job)` **重算**比对，故 `projectId/plan.id/job.index/workerId/commandId/outputDir/collectionResultCsv`
  任一变化（重试换 commandId、改派 worker、输出目录迁移、resultCsv 变更）旧确证即失效；
  `job.unavailable || job.retainExistingOutputs` 也直接判不成立（status 变 `cancelled`）。
  运行期方向上的撤证由 `nextVerifiedCompletion` 负责：更新证据通道出现
  artifact/execution/runtime 反证即返回 `undefined`（`VerifiedCompletion.ts:34-47`），
  `updateVerifiedCompletions` 会把差量落盘（`DistributedPlanQueue.ts:240-252`）。
- **队列损坏/为空 fail-closed**：`branchQueueSnapshotFor` 返回 `"corrupt"`（附 ≤240 字符原因）或 `"missing"`
  （`legacy.ts:2026-2030`），`verifyBranchHeadBindingFromUi` 对 `corrupt` 直接抛错不做结论（`:2081`）。

## 4. TTL 与「身份绑定持久完成证明」（约束已满足，需守住的边界）
- 磁盘队列里的 `verifiedCompletion` **不会因 TTL 失效**：序列化/还原都会跑 `clearNativeProjection`
  （`serializeDistributedQueue` `DistributedPlanQueue.ts:226`、`restoreFormalJobQueue:196`），
  它删的是易失观测字段（`lastObservedAt/completionState/executionState/runtimeDiagnostics/exitCode/…`），
  并且 `if (hasVerifiedCompletion(plan, job)) Object.assign(job, verifiedCompletionProjection(plan, job))`
  否则才 `delete job.verifiedCompletion`（`:207-208`）——**身份绑定确证跨落盘存活**，
  这正是 `branchQueueSnapshotFor`（纯读盘、无 TTL）能安全用于选优的原因。
- **不可**把 TTL 窗口当门禁：`keepCurrentObservations`（30s，`:212`）与 `updateVerifiedCompletions`
  的 `maxAgeMs = 20_000`（`:240`）只约束"当前运行期观测的搬运/合并"，
  拿它们判"是否已验证"会让持久确证被时间戳错误作废，违背本轮约束。
  两者都不改 `verifiedCompletion` 的 identity 判定，因此现状并未违反该约束——C4' 只要不引入新的时间窗判据即可。
- `TrustedTerminalProof` 与 `VerifiedCompletion` 一样"Survives the projection wash"（`:22-23`），
  所以"跨落盘的释放/终态事实"也已解决，无需新协议。

## 5. 最小缺口（均有证据，不扩范围）
1. **对比/候选缺少 plan 级源码身份**：`legacy.ts:2062-2064` 只暴露截断 `revision` + `hasExecutionSource`，
   **未暴露 `codeFingerprint`**；`verifyBranchHeadBindingFromUi` 只按 manifest 非空筛候选（`:2085`），
   全程不查 per-job 确证 ⇒ 见 §2.5。C4' 需要（不新增服务）把 `plan.codeFingerprint` 全值与
   per-job `hasVerifiedCompletion` 结果纳入同一读盘投影与 preview 摘要。
2. **死字段 `gitProvenance.githubCommit`**：读取端 `legacy.ts:2067` 读 `plan.gitProvenance.githubCommit`，
   但落盘端 `queueGitProvenance`（`:8178-8186`）只写
   `{schemaVersion, recordedAt, planFile, branch, localCommit, dirty?, originUrl}`，
   类型 `DistributedPlanQueue.ts:111` 也无 `githubCommit` ⇒ 队列里恒为 `""`
   （`githubCommit` 只存在于 `collectRunGitProvenance:8119-8134` 的溯源 JSON 文件路径 `simple_cluster/runs/git_provenance/…`）。
   要么补齐落盘，要么去掉该显示，避免"看起来有 GitHub 提交对照"。
3. **计数残差不透明**：`counts` 桶为 `verified|running|waiting|unknown|failed|cancelled`
   （`:2053-2061`），而 `status === "completed"` 且无确证的 job **不落入任何桶**
   （`JobState:10` 含 `completed`），只有 `jobs` 总数可见 ⇒ 建议加一列"完成未确证"或明确等式，
   否则用户可能把 `jobs - verified` 误读为"未跑"。
4. **脏状态契约不一致**：`collectRunGitProvenance` 上方注释称
   `绑定/合并核验只接受 dirty===false`（`:8127-8128`），
   但 `verifyBranchHeadBindingFromUi` 的守卫只拦 `identity.error/无 headCommit/toplevel 不符`（`:2105-2106`），
   `dirty===true` 与 `dirty===null` 都会继续并给出绑定结论（仅追加提示 `:2130`）。
   对"该提交含相同清单"这一命题，脏不污染结论（结论只谈提交树），但注释与实际不符；
   而 C4/C5 的**合并到祖先**确实要求 `dirty ⇒ blocked`（diff 内已有）。建议统一表述：
   HEAD 绑定 = 脏只作标注；写/合并 = 要求 `dirty === false`（`dirty === null` 按未知拒绝）。

## 6. 现有适合扩的测试落点（不新建文件）
- `test/project/branchProjectRegistry.test.js` —— C3 绑定主战场，已有
  `:325 C3 当前提交树逐文件 blob 字节核对…dirty→clean 可复用`、
  `:405 C3 假执行器：… 绝不打印 blob 内容`、`:277 …全链拒绝，绝不标 verified`、`:215 摘要一致才写`；
  C4' 的"per-job 确证 + 相同清单 + 写前重核"直接在此加用例（真实临时 Git 仓 + 假执行器两种夹具都已就位）。
- `test/features/verifiedCompletion.test.js` —— 撤证/身份漂移（commandId/outputDir/resultCsv 变化）用例落点。
- `test/features/distributedPlanQueue.test.js`、`test/features/currentSubmissionTruth.test.js` ——
  `clearNativeProjection`/`restoreFormalJobQueue` 跨落盘保真、`gitProvenance` 窄字段与截断语义。
- `test/features/unifiedDispatchAdmission*` —— 若要确认 `TrustedTerminalProof` 仍只服务名额、
  不被误用为完成确证（diff 记录该套件已按"失败/停止分别 serialize→restore→再批"扩过）。
- `test/features/panelMessageDispatch.test.js`、`test/ui/webviewActionAllowlist.test.js`、
  `test/features/webviewCommandWhitelistConsistency.test.js` —— 新入口必须进
  `uiActionCommands`/`SAFE_WEBVIEW_COMMANDS`，否则被 `legacy.ts` `getSafeCommand` 白名单拦。
- `test/api/localApi.test.js` —— 若 C4' 需要经 LocalApi 暴露该门禁读数。

## 7. 本轮范围声明
- 未新建服务/Worker 协议，未引入数据/权重哈希（`verifyCommitTreeAgainstManifest` 现成的 4096 文件/128 MiB/60s
  上限与 blob 原字节比较即满足需要）。
- 未把人工科学选优改为机器评分；§2 列出的是既有防线，须保持。
- 未改权限、未写源码/测试/Git/公共 plan；不编译、不跑产品测试、不联网、不嵌套代理。
- 跨项目统一 GPU 派发属 B；本片段只覆盖"选优证据 → 写前门禁"的读侧证据。
- 结论仅到"哪些现成函数/字段可复用 + 缺口在哪"，不声明任何阶段已完成；剩余实现决策归原 GPT 与 A 写入者。

---

# 追加（定向版本归属）：三字段写路径实测 —— 同 plan.id 能否换源码版本而旧确证仍有效

同一冻结源 `92fcd8e8…`（`git show/grep` 读对象）。只回答版本归属这一问。

## A. 三字段的全部生产写路径
| 路径 | 锚点 | 是否改 `plan.id / revision / codeFingerprint / executionSource` |
|---|---|---|
| 正式入队（唯一创建口） | `legacy.ts:13072-13076`（`id = body.submissionWorkflowId ||= makeOpId("distributed-plan")`；`revision = body.planRevision`；`codeFingerprint = lastCodeSyncState?.fingerprint`；`executionSource = body.executionSource`）→ `DistributedPlanQueue.enqueuePlan(current, {...}, id)` `:13096-13107` | 新建：四个值一次性写入；**每次用户提交流程得新 id** |
| **不可变契约（核心）** | `DistributedPlanQueue.ts:1003-1013`：`:1004` 要求 `revision && codeFingerprint && planFile && id`；`:1005-1012` 同 id 已注册时，`planFile \| revision \| codeFingerprint \| executionMode \| jobs.length \| 逐 job(index/case/seed/outputDir/collectionResultCsv/checkpointSource)` 任一不同 → `throw "FORMAL_JOB_IDENTITY_CONFLICT: duplicate workflow has different declarations."`；全同才 `return queue`（`:1013`） | **同 plan.id 不可能换 revision/codeFingerprint/planFile/mode/job 声明** |
| 提交前源码冻结 | `PlanRunHost.ts:133-137`（`sourcePlan{projectId, planFile, revision: body.planRevision, codeFingerprint}` → `executionSource = body.executionSource \|\| resolvePlanExecutionSource()` → `verifyLocalPlanSource()` → `body.executionSource = executionSource`） | 只冻结进 body，再由入队一次性写 plan |
| 恢复/还原 | `restoreFormalJobQueue:192-201` → `clearNativeProjection:203-210` | **不改**三字段；`:207-208` 仅身份重算通过才重贴投影，否则 `delete job.verifiedCompletion` |
| 队列内就地重导 executionSource（①） | `PlanCodeScopeHost.ts:139`（`inspectPlanCodeSlots` 筛 `p.jobs.some(j => j.status === "pending" && !j.commandId)` 的队列 plan） | 只改 `executionSource`；`revision/codeFingerprint` 不动，值由 Worker 以 `{projectId, planFile, planRevision, codeFingerprint}` 为键强制：`PlanCodeScope.ts:189-206` `PLAN_SOURCE_BASELINE_INVALID / PLAN_SOURCE_REVISION_MISMATCH / PLAN_SOURCE_DEPENDENCIES_CHANGED / PLAN_SOURCE_ORIGINAL_HASH_INVALID` + 逐文件 `PLAN_SOURCE_CHANGED` |
| 重跑/重排队临界区写 executionSource（②） | `legacy.ts:14858-14869`：写盘事务内先 `selectedIdentityDrift(current, job)`（`:14862-14866`，字段含 `commandId/revision/codeFingerprint/outputDir/collectionResultCsv/planFile/projectId/worker/index`）漂移即抛；再 `if (body.executionSource) current.executionSource = body.executionSource`；其值来自派生对象 `sourcePlan = {...plan, revision: body.planRevision, codeFingerprint: lastCodeSyncState?.fingerprint, executionSource: undefined}`（`:14952`）+ `resolvePlanExecutionSource` `:14953` + 前后两次 `verifyLocalPlanSource` `:14954/:14958` + `lastCodeSyncState.fingerprint !== sourcePlan.codeFingerprint` 即抛 `:14959-14960` | 只改 `executionSource`；`revision/codeFingerprint` 漂移在临界区被拒 |
| 追加式写盘 append | `legacy.ts:12473-12497`（`appendPlanId` 由 `:13115` 用**刚入队的新 id** 传入；仅做产物路径重叠防重，随后 `:12499+` 用 `old.commandId !== job.commandId \|\| old.attempt !== job.attempt` 守卫保留运行态） | 不改三字段 |

## B. 直接回答：旧 verifiedCompletion 会不会被"错挂到新源码版本"
**不会通过"同 commandId 换版本"这条路发生**，因为所有重跑/重排路径都强制换掉 job 运行身份：
`PulledTaskControl.returnPulledJobToLocal:59-75` —— 先核 `current.commandId === commandId`（`:61`，否则"任务身份已变化；未重新派发。"），随后
`commandId: undefined, nextCommandId: randomUUID(), workerId/gpuId/runKey: undefined, status: "pending"`（`:66-67`）并把旧 commandId 追加进 `history(stopReason:"requeue")`（`:74-75`）。
`completionIdentity` 含 `commandId` 与 `workerId` ⇒ 旧确证立刻不成立，并在下次序列化被 `clearNativeProjection:208` 删除。
同一形态（清 commandId + 新 nextCommandId）另见 `DistributedPlanQueue.ts:1200、1217、1285、1592`、`ManualJobDispatch.ts:80`、`UnifiedDispatchAdmission.ts:204`。
派发时另有版本闸：`workerCanRunPlan:296-299` 要求 `compatiblePlans` 含该 plan 或 `worker.codeFingerprint === plan.codeFingerprint` 且 `workerCodeVersionAvailable:968-977` 无其它指纹活体冲突。

**因此正确的运行归属锚点**＝`{projectId, planFile, revision, codeFingerprint}`（plan 级，受 enqueuePlan 冲突拒绝保护）
× `{commandId, workerId, outputDir, collectionResultCsv, job.index, plan.id}`（job 级，受 completionIdentity 保护）。
`executionSource` 是**可重新导出的投影**：它的自校验只保证"与该 plan 的 `{planFile, revision, codeFingerprint}` 三元组一致"，
不保证它就是"当初那条确证 job 运行时的清单对象"。
⇒ **C4' 不要把 `executionSource.digest` 当运行归属证据**；它只用于"该提交内容与冻结清单一致"（即 bindPlanSourceToCommit 的用途）。
"队列自己与自己相等"确实不构成归属证明——真正的跨落盘交叉证据是：Worker 侧 code-sync proof 按 `projectId + codeFingerprint` 取原始清单
（`PlanCodeScope.ts:193-196`），以及队列快照/清理记录同时携带 `planRevision + codeFingerprint + commandId`
（`DistributedPlanQueue.ts:135-143 ClearedDistributedJob`；`:477-487 reviewedTrainingCompletion` 的 `expected` 含三者）——
可据此核对"该 commandId 属于该 codeFingerprint"，**无需新协议**。

## C. 最窄缺口（数据足够，缺的是回归网与交付字段）
1. **契约无测试**：全 test 树 grep `FORMAL_JOB_IDENTITY_CONFLICT` / `duplicate workflow has different declarations` 只命中源码
   `DistributedPlanQueue.ts:1012`，无任何断言。落点 `test/features/distributedPlanQueue.test.js`（已直接用 `enqueuePlan`）：
   同 id 下分别换 `codeFingerprint / revision / planFile / executionMode / 逐 job 声明` 各拒一次；全同则不重复入队且不新增 job。
2. **选优视图缺 codeFingerprint 与确证归属**：`legacy.ts:2062-2064` 只给截断 24 字符的 `revision` + `hasExecutionSource`。
   在既有读盘投影里附带 `plan.codeFingerprint` 全值 + 逐 job `{commandId, hasVerifiedCompletion}`（全是现成字段）即可闭环，不新增结构。
3. **已可依赖的既有测试**（无需新建文件即能守该边界）：
   `test/features/workerCodeVersionIsolation.test.js:108`「old pending job uses the original Worker's durable proof after the local code changes」、
   `:131`「…uses a verified matching manifest and preserves the pending command」、
   `test/features/distributedPlanQueue.test.js:73`（不同身份不被 clear 抑制）、`:169`（换 command 不改声明路径）、
   `:267/:289/:302`（不同指纹的 plan/Worker 隔离）、`:382`（冷恢复用全身份服务端行）、
   `test/features/formalIdentityContract.test.js:8/:15`、`test/features/planCodeScope.test.js`（PLAN_SOURCE_* 闸）。

## D. 本追加的范围声明
只答版本归属一问；未新增 Worker 协议/服务/科学哈希；未写实现/测试/Git/公共 plan；未编译未跑测试未联网。

## E. 第六轮追加：B 的 executionSource 能否写回仍标 A 指纹的原 plan（只读 92 Git 对象）

问题原文要点：Worker 侧 `inspect_plan_code_scope`（`runtime/PlanCodeScope.ts:169-217`）仅在**未传** executionSource 时按 `projectId+codeFingerprint` 查 proof；传了 source 时 `verify_plan_execution_source` 只核 digest 自洽、`manifest[planFile].sha256===revision`、依赖集合与各文件字节，**不核该 manifest 来自队列 plan 标注的 codeFingerprint**。而 `legacy.ts:14952` 的 `sourcePlan.codeFingerprint` 来自 `lastCodeSyncState`（本机当前=B），`:14959-14961` 只复核这个临时新指纹没再变（B vs B）。疑点：同 PLAN 多 jobs、一旧 job 已确证 A、另一 job 重跑时本机依赖已变 B 而 PLAN 文件 revision 未变，是否会把 B 的 executionSource 写回仍标 A 的原 plan，旧 job 留 A proof，使 C4 把整个 plan 误判为 B 下已验。

### E1. 结论：该写回路径在 92 上不存在，但原因不是有 A vs B 比较，而是重跑根本不落在原 plan.id 上

逐段原文（全部 `git show 92fcd8e8…:src/extension/legacy.ts`）：

1. **`retryPulledJob`（函数头 :14528，止于 :14879）内的唯一 executionSource 读写**：
   ```ts
   // :14637（该函数唯一构造 body 处，全文再无 body.executionSource 赋值）
   const body: any = { planFile: plan.planFile, planRevision: plan.revision, options: {},
     workerSubmissionSnapshots: [], runReplacement: {} };
   // :14863
   const drift = selectedIdentityDrift(current, current?.jobs.find(row => row.index === job.index));
   // :14868  —— 14528-14879 全段 executionSource 仅此一处出现
   if (body.executionSource) current.executionSource = body.executionSource;
   ```
   `body` 从 :14637 起从未被赋 `executionSource`，故 :14868 的 `if` 恒假——**这是死代码，不是写回通道**。全文件 14600-15000 内唯一给 `body.executionSource` 赋值的是 :14953（属另一函数）。

2. **`selectedIdentityDrift`（:14593-14605）确系队列 vs 队列（A vs A）**：
   ```ts
   if (cardNow?.revision !== plan.revision) drift.push("revision");
   if (cardNow?.codeFingerprint !== plan.codeFingerprint) drift.push("codeFingerprint");
   ```
   `cardNow` 来自 `fenceOriginalIdentity`(:14606) 重新 `loadDistributedQueue`。本机依赖变成 B 不改队列里 A 的标注，所以整段漂移检查**不会**发现 A→B；`assertOriginalCommands`（:14904-14911）同样只把 `latest.revision/codeFingerprint` 与捕获的 `plan`（都是 A）比。:`14940-14942` 与 :14960-14961 全部是 `acceptedFingerprint`/`lastCodeSyncState` 即 B vs B。**整条路径不存在任何"新指纹 B == 原队列 plan.codeFingerprint A"的比较，也没有以 A 为基准拒绝 B 的显式拒绝点**——这是事实，不是我的推断。

3. **真正的防线是落点换了 plan.id + `enqueuePlan` 同 id 冲突**：
   ```ts
   // :14883  acceptedFingerprint = await this.localDistributedCodeFingerprint(root);   // = 当前本机 = B
   // :14896-14897 rerunScopeKey = sha256([plan.id, selectedOld…, all, acceptedRevision, acceptedFingerprint]);
   // :14900-14903 rerunDecision = selectRerunWorkflowInstance(…, rerunScopeKey); rerunWorkflowId = rerunDecision.workflowId;
   // :14922
   const body: any = { planFile: plan.planFile, options: {}, runReplacement: {}, submissionWorkflowId: rerunWorkflowId };
   ```
   `plan-run-intent-selector.ts:14-15`：`rerunWorkflowBaseId = "distributed-plan-rerun-" + scopeKey`；`:23-48` 同族已有活跃批次时给 `-rN`。即 B 轮次入队目标是 `distributed-plan-rerun-<hash>[-rN]`，**不等于原 `plan.id`**。且即便有人想同 id 覆盖，`DistributedPlanQueue.enqueuePlan:1005-1012` 会对 `registered.codeFingerprint !== plan.codeFingerprint` 抛 `FORMAL_JOB_IDENTITY_CONFLICT`。:14953 解析出的 B manifest 与 :14955/:14960 的 `verifyLocalPlanSource` 全部作用于 `sourcePlan`(:14952)（一个 `{...plan, revision: acceptedRevision, codeFingerprint: lastCodeSyncState, executionSource: undefined}` 的临时副本），再经 :14957 `new PlanRunHost(…).replace(sourcePlan, body, scoped)` 走新 instance。
   未被重跑的旧 job **留在原 A plan 里且 A proof 原样有效**——这是 :14885-14887 弹窗文案明示的设计（「仅重跑当前 job 会保留其他 job 的旧版本结果」）。

### E2. 对 C4 的实际含义（不修码，仅证据）
- 「B 写回 A plan → C4 对全 plan 误过」这条具体链路**不成立**：A plan 恒标 A、B 轮次恒在新 id。
- 真实暴露面是**同 planFile 双条目并存**：A plan（含未动 job 的 A proof）与 `-rN` plan（重跑 job、B 指纹）长期共存。C4' 若按 `planFile` 聚合/取"该文件全部 job 已验"，会把 A proof 记到 B 轮次头上——等价于误过。门禁必须**只按 plan.id 取其自身 `{revision, codeFingerprint, executionSource}`** 与该项 job 的 proof 闭合，禁止 planFile 级聚合（`legacy.ts:12488` 一带存在 `sameDistributedPlanFile` 型匹配先例，C4 选路不得沿用）。
- 附带事实（非本轮问题、不展开）：`hasVerifiedCompletion`（VerifiedCompletion.ts）的条件不含 `outputRetiredAt`；`retainExistingOutputs` 为真时 proof 判否（`!job.retainExistingOutputs` 条件 + `DistributedPlanQueue.ts:204` 将其置 cancelled）。输出退役与 proof 存续的交界未在本轮范围内验证，仅记录字段事实。

### E3. 范围
只读 92 显式 Git 对象（legacy.ts、plan-run-intent-selector.ts、DistributedPlanQueue.ts、VerifiedCompletion.ts），未读变动工作树；未测试/未联网/未写入业务源/Git/公共 plan；未修任何代码。冻结 92 的只读需求到此结束，可释放。
