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
- [已完成] 3/5 后端：审计运行态读取边界。
- [待做] 4/5 前端：审计渲染查找与索引。
- [待做] 5/5 前后端：执行第十八轮非服务器静态测试。

## 当前批次：autonomous-static-087（已完成）
### 修复点

- `/api/results/summary` 只读路由改用签名缓存读取 Plan 级与全局结果摘要。
- `read_results_summary` 增加 `cached` 开关；解析决策路径继续使用未缓存读取。
- 诊断接口的 `agent.session.json` 读取并入只读缓存，并对非字典载荷做兜底。
- 增加缓存命中、签名失效、写决策路径与诊断复用测试。

### 相邻回归风险

- 结果摘要文件更新后必须立即失效，不得返回旧解析结论。
- `read_current_results_summary` 的重解析判定不得被缓存读取改变。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Agent 运行时生成与校验和一致性。
- [已通过] Agent 运行时定向测试 21/21。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 只读 GET 路由的结果摘要与诊断读取统一走 `read_runtime_json_cached` 的 stat 签名失效。
- 写入与解析决策路径保持原有未缓存语义，避免缓存参与重解析判断。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
