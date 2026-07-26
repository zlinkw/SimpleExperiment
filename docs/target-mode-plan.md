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
- [已完成] 1/5 后端：复用 Extension Host 启用 Worker 配置视图。
- [待做] 2/5 前端：审计高频状态派生和重复遍历。
- [待做] 3/5 后端：审计运行态扫描或缓存边界。
- [待做] 4/5 前端：审计渲染索引和重复查找。
- [待做] 5/5 前后端：执行第十七轮非服务器静态测试。

## 当前批次：autonomous-static-080（已完成）
### 修复点

- 按 `workerTunnels` 数组引用缓存启用 Worker 配置，配置整体替换后自动失效。
- 将 Extension Host 高频只读消费者统一接入缓存视图，保留需要完整 Worker 列表的路径。
- 增加缓存复用、自动失效和消费者契约测试。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- Worker 配置替换后必须立即刷新缓存，不能保留旧启用状态。
- 禁用 Worker 不得进入运行、上传目标、Agent 准备或端口分配路径。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建和生成文件一致性。
- [已通过] 启用 Worker 缓存、首次配置、项目服务器就绪和状态发布定向测试 11/11。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- Extension Host 同一 `workerTunnels` 数组引用只筛选一次；配置整体替换后自动失效，不需要分散清缓存。
- 高频就绪、上传目标、Agent 准备、状态发布和端口分配路径统一复用启用 Worker 视图。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
