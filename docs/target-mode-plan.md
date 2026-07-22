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

## 当前批次：recovery-build-044
### 修复点
- 对齐当前 Plan 的零结果契约诊断 helper，继续验证 revision 作用域与修复后重新运行入口。
- 对齐结果工作台当前紧凑链接结构，保留中文标签、稳定锚点和原始字段提示。
- 从已安装版恢复运行确认中的代码指纹说明；本批不修改产品运行时源码、安装目录或 VSIX。

### 回归风险
- 相邻回归风险：零结果诊断只能读取当前选中 Plan 的当前 revision，其他 Plan 或旧 revision 不得触发修复提示。
- UI 风险：紧凑链接不能丢失数据集、检查点与 PPT 绘图三个真实入口，中文标签和锚点必须同时验证。
- 文档风险：fingerprint 内部字段继续保持兼容，只修改用户可见说明。

### 验证清单
- [已通过] 当前 Plan 结果契约、结果工作台标签与代码指纹定向测试 6/6。
- [已通过] build、typecheck、lint 与 `git diff --check`。
- [新基线] 全量测试 623 项，593 通过、30 失败；相较 33 项旧恢复边界减少 3 项。
- [待同步] 修复提交与 `origin/master` 快进同步。

## 本批记录
- 上一完成批次：`recovery-build-043`，修复提交 `3b9efcc66876a25a46d23fce57d60f6c19a2ab9f`，记录提交 `bfe639bf7ace1f2288ffe05e2c76dfda0b489f55`。
- 当前目标状态：`recovery-build-044` 已完成，待提交同步。
- 本批涉及：结果工作流/UI 测试、配置说明与本计划；不修改产品运行时源码。
- 真实结果文件、PPT 绘图、SFTP、服务器、Docker 和三天历史留存均为 `needs field verification`。
