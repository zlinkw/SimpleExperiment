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
- [待做] 2/5 project-082：缓存 Extension Host 配置摘要排序。
- [待做] 3/5 project-083：缓存前端任务操作键派生。
- [待做] 4/5 project-084：缓存 Extension Host Python 命令入口解析。
- [待做] 5/5 project-085：执行第四十七轮完整非服务器静态测试。

## 当前批次：project-081（已完成）
### 修复点

- Webview 按 Plan 对象复用任务规模摘要，避免计划工作台与计划卡重复展开实验项和随机种子。
- 按结果预览数组或对象映射复用可解析记录计数，避免计划与结果区域重复过滤预览。
- Plan 或预览源替换后失效；空预览和零计数也允许复用。
- 保持历史 VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 显式 jobCount、实验项与随机种子不一致时的中文提示不得改变。
- 结果预览仍只统计 `parseable=true` 且记录数大于零的项目。
- 数组、对象映射、空值和源替换语义不得改变。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] Plan 规模与预览计数缓存命中、零值复用和源替换失效定向测试，7/7。
- [已通过] TypeScript 构建、Lint、前端 Node 文件语法与 `git diff --check`。

## 本批记录
- 本轮建立 project-081 至 project-085 五批静态优化周期；project-085 再执行完整测试。
- 本批只处理前端 Plan 规模与结果预览统计，最多修改 4 个源码、测试、构建和计划文件。
- 计划文本、结果门禁和可编辑入口保持现有语义。
- 两类弱引用缓存均复用零值结果；Plan 首次读取也避免重复访问 cases 和 seeds 属性。
- 真实服务器行为保持 `needs field verification`。
