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
- [待做] Docker Codex 的 SimpleExperiment/SimpleSFTP UI Host 与宿主路径兼容，详见 `docs/target-plans/docker-codex-plugin-compat.md`。
- [已完成] Hub/Worker、端口诊断、操作时间线、Plan action 和服务器设置 tooltip 恢复批次已提交；历史细节以 git 为准。
- [待做] PPT 绘图链路与 realtime post gate 稳定化后的现场验收。

## 当前批次：recovery-build-051
### 修复点
- 统一 Worker Telemetry capability 与 Agent runtime 已公开的五项 Worker 专用控制动作。
- 在多端点客户端阻断 Hub action 越界直发 Worker，同时保持文件操作只走 Hub。
- 对齐 Worker GPU 直接遥测测试与当前新鲜心跳优先、过期回退 Hub 的 authority merge 契约；不修改安装目录或 VSIX。

### 回归风险
- 相邻回归风险：`run-plan`、结果、归档和文件 API 必须保持 Hub-only，只有 Worker 专用 action 可直发 Worker。
- capability 风险：Worker Agent 返回 `start/retry/stop/delete/archive-worker-*` 时必须通过兼容校验，其他已启用 action 继续告警。
- 状态风险：Worker GPU 只有新鲜心跳时覆盖 Hub 副本；缺失或过期心跳必须保留 Hub fallback 和告警。

### 验证清单
- [已通过] Hub/Worker boundary 套件 8/8；额外多端点 GPU 定向测试通过。
- [已通过] build、typecheck、lint 与 `git diff --check`。
- [新基线] 全量测试 624 项，616 通过、8 项既有恢复边界失败；相较上一批减少本批覆盖的 3 项失败并新增 1 项边界测试。
- [已同步] 修复提交 `855eb4919730503557551a09ef5110d178c8d509` 已普通快进推送 `origin/master`。

## 本批记录
- 上一完成批次：`recovery-build-050`，修复提交 `610b8164a756c39d9de25cb6d25cc51247ec6a21`，记录提交 `cc1639cc9f400ac9eee9fcf4377115fa6fa15ecb`。
- 当前目标状态：`recovery-build-051` 已完成并同步。
- 本批涉及：Worker capability、Worker action 路由边界与多端点 GPU authority；不修改安装目录或 VSIX。
- 修复提交：`855eb4919730503557551a09ef5110d178c8d509`；真实结果文件、PPT 绘图、SFTP、服务器、Docker 和三天历史留存均为 `needs field verification`。
