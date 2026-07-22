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

## 当前批次：recovery-build-052
### 修复点
- 将旧直连远端静态扫描收敛到活动 Extension、localhost client 与 Xshell 会话启动边界，避免迁移 denylist 和未接入候选源码制造伪失败。
- 对齐 dist 回归断言与当前 `xshell_tunnel_realtime`，继续确认旧直连服务未接入活动入口。
- 提高 localhost API 集成测试的独立请求预算，并移除其临时下载、上传及永久清理；不修改产品运行时源码、安装目录或 VSIX。

### 回归风险
- 相邻回归风险：活动 Extension 不得重新导入旧 `RemoteExecutionService`、`RuntimeService`、`RemoteFileStore` 或直接远端命令 runner。
- 启动风险：插件只可启动已验证的 `Xshell.exe` 与 `.xsh` 会话；不得直接 spawn `ssh/scp/rsync`。
- 测试风险：迁移 denylist 必须保留对旧 SSH/SCP/rsync 配置的移除能力，不能被误判成运行时直连实现。

### 验证清单
- [已通过] localhost client、Xshell 启动与旧配置 denylist 定向测试 6/6。
- [已通过] build、typecheck、lint 与 `git diff --check`。
- [新基线] 全量测试 624 项，620 通过、4 项既有恢复边界失败；相较上一批减少本批覆盖的 4 项失败。
- [待同步] 本批验证通过后独立提交并普通快进推送 `origin/master`。

## 本批记录
- 上一完成批次：`recovery-build-051`，修复提交 `855eb4919730503557551a09ef5110d178c8d509`，记录提交 `2d3ee3a7d6fd5bb1e455cecdea67cf52fc7b637a`。
- 当前目标状态：`recovery-build-052` 运行中。
- 本批涉及：活动远端边界、Xshell 会话启动与 localhost client 测试；不修改产品运行时源码。
- 真实结果文件、PPT 绘图、SFTP、服务器、Docker 和三天历史留存均为 `needs field verification`。
