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
- [已完成] 5/5 project-254：修复 Worker 可用性刷新、远端根目录预览、conda 环境门禁、上传清单打包和旧托管路径提醒。
- [已完成] 4/4 project-252：在插件设置页显示并保存远端根目录安全边界。
- [已完成] 4/4 project-251：从旧服务器配置预填远程根安全边界。
- [已完成] 5/5 project-250：删除固定远程根映射并改用用户配置根目录和安全边界。
- [已完成] 6/6 project-249：恢复命名迁移丢失的服务器配置、tmux 前缀设置和手动服务器配置流程。
- [已完成] 8/8 project-248：公共 simple 命名迁移、旧归档/Xshell 兼容和远端 tmux 前缀配置。
- [已完成] 8/8 project-247：TensorBoard 依赖探测、workflow.plan/run 标准路由和基础设施准备解耦。
- [已完成] 6/6 project-236：SimpleSFTP 本机 JSON-RPC/HTTP API、CLI、OpenAPI、参数化非交互方法与确认门禁。

## 当前批次：project-254（已完成）
### 边界

- single_worker 调度先做有界 Agent 可用性刷新；失败时返回 workerId、state key、lastSeenAt、TTL、agentStatus 和建议动作。
- 可用性时效用本机接收时钟计算，拒绝超过 300 秒的未来时钟偏差，快照合并使用临时文件原子替换。
- project.prepare、Agent 配置、上传确认和调度目标继续共用用户配置根目录与 allowed/denied 检查；预览补充最终 projectPath。
- 空、null 和占位符 condaEnv 视为未配置；project.prepare、Agent 启动、workflow.run、scheduler launch 与 Worker command 均拦截。
- 全量和 manifest 上传先生成文件计划，通过 NUL 分隔临时清单传给 tar，分块记录 SHA-256，返回数量、字节、排除命中、耗时和校验方式。
- 新状态固定使用 simple_cluster；遇到 zlk_cluster 时只提示人工核对删除，不自动删除，也不改写归档或结果路径。

### 验证清单
- [已通过] SimpleExperiment build/typecheck、`npm test` 1158/1158、lint、`git diff --check`。
- [已通过] SimpleSFTP `node --check`、`npm test` 37/37、`git diff --check`。
- [已通过] 两插件分别打包 VSIX；未连接真实服务器，未执行真实 Xshell/SFTP 现场传输。

### 相邻回归风险

- Worker Agent availability GET 在 loopback 内免 token；非 loopback 仍拒绝。部署新 runtime 前旧 Agent 不具备直接刷新路由。
- 已有本地/远端 `zlk_cluster` 目录必须人工核对后手动删除；插件不会代删。

## 本批记录
- 批次提交后以本仓库提交、推送记录和 `simple-experiment-0.4.6.vsix` 为准。
