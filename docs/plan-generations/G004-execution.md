# G004 执行登记

本文件cap12000/90%=10800。本次压缩前完整记录见 `8f04bd1f:docs/plan-generations/G004-execution.md`，更早见 `e8edf782`、`33b70559`、`43efb031`、`6f829e1d`；原日志、失败、未知、现场与批准均保留，coverage记录逐ID证据。历史结果不覆盖变化后的源码。

## 当前边界与历史交付

禁止真实Worker、SSH、服务器、tmux、GPU、传输、删除、active results和跨项目；当前仅授权假端和指定单项目本地检查。保护六项旧dirty dist、历史资产和夹具。业务CLI及整个草稿机制已退役，不恢复；39旧源码删除和同步见 `0ff5b277`，旧dist和全局shim保留。原361 active为125历史、235直接、1新运行，6 onDemand未运行；219/284本任务历史超时例外不扩至未来20秒。

520构建绑定 `f66d3694`、13 gates通过，包2919747字节及SHA256 `aaf19107996beae86674b16b6c25f110551e74fb70a6bd545c88d334c9b2cdba`；闭包/Panel/10890通过、20生成物同步、6旧dirty保留。试行tag指向 `7bf49ba84802df56821b098b440b289d3d3eb61e`，非Latest，远端资产一致；唯一安装exit0及DEP0169、shim见 `86e35b7b`。520专用窗口只读UI/MCP、识别及首坐标失败见 `0a662506` 和coverage；未查Worker/GPU/tmux。后续源码未build或部署，520不证明现状。

B1首次失败与20秒timeout、TS首exit2、删除首policy拒绝进程未启、runner OOM/依赖drift/旧日志覆盖、各夹具失败及恢复、fetch TLS失败与恢复、直接作业误重复及onDemand误运行均保留于 `43efb031` 所列具体历史版本与日志，误运行不计覆盖。mcpProjectOps 11/11、windowScope 8/8及freshResultHost特批原限额复验1/1的边界见同记录。历史工具链、skip及文件缺口仍为未知，不冒通过。

合法宽CSV误选long导致0记录，预览现传原文与映射、仅统计有指标记录，显式metric/value、alias和0值原6/6 exit0，日志 `%TEMP%/g004-preview-mapping-zero-20261123.*.log`；首失败见 `18f587b2`。真实RAF同心跳ACK与Host停滞保护候选原11/13失败，修复并按本人批准修夹具后13/13，Host 6/6；日志 `g004-render-probe`、`g004-render-full-current`、`g004-render-host-progress`，均在TEMP且保留。仍须当前build及实际render脚本VM，旧316 job规划已过期。
## 当前补充调查

压缩前完整逐项、首失败、日志、真实限制及历史状态保留在 `7dfd6db5:docs/plan-generations/G004-execution.md`；当时的候选/HEAD为历史，以下是当前事实。旧资料不可代替新源码构建。

停止路由候选按精确Worker/command停止并保留unknown意图，假端12/12及首失败见 `cd66811a`；渲染和结果候选仍未build、未安装。草稿和业务CLI已退役，旧记录仅历史事实。

缓存、Plan恢复、Git绑定及SFTP取消/交接/下载范围的提交、原验证、失败和限制见8f04bd1f及coverage；本地缓存不能证明未知执行器结束。旧119/120日志与工具链缺口未消除；旧316项规划过期，Agent旧证仅按已审精确依赖适用。

输出模板项目围栏 `fedd8bc9`/`7dfd6db5` 假端4/4；首2/3失败及审核页5个确认变体见历史记录 `d70e1b40`/`3a916416`。未build或真实删除。

隔离永久删除 `0275a980` 仅原身份/回执结清，丢回执不因文件缺失认结束；跨Host未知与旧版已抹身份限制保留。假service v9 11/11、v11 12/12及缓存消费者v1/v2各1/1 exit0；v10首11/12因错误码断言失败，v1至v10原日志见8f04bd1f及coverage。无真实删除或build；planRunIsolateRerun仅已准精确case待新dist，其他fixture未跑。

Git覆盖项目围栏假端v2 3/3、v1 2/2；日志与边界见 `33b70559`，无真实覆盖或删除。

总控更新plan时首次候选16267字符触发写前断言退出1，外层后续diff-check显示0；文件未写。缩短后16183字符并UTF8复读通过，原事实保留。

SFTP共享配置读取和发布围栏假端v1 3/3、v2 4/4、v3 5/5及消费者1/1，原日志见 `33b70559`。仅ENOENT作缺省，发布前比对文本；检查与rename非不可分割事务，未触真实配置或Worker。

原setupWorkDirectoryWorkflow静态消费者夹具仍要求已退役Hub文案；按当前Worker唯一入口更新等价检查后，纯源码文件 `%TEMP%/g004-sftp-profile-original-consumer-v3-20261123.{out,err}.log` 3/3 exit0。它不执行Agent、项目配置或Worker操作，也不证明外部效果。

调度配置与Worker删除确认均经假配置及原消费者定向验证；同步与详细日志见 `d766909a:docs/plan-generations/G004-execution.md`，未触真实设置、Worker或共享配置。异步保存可能部分写入，不宣称回滚。

资源树tmux文案和Panel探针待build及真实内嵌脚本VM；隧道脚本与离线导入项目围栏各假端2/2，Agent按钮缺endpointId拒绝假端1/1，原日志见33b70559；未触真实脚本、网络或Agent。

47a1681d旧build规划316项、0按需，日志 `%TEMP%/g004-build-plan-47a1681d-20261123.out.log` exit0；planG004Execution首拒legacy漂移exit1。legacy 138、PlanCleanup 64、Panel 23为重叠的依赖漂移导航，不能批量重绑或判通过；逐闭包核旧MCP查询，CLI保持退役。

召回路径的排队判定、Scheduler互斥与原请求身份核实已源审并同步 `9412b48c`；Host假端v11 16/16、Python抽函数v2 1/1、原消费者精确项均exit0。旧协议消费者v1 4/5失败及v2/v3修正、所有原日志和未知回执限制详见 `d766909a:docs/plan-generations/G004-execution.md`；不重发未知请求，未运行真实Worker或build。

提交取消与恢复入口等待中切项目可能继续写旧回执或用新根释放claim；绑定原项目并在发布前重核，假端 `%TEMP%/g004-plan-submission-project-v2-20261123.{out,err}.log` 3/3 exit0，writer闭包修正v3精确项1/1 exit0。已写回执不回滚，未访问真实项目或claim；源码已同步 7659b4b9、b2b25d81，未build。

归档复制绑定项目及实际映射根，v2/v4各2/2、原消费者1/1；首v1 0/2因缺makeOpId，日志与 `ae39752c` 至 `bab13011` 已审修复见 `d766909a`，最终同步 `b61c0e09`，无真实Worker/SFTP。

失败job重排绑定原项目，假队列 `%TEMP%/g004-recall-failed-project-v1-20261123.{out,err}.log` 1/1 exit0，已同步 `e8bc27fe`，未运行Worker。2026-11-23执行角色正式释放、结束归档并接替；新Terra/high/default match/continue，指针及裁决 `43efb031`，受保护dirty及旧资产不动。

停止请求原先发送后迟到可能修改新项目状态，且200ms延迟保存可在切换时丢失意图。当前候选固定原项目/client，在发送前等待原有localOperations持久化队列排干并复核，保存失败或切换零POST；已发结果未知不重发、不清新项目缓存。纯VM假端 `%TEMP%/g004-stop-context-v4-20261123.{out,err}.log` 14/14 exit0；v2首13/14 exit1为夹具reply尚未初始化，显式等待假POST后v3 14/14，后补single-flight竞态得v4。无真实Worker或跨项目效果；待当前build。

暂存槽：人工隔离后永久删除另经完整路径双确认；自动过期只做当前identity/lane只读发现，提示人工。SFTP新请求验证实际parent双确认、节点/根、原token与目标及有效期；旧未知不因目标缺失认定结束。`%TEMP%/g004-sftp-slot-auth-v5-20261123.{out,err}.log` 3/3、原假回收三case旧v1 3/3、原batchDelete精确10个假transport安全case `%TEMP%/g004-sftp-batch-parent-v1-20261123.{out,err}.log` 10/10均exit0；未运行5000项或真实删除。删除发送只同步返回receipt；丢回执后无已证原执行器结束查询，保留unknown供原token查询、不重发，目标不存在不等于结束。

SE候选在隔离前复用同lease状态冻结身份，审核入口允许原请求核查，双确认后admit再发送；已证发送前失效unadmit，已发送未知保留，持久ended重建后settle。真实state方法+假存储/假端 `%TEMP%/g004-stage-review-v4-20261123.{out,err}.log` 10/10 exit0，包括两Host冲突、重启、取消及项目漂移；SFTP源码经总控源审、node --check与UTF8/diff检查后普通推送并fetch一致 `1ed121738969d8ec5a79693910e4463e993ecff8`；SE候选未提交。两者均未build、安装或实际远端执行。原resultSync消费者已按新链调整，含私有fixture rename及保留行为；总控已准新dist后按原限额一次，当前未运行。一次误在SFTP cwd只读SE路径exit1，无写入；另一处误路径rg亦未触产品。

43efb031旧build规划316项/0按需exit0，真实planG004Execution因legacy漂移exit1；两日志 `%TEMP%/g004-build-plan-43efb031-slot-20261123.{out,err}.log` 与 `g004-build-plan-evidence-43efb031-20261123.{out,err}.log` 保留，旧计划不代表当前build。SFTP 73项旧日志及闭包未齐。一次rg脚本通配路径错误未写文件。

2026-11-23：总控批准首次新编译后原20秒各运行一次 resultSyncFailureVisibility 与 jobArtifactStagedSlotIdentity；当前仍未build。stage review已加入既有latest-artifacts域；当前只读规划build 317、package 369，build为package子集，新runner case仅在package。原stage v4测试后仅stop do/while改动不在其两项提取方法；覆盖登记当前适用冻结、原事件及测试时整文件hash未知。固定历史Process包装验证器及纯内存定向case `%TEMP%/g004-runner-stage-wrapper-v1-20261123.log` 1/1 exit0，已审并普通推送fetch一致 `13284446377496a930658112d9a1ab7d3750c6fd`。该次case的未锚定pattern与最终package规划的锚定argv不同；后者仅登记最终冻结后的fresh候选，不冒称已跑。未运行build或部署。
证据整理中两次内存编辑脚本分别因查找格式不符和字符串替换中的 `$` 展开退出非零，均在写文件前退出；修正为精确对象及回调替换后UTF-8 JSON解析/diff检查通过，未触业务或运行测试。
旧317项规划及SFTP 42项闭包审核仅为条件适用候选，余证据和旧工具链未知；不能凭dry-run放行。
原ID续核：树目录展开、问题过滤、详情展开、根标签、表格展开与运行确认取消6项，复用原假端/receipt并核源码未变；未运行真实任务或删除。五次只读统计/证据整理脚本分别因空值、旧格式假设、AST路径错误、git show输出超默认缓冲、对象标记格式不匹配退出非零，均写入前退出；修正后JSON解析及diff检查通过。

总控审准SFTP两原单文件：apiBackpressure与apiUploadProgress顺序各4/4、exit0、stderr空，日志 `%TEMP%/g004-sftp-api-{backpressure,upload-progress}-v1-20261124.{out,err}.log`，原调用和依赖登记coverage；假SSE及假上传子进程，无真实监听/SSH/传输。只读查rollout时额外指定不存在的11/24日期目录导致rg exit2，实际11/23 rollout命中有效，无写入。
3c132bdc旧规划及154个重叠依赖漂移导航详见 `d70e1b40:docs/plan-generations/G004-execution.md`；均非当前build或通过。
projectCodeSyncState旧VM直接执行新增TS类型语法导致只读语法检查SyntaxError；按总控批准以现有TypeScript先转换再运行，原测试单文件 `%TEMP%/g004-project-code-sync-state-v1-20261124.log` 实际7/7、exit0，私有fixture保留，未触unlink/Worker/真实配置。原旧7/7证据保留，新direct按实际事件与依赖登记，单identity只读规划验收通过；修正已普通推送fetch一致6bcc43dce912f7778d86010b84edeb13a689ec5b，不冒dist验证。
只读整理曲线入口时首次按紧凑JSON对象查找而原文件为缩进格式，脚本写前退出非零；修正后JSON解析通过，未触产品。曲线入口沿用原507专用窗口历史点击与当前源码闭包，未启动viewer或查询Worker。
任务可用性入口发现等待队列、输入及写盘期间切项目可能继续旧client读取或把A队列缓存发布到B并触发B调度；候选复用原上下文和已有beforeRename围栏，A成功后变化保留已写事实并显示partial、不刷新/tickB。真实save方法+内存存储v2 `%TEMP%/g004-job-availability-save-v2-20261124.log` 1/1，原可用性文件选中3项v2 `%TEMP%/g004-job-availability-context-v2-20261124.log` 3/3均exit0；v1两日志各1/1、3/3保留。总控源审通过，所需legacy五hunk及本组文件已普通推送并fetch一致702acec84e95c540a7abbdd5128a16e8f10be1e6；混合文件其余候选仍未build/提交，不冒真实Worker或跨项目。两次rg误传PowerShell通配符exit1，另一次日志提取因JSON转义格式未匹配写前退出；均无产品写入，修正后结果如上。
JobAvailability源码/夹具及精确manifest已审并同步；原v1补丁缺上下文check exit1、index空，v2正常check/apply，详细失败与日志见 `d70e1b40:docs/plan-generations/G004-execution.md`。

SFTP cleanupExplicitTarget经总控效果审查后原单文件VM假端1/1、exit0，日志 `%TEMP%/g004-sftp-explicit-target-v1-20261124.log`、事件及依赖见coverage；未执行Python/SSH/网络/删除，旧120单项日志及工具链仍缺。

重排项目/client及源码查询排队发送围栏经总控源审并同步 `dde958c5`；假查询 `%TEMP%/g004-plan-source-client-v1-20261124.log` 1/1（call_b6f46d70a51a450c80cdb956c852b0bf）、重排精确五项 `%TEMP%/g004-requeue-context-v3-20261124.log` 5/5（call_53a2ad914c394a96988a26aac48ef2ad）均exit0；v1 3/3及v2 5/5只对应旧输入，源审两次因新边界暂缓；未运行旧Production/Coverage整文件，未实际删除、访问Worker或build。

服务器队列、手动派发与替换审核候选绑定原项目/client及batchId，保共享只读工作和已受理原回执；等待后递归、lane出队及发送边界防止转用新client。总控审核后假端：dispatch新增v3及正常各2/2、replacement 4/4、共享snapshot autofallback 6/6和completed 17/17，均exit0无超时；日志 `%TEMP%/g004-{dispatch-context-v3,dispatch-normal-v1,plan-run-context-v1,snapshot-autofallback-v1,snapshot-completed-v1}-20261124.{out,err}.log`。dispatch v1启动参数错误exit1，v2缺AbortController为1/2 exit1，原日志保留。总控指针f53cf057及计划7fd0c72b独立推送核一致。

send原消费者经效果审的精确选择依次1/1、2/2、1/1、2/2、2/2，均exit0且无超时，日志 `%TEMP%/g004-send-{handoff,truth,identity,proof,native}-v1-20261124.{out,err}.log`；仅源码VM/假端，非整文件或新dist。sync上传、后台清理及实际SFTP发送围栏已源审；后续源码变化不自动继承旧测试。

获准假端：isolated2/2、profile5/5、upload结构v2 1/1、code sync v2 2/2、SFTP caller最终v2 3/3，均exit0未超时，日志 `%TEMP%/g004-{isolated-context-v1,profile-fence-v1,upload-branches-v2,code-sync-context-v2,sftp-caller-context-v2}-20261124.{out,err}.log`；code sync首v1因fake缺rememberCodeSyncWarmProof为1/2 exit1，修后通过；upload结构v1及SFTP caller v1只属旧输入。prepare/path消费者各精确2/2 exit0，日志 `%TEMP%/g004-{preparation-consumer,path-consumer}-v1-20261124.{out,err}.log`。源审后传输、同步、清理、替换、fixture、派发六批依次普通推送并fetch一致874afe1a、d468b90a、095a1fb8、9ddfea37、eab4c1f4、5ca4c0ca。四新测试包装非runner direct，最终冻结后各按既有runner fresh一次；manual11及mode3待新dist，未build/实际外部效果。一次误写pwsh可执行名exit1、两次rg通配符误用exit1/2，均未写入。


替换隔离E批绑定原调用方至预览、确认、实际隔离发送和索引发布；原已接受回执先保存，同ID观察串行，过期调用者不取消其他观察。假端 `%TEMP%/g004-plan-cleanup-context-v1-20261124.{out,err}.log` 8/8、exit0，真实源码/内存fake，不证明真实删除或生产持久化CAS；非managed及fast delete/restore/history未宣称通用caller闭包。源码经总控审并推送fetch一致 `16ade9d3f488ef4dc9e639736ed980ee04afaeb8`，仍未build。最终冻结后按既有runner原单文件fresh一次，旧Process包装不伪装direct。索引补丁生成v1因检查误识别hunk头写前exit1，v2正常check/apply；保留原现场，未改Git历史。coverage两次branch行选择写前exit1（路径错、匹配17而非11），限定currentTargetedEvidence后11行成功；只读rg通配与不存在脚本错误亦无产品影响。


草稿整体退役漏口F：取消metadata后台reconcile，旧API/invoke/UI拒绝并从现行MCP目录移除6项；历史文件、数据与旧测试事实保留。原mcpDraftContracts当前拒绝契约假端5/5、exit0，日志 `%TEMP%/g004-draft-retirement-v1-20261124.{out,err}.log`；源码5文件已审并同步 `94a9a0c1`。mcpProject单项待新dist；当前catalog131是源码事实，不改520历史。受影响mcpActionCatalog等价假表更新后1/1、exit0，日志 `%TEMP%/g004-mcp-action-retired-v1-20261124.{out,err}.log`，同步 `88b351a6`。两次Process包装结果非ordinary direct，最终按原单文件runner fresh候选，未构建；临时draftRetirementBoundary文件保留未登记。原旧draft三case对应退役目录、RPC拒绝及路径/grant零效果，不伪称旧行为继续通过。一次只读rg误取不存在test/mcp路径exit2；runner证据AST误定位及本记录首压缩超阈值均写前exit1，无产品/Git影响。


派发消费者夹具绑定原项目context：manualLaunchMessage独立同步 `1b3d44a7`；gpuMemory、gpuQuota各原精确1/1 exit0，日志 `%TEMP%/g004-manual-context-{memory,quota}-v1-20261124.{out,err}.log`。原4文件全量旧证仅按审定闭包条件适用，未新跑WSL或整个GPU文件。workerPreparationPipeline两处等价夹具同步 `2213f8d6`，原完整8/8 exit0，日志 `%TEMP%/g004-worker-preparation-context-v1-20261124.{out,err}.log`；均内存fake/Process包装，最终runner同身份fresh按批准候选，未执行真实Worker或新dist。

证据登记一次因误写 SimpleSftpProgressWait 路径在写前退出1；核实际 `src/core` 后修正，JSON解析通过，未改业务文件。

MCP旧证撤回：总控漏核optionalApi的live.output错误分支，Active/Persisted/Health/Failure/Inspect/History/LogsConfig及QuerySchema旧direct降历史ineligible，原call/日志保留。fake仅对live.output返回-32601，七原单文件依次6/4/6/6/6/9/1项通过、同步 `8d356e69`，QuerySchema 4/4同步 `b11a66a3`，均exit0且无真实网络/Worker/删除。Active与Query为literal direct；六项串行循环调用真实通过但parser不支持，最终冻结后各runner fresh一次。选行两次重复匹配、对象路径及PowerShell花括号错误，另本记录压缩两候选触阈值10806/10823，均写前失败，已纠正。
