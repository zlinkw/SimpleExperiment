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
- [待做] 1/5 project-041：缓存后端 Plan 作用域结果候选编译。
- [待做] 2/5 project-042：审计并优化前端操作禁用原因重复派生。
- [待做] 3/5 project-043：审计并优化下一组后端项目检测热点。
- [待做] 4/5 project-044：收敛新周期静态回归与相邻契约。
- [待做] 5/5 project-045：执行第三十九轮完整非服务器静态测试。

## 当前批次：project-040（已完成）
### 修复点

- 执行第三十八轮完整非服务器静态回归，覆盖 project-036 至 project-039 的调度派生、前后端输出缓存和 Plan 输出信号契约。
- 仅修复完整回归直接暴露的问题；不连接真实服务器，不测试 Xshell/Agent 实机链路。
- 测试清理继续使用仓库外 Windows 回收站保护钩子，不永久删除项目或临时文件。
- 本批不扩展产品功能；源码、构建产物与静态契约必须同步。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 旧任务、结果、归档、CSV/PPT 证据、三类服务器拓扑和 Xshell-only 边界必须保持不变。
- 完整回归不得写入历史 VSIX、`zlk_cluster/ui/` 或真实服务器状态。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 第三十八轮完整非服务器静态测试，902/902。
- [已通过] TypeScript、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮只处理完整回归及其直接暴露的问题，最多修改 8 个源码、测试、构建和计划文件。
- 本批完成后结束 project-036 至 project-040 五批周期，并建立下一轮优化边界。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：缓存后端 Plan 作用域结果候选编译；本批使用独立 `test` 提交并推送 `origin/master`，提交哈希以 git 历史为准。
