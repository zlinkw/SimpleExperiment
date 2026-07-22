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

## 当前批次：recovery-build-033
### 修复点
- 修复五个 PanelHtml 源码测试提取器，使其兼容恢复后源码保留的 TypeScript 返回类型。
- 修正 Webview 脚本健康测试的 `jobs.csv` 元数据文件名正则，使断言检查真实字面量。
- 恢复结果相关直接操作在摘要刷新前对当前选中 Plan 排队重解析的契约；手动解析和刷新命令不重复排队。
- 不修改 PanelHtml 运行时界面、Plan 选择范围、归档数据或已安装扩展。

### 回归风险
- 提取风险：测试清理器只移除 `renderPanelHtml(): string` 的源码类型，不得改写模板内容。
- 结果范围风险：自动重解析必须继续受当前选中 Plan gate 限制，不得解析其他 Plan。
- 重复风险：`parseResults` 与 `refreshResults` 不得再次进入自动重解析队列。

### 验证清单
- 五个 PanelHtml/UI 定向测试：通过 `14/14`。
- build、typecheck、lint、JavaScript 语法和 `git diff --check`：通过。
- 普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐：`7e2b2872b3fe22c94113ba25be375eca763b238d`。

## 本批记录
- 最新完成批次：`recovery-build-032`，NotificationThrottle 已验证并同步，代码提交 `39ec5a2f070fecdb5eb5bf20913d4ba3ea24f25f`，记录提交 `adbe2ff87f75488e9b54b5a7e238dcd03c1e1694`。
- 当前目标状态：`recovery-build-033` 已完成。
- `recovery-build-033` 提交记录：`7e2b2872b3fe22c94113ba25be375eca763b238d`，已普通快进推送并确认与 `origin/master` 一致。
- 真实 SFTP、服务器、PPT 和三天历史留存均为 `needs field verification`。
