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
- [已完成] 1/5 project-191：合并后端 Worker 已选任务字段派生。
- [已完成] 2/5 project-192：合并前端复选任务 payload 派生。
- [待处理] 3/5 project-193：合并后端项目指标类型划分。
- [待处理] 4/5 project-194：合并前端 Webview 命令审计遍历。
- [待处理] 5/5 project-195：执行第六十九轮完整非服务器静态测试。

## 当前批次：project-192（已完成）
### 修复点

- 前端任务复选框只遍历一次，同时收集选择字段、Plan 信息、legacy key、target 与 Debug 标志。
- 保持 selection fallback、唯一 Plan/revision 回填、无有效 target 过滤和 payload 克隆缓存契约不变。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 未勾选框不得进入任何字段；勾选但仅含 Plan 信息的框仍影响 Plan 字段但不得生成空 target。
- legacy task key 仍只依据 actionKey 可用性判断，runKey fallback 不得改变该规则。
- Debug 标志只能来自已纳入的有效 target，空选择仍返回原有 suppressGlobalPlan payload。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 复选框单次收集、未选过滤、legacy/Plan/target/Debug 与确认路径定向 Node 测试，6/6。
- [已通过] `git diff --check`；仅有既有 Windows 行尾提示。

## 本批记录
- project-191 已由提交 `87f76b0` 同步至 `origin/master`。
- 本批仅处理前端任务复选 payload 派生、对应测试和计划文档；无视觉样式变化，不调用截图。
- 复选框节点改为单次遍历，同时产出原始选择字段、有效 target、legacy key 和 Debug 状态；6/6 定向测试通过。
