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
- [已完成] 4/5 topology-004a：实现多 Worker 稳定分片与独立提交。
- [待做] 5/5 topology-004b/005：对齐结果归档归属并执行第二十五轮完整非服务器静态测试。

## 当前批次：topology-004a（已完成）
### 修复点

- 生成不可变 `workerSetRevision`，按 Plan revision、稳定 Worker ID 和任务索引确定性分片。
- 每台 Worker 只接收自己的任务索引及本机 Worker 配置，并独立启动本机 scheduler。
- 多 Worker 提交前统一校验端点能力与 Plan 展开结果，部分 Worker 离线时不开始新提交。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 同一 Plan revision 与 Worker 集合必须重复得到相同分片；Worker 集合变化只生成新 revision。
- 每个 Worker scheduler 必须拒绝缺少自身 owner 或分片索引的 `worker_pool` 请求。
- 本批不提前合并 Worker 结果、有效 CSV 或归档，留到第五批统一对齐并执行完整测试。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Agent/Scheduler runtime 生成与 Node/Python 语法。
- [已通过] 分片确定性、Worker 集合变化、独立提交和无 Hub 静态门禁定向测试，52/52。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 本批只启用多 Worker Plan 校验、预演、运行与复现，不启用跨 Worker 结果或归档聚合。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：只处理多 Worker 结果、有效 CSV、归档与恢复归属，并执行第五批完整非服务器静态测试。
- 提交记录：本批使用独立 `feat` 提交并推送 `origin/master`；哈希以 Git 历史为准。
