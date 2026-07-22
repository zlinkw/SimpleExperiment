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

## 当前批次：recovery-build-026
### 修复点
- 以本机已安装 `SimpleExperiment 0.2.0` 为只读证据，恢复缺失的 PPT automation readiness、schemaVersion、超时、并发和错误映射契约。
- 恢复 Plan 级绘图契约路径、已归档统计源门禁、preview CSV 拒绝和轻量文件预算。
- 不修改 PPT 插件、已安装扩展、实验结果或归档文件。

### 回归风险
- 相邻回归风险：源码恢复必须与当前 Extension 的 `inspectAutomation`、`prepareAutomation` 和 readiness 状态接口一致。
- 结果风险：原始单次结果、临时 preview CSV 和非 `archived_only` 统计不得进入 PPT 绘图请求。

### 验证清单
- PPT bridge、automation readiness、归档结果源和绘图确认定向测试：通过 `20/20`。
- UI 全量测试：通过 `72/72`；`npm run build`、typecheck、lint、JavaScript 语法和 `git diff --check`：通过。
- 当前恢复批次提交后普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐：待提交。

## 本批记录
- 最新完成批次：`recovery-build-025`，活动计划压缩契约已验证并同步，提交 `fdec89314976664da1771238f2e51eff3280ad26`。
- 当前目标状态：`recovery-build-026` 验证通过，待提交同步。
- 真实 SFTP、服务器、PPT 和三天历史留存均为 `needs field verification`。
