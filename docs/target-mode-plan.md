# 目标模式当前计划：恢复 SimpleExperiment 可构建基线
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不修改安装目录，不覆盖 VSIX，不删除完整文件，不把未验证实验声明当作事实。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- 结果证据使用最终归档结果；`metrics_summary.csv`、PPT 和论文证据不得混入临时结果；PPT 绘图目标确认必须先于 automation 调用，且不迁移、删除或重写旧任务和结果。
- 连接边界：Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 新增补充任务不得破坏当前主目标；计划更新必须防止修复循环。
- 禁止“父级 evidence key 被子文件 archive 反向命中”。
- 长时间 Webview payload 预算：`schedulerStates` 与 `experimentTraces` 必须限量、压缩并保留受保护记录；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 由代码和测试覆盖。

## 后续优先级
- [待做] 完成 target mode 计划压缩契约和剩余 UI 恢复。
- [待做] 服务器状态页三天 GPU 历史曲线，详见 `docs/target-plans/server-gpu-history.md`。
- [待做] Docker Codex 的 SimpleExperiment/SimpleSFTP UI Host 与宿主路径兼容，详见 `docs/target-plans/docker-codex-plugin-compat.md`。
- [已完成] Hub/Worker、端口诊断、操作时间线、Plan action 和服务器设置 tooltip 恢复批次已提交；历史细节以 git 为准。
- [待做] PPT 绘图链路与 realtime post gate 稳定化后的现场验收。

## 当前批次：recovery-build-050
### 修复点
- 对齐 capability-driven UI 测试与当前 `uiCapabilityMap`、`disableReason` 和按钮点击前禁用契约。
- 对齐 `postTunnelAction` 测试与当前 capability 检查、`opId`、本地 operation 及固定 action 提交包装。
- 移除结果分析 API 测试中不再由正式 UI 使用且与 `refresh-results` 共享手动刷新预算的旧 `rescan-results` 调用；本批不修改产品运行时源码、安装目录或 VSIX。

### 回归风险
- 相邻回归风险：缺失 Hub action 或文件下载能力时，按钮必须在消息派发前禁用并显示升级原因。
- 提交风险：所有远端 action 必须继续经过统一 wrapper，生成 `opId`、登记本地 operation 并提交固定 action。
- 预算风险：正式 `refresh-results` 仍使用手动刷新预算；测试不得通过连续调用同预算旧别名制造伪回归。

### 验证清单
- [已通过] capability UI、action wrapper 与结果分析 API 定向测试 3/3。
- [已通过] build、typecheck、lint 与 `git diff --check`。
- [新基线] 全量测试 623 项，612 通过、11 项既有恢复边界失败；相较上一批减少本批覆盖的 3 项旧契约失败。
- [已同步] 修复提交 `610b8164a756c39d9de25cb6d25cc51247ec6a21` 已普通快进推送 `origin/master`。

## 本批记录
- 上一完成批次：`recovery-build-049`，修复提交 `31605a15098f88635f1bd7b425fdcfa56ce29e60`，记录提交 `e2c1ef1f371bba5017909bf1c5829842576b2d79`。
- 当前目标状态：`recovery-build-050` 已完成并同步。
- 本批涉及：capability UI、统一 action wrapper 与结果分析 API 测试契约；不修改产品运行时源码。
- 修复提交：`610b8164a756c39d9de25cb6d25cc51247ec6a21`；真实结果文件、PPT 绘图、SFTP、服务器、Docker 和三天历史留存均为 `needs field verification`。
