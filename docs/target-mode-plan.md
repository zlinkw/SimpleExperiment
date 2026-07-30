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
- [已完成] 2/5 project-187：合并前端 Plan trace 范围统计遍历。
- [待处理] 3/5 project-188：合并后端文件传输 Webview 分类遍历。
- [待处理] 4/5 project-189：复用前端布局分区固定查找表。
- [待处理] 5/5 project-190：执行第六十八轮完整非服务器静态测试。

## 当前批次：project-187（已完成）
### 修复点

- Plan trace 范围派生在一次遍历中同时收集当前 Plan 行并统计无 Plan 行，避免对同一 trace 数组重复过滤。
- 保持 selected/all 模式、Plan revision 与更新时间匹配、缓存键和返回对象结构不变。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 有 Plan、旧 revision、无 Plan 三类 trace 的分类和原始顺序不得改变。
- `scopeMode=all` 仍返回原数组，selected 模式仅返回匹配当前 revision 或更新时间边界的行。
- 稳定 rows/state/mode 必须复用同一缓存对象，替换 rows 或 state 后必须失效。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] Plan trace 单次遍历、范围匹配与缓存失效定向 Node 测试，5/5。
- [已通过] `git diff --check`；仅有既有 Windows 行尾提示。

## 本批记录
- project-186 已由提交 `8cf8c24` 同步至 `origin/master`。
- 本批仅处理前端 Plan trace 范围派生、对应测试和计划文档；无视觉样式变化，不调用截图。
- Plan trace 每个缓存变体只遍历一次输入行，同时产出 selected 行与 unscoped 数量；5/5 定向测试通过。
