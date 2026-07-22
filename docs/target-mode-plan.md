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

## 当前批次：recovery-build-031
### 修复点
- 以本机已安装 `SimpleExperiment 0.2.0` 为只读证据，恢复 ProjectAdapterTemplates 多格式结果接入实现。
- 恢复 JSON、TXT、LOG 候选、分类指标别名、项目配置候选和自动归一化模板。
- 恢复 SimpleExperiment 公共名称，不生成或执行项目 Adapter，不修改现有项目输出和实验结果。

### 回归风险
- 结果风险：metadata JSON 不得被模板宣传为有效结果，真实 `metrics.json` 必须可被发现。
- 兼容风险：生成的 Python 模板必须保持语法有效，并兼容现有 CSV 结果接入入口。

### 验证清单
- Adapter template、多格式输出、metadata 排除和任务标签相邻回归：通过 `6/6`；恢复 runtime 与安装版一致。
- 结果位置广域测试仍受未恢复的 PanelHtml 源码提取格式阻塞，登记为后续批次，不属于本批回归。
- build、typecheck、lint、JavaScript 语法和 `git diff --check`：通过。
- [待做] 普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐。

## 本批记录
- 最新完成批次：`recovery-build-030`，PlanArchive source extraction 已验证并同步，提交 `ca706e36db3116eac3ea968636cec264ad0e0fbb`。
- 当前目标状态：`recovery-build-031` 验证通过，待提交同步。
- `recovery-build-031` 提交记录：待验证后填写。
- 真实 SFTP、服务器、PPT 和三天历史留存均为 `needs field verification`。
