# G004 执行登记

全文历史在 Git `18dd5614:docs/plan-generations/G004-execution.md`，更早 T1–T7、逐项命令和失败分别见 `1e91d0d4`、`32d16ac4`、`48f7e339`、`67f67de4`、`c04f2dd7`；原 receipt、日志、事件、输入与逐项边界以 `docs/windows-entry-coverage.json` 为准。本次为达到 12000 字符上限的 90% 阈值而整体语义压缩；历史授权、失败、未测与现场不因压缩消失。

## 当前目标与边界

G004 人工审定的增量覆盖按 identity+argv 复用适用的历史、直接和本轮证据，并冻结真实计划、gates、产物与输入；当前 361 active、6 onDemand，planner 仍缺 65 项，尚未通过，所有候选待总控最终审核。源码稳定后对原规划测试精确 pattern 按原 20 秒预算补验一次，执行 final dry-run 并向总控提交完整包；总控终审并另行开放前禁止 full build/package、安装和发行。0.5.520 只是候选，不能冒充已打包。

当前不触碰真实 Worker、服务器、SSH、tmux、GPU、用户授权配置或真实 UI；真实 Worker、传输/清理、active results、跨项目和新 UI 未测。保留 26 个 tracked dirty dist、历史 VSIX sha、全部夹具及现场，不 stage 或清理。模拟删除/缺失不证明真实永久删除安全。总控批准既有夹具只在自建 temp 范围内 rename 到 clean_dir 并保留字节的模拟；真实删除、真实 WSL/tmux/GPU 与完整 runtime import/exec 仍不执行。具体安全测试、原精确权限与进一步裁决见 coverage 和历史原文。

519 专用根重载后项目识别 false→false、缺 adapter，未重配重授；不能称现场完成状态丢失。519 的 341/341、13 gates、试行包及一次安装/Reload 属旧版本，不证明新源码或新 Host。用户曾批准 49 份旧 CLI 测试迁移、50 精确旧路径排除、39 旧源码删除和 B1 单次复验；原旧测试与 Git 历史保留，302 索引和 27 外部引用见 coverage，退休差异不冒业务等价。39 源码经逐项安全预检及直接父目录验证删除，六组提交 `690be905`、`4d003cdc`、`b7d6ce0b`、`3382fcbd`、`4a43d1fc`、`fd593cca`；不重复删除。

## 候选、失败与复验

0.5.520 版本源同步后 write-agent-runtime exit0、compile 8/8 gates exit0/tree confirmed、input=end；原 receipt 在 `simple_cluster/reports/test-workflow/2026-11-22T18-17-42-383Z-84032-compile/run.json`，日志 `%TEMP%/g004-520-compile-20261123.log`。Panel 模块与三个真实内嵌 script 均 vm.Script 通过，src/dist 的 10890 搜索零命中。compile 生成 dist 和原有脏文件保留；未完整 build/package/安装/发布。查询候选版本时 Python 元数据与 Electron Node 模式的 code.cmd 短暂重叠，均只读非测试但记为潜在单进程约束违规；一次 PowerShell 引号只读失败未启动 Python，已改正确读取。

真实不利结果保留：B1 原断言失败、夹具污染致 20 秒 timeout，用户批准原预算一次复验 3/3 exit0；删除前 tsc exit2、71 emit，修正并删除后重验 exit0、emit2。首次大删除命令被平台 policy 拒且进程未创建；Get-Item 三处 Force 已移除，后按授权执行，平台未公开唯一命中原因。规划首次 0/1 因仍要求退休路径，修后 1/1；releaseAcceptance 首 0/1 因漏 onDemand，修后原预算复验 1/1。隐私测试首缺 capability 0/1、后 1/1；Worker 来源旧索引首 16/17 后 17/17、本地索引首 15/17 后 17/17、下载根路径两次 13/14 后 14/14；中立 RPC 7/8 后 8/8。候选补丁两次 CRLF exit1、一次 push 后 fetch TLS exit1，后按总控授权恢复。具体日志与其余失败见历史。

runner 增量开发曾有 planner OOM exit1、数字常量误拒、命令解析误拒、登记过程临时 JSON 错误和 coverage 自身误入依赖导致 drift；各自已修，原事件保留。native parser 仅读 stdin 不执行，原 pattern 复验 18.155–18.299 秒，详见 Git `18dd5614`。旧 mcpWorkerHistory 3/3 日志被新 4/4 覆盖；总控批准使用完整原 rollout `call_88b68b75a83c458c814a7109e11212d6` 及其原 SHA，不伪造或重跑。新日志均先核精确路径不存在。

actionLifecycle 首次 46/49 exit1，三例缺真实 `localArtifactRecord`；测试夹具接入真实共享 symbol 和局部路径替身后整文件 49/49 exit0，失败事件、完整日志及失败 eligible=false 均保留。接替后误重复已继承 job 204（9/9）和 179（7/7），误运行 onDemand serverQuotaPersistence（10/10）；另此前误运行 serverQueueDispatch（14/14）、dispatchWake（4/4）和重复 pairedUpdateTransaction（8/8）。事件和日志均保留，新记录不计活动覆盖；后续同时核活动计划及历史/直接证据。

## 审定证据和真实效果

历史 job 187/189/240、七项删锁 264/265/267/268/269/271/274 已由总控人工继承；原 passed/0/tree confirmed 和日志保留，精确旧 Node/架构未知，不称本轮真实删除通过。总控另批准 runner 旧 default job 255–263、266、270、272、273、275–287、290、291 共 28 项逐 identity+argv 继承：旧 body/fixture 未变，新增 G004 分支不作用其输入，输入指纹改动不改变原场景比较行为；原日志和当前依赖冻结，未知旧 Node/架构不补造，不覆盖新 G004 或 job 289。

总控审定 Git 旧场景中 job 300–308、313、315–323 共 19 项可继承：原 test 与其加载的 project/feature 闭包相对 `5a3ca8f6` 无 diff，改动的 BranchPlanDispatch import 非这些 pattern 调用；原私人临时 Git 夹具、原 passed/0/tree 和日志保留，当前依赖冻结，历史 Node、架构及 Git 版本未知。另外 job 325、331、332、334–339 共 9 项，Git/PR 闭包相同；后六项 UI 夹具提取的九个 legacy 方法与旧源逐 AST 文本相同，其余 legacy 变化不在测试方法内。原 receipt 和日志保留，历史 Node/Git/TypeScript 未知。本轮未重跑 Git 夹具，也不冒充真实 GitHub 或远端 Worker 验证；其他 pattern 继续逐项审定。

520 后合成验证的逐项名称、数量、日志与输入详见 `afb3ec5c`、`ae5b7746`、`f18078f9`、`b6f86b14`、`806d47d2`、`7d91ba1b`、`50c2a865`、`c04f2dd7` 和 coverage，均仅按各项真实边界报告。专门核准的 mcpProject 43/43 使用假授权/Agent/Worker、独立工作区和回环/stdio，不代表真实生命周期/撤权；ProjectOps 历史 SDK 闭包仍未知。SFTP CleanupFileApi 的 5/5 为内存 store/fs 与假端口，不证实际持久化或删除；公开字段合成凭据不证真实后端秘密输出。

formalJobPreflightProgress/Structure/Environment 各 1/1、Failure/Rejections 各 1/1、Api 7/7 为总控审核的函数提取及自建夹具；api-environment 实际启动本机解释器 shell/loader 探针，已装 torch 时可能 CPU import，邻近检查未发现 torch 且未冻结该缺席；启动前三个 NVJITLINK/Conda 变量未设置，未接科研 Conda、未训练。Python 3.14.6/PyYAML 6.0.3 为邻近观测，旧工具链未知。

接替后合成回归 distributedPlanExecutionMode 10/10、taskQueryWideReadRealChain 3/3、planRunHoldClearedChain 3/3、planRunRecovery 7/7、nativePlanRetry 6/6、completedJobArtifactRootBinding 7/7、syncScopeStagingIdentityWiring 4/4、planSubmissionStateGuard 26/26、planRunQueryRegression 6/6、planRunSharedSubmission 5/5、planBatchDispatchFirst 14/14、rerunTransferBusyAttribution 21/21、rerunIsolateEngineContract 6/6、cleanupMissingTargets 11/11、formalJobExecution 5/5、completedJobLatestSync 32/32、planStopClear 39/39、syncScopeDelete 14/14、syncScopeWorkerAuthority 10/10、cleanupActivity 2/2、localIndexSharedIdentity 3/3、localCodeManifestCache 5/5、currentSubmissionTruth 8/8、planPreflightProgressSpeed 20/20、tmuxCloseRuntime 1/1 均 exit0。采用函数提取、VM、假请求和自建状态；tmuxCloseRuntime 用假 subprocess/timer，syncScopeDelete 只检查生成脚本与替身，preflight 保留原 40 文件计时断言；无真实 Worker、tmux、网络、UI 或删除。完整依赖/原始事件见 coverage；均待总控终审。

旧执行会话结束后受支持工具归档并核 session_meta、138 条 eligible 原事件双 SHA，139 处仅修实际归档路径（`9a69240b`），未搬删原 rollout 或重跑。此前旧会话归档修复另核 35 项事件、42 处路径，未改事件。当前 planner 65 项待核；须按具体调用链及源证继续，不得把未知或未测写成通过。

planCleanup 原文件 33/33 exit0；SFTP/UI 为替身，API 未监听，两个自建 PLAN/config 文件在 temp 根内 rename 到 clean_dir 并保留；模拟缺失不证明真实删除安全。原日志、事件与依赖见 coverage，待总控终审。

planCleanupReconnect 原文件 13/13 exit0；假 SFTP、VM 界面和模拟时钟，两个自建 PLAN/config 文件移至本 fixture clean_dir 保留；未启动实际网络、UI 或永久删除。原日志、事件和依赖见 coverage，待总控终审。

planIsolatedReview、Lifecycle、Boundaries 各 5/5 exit0；自建目标由 retainFixtureTarget 在 temp 内 rename 并保留以模拟删除，边界案例 junction 保留；假 SFTP/UI，未执行真实删除或真实 UI。原事件和依赖见 coverage，待总控终审。

planBatchPhysicalPipeline 2/2 exit0；两个自建 PLAN 目录物理移入同 fixture clean_dir，保留文件及隔离租约状态，真实删除计数 0；假 Worker/SFTP/UI，无真实网络。日志、事件及依赖见 coverage，待总控终审。

localMetadataChanges 4/4 exit0；Windows 原生 watcher 仅监听自建 fixture，模拟移除经同根 rename 保留，已有 stat 次数断言不变；原日志和依赖见 coverage，待总控终审。

syncScopeDeletionRefresh 33/33 exit0；本机 watcher 仅监听自建夹具，文件同根 rename 到 clean_dir 保留，删除/网络/UI 均为替身；原日志及依赖见 coverage，待总控终审。
