# Windows 功能精简：调度与验收总计划

状态：G001 功能精简 R01–R08 已独立验收并交付同步；独立的新需求“全部现存可达入口正常操作逐项实点”按用户明确指定由 G003 承接，不能以本代完成代替全入口实点。本文件保留G001原计划，执行事实仍见 execution-status.md。
更新日期：2026-11-16。按用户方案 2 完成职责交接；旧主会话停用，不再实现、监控或中转审批。

## 项目长期方向与批准边界

仅 Windows；先辅助 MultiModal 真实实验闭环，之后适配其他深度学习项目。GUI 人工点击是正常使用，MCP 是 AI 主要入口，CLI/GUI/MCP 复用同一业务层。服务器等非项目设置全局共享，PLAN、队列、结果和授权按项目隔离。当前验证正常条件，不做断电断网演练。

已完成的八批退役阶段保留原始指标、总表、列映射、CSV/JSON、日志异常、真实退出码和产物完成证据，AP、macro_f1、weighted_f1 分别保留。用户明确将新的全入口补验指定为G003，其范围与保护在独立计划维护。新独立阶段仍由总控与用户确认具体范围，再制定完整批次、边界、依赖、保护和验收，交调度执行。不默认批准新训练、升级、安装、发行、Worker 部署或真实删除。

2026-11-16 用户追加精确批准：移除 test/factories_integration.test.js 中独立的“新模块行数门禁 (<400，目标 <300)”子测试及其专用注释，仅此一项静态规模规则退役。其余工厂行为、类型、动态端点、模块加载和脚本语法检查全部保留，不改超时、错误阻断或断言以放过功能失败，也不拆分/改写三个本轮无 diff 的基础模块。此修订由原 R07 实现、独立验收复核；首轮失败日志保留，不能将规则退役写成原检查已通过。

G001 保留结果能力的范围修订：真实源码 CLI 历史导出发现 experiments/results/latest-results.json 的 schemaVersion/runtimeDiagnosticsProtocol 被列成指标。已核 src/results/LatestResultExport.ts 的固定 latest-results.json 是插件 active_query/jobs/tables 控制快照，当前历史目录自动发现误交通用 JSON 指标解析；这是既有可达准确性问题，未证明由本轮退役引入。纳入原 R06 的 src/cli/commands/result.ts 历史自动发现边界最小修复，原 R07 的 test/cli/simpleCli.test.js 补真实 CSV/JSON 与控制快照混合时的公开历史 list/show/export 覆盖，R08 做相关生成/验证。只排除既有明确控制文件，不禁用普通 JSON、不全局黑名单指标字段、不重构通用解析/registry 或从快照另造历史格式。显式解析、主动查询、真实指标/身份/维度及现有历史语义保持；不改写消费项目文件。metric/compare 共享 loadResults 的必要消费者一并定向回归，旧伪指标导出不能算真实指标验收。本修订仍属 G001，不新建代次。

## 计划、执行与验收的唯一权威

- 长期总控《项目总控与长期规划》：01a1e357-73d1-7f50-9411-ecf216540430 / local，GPT-6.1 Sol high。用户只与总控交互；总控独占目标、优先级、范围、全部批次、文件所有权、依赖、保护区、验收标准和完成条件的制定与修改。README.md、coordinator.md、reviewer.md、worker-common.md 和 R01–R08.md 均由总控独占写入。
- 执行调度《Windows 功能精简调度与持续验收》：01a1e34e-e63d-79a2-9175-7a1afa97578d / local，GPT-6.1 Sol low。调度是实现会话唯一指令来源；可以在既定依赖与文件边界内安排并发、顺序、执行会话、测试独占时段、监控、原批次返修、证据收集、最终 Git 操作与真正验收通过后的归档。不得自行扩展、缩减或重拆批次，不得改变文件边界、标准或批准范围。
- 独立验收《功能精简独立验收》：01a1e34f-5e2d-7661-83b8-01190466df99 / local，GPT-6.1 Sol high。独立拥有通过/失败判断权；实现者、调度和总控均不得代签。验收会话的明确结论与其引用的原始运行/UI证据是验收权威；execution-status.md 只引用这些事实，不生成另一套结论或报告。
- execution-status.md 是纯执行事实的唯一登记文件，由调度独占写入。记录实际会话、资源独占、冻结/返修/运行状态、原始日志、退出码、验收结论引用、归档与 Git 结果；不能借状态更新修改计划。总控只读此文件，不重复维护状态表。总控与调度不得同时编辑同一文件。
- 普通计划内缺陷按“验收→调度→原实现返修→验收复核”推进。需要范围、文件所有权或验收契约变更时，调度一次提交问题、影响、建议和证据；总控修订并交回后执行，未受阻的独立工作继续。实现者只能建议，不能跨文件写入；验收不直接修改产品代码。
- 总控以项目模型、最近已验证基线及规划时按需读取的执行快照作决定。项目模型包含架构、能力、约束与模块关系，先读本计划和现有架构/能力索引，历史文档与当前实际源码冲突时按涉及模块定向核实；最近已验证基线取 execution-status.md 引用的独立验收结论、原始证据及已知缺口。接新需求、确需改计划或用户主动问进度时按需读取，不每次全项目扫描。总控不靠持续跟踪进度维持项目认识，不持续 wait/轮询调度、执行或验收会话，不抢写产品源码、不绕过调度派单、不代签验收。计划交回调度后结束本轮并空闲；旧主会话停用。
- 调度仅在三类情况消息总控：原计划确实无法覆盖、必须修改计划；需要用户决定或新增专项授权；整份长程计划已完成，需要一次最终交接或下一份计划。普通开工/完成、单批验收、计划内可返修的测试失败、阶段里程碑、等待依赖、替换执行者与同步确认只更新 execution-status.md，不发送“无需回复/仅供记录”等消息变相唤醒。登记更新不自动触发消息。
- 验收日常通过/失败和普通缺陷只交调度；调度把验收者的原结论及证据路径准确登记于 execution-status.md，原始日志沿用原执行器落盘，不代签、不另建重复验收表。确实涉及计划或用户决定时由调度合并提请总控，验收不另开派单/升级渠道。最终整份计划完成时再由调度一次提交独立结论与完整证据引用。
- 升级请求须一次简短写清：原计划哪条不能继续、实际证据、影响范围、建议改法、需总控作出的决定、仍可继续的独立工作。同一待决问题只有一个请求，只有足以改变决定的新事实才补充，不逐项报数。仅暂停受影响步骤，其他独立工作继续；总控只修订受影响部分，继承全部有效进度后交调度执行。
- 本次仅交接职责，继承全部现场、会话、合法文件移交、已删源码、未提交修改、失败日志及有效证据，不重建、回滚或重跑已经完成的工作。计划修订由调度通知现有实现和验收会话，不让用户逐个启动或转发。
- 测试、构建及已分配的独占验证期间，所有角色均暂停受检 docs/src/test/scripts/dist 的编辑，包括计划和执行登记；调度释放独占后才落盘。计划写入前先与调度核对资源，不能因职责交接使正在验证的输入失效。

常见失败分支已在计划内授权：退役专用字符串/动作残留、混合测试遗漏基础断言、原 VM/抽取夹具缺失仍保留的依赖、重新解析前读取旧结果视图、受影响清单与生成闭包失配，由调度在既定文件边界内回原负责人最小返修，独立验收复核，再按实际影响补跑并复用仍有效覆盖，无需逐次唤醒总控。真实产品失败不能只改测试预期；基本语义、安全、输出声明、真实退出码和日志证据仍须保持。未知执行先对账，不重放未确认写入；外部条件不足如实登记未测，不冒充通过。跨文件/批次边界、新权限、改通过标准或计划确实不能继续时，才按上述升级请求处理。

用户现已独立批准文档生命周期实施，完整计划见 [G002](../plan-generations/G002-plan.md)。本功能精简 R01–R08 整体登记为 G001，原计划、执行登记及当前必要附件保持路径与职责；G002 不改变本轮产品范围或回归。治理按独立需求代次保留最近三代，当前不足三代不发生淘汰删除；全局技能由原作者维护。不得安装记忆框架、建自动化或清理现有资料，不新增长期项目模型或进度报告，G001 活动验证期间仍全部冻结。

## 目标与已确认边界

完全移除 PPT 连接、绘图、配置、探测、确认提醒、专用契约；移除“高级证据与分析”及其科研分析业务；移除“相关检查”整个区块及对应可调用业务；移除上述功能的专用测试，编辑混合测试时保留基础实验覆盖。

保留项目识别、全局服务器设置、项目授权、同步、PLAN 校验/预演/提交/队列/派发/停止、GPU/tmux、日志与运行异常检查、真实退出码、声明产物完整性、任务完成事实、原始指标解析、项目结果总表、基础比较、CSV/JSON 导出、列映射及结果数据集归类。AP、macro_f1、weighted_f1 保持分别解析。

“删除输出契约检查入口”不等于删除正式运行必需的输出声明、路径安全与产物完整性校验。“移除高级分析”不等于移除运行日志诊断、普通指标聚合或任务故障信息。基础结果导出的排版函数即使名为 exportPaperTable，也按真实调用用途保留必要实现，移除高级论文分析的公开业务。

不升级 MCP、插件、Worker 运行版本；不递增版本、不打 VSIX、不安装、不发布、不改变全局 MCP 配置。不训练新实验，不清理消费项目文件，不改写历史结果，不处理历史 VSIX 与校验文件。

## 会话分工和启动

- 旧主会话只自动开启调度会话：GPT-6.1 Sol，low。用户要求 Fast；当前 create_thread 参数没有独立 Fast 字段，不为此要求用户手动操作，也不能声称接口已开启 Fast；如实记录未能显式指定这一项。
- 调度自动开启独立验收会话：GPT-6.1 Sol，high。所有批次共用这个验收负责人。
- 每个实现批次新建 GPT-6.1 Terra，high 会话，只给 worker-common.md 与自己的 Rxx.md。实现者不得读取本总计划、其他批次说明或旧主聊天。
- 调度与验收会话可以读取总计划。项目 ID 为 856a6b74-a736-4816-8f7a-3e9143d0b119，路径 D:\GitRepo\MCP\zlk-cluster-orchestrator，host 为 local。用户已授权自动创建、调度、互发消息和验收后归档，无需逐次等待用户操作。旧主会话创建调度后停止，不能创建实现/验收会话或继续监控。
- 不设置人为的活跃会话数量上限。独立文件的实现批次尽可能并发，真实宿主容量限制照常遵守，不绕过工具拒绝。共享文件、生成产物和测试进程仍按资源互斥。旧主会话不占持续工作角色。
- 用 create_thread 创建项目 local 会话，不创建 worktree，不从旧主会话 fork 历史。只交付对应批次文件与共同保护约束。通过消息精确转发真实 threadId/hostId，不猜 ID。
- “只看自己的批次”通过独立初始上下文和文件读取约束实现；本机共享项目目录不是文件访问权限隔离，不宣称其他计划文件对实现者技术上不可读。
- 持续监控由调度会话使用 wait_threads 的有界等待承担，保留 cursor，定期核对真实状态；没有变化不反复发送提示。普通等待不启动第二执行器。
- 当前工具规则禁止为这次具体开发任务创建按里程碑追踪的自动化。因此不建立定时任务、系统计划任务或变相心跳来绕过。调度被停止或应用退出后不保证自动恢复；用户重新开启调度会话后从本计划恢复。这个限制必须向用户如实说明。
- 验收未通过时保留原实现会话返修；真正通过后归档该批次会话，后续新问题另开新批次，不复用已经归档的实现会话。不永久删除聊天。

启动提示见 coordinator.md、reviewer.md。调度只给实现者对应 Rxx.md 的内容与 worker-common.md，不把全文计划复制过去。

## 批次、文件所有权与依赖

| 批次 | 独占修改范围 | 内容 | 前置 |
| --- | --- | --- | --- |
| R01 | src/ui/PanelHtml.legacy.ts、src/ui/sections/ResultsSection.ts | 移除界面与残留引用，保留基础结果展示 | 无 |
| R02 | src/extension/legacy.ts、src/factories/FeatureFactory.ts、src/tunnel/TunnelClient.legacy.ts、src/tunnel/WorkerTelemetryApi.ts、package.json | 宿主业务、动态按钮、配置、动作目录移除；package.json 仅移除两项 PPT 专用配置，版本保持 0.5.512 | 无；接口约定见共同约束 |
| R03 | src/clusterAgentRuntime.legacy.ts | 移除远端科研分析动作及独占实现，保留正式运行与聚合 | 无 |
| R04 | src/PptPlotBridge.ts、src/PptPlotBridge.legacy.ts、src/features/PlottingContract.ts、src/features/DatasetInspector.ts、src/features/ExperimentConfigRecovery.ts、src/features/ExperimentConfigRecovery.legacy.ts、src/features/ResultAnomaly.ts、src/features/ResultAnomaly.legacy.ts | 精确删除专用模块，确认共享依赖 | R02、R03 实现完成 |
| R05 | src/features/Quality.legacy.ts、src/features/Quality.ts、src/features/factories/QualityFactory.ts、src/features/SmallScale.legacy.ts、src/features/SmallScale.ts、src/features/Checkpoint.ts、src/templates/ProjectAdapterTemplates.legacy.ts | 移除剩余高级科研计算，保留基础契约和 checkpoint 元数据读取 | R04；必要接口先告知调度 |
| R06 | src/cli/commands/result.ts、src/cli/help.ts、src/cli/index.ts、src/cli.legacy.ts、src/mcp/ProjectQueries.ts、src/mcp/ToolCatalog.ts、src/mcp/ToolResults.ts | 移除高级论文表等公开 CLI/MCP 业务及旧 CLI 残余，保留基础结果能力 | R02；可与 R05 分离实现 |
| R07 | test/ 下相关测试及 helper、scripts/check-static.js | 删除专用测试与 G7 绘图检查，修正混合测试；其他检查保留 | R01 至 R06 全部冻结 |
| R08 | scripts/test-workflow.json、.vscodeignore、scripts/package-content-policy.json、受影响生成清单/产物、dist/、仓库根 README.md、当前使用指南、docs/manual-acceptance-checklist.md、docs/windows-entry-coverage.json、既定范围内过时文案；不含 docs/feature-retirement/ 下计划与执行登记 | 构建闭包、统一回归、源码开发宿主实点与清单修正；两项补充清单仅移除本轮删除模块的失用闭包引用 | R07 冻结；单一生成/测试写入者 |

这是一个尚未完成的功能退役修改集，不把半成品切片提交为通过。所有切片最终验收通过后，由调度统一检查 diff、只提交本任务文件并普通 fast-forward push 到既有 origin/master，再 fetch 核对 HEAD 一致。若远端已前进、凭证或保护阻断，停止 Git 发布并明确报告，不自动变基/合并/换分支/强推。原生 Desktop 开发不是 Pi 管理器任务，不擅自套容器 worktree 交付流程。

任何批次需要改变文件边界，先报调度，由调度向总控提交修订建议；总控修订计划后由调度落实，不越界抢写。以上 R02、R06、R08 的已发生合法移交已纳入本次继承基线，不撤销进度。发现超出本轮范围的问题不自动扩展实现。

## 初始交接现场（历史快照，不代表当前状态）

以下保留旧主交接时的缺口与原始失败线索；当前状态以 execution-status.md 和独立验收结论为准，不能把历史缺口当作新的返修指令或据此重复执行。

仓库 master，最后读取 HEAD 为 d42aaa8e203bec353b7e025cc20a9e5dbf7fa864，origin 为 https://github.com/zlinkw/SimpleExperiment.git。恢复时重新读取实际 Git 状态。当前 7 个实际内容变化的文件：R01 的 PanelHtml.legacy.ts；R02 的四个文件；R03 的 clusterAgentRuntime.legacy.ts；R07 的 scripts/check-static.js。它们是旧主会话本轮的未完成修改，可在各自所有权内继续修正，不是已验证成果。

旧主会话已撤回取消的 PPT 修补：PptPlotBridge 源码、相关 PPT 测试及原生成文件取回 HEAD 原字节。git status 可能短暂显示这些文件修改，git diff -- 文件核实实际差异后再处理，不盲目覆盖。

当前修改通过了两个外层 TypeScript 文件的解析检查，但没有编译、运行回归或真实界面验收。git diff --check 已发现新增行尾空白，尚未修复。主要已知缺口：

- Panel 的 PPT 与科研分析函数已删一部分，但 currentPlanWorkflowResultReadiness、currentPlanResultWorkflowStatus、sectionRenderModel 等仍引用已删函数；树入口、状态签名、配置草稿、CSS 和设置文案仍有残留。
- 宿主移除了一部分方法/动作/状态，仍需检查受影响调用链及空列表/对象，不可把 AST 文本移除视为完整实现。
- Python 公开动作分支和目录已部分移除，独占科研分析 def 尚在；应检查模板实际生成的 Python，不依赖文本命中断言。
- 专用模块和测试尚未删除；CLI/MCP 高级工具尚未移除；构建清单与覆盖文档仍旧。
- 临时编辑脚本位于系统 Temp 的 simple-retire-features.cjs，只是旧主会话一次性编辑工具，不能作为后续执行器/删除授权，不再执行。不要为清理它扩展本任务。

## MultiModal Agent 已恢复的证据与保护

2026-11-16 15:30（北京时间）恢复请求 mcp-1ff77725-6eea-4c41-b700-61f1ac4824ef 已返回 succeeded。

- rjj8 的 SimpleMcpAcceptance Agent 精确窗口 @53 已关闭，Generic Scheduler @6 保留。
- MultiModal Agent 当前专用窗口 @54，session zlk-worker-rjj8-agent，windowName agent-6686260cd5e675e3，实际运行 0.5.512。
- 项目 /root/autodl-tmp/zlk/MultiModal；安装目录其下 zlk_agent；machine b3fd29ca2560ab43c22e56fc9e8128c9173a82a1d665749fbf722905ed9a4108。
- cluster_agent.py SHA256：55cd300460f2b2aee184c78934e2d8210f7434c6bcbf163240f8c492894078bf；cluster_scheduler.py：870e733728aa8d68bc1b92863b1ea133a6bb6ef0139f60772fe91dbec7d76f92。
- MultiModal Scheduler 当时 absent，未创建。共享端口最终服务 MultiModal；不声称两个项目 Agent 同时在线。后续先主动查询再判断，不用旧窗口 ID 直接执行停止。
- 实际本机隧道 localhost:18770 转发至远端 localhost:18765，只作本次已查事实；后续读取配置，不硬编码。
- 只需最终 agent_inspect 验证，不再次 project_prepare/deploy/upgrade；不可把本地新源码推至 Worker。

保留 MM final.md 未保存修改；保留 Generic Untitled-1 未保存的 {unparseable software fixture}；保留用户拒绝删除的 D:\GitRepo\SimpleMcpAcceptance\acceptance_files\cleanup_20261111.txt（49 字节，SHA256 b2abf3f4fd027aaa463ae58c18d89b59d1f3bebfa847459b43dbc7d41b74cd7b）。保留当前训练/GPU7、全部旧任务、隔离暂停意图、日志、结果和专用验收 PPT 文件。

## 验收与完成条件

1. 验收会话对每个实现切片做范围内源码/依赖审查，反馈真实问题；未做全局回归时只能标记“实现完成，待集成”，不能归档为通过。
2. R07 源码/测试修改冻结后，R08 单写入执行必要编译与目标测试。先单个目标文件，再完整规定 build 回归；所有 node/python 测试全局串行。独占期间无人手工编辑源码、测试、scripts、dist、docs；R08 只通过原 runner 的既有编译/生成 gates 写 dist 等既定构建产物，保留原日志/receipt/缓存机制，不借机编辑计划或改业务。编译本身必须独占。
   总控、调度与验收均遵守输入冻结；状态先留在各自会话，独占检查结束后由调度更新 execution-status.md，计划修订由总控写入，不能由监控写入使候选失效。
3. 使用现有 test-workflow runner 与清单。目标套件示例：node scripts/test-workflow.js test --only test/features/resultSectionRefreshDependencies.test.js --max-parallel 1。完整阶段 npm run build，保留真实退出码与完整日志。不可通过减少范围、放宽断言或超时求绿。
   本轮执行裁定：先用一个受影响文件跑上述目标入口，之后可在同一 test 调用重复 --only 精确列出其余受影响文件，逐文件串行，复用 runner 自身编译缓存；最终 npm run build -- --max-parallel 1。保持当前已批准分组按需策略，不默认 --include-ondemand all；关键、受影响及未知组必须恢复执行。运行前通过 runner 的 --dry-run 核对真实计划与依赖/参数矩阵，未被选择的必要受影响项用精确 --only 或 --include-ondemand 文件/组补足。清单或 runner 变化若令原选择器自动恢复全部组，接受其真实结果，不篡改 git/diff/映射或规避保护来减少范围。执行、有效复用及 on_demand_not_run 分开列，未运行不记通过；旧证据仅在最终输入仍有效时复用，不因交接重跑。首轮失败后的纯测试返修及本次获准行数子测试退役，只补跑实际修改/受影响套件并组合仍有效的既有覆盖；另两套已经通过且输入未变时不因计划文案修订再跑。factories_integration 修改后须完整运行该文件，不能用名称过滤绕过剩余检查，之后继续尚未完成的规定 build 与真实界面/Agent 检查。
   原 compileGates 的 npm run compact:plan 保留、不跳过。总控已只读核对 scripts/compact-target-mode-plan.js：只有 changed=true 且非 dryRun 时写 docs/target-mode-plan.md；本次真实 dryRun 返回 changed=false、reason=already-compact、lineCount=47。因此允许 R08 在冻结后调用原门禁，预期不写任何计划文档；这不是授予计划编辑权。调度分配独占前重查该 dryRun，若 changed=true 则先停在此阶段交总控裁定，不能偷偷压缩、跳过 gate 或改脚本；未变化时正常运行并在结束后确认该文件无新增内容差异。任何非预期计划写入如实报告，不自动还原或重跑。
4. Panel 必须通过 build 中的 node -c 与额外 vm.Script；还要取得实际生成 HTML 中的每个 script 做 vm.Script，防止外层模板吞反斜杠。确认结果页面真实渲染且握手正常。
5. 用现有独立源码开发宿主检验移除后的结果页、导航/自定义动作、设置和基本表格/列映射/导出。无需重新训练，不用已安装 512 的旧界面冒充新源码验证。不安装扩展；不重载用户两个工作窗口。独立开发窗口可按已观察 UI 重载。MM 和 Generic 原窗口未保存文档不得保存或丢弃。
6. 当前旧版统计基数：staticButtonOccurrences 179，80 clicked_passed、31 preview_passed、43 not_tested、25 retired；43 包含 31 真实待验、8 选择器、4 无入口兼容。dynamic observations 198。它们是旧基线，不是新版本分母；按实际新源码更新，移除记退役/已移除，不能记实点通过。不要用 entry-coverage 脚本输出覆盖并丢失已有证据；其 --summary 单独参数曾被当作目录导致 ENOENT。
7. 人工双页删除、终端交互、安全/授权设置、外部 GitHub/第二 Worker 等仍缺条件的入口单列。用户已拒绝测试删除，不重试、不代点。移除 PPT 功能不应继续要求它的外部条件。无入口兼容与选择器继续独立统计。
8. 旧版 2026-11-16T07-04-37-537Z-40572-build 曾通过 286 jobs + 10 gates，但这是已取消 PPT 修补的证据，不能作为本轮移除后的通过记录。运行前读取真实执行清单，不硬编码总数。旧失败日志保留。
9. 原有约 60 份未跟踪 simple-experiment-*.vsix.sha256 与本任务无关，不 stage、不删除。打包/发行/安装检查本轮不执行。版本仍 0.5.512，SimpleSFTP 仍 0.2.120。
10. 最终由验收会话独立明确给出每批通过/失败、完整回归记录、实点覆盖与外部阻塞；调度核对基本能力、MM Agent 原版与 Git 同步事实并向总控交接，由总控向用户报告项目级完成状态。独立验收未签通过时总控不得代签；仍有未完成项必须如实报告。

## 执行状态与恢复

当前执行登记统一见 [execution-status.md](execution-status.md)，由调度唯一维护；本计划不再保存第二份批次状态表。验收判断以独立验收会话及其引用的原始证据为准。

中断后先读取本计划、execution-status.md 与实际 Git 状态，核对已登记会话的有界状态快照和原运行日志。复用当前会话与现场，不重建、回滚或重跑已完成工作，不要求用户逐批启动或转发。应用退出或会话停止不保证自动恢复；用户回到总控后由总控协调原调度接续，不要求旧主监控。未知测试/构建进程不得重开，先确认原进程树结束与锁状态；清理新锁仍需适用的精确授权，旧锁授权不通用。

## 全入口补验后续需求

G001 功能精简 R01–R08 已独立验收交付。本次全入口正常操作补验由用户明确指定为独立 G003，计划与执行统一见 [G003 计划](../plan-generations/G003-plan.md) 和 [G003 执行登记](../plan-generations/G003-execution.md)。原已形成补验内容和在途工作承接到该代，不在本文件继续维护第二份补验计划；本代成果、原记录与路径保留，不重开G001。
