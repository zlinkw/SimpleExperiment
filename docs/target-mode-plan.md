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
- [已完成] 1/5 project-126：复用前端任务活动状态集合。
- [待处理] 2/5 project-127：复用后端端点健康状态集合。
- [待处理] 3/5 project-128：复用前端 Plan 工作流阶段集合。
- [待处理] 4/5 project-129：复用后端运行与终态分类集合。
- [待处理] 5/5 project-130：执行第五十六轮完整非服务器静态测试。

## 当前批次：project-126（已完成）
### 修复点

- 将任务运行、测试、排队和等待状态提升为前端固定集合。
- 避免 Plan 工作台计数、任务筛选、按钮和日志判断重复创建状态数组。
- 增加任务排序优先级、活动行和固定集合接线回归。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 运行、测试、排队、等待和失败任务的计数与渲染优先级不得改变。
- 停止按钮、实时日志和任务详情色调继续使用原有状态语义。
- 定向测试必须使用回收站保护预加载；失败时不得提交或推送成功记录。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 任务紧凑视图、实时状态和前端脚本语法定向 Node 测试，14/14。
- [已通过] `git diff --check`。

## 本批记录
- 本轮建立 project-126 至 project-130 五批静态优化周期；project-130 再执行完整测试。
- 上一轮 project-121 至 project-125 已由提交 `e63a014`、`bb5a652`、`8f8b423`、`7b3ca31`、`c93d0f1` 同步至 `origin/master`。
- 本批仅处理前端任务活动状态固定集合、对应定向测试和计划文档。
- project-126 构建与 14/14 定向测试通过；无视觉变化，不调用截图。
- 不触碰任务预算、排序规则或服务器通信；下一批仅处理后端端点健康状态集合。
