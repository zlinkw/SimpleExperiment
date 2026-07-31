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
- [已完成] 1/5 project-201：改为就地分组完整性矩阵计划项。
- [已完成] 2/5 project-202：合并 GPU 历史采样间隔差值收集。
- [已完成] 3/5 project-203：合并结果仪表盘记录统计遍历。
- [待处理] 4/5 project-204：合并前端任务状态 payload 行派生。
- [待处理] 5/5 project-205：执行第七十一轮完整非服务器静态测试。

## 当前批次：project-203（已完成）
### 修复点

- 结果仪表盘单次遍历记录，同时收集实验数、状态计数、论文候选及每个 suite 的最佳结果。
- 最佳结果改为在线比较，避免 suite 数组复制、过滤和排序，并复用一次 metric schema 查找。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- suite 输出顺序、无有限主指标时的空结果、higher/lower 方向和并列首项必须保持不变。
- parsed、parse_failed、paper-candidate 与唯一 experiment 计数必须保持不变。
- validation warning 与 coverage 仍使用现有独立契约，不得混入记录遍历逻辑。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 仪表盘单次统计、suite 最优方向、并列、空指标与计数定向 Node 测试，19/19。
- [已通过] `git diff --check`；仅有既有 Windows 行尾提示。

## 本批记录
- project-202 已由提交 `6d1c1fc` 同步至 `origin/master`。
- 本批仅处理后端结果仪表盘记录统计、对应测试和计划文档；无视觉样式变化，不调用截图。
- 记录计数与 suite 最优结果改为单次遍历在线聚合，方向、并列和空指标语义不变；19/19 定向测试通过。
