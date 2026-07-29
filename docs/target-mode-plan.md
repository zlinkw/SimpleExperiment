# 目标模式当前计划：前后端静态优化周期
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 服务器拓扑必须支持“单 Worker”“仅多 Worker”“Hub 可用”三种模式；无 Hub 模式由各 Worker 自行调度且不尝试创建 Hub 或跨节点备份，详细契约与实施流水见 `docs/target-plans/worker-topology-modes.md`。
- 全局约束：不迁移、删除或重写旧任务和结果，不处理历史 VSIX 或 `zlk_cluster/ui/`；禁止“父级 evidence key 被子文件 archive 反向命中”。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- `metrics_summary.csv`、PPT 和论文证据只读取最终归档结果；PPT 绘图目标确认先于 automation，PPT 绘图链路与 realtime post gate 稳定化持续保留。
- GPU 历史和 Docker 兼容验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`；新增补充任务不得破坏当前主目标，计划更新必须防止修复循环。
- 长时间 Webview payload 预算：`schedulerStates`、`experimentTraces` 必须有界；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 必须保留。
- 连接边界固定为 Xshell 本地隧道 + 可选 Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。

## 后续优先级
- [已完成] 1/5 resilience-001：暴露多 Worker 结果摘要缺失，禁止把部分视图呈现为完整聚合。
- [待做] 2/5 resilience-002：审计无 Hub 操作终态与错误归属的前后端反馈。
- [待做] 3/5 resilience-003：压缩结果页高频签名和无效重绘。
- [待做] 4/5 resilience-004：收紧拓扑切换后的本地缓存失效边界。
- [待做] 5/5 resilience-005：执行第二十六轮完整非服务器静态测试并修正新增回归。

## 当前批次：resilience-001（已完成）
### 修复点

- 多 Worker 结果摘要记录预期、可用和缺失 Worker，拓扑模式不再因单个 Worker 请求失败而降级。
- 结果页对部分聚合显示明确警告，避免把可用 Worker 的局部数字误认为全局结果。
- 同步更新已落后的 Worker 拓扑实施文档。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- Hub 模式继续只读取 Hub 权威摘要，不显示 Worker 部分聚合警告。
- 计划不匹配、无效摘要和请求失败均计入缺失 Worker；局部摘要保持只读且不能写回。
- 可用 Worker 的结果归属和 archived-only 数据源保持不变。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] Worker 部分摘要聚合、拓扑保持、结果页警告及相邻结果工作流定向测试，13/13。
- [已通过] TypeScript 构建、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮从静态审计中选择可独立证明的前后端韧性问题，每五批执行一次完整测试。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：仅审计无 Hub 结果操作终态与错误反馈，不扩展文件传输或服务器连接范围。
- 提交记录：本批使用独立 `fix` 提交并推送 `origin/master`；哈希以 Git 历史为准。
