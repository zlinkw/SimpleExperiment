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

## 当前批次：recovery-build-035
### 修复点
- 以本机已安装 `SimpleExperiment 0.2.0` 为只读证据，恢复 CLI 的实验运行、结果解析和最终论文表格命令。
- 论文表格命令只读取最终归档且未被明确判定无效的记录，不把待审核预览记录混入输出。
- 补齐 `requireFinalEvidence` 的实际筛选逻辑，最终分析只接受归档状态且未被显式判定为无效的记录。
- 论文模板渲染默认使用最终结果策略，不再回退到包含待审核记录的普通预览策略。
- 修正质量门禁测试数据，使其使用分类契约要求的 AUC 指标和独立实验标识。
- 不修改结果注册表、归档文件、实验数据或已安装扩展。

### 回归风险
- 证据风险：CLI 论文表格不得把 `pending_review` 记录当作最终证据。
- 兼容风险：旧 CLI 状态、指标、Plan build 命令和公开别名必须继续可用。
- 质量风险：门禁筛选必须按 experimentId 匹配，不得让同 ID 的测试数据相互覆盖。

### 验证清单
- CLI、结果管理、最终结果视图与质量门禁定向测试：通过 `17/17`。
- build、typecheck、lint、JavaScript 语法和 `git diff --check`：通过。
- 全量恢复审计基线：本批修复前通过 `546/620`，剩余 `74` 项按后续边界分批处理；该结果不作为本批定向回归失败。
- 普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐：`9bb82639783af5f7da788d72f2f7dff348ccb27c`。

## 本批记录
- 最新完成批次：`recovery-build-034`，隧道诊断与 live-output 契约已验证并同步，代码提交 `1733dbb59280470b764dd97096ab55846bb9dbc4`，记录提交 `fdaca59b9a2bbf18b8214f5cdefcf058e4806a87`。
- 当前目标状态：`recovery-build-035` 已完成。
- `recovery-build-035` 提交记录：`9bb82639783af5f7da788d72f2f7dff348ccb27c`，已普通快进推送并确认与 `origin/master` 一致。
- 真实 SFTP、服务器、PPT 和三天历史留存均为 `needs field verification`。
