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
- [已完成] 1/5 project-206：预分组高级排行榜结果记录。
- [已完成] 2/5 project-207：合并前端选择值清洗与去重。
- [已完成] 3/5 project-208：索引完整性矩阵质量门与生命周期。
- [已完成] 4/5 project-209：合并配置参数差异索引遍历。
- [待处理] 5/5 project-210：执行第七十二轮完整非服务器静态测试。

## 当前批次：project-209（已完成）
### 修复点

- 配置参数差异索引改为单次遍历建立 Map，避免 selected 和 baseline 各自创建 map、filter 中间数组。
- 保持空 key 忽略、重复 key 末项覆盖、差异分类和缓存结果不变。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 参数 key 不新增 trim 或规范化，保持当前字符串化语义。
- 重复 key 必须继续由最后一项覆盖，空 key 不进入差异结果。
- same、changed、added、missing、uncertain 与 WeakMap 缓存行为不得改变。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建。
- [已通过] 配置参数单次索引、重复覆盖、差异分类和缓存定向 Node 测试，5/5。
- [已通过] `git diff --check`；仅有既有 Windows 行尾提示。

## 本批记录
- project-208 已由提交 `cf7adfe` 同步至 `origin/master`。
- 本批仅处理前端配置参数差异索引、对应测试和计划文档；无视觉样式变化，不调用截图。
- selected 和 baseline 参数改为共享单次遍历索引 helper；空 key、重复覆盖、差异分类与缓存语义保持不变，5/5 定向测试通过。
