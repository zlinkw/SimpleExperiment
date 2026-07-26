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
- [已完成] 2/5 前端：复用结果区就绪状态与分析产物派生。
- [已完成] 3/5 后端：复用只读遥测 API 的文件签名缓存。
- [待做] 4/5 前端：审计渲染索引和重复查找。
- [待做] 5/5 前后端：执行第十七轮非服务器静态测试。

## 当前批次：autonomous-static-082（已完成）
### 修复点

- 将 GPU、Worker 任务、availability、scheduler 和 trace 只读端点接入有界文件签名缓存。
- 保留 availability 写入路径的非缓存读取，避免修改缓存对象。
- 增加复用、文件替换失效和写入路径隔离测试。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 原子替换运行态 JSON 后必须按文件签名立即失效。
- 写入前读取不得返回共享缓存对象，避免未提交修改污染并发 GET。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建、Agent runtime 生成和哈希一致性。
- [已通过] 只读遥测 API、通用运行态 JSON、HTTP 契约和采样 payload 定向测试 5/5。
- [已通过] Lint、Python/JavaScript 语法与 `git diff --check`。

## 本批记录
- GPU、Worker 任务、availability、scheduler 和 trace GET 路径复用现有有界文件签名缓存。
- availability 写入前继续直接读取独立对象；原子替换后缓存按 inode、大小和修改时间失效。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
