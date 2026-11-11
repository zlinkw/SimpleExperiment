# Windows MCP 接入

MCP 连接指定项目的 VS Code 窗口，与面板和 CLI 使用同一 Local API、任务队列和结果来源。VS Code 需要打开目标项目并加载 SimpleExperiment。

## 启动与授权

安装支持 MCP 的 Windows 版本后，稳定入口为 `simpleex-mcp --workspace <项目绝对路径>`。在 Codex 中注册 stdio 服务，配置命令目录内的 Node 启动器，避免依赖不断变化的扩展版本目录。

```toml
[mcp_servers.multimodal]
command = "node"
args = ["C:/Users/ZLK/AppData/Roaming/npm/simpleex-mcp-launcher.cjs", "--workspace", "D:/GitRepo/MultiModal"]
```

命令目录由安装器读取实际 npm global prefix。上例路径需替换为本机安装器报告的目录。每个 MCP 连接固定一个窗口实例，多个项目分别注册。同项目打开多个窗口时可再传 --instance PID:STARTED_AT；实例身份不一致会拒绝路由。连接仍会核对运行版本、工作区和实例身份。

在目标 VS Code 窗口执行 `SimpleExperiment：管理 AI 项目授权`，选择 Worker 和允许的操作。授权保存于该窗口工作区状态。Worker 的主机、账号、端口或项目根发生变化后需要重新选择授权；可用同一命令撤销。MCP 只能查询授权，不能创建、扩大或恢复授权。

服务器、隧道、Conda 和 GPU 配额全局共享，项目切换只提醒检查差异。第一次升级时先打开已有服务器配置的项目，配置会自动导入共享存储。队列、结果、同步范围及授权保持项目作用域；`worker_configure` 修改全局共享值，因此需要本人批准实际修改。

可运行 node scripts/mcp-codex-config.js <项目绝对路径> <simpleex-mcp-launcher.cjs绝对路径> <服务名> 生成 Codex TOML。生成器对普通具名工具逐项设置 approval_mode = approve，其他工具保留 prompt；不会直接修改用户的全局配置。参数来自当前 [OpenAI MCP 配置文档](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) 与 [配置参考](https://learn.chatgpt.com/docs/config-file/config-reference)。插件宿主仍独立核对实际目标。永久删除与覆盖清理由原有路径审核页确认，MCP 只预览和接续已确认请求。

## 工具与完成状态

`tools/list` 返回当前 API 支持的具名工具和参数 schema。常用流程为 `project_status`、`project_authorization`、`plan_list`、`plan_preflight`、`plan_run`、`operation_list`、`task_list` 和 `result_collect`。Agent 操作使用精确 `serverIds`。SFTP 文件工具使用配置中的 Worker ID，主机、账号、远端根和本机工作区由宿主填入。

`plan_run` 的操作回执表示提交进度。用主动任务查询取得实际运行和完成证据。结果收集包含汇总写入，属于授权写操作。`project_state` 默认返回摘要，传入 `detail: full` 可以读取完整面板状态。长工具请求先返回 mcp- 操作 ID，通过 operation_get 取得完整结果；状态是工具请求的状态，不能用来证明训练完成。原生 PLAN 提交仍通过 operation_list 与 task_list 查询。完整结果仅保存在本窗口内存，持久记录只保存回执元数据，重载后不会伪装恢复原始指标。业务错误保留原 API 详情，不自动重试写操作。精确停止单个 job 用 task_stop，停止整张 PLAN 用 plan_stop。

`sftp_connection` 显示配套实例的实际连接错误和能力。SimpleSFTP 暂不可用时，SimpleExperiment 自身的查询工具仍可使用。

## 当前实现与验收进度

| 工作 | 状态 |
| --- | --- |
| 项目 MCP stdio、具名工具、宿主授权、Agent 与实验主入口 | 已实现，包含真实 stdio 的定向回归已通过 |
| 同窗口 SFTP 文件树、清单、上传、下载、Worker 间同步 | 已接入，真实调用待验证 |
| 全量 CLI 能力对应关系、GUI 依赖参数化 | 已建立映射；保留 UI 的交互入口不计为无人操作通过 |
| 全部静态及动态人工入口实点 | 进行中 |
| MultiModal 单 seed 与通用项目真实验收 | 待执行 |
| Windows 试行打包、发布、安装与重载 | 0.5.486 已通过 322 项回归并发布、安装一次；等待本人重载及项目授权 |

生成当前源码入口与 MCP 对应清单可运行 `node scripts/entry-coverage.js <SimpleSFTP源码根>`。清单中的 mapped 只表示路由存在，实点和实际业务效果需另外核实。未验证项目不记为通过。

独立文件清理使用 file_cleanup_preview → file_cleanup_review，由本人逐页核对完整节点与路径；file_cleanup_execute 只接续后端已存确认，MCP 无 confirm/pathConfirmed/secondConfirmation 入参。PLAN 的原审核页保持不变。

通用项目示例在 examples/mcp-dl-acceptance。日常入口与 CLI 对应矩阵在 windows-entry-coverage.json；当前记录只证明映射，未实测项保持未实测。

Windows 试行版为 [v0.5.486](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.486)，源码提交 033a914dbe3d773eb5c6e794652bce6249e84d16。实际发布和安装的 simple-experiment-0.5.486.vsix 为 3064882 字节，SHA256 为 c81ee022a6d1c1fdb24f56bee4f7587da738426c3e1bb1616481d3159cc6a015。远端重新下载核对一致。真实更新客户端确认旧版只看到 0.5.483，已安装 0.5.486 不降级。远端 Agent 当前仍为 0.5.485，尚未升级或启动验收训练。

## CLI 对应关系

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
