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
- [已完成] 3/5 前端：复用同一状态帧的项目运行就绪判定，避免概览和检查器重复执行门禁派生。

## 当前批次：autonomous-static-062（已完成）
### 修复点

- 项目运行就绪判定在同一 Webview 状态帧内只计算一次。
- 概览签名、资源检查器、工作流阶段和阻塞条复用同一判定对象。
- 新状态对象到达时立即失效，避免服务器、Plan、任务或结果状态显示陈旧。

### 相邻回归风险

- 缓存不得跨状态对象复用，也不能绕过当前 Plan revision、Agent、Worker、输出门禁和 SimpleSFTP 检查。
- 所有提前返回分支必须统一写入缓存。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 项目就绪判定同状态复用和新状态失效测试 11/11。
- [已通过] TypeScript、Lint、Panel 脚本语法和 `git diff --check`。

## 本批记录
- `overviewProjectReadiness` 在一个概览渲染中由签名、工作流阶段、阻塞条和主概览重复调用。
- 同状态对象返回同一判定引用，新状态对象重新执行完整门禁派生。
- 浏览器视觉和交互状态仍由用户后续人工确认。
