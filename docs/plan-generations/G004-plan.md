# G004 重要功能、按钮与MCP连续查修

## 当前目标与唯一记录

用户持续要求剩余单项目现行按钮、界面功能与MCP全部查清，确有问题修完，复用有效证据，最后统一构建、试行发布、每目标版本一次安装，用户Reload后真实受限UI/MCP验收。跨项目延期，真实Worker效果受限。0.5.520已交付，但其后render、CSV、停止路由及现行入口修复尚未新build/交付，整代未结案；工具目录和覆盖计数不证明全部按钮及真实功能均通过。

本计划由总控独占；执行事实与逐ID证据在G004-execution.md及windows-entry-coverage.json。压缩前完整计划见 `8f04bd1f:docs/plan-generations/G004-plan.md`，更早见df29de92、565c8203、6f14818d、cb44bd81、7bf49ba8、30a5d6e0、59041060、89498eff；原日志、失败、许可和未知不改。cap18000/90%=16200，execution cap12000/90%=10800，触阈值整体按机制语义压缩，不只削字。2026-11-24接续4首压缩候选16590超过阈值，写前断言exit1，文件未写；本次集中重写不新增tracker/交付报告。

## 唯一角色、租约与保护

总控兼最终审查《总控·SimpleExperiment G004 集中查修与交付 接续4》01a2097a-adcb-79d0-8f41-03248c4dda31/local，真实resolved与turn均Sol/high，default，match/continue。旧总控01a2040c在10次压缩、第五次后峰300413自然接替；新总控读完整交班与必要材料后，旧总控明确释放plan/README/最终审查且实核idle，无在途。已实核旧turn completed且idle；coverage/execution和scripts无旧root ID/rollout引用，随后工具归档成功，原证据未改。更早交权见43efb031/e8bc27fe；service_tier只记录，轮换不重置任务或授权。

唯一执行01a208e7-87fc-7e11-a447-1fb563eacb24/local，Terra/high/default、match/continue；继续持产品/API/MCP/UI/测试、execution/coverage及两仓串行Git租约。总控只写plan/README、协调和最终审查，不抢Git；已审精确diff由执行同步。已一次更新执行报送目的地，不索ack、不重派、不另建执行/审核代理。完整派单及通道明确、总控无独立待办且只等完整包/必要决定时按全局事件协调合法空闲；执行有可做工作必须继续，不循环wait/催进度。未知在途先核归属与结果，不重放。

普通Windows原工作区，不是Pi/自制容器/项目管理器。SE根D:/GitRepo/MCP/zlk-cluster-orchestrator，master→origin/master，origin=https://github.com/zlinkw/SimpleExperiment.git；2026-11-24接班只读HEAD=8f04bd1f。SFTP根D:/GitRepo/MCP/simple-sftp，origin=https://github.com/zlinkw/SimpleSFTP.git，接班HEAD=1ed121738969d8ec5a79693910e4463e993ecff8、tracked clean。用户已明确“后续都允许修改SFTP插件的代码”“不需要再向我询问了”，本轮现行UI/MCP相关配套缺陷、必要消费者/回归和统一试行交付直接推进，不再索跨仓许可，不扩配套全功能审计。

每批≤3强相关问题/≤8非生成文件。两仓Git严格串行，scoped普通commit/push/fetch核HEAD=上游；不amend/rebase/reset/merge/force/换remote，不stage日志/fixture/旧VSIX摘要/无关资产。remote前进、认证、hooks或Git失败停相关Git升级，不自行冲突整合。0aa6b27c后fetch TLS EOF首exit1及总控一次恢复exit0仅精确历史，不是通用重试许可。legacy混合hunk不得整文件stage。

禁止真实Worker/服务器/SSH/health-version/prep/sync/远端任务或active results查询派发停止、Agent/tmux/GPU/训练/真实传输取消删除/跨项目效果。项目grant不等于本次真实效果许可；不改共享Worker/grant/config，不自动切模式、reload、关窗口或新profile。startup公开GitHub检查和自然发现注册保原例外。用户准直接电脑控制仅专用验收窗口、安全本地交互，保护稿件窗输入/剪贴板。

保护GPU7全部任务日志产物、/root/autodl-tmp/zlk/MultiModal、原Agent/tmux/隧道，以及MM final.md、Generic Untitled-1、Response to Reviewers.tex等未保存稿。D:/GitRepo/SimpleMcpAcceptance只读；cleanup_20261111.txt、全部temp/fixture/旧资产保留，不删搬/暂存。六项原dirty dist不恢复/清理/混入源提交：cli/ExecutionContext.js、cli/commands/result.js、cli/errors.js、features/Results/ResultParser.js、features/factories/ResultsFactory.js、mcp/Server.js。

全局同时一个Node/Python测试，先单文件node --test --test-force-exit --test-timeout 20000；20秒不退出即停止，不自动重试、换入口绕过、加时或改生产求绿。非超时失败按新原因有界返修并保首日志。Python仅抽函数/import，禁完整Agent/Scheduler import/exec或长-c，spawnSync≤10000/windowsHide/status0。测试fixture保留，不真实删除；删除设计遵safe-delete-paths/manual-cleanup-only，产品仍双完整路径确认。Windows仅pwsh.exe7、显式UTF8读写及复读。性能测试修改先有用户精确场景/范围批准，不新增压测/阈值；原未改容量正确性不一概阻塞。

## 现行入口与退役边界

旧索引只导航，先核producer→consumer、最新用户决定、支持输入和负责调用链。300逻辑ID、137 MCP、167 invoke、45命令互相重叠不能相加，动态物理按钮实例未知。唯一母集coverage.g004U04RemainingInventory.g004Reload519LocalAudit：原300处置206旧证条件/11问题关联/14跨项目/26本地部分外部受限/17本轮本地与外部受限/1 Agent/25清理；边界132本地混合/79外部安全共享/14跨项目/75旧延期外部清理。旧89延期及137工具/45命令细分见压缩前计划，不是通过数。缺currentReview不自动未审，旧concluded不自动现行通过，更新原行适用状态，不重置有限有效结论。

业务CLI整体退役，39源实际删除、50测试路径退休及迁出已交520；仅保UI/MCP、中立业务与稳定launcher/resolver。不得恢复CLI参数/help/退出码、无Host history/export/download、doctor聚合、隐式PLAN默认/零握手、旧server/manifest、细粒度prepare便利或新造GPU flatten。草稿机制整体退役；默认renderDraftPlanSection为空、renderDraftCards无生产调用。49e1cebd/0085828b误沿旧母集修draft的事实保留，未真实创建草稿，不继续调查/测试/复活Draft/Debug/Promote，不擅删旧文件/夹具。旧49/49只按非草稿消费者实际适用，不算现行草稿通过。

Hub执行拓扑退役，旧字段仅格式兼容、明确拒绝及GitHub名称，不能补Hub目标/卡。新作业declared-only，无新attempt、旧控制锁/退出码文件或队列JSON重放；历史attempt只读，旧文案不证明现行新建。禁止PID/pidfd杀进程、整tmux关闭、未知停止自动force重发、任务登记阻断辅助Agent重启。科研Conda/torch/依赖与adapter数据/论文检查不自动塞回准备/健康，历史显式诊断仅用户主动调用。旧服务器树/模板无现行链不补按钮，资源树/结果表/动态tmux仍有效但真实远端受限。U55统一五类授权不绑Worker/checkbox，旧workers仅兼容，不用旧测试恢复隐藏字段或自动重试。

## 不可变历史与520交付证据

R519 A1–A6/B1–B4/C1–C3及U01–03的20修复、U04原43中39单项目已交520；四跨项目02/05/06/07延期。C4 CLI编码/shell/EXE撤销，selectExperiment不可达推断撤回，公开invoke等待持久化独立成立。历史细节、首失败与批准见8f04bd1f/df29de92同路径和execution，不恢复过时待许可。

MCP共用src/api、src/mcp/query，同进程ALS/root/RPC/emit，无业务CLI子进程/global cwd/stdout回退；bin仅simpleex-mcp，新installer不清旧shim。optionalApi仅真正-32601可空，其余业务拒绝/取消/网络错传播。Artifacts仅已证本机规范根可读，Worker/未知保ARTIFACT_LOCATION_UNVERIFIED。PLAN显式suite/base/seeds、matrix结构预览、validate/preflight真实同步及目录副作用、dispatch原字段/配额/job0/stopRunning精确确认保留。SFTP120 Gateway/Host5/5仅内存证据，dispose写stopped discovery并关server不unlink，project.create未实建。

39源删除及50退休集合/直父安全/同步见0ee444be、0ff5b277、97d723e1与coverage；首policy拒绝进程未启，后精确许可内成功，不扩许可。B1首失败且20秒timeout，经用户特批原20秒唯一3/3，可选通知脱lease，其余识别/选择/确认仍等待。TS首7.0.2 input-drift exit2/71emit、Gateway类型233f31d3及删除后391输入/emit2/exit0是历史，非当前build；publicCliAliases误删已恢复。514坏SHA、vsce ls超时ZIP裁决、runtime退出未知、两次已用尽process-owner删除许可、无根workspaceState owner未知保留。J01 Git VALUE0/5缺失传播未知，禁sanitize/globalGit/重启稿件。旧cybersecurity拒因未公开，不Daybreak/扫描/重放拒绝专项或换工具模型绕限。

用户批准本任务有效旧结果＋当前补验逐identity/argv增量核验，非通用cache。schema3保原receipt/direct/fresh、事件/日志SHA、真实退出及依赖/工具链/输入/选择/产物/gates；旧工具链/dirty字节unknown仅逐项人工适用，不伪known。031原0pass/1skip、165为5pass/1skip、37为40pass/1skip，340原34继承现30而4CLI退休；68仅Python核心及JS两拒绝边界，69外部根/字节未知；264/265/267/268/269/271/274仅继承未改安全逻辑不重跑。219的20857.309ms与284的20119.841ms仅用户精确本任务历史例外，不扩未来20秒。误重复/按需误跑不计覆盖，OOM/ENOBUFS/引号/规划/旧日志覆盖保留，不伪恢复日志。

520 receipt simple_cluster/reports/test-workflow/2026-11-23T02-45-43-277Z-10816-package/run.json永久绑定build f66d36946ade4b911a75636d6f2fc1f28c65111b，overall passed/exit0；361 active=125历史＋235direct＋fresh289，6按需未跑，13 gates exit0/tree confirmed、input=end、max1/锁释放。fresh289原pattern唯一1/1/wall4508ms；完整input/artifact/selection不改绑后续HEAD。packageContentPolicy保fixture12/12，releaseAcceptance首漏onDemand exit1后特批修1/1，resultCandidateMetadataExclusion仅保留mkdtemp4/4；额外真实temp删除的完整acceptance未获准未跑。mcpProjectOps11/11、windowScope8/8、续接原20.389s虽exit0仍超时无效，特批1/1 7.513s、静态固定包装acf338a1另1/1 8661.6398ms均保原边界。

simple-experiment-0.5.520.vsix为2919747字节，SHA256 aaf19107996beae86674b16b6c25f110551e74fb70a6bd545c88d334c9b2cdba；simple-local.simple-experiment、^1.100.0/universal，ZIP359/354运行字节/308闭包及manifest/秘密/README、Panel模块＋3真实脚本VM、10890零命中通过。20生成物经fea89fbd/18cd5836/120b9384同步；首add ignore exit1但7tracked已暂存，核包后提交，后用精确tracked update；六旧dirty保留。

试行Release https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.520 ，tag绑定7bf49ba84802df56821b098b440b289d3d3eb61e，prerelease=true/draft=false/latest=false，精确VSIX/UTF8 sha资产、digest/隔离下载一致。本地tag unknown revision首失败后实际GitHub refs核，不造tag。真实ReleaseClient证482→483更新、520不降级、SFTP120不降118；权威Latest483=0fd89fa8be6778daad8398d911cd028d713241e4与SFTP118=23cbf92918c7b63cf4674a4159c3f06120037e5d不变。install:latest唯一exit0/DEP0169，519→520磁盘/code一致，MCP shim/已装launcher/resolver/bin同字节、server.cjs存在；不重复装、不部署Agent。未来新patch实查空版本，仍只试行，不覆盖历史tag/资产、不提升Latest。

## 专用520实机与新UI验收边界

专用根C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f。519 PID29888仅历史；用户Reload后520实例45080:2026-11-23T05:41:49.812Z/loopback19769，SFTP120同PID/根19767当时health/OpenAPI/listener一致。再调用先重新发现，默认API曾属稿件窗绝不能碰。稳定launcher/resolver＋真实SDK两次handshake520/listTools137/action167及经审本地只读exit0/stderr空；TEMP/g004-520-live-mcp*.json只本机保密。

offline_import/lowTraffic有效，5配置1启用/五类grant无workers、原PLAN experiments/plans/ui_u01_empty_515.yaml/空选择/experiments/results与offline-fixture两行跨518→519→520保留，无重配重授。onboarding原false且无adapter不是丢失，后实点识别变true。四RESOURCE_CONFLICT仅证lease活跃，operations空不证明死锁/释放，不清锁重放。

用户准专用窗口电脑控制/截图，遵silent-ui-screenshot/computer-use；原node_repl/@oai/sky窗口87954600，minimized首拒后还原，原生图像/树保原事件，未存删截图。计划搜索/清除已实点，导航146越窗失败不算通过。识别仅一次，首确认坐标未中、等待stalled保留、通知755继续后完成，Escape改布局再998恢复；末尾可选通知未点也完成，无adapter/PLAN/Worker/grant变更。TEMP/g004-520-after-ui-recognition-20261123.json示onboarding=true/status520/offline_import、panel ready/documentHidden=false/sectionFailures空；render-health-probe-pending未知仍在，任务0及GPU/tmux/输出就绪未核。当前Host仍520旧实现。synthetic/final.csv旧“不标准”误判已撤回：合法宽格式被filename-only误选long得0，generic_wide可得2，是产品缺陷。

## 当前修复状态与完整包审查

CSV原6/6及首两次5/6保留，4d7df6d2预览传原text/映射，8ed64825保metric/value/alias/0且无指标不假parseable；datasetResultCatalog/resultMappingRecovery后续候选按execution真实输入。render候选在真实RAF成功后补同heartbeat ACK，保首unknown/隐藏/代次/停滞，Host pending保累计stalled，不加周期timer/假ok。原11/13失败保留，用户特批旧offscreen有效dataset/末字段更正后13/13，仍五消息/隐藏0写/显示1写/原interest/20秒；Host6/6。两者源审通过但未新P0build/实际render VM，不提交未过门禁Panel。

停止候选只认明确Worker/本地精确归属，不firstWorker猜、不remaining自动force、不假取消。unknown保原stopIntent，原project/client贯穿，发送前localOperations do/while排干保存再核；失败零POST，已发未知不重发、不碰B缓存。原12/12及v4 14/14保留，v2 13/14夹具失败与v3旧输入保留；未真实停止或新build。召回9412b48c已同步：仅明确queued，Scheduler互斥具名RPC/能力、原ID取消围栏及pending/completed proof核完整身份/窗口消失，旧端拒绝新接口，unknown只查原ID不普通stop回退；保普通精确停止/完成事实。Host16/16、Python仅两函数假tmux1/1及原精确消费者有效边界见execution，未Worker。

缓存7845afea及隔离0275a980按confirmed_paths去任务/claim/历史资格门禁，其余只提示；保节点/完整路径/根父/./叶名/类型指纹/链接/双确认。local_operations同文件lease＋beforeRename保pendingCacheCleanups/pendingIsolatedDeletes，完整预留后出站、逐组unsent/admitted/ended、原token/digest/root/opID回执＋发起者close后结清；坏JSON/非ENOENT不伪空。丢回执只查原ID，不因文件缺失/空LIVE/TTL/owner消失证结束；旧版已抹身份不可恢复，本机Host重启无旧pwsh退出接口仍unknown。assertHeld至OSrename不称原子。缓存11/11、真实StateStore假fs1/1及精确消费者2/2、3/3；隔离v11 12/12及缓存consumer1/1，首v10 11/12错误码断言失败保留。全部假端未真实删除/构建；裸service按真实completion receipt不恒假false。新dist后planRunIsolateRerun仅已准精确Map case，其他world禁跑。

暂存槽候选修人工一次隔离确认后隐式永久删及自动expiry删除：先reserve原source/token/node/root/paths，隔离后实际parent preview、两次完整永久路径确认，admit→delete原token→matching delete-fast receipt ack/close/settle；取消unsent可再审，prePOST失效unadmit，已尝试unknown只查原status，ended/openfalse可恢复settle。自动expiry只读发现提示能力0/2，不自动隔离/确认/删除。SFTP后端实核parent双确认/原token/有效期，已源审并同步1ed12173；auth3/3、原假expiry3/3、batch精确10安全case通过，无5000项或真实效果。SE state真实方法＋假存储/后端v4 10/10，尚未提交；stagedSlotDeleteReview新文件与manifest域须随源码同批，不能stage缺文件的manifest中间HEAD。固定历史Process包装13284446已审，只核原call/字节/事件不任意eval；未锚定1/1不冒最终锚定argv。

其他已源审同步：Git同根repo.add代全局stageAll及备份核root/hook/remoteURL（0a1eb56f/82e3093b），Git覆盖等候围栏、archive b61c0e09确认/实际下载同mapped根，Plan恢复0b6b4b4e仅四stat的ENOENT missing其他错抛，模板fedd8bc9/7dfd6db5发布前原项目围栏。提交取消/恢复7659b4b9/b2b25d81、失败重排e8bc27fe、共享SFTP config、调度整组先校验、Worker删除确认重核快照、隧道/离线/endpoint等ae39752c至bab13011均按原假端/真实方法日志适用，未产品Git/Worker/删除或build。细节和首失败见execution，不重跑有效证据。

工作流接受点是本机workflow_submission started:true，不是enqueue；只在接受前重核experiment/sync/agents，已有op resume不改。已接受工作不因撤权自动取消，不插共享WorkerPreparation/后续效果/tick，不新增caller授权账本，旧拒专项不重放。五类文档不恢复Worker绑定。

MCP配套：remote.listDirs不无条件confirm，170fd06e保项目sync授权/精确Worker根，假Gateway18/18＋VM确认3/3；download_paths保合法相对路径。SFTP transfer.cancel 28087f3核双ID/instance及await后原controller/归属/settled对象，不丢ID扩大取消，最终8/8＋settlement3/3，首2/4保留。handoff d4ed002指定目标确认/上传/marker一致，MCP显式upload:true，UI/API仅marker仍支持，不写用户sftp.json。sftp_from_remote b3da0b5在任何marker/SSH/download前拒缺/空/坏/读错saved scope，原UI/API默认全量和显式paths/filter保留；原3/3、Gateway1/1、范围consumer1/1、workspaceIntegration4/4。冻结请求不声称检测对端后续配置变化；未真实传输取消部署，新包仍待收敛。

相邻已闭组：JobAvailability702acec8/e8edf782真实save仅显式projectContextCurrent启用mkdir/beforeRename围栏，原recallAssertCurrent契约不变；A写成功后partial不发布/tickB，observer仍带A root且消费者筛；StateStore每rename尝试核，不称OS原子。v2内存save五场景1/1＋可用性精确3/3 exit0。manifest零上下文cached check首exit1/index空，经核准标准三行上下文v2 apply/同步，不扩重试。retry/PlanCodeScope dde958c5及8f04bd1f原项目/client/targets、真实lane出站围栏已审，helper1/1＋锚定重排五项5/5 exit0；旧v1/v2不冒当前，Production/Coverage仅签名适配未跑。ProjectFileIndex带signal不共享无signal round，reset先abort旧controller。projectCodeSyncState仅夹具现有TS转译再VM7/7已同步，不冒dist。

派发/替换当前源审方向：原context/client/targets、reservation batchId及finally自有集合，A成功事实不发布/tickB；send在consent前捕原身份，隔离回执先保存，lane/对话道实际出队校验，metadata主读取与持久化后分别守发布边界。PlanRun connectionKey保实际目标语义；健康probe不换client不取消manual，实际resetClient/端点更改取消。共享已受理A固定client/精确身份只读可收尾，回调不发布B，不全局取消或中止其他合法订阅。

已源审并依序普通提交/push/fetch：A传输874afe1a，B同步d468b90a，C后台清理095a1fb8；后续D已完成，当前实核HEAD=origin/master=FETCH_HEAD为5ca4c0ca，index空。同步租约/接管/consent、tails出队→实时投影→逐项cancel、upload回调及proof后发布守原caller；accepted cancel先保原ID再挡后项。wrapper/ProgressWait守能力等待、实际POST及明确notStarted后重发，仅可证零POST标sftpNotStarted，不改已发未知。mutation前后索引刷新仅显式caller贯通baseline/能力等待，finally失效跳过新旁路、不throw抹A回执、不误标已发，无caller不变。autoDelete守migration/status和逐未发组/空父目录真实发送，原A回执先保存，未发可原token续交，不加账本；SFTP completed返原receipt、unknown拒绝重发，双确认/节点/路径/类型/根父/./叶名不减。

D1→D2→D3已精确串行同步：9ddfea37、eab4c1f4、5ca4c0ca，总控实核三log及上游一致。D1 PlanRunHost/Replacement余hunk、legacy仅assertPlanSubmissionWorkers/metadata/fingerprint、新planRunContextFence及manifest共5文件；D2六send消费者仅固定原root/context fake，保原断言；D3 ManualDispatchHost/ServerQueueHost/ManualJobDispatch、legacy准备/version/send/snapshot及四相关test共8文件。各批原适用证据、精确index/语法/UTF8/diff/manifest已核，未夹slot/Panel/stop/result/六dist；原slot登记仍留工作树。D1 manifest生成曾误写pwsh可执行名exit1、进程未启，正确pwsh后成功，非Git失败，原事实保留。证据和总控plan另集中文档批不超8。

真实fake验证均原20秒、exit0无超时：dispatch新增v3 2/2＋原正常2/2、replacement4/4、共享读取6/6＋17/17；send精确handoff1/currentTruth2/identity1/workerProof2/idleGpu integration2共8项；isolated2/profile5/upload锚定v1与v2各1；codeSync v2 2/2；sftpCaller v1 2/2旧输入，最终含索引旁路v2 3/3，总控实读原日志；Agent准备及路径各两静态项2/2。dispatch首正则启动错误、v2缺AbortController首1/2及codeSync v1缺warmProof fake首1/2保留。新第3case误将upload路由index的夹具已在运行前指出修正，无伪失败。日志/事件/输入归属见execution，不冒整文件/当前整链通过。

待新dist必做许可不变：manualDispatchHost原11项单文件一次；distributedPlanExecutionMode仅前三种validated mode精确case；更早resultSync/slot及五隔离消费者照原精确限额。当前未compile，不跑旧dist冒当前源码；D源码VM/静态验证与最终编译消费者是独立状态。

E替换隔离负责链五产品文件已源审：原caller贯通预览/确认/预检/状态/隔离实际SFTP、Manifest原client与索引发布；不放共享可变guard、不新账本/锁。首候选status独立observe有并发覆盖风险、首check完成回显先guard丢事实，返修后复用原observing(id)串行、排队后读记录，普通无guard共享原读，某caller失败不取消下一合法调用；原A完成回执先save再挡后续。TEMP/g004-plan-cleanup-context-v1-20261124.out.log为8/8、506.8637ms、子/外exit0、stderr空，纯内存save/SFTP/fs及源码VM。其后generic仅明确sftpNotStarted回pending，8case未走该hunk；已发未知保executing。已准五产品+新test+manifest≤7文件精确同步，尚待Git回包；Host原slot不夹。未声称fastdelete/restore/完整history及全部独立删除通用caller闭合；真实效果/world/build仍禁。

## 增量构建、最终路线与终点

P0 npm run build含完整测试域，不能以build批准隐式跑禁区。现有G004入口固定本仓max1，build按identity＋argv为已审package严格子集，package仍集合相等；build不是assemble凭证。095a1fb8＋当时dirty只读规划322build/374package、0按需、missing0，仅导航；旧318/370不沿用，D/E/登记变化后须重算。planG004Execution首拒legacy漂移exit1仍真；逐实际提取函数/消费者闭包消解历史依赖，不批替hash/便宜全重跑。compiledInputs须真实新compile后冻结，不拿源码VM冒dist。

sftpCaller/planRun/codeSync/isolatedAutoDelete/planCleanup ContextFence五新identity的真实ProcessStartInfo包装日志不满足ordinary direct，亦不属历史stage固定wrapper；planCodeScope旧full12与新增精确1/1不能冒当前full13。裁决最终相关源码/fixture冻结与效果复核后，这六项按原全文件argv/20秒经既有runner fresh各一次、max1，现在仅登记候选，未开build/package。planCodeScope仅私有保留fixture、Python抽函数/10000ms，原mocktimer阈值不改。原call/进程exit/timeout/日志与失败保类型，不冒direct/treeconfirmed、不加通用解析器；真实fresh同输入package复用，不重复。

Agent旧af809d70→当前4cd5364e那次差异仅552函数/类中的cache_delete_exact_file/handle_action/tracked_cleanup_action/serve_http及ACTION_PATHS/新CACHE_CLEANUP_RECEIPTS；runtime/RemoteResourcePrefix/ResultLayout导入未改。总控已按真实分支审的24旧job及14 direct仅更新该Agent依赖的适用判断；原31 Windows skip、68外部JS未知、219历史超时/工具链unknown保留，不批签所有依赖/新缓存能力。第一次未展开String.raw插值AST失败是只读工具错误，不产品语法证据。

SFTP当前73文件证据未齐：120原69/466仅aggregate、逐日志目录空，119有56日志13缺，Node/Python/WSLunknown。已审补验apiBackpressure4/4、apiUploadProgress4/4、cleanupExplicitTarget1/1均exit0，分别假SSE/假spawn/VM假SSH；最后仅生成Python字符串未启动Python。旧逐闭包适用不由新单项合成完整包通过。原日志、真实退出和未测保留。

最终稳定HEAD/输入后，planning289原精确pattern唯一fresh一次，新runner仅锚定 ^runner: G004 staged slot fixed wrapper evidence$ finalfresh。新dist后用户已准resultSyncFailureVisibility及jobArtifactStagedSlotIdentity原20秒各单文件一次；五旧隔离消费者只准指定精确case，不整跑world。Panel须真build＋模块/真实渲染脚本VM/node-c、10890零命中，未经门禁不提交Panel。更多动态测试先审实际效果，fixture保留，不真实删除/网络/Worker。

下一动作：唯一执行持续查修现行单项目入口，当前完整包由总控核真实diff/负责链/反向消费者及fake效果后一次给精确验证与scoped同步决定；母集精确区分当前已审、未审、仅外部受限，不复活退役。逐项收敛SE/SFTP增量证据→实际最小build及批准的新dist消费者→确定新patch同步package/lock/runtime/稳定write-agent-runtime→单次集中package max1并核actual exit/gates/input=end/selection/artifact/lock/P0/包闭包秘密README/平台版本SHA→scoped源及生成物FF同步，诚实保receipt原HEAD绑定→immutable试行tag/prerelease=true/latest=false、精确VSIX/UTF8 sha资产/远端digest隔离下载/真实更新客户端不降级权威→每目标版install:latest一次，无force/降级，同版skip→核安装/MCP入口后停面板等用户Reload→专用根新Host身份下真实安全本地UI/MCP验收→统一交付。源码push、包、Release、安装、Host/远端部署各状态独立；不部署Agent，不把本地fake通过冒真实Worker完成。整项达此终点才结案，局部问题不停止其他授权工作。
