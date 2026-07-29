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
- [已完成] 1/5 project-106：复用前端资源与检查器分类集合。
- [已完成] 2/5 project-107：复用实时状态压缩排序表。
- [待处理] 3/5 project-108：复用前端命令生命周期分类集合。
- [待处理] 4/5 project-109：复用结果解析固定指标集合。
- [待处理] 5/5 project-110：执行第五十二轮完整非服务器静态测试。

## 当前批次：project-107（已完成）
### 修复点

- 将实时操作/传输记录和通用任务/轨迹行的状态优先级提升为模块级排序表。
- 避免每次有界压缩比较重复创建六组固定状态数组并执行多次线性查找。
- 增加定向回归，覆盖活动、失败、未知和已完成状态在滑动窗口压缩中的保留顺序。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 活动记录优先级保持 0，失败或残留保持 1，未知保持 2，完成或归档保持 3。
- 调度、轨迹、操作、传输和 Worker 任务的既有缓存上限与时间排序必须保持不变。
- 定向测试必须使用回收站保护预加载；失败时不得提交或推送成功记录。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] realtime state budget 定向 Node 测试，4/4。
- [已通过] `git diff --check`。

## 本批记录
- 本轮建立 project-106 至 project-110 五批静态优化周期；project-110 再执行完整测试。
- project-106 已由提交 `c3c96fb` 同步至 `origin/master`。
- 本批仅修改实时状态压缩排序表、对应定向测试和计划文档，不改变状态协议。
- 下一批边界为 project-108，仅处理前端命令生命周期分类集合复用。
