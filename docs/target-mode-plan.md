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
- [已完成] 1/5 project-036：缓存前后端调度行派生。
- [已完成] 2/5 project-037：缓存前端结果输出纯派生。
- [已完成] 3/5 project-038：缓存后端结果输出纯派生。
- [待做] 4/5 project-039：收敛本周期静态回归与相邻契约。
- [待做] 5/5 project-040：执行第三十八轮完整非服务器静态测试。

## 当前批次：project-038（已完成）
### 修复点

- 后端按不可变 Plan 对象复用输出候选、可解析候选和输出信号派生，避免运行门禁、接入建议、解析作用域与确认窗口重复规范化和过滤。
- 后端按不可变接入规则对象复用可解析结果候选，避免门禁内部及批量运行确认重复展开候选数组和执行文件类型过滤。
- Plan 或接入规则对象替换时立即失效；使用 WeakMap，不引入跨工作区、跨项目或持久缓存。
- 本批不扩展产品功能；源码、构建产物与静态契约必须同步。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 元数据占位文件排除、大小写去重、后端扩展输出信号过滤和结果预览作用域必须保持不变。
- 同一对象重复读取必须命中缓存；Plan、接入规则或工作区检测结果替换后不得命中旧值。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 后端输出派生缓存命中、替换失效与相邻语义定向测试，31/31。
- [已通过] TypeScript、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮只处理后端 Plan 输出与接入规则结果候选两组纯派生热点，最多修改 5 个源码、测试、构建和计划文件。
- 本周期 project-036 至 project-039 使用定向静态测试，project-040 再执行完整测试。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：收敛本周期前后端输出派生契约与定向回归；本批使用独立 `perf` 提交并推送 `origin/master`，提交哈希以 git 历史为准。
