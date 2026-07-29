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
- [已完成] 1/5 project-046：缓存前端配置参数结构差异。
- [已完成] 2/5 project-047：缓存 Extension Host 的 SimpleSFTP ABI 就绪派生。
- [已完成] 3/5 project-048：缓存本地 Plan Webview 压缩结果。
- [待做] 4/5 project-049：优化 Scheduler 大批量待运行队列。
- [待做] 5/5 project-050：执行第四十轮完整非服务器静态测试。

## 当前批次：project-048（已完成）
### 修复点

- Extension Host 按 Plan 源数组、选择等价键和压缩上限缓存 Webview Plan 列表。
- 单个 Plan 按对象身份分别缓存“选中”和“未选中”压缩形态，避免心跳状态重复切片、展开和复制摘要。
- 选择键先统一编译为等价键 Set，避免每个 Plan 对每个候选重复建立路径等价集合。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- Plan 源数组、选择键或压缩上限变化后必须重新挑选列表。
- 选中 Plan 仍保留可用 YAML text；未选中 Plan 仍隐藏 text 并保留 textOmitted。
- parseError 优先级、原列表顺序、总数和省略数不得变化；缓存变体必须有界。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] Plan Webview 压缩缓存命中、选择变化、源替换和有界变体定向测试，6/6。
- [已通过] TypeScript、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-046 至 project-050 五批静态优化周期；project-050 再执行完整测试。
- 本批只处理本地 Plan Webview 压缩路径，最多修改 4 个源码、测试、构建和计划文件。
- Plan 列表缓存按源数组使用弱引用，每个源最多保留 8 个最近选择变体；单 Plan 只保留选中和未选中两种弱引用缓存。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：优化 Scheduler 大批量待运行队列；本批使用独立 `perf` 提交并推送 `origin/master`，提交哈希以 git 历史为准。
