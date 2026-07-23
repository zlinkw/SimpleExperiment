# 目标模式当前计划：Docker Codex 插件兼容
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
- [待现场验证] 服务器状态页三天 GPU 历史曲线，详见 `docs/target-plans/server-gpu-history.md`。
- [已完成] SimpleExperiment 恢复基线、target mode 压缩契约和 UI 契约修复；全量测试基线 624/624。
- [进行中] Docker Codex 的 SimpleExperiment/SimpleSFTP UI Host 与宿主路径兼容，详见 `docs/target-plans/docker-codex-plugin-compat.md`。
- [已完成] Hub/Worker、端口诊断、操作时间线、Plan action 和服务器设置 tooltip 恢复批次已提交；历史细节以 git 为准。
- [待做] PPT 绘图链路与 realtime post gate 稳定化后的现场验收。

## 当前批次：docker-plugin-001a
### 修复点
- 为 SimpleExperiment 增加纯双路径映射模块、UI Extension Host 声明和可选根目录配置。
- 本地 `file` 工作区继续使用原 `fsPath`；`vscode-remote` 编辑器 URI 保持不变，副作用使用 Windows 宿主路径。
- 拒绝 `..`、编码穿越、错误根、反斜杠、盘符和宿主根越界；本批不接入具体副作用入口。

### 回归风险
- 相邻回归风险：未配置映射的本地工作区不得改变路径、命令 ID、Xshell 或结果生命周期行为。
- 路径安全：远程路径必须先规范化并校验容器根，再映射并二次校验 Windows 宿主边界。
- URI 边界：编辑器打开文件继续使用原始远程 URI，不得替换为 `file:///D:/...`。
- 连接边界：Agent HTTP/realtime 继续访问 Windows `127.0.0.1`，不增加 Docker localhost 或直接 SSH。
- 交付边界：本批不生成、安装或覆盖 VSIX，不写入 `plugin-drop` 通过结果。

### 验证清单
- [已通过] 计划 A 交接文件的 schemaVersion、工作区根、URI scheme、extension host 和配置键必需字段一致。
- [待验证] 本地 file URI、远程 URI、嵌套项目、分隔符、大小写和尾部斜杠。
- [待验证] 明文/编码穿越、错误根、盘符、UNC、NUL 和映射后二次越界。
- [待验证] build、typecheck、lint、全量测试、`node -c`、`git diff --check` 与公开打包文件清单。
- [待现场验证] Dev Container UI Host、远程编辑器 URI、Windows `127.0.0.1` 和双插件联调均为 `needs experiment`。

## 本批记录
- 上一完成批次：`history-005`，提交 `bd496c858e8f243a5a16a71621ee70ad2ba46f67` 已同步 `origin/master`。
- 当前目标状态：GPU 自动化实现完成，真实三天采样仍为 `needs field verification`；Docker 兼容进入 `docker-plugin-001a`。
- 本批涉及：SimpleExperiment 路径契约、配置声明和测试；不修改 SimpleSFTP，不接入副作用操作。
- 计划 A 交接中的扩展字段不参与插件路径决策；插件仅消费 schemaVersion 1 的必需字段。
