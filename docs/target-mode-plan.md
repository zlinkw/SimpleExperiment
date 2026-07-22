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

## 当前批次：docker-plugin-plan-001
### 修复点
- 新增独立计划 B，固定 Docker Codex 输入接口、Windows UI Extension Host 边界、双路径模型、单窗口操作租约和分仓实施批次。
- 固定 `plugin-drop` 的双 VSIX 与 `plugin-compat-result.json` 输出接口，并将该计划加入后续优先级。
- 本批只修改目标计划与文档契约测试；不执行插件源码改造、构建、安装或 VSIX 替换。

### 回归风险
- 相邻回归风险：计划 A 的 `plugin-handoff.json` 与 `PLUGIN-HANDOFF.md` 尚未在本仓库验收，实施启动条件仍未满足。
- SimpleSFTP 位于独立仓库，后续必须分别提交、验证和交付，不能跨仓库混合提交。
- Windows 回归、远程工作区、双插件联调和 VSIX 交付均为 `needs experiment`，不得提前标记通过。

### 验证清单
- [已通过] target mode 计划压缩 dry run，结果为 `already-compact`。
- [已通过] target mode 文档契约定向测试，`3/3`。
- [已通过] `git diff --check`。
- [已同步] 文档提交 `5f72761e143850df7ee28cd89ae17a897ddb3022` 已普通快进推送 `origin/master`，fetch 后确认本地 `HEAD` 对齐。

## 本批记录
- 上一完成批次：`recovery-build-040`，修复提交 `68617e201748fbd97fde6d5443ed03bda442b81c`，记录提交 `8c94dd01c45ba1f1e07a3f935e16dc194af5e743`。
- 当前目标状态：`docker-plugin-plan-001` 已完成。
- 本批涉及：Docker Codex 插件兼容计划、当前计划索引和文档契约测试；不修改产品源码或产物。
- 计划提交：`5f72761e143850df7ee28cd89ae17a897ddb3022`；真实 Windows、Dev Container、SFTP、Xshell 和多窗口联调均为 `needs experiment`。
