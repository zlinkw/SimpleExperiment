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
- [已完成] 1/5 project-161：复用前端资源树图标与色调优先级表。
- [已完成] 2/5 project-162：复用前端任务等待与操作类型标签表。
- [已完成] 3/5 project-163：对齐前后端 PPT 绘图标签常量。
- [已完成] 4/5 project-164：复用后端远端操作显示名称表。
- [待处理] 5/5 project-165：执行第六十三轮完整非服务器静态测试。

## 当前批次：project-164（已完成）
### 修复点

- 将后端远端操作显示名称提升为冻结常量表。
- Hub 和直达 Worker 强制确认复用同一显示名称派生。
- 增加名称表、回退和确认详情回归。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 已知停止、重试、归档、排除、同步检查、三方校验和删除文案必须保持不变。
- 未知命令必须继续回退 action、command 或“远端操作”。
- 定向测试必须使用回收站保护预加载；失败时不得提交或推送成功记录。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 远端操作强制确认定向 Node 测试，4/4。
- [已通过] `git diff --check`。

## 本批记录
- 本轮建立 project-161 至 project-165 五批静态优化周期；project-165 再执行完整测试。
- project-161 至 project-163 已由提交 `47c4ee0`、`b6792a1`、`fa32f98` 同步至 `origin/master`。
- 本批仅处理后端远端操作固定名称、对应测试和计划文档；无视觉变化，不调用截图。
- project-164 构建与 4/4 定向测试通过；下一批执行第六十三轮完整静态回归。
