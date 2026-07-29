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

## 当前批次：topology-005a（已完成）
### 修复点

- 校正拓扑门禁、端点范围、预检路由和首次配置流程的旧静态测试契约。
- 测试断言按 Hub 可用与无 Hub 模式验证当前行为，不恢复已废弃的 Hub 固定路径。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 测试校正不得弱化真实行为断言，只替换已被三类拓扑设计明确废弃的源码形态断言。
- 端点缓存测试必须显式覆盖 Hub 参与判断，预检测试必须覆盖拓扑 scheduler 路由。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] topology-005a 涉及的 7 个静态契约文件，19/19。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 本批仅修改测试和计划文档，不修改产品代码或生成输出。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：校正剩余静态契约并执行第二十五轮完整测试。
- 提交记录：本批使用独立 `test` 提交并推送 `origin/master`；哈希以 Git 历史为准。
