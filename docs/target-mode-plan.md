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

## 当前批次：recovery-build-036
### 修复点
- 以本机已安装 `SimpleExperiment 0.2.0` 为只读证据，恢复 realtime 状态、日志、操作、传输和 Worker 任务的有界压缩。
- 恢复结果摘要 dirty event、操作终态保护、快照 operation merge 和 authority merge 后的统一预算。
- 恢复重连正向 jitter、最短一分钟快照回退、capability 驱动的 WebSocket/SSE 选择和 journal gap 快照恢复。
- 修复 SSE capability 回归测试缺失的有超时轮询 helper。
- 不修改结果注册表、归档文件、实验数据或已安装扩展。

### 回归风险
- 内存风险：长时间 realtime 流不得让日志、任务、操作、传输和快照无限增长。
- 状态风险：旧序号结果 dirty event、操作终态和 journal gap 不得被普通事件覆盖或跳过恢复。
- 网络风险：capability 明确禁用 WebSocket 时不得尝试连接；重连 jitter 不得缩短基础退避。

### 验证清单
- `test:xshell-realtime`、状态预算、日志预算、重连、SSE、journal gap 与 authority merge 定向测试：通过 `25/25`；扩展 authority 定向集通过 `17/17`。
- 操作终态、快照 merge 和旧序号结果 dirty event 独立契约检查：通过。
- build、typecheck、lint、JavaScript 语法和 `git diff --check`：通过。
- 全量恢复审计基线：本批开始前通过 `546/620`，剩余项按后续边界分批处理；该结果不作为本批定向回归失败。
- 普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐：待完成。

## 本批记录
- 最新完成批次：`recovery-build-034`，隧道诊断与 live-output 契约已验证并同步，代码提交 `1733dbb59280470b764dd97096ab55846bb9dbc4`，记录提交 `fdaca59b9a2bbf18b8214f5cdefcf058e4806a87`。
- 当前目标状态：`recovery-build-036` 已验证，待提交同步。
- `recovery-build-035` 提交记录：`9bb82639783af5f7da788d72f2f7dff348ccb27c`，记录提交 `df5297e1edc71a49b7e312da75e15bdc14e8a161`，均已普通快进推送并确认与 `origin/master` 一致。
- 真实 SFTP、服务器、PPT 和三天历史留存均为 `needs field verification`。
