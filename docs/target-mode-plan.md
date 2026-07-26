# 目标模式当前计划：前后端静态优化周期
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不迁移、删除或重写旧任务和结果，不处理历史 VSIX 或 `zlk_cluster/ui/`；禁止“父级 evidence key 被子文件 archive 反向命中”。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- `metrics_summary.csv`、PPT 和论文证据只读取最终归档结果；PPT 绘图目标确认先于 automation，PPT 绘图链路与 realtime post gate 稳定化持续保留。
- GPU 历史和 Docker 兼容验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`；新增补充任务不得破坏当前主目标，计划更新必须防止修复循环。
- 长时间 Webview payload 预算：`schedulerStates`、`experimentTraces` 必须有界；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 必须保留。
- 连接边界固定为 Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 当前不连接服务器，只执行本地静态检查且不重载、关闭 VS Code；每批最多 8 个源码/文档/测试文件并推送 `origin/master`，每 5 批执行一次全量静态测试。

## 后续优先级
- [已完成] 3/5 后端：审计 Scheduler 运行时派生。
- [待做] 4/5 前端：审计操作与事件视图派生。
- [待做] 5/5 前后端：执行第十九轮非服务器静态测试。

## 当前批次：autonomous-static-092（已完成）
### 修复点

- Scheduler Agent 状态目录派生拆分为 `compute_*` 与带缓存的 `resolve_*`。
- 绝对项目路径与配置目录组合命中缓存，避免每次事件写入重复 `resolve()` 与 sha1。
- 相对路径输入绕过缓存直接计算，缓存记录数超上限时整表清空。
- 增加复用、配置区分、相对路径绕过与缓存上限测试。

### 相邻回归风险

- 缓存结果必须与直接计算完全一致，配置目录不同必须给出不同目录。
- 相对路径不得写入缓存，避免工作目录变化后命中陈旧结果。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Scheduler 运行时生成与一致性。
- [已通过] Agent 与 Scheduler 定向测试 25/25。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- `append_agent_event`、`worker_command_queue_path` 等热路径不再逐次做路径解析。
- 测试通过替换 `compute_scheduler_agent_state_dir` 计数，验证缓存命中而非结果相等。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
