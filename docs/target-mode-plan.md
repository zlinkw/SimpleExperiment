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
- [已完成] 1/5 project-081：缓存前端 Plan 规模与结果预览统计。
- [已完成] 2/5 project-082：缓存 Extension Host 配置摘要排序。
- [待做] 3/5 project-083：缓存前端任务操作键派生。
- [待做] 4/5 project-084：缓存 Extension Host Python 命令入口解析。
- [待做] 5/5 project-085：执行第四十七轮完整非服务器静态测试。

## 当前批次：project-082（已完成）
### 修复点

- Extension Host 按配置文件集合对象复用优先级排序和前 80 项截取结果。
- 稳定集合命中缓存；集合对象替换后重新排序；空集合结果也允许复用。
- 保持 smoke、base、dataset 等既有优先级、同级字典序和摘要数量上限不变。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 本地项目检测与 Plan 配置选择器必须共享排序结果，但选择器仍只预读前 24 项。
- 源数组内顺序不得被原地修改，返回顺序和 80 项上限不得改变。
- 配置集合对象替换后不得复用旧排序；空数组缓存不得被误判为未命中。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 配置排序缓存命中、替换失效、空结果复用、优先级和数量上限定向测试，3/3。
- [已通过] TypeScript 构建、Lint、Extension Host Node 语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-081 至 project-085 五批静态优化周期；project-085 再执行完整测试。
- 本批只处理 Extension Host 配置摘要排序，最多修改 4 个源码、测试、构建和计划文件。
- 配置发现、摘要读取、Plan 选择和可编辑入口保持现有语义。
- 弱引用缓存按配置数组对象复用排序结果，不持有已替换集合；非对象可迭代输入保留原有计算路径。
- 真实服务器行为保持 `needs field verification`。
