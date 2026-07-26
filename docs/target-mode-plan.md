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
- [已完成] 1/5 后端：限制运行日志尾部读取字节数，避免大日志全量载入。
- [已完成] 2/5 前端：缓存当前状态内按 Plan 版本筛选的操作与任务行。
- [待做] 3/5 后端：审计 Agent 快照采样中的重复序列化。
- [待做] 4/5 前端：审计结果与操作视图的重复派生。
- [待做] 5/5 前后端：执行第十五轮非服务器静态测试。

## 当前批次：autonomous-static-071（已完成）
### 修复点

- 同一 Webview 状态内复用按 Plan、版本和更新时间筛选的操作行。
- 终态任务回退复用同一范围的任务行，避免多个入口重复扫描状态数组。
- 状态对象变化时整体失效，并限制每类缓存最多 64 个 Plan 范围。

### 相邻回归风险

- Plan 等价路径、revision 和更新时间回退语义必须保持不变。
- 新状态不能命中旧状态的操作或任务行。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 同状态复用、状态失效、Plan 范围隔离和缓存上限回归测试 6/6。
- [已通过] TypeScript、Lint、Panel 脚本语法和 `git diff --check`。

## 本批记录
- `planExecutionStage`、`planPreflightSummary` 和多处工作台入口会针对同一 Plan 重复筛选操作行。
- 本批只缓存派生行，不修改运行阶段判定、按钮路由或布局。
- 首次缓存测试的 VM 计数器未正确回传宿主；改为共享计数对象后实现行为验证通过。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
