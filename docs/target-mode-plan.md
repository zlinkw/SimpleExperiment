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
- [已完成] 5/5 前后端：执行第十二轮非服务器静态测试。
- [已完成] 1/5 GPU 历史：固化三天滑动窗口、每序列 `4320` 点上限和断档补零回归契约。
- [待做] 2/5 后端：审计 Agent 事件日志增量读取热点。
- [待做] 3/5 后续：根据生产链路审计选择静态优化项。

## 当前批次：gpu-history-007（已完成）
### 修复点

- GPU 历史原始持久化仅保留最近 `72 h`，每序列最多 `4320` 个一分钟桶，最多 `128` 条序列。
- 查询期间以 `0` 补齐电脑关机或 Agent 停止形成的缺失桶，并用 `imputed: true` 区分真实采样；补值不写回持久化缓存。
- 增强自动化断言，直接覆盖超过点数上限的输入、三天最早边界和 GPU/显存补零值。

### 相邻回归风险

- 不能通过只限制 Webview payload 掩盖 Agent 持久化历史无限增长。
- 缺失补值不能冒充真实采样，也不能写回历史文件扩大缓存。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] GPU 历史留存和补零定向测试 6/6。
- [已通过] TypeScript、Lint、核心 runtime JavaScript 语法和 `git diff --check`。

## 本批记录
- 既有实现已包含三天时间裁剪、每序列点数上限、序列数上限、查询补零和 Webview 有界缓存；本批补强可执行回归证据。
- 定向验证覆盖 `4320` 点上限、三天最早边界、断档 GPU/显存补零、缓存一分钟获取间隔和 Webview payload 上限。
- 真实服务器连续三天留存与关机断档行为仍为 `needs field verification`。
