# 目标模式当前计划：GPU 历史低频稳定化与 Xshell 边界
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

## 后续优先级
- [待现场验证] 服务器状态页三天 GPU 历史曲线，详见 `docs/target-plans/server-gpu-history.md`。
- [已完成] SimpleExperiment 恢复基线、target mode 压缩契约和 UI 契约修复；全量测试基线 624/624。
- [已完成] Docker Codex 的 SimpleExperiment 与 SimpleSFTP 宿主路径接入、远程编辑器 URI 保留和传输位置确认，详见 `docs/target-plans/docker-codex-plugin-compat.md`。
- [待现场验证] Docker Codex 的双插件多窗口租约、真实 SFTP 上传和 Xshell `127.0.0.1` 联调验收；两插件租约心跳截断竞态已修复，自动化验证通过。
- [已完成] Hub/Worker、端口诊断、操作时间线、Plan action 和服务器设置 tooltip 恢复批次已提交；历史细节以 git 为准。
- [待做] PPT 绘图链路与 realtime post gate 稳定化后的现场验收。
- [已完成自动化] GPU 三天历史按本机一分钟采样，停止高频历史请求和状态闪动；所有服务器通信继续强制经过 Xshell 本地隧道，不允许一次性 SSH 轮询。

## 当前批次：gpu-history-stability-001
### 修复点
- 仅在用户真实地从关闭切换到展开时请求历史；同一查询一分钟内复用缓存，保留成功数据，禁止重绘产生的 toggle 请求循环和 loading/rate_limited 闪动。
- 历史采样桶改为一分钟并保留三天；查询继续按界面预算降采样，不进入实验结果、归档、CSV 或 PPT 数据源。
- 审计 GPU 历史及相邻运行态 API，所有服务器通信只能访问 Xshell 持久隧道的 `127.0.0.1` 端点，不得启动 SSH/SCP/rsync 子进程或建立一次性 SSH 连接。

### 回归风险
- 相邻回归风险：首次展开仍须加载；切换不同 GPU 不得错误复用查询；离线和真实错误仍须可见；一分钟采样后留存点数、缺口判断和 payload 上限必须一致。

### 验证清单
- [已通过] GPU 历史缓存、真实 toggle、稳定状态和一分钟采样回归测试；相关测试 14/14。
- [已通过] localhost/Xshell-only 传输边界测试 4/4；全量测试 669/669；build、typecheck、lint 和 VSIX 闭包检查通过。
- [待执行] 分批提交并推送 `origin/master`，打包唯一命名 VSIX 后覆盖安装。

## 本批记录
- 上一完成批次：`ui-plan-selection-001`，提交 `1f1f767` 已与 `origin/master` 同步。
- 当前目标状态：自动化修复和通信边界审计通过；真实服务器连续三天留存和现场视觉行为仍为 `needs field verification`。
