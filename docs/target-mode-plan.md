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

## 当前批次：recovery-build-042
### 修复点
- 以 Git、当前源码和本机已安装 `SimpleExperiment 0.2.0` 为证据，对齐公开 CLI 与 SimpleSFTP UI 命名契约。
- 修复 `.vscodeignore` 恢复提交混入的 PowerShell 片段，并补齐 `.claude/**` 与 `_*.html` 排除规则。
- 本批只修改两个公开发布测试、VSIX 排除配置与本计划；不修改产品运行时源码、安装目录或 VSIX。

### 回归风险
- 相邻回归风险：CLI 测试必须保留公开命令和旧别名四项映射，不能因 TypeScript 签名变化放弃入口验证。
- UI 风险：SimpleSFTP 品牌必须来自真实拓扑节点，旧 `ZLK SFTP Manager` 文案不得回归。
- 打包风险：排除规则只能移除已确认的恢复噪声，不能排除运行时、模板、README、LICENSE 或清单。

### 验证清单
- [已通过] 公开 CLI、发布包与 target mode 定向测试 6/6；VSIX 文件清单无 `.claude`/临时 HTML，5 个关键文件均保留。
- [已通过] build、typecheck、lint 与 `git diff --check`。
- [新基线] 全量测试 623 项，587 通过、36 失败；相较 39 项旧恢复边界减少 3 项。
- [已同步] 修复提交 `a9e80bdc9e86b5c9a44e759a01f1782a0e94acbd` 已普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐。

## 本批记录
- 上一完成批次：`recovery-build-041`，修复提交 `6d0d20e06a78e864ed9470300fd45aadc4fe39e6`，记录提交 `0af80e0e1a728e722f7cc496ec2eefbe9a6f62f7`。
- 当前目标状态：`recovery-build-042` 已完成并同步。
- 本批涉及：公开 CLI/UI 测试、VSIX 排除配置与本计划；不修改产品运行时源码。
- 修复提交：`a9e80bdc9e86b5c9a44e759a01f1782a0e94acbd`；真实 VSIX 内容对比、安装、SFTP、服务器、PPT、Docker 和三天历史留存均为 `needs field verification`。
