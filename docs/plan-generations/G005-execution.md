# G005 执行登记

上限 12000 字符，达到 10800 前归并。目标、用户决定、阶段与保护以 [G005 计划](G005-plan.md) 为准；G004 原记录保留，不作为本代开发前置。

## 当前状态

- P1：G004 专用历史复用选项及其组装凭据退出现行入口，旧闭包登记不再阻挡编译或组装；普通测试计划、日志、退出状态和当前凭据逐项校验保留。目标 runner 两项通过，额外旧闭包反例通过；未编译或完整 build。
- P2：通用命令链正在修改，尚未形成可交付闭环；P3–P9 未完成。
- 当前不连接真实 Worker 或操作真实服务器、任务、GPU、传输及删除；六项原 dirty dist 和既有现场保留。旧任务不自动迁移或重派。
- 最终 build、试行发行、安装与用户重载后的真实 UI/MCP 验收均未执行。

## P1 验证

`test/features/testWorkflowRunner.test.js` 的 final profile、assemble 和产物变更拒绝目标用例通过，真实退出码均为 0；覆盖旧 G004 选项与凭据拒绝、当前凭据接受、缺项和输入过期拒绝、旧闭包状态不阻挡组装，以及测试后产物变化阻止打包。夹具目录保留。没有运行完整测试文件或编译。

实际命令均在项目根执行，原始输出保存在本执行会话工具记录；未另写日志文件：

- `node --test --test-force-exit --test-timeout 20000 --test-name-pattern 'runner: (final profile rejects --only; --max-parallel capped; reuse removed|assemble refuses empty/short receipts item-by-item)' test/features/testWorkflowRunner.test.js`，退出 0，2/2。
- 增加旧闭包反例后，以上命令的 pattern 改为 `runner: assemble refuses empty/short receipts item-by-item`，退出 0，1/1。
- `node --test --test-force-exit --test-timeout 20000 --test-name-pattern 'runner: package refuses artifacts changed after tests' test/features/testWorkflowRunner.test.js`，退出 0，1/1。

## P2 进行中

已同步通用命令功能片段 `e2b503bb`、`c05bf94a`、`23766965`、`9c390f4a`、`c34cb3b8`、`7844db66`、`75b0914a`、`2dd2cd9d`、`b4bb0505`、`aacf2f40`、`5d5d3735`、`00142285`、`55c9fd43`、`8203311a`、`8fae34e6`、`10045704`、`2ec81d64`：命令、独立输出、可选 Worker/环境/GPU、队列与窗口身份、静态入口及停止状态已按当前范围接线；产物按用户同步范围处理，不自动删除或迁移旧任务。真实 Worker、GPU、传输和完整端到端均未验证。原逐批命令、退出码及证据保留在不可变提交 `4e315229` 的本文件；均不代表真实远端通过。

已同步 `5d385e96`：新声明命令的已确认输出隔离不再要求存在旧队列登记，仍对队列中已有匹配任务保留隔离围栏。`node --test --test-force-exit --test-timeout 20000 --test-name-pattern 'a new declared submission' test/features/planRunRerunIntent.test.js` 退出 0、2/2；noEmit 退出 0。为本机替身检查，未移动真实文件。用户新增全部清理后台隔离要求已纳入计划；当前重跑链等待隔离完成仍须修改，尚未满足该要求。

已同步 `9df5b92d`：后台清理首批，Host 按节点和重叠路径互斥，未知发送结果保留对应路径直至状态核实；移除该 Host 对整项调度及无关产物同步的全局阻断，发送前检查精确输出冲突。受控 Promise 的 `node --test --test-force-exit --test-timeout 20000 test/features/cleanupConcurrentTargets.test.js` 首次退出 1（测试夹具给项目根使用相对路径），改成绝对路径后退出 0，后续修改复验均退出 0、各 1/1；`test/features/distributedPlanSubmissionRouting.test.js` 退出 0、11/11；`test/features/planCleanupPanelBridge.test.js` 退出 0、19/19；noEmit 退出 0。旧隔离审查测试断言随接口调整，因夹具实际删除文件本轮未运行。清理面板受理后立即返回、配套传输端及重启后未决操作的跨进程范围等仍待完成；未执行真实删除。

已同步 `f583dd01`：清理审核页在所需确认后返回请求身份（永久删除保留双确认）并释放页面操作，后台结果和失败仍可见；重复请求不重新启动。`node --test --test-force-exit --test-timeout 20000 test/features/planCleanupPanelBridge.test.js` 退出 0、19/19；`node --test --test-force-exit --test-timeout 20000 test/features/cleanupConcurrentTargets.test.js` 退出 0、1/1；noEmit 退出 0。仅假清理器及页面桥接验证，无真实文件删除。

已同步 `94f8bdad`：清理 API/MCP 执行与继续入口读取已有人工确认后返回受理身份，后台错误进入诊断，实际结果仍查原状态；永久删除仍需两次确认。`node --test --test-force-exit --test-timeout 20000 test/features/cleanupConcurrentTargets.test.js` 首次退出 0、2/2，补充确认边界后退出 0、3/3；`npx tsc --noEmit --incremental false` 退出 0。均使用替身，未删除文件。

配套 SimpleSFTP `62de187` 按实际源和目的路径声明清理租约，`node --test --test-force-exit --test-timeout 20000 test/cleanupLeaseScope.test.js` 退出 0、1/1。后续 `024c1bc`、`33f5519` 尝试解除全局传输忙及容量限制，替身测试虽通过，但发现受管远端清理在本机返回后仍运行，未证明普通传输共享其路径锁；故 `32e9b40` 暂时恢复原守卫，未把尝试视为并发安全完成。恢复后 `test/cleanupBackgroundAdmission.test.js` 与 `--test-name-pattern '用户确认后的自身隔离执行完整走完' test/cleanupExecuteSelfBusy.test.js` 各退出 0、1/1，`node --check extension.js` 退出 0。一次只读基线片段准备断言退出 1，未写文件，修正后按目标恢复。均为替身，未执行真实删除或远端操作；提交链、路径级跨传输生命周期保护及重启后未决范围均未完成，未打包或安装配套版本。

清理 API/MCP 受理前先以已确认记录检查并预约本窗口实际目标，同一在途重叠路径即时返回冲突；无关目标仍可受理，后台再次核实实际状态。`node --test --test-force-exit --test-timeout 20000 test/features/cleanupConcurrentTargets.test.js` 退出 0、3/3；`npx tsc --noEmit --incremental false` 退出 0，均为替身，无真实删除。

已同步 `7fff7f88`：面板创建 PLAN 改为填写名称、实际命令及独立输出目录，生成新格式并保留当前项目选择；取消或路径不安全不写 PLAN，不再触发结果自动解析。`node --test --test-force-exit --test-timeout 20000 test/features/guidedCommandPlan.test.js` 退出 0、2/2，补充项目切换后退出 0、3/3；`test/features/onboardingAutoParse.test.js` 退出 0、1/1；`npx tsc --noEmit --incremental false` 退出 0。现有快速接入目标用例首次退出 1（断言旧单参数连接调用），修正为现有双参数后再次退出 1（断言已退役科研配置门槛），按实际命令静态检查调整后退出 0、1/1：`node --test --test-force-exit --test-timeout 20000 --test-name-pattern 'quick project onboarding records local recognition' test/features/projectQuickStartWorkflow.test.js`。为提取实际方法及替身验证，未做真实界面验收。

Worker 启动实际命令前重新检查独立输出目录，目录非空或为文件则拒绝，空目录仍允许；防止提交后的新文件被覆盖。`node --test --test-force-exit --test-timeout 20000 test/features/declaredCommandPlan.test.js` 退出 0、1/1，`npx tsc --noEmit --incremental false` 退出 0；只抽取函数并使用假进程，保留本机夹具，无真实 Worker。

原生任务的显式预检使用已保存的实际命令与输出声明，核对命令身份，不再要求指标 CSV 或科研模式解析；保留源码证明和路径准入。`node --test --test-force-exit --test-timeout 20000 test/features/declaredCommandPlan.test.js` 退出 0、1/1，`npx tsc --noEmit --incremental false` 退出 0；抽取函数与替身验证，未连接 Worker。

原生旧任务缺少保存的实际命令时，显式预检返回不支持，保留旧记录、不转换或启动；同一目标测试退出 0、1/1。

本地 PLAN 列表识别新命令格式并显示名称、命令和输出，不再按科研配置判无效或推测训练模式；矩阵数量留待实际校验。首次 `test/features/guidedCommandPlan.test.js` 退出 1，暴露双引号转义被保留；修正 YAML 字符串及引号内注释处理后两次退出 0、各 3/3，含引号、反斜杠及 `#`。`test/features/staticEntrypointProbe.test.js` 退出 0、3/3，noEmit 退出 0。检查现有 `yaml`、`js-yaml` 包时均因未安装退出 1，未新增依赖。尚未真实界面验收。

手工派发确认绑定实际命令、工作目录及输出声明，确认期间变化则拒绝派发。`node --test --test-force-exit --test-timeout 20000 test/features/manualDeclaredIdentity.test.js` 退出 0、1/1；`npx tsc --noEmit --incremental false` 退出 0。使用内存队列替身，未派发真实任务。

服务器队列审核也绑定同一命令、工作目录及输出声明，变化时不提交。`node --test --test-force-exit --test-timeout 20000 --test-name-pattern 'server queue rejects changed declared commands' test/features/serverQueueDispatch.test.js` 首次退出 1，旧夹具缺少新格式必填声明；补齐夹具后退出 0、1/1；noEmit 退出 0。使用内存替身，未派发真实任务。

两种审核的身份绑定补齐环境、指定 GPU 和自动 Worker；相同两项目标测试各退出 0、1/1，noEmit 退出 0，均为内存替身。

命令状态片段的目标检查 `node --test --test-force-exit --test-timeout 20000 --test-name-pattern 'declared command' test/features/taskLifecycle.test.js` 退出 0、2/2；它只验证本机状态投影与假查询，不代表 Worker 执行。

Worker 命令协议的本机函数夹具通过；`node scripts/test-workflow.js test:tmux-lifecycle --dry-run --only test/features/declaredCommandPlan.test.js --max-parallel 1` 退出 0，选出 1 个独占文件，未运行该测试以外的任务。该片段不代表远端部署或端到端运行。

已在源码中开始替换 PLAN 声明、队列及任务窗口命令路径，尚需接通提交前检查、远端观察与受影响调用链，不能视为可运行或已交付。`node --test --test-force-exit --test-timeout 20000 test/features/declaredCommandPlan.test.js` 两次退出 0，各 1/1；为代码修改后的针对性检查，夹具保留。原始输出在本会话工具记录。

`node node_modules/typescript/bin/tsc -p . --noEmit --incremental false --pretty false` 首次退出 1，发现新队列类型及既有 dirty PlanCleanupHost 的类型错误；修正后一次退出 1（新增结构类型缺字段），补齐后退出 0。该检查不生成 dist，不代表 build 或完整行为通过。

`node --test --test-force-exit --test-timeout 20000 test/features/taskLifecycle.test.js` 在增加通用命令和完成事实断言的两次运行均退出 0、14/14；实际窗口执行未验证。增加假 shell 进程检查后，`declaredCommandPlan.test.js` 再次退出 0、1/1。原始输出在本会话工具记录。

继续接入假调度任务、来源凭据及观察后，`declaredCommandPlan.test.js` 目标文件再次退出 0、1/1；加入独立执行观察后 `taskLifecycle.test.js` 退出 0、15/15。相关调用均为本机夹具或替身，不是 Worker 验收。

进一步调整观察后 `taskLifecycle.test.js` 退出 0、16/16；扩大声明命令预演夹具后 `declaredCommandPlan.test.js` 退出 0、1/1。随后 noEmit 首次退出 1（WorkerProgressQuery 中集合元素类型推断为 unknown），补充真实字符串类型后同一命令退出 0。

移除科研输出门槛并保留实际命令的静态入口检查后，`node --test --test-force-exit --test-timeout 20000 test/features/staticEntrypointProbe.test.js` 最终退出 0、2/2，noEmit 退出 0。动态或项目外入口标记未检查；这些检查不运行科研命令。

加入 PLAN 命令与工作目录解析断言后，同一入口检查测试退出 0、3/3；`node --test --test-force-exit --test-timeout 20000 --test-name-pattern 'PLAN validation fences project changes' test/features/mcpWorkflowHostSafety.test.js` 退出 0、1/1。当前通用调度链其余工作仍未完成。

会话状态检查首次误将 `/local` 后缀传给 UUID 参数，退出 1；用真实 UUID 修正后退出 0、角色 match、继续，无项目修改。

一次只读源码搜索的 PowerShell 重定向参数被外层展开导致解析失败；改用不带重定向的定向搜索，无项目修改。
一次准备分块暂存的命令因嵌套 PowerShell here-string 解析失败，退出 1、未更改索引；改用 pwsh 直接解释并检查补丁后暂存指定 Host 片段。
一次只读 manifest 查询误把对象当数组，Node 退出 1；改按对象键读取，无项目修改。
一次只读搜索使用 Windows 不接受的路径通配符、另一次指定了不存在的工作目录；均未修改项目，已定向读取。

空目录审核贯穿项目上下文：工作树首测退出1、7/9（旧夹具缺运行集合/结算方法，Temp/g005-empty-context-69c783ef6d6449d5b07cc7141c409a96/stdout.log），修后9/9（Temp/g005-empty-context-fix-2495d6c679df4f4a8ede1ec981dea1a6/stdout.log）。基线候选首测退出1、8/9（夹具缺运行集合），修后9/9、noEmit 0（Temp/g005-context-batch-8ab7b27ea8b042cd9576c7ec593e8b13/stdout.log、stdout-fixed.log）。真实清理链未验。

SFTP 路径租约基础批 ef6c9c1466c60510d9a2c364d7698fa35d5e6bda 已推送并核同步；基线假13/13（Temp/g005-lease-batch-j2xeq1zb/stdout.log）、J0。SE 对未结算范围的恢复保护基线假2/2（Temp/g005-se-lease-batch-vhap0gie/stdout.log）、noEmit 0；真实清理链/跨插件恢复未验。曾在非 Git 的候选目录误查 Git，失败且未修改，随后在真实仓核对。

隔离清理状态查询贯穿项目上下文；基线假10/10、noEmit 0（Temp/g005-isolate-context-_cwcs421/stdout.log），完整清理链未验。SFTP c70861b96e57b26dfad77a7ae01feaaa471221c9 基线假1/1（Temp/g005-parent-facts-batch-0puwfphl/stdout-inspect.log）；首次 push 被 GitHub Internal Server Error 拒绝（2026-11-25T00:30:16Z，Request ID DE30:1E44B3:EC66F:18A779:6B062C17）。总控核远端未前进后授权一次普通恢复，push 成功，fetch 核 HEAD/origin/master/FETCH_HEAD/upstream 一致。

空目录清理按目标并行受理，完成回执核操作身份，断线/不匹配留未知；基线候选假2/2、既有消费者17/17、noEmit 0（Temp/g005-parent-admit-zufravoq/stdout-final.log、replacement-final.log）。混合终态消费者工作树假2/2（Temp/g005-parent-consumer-gpdp9b1u/stdout.log），依赖未提交，不算本批基线通过；真实链未验。
SFTP 空目录回执传递原操作身份批 d0c201c50f35f94e73ae716bb4702ed51a21d9c4 已推送并核同步，基线假2/2（Temp/g005-parent-receipt-d72pejab/stdout.log）；真实清理未验。

SFTP 查询按重叠目标分槽批 a35401d4a558566edb752fdbdfb83e31fdad0082 已推送核同步；基线仅审定的两个正向 pattern 假2/2、node --check 0（Temp/g005-observe-scope-d_kmo3if/stdout.log），未运行性能项。声明命令产物清单生成与查询包含显式 CSV；基线抽取函数/假进程1/1、noEmit 0（Temp/g005-declared-producer-je3o90pw/stdout-final.log），未部署 Agent，状态归并/选中范围及全链未验。

完成事实基线候选首测退出1、19/21：进度查询缺声明字段依赖，旧清单夹具将未知退出误期望完成（Temp/g005-proof-projection-sa7xkzxr/stdout.log）；尚未通过。声明身份查询先行批基线正向 pattern 1/1、noEmit 0（Temp/g005-progress-identity-1h9nofk6/stdout.log）；真实 Worker/全链未验。

完成事实候选消费者首测退出1、8/11：队列尚缺终态持久化/反证撤销（Temp/g005-proof-projection-sa7xkzxr/verified.log）；仍待闭合。声明产物新鲜度先行批基线正向 pattern 1/1、noEmit 0（Temp/g005-fresh-artifact-bw7p5_88/stdout.log），Worker/全链未验。

完成事实候选补队列依赖后消费者退出1、10/11，PLAN 计数仍按执行结束计完整（Temp/g005-proof-projection-sa7xkzxr/verified-core.log）。PLAN 计数先行批基线1/1、逻辑计划4/4、noEmit 0（Temp/g005-plan-count-0vhf01lv/stdout.log、logical.log）；真实 UI/全链未验。

SE 2d39821e 首次 push 退出1，GitHub 5xx，2026-11-25T01:00:04Z，Request ID E8CE:3F29AB:1353F4:1F864F:6B063313；总控核远端未前进后授权一次恢复，普通 push 成功并 fetch 核同步。
完成事实候选消费者整文件首测退出1、5/7：旧夹具将未知退出误期望完成，另一夹具缺 runningOperations（Temp/g005-proof-projection-sa7xkzxr/replacement-consumer.log）；不冒全文件通过。覆盖消费者要求执行结束且完整确认；新假测首轮退出1、0/1（夹具缺 CSV，Temp/g005-replacement-proof-h4endpu2/stdout.log），补后1/1（stdout-fixed.log），既有消费者正向1/1（existing-consumer.log），T0。建符号链接曾 WinError 1314，改用 junction，现场保留。声明清单独立分支及完整链仍待核。

产物同步准入及在途重核绑定精确完成证明，队列写入时拒过期身份；HEAD+本批假端3/3、T0（Temp/g005-sync-proof-3w5916xy/stdout-final.log），不表示真实 Worker 同步完成。
暂存新测试初次 update-index 缺 --add 退出128，随后用 git add 成功；无测试重跑绕过。

完成事实区分精确 tmux 执行退出和声明产物确认，未知保留既有证明，新反证撤销；禁止清单退出码伪装为窗口退出。前置计数、重跑选择及同步准入批已同步。HEAD+本批隔离假生命周期20/20、证明11/11（Temp/g005-proof-projection-sa7xkzxr/lifecycle-after-count.log、verified-after-count.log），已审定重跑消费者正向1/1（replacement-guard.log）、同步消费者3/3（sync-consumer.log）、T0（compile-prereqs.log）；首败及测试边界见本登记前文。实际 Worker、Agent、选中范围及 UI 全链仍未验。
