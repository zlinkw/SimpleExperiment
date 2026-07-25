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

## 后续优先级：第九个五批周期
- [已完成] 1/5 后端：优化请求预算滚动计数与事件淘汰。
- [已完成] 2/5 前端：复用高频上下文动作状态签名。
- [已完成] 3/5 后端：复用操作记录与互斥键索引。
- [已完成] 4/5 工具链：移除 npm 子进程 shell 参数拼接与 Node 弃用警告。
- [待做] 5/5 前后端：执行第九轮非服务器静态测试。

## 当前批次：autonomous-static-044（已完成）

### 范围
- VSIX runtime 校验与 acceptance 直接通过 Node 执行 `npm-cli.js`。
- 移除 Windows `shell: true` 参数拼接，消除 Node `DEP0190` 并避免参数转义风险。
- 保持 npm 命令参数、工作目录、输出捕获与退出码语义不变。

### 保护区
- 不修改服务器通信、Xshell、SimpleSFTP、GPU、Agent、归档和 PPT 行为。
- 不处理现有用户删除项、历史 VSIX 或 `zlk_cluster/ui/`。
- 不重载或关闭 VS Code，不执行真实网络联调。

### 相邻回归风险
- Windows、Linux 和 npm script 环境必须能解析实际 `npm-cli.js`。
- VSIX runtime 闭包检查必须继续覆盖扩展与 CLI 入口。

### 验证清单
- [已通过] Lint 与三个工具脚本语法检查。
- [已通过] VSIX runtime 闭包及无弃用警告定向静态测试 2/2。

## 本批记录
- 上一批完成基线：`c3542d0`，操作队列定向静态测试通过并已同步远程。
- 当前批次影响区：npm 命令启动助手、VSIX runtime 校验、acceptance、对应定向测试与本计划。
- 本周期 4/5：固定 npm 参数改由 `process.execPath + npm-cli.js` 执行，工具链不再启用 shell；定向测试 2/2 通过且无 `DEP0190`。
- 下一批边界：执行第九轮非服务器广泛静态测试；不连接服务器，不操作 VS Code。
