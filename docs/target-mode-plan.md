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

## 后续优先级：第七个五批周期
- [已完成] 1/5 后端：复用 Webview 命令路由固定集合。
- [待做] 2/5 前端：复用服务器设置状态索引。
- [待做] 3/5 后端：复用 UI 布局校验固定集合。
- [待做] 4/5 前端：减少任务选择状态重复构建。
- [待做] 5/5 前后端：执行第七轮非服务器静态测试。

## 当前批次：autonomous-static-031（已完成）

### 范围
- 将 Webview 安全命令、无需终态状态命令和触发后立即释放命令提升为模块常量。
- 避免每条前端消息和命令状态判定重复分配固定数组或集合。
- 保持命令白名单、未知命令拒绝与本地操作终态语义不变。

### 保护区
- 不修改服务器通信、Xshell、SimpleSFTP、GPU、Agent、归档和 PPT 行为。
- 不处理现有用户删除项、历史 VSIX 或 `zlk_cluster/ui/`。
- 不重载或关闭 VS Code，不执行真实网络联调。

### 相邻回归风险
- 所有现有 Webview 命令仍须通过同一安全白名单。
- 未知命令必须继续拒绝，本地工具栏命令仍须按既有状态生命周期释放。

### 验证清单
- [已通过] TypeScript、Lint、生成 JavaScript 语法及命令路由定向测试 11/11。
- [跳过] 广泛测试；本周期第 5 批执行。

## 本批记录
- 上一周期已完成基线：`ea10cb8`，600/600 非服务器静态测试通过并已同步远程。
- 本周期 1/5：`perf: reuse webview command routing sets`；TypeScript、Lint、生成 JavaScript 语法及命令路由定向测试 11/11 通过，推送后以 `origin/master` Git 历史为准。
- 下一批边界：仅复用前端服务器设置状态索引。
