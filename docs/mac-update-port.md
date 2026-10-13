# Windows 配套更新优化

参考仓库 `D:\GitRepo\SimpleExperiment-Mac`，只读参考点 `627b12c`（0.5.313、master、工作区干净）。Windows 基线 `1802054c`（0.5.289）。两个平台分别维护版本和扩展身份，没有合并整仓或覆盖 Windows Scheduler/Agent。

实施期间另只读复核了 Mac 新增的 `9321ff9`：主要为 Windows 已有的正式身份、启动前诊断、失败 job 审核及完成镜像的适配和测试；更新租约排空思路亦已在 Windows 0.2.69 配套实现。Mac 工作区由其他开发流程推进，本任务没有修改其文件或历史。

## 本轮采用

- 参照 Mac Bootstrap：更新入口先于业务加载，业务面板异常时仍可从状态栏及命令面板检查/安装。启动检查一次，随后每 30 分钟检查；同一配套版本只提醒一次。原面板和本地 API 入口委托给同一实现。
- 参照 PreviewReleaseClient：请求合并、五分钟 ETag 缓存、有界响应、超时、真实限流退避。普通 403 不冒充限流；手动点击不能绕过限流。不要求 GitHub 登录或 repo 授权。
- 参照 UpdateTransaction：显式选择“安装并重载”后，阻止新本机业务、等待已有操作结束；两个包均下载并验证后，按 SimpleSFTP → SimpleExperiment 安装。保存冻结批次、安装请求和完成回执；部分失败保留门禁，重载后提示人工补装原批次。不会自动安装、取消传输、停止远端作业或重派失败任务。
- 额外采用 Mac VSIX 完整性校验：检查所有 ZIP 条目的 CRC、边界、重复/穿越/链接，以及 package.json 与 XML 的身份/版本、真实平台和 VS Code engine；安装前重新核验 SHA256 和文件身份。适配 Windows 大小写及 universal 包，暂存包使用哈希路径，无覆盖/自动删除。
- 额外优化配套租约：SimpleExperiment 与 SimpleSFTP 的已有传输可继续续租/验主，新传输仍受更新门禁阻断。过期但存活/无法证明退出的传输不会被当成已结束。取消等待仅取消更新，不取消传输。
- 修正 Windows 现有查询没有把 GitHub 的 `tag_name`、`html_url` 映射为内部字段的问题。

## 差异审核

| Mac 额外实现 | Windows 处理 |
| --- | --- |
| 独立更新、事务恢复、限流判别、完整 ZIP 校验 | 本轮按 Windows 身份和现有发行源适配 |
| preview.json 静态索引与 release.json 配套清单 | Mac 发布协议专用；Windows 当前没有相应发布索引，继续读取两个 Windows 仓库的公开稳定 Latest Release，不编造索引或读取 Mac 包 |
| Termius 手动隧道、M5/macOS 启动、CLI 安装目录和 POSIX 大小写 | 平台专用；保留 Windows Xshell、发现目录及路径规范 |
| CLI 工作区/seed 绑定 | 0.5.291 已适配 Windows 的真实目录身份、盘符/大小写别名、活跃 API 契约及等待确认回执 |
| PLAN 级结果与操作回执归属 | 0.5.291 已适配摘要/读取候选/操作包装树；同名不同目录、别名冲突、混合/匿名来源不会授权读取。Windows 现有 SHA256、完成状态及内存汇总继续校验 |
| Mac 额外拆出的 Python 证据读取模块 | 对应分析入口 Windows 已有；不以模块拆分本身当成新功能，不替换 Windows 较新的 Scheduler/Agent 预检及正式身份门禁 |
| Mac 对 Windows 历史功能的同步及相应测试 | 大部分已有；Windows 0.5.285–0.5.289 的进度预检、真实 shell、失败 job 人工审核更新必须保留 |
| Mac 清理/句柄能力与配置差异 | 不移植成 Windows 清理兜底，现有人工授权、目录安全和所有权检查保留 |

## 入口与验证边界

命令面板：`SimpleExperiment：检查配套插件更新`、`SimpleExperiment：安装或补装配套更新并重载`。状态栏“配套更新”、面板设置中的原按钮使用同一服务。API 仍使用当前 capabilities 中的 `checkPluginUpdates` / `installPluginUpdates`，安装仍需用户确认，不自动传入任何清理授权。

本地单文件串行回归覆盖真实 GitHub JSON 字段、ETag/重复点击、403/429、错身份/平台/engine/CRC、暂存变化、下载验证失败、部分/不确定安装回执、补装、取消等待、跨插件资源租约，以及业务启动失败后独立入口。构建继续运行原有正式任务和清理门禁，额外 vm.Script 检查面板。打包后另行核验实际 VSIX；不把模拟安装或构建通过当成真实 GitHub 更新/重载验收。

本轮不读取/改写 MultiModal 结果，不调用科研运行或文件传输 API，不更新远端 Agent。安装后需用户 Developer: Reload Window；随后可手动“检查配套插件更新”。实际下载新版公开 Release、部分失败补装和多窗口重载仍待用户环境验收。

更新等待协议要求配套 SimpleSFTP ≥ 0.2.69；旧版在进入更新门禁前拒绝并要求安装配套包/重载，防止已有传输的旧版验主逻辑被打断。

## 0.5.291 思路一致、平台适配

更新仍沿用上轮独立入口、冻结配套批次、完整包校验、传输等待、人工安装与补装。本轮补充 Windows ZIP 大小写别名、尾随点/空格、设备名和非法名称保护；保留 Windows 现有稳定 Release 来源。Mac preview 静态发布索引并不存在于 Windows 发行源，不编造索引，也不安装 Mac 包。

工作流使用 `WorkflowWorkspaceBinding` 绑定当前 VS Code 项目的规范目录、设备及文件身份。API、手动提交、确认重试及实际入队的异步边界再次核对；传入另一个 workspace、目录被替换或窗口切项目时阻断。Windows 接受同一物理目录的盘符大小写/分隔符别名；Mac 的 POSIX 大小写规则没有直接搬用。普通人工终止及安全重试入口保留；移除按模糊名称猜测旧操作并隐式中止的内部兜底。

CLI 的 `LocalApiClient` 每次请求读取 discovery 与 live capabilities，再复查监听器身份。只允许动态端口的 loopback；限制发现文件、请求、响应大小并严格解码 UTF-8。`WorkflowRun` 校对 CLI/API 工作区、所选 PLAN 和 seeds，拒绝不生效的 `--seed` 覆盖。`workflow.run` 的初始回执仅说明已经请求且等待用户确认，不能宣称已经向 Worker 提交；离线预演明确 `local_only/ready:false`。

工作流要求 Host capability `workspaceIdentityRechecked:true`。磁盘已安装新版、Extension Host 尚未重载时，CLI 会在 POST 工作流前拒绝旧协议，而不是让新 CLI 落入旧版未绑定工作区的执行路径。

`ResultOwnershipScope` 在当前 PLAN 展示、临时读取候选与操作回执中核对完整相对 PLAN 路径。匿名父摘要不能借一个有归属的子记录授权其他路径；跨 PLAN/冲突 revision/循环包装被拒绝。离线 bundle 不再以当前选择伪造原摘要归属。全部为只读筛选，不修改既有结果、权重、清理机制或科学证据发布规则。

修改集中在 `src/updates/VerifiedPackage.ts`、`src/features/WorkflowWorkspaceBinding.ts`、`src/features/PlanSafeRetry.ts`、`src/cli/LocalApiClient.ts`、`src/cli/WorkflowRun.ts`、CLI/API/Provider 消费入口及 `src/results/ResultOwnershipScope.ts`。

本地新回归与相邻原回归经 `npm run test:mac-parity` 单文件串行执行；实际科研项目/API/服务器没有参与。旧 CLI 整文件初检 95 项中 93 项通过、2 个陈旧夹具失败，总耗时 26.2 秒；未再次执行该长整文件。修正 caps/seed/runner 夹具后，仅重跑两个相关目标并通过。验收不宣称全仓库测试或真实公网更新已经通过。
