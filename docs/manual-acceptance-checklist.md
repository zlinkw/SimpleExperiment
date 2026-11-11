# Windows 日常点击验收

本轮以 Windows 0.5.485 为初始实点基线。两个项目已在 0.5.488 完成授权，实机验收运行 0.5.489，原生 MCP 可分别访问正确项目。两个单 seed 实验均已有退出码 0 的结果；首次接入、MCP 文件/配置及面板结果显示仍有缺陷，整体验收未通过。0.5.490 增加通知的明确持久确认选项，完整回归及试行发布通过，已安装一次；等待本人重载项目窗口、重连 MCP，真实按钮选择待本人操作。界面保持侧栏，只验正常条件。

## 记录规则

入口清单由 scripts/entry-coverage.js 从当前 package、面板和两插件 API 生成，保存在 [windows-entry-coverage.json](windows-entry-coverage.json)。静态清单不包括所有动态菜单，必须用真实面板补充。每个入口分别记录实点通过、发现缺陷、未实测或已退役。只打开审核页记为预览通过。源码可达、自动回归和 API 成功均不能冒充人工点击。

当前源码盘点为 42 个 VS Code 命令（包括新增授权命令）和 174 处静态按钮声明。两者不可相加作为去重分母；动态行和上下文菜单还未完整盘点。当前尚未获得全覆盖结论。

0.5.485 运行中宿主的实际目录为 58 个 API 方法、191 个动作，已保存在入口清单的 liveBaseline。动作目录和 safe 字段都不能证明按钮已点击或具有写入授权。0.5.490 完整 322 项串行回归通过，不能替代剩余实点。原始记录为 simple_cluster/reports/test-workflow/2026-11-11T10-15-41-498Z-38512-package/run.json，退出码 0，总耗时 847421 ms。

## 实点与效果

| 操作 | 状态 | 已观察结果 |
| --- | --- | --- |
| 聚焦 SimpleExperiment 视图 | 实点通过 | MultiModal 面板加载，显示当前项目与 12 个原有 PLAN |
| 最大化辅助侧栏、计划导航 | 实点通过 | 面板可扩展，导航定位到计划区 |
| 当前 PLAN 下拉选择 image_only | 实点通过 | UI 与宿主 selection、planFileInput 都为 experiments/plans/comparison/image_only.yaml |
| PLAN 搜索与切换独立验收 PLAN | 实点通过 | 搜索后保留原选择，切换后页面与操作记录均指向 windows_mcp_20261111.yaml |
| 独立验收 PLAN 校验与预演 | 实点通过 | rjj8 返回实际校验、预演终态；任务数 1；未启动训练 |
| 低流量开关 | 发现缺陷，已修复源码 | 前端已实现的命令缺少白名单，按钮被误判；定向回归通过，升级后需实点复核 |
| 仅校验后的 PLAN 状态 | 发现缺陷，已修复源码 | 本机准备回执被算作已运行，出现部分完成 0/1；修复后不把准备回执计入任务运行证据，定向回归通过 |
| 零台 Worker 的服务器设置 | 发现缺陷，已修复源码 | 0.5.486 实际页面没有添加按钮；现将手动添加和 Xshell 导入固定放在 Worker 设置顶部，零台、全禁用及已配置状态的渲染回归通过，待升级实点 |
| 全局共享服务器与项目切换提醒 | 已实现，待实机 | 新项目读取同一连接、环境与配额；旧项目不覆盖后续共享修改；项目队列、API 身份及授权保持独立，定向回归通过 |
| 管理 AI 项目授权 | 发现缺陷，已修复源码 | 0.5.487 工厂启动遗漏命令注册，实机命令 not found；0.5.488 补齐工厂绑定及运行环境准备按钮，实际注册链回归通过，待升级实点 |
| 0.5.488 授权保存和共享服务器 | 本人完成授权，读取及界面通过 | 两项目实际运行 0.5.488，均保存 rjj8 的 experiment/sync/agents/configuration/results 授权，项目根分别匹配；通用项目实际界面可见授权按钮及保存通知。未由 AI 代选授权项 |
| 共享服务器提醒重复触发 | 发现缺陷，已修复源码 | 0.5.488 两个窗口切换焦点相互改写全局上一个项目，实际重复弹出通知；0.5.489 改为项目独立提醒记录，交替焦点及同项目重载回归通过，待升级实点 |
| MCP 连接跨窗口正常重载 | 发现缺陷，已修复源码 | 旧原生 MCP 连接固定了启动时实例，两个项目查询均返回 HTTP 401；重新建立官方 SDK stdio 连接可正确读取各项目与授权。0.5.489 在每次调用前重新核实工作区唯一实例；显式绑定、歧义拒绝及版本门禁回归通过，待长期连接实机复核 |
| 项目识别与隧道提示 | 发现缺陷，已修复源码 | 0.5.487 通用项目已有 PLAN/接入配置且隧道 TCP 已通，仍依赖旧引导标记；当前 Agent 实际属于 MultiModal。0.5.488 分开本地识别与 Agent 项目归属，明确实际/预期路径，不把端口连通当作本项目就绪；待升级实点 |
| 顶部总览与当前 PLAN 状态 | 发现缺陷，已修复源码 | 0.5.488 实际界面及只读 API 确认：校验/预演的本机进度记录 type 为 run-plan、localSubmissionProgress 为 true，当前任务数为 0。顶部未排除该标记，误报调度已完成；0.5.489 与下拉框采用同一排除条件，不改写历史记录，待升级实点 |
| 0.5.489 顶部预演与面板提交 | 实点通过 | 预演后显示可提交；从当前 PLAN 按钮提交独立验收文件，未把准备回执计为完成 |
| 原生 MCP 与 CLI 指定项目查询 | 实际调用通过 | 两个 MCP 状态分别为正确工作区和 0.5.489；MultiModal 同一 commandId 的 MCP 与 CLI 均查询到真实运行状态 |
| 项目归属识别 | 实际调用通过 | 通用项目连接 MultiModal Agent 时明确返回 agent_project_mismatch，未当作本项目就绪 |
| Agent 运维与科研任务隔离 | 实际调用通过 | 仅关闭对应项目的指定 Agent 窗口；MultiModal 任务窗口 @12 和 Scheduler @9 保留，任务随后成功完成 |
| 通用项目仅 MCP 运行与导出 | 部分通过 | 准备、预检、启动、主动查询、收集及 CSV 导出均经 MCP；退出码 0、manifest 完整、日志检查 clear，completionState=verified。首次准备及同步配置需修正，不能计为首次接入流程通过 |
| 通用项目面板结果 | 实点未闭环 | 当前 PLAN 显示 1/1 完成；资源树搜索与结果导航、更新结果按钮已点，结果区显示 1 个 PLAN 未识别数据集，尚未完成从面板打开相同指标行 |
| 通知明确确认 | 回归通过，待实点 | 0.5.490 提供“已确认，此后不再通知”，按规范项目路径保存；新工作区身份、路径大小写及尾斜杠下仍保持确认，关闭通知不保存确认 |
| 其余命令、按钮、动态菜单和行内动作 | 未实测 | 按当前清单逐项继续，不记通过 |

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

0.5.491 首轮完整回归的 322 个作业中，8 个测试文件因模拟配置缺少 inspect 或 ConfigurationSettings 模块绑定失败；首次完整日志保留于 simple_cluster/reports/test-workflow/2026-11-11T11-25-28-974Z-48436-package。仅补齐原测试输入与真实模块，不改断言、超时或生产判断；8 个定向修正回归全部通过。既有 package:assemble 门禁只接收单份完整通过记录，本轮沿用门禁重新运行最终打包，不修改旧失败记录或绕过组装校验。

- 本轮源码修复（配套 SimpleSFTP 0.2.119）：project_prepare 首次面对不存在的项目远端根时先 inspect，返回 AGENT_LIFECYCLE_FAILED/No such file or directory。原来只能先上传创建根再准备；现已允许只读 inspect 不存在的合法项目根，不创建目录，后续正常上传创建。嵌入与配套控制脚本一致，真实 tmux 定向回归通过；新版本实机仍待重载。
- sftp_upload_files 的项目相对路径返回“本地文件不存在”；绝对路径上传成功，但 experiments 下两文件被平铺到远端根。sftp_upload_workspace 在默认根范围返回 MACHINE_STATE_PATH_PROTECTED；sftp_remote_directories 查询 experiments 子目录因请求路径与 server.remotePath 不同被拒。本轮保留路径层级、生成已选范围 manifest 并关闭删除，子目录绑定与请求一致；定向回归通过，新版本实机待重载。未自动清理误放的验收文件。
- configuration_set 的 workspaceFolder 写入缺少资源 URI；workspace 写入实际成功，但回执及 configuration_get 仍返回空数组，不能反映保存值。空同步范围曾产生空 manifest，code-sync-proof-1794392704048-2g5513 登记结果未知；明确项目范围后新预检成功。本轮配置读写均绑定工作区资源并重新读取保存值；区分 VS Code 推断的默认空数组和用户显式空范围，保留用户取消全部选择的语义。定向回归通过，新版本实机待重载。
- 日志工具传 commandId 返回空；传已知精确相对日志路径可读。首次派发曾返回 HTTP 500/action failed: timed out，但远端实际继续执行；不得据回执自动重发。任务主动查询已正确反映最后退出码。本轮增加原生 commandId 日志路径解析，显式读取错误向上传递，CLI 优先使用任务诊断中的路径。accept 原 8 秒等待短于本轮约 18 秒代码核验，改为调用方已有的 30 秒预算，其他控制调用仍为 8 秒；不重发未知任务、不变更队列协议。真实 tmux 定向回归通过，新版本实机待重载。
- 两个项目复用同一 Agent 隧道端口，本轮按各自授权顺序切换精确辅助服务窗口，任务与 Scheduler 保留。若需同时在线，仍需为项目分别配置端口。

0.5.490 通知按钮已实点验收：两个项目的“已确认，此后不再通知”确认值均已持久保存，切回已确认项目未重复弹出。通用项目结果已生成但因缺少数据集名称被界面隐藏；本轮展示现有未标注数据集表格，保留元数据提醒，不改写结果或虚构数据集，渲染回归通过，新版本实机待重载。

所有有副作用的操作使用专用目标。MultiModal 项目的现行规则禁止 AI 永久删除项目文件；清理验收应在独立通用项目的专用目录由本人完成审核。
