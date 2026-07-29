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
- [已完成] 1/5 project-061：缓存前端项目结果输出门禁诊断。
- [已完成] 2/5 project-062：缓存能力与集成报告 Webview 压缩结果。
- [待做] 3/5 project-063：缓存隧道端点注册表状态。
- [待做] 4/5 project-064：缓存端点与实时策略 Webview 压缩结果。
- [待做] 5/5 project-065：执行第四十三轮完整非服务器静态测试。

## 当前批次：project-062（已完成）
### 修复点

- 后端按原始能力、文件能力和 Xshell 集成报告对象缓存 Webview 压缩结果。
- 顶层状态、探测摘要和 post gate 复用稳定快照，避免重复裁剪布尔能力表、建议和敏感文本。
- 原始快照对象替换后失效，Webview 字段、限制和脱敏规则保持不变。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- Hub 与 Worker 能力、文件能力和 Xshell 集成报告字段不得丢失或扩张。
- 缓存必须按原始对象替换失效，不得让新探测结果沿用旧快照。
- 缓存键使用弱引用，不得延长已替换探测和集成报告对象生命周期。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 能力、文件能力和集成报告缓存命中、失效及字段语义定向测试，12/12。
- [已通过] TypeScript、Lint、4 个 Node 入口语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-061 至 project-065 五批静态优化周期；project-065 再执行完整测试。
- 本批只处理能力和集成报告 Webview 压缩，共修改 4 个源码、测试、构建和计划文件。
- 三类缓存均按不可变输入对象使用弱引用，不改变探测或集成状态所有权。
- 真实服务器行为保持 `needs field verification`。
