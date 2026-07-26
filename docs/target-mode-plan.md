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
- [已完成] 2/5 前端：复用布局、按钮审计与 SimpleSFTP 门禁的固定命令集合。
- [已完成] 3/5 后端：让 CLI 事件跟随器按文件游标续读，并处理日志替换和截断。
- [待做] 4/5 前端：审计剩余面板签名与视图模型热点。
- [待做] 5/5 前后端：执行第十四轮非服务器静态测试。

## 当前批次：autonomous-static-067（已完成）
### 修复点

- CLI `events --follow` 每 0.5 秒只读取日志新增部分，不再重复读取完整事件日志。
- 首次读取时检查日志缺口；日志 inode 替换或文件截断后重置游标并重新检查缺口。
- 保持事件顺序、`since` 过滤、读取副作用和警告格式不变。

### 相邻回归风险

- 文件追加不能重复输出旧事件，替换和截断后不能永久卡在旧偏移。
- 缺口警告仍只在每个连续日志版本首次检查时产生。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] CLI 续读、追加、替换、截断和缺口回归测试 3/3。
- [已通过] TypeScript、Lint、Python 语法和 `git diff --check`。

## 本批记录
- `stream_events` 原先每轮调用 `readlines()` 读取完整日志，即使缺口检查已经完成仍会重复分配全部行。
- 新批次仅调整 CLI 本地日志读取，不修改 SSE、网络连接或 Xshell 边界。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 浏览器视觉和交互状态仍由用户后续人工确认。
