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
- [已完成] 1/5 后端：限制 Agent scheduler 依赖预检缓存的条目数和存活时间。
- [已完成] 2/5 前端：复用 GPU 历史排序索引，减少摘要和缺口统计的重复排序。
- [待做] 3/5 后端：限制通知节流键缓存，避免长期运行时按事件键无限增长。
- [待做] 4/5 前端：缓存配置检查器静态索引，减少筛选交互中的重复预处理。
- [待做] 5/5 前后端：执行第十二轮非服务器静态测试。

## 当前批次：autonomous-static-057（已完成）
### 修复点

- 让 GPU 历史文本摘要和缺口统计复用已有的每序列排序索引。
- 按序列累计时间范围、点数和补零数，避免先合并全部点再重复排序。
- 保持曲线、tooltip、补零标记和文本含义不变。

### 相邻回归风险

- 多服务器总体图的范围与缺口数必须覆盖所有序列。
- 显式 `gapBefore` 和基于时间间隔推断的缺口行为不得变化。
- 不进行截图或 VS Code Webview 重载。

### 验证清单

- [已通过] TypeScript 编译和 PanelHtml 生成一致性。
- [已通过] GPU 历史图表及内联脚本定向静态测试 13/13。

## 本批记录
- 上一批提交：`7a5b5f3`，已推送且本地与 `origin/master` 一致。
- 审计确认摘要此前先合并全部历史点并排序时间，缺口统计和步长计算又各自排序一次。
- 摘要改为逐序列复用 WeakMap 排序索引，并独立累计范围、补零数和缺口数，避免跨序列边界误判缺口。
- 首轮静态断言范围过宽，命中了 tooltip 的合法 `flatMap`；收窄到摘要函数后复验通过。
