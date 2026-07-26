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
- [待做] 3/5 后端：审计运行态扫描或缓存边界。
- [待做] 4/5 前端：审计渲染索引和重复查找。
- [待做] 5/5 前后端：执行第十七轮非服务器静态测试。

## 当前批次：autonomous-static-081（已完成）
### 修复点

- 按 Webview 状态与结果摘要引用缓存自动解析就绪状态。
- 复用当前 Plan 分析产物派生，避免结果签名和结果渲染重复扫描操作记录。
- 增加缓存复用和状态替换失效测试。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 新 Webview 状态或结果摘要替换后必须立即重新派生。
- Plan revision、运行证据和分析产物路径不得跨状态复用。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建和生成文件一致性。
- [已通过] 结果自动解析、结果刷新、PPT 分析产物和 Plan 统计来源定向测试 12/12。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- 同一 Webview 状态与结果摘要只派生一次自动解析就绪状态和分析产物路径。
- 状态或摘要引用替换后立即失效，Plan revision 和运行证据仍由原有版本门禁判定。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
