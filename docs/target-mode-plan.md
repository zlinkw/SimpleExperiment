# 目标模式当前计划：AI 首次接入闭环
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 服务器拓扑必须支持“单 Worker”“仅多 Worker”“Hub 可用”三种模式；无 Hub 模式由各 Worker 自行调度且不尝试创建 Hub 或跨节点备份，详细契约与实施流水见 `docs/target-plans/worker-topology-modes.md`。
- 全局约束：不迁移、删除或重写旧任务和结果，不处理历史 VSIX 或 `zlk_cluster/ui/`；禁止“父级 evidence key 被子文件 archive 反向命中”。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- `metrics_summary.csv`、PPT 和论文证据只读取最终归档结果；PPT 绘图目标确认先于 automation，PPT 绘图链路与 realtime post gate 稳定化持续保留。
- GPU 历史和 Docker 兼容验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`；新增补充任务不得破坏当前主目标，计划更新必须防止修复循环。
- 长时间 Webview payload 预算：`schedulerStates`、`experimentTraces` 必须有界；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 必须保留。
- 连接边界固定为 Xshell 本地隧道 + 可选 Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。

## 后续优先级
- [已完成] 6/6 project-236：SimpleSFTP 本机 JSON-RPC/HTTP API、CLI、OpenAPI、参数化非交互方法与确认门禁。
- [已完成] 7/7 project-237：SimpleExperiment 本机 JSON-RPC/HTTP API、CLI、OpenAPI、SFTP API 桥接与确认门禁。
- [已完成] 9/9 project-241：参数化首次接入、结构化校验、可轮询 bootstrap、流程状态持久化和 Plan 过滤。
- [已完成] 5/5 project-242：解耦基础设施准备与 PLAN 校验，支持显式 Plan 选择和非阻塞多 PLAN 提示。
- [已完成] 4/4 project-243：新增 workflow.plan / workflow.run 标准路由，减少 AI 反复读代码和误选接口。
- [已完成] 5/5 project-244：SSH/SFTP 目标优先使用 OpenSSH/Xshell 别名，并按 serverIds 约束 runtime 部署范围。
- [已完成] 6/6 project-245：运行前强制验证结果输出接口，支持 wrapper、显式 adapter 调用和 TensorBoard scalar，并清理 dry-run 临时文件。
- [已完成] 4/4 project-246：把 SimpleExperiment 和 SimpleSFTP 的项目硬性契约写入插件文档与 simple-local-api SKILL。

## 当前批次：project-247（已完成）
### 边界

- SimpleExperiment `0.3.8` 将 TensorBoard 转换前的依赖探测统一走 `tensorboard_conversion_available()`，避免异常 spec 导致崩溃。
- 增加 fake EventAccumulator 回归测试，验证最终 scalar 写入标准 CSV并补齐快照。
- `workflow.plan` 返回唯一 nextAction、精确参数模板、结构化缺失和拓扑状态；AI 不再自行拼接 validate/dry-run/upload/run 调用链。
- `workflow.run` 复用既有 runPlan 安全路线，立即返回 operationId；实际提交由 VS Code 模态弹窗人工确认，不靠 AI 传运行确认信号。
- 基础设施准备只检查 workspace、服务器、拓扑、Xshell、SFTP 和 Agent runtime；PLAN 选择提示不阻塞 `confirm:true` 后的 prepare。
- 多 PLAN 未选择时返回 `validate_plan` 结构化提示；单 PLAN 自动选择；无 PLAN 返回结构化缺失。bootstrap 在 prepare 成功后单独执行 `plan.validate`。

### 验证清单

- [已通过] SimpleExperiment `npm test` 1143/1143、lint、package 和安装检查。
- [已通过] SimpleSFTP `npm test` 33/33、`node --check`、`git diff --check`。
- [已通过] 推送 `6f05d52`，本地 HEAD 与 `origin/master` 一致。
- [已通过] 推送 `bc188d5`，本地 HEAD 与 `origin/master` 一致。

### 相邻回归风险

- 不改变既有 UI 命令入口；参数化 API 只在非 UI 或显式 structured/api 模式下接管。

## 本批记录
- 完成后以两个仓库的批次提交和 VSIX 构建记录为准。
