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

## 当前批次：recovery-build-046
### 修复点
- 对齐资源树测试与当前 Xshell 会话、服务器状态对象入口。
- 修复面板首屏测试对 TypeScript 返回类型的加载兼容。
- 对齐 GPU 渲染预算说明与当前按显卡卡片折叠的行为；本批不修改产品运行时源码、安装目录或 VSIX。

### 回归风险
- 相邻回归风险：资源树必须保留服务器对象入口，不能退化为只有分区标题。
- 首屏风险：测试渲染器必须执行真实模板，不能因 TypeScript 签名在 VM 解析前失败。
- GPU 风险：预算提示必须说明未展开的是 GPU 卡片，不能误称为进程过滤。

### 验证清单
- [已通过] 资源树、首屏图例与 GPU 说明定向测试 3/3。
- [已通过] build、typecheck、lint 与 `git diff --check`。
- [新基线] 全量测试 623 项，599 通过、24 失败；相较 27 项旧恢复边界减少 3 项。
- [已同步] 修复提交 `12918e224e2158f33483ca4cd25c73f312c2b097` 已普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐。

## 本批记录
- 上一完成批次：`recovery-build-045`，修复提交 `5e328da24c06f648d4d29399ffd1109145b3cf42`，记录提交 `26de49354cffcf6c1c2d11160f27df80325a623e`。
- 当前目标状态：`recovery-build-046` 已完成并同步。
- 本批涉及：面板 UI 契约测试与本计划；不修改产品运行时源码。
- 修复提交：`12918e224e2158f33483ca4cd25c73f312c2b097`；真实结果文件、PPT 绘图、SFTP、服务器、Docker 和三天历史留存均为 `needs field verification`。
