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
- [已完成] 2/5 后端：审计 Agent 操作事件写入与索引。
- [待做] 3/5 前端：优化结果证据分区的证据可追溯性。
- [待做] 4/5 后端：审计文件传输状态与进度派生。
- [待做] 5/5 前后端：执行第二十二轮非服务器静态测试。

## 当前批次：autonomous-fix-107（已完成）
### 修复点

- `append_event` 的 seq 分配、落盘与压缩纳入 `EVENT_APPEND_LOCK` 单一临界区，消除重复 seq 导致的实时事件静默丢失。
- 采用 `RLock` 以允许补全流水线在同一线程重入；补全与状态修剪保持在锁外。
- `atomic_write` 临时文件名加入线程标识，并在失败时清理临时文件。
- 新增 `replace_with_retry`，处理 Windows 上并发替换同一目标的共享冲突。

### 相邻回归风险

- 并发写入必须保证 seq 唯一、行不交错，且不得有写入线程被永久阻塞。
- 补全流水线必须留在锁外，否则长任务会阻塞全部事件写入。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Agent 运行时生成与校验和一致性。
- [已通过] 全量静态测试 793/793。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 实测无锁时 8 线程 40 次写入只落盘 18 行、seq 仅 5 个不同值，并有 6 个线程因临时文件抢占崩溃。
- `atomic_write` 的临时名此前只带 PID，同进程内并发写同一目标必然互相抢占。
- 提交记录：本批使用独立 `fix` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
