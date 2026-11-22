# G004 执行登记

本次集中压缩前的完整执行事实、逐组命令、日志与首失败保留于 Git `1e91d0d4:docs/plan-generations/G004-execution.md`；更早T1–T7原文见 `32d16ac4`，退休候选形成及单项日志见 `48f7e339`、`67f67de4` 与 coverage。以下当前状态取代旧记录当时的待批准、未退休、未删除或B1未验描述；原失败、未测与授权边界不因压缩消失。

519专用根重载后项目识别false→false，缺adapter，未重配重授；不可称现场完成状态丢失。519的341/341、13 gates、试行包与一次安装/Reload属于旧版本证据，不等于本轮源码/新Host验证。真实Worker、真实传输/清理、active results、跨项目和新UI仍未测。原B1首断言失败后夹具污染造成20秒timeout，TEMP/g004-r519-b1-lease-before-ff08.log保留；用户批准后改原文件原预算唯一复验3/3 exit0，TEMP/g004-r519-b1-approved-once-20261122-terra.log，未重放真实识别或清锁。

T1–T7中立API/MCP迁移、逐项旧CLI差异、所有合成测试及原失败见上述Git和coverage。真实伴随SFTP 0.2.120 CleanupFileApi经实际Gateway/Host、内存store/fs和假端口5/5，不是实际磁盘持久化或清理；公开字段合成凭据首缺capability 0/1后1/1，仅证假端口不回显，真实后端秘密输出未测。Worker来源旧索引首16/17后ARTIFACT_LOCATION_UNVERIFIED返修17/17；无endpoint本地索引首15/17后17/17；下载根路径首两次13/14后14/14，均未联系Worker。其他失败含中立RPC首7/8后8/8、候选字节补丁首两次CRLF exit1后成功、git push后fetch TLS exit1经总控授权恢复；原日志、真实退出码及边界仍在历史记录。

用户一次批准49份旧CLI测试及目录外消费者/矩阵迁移、50精确路径排除、39源码文件永久删除及B1一次复验。旧测试路径、夹具和Git历史保留；glob仍发现其他文件，13旧直接job改17现MCP契约，CLI零握手/argv/history等退休差异不冒业务等价。302条索引、27项外部引用及逐项替代见coverage。中立客户端4/4、取消/预算1/1、Windows消费者4/4、指标3/3、证据1/1、formalJob原文件5/5、MCP派发5/5；仅合成/受限Python函数提取，不训练、不真实连接。windowScope dispose的发现文件删除未授权、该项未运行。

39精确旧源码全批预检及每项直接父目录/物理cwd/普通文件/内容复核后，以无Force的./直接叶名逐一删除并确认不存在，六组提交690be905、4d003cdc、b7d6ce0b、3382fcbd、4a43d1fc、fd593cca；保留新MCP入口、旧dist、全局shim、夹具与资产。首次大命令CreateProcess被policy拒绝、进程未创建；Get-Item三处Force违反safe-delete-paths，移除后按总控授权同shell/执行器成功，平台未公开唯一命中原因。删除前tsc-cached TS7.0.2 exit2、71 emit，日志TEMP/g004-tsc-central-predelete-20261122-terra.log；类型修正并删除后输入改变，单次重验exit0、emit2，TEMP/g004-tsc-after-cli-removal-20261123-terra.log。18个tracked dist仍dirty保留不stage；非完整build/package。

规划对账首0/1因仍要求50项已退休路径，修正后1/1，TEMP/g004-runner-planning[-fix]-20261122-terra.log。packageContentPolicy保留fixture后12/12 exit0，TEMP/g004-package-content-retain-20261123.log；releaseAcceptance首0/1因jobs-only漏按需项，修为jobs∪onDemandJobs并保留非空/去重/不交叉/50退休断言，获准原20秒复验1/1 exit0，TEMP/g004-release-acceptance[-ondemand-fix]-20261123.log。七个真实删锁用例未重跑、原断言不减；519原receipt job264/265/267/268/269/271/274原passed/0/tree confirmed，原Node精确版本/架构未知，其原场景已由总控人工审定可继承，不能冒本轮实际删除通过。

## 本轮增量覆盖核验（待完成和源审）

增量机制、原始候选、runner按需夹具首失败及逐次规划、直接验证与检查边界完整保留于 `d289115d:docs/plan-generations/G004-execution.md`；当前分类和原receipt/call/依赖以 coverage 为准。任务专用入口区分历史、直接与本轮结果，失败/缺项/漂移阻断，最终HEAD、计划、按需与产物由实际运行冻结；总控终审前不称通过。旧job187/189/240及七项删锁原场景总控已审，其他执行者候选待终审；原Node版本/架构未知，邻近版本不是证明。最终计划稳定后需按原20秒精确pattern补验规划。

总控人工审定519的job264/265/267/268/269/271/274可按原Windows安全行为继承，保留原passed/0/tree confirmed和日志，精确旧Node/架构仍unknown；原安全函数及常量未变，releaseOwnedLock新增direct分支不作用于无origin的旧场景，不能以旧证冒新分支或本轮实际unlink。coverage绑定当前具体源码/测试字节及原日志，不重跑七个删除用例。

按总控新授权准备候选0.5.520：本地/远端tag无匹配，两种常见release tag查询均release not found exit1，本机已安装0.5.519、未发现0.5.520目标目录；package、lock两处及RuntimeManifest源统一0.5.520。先write-agent-runtime exit0（TEMP/g004-520-write-runtime-20261123.log），后npm run compile -- --max-parallel 1 exit0、8/8 gate exit0/tree confirmed、input=end，原receipt simple_cluster/reports/test-workflow/2026-11-22T18-17-42-383Z-84032-compile/run.json，完整TEMP/g004-520-compile-20261123.log；TS7.0.2 incremental input-drift、emit3、API5.9.3。runtime manifest实际版本一致，Panel模块及真实HTML三个内嵌script均vm.Script通过，src/dist的10890搜索零命中。仅compile、未执行完整测试/package/发布/安装。compile生成的dist/runtime、bundle等和先前18个dirty dist均保留不stage；源候选仍待最终覆盖与验收。

候选资格并行只读查询中，Python元数据读取与code.cmd列已安装扩展可能短暂重叠；实读code.cmd确认Electron以ELECTRON_RUN_AS_NODE模式执行，故按唯一Node/Python约束记录为潜在并发违规，两者均为只读非测试且无安装。后续串行。一次只读版本回读因PowerShell引号解析失败未启动Python、未写文件；改here-string后成功。

## 520 定向与历史候选

完整逐项原文保留于 Git `afb3ec5c:docs/plan-generations/G004-execution.md`；coverage 保存每项原命令、退出码、日志、依赖快照、假端口边界和历史证据来源。所有下列候选均待总控审定，不代表真实 Worker、真实清理、用户授权或新 UI 已验。原 519 精确 Node/架构未知，不以邻近版本冒充。原 test/fixture 与失败均保留。

520 编译后多项定向合成验证均 exit0，逐项数量、日志和边界保留于 Git `ae5b7746:docs/plan-generations/G004-execution.md` 及 coverage；不代表真实 Worker、网络、用户授权、界面或删除通过。

总控专门核准现有完整 mcpProject 合成回归，520 后 43/43 exit0：假授权/Agent/Worker、独立合成工作区及回环/stdio，客户端与服务按原 finally 关闭；不代表真实生命周期或撤权专项。伴随隐私首轮路径规范化失败 0/1，修后 1/1；WorkerObservation 与 CleanupEngine 用假 RPC/内存 fs/store，不代表真实持久化/清理。历史 direct 候选 InspectSchema、QuerySchema、ActiveSnapshot、HistoryViews、HealthEvidence、FailureAlerts、PersistedRuns、LogsAndConfig、ResultIdentity 及 MCP dispatch 的调用链与原具体基线见 coverage 和 `14c77f5e`；519 job 38、87、97、99 属指定假输入或纯函数历史候选，具体条件见 coverage。ProjectOps 的历史 SDK 安装闭包仍不明，不能算通过或擅跑受限专项。

数据错误：mcpWorkerLifecycle 4/4 exit0 覆盖了 mcpWorkerHistory 3/3 的同名 TEMP 日志；旧文件未恢复。总控批准使用已核完整原 rollout call `call_88b68b75a83c458c814a7109e11212d6` 的 3/3 exit0 命令/输出事件，旧 SHA `f2b5a80a81824b94b6a35fb3b0134f544a871b89119e70b3479ff5f93bb94f3f` 不冒当前文件；当前文件只属于新 4/4。以后新日志先核路径不存在。旧执行 turn completed/idle 后归档使原 rollout 移至 archived_sessions；曾短暂解除归档保护现有引用，重新归档后修正 coverage 中 42 处实际路径，核 session_meta 及 35 项已有命令/输出事件 SHA 一致，未改事件或重跑。

登记过程真实非测试失败保留于 `afb3ec5c`：Python 只读查询误取 zlib 内建路径、JSON 登记标记空格/数组格式、sourceJob 与 eligible 缺字段的脚本错误、隐私登记误选未完成 call、tmux 历史复用因 package 版本变化而停写；均未覆盖有效记录。原 compile exit2、B1 失败/20秒 timeout、policy 拒绝、runner oracle 首失败和其余失败详见前文及 Git，不被后续通过抹除。

当前 361 active、6 onDemand；增量计划仍有未审缺口，具体计数以当前 planner 为准。manualTmuxAdmission 会访问实际 WSL/tmux，planIsolatedReviewBoundaries/Lifecycle 涉及未授权 rename，不运行；其它 Python 子进程先核实际调用与精确授权。最终版本和 runner 稳定后，规划测试原精确 pattern 按原 20 秒一次补验，final dry-run 与完整包交总控审核；总控开放前不得 full package/安装/发行。保护 26 个已生成 dirty dist、历史 VSIX sha、全部夹具与现场，禁止操作真实 Worker/服务器/SSH/tmux/GPU/用户授权配置；真实 UI、active results、跨项目和远端功能仍未测。

- 520 后 pairedUpdateTransaction 原文件 8/8、exit0（`%TEMP%/g004-520-paired-update-transaction-20261123.log`，先查不存在）；内存日志及假下载安装/重载，无真实安装、网络或用户状态修改。执行前漏查 job 33 已有有效历史候选，造成不必要重复；保留新日志与事件但不选作覆盖，原历史证据不变。

本段压缩前逐项日志路径、边界及结果见 Git `f18078f9:docs/plan-generations/G004-execution.md`；每项原始事件及依赖快照见 coverage。以下 520 原文件均真实 exit0：distributedQueueCacheStability 19/19、terminalPlanHistory 7/7、parallelPlanStopClear 11/11、planBatchCodeSyncOnce 8/8、selectedPlanBatch 14/14、distributedSchedulingModes 7/7、projectWorkspaceChangeIsolation 20/20、prequeueRecallBulkSync 3/3、gpuMemoryScheduling 9/9、logicalPlanProgress 4/4、planArtifactSyncStatus 16/16、progressEvidenceFreshness 20/20、planNoticeLayout 5/5、resultCommandPhaseRouting 3/3、planOperationNoticeLifecycle 22/22、workerCodeVersionIsolation 10/10、executionPlanListProgressLagRepro 4/4、executionCompactOverview 54/54、planOutputReplacementHost 7/7、gpuHistoryMixedGranularityScatterRepro 9/9、gpuSampleCarryChannel 5/5、completedJobAutoRecheckSuppression 17/17；均为合成状态、假端口、源码或 VM，夹具保留，不代表真实 UI、Worker、GPU、网络、传输或永久删除；outputReplacement 的删除仅为内存 Set。各项待总控审定。

误运行按需 dispatchWake 原文件 4/4 exit0，合成队列与假观察；保留日志及直接结果，不计 active，计划仍为 on_demand_not_run。

520 另有多项合成、VM 及假端口定向结果；逐项数量、日志、保留夹具及边界见 Git `b6f86b14:docs/plan-generations/G004-execution.md` 和 coverage。两项独立 loopback 凭据和安装为夹具，junction 保留；未操作真实 Worker、Agent、GPU、SSH、tmux、授权、传输、清理、活动结果或 UI，均待总控终审。

本段压缩前逐项命令范围和边界见 Git `806d47d2:docs/plan-generations/G004-execution.md`，原始事件及输入快照见 coverage。520 后单文件均 exit0：freshResults 10/10、syncScopeTree 6/6、syncScopeMetadata 12/12、syncScopeBatch 8/8、projectRootMap 14/14、syncScopeTransferBatch 8/8、windowsWorkflowContract 4/4、schedulerContract 3/3、distributedPlanSubmissionRouting 7/7、distributedQueueStartup 8/8、distributedQueueStartupMirrors 6/6、distributedQueueStartupRecovery 7/7、prequeueRecallLifecycle 9/9、planRunReplacement 17/17、workerFpsyncTaskLabel 3/3、workflowPanelNavigation 7/7、draftCleanupConfirmation 3/3、inspectorWorkflowDensity 3/3。均为内存、隔离夹具、VM 或假回调；临时夹具保留，未操作真实 Worker、GPU、网络传输、UI、用户授权、删除或重命名，模拟删除不证明真实删除安全；均待总控终审。

- 2026-11-23：formalJobRejectedRecovery 单文件 5/5、exit 0；内存队列、渲染字符串、VM 和模拟确认/Worker/SFTP/派发，无真实界面、Worker、GPU、网络或作业。证据见 coverage，待总控终审。

- 2026-11-23：gpuWorkerSnapshotRecovery 单文件 13/13、exit 0；内存客户端、模拟 GPU、fetch 和 SSE 流，无真实 GPU、Worker 或网络。证据见 coverage，待总控终审。

- 2026-11-23：agentPreparationLifecycle 单文件 10/10、exit 0；VM 和模拟 VS Code/SFTP、生命周期、fetch、SSH 别名，仅本地读 runtime 字节；无真实 Agent/Worker、SSH、tmux、上传或网络，不证明真实生命周期。证据见 coverage，待总控终审。

- 2026-11-23：branchProjectRegistry 的 sanitizeGitEnv 精确 pattern 1/1、exit 0；仅合成环境对象，无 Git 子进程或文件变更；不覆盖同文件其他 pattern。证据见 coverage，待总控终审。

- 登记此精确 pattern 时首次使用字符串替换将 `$'` 当作替换语法，造成 coverage 临时 JSON 格式错误，planner exit 1；以当前 HEAD 的原文件字节为基底、回调插入同一真实结果后重新核验，未改变历史记录。另一次只读查询误访问无 argv 的记录并 exit 1。

- 2026-11-23：branchProjectRegistry 的 normalizeGithubTarget 精确 pattern 1/1、exit 0，纯字符串无 Git 或网络；重审发现前一 sanitizeGitEnv 行遗漏本文件后段顶层 require，已补全共同输入快照，不改变结果。均不覆盖其他 pattern，待总控终审。

- normalizeGithubTarget 精确 pattern 含反斜杠，exec 工具事件中的 JS 字符串对其转义；当前 validator 直接比较原始 input 导致 direct execution record drift。该 1/1 真实结果暂设 eligible=false、未计覆盖，已向总控提出有界解码修正；另一次只读诊断误将 JS 事件当 JSON 解析 exit 1。

- 补齐顶层闭包时登记脚本自身读取 coverage，误把该登记文件纳入两行快照，planner 报 direct dependency drift；已排除登记脚本自身输入并重核实际测试闭包。

- 2026-11-23：runner 定向原 pattern `G004 reviewed legacy evidence preserves origin and refuses drift` 1/1、exit 0，TEMP/g004-520-runner-escaped-command-20261123.log；覆盖工具事件中 JSON 字符串反斜杠与引号解码，以及不同参数、非命令文本和动态表达式拒绝。原 normalizeGithubTarget 1/1 真实证据恢复候选，无重跑产品测试；现有其他门禁和失败保留，待总控终审。

- runner 定向修复仅触及 direct 事件核验及独立 G004 用例，七项历史删锁 pattern 及安全函数未改；逐行更新当前依赖快照，原历史来源、未知工具链、真实删除边界不变。一次登记脚本因误判 JSON 行格式 exit 1、无写入，随后修正。

- runner 初版边界误拒历史 mcpTaskDispatch 的 here-string 后换行真实命令；保留 planner 拒绝，不重跑产品项。总控批准修正及一次原预算复验：固定 pwsh7 原生 Parser 只解析 stdin 的受限 cmd 字面量、不执行；原精确 pattern 1/1 exit0，TEMP/g004-520-runner-native-parser-20261123.log，18.155 秒，保留原先 1/1。覆盖换行、分号、here-string/普通引号/注释伪命令和不同 argv；七项历史删锁原场景不变，更新依赖快照。

- 全量 planner 首次采用批解析时 Node 堆上限 OOM、exit 1；原因是逐条重复保留巨大 rollout 分割结果，已改每个实际 rollout 一次筛选 call_id，不改变原事件或其 SHA。失败输出见当前会话原始事件；针对修正继续核验。

- planner 修复后发现 PowerShell 将 20000 解析为数字常量，初版仅接受字符串导致 direct drift；允许静态常量并补原 case 数字断言，精确 pattern 再验 1/1 exit0、18.299 秒，TEMP/g004-520-runner-parser-numeric-20261123.log；未改变原预算或重跑产品项。

- 当前 runner 变更后 planner 已正常完成证据核读并报告 367 active、0 onDemand、216 缺口；先前 361/6 随受影响选择重算变化，不代表通过。核验器源码和新增断言及依赖重核待总控终审。

- 总控审出未调用函数的 named block 也会被误当顶层；已改为 parsed 根 EndBlock 实例匹配，并将负例组合覆盖函数及引号伪命令。原精确 pattern 一次返修 1/1 exit0、18.250 秒，TEMP/g004-520-runner-parser-root-20261123.log；七项历史安全测试函数未变，仅更新当前输入快照。上一提交后实际 planner 为 361 active、6 onDemand、212 缺口，最终以新提交后重算为准。
