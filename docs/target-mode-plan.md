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
- [已完成] 1/5 project-066：缓存前后端 Plan 结果预览作用域派生。
- [已完成] 2/5 project-067：缓存实时诊断 Webview 与 post gate 压缩结果。
- [待做] 3/5 project-068：缓存 Hub 与 Worker 状态摘要。
- [待做] 4/5 project-069：缓存前端项目结果位置派生。
- [待做] 5/5 project-070：执行第四十四轮完整非服务器静态测试。

## 当前批次：project-067（已完成）
### 修复点

- 单端点和多端点实时客户端复用未变化的诊断快照对象。
- Extension Host 分别缓存完整 Webview 与 post gate 所需的实时诊断压缩结果。
- 状态、序号、心跳、重连、错误或任一端点诊断变化后失效，心跳节流字段保持不变。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- `lastSeq`、`lastHeartbeatAt`、`reconnectCount` 和端点状态不得被缓存隐藏。
- post gate 继续排除仅心跳和序号字段，避免恢复高频 UI 刷新。
- 多端点诊断必须在任一子端点变化时失效，并保持 80 端点 Webview 上限。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 单端点、多端点及两类实时诊断压缩缓存命中、失效和字段语义定向测试，13/13。
- [已通过] TypeScript 构建、Lint、3 个相关 Node 文件语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-066 至 project-070 五批静态优化周期；project-070 再执行完整测试。
- 本批只处理实时诊断快照与压缩，最多修改 8 个源码、测试、构建和计划文件。
- 客户端按标量或子诊断引用复用快照，压缩层按诊断对象使用弱引用。
- 定向回归覆盖原有多端点合并和 Extension Host 状态 post gate；未产生计划外文件差异。
