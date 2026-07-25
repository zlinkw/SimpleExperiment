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

## 后续优先级：第六个五批周期
- [已完成] 1/5 后端：复用操作与结果状态判定的静态集合。
- [已完成] 2/5 前端：减少 Plan 活动状态的重复扫描。
- [已完成] 3/5 后端：线性化结果候选匹配。
- [已完成] 4/5 前端：审计状态派生中的重复分配。
- [已完成] 5/5 前后端：执行第六轮非服务器静态测试。
- [待做] 后续周期：根据静态审计结果继续优化前后端；真实连接验收保持延期。

## 当前批次：autonomous-static-030（已完成）

### 范围
- 对第六周期后端集合复用、结果候选匹配与前端状态派生执行广泛静态回归。
- 排除真实服务器、本地监听、VS Code 操作及含完整文件删除或清理副作用的测试。
- 仅在发现本周期回归时修改对应源码；否则只更新本计划。

### 保护区
- 不修改服务器通信、Xshell、SimpleSFTP、GPU、Agent、归档和 PPT 行为。
- 不处理现有用户删除项、历史 VSIX 或 `zlk_cluster/ui/`。
- 不重载或关闭 VS Code，不执行真实网络联调。

### 相邻回归风险
- 当前结果只证明本地静态与隔离单元路径，不证明真实服务器连接、Agent 部署或 SFTP 传输。
- 删除与清理测试不执行，避免违反 Windows 项目文件删除保护。

### 验证清单
- [已通过] TypeScript、Lint、119 个生成 JavaScript 语法检查及 VSIX runtime 闭包检查。
- [已通过] 广泛非服务器静态测试 600/600；Python 3.10.11 + PyYAML 6.0.3。
- [纠正并复验] 首轮暴露 3 个静态契约未同步；更新常量提取、Debug 门禁断言与后续待办后复验通过。
- [明确跳过] 40 个涉及本地监听或删除/清理副作用的测试文件；PPT 路径确认测试仅做语法和静态门禁检查。

## 本批记录
- 上一周期已完成基线：`6704dd0`，602/602 非服务器静态测试通过并已同步远程。
- 本周期 1/5：`perf: reuse operation status sets`；TypeScript、Lint、生成 JavaScript 语法及定向测试 16/16 通过，推送后以 `origin/master` Git 历史为准。
- 本周期 2/5：`perf: cache plan activity evidence`；TypeScript、Lint、生成 JavaScript 语法、内联脚本 2/2 及定向测试 16/16 通过，推送后以 `origin/master` Git 历史为准。
- 本周期 3/5：`perf: compile result preview matchers`；TypeScript、Lint、生成 JavaScript 语法及结果位置定向测试 5/5 通过，推送后以 `origin/master` Git 历史为准。
- 本周期 4/5：`perf: reuse panel command sets`；TypeScript、Lint、生成 JavaScript 语法、内联脚本及定向测试 9/9 通过，推送后以 `origin/master` Git 历史为准。
- 本周期 5/5：`test: complete sixth static validation cycle`；推送后以 `origin/master` Git 历史为准。
- 下一批边界：静态测试完成后根据剩余目标建立下一周期，不自动连接服务器。
