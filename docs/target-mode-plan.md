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
- [已完成] 2/5 前端：审计轻量状态派生缓存。
- [待做] 3/5 后端：审计运行态读取边界。
- [待做] 4/5 前端：审计渲染查找与索引。
- [待做] 5/5 前后端：执行第十八轮非服务器静态测试。

## 当前批次：autonomous-static-086（已完成）
### 修复点

- 按 `integrations.simpleSftp` 引用缓存 SimpleSFTP 就绪派生，避免每个受控命令重复构建视图。
- 缺失集成时复用统一的宽松默认值，保持原有 `ready: true` 语义。
- 增加引用复用、载荷替换、缺失回退和受控命令原因一致性测试。
- 不生成或安装 VSIX，不连接服务器，不重载或关闭 VS Code。

### 相邻回归风险

- 集成载荷替换后不得返回旧的就绪结论。
- 受控命令禁用原因必须与缓存视图一致，非受控命令仍返回空原因。
- 当前仅执行静态验证，不连接服务器或重载、关闭 VS Code。

### 验证清单

- [已通过] TypeScript 构建和生成文件一致性。
- [已通过] SimpleSFTP 就绪缓存、Plan 查找索引与 Worker 隧道视图定向测试。
- [已通过] Lint 与 `git diff --check`。

## 本批记录
- `simpleSftpReadinessForState` 在同一集成对象上只派生一次；`disableReason` 逐命令调用不再重复分配。
- 缺失或非对象集成统一回退到共享默认视图，切换回真实载荷时立即失效。
- 提交记录：本批使用独立 `perf` 提交并推送 `origin/master`；哈希以 Git 历史为准。
- 真实服务器、Xshell、SimpleSFTP、GPU 和 Agent 通信继续标记为未执行现场验证。
