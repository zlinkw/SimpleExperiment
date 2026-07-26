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
- [待做] 4/5 前端：审计项目与服务器视图重复扫描。
- [待做] 5/5 前后端：执行第十六轮非服务器静态测试。

## 当前批次：autonomous-static-077（已完成）
### 修复点

- 按 scheduler 运行态目录签名缓存 `*_state.json` 文件索引。
- scheduler 状态 JSON 复用只读文件签名缓存，并在派生字段写入前复制对象。
- 索引缓存限制数量和空闲时间，不缓存项目归档、结果或传输目录。

### 相邻回归风险

- scheduler 状态文件新增或移除后必须刷新目录索引。
- 状态文件替换后必须刷新 JSON，且不能污染缓存源对象。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] 索引复用、目录变化失效、JSON 缓存隔离和缓存上限测试 1/1。
- [已通过] 定向静态测试 3/3、TypeScript、Lint、Python 语法和 `git diff --check`。

## 本批记录
- Hub sampler 和 snapshot 循环会重复 glob 同一 scheduler 运行态目录并解析未变化文件。
- 本批仅优化 Agent 运行态 scheduler 读取，不涉及任何项目态文件。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
