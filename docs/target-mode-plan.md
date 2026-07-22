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

## 当前批次：recovery-build-041
### 修复点
- 以 Git、当前源码和本机已安装 `SimpleExperiment 0.2.0` 为只读证据，对齐快速项目接入测试契约。
- 测试夹具补入当前接入完成态依赖，覆盖 Agent 检测、配置按钮文案、入口选择签名和带任务范围的面板导航。
- 本批只修改一个接入流程测试与本计划；不修改产品源码、安装目录或 VSIX。

### 回归风险
- 相邻回归风险：快速接入测试必须继续验证完整门禁顺序，不能只放宽正则以隐藏行为缺失。
- 夹具风险：`projectBootstrapCompletion` 新增依赖后必须与源码一起加载，避免把测试环境缺失误判为产品故障。
- 兼容风险：三参数面板导航和项目根参数已由已安装版本印证，旧入口与命令 ID 不得改变。

### 验证清单
- [已通过] 快速项目接入定向测试：`projectQuickStartWorkflow.test.js` 5/5，`projectRunPreflightWorkflow.test.js` 10/10。
- [已通过] `npm run build`、`npm run typecheck`、`npm run lint` 与 `git diff --check`。
- [新基线] 全量测试 623 项，584 通过、39 失败；相较 49 项旧恢复边界减少 10 项。剩余失败属于既有恢复边界，未扩展本批范围。
- [待同步] 修复提交与 `origin/master` 快进同步。

## 本批记录
- 上一完成批次：`docker-plugin-plan-001`，计划提交 `5f72761e143850df7ee28cd89ae17a897ddb3022`，记录提交 `82d62cb1e4b347186da8abec8ace494e31fa4698`。
- 当前目标状态：`recovery-build-041` 已完成，待提交同步。
- 本批涉及：快速项目接入测试与本计划；不修改产品源码，生成的 `dist` 不计入文件上限。
- 真实 SFTP、服务器、PPT、Docker 和三天历史留存均为 `needs field verification`。
