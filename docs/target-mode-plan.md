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
- [已完成] Docker Codex 的 SimpleExperiment 宿主路径接入与远程编辑器 URI 保留；SimpleSFTP 路径契约已完成，详见 `docs/target-plans/docker-codex-plugin-compat.md`。
- [待做] Docker Codex 的 SimpleSFTP 实际上传接入与双插件联调。
- [已完成] Hub/Worker、端口诊断、操作时间线、Plan action 和服务器设置 tooltip 恢复批次已提交；历史细节以 git 为准。
- [待做] PPT 绘图链路与 realtime post gate 稳定化后的现场验收。

## 当前批次：docker-plugin-003
### 修复点
- 将 SimpleSFTP 工作区上传、文件上传、下载、忽略规则和路径确认接入 Windows 宿主路径映射。
- 本地 `file` 工作区行为不变；远程编辑器继续使用原 `vscode-remote` URI。
- 保留旧命令 ID、服务器配置和现有任务，不修改 SimpleExperiment 已完成入口。

### 回归风险
- 相邻回归风险：普通 Windows 工作区不得被强制配置映射；容器路径不得直接交给 Windows SFTP 或 Node `fs`。
- 路径安全：拒绝穿越、错误根、盘符、UNC、NUL 与宿主根越界。
- 交付边界：本批不实现多窗口租约，不打包、安装或覆盖 VSIX。

### 验证清单
- [待验证] SimpleSFTP 上传、下载、忽略规则和路径确认使用宿主路径。
- [待验证] 本地 Windows 工作区与现有命令 ID 回归。
- [待现场验证] Dev Container 文件同字节上传与远程编辑器 URI 为 `needs experiment`。

## 本批记录
- 上一完成批次：`docker-plugin-002`，本批验证记录与提交以 git 为准。
- 当前目标状态：SimpleExperiment 宿主路径接入完成；Docker 兼容进入 `docker-plugin-003`。
- `docker-plugin-002` 提交前验证：`npm test` 通过 644/644；未生成、安装或覆盖 VSIX。
- 本批涉及：SimpleSFTP 上传、下载、忽略规则和路径确认接入。
