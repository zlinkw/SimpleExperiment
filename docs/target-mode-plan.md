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
- [已完成] 1/5 project-196：合并完整性矩阵结果分组遍历。
- [待处理] 2/5 project-197：合并前端 GPU 历史点统计遍历。
- [待处理] 3/5 project-198：复用论文表格指标 schema 查找。
- [待处理] 4/5 project-199：合并前端旧任务选择键分类遍历。
- [待处理] 5/5 project-200：执行第七十轮完整非服务器静态测试。

## 当前批次：project-196（已完成）
### 修复点

- 完整性矩阵在读取结果时直接按 axis key 分组，避免生成中间行后再按每个 key 重扫全部结果。
- 合并 Plan 的 `planId` 与 `suite` scope 判断，保持 study、质量门、生命周期和最终排序契约不变。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 相同 axis key 的结果顺序必须保持输入顺序，Plan-only 与 result-only key 均不得丢失。
- suite scope 必须继续同时约束 Plan 与结果，planId scope 不得误过滤 study 派生实验。
- 缺失指标、质量门、生命周期状态、CSV 与 Markdown 输出不得改变。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 完整性矩阵单次结果分组、scope、顺序及行为定向 Node 测试，9/9。
- [已通过] `git diff --check`；仅有既有 Windows 行尾提示。

## 本批记录
- project-195 已由提交 `22bd0ad` 同步至 `origin/master`。
- 本批仅处理后端完整性矩阵结果分组、对应测试和计划文档；无视觉样式变化，不调用截图。
- 首次定向测试的 fixture `runKey` 仍编码 `method-ours`，覆盖了显式 dimensions；已改为匹配 baseline 的 `runKey` 后复验。
- 结果读取改为单次 scope 检查并按 axis key 就地分组，Plan scope 合并为单次判断；9/9 定向测试通过。
