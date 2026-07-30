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
- [已完成] 1/5 project-181：缓存后端 GPU 归属配置状态。
- [已完成] 2/5 project-182：合并前端 GPU 渲染预算计数遍历。
- [已完成] 3/5 project-183：缓存后端当前 Plan 接入提示。
- [待处理] 4/5 project-184：复用前端任务状态统计。
- [待处理] 5/5 project-185：执行第六十七轮完整非服务器静态测试。

## 当前批次：project-183（已完成）
### 修复点

- 按检测项目、Plan 列表和当前选择缓存后端接入提示数组。
- 稳定状态发布复用 Plan 查找、结果预览作用域和可解析结果计数派生结果。
- 任一项目、Plan 列表或选择输入替换时重新计算，保持提示语义不变。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 当前 Plan 选择变化后提示必须立即切换，不得复用上一 Plan 的结果作用域。
- 项目检测或 Plan 列表替换后必须重新计算接入缺失项。
- 无 Plan、多 Plan 未选择和输出不可解析三类提示必须保持原有文案与判定。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 当前 Plan 接入提示缓存与失效定向 Node 测试，21/21。
- [已通过] `git diff --check`。

## 本批记录
- project-182 已由提交 `4eed6c6` 同步至 `origin/master`。
- 本批仅处理后端当前 Plan 接入提示缓存、对应测试和计划文档；无视觉变化，不调用截图。
- 首次定向测试因新增测试把可解析预览行数误写为指标记录数而失败；修正期望后 21/21 通过。
- project-183 构建与 21/21 定向测试通过；下一批仅复用前端任务状态统计。
