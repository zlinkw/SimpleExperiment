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
- [已完成] 1/5 project-211：索引配置预览规范化文件路径。
- [已完成] 2/5 project-212：合并比较统计配对值遍历。
- [已完成] 3/5 project-213：索引输出能力缺失文件与列。
- [已完成] 4/5 project-214：增加项目级实验结果 CSV 目录配置并接入 Plan 默认输出链路。
- [待处理] 5/5 project-215：执行第七十三轮完整非服务器静态测试。

## 当前批次：project-214（已完成）
### 修复点

- 设置二级界面新增实验结果 CSV 目录，可直接填写工作区相对路径或浏览选择工作区内文件夹。
- 配置作为新建 Plan 和 scheduler 未显式声明结果路径时的默认目录；Plan 已有 result_csv、expectedResults 或命令固定路径始终优先。
- scheduler 的 jobs.csv 与 fallback result_csv 使用同一默认目录，并将配置经 Local -> Agent -> scheduler -> Worker 任务完整透传。
- 保持未跟踪历史安装包、VSIX、`zlk_cluster/ui/` 和真实服务器不变。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 仅允许工作区内相对目录，拒绝绝对路径、`..` 越界和工作区根目录，浏览结果同样执行边界校验。
- 旧 Plan 的显式结果文件声明不得被配置覆盖；Debug 继续使用隔离目录。
- 配置变更必须触发设置区重绘；正在编辑的草稿不得被状态刷新覆盖。
- 自定义目录必须随运行请求到达 Worker；否则 Hub 预演与 Worker 实际输出会不一致。
- 真实服务器行为继续标记 `needs field verification`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建与 Agent runtime 生成。
- [已通过] 结果 CSV 目录配置、路径边界、Plan 默认值、显式路径优先和 scheduler/Worker 透传定向测试，12/12。
- [已通过] lint、Agent/Scheduler Python 语法与 `git diff --check`；仅有既有 Windows 行尾提示。

## 本批记录
- project-213 已由提交 `f8ffaee` 同步至 `origin/master`。
- 本批只处理结果 CSV 默认目录配置、设置页入口、运行透传、定向测试和计划文档；不修改旧 Plan 或旧结果。
- 配置仅允许工作区相对目录；生成 Plan 使用每 case/seed 独立文件名，scheduler fallback 和 jobs.csv 使用同一目录；旧 Plan 显式路径保持优先。
- 本批 12/12 定向测试通过；真实服务器透传标记 `needs field verification`，未截图、未连接服务器。
