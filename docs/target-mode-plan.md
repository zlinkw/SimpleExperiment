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
- [已完成] Hub/Worker、端口诊断、操作时间线、Plan action 和服务器设置 tooltip 恢复批次已提交；历史细节以 git 为准。
- [待做] PPT 绘图链路与 realtime post gate 稳定化后的现场验收。

## 当前批次：recovery-build-039
### 修复点
- 以 Git、当前实现和本机已安装 `SimpleExperiment 0.2.0` 为只读证据，对齐 operation 终态结果刷新、Plan scoped PPT 路径和 realtime snapshot 终态测试契约。
- 测试覆盖结果刷新使用 operation 的 `planFile`、PPT 仅使用当前 Plan 的最终 artifact 路径，以及重连后终态不被旧进度或快照覆盖。
- 不修改产品源码、安装目录、归档数据或用户文件；Node 测试通过已编译 `dist` 加载 TypeScript 模块行为。

### 回归风险
- 结果刷新风险：异步 operation 终态必须保留 Plan 上下文，并在需要时排队重新解析后刷新摘要。
- 路径风险：PPT 入口不得退回全局 `zlk_cluster/results/*`，避免跨 Plan 读取旧统计或契约。
- 运行时风险：测试不得让 Node 24 直接解释带类型导入的 `.ts`，但仍需验证构建产物与源码一致。

### 验证清单
- [已通过] operation 结果刷新、Plan scoped anomaly/PPT 和 realtime operation snapshot 定向测试，`7/7`。
- [已通过] `npm run build`、`npm run typecheck`、`npm run lint`、`git diff --check`。
- [基线] 全量恢复审计 `571/623` 通过，剩余 `52` 项为后续恢复边界；本批目标测试均通过。
- [已同步] 修复提交 `ddbfb3d21e03dabaac01a39e535b3a07f6a3f0d0` 已普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐。

## 本批记录
- 最新完成批次：`recovery-build-038`，修复提交 `394badbffec36eac85c570e8d3a8fba4b8336970`，记录提交 `155a5304211cb76a8250c7885bd0269e15ac1f6e`。
- 当前目标状态：`recovery-build-039` 已完成。
- 本批涉及：三个相邻 operation/result UI 测试和本计划；不修改产品源码，生成的 `dist` 不计入文件上限。
- `recovery-build-039` 修复提交：`ddbfb3d21e03dabaac01a39e535b3a07f6a3f0d0`；真实 SFTP、服务器、PPT 和三天历史留存均为 `needs field verification`。
