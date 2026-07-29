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
- [已完成] 1/5 project-031：为 Plan 运行证据建立专用后端状态构建路径。
- [已完成] 2/5 project-032：缓存前端 Plan 执行阶段派生。
- [已完成] 3/5 project-033：缓存后端 Plan 运行证据合并结果。
- [已完成] 4/5 project-034：审计并优化前端状态与检查器重复派生。
- [已完成] 5/5 project-035：执行第三十七轮完整非服务器静态测试并修正新增回归。

## 当前批次：project-035（已完成）
### 修复点

- 修复新增缓存变量未注入 VM 沙箱、Worker 缓存静态调用契约不同步和租约测试清理失败。
- 仓库外 Node preload 钩子改用 Windows `IFileOperation` 回收站 API；异步删除不再阻塞租约心跳。
- 租约测试先回收租约文件再回收空目录，避免 Windows 目录句柄冲突。
- 本批不扩展产品功能；构建产物、Agent runtime 与前后端静态契约必须同步。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 完整回归不得改变旧任务、结果、归档、CSV/PPT 证据门禁或三类服务器拓扑语义。
- 任何测试清理不得永久删除文件，也不得移动仓库内文件。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 第三十七轮完整非服务器静态测试，893/893。
- [已通过] 直接回归测试 17/17；TypeScript、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮只处理完整静态回归直接暴露的问题；未触碰历史 VSIX、`zlk_cluster/ui/` 或真实服务器。
- 测试临时文件仅发送到 Windows 回收站；未永久删除或移动仓库内文件。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：当前前后端静态优化周期结束，等待新的明确目标；本批使用独立 `test` 提交并推送 `origin/master`，提交哈希以 git 历史为准。
