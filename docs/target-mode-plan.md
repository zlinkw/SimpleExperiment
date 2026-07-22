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

## 当前批次：recovery-build-049
### 修复点
- 对齐面板打开时实时连接测试与当前局部 `client` 引用。
- 对齐全局 Xshell 配置读写契约，保留跨工作区配置行为。
- 对齐手动 GPU、调度、实验记录快照和日志选择消息分支；本批不修改产品运行时源码、安装目录或 VSIX。

### 回归风险
- 相邻回归风险：面板打开和恢复网络必须继续经过暂停预算与 realtime client 连接门禁。
- 配置风险：Hub/Worker Xshell 参数必须写入 `globalState`，不能回退到工作区状态。
- UI 消息风险：手动快照命令必须使用当前消息分支，日志选择只能更新选择并通过现有 live output 入口刷新。

### 验证清单
- [已通过] 面板连接、全局 Xshell 配置与手动快照定向测试 5/5。
- [已通过] build、typecheck、lint 与 `git diff --check`。
- [新基线] 全量测试 623 项，609 通过、14 失败；相较 18 项旧恢复边界减少 4 项。
- [已同步] 修复提交 `31605a15098f88635f1bd7b425fdcfa56ce29e60` 已普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐。

## 本批记录
- 上一完成批次：`recovery-build-048`，修复提交 `6274ed9d329fe3f97c7ff4ee1f6aa2349d4af729`，记录提交 `5c8333fbbb0504cc6ce9975b1719cc26c9841468`。
- 当前目标状态：`recovery-build-049` 已完成并同步。
- 本批涉及：连接生命周期、全局配置与手动快照契约测试；不修改产品运行时源码。
- 修复提交：`31605a15098f88635f1bd7b425fdcfa56ce29e60`；真实结果文件、PPT 绘图、SFTP、服务器、Docker 和三天历史留存均为 `needs field verification`。
