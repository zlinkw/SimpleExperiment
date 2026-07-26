# 目标模式当前计划：前后端静态优化周期
本文档只保留最新活动目标。历史批次、验证和部署记录以 git 提交为准。
打包/清理时会自动压缩本文件，禁止堆积流水账。

## 固定边界
- 角色分工：SimpleExperiment 负责计划、Agent、状态和任务；SimpleSFTP 负责真实文件传输；PPT 插件负责绘图。
- 全局约束：不手工修改安装目录；仅在完成独立备份后，按用户本批明确授权通过 VS Code CLI 安装新版 VSIX；不覆盖已有 VSIX，不删除完整文件，不把未验证实验声明当作事实。
- `Agent runtime cache` 只服务运行态；项目计划、结果、归档、删除墓碑和文件传输状态属于项目态。
- 结果证据使用最终归档结果；`metrics_summary.csv`、PPT 和论文证据不得混入临时结果；PPT 绘图目标确认必须先于 automation 调用，且不迁移、删除或重写旧任务和结果。
- PPT 绘图链路与 realtime post gate 稳定化继续保留；GPU 历史与 Docker 兼容后续验收分别见 `docs/target-plans/server-gpu-history.md`、`docs/target-plans/docker-codex-plugin-compat.md`。
- 连接边界：Xshell 本地隧道 + Hub/Worker Agent + SimpleSFTP；插件不内置 SSH/SCP/rsync。
- 新增补充任务不得破坏当前主目标；计划更新必须防止修复循环。
- 禁止“父级 evidence key 被子文件 archive 反向命中”。
- 长时间 Webview payload 预算：`schedulerStates` 与 `experimentTraces` 必须限量、压缩并保留受保护记录；`per-request timeout`、`pending key`、`lastSeq/lastHeartbeatAt` 由代码和测试覆盖。
- 当前窗口持续用于开发；禁止重载、关闭或自动操作 VS Code。
- 当前不连接服务器；只执行本地静态检查，不运行真实 Xshell、SimpleSFTP、GPU 或 Agent 联调。
- 每批最多 2 至 3 个强相关问题、8 个源码/文档/测试文件，并独立提交、推送到 `origin/master`。
- 每 5 个完成批次执行一次全量静态测试；其余批次只跑定向检查。

## 后续优先级：第十一个五批周期
- [已完成] 1/5 前端：缓存 GPU 历史点索引并优化 hover 邻近查询。
- [待做] 2/5 后端：静态审计队列、限流或长期状态路径。
- [待做] 3/5 前端：静态审计下一处 DOM 查询与交互刷新热点。
- [待做] 4/5 后端与工具链：静态审计 payload、缓存或构建热点。
- [待做] 5/5 前后端：执行第十一轮非服务器静态测试。

## 当前批次：autonomous-static-051（已完成）

### 范围
- 按 points 数组引用缓存有效点、排序时间和预期采样步长。
- tooltip 时间范围与最近时间改用缓存索引，单序列最近点改用二分查询。
- 保持缺口阈值、时间范围和 tooltip 文本语义不变。

### 保护区
- 不修改服务器通信、Xshell、SimpleSFTP、GPU、Agent、归档和 PPT 行为。
- 不处理现有用户删除项、历史 VSIX 或 `zlk_cluster/ui/`。
- 不重载或关闭 VS Code，不执行真实网络联调。

### 相邻回归风险
- 未排序输入必须仍可返回正确最近点。
- 超过缺口阈值的目标时间必须继续返回空值。

### 验证清单
- [已通过] TypeScript 与 Lint。
- [已通过] GPU 历史图表与 Webview 脚本定向静态测试 11/11。

## 本批记录
- 上一批完成基线：`bba4baa`，第十轮非服务器广泛静态测试已同步远程。
- 当前批次影响区：Webview GPU 历史点索引、tooltip 时间查询与对应测试。
- points 索引按数组弱引用复用；hover 时间范围与最近点不再全量扫描，最近点使用二分查询。
- 下一批边界：静态审计后端队列、限流或长期状态路径。
- 真实服务器、Xshell、SimpleSFTP、GPU 与 Agent 联调继续延期。
