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
- [已完成] 1/5 project-181：缓存后端 GPU 归属配置状态。
- [已完成] 2/5 project-182：合并前端 GPU 渲染预算计数遍历。
- [已完成] 3/5 project-183：缓存后端当前 Plan 接入提示。
- [已完成] 4/5 project-184：复用前端任务状态统计。
- [待处理] 5/5 project-185：执行第六十七轮完整非服务器静态测试。

## 当前批次：project-184（已完成）
### 修复点

- Plan 运行工作台复用已有任务状态统计缓存，不再对同一任务数组执行三次过滤。
- 运行、排队和失败数量统一来自 `overviewTaskStats`，保持状态归类一致。
- 保持调度队列文案、色调和静态容量回退逻辑不变。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- Plan 工作台与首屏任务统计必须读取同一份当前 scheduler 行。
- 任务数组替换后统计缓存必须失效，稳定数组必须复用同一结果对象。
- running、testing、queued、pending 和失败类状态计数不得改变。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] Plan 工作台任务统计复用与状态分类定向 Node 测试，17/17。
- [已通过] `git diff --check`。

## 本批记录
- project-183 已由提交 `f77aa8d` 同步至 `origin/master`。
- 本批仅处理前端 Plan 工作台任务状态统计复用、对应测试和计划文档；无视觉样式变化，不调用截图。
- project-184 构建与 17/17 定向测试通过；下一批仅执行第六十七轮完整非服务器静态测试。
