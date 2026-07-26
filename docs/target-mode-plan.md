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
- [已完成] 4/5 后端：审计文件传输状态与进度派生。
- [待做] 5/5 前后端：执行第二十二轮非服务器静态测试。

## 当前批次：autonomous-fix-109（已完成）
### 修复点

- `public_transfer_record` 派生进度百分比并对超额值封顶，总量未知时不生成百分比。
- 运行中传输超过 `TRANSFER_STALL_SECONDS` 未更新时标记 `stalled`，终态传输不受影响。
- Webview 传输归一化补上 `expectedSize` 作为总量来源，此前上传总量恒为 0。
- 未上报速率与 ETA 时按已传字节与耗时派生，Agent 上报值优先。

### 相邻回归风险

- 总量或时间戳缺失时不得伪造百分比、速率与 ETA，必须保持占位符。
- 上传只上报 `receivedBytes` 时，别名必须胜过被默认置零的 `transferredBytes`。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Agent 运行时生成与校验和一致性。
- [已通过] 全量静态测试 806/806。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 传输此前只输出原始字节数，客户端无法区分“运行中”与“运行中但已停滞”。
- 停滞判定复用 UTC 安全的 `iso_age_seconds`，与 107 批的时区修复保持一致。
- 提交记录：本批使用独立 `feat` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
