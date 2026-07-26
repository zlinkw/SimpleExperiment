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
- [待做] 4/5 前端：审计结果与操作视图的重复派生。
- [待做] 5/5 前后端：执行第十五轮非服务器静态测试。

## 当前批次：autonomous-static-072（已完成）
### 修复点

- Worker 和 Hub 采样循环直接比较结构化 payload，不再先构造完整 JSON 字符串。
- 仅在 payload 变化时更新缓存并追加事件，保持既有事件抑制语义。
- JSON 序列化仍由实际事件写入负责，不改变线协议。

### 相邻回归风险

- 嵌套字典和数组内容相同必须判定为未变化。
- payload 任一字段变化必须触发事件，缓存不能跨采样器共享。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 结构相等、嵌套变化、独立键和采样器源码回归测试 3/3。
- [已通过] TypeScript、Lint、Python 语法和 `git diff --check`。

## 本批记录
- Worker 和 Hub 采样器原先每轮对 GPU、健康、任务、调度、trace 和日志 payload 执行 `json.dumps` 仅用于相等比较。
- 本批不改变采样间隔、心跳、事件字段或服务器通信方式。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
