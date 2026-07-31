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
- [已完成] 2/5 project-197：合并前端 GPU 历史点统计遍历。
- [已完成] 3/5 project-198：复用论文表格指标 schema 查找。
- [待处理] 4/5 project-199：合并前端旧任务选择键分类遍历。
- [待处理] 5/5 project-200：执行第七十轮完整非服务器静态测试。

## 当前批次：project-198（已完成）
### 修复点

- 论文表格模板预先建立首项优先的 metric schema 索引，避免每个布局指标重复查找 label、方向和小数位。
- 保持模板显式格式优先级、重复 schema key 的首项语义、最终归档结果过滤及全部导出格式不变。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 模板 `metricLabels` 与 `decimals` 必须继续覆盖 schema 默认值，缺失 schema 指标仍回退到 key、higher-is-better 和 4 位小数。
- 重复 metric key 必须保持 `Array.find` 的首项优先语义，不能因 Map 构造改为末项覆盖。
- Markdown、CSV、LaTeX、JSON 和最终归档结果过滤不得改变。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 论文表格 schema 索引、首项优先、格式回退和结果行为定向 Node 测试，18/18。
- [已通过] `git diff --check`；仅有既有 Windows 行尾提示。

## 本批记录
- project-197 已由提交 `8e66d35` 同步至 `origin/master`。
- 本批仅处理后端论文表格 metric schema 查找、对应测试和计划文档；无视觉样式变化，不调用截图。
- metric schema 改为首项优先索引并在每个布局指标中复用，模板覆盖与最终结果过滤不变；18/18 定向测试通过。
