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
- [已完成] 2/5 project-172：复用前端实时流与 Worker 可用状态判定。
- [已完成] 3/5 project-173：复用后端项目接入规则压缩字段表。
- [已完成] 4/5 project-174：复用后端调度回退 Worker 观测字段表。
- [已完成] 5/5 project-175：执行第六十五轮完整非服务器静态测试。

## 当前批次：project-175（已完成）
### 修复点

- 完成第五批后的 1051 项 Node 静态测试、lint、四个 JavaScript 入口语法检查和八个 Python 文件 UTF-8 内存编译。
- 本批未改业务逻辑，仅记录完整回归结果并结束当前五批优化周期。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 完整 Node 测试必须使用回收站保护预加载，禁止测试清理永久删除本地文件。
- lint、JavaScript 语法和 Python UTF-8 编译任一失败时不得提交或推送成功记录。
- 本批不得生成、打包或安装 VSIX，不得触发真实服务器连接。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] `npm test` 完整非服务器静态测试，1051/1051。
- [已通过] lint、四个 JavaScript 入口和八个 Python 文件语法检查。
- [已通过] `git diff --check`。

## 本批记录
- project-174 已由提交 `f0f0c6e` 同步至 `origin/master`。
- 本批仅执行完整非服务器静态回归并更新计划文档；无视觉变化，不调用截图。
- project-175 完整静态回归全部通过；当前五批优化周期结束，后续目标须先修订本计划。
