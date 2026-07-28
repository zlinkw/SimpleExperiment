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
- 当前不连接服务器，只执行本地静态检查且不重载、关闭 VS Code；每批最多 8 个源码/文档/测试文件并推送 `origin/master`，每 5 批执行一次全量静态测试。

## 后续优先级
- [待做] 1/5 后端：审计 Scheduler 作业构建与配置渲染。
- [待做] 2/5 前端：优化计划参数与配置检查器的差异呈现。
- [待做] 3/5 后端：审计结果解析与统计的输入校验。
- [待做] 4/5 前端：优化实验追踪分区的状态归因。
- [待做] 5/5 前后端：执行第二十四轮非服务器静态测试。

## 当前批次：topology-plan-001（已完成）
### 修复点

- 新增三类服务器拓扑目标计划：单 Worker、仅多 Worker、Hub 可用。
- 固定无 Hub 模式的 Worker 本机调度、确定性多 Worker 分片和 Worker 本地唯一保存契约。
- 固定无 Hub 模式不访问 Hub、不创建跨节点或本机自动备份，同时保留用户主动 SimpleSFTP 文件操作。
- 记录配置、UI、结果、归档、恢复和 PPT 数据源的五批实施流水，不改动当前运行代码。

### 相邻回归风险

- `worker_pool` 不得通过隐式主 Worker 重新引入 Hub；已提交 revision 的 Worker 集合不得动态重分片。
- “不备份”不得误伤用户主动下载、调试导出和 Worker 本地归档，也不得把 runtime 安装回滚副本冒充实验备份。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 新目标计划 UTF-8 回读、结构与主计划引用检查。
- [已通过] `git diff --check`。
- [未执行] 源码测试；本批仅增加目标计划，不改动运行代码。

## 本批记录
- 当前前后端静态优化优先级保持不变，实施拓扑功能时从 `topology-001` 开始独立分批。
- 本批源码行为均未实现，不得把目标文档当作功能完成证据。
- 提交记录：本批使用独立 `docs` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 三类拓扑、真实服务器、Xshell、SimpleSFTP 和 Agent 通信均标记为未执行现场验证。
