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
- [已完成] 3/5 project-068：缓存 Hub 与 Worker 状态摘要。
- [待做] 4/5 project-069：缓存前端项目结果位置派生。
- [待做] 5/5 project-070：执行第四十四轮完整非服务器静态测试。

## 当前批次：project-068（已完成）
### 修复点

- Extension Host 按端点注册表、探针和实时诊断引用缓存 Hub 控制状态与 Worker 观测摘要。
- 未变化的 Webview 状态构建复用摘要对象，避免重复扫描 Worker 实时端点和能力字段。
- 注册表、Hub/Worker 探针或实时诊断替换后失效，状态顺序和字段语义保持不变。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- Hub 探针状态、能力、检测时间和本地端口不得被缓存隐藏。
- Worker 探针、事件流、心跳、能力、顺序和本地端口变化必须立即失效。
- 摘要仅依赖已稳定的端点注册表与实时诊断快照，不改变 post gate 字段。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] Hub 与 Worker 状态摘要缓存命中、输入失效、能力和状态语义定向测试，13/13。
- [已通过] TypeScript 构建、Lint、相关 Node 文件语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-066 至 project-070 五批静态优化周期；project-070 再执行完整测试。
- 本批只处理 Hub 与 Worker 状态摘要派生，最多修改 4 个源码、测试、构建和计划文件。
- 缓存按注册表弱引用并比较探针、Worker 探针集合与实时诊断引用，不延长已替换注册表生命周期。
- 定向回归保留诊断卡片、服务器状态索引和 Extension Host 状态 post gate，不修改前端布局。
