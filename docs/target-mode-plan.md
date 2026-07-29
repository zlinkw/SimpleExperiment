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
- [已完成] 1/5 project-071：缓存 Agent 会话 Webview 状态。
- [已完成] 2/5 project-072：缓存服务器配置来源状态。
- [待做] 3/5 project-073：缓存工作区与项目接入状态。
- [待做] 4/5 project-074：缓存前端项目环境与位置摘要。
- [待做] 5/5 project-075：执行第四十五轮完整非服务器静态测试。

## 当前批次：project-072（已完成）
### 修复点

- Extension Host 按最终展示字段缓存服务器配置来源状态对象。
- 保存端点数量、Hub 会话、启用 Worker、工作区覆盖提示或会话库数量未变化时复用快照。
- 任一展示语义变化后失效，globalState 主来源和工作区空配置忽略规则保持不变。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 保存 Hub/Worker 配置和启用 Worker 数量变化必须立即刷新。
- 工作区 `workerTunnels` 从空到非空或反向变化不得隐藏覆盖提示。
- Xshell 会话库数量变化必须反映到诊断状态。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 配置来源状态等值命中及保存配置、覆盖提示、Worker 和会话库失效测试，8/8。
- [已通过] TypeScript 构建、Lint、相关 Node 文件语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-071 至 project-075 五批静态优化周期；project-075 再执行完整测试。
- 本批只处理服务器配置来源状态，最多修改 4 个源码、测试、构建和计划文件。
- 定向回归覆盖配置热更新、全局持久化和 Webview 状态结构。
- 真实服务器行为保持 `needs field verification`。
