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

## 当前批次：recovery-build-047
### 修复点
- 对齐命令清单测试与当前 Xshell、Agent 准备入口，继续拒绝旧直连同步命令。
- 将未接入活动扩展入口的旧远端源码登记为人工删除候选，不删除完整文件。
- 对齐连接 UI 测试与当前中文 Xshell 隧道文案；本批不修改产品运行时源码、安装目录或 VSIX。

### 回归风险
- 相邻回归风险：旧 MobaXterm 和直连同步命令不得重新注册，现有 Xshell 入口必须保留。
- 清理风险：旧远端源码只能登记候选，用户审核前不得删除、移动或暂存删除。
- UI 风险：连接操作继续明确只访问 `127.0.0.1`，并保留配置、启动、刷新、暂停和离线入口。

### 验证清单
- [已通过] 命令清单、旧远端源码隔离与连接 UI 定向测试 5/5。
- [已通过] build、typecheck、lint 与 `git diff --check`。
- [新基线] 全量测试 623 项，602 通过、21 失败；相较 24 项旧恢复边界减少 3 项。
- [待同步] 本批修复提交尚未创建或推送。

## 本批记录
- 上一完成批次：`recovery-build-046`，修复提交 `12918e224e2158f33483ca4cd25c73f312c2b097`，记录提交 `d01919a901deef42226f3330219d2750aa0e84e7`。
- 当前目标状态：`recovery-build-047` 执行中。
- 本批涉及：迁移/连接契约测试、人工删除候选清单与本计划；不修改产品运行时源码。
- 真实结果文件、PPT 绘图、SFTP、服务器、Docker 和三天历史留存均为 `needs field verification`。
