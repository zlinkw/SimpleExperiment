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
- [已完成] 3/5 后端：为 Worker 命令队列读取增加有界游标缓存，避免重复扫描已消费前缀。
- [已完成] 4/5 前端：缓存配置检查器静态索引，减少筛选交互中的重复预处理。
- [待做] 5/5 前后端：执行第十二轮非服务器静态测试。

## 当前批次：autonomous-static-059（已完成）
### 修复点

- 按 `configSummaries` 引用缓存路径层级和小写搜索文本。
- 预计算一级目录、全部二级目录及各一级目录下的二级目录列表。
- 筛选输入变化时只执行条件过滤和 HTML 选项生成，不重复展开参数文本。

### 相邻回归风险

- 新状态替换 `configSummaries` 后必须重建索引。
- 目录排序、查询匹配、当前配置选择和筛选回退行为不得变化。
- 不截图、不重载 VS Code，也不读取服务器配置文件。

### 验证清单

- [已通过] TypeScript 编译和 PanelHtml 生成一致性。
- [已通过] 配置检查器缓存、内联脚本和目标计划定向静态测试 5/5。

## 本批记录
- 上一批提交：`6ce1c2b`，已推送且本地与 `origin/master` 一致。
- 审计确认配置检查器每次输入筛选时都重新拆分全部路径、展开全部参数并构造小写搜索文本。
- 新索引按源数组引用复用，单次遍历生成搜索文本和目录集合；源数组替换时自动重建。
- 定向测试确认自然排序、分层目录、大小写无关搜索、同源复用和换源失效。
- [待做] 提交并推送后进入第十二周期 5/5 全量静态验证；真实 Webview 交互为人工验收项。
