# G003 插件功能与按钮正确性检查

## 当前状态与已完成检查点

2026-11-20本人“继续吧”已恢复G003，替代11/17暂停及暂不发Terra消息；目标仍是所有支持按钮逻辑、完整PLAN运行和结果汇总正确性，高影响优先、同文件集中修改、最终统一验证。当前范围基线0d1862243128e479e54e98d9c0f22e210f5330f7，全部源码/生成物/测试和明细dirty保留未提交。

原ad31204a/af2697f子范围、280已选任务/10门禁/6按需未运行、旧失败及R13说明操作未知均保留execution，不代总体完成；R12-I退出而非通过，安装版未含修复。最新build日志2026-11-20T07-10-36-534Z-612-build为291/291、10门禁、退出0、并发1、锁释放，无按需未运行；buildId a86b0eb9962f29fa3128f9beac223a21965a52ae41eca41651ec51b3618051f8。总控已核原run/起止指纹/实际并发/对应dist字节、同commandId贯穿预检至采集导出、R两PLAN两seed三指标均值/样本SD/拆表及Y独占link发布。noReplace成功保留一个.writing硬链接，失败暂存可能保留，不自动清理。

总体B01仍未通过：新证据对象尚写“其余入口继续归并”，部分组仍build_pending；需支持逻辑真实闭合而非只改文字，动态实例分母未知本身不阻塞。新增固定字符窗口断言已改精确persist→guard→update，remotePathConfirmation 8/8退出0，原失败保留。高级入口又发现generateTunnelScript无启用Worker时[0].config抛TypeError，以及writeXshellAgentStartupCommands缺直接方法确认/反馈断言，按Z统一补齐后再交总体包。原P–Y各命令/失败/复验/范围在execution、coverage和Terra工具记录，不重复有效检查。

## 当前目标与用户裁决

2026-11-17 本人明确：“我只是为了查插件功能和按钮是否正确，不关心worker是否工作正常，所以不需要查这些服务器，使用rjj服务器也只是为了配合检查插件”。本条替代旧的“先证明独立Worker环境再验所有真实流程”前置。总体目标包括所有支持的按钮逻辑与完整PLAN运行/结果汇总链：插件入口、对象/参数、权限确认、预检/调度/重试停止、产物与指标的归属及统计展示/导出正确；不是服务器运维或科研训练结果验收。跨段检查必须串接实际生产函数，不能将互不关联的局部用例相加冒完整链路。

停止把Worker健康、科研环境、父目录写权限、独立认证/端口/窗口、Agent部署和新隔离环境准备列为结案前置。不再为了覆盖按钮创建/运行真实任务、检查其他服务器或修改现有项目。rjj8仅在具体插件用例确需且已有精确许可时作为配合环境；依赖不满足可用受控替身验证插件契约，不能改生产门禁制造成功。

先按既有中英文记录、源码位置和有效结果对账。164处静态data-command文本（98命令名）已关联证据/条件/未知，待关联0仅是文本对账完成；动态和真实未查逻辑总数仍未知。五张Worker卡的5个导入仅preview、15个保存/启动/删除未执行，是20个已知实例，不是剩余总数。不得为统计再逐项人工重查、重复实点/回归或把文字关联冒执行通过。仅补真实未覆盖或本轮改动影响的逻辑缺口；已有效检查直接复用。

用户追加需求继续有效：任务指标/输出接入由AI根据真实任务通过MCP配置并回读，不要求手填表单、正则、JSON/YAML；退役PPT等专属设置/动作/UI残留删除，基础功能及历史数据保留。G001/G002已交付，G003继续同一代，不建G004；next=4仅为索引计数。

## 角色、资料与连续执行

- 总控兼最终验收：《项目总控与长期规划 · C方案接替》01a1e412-ead7-7710-acd7-c475abb8b41a/local，Sol/high/Standard，独占本计划、索引、共同角色说明及B01–B03结论，不实现产品后自签。
- 唯一Terra：01a1e793-a4a0-7630-8157-24c920746d1a/local，Terra/high/Standard，独占execution、manual/coverage、现任指针、UI/检查/生成租约、返修事实/踩坑及授权scopedGit。旧Terra因真实接续条件交班归档；旧独立Sol已完整移交R13十位置等有效结论并归档，不唤醒或新增替代角色、Luna、调度/监控。
- 唯一事实：[执行登记](G003-execution.md)、[覆盖记录](../windows-entry-coverage.json)、[人工原记录](../manual-acceptance-checklist.md)。已完成过程与原日志不复制进新报告。原G003基线886139eb9ba3c3e94f383916daaeb096074c5108仅历史；当前继续基线af2697f（含源码ad31204a），Git/运行身份以实际读取及execution最新事实为准，不重提交旧成果。
- 通用接续、计数、正确模型/强度/default实核及自动同角色新建/消息/归档唯一遵循[统一入口](C:/Users/ZLK/.agents/skills/caveman/SKILL.md)及[交班模板](C:/Users/ZLK/.agents/skills/caveman/references/handover.md)；分工遵循[多会话实现](C:/Users/ZLK/.codex/skills/multi-session-implementation/SKILL.md)。不在项目复制阈值或算法，不为小进度换角色。
- 预算：计划24000字符、execution16000、长期踩坑12000；90%时在正常非冻结窗口整份语义归并，保留全部未决/授权/失败/原证据，不能只削到阈值、硬截断或另造存档搬文字。相同文件先汇总本阶段已知改动，内存核预算，一次写入/集中回读；有新事实/真实失败再增量，不为标点措辞反复编辑计数。

Terra完成全部当前范围实现和S01–S13、M/N/O/P/Q/R/S/T/U/V/W/X/Y/Z及其余实际逻辑补缺→真实工具交总控完整包→总控独占B01–B03→失败真实工具详返原Terra修复/定向自验/再交→最终明确通过及既有授权交付→总控结案。完整包给最终基线/diff、原命令与真实退出码/日志、证据适用输入与含义、真实失败/未知/未测、权限保护和租约。常态总控空闲，Terra普通进度记execution，仅真实新决策或完整交包联系。

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

## 集中修复、优先级与统一验证

本人要求非必要不构建安装，先把可查可修的独立项尽量做完，同文件汇总一次修改，再冻结最终候选统一验证。只有最小复现会改变定位/修法、代码状态阻断后续或真实安全/完整性需要时提前最小检查并说明原因；内部步骤不增人工确认/逐小改build，已在途原子构建正常完成、不强停清锁。真实新修改/失败才增量返修，不预承诺只准一次。

优先错任务派发、身份丢失、错误收集/统计/覆盖数据，再恢复取消与反馈，不做无关润色。以既有中英文对账、当前静态/动态producer及公开命令/handler为集合，按等价对象族关联实际断言/日志，或准确退役、无producer、selector、契约外分类。缺真实对象可用受控生产函数证据，不能当通过；不重盘164项/有效实点，文件名或绿色构建不能证明跨段断言。

仅测试/文档改变复用有效dist/全量，单目标及实际消费者串行；真实产品最终统一build/VM。未验证源码留本地，不因分scope提交重复构建。最终必要安装由总控结合明确版本、验证及原精确权限统一安排；现阶段不打包/安装/发行/旧Worker更新。

## 批次与文件写入边界

每批2–3强相关问题、最多8个源码/测试/文档文件，生成dist不计；同一Terra连续，不另建代次/执行者。R14M/N/O/P/Q/R先对照原断言与有效日志，仅确缺才写，不为名字相似先重跑全部文件。测试专用补缺若暴露真实缺陷，可在R14A/B/C对应源码最小修复并计本批总文件数；其他边界/共享协议/整文件删除或新权限由总控先修订。产品保护/支持入口不因测试替身移除。未需修改的文件不制造差量。

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
| 已完成R14D–L成品复用 | 历史精确scope见92bd566c版计划，成品/失败/原日志见execution，非新写入许可 | D接入及退役契约见前文，原CSV/遍历/性能/剪贴板保持。E连接配置取消丢草稿零保存、明确完成一次。F/G引导AI/MCP、不自动生成adapter或必经手编，主动兼容入口和输出/项目门禁保留。H offlineBundle本机刷新如实且离线不联网。I一般科研/传输工具可选，实际用插件才发现接口，不绕受控确认。J101值完整可选，旧不在链200分支未改。KGPU/进度离线反馈准确，generation/client保持，无producer的manualTracesSnapshot不扩改。Ltmux空非已查：ok:false/failed失败、available:false不可用、ok:true且available:true空为查询成功，其他未知；成功message可在error，非空error不能单判失败。缓存available/status重绘一致，stalled/Worker/列表及原生命周期/重试/超时/窗口契约不变 |
| R14M Worker按钮绑定补缺 | 仅 test/features/serverConfigSaveContinuation.test.js、test/tunnel/backgroundTunnelHost.test.js、test/features/resourceMutationRouting.test.js、test/features/panelMessageDispatch.test.js；最多4个测试文件 | 先核已有断言/原有效日志；仅确缺时补五卡共用导入/保存/启动/删除的endpointId、scope、确认取消、成功/失败和状态。真实方法/renderer与受控依赖，禁止写共享配置或启停隧道；同通路对象差异用参数化用例，不逐卡重做有效实点 |
| R14N 任务及操作按钮补缺 | 仅 test/features/panelMessageDispatch.test.js、test/features/failedJobRecovery.test.js、test/features/runtimeLogAnalysisHost.test.js、test/features/planStopClear.test.js；最多4个测试文件 | 仅补现有任务/job重跑、审核、分析、精确停止/清理、日志入口的对象绑定/确认/取消/终态缺口；受控替身不接远端、不造真实队列或执行删除，不要求新任务/训练；复用原有效调度/产物/取消围栏证据 |
| R14O 结果归类与渲染恢复补缺 | 仅 test/features/datasetResultCatalog.test.js、test/ui/resultCommandPhaseRouting.test.js、test/features/panelMessageDispatch.test.js、test/features/panelWebviewScriptHealth.test.js；最多4个测试文件 | 仅补autoMatchPlanDatasets/applyPlanDatasetMapping、PLAN原始/追溯入口及渲染失败重试/重载的绑定/授权/反馈缺口；复用现有parser/renderer，异常只在受控测试，不破坏实际UI或改旧结果 |
| R14P PLAN预检至派发连续性 | 仅 test/features/planValidationOperationPayload.test.js、test/features/idleGpuDispatchLifecycle.integration.test.js、src/extension/legacy.ts、src/features/DistributedPlanQueue.ts、src/clusterSchedulerRuntime.legacy.ts；最多5文件 | 将真实runPlanPreflight/确认/入队输出传入真实分配/dispatch，核同一PLAN/revision、稀疏index、case/seed、output_dir/result_csv、Worker与commandId，至少两个作业不互换；取消/失败预检零入队/零派发。复用原断言，传递实际前段结果，不另造独立队列冒跨段；不连接Worker或改变协议 |
| R14Q 协议2完成至正式汇总 | 仅 test/features/freshResultHost.test.js、test/features/nativeResultManifest.test.js、test/_helpers/resultCollectionScenario.js、src/extension/ResultCollectionHost.ts、src/results/FreshResults.ts、src/results/LatestResultExport.ts、src/results/NativeResultManifest.ts、src/extension/legacy.ts；最多8文件 | 用实际入队/分配身份构成受控协议2观察/manifest输入，走真实fresh collection→latest export/catalog，核plan/job/index/case/seed/worker/command/output/result；错command或路径不得进入正式汇总，非零/异常沿原review契约。不以delete lifecycleProtocol的旧owner流程代协议2，不写远端或造真实任务 |
| R14R 指标维度至展示导出 | 仅 test/features/datasetResultCatalog.test.js、test/features/freshResults.test.js、test/_helpers/resultCollectionScenario.js、src/extension/ResultCollectionHost.ts、src/results/FreshResults.ts、src/results/LatestResultExport.ts、src/results/ProjectResultTables.ts；最多7文件 | 优先共用Q既有最小夹具，将同一实收CSV的AP/macro_f1/weighted_f1经真实收集、汇总、catalog及JSON/CSV/Markdown/拆表贯通。两个seed、三项不相等指标，核现有契约的均值/样本数/seed、dataset/method/PLAN归属，另PLAN同名case不串组；不新增未承诺统计字段或科研结论，不改指标语义或性能阈值 |
| R14S 分支项目打开与移除登记补缺 | 仅 test/project/branchProjectRegistry.test.js、src/extension/legacy.ts；最多2文件 | 现有登记服务/PR用例不证明openBranchProjectFromUi与forgetBranchProjectRegistrationFromUi行为。复用原AST方法夹具，用受控projection/service/vscode/lease核精确id及祖先/分支对象、当前项目不重复打开、确认取消零动作、确认后正确root及forceNewWindow、forget的kind/id及刷新反馈；取消不调用forget。保留原选择/缺失对象语义，只在真实可达缺陷时最小修生产方法。不得打开真实窗口、改真实登记或执行Git/文件删除；不把移除登记扩成目录清理，不增性能/超时/框架。P/Q/R优先，此项与其余补缺连续完成后统一验证，不单独构建安装 |
| R14T1 分支登记与创建余项 | 仅 test/project/branchProjectRegistry.test.js、src/extension/legacy.ts；最多2文件 | 同一阶段集中归并registerAncestorProjectFromUi/registerBranchProjectFromUi/createBranchFromAncestorFromUi的既有真实行为证据，确缺才以原AST夹具补对象/目录选择、Git身份拒绝、确认取消零服务写调用、确认后参数/preview digest/lease与刷新反馈。所有service/Git/窗口依赖受控，不创建真实worktree或登记 |
| R14T2 分支提交与状态结果余项 | 同T1两文件；最多2文件 | submitBranchPlanRunFromUi的登记根与所选PLAN贯穿route/list/preview/submit，空列表/选择取消/预览拒绝/最终取消零提交，started/notStarted/unknown反馈和刷新正确；refreshBranchRunsFromUi/compareBranchResultsFromUi只补现有调用链尚未证明的对象/状态身份、空与错误呈现。复用localApi等既有RPC/队列证据，不启动真实任务或窗口，不把请求接收冒完成 |
| R14T3 分支源码核验与PR余项 | 同T1两文件；最多2文件 | verifyBranchHeadBindingFromUi核登记根、损坏/无清单、选择取消、所选PLAN/revision/executionSource与HEAD传递、绑定成功/失败的state及反馈；核验不宣称科研完成。createBranchPrFromUi/mergeBranchPrFromUi仅归并或补真实UI接线缺口，已有PR/快进有效证据不重做。不得stage/commit、真实RPC/Git/PR或放宽原确认/源码/收据门禁 |
| R14U 曲线打开入口补缺 | 仅 test/tensorboardScalar.test.js、src/extension/legacy.ts；最多2文件 | 核openScalarViewerFromUi真实方法：选中endpointId先验证目标，无可用Worker拒绝、合法viewer URL精确绑定endpoint及workspace，启动等待期间换workspace/client不得打开，openExternal拒绝/异常准确上抛、成功一次返回。受控本机API/vscode/timer，不启动真实服务/浏览器或连接Worker；保留既有20次/100ms契约，不新增性能/重试/超时或改底层曲线统计；现有查询/渲染有效证据复用 |
| R14V 归档恢复入口补缺 | 仅 test/features/archivedPlanRestoreWorkflow.test.js、test/features/projectWorkspaceChangeIsolation.test.js、test/features/planArchiveBundleWorkflow.test.js、src/extension/legacy.ts；最多4文件，未需修改者复用 | 真实restoreArchivedPlanFromUi接现有恢复/安全路径函数，以受控fs/确认/项目上下文核归档来源、新版本目标与独立输出/资产命名空间，确认取消零mkdir/copy/write/persist，选择期间或后续异步边界换项目停止后续写入/选择落盘，成功目标/恢复记录/resultScope及PLAN选择一致；不把已发生的先前写入冒零写。保留归档/原结果、不覆盖用户文件，不实际恢复消费项目或清理，不以源码正则代行为。必要时只最小修真实可达缺陷，不改恢复协议/权限/指标语义 |
| R14W 设置与维护行为补缺 | 仅 test/features/remotePathConfirmationWorkflow.test.js、test/features/projectUiLayoutState.test.js、test/tunnel/tunnelPortConflict.test.js、src/extension/legacy.ts；最多4文件、3个相关问题 | 一次集中补resetRemotePathConfirmationsFromUi/resetUiLayoutFromUi/repairTunnelPorts真实方法断言。路径提醒核当前项目、空/取消零清除与持久化、异步切项目停止后续效果、确认后仅清当前项目提醒及旧兼容键；布局核既有global模板与项目布局/动作重置及切项目不向新面板post旧状态；端口核实际Worker冲突host/port/目标、无冲突/取消零configure、明确选择只路由configureTunnelPorts，保留不自动改Xshell/不启停连接。依赖受控、不写真实共享设置/文件、不联网；只修实际可达缺陷，保留原配置scope，不能给application操作强加项目门禁，不恢复Hub、不新增确认/性能/重试/超时/框架，原探测/分配器/渲染有效证据复用 |
| R14X 远端路径安全规则保存与消费 | 仅 test/features/remoteRootPolicyUi.test.js、test/api/localApi.test.js、src/extension/legacy.ts、src/features/ApiWorkflow.legacy.ts；最多4文件，独立W的内部组 | 已核UI承诺每行绝对POSIX目录、禁止优先，但saveRemoteRootPolicyFromUi及normalizedRemoteRootList静默滤掉normalizeApiRemotePath不能表示的非空项，deniedRoots为/会变空。先受控复现，保存前验证整组allowed/denied，任何无效项零配置写且不报成功；直接配置消费同样明确拒绝，不能继续按空策略放行。按既有契约处理非绝对/含..等实际无效项；空行/空列表及正常规范化保持，合法禁止前缀优先于允许，父/子/相邻目录语义保持。不扩展/为允许或禁止全盘的新含义，不改通用normalizeApiRemotePath消费者、不新增安全策略/配置/框架。核当前folder.uri和WorkspaceFolder目标、切项目反馈及错误上抛；所有配置/fs/外部调用受控，不写真实安全设置。共享helper只按真实边界复用，不为测试改产品导出 |
| R14Y 恢复文件无覆盖发布 | 仅 src/state/StateStore.ts、src/extension/legacy.ts、test/features/stateWriterIsolation.test.js、test/features/archivedPlanRestoreWorkflow.test.js、test/features/projectWorkspaceChangeIsolation.test.js、test/features/planArchiveBundleWorkflow.test.js；最多6文件，未需修改者复用 | 已核beforeRename查不存在后fs.rename仍可覆盖期间新出现目标，进程内队列/合作host租约不能证明文件系统无覆盖。复用StateStore提供最小显式无覆盖发布，仅恢复新Plan/记录使用，普通写默认/串行/来源身份/重试不变。完整内容发布且目标已存在则失败保留原字节，不再靠一次存在性检查，不退化为先删/覆盖或静默回退；错误/暂存如实保留，不自动清理。受控注入检查后目标出现并接真实文件系统核旧内容不变，成功新文件完整、默认写仍保持原契约，恢复预览/身份/项目切换与COPYFILE_EXCL保护继续有效；无性能测试/新通用框架 |
| R14Z1 高级脚本生成入口 | 仅 src/extension/legacy.ts、test/tunnel/multiXshellCommandBuilder.test.js；最多2文件 | 真实generateTunnelScript无启用Worker时明确提示且零保存/写入，不解引用空数组或读取旧Hub。核配置无效、保存取消、单/多Worker、bat/ps1选择及实际host/port/目标；原生成器有效证据复用。不执行脚本/连接或写真实设置，仅最小修现存缺陷 |
| R14Z2 高级Agent登录写入入口 | 仅 src/extension/legacy.ts、test/features/agentPreparationLifecycle.test.js、test/tunnel/backgroundTunnelHost.test.js、test/features/panelMessageDispatch.test.js；最多4文件 | writeXshellAgentStartupCommands真实方法核显式Worker筛选、空目标、路径/最终确认取消零patch/策略写、成功/跳过/失败返回与准确反馈；单Worker失败不误写其他Worker或报全成功。保留managed/preserveUnmanaged/精确会话备份，受控patcher/vscode/配置，不实际改xsh或更新Agent |
| R14Z3 高级入口同族归并 | 仅 src/extension/legacy.ts、test/features/lowTrafficDisplayRework.test.js、test/features/agentPreparationLifecycle.test.js、test/features/projectWorkspaceChangeIsolation.test.js、test/tunnel/xshellIntegrationCheck.test.js、test/tunnel/backgroundTunnelHost.test.js、test/tunnel/multiXshellCommandBuilder.test.js、test/features/panelMessageDispatch.test.js；最多8文件，内部按流控/诊断/连接3类有界处理 | 15高级命令及同族公开入口先复用真实行为/原日志，缺口才补选中目标/参数/取消/错误反馈。流控不停止科研任务，诊断只受控路由、不探真实服务器，连接不实际启动。菜单隐藏/无对象非逻辑通过；无缺口不造差量，超文件/协议/权限范围一次合并升级 |
| R15 生成与最终交包 | 原生成器独占dist；Terra维护执行证据和scopedGit，总控维护计划/索引 | 只因产品输入变化做规定build/VM及受影响验证；完整插件逻辑小验收后交总控B01–B03，不重复有效检查；当前不打包/安装/发行 |

原285/285（6按需未运行）和a86b候选291/291按原输入保留。P/Q同commandId与Y真实无覆盖发布已补并经总控核；Z产品输入变化后集中必要验证，不拿旧fingerprint冒新候选，仅文档/测试返修按增量复用。

T1–T3为同一连续分支UI收口阶段的内部有界组，P/Q/R优先；先汇总同两文件内所有已知缺口，一次集中实现后统一目标验证，不逐方法请求计划、逐小组构建或重跑有效服务测试。生产文件仅修本家族实际可达缺陷，不改其他功能、协议、权限、性能断言/时限或引入框架；新文件/协议边界仍升级总控。

## 小验收与最终验收分工

各小项归Terra，B项只由总控在完整包就绪后执行；目标是插件正确性，不是实机运维通过。相同输入的证据复用，不能换名重跑；受控证据不升级为真实远端效果。

| 项 | 必须证明 | 证据与边界 |
| --- | --- | --- |
| S01/R09 | 已有中英文证据对应真实入口/对象/handler，静态/动态/命令类别与未知不混算 | 复用原记录，不重盘164项 |
| S02/R10/J | 结果导航/映射摘要、来源字段、101值、拆表各格式及最终文件正确 | 原合成实点/renderer/解析证据；API不冒GUI |
| S03/R11/K/L | Worker/GPU/tmux目标、未查/离线/失败/不可用/成功空非空反馈正确 | 不要求服务器健康/真实GPU |
| S04/R12-I | 原隔离准备退出当前必要范围 | 历史已查未查均保留，不记通过 |
| S05/R12 | 同步/校验/预演/运行/停止/清理插件身份、参数、确认取消及错误契约正确 | 原协议/host/renderer受控；无真实任务/删除 |
| S06/R13 | 命令、条件/维护/渲染恢复可定位且反馈正确 | 有效行为证据与selector/无producer/退役分类分开 |
| S07/R14/R15 | 真实缺陷及必要消费者、生成门禁覆盖最终输入 | 原runner/真实码/首次失败/VM；无产品变化不build |
| S08/D1 | MCP按真实任务读写回读、项目隔离/原映射保护、解析和同步状态准确 | 实际configuration及受控证据，不冒Agent同步 |
| S09/D2 | 接入不要求手填，退役专属UI/schema不复活，结果基本功能保持 | 源码宿主/旧布局/设置证据，安装版残留明示 |
| S10/F–I | 引导、bootstrap、离线刷新和复制指南无手配必经/不实承诺 | 原复制全文和反馈；空PLAN不冒运行 |
| M–O与S–Z | 各命名步骤的对象绑定、确认取消、状态/错误和必要发布安全全部闭合 | 按上表精确契约/文件；共享证明复用，不碰真实项目/Worker/配置 |
| S11/P | 同一真实预检/确认输出贯穿入队、分配和派发，取消/失败零入队派发 | 前段实际结果作后段输入；非训练/性能实验 |
| S12/Q | 协议2完成身份进入真实采集/正式导出，错command/path拒收且不串旧结果 | completion和采集契约分开，旧owner流程不冒协议2 |
| S13/R | 同一实收指标在汇总/catalog/各格式拆表的值、seed及PLAN/dataset/method归属一致 | 独立算现有schema期望，局部绿灯不冒全链 |
| B01 | 审最终diff/必要调用链及小项证据，所有当前支持入口逻辑均有明确有效证据或真实类别，P/Q/R与其他剩余缺口闭合；不把源计数、preview、替身混成全按钮实点 | 总控只补实际关联缺口，未知总数不伪造；历史未测实机与本轮范围区分 |
| B02 | UI/消息→预检/入队/派发→协议2完成证据→收集/汇总/catalog/导出的同一项目/PLAN/job/Worker/commandId/路径与指标维度关联正确，权限确认/取消/错误不丢，生产门禁保留 | 用已有受控/真实证据对账，不以真实Worker部署/训练/远端产物闭环为前置，不重跑S项 |
| B03 | 最终源码/生成物/界面与测试证据适用候选一致，scopedGit真实，发行/安装/部署状态不冒报 | Git后仅核新增提交关系，不做包后冒烟或额外全仓审计 |

B项失败须真实工具把复现、期望/实际、影响、原证据、保护/修法边界及定向重验标准交Terra，不在final列完缺陷让双方idle；通过也明确基线、结论、真实未测/范围及交付边界。根因与真实返修按既有生命周期，不新建审查代理或冗余报告。最终仍由总控判断。

## 必要检查、Git与结案

全局一个node/python检查执行者；先目标单文件 `node --test --test-force-exit --test-timeout 20000 <file>`，20秒未退出停止、不重试、不改生产代码求绿。Python不得全import/exec生产cluster_agent/scheduler，不用python -c长脚本；spawnSync设置timeout≤10000、windowsHide并断言真实status0；进程存活测试可注入替身。保留旧性能/缓存/覆盖/超时，不新增压测/阈值；确需性能测试先由本人确认人数/任务量/可接受等待。

纯文档/接续/对账不重跑产品。先集中完成可查可修范围，最终统一验证；测试补缺复用已有效编译产物，仅运行实际变化目标及必要消费者，不因改测试再跑完整286。全部当前真实src/runtime/Panel修改汇总后，必要时统一按build-test-delivery及项目规定做 `npm run build -- --max-parallel 1`、node-c、模块VM和实际HTML每个script VM。Panel外层模板反斜杠必须双转义或String.fromCharCode；不得裸转义。10890业务零命中；探测从每Worker配置取实际host/port，不加固定127.0.0.1:18765门禁。compact gate按既有dryRun裁决，不能跳过。测试/生成冻结所有受检输入，结束再集中记录。

生产Worker-only、科研环境由消费项目管理、自动同步/全部已启用Worker就绪/正式目录、精确tmux窗口/取消围栏/最终manifest等现有契约保持；本轮缩小的是验收对象，不是允许削弱运行保护、用旧快照冒活动、按PID/端口杀进程或改变科研数据。测试里模拟条件不改变真实配置/授权。

集中验证覆盖最终候选后，Terra核实际diff/status，再按原批次scope分别只暂存已验证文件；没有本批适用有效检查时不提交为成功批次，不为早提交反复构建。不混三份未闭合记录、runtime输出/报告/秘密/无关约60个VSIX摘要，不删除它们。既有master→origin/master普通ff提交/push/fetch等值；远端前进/凭据/保护/hook阻断停报，不rebase/merge/force/改remote/覆盖历史。源码、发行、安装、远端部署分别报告；修复阶段不发包/安装/升级，最终必要安装统一安排，不自动发布或更新远端Worker。

总体结案须当前支持按钮逻辑集合及整个PLAN运行、结果汇总链的剩余正确性缺口全部闭合，含S11–S13；真实缺陷修好、B01–B03针对总体范围明确通过、适用scopedGit完成。不能再以局部已识别项通过宣布总体完成。动态实机实例总数可未知，但受支持逻辑仍未知/待查不能结案；不等待服务器运维通过或强造实际训练。报告清楚真实UI、受控测试、preview、历史与实际外部效果未测；范围退出不写测试通过。旧G001/G002结论保留，不宣称所有服务器/真实训练/所有按钮实机流程均完成。全部当前条件齐后才能标本轮完成，否则报精确插件缺口与下一动作。
