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
- [已完成] 1/5 authority-001：阻止旧拓扑或旧连接的端点检测结果回写当前运行态。
- [已完成] 2/5 authority-002：隔离 GPU 历史缓存 reset 前后的异步加载结果。
- [已完成] 3/5 authority-003：绑定手动 GPU、scheduler 与 trace 快照到发起请求的实时客户端。
- [待做] 4/5 authority-004：审计 Webview 状态摘要截断与有效变更遗漏边界。
- [待做] 5/5 authority-005：执行第二十七轮完整非服务器静态测试并修正新增回归。

## 当前批次：authority-003（已完成）
### 修复点

- 手动 GPU、scheduler 与 trace 快照必须捕获发起时的实时客户端。
- 客户端切换后，旧请求成功或失败不得修改当前错误状态或触发旧状态发布。
- 保留工作区 generation 门禁和离线模式无网络行为。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 手动 GPU 请求完成后的 availability 上报只能由仍权威的客户端触发。
- scheduler 与 trace 读取继续只更新实时客户端内部快照，不新增缓存副本。
- 所有请求继续使用现有 Xshell 本地隧道客户端，不引入直接服务器连接。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 手动快照客户端权威、无直连与相邻工作区隔离定向测试，10/10。
- [已通过] TypeScript 构建、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮统一三个手动实时快照入口的客户端实例门禁。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：Webview 状态摘要截断与有效变更签名，不扩展状态字段。
- 提交记录：本批使用独立 `fix` 提交并推送 `origin/master`；哈希以 Git 历史为准。
