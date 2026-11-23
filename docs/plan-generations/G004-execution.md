# G004 执行登记

全文历史在 Git `18dd5614:docs/plan-generations/G004-execution.md`，更早 T1–T7、逐项命令和失败分别见 `1e91d0d4`、`32d16ac4`、`48f7e339`、`67f67de4`、`c04f2dd7`；原 receipt、日志、事件、输入与逐项边界以 `docs/windows-entry-coverage.json` 为准。本次为达到 12000 字符上限的 90% 阈值而整体语义压缩；历史授权、失败、未测与现场不因压缩消失。

## 当前目标与边界

G004 人工审定的增量覆盖按 identity+argv 复用适用的历史、直接和本轮证据，并冻结真实计划、gates、产物与输入；当前 361 active、6 onDemand，planner 仍缺 42 项，尚未通过，所有候选待总控最终审核。源码稳定后对原规划测试精确 pattern 按原 20 秒预算补验一次，执行 final dry-run 并向总控提交完整包；总控终审并另行开放前禁止 full build/package、安装和发行。0.5.520 只是候选，不能冒充已打包。

当前不触碰真实 Worker、服务器、SSH、tmux、GPU、用户授权配置或真实 UI；真实 Worker、传输/清理、active results、跨项目和新 UI 未测。保留 26 个 tracked dirty dist、历史 VSIX sha、全部夹具及现场，不 stage 或清理。模拟删除/缺失不证明真实永久删除安全。总控批准既有夹具只在自建 temp 范围内 rename 到 clean_dir 并保留字节的模拟；真实删除、真实 WSL/tmux/GPU 与完整 runtime import/exec 仍不执行。具体安全测试、原精确权限与进一步裁决见 coverage 和历史原文。

519 专用根重载后项目识别 false→false、缺 adapter，未重配重授；不能称现场完成状态丢失。519 的 341/341、13 gates、试行包及一次安装/Reload 属旧版本，不证明新源码或新 Host。用户曾批准 49 份旧 CLI 测试迁移、50 精确旧路径排除、39 旧源码删除和 B1 单次复验；原旧测试与 Git 历史保留，302 索引和 27 外部引用见 coverage，退休差异不冒业务等价。39 源码经逐项安全预检及直接父目录验证删除，六组提交 `690be905`、`4d003cdc`、`b7d6ce0b`、`3382fcbd`、`4a43d1fc`、`fd593cca`；不重复删除。

## 候选、失败与复验

0.5.520 版本源同步后 write-agent-runtime exit0、compile 8/8 gates exit0/tree confirmed、input=end；原 receipt 在 `simple_cluster/reports/test-workflow/2026-11-22T18-17-42-383Z-84032-compile/run.json`，日志 `%TEMP%/g004-520-compile-20261123.log`。Panel 模块与三个真实内嵌 script 均 vm.Script 通过，src/dist 的 10890 搜索零命中。compile 生成 dist 和原有脏文件保留；未完整 build/package/安装/发布。查询候选版本时 Python 元数据与 Electron Node 模式的 code.cmd 短暂重叠，均只读非测试但记为潜在单进程约束违规；一次 PowerShell 引号只读失败未启动 Python，已改正确读取。

真实不利结果保留：B1 原断言失败、夹具污染致 20 秒 timeout，用户批准原预算一次复验 3/3 exit0；删除前 tsc exit2、71 emit，修正并删除后重验 exit0、emit2。首次大删除命令被平台 policy 拒且进程未创建；Get-Item 三处 Force 已移除，后按授权执行，平台未公开唯一命中原因。规划首次 0/1 因仍要求退休路径，修后 1/1；releaseAcceptance 首 0/1 因漏 onDemand，修后原预算复验 1/1。隐私测试首缺 capability 0/1、后 1/1；Worker 来源旧索引首 16/17 后 17/17、本地索引首 15/17 后 17/17、下载根路径两次 13/14 后 14/14；中立 RPC 7/8 后 8/8。候选补丁两次 CRLF exit1、一次 push 后 fetch TLS exit1，后按总控授权恢复。具体日志与其余失败见历史。

runner 增量开发曾有 planner OOM exit1、数字常量误拒、命令解析误拒、登记过程临时 JSON 错误和 coverage 自身误入依赖导致 drift；各自已修，原事件保留。native parser 仅读 stdin 不执行，原 pattern 复验 18.155–18.299 秒，详见 Git `18dd5614`。旧 mcpWorkerHistory 3/3 日志被新 4/4 覆盖；总控批准使用完整原 rollout `call_88b68b75a83c458c814a7109e11212d6` 及其原 SHA，不伪造或重跑。新日志均先核精确路径不存在。

actionLifecycle 首次 46/49 exit1，三例缺真实 `localArtifactRecord`；测试夹具接入真实共享 symbol 和局部路径替身后整文件 49/49 exit0，失败事件、完整日志及失败 eligible=false 均保留。接替后误重复已继承 job 204（9/9）和 179（7/7），误运行 onDemand serverQuotaPersistence（10/10）；另此前误运行 serverQueueDispatch（14/14）、dispatchWake（4/4）和重复 pairedUpdateTransaction（8/8）。事件和日志均保留，新记录不计活动覆盖；后续同时核活动计划及历史/直接证据。

## 审定证据和真实效果

历史 job 187/189/240、七项删锁 264/265/267/268/269/271/274 已由总控人工继承；原 passed/0/tree confirmed 和日志保留，精确旧 Node/架构未知，不称本轮真实删除通过。总控另批准 runner 旧 default job 255–263、266、270、272、273、275–283、285–287、290、291 共 27 项逐 identity+argv 继承：旧 body/fixture 未变，新增 G004 分支不作用其输入，输入指纹改动不改变原场景比较行为；原日志和当前依赖冻结，未知旧 Node/架构不补造，不覆盖新 G004 或 job 289。原先包含的 job 284 经总控复核原日志总耗时 20119.841ms，超过 20 秒，已撤回继承，不重跑；原历史 passed/0/tree 保留。

总控审定 Git 旧场景中 job 300–308、313、315–323 共 19 项可继承：原 test 与其加载的 project/feature 闭包相对 `5a3ca8f6` 无 diff，改动的 BranchPlanDispatch import 非这些 pattern 调用；原私人临时 Git 夹具、原 passed/0/tree 和日志保留，当前依赖冻结，历史 Node、架构及 Git 版本未知。另外 job 325、331、332、334–339 共 9 项，Git/PR 闭包相同；后六项 UI 夹具提取的九个 legacy 方法与旧源逐 AST 文本相同，其余 legacy 变化不在测试方法内。原 receipt 和日志保留，历史 Node/Git/TypeScript 未知。本轮未重跑 Git 夹具，也不冒充真实 GitHub 或远端 Worker 验证；其他 pattern 继续逐项审定。

520 后合成验证的逐项名称、数量、日志与输入详见 `afb3ec5c`、`ae5b7746`、`f18078f9`、`b6f86b14`、`806d47d2`、`7d91ba1b`、`50c2a865`、`c04f2dd7` 和 coverage，均仅按各项真实边界报告。专门核准的 mcpProject 43/43 使用假授权/Agent/Worker、独立工作区和回环/stdio，不代表真实生命周期/撤权；ProjectOps 历史 SDK 闭包仍未知。SFTP CleanupFileApi 的 5/5 为内存 store/fs 与假端口，不证实际持久化或删除；公开字段合成凭据不证真实后端秘密输出。

formalJobPreflightProgress/Structure/Environment 各 1/1、Failure/Rejections 各 1/1、Api 7/7 为总控审核的函数提取及自建夹具；api-environment 实际启动本机解释器 shell/loader 探针，已装 torch 时可能 CPU import，邻近检查未发现 torch 且未冻结该缺席；启动前三个 NVJITLINK/Conda 变量未设置，未接科研 Conda、未训练。Python 3.14.6/PyYAML 6.0.3 为邻近观测，旧工具链未知。

接替后合成回归 distributedPlanExecutionMode 10/10、taskQueryWideReadRealChain 3/3、planRunHoldClearedChain 3/3、planRunRecovery 7/7、nativePlanRetry 6/6、completedJobArtifactRootBinding 7/7、syncScopeStagingIdentityWiring 4/4、planSubmissionStateGuard 26/26、planRunQueryRegression 6/6、planRunSharedSubmission 5/5、planBatchDispatchFirst 14/14、rerunTransferBusyAttribution 21/21、rerunIsolateEngineContract 6/6、cleanupMissingTargets 11/11、formalJobExecution 5/5、completedJobLatestSync 32/32、planStopClear 39/39、syncScopeDelete 14/14、syncScopeWorkerAuthority 10/10、cleanupActivity 2/2、localIndexSharedIdentity 3/3、localCodeManifestCache 5/5、currentSubmissionTruth 8/8、planPreflightProgressSpeed 20/20、tmuxCloseRuntime 1/1 均 exit0。采用函数提取、VM、假请求和自建状态；tmuxCloseRuntime 用假 subprocess/timer，syncScopeDelete 只检查生成脚本与替身，preflight 保留原 40 文件计时断言；无真实 Worker、tmux、网络、UI 或删除。完整依赖/原始事件见 coverage；均待总控终审。

旧执行会话结束后受支持工具归档并核 session_meta、138 条 eligible 原事件双 SHA，139 处仅修实际归档路径（`9a69240b`），未搬删原 rollout 或重跑。此前旧会话归档修复另核 35 项事件、42 处路径，未改事件。当前 planner 42 项待核；须按具体调用链及源证继续，不得把未知或未测写成通过。

planCleanup 原文件 33/33 exit0；SFTP/UI 为替身，API 未监听，两个自建 PLAN/config 文件在 temp 根内 rename 到 clean_dir 并保留；模拟缺失不证明真实删除安全。原日志、事件与依赖见 coverage，待总控终审。

planCleanupReconnect 原文件 13/13 exit0；假 SFTP、VM 界面和模拟时钟，两个自建 PLAN/config 文件移至本 fixture clean_dir 保留；未启动实际网络、UI 或永久删除。原日志、事件和依赖见 coverage，待总控终审。

planIsolatedReview、Lifecycle、Boundaries 各 5/5 exit0；自建目标由 retainFixtureTarget 在 temp 内 rename 并保留以模拟删除，边界案例 junction 保留；假 SFTP/UI，未执行真实删除或真实 UI。原事件和依赖见 coverage，待总控终审。

planBatchPhysicalPipeline 2/2 exit0；两个自建 PLAN 目录物理移入同 fixture clean_dir，保留文件及隔离租约状态，真实删除计数 0；假 Worker/SFTP/UI，无真实网络。日志、事件及依赖见 coverage，待总控终审。

localMetadataChanges 4/4 exit0；Windows 原生 watcher 仅监听自建 fixture，模拟移除经同根 rename 保留，已有 stat 次数断言不变；原日志和依赖见 coverage，待总控终审。

syncScopeDeletionRefresh 33/33 exit0；本机 watcher 仅监听自建夹具，文件同根 rename 到 clean_dir 保留，删除/网络/UI 均为替身；原日志及依赖见 coverage，待总控终审。

tmuxCloseHttp 2/2 exit0；Python 仅提取 Agent 函数和路由字面量，临时 localhost 随机监听和线程在夹具内关闭，tmux 为 subprocess 替身；未连接真实 Worker/tmux 或外网。原日志和依赖见 coverage，待总控终审。

resultSyncFailureVisibility 32/32 exit0；VM 与假 Worker/SFTP/UI，fixture 内真实 rename 与 retainFixtureTarget 保留原字节，全部临时目录保留；不证明真实删除或传输。日志、事件及依赖见 coverage，待总控终审。

clearedOutputReplacement 5/5 exit0；隔离临时 PLAN 与队列，提取 Host、Worker/SFTP/删除为替身；无真实 Worker、网络、UI 或永久删除。原日志及依赖见 coverage，待总控终审。

manifestCleanup 17/17 exit0；隔离临时项目和租约，SFTP 清理后端为内存替身，真实 Worker、网络、UI 和永久删除未执行。日志及依赖见 coverage，待总控终审。

planJobDeleteRequeueCoverage 29/29、Production 9/9 exit0；隔离租约和自建目录，日志所称删除实际通过 retainFixtureTarget 在各 fixture 内 rename 并保留，不证真实永久删除；假 Worker/SFTP/UI。事件与依赖见 coverage，待总控终审。

remoteResultInspectionWorkflow 15/15 exit0；测试自建 localhost 随机监听返回 HTTP 413 后关闭，临时租约保留；Worker/UI 为替身，未做真实远程传输。原日志及依赖见 coverage，待总控终审。

resultCollectionPerformance 11/11 exit0；原 48 job/51 表合成规模及断言未改，子 shell 禁用 baseline；假 Worker/SFTP，临时文件、硬链接及锁监听限 fixture，监听已关闭。日志及依赖见 coverage，待总控终审。

freshResultHost 26/26 exit0、10.091 秒；输出跨 exec 和同 session 的 write_stdin 两个原事件，完整日志保留。为验证该真实续接格式而改 runner 后，原 G004 精确 pattern 单次在 20.008 秒仍未退出，立即发 Ctrl-C；续接显示 1/1 exit0、总耗时 20.389 秒，因超时不算通过。经用户明确批准一次例外，修正同 session 链校验并在测试内复用相同静态解析输入后，原 20 秒预算复验 1/1 exit0、7.513 秒；原超时和日志保留。续接必须逐事件核 SHA、顺序、同 session、最终退出和完整日志。日志为 `%TEMP%/g004-520-fresh-result-host-20261123-successor.log`、`%TEMP%/g004-520-continuation-validator-20261123.log`、`%TEMP%/g004-520-continuation-validator-approved-retest-20261123.log`。

总控逐项审定旧 shell job 21–24 可继承：原测试、fixture 和提取闭包相对 `5a3ca8f6` 未变，当前两份构建 Python 仅版本常量不同且断言不比较版本；原记录均 passed/0/tree confirmed，日志及当前依赖已冻结。旧 Node、架构、Python、Git Bash 和 WSL 精确版本未知；本轮未重跑 WSL、进程组或真实 Worker/Conda。四项已登记，待未验 runner 批解除后核 planner 并同步。

总控另审定旧 job 76–78 三个 tmuxTaskLifecycle 精确 pattern 和 job 93 gpuMemoryAdmission 可继承：测试、fixture、提取闭包未变，版本常量不参与断言；原记录均 passed/0/tree confirmed，日志和当前依赖冻结。旧 Node、架构、Python、WSL、tmux 精确版本未知；旧私有 socket、CPU probe、合成 GPU 不证明当前真实 tmux/GPU 或 Worker，本轮未重跑。

总控审定旧 job 94、95、103 按精确 identity+argv 继承：相关测试、fixture 及运行闭包未变，manualLaunch 提取的两个方法相对 `5a3ca8f6` 经 AST 文本对比相同，版本常量不影响断言；原记录分别 2/2、11/11、1/1 且 passed/0/tree confirmed，日志与当前依赖冻结。旧工具链、WSL 和 tmux 版本未知，不证明当前硬件、科研环境或 Agent 升级效果，本轮未重跑。

只读比较 automaticScopeContent 依赖时，`git show` 经 Node 默认 1 MiB 缓冲触发 ENOBUFS，子进程 SIGTERM，无仓库或远端写入；总控核旧 blob 2588951 字节后允许 3 MiB 读取，重读成功，提取的 `refreshSyncScopeMetadata` 方法旧新 AST 文本相同。该项仍待完整闭包审定，不因此计入覆盖。

总控审定旧 job 220 gpuCollectorRealTmux、293 gpuMemoryBudget 可继承：原记录 4/4、14/14，passed/0/tree confirmed；对应 fixture 和业务闭包未变，运行版本按同一运行时比较，原日志与当前依赖冻结。旧 Node/Python/WSL/tmux 等版本未知，不代表当前设备验证。旧 job 219 gpuCollectorFrame 虽为 11/11、exit0，其原 stdout 总耗时 20857.309ms 超过当前整文件 20 秒限额；不继承、不重跑，保留为精确缺口。

总控审定旧 job 228、230、231 租约测试及 36、37 配对更新测试可继承，相关源/构建闭包及提取片段未变，原日志与当前依赖冻结。本轮未做真实 Worker、UI、删除、进程扫描或更新操作。旧 37 实际为 40 pass、1 项非 win32 平台 skip，不能表述为 41/41；历史工具链未知。
