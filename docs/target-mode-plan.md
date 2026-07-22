# 目标模式当前计划：恢复 SimpleExperiment 可构建基线
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不修改安装目录，不覆盖 VSIX，不删除完整文件，不把未验证实验声明当作事实。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- 结果证据使用最终归档结果；`metrics_summary.csv`、PPT 和论文证据不得混入临时结果。
- 连接边界：Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 新增补充任务不得破坏当前主目标；计划更新必须防止修复循环。
- 禁止“父级 evidence key 被子文件 archive 反向命中”。
- 长时间 Webview payload 预算：`schedulerStates` 与 `experimentTraces` 必须限量、压缩并保留受保护记录。

## 后续优先级
- [待做] 完成 target mode 计划压缩契约和剩余 UI 恢复。
- [待做] 服务器状态页三天 GPU 历史曲线，详见 `docs/target-plans/server-gpu-history.md`。
- [已完成] Hub/Worker、端口诊断、操作时间线、Plan action 和服务器设置 tooltip 恢复批次已提交；历史细节以 git 为准。
- [待做] PPT 绘图链路与 realtime post gate 稳定化后的现场验收。

## 当前批次：recovery-build-025
### 修复点
- 压缩当前计划为最新活动目标，保留固定边界、当前批次、验证清单和本批记录。
- 将长期 `schedulerStates`、`experimentTraces` payload 预算保留为固定边界，并让回归测试验证现行契约而非已归档批次标题。
- 保留独立 `server-gpu-history` 目标计划引用，不把后续功能混入恢复批次。

### 回归风险
- 相邻回归风险：压缩不得丢失 Git 同步规则、删除保护、SFTP 责任边界和实验证据门禁。
- Webview 回归风险：`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 必须继续由代码和测试覆盖。

### 验证清单
- target mode 计划测试和压缩脚本测试：通过。
- SimpleExperiment UI 全量测试、`npm run typecheck`、lint、JavaScript 语法和 `git diff --check`：通过。
- 当前恢复批次提交后普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐：待提交。

## 本批记录
- 最新完成批次：`recovery-build-024`，服务器命令审计和中文设置 tooltip 已验证，提交 `8449bf026a2933052157f3e088053749aa2e2e0d`。
- 当前目标状态：`recovery-build-025` 验证通过，待提交同步。
- 真实 SFTP、服务器、PPT 和三天历史留存均为 `needs field verification`。
