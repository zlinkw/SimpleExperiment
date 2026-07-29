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
- [已完成] 1/5 project-026：隔离 Plan 归档流程的项目和客户端上下文。
- [已完成] 2/5 project-027：隔离归档 Plan 恢复流程的项目上下文。
- [已完成] 3/5 project-028：隔离批量运行 Plan 的项目和客户端上下文。
- [已完成] 4/5 project-029：索引并缓存 Plan 归档就绪派生。
- [已完成] 5/5 project-030：执行第三十六轮完整非服务器静态测试并修正新增回归。

## 当前批次：project-030（已完成）
### 修复点

- 完整静态回归暴露的 3 项旧断言已对齐项目上下文、客户端 authority 和 Plan 预检 authority 契约。
- npm 临时缓存与测试清理目标通过仓库外 preload 钩子暂存，并统一发送到 Windows 回收站。
- 本批只修改 3 个静态契约测试和本计划，未改变产品源码行为。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 完整回归不得改变现有任务、结果、归档、CSV/PPT 证据门禁或三类服务器拓扑语义。
- TypeScript 构建产物、Agent runtime 和面板静态契约必须保持同步。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 第三十六轮完整非服务器静态测试，888/888。
- [已通过] TypeScript、Lint、Node 语法与 `git diff --check`。

## 本批记录
- 本轮只处理完整静态回归及其直接暴露的问题，不扩展产品功能。
- 真实服务器行为保持 `needs field verification`。
- 下一批边界：当前前后端静态优化周期结束，等待新的明确目标。
- 提交记录：本批使用独立 `test` 提交并推送 `origin/master`。
