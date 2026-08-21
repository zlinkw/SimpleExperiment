# 目标模式当前计划：AI 首次接入闭环
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 服务器拓扑必须支持“单 Worker”“仅多 Worker”“Hub 可用”三种模式；无 Hub 模式由各 Worker 自行调度且不尝试创建 Hub 或跨节点备份，详细契约与实施流水见 `docs/target-plans/worker-topology-modes.md`。
- 全局约束：不迁移、删除或重写旧任务和结果，不处理历史 VSIX 或未跟踪 `zlk_cluster/ui/`；禁止“父级 evidence key 被子文件 archive 反向命中”。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- `metrics_summary.csv`、PPT 和论文证据只读取最终归档结果；PPT 绘图目标确认先于 automation，PPT 绘图链路与 realtime post gate 稳定化持续保留。
- GPU 历史和 Docker 兼容验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`；新增补充任务不得破坏当前主目标，计划更新必须防止修复循环。
- 长时间 Webview payload 预算：`schedulerStates`、`experimentTraces` 必须有界；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 必须保留。
- 连接边界固定为 Xshell 本地隧道 + 可选 Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。

## 后续优先级
- [已完成] 8/8 project-248：公共 simple 命名迁移、旧归档/Xshell 兼容和远端 tmux 前缀配置。
- [已完成] 8/8 project-247：TensorBoard 依赖探测、workflow.plan/run 标准路由和基础设施准备解耦。
- [已完成] 6/6 project-236：SimpleSFTP 本机 JSON-RPC/HTTP API、CLI、OpenAPI、参数化非交互方法与确认门禁。
- [已完成] 7/7 project-237：SimpleExperiment 本机 JSON-RPC/HTTP API、CLI、OpenAPI、SFTP API 桥接与确认门禁。
- [已完成] 9/9 project-241：参数化首次接入、结构化校验、可轮询 bootstrap、流程状态持久化和 Plan 过滤。
- [已完成] 5/5 project-242：解耦基础设施准备与 PLAN 校验，支持显式 Plan 选择和非阻塞多 PLAN 提示。
- [已完成] 4/4 project-243：新增 workflow.plan / workflow.run 标准路由，减少 AI 反复读代码和误选接口。
- [已完成] 5/5 project-244：SSH/SFTP 目标优先使用 OpenSSH/Xshell 别名，并按 serverIds 约束 runtime 部署范围。

## 当前批次：project-249（已完成）
### 边界

- 修复公共命名迁移把 legacy extension ID 和 legacy globalState key 误替换成当前值的问题；迁移版本升到 2 并重新检查。
- 支持从旧扩展数据库和当前扩展的旧 public key 中选择更完整服务器配置，恢复到新的 simple key。
- 在服务器设置 Hub 卡片显示并保存 tmux 会话前缀。
- 首次接入和配置检查不再弹出从零初始化服务器向导；Hub/Worker/Xshell/父目录统一在“设置 > 服务器”手动维护。
- 项目接入在服务器就绪后只提示一次 tmux 会话前缀，并可跳过使用当前值。
- 不直接改写 VS Code 状态数据库；迁移仍由插件启动时通过 VS Code globalState 执行。

### 验证清单
- [已通过] 迁移单测、真实状态只读演练（识别 3 个 Worker）、build/typecheck、`npm test` 1144/1144、lint、8 个 Python AST、`git diff --check`。
- [已通过] `simple-experiment-0.4.1.vsix` 打包、runtime closure 校验并安装；未重载 VS Code。

### 相邻回归风险

- 只在当前 simple 配置不完整时恢复更完整的旧配置；已完整的新配置不会被覆盖。

## 本批记录
- 批次提交后以本仓库提交、推送记录和 `simple-experiment-0.4.1.vsix` 为准。
