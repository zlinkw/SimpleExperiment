# Windows 日常点击验收

本轮以 Windows 0.5.485 为初始实点基线。两个项目已在 0.5.493 重载，项目绑定、持续授权和通知持久确认保持有效。两个单 seed 实验已有退出码 0 的结果；rjj8 两项目的 Agent 与 Scheduler 已顺序升级至 0.5.493，原任务和 Scheduler 保留。0.5.494 的接入检查、取消 PLAN 显示和手动隧道命令修复已完成定向与完整打包检查；发行、安装及新版实机复验待完成。整体入口验收仍未通过。界面保持侧栏，只验正常条件。本人暂不执行永久删除；不继续该文件的确认或执行。

## 0.5.494 当前修复

- 静态检查接受显式 declared 协议及通用 runner.outputs 列表，复用 PlanBuilder 的命令与结果声明解析；通用命令格式不强制旧的 suite/config/seeds 与固定 CSV、日志文件名。旧格式检查保留，真实完成仍由退出码和 artifact manifest 判断。覆盖普通命令、块列表、行内 runner、缺失结果、配置文件与既有路径检查；25 项静态检查回归通过。
- 主动取消单独统计为已中止，不计失败；取消作业的 unverified 结果和已移除任务窗口不再生成误导的待核实或丢窗提示。宿主汇总、面板投影、PLAN 选择器、任务卡和总计的相关回归通过。初步 build 的 272 项作业通过；该记录早于最终版本与静态检查收尾，不能代替最终 package 记录。
- 命令面板“检测全部隧道”实点后健康时间与状态更新，但没有手动检测进度和通知。工厂绑定遗漏旧入口的 testTunnel(true)，本轮同时恢复两个手动检测命令的标记；新增行为回归先失败后通过。README 补齐已有高级命令显示开关，保留原文档及原断言。新修复尚待最终打包及实点。
- 首份 0.5.494 package 的 322 作业、13 gate 全部通过，耗时 820280 ms，记录为 simple_cluster/reports/test-workflow/2026-11-11T17-23-16-168Z-60936-package/run.json。打包期间发现上述命令缺陷，候选未安装、未发布；最终包需重新完成规定检查。
- 最终 0.5.494 package 已通过 322 作业、13 gate，输入前后一致、串行最大并发 1、总耗时 823959 ms，记录 simple_cluster/reports/test-workflow/2026-11-11T17-40-36-511Z-17008-package/run.json。最终 VSIX 为 3071291 字节，SHA256 87a9f01fde3ba97fc080e0843ea5a1fb864c1f55fe6326f9c308981beaa30109；379 归档项、326 runtime 模块的字节闭包、版本、平台、包策略和秘密排除通过。源 README 缺少已有高级命令开关说明的额外检查先失败，补齐说明后 2 项通过；原断言未改。
- 0.5.493 实点新增：命令面板复制 Panel 诊断后剪贴板为合法 JSON，39774 字符；诊断区两个静态报告按钮分别打开原报告、复制 26501 字符。导航搜索“诊断”与定位可用；刷新按钮审计显示已缓存，当前 DOM 为 187 按钮、65 命令，该快照不等于全部入口验收。
- 0.5.493 命令“恢复 Panel”实点后重新显示当前项目及所选 PLAN；MCP panel_diagnostics 为 ready、rendererNeedsReset=false、sectionFailures=[]、lastFailure=null。“手动快照”反馈已查询 1/1 台 Worker、69 个任务、核对 0 项原操作。为验高级命令临时打开显示设置，最终复验后恢复原 false。
- 原静态报告 21 个错误的首次实机证据保留于 simple_cluster/reports/check-static-0.5.492-original-failure.md。当前两个取消任务仍使用原 commandId，不重跑，不改写 MultiModal 结果；其余未实点、授权撤销和用户暂缓删除的状态保留。
- 新版界面启停使用独立 normal_stop_ui_0_5_494.yaml，seed 42、原软件控制脚本及专用输出 work_dirs/mcp_controls/normal_stop_ui_0_5_494。当前仅完成本机创建与面板选择；MCP state 核对选中路径一致，尚未提交。下一批 MCP 返回结构需按工具细化：当前 Server.ts 仅给所有工具同一宽泛 outputSchema，不能记作每工具返回契约已完成。

## 记录规则

入口清单由 scripts/entry-coverage.js 从当前 package、面板和两插件 API 生成，保存在 [windows-entry-coverage.json](windows-entry-coverage.json)。静态清单不包括所有动态菜单，必须用真实面板补充。每个入口分别记录实点通过、发现缺陷、未实测或已退役。只打开审核页记为预览通过。源码可达、自动回归和 API 成功均不能冒充人工点击。

当前源码盘点为 42 个 VS Code 命令（包括新增授权命令）和 174 处静态按钮声明。两者不可相加作为去重分母；动态行和上下文菜单还未完整盘点。当前尚未获得全覆盖结论。

当前按具体静态声明绑定了 13 处实点记录：12 处通过、1 处仅预览；其余 161 处仍未实测。42 个命令面板入口尚未全部核验，不能把同业务按钮或 MCP 的通过转记为命令面板通过。动态控件盘点未结束，不计算整体覆盖率；默认隐藏的高级命令须在启用对应设置后单独验收。

0.5.485 运行中宿主的实际目录为 58 个 API 方法、191 个动作，已保存在入口清单的 liveBaseline。动作目录和 safe 字段都不能证明按钮已点击或具有写入授权。0.5.490 完整 322 项串行回归通过，不能替代剩余实点。原始记录为 simple_cluster/reports/test-workflow/2026-11-11T10-15-41-498Z-38512-package/run.json，退出码 0，总耗时 847421 ms。

## 实点与效果

| 操作 | 状态 | 已观察结果 |
| --- | --- | --- |
| 聚焦 SimpleExperiment 视图 | 实点通过 | MultiModal 面板加载，显示当前项目与 12 个原有 PLAN |
| 最大化辅助侧栏、计划导航 | 实点通过 | 面板可扩展，导航定位到计划区 |
| 当前 PLAN 下拉选择 image_only | 实点通过 | UI 与宿主 selection、planFileInput 都为 experiments/plans/comparison/image_only.yaml |
| PLAN 搜索与切换独立验收 PLAN | 实点通过 | 搜索后保留原选择，切换后页面与操作记录均指向 windows_mcp_20261111.yaml |
| 独立验收 PLAN 校验与预演 | 实点通过 | rjj8 返回实际校验、预演终态；任务数 1；未启动训练 |
| 低流量开关 | 实点通过 | 0.5.491 从开切换到关，宿主 effective=false；再恢复开，宿主 effective=true，无保存错误 |
| 仅校验后的 PLAN 状态 | 发现缺陷，已修复源码 | 本机准备回执被算作已运行，出现部分完成 0/1；修复后不把准备回执计入任务运行证据，定向回归通过 |
| 零台 Worker 的服务器设置 | 已配置状态预览通过；零台状态仅回归 | 0.5.486 实际页面没有添加按钮；现将手动添加和 Xshell 导入固定放在 Worker 设置顶部，零台、全禁用及已配置状态的渲染回归通过，待剩余实点 |
| 全局共享服务器与项目切换提醒 | 已实现，待实机 | 新项目读取同一连接、环境与配额；旧项目不覆盖后续共享修改；项目队列、API 身份及授权保持独立，定向回归通过 |
| 管理 AI 项目授权 | 发现缺陷，已修复源码 | 0.5.487 工厂启动遗漏命令注册，实机命令 not found；0.5.488 补齐工厂绑定及运行环境准备按钮，实际注册链回归通过，待剩余实点 |
| 0.5.488 授权保存和共享服务器 | 本人完成授权，读取及界面通过 | 两项目实际运行 0.5.488，均保存 rjj8 的 experiment/sync/agents/configuration/results 授权，项目根分别匹配；通用项目实际界面可见授权按钮及保存通知。未由 AI 代选授权项 |
| 共享服务器提醒重复触发 | 发现缺陷，已修复源码 | 0.5.488 两个窗口切换焦点相互改写全局上一个项目，实际重复弹出通知；0.5.489 改为项目独立提醒记录，交替焦点及同项目重载回归通过，待剩余实点 |
| MCP 连接跨窗口正常重载 | 发现缺陷，已修复源码 | 旧原生 MCP 连接固定了启动时实例，两个项目查询均返回 HTTP 401；重新建立官方 SDK stdio 连接可正确读取各项目与授权。0.5.489 在每次调用前重新核实工作区唯一实例；显式绑定、歧义拒绝及版本门禁回归通过，待长期连接实机复核 |
| 项目识别与隧道提示 | 发现缺陷，已修复源码 | 0.5.487 通用项目已有 PLAN/接入配置且隧道 TCP 已通，仍依赖旧引导标记；当前 Agent 实际属于 MultiModal。0.5.488 分开本地识别与 Agent 项目归属，明确实际/预期路径，不把端口连通当作本项目就绪；待剩余实点 |
| 顶部总览与当前 PLAN 状态 | 发现缺陷，已修复源码 | 0.5.488 实际界面及只读 API 确认：校验/预演的本机进度记录 type 为 run-plan、localSubmissionProgress 为 true，当前任务数为 0。顶部未排除该标记，误报调度已完成；0.5.489 与下拉框采用同一排除条件，不改写历史记录，待剩余实点 |
| 0.5.489 顶部预演与面板提交 | 实点通过 | 预演后显示可提交；从当前 PLAN 按钮提交独立验收文件，未把准备回执计为完成 |
| 原生 MCP 与 CLI 指定项目查询 | 实际调用通过 | 两个 MCP 状态分别为正确工作区和 0.5.489；MultiModal 同一 commandId 的 MCP 与 CLI 均查询到真实运行状态 |
| 项目归属识别 | 实际调用通过 | 通用项目连接 MultiModal Agent 时明确返回 agent_project_mismatch，未当作本项目就绪 |
| Agent 运维与科研任务隔离 | 实际调用通过 | 仅关闭对应项目的指定 Agent 窗口；MultiModal 任务窗口 @12 和 Scheduler @9 保留，任务随后成功完成 |
| 通用项目仅 MCP 运行与导出 | 部分通过 | 准备、预检、启动、主动查询、收集及 CSV 导出均经 MCP；退出码 0、manifest 完整、日志检查 clear，completionState=verified。首次准备及同步配置需修正，不能计为首次接入流程通过 |
| 通用项目面板结果 | 实点未闭环 | 当前 PLAN 显示 1/1 完成；资源树搜索与结果导航、更新结果按钮已点，结果区显示 1 个 PLAN 未识别数据集，尚未完成从面板打开相同指标行 |
| 通知明确确认 | 实点与重载持久性通过 | 0.5.490 已选择确认项；0.5.491 重载两个窗口后，两项目确认值仍为 true。关闭通知不代替确认，未改写授权 |
| 其余命令、按钮、动态菜单和行内动作 | 未实测 | 按当前清单逐项继续，不记通过 |

## 0.5.491 本轮实机复核

- 两个原生 MCP 状态分别返回正确工作区和 0.5.491；两项目 rjj8 授权的目标与五类权限未变。SimpleSFTP 同窗口连接均可用。
- MultiModal Agent 从 @19 升级到 @20，主动检查为 0.5.491，Scheduler @9 为同版且源哈希匹配；随后精确停止 @20，通用项目部署为 @21，Scheduler @15 为同版。通用项目复核结束后精确停止 @21，恢复 MultiModal 为 @23，并用 MCP restart 验证仅关闭 @23、建立 @24，Scheduler @9 不变。最终共享端口服务 MultiModal；原有 @12、@16 均保留，退出码 0，没有更新其他服务器。
- 面板“启动全部隧道”已实点并核对实际 rjj8 配置，确认后后台建立 localhost:18770 → localhost:18765，健康检查通过。首次 MCP project_prepare 已成功升级 Agent，却因未启动隧道而最终失败；0.5.492 补齐该工具的启动连接参数，CLI 原默认保持。
- 通用项目 configuration_set 的 workspaceFolder 写入和随后 configuration_get 返回相同范围。相对路径上传 config.yaml、experiments/simple_project.yaml 保留目录层级，实际目标查询匹配；整项目上传在本项目准备完成后成功，5 文件、6138 字节、删除 0 文件。另一项目 Agent 占用端口时的保护拒绝保留，未绕过映射校验。
- 两项目 log_read 使用原 commandId 均返回实际日志；MultiModal 按返回的 offset 续读无重复内容。已确认完成记录仍保留原 verifiedAt，未因重载或本轮远端摘要未核实而降级。
- 面板展开完成历史中的 windows_mcp_20261111.yaml，显示成功 1/1、退出码 0、产物完整及原确证时间 2026-11-11T10:28:00.155Z。点击该 job 的“查看窗口日志”后选中 rjj8/GPU 1 的实际任务标签；在低流量开启状态手动刷新，显示 commandId bc9df623805ca30d675854c0044f4bd2 的 train/test 与 Pane is dead (status 0)。MCP tmux_capture 精确读取 @12，返回同一 commandId 和退出码；未触发任务或重建结果表。
- 通用项目专用 acceptance_files/transfer_20261111.txt（47 字节）经 MCP 上传后，将本机内容改为 local-v2，再经 sftp_download_paths 下载恢复远端 remote-v1，逐字节比较一致。上传操作 mcp-90b58077-ba30-4d3a-af3e-8bc199faac82、下载操作 mcp-9150e1f1-557d-41cb-a6c2-a335980843b7 均成功。主动 file_stats 确认远端仅存在所选 transfer 文件，未选择的 cleanup_20261111.txt 不存在于远端且本机仍为 49 字节；没有执行删除。
- 通用项目主动收集仍为原结果 ID result-3a0cfd3b0ddd0260f42c7a2d2331615dc9bac95b2974dcbf94942a7df1a938c4，导出继续走内存；没有改写 MultiModal 历史结果。
- 手动添加服务器按钮可见，点击后出现包含“新增 Worker”和现有服务器的列表；退出后未新增服务器。该项为预览通过，不记作新服务器保存成功。
- 低流量开关实际切换关、再恢复开，主动状态均匹配且无错误。配置说明实际打开 GitHub 的配置文档，但已接入项目仍被要求识别工作区，等待通知选择后误报 stalled。Agent 版本按钮也在首条纯信息通知处等待关闭，未及时完成。0.5.492 对已识别项目跳过接入向导，版本检查只在末尾提示且不等待纯信息通知；需要本人选择的向导或部署提示不再受前端 45 秒完成判定。两条新增行为回归先失败后通过，原向导和按钮状态回归通过；新版实点待重载。
- 通用项目 draft_list 返回草稿未启用、gpu_history 返回 idle、flow_get 返回实际步骤，诊断显示 ready 且无 sectionFailures；没有把空数据记为完整功能验收。artifact_list 用 PLAN 返回现有结果目录，artifact_inspect 使用返回的精确 ID 成功；首次误用 commandId 的查询失败原文保留，不据空 size/hash 声称完成逐文件校验。
- 停止验收使用独立 normal_stop_20261111 PLAN、seed 42、仅软件控制脚本；命令 53f2db23f7f783a65d8ea3d33fa8d38c 实际运行，经 task_stop 关闭精确窗口，服务主动观察确认取消，原任务与两个 Scheduler 保留。但随后任务记录被后台按清除路径移除，按原 ID 查询失败。0.5.492 将普通停止记录保留为取消终态，显式停止并清除入口继续按原行为移除；定向原型链回归通过，新版实机待重载。
- 另修复 server_list 在 GPU 遥测未取得时只返回 local、完成 PLAN 顶部仍标“排队中”、自动 GPU 配额被误报成未配置 Worker。均已获得失败回归并修复；最终打包和新版实点尚待完成。
- 实际服务器只读执行配套目录契约：尚不存在的授权项目子目录可被接受且没有创建；这是目录边界复核，不等同第三个全新工作区的完整首次接入。
- 通用项目窗口最小化，自动还原连续返回 user input was detected；已请本人还原，结果表打开、其余界面实点不记通过。
- 只为永久删除准备本机专用测试文件 D:/GitRepo/SimpleMcpAcceptance/acceptance_files/cleanup_20261111.txt（49 字节），审核页已打开。最后主动查询确认次数仍为 0、文件仍存在；该预览已过有效期，继续验收时需重新生成预览并由本人完成两页确认，当前没有执行删除。授权撤销后的真实写入拒绝仍需本人操作授权界面后验证，AI 不改授权状态。

## 0.5.492 重载后的实机复核

- 两项目状态返回各自正确根目录和 0.5.492。MultiModal 的 project_prepare 自动建立配置隧道并成功，将 Agent 更新为 @25；精确停止该辅助窗口后，通用项目 project_prepare 成功，Agent 为 @26。Scheduler @9、@15 均为 0.5.492，来源哈希匹配；原任务 @12、@16 保留。两次准备没有普通人工确认。
- MultiModal 实点“校验 Agent 版本”，通知显示插件、Agent、Scheduler 均为 0.5.492 且 SHA256 匹配；通知仍可见时按钮已恢复。实点“配置说明”，浏览器打开 v0.5.492 配置文档，返回面板没有再次要求识别工作区。已完成 PLAN 顶部显示“已完成”；通用项目静态容量正确显示已配置 1 台 Worker。无 GPU 遥测时 server_list 仍返回在线 rjj8。
- 通用项目从结果总表实点 CSV，编辑区打开 experiments/results/_unassigned/final/final.csv。该行 commandId 为 78e8aab0f09dcad43c5fe305b826d3f4，accuracy_mean=0.953125、loss_mean=0.10787482559680939，与 MCP 原结果一致。缺少数据集元数据的提醒保留，没有虚构数据集或重跑实验。
- 新软件控制 PLAN normal_stop_0_5_492.yaml 使用原控制脚本和 seed 42，独立输出目录；实际 commandId b54246b8cb31eabd2109a02f39e91f9e 在 rjj8/GPU 0 运行，经 task_stop 关闭精确窗口，主动回执 paneClosed=true、cacheRetired=true。记录保留，但后续变成 unknown：取消证明已持久保存，恢复路径却没有恢复取消状态。0.5.493 使用精确身份的既有取消证明恢复终态，不重派任务；落盘、陈旧投影与身份错配回归先失败后通过。
- 同次预检 ready=true 却带 VALIDATION_REQUIRED；workflow-run 父请求因同项目操作字典替换而长期 running，精确 plan-submit 子请求实际已经 succeeded。0.5.493 区分请求处理与实验完成，按工作区代次及原子请求 ID 结算，并在共享读取时归并历史父请求；不以回执证明实验完成。三项新增工作流回归先失败后通过。完整打包及新版实机复核尚待完成。
- 命令面板实际执行“打开面板”成功。默认 showAdvancedCommands=false 时“显示隧道端点清单”没有出现在命令匹配中，属于条件隐藏，未把它记作命令执行失败或通过。未操作授权撤销界面；永久删除按本人回复暂不执行，专用文件保留。
- 命令面板“查看备份状态”返回本验收仓库、远程未配置、自动备份未启用，没有写入 hook。“检查配套插件更新”遇到真实 GitHub 限流，界面明确显示等待至 2026-11-11T16:10:16Z，旧结果不作为新结果；未记更新成功。“打开配置说明”实际打开 v0.5.492 文档。
- 命令面板“校验 Agent 版本”复现缺少 HostOperationLease；同业务面板按钮正常。工厂错误地查找并不存在的模块级 withHostOperationLease，未接到当前 Provider 的方法。其他标记为需要租约的命令也受同一注册链影响；待当前冻结回归完成后，将以实际 Provider 租约接入修复并补执行回归，不取消跨窗口互斥。
- 命令面板“查看操作完整日志”实点返回 command not found；工厂缺少该入口与“一键打开 Xshell”的声明/绑定，而旧激活入口仍有注册。两项纳入同一注册链修复，保留旧入口；Xshell 尚未实点，不据源码结论记作现场通过。
- 首个 0.5.493 冻结候选的完整 322 作业、13 门禁通过，原始记录 simple_cluster/reports/test-workflow/2026-11-11T16-03-58-662Z-21996-package/run.json，860050 ms，输入未变；尚未发布或安装。随后加入命令工厂修复：Provider 绑定既有租约方法、补两个遗漏入口；workflowPanelNavigation 的两个新增执行回归先失败后通过，包含所有需租约描述项转发、参数与 this 绑定、缺失和冲突拒绝。
- 额外运行 test/factories_integration.test.js 为 7 通过、1 失败，完整日志 simple_cluster/after-factory-0.5.493.log。失败是旧行数门禁：CacheCleanupPanel.ts 479 行、PlanCleanupHost.ts 470 行、ResultCollectionHost.ts 451 行，三文件与 HEAD 一致，不在本轮修改范围；保留失败与原门禁，不为此重构或放宽断言。此附加全工厂旧门禁不在既有 package 规定范围中；本轮相关工厂行为与完整打包检查分别记录，不把它计为全部通过。
- 通用项目设置页可见手动添加与 Xshell 导入按钮，无遮挡。按原值实点保存共享前缀/默认环境、全局调度策略及 rjj8 服务器，重新读取值一致；调度和服务器原生保存通知正常，rjj8 的 SSH/隧道、Conda、项目父目录及所有其他 Worker 配置未变。面板计算的代码与 Agent runtime 路径均属于 SimpleMcpAcceptance，没有自动准备服务或启动实验。此项只证明现有值保存，不代替新增服务器完整接入。
- 高级命令开关经 VS Code 设置临时打开后，端点清单命令实际打开 JSON，包含 rjj8 和实际 18770 端口，没有 Hub Agent；隧道状态命令打开当前项目的 JSON 状态。验收后已实点恢复开关为 false，API 回读一致，未改授权。
- 命令面板“检查项目接入”实际生成报告并通知 failed（3 个 PLAN）。原始报告位于验收项目 simple_cluster/check_reports/check-static-latest.md，2026-11-11T16:35:13.743Z，21 errors、7 warnings、2 infos。检查器仍强制旧模板的 metrics_summary/metrics_case、双日志、大表追加及固定 test --result-csv 接口，将已被当前正式预检接受、退出码 0 且 manifest 完整的普通训练项目判错。这是下一批通用性修复项，不改通用训练代码迁就检查器；不把该入口记为业务通过，也不覆盖首次失败报告。0.5.493 已冻结，不为这个新发现改写其已完成打包证据。

## 0.5.493 实机复验

- 源码 3a1c79e918ce30a50f5fa98f51ccd4184e4e9f06 已普通推送并 fetch 核对主线一致。试行 v0.5.493 的真实 tag 绑定该提交、prerelease=true/draft=false；VSIX 3070455 字节、SHA256 7f3656adf080ec222d3277372b2c465e4c4b21aad0d10eb791166459b945392a，远端重下载与本机一致。直接读取曾遇到真实 GitHub EOF/ECONNRESET；使用现有 Windows 系统代理 127.0.0.1:7897 后读取成功，未改系统设置。实际原生 ReleaseClient 在该进程代理环境下检查为 up_to_date；另以同一解析器、真实认证网络传输确认正式 Latest 仍为 0.5.483/0.2.118，试行 0.5.493/0.2.119 不降级。原始检查位于 simple_cluster/release-verification/0.5.493。
- 显式 install:latest 一次成功，已安装版本与 CLI 核对为 0.5.493/0.2.119；随后通过普通 VS Code Reload Window 重载两个项目，保留 MultiModal 已修改文档。新官方 SDK stdio MCP 分别返回正确项目根、0.5.493、PID 7344/53456。Codex 旧原生 MCP 连接仍为 0.5.492，按门禁拒绝版本不符且未发送业务请求；该连接需本人在 Codex 重连，AI 未操作 Codex UI。
- 通用项目 project_prepare 请求 mcp-2c88c159-7787-4152-8763-b4901b884aca 成功；Agent @29 和 Scheduler @15 实测 0.5.493、来源哈希匹配。命令面板版本核验实际通知 0.5.493 和两个 sha256 ok，没有缺少租约错误；操作完整日志命令实际打开 SimpleExperiment 操作日志输出频道。两个修复命令实点通过。
- 旧 commandId b54246b8cb31eabd2109a02f39e91f9e 重载后仍为 cancelled；原运行父请求 workflow-run-1794411835137-lc9vcv 主动查询为 succeeded，绑定原精确子请求，receiptProvesExperimentCompletion=false。原通用成功任务 78e8aab0f09dcad43c5fe305b826d3f4 仍 completed。
- 新 normal_stop_0_5_493.yaml 沿用软件控制脚本、seed 42、专用输出。预检 mcp-d0da6dbe-ceba-4e6a-a271-7f0105721d1b 返回 ready=true/blocker=null；父请求 workflow-run-1794415655426-zpz5wo 已真实结算 succeeded。workflow distributed-plan-1794415663332-cq34v8、commandId 5e436d7c18a271d95e8ab7129d356b7d 实际在 rjj8/GPU 0、窗口 @30 运行，task_stop 请求 mcp-a225f228-536d-41ad-a73f-6829001497fe 成功，主动 exact_window_observation 确认 paneClosed=true/cacheRetired=true。后续主动查询新旧两条均 cancelled，原成功任务和日志产物保留。
- 新发现的界面余项：停止后任务 API 正确，但 PLAN 下拉将旧取消记录标失败、新记录仍标准备提交中；两张运行卡优先显示“远端未发现执行窗口”，而非“已中止”。与旧接入检查误判一起纳入下一批展示/检查修复，不把 0.5.493 当作所有界面已完成验收。API 的真实任务终态与请求终态复验已通过。
- 通用项目结束后精确关闭 Agent @29，MultiModal 准备请求 mcp-3a1b827c-a4b9-4441-bda2-df3cd90b09f9 成功，Agent @31、Scheduler @9 实测 0.5.493、两个来源哈希匹配。当前共享端口恢复 MultiModal。实际 tmux 列表仍有 @12/@16 原任务与 @9/@15 两个 Scheduler，@29/@30 已消失；未清除队列、日志或产物，专用删除文件仍为 49 字节。普通通知确认未重复弹出；未修改安全授权。

## 后续验收范围

| 区域 | 最终效果 |
| --- | --- |
| 打开与导航 | 所选项目、Worker、PLAN、任务随跳转正确传递；搜索、卡片与菜单分别实点 |
| 项目与服务器 | 设置重新打开值一致；准备后主动查询端点与运行版本 |
| 同步与文件 | 专用样例的已勾选与未勾选范围、源和目标内容一致 |
| PLAN 与运行 | 单独验收 PLAN 的预检、启动、排队、派发；短任务验证精确停止 |
| GPU、日志、结果 | 对应 Worker 与精确窗口；退出码、声明产物、指标及导出值一致 |
| 设置与维护 | 诊断、草稿、缓存、更新与 Git 专用验收对象；清理保留完整路径双确认 |
| MCP 授权 | 普通流程一次授权后继续；撤销后下一次写入拒绝；新目标单独确认 |
| 双窗口 | CLI、MCP、面板分别命中指定项目；拒绝其他窗口的身份 |

## 实验边界

MultiModal 的独立验收 PLAN 为 experiments/plans/acceptance/windows_mcp_20261111.yaml，image_only_bus_p100、seed 42、原有 7 项声明产物。首次 commandId 9d807fcc01babe7fce717eb5528897a7 退出码 1：旧验收输出根不满足消费项目自身 quality_paths 规则；失败日志与产物保留。仅将 PLAN 输出改为 work_dirs/quality_composition/all_low_quality_class_joint/plugin_acceptance/20261111/image_only，全部配置检查通过，提交 0ce22674881a1797cacc872005716ef0dae78f7d 已推送。

修正后 workflow distributed-plan-1794392521604-swd6l3、commandId bc9df623805ca30d675854c0044f4bd2 在 rjj8/GPU 1 完成，退出码 0、completionState=verified，日志包含真实 train/test 结束记录。7 个声明文件逐项存在，quality_evaluation_complete.json 的 status=complete。精确 PLAN 结果查询返回 10 条指标记录，exported=false，未发布或重写历史论文结果。本批原始指标只有 roc_auc、f1_score、accuracy、auprc、ece；AP、macro_f1、weighted_f1 没有实际输入，本批不能证明其真实实验别名效果。

通用项目位于 D:/GitRepo/SimpleMcpAcceptance，来自 examples/mcp-dl-acceptance，普通 PyTorch 入口、seed 42，不依赖 MultiModal adapter，训练代码未修改。明确设置项目代码同步范围 train.py、config.yaml、experiments 后预检通过。workflow distributed-plan-1794392812546-3c0hdy、commandId 78e8aab0f09dcad43c5fe305b826d3f4 退出码 0，模型与指标 manifest 完整，后续日志主动核验 clear，completionState=verified。MCP 导出 result-3a0cfd3b0ddd0260f42c7a2d2331615dc9bac95b2974dcbf94942a7df1a938c4，与该任务指标一致；导出在内存返回，未另存原始指标副本。

## 实机发现与本轮修复状态

最终 0.5.491 完整打包检查已通过：322 项串行作业全部通过，记录 simple_cluster/reports/test-workflow/2026-11-11T11-39-45-090Z-11984-package/run.json；包内容与远端试行资产核验通过。0.5.491 与配套 SimpleSFTP 0.2.119 均已安装一次；新修复仍需本人重载两个窗口并重连 MCP 后实机复核，本页待实测项保持原状态。

0.5.491 首轮完整回归的 322 个作业中，8 个测试文件因模拟配置缺少 inspect 或 ConfigurationSettings 模块绑定失败；首次完整日志保留于 simple_cluster/reports/test-workflow/2026-11-11T11-25-28-974Z-48436-package。仅补齐原测试输入与真实模块，不改断言、超时或生产判断；8 个定向修正回归全部通过。既有 package:assemble 门禁只接收单份完整通过记录，本轮沿用门禁重新运行最终打包，不修改旧失败记录或绕过组装校验。

- 本轮源码修复（配套 SimpleSFTP 0.2.119）：project_prepare 首次面对不存在的项目远端根时先 inspect，返回 AGENT_LIFECYCLE_FAILED/No such file or directory。原来只能先上传创建根再准备；现已允许只读 inspect 不存在的合法项目根，不创建目录，后续正常上传创建。嵌入与配套控制脚本一致，真实 tmux 定向回归通过；新版本实机仍待重载。
- sftp_upload_files 的项目相对路径返回“本地文件不存在”；绝对路径上传成功，但 experiments 下两文件被平铺到远端根。sftp_upload_workspace 在默认根范围返回 MACHINE_STATE_PATH_PROTECTED；sftp_remote_directories 查询 experiments 子目录因请求路径与 server.remotePath 不同被拒。本轮保留路径层级、生成已选范围 manifest 并关闭删除，子目录绑定与请求一致；定向回归通过，新版本实机待重载。未自动清理误放的验收文件。
- configuration_set 的 workspaceFolder 写入缺少资源 URI；workspace 写入实际成功，但回执及 configuration_get 仍返回空数组，不能反映保存值。空同步范围曾产生空 manifest，code-sync-proof-1794392704048-2g5513 登记结果未知；明确项目范围后新预检成功。本轮配置读写均绑定工作区资源并重新读取保存值；区分 VS Code 推断的默认空数组和用户显式空范围，保留用户取消全部选择的语义。定向回归通过，新版本实机待重载。
- 日志工具传 commandId 返回空；传已知精确相对日志路径可读。首次派发曾返回 HTTP 500/action failed: timed out，但远端实际继续执行；不得据回执自动重发。任务主动查询已正确反映最后退出码。本轮增加原生 commandId 日志路径解析，显式读取错误向上传递，CLI 优先使用任务诊断中的路径。accept 原 8 秒等待短于本轮约 18 秒代码核验，改为调用方已有的 30 秒预算，其他控制调用仍为 8 秒；不重发未知任务、不变更队列协议。真实 tmux 定向回归通过，新版本实机待重载。
- 两个项目复用同一 Agent 隧道端口，本轮按各自授权顺序切换精确辅助服务窗口，任务与 Scheduler 保留。若需同时在线，仍需为项目分别配置端口。

0.5.490 通知按钮已实点验收：两个项目的“已确认，此后不再通知”确认值均已持久保存，切回已确认项目未重复弹出。通用项目结果已生成但因缺少数据集名称被界面隐藏；本轮展示现有未标注数据集表格，保留元数据提醒，不改写结果或虚构数据集，渲染回归通过，新版本实机待重载。

所有有副作用的操作使用专用目标。MultiModal 项目的现行规则禁止 AI 永久删除项目文件；清理验收应在独立通用项目的专用目录由本人完成审核。
