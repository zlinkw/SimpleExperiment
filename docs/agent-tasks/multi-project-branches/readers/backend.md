# 后台业务只读调查 evidence（reader=backend，2026-10-25）

冻结身份：commit a9fc3d36629eeeb6bb71b183d59731e209ccac5a，tree=82e27df5dfc87e188e1273a1e8d99b4e1cef5068（rev-parse 实测一致）。全部经 `git -C /repos/MCP/zlk-cluster-orchestrator show/ls-tree/archive a9fc3d36` 读取；未读 b65 工作树内容当最新；未触碰 dubious-ownership 树。
导出副本：/tmp/pi-reader-backend-a9/frozen（tree 校验一致，仅本人 scratch）。
环境阻塞：分配 evidence cwd /repos/.pi-multi-branch-readers-20261025T0555/backend 为 root:root drwxr-xr-x，当前 uid=1000(node) 不可写（mkdir Permission denied，已实测一次，未绕过权限）；本片段落 /tmp，主控可代拷。

## 1. 域概念实情（源码锚点）

- `innovation` 在 a9 src 全库 **0 命中**（git grep -il，exit=1 空结果）。`创新/祖先` 中文仅出现在清理/同步文档，语义=目录祖先（path ancestor），非科研祖先。
- `ancestor` 全部命中=路径祖先安全检查：ProjectRootMap.ts:195-226（includeAncestors fail-closed）、legacy.ts:9910/10186（ancestorHold 同步保留）、PlanCleanup.ts:176。
- `branch` 仅两类：GitBackup.ts:172-175（post-commit 推当前分支 `git symbolic-ref --short HEAD` 到 origin，不管理分支）；ProjectRootMap.ts:163 注释。
- `candidate` 全部=遍历变量/清理候选/最新版候选，无“创新候选”实体。
- 无 gitBranch/git_commit 注入任务派发（全 src 仅 GitBackup hook 与结果 provenance 读取处，见 §4）。

## 2. 项目/工作流模型（真实现）

- 单工作区强绑定：extension/legacy.ts:8854-8856 `workspaceFolders?.length !== 1` → “请先单独打开一个项目工作区”；WorkflowWorkspaceBinding.ts:21-34 绑定 canonical+dev+inode，变更即拒（"workflow 工作区…未继续准备或提交"）。
- workflow API 面仅 `workflow.plan` / `workflow.run`（LocalApiServer.legacy.ts:672-674；ApiWorkflow.legacy.ts:300-301；CLI WorkflowRun.ts:13-36：绑定校验→seed 合同→plan 预检→route 身份核对→提交）。= 当前项目单 PLAN 准备/预检/提交流，非跨项目管理流。
- project API 面仅 project.prepare / project.bootstrap / project.bootstrap.operation（projectOps.ts 头注 legacy.ts:2254/2788/2874 参数镜像）与 project.status（project.ts 读本窗口）。无 project list/switch/register/merge/approve。
- 项目身份：project_state_namespace = basename + sha256(absPath)[:16]（clusterAgentRuntime.legacy.ts:528-533）→ 身份=路径派生，不绑定 git remote/commit/分支；clone 即新身份。
- 每项目独立状态与队列：resolve_agent_state_dir 强制 `<...>/projects/<namespace>`，注释“Shared state dir is unsafe: multiple projects would clobber”（:538-556）；ui-plan 计划文档同证“每个实际消费项目各有自己的 projectRoot/simple_cluster”。
- 多窗口并行=多实例各自 Local API：LocalApiClient.ts:102-126 discovery+live handshake+`--instance pid:startedAt` pin，跨窗拒绝歧义监听；无聚合 API。

## 3. 调度与同 Worker GPU 统一性

- 跨项目统一调度：**不存在**。ServerQueueDispatch.ts serverQueueCards/quotaQueuePlacements 仅本窗口本项目的 job→(worker,gpu) 配额放置；SmartScheduler/DistributedSchedulingPolicy 同域。
- GPU 采集统一：**已实现（源码层）**。GpuCollector.ts:2-38：每 Worker 一个采集循环（tmux `se-gpu-collector-<sha(workerId)>`，身份只含 Worker id，“two projects can never each start their own collector”）；状态根=SIMPLE_EXPERIMENT_WORKER_STATE_DIR 或 `~/.simple-cluster/worker-state`（gpu_collector_state_root 故意忽略 project root，:53-64）；因果准入（epoch+seq+monotonic 界限，无默认值 fail-closed）。测试：test/agent/gpuCollectorFrame.test.js(+fixture/RealTmux)、gpuMemoryAdmission、gpuQuotaAdmission、idleGpuDurableAdmission 在。
- GPU 互斥：**每项目 Agent 进程内** DISTRIBUTED_GPU_RESERVATIONS dict + WORKER_TASK_SNAPSHOT_LOCK（agent runtime :282, 4034-4108）；reserve 时实时帧进程列表/util/mem 判忙拒绝。ResourceOperationLease 冲突判定=同 server 且 target 路径嵌套（ResourceOperationLease.ts:52-58）→ 不同项目路径天然不互斥。HostOperationLease（%LOCALAPPDATA%/SimpleExperiment/host-operation-lease.json，30s TTL 心跳）做主机级窗口操作登记，但按 windowId/workspace 记录，未见 GPU 级跨项目预留。
- 结论：**两项目 Agent 并发准入同一空闲 GPU 之间无共享预留账本**，互斥依赖准入瞬间实时探针（≥请求边界的新帧）。存在“双项目同测空闲→先后放行”的窄竞态窗口（探针后至进程启动前）；require_idle_gpu 模式最接近强互斥但仍是探测式。此为源码层缺口，运行时是否实际发生须宿主取证（我不判定已装实例行为）。
- future-gpu-roots-v1-implementation.md（docs/plans/，2026-10-22 批准）= GPU 单采集源+四根映射计划；其“根”是程序/状态/代码/产物四根，与用户“祖先项目”概念无关；阶段3 判定“条件未成立”。

## 4. 结果/证据归属（真实现，项目内粒度）

- 任务身份 DURABLE_PLAN_IDENTITY_FIELDS=projectId, workflowId, planFile, planRevision, codeFingerprint, experimentIndex, case, seed, attempt, outputDir, runKey, commandId, workerId（agent runtime :2738-2742）；code_sync_proof 绑 projectId+fingerprint+manifestDigest+scope（:2807-2809）；准入凭证禁跨项目/跨命令复用（:4060-4066 注释）。
- ResultOwnershipScope.ts:26-55：按 planFile 精确归属过滤混合/匿名结果（“已隐藏混合或匿名产物”）。distributedResults 镜像要求哈希匹配、不同哈希停止不覆盖（docs/distributed-plan-results.md）。
- 结果 git 溯源：项目侧 adapter 模板写 `git rev-parse HEAD` 到 env 快照（ProjectAdapterTemplates.legacy.ts:134、Quality.legacy.ts:454）；agent 汇总 provenance.gitCommit/codeFingerprint（runtime :11188）；Quality 门 `git_commit_recorded` 警告（Quality.legacy.ts:78/479）；ExperimentConfigRecovery/ResultAnomaly 消费之。→ 证据可回溯到 commit（分支需 git 外部换算），插件不记录分支名。
- PLAN provenance 类型含 branch/gitCommit/author/parentPlanId/parentRevisionId（PlanBuilder.legacy.ts:96），但构造处只写 baseConfig（:1424）与派生 parentPlanId/parentRevisionId（:1545，SmallScale.legacy.ts:258-259）。branch/gitCommit 字段为**被动元数据，无自动填充、无决策消费**。

## 5. 审批/合并/祖先更新接口

- 无任何分支审批/合并/祖先更新实现。现有“merge”= SyncLatestMerge.ts（Worker 间结果文件最新版按 sha256 合并）与 distributed.mergeModule（结果片段汇总 CSV），皆非代码分支合并。
- “approve”仅清理路径逐条确认（PlanCleanup.ts:912-922 backendToken/digest 机制）。
- GitBackup=提交即推当前分支；同步/计划流均无 PR/merge/祖先推进接口。产品自身 PR 流程（container-worktree-pr）是开发规约，不是产品能力——与“科研创新分支管理”是两个层面，须向用户澄清。

## 6. 用户今天能否做 + 最短真实流程（源码层推断，实际运行状态待宿主取证）

可以做“每分支一份独立项目副本”的分立验证，不能做统一管理/统一调度/审批合并：
1) 每个创新分支 checkout 到各自 clone；每 clone 一个 VS Code 窗口 + 项目接入（project.prepare/bootstrap）。
2) 各窗口各自建 PLAN（筛查 comparison/、正式 formal/，distributedResults 可开）；workflow.plan→workflow.run 或面板提交。
3) 同 Worker 被多项目共享：GPU 采集单源；派发各自队列，互斥靠空闲探测（竞态窗口见 §3；错峰或 require_idle_gpu 更稳）。
4) 结果/证据各归各项目/PLAN/commit（§4），跨分支对比需在 git/文档层人工换算分支↔commit 后对照。
5) 验证好的分支合并回祖先：完全人工 git 操作；插件仅提供 GitBackup 推送与 clone 间人工同步。

## 7. 缺口与最小改动方向（仅报告，不实施）

- 缺口A 分支身份绑定：任务/结果身份无 branch/git-ref。最小=派发/结果 provenance 增加工作区 `git rev-parse HEAD`+`symbolic-ref` 只读快照字段（复用 GitBackup 既有命令与 §4 provenance 通道），不动调度。风险：低；纯增量字段，不改身份主键。
- 缺口B 跨项目 GPU 预留账本：机器级共享预留文件（worker-state 根，同 GPU collector 单源模式 flock）替代纯探测互斥。风险：中——需与既有进程内 reservation 及故障恢复语义融合，属设计级改动，应走原计划文档流程。
- 缺口C 跨项目聚合视图/统一调度与审批合并：产品无此实体（§2/§5）。属新功能（需项目注册表、聚合 API、审批工作流），非小改；建议先按 §6 流程使用，确有需求再由主控立项。
- 既有可复用件：ProjectRootMap 四根只读视图、plan provenance parent 链、ResultOwnershipScope、HostOperationLease 主机登记、multi-instance CLI pin。

## 8. 相关既有测试（a9 test/）

projectRootMap / distributedProjectContract / workflowWorkspaceBinding / resultOwnershipScope / gitBackup / projectStatePaths / serverQueueDispatch / serverQueueLifecycle.integration / syncLatestMerge / gpuCollectorFrame(+RealTmux) / gpuMemoryAdmission / gpuQuotaAdmission / idleGpuDurableAdmission(+DispatchLifecycle.integration) / gpuSubmittedJobOwnership / qualityManagement / smallScaleManagement / hostOperationLeaseIntegration / formalIdentityContract / distributedQueueStartup* 系列。未见任何“多项目管理/分支合并”测试（与缺口一致）。

## 剩余未知（需主控/宿主取证，非本人范围）

- a9=GitHub master 冻结版，但 CHANGELOG 顶=0.5.401 而已装 409：409 与 a9 源码差异、实际安装 dist/Agent 版本、真实 Worker 上 collector 是否启用/帧状态，均未验证（只读源码不能证明运行态）。
- 双项目 GPU 竞态是否在实际部署中发生过：需 Worker 日志取证。
- docs/agent-tasks 下 ui-plan-gpu-progress-20261024 与另一仓 SimpleSFTP 的交界仅见文档，未展开（与本问题域弱相关）。
