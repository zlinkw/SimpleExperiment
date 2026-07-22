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

## 当前批次：recovery-build-029
### 修复点
- 以本机已安装 `SimpleExperiment 0.2.0` 为只读证据，恢复缺失的 PlanBuilder 完整实现。
- 恢复 mode-aware Plan 校验、复杂 YAML 解析、结果候选门禁、矩阵表达式错误收敛和 Plan registry 覆盖计算。
- 保留 TypeScript 公共类型出口，不修改 Plan 文件、配置文件、已安装扩展或实验结果。

### 回归风险
- 解析风险：注释、flow map、anchor、alias、嵌套对象和命令参数不得产生伪结果或伪 case。
- 结果风险：metadata、内部 registry 和未被当前 mode 使用的命令输出不得通过正式结果门禁。

### 验证清单
- Plan mode、YAML case、结果候选、matrix、registry 和 coverage 定向测试：通过 `33/33`。
- Plan 广域相邻审计通过 `49/53`；4 个失败属于未恢复的 Notifications、PlanArchive entry scanner 和 ProjectAdapterTemplates，登记为后续批次，不属于本批回归。
- build、typecheck、lint、JavaScript 语法和 `git diff --check`：通过。
- 普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐：`b89495cee236ea915f70d50b071188205f1134e6`。

## 本批记录
- 最新完成批次：`recovery-build-028`，scheduler failure contract 已验证并同步，提交 `128ee2fe625e880e5853b9ccb6f7e89d183e28ea`。
- 当前目标状态：`recovery-build-029` 已完成。
- `recovery-build-029` 提交记录：`b89495cee236ea915f70d50b071188205f1134e6`，已普通快进推送并确认与 `origin/master` 一致。
- 真实 SFTP、服务器、PPT 和三天历史留存均为 `needs field verification`。
