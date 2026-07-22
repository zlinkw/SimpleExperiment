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

## 当前批次：recovery-build-048
### 修复点
- 对齐三个 MobaXterm 兼容包装测试与当前 Xshell-only 实现。
- 验证旧包装只保留 API 兼容，不再接受 MobaXterm 可执行文件或旧连接模式。
- 保留 Xshell 启动预览、端口推荐与实时文件传输默认值；本批不修改产品运行时源码、安装目录或 VSIX。

### 回归风险
- 相邻回归风险：兼容包装不得重新启用 MobaXterm，必须转发到 Xshell 实现。
- 可执行文件风险：只接受 `Xshell.exe`，错误 basename 继续拒绝。
- 配置风险：旧连接模式必须规范化为 `xshell_tunnel_realtime`，并保持本地端口约束。

### 验证清单
- [已通过] MobaXterm 兼容包装与 Xshell 主实现定向测试 18/18。
- [已通过] build、typecheck、lint 与 `git diff --check`。
- [新基线] 全量测试 623 项，605 通过、18 失败；相较 21 项旧恢复边界减少 3 项。
- [已同步] 修复提交 `6274ed9d329fe3f97c7ff4ee1f6aa2349d4af729` 已普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐。

## 本批记录
- 上一完成批次：`recovery-build-047`，修复提交 `2a8a8dca19c31de28515d3c1c25ac43eb0b2a188`，记录提交 `39ca610370436284d129cf9f565d5574b8e06cb1`。
- 当前目标状态：`recovery-build-048` 已完成并同步。
- 本批涉及：MobaXterm 兼容包装测试与本计划；不修改产品运行时源码。
- 修复提交：`6274ed9d329fe3f97c7ff4ee1f6aa2349d4af729`；真实结果文件、PPT 绘图、SFTP、服务器、Docker 和三天历史留存均为 `needs field verification`。
