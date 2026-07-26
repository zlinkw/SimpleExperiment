# 目标模式当前计划：前后端静态优化周期
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不迁移、删除或重写旧任务和结果，不处理历史 VSIX 或 `zlk_cluster/ui/`；禁止“父级 evidence key 被子文件 archive 反向命中”。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- `metrics_summary.csv`、PPT 和论文证据只读取最终归档结果；PPT 绘图目标确认先于 automation，PPT 绘图链路与 realtime post gate 稳定化持续保留。
- GPU 历史和 Docker 兼容验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`；新增补充任务不得破坏当前主目标，计划更新必须防止修复循环。
- 长时间 Webview payload 预算：`schedulerStates`、`experimentTraces` 必须有界；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 必须保留。
- 连接边界固定为 Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 当前不连接服务器，只执行本地静态检查且不重载、关闭 VS Code；每批最多 8 个源码/文档/测试文件并推送 `origin/master`，每 5 批执行一次全量静态测试。

## 后续优先级
- [待做] 1/5 前端：优化计划与发布分区的下一步指引。
- [待做] 2/5 后端：审计 Agent 操作事件写入与索引。
- [待做] 3/5 前端：优化结果证据分区的证据可追溯性。
- [待做] 4/5 后端：审计文件传输状态与进度派生。
- [待做] 5/5 前后端：执行第二十二轮非服务器静态测试。

## 当前批次：autonomous-static-105（已完成）
### 修复点

- 执行第二十一轮全量非服务器静态测试，覆盖 784 个用例。
- 确认本轮五批改动（任务运行态标签、GPU 陈旧区分、时区修复、可用性修剪、反馈层级）无回归。
- 未发现新的失败用例，无需修复补丁。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- Python 侧时间年龄判定必须始终按 UTC 解析，新增 TTL 逻辑须复用 `iso_age_seconds`。
- 跨 vm 上下文的对象与数组断言需比较标量字段而非引用相等。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Agent 与 Scheduler 运行时生成一致性。
- [已通过] 全量静态测试 784/784。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 本轮周期含两处真实缺陷修复：UTC 时间解析与可用性条目无界增长。
- 清理后用例基数 765，本轮新增 5 个定向测试文件后升至 784。
- 提交记录：本批使用独立 `test` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
