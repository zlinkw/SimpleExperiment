# Windows 流程审计与提速

基准：Windows 0.5.289（1802054c），Mac 非更新移植 91177e7e。
覆盖交互被 8a95b516 的 declared 分支替换，早于 Mac 移植，不能将其全部归因于 Mac。

## 不变的边界

自动同步、静态入口探针、全部已启用 Worker 检查、正式输出目录创建保留。
校验包含同步写入，纯结构计算和清理预览仍只读。
新任务使用 declared；不创建 attempt。Conda 由用户和项目管理。
辅助 Agent 由配置的精确 tmux 窗口控制，任务登记不能阻断重启。
指标原文件只读内存；本机只保留汇总。数据与科研规则由项目管理。

## 第一批：校验职责

- Scheduler 结果路径检查只检查声明、配置、命令和作业间唯一性，不 import/exec 项目 resultPathValidator。
- Agent 普通解析和汇总不自动调用论文 claim 检查；旧手动入口保留。
- 入口探针保持静态，按文件身份缓存并合并同一请求；文件变化重新检查。
- Worker 版本查询覆盖全部目标，有界并行；版本检查不自动部署服务。
- API 使用既有同步、Scheduler 校验/预演逻辑，报告结构、Worker、未启动及项目科研未检查状态。
- 元数据快速路径刷新选中 PLAN；全 PLAN 操作和列表刷新继续扫描完整列表。

生产服务器和真实科研文件未被开发回归修改；实际预检耗时需匹配运行版本后验收。

第一批回归：真实 Worker 消息到 Scheduler 启动边界、选中作业及全 PLAN 路径门禁、持续进展/停滞/取消/异常 JSON、原 commandId、普通汇总零 claim 调用、静态入口缓存、既有同步清单复用及动态写入保护通过。完整 build 与面板 vm.Script 通过。未启动训练或调用真实服务器。

## 非更新 Mac 移植审计

| 来源 | Windows 原行为 / 当前影响 | 决定 | 回归 |
|---|---|---|---|
| 91177e7e 工作区绑定 | 原上下文代际检查上又重复 realpath/stat | 入口、最终写入检查物理身份；中间阶段检查根与代际 | workflowWorkspaceBinding、windowsWorkflowContract |
| 91177e7e CLI / LocalApiClient | 老 Windows capability 未新增 workspaceIdentityRechecked 字段便拒绝；CLI 重复 workflow.plan | 保留实时 discovery、工作区及监听身份检查；取消仅字段缺失拒绝；真实运行由服务端统一预检 | localApiClientContract、windowsWorkflowContract |
| 91177e7e seed 参数 | 新 flags 未真正实现任务覆盖 | 不支持的覆盖明确报错；不新增作业 | windowsWorkflowContract、分布式模式回归 |
| 91177e7e ResultOwnershipScope | 严格新字段可能隐藏历史登记 | 兼容明确 plan/selectedPlanId 别名；匿名历史仅只读指标“归属待核实”，不授予文件访问或完成身份 | resultOwnershipScope |
| 91177e7e PlanSafeRetry | 重试检查叠加入口工作区确认 | 保留原身份、停止回执、幂等和上下文检查；移除额外重复回调 | formalJobRejectedRecovery、Windows 工作流回归 |
| 7bb96599 更新功能 | 独立更新、配套安装、恢复及完整性门禁 | 保留；普通旧 CLI 不再依赖更新专用新字段 | extensionUpdates、pairedUpdateGate、publicReleaseBundle |
| 8a95b516 declared 冲突 | 早于 Mac 的改造移除了覆盖入口 | 恢复明确覆盖 / 补缺 / 保留 / 取消，复用安全清理服务，不回退整个源码 | planOutputReplacement、planOutputReplacementHost、planCleanup |

没有修改 Mac 仓库。Agent 专用 tmux 管理及更新流程保持 Windows 既有实现。

## 覆盖流程与 API

UI：选择 PLAN → 校验并提交 → “覆盖并重跑” → 精确产物预览 → 两次同批完整路径确认 → 全节点再次预检 → 安全删除 → 原正式路径提交。
“仅补跑缺失任务”对现有完成 job 调用真实 Worker / Scheduler 的只读完成哈希预检；不完整、陈旧 revision 或来源不一致时要求覆盖或取消。普通 Scheduler 与分布式队列均只提交剩余 indices。

复用现有 `plans.cleanup.preview/confirm/execute/status/resume`。单 job 可指定 `job: {workflowId, index, commandId, purpose: "replace_outputs"}`；此范围同时支持 completed / failed，保留 PLAN、配置、共享备份、汇总表及旧 revision 证据。裸 overwrite=true 不构成授权。
只读完成检查：`tasks.preflight({workerId, commandId, completedOutputVerify: true})`；要求匹配 `completedOutputPreflight=1`，不启动或重新入队。其 status/cancel 只控制诊断。

部分删除前先持久化产物生命周期隔离，自动镜像与收集跳过该 job，避免旧副本复活。部分失败保留原操作 ID，重连只核查，用户重新确认继续；已完成目标不重复删除。离线、活动写入者、共享或身份不明均不自动开始重跑。
容量预演不再因终态登记抢先拒绝覆盖入口，只报告需产物审核的 indices；真实队列保留旧记录，只有经清理服务完整完成的生命周期记录才解除登记冲突。新的 Writer 仍重新核实磁盘占用与原身份，永不转发 overwrite 标志。
SimpleSFTP 0.2.79 的批次预览容量为 4096，超量明确拒绝，不静默驱逐第一份预览；插件保留最多 512 个活动预览。大批次等待超过 30 分钟须重新预览与确认。

## 实际验证记录

同一临时 6-job 夹具，真实 Scheduler build_jobs + result_path_preflight，旧代码 0bf05161 与当前代码分别运行两次。项目回调读取并 SHA256 核验 12 MiB 合成文件；次数来自回调实际写入的夹具记录。

| 生产函数 / 相同夹具 | 首次 ms | 再次 ms | 两轮项目回调次数 |
|---|---:|---:|---:|
| 修改前 | 118.423 | 101.832 | 12 |
| 修改后 | 37.803 | 40.056 | 0 |

这里“再次”仅表示同进程及 OS 文件缓存，不能外推生产网络耗时。复现：`python -B -X utf8 test/features/windowsPreflightBenchmark.fixture.py`。真实 CLI 测试的 RPC 从 status/plan/status/run 四次变为 status/run 两次；run 服务端仍预检。

消费项目当前 quality_composition 根已无原七份顶层 PLAN，现有九份子目录 PLAN 均只读通过真实 Scheduler 展开、declared 命令/配置/收集契约；没有执行项目科研回调、生成配置快照、创建输出或更改任务预算。命令：`python -B -X utf8 test/features/multiModalDeclaredContract.fixture.py D:/GitRepo/MultiModal`。三种子并发、完整完成结果与篡改拒绝另由合成消息回归验证。

交付版本：SimpleExperiment 0.5.302，Scheduler/Agent 0.5.302；SimpleSFTP 0.2.79。运行端必须提供 projectManagedValidation=1；旧 Worker 不在任务中才失败，而在提交前提示更新。磁盘部署不等于已运行升级。
本轮不部署远端。安装后需 Developer: Reload Window，再由用户更新相应 Agent/Scheduler；实际插件 UI 和 Worker 启动前预检仍待此步骤完成后验收，不能以本机测试代替。

回归命令均逐文件串行：`npm run build`、`npm run test:windows-flow`；额外 formalJobExecution（真实 Writer、train→test、checkpoint 来源）、distributedPlanExecutionMode、planValidationOperationPayload、planPreflightProgressSpeed、automaticPreflightReadiness、projectRunPreflightWorkflow、planStructuralValidationCache、completedPlanWorkerMirror、extensionUpdates、pairedUpdateGate、publicReleaseBundle 通过。旧 operation payload 夹具已改为正式消息与精确审核，不再断言创建新 attempt 或将旧 revision 直接计为当前完成。SimpleSFTP build 及批次容量回归通过。
