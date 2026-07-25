# 目标模式当前计划：前后端静态优化周期
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
- 当前窗口持续用于开发；禁止重载、关闭或自动操作 VS Code。
- 当前不连接服务器；只执行本地静态检查，不运行真实 Xshell、SimpleSFTP、GPU 或 Agent 联调。
- 每批最多 2 至 3 个强相关问题、8 个源码/文档/测试文件，并独立提交、推送到 `origin/master`。
- 每 5 个完成批次执行一次全量静态测试；其余批次只跑定向检查。

## 五批周期
- [已完成] 1/5 后端：修复 `OperationQueue` 手动取消被误记为超时，并限制历史记录内存。
- [已完成] 2/5 前端：优化首次状态与空状态反馈，不依赖截图验收。
- [已完成] 3/5 后端：加固 Webview 状态发送失败后的恢复与诊断。
- [已完成] 4/5 前端：优化操作时间线可读性与终态反馈。
- [待做] 5/5 前后端：补齐 Plan 归档参数审计并执行全量静态测试。

## 当前批次：autonomous-static-004（已完成）

### 范围
- 在操作汇总中独立显示取消或停止，不再混入成功完成数量。
- 为成功、取消和失败终态提供明确默认反馈，并减少无效进度占位。
- 仅修改 `src/ui/PanelHtml.ts`、对应测试、构建产物和本计划。

### 保护区
- 不修改服务器通信、Xshell、SimpleSFTP、GPU、Agent、归档和 PPT 行为。
- 不处理现有用户删除项、历史 VSIX 或 `zlk_cluster/ui/`。
- 不重载或关闭 VS Code，不执行真实网络联调。

### 验证
- [已通过] TypeScript、Lint 与生成 JS 语法检查。
- [已通过] 操作时间线、终态反馈与相邻生命周期定向静态测试 12/12。
- [跳过] 全量测试；周期批次 5 执行。

## 批次记录
- 0/5 基线：`f7db9ff`，上一目标已归档到 Git 历史。
- 1/5 完成提交：`1419226 fix: correct operation cancellation lifecycle`，已推送并确认与 `origin/master` 一致。
- 2/5 完成提交：`e94b5e8 fix: clarify initial panel state feedback`，已推送并确认与 `origin/master` 一致。
- 3/5 完成提交：`ce2bbee fix: recover failed webview state posts`，已推送并确认与 `origin/master` 一致。
- 4/5 完成提交：`fix: clarify operation terminal outcomes`；推送后以 `origin/master` Git 历史为准。
- 下一批边界：审计 Plan 归档参数完整性并执行全量静态测试，不连接服务器。
