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

## 当前批次：recovery-build-037
### 修复点
- 以 Git、当前结果契约和本机已安装 `SimpleExperiment 0.2.0` 为只读证据，恢复嵌套 JSON、维度、metric list、split metric 和 CSV wide metric 解析。
- 阻止 `zlk_cluster/archive/...` 归档路径生成活动结果目录变体，避免归档记录反向命中当前结果。
- case-level `metrics_case.csv` 仅用于错误样本和子组检查，不进入论文级最终结果。
- 适配结果面板契约测试与当前编译式 TypeScript 结构；不修改实验数据、归档内容、已安装扩展或文件传输边界。

### 回归风险
- 相邻回归风险：metric alias、split 和同名指标不得静默覆盖，维度字段不得误识别为指标。
- 证据风险：case-level 明细、临时结果和归档路径不得进入最终 CSV、PPT 或论文证据链。
- 路径风险：归档路径隔离不得破坏合法活动目录和旧版受管路径匹配。

### 验证清单
- [已通过] `npm run build`、`npm run typecheck`、`npm run lint`、`git diff --check`。
- [已通过] nested JSON、输出 gate、result management、advanced result 与 archive path 定向测试，`30/30`。
- [基线] 全量恢复审计 `563/620` 通过，剩余 `57` 项为后续恢复边界；本批目标测试均通过。
- [待同步] 检查批次 diff，提交并普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐。

## 本批记录
- 最新完成批次：`recovery-build-036`，提交 `70b58c8bbaaa36d6aee8ccd235e9c1b38ccb497f`，记录提交 `df1c1eba9f43565325180751d9c29c4b21a996f5`。
- 当前目标状态：`recovery-build-037` 已验证，待同步。
- 本批涉及：`src/features/Results.ts`、`src/syncState.ts`、两个定向测试和本计划；对应生成的 `dist` 不计入文件上限。
- 真实 SFTP、服务器、PPT 和三天历史留存均为 `needs field verification`。
