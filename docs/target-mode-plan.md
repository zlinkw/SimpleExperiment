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
- [已完成] 1/5 project-121：复用前端操作状态匹配词表。
- [待处理] 2/5 project-122：复用后端调度状态分类集合。
- [待处理] 3/5 project-123：复用前端配置数值边界定义。
- [待处理] 4/5 project-124：复用后端 SFTP 与同步状态集合。
- [待处理] 5/5 project-125：执行第五十五轮完整非服务器静态测试。

## 当前批次：project-121（已完成）
### 修复点

- 将操作进行中和失败状态的子串匹配词表提升为前端固定数组。
- 避免操作统计、时间线和计划阶段判断时重复创建状态数组。
- 增加固定词表接线回归，保持复合状态和未知状态语义不变。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- `operation_progress`、`completed_with_errors`、`unsupported` 等复合状态仍须正确分类。
- 已取消、已停止和已完成判定顺序不得改变。
- 定向测试必须使用回收站保护预加载；失败时不得提交或推送成功记录。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 操作状态统计、计划阶段及前端脚本语法定向 Node 测试，16/16。
- [已通过] `git diff --check`。

## 本批记录
- 本轮建立 project-121 至 project-125 五批静态优化周期；project-125 再执行完整测试。
- 上一轮 project-116 至 project-120 已由提交 `2fff7a5`、`d4d7403`、`0463218`、`d7bce4c`、`b0963ee` 同步至 `origin/master`。
- 本批仅处理前端操作状态固定词表、对应定向测试和计划文档。
- 复合状态分类保持不变，构建确认 Agent runtime 未变；无视觉变化，不调用截图；下一批仅处理后端调度状态分类集合。
