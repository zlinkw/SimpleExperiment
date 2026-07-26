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
- [待做] 4/5 前端：缓存配置检查器静态索引，减少筛选交互中的重复预处理。
- [待做] 5/5 前后端：执行第十二轮非服务器静态测试。

## 当前批次：autonomous-static-058（已完成）
### 修复点

- 为 Agent 的 Worker 命令 JSONL 读取保存每文件最近消费行号和字节偏移。
- 仅在请求 `since` 与游标一致且文件身份未变化时续读，重试和回读仍从头执行。
- 对游标缓存增加 TTL 和条目上限，不改变 `queueSeq` 与每批返回顺序。

### 相邻回归风险

- 文件截断、替换或旧 `since` 请求不得错误跳过命令。
- JSON 损坏行仍跳过，但物理行号必须继续计入 `queueSeq`。
- 静态测试不得启动 Agent HTTP 服务或连接 Worker。

### 验证清单

- [已通过] TypeScript 编译和 Agent runtime 生成一致性。
- [已通过] Worker 命令游标与 Agent 内存预算定向静态测试 2/2。

## 本批记录
- 上一批提交：`db4eb8a`，已推送且本地与 `origin/master` 一致。
- 计划原候选通知节流工具未被生产链路引用，改为处理实际 Worker 命令轮询中的重复前缀扫描。
- 审计确认 `read_worker_commands` 每次从文件首行扫描到结尾，即使 `since` 单调递增。
- 游标仅在文件身份、大小和请求序号连续时命中；旧序号重试保持从头回读，损坏行仍占用物理序号。
