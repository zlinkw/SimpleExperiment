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
- [已完成] 1/5 project-156：复用前端任务停止与失败状态集合。
- [已完成] 2/5 project-157：复用前端远端操作连接边界集合。
- [已完成] 3/5 project-158：优化后端首次接入缺失项与 Agent 阻塞原因派生。
- [待处理] 4/5 project-159：复用后端 Host Operation 操作标签表。
- [待处理] 5/5 project-160：执行第六十二轮完整非服务器静态测试。

## 当前批次：project-158（已完成）
### 修复点

- 将 Agent 自启动写入阻塞原因提升为固定集合并复用。
- 首次接入缺失项只去重一次，状态与提示复用同一结果。
- 增加阻塞集合调用和缺失项单次派生回归。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 命令写入错误、已有非受管命令或其它 Agent 会话仍必须阻止 runtime 部署。
- 首次接入缺失项顺序、去重结果和提示内容必须一致，缓存失效语义不变。
- 定向测试必须使用回收站保护预加载；失败时不得提交或推送成功记录。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] Agent 首次准备与工作区接入缓存定向 Node 测试，7/7。
- [已通过] `git diff --check`。

## 本批记录
- 本轮建立 project-156 至 project-160 五批静态优化周期；project-160 再执行完整测试。
- project-156、project-157 已由提交 `998eed5`、`3588544` 同步至 `origin/master`。
- 本批仅处理后端首次接入派生、对应测试和计划文档；无视觉变化，不调用截图。
- project-158 构建与 7/7 定向测试通过；真实服务器行为保持 `needs field verification`，下一批仅处理 Host Operation 操作标签表。
