# 目标模式当前计划：前后端静态优化周期
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不手工修改安装目录；仅在完成独立备份后，按用户本批明确授权通过 VS Code CLI 安装新版 VSIX；不覆盖已有 VSIX，不删除完整文件，不把未验证实验声明当作事实。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- 结果证据使用最终归档结果；`metrics_summary.csv`、PPT 和论文证据不得混入临时结果；PPT 绘图目标确认必须先于 automation 调用，且不迁移、删除或重写旧任务和结果。
- PPT 绘图链路与 realtime post gate 稳定化继续保留；GPU 历史与 Docker 兼容后续验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`。
- 连接边界：Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 新增补充任务不得破坏当前主目标；计划更新必须防止修复循环。
- 禁止“父级 evidence key 被子文件 archive 反向命中”。
- 长时间 Webview payload 预算：`schedulerStates` 与 `experimentTraces` 必须限量、压缩并保留受保护记录；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 由代码和测试覆盖。
- 当前窗口持续用于开发；禁止重载、关闭或自动操作 VS Code。
- 当前不连接服务器；只执行本地静态检查，不运行真实 Xshell、SimpleSFTP、GPU 或 Agent 联调。
- 每批最多 2 至 3 个强相关问题、8 个源码/文档/测试文件，并独立提交、推送到 `origin/master`。
- 每 5 个完成批次执行一次全量静态测试；其余批次只跑定向检查。

## 后续优先级：第三个五批周期
- [已完成] 1/5 后端：加固长时间 Webview 状态签名的边界与深层变更覆盖。
- [已完成] 2/5 前端：持久化操作筛选，避免面板重建后丢失本地视图偏好。
- [已完成] 3/5 前端：统一任务和结果记录的分钟级时间反馈。
- [待做] 4/5 后端：审计状态构建中的重复归一化与无效对象分配。
- [待做] 5/5 前后端：执行第三轮非服务器静态测试。

## 当前批次：autonomous-static-013（已完成）

### 范围
- 任务卡与任务详情显示更新时间或终态时间的分钟级相对值。
- 结果记录卡、详情和时间线使用相同相对时间格式，悬停保留原始时间。
- 任务与结果分区签名加入分钟桶，复用已有 Webview 心跳自然刷新。

### 保护区
- 不修改服务器通信、Xshell、SimpleSFTP、GPU、Agent、归档和 PPT 行为。
- 不处理现有用户删除项、历史 VSIX 或 `zlk_cluster/ui/`。
- 不重载或关闭 VS Code，不执行真实网络联调。

### 相邻回归风险
- 不创建前端定时器、不增加状态请求或服务器采样频率。
- 状态、耗时、排序和 Plan 归属逻辑保持不变；无效时间明确显示“时间未知”。

### 验证清单
- [已通过] TypeScript、Lint、内联脚本语法及任务/结果时间反馈定向测试 19/19。
- [跳过] 广泛测试；本周期第 5 批执行。

## 本批记录
- 上一周期已完成基线：`ec8fa5b`，597/597 非服务器静态测试通过并已同步远程。
- 本周期 1/5：`perf: bound realtime state hashing`；推送后以 `origin/master` Git 历史为准。
- 本周期 2/5：`ui: persist operation status filter`；推送后以 `origin/master` Git 历史为准。
- 本周期 3/5：`ui: align task and result timestamps`；推送后以 `origin/master` Git 历史为准。
- 下一批边界：仅审计状态构建中的重复归一化和对象分配，不改变输出契约。
