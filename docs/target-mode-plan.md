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

## 当前批次：history-003
### 修复点
- 增加总体服务器 GPU 峰值曲线与每张 GPU 卡的可展开历史曲线。
- 单卡叠加 GPU 利用率和显存利用率；总体图按服务器使用稳定高区分度配色。
- 颜色不足时使用线型和点形状区分；缺失时间桶断线，不补零。
- 提供文本摘要、键盘可访问图例，并保持抽屉和三列布局契约。

### 回归风险
- 相邻回归风险：图表展开不得触发实时 snapshot 高频历史查询或重复携带三天原始数据。
- 断连风险：历史查询失败必须保留上次成功曲线并显示 stale，不得伪造零值或成功状态。
- 布局风险：图表、图例、悬停层和文本不得覆盖 GPU 卡、抽屉或三列布局中的相邻内容。
- 边界风险：API 与状态链路不得接入结果、归档、CSV、论文、PPT 或 SimpleSFTP。

### 验证清单
- [已通过] `history-002a` Agent API/capability/OpenAPI、时间参数和 TunnelClient 定向测试。
- [已通过] `history-002a` build、typecheck、lint、runtime/SHA256、`git diff --check` 与全量测试 625/625。
- [已通过] `history-002b` Extension 按需缓存、断连保留、请求合并与 Webview payload 预算。
- [已通过] `history-002b` build、typecheck、lint、runtime/SHA256、`git diff --check` 与全量测试 628/628。
- [待验证] `history-003` 图表、稳定配色、缺失桶断线、可访问性与响应式布局。

## 本批记录
- 上一完成批次：`recovery-build-053`，修复提交 `a7a71e87849606cae09de12d71c4a313fee2a2fa`，记录提交 `fa239e25afd2ad88687cd64460bed1d207653f18`。
- 当前目标状态：`history-002b` 已完成并同步；`history-003` 执行中。
- 本批涉及：总体峰值图、单卡双指标图、稳定配色、线型/点形状回退、文本摘要和键盘图例；不修改安装目录或 VSIX。
- 上一修复提交：`e12c8c23f36b7a812899d3f75534f3fee3742443`；真实服务器连续三天采样仍为 `needs field verification`。
