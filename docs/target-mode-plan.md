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
- [已完成] 1/5 后端：限制 Agent scheduler 依赖预检缓存的条目数和存活时间。
- [待做] 2/5 前端：复用 GPU 历史排序索引，减少摘要和缺口统计的重复排序。
- [待做] 3/5 后端：限制通知节流键缓存，避免长期运行时按事件键无限增长。
- [待做] 4/5 前端：缓存配置检查器静态索引，减少筛选交互中的重复预处理。
- [待做] 5/5 前后端：执行第十二轮非服务器静态测试。

## 当前批次：autonomous-static-056（已完成）
### 修复点

- 为 Agent scheduler 依赖预检缓存增加 TTL、条目上限和并发访问保护。
- 保留当前请求键并优先保留最近检查结果，不改变预检返回契约。
- 仅执行 Agent runtime 内存预算定向静态测试，不连接服务器。

### 相邻回归风险

- 缓存裁剪不得删除当前请求刚写入的结果。
- 缓存命中 TTL 仍以调用方 `max_age_seconds` 为准，不能被全局 TTL 放宽。
- 静态验证不得启动真实 scheduler 或连接服务器。

### 验证清单

- [已通过] TypeScript 编译和 Agent runtime 生成一致性。
- [已通过] `test/agent/runtimeMemoryBudget.test.js` 1/1。

## 本批记录
- 第十二周期基线：`615d2a7`，本地与 `origin/master` 一致；既有删除项、历史 VSIX 和 `zlk_cluster/ui/` 保持不动。
- 审计确认 `SCHEDULER_DEPENDENCY_CACHE` 按项目根、scheduler 和 Python 环境分键，但此前没有全局容量边界。
- scheduler 依赖预检缓存限制为 32 条、全局 TTL 10 分钟；当前请求键受保护，并使用锁隔离并发读写。
- 定向测试确认过期键和旧键被淘汰、最新键与当前请求键保留。
- [待做] 提交并推送后进入第十二周期 2/5；真实服务器联调继续延期。
