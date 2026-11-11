# Windows MCP 接入

MCP 连接指定项目的 VS Code 窗口，与面板和 CLI 使用同一 Local API、任务队列和结果来源。VS Code 需要打开目标项目并加载 SimpleExperiment。

## 启动与授权

安装支持 MCP 的 Windows 版本后，稳定入口为 `simpleex-mcp --workspace <项目绝对路径>`。在 Codex 中注册 stdio 服务，配置命令目录内的 Node 启动器，避免依赖不断变化的扩展版本目录。

```toml
[mcp_servers.multimodal]
command = "node"
args = ["C:/Users/ZLK/AppData/Roaming/npm/simpleex-mcp-launcher.cjs", "--workspace", "D:/GitRepo/MultiModal"]
```

命令目录由安装器读取实际 npm global prefix。上例路径需替换为本机安装器报告的目录。每个 MCP 连接绑定一个项目，多个项目分别注册。每次调用前重新核实该项目的唯一存活实例，同版本 VS Code 窗口正常重载后自动读取当前实例，不重试已经发送的写请求。同项目同时打开多个窗口时必须指定 --instance PID:STARTED_AT；显式实例或 discovery 文件绑定保持固定，不自动替换。插件升级改变运行版本后需重新连接 MCP 加载配套版本，业务请求在版本不符时拒绝发送。

在目标 VS Code 窗口的“运行环境准备”点击“管理 AI 项目授权”，或执行同名命令，选择 Worker 和允许的操作。授权保存于该窗口工作区状态。Worker 的主机、账号、端口或项目根发生变化后需要重新选择授权；可用同一入口撤销。MCP 只能查询授权，不能创建、扩大或恢复授权，Local API 也不暴露此界面命令。

服务器、隧道、Conda 和 GPU 配额全局共享，项目首次复用时提醒检查差异，提醒记录由各项目分别保存。同项目重载、在两个项目窗口间切换焦点不会反复弹出；当前窗口改为另一个项目时仍会提醒。通知提供“检查项目差异”和“已确认，此后不再通知”。确认选择按项目路径持久保存，即使通过另一个工作区打开同一项目也不再通知；关闭通知不等于确认。第一次升级时先打开已有服务器配置的项目，配置会自动导入共享存储。队列、结果、同步范围及授权保持项目作用域；`worker_configure` 修改全局共享值，因此需要本人批准实际修改。

本地已扫描到 PLAN 与接入配置时，不要求重新跑一遍旧引导来消除待识别提示。隧道连通不能证明当前项目的 Agent 已准备好；检测到端口连接了其他项目 Agent 时，横幅显示实际与预期项目路径，并提供“部署本项目 Agent”。需要两个项目同时在线时，先为它们配置独立端口；不自动切换、重启或迁移服务。

可运行 node scripts/mcp-codex-config.js <项目绝对路径> <simpleex-mcp-launcher.cjs绝对路径> <服务名> 生成 Codex TOML。生成器对普通具名工具逐项设置 approval_mode = approve，其他工具保留 prompt；不会直接修改用户的全局配置。参数来自当前 [OpenAI MCP 配置文档](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) 与 [配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)。插件宿主仍独立核对实际目标。永久删除与覆盖清理由原有路径审核页确认，MCP 只预览和接续已确认请求。

## 工具与完成状态

`tools/list` 返回当前 API 支持的具名工具和参数 schema。常用流程为 `project_status`、`project_authorization`、`plan_list`、`plan_preflight`、`plan_run`、`operation_list`、`task_list` 和 `result_collect`。Agent 操作使用精确 `serverIds`。SFTP 文件工具使用配置中的 Worker ID，主机、账号、远端根和本机工作区由宿主填入。

`plan_run` 的操作回执表示提交进度。用主动任务查询取得实际运行和完成证据。结果收集包含汇总写入，属于授权写操作。`project_state` 默认返回摘要，传入 `detail: full` 可以读取完整面板状态。长工具请求先返回 mcp- 操作 ID，通过 operation_get 取得完整结果；状态是工具请求的状态，不能用来证明训练完成。原生 PLAN 提交仍通过 operation_list 与 task_list 查询。完整结果仅保存在本窗口内存，持久记录只保存回执元数据，重载后不会伪装恢复原始指标。业务错误保留原 API 详情，不自动重试写操作。精确停止单个 job 用 task_stop，停止整张 PLAN 用 plan_stop。

`sftp_connection` 显示配套实例的实际连接错误和能力。SimpleSFTP 暂不可用时，SimpleExperiment 自身的查询工具仍可使用。

## 当前实现与验收进度

| 工作 | 状态 |
| --- | --- |
| 项目 MCP stdio、具名工具、宿主授权、Agent 与实验主入口 | 已实现，包含真实 stdio 的定向回归已通过 |
| 同窗口 SFTP 文件树、清单、上传、下载、Worker 间同步 | 0.5.491 已实测相对路径、嵌套文件、子目录查询、整项目上传及专用文件下载，内容和未选文件范围匹配；跨 Worker 等剩余入口未全部通过 |
| 全量 CLI 能力对应关系、GUI 依赖参数化 | 已建立映射；保留 UI 的交互入口不计为无人操作通过 |
| 全部静态及动态人工入口实点 | 进行中 |
| MultiModal 单 seed 与通用项目真实验收 | 两项目均已实际退出码 0；通用项目 MCP 收集导出通过，首次接入与面板结果仍未闭环，详见 manual-acceptance-checklist.md |
| Windows 试行打包、发布、安装与重载 | 0.5.492 最终回归、包验证及试行发布通过，已安装一次；配套 0.2.119 不变。等待本人重载两个窗口并重连 MCP；远端仍为 0.5.491，新版实机未完成 |

生成当前源码入口与 MCP 对应清单可运行 `node scripts/entry-coverage.js <SimpleSFTP源码根>`。清单中的 mapped 只表示路由存在，实点和实际业务效果需另外核实。未验证项目不记为通过。

独立文件清理使用 file_cleanup_preview → file_cleanup_review，由本人逐页核对完整节点与路径；file_cleanup_execute 只接续后端已存确认，MCP 无 confirm/pathConfirmed/secondConfirmation 入参。PLAN 的原审核页保持不变。

通用项目示例在 examples/mcp-dl-acceptance。日常入口与 CLI 对应矩阵在 windows-entry-coverage.json；当前记录只证明映射，未实测项保持未实测。

Windows 试行版为 [v0.5.491](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.491)，源码提交 1c6c28543eda5f3f85f6358165c3d885451aad45。simple-experiment-0.5.491.vsix 为 3069307 字节，SHA256 为 967a174d54ea64f6f484c9d714211cd5dcff4bfd0ff3505834a5f0036a723fcc。最终 322 项串行回归、实际 ZIP 的 326 个运行模块及两个 Python 运行组件字节/版本/哈希、秘密排除和 vm.Script 均通过。完整记录为 simple_cluster/reports/test-workflow/2026-11-11T11-39-45-090Z-11984-package/run.json，实际总耗时 817771 ms；编译同输入命中且无重新发射，组装复用该产物。首轮 8 个测试模拟配置缺项失败日志保留，定向修正及最终完整检查通过，未修改测试期限或放宽生产校验。

配套 [SimpleSFTP v0.2.119](https://github.com/zlinkw/SimpleSFTP/releases/tag/v0.2.119) 源码 e951233b65a21836e176896640312ebbf67f323b，包 242565 字节、SHA256 cc246074e21df6c2e8c117555eefbfcfae3a6b4c55dc6e9d2105940addf408f4。首轮 cleanupHandle 的 WSL 子进程超时原文保留；准备 WSL 后原用例在原时限内通过，后续未执行项全部补齐，组合覆盖 69 个文件、465 项通过。两个试行 Release 均逐 tag 核对提交与资产，远端重下载与本机包一致。真实 ReleaseClient 仍把旧版更新到正式 0.5.483 / 0.2.118，对 0.5.491 / 0.2.119 不降级。

0.5.491 和 0.2.119 已各安装一次且用户已重载两个窗口、重连 MCP。本轮确认两项目绑定及五类持续授权有效，通知“不再提醒”确认值保持为 true。rjj8 两项目的 Agent 与 Scheduler 已顺序升级并核对 0.5.491 和实际源码哈希；共享端口最终恢复 MultiModal Agent @24，Scheduler @9/@15 与已完成任务 @12/@16 均保留。未更新其他 Worker，未改写 MultiModal 历史结果。

0.5.492 修复 MCP 准备未启动隧道、无 GPU 遥测时服务器列表缺失、普通停止丢失任务记录、终态 PLAN 标签及自动 GPU 容量提示，并修正配置说明和版本核验等待通知。新增定向回归通过；已安装，尚待本人重载后实机复核。普通停止的首次实机失败、剩余界面入口、清理本人双确认及授权撤销验收保留在 manual-acceptance-checklist.md，不能据既有两个成功实验宣称完整接入或全入口通过。

0.5.492 最终打包记录为 simple_cluster/reports/test-workflow/2026-11-11T13-03-31-166Z-48492-package/run.json：322 个串行作业及 13 个门禁全部通过，输入指纹未变，总耗时 835749 ms。编译同输入命中、emitted=0，组装复用已验证产物。simple-experiment-0.5.492.vsix 为 3069809 字节，SHA256 为 3e3682da568706e1520dd4cdeb5aaa130d7a6e55bcc802458777e57205c8878a；实际 ZIP 的 326 个运行模块、runtime 版本和哈希、秘密排除、包内容规范及 vm.Script 均通过。本轮没有再次修改配套 0.2.119。

[v0.5.492 试行 Release](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.492) 与实际 tag 均绑定源码 f04f2dab99e25e5cf51b217448509f6d5f374f5e，draft=false、prerelease=true；VSIX 和精确同名 SHA256 清单均已上传，远端重新下载与本机字节一致。默认未登录 ReleaseClient 的真实检查遇到 GitHub HTTP 403 限流，返回等待至 2026-11-11T13:59:12Z，未改等待策略或伪记通过。使用现有 GitHub 登录凭据进行真实网络请求、交由同一 ReleaseClient 解析，确认 Latest 仍为 0.5.483 / 0.2.118，对 0.5.492 / 0.2.119 不降级；记录 simple_cluster/release-verification/0.5.492/client-check.json 明确标注认证传输，不能当作默认未登录连接已解除限流。

随后显式执行一次 npm run install:latest，退出码 0，code 扩展列表为 0.5.492 / 0.2.119，稳定 simpleex --help 返回成功。安装后停止 SimpleExperiment 面板/API 操作；等待本人 Developer: Reload Window 重载两个项目窗口并重连 MCP。远端已完成本轮授权升级的是 0.5.491，MultiModal Agent @24、Scheduler @9/@15、原任务 @12/@16 保留；没有直接向运行中的 0.5.491 宿主混入 0.5.492 runtime。重载后继续新修复实机复核和剩余入口，不提前记为通过。

## CLI 对应关系

0.5.492 已重载并完成真实准备：两项目分别经 MCP 建立隧道、升级 Agent/Scheduler，版本与来源哈希匹配，保留原任务和 Scheduler。配置说明、版本核验按钮及通用项目 CSV 打开已实点通过。实机发现的普通停止恢复后 unknown、运行父请求长期 running、ready 预检带 blocker 及命令注册缺陷，已在 0.5.493 修复并通过定向与最终规定回归，现场复验仍待完成。永久删除按本人决定暂不执行；授权撤销仍须本人操作安全设置，未记为通过。详见 manual-acceptance-checklist.md。

0.5.493 最终规定打包范围已通过：322 个串行作业、13 个门禁，输入未变；记录 simple_cluster/reports/test-workflow/2026-11-11T16-20-51-708Z-78620-package/run.json，825319 ms。编译同输入命中、emitted=0，组装消费同一产物。包 simple-experiment-0.5.493.vsix 为 3070455 字节，SHA256 7f3656adf080ec222d3277372b2c465e4c4b21aad0d10eb791166459b945392a；实际 ZIP 379 项、326 个运行模块、两个 Python 组件版本和哈希、秘密排除、包规范及 vm.Script 均通过。附加旧行数门禁的一项既存失败单独保留在验收清单，未算作通过；配套 0.2.119 不变。新版尚未安装，现场复验仍待完成。

| CLI 能力 | MCP 入口或保留方式 |
| --- | --- |
| project status、prepare、bootstrap、bootstrap-operation | project_status、project_prepare、project_bootstrap、project_bootstrap_operation |
| experiment 查询、摘要、树、健康、配置、日志、诊断 | 同名 experiment_* 具名工具；monitor 是单次查询，后续主动查询 |
| experiment run、batch、check、dry-run | plan_run、plan_matrix、plan_preflight；恢复提交传原 operationId |
| experiment stop | task_stop 精确单任务或 plan_stop 整张 PLAN，不能互相代替 |
| experiment retry、resume | 沿用所选 PLAN、checkpoint 与原审核流程；不提供绕开文件审核的原始 action 透传 |
| experiment pause、draft promote | 原接口不支持或已退役，MCP 不复活 |
| plan list、filter、validate、matrix、build | plan_* 具名工具，build 只返回 YAML；显式 seeds 保存在 PLAN |
| task dispatch、preflight、analyze | task_dispatch、task_preflight/start-status-cancel、task_analyze |
| result、metric、compare | result_*、metric_*、result_compare；JSON、CSV、Markdown、LaTeX 直接返回结构化内容 |
| artifact list、inspect、download | artifact_list、artifact_inspect；远端文件用绑定 Worker 的 sftp_download_paths，原始指标映射读取只入内存 |
| config、state、flow | configuration_*、state_*、flow_*；Worker 环境和 GPU 设置用 worker_configure；全局或底层 state 写入另需本人确认 |
| gpu、server、resource、tmux、panel diagnostics | gpu_status/history、server_list/test、resource_available、tmux_list/capture、panel_diagnostics |
| agents lifecycle | agent_* 由当前宿主解析项目和专用服务窗口；SFTP 底层 lifecycle 由同一宿主调用 |
| draft list、candidates、validate、review、reject | draft_*；草稿清理保留原精确路径审核 UI |
| PLAN cleanup 与独立文件 cleanup | cleanup_* 与 file_cleanup_*；确认阶段只在本机人工审核页执行 |
| sftp status、capabilities、server、config、target、transfers | sftp_*；修改全局 profile 或新目标需本人确认；server config-path 由 status 返回真实元数据 |
| sftp inventory、tree、stats、plan-logs、remote list-dirs | sftp_inventory/tree/tree_state/file_stats/plan_logs/remote_directories，全部绑定项目目录 |
| sftp upload、from-remote、download-paths、download-mapped | sftp_upload_files/upload_workspace/from_remote/download_paths/download_mapped，复用原传输业务 |
| sftp server-to-server、server-batch、fpsync、scope、handoff | sftp_worker_directory/worker_batch/worker_sync/download_scope/handoff |
| sftp project create | 现有 UI 创建或打开新工作区，再建立对应 MCP 连接并授权；当前连接不跨项目写入 |
| actions list、describe 与动态 UI action | action_catalog 提供真实宿主目录；已迁移的业务用具名工具，纯展示、Git 专项授权及未参数化交互保留 UI。safe 字段不是授权 |
| doctor | project_status、server_test、sftp_connection 的真实结果，不启动另一个 CLI 进程 |

GUI 与 MCP 共用业务入口；CLI 历史读取与交互入口保留。矩阵中“保留 UI”仍属于人工操作，不能计为 MCP 无人流程通过。
