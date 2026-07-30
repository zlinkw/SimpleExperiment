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
- [已完成] 1/5 project-171：复用前端通用状态中文标签表。
- [待处理] 2/5 project-172：复用前端实时流与 Worker 可用状态判定。
- [待处理] 3/5 project-173：复用后端项目接入规则压缩字段表。
- [待处理] 4/5 project-174：复用后端调度回退 Worker 观测字段表。
- [待处理] 5/5 project-175：执行第六十五轮完整非服务器静态测试。

## 当前批次：project-171（已完成）
### 修复点

- 将面板通用状态中文标签提升为冻结常量表。
- 连接、GPU、诊断和结果链路继续复用同一标签及详细失败信息回退。
- 增加常量不可变性、中文标签和未知状态兼容回归。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 现有状态中文、大小写归一化和 `failed/error/warning: detail` 展示必须保持不变。
- 未知状态继续保留原始文本，避免旧 Agent 或未来协议状态丢失诊断信息。
- 定向测试必须使用回收站保护预加载；失败时不得提交或推送成功记录。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 连接、GPU、诊断和结果状态标签定向 Node 测试，15/15。
- [已通过] `git diff --check`。

## 本批记录
- project-170 已由提交 `f596a69` 同步至 `origin/master`。
- 本轮建立 project-171 至 project-175 五批静态优化周期；project-175 再执行完整测试。
- 本批仅处理前端通用状态固定标签、对应测试和计划文档；无视觉变化，不调用截图。
- project-171 构建与 15/15 定向测试通过；下一批仅处理实时流与 Worker 可用状态判定。
