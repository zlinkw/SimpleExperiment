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
- [已完成] 2/5 后端：为 Worker 上行事件读取增加有界文件游标，避免每轮从头扫描日志。
- [待做] 3/5 后续：根据生产链路审计选择静态优化项。

## 当前批次：autonomous-static-061（已完成）
### 修复点

- Worker 上行循环连续读取同一 `events.jsonl` 时，从上次字节偏移继续读取。
- 日志压缩、替换、截短或调用方回退到旧 `since` 时自动放弃游标并完整扫描。
- 游标缓存设置条目数和 TTL 上限，损坏 JSON 行继续跳过。

### 相邻回归风险

- 不能改变既有“返回最新 `limit` 条”的上行语义或跳过未发送事件。
- 日志压缩后不得从失效偏移读取；旧 `since` 重试必须仍可回读。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] Agent 上行事件游标、日志替换、旧序号回读和缓存边界测试 4/4。
- [已通过] TypeScript、Lint、TypeScript/Python runtime 语法和 `git diff --check`。

## 本批记录
- `read_events_after_seq` 当前被 Worker Hub uplink 长循环调用，每轮均扫描完整事件日志。
- 新游标按设备号、inode、大小和 `since` 校验；最多 `64` 条、TTL `1 h`。
- 真实 Worker 上行、日志压缩并发和 Xshell 隧道行为仍为 `needs field verification`。
