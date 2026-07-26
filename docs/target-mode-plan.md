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
- [已完成] 2/5 前端：复用 GPU 历史排序索引，减少摘要和缺口统计的重复排序。
- [已完成] 3/5 后端：为 Worker 命令队列读取增加有界游标缓存，避免重复扫描已消费前缀。
- [已完成] 4/5 前端：缓存配置检查器静态索引，减少筛选交互中的重复预处理。
- [已完成] 5/5 前后端：执行第十二轮非服务器静态测试。
- [待做] 后续：进入第十三个五批静态优化周期，先重新审计实际生产链路热点。

## 当前批次：autonomous-static-060（已完成）
### 修复点

- 执行仓库全量 Node 静态测试，覆盖本周期新增缓存与既有前后端契约。
- 执行 TypeScript、Lint、核心 JavaScript 语法、runtime closure 和包内容静态校验。
- 不生成或安装 VSIX，不启动服务器、Xshell、SimpleSFTP、GPU 或 Agent 联调。

### 相邻回归风险

- 全量失败必须修复并复验，不能以本周期定向结果替代。
- runtime closure 和包内容检查不得生成或覆盖安装包。
- 验证过程不得重载、关闭或自动操作当前 VS Code。

### 验证清单

- [已通过] `npm test` 全量 Node 静态测试 718/718。
- [已通过] Lint、核心 JS 语法、runtime closure、目标计划和 VSIX 内容静态校验。

## 本批记录
- 第十二周期四个实现提交 `7a5b5f3`、`db4eb8a`、`6ce1c2b`、`98e1877` 均已推送且本地与 `origin/master` 一致。
- 全量测试 718/718；TypeScript、Lint 和四个核心 JS 入口语法通过；末次目标计划校验初因缺少后续待做项失败，补录第十三周期后 3/3 复验通过。
- VSIX runtime closure 覆盖 51 个本地模块和 5 个入口，`vsce ls --no-dependencies` 包内容静态检查通过。
- 未生成、安装或覆盖 VSIX；真实服务器、Xshell、SimpleSFTP、GPU、Worker 和 Agent 行为均为 `needs field verification`。
