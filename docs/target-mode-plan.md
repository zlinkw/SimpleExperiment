# 目标模式当前计划：前后端静态优化周期
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
- [已完成] 1/5 后端：审计 Scheduler 作业构建与配置渲染。
- [已完成] 2/5 前端：优化计划参数与配置检查器的差异呈现。
- [已完成] 3/5 后端：审计结果解析与统计的输入校验。
- [已完成] 4/5 前端：优化实验追踪分区的状态归因。
- [已完成] 5/5 前后端：执行第二十四轮非服务器静态测试。

## 当前批次：autonomous-static-120（已完成）
### 修复点

- 执行完整非服务器测试、Lint、关键 Node/Python 语法和包运行时静态校验。
- 核对前四批后端与前端修改的整体验证结果，不新增产品行为。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 完整测试不得触发真实服务器、Xshell 会话或文件传输。
- 包运行时校验只检查静态产物，不执行打包、安装或 VS Code 操作。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 完整 `npm test` 与独立复测，838/838。
- [已通过] Lint、5 个关键 Node 入口与 2 个 Python runtime 文件语法。
- [已通过] 包运行时静态闭包校验：51 个本地模块、5 个入口。
- [已通过] `git diff --check` 与最终工作树审计。

## 本批记录
- 本批不执行截图；不操作 VS Code、服务器或安装包。
- 首次完整测试暴露拓扑契约断言仍要求固定 Hub；已更新为“可选 Hub”并完整复测通过。
- 提交记录：验证通过后使用独立 `test` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 三类拓扑实施仍按 `docs/target-plans/worker-topology-modes.md` 排队，不并入本批。
