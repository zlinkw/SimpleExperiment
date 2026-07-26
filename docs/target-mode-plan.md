# 目标模式当前计划：前后端静态优化周期
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不迁移、删除或重写旧任务和结果，不处理历史 VSIX 或 `zlk_cluster/ui/`；禁止“父级 evidence key 被子文件 archive 反向命中”。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- `metrics_summary.csv`、PPT 和论文证据只读取最终归档结果；PPT 绘图目标确认先于 automation，PPT 绘图链路与 realtime post gate 稳定化持续保留。
- GPU 历史和 Docker 兼容验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`；新增补充任务不得破坏当前主目标，计划更新必须防止修复循环。
- 长时间 Webview payload 预算：`schedulerStates`、`experimentTraces` 必须有界；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 必须保留。
- 连接边界固定为 Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 当前不连接服务器，只执行本地静态检查且不重载、关闭 VS Code；每批最多 8 个源码/文档/测试文件并推送 `origin/master`，每 5 批执行一次全量静态测试。

## 后续优先级
- [已完成] 1/5 后端：限制运行日志尾部读取字节数，避免大日志全量载入。
- [已完成] 2/5 前端：缓存当前状态内按 Plan 版本筛选的操作与任务行。
- [已完成] 3/5 后端：用结构化 payload 缓存替代 Agent 采样循环的比较序列化。
- [已完成] 4/5 前端：单次扫描提取当前 Plan 的结果分析产物路径。
- [待做] 5/5 前后端：执行第十五轮非服务器静态测试。

## 当前批次：autonomous-static-073（已完成）
### 修复点

- 对当前 Plan 的操作行执行一次扫描，同时提取绘图契约、样本级结果、恢复报告和异常诊断路径。
- 保持“最新成功操作优先”、Plan 范围和版本范围约束。
- 结果摘要中的绘图契约仍只在 Plan 与版本同时匹配时优先使用。

### 相邻回归风险

- 失败操作和其他 Plan 的路径不能进入 PPT 数据源。
- 第一个匹配成功操作缺少路径时，不能回退到更旧操作并冒充最新结果。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] Plan/版本隔离、失败过滤、摘要优先级和单次扫描回归测试 9/9。
- [已通过] TypeScript、Lint、Panel 脚本语法和 `git diff --check`。

## 本批记录
- 结果工作台原先为四类分析产物分别调用 `.find()`，最坏重复扫描同一操作数组四次。
- 本批不改变 PPT 门禁、最终归档结果来源或绘图命令。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
