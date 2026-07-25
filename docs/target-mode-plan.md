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
- [待做] 3/5 后端：静态审计并优化队列或状态索引。
- [待做] 4/5 前端与工具链：静态审计下一批热点与弃用警告。
- [待做] 5/5 前后端：执行第九轮非服务器静态测试。

## 当前批次：autonomous-static-042（已完成）

### 范围
- Extension Host 为实际影响按钮的状态生成有界上下文签名，Webview 直接复用。
- 高频状态消息只改变 GPU、日志等无关数据时，跳过 Webview 重复压缩、序列化与按钮扫描。
- 保持能力、健康、实时、选择、计划与待执行按钮刷新语义不变。

### 保护区
- 不修改服务器通信、Xshell、SimpleSFTP、GPU、Agent、归档和 PPT 行为。
- 不处理现有用户删除项、历史 VSIX 或 `zlk_cluster/ui/`。
- 不重载或关闭 VS Code，不执行真实网络联调。

### 相邻回归风险
- 任何影响按钮可用性的状态都必须纳入缓存版本。
- 任务选择与 plan 输入变化必须继续立即刷新右侧及固定动作。

### 验证清单
- [已通过] TypeScript、Lint、生成 JavaScript 语法检查。
- [已通过] 状态投递、工作台资源树与概览上下文动作定向静态测试 18/18。

## 本批记录
- 上一批完成基线：`a19e758`，请求预算定向静态测试通过并已同步远程。
- 当前批次影响区：Extension Host 状态投递、面板上下文动作签名、对应定向测试、生成 JavaScript 与本计划。
- 本周期 2/5：Host 生成有界按钮上下文签名，排除 GPU、历史、日志、传输和诊断等无关高频数据；Webview 优先复用该签名并保留旧状态回退路径；定向测试 18/18 通过。
- 下一批边界：静态审计后端队列或状态索引；不连接服务器，不操作 VS Code。
