# G003 插件功能与按钮正确性检查

## 当前目标与用户裁决

2026-11-17 本人明确：“我只是为了查插件功能和按钮是否正确，不关心worker是否工作正常，所以不需要查这些服务器，使用rjj服务器也只是为了配合检查插件”。本条替代旧的“先证明独立Worker环境再验所有真实流程”前置。本轮目标是插件入口、对象/参数传递、权限与确认、处理函数、成功/取消/错误反馈及状态正确；不是服务器运维或科研运行验收。

停止把Worker健康、科研环境、父目录写权限、独立认证/端口/窗口、Agent部署和新隔离环境准备列为结案前置。不再为了覆盖按钮创建/运行真实任务、检查其他服务器或修改现有项目。rjj8仅在具体插件用例确需且已有精确许可时作为配合环境；依赖不满足可用受控替身验证插件契约，不能改生产门禁制造成功。

先按既有中英文记录、源码位置和有效结果对账。164处静态data-command文本（98命令名）已关联证据/条件/未知，待关联0仅是文本对账完成；动态和真实未查逻辑总数仍未知。五张Worker卡的5个导入仅preview、15个保存/启动/删除未执行，是20个已知实例，不是剩余总数。不得为统计再逐项人工重查、重复实点/回归或把文字关联冒执行通过。仅补真实未覆盖或本轮改动影响的逻辑缺口；已有效检查直接复用。

用户追加需求继续有效：任务指标/输出接入由AI根据真实任务通过MCP配置并回读，不要求手填表单、正则、JSON/YAML；退役PPT等专属设置/动作/UI残留删除，基础功能及历史数据保留。G001/G002已交付，G003继续同一代，不建G004；next=4仅为索引计数。

## 角色、资料与连续执行

- 总控兼最终验收：《项目总控与长期规划 · C方案接替》01a1e412-ead7-7710-acd7-c475abb8b41a/local，Sol/high/Standard，独占本计划、索引、共同角色说明及B01–B03结论，不实现产品后自签。
- 唯一Terra：01a1e793-a4a0-7630-8157-24c920746d1a/local，Terra/high/Standard，独占execution、manual/coverage、现任指针、UI/检查/生成租约、返修事实/踩坑及授权scopedGit。旧Terra因真实接续条件交班归档；旧独立Sol已完整移交R13十位置等有效结论并归档，不唤醒或新增替代角色、Luna、调度/监控。
- 唯一事实：[执行登记](G003-execution.md)、[覆盖记录](../windows-entry-coverage.json)、[人工原记录](../manual-acceptance-checklist.md)。已完成过程与原日志不复制进新报告。原G003基线886139eb9ba3c3e94f383916daaeb096074c5108仅历史；当前源码修复0b484088、最近计划74abc8e7，Git/运行身份以实际读取及execution最新事实为准，不重提交旧成果。
- 通用接续、计数、正确模型/强度/default实核及自动同角色新建/消息/归档唯一遵循[统一入口](C:/Users/ZLK/.agents/skills/caveman/SKILL.md)及[交班模板](C:/Users/ZLK/.agents/skills/caveman/references/handover.md)；分工遵循[多会话实现](C:/Users/ZLK/.codex/skills/multi-session-implementation/SKILL.md)。不在项目复制阈值或算法，不为小进度换角色。
- 预算：计划24000字符、execution16000、长期踩坑12000；90%时在正常非冻结窗口整份语义归并，保留全部未决/授权/失败/原证据，不能只削到阈值、硬截断或另造存档搬文字。相同文件先汇总本阶段已知改动，内存核预算，一次写入/集中回读；有新事实/真实失败再增量，不为标点措辞反复编辑计数。

Terra完成全部当前范围实现和S01–S10及M/N/O必要补缺→真实工具交总控完整包→总控独占B01–B03→失败真实工具详返原Terra修复/定向自验/再交→最终明确通过及既有授权交付→总控结案。完整包给最终基线/diff、原命令与真实退出码/日志、证据适用输入与含义、真实失败/未知/未测、权限保护和租约。常态总控空闲，Terra普通进度记execution，仅真实新决策或完整交包联系。

有效证据按所涉输入、对象和调用链是否变化判断，不能因全仓提交变化、换角色或重新统计而重做。总控先核实际diff/必要调用链/原证据，仅补未覆盖项目级关联，不重复Terra小验收或已有大验收。实际UI/检查前明确移交单一租约；受检docs/src/test/scripts/dist冻结包括总控，结束才记事实。

仍有授权内可执行项就连续推进，CUA completion_summary只结束UI子流程，提交/记录不等于整代完成。仅本人暂停、全部剩余确有真实外部/授权阻断且精确升级、或正确同角色接替完成可中途停。实际用户输入/安全停止尊重，不抢焦点、不重放未知动作。不能再以“Worker未正常工作/未建独立环境”泛化阻塞插件本地逻辑检查。

## 证据分类与当前权限

真实UI实点只在专用源码宿主，观察→单动作→刷新核对象/效果，核workspace/build；API/CLI、受控renderer/方法测试、preview、history、selector、无producer/对象及真实外部效果未测分开标。受控替身可以表示合法成功、失败、离线或任务输入以测试插件分支，但不能注入真实项目队列、伪造远端运行或当作实机/科研结果。共享入口可复用同一生产链的有效断言，以参数化核对象差异，不强求逐卡重复已证流程。无当前真实对象不必新造服务器任务；无GUI JSON producer不新增按钮或冒GUI导出。

已验证本机R10合成子集、R13十位置、G001有效291任务身份组合及后续实际回归保留原范围。首轮284/286、不完整构建、R14L摘要消费者17/19等失败及后续修复不改成一次全绿，原始位置在execution和simple_cluster/reports/test-workflow。实际静态数/历史96/旧179/观察18均不作真实按钮分母。重试/异常路径可用受控测试，不制造实际故障或重复昂贵训练。

本机专用项目 C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f，本人已批准trust。只在这类经核新Temp安全根放最小合成软件源码/配置/CSV/JSON及新输出，执行前登记路径/文件，先核新目标不存在；不覆盖旧文件、复制密钥/真实数据/消费项目全集、不清理。可经支持入口或现有测试验证本项目结果目录、MCP映射、布局/自定义动作/独立PLAN归类，保存后回读、拆表/导出核身份/维度/内容；不更改真实共享服务器/安全/授权配置。测试替身可覆盖相同写入逻辑而不实际写共享存储。

原R10唯一application例外showAdvancedCommands已true导入再恢复：公开设置适用于所有profiles、写Code/User/settings.json的事实保留，原无显式覆盖已复位，不再为本轮重复启用。离线bundle仅合成results/preview，不含snapshot、任务、Worker或错误状态；不把离线映射pending冒Agent已同步。新Trust/真实安全或确认许可仍本人处理，不代点/绕过。新四选项project onboarding的“打开面板”已核仅focus，可直接选；不选识别/不再提示。旧R13两选项说明操作终态仍未知，不重放；不以旧通知未知阻塞受控按钮逻辑。

MCP本人实际授权仅当前Temp项目configuration；产品五项存储不扩成experiment/sync/agents/results许可，也不阻断configuration子集。实际configuration_set/get及解析/面板回读证据保留，离线sync=pending；本机保存不冒真实Agent完成。接口使用先读匹配实例的discovery/capabilities/OpenAPI，令牌留命令会话，不打印/落项目；不猜参数/端口。

### 服务器范围收窄与保护

本人已精确允许rjj8 /root/autodl-tmp/zlk本次受控只读remote.listDirs；实际传confirm/pathConfirmed返回ok=true、9个目录，未列SimpleMcpAcceptance_G003。仅证明目录列举，不排除同名文件/链接或证明写权限/隔离，原2001 CONFIRM_REQUIRED历史保留。本次许可已执行，不自动扩成其他远端操作。用户随后明确不需服务器排查：停止继续查父目录/端口/认证或准备R12-I，不把这项旧待决留成永久阻塞。

旧R12-I曾批准的新本机候选 C:/Users/ZLK/AppData/Local/Temp/simpleex-r12-isolated-20261116-83e670c4、新远端 /root/autodl-tmp/zlk/SimpleMcpAcceptance_G003及独立profile/runtime/forward/window准备，现退出本轮必要工作，不继续部署或凭旧许可扩大此次动作；历史授权/已查/未查原样保留execution，不标成功或自动清理。现有项目/任务一律保护；确有插件逻辑不能在受控环境验证的具体缺口，再只报最小用例/对象/影响/精确许可，不能重新展开环境建设。

保护原MM final.md、旧Generic Untitled-1未保存稿，不重载/保存/丢弃原窗口；GPU7/所有旧任务/产物/结果/日志、原MM目录/root/autodl-tmp/zlk/MultiModal、tmux zlk-worker-rjj8-agent/@54、旧Agent及localhost:18770→localhost:18765均不动。rjj8旧SSH身份root@127.0.0.1:15791仅已核线索，不当Agent端点、不猜其他Worker。D:/GitRepo/SimpleMcpAcceptance及拒删acceptance_files/cleanup_20261111.txt不覆盖/删除。先前精确旧build锁已按本人单次授权删除，不能用来删除新锁。

不安装/升级MCP或插件/旧Worker、不递版本、不打包安装发行、不新训练、不自动重跑/同步科研结果、不新增外部服务/终端动作或清理。所有完整文件/目录删除仍须精确许可及safe-delete-paths/manual-cleanup-only；生产插件永久删除的路径/节点/类型与双确认、规范安全根、direct-parent cd、./直接子项等保护不变，受控测试不执行真实删除。版本号不替代字节身份，已有包/运行/部署分别如实报告。

## MCP接入与退役残留契约

AI依据当前项目/任务/PLAN、真实训练评估入口及允许读取的结果格式，经现有project_state/configuration_get/set链读→按真实语义写→回读→现有解析消费者验证；缺事实仅问任务事实，不让用户手填、不按分类/分割臆造主指标，不引入插件内模型、自动AI调度、框架或未来开关。任务类型、主辅指标、路径/格式/别名/日志解析来源可见，真实保存/解析/同步错误向上呈现。

任务规则、CSV列映射、derivedMetric手填/保存/转编辑流程改只读摘要及现有MCP任务/导航；存储、项目绑定、host/API、兼容读取、CSV/Markdown/JSON解析、派生消费者、浏览/筛选/来源切换/拆表/导出/基础比较、TensorBoard等保留。PLAN数据集归类是独立结果维护，保留自动匹配/历史/可选修正和原“未识别、可信归属不可覆盖/跨数据集”等语义；普通MCP接入patch若改变有效planDatasetMapping须任何写前拒绝，不能对象合并绕结果权限。

只移除G001明确退役功能的专属schema/default、动作/UI/导航/提示，不因字段含paper/leaderboard删除共享解析或历史结果；不删用户settings、布局、数据/日志/安装目录或整源码文件。PPT chartType/styleMode当前源码已无、旧安装0.5.512仍有，按源码宿主验证，不直接改安装目录。指南当前master保留插件版本与完整多行剪贴板任务；一般科研运行/传输可选已有适用脚本/CLI/scheduler/SSH/tmux/标准工具，实际选插件才发现其接口，本次指标/输出配置仍AI经MCP。

## 集中修复与统一验证

本人最新要求“非必要不构建和安装，先尽量把能查能修的做完，再统一测试、构建和安装”。先完成当前范围内可独立推进的排查、现有断言对照和必要源码/测试修改，同文件集中完成，再冻结最终候选统一验证。此顺序统领下表全部内部批次；表中的目标测试/build/VM是最终覆盖标准，不要求每个小步立即执行。

仅当最小复现会实质改变定位/修法、现有代码状态不能继续实现或真实安全/数据完整性需要时，才提前执行最小必要检查并记录原因；不以习惯、自签局部完成或每批提交为由反复测试/compile/build。已经运行的原子构建完成后再切换，不强停或清锁。期间各批保持原文件/问题边界，未验证源码留本地，不冒成功提交。

统一测试阶段仍先单目标文件、全局串行，按最终diff的影响闭包顺序运行必要文件/消费者；不是直接npm test/并行全量。已有未变证据复用。测试专用修改复用有效dist，不自动build；确需构建时一次覆盖全部当前产品修改，按最终输入履行原语法/VM门禁。只有新失败/新改动才返修和定向复验，不能预先承诺“只准一次”而跳过真实失败。

构建和安装留在最后且仅在必要时执行，修复过程中不逐次打包安装/升级；最终必要安装由总控结合明确成品版本、验证及既有精确权限统一安排，不自动扩大到发行、旧Worker更新或远端操作。本人未要求此刻安装，现阶段继续源码排查修复。

## 批次与文件写入边界

每批2–3强相关问题、最多8个源码/测试/文档文件，生成dist不计；同一Terra连续，不另建代次/执行者。R14M/N/O先对照原断言与有效日志，仅确缺才写，不为名字相似先重跑全部文件。测试专用补缺若暴露真实缺陷，可在R14A/B/C对应源码最小修复并计本批总文件数；其他边界/共享协议/整文件删除或新权限由总控先修订。产品保护/支持入口不因测试替身移除。未需修改的文件不制造差量。

| 步骤 | 写入边界 | 目标与终点 |
| --- | --- | --- |
| R09 入口证据对账 | manual/coverage及execution由唯一Terra维护，不改产品 | 先复用既有中英文记录对应producer/handler、对象和证据类别；164处静态来源已对账，不重查同一清单，静态/实例/按钮逻辑分母分开，未知不编数 |
| R10 本机正常UI与结果 | 专用Temp合成项目与既有manual/coverage；无本批产品修改 | 未变的真实导航/选表/行内/右键/目录/拆表/导出/过滤证据直接复用；只补真实新缺口，核对象及必要最终文件，取消仅preview |
| R11 Worker相关插件逻辑 | 既有UI/API记录及受控方法测试；不检查Worker健康 | 验按钮目标/Worker绑定、请求/反馈、离线/未知/失败呈现；服务器是否正常及GPU/tmux服务可用不是本轮验收目标。rjj8仅在具体已授权用例必需时配合，不增服务器排查 |
| R12-I 旧隔离准备退出本轮 | 保留已有授权、实际只读结果及历史未测，不继续部署/排查 | 用户最新只查插件，父目录规范归属/写权限、独立认证/端口/window/runtime准备不再是本轮前置；未验证不标通过，既有目录/文件/服务保留，不自动删除 |
| R12 同步与PLAN按钮逻辑 | 复用现有受控测试/协议证据；不改或启动真实项目任务 | 验消息→host→API的目标/参数、权限确认、取消、成功/拒绝/异常反馈、状态及精确窗口/任务绑定；不要求真实上传/派发/停止才能结案，不弱化生产同步/Agent/就绪/归属门禁 |
| R13 命令与条件入口 | 既有manual/coverage及下面命名测试范围 | 常用/高级/动态/错误重试/维护入口按插件行为核证；真实无对象不制造服务器状态，使用受控替身验证现存producer/handler。selector、退役、无producer及真实UI未测明确分类 |
| R14A 面板/对象传递缺陷返修 | 仅src/ui/PanelHtml.legacy.ts、src/ui/PanelHtml.ts、src/extension/legacy.ts、test/features/panelMessageDispatch.test.js、test/features/resultSectionRefreshDependencies.test.js、test/ui/resultActionWorkflow.test.js、test/ui/resultMappingEditor.test.js | 只修本补验真实发现问题，最多7文件；共享monolith独占，不加新功能/兼容框架，不改科研语义，必要目标回归和原入口复点 |
| R14B 命令注册缺陷返修 | 仅src/extension/ProviderCommands.ts、src/factories/CommandFactory.ts、test/factories_integration.test.js、test/features/windowsWorkflowContract.test.js | 真实正常命令缺绑定/对象传递问题才启用，保留旧入口与原断言/时限；不恢复获准退役行数门禁 |
| R14C 基础结果消费者缺陷返修 | 仅src/ui/sections/ResultsSection.ts、src/extension/ResultCollectionHost.ts、src/cli/commands/result.ts、test/cli/simpleCli.test.js、test/features/archivedOnlyResultCsvViews.test.js、test/ui/currentPlanWorkflowResultCache.test.js | 真实保存/列映射/拆表/导出或当前消费者缺陷才启用；保留AP/macro_f1/weighted_f1、真实维度/来源/身份，不改旧结果，不以修测试代修产品 |
| R14D1 MCP 接入配置闭环 | 仅 src/extension/legacy.ts、src/mcp/ToolCatalog.ts、src/mcp/ToolResults.ts、package.json、test/features/mcpProject.test.js、test/features/projectWorkspaceChangeIsolation.test.js、test/features/projectMetricPartition.test.js、docs/simple-experiment-setup.md；批准边界8文件，实际无需修改的文件不制造差量 | 用户上述追加授权；复用现有 MCP/共享配置边界，补齐读配置→据任务写入→回读/必要解析刷新与真实同步状态；指标分组测试改为保留真实指标、不按类型补默认，原单遍历断言保持，不新增/修改性能断言；保留旧失败，不写旧 Worker/消费项目、不加框架 |
| R14D2 接入展示与退役设置收口 | 仅 src/ui/PanelHtml.legacy.ts、src/ui/PanelHtml.ts、test/features/adapterTaskTypeLabelClarity.test.js、test/features/settingsSecondaryView.test.js、test/ui/resultMappingEditor.test.js、test/features/setupGuideWithoutBundledDocs.test.js、docs/simple-experiment-setup.md、docs/experiment-integration.md；批准边界8文件，和 D1 顺序执行；package.json 仅保留 D1 修改，SettingsSection.ts 与未改的 windowsWorkflowContract.test.js 不纳入本批写入 | 移除各位置任务/输出规则及列映射/derivedMetric 手填保存流程，保留 MCP 状态和可导航只读摘要、正常结果操作；指南指向当前仓库 master 并明示插件版本、复制 MCP 任务；保留剪贴板、CSV/映射契约及基础断言；移除退役专属残留，原 build/生成 script VM和源码宿主复点，旧安装残留分清 |
| R14E 取消连接配置零写入 | 仅 src/extension/legacy.ts、test/features/workerRouting.test.js；最多2文件，独立D1/D2 | configureWorkerTunnels取消与完成共用break后错误保存；取消丢弃草稿，无持久化或已保存提示，明确完成才保存一次；configureXshellSavedSessions/configureXshellRealtimeTunnel共用别名同样覆盖。受控替身核首层取消/草稿后取消/明确完成，不写真实共享Worker配置；连接/拓扑/授权保持 |
| R14F 接入引导文案修正 | 仅 src/extension/legacy.ts、test/features/planOutputGateAlignment.test.js、test/features/projectOnboardingSuggestionsCache.test.js、test/features/projectQuickStartWorkflow.test.js；最多4文件，同一 Terra 顺序实施 | 修正 output gate diagnostics/fixes、onboarding 和 adapterRulesPartialReason 的旧手填规则/映射/正则提示，改由 AI 根据实际任务通过 MCP 配置；保留原判定、输出契约、摘要限制及缓存/遍历/性能断言，不制造无关测试差量。真实函数定向验证提示与原门禁，空 PLAN 不冒正式运行证据 |
| R14G 输出接入非必经手填 | 仅 src/extension/legacy.ts、src/ui/PanelHtml.legacy.ts、test/features/projectQuickStartWorkflow.test.js、test/features/projectCommandPaletteWorkflow.test.js；最多4文件，F 后顺序实施 | bootstrap 缺输出时不再自动 generateOutputAdapterFromUi，不以打开接入文件手编作为必经；completion 与未就绪提示/动作改到现有 AI/MCP 配置说明或只读摘要导航，复用当前已有入口，不新增配置框架。保留明确主动调用的生成/打开兼容命令及 handler、现有输出就绪校验和项目切换防护；定向回归未修改的 projectWorkspaceChangeIsolation 消费者。无输出不能冒可运行，旧失败留存 |
| R14H 离线刷新准确反馈 | 仅 src/extension/legacy.ts、test/features/manualWorkerRefresh.test.js；最多2文件，同一 Terra 顺序实施 | manualSnapshot 已存在 offlineBundle 时准确反馈本机刷新/已导入，不继续无条件要求导入；确无 bundle 时仍提示导入。保留离线不联网、刷新本机元数据/选择与 postState、真实错误呈现及原 Python fixture/P0 时限。基于真实 bundle 状态，不加探测/回退/性能阈值 |
| R14I 接入任务工具选择准确性 | 仅 src/features/SetupGuideSource.ts、test/features/setupGuideWithoutBundledDocs.test.js、docs/experiment-integration.md；最多3文件 | 修正复制任务/指南0.3的插件API强制要求；按消费项目规则、已有授权与工作流选择脚本/CLI/scheduler/SSH/tmux/标准传输或插件。实际用插件才发现匹配实例与capabilities/OpenAPI，不猜参数。指标/输出/列映射/别名仍由AI经MCP配置回读，指南字段段落同步；保留启用Worker、真实退出码、多行复制、版本/指南、授权及confirm/pathConfirmed边界，不擅自训练/上传/覆盖/删除、不借换工具绕R12受控确认。原检查/生成门禁及专用宿主复制全文回读 |
| R14J 拆表完整值选择 | 仅 src/ui/PanelHtml.legacy.ts、test/ui/resultDatasetHierarchy.test.js；最多2文件 | latestResultCatalog已保留完整唯一值；去掉renderer的slice(0,100)，使第101值可搜索/选择。保留搜索、选择持久、可见项全选/清选、来源/字段切换及拆表对象。复用createRenderer核101唯一值末项展示/搜索/选择，属正确性，不增性能阈值/压测或改原断言/时限。旧兼容catalog的200分支不在当前链，不扩改；原目标/build/HTML VM及专用夹具门禁，不改旧结果 |
| R14K 离线实时刷新反馈 | 仅 src/extension/legacy.ts、test/tunnel/manualGpuSchedulerSnapshot.test.js；最多2文件 | 运行进度/GPU当前刷新入口在offline_import静默return；仅两分支明示无法实时刷新，保留不联网、现有状态、在线成功/失败、发起generation/client绑定。真实方法替身核消息与零远端调用，旧断言/超时保留、不增性能测试；原目标/build/VM及两处专用宿主复点。无producer的manualTracesSnapshot不扩改 |
| R14L tmux查询状态准确性 | 仅 src/ui/PanelHtml.legacy.ts、test/ui/tmuxWorkerAndRichLog.test.js；最多2文件 | 空sessions不证明已查；ok:false/failed为失败，available:false不可用，ok:true且available:true为空查询成功，其余未核实。host把成功message放入error，非空不能单独判失败。缓存保留已有available/必要status，使即时消息与重绘一致，保留stalled、真实错误、成功列表/Worker绑定。不改缓存生命周期/重试/超时/附着/窗口动作。真实renderer及消息分支核初始/失败/不可用/成功空含no tmux server说明与重绘；原门禁及专用离线复点保持，不联网/改runtime |
| R14M Worker按钮绑定补缺 | 仅 test/features/serverConfigSaveContinuation.test.js、test/tunnel/backgroundTunnelHost.test.js、test/features/resourceMutationRouting.test.js、test/features/panelMessageDispatch.test.js；最多4个测试文件 | 先核已有断言/原有效日志；仅确缺时补五卡共用导入/保存/启动/删除的endpointId、scope、确认取消、成功/失败和状态。真实方法/renderer与受控依赖，禁止写共享配置或启停隧道；同通路对象差异用参数化用例，不逐卡重做有效实点 |
| R14N 任务及操作按钮补缺 | 仅 test/features/panelMessageDispatch.test.js、test/features/failedJobRecovery.test.js、test/features/runtimeLogAnalysisHost.test.js、test/features/planStopClear.test.js；最多4个测试文件 | 仅补现有任务/job重跑、审核、分析、精确停止/清理、日志入口的对象绑定/确认/取消/终态缺口；受控替身不接远端、不造真实队列或执行删除，不要求新任务/训练；复用原有效调度/产物/取消围栏证据 |
| R14O 结果归类与渲染恢复补缺 | 仅 test/features/datasetResultCatalog.test.js、test/ui/resultCommandPhaseRouting.test.js、test/features/panelMessageDispatch.test.js、test/features/panelWebviewScriptHealth.test.js；最多4个测试文件 | 仅补autoMatchPlanDatasets/applyPlanDatasetMapping、PLAN原始/追溯入口及渲染失败重试/重载的绑定/授权/反馈缺口；复用现有parser/renderer，异常只在受控测试，不破坏实际UI或改旧结果 |
| R15 生成与最终交包 | 原生成器独占dist；Terra维护执行证据和scopedGit，总控维护计划/索引 | 只因产品输入变化做规定build/VM及受影响验证；完整插件逻辑小验收后交总控B01–B03，不重复有效检查；当前不打包/安装/发行 |

## 小验收与最终验收分工

各小项归Terra，B项只由总控在完整包就绪后执行；目标是插件正确性，不是实机运维通过。相同输入的证据复用，不能换名重跑；受控证据不升级为真实远端效果。

| 项 | 必须证明 | 证据与边界 |
| --- | --- | --- |
| S01/R09 | 现有中英文记录与入口/对象/handler正确对应，类别/未知可定位；不重复盘点164条 | manual/coverage原记录、现有diff和必要差量；动态总数未知照实保留 |
| S02/R10/J | 本机结果入口对象、映射摘要、来源/字段切换、101值搜索选择、拆表导出及必要最终文件正确 | 既有合成实点/renderer/解析证据，未变不重做；API/CLI与GUI分开 |
| S03/R11/K/L | Worker/GPU/tmux按钮请求目标、离线/未查询/失败/不可用/成功空与非空反馈正确 | 复用K/L真实方法测试及离线UI；不要求服务器健康、真实GPU或新服务 |
| S04/R12-I | 旧隔离准备退出本轮验收 | 已读目录结果和未验证事实保留，不再要求部署/认证/端口等证明，不记通过 |
| S05/R12 | 同步/校验/预演/运行/停止/清理插件链的身份、参数、确认取消、状态与错误契约正确 | 既有协议/host/renderer受控证据；不执行真实任务或文件破坏，不冒远端完成 |
| S06/R13 | 命令、动态条件、草稿/维护、渲染恢复入口可定位且反馈契约正确 | 真实存在UI证据与受控分支分别引用；无producer与selector不冒可执行按钮 |
| S07/R14/R15 | 仅必要缺陷修复/消费者覆盖与生成语法门禁 | 原runner/退出码/输入身份/VM，首次失败保留；无产品变化不重跑build |
| S08/D1 | MCP按任务读写回读、项目隔离/已有映射保护、真实解析与同步状态 | 实际configuration回执及受控测试，不冒Agent同步/鼠标入口 |
| S09/D2 | 各位置不要求手填接入，退役专属UI/schema不复活，正常结果功能保持 | 已核源码宿主/旧布局/设置及原目标；安装版旧残留如实披露 |
| S10/F–I | 引导、bootstrap、离线刷新和复制指南无手配必经/不实承诺 | 现有目标与真实复制/反馈，空PLAN不冒正式运行 |
| M/N/O补缺 | 三组中具体未覆盖的绑定、确认/取消、反馈/终态断言齐备 | 优先原有效证据，缺口才新增真实生产函数的受控断言；不写共享项目/远端 |
| B01 | 审最终diff/必要调用链及小项证据，插件范围每个已识别逻辑类别恰当；不把源计数、preview、替身混成全按钮实点 | 总控只补实际关联缺口，未知总数不伪造；历史未测实机与本轮范围区分 |
| B02 | UI/消息→host→现有API契约的同一项目/Worker/commandId/路径关联正确，权限确认和错误不丢；生产安全门禁保留 | 用已有受控/真实证据对账，不以真实Worker部署/训练/远端产物闭环为前置，不重跑S项 |
| B03 | 最终源码/生成物/界面与测试证据适用候选一致，scopedGit真实，发行/安装/部署状态不冒报 | Git后仅核新增提交关系，不做包后冒烟或额外全仓审计 |

B项失败须真实工具把复现、期望/实际、影响、原证据、保护/修法边界及定向重验标准交Terra，不在final列完缺陷让双方idle；通过也明确基线、结论、真实未测/范围及交付边界。根因与真实返修按既有生命周期，不新建审查代理或冗余报告。最终仍由总控判断。

## 必要检查、Git与结案

全局一个node/python检查执行者；先目标单文件 `node --test --test-force-exit --test-timeout 20000 <file>`，20秒未退出停止、不重试、不改生产代码求绿。Python不得全import/exec生产cluster_agent/scheduler，不用python -c长脚本；spawnSync设置timeout≤10000、windowsHide并断言真实status0；进程存活测试可注入替身。保留旧性能/缓存/覆盖/超时，不新增压测/阈值；确需性能测试先由本人确认人数/任务量/可接受等待。

纯文档/接续/对账不重跑产品。先集中完成可查可修范围，最终统一验证；测试补缺复用已有效编译产物，仅运行实际变化目标及必要消费者，不因改测试再跑完整286。全部当前真实src/runtime/Panel修改汇总后，必要时统一按build-test-delivery及项目规定做 `npm run build -- --max-parallel 1`、node-c、模块VM和实际HTML每个script VM。Panel外层模板反斜杠必须双转义或String.fromCharCode；不得裸转义。10890业务零命中；探测从每Worker配置取实际host/port，不加固定127.0.0.1:18765门禁。compact gate按既有dryRun裁决，不能跳过。测试/生成冻结所有受检输入，结束再集中记录。

生产Worker-only、科研环境由消费项目管理、自动同步/全部已启用Worker就绪/正式目录、精确tmux窗口/取消围栏/最终manifest等现有契约保持；本轮缩小的是验收对象，不是允许削弱运行保护、用旧快照冒活动、按PID/端口杀进程或改变科研数据。测试里模拟条件不改变真实配置/授权。

集中验证覆盖最终候选后，Terra核实际diff/status，再按原批次scope分别只暂存已验证文件；没有本批适用有效检查时不提交为成功批次，不为早提交反复构建。不混三份未闭合记录、runtime输出/报告/秘密/无关约60个VSIX摘要，不删除它们。既有master→origin/master普通ff提交/push/fetch等值；远端前进/凭据/保护/hook阻断停报，不rebase/merge/force/改remote/覆盖历史。源码、发行、安装、远端部署分别报告；修复阶段不发包/安装/升级，最终必要安装统一安排，不自动发布或更新远端Worker。

本轮结案是当前已识别插件入口/调用链的必要正确性证据齐、真实缺陷修好、B01–B03明确通过、适用scopedGit完成；不再等待Worker正常运行/新服务器或准确按钮总数。报告清楚真实UI、受控测试、preview、历史与实际外部效果未测；范围退出不写测试通过。旧G001/G002结论保留，不宣称所有服务器/真实训练/所有按钮实机流程均完成。全部当前条件齐后才能标本轮完成，否则报精确插件缺口与下一动作。
