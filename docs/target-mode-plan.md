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
- [已完成] 3/5 project-083：缓存前端任务操作键派生。
- [待做] 4/5 project-084：缓存 Extension Host Python 命令入口解析。
- [待做] 5/5 project-085：执行第四十七轮完整非服务器静态测试。

## 当前批次：project-083（已完成）
### 修复点

- Webview 按任务行对象复用目标键、操作键、归档键、日志键和 Plan 文件派生。
- 同一缓存同时复用可选择键与操作键数组，避免任务筛选、渲染和批量操作重复拼接。
- 任务行对象替换后重新派生；保持原始键顺序、重复值和无直接键时的 fallback 文本不变。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 任务复选框、批量操作、日志展开、残留隐藏和 Plan 过滤必须继续使用同一组键语义。
- `taskOperationKeys` 与 `taskSelectableKeys` 的重复值不得被去重，避免改变历史选择匹配行为。
- 无 run key 的旧任务仍必须使用原有状态、Plan、实验、服务器、GPU 和时间 fallback。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 任务键缓存命中、源替换失效、顺序、重复值和 fallback 定向测试，5/5。
- [已通过] TypeScript 构建、Lint、前端 Node 语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-081 至 project-085 五批静态优化周期；project-085 再执行完整测试。
- 本批只处理前端任务操作键派生，最多修改 4 个源码、测试、构建和计划文件。
- 任务状态、选择、批量命令、日志和 Plan 过滤入口保持现有语义。
- 单个弱引用条目同时保存七类派生结果，任务行对象被替换后旧条目可自动释放。
- 真实服务器行为保持 `needs field verification`。
