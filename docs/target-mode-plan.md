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
- [进行中] 5/5 topology-004b/005：结果归属实现已完成；修正拓扑改造后的静态契约并执行第二十五轮完整非服务器静态测试。

## 当前批次：topology-004b（已完成）
### 修复点

- 无 Hub 结果解析与归档动作只发送到结果所属 Worker，禁止回退到 Hub 或其他 Worker。
- 单 Worker直接读取本机结果摘要；多 Worker只读合并摘要并保留每条记录的 Worker 归属，PPT 继续只读已归档最终记录。
- 归档状态、manifest 和结果摘要记录拓扑、Worker set revision 与唯一保存 Worker。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 多 Worker只读摘要不能成为新的远端权威状态，也不能写回任一 Worker。
- 无法按 Worker 正确聚合的跨节点统计动作必须明确阻止，不能把单 Worker统计冒充全局结论。
- Hub 模式继续只使用 Hub 摘要和归档链路；无 Hub revision 不进入 Hub 汇总。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Agent runtime 生成、Node/Python 语法、Lint 与 `git diff --check`。
- [已通过] Worker 结果 API、所有权门禁、摘要合并、最终 PPT 数据源和 Hub 隔离定向测试，29/29。
- [待修正] 第二十五轮完整非服务器静态测试 843/856；13 项失败均为 topology-001 至 004b 改造后的旧源码形态断言，进入 topology-005 校正，不作为服务器行为证据。

## 本批记录
- 本批只允许只读合并跨 Worker 摘要；远端归档、有效 CSV 和状态文件始终保留在所属 Worker。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：仅校正拓扑改造后的静态测试契约并完成全量测试，不扩展服务器功能。
- 提交记录：本批使用独立 `feat` 提交并推送 `origin/master`；哈希以 Git 历史为准。
