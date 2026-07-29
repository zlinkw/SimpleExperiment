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
- [已完成] 2/5 project-032：缓存前端 Plan 执行阶段派生。
- [已完成] 3/5 project-033：缓存后端 Plan 运行证据合并结果。
- [已完成] 4/5 project-034：审计并优化前端状态与检查器重复派生。
- [待处理] 5/5 project-035：执行第三十七轮完整非服务器静态测试并修正新增回归。

## 当前批次：project-034（已完成）
### 修复点

- 同一前端 state 内复用项目端点就绪与代码同步就绪检查，避免总览、Plan、资源树和操作刷新重复遍历 Worker 状态。
- 缓存当前结果输出契约检查，并按 Plan 路径、revision 与更新时间缓存当前 revision 运行证据。
- state 或 Plan 版本变化时立即失效；运行证据缓存保持 64 项上限。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- Hub/Worker 版本、项目根、依赖、代码指纹和 Worker 必需性判定必须保持不变。
- 输出契约操作时序、Plan 版本匹配和 scheduler fallback 语义必须保持不变。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 前端项目就绪、结果检查器、缓存命中/失效/边界定向测试，30/30。
- [已通过] TypeScript、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮只处理两组已确认的前端重复派生热点；因结果自动解析测试需同步缓存沙箱，最多修改 4 个源码/测试/计划文件。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：执行第三十七轮完整非服务器静态测试。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`。
