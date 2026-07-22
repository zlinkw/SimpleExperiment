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

## 当前批次：history-001
### 修复点
- 复用 Agent 现有 GPU snapshot，按五分钟时间桶写入独立运行态历史。
- 每个服务器和 GPU 只保留最近 72 小时、最多 864 点；同桶新快照替换旧点，缺失桶不补零。
- 增加原子持久化、损坏恢复、范围查询和服务端降采样基础；不接入结果、归档、CSV、论文或 PPT 链路。

### 回归风险
- 相邻回归风险：历史写入失败不得阻断实时 GPU snapshot 和 Agent 心跳。
- 留存风险：服务器或 GPU 长期离线后旧序列必须裁剪，不得无限增长或用零值填补空档。
- 边界风险：历史只写 Agent 项目运行态目录，不得污染实验结果、Plan 归档或 SimpleSFTP 传输状态。

### 验证清单
- [已通过] GPU 历史定向测试、Agent runtime 同步、SHA256 校验与 Python AST 语法。
- [已通过] build、typecheck、lint、`git diff --check` 与全量测试 625/625。

## 本批记录
- 上一完成批次：`recovery-build-053`，修复提交 `a7a71e87849606cae09de12d71c4a313fee2a2fa`，记录提交 `fa239e25afd2ad88687cd64460bed1d207653f18`。
- 当前目标状态：`history-001` 已完成，等待提交同步。
- 本批涉及：Agent GPU 历史时间桶、留存、持久化和查询基础；不修改 UI、安装目录或 VSIX。
- 修复提交：本提交；真实服务器连续三天采样仍为 `needs field verification`。
