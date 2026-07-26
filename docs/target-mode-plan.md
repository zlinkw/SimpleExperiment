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
- [已完成] 1/5 后端：审计 Agent 动作队列与并发边界。
- [待做] 2/5 前端：优化服务器配置分区的校验反馈。
- [待做] 3/5 后端：审计 GPU 历史采样与保留。
- [待做] 4/5 前端：优化资源树与检查器的定位一致性。
- [待做] 5/5 前后端：执行第二十三轮非服务器静态测试。

## 当前批次：autonomous-fix-111（已完成）
### 修复点

- Worker 动作防连点等待加入 `WORKER_ACTION_WAIT_TIMEOUT_SECONDS` 上限，超时抛出可读错误而非无限阻塞。
- 每次休眠不超过剩余期限，避免越过截止时间继续等待。
- 并发上限判定保持立即拒绝语义，不参与等待。
- 增加饿死超时、并发上限、正常获取与常量接线测试。

### 相邻回归风险

- 拿到名额的等待者仍须遵守最小间隔，不得因超时逻辑提前放行。
- 超时或拒绝后不得泄漏在途计数，`release()` 必须仍能清零。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Agent 运行时生成与校验和一致性。
- [已通过] 全量静态测试 810/810。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- `release()` 会刷新最近动作时间戳，持续动作流可让等待者被无限饿死，占满 ThreadingHTTPServer 线程。
- 等待循环此前既无截止时间也无重试上限，是可用性风险而非单纯性能问题。
- 提交记录：本批使用独立 `fix` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
