# G004 执行登记

本文件cap12000/90%=10800。本次压缩前完整记录见 `e8edf782:docs/plan-generations/G004-execution.md`，更早见 `33b70559`、`43efb031`、`6f829e1d`；原日志、失败、未知、现场与批准均保留，coverage记录逐ID证据。历史结果不覆盖变化后的源码。

## 当前边界与历史交付

禁止真实Worker、SSH、服务器、tmux、GPU、传输、删除、active results和跨项目；当前仅授权假端和指定单项目本地检查。保护六项旧dirty dist、历史资产和夹具。业务CLI及整个草稿机制已退役，不恢复；39旧源码删除和同步见 `0ff5b277`，旧dist和全局shim保留。原361 active为125历史、235直接、1新运行，6 onDemand未运行；219/284本任务历史超时例外不扩至未来20秒。

0.5.520构建绑定 `f66d3694`，13 gates exit0，包2919747字节、SHA256 `aaf19107996beae86674b16b6c25f110551e74fb70a6bd545c88d334c9b2cdba`，闭包、Panel及10890检查通过；20生成物已同步，6旧dirty保留。试行tag v0.5.520指向 `7bf49ba84802df56821b098b440b289d3d3eb61e`，prerelease且非Latest，远端资产及隔离下载一致。唯一安装exit0、DEP0169警告；安装与shim见 `86e35b7b`。专用窗口520 UI/MCP只读及识别证据、首坐标失败和范围见 `0a662506`、coverage；未查Worker/GPU/tmux。当前后续源码未build、部署或安装，不能沿用520包证明。

B1首次失败与20秒timeout、TS首exit2、删除首policy拒绝进程未启、runner OOM/依赖drift/旧日志覆盖、各夹具失败及恢复、fetch TLS失败与恢复、直接作业误重复及onDemand误运行均保留于 `43efb031` 所列具体历史版本与日志，误运行不计覆盖。mcpProjectOps 11/11、windowScope 8/8及freshResultHost特批原限额复验1/1的边界见同记录。历史工具链、skip及文件缺口仍为未知，不冒通过。

合法宽CSV误选long导致0记录，预览现传原文与映射、仅统计有指标记录，显式metric/value、alias和0值原6/6 exit0，日志 `%TEMP%/g004-preview-mapping-zero-20261123.*.log`；首失败见 `18f587b2`。真实RAF同心跳ACK与Host停滞保护候选原11/13失败，修复并按本人批准修夹具后13/13，Host 6/6；日志 `g004-render-probe`、`g004-render-full-current`、`g004-render-host-progress`，均在TEMP且保留。仍须当前build及实际render脚本VM，旧316 job规划已过期。
## 当前补充调查

压缩前完整逐项、首失败、日志、真实限制及历史状态保留在 `7dfd6db5:docs/plan-generations/G004-execution.md`；当时的候选/HEAD为历史，以下是当前事实。旧资料不可代替新源码构建。

停止路由候选按精确Worker/command停止并保留unknown意图，假端12/12及首失败见 `cd66811a`；渲染和结果候选仍未build、未安装。草稿和业务CLI已退役，旧记录仅历史事实。

缓存confirmed_paths源码 `7845afea`、Plan恢复 `0b6b4b4e`、Git项目绑定 `0a1eb56f`/`82e3093b` 已同步；原假端验证、首失败及真实效果限制见压缩前记录。缓存持久请求和原子发布围栏不能证明重启前未知执行器退出。

SFTP `28087f3`、`d4ed002`、`b3da0b5` 分别修取消归属、交接目标和严格下载范围，受控测试和首次失败见压缩前记录及coverage；旧119/120逐文件日志及工具链缺口仍待收敛，未实际传输或安装。只读比对时误猜tag `0.2.120` exit1，随后查得 `v0.2.120` 并完成差异对照；未执行Git写入。

增量build此前规划316任务/0按需，旧HEAD和selection已过期。Agent仅24旧job与14 direct的精确依赖按总控审阅适用，旧skip/超时/工具链未知保留；下一首拒legacy漂移，未运行编译、构建或矩阵。逐ID现行源码及有界旧证见coverage，不能汇总为全部通过。

输出模板生成项目绑定及发布前fence `fedd8bc9`/`7dfd6db5` 已同步并经总控源审，假端4/4 exit0，首2/3失败及原因见压缩前记录；未build。审核页5个确认变体逐ID受限证据见 `3a916416`，实际删除/覆盖未执行。

隔离永久删除源码 `0275a980` 已同步：去历史队列资格门禁，原ID及后端逐组发送状态持久化，同锁防重复；旧未知不得因文件缺失抹除，已发组仅真实对应回执可结清。纯内存真实方法 `%TEMP%/g004-isolated-confirmed-v9-20261123.{out,err}.log` 11/11 exit0，前v1至v8各自真实结果保留；共享缓存原消费者 `%TEMP%/g004-isolated-cache-consumer-v1-20261123.{out,err}.log` 1/1 exit0。原fixture含rename未执行；跨Host崩溃后原发起者未证结束保持unknown，旧版已完全抹除的身份不能恢复。不称构建、部署或真实效果通过。

裸PlanCleanup内部消费者使用真实后端completion receipt判定，不因缺Host钩子假成功；`%TEMP%/g004-isolated-confirmed-v11-20261123.{out,err}.log` 12/12 exit0，含完整真实service配内存fs/后端的完成及丢回执。首次v10 11/12 exit1，因测试把apiData.code按message匹配，修断言后复验；原日志保留。共享缓存当前单项 `%TEMP%/g004-isolated-cache-consumer-v2-20261123.{out,err}.log` 1/1 exit0。原 planRunIsolateRerun 精确case的fixture已更新真实协议字段，原断言保留、尚未执行，待实际新build产物后按总控批准原20秒验一次；其他旧fixture/oracle也未运行。

Git覆盖审核候选冻结项目并在后续效果前复核，假端v2 3/3、v1 2/2均exit0；日志及精确边界见33b70559，未执行真实覆盖或删除。

总控更新plan时首次候选16267字符触发写前断言退出1，外层后续diff-check显示0；文件未写。缩短后16183字符并UTF8复读通过，原事实保留。

共享SFTP配置读取/项目切换围栏：仅ENOENT视为缺省，坏格式及其他错误可见；假端v2 4/4、v1 3/3均exit0，原日志见33b70559；未触真实共享配置或Worker。

共享文件发布前另比对原始文本；v3假端5/5及原消费单项v2 1/1 exit0，原日志见33b70559。发布前检查与系统rename非不可分割事务。

原setupWorkDirectoryWorkflow静态消费者夹具仍要求已退役Hub文案；按当前Worker唯一入口更新等价检查后，纯源码文件 `%TEMP%/g004-sftp-profile-original-consumer-v3-20261123.{out,err}.log` 3/3 exit0。它不执行Agent、项目配置或Worker操作，也不证明外部效果。

调度设置原先边构造数组边调用config.update，后续字段校验失败时前面的全局设置可能已写；现先计算并校验整组再启动原更新。真实Host方法配假配置 `%TEMP%/g004-scheduler-config-validation-20261123.{out,err}.log` 2/2、原设置消费者 `%TEMP%/g004-scheduler-settings-consumer-20261123.{out,err}.log` 4/4、配额精确case `%TEMP%/g004-scheduler-quota-consumer-20261123.{out,err}.log` 1/1，均exit0。未修改真实设置；若实际update异步失败，已发生的其他更新仍可能保留，不称事务回滚；未build。

删除Worker配置确认等待期间，同ID配置可被替换；现重核被确认的配置快照，变更则要求重确认，原取消及只移除所选项不变。真实方法配假配置 `%TEMP%/g004-worker-config-confirm-20261123.{out,err}.log` 2/2，原消费者精确case `%TEMP%/g004-worker-config-consumer-20261123.{out,err}.log` 1/1，均exit0；未修改真实Worker或共享配置，未build。

资源树tmux提示改为使用刷新按钮，不发真实查询；与Panel健康探针共同等待build及真实内嵌脚本VM门禁。

隧道脚本生成前复核项目及实际Worker参数，假端2/2 exit0，原日志见33b70559；未写真实脚本或连接服务器。

离线导入读取后先核原项目再暂停实时流，假端2/2 exit0，原日志见33b70559；未导入真实文件或断开网络。

Agent按钮缺endpointId明确拒绝，假部署1/1 exit0，原日志见33b70559；未启动或连接Agent。

47a1681d旧build规划316项、0按需，日志 `%TEMP%/g004-build-plan-47a1681d-20261123.out.log` exit0；planG004Execution首拒legacy漂移exit1。legacy 138、PlanCleanup 64、Panel 23为重叠的依赖漂移导航，不能批量重绑或判通过；逐闭包核旧MCP查询，CLI保持退役。

召回路径原缺陷：Panel声明只召回排队job，但旧协议2整Plan分支遍历全部job；旧returnPulledJobToLocal可把运行/完成job改pending并清原事实。确认后重读也未在首写/首停前核冻结job的Worker与command；后台processDistributedRecall在unknown后可能自动重复发送停止。原prequeueRecallLifecycle旧oracle期望同ID重发，不能当现行授权。候选增加Scheduler互斥内具名排队召回、取消围栏参与准入，旧端不走普通停止回退；旧协议未知请求不重发。纯假端Python抽函数 `%TEMP%/g004-queued-recall-scheduler-v1-20261123.{out,err}.log` 1/1、Host及持久队列 `%TEMP%/g004-queued-recall-host-v7-20261123.{out,err}.log` 12/12，均exit0；无真实Worker。原观察只看到取消围栏，不能区分普通停止；现候选在Scheduler窗口option记录原请求pending/completed并核完整身份后主动观察，Host纯假端v11 16/16及Python两函数假端v2 1/1均exit0；旧证明写失败和kill失败保持unknown。原native消费者三个精确case各1/1 exit0；旧协议消费者首v1 4/5 exit1因夹具仍假定已拒绝的项目提升，v2用显式已提升队列保留原projection断言后该case 1/1，v3新增原请求ID核对1/1，完整日志保留。源码已源审并同步 9412b48c，未build。

提交取消与恢复入口等待中切项目可能继续写旧回执或用新根释放claim；绑定原项目并在发布前重核，假端 `%TEMP%/g004-plan-submission-project-v2-20261123.{out,err}.log` 3/3 exit0，writer闭包修正v3精确项1/1 exit0。已写回执不回滚，未访问真实项目或claim；源码已同步 7659b4b9、b2b25d81，未build。

归档复制项目/目标围栏假端v2 2/2；首v1 0/2 exit1因夹具缺makeOpId，原日志见33b70559，未访问Worker或真实SFTP。

总控对 ae39752c 至 bab13011 的共享SFTP配置、调度设置、Worker确认、隧道脚本、离线导入、端点及Git预览修复已完成源码复核；此前各定向日志按其原输入复用，真实外部效果仍未执行。

总控指出v3仍按旧setup根显示而实际目标由agentProjectDir决定；改为同一mappedDownloadServerForSource实际根用于确认和下载。v4假端提取真实目标解析链，`%TEMP%/g004-archive-copy-fence-v4-20261123.{out,err}.log` 2/2 exit0；原consumer精确项 `%TEMP%/g004-archive-copy-consumer-v1-20261123.{out,err}.log` 1/1 exit0，私有fixture保留。总控已源审，同步 b61c0e09；显式invoke兼容入口，默认UI过滤，未build或访问真实Worker。

失败job重排入口原来读队列等待期间切项目后仍可按新上下文继续；现绑定并复核原项目。真实switch代码假队列 `%TEMP%/g004-recall-failed-project-v1-20261123.{out,err}.log` 1/1 exit0；仅假端，未运行Worker。

失败job重排项目围栏已同步 `e8bc27fe`。2026-11-23执行角色自然接替：旧会话已正式释放且结束归档，新执行Terra/high match/continue，实际default；唯一指针及裁决已由总控同步 `43efb031`。两仓受保护dirty及旧日志/资产不动。

停止请求原先发送后迟到可能修改新项目状态，且200ms延迟保存可在切换时丢失意图。当前候选固定原项目/client，在发送前等待原有localOperations持久化队列排干并复核，保存失败或切换零POST；已发结果未知不重发、不清新项目缓存。纯VM假端 `%TEMP%/g004-stop-context-v4-20261123.{out,err}.log` 14/14 exit0；v2首13/14 exit1为夹具reply尚未初始化，显式等待假POST后v3 14/14，后补single-flight竞态得v4。无真实Worker或跨项目效果；待当前build。

暂存槽：人工隔离后永久删除另经完整路径双确认；自动过期只做当前identity/lane只读发现，提示人工。SFTP新请求验证实际parent双确认、节点/根、原token与目标及有效期；旧未知不因目标缺失认定结束。`%TEMP%/g004-sftp-slot-auth-v5-20261123.{out,err}.log` 3/3、原假回收三case旧v1 3/3、原batchDelete精确10个假transport安全case `%TEMP%/g004-sftp-batch-parent-v1-20261123.{out,err}.log` 10/10均exit0；未运行5000项或真实删除。删除发送只同步返回receipt；丢回执后无已证原执行器结束查询，保留unknown供原token查询、不重发，目标不存在不等于结束。

SE候选在隔离前复用同lease状态冻结身份，审核入口允许原请求核查，双确认后admit再发送；已证发送前失效unadmit，已发送未知保留，持久ended重建后settle。真实state方法+假存储/假端 `%TEMP%/g004-stage-review-v4-20261123.{out,err}.log` 10/10 exit0，包括两Host冲突、重启、取消及项目漂移；SFTP源码经总控源审、node --check与UTF8/diff检查后普通推送并fetch一致 `1ed121738969d8ec5a79693910e4463e993ecff8`；SE候选未提交。两者均未build、安装或实际远端执行。原resultSync消费者已按新链调整，含私有fixture rename及保留行为；总控已准新dist后按原限额一次，当前未运行。一次误在SFTP cwd只读SE路径exit1，无写入；另一处误路径rg亦未触产品。

43efb031旧build规划316项/0按需exit0，真实planG004Execution因legacy漂移exit1；两日志 `%TEMP%/g004-build-plan-43efb031-slot-20261123.{out,err}.log` 与 `g004-build-plan-evidence-43efb031-20261123.{out,err}.log` 保留，旧计划不代表当前build。SFTP 73项旧日志及闭包未齐。一次rg脚本通配路径错误未写文件。

2026-11-23：总控批准首次新编译后原20秒各运行一次 resultSyncFailureVisibility 与 jobArtifactStagedSlotIdentity；当前仍未build。stage review已加入既有latest-artifacts域；当前只读规划build 317、package 369，build为package子集，新runner case仅在package。原stage v4测试后仅stop do/while改动不在其两项提取方法；覆盖登记当前适用冻结、原事件及测试时整文件hash未知。固定历史Process包装验证器及纯内存定向case `%TEMP%/g004-runner-stage-wrapper-v1-20261123.log` 1/1 exit0，已审并普通推送fetch一致 `13284446377496a930658112d9a1ab7d3750c6fd`。该次case的未锚定pattern与最终package规划的锚定argv不同；后者仅登记最终冻结后的fresh候选，不冒称已跑。未运行build或部署。
证据整理中两次内存编辑脚本分别因查找格式不符和字符串替换中的 `$` 展开退出非零，均在写文件前退出；修正为精确对象及回调替换后UTF-8 JSON解析/diff检查通过，未触业务或运行测试。
当前build规划317项均有身份登记；按既有摘要只读比对发现多项旧证依赖漂移，不能仅凭dry-run放行。已按实际读取闭包及原历史证据逐项核对租约、分支与部分预检条目，冻结现行适用值；其余仍待审。SFTP另核旧日志中租约、容量、路径、元数据、压缩与serial runner等42项具名闭包；旧工具链未知，均为有条件继承候选而非新运行。
原ID续核：树目录展开、问题过滤、详情展开、根标签、表格展开与运行确认取消6项，复用原假端/receipt并核源码未变；未运行真实任务或删除。五次只读统计/证据整理脚本分别因空值、旧格式假设、AST路径错误、git show输出超默认缓冲、对象标记格式不匹配退出非零，均写入前退出；修正后JSON解析及diff检查通过。

总控审准SFTP两原单文件：apiBackpressure与apiUploadProgress顺序各4/4、exit0、stderr空，日志 `%TEMP%/g004-sftp-api-{backpressure,upload-progress}-v1-20261124.{out,err}.log`，原调用和依赖登记coverage；假SSE及假上传子进程，无真实监听/SSH/传输。只读查rollout时额外指定不存在的11/24日期目录导致rg exit2，实际11/23 rollout命中有效，无写入。
当前3c132bdc及dirty源码只读展开仍build 317/package 369、前者为后者子集；逐身份对比有154个build identity含至少一条旧证依赖漂移（旧receipt记录22、direct记录132，数目可重叠），仅为待核导航，非失败或通过数。已按真实闭包续核租约、槽索引、Worker准备、结果状态和共享作用域等证据，旧compiled仍须新编译门禁；未启动build。
projectCodeSyncState旧VM直接执行新增TS类型语法导致只读语法检查SyntaxError；按总控批准以现有TypeScript先转换再运行，原测试单文件 `%TEMP%/g004-project-code-sync-state-v1-20261124.log` 实际7/7、exit0，私有fixture保留，未触unlink/Worker/真实配置。原旧7/7证据保留，新direct按实际事件与依赖登记，单identity只读规划验收通过；修正已普通推送fetch一致6bcc43dce912f7778d86010b84edeb13a689ec5b，不冒dist验证。
只读整理曲线入口时首次按紧凑JSON对象查找而原文件为缩进格式，脚本写前退出非零；修正后JSON解析通过，未触产品。曲线入口沿用原507专用窗口历史点击与当前源码闭包，未启动viewer或查询Worker。
任务可用性入口发现等待队列、输入及写盘期间切项目可能继续旧client读取或把A队列缓存发布到B并触发B调度；候选复用原上下文和已有beforeRename围栏，A成功后变化保留已写事实并显示partial、不刷新/tickB。真实save方法+内存存储v2 `%TEMP%/g004-job-availability-save-v2-20261124.log` 1/1，原可用性文件选中3项v2 `%TEMP%/g004-job-availability-context-v2-20261124.log` 3/3均exit0；v1两日志各1/1、3/3保留。总控源审通过，所需legacy五hunk及本组文件已普通推送并fetch一致702acec84e95c540a7abbdd5128a16e8f10be1e6；混合文件其余候选仍未build/提交，不冒真实Worker或跨项目。两次rg误传PowerShell通配符exit1，另一次日志提取因JSON转义格式未匹配写前退出；均无产品写入，修正后结果如上。
总控核当前JobAvailability四文件及v2通过，允许既有manifest纳入新单项并按legacy精确hunk同步；完整dirty规划build 318/package 370、build为子集，均0按需；当前新单项原事件单identity规划验收通过。总控批准manifest仅从HEAD插入本组单项；原slot测试登记留待其源码同批，完整dirty规划不代表中间HEAD矩阵；未启动build/发行。总控一次只读误取旧StateStore路径exit1，改由rg定位真实路径，无写入。
索引分hunk预检 `git apply --cached --check %TEMP%/g004-job-availability-index-v1-20261124.patch` exit1：manifest第118行patch不适用，index前后均空、未提交；old行与index逐字一致，无上下文可能为原因但未证实。按规则停止并升级；总控核出缺上下文后准许生成三行上下文v2，正常cached check及apply均exit0，v1及所有现场保留，无reset/force。

SFTP cleanupExplicitTarget经总控效果审查后原单文件VM假端1/1、exit0，日志 `%TEMP%/g004-sftp-explicit-target-v1-20261124.log`、事件及依赖见coverage；未执行Python/SSH/网络/删除，旧120单项日志及工具链仍缺。

重排项目/client及源码查询排队发送围栏经总控源审并同步 `dde958c5`；假查询 `%TEMP%/g004-plan-source-client-v1-20261124.log` 1/1（call_b6f46d70a51a450c80cdb956c852b0bf）、重排精确五项 `%TEMP%/g004-requeue-context-v3-20261124.log` 5/5（call_53a2ad914c394a96988a26aac48ef2ad）均exit0；v1 3/3及v2 5/5只对应旧输入，源审两次因新边界暂缓；未运行旧Production/Coverage整文件，未实际删除、访问Worker或build。
