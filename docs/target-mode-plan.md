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

## 当前批次：recovery-build-053
### 修复点
- 对齐场景错误码测试与当前 `TUNNEL_TIMEOUT` 语义。
- 对齐 UI 传输边界测试：集群操作走 `postTunnelAction`，文件传输走 SimpleSFTP，实时快照走 localhost client；保留合法 Xshell/SSH 配置说明文本。
- 对齐隧道网关当前实时刷新配置与请求预算测试；不修改产品运行时源码、安装目录或 VSIX。

### 回归风险
- 相邻回归风险：活动 Extension 不得重新导入旧 `RemoteExecutionService`、`RuntimeService`、`RemoteFileStore` 或直接远端命令 runner。
- 启动风险：插件只可启动已验证的 `Xshell.exe` 与 `.xsh` 会话；不得直接 spawn `ssh/scp/rsync`。
- 测试风险：迁移 denylist 必须保留对旧 SSH/SCP/rsync 配置的移除能力，不能被误判成运行时直连实现。

### 验证清单
- [已通过] 四个修复测试文件定向执行 9/9。
- [已通过] build、typecheck、lint 与 `git diff --check`。
- [已通过] 全量测试 624/624；恢复基线当前无失败项。

## 本批记录
- 上一完成批次：`recovery-build-052`，修复提交 `81439fd8a290c602786fd8ab47ff998171174cf6`，记录提交 `45cdbc4b17e590c1e115b0e7833dfd17c0b46eb8`。
- 当前目标状态：`recovery-build-053` 验证通过，待提交同步。
- 本批涉及：错误模型契约、UI 传输边界测试和隧道请求预算测试；不修改产品运行时源码。
- 修复提交：待提交；真实结果文件、PPT 绘图、SFTP、服务器、Docker 和三天历史留存均为 `needs field verification`。
