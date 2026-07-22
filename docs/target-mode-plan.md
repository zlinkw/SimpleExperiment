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
- [已完成] Hub/Worker、端口诊断、操作时间线、Plan action 和服务器设置 tooltip 恢复批次已提交；历史细节以 git 为准。
- [待做] PPT 绘图链路与 realtime post gate 稳定化后的现场验收。

## 当前批次：recovery-build-032
### 修复点
- 以本机已安装 `SimpleExperiment 0.2.0` 为只读证据，恢复 NotificationThrottle 首次通知契约。
- 没有历史时间戳时立即允许通知；后续同规则同 key 才按 `throttleSeconds` 节流。
- 不修改通知规则、事件、实验状态或已安装扩展。

### 回归风险
- 时间风险：小于节流窗口的测试时间戳不得被误当成已有通知记录。
- 隔离风险：不同 rule 或 event key 必须维持独立节流状态。

### 验证清单
- NotificationThrottle 与 experiment platform 相邻回归：通过 `15/15`；生成 runtime 与安装版除恢复注释外一致。
- build、typecheck、lint、JavaScript 语法和 `git diff --check`：通过。
- [待做] 普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐。

## 本批记录
- 最新完成批次：`recovery-build-031`，ProjectAdapterTemplates 已验证并同步，提交 `28fd95325852cda4bc6d3d6aba7c406b304b4e34`。
- 当前目标状态：`recovery-build-032` 验证通过，待提交同步。
- `recovery-build-032` 提交记录：待验证后填写。
- 真实 SFTP、服务器、PPT 和三天历史留存均为 `needs field verification`。
