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
- [已完成] 1/5 project-031：为 Plan 运行证据建立专用后端状态构建路径。
- [待处理] 2/5 project-032：缓存前端 Plan 执行阶段派生。
- [待处理] 3/5 project-033：缓存后端 Plan 运行证据合并结果。
- [待处理] 4/5 project-034：审计并优化前端状态与检查器重复派生。
- [待处理] 5/5 project-035：执行第三十七轮完整非服务器静态测试并修正新增回归。

## 当前批次：project-031（已完成）
### 修复点

- 从完整 Webview 状态构建中提取 Plan 运行证据所需的 scheduler 与 operation 状态。
- 重复提交保护、批量运行检查和项目接入状态不再为只读证据判断构建 GPU、trace、诊断与结果等完整面板 payload。
- 完整面板继续复用同一运行证据构建路径，避免两套合并语义漂移。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- scheduler fallback、operation 合并优先级和当前/旧 revision 判定必须保持不变。
- Webview 状态仍须包含同一份有界 scheduler 与 operation 数据。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] Plan 重复提交、项目快速接入、scheduler 预算和 operation 生命周期定向测试，19/19。
- [已通过] TypeScript、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮只处理 Plan 运行证据状态构建热点，最多修改 5 个源码/测试/计划文件。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：缓存前端 Plan 执行阶段派生。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`。
