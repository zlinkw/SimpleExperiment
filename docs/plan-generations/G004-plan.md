# G004 重要功能、按钮与MCP连续查修

## 当前目标、状态与唯一记录

2026-11-23本人持续要求：剩余单项目按钮、界面功能和MCP全部查清，确有问题修完；复用有效证据，不因局部问题停整批，最后统一交付。跨项目延期，真实Worker效果受限。0.5.520试行交付及限定本地UI/MCP验收已完成；其后发现的render、CSV、停止路由与当前入口问题仍在修，整代未结案。不能把137工具目录、167 action或361覆盖项当所有物理按钮及真实功能均已验。

本计划是总控唯一活动计划，执行事实在G004-execution.md和windows-entry-coverage.json。完整压缩前计划在Git `df29de92:docs/plan-generations/G004-plan.md`；更早机制、失败和审批原文见同路径6f14818d、cb44bd81、7bf49ba8、30a5d6e0、59041060、89498eff及execution内部引用。压缩不改原日志/receipt，不恢复历史待审批或已过时结论，不新建tracker/交付报告。plan cap18000/90%=16200，execution cap12000/90%=10800；按共同机制整体语义压缩。

## 角色、租约与保护

总控兼最终审查《总控·SimpleExperiment G004 集中查修与交付 接续3》01a2040c-d282-7d92-9542-abcdc0689d37/local，Sol/high，实际match/continue，最近实际default且模型/强度match；独占本计划/README及最终审查。唯一执行01a2070f-26ea-7cb2-a4f5-d715d3b51d15/local，Terra/high/priority、match/continue，持产品/API/MCP/UI、测试、execution/coverage及scoped Git租约。此前df29de92文档同步短暂交权已结束；当前执行者独占两仓串行Git/产品测试及记录租约，总控只写本计划/README，获审精确plan diff由执行者后续记录组同步。两角色不另建审查者或执行者。旧01a20584六次压缩/第五次后峰300187自然接替；更早总控01a1fdb5及执行01a203b9/01a204cc的资格、交权和归档见原Git记录，接替不重置任务/批准/证据。service_tier仅记录。

总控无独立待办、只等完整包/必要决定时按全局事件协调合法空闲，不循环wait/催进度；执行者有可做工作继续。消息只用于完整阶段包、真实阻断、当前决定和交班/租约，不索纯ack。未知在途先核归属和结果，不重放。

原仓普通Windows工作区，不是Pi/自制容器/项目管理器。master→origin/master，origin=https://github.com/zlinkw/SimpleExperiment.git。配套仓为D:/GitRepo/MCP/simple-sftp；本人最新明确“后续都允许修改SFTP插件的代码”“不需要再向我询问了”，本轮现行UI/MCP相关配套缺陷及必要消费者/回归/试行交付可直接修，不再逐项索跨仓许可。不是另起配套全功能审计或新增功能，全部真实效果/删除/特殊测试禁区仍在。两仓Git严格串行；每组≤3强相关问题/≤8非生成文件，核diff/UTF8/必要检查后scoped普通commit/push/fetch，核HEAD等于上游。不amend/rebase/reset/merge/force/换remote，不stage日志、fixture、旧VSIX摘要或其他无关资产。remote前进/认证/hooks/同步失败停相关Git升级。0aa6b27c后fetch TLS unexpected EOF首exit1及总控一次恢复fetch exit0是精确历史，不是通用重试许可。

禁止实际Worker/服务器/SSH/健康版本探测/准备同步/远端任务或结果查询派发停止/Agent部署/真实传输和取消/永久删除/跨项目效果。项目grant不是本次真实效果许可。共享Worker配置及本人授权不改；不自动切模式/reload/关闭/新profile。本人已许可直接电脑控制，仅专用验收窗口和安全本地交互，不控制稿件窗或抢其输入/剪贴板。startup公开GitHub检查及自然发现注册保留原例外。

保护GPU7全部任务日志产物、/root/autodl-tmp/zlk/MultiModal、原Agent tmux/隧道，以及MM final.md、Generic Untitled-1、Response to Reviewers.tex等未保存稿件。D:/GitRepo/SimpleMcpAcceptance只读；cleanup_20261111.txt、所有temp/fixtures和旧资产保留，不删搬/暂存。六个不入520包的原dirty dist保护：cli/ExecutionContext.js、cli/commands/result.js、cli/errors.js、features/Results/ResultParser.js、features/factories/ResultsFactory.js、mcp/Server.js。不得恢复/清理或混入源提交。

全局同时一个Node/Python测试，先原单文件node --test --test-force-exit --test-timeout 20000；20秒未退停止，不自动重试/换文件绕过/加时/改生产求绿。非超时真实失败可按新修法定向复验，保留首次完整日志/退出。Python仅提取函数及imports，禁完整import/exec Agent/Scheduler和长python-c，spawnSync≤10000/windowsHide/status0。Windows仅pwsh.exe7，显式UTF8读写与复读/diff--check。性能相关用例修改须本人精确批准，不新增压测或阈值。

## 当前功能范围与退役纠正

旧索引是导航，不是恢复功能的需求依据；先核现行producer→consumer、最新用户决定、支持输入和必要调用链，再复用有效证据。受限不等于退役。300有限逻辑ID、137 MCP、167 invoke和45命令互有重叠，不相加；动态物理按钮实例总数未知。唯一母集coverage.g004U04RemainingInventory.g004Reload519LocalAudit：原300处置206旧证条件/11问题关联/14跨项目/26本地部分外部受限/17本轮本地与外部受限/1 Agent/25清理，非通过数；边界132本地混合/79外部安全共享/14跨项目/75旧延期外部清理生命周期。旧89延期分14跨项目/27本地部分/22补证或复用/1 Agent/25清理。137另分33本地混合/49网关Worker/23清理Agent/32伴随；45=42贡献+3legacy。更新既有行的适用与当前审核状态，不因schema/目录/测试文件存在冒逐项已审，不重置既有有限有效结论。

本人明确仅保留UI/MCP，业务CLI整体已退役。39源码实际删除、50旧测试路径退休、迁出和交付均已完成，不把早期候选恢复成未批准。保留新MCP稳定launcher/resolver及中立业务，不恢复CLI参数/help/退出码、无Host history/export/download、doctor聚合、隐式PLAN默认、零握手、旧server文件/manifest或细粒度prepare便利，不新造GPU flatten视图。

本人最新纠正：整个草稿机制早已退役。默认renderDraftPlanSection为空、renderDraftCards无生产调用；draft_* MCP声明、旧自定义命令和测试是残留，不证明现行需求。错误沿旧母集继续修draft review/reject，49e1cebd及0085828b已同步但未发布；无真实草稿创建/写入。停止新增草稿调查/测试/实现，不重放其测试、不恢复Draft/Debug/Promote；不擅删整个文件、历史或夹具。已有49/49等原结果只作已执行历史，按实际非草稿消费者适用核，不要求恢复旧功能。

其他误复活防线：Hub执行拓扑已退役，旧字段只兼容读取/明确拒绝及GitHub名称，不能补成Hub目标/Agent卡。新作业declared-only，不创建attempt/旧控制锁/退出码文件或旧队列JSON重放；历史attempt只读。legacy旧attempt文案仅非declared旧/异常响应可能入，当前scheduler固定declared且拒绝新attempt路径，不能称现行确实创建或据此恢复。禁止PID/pidfd杀进程、关整tmux会话、未知停止自动force重发或任务登记阻断辅助Agent重启；现行精确command/window停止仍支持。科研环境、torch安装/依赖、adapter科研产物校验不自动塞回准备/健康；主动只读诊断仍保留。旧任务/服务器树和artifact模板无当前生产链不能补按钮，当前资源树/结果表/动态tmux仍有效但实际远端受限。U55统一五类项目授权不绑定Worker或范围checkbox；旧workers格式仅兼容，不能恢复旧选择界面。旧测试预期不能倒逼恢复不显示字段或自动重试。

## 已交520之前的修复与精确审批

本节历史完整原文保留在565c8203及df29de92同路径，不重跑已有效检查、不恢复旧待审批。R519 A1–A6、B1–B4、C1–C3均已交520；C4 CLI编码/shell/EXE方案撤销，selectExperiment套withUiCommandStatus的不可达推断撤回，公开invoke等待持久化问题独立成立。更早U01–03的20修复不是按钮数；U04原43含39单项目已交及02/05/06/07四跨项目延期，撤回项与516–519首包/VM/WSL失败、unknown均在原计划和execution保留。

MCP共用逻辑已迁src/api、src/mcp/query，同进程ALS/root/RPC/emit，无CLI子进程/global cwd/stdout回退。bin仅simpleex-mcp，新installer仅MCP，不清用户旧shim。optionalApi仅真正-32601可空，其他业务拒绝/取消/网络错传播。Artifacts只读已证本机规范根，Worker/未知位置保原身份及ARTIFACT_LOCATION_UNVERIFIED，不冒同名本机文件或空成功；原16/17→17/17及其他首失败有效边界见coverage。

PLAN显式suite/base/seeds保留，plan_matrix仅结构预览；validate/preflight保同步和正式目录实际副作用。task_dispatch原四字段、enabled Worker/明确PLAN或all配额/显式stopRunning精确原任务确认租约及job0合法不变，不加破坏性工具。SFTP120引擎经真实Gateway/Host的5/5是内存store/fs/transport证据，不是实际删除/持久化/Worker；dispose写stopped discovery并关server，不unlink；project.create未实建。

本人批准的39源删除、49旧CLI文件/302顶层测试处置、27外部引用、50精确退休、13旧job→17MCP及两helper均已实施，保原文件/夹具/历史及其余覆盖/20秒。39集合见0ee444be与coverage，经全集tracked-clean普通文件/祖先与直父无reparse/内容身份预核，逐项物理cd后Remove-Item ./叶名无Force，六组及97d723e1核39/39不存在。首call_887a6fcce30d45c4a9a7625697e86b55被policy拒绝且进程未启；同工具去只读Get-Item Force、分离预检/删除/文档Git后成功，不断言唯一平台拒因。许可不扩目录/旧dist/全局shim/temp。

B1首夹具失败并20秒timeout留TEMP/g004-r519-b1-lease-before-ff08.log；本人精确批准改后原20秒唯一3/3，可选通知脱lease，其余识别/选择/确认仍等待。首TS7.0.2 input-drift exit2/71emit、Gateway类型233f31d3及删除后391输入/emit2/exit0原日志g004-tsc-central-predelete-20261122-terra.log、g004-tsc-after-cli-removal-20261123-terra.log保留。publicCliAliases误删已恢复，不能据局部1/1称生命周期全过。

514坏SHA、vsce ls超时等价ZIP裁决、独立runtime退出未知、两次已用尽process-owner删除许可、无根workspaceState迁移owner未知均见原计划/execution，不重新授权。J01宿主Git变量VALUE0/5缺失传播未知，禁sanitize/注入/改globalGit/重启稿件。旧平台cybersecurity拒因未公开，不Daybreak/扫描/撤权或Agent生命周期专项重放，不换工具模型聊天绕限。

## 520增量证据与不可变交付

本人批准本任务“有效旧结果+当前补验”的逐identity+argv核验，不是通用缓存。原schema2/普通入口不变；G004 schema3保原receipt/direct/fresh来源，核依赖/外部输入、日志与事件SHA、真实退出、当前工具链/输入/选择/产物及required gates。旧精确Node/arch/原dirty字节未知项只有人工适用判断，不伪称精确工具链匹配。历史031为0pass/1skip、165为5pass/1skip、37为40pass/1skip；340原34只继承现存30、4CLI退休。68 parity仅证明Python核心及JS两个拒绝边界，69外部py根/字节未知仅本任务人工推断。七旧删锁job264/265/267/268/269/271/274只继承未变安全逻辑，不当前重跑。

本人明确批准旧219的20857.309ms与284的20119.841ms仅本任务历史功能覆盖，原超时不抹、不重跑、不放宽未来20秒。最终289在520 package中原pattern唯一fresh 1/1、wall4508ms、tree confirmed；selection冻结真实构建HEAD，不伪绑未来HEAD。packageContentPolicy扫尾保fixture12/12；releaseAcceptance首jobs-only漏按需exit1，修jobs∪onDemand/50退休反向/非空不交叉后特批1/1；resultCandidateMetadataExclusion仅TemporaryDirectory改保留mkdtemp4/4，业务断言不削。完整acceptance额外真实temp删除未获准未运行。

原mcpProjectOps11/11、windowScope8/8及真实事件/日志保留。既有G004续接固定初始session/原事件SHA/顺序/完整日志/最终exit0；首20.389s虽1/1 exit0仍超时无效，用户特批原20秒修后1/1 7.513s，静态字面量包装acf338a1另1/1 8661.6398ms。前39原test注册AST仅G004变；ENOBUFS/引号/规划/按需失败、误跑与日志覆盖都在execution，mcpWorkerHistory只引用原完整rollout，不造恢复log。

原receipt `simple_cluster/reports/test-workflow/2026-11-23T02-45-43-277Z-10816-package/run.json` 永久绑定构建f66d36946ade4b911a75636d6f2fc1f28c65111b，overall passed/exit0；361 active=125历史+235direct+1fresh，6按需未跑，13 gates exit0/tree confirmed，并发1/锁释放。完整input=end/artifact/selection见原receipt和df29de92计划，不改为发布HEAD。同一VSIX simple-experiment-0.5.520.vsix为2919747字节、SHA256 aaf19107996beae86674b16b6c25f110551e74fb70a6bd545c88d334c9b2cdba；simple-local.simple-experiment、^1.100.0/universal，ZIP359/354运行字节/308闭包、manifest/秘密/README、Panel模块+3真实脚本VM及10890零命中通过。

20已验证包内生成物经fea89fbd/18cd5836/120b9384同步；首git add exit1称dist ignore但授权7tracked已暂存，经核index=包后提交，后用精确tracked update。发布tag v0.5.520绑定7bf49ba84802df56821b098b440b289d3d3eb61e，https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.520 实际prerelease=true/draft=false/latest=false，精确VSIX/UTF8 sha资产/digest/隔离下载一致。总控本地tag查询unknown revision原失败保留，后真实GitHub refs核，不造本地tag。实际ReleaseClient核482→483可更新、520不降级、SFTP120不降118；权威Latest483/118不变。npm run install:latest唯一exit0、DEP0169警告，安装前519后520，code/磁盘一致，稳定MCP shim→launcher/resolver与已装bin字节同，server.cjs存在。未用已退休simpleex查版、不重复安装、不部署Agent。

后续新的实际源修才确定新patch/受影响检查及试行交付；新版本不得覆盖旧tag/资产或提升Latest。构建/包/源push/Release/一次安装是独立状态。最终源码与生成物同步可能改变HEAD/selection，原receipt保持原绑定，必须按真实同产物关系审，不自动全重跑/伪改凭据。安装后停面板等本人Reload，未获对应新版本重载前不冒Host/UI通过。

## 专用520实机有效证据

专用根C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f。519当时PID29888只历史；520本人在专用窗重载后实例45080:2026-11-23T05:41:49.812Z/127.0.0.1:19769，SFTP120同PID同根19767已激活，health/OpenAPI/listener核一致。每次实际再调用前须重新发现；默认发现曾属稿件窗，未调用。真实安装稳定launcher/resolver+SDK handshake520/listTools137/action_catalog167及经审本地只读调用，两launcher exit0/stderr空，原TEMP/g004-520-live-mcp*.json只本机保密不粘贴配置。

offline_import、lowTraffic enabled/effective、5配置1启用、五类grant无workers字段、PLAN experiments/plans/ui_u01_empty_515.yaml、空选择、resultCsvDir experiments/results、offline-fixture两行跨518→519→520保留，无重配重授。onboarding原false且无adapter不能称true丢失。此前四RESOURCE_CONFLICT只证明当时lease活跃，operations空不证明死锁/锁已释放，不清锁重放。

本人许可快照后又许可直接控制，按silent-ui-screenshot/computer-use使用node_repl/@oai/sky只选专用窗口87954600；minimized首拒后还原，真实原生图像/树保原工具事件，未存删截图/造capture框架。计划搜索ui_u01_empty_515唯一匹配、已选0、清除恢复；隐藏导航146越窗(-39,498)失败不算实点。任务0、GPU/tmux未查询/未核实、待同步/输出缺cases等均不冒运行就绪。

识别仅点一次；5Plan确认首坐标未点中，流程等待期间stalled真实保留，通知中心实际755继续后识别完成/黄横幅消失/按钮恢复，末尾可选通知未点也已完成。Escape同时退出侧栏最大化，实际998恢复；无adapter/PLAN/Worker/grant变更。MCP最终读回onboarding=true、status520/offline_import，panel ready/documentHidden=false/sectionFailures空；render-health-probe-pending未知仍在，operations0不独证锁释放。完整TEMP/g004-520-after-ui-recognition-20261123.json。旧识别3/3不重跑，真实B1已在限定范围通过。新修还未安装，当前Host仍520旧实现。

历史曾把synthetic/final.csv称“不符合标准列”，现明确撤回：原字节是支持的宽格式，filename-only误选classification_long导致0记录，表头generic_wide能得2记录。这是程序缺陷，不能恢复旧错误结论。

## 当前修复、门禁及下一动作

CSV：4d7df6d2预览传原text及映射/preset输入，8ed64825保显式metric/value、别名和0值；过滤无任何metrics的记录，不把仅维度误标parseable。原6/6及首两次5/6失败保留，不为迁班重跑。后续datasetResultCatalog/resultMappingRecovery等当前候选和实际结果以execution精确记录为准。

render：30秒Host心跳/15秒webview健康期使每次先pending。候选在真实RAF成功后补同heartbeatId ACK，保首unknown、隐藏/代次/停滞检测，不加周期timer、不假ok。Host对probe-pending保留stateRenderStalledAcks及上一序号，真实PanelStateProgress6/6；原panelRenderHealth首11/13失败保留。本人已明确批准旧offscreen夹具/最终输出字段更正，仍五条消息、隐藏写0/显示写1/原interest/20秒；原文件修后13/13，不能再说待批准或恢复不再展示lastParsedAt字段。Panel/Host候选已源审，尚需实际P0build和渲染脚本VM，不提交未过门禁UI。

停止路由：真实按钮仅op/Plan导致firstWorker猜归属、remaining时自动force重发及假取消已确认并修候选；只认明确Worker/本地精确归属，冲突可见报错，不加版本/环境/历史快照停止门禁。unknown/remaining保原状态和stopIntent、不清cache/不自动重发；新显式目标保Worker，传clicked run/Plan身份，按钮如实描述远端效果。实际Agent task_stop精确command/window而非旧SIGKILL注释。原12/12及当前UI身份补验见execution，未经新产物不冒真实停止验证。

召回当前可达缺口：行/Plan按钮只承诺召回排队，但协议2批量全选及后台stop-then-query会停止运行/完成任务并清完成事实，确认后按index还可能命中新worker/command。已裁定只处理明确排队，保其他job/完成证据；原身份在确认、持久化、各新效果前复核。未知已发意图仅原ID主动查询，不沿旧lostACK重发oracle。当前task_stop/Scheduler cancel没有queued-only条件且会关运行窗口，不能仅Host先查后停；需在现有Scheduler互斥处最小条件撤出及明确能力/旧端拒绝，保普通精确停止，不恢复旧durable队列/attempt。允许受控真实方法/内存端回归，Python仅抽函数/import与假tmux，具体fixture效果先审；无真实Worker/停止/调度。

SFTP本仓现行问题：remote.listDirs移除无条件confirm/pathConfirmed，170fd06e用现有项目sync授权/精确Worker根路径而非新modal，fakeGatewayHost18/18+120确认函数VM3/3，未访问服务器；download_paths拒绝绝对/drive/越界输入，保支持相对路径。树/元数据/静态报告等已审项见coverage，不用旧测试全绿冒真实效果。

配套当前修复及持续授权：① transfer.cancel A/B错配可能写A取消B。28087f3已同步，仅extension.js和新test/transferCancelIdentity.test.js，写账本前核双ID/instance，等待持久化后重核原控制器/归属、settled原对象；不丢transferId扩大取消、不query-then-cancel冒原子。首2/4失败保留，最终8/8与原settlement3/3均exit0；总控源审通过，另原transferRecovery精确单case和verify-runtime获准，是否已执行见execution。② handoff当前MCP指定Worker被项目config替换，且公开“上传并标记”实际未upload；本人已明确批准两仓最小修复，确认/上传/marker同一指定目标，MCP显式upload:true，原UI/API仅标记仍支持，不写用户sftp.json。均未部署，不执行真实传输/取消。下一空patch实核，统一回归/包/试行/一次安装，不提Latest118、不单项打断Host。③ 本人已批准sftp_from_remote最小修复，并扩大后续相关SFTP代码授权：此MCP入口缺失/空/坏JSON/读取失败的saved scope应在任何marker查询/SSH/download前明确拒绝，不退根目录tar；原UI/直接API默认全量和显式paths语义保留，合法原范围/filters不削，不读取用户scope或真实下载。配套 b3da0b5 已实现严格范围，原3/3、Gateway假后端1/1及显式范围消费者1/1、workspaceIntegration4/4通过；未实际下载或部署，配套完整包证据仍待收敛，不能再记为待本人跨仓许可。

工作流授权：源审已收窄。先前把未enqueue当未接受的推断撤回；apiWorkflowRun在准备前即记录并返回started:true/workflow_submission。本次只在路由/active await与最终workspace核后、创建新workflow记录前重核当前experiment/sync/agents；已有operationId resume保持原语义。三文件候选/普通MCP和无invocation正路径1/1源审通过；不插共享WorkerPreparation/后续同步/PlanRunReplacement/savequeue/tick/回执，不新增caller权限登记或宣称撤销自动停止已接受工作。docs/mcp-integration授权段改统一五类，不恢复Worker绑定。旧撤权专项不重放。

Git项目边界：0a1eb56f及82e3093b已普通FF同步。primaryGitRepository只选项目同根仓库；repo.add代替全局stageAll，原projectContext贯穿准备、提交、推送/首次发布及Worker分支，提交期间切换明确原提交可能已发生，不继续新效果；provenance读取后核原根再写。假Git6/6。自动备份拒绝父仓库，等待后复核同根、hook、远端名及URL，假hook先5/5后6/6；总控已读源码和断言，未操作消费项目真实Git/hook。

缓存审核按本人现行confirmed_paths裁决修复，7845afea已同步、未build：归属、claim、保留窗口只提示；保原双确认、固定类型、节点/完整路径、根/直接父/./叶名、链接与文件身份校验。全节点只读预核后才逐节点实际执行，后续变化停止并如实报告已完成部分；旧Agent拒绝新具名路由，不试探旧删除接口。Windows原pwsh执行器移除全部Force，最终只读GetFileInformationByHandle与Node bigint身份核对；Agent新旧删除和只读预检均拒绝同路径真实LIVE，不用历史任务状态阻断。local_operations.json中独立pendingCacheCleanups不进入普通compact：同文件lease下完整批次预留成功才出站，普通快照保留磁盘未决项，坏JSON/非ENOENT读错不伪空；只保必要节点/目标身份，不存整份Worker配置或认证。Host重建只查原请求，目标变化不转发新节点；未启动可结清、已启动未证exit保持unknown，已证结束去路径/token/目标细节。Agent重启空LIVE、锁TTL/Owner消失、文件不存在均不证明旧执行器结束。本机Host重启后暂无旧pwsh结束观察接口，仍unknown/不重发，查询失败结束本轮busy而可再次主动核实。

缓存发布前围栏已在限定local_operations的withLocalOperationsLease取得原同文件handle，两类写均接已有atomicWriteText.beforeRename，结束仍assert/release，不改通用锁/TTL。g004-cache-fenced-v1 11/11、实际StateStore假fs围栏1/1、原消费者selected-v3 2/2及selected-final 3/3均exit0；后三项经总控实际效果源审后批准，自建fixture用保留式rename，不证明永久删除。原actionLifecycle仅非草稿持久化单项更新等价断言并1/1，首0/1为漏TS字面量?，保原20秒及失败日志。首FILETIME 5/6、夹具注入时序9/10及此前8/8等原事实保留；完整日志见cd66811a execution/coverage。缓存源审通过、源与记录已同步，不冒当前build/生成runtime通过，assertHeld至OS rename不称绝对原子。PLAN恢复0b6b4b4e只将四处stat的ENOENT计missing，其余错误抛出；原文件6/6假fs通过，仅配置分支注入EACCES，其余三处源审，不冒实际恢复。

Agent旧证漂移总控集中源审：f66d3694原源码SHA af809d70d1deb0f8637131fead4240214b66498d5b918312803f7f90fa27c1a7与旧snapshot吻合，cd66811当前4cd5364ebceb00aff67802be5b13a443a2dde2765d44a913e25d7205378fae61。String.raw主体仅去具名插值作只读AST对比，552函数/类中仅cache_delete_exact_file、handle_action、tracked_cleanup_action、serve_http变，赋值仅ACTION_PATHS和新增CACHE_CLEANUP_RECEIPTS；导入runtime/RemoteResourcePrefix/ResultLayout无diff。初次未展开插值的AST读取SyntaxError保原工具记录，不是产品语法检查。旧jobs 5/21–24/31/68/76–78/91/93–95/103/141/219–220/222/225–227/252/293，以及currentTargetedEvidence中14个eligible且Agent snapshot为af809的原direct，仅允许更新该Agent依赖的实际适用判断：所取shell/task/GPU/结果/scope/stop/journal/startup或HTTP具体分支未改；新增缓存不冒旧证明。31仍Windows原skip、68旧外部JS未知、219历史超时例外和全部工具链unknown保留。其他legacy/Panel/结果依赖及新编译产物需分别核，不批改所有hash或称38项当前完整通过。

P0 build实际npm run build包含完整测试域，不能因build批准自动跑禁区。已批准现有G004 incremental扩build/package固定本仓单并发：build按实际identity+argv为已审全包集合子集，package仍集合相等；build不是assemble凭证，结束重核输入/产物/计划/选择和完整aggregate，普通入口不变。当前最近实核build316/package367、onDemand0是当时dirty树规划，不沿520的361/6；任何新HEAD/输入必须重算。legacy138/Panel23/Results31依赖快照漂移有交叠，逐真实提取闭包审核，不能批量换摘要/全重跑。未启动当前build，待有效覆盖收敛和总控裁决；Panel模块与真实render脚本VM、10890等原P0保持。

G004 direct新增固定已发生actionLifecycle包装兼容，仅原call_1d2d9eeb8125469fb2a0cc35b13b7ee9+同session83065续接call_37e5dbdf374a4045843c5d100cd1a685。核原全文/事件SHA/双日志SHA、child status0无signal及outer实际exit0，不eval原脚本或伪tree confirmed；49/49原9.349秒包含草稿只作历史事实，不重跑。原G004 pattern首次1/1 9.89秒，补纯内存拒绝断言另获原20秒一次，最新结果见execution；不因包装支持豁免当前依赖漂移。所有首失败/超时和未知仍保留。

隔离永久删除审核适用 confirmed_paths：0275a980已同步的8文件组去本入口旧派发/启动/队列资格，普通移走/恢复不变。local_operations 同文件lease/beforeRename保存原ID→reviewId及逐后端 unsent/admitted/ended，发起者close后才凭原token/digest/root/operationId的delete-fast completed回执结清；零出站可结清，缺失/空executor不证明结束。旧无pointer未决首次status保原记录；旧版已精简者不可恢复，open/uncertain崩溃仍unknown，旧Host混用不冒保障。保双确认、唯一目标来源、节点/根/路径类型指纹及原删除器；未真实删除。v11纯内存12/12、缓存consumer v2 1/1 exit0；首v10 11/12错误码断言失败保留。总控实读完整service/Host/存储/回执/假后端，源审通过，未build。裸service按真实RPC回执收敛，不恒定假false；原planRunIsolateRerun精确Map替身case待新编译产物后原20秒一次，其他原world动作未开放。输出模板fedd8bc9/7dfd6db5及两个调用已源审，项目beforeRename围栏假存储4/4，首2/3失败保留；OS调用不称可回滚/绝对原子，未build。

下一动作：唯一Terra持续查现行剩余入口并修真问题，更新母集当前已审/尚未审/仅外部效果受限的精确差异；退役残留不当需求。按实际依赖收敛当前build/package及SFTP最小回归调度，源码/测试/原日志/真实退出完整交总控。最终门禁/新patch/生成物/试行Release/安装由源审和实际覆盖决定，不改520不可变资产，不提前重装或冒真实新Host/UI通过。总控仅在完整阶段包或真实必要决定时接续；整项完成后统一汇报，未完成限制如实保留。
