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

## 当前批次：recovery-build-034
### 修复点
- 以本机已安装 `SimpleExperiment 0.2.0` 为只读证据，恢复 Hub/Worker 探针中的项目根目录与 Scheduler 依赖诊断透传。
- 恢复 TunnelClient 对 `/api/live-output` 查询端点的明确 allowlist，保持查询参数编码和 localhost 边界。
- 对齐 Worker 模式错误提示与公开品牌，不再要求用户寻找旧 `zlk-*` 命令。
- 不修改 Xshell 会话、服务器配置、Agent runtime 或已安装扩展。

### 回归风险
- 诊断风险：健康接口返回的依赖提示必须在 capabilities 失败和成功路径中保留。
- Worker 风险：读取健康响应不得破坏 token、模式和 endpoint capability 判断。
- API 边界风险：仅新增已定义的 `/api/live-output` 路径，不放宽任意 API 路径。

### 验证清单
- Scheduler 依赖、探针、TunnelClient 与 GPU/Scheduler/live-output 定向测试：通过 `13/13`；Hub/Worker 依赖对象透传另有运行断言覆盖。
- build、typecheck、lint、JavaScript 语法和 `git diff --check`：通过。
- 普通快进推送 `origin/master` 并 fetch 对齐：待验证。

## 本批记录
- 最新完成批次：`recovery-build-033`，PanelHtml 源码测试与结果重解析契约已验证并同步，代码提交 `7e2b2872b3fe22c94113ba25be375eca763b238d`，记录提交 `7305aa555ced9c53105af7b3e6007271a2022e9f`。
- 当前目标状态：`recovery-build-034` 已验证，等待同步。
- `recovery-build-034` 提交记录：待提交。
- 真实 SFTP、服务器、PPT 和三天历史留存均为 `needs field verification`。
