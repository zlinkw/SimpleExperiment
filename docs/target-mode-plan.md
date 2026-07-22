# 目标模式当前计划：服务器 GPU 三天历史曲线
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
- [进行中] 服务器状态页三天 GPU 历史曲线，详见 `docs/target-plans/server-gpu-history.md`。
- [已完成] SimpleExperiment 恢复基线、target mode 压缩契约和 UI 契约修复；全量测试基线 624/624。
- [待做] Docker Codex 的 SimpleExperiment/SimpleSFTP UI Host 与宿主路径兼容，详见 `docs/target-plans/docker-codex-plugin-compat.md`。
- [已完成] Hub/Worker、端口诊断、操作时间线、Plan action 和服务器设置 tooltip 恢复批次已提交；历史细节以 git 为准。
- [待做] PPT 绘图链路与 realtime post gate 稳定化后的现场验收。

## 当前批次：history-002
### 修复点
- 增加只读 `/api/gpu/history` 端点及 capability，并接入 TunnelClient。
- 增加 Extension 按需缓存与 Webview 状态预算；仅传输当前请求范围的降采样结果。
- 覆盖断连、重连、多服务器、多 GPU、缺失桶、三天边界与 payload 上限。

### 回归风险
- 相邻回归风险：历史查询不得进入实时 snapshot 高频推送或重复携带三天原始数据。
- 断连风险：历史查询失败不得清空已显示的有界缓存，也不得伪造零值或成功状态。
- 边界风险：API 与状态链路不得接入结果、归档、CSV、论文、PPT 或 SimpleSFTP。

### 验证清单
- [待验证] Agent API/capability、TunnelClient、缓存、断连与 payload 预算定向测试。
- [待验证] build、typecheck、lint、`git diff --check` 与全量测试。

## 本批记录
- 上一完成批次：`recovery-build-053`，修复提交 `a7a71e87849606cae09de12d71c4a313fee2a2fa`，记录提交 `fa239e25afd2ad88687cd64460bed1d207653f18`。
- 当前目标状态：`history-001` 已完成并同步；`history-002` 执行中。
- 本批涉及：GPU 历史只读 API、TunnelClient 与有界 Webview 状态；不实现图表 UI，不修改安装目录或 VSIX。
- 上一修复提交：`29395a0f063a9406122ebcf43520142cf0b9c497`；真实服务器连续三天采样仍为 `needs field verification`。
