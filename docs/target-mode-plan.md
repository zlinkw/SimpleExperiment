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
- [已完成] 1/5 project-201：改为就地分组完整性矩阵计划项。
- [已完成] 2/5 project-202：合并 GPU 历史采样间隔差值收集。
- [已完成] 3/5 project-203：合并结果仪表盘记录统计遍历。
- [已完成] 4/5 project-204：合并前端任务状态 payload 行派生。
- [待处理] 5/5 project-205：执行第七十一轮完整非服务器静态测试。

## 当前批次：project-204（已完成）
### 修复点

- 前端任务状态 payload 单次遍历已选行，同时收集全部选择字段、legacy key、目标对象和 debug 标记。
- 复用每行 action、archive、worker 与 Plan 派生，避免各字段 map、target map/filter 和 debug some 重扫。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- fallback、清洗、去重和各选择字段输入顺序必须保持不变。
- 无稳定 action key 的任务仍按 UI key 标记 legacy，空 target 仍必须丢弃。
- debug mode 只由保留的 target 派生，单 Plan、多 Plan 与缓存克隆行为不得改变。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 任务状态 payload 单次行派生、legacy、空 target、debug、fallback 与缓存接线定向 Node 测试，13/13。
- [已通过] `git diff --check`；仅有既有 Windows 行尾提示。

## 本批记录
- project-203 已由提交 `3643fa0` 同步至 `origin/master`。
- 本批仅处理前端任务状态 payload 行派生、对应测试和计划文档；无视觉样式变化，不调用截图。
- 全部选择字段、legacy key、target 与 debug 改为单次行遍历派生，清洗、fallback 与缓存契约不变；13/13 定向测试通过。
