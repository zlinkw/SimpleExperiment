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
- [已完成] 1/5 topology-001：增加项目级拓扑配置、领域解析与一致性校验。
- [已完成] 2/5 topology-002：对齐设置页、概览与强确认中的拓扑呈现。
- [已完成] 3/5 topology-003：实现单 Worker 本机调度与无 Hub 门禁。
- [待做] 4/5 topology-004：实现多 Worker 稳定分片及结果归档归属。
- [待做] 5/5 topology-005：执行第二十五轮完整非服务器静态测试。

## 当前批次：topology-003（已完成）
### 修复点

- 单 Worker 的 Plan 校验、预演、运行、复现和批量运行只提交到唯一 Worker Agent。
- 无 Hub 模式从实时端点、Xshell 启动、代码同步、runtime 部署和可用性上报中排除 Hub。
- 旧 Hub 专属入口在无 Hub 模式下明确阻止，不得把首个 Worker 当作 Hub。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 未确认或配置不一致的拓扑必须阻止新 Plan 操作；仅多 Worker调度留到 topology-004。
- Hub 可用模式不得在 Hub 离线时静默降级到 Worker。
- Worker Agent 只新增四个本机 scheduler 动作，不开放文件 API 或其他 Hub 动作。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Agent runtime 生成与 Node/Python 语法。
- [已通过] 单 Worker 路由、Worker 动作白名单、Agent/Xshell 和无 Hub 静态边界定向测试，51/51。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 本批不启用多 Worker 分片、无 Hub 结果汇总或归档；这些边界继续阻止。
- 真实服务器行为保持 `needs field verification`。
- 提交记录：验证通过后使用独立 `feat` 提交并推送 `origin/master`；哈希以 Git 历史为准。
