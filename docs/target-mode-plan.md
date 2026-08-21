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
- [已完成] 8/8 project-247：TensorBoard 依赖探测、workflow.plan/run 标准路由和基础设施准备解耦。
- [已完成] 6/6 project-236：SimpleSFTP 本机 JSON-RPC/HTTP API、CLI、OpenAPI、参数化非交互方法与确认门禁。
- [已完成] 7/7 project-237：SimpleExperiment 本机 JSON-RPC/HTTP API、CLI、OpenAPI、SFTP API 桥接与确认门禁。
- [已完成] 9/9 project-241：参数化首次接入、结构化校验、可轮询 bootstrap、流程状态持久化和 Plan 过滤。
- [已完成] 5/5 project-242：解耦基础设施准备与 PLAN 校验，支持显式 Plan 选择和非阻塞多 PLAN 提示。
- [已完成] 4/4 project-243：新增 workflow.plan / workflow.run 标准路由，减少 AI 反复读代码和误选接口。
- [已完成] 5/5 project-244：SSH/SFTP 目标优先使用 OpenSSH/Xshell 别名，并按 serverIds 约束 runtime 部署范围。
- [已完成] 6/6 project-245：运行前强制验证结果输出接口，支持 wrapper、显式 adapter 调用和 TensorBoard scalar，并清理 dry-run 临时文件。

## 当前批次：project-248（已完成）
### 边界

- 将插件自有 `zlk_cluster`、`zlk_agent`、`zlk_project.yaml`、配置命名空间、环境变量、header 和 CLI 标识等价迁移为 `simple` / SimpleExperiment 命名。
- 新增 `simpleExperiment.tunnel.remoteTmuxSessionPrefix`，默认 `simple`，可设为用户名或旧 `zlk` 以区分共用服务器上的 Agent 与任务 tmux 会话；前缀传入远端 runtime。
- 兼容读取旧归档标记和旧受管 Xshell RemoteCommand；不自动改写用户路径或历史证据。
- 保护未跟踪 `zlk_cluster/ui/` 和历史 VSIX；不执行真实服务器连接。

### 验证清单
- [已通过] build/typecheck、`npm test` 1143/1143、lint、119 个 dist JS `node --check`、8 个 Python AST 检查、`git diff --check`。
- [已通过] 残留审计仅保留用户路径、兼容解析、受管忽略规则和测试中的显式旧前缀样例。
- [已通过] `simple-experiment-0.4.0.vsix` 打包与 runtime closure 校验；VSIX 不包含本地 `zlk_cluster/` 状态，已安装但未重载 VS Code。

### 相邻回归风险

- 公共命名是破坏性迁移；保留旧归档/Xshell 识别兼容，但新项目契约要求 SimpleExperiment >= 0.4.0。

## 本批记录
- 批次提交后以本仓库提交、推送记录和 `simple-experiment-0.4.0.vsix` 为准。
