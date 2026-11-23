# G004 重要功能、按钮与MCP连续查修

## 当前目标与唯一记录

用户持续要求剩余单项目现行按钮、界面功能与MCP全部查清，确有问题修完，复用有效证据，最后统一构建、试行发布、每目标版本一次安装，用户Reload后真实受限UI/MCP验收。跨项目延期，真实Worker效果受限。0.5.520已交付，但其后render、CSV、停止路由及现行入口修复尚未新build/交付，整代未结案；工具目录和覆盖计数不证明全部按钮及真实功能均通过。

本计划由总控独占；逐ID事实、原日志/失败/许可/未知在G004-execution.md及windows-entry-coverage.json。完整前文可取 `3f4b9925:docs/plan-generations/G004-plan.md`，更早8f04bd1f及其引用，不另建tracker/交付报告。cap18000/90%=16200，execution cap12000/90%=10800，触阈值整体语义压缩。接续4首候选16590写前断言exit1、未写；本次集中归并已完成机制及重复流程，原证据不改。

## 唯一角色、租约与保护

总控兼最终审查《总控·SimpleExperiment G004 集中查修与交付 接续4》01a2097a-adcb-79d0-8f41-03248c4dda31/local，resolved/turn均Sol/high/default、match/continue。旧总控01a2040c在10次压缩、第五次后峰300413自然交班，明确释放plan/README/最终审查，无在途；新总控已完整读交班，核旧turn completed/idle及coverage/execution/scripts无旧rollout引用后归档成功，未改证据。更早交权见43efb031/e8bc27fe；tier只记录，轮换不重置任务/授权。

唯一执行01a208e7-87fc-7e11-a447-1fb563eacb24/local，Terra/high/default、match/continue，持全部产品/测试/execution/coverage及两仓串行Git。总控只持plan/README、协调/最终审查，已审diff交执行同步。报送目的地已更新，不索ack/重派/加代理。依全局事件协调：总控无独立待办、完整派单/通道明确且仅等交包时角色空闲；执行有工作须继续，不循环wait/催进度，未知在途先核结果不重放。

普通Windows原工作区，非Pi/自制容器。SE D:/GitRepo/MCP/zlk-cluster-orchestrator，master→origin/master，origin=https://github.com/zlinkw/SimpleExperiment.git；接班8f04bd1f。SFTP D:/GitRepo/MCP/simple-sftp，origin=https://github.com/zlinkw/SimpleSFTP.git，接班1ed121738969d8ec5a79693910e4463e993ecff8、tracked clean。用户长期授权SFTP代码修复，无需重询；仅本轮相关配套/消费者/回归和统一试行，不扩SFTP全功能审计。

每批≤3强相关问题/≤8非生成文件；两仓串行scoped普通commit/push/fetch核三HEAD相等。禁历史改写/整合/force/换remote，禁夹日志/fixture/旧摘要/无关资产，legacy只选hunk。remote前进/认证/hooks/Git失败停相关Git；0aa6b27c后TLS EOF首exit1及一次恢复exit0仅精确历史，非通用重试许可。

禁止真实Worker/服务器/SSH/health-version/prep/sync/远端任务或active results查询派发停止、Agent/tmux/GPU/训练/真实传输取消删除/跨项目效果。项目grant不等于本次真实效果许可；不改共享Worker/grant/config，不自动切模式、reload、关窗口或新profile。startup公开GitHub检查和自然发现注册保原例外。用户准直接电脑控制仅专用验收窗口、安全本地交互，保护稿件窗输入/剪贴板。

保护GPU7全部任务日志产物、/root/autodl-tmp/zlk/MultiModal、原Agent/tmux/隧道，以及MM final.md、Generic Untitled-1、Response to Reviewers.tex等未保存稿。D:/GitRepo/SimpleMcpAcceptance只读；cleanup_20261111.txt、全部temp/fixture/旧资产保留，不删搬/暂存。六项原dirty dist不恢复/清理/混入源提交：cli/ExecutionContext.js、cli/commands/result.js、cli/errors.js、features/Results/ResultParser.js、features/factories/ResultsFactory.js、mcp/Server.js。

全局一个Node/Python测试；单文件node --test --test-force-exit --test-timeout 20000，20秒未退停止，不重试/绕入口/加时/改生产求绿；非超时可有界返修留首失败。Python仅抽函数/import，禁完整Agent/Scheduler及长-c，spawnSync≤10000/windowsHide/status0。fixture全保留，不真删；删除设计遵两安全技能，产品双完整路径确认。仅pwsh7/显式UTF8及复读；性能改动须具体用户批准，原未改正确性不因此阻塞。

## 现行入口与退役边界

旧索引仅导航，核最新决定/支持输入/producer→consumer负责链。300逻辑ID、520的137 MCP/167 invoke、45命令重叠不可相加，动态按钮实例未知。唯一母集coverage.g004U04RemainingInventory.g004Reload519LocalAudit保存原300处置、132本地混合/79外部共享/14跨项目/75旧延期外部清理及细分；不是通过数。缺currentReview不自动未审、旧concluded不自动现行通过，仅更新原行适用状态，不重置有效结论。

业务CLI整体退役，39源删除/50测试退休迁出已交520；仅保UI/MCP、中立业务和稳定launcher/resolver。不恢复CLI参数/help/退出码、无Host history/export/download、doctor聚合、隐式PLAN默认/零握手、旧server/manifest、细粒度prepare或GPU flatten。草稿整体退役：renderDraftPlanSection空、renderDraftCards无生产调用；49e1cebd/0085828b误修保历史，未真实创建，旧49/49仅按非草稿消费者适用。F停metadata自动reconcile，撤8个drafts API/6个MCP目录，旧RPC/UI/invoke在handler/lease/清理预览前拒绝；不删旧模块/数据/夹具，不调查/恢复Draft业务。五文件94a9a0c1已同步；原mcpDraftContracts identity/四入口登记不变，旧实际3项改退役契约5项，旧3/3不继承。TEMP/g004-draft-retirement-v1-20261124.{out,err}.log为5/5、1643.7836ms、子/外exit0、stderr空，仅AST VM/假端/Gateway根只读，无业务/网络/删除。临时draftRetirementBoundary留工作树不登记/stage。新源码工具131不改520的137历史；mcpActionCatalog仅假表去promoteDraft，原断言保留，1/1、685.6336ms/双exit0/stderr空，TEMP/g004-mcp-action-retired-v1-20261124.{out,err}.log；单文件88b351a6已同步并实核三HEAD相等/index空。

Hub执行拓扑退役，旧字段仅格式兼容、明确拒绝及GitHub名称，不能补Hub目标/卡。新作业declared-only，无新attempt、旧控制锁/退出码文件或队列JSON重放；历史attempt只读，旧文案不证明现行新建。禁止PID/pidfd杀进程、整tmux关闭、未知停止自动force重发、任务登记阻断辅助Agent重启。科研Conda/torch/依赖与adapter数据/论文检查不自动塞回准备/健康，历史显式诊断仅用户主动调用。旧服务器树/模板无现行链不补按钮，资源树/结果表/动态tmux仍有效但真实远端受限。U55统一五类授权不绑Worker/checkbox，旧workers仅兼容，不用旧测试恢复隐藏字段或自动重试。

## 不可变历史与520交付证据

R519 A1–A6/B1–B4/C1–C3、U01–03的20修复及U04原43中39单项目已交520；02/05/06/07四跨项目延期。C4 CLI编码/shell/EXE撤销，selectExperiment不可达推断撤回，invoke等待持久化独立成立。历史首失败/批准取前文及execution，不恢复过时待许可。

已交MCP同进程src/api/query、ALS/root/RPC/emit，无业务CLI/global cwd/stdout回退；bin仅simpleex-mcp，installer不清旧shim。optionalApi仅-32601可空，其他错误传播；Artifacts仅已证本机规范根，未知/Worker保ARTIFACT_LOCATION_UNVERIFIED。PLAN显式suite/base/seeds及matrix、真实预检同步/目录副作用、派发原字段/配额/job0/停止确认保留。SFTP120 Gateway/Host5/5仅内存，dispose写stopped discovery/关server不unlink，未实建project。

39源删除/50退休集合及直父安全/同步见0ee444be、0ff5b277、97d723e1与coverage；首policy拒绝进程未启，后精确许可内成功。B1首失败/20秒timeout后用户特批唯一3/3；可选通知脱lease，识别/选择/确认仍等待。TS7.0.2 input-drift exit2/71emit、Gateway233f31d3及删除后391输入/emit2/exit0均历史，非当前build；publicCliAliases误删已恢复。514坏SHA、vsce ls超时ZIP裁决、runtime退出未知、两次process-owner许可用尽、无根workspaceState owner未知仍保留。J01 Git VALUE0/5传播未知，不sanitize/globalGit/重启稿件。旧cybersecurity拒因未公开，不扫描/重放拒专项或换工具模型绕限。

用户批准本任务有效旧结果＋当前补验逐identity/argv增量核验，非通用cache。schema3保原receipt/direct/fresh、事件/日志SHA、真实退出及依赖/工具链/输入/选择/产物/gates；旧工具链/dirty字节unknown仅逐项人工适用，不伪known。031原0pass/1skip、165为5pass/1skip、37为40pass/1skip，340原34继承现30而4CLI退休；68仅Python核心及JS两拒绝边界，69外部根/字节未知；264/265/267/268/269/271/274仅继承未改安全逻辑不重跑。219的20857.309ms与284的20119.841ms仅用户精确本任务历史例外，不扩未来20秒。误重复/按需误跑不计覆盖，OOM/ENOBUFS/引号/规划/旧日志覆盖保留，不伪恢复日志。

520 receipt simple_cluster/reports/test-workflow/2026-11-23T02-45-43-277Z-10816-package/run.json永久绑定build f66d36946ade4b911a75636d6f2fc1f28c65111b，overall passed/exit0；361 active=125历史＋235direct＋fresh289，6按需未跑，13 gates exit0/tree confirmed、input=end、max1/锁释放。fresh289原pattern唯一1/1/wall4508ms；完整input/artifact/selection不改绑后续HEAD。packageContentPolicy保fixture12/12，releaseAcceptance首漏onDemand exit1后特批修1/1，resultCandidateMetadataExclusion仅保留mkdtemp4/4；额外真实temp删除的完整acceptance未获准未跑。mcpProjectOps11/11、windowScope8/8、续接原20.389s虽exit0仍超时无效，特批1/1 7.513s、静态固定包装acf338a1另1/1 8661.6398ms均保原边界。

520 VSIX2919747字节，SHA256 aaf19107996beae86674b16b6c25f110551e74fb70a6bd545c88d334c9b2cdba，simple-local.simple-experiment、^1.100.0/universal。ZIP/运行闭包/秘密/README、Panel模块及3真实脚本VM、10890零命中已核；20生成物fea89fbd/18cd5836/120b9384同步，首add ignore exit1但7tracked暂存，核后提交，后精确tracked update；六dirty保留。

试行 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.520 绑定7bf49ba84802df56821b098b440b289d3d3eb61e，prerelease=true/draft=false/latest=false，资产/digest/隔离下载一致。首本地tag unknown revision后真实GitHub refs核，不造tag。真实ReleaseClient证482→483、520/SFTP120不降级；权威Latest483=0fd89fa8be6778daad8398d911cd028d713241e4、SFTP118=23cbf92918c7b63cf4674a4159c3f06120037e5d。520只安装一次exit0/DEP0169，磁盘/code与MCP入口闭包一致；未来patch实查空版，只试行、不覆盖历史资产或提升Latest，不部署Agent。

## 专用520实机与新UI验收边界

专用根C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f。519 PID29888仅历史；用户Reload后520实例45080:2026-11-23T05:41:49.812Z/loopback19769，SFTP120同PID/根19767当时health/OpenAPI/listener一致。再调用先重新发现，默认API曾属稿件窗绝不能碰。稳定launcher/resolver＋真实SDK两次handshake520/listTools137/action167及经审本地只读exit0/stderr空；TEMP/g004-520-live-mcp*.json只本机保密。

offline_import/lowTraffic有效，5配置1启用/五类grant无workers、原PLAN experiments/plans/ui_u01_empty_515.yaml/空选择/experiments/results与offline-fixture两行跨518→519→520保留，无重配重授。onboarding原false且无adapter不是丢失，后实点识别变true。四RESOURCE_CONFLICT仅证lease活跃，operations空不证明死锁/释放，不清锁重放。

用户准专用窗口电脑控制/截图，遵silent-ui-screenshot/computer-use；原node_repl/@oai/sky窗口87954600，最小化首拒后还原，图像/树保原事件，未存删截图。搜索/清除实点，导航146越窗失败不算通过；识别一次，首坐标未中/等待stalled、通知755继续、Escape变布局后998恢复，末可选通知未点不妨完成。无adapter/PLAN/Worker/grant变更。TEMP/g004-520-after-ui-recognition-20261123.json证onboarding=true/status520/offline_import、panel ready/visible/sectionFailures空；render-health-probe-pending仍未知，任务/GPU/tmux/输出未核。Host仍520。synthetic/final.csv合法宽格式被filename-only误选long得0，generic_wide得2，旧“不标准”判断撤回并修产品。

## 当前修复状态与完整包审查

CSV4d7df6d2/8ed64825修预览原text/映射、metric/value/alias/0及无指标不假parseable，6/6及首两次5/6保留；catalog/mapping后续候选按execution输入。render真实RAF成功补同heartbeat ACK，保首unknown/隐藏/代次/停滞，Host pending保stalled累计，不加timer/假ok。原11/13留，用户特批旧offscreen有效dataset/末字段更正后13/13，五消息/隐藏0写/显示1写/interest/20秒不改；Host6/6。未新P0build/render VM，不提交Panel。

停止候选固定原project/client、明确Worker/本地归属；unknown保stopIntent，不猜firstWorker/force重发。发送前localOperations do/while排干保存再核，失败零POST、已发未知不重发/碰B。原12/12及v4 14/14，v2夹具13/14与v3旧输入保留，未真实停止/build。召回9412b48c仅queued，Scheduler互斥具名RPC/能力/原ID取消围栏，pending/completed proof核完整身份/窗口消失，旧端拒绝、unknown仅原ID查询，不普通stop回退。Host16/16、Python两函数假tmux1/1及精确消费者见execution，无Worker。

缓存7845afea/隔离0275a980按confirmed_paths去任务/claim/历史资格门禁，保节点/路径/根父/./叶名/类型指纹/链接/双确认。local_operations同文件lease/beforeRename保两pending集合；预留后出站，逐组unsent/admitted/ended，核原token/digest/root/opID回执及发起者close后结清，坏JSON/非ENOENT不伪空。丢回执只查原ID，文件缺失/空LIVE/TTL/owner消失不证结束；旧版抹身份不可恢复，Host重启无旧pwsh退出接口仍unknown，assertHeld到OSrename不称原子。缓存11/11、StateStore假fs1/1及消费者2/2、3/3；隔离v11 12/12、consumer1/1，v10错误码11/12保留。假端无真删/build；裸service取真实receipt。新dist后planRunIsolateRerun仅已准Map case，禁其他world。

暂存槽候选修人工一次隔离确认后隐式永久删及自动expiry删除：先reserve原source/token/node/root/paths，隔离后实际parent preview、两次完整永久路径确认，admit→delete原token→matching delete-fast receipt ack/close/settle；取消unsent可再审，prePOST失效unadmit，已尝试unknown只查原status，ended/openfalse可恢复settle。自动expiry只读发现提示能力0/2，不自动隔离/确认/删除。SFTP后端实核parent双确认/原token/有效期，已源审并同步1ed12173；auth3/3、原假expiry3/3、batch精确10安全case通过，无5000项或真实效果。SE state真实方法＋假存储/后端v4 10/10，尚未提交；stagedSlotDeleteReview新文件与manifest域须随源码同批，不能stage缺文件的manifest中间HEAD。固定历史Process包装13284446已审，只核原call/字节/事件不任意eval；未锚定1/1不冒最终锚定argv。

已源审同步的Git同根repo.add/备份root-hook-remote（0a1eb56f/82e3093b）、覆盖等待、archive同mapped根b61c0e09、Plan恢复仅ENOENT missing0b6b4b4e、模板发布前原项目围栏fedd8bc9/7dfd6db5，以及提交取消/恢复7659b4b9/b2b25d81、失败重排e8bc27fe、共享SFTP config/调度整组校验/Worker删除重核/隧道离线endpoint等ae39752c至bab13011，均按execution原闭包/首失败/日志适用，不重跑；未真实产品Git/Worker/删除/build。

工作流接受点是本机workflow_submission started:true，不是enqueue；只在接受前重核experiment/sync/agents，已有op resume不改。已接受工作不因撤权自动取消，不插共享WorkerPreparation/后续效果/tick，不新增caller授权账本，旧拒专项不重放。五类文档不恢复Worker绑定。

MCP配套170fd06e：remote.listDirs不无条件confirm，保sync授权/精确Worker根、download_paths合法相对路径，Gateway18/18+VM3/3。SFTP cancel28087f3核双ID/instance及await后原controller/归属/settled，不扩大取消；8/8+settlement3/3，首2/4留。handoff d4ed002确认/上传/marker同目标，MCP upload:true，UI/API仅marker保留、不写sftp.json。sftp_from_remote b3da0b5在marker/SSH/download前拒缺/空/坏saved scope，UI/API默认全量和paths/filter保留；3/3+Gateway1/1+范围1/1+workspace4/4。冻结请求不声称检测对端后续配置；无真实传输/取消/部署，待新包。

相邻已闭组：JobAvailability702acec8/e8edf782真实save仅显式projectContextCurrent启用mkdir/beforeRename围栏，原recallAssertCurrent契约不变；A写成功后partial不发布/tickB，observer仍带A root且消费者筛；StateStore每rename尝试核，不称OS原子。v2内存save五场景1/1＋可用性精确3/3 exit0。manifest零上下文cached check首exit1/index空，经核准标准三行上下文v2 apply/同步，不扩重试。retry/PlanCodeScope dde958c5及8f04bd1f原项目/client/targets、真实lane出站围栏已审，helper1/1＋锚定重排五项5/5 exit0；旧v1/v2不冒当前，Production/Coverage仅签名适配未跑。ProjectFileIndex带signal不共享无signal round，reset先abort旧controller。projectCodeSyncState仅夹具现有TS转译再VM7/7已同步，不冒dist。

派发/替换当前源审方向：原context/client/targets、reservation batchId及finally自有集合，A成功事实不发布/tickB；send在consent前捕原身份，隔离回执先保存，lane/对话道实际出队校验，metadata主读取与持久化后分别守发布边界。PlanRun connectionKey保实际目标语义；健康probe不换client不取消manual，实际resetClient/端点更改取消。共享已受理A固定client/精确身份只读可收尾，回调不发布B，不全局取消或中止其他合法订阅。

已源审普通串行commit/push/fetch A传输874afe1a、B同步d468b90a、C后台清理095a1fb8、D1替换9ddfea37、D2六send假端消费者eab4c1f4、D3手动/队列5ca4c0ca；真实index/UTF8/语法/manifest及三HEAD相等已核，未夹slot/Panel/stop/result/六dist。D1五文件、D2六、D3八；D1生成manifest首误写pwsh名exit1进程未启，纠正后成功，非Git失败。同步租约/接管/consent、tails出队→投影→逐项cancel、上传回调/proof守原caller，accepted cancel先存原ID再挡后项。wrapper/ProgressWait守能力等待/真正POST/明确notStarted重发，只有可证零POST标sftpNotStarted。mutation索引仅显式caller贯通baseline/能力等待，finally失效跳过新旁路、不抹A回执/误标已发；无caller不变。autoDelete守迁移/status/每个未发组及空父实际发送，原A回执先保存、未发原token可续，不加账本；completed返原receipt、unknown不重发，原双确认/节点/路径/类型/根父/./叶名保留。

真实fake验证均原20秒、exit0无超时：dispatch新增v3 2/2＋原正常2/2、replacement4/4、共享读取6/6＋17/17；send精确handoff1/currentTruth2/identity1/workerProof2/idleGpu integration2共8项；isolated2/profile5/upload锚定v1与v2各1；codeSync v2 2/2；sftpCaller v1 2/2旧输入，最终含索引旁路v2 3/3，总控实读原日志；Agent准备及路径各两静态项2/2。dispatch首正则启动错误、v2缺AbortController首1/2及codeSync v1缺warmProof fake首1/2保留。新第3case误将upload路由index的夹具已在运行前指出修正，无伪失败。日志/事件/输入归属见execution，不冒整文件/当前整链通过。

待新dist必做许可不变：manualDispatchHost原11项单文件一次；distributedPlanExecutionMode仅前三种validated mode精确case；更早resultSync/slot及五隔离消费者照原精确限额。当前未compile，不跑旧dist冒当前源码；D源码VM/静态验证与最终编译消费者是独立状态。

D反向夹具补齐：manualLaunchMessage仅加固定原context/signal/current接口，原GPU配额及三消息不变；memory/quota原锚定各1/1、661.0485/698.2994ms，包装子/外exit0。helper 1b3d44a7；workerPreparation仅原取消文案匹配及末项原context，8/8、3342.686ms、双exit0，2213f8d6已普通同步并实核三HEAD相等/index空。日志TEMP/g004-manual-context-{memory,quota}-v1与g004-worker-preparation-context-v1-20261124，原完整身份及94/95/103仅按已审分支适用，无WSL/真实Worker；saveSchedulerConfig为同合法输入等效、非字节相同。包装不冒ordinary direct。

E替换隔离五产品已源审：原caller贯通预览/确认/预检/状态/隔离实际SFTP、Manifest原client与索引发布；无共享可变guard/新账本/锁。首候选status并发覆盖及首check先guard丢事实已返修：原observing(id)串行、排队后读，普通无guard共享，某caller失败不取消下一合法调用；原A完成回执先save再挡后续。TEMP/g004-plan-cleanup-context-v1-20261124.out.log为8/8、506.8637ms、子/外exit0、stderr空，纯内存save/SFTP/fs与源码VM。generic仅明确sftpNotStarted回pending，8case未走该hunk；已发未知保executing。五产品+新test+manifest共7文件16ade9d3已普通同步，Host原slot未夹；文档3f4b9925后实核HEAD=origin/master=FETCH_HEAD、index空。未声称fastdelete/restore/完整history及全部独立删除通用caller闭合；真实效果/world/build仍禁。

## 增量构建、最终路线与终点

P0 npm run build含完整测试域，不能以build批准隐式跑禁区。现有G004入口固定本仓max1，build按identity＋argv为已审package严格子集，package仍集合相等；build不是assemble凭证。095a1fb8＋当时dirty只读规划322build/374package、0按需、missing0，仅导航；旧318/370不沿用，D/E/登记变化后须重算。planG004Execution首拒legacy漂移exit1仍真；逐实际提取函数/消费者闭包消解历史依赖，不批替hash/便宜全重跑。compiledInputs须真实新compile后冻结，不拿源码VM冒dist。

sftpCaller/planRun/codeSync/isolatedAutoDelete/planCleanup ContextFence五新identity、F的mcpDraftContracts/mcpActionCatalog及workerPreparation包装输出不满足ordinary direct，亦非历史stage固定wrapper；planCodeScope旧full12+新增精确1/1不冒当前full13。最终相关源码/fixture冻结后，这九全文件按原argv/20秒经既有runner fresh各一次、max1，现在不运行。planCodeScope仅保留私有fixture/Python抽函数10000ms，原mocktimer阈值不改。原call/进程exit/timeout/日志/失败保类型，不冒direct/treeconfirmed或新增通用解析器；同输入package复用真实fresh。

runner旧证据：1e91d0d4原38 test body及共享helper与现40逐AST相同；35旧eligible sourceJobs255..287/290/291各pattern仍唯一同case，及direct af4ee4a9/0ebf2208两精确项仅test文件/runner依赖变化，默认非G004路径已审适用，允许更新该两依赖basis，不改原call/退出/工具链unknown及219/284历史例外，不扩至新case。e467ce4d旧G004 unit8746ms不继承：当前277行新增build子集/package严格集合断言，效果仅保留合成workspace/日志/事件、mock deadline及PowerShell静态Parser，wrapper只假fs/VM，不执行事件/Python。准最终冻结后原锚定 ^runner: G004 reviewed legacy evidence preserves origin and refuses drift$ 20秒fresh一次，与289/fixed-stage独立。

Agent旧af809d70→当前4cd5364e那次差异仅552函数/类中的cache_delete_exact_file/handle_action/tracked_cleanup_action/serve_http及ACTION_PATHS/新CACHE_CLEANUP_RECEIPTS；runtime/RemoteResourcePrefix/ResultLayout导入未改。总控已按真实分支审的24旧job及14 direct仅更新该Agent依赖的适用判断；原31 Windows skip、68外部JS未知、219历史超时/工具链unknown保留，不批签所有依赖/新缓存能力。第一次未展开String.raw插值AST失败是只读工具错误，不产品语法证据。

SFTP当前73文件证据未齐：120原69/466仅aggregate、逐日志目录空，119有56日志13缺，Node/Python/WSLunknown。已审补验apiBackpressure4/4、apiUploadProgress4/4、cleanupExplicitTarget1/1均exit0，分别假SSE/假spawn/VM假SSH；最后仅生成Python字符串未启动Python。旧逐闭包适用不由新单项合成完整包通过。原日志、真实退出和未测保留。

最终稳定HEAD/输入后，planning289原精确pattern唯一fresh一次，新runner仅锚定 ^runner: G004 staged slot fixed wrapper evidence$ finalfresh。新dist后resultSyncFailureVisibility及jobArtifactStagedSlotIdentity原20秒各单文件一次；五旧隔离消费者仅指定case不整world。F的mcpProject仅锚定 ^routine cleanup queries need no extra Codex prompt$ 新dist后20秒一次：私有mkdtemp保留/假端/配置生成读新目录，无网络删除；适配断言随F提交不冒当前已验。Panel须真build＋模块/真实渲染脚本VM/node-c、10890零命中，未经门禁不提交。其余动态先审效果。

下一动作：唯一执行持续查修现行单项目入口，当前完整包由总控核真实diff/负责链/反向消费者及fake效果后一次给精确验证与scoped同步决定；母集精确区分当前已审、未审、仅外部受限，不复活退役。逐项收敛SE/SFTP增量证据→实际最小build及批准的新dist消费者→确定新patch同步package/lock/runtime/稳定write-agent-runtime→单次集中package max1并核actual exit/gates/input=end/selection/artifact/lock/P0/包闭包秘密README/平台版本SHA→scoped源及生成物FF同步，诚实保receipt原HEAD绑定→immutable试行tag/prerelease=true/latest=false、精确VSIX/UTF8 sha资产/远端digest隔离下载/真实更新客户端不降级权威→每目标版install:latest一次，无force/降级，同版skip→核安装/MCP入口后停面板等用户Reload→专用根新Host身份下真实安全本地UI/MCP验收→统一交付。源码push、包、Release、安装、Host/远端部署各状态独立；不部署Agent，不把本地fake通过冒真实Worker完成。整项达此终点才结案，局部问题不停止其他授权工作。
