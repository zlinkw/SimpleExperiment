# 目标模式当前计划：双插件备份、打包与安装
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不手工修改安装目录；仅在完成独立备份后，按用户本批明确授权通过 VS Code CLI 安装新版 VSIX；不覆盖已有 VSIX，不删除完整文件，不把未验证实验声明当作事实。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- 结果证据使用最终归档结果；`metrics_summary.csv`、PPT 和论文证据不得混入临时结果；PPT 绘图目标确认必须先于 automation 调用，且不迁移、删除或重写旧任务和结果。
- 连接边界：Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 新增补充任务不得破坏当前主目标；计划更新必须防止修复循环。
- 禁止“父级 evidence key 被子文件 archive 反向命中”。
- 长时间 Webview payload 预算：`schedulerStates` 与 `experimentTraces` 必须限量、压缩并保留受保护记录；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 由代码和测试覆盖。

## 后续优先级
- [待现场验证] 服务器状态页三天 GPU 历史曲线，详见 `docs/target-plans/server-gpu-history.md`。
- [已完成] SimpleExperiment 恢复基线、target mode 压缩契约和 UI 契约修复；全量测试基线 624/624。
- [已完成] Docker Codex 的 SimpleExperiment 与 SimpleSFTP 宿主路径接入、远程编辑器 URI 保留和传输位置确认，详见 `docs/target-plans/docker-codex-plugin-compat.md`。
- [待现场验证] Docker Codex 的双插件多窗口租约、真实 SFTP 上传和 Xshell `127.0.0.1` 联调验收；两插件租约心跳截断竞态已修复，自动化验证通过。
- [已完成] Hub/Worker、端口诊断、操作时间线、Plan action 和服务器设置 tooltip 恢复批次已提交；历史细节以 git 为准。
- [待做] PPT 绘图链路与 realtime post gate 稳定化后的现场验收。

## 当前批次：release-install-001
### 修复点
- 对照已安装的 SimpleExperiment `0.2.0` 与 SimpleSFTP `0.1.2`，确认待交付源码版本和包身份。
- 在仓库外创建不可覆盖的时间戳备份，保留两个已安装扩展目录、哈希清单和版本信息。
- 全量验证后分别生成唯一命名的新 VSIX，比较归档内容，再通过 VS Code CLI 安装并核验已安装版本。

### 回归风险
- 安装风险：新版安装会替换 VS Code 当前启用版本；原版必须先完成仓库外备份且通过哈希复核。
- 相邻回归风险：版本号变化以外的文件增删和关键运行文件差异必须记录，不以窄化测试替代全量测试。
- 外部边界：不运行真实实验，不写项目归档，不修改用户项目配置或服务器文件。

### 验证清单
- [已完成] 已安装的 SimpleExperiment `0.2.0` 与 SimpleSFTP `0.1.2` 已备份到仓库外时间戳目录；源与副本 SHA-256 清单一致，并生成独立 ZIP。
- [已完成] SimpleExperiment 全量测试 664/664、SimpleSFTP 全量测试 18/18 通过；除本计划外无意外 Git 改动。
- [已完成] 候选 VSIX 分别包含 139 和 6 个扩展文件；包内 ID、版本和关键运行文件通过核验，SHA-256 已写入备份清单。
- [已完成] 新包与旧安装目录差异报告已写入备份目录；SimpleExperiment `0.2.1` 与 SimpleSFTP `0.1.3` 已通过 VS Code CLI 安装并核验。

## 本批记录
- 上一完成批次：`recovery-guard-006`，验证记录与提交以 git 为准。
- `release-install-001`：备份、全量验证、包差异审计和新版安装完成；等待用户重载 VS Code 后进行手动功能测试。
- 当前目标状态：自动化交付完成；现场功能表现仍需用户手动验证。
