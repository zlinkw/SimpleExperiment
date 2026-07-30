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
- [已完成] 1/5 project-186：合并后端 Worker 结果聚合分类。
- [待处理] 2/5 project-187：合并前端 Plan trace 范围统计遍历。
- [待处理] 3/5 project-188：合并后端文件传输 Webview 分类遍历。
- [待处理] 4/5 project-189：复用前端布局分区固定查找表。
- [待处理] 5/5 project-190：执行第六十八轮完整非服务器静态测试。

## 当前批次：project-186（已完成）
### 修复点

- Worker 结果聚合在构造 submission 行时同步收集失败与成功候选，减少重复数组过滤和线性 `includes` 查找。
- 保持 Worker 输出顺序、重复 Worker id、混合终态和用户可见汇总文案不变。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 同一 Worker 同时出现成功与失败 submission 时，成功列表仍必须排除该 Worker 的全部成功行。
- 纯成功的重复 Worker id 必须保持原有重复项与顺序，失败和取消状态均归入失败列表。
- 聚合状态、操作 id、原始 result、统计数量和中文文案不得改变。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] Worker 结果聚合顺序、重复 id、混合终态与单次分类定向 Node 测试，修正后 7/7。
- [已通过] `git diff --check`；仅有既有 Windows 行尾提示。

## 本批记录
- project-185 已由提交 `bbd87eb` 同步至 `origin/master`。
- 本批仅处理后端 Worker 结果聚合、对应测试和计划文档；无视觉样式变化，不调用截图。
- 定向测试首次 6/7，原因是测试直接提取的函数含 TypeScript 数组注解；改用等价运行时初始化后构建与 7/7 复测通过。
- Worker 结果分类改为构造 submission 时收集失败与成功候选，使用 `Set` 排除混合终态 Worker，保持原有顺序和重复项。
