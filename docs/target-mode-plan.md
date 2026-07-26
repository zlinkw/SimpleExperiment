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
- [已完成] 1/5 后端：为每条 SSE 事件长连接分配独立有界游标，减少空闲日志重复读取。
- [待做] 2/5 前端：审计高频 UI 派生与固定集合分配。
- [待做] 3/5 后端：审计剩余 Agent 长循环和快照热点。
- [待做] 4/5 前端：审计剩余面板签名与视图模型热点。
- [待做] 5/5 前后端：执行第十四轮非服务器静态测试。

## 当前批次：autonomous-static-065（已完成）
### 修复点

- 每条 SSE 事件连接使用线程级游标，从上次字节偏移读取新增事件。
- 多个 SSE 客户端及 Worker uplink 使用不同游标键，互不驱逐当前读取位置。
- 日志压缩、替换、截短和 journal gap 仍按既有语义恢复；游标总量继续受条目数和 TTL 限制。

### 相邻回归风险

- SSE 客户端不能共享单一偏移导致漏事件或回退扫描。
- journal gap 必须优先于游标读取返回，不能被缓存掩盖。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 多 SSE 游标隔离、追加续读、日志替换和 journal gap 测试 4/4。
- [已通过] TypeScript、Lint、TypeScript/Python runtime 语法和 `git diff --check`。

## 本批记录
- SSE 空闲循环当前反复读取至少 `64 KiB` 日志尾部；长连接退避最多 `5 s` 仍会持续产生磁盘读取。
- SSE 使用线程级游标键，Worker uplink 使用固定独立键；共享缓存仍限制为 `64` 条、TTL `1 h`。
- 真实 SSE、多客户端、日志压缩并发和 Xshell 隧道行为仍为 `needs field verification`。
