# 配置字段参考

本页列出本轮 package.json 中全部注册设置及 Worker 对象字段。日常配置先读 [使用说明](simple-experiment-setup.md)，接入项目先读 [最小模板](experiment-integration.md)。

## 保存位置与覆盖关系

服务器卡片属于当前项目。“导入服务器”选择 Xshell 会话并确认后立即保存到该项目；后续编辑再点“保存服务器”。会话检测最小间隔支持 1–60 秒，和其他 Worker 字段一起保存。旧上报间隔只展示兼容值，不控制主动查询。

低流量模式严格按手动刷新显示与结果；调度、显存预留、OOM、已完成任务和产物核实继续执行。显存等待说明包含 Worker/GPU、空闲量、阈值、预留、新任务预算或采样进度；这些信息复用既有观测，不增加轮询。旧 Agent 未上报连续观察时间时明确显示“采样进度未上报”。

项目输出接入支持通用、分类、分割、回归与自定义任务。主指标和辅助指标按项目实际输出填写；切换类型不会覆盖已填指标。`metricAliases` 在主动长表/宽表解析与汇总中生效；AP 与 AUPRC、各类 F1 默认分别统计，冲突会阻止相应结果进入汇总。历史显式别名不自动改写，请核对。

结果汇总分别显示 Plan 数、完成/未完成/待核实 job 数和查询问题数。问题按 Worker 与原因折叠，展开可看全部受影响条目。API 使用 `planFile` 或唯一 `planId` 时只查询所选 Plan，返回 `scope: selected_plans`，不覆盖整批表格；整批更新仍从面板“更新结果汇总”或不带 Plan 筛选的结果查询发起。

- 面板服务器、Conda、tmux 与隧道值按当前项目 workspaceState 保存；旧项目首次迁移一次。
- VS Code 注册设置是用户/工作区配置模板；下表 scope 是设置声明的范围，不表示面板会把连接写到全局。新拓扑只注册 worker_pool，一台或多台 Worker 均适用。
- GPU 参数为逐卡覆盖 → Worker 覆盖 → 项目默认；服务器 gpuMaxConcurrentCards 对该服务器全部 PLAN 合计独立限制。逐卡并行 0 或服务器占卡 0 暂停新派发，留空继承/取消该层限制，不停止已有任务。
- “默认值”精确列出 VS Code 注册默认；内部组件自身缺省、服务器启动参数或已有保存值可能不同。实际运行以当前卡片、校验/预演和已生效 Worker 策略为准。
- 本机上传范围、Worker 间同步范围与本地最终结果目录是不同设置，不能互相代替。

## 全部注册设置

| 完整设置键 | 类型 / scope | 注册默认值 | 当前用途与状态 |
| --- | --- | --- | --- |
| `simpleExperiment.panel.retainContextWhenHidden` | boolean / window（未另声明） | `false` | 隐藏 SimpleExperiment 面板时保留整个 Webview 上下文会增加长期内存占用。默认隐藏后释放上下文，并在重新显示时恢复轻量界面状态；仅在需要隐藏期间保持页面运行时启用。 |
| `simpleExperiment.gitBackup.enabled` | boolean / window（未另声明） | `true` | 启用提交自动备份：打开项目时自动安装 post-commit hook，提交后推送当前分支到远程。 |
| `simpleExperiment.gitBackup.remote` | string / window（未另声明） | `"origin"` | 自动备份使用的 git remote 名称。 |
| `simpleExperiment.gitBackup.verifyRemoteAccess` | boolean / window（未另声明） | `true` | 安装前校验远程可达性与推送凭据；校验失败时不写入 hook。 |
| `simpleExperiment.topologyMode` | string / resource | `"worker_pool"` | 统一 Worker 调度流程，启用一台或多台服务器均使用 worker_pool；旧 single_worker 只兼容读取，切换启用范围不会迁移任务和结果。 |
| `simpleExperiment.workspaceHostRoot` | string / application | `""` | 可选 Windows 宿主工作区根目录。仅用于将 Dev Container 工作区映射到 UI Extension Host；普通 Windows 工作区无需配置。 |
| `simpleExperiment.workspaceContainerRoot` | string / application | `""` | 可选 Dev Container 工作区根目录，例如 /workspaces。远程工作区副作用操作必须同时配置宿主根。 |
| `simpleExperiment.showAdvancedCommands` | boolean / application | `false` | 在命令面板中显示旧兼容、单端点、实时流和诊断恢复命令。关闭时不删除命令或面板入口。 |
| `simpleExperiment.planDir` | string / resource | `"experiments/plans"` | 相对于工作区根目录的实验计划目录。 |
| `simpleExperiment.results.planOutputRetention` | string / resource | `"latest-only"` | 产物只保留每个任务最新一轮，重跑前按两次确认删除精确旧目录；不生成 attempt、历史产物版本或 clean_dir 备份。旧设置值按本策略兼容读取，不自动清扫声明范围外的历史文件。 |
| `simpleExperiment.codeSync.includePaths` | array / resource | `[]` | 旧版额外上传路径；首次打开同步范围树时自动纳入选择。 |
| `simpleExperiment.codeSync.scopePaths` | array / resource | 未注册默认值 | 本机与服务器同步的完整项目相对路径范围；未设置时默认非产物、非预训练权重目录。 |
| `simpleExperiment.serverSync.paths` | array / resource | `["."]` | Worker 之间的同步范围。默认整个项目，包含完整 work_dirs（兼容 work_dir）；不沿用本机代码同步的产物排除。每个 job 完成后，只同步本任务产物与当前勾选范围的交集到所有已启用 Worker。 |
| `simpleExperiment.remote.allowedRoots` | array / resource | `[]` | 可选的远端项目父目录允许前缀。留空表示不按服务器名限制；配置后每个 Worker 必须使用列表内根目录或其子目录。 |
| `simpleExperiment.remote.deniedRoots` | array / resource | `[]` | 禁止用作远端项目父目录的前缀。用户配置优先于内置推断；此列表只做额外安全边界，不提供任何默认服务器路径。 |
| `simpleExperiment.resultCsvDir` | string / resource | `"experiments/results"` | 相对于工作区根目录的实验结果 CSV 默认目录。新 Plan 和未显式声明结果路径的任务使用此目录；已有 Plan 的显式结果路径优先。 |
| `simpleExperiment.projectAdapterRules` | object / resource | `{}` | 当前工作区的结果捕获规则、指标别名及 CSV 列映射。通过 SimpleExperiment 面板交互式维护；插件同步到 Agent 自有状态目录，不要求项目存在 experiments/simple_project.yaml。 |
| `simpleExperiment.connectionMode` | string / application | `"xshell_tunnel_realtime"` | 通过每台 Worker 配置的本机转发端点访问 Agent；后台隧道与手动 Xshell 会话分开管理。 |
| `simpleExperiment.tunnel.localForwardPort` | number / application | `18765` | **旧兼容字段。** 旧版通用本机端口默认值；当前目标只由各 Worker 配置创建。不得拿此默认值探测所有服务器。 |
| `simpleExperiment.tunnel.remoteAgentPort` | number / application | `18765` | 通用远端 Agent 端口默认值；各 Worker 自身 remoteAgentHost/remoteAgentPort 优先。 |
| `simpleExperiment.tunnel.agentToken` | string / application | `""` | 可选的 Worker Agent token。诊断信息会自动脱敏。 |
| `simpleExperiment.tunnel.remoteTmuxSessionPrefix` | string / application | `"simple"` | 远端 tmux 会话名前缀，用于多用户共用服务器时区分归属；仅允许小写字母、数字、点、下划线和连字符。 |
| `simpleExperiment.tensorboard.port` | number / application | `6006` | TensorBoard 在远端监听的端口，点击“打开 TensorBoard”时会重启该端口上的 <prefix>_tb tmux 会话。 |
| `simpleExperiment.tensorboard.logdir` | string / application | `"work_dirs"` | 启动 TensorBoard 时优先使用的日志目录（相对于远端项目根目录）。留空或不存在时，agent 会自动探测 events.out.tfevents.* 目录并直接启动 tensorboard。 |
| `simpleExperiment.tensorboard.tmuxSession` | string / application | `""` | TensorBoard 的 tmux 会话名。留空时自动取 <tunnel.remoteTmuxSessionPrefix>_tb，切勿写死具体服务器或用户名。 |
| `simpleExperiment.tunnel.condaEnv` | string / application | `""` | 正式任务默认 Conda 环境绝对路径，可选以 /bin/python 结尾；留空使用系统 Python。每台 Worker 可覆盖。辅助 Agent 使用独立解释器，不以科研环境相同或依赖已安装作为就绪门禁。 |
| `simpleExperiment.tunnel.workerTunnels` | array / application | `[]` | Worker 连接模板数组。推荐在当前项目服务器卡片保存连接；面板配置按项目持久化，不写其他窗口的全局连接。 |
| `simpleExperiment.scheduler.dispatchMode` | string / window（未另声明） | `"local_idle"` | 默认全部本机调度；旧 server_prequeue 值仅兼容读取，服务器排队必须由用户点击按钮按逐卡 job 配额派发。 |
| `simpleExperiment.scheduler.pollSeconds` | number / application | `10` | 调度轮询基准，默认10秒，最小5秒；任务结束事件立即触发检查。 |
| `simpleExperiment.scheduler.jitterSeconds` | number / application | `30` | 随机抖动：0-30秒正向叠加到轮询间隔，避免多节点同时请求造成抖动。 |
| `simpleExperiment.scheduler.gpuIdleUtilThreshold` | number / application | `5` | **已弃用，仅兼容旧值。** 已弃用：新调度仅使用每卡并行 job 配额和总剩余显存门槛。 |
| `simpleExperiment.scheduler.gpuIdleMemThresholdMb` | number / application | `200` | **已弃用，仅兼容旧值。** 已弃用：新调度仅使用每卡并行 job 配额和总剩余显存门槛。 |
| `simpleExperiment.scheduler.sessionCheckMinSeconds` | number / application | `5` | 完成检测最小间隔：调度器轮询任务完成事件的最小间隔（秒），默认 5 秒，范围 1-60。越小越灵敏，不参与空卡与否判定。 |
| `simpleExperiment.scheduler.workerStatusTtlSeconds` | number / application | `45` | Worker 可用性证据有效期，默认45秒，最小10秒。 |
| `simpleExperiment.scheduler.localAvailabilityPushSeconds` | number / application | `10` | **旧兼容字段。** 历史上报参数，当前 Worker 主动查询流程不靠它推送可用性；不是界面刷新或显存采样间隔。 |
| `simpleExperiment.scheduler.workerAvailabilityPushSeconds` | number / application | `10` | **旧兼容字段。** 历史上报参数，当前 Worker 主动查询流程不靠它推送可用性；不要据此推算实际网络流量。 |
| `simpleExperiment.scheduler.operationEventMaxDelayMs` | number / application | `200` | 事件合并延迟，默认200毫秒，最小100毫秒。 |
| `simpleExperiment.scheduler.workerActionMinIntervalMs` | number / application | `500` | **旧兼容字段。** 旧版兼容设置；当前控制请求不按它形成旧的逐动作间隔门禁。GPU 并发另由配额控制。 |
| `simpleExperiment.scheduler.workerActionMaxConcurrent` | number / application | `1` | **已弃用，仅兼容旧值。** 请求限流已关闭，此设置不再生效。 |
| `simpleExperiment.gpu.currentUser` | string / application | `""` | 用于在 GPU 状态面板高亮自己进程的服务器用户名。为空时不会按本机用户名自动判定。 |
| `simpleExperiment.gpu.currentUserAliases` | array / application | `[]` | 用于高亮自己 GPU 进程的服务器用户名别名。 |
| `simpleExperiment.gpu.myCommandKeywords` | array / application | `[]` | 按命令行关键词辅助高亮自己的 GPU 进程，例如实验目录、项目名、conda 环境名或脚本名。 |
| `simpleExperiment.gpu.myProcessMatchMode` | string / application | `"both"` | GPU 进程归属高亮方式。username 按用户名，command_contains 按命令关键词，both 任一匹配。 |
| `simpleExperiment.ppt.chartType` | string / application | `"auto"` | 绘图类型。默认 auto，由 PPT 插件按结果契约自动选择。 |
| `simpleExperiment.ppt.styleMode` | string / application | `"activePpt"` | 绘图样式模式。默认 activePpt，使用 PPT 插件当前正在使用的绘图方案。 |
| `simpleExperiment.manualPanelLayout` | boolean / application | `false` | 启用 SimpleExperiment 面板分区的手动排序。 |
| `simpleExperiment.panelSectionOrder` | array / application | `[]` | SimpleExperiment 面板分区的手动顺序。 |
| `simpleExperiment.tunnel.agentLoginPolicy` | string / application | `"preserve"` | Agent 独立运行。preserve 保留原登录命令；managed 经用户确认维护独立启动段，并保留原登录行为。 |
| `simpleExperiment.scheduler.gpuMemoryRatioEnabled` | boolean / application | `true` | **已弃用，仅兼容旧值。** 已弃用：新调度仅使用每卡并行 job 配额和总剩余显存门槛。 |
| `simpleExperiment.scheduler.gpuMemoryPerJobGb` | number / application | `24` | **已弃用，仅兼容旧值。** 已弃用：新调度仅使用每卡并行 job 配额和总剩余显存门槛。 |
| `simpleExperiment.scheduler.gpuMemoryMaxJobsPerGpu` | integer / application | `0` | **已弃用，仅兼容旧值。** 已弃用：新调度仅使用每卡并行 job 配额和总剩余显存门槛。 |
| `simpleExperiment.scheduler.gpuMemoryReserveGb` | number / application | `0` | **已弃用，仅兼容旧值。** 已弃用：新调度仅使用每卡并行 job 配额和总剩余显存门槛。 |
| `simpleExperiment.scheduler.gpuMemoryTolerancePercent` | number / application | `3` | **已弃用，仅兼容旧值。** 已弃用：新调度仅使用每卡并行 job 配额和总剩余显存门槛。 |
| `simpleExperiment.scheduler.gpuJobsPerCard` | integer / window（未另声明） | `1` | 每张实际 GPU 的最大并行 job 数，默认 1；逐卡与服务器覆盖优先，显存保护继续生效。 |
| `simpleExperiment.scheduler.gpuMinFreeMemoryGb` | number / window（未另声明） | `22` | 新任务派发前最低总剩余显存 GiB，默认 22；仍须覆盖实际峰值预算、已有任务未申请预算和新任务预留。 |

## Worker 数组的注册字段

下表为 tunnel.workerTunnels.items.properties 的当前 schema。面板还支持实际连接与安装身份字段，见后表。不要把历史层的名称当成独立服务器角色。

| 字段 | 类型 | 注册默认 / 可选值 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 留空按当前配置归一化 | 稳定 Worker 标识，不能与其他已启用 Worker 重复；已有任务按此标识绑定服务器，不在运行中随意改名。 |
| `displayName` | string | 留空按当前配置归一化 | 界面显示名，用于辨认服务器；不代替真实 SSH 主机和 Worker ID。 |
| `localForwardPort` | number | 留空按当前配置归一化 | 本机访问此 Worker 的端口；需空闲且与其他本机转发端点区分，不能填成 SSH 登录端口。 |
| `remoteAgentPort` | number | 留空按当前配置归一化 | 此 Worker 上 Agent 实际监听端口，必须与隧道目标一致；不同机器可以使用相同远端端口。 |
| `sshConfigAlias` | string | 留空按当前配置归一化 | 当前机器 OpenSSH 配置中的 Host 别名，用于已有密钥、跳板等连接配置；不是 Xshell 会话名。 |
| `maxConcurrentGpus` | number / string | `"auto"` | **旧兼容字段。** 已弃用：使用自动识别卡数、每卡并行配额和总剩余显存门槛。 |
| `privateKeyPath` | string | 留空按当前配置归一化 | 本机私钥文件路径，非私钥正文；注意后台 SSH 与 SimpleSFTP 各自实际采用的认证配置。不要将私钥提交到项目。 |
| `authMethod` | string | `password / key / auto` | 连接认证选择；后台非交互 SSH 仍须有可用密钥或 ssh-agent，不能直接复用 Xshell 加密保存的密码。 |
| `enabled` | boolean | 留空按当前配置归一化 | 是否纳入当前连接、准备、同步和新任务目标；取消勾选不等于停止已运行任务。 |
| `gpuIdleUtilThreshold` | number | 留空按当前配置归一化 | **旧兼容字段。** 已弃用：使用自动识别卡数、每卡并行配额和总剩余显存门槛。 |
| `gpuIdleMemThresholdMb` | number | 留空按当前配置归一化 | **旧兼容字段。** 已弃用：使用自动识别卡数、每卡并行配额和总剩余显存门槛。 |
| `sessionCheckMinSeconds` | number | 留空按当前配置归一化 | 该 Worker 的完成检测间隔覆盖；不是显存采样、界面刷新或判断空卡的条件。 |
| `workerStatusTtlSeconds` | number | 留空按当前配置归一化 | 该 Worker 可用性观察的有效期；到期需重新查询，不能据此撤销已经确认的完成事实。 |
| `agentLoginPolicy` | string | `"preserve"` | 保留原登录行为；选择 managed 时按明确确认维护独立 Agent 启动段，不替换用户其他登录命令。 |
| `workerHost` | string | 留空按当前配置归一化 | SSH 登录主机名/IP，填写实际服务器地址；本机转发地址是另一个字段。 |
| `workerUser` | string | 留空按当前配置归一化 | 实际 SSH 登录用户，需有项目目录和所选 tmux 服务的访问权限。 |
| `workerSshPort` | number | 留空按当前配置归一化 | SSH 登录端口，应与服务器及 SimpleSFTP 目标一致，不是 Agent HTTP 端口。 |
| `gpuMemoryRatioEnabled` | boolean | 留空按当前配置归一化 | **旧兼容字段。** 已弃用：使用自动识别卡数、每卡并行配额和总剩余显存门槛。 |
| `gpuMemoryPerJobGb` | number | 留空按当前配置归一化 | **旧兼容字段。** 已弃用：使用自动识别卡数、每卡并行配额和总剩余显存门槛。 |
| `gpuMemoryMaxJobsPerGpu` | integer | 留空按当前配置归一化 | **旧兼容字段。** 已弃用：使用自动识别卡数、每卡并行配额和总剩余显存门槛。 |
| `gpuMemoryReserveGb` | number | 留空按当前配置归一化 | **旧兼容字段。** 已弃用：使用自动识别卡数、每卡并行配额和总剩余显存门槛。 |
| `gpuMemoryTolerancePercent` | number | 留空按当前配置归一化 | **旧兼容字段。** 已弃用：使用自动识别卡数、每卡并行配额和总剩余显存门槛。 |
| `gpuJobsPerCard` | integer | 留空按当前配置归一化 | 每卡最大并行 job 数，未设置跟随全局；旧比例仅作迁移。 |
| `gpuMinFreeMemoryGb` | number | 留空按当前配置归一化 | 该卡可派发最低总剩余显存 GiB，未设置跟随全局 22。 |
| `gpuMaxConcurrentCards` | integer | 留空按当前配置归一化 | 最高优先级的服务器并发占卡上限，所有 PLAN 合计；留空不限，0 暂停新任务，不停止已有任务。 |
| `gpuCardOverrides` | object | 留空按当前配置归一化 | 按实际 GPU 编号逐卡覆盖；留空继承服务器默认值。单卡 job 配额 0 暂停后续派发。 |

## 面板连接与安装字段

| 字段 | 说明 |
| --- | --- |
| localForwardHost / localForwardPort | 该 Worker 的本机转发入口；动态读取，不能跨 Worker 套用端口。 |
| remoteAgentHost / remoteAgentPort | 该 Worker 真正监听的 Agent 地址和端口；remoteTelemetryPort 是旧兼容别名。 |
| agentProjectDir | 用户选择的远端项目父目录；当前工作区名参与最终项目路径计算。 |
| condaEnv | 正式任务环境绝对路径或精确 Python 路径；空值按项目默认/系统 Python 处理，辅助 Agent 不以科研解释器一致作为门槛。 |
| savedSessionPath / savedSessionForwardIndex | Xshell 导入与手动打开入口；不能证明后台系统 SSH 认证成功。 |
| agentInstallDir / agentStateDir / workerStateDir | 高级 runtime、Agent 状态与 Worker 状态目录，须核对部署页的精确位置。 |
| sessionPrefix / remoteTmuxSessionPrefix | tmux 命名与归属前缀，避免与其他用户或项目冲突。 |
| gpuMaxConcurrentCards | 整台服务器所有 PLAN 合计的并发占卡上限，留空不限，0 暂停新派发。 |
| gpuCardOverrides.<GPU编号>.gpuJobsPerCard | 逐卡最大并行 job 数；0 暂停该卡的新派发。 |
| gpuCardOverrides.<GPU编号>.gpuMinFreeMemoryGb | 逐卡总剩余显存门槛，单位 GiB；预算预留仍继续检查。 |

## CLI 当前结果与离线历史（0.5.445 试行版）

`simpleex result list`、`result show <id>`、`result export <id>` 默认调用当前项目插件的 `results.list`，只使用本轮核实的结果。插件离线、连接中断或整批结果未核实时返回错误，不会自动读取旧 registry、旧 Worker 汇总或本机 CSV 填补，也不会覆盖指定的已有导出文件。部分任务未完成时仍可列出本轮已经核实的行。

```powershell
# 主动查询；先列出精确 id，再查看或导出其中一行
simpleex result list --json
simpleex result show <结果id> --json
simpleex result export <结果id> --format json --out result.json --json

# 明确查看本机历史；不要求 VS Code/Worker 在线
simpleex result list --history --json
simpleex result list --history --workspace D:\Projects\MyExperiment --json
simpleex result show <历史结果id> --history --json
simpleex result export <历史结果id> --history --format csv --out historical-result.csv
```

历史查询只读取本机项目目录，`--workspace` 必须指向实际存在的本机目录；不使用 `--instance`。历史行标记 `source=history`、`current=false`，并向 stderr 输出未核实提醒；旧状态和时间仅作历史信息。默认结果的 `current=true` 表示该行来自本次主动查询，不表示整批所有任务已完成。现代行的 ID 绑定 PLAN、Worker、运行 ID、版本身份、全部维度及来源路径；种子、评测协议或运行不同不会覆盖另一行，查询排序变化不会改变同一行的 ID。单次查询的完整结果不受 API 顶层预览 200 行限制。

`metric list/show`、`compare` 和 `experiment results` 同样默认查询当前结果；显式添加 `--history` 才查看历史。`experiment results <id> --history` 仅按历史结果自身精确 ID、experimentId 或 runKey 匹配，不连接服务器补配置或推断归属。`result parse --file`、`result paper-table --file` 和 `metric leaderboard --file` 保留原本的本地文件分析方式。

“剩余 job 入服务器队列”严格按产物审核结果区分已通过、隔离受阻和用户保留：只将通过的子集按配额分配；受阻 job 持久保存真实原因，重载后可继续核实，用户保留的产物不派发。手动派发的服务器/GPU 选择框不暂停自动队列；确认后重新核对当前任务身份、连接和停止意图，再执行原有同步、产物审核与派发。选择期间若任务已变化，需重新选择，不会凭旧选择覆盖当前状态。

## 运行中查询与审核等待（0.5.446 试行版）

结果查询只冻结实际读取的 job 归属。其他 job 从排队变为运行不会取消查询；同一读取目标的 commandId、Worker、PLAN 版本、代码或声明路径被替换时仍终止本轮，不能发布旧结果。工作区、服务器配置、PLAN 文件变化及用户取消继续生效，已完成事实和真实产物核实保持原规则。

`results.list` 和 `tasks.dispatch` 属于长业务操作，CLI 不再套用固定 15 秒截止。实例身份握手和普通状态请求仍有各自截止；结果读取仍按服务器声明/产物查询预算及指标连续 120 秒无有效进展规则结束等待。派发继续等待源码同步、审核和实际提交回执；网络中断表示回执可能未知，不等于服务器未接收，不自动重发。遇到断线先主动刷新任务，或用 `simpleex experiment list --json` 查询原任务状态，再决定后续处理；不要为了消除报错重复派发。

手动派发及“剩余 job 入服务器队列”的产物确认窗口等待期间，只预约本次选中的 job，不占住整个项目的自动队列。其他 job 继续按原显存预算、卡配额和并行上限调度；最终提交前会收回提交门禁、等待正在进行的调度轮结束，并重新核对目标身份。审核、同步和隔离执行的原安全检查、覆盖路径确认流程不缩减。取消、停止或配置变化后只释放本批预约，不能清掉其他任务或新的派发身份。

若在批量审核期间重载，所选任务保留为未派发的审核预约，不能凭旧确认自动启动。再次点击“剩余 job 入服务器队列”可完整重新审核并继续；取消重审仍保留原预约。已运行、已完成及其他 job 不参与恢复，产物和完成证据保留。

`result show/export` 优先使用精确结果 ID。运行 ID 或 experimentId 只有唯一匹配行时才兼容接受；多行时返回 `RESULT_SELECTION_AMBIGUOUS`，在错误详情列出候选 ID、种子和维度，原导出文件不变。先执行 `simpleex result list --json`，再复制所需行的精确 ID 查看或导出。该规则同样适用于明确的 `--history` 查询。

## 审核中断与最终提交保护（0.5.447 试行版）

批量审核每完成一个 PLAN，就把本轮已发现的产物隔离阻断保存到原 job。后续 PLAN 被取消、审核失败或配置变化时，这些阻断仍保留，重载后继续显示原因，不能因释放本批预约而重新进入自动派发。所有通过审核的 job 仍须等整批提交复核通过才创建新派发身份；不会因为提前保存阻断就提前运行。原传输结束后的精确路径重查和显存保护保留。

手动派发会在实际停止原任务前重新读取队列，并在最终队列写入事务中核对最新状态。若所选 job 新增已确认完成事实、停止或召回意图，或所属 PLAN、代码、Worker、原 commandId、case/seed、声明输出路径变化，本次拒绝派发并保留这些事实。需要重跑已完成任务时，使用原有明确重跑入口。失败时仅释放本次预约，不清除完成、停止或产物证据；其他未选中的任务完成不会中断这次操作。

`result show/export`、`metric show` 与 `compare` 共用相同选择规则：精确结果 ID 优先，experimentId/runKey 别名只允许唯一匹配。多行时返回 `RESULT_SELECTION_AMBIGUOUS` 及候选 ID，不自动选第一行、最后一行或计算平均值。先执行 `simpleex result list --json`，按所需种子和评测范围选择精确 ID；使用 `--history` 时同样如此。唯一别名及原本的无结果提示保留，`metric list` 仍列出当前可见结果中的指标名称。

```powershell
simpleex result list --json
simpleex metric show <精确结果ID> --json
simpleex compare <左侧精确结果ID> <右侧精确结果ID> --json
```

## 旧值与新配置的区别

新用户不再配置 workerRealtimeMode、workerTelemetryMode、控制节点或固定显存比例来代替当前 Worker 策略。旧字段保留兼容读取不表示仍有对应功能。single_worker 和旧拓扑标志读取后统一为 Worker 流程，不恢复已退役角色；新的 API/CLI 显式请求退役目标会被拒绝。

并行 job 数、占用几张卡、可用性证据有效期、常规查询间隔、GPU 显存采样和实际文件传输量是不同概念。遇到空卡等待时，先查看卡片的明确阻塞原因，再调新参数，不靠反复调旧兼容字段或降低安全检查。
