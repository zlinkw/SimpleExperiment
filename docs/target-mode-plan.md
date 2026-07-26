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
- [已完成] 3/5 后端：审计 GPU 历史采样与保留。
- [待做] 4/5 前端：优化资源树与检查器的定位一致性。
- [待做] 5/5 前后端：执行第二十三轮非服务器静态测试。

## 当前批次：autonomous-perf-113（已完成）
### 修复点

- 新增 `GPU_HISTORY_MAX_TOTAL_POINTS` 总点数预算，按序列等额分配并保留最新点。
- GPU 历史文件改用紧凑序列化写入，去掉每采样周期整份重写的缩进开销。
- `atomic_write` 增加 `compact` 开关，其余状态文件仍保留可读缩进。
- 三个源码结构断言改为容忍 CRLF，修复行尾导致的假失败。

### 相邻回归风险

- 总量预算不得整体丢弃序列，每个序列至少保留一个点且保留的必须是最新点。
- 未超预算的历史必须原样保留，紧凑写入后仍需能被 `json.loads` 还原。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Agent 运行时生成与校验和一致性。
- [已通过] 全量静态测试 818/818。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 此前只有每序列点数与序列数两个上限，128×4320 点按缩进 JSON 每分钟整份读写。
- 工作区为 CRLF，跨行源码断言必须写 `\r?\n`，否则会随重写行尾而假失败。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
