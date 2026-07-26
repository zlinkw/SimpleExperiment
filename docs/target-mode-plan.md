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
- [已完成] 1/5 后端：按文件签名缓存只读 Agent 快照 JSON。
- [已完成] 2/5 前端：审计结果工作流派生状态缓存。
- [已完成] 3/5 后端：审计运行态文件索引和列表读取。
- [已完成] 4/5 前端：审计项目与服务器视图重复扫描。
- [已完成] 5/5 前后端：执行第十六轮非服务器静态测试。
- [待做] 下一轮：根据本轮静态证据选择新的前后端有界优化点。

## 当前批次：autonomous-static-079（已完成）
### 修复点

- 执行第十六轮完整非服务器静态测试。
- 覆盖构建、全量 Node 测试、Lint、核心 JS/Python 语法、运行时闭包和 VSIX 文件清单。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 全量测试可能暴露前四批未覆盖的跨模块回归。
- 运行时生成文件必须与源码和哈希一致。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] `npm test` 全量静态测试 735/735、TypeScript 构建和生成文件一致性。
- [已通过] Lint、核心 JS/Python 语法、运行时闭包、`git diff --check` 和 package 文件清单。

## 本批记录
- 本批只记录验证结果，不修改功能范围。
- 首次全量运行暴露旧测试夹具未加载共享 Worker helper；更新夹具后定向测试 22/22、全量复验 735/735。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
