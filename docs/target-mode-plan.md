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
- [已完成] 5/5 project-250：删除固定远程根映射并改用用户配置根目录和安全边界。
- [已完成] 6/6 project-249：恢复命名迁移丢失的服务器配置、tmux 前缀设置和手动服务器配置流程。
- [已完成] 8/8 project-248：公共 simple 命名迁移、旧归档/Xshell 兼容和远端 tmux 前缀配置。
- [已完成] 8/8 project-247：TensorBoard 依赖探测、workflow.plan/run 标准路由和基础设施准备解耦。
- [已完成] 6/6 project-236：SimpleSFTP 本机 JSON-RPC/HTTP API、CLI、OpenAPI、参数化非交互方法与确认门禁。
- [已完成] 7/7 project-237：SimpleExperiment 本机 JSON-RPC/HTTP API、CLI、OpenAPI、SFTP API 桥接与确认门禁。
- [已完成] 9/9 project-241：参数化首次接入、结构化校验、可轮询 bootstrap、流程状态持久化和 Plan 过滤。
- [已完成] 5/5 project-242：解耦基础设施准备与 PLAN 校验，支持显式 Plan 选择和非阻塞多 PLAN 提示。

## 当前批次：project-251（已完成）
### 边界

- 从既有 Hub/Worker 根目录、SimpleSFTP 共享服务器配置和 Remote SSH 安装路径推导候选远程根。
- 仅当 `remote.allowedRoots` 或 `remote.deniedRoots` 尚无显式值时写入对应数组；用户决策优先。
- 预填 `/root/**` 不安全候选和旧命名迁移产生的 `zlk -> simple` 同级路径防护。

### 验证清单
- [已通过] 预填推导、显式配置保护、一次性执行、build/typecheck、`npm test` 1148/1148、lint、8 个 Python AST、`git diff --check`。
- [已通过] `simple-experiment-0.4.3.vsix` 打包、runtime closure 校验并安装；未重载 VS Code。

### 相邻回归风险

- 不再提供任何服务器名到存储路径的内置映射；未配置路径会明确缺失，而不是被静默改写。

## 本批记录
- 批次提交后以本仓库提交、推送记录和 `simple-experiment-0.4.3.vsix` 为准。
