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

## 当前批次：recovery-build-038
### 修复点
- 以 Git、README、当前实现和本机已安装 `SimpleExperiment 0.2.0` 为只读证据，对齐归档 Plan 恢复与嵌套 Plan 归档测试契约。
- 保留当前实现的独立恢复版本、`experiments/restored_assets/<restored-plan>/` 资产目录、独立结果范围和 nested `_archived` 目录行为。
- 不回退已验证的归档安全边界，不修改归档数据、安装目录或用户文件。

### 回归风险
- 相邻回归风险：恢复测试不得要求已被当前实现和安装版淘汰的旧资产路径或强制打开 YAML。
- 归档风险：恢复版本必须与原 Plan、配置、环境、参数、结果范围和输出命名空间隔离。
- 路径风险：nested Plan 归档必须保留相对目录，不能把不同子目录同名 Plan 汇聚覆盖。

### 验证清单
- [已通过] 归档恢复、nested Plan、归档 bundle/UI 与目标计划定向测试，`21/21`。
- [已通过] `npm run build`、`npm run typecheck`、`npm run lint`、`git diff --check`。
- [基线] 全量恢复审计 `566/620` 通过，剩余 `54` 项为后续恢复边界；本批目标测试均通过。
- [待同步] 检查批次 diff，提交并普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐。

## 本批记录
- 最新完成批次：`recovery-build-037`，修复提交 `ad30d7b12d5935c33a8aaf4a9b5789012abfc4a1`，记录提交 `fe713345b66b135d82e55e2c636a1c76745101e2`。
- 当前目标状态：`recovery-build-038` 已验证，待同步。
- 本批涉及：两个归档相关定向测试和本计划；不修改产品源码，生成的 `dist` 不计入文件上限。
- 真实 SFTP、服务器、PPT 和三天历史留存均为 `needs field verification`。
