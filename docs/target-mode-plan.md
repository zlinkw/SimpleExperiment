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
- [已完成] 1/5 后端：按文件签名缓存只读 Agent 快照 JSON。
- [已完成] 2/5 前端：审计结果工作流派生状态缓存。
- [待做] 3/5 后端：审计运行态文件索引和列表读取。
- [待做] 4/5 前端：审计项目与服务器视图重复扫描。
- [待做] 5/5 前后端：执行第十六轮非服务器静态测试。

## 当前批次：autonomous-static-076（已完成）
### 修复点

- 按 Webview 状态对象与 Plan 路径缓存结果工作流派生状态。
- 同一状态内保留有限 Plan 条目；状态对象变化时整体失效。
- 保持 Plan revision、最终归档结果、输出契约和 PPT 门禁逻辑不变。

### 相邻回归风险

- Plan 切换不能复用其他 Plan 的结果阶段。
- 新状态不能返回旧结果摘要、trace 或分析产物派生值。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 同状态同 Plan 复用、Plan 隔离、状态失效和缓存上限测试 1/1。
- [已通过] 定向静态测试 5/5、TypeScript、Lint、内联脚本语法和 `git diff --check`。

## 本批记录
- 项目引导流重复派生自动解析、trace 统计、输出契约与分析产物状态。
- 本批只缓存纯只读派生结果，不改变结果源或归档判定。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
