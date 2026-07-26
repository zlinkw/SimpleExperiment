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
- [已完成] 1/5 GPU 历史：固化三天滑动窗口、每序列 `4320` 点上限和断档补零回归契约。
- [已完成] 2/5 后端：为 Worker 上行事件读取增加有界文件游标，避免每轮从头扫描日志。
- [已完成] 3/5 前端：复用同一状态帧的项目运行就绪判定，避免概览和检查器重复执行门禁派生。
- [已完成] 4/5 后端：缓存事件日志操作索引，避免快照与单操作查询重复扫描和分组。
- [已完成] 5/5 前后端：执行第十三轮非服务器静态测试。
- [待做] 后续：进入第十四个五批静态优化周期，重新审计实际生产链路热点。

## 当前批次：autonomous-static-064（已完成）
### 修复点

- 执行仓库全量 Node 静态测试，覆盖本周期 GPU 留存、Agent 日志缓存和 Webview 就绪缓存。
- 执行 TypeScript、Lint、核心 JavaScript/Python 语法、runtime closure 和 VSIX 内容静态检查。
- 不生成、安装或覆盖 VSIX，不连接服务器、Xshell、SimpleSFTP、GPU、Worker 或 Agent。

### 相邻回归风险

- 全量失败必须修复并复验，不能以各批定向测试替代。
- 包内容检查不得生成或覆盖安装包。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] `npm test` 全量 Node 静态测试 722/722。
- [已通过] Lint、核心 JavaScript/Python 语法、runtime closure、目标计划和 VSIX 内容静态检查。

## 本批记录
- 第十三周期实现提交 `6540849`、`9eb2a74`、`e6906ec`、`ac6719e` 均已推送且本地与 `origin/master` 一致。
- 首轮检查暴露目标计划缺少后续待做项，次轮暴露既有 VM 夹具未注入新增缓存变量；修复后全量复验通过。
- runtime closure 覆盖全部本地模块与入口，`vsce ls --no-dependencies` 通过；未生成或安装 VSIX。
- 真实服务器、Xshell、SimpleSFTP、GPU、Worker 和 Agent 行为均保持 `needs field verification`。
