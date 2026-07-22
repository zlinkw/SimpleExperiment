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

## 当前批次：recovery-build-043
### 修复点
- 以当前源码与本机已安装 `SimpleExperiment 0.2.0` 为证据，对齐项目 UI 布局状态测试夹具和私有 client 方法签名。
- 从已安装版恢复配置说明中的工作区切换隔离契约，明确旧项目异步回调不能写入新项目。
- 本批只修改两个项目状态测试、配置说明与本计划；不修改产品运行时源码、安装目录或 VSIX。

### 回归风险
- 相邻回归风险：布局夹具只移除 VM 无法执行的 TypeScript 泛型，持久化读写与字段断言必须保持完整。
- 隔离风险：工作区切换必须先递增 generation 并重置项目态，旧文件读取、探测、快照和 realtime 回调均不能覆盖新项目。
- 文档风险：恢复内容只采用本机已安装版的明确证据，不扩写未经验证的行为。

### 验证清单
- [已通过] 项目布局状态与工作区切换隔离定向测试 6/6。
- [已通过] build、typecheck、lint 与 `git diff --check`。
- [新基线] 全量测试 623 项，590 通过、33 失败；相较 36 项旧恢复边界减少 3 项。
- [待同步] 修复提交与 `origin/master` 快进同步。

## 本批记录
- 上一完成批次：`recovery-build-042`，修复提交 `a9e80bdc9e86b5c9a44e759a01f1782a0e94acbd`，记录提交 `893a384023a036d9fd09427fe6cec2be027f13d3`。
- 当前目标状态：`recovery-build-043` 已完成，待提交同步。
- 本批涉及：项目布局/切换隔离测试、配置说明与本计划；不修改产品运行时源码。
- 真实工作区切换、网络回调、SFTP、服务器、PPT、Docker 和三天历史留存均为 `needs field verification`。
