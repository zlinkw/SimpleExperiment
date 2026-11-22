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

最近直接验证与历史证据的完整逐项依据保留在Git `14c77f5e:docs/plan-generations/G004-execution.md` 和coverage。0.5.520 compile后原文件：mcpLocalApiSafety 8/8（TEMP/g004-520-mcp-local-api-20261123.log）、mcpEntry 3/3（TEMP/g004-520-mcp-entry-20261123.log）、packageContentPolicy 12/12（TEMP/g004-520-package-content-20261123.log，原有串行Python 3.14.6、合成zip及fixture保留）、mcpTrainingProgress 9/9（TEMP/g004-520-mcp-training-progress-20261123.log）、mcpRuntimeCapture 3/3（TEMP/g004-520-mcp-runtime-capture-20261123.log）、mcpTerminalIdentity 10/10（TEMP/g004-520-mcp-terminal-identity-20261123.log）、mcpOrdinaryResultContracts 8/8（TEMP/g004-520-mcp-ordinary-contracts-20261123.log），均exit0；仅自建合成文件/回环服务或内存替身，无实际Worker/删除。原call、日志及当前依赖已冻结待总控审，不冒runner tree confirmed。一次Python工具链只读查询误取内建zlib.__file__ exit1，另一次JSON登记脚本因标记空格断言exit1且未写入，修正后成功，均非测试失败；不冒完整标准库已验证。

历史直接结果按实际调用/变更审定为候选：InspectSchema对照c8466379、QuerySchema对照aa6138d5；ActiveSnapshot、HistoryViews、HealthEvidence、FailureAlerts对照b5a1cd6e、1242c55c、ef465b02、9f59dded；PersistedRuns、LogsAndConfig、ResultIdentity对照1cfcb557、8ed91051、06a5fc03。原rollout真实exit0及首失败保留，合成RPC/本地项目，无实际Worker；旧精确Node未知，依赖范围及源码差异见coverage，待总控最终审。上次规划361执行＋6按需，335项待审，package入口阻断。

新补mcpWorkerHistory原文件3/3 exit0，TEMP/g004-520-mcp-worker-history-20261123.log；自建回环假RPC，测试项目内允许合成历史文件原子rename，保留夹具、关闭监听，无真实Worker或unlink。原call、日志和当前源码/工具链冻结，待总控审；当前入口阻断334项。

路由源码后续发生修改，原mcpSftpRouting按原单文件预算补验17/17 exit0，TEMP/g004-520-mcp-sftp-routing-20261123.log；McpHost使用合成workspace、内存grant及假SFTP端口与假审批，仅保留合成上传文件，没有真实传输、授权变更或删除。原call和当前依赖冻结，待总控审。

ProjectOps候选补核动态读取的legacy计划解析和plans.list片段与fafa1738逐字相同、fixture未变；后续类型注解、未调用的cleanup preview schema和只用sha256Text的runtime版本变化不影响所测调用。SDK InMemoryTransport及其历史安装闭包仍未判，候选不计通过。当前入口阻断333项。

上述伴随隐私测试首次路径规范化失败0/1（TEMP/g004-520-mcp-sftp-privacy-20261123.log），修正路径后1/1（TEMP/g004-520-mcp-sftp-privacy-pathfix-20261123.log）；登记脚本首误选未完成call exit1未写入后修正。mcpWorkerObservation 1/1、mcpCleanupEngineContract 5/5 exit0（TEMP/g004-520-mcp-worker-observation-20261123.log、TEMP/g004-520-mcp-cleanup-engine-20261123.log）。真实伴随源只读，合成密钥、假RPC/回环服务及内存fs/store，删除仅改内存集合；不代表真实Worker、磁盘持久化或远端清理。详细依据与失败见Git `9995f2fa:docs/plan-generations/G004-execution.md` 和coverage，待总控审。

- 519 job 99：原通过/0/子树确认；审阅实时状态合并调用，只处理合成内存数据，模块真实加载闭包和测试对 5a3 无差异，记录依赖快照供总控审定，不声称真实 Worker。首次记录脚本因未兼容无 sourceJob 条目抛 KeyError、未写文件，修正后登记成功。

- 520 编译后 extensionUpdates 原文件 7/7、exit 0，合成版本和只读源码/本机闭包；无安装、网络或删除。原日志 `%TEMP%/g004-520-extension-updates-20261123.log`。首次登记脚本将格式化数组误当压缩数组，断言失败且未写入；按原格式插入后待总控审定。

- 520 后 MCP native job 状态观察 4/4、exit 0（`%TEMP%/g004-520-mcp-native-observation-20261123.log`）：当前 tasks.list 代码在 VM 使用合成队列与假 Worker 查询；保留合成文件，无真实 Worker、Agent 生命周期动作或删除。覆盖绑定动态提取的 legacy 源及编译器，待总控审定。

- 数据错误：运行 mcpWorkerLifecycle 4/4、exit 0 时误覆盖 mcpWorkerHistory 3/3 的 `%TEMP%/g004-520-mcp-worker-history-20261123.log`（旧 SHA256 `f2b5a80a81824b94b6a35fb3b0134f544a871b89119e70b3479ff5f93bb94f3f`）；旧文件未恢复。已核原 call `call_88b68b75a83c458c814a7109e11212d6` 的完整命令、cwd、exit0、无 live session、3/3 且其余为0及无截断，按总控裁决仅用其原 rollout 事件，当前同名日志只属新的 4/4。后续新日志先核路径不存在。两项均为合成 Worker 观察，未执行真实 Agent/Worker。

- 520 编译后 serverPlanQueueRecovery 4/4、pulledTaskControl 5/5，均 exit0；前者读取源码并用合成内存队列，后者用假客户端及原定时器，无真实 Worker/停止/删除。日志 `%TEMP%/g004-520-server-queue-recovery-20261123.log`、`%TEMP%/g004-520-pulled-task-control-20261123.log`；均先确认路径不存在。

- 519 job 97 拓扑纯函数及 package 实际读取字段复核无变化；job 98 当前原文件 4/4、exit0（`%TEMP%/g004-520-worker-routing-20261123.log`，先查不存在），VM/假配置无真实 Worker、配置修改或删除。均待总控审定。

- 520 编译后 manualDispatchHost 原文件 11/11、exit0（`%TEMP%/g004-520-manual-dispatch-host-20261123.log`，先查不存在）；当前真实编译 Host 配合假 Worker、队列、派发及停止回调，未触及真实服务器/GPU/文件删除。

- 520 后 agentProjectRootReadinessWorkflow 5/5、projectCodeSyncState 7/7，均 exit0；VM 与合成数据，后者只写并保留独立合成夹具，不调用 unlink/真实 Worker。日志分别 `%TEMP%/g004-520-agent-root-readiness-20261123.log`、`%TEMP%/g004-520-code-sync-state-20261123.log`，路径先查不存在。

- 519 job 38 更新启动逻辑：原passed/0/tree confirmed；仅假安装、重载、存储和发布客户端。原测试及实际模块闭包相对5a3不变，package.main及涉及的legacy源码断言逐项比对，候选待总控审定，不代表真实安装。

- MCP task dispatch 原同任务 5/5、exit0、无 live session：原调用先加类型注解、233f31d3 记录该注解，随后测试、源码闭包和动态读取 legacy 均无变化。实际 Gateway/Host 用假授权、队列和停止/派发端口；原含内存授权变化场景，未重跑专项、未更改真实授权或连接 Worker。旧工具精确版本未证，待总控审。

- 520 后 agentFirstRunPreparationWorkflow 3/3、exit0（`%TEMP%/g004-520-agent-first-run-source-20261123.log`，先查不存在）：只检查源码/文档和合成配置归一化，未准备或启动 Agent、打开 UI、访问 Worker。

- 520 后 planRunRerunIntent 14/14、exit0（`%TEMP%/g004-520-plan-rerun-intent-20261123.log`，先查不存在）；纯内存重跑选择、状态及 hold 归一化与源码断言，没有实际重跑、队列写入、Worker 或删除。

- 520 后 prepareAgentsProgressWatchdog 1/1、globalConfigPersistence 2/2，exit0（`%TEMP%/g004-520-watchdog-source-20261123.log`、`%TEMP%/g004-520-global-config-source-20261123.log`，均先查不存在）；只解析源码/内存 HTML，无真实 Agent、窗口或配置写入。

- 520 后 outputIsolationRecovery 8/8、exit0（`%TEMP%/g004-520-output-isolation-recovery-20261123.log`，先查不存在）：真实恢复逻辑仅接假队列、假文件存在性与假审核端口；未查询真实文件或执行清理。

- 520 后 panelMessageDispatch 21/21、exit0；工具输出因长度截断，完整原日志 `%TEMP%/g004-520-panel-message-dispatch-20261123.log`（先查不存在）。生产消息处理切片使用假宿主/假窗口，不打开实际 UI、不改 Worker 配置、不执行删除。

- tmuxOtherSessionsDisclosure 本轮 VM 19/19、exit0（`%TEMP%/g004-520-tmux-disclosure-vm-20261123.log`，先查不存在）；假 DOM/会话仅验证脚本逻辑，不是真实窗口或 tmux。初审历史复用时发现渲染器读取已改版本的 package.json，脚本断言停止且未写登记，改以当前实测证据覆盖。

- 519 job 87：真实逻辑配合内存会话/假确认/假关闭回调，动态提取的 Host 方法与 5a3 一致，编译闭包及原测试未变；原passed/0/tree confirmed，旧Node/TS实际版本未知。仅作假 tmux 场景候选，不代表真实窗口关闭，待总控审。

- 520 后 refreshOperationRecordExpiry 11/11、exit0（`%TEMP%/g004-520-refresh-operation-expiry-20261123.log`，先查不存在）；VM 假端口/内存操作，Agent 源仅作文本读取，不执行 Python/真实 Worker。

- 520 后 workflowWorkspaceBinding 2/2、exit0（`%TEMP%/g004-520-workflow-workspace-binding-20261123.log`，先查不存在）；使用独立合成中文临时目录并保留，另用假身份探针，无删除。一次只读候选列表脚本因缺 eligible 字段 KeyError，未写文件，改用可选字段成功。

- 经总控核准现有完整 mcpProject 合成回归，520 编译后 43/43、exit0（`%TEMP%/g004-520-mcp-project-contract-20261123.log`，先查不存在）；假授权/Agent/Worker 回调、独立合成工作区及回环/stdio，客户端与服务按原 finally 关闭。动态 legacy 源、现行 SDK/TS 加载闭包及 stdio bundle 已绑定，未执行真实授权变更、Agent、Worker或删除。

- 520 后 staticEntrypointProbe 1/1、xshellSessionPatcher 2/2，exit0（`%TEMP%/g004-520-static-entry-probe-20261123.log`、`%TEMP%/g004-520-xshell-synthetic-patch-20261123.log`，先查不存在）；前者只读取合成脚本不启动 Python，后者只修改并备份自建合成 xsh，夹具保留。

- 旧执行会话结束后归档使 rollout 移至 archived_sessions；曾短暂解除归档以保护现有引用，现已重新归档。coverage 中该会话 42 处路径更新为实际位置，session_meta 身份及 35 项有摘要的命令/输出事件原字节 SHA 均核一致；未改原事件或重跑测试。

- 520 后 panelWebviewScriptHealth 原文件 13/13、exit0（`%TEMP%/g004-520-panel-webview-script-20261123.log`，先查不存在）；源渲染器经 TypeScript 转译、假 DOM/VM，未操作真实 UI 或 Worker。原事件、当前依赖和 Node 已登记，待总控审定。

- 520 后 planCleanupPanelBridge 原文件 19/19、exit0（`%TEMP%/g004-520-plan-cleanup-panel-bridge-20261123.log`，先查不存在）；VM 假 DOM、预览和确认/执行回调，未打开真实 UI、删除文件或连接 Worker。原事件与实际依赖已登记，待总控审定。

- 520 后 completedPlanWorkerMirror 原文件 13/13、exit0（`%TEMP%/g004-520-completed-plan-mirror-20261123.log`，先查不存在）；VM、内存队列及假 SFTP 传输，未连接 Worker 或真实传输/删除。原事件及依赖待总控审定。
