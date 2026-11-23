# G004 执行登记

完整压缩前事实见Git `6f829e1d:docs/plan-generations/G004-execution.md`；该版本保留6f14818d、f66d3694、cb44bd81、f36cb6a3、18dd5614及更早T1–T7完整原材料引用。逐项receipt/日志/事件/输入以docs/windows-entry-coverage.json为准；历史授权、失败、未知和现场均不因压缩消失。本文件cap12000/90%=10800。

## 当前目标与边界

G004 按 identity+argv 冻结增量证据；最终 package 已通过：361 active（125 历史、235 直接、1 新运行）、6 onDemand 未运行。用户批准 219/284 的本任务历史超时例外，原时长分别 20857.309/20119.841ms，不重跑、不放宽未来 20 秒。

不触碰真实 Worker、服务器、SSH、tmux、GPU 或用户配置；新阶段仅授权不抢焦点的现有单项目 UI 检查。真实传输/清理、active results与跨项目未测；本次实际本地UI范围见末节。模拟缺失不证明永久删除。原 26 个脏 dist 中，仅包内 20 项已验证并获准同步，其他 6 项、历史资产及夹具保留。

519 专用根重载后项目识别 false→false、缺 adapter，未重配重授；不能称现场完成状态丢失。519 的 341/341、13 gates、试行包及一次安装/Reload 属旧版本，不证明新源码或新 Host。用户曾批准 49 份旧 CLI 测试迁移、50 精确旧路径排除、39 旧源码删除和 B1 单次复验；原旧测试与 Git 历史保留，302 索引和 27 外部引用见 coverage，退休差异不冒业务等价。39 源码经逐项安全预检及直接父目录验证删除，六组提交 `690be905`、`4d003cdc`、`b7d6ce0b`、`3382fcbd`、`4a43d1fc`、`fd593cca`；不重复删除。

## 候选、失败与复验

0.5.520 版本源同步后 write-agent-runtime exit0、compile 8/8 gates exit0/tree confirmed、input=end；原 receipt 在 `simple_cluster/reports/test-workflow/2026-11-22T18-17-42-383Z-84032-compile/run.json`，日志 `%TEMP%/g004-520-compile-20261123.log`。Panel 模块与三个真实内嵌 script 均 vm.Script 通过，src/dist 的 10890 搜索零命中。当时 compile 生成 dist 和原有脏文件保留；该阶段尚未 package/安装/发布。查询候选版本时 Python 元数据与 Electron Node 模式的 code.cmd 短暂重叠，均只读非测试但记为潜在单进程约束违规；一次 PowerShell 引号只读失败未启动 Python，已改正确读取。

真实不利结果保留：B1 原断言失败、夹具污染致 20 秒 timeout，用户批准原预算一次复验 3/3 exit0；删除前 tsc exit2、71 emit，修正并删除后重验 exit0、emit2。首次大删除命令被平台 policy 拒且进程未创建；Get-Item 三处 Force 已移除，后按授权执行，平台未公开唯一命中原因。规划首次 0/1 因仍要求退休路径，修后 1/1；releaseAcceptance 首 0/1 因漏 onDemand，修后原预算复验 1/1。隐私测试首缺 capability 0/1、后 1/1；Worker 来源旧索引首 16/17 后 17/17、本地索引首 15/17 后 17/17、下载根路径两次 13/14 后 14/14；中立 RPC 7/8 后 8/8。候选补丁两次 CRLF exit1、一次 push 后 fetch TLS exit1，后按总控授权恢复。具体日志与其余失败见历史。

runner 增量开发曾有 OOM、解析误拒、临时 JSON 错误、依赖 drift 及旧 mcpWorkerHistory 日志被覆盖；原事件、已修状态与不重跑裁决见 `8ed64825:docs/plan-generations/G004-execution.md`。

actionLifecycle 首次 46/49 exit1，三例缺真实 `localArtifactRecord`；测试夹具接入真实共享 symbol 和局部路径替身后整文件 49/49 exit0，失败事件、完整日志及失败 eligible=false 均保留。接替后误重复已继承 job 204（9/9）和 179（7/7），误运行 onDemand serverQuotaPersistence（10/10）；另此前误运行 serverQueueDispatch（14/14）、dispatchWake（4/4）和重复 pairedUpdateTransaction（8/8）。事件和日志均保留，新记录不计活动覆盖；后续同时核活动计划及历史/直接证据。

## 审定证据和真实效果

历史 job 187/189/240、七项删锁 264/265/267/268/269/271/274 已由总控人工继承；原 passed/0/tree confirmed 和日志保留，精确旧 Node/架构未知，不称本轮真实删除通过。总控另批准 runner 旧 default job 255–263、266、270、272、273、275–283、285–287、290、291 共 27 项逐 identity+argv 继承：旧 body/fixture 未变，新增 G004 分支不作用其输入，输入指纹改动不改变原场景比较行为；原日志和当前依赖冻结，未知旧 Node/架构不补造，不覆盖新 G004 或 job 289。原先包含的 job 284 经总控复核原日志总耗时 20119.841ms，超过 20 秒，后经用户明确批准仅本任务历史继承，不重跑；原历史 passed/0/tree 保留。

旧 Git 和 UI 夹具的逐项历史适用性、闭包、原 receipt 与未知工具链见 coverage 和 `6f829e1d:docs/plan-generations/G004-execution.md`；本轮未重跑夹具，不证明真实远端或 Worker。

520 合成验证逐项名称、输入、数量、边界和原失败见 coverage 与 `9d5cae9f:docs/plan-generations/G004-execution.md`；只在原真实效果范围内适用。

接替后合成回归的逐项名称、数量、日志和真实效果边界见 coverage 与 `6f14818d:docs/plan-generations/G004-execution.md`；仅按原函数提取、VM、替身与夹具范围复用，未证明真实 Worker、tmux、网络、UI 或删除。

旧执行会话结束后受支持工具归档并核 session_meta、138 条 eligible 原事件双 SHA，139 处仅修实际归档路径（`9a69240b`），未搬删原 rollout 或重跑。此前旧会话归档修复另核 35 项事件、42 处路径，未改事件。当时 1 项待运行；最终结果见下文，不得把未知或未测写成通过。


接替后 planCleanup、planCleanupReconnect、planIsolatedReview/Lifecycle/Boundaries、planBatchPhysicalPipeline、localMetadataChanges、syncScopeDeletionRefresh、tmuxCloseHttp、resultSyncFailureVisibility、clearedOutputReplacement、manifestCleanup、planJobDeleteRequeueCoverage/Production、remoteResultInspectionWorkflow、resultCollectionPerformance 与 freshResultHost 的精确结果、数量和边界见 coverage 与 Git `6afb2ed0:docs/plan-generations/G004-execution.md`。这些是替身/夹具，未证明真实删除、Worker 或 UI；freshResultHost 续接验证曾 20.389 秒超时，用户许可修复后原限额复验 1/1、7.513 秒，原日志和事件保留。旧shell/tmux/GPU/租约、automaticScopeContent等10项与旧job005/030/031、041/111/149/154/165/232/233/296/298逐项证据、skip和未知工具链同样见该版本及coverage，不重跑。

本轮 mcpProjectOpsContract 11/11、windowScopeIsolation 8/8 均 exit0；后者发现文件环境限自建夹具，均无真实 Worker 或 SFTP。原事件采用静态字面量命令变量包装，旧 G004 核验器不识别；经总控裁决仅增加该完整包装的静态识别及反例，不执行 JavaScript。原精确 G004 pattern 单次复验 1/1 exit0，8.662 秒，日志 `%TEMP%/g004-520-static-wrapper-retest-20261123.log`；业务测试未重跑，原事件与日志保留。

核验器补丁只作用显式 G004 证据解析；旧 runner 的 39 个 test 注册及函数体相对补丁前逐 AST 比较，只有 G004 目标 case 改变，既有历史与其他直接 case 适用性保持，冻结当前依赖；G004 case 使用本轮原始新复验证据。规划器已读取本次两条真实直接事件与日志。

总控审定旧67/68/69、91/222/225、226/227/252、141/340/341按各自受限历史范围继承，旧工具链或69根字节未知，未重跑或证明真实WSL/tmux/Worker；340仅继承现存30项。219/284原超时及用户例外、289唯一fresh原20秒1/1 exit0、4508ms均保留，精确计数及日志见Git `6afb2ed0:docs/plan-generations/G004-execution.md`。

此前只读 package dry-run exit0：361 active、6 onDemand、hook zero；该次 selection 随后提交会变化，最终运行必须重算。当时规划器对现有覆盖核验后明确剩 219/284 两项阻断（后获用户明确例外）；289 的 10 项依赖、两项工具摘要和空 compiledInputs 已独立核对，当时尚待执行，最终结果见下文。

用户明确批准 219/284 仅本任务历史功能覆盖，原日志分别 20857.309ms、20119.841ms 及 passed/0/tree 保留，不重跑、不放宽未来 20 秒。发现 G004 原 outer timeout 额外加 killGrace，已将 G004 fresh 外层截止改为原测试 timeout；超时后的树结算仍保留，若迟到 exit0 也记录 timeout；普通 profile 原行为不变。原 G004 精确 pattern 单次 1/1 exit0、8746.1323ms，测试替身覆盖两种期限、超时和迟到成功；日志 %TEMP%/g004-520-deadline-verification-20261123.log。39 注册 case 相对补丁前仅 G004 case 改变，历史默认 runner 不走新期限分支。

期限补丁未提交时，真实 planner 因 runner 脏文件将 6 个按需项全部恢复，变为 367 active/0 onDemand，其中 3 项未审，故实际拒绝（exit1）；未运行这些项。待正常同步后重新计算选择与证据，不能以提交前数量冒充当前结果。

## 最终打包与生成物同步

原 package 在构建 HEAD `f66d36946ade4b911a75636d6f2fc1f28c65111b` 完成，receipt `simple_cluster/reports/test-workflow/2026-11-23T02-45-43-277Z-10816-package/run.json`，13 gates exit0、input=end、并发 1、锁释放；原 selection 保持该构建 HEAD，不冒称适用于后续提交。包 `simple-experiment-0.5.520.vsix` 2919747 字节，SHA256 `aaf19107996beae86674b16b6c25f110551e74fb70a6bd545c88d334c9b2cdba`；manifest、运行闭包、实际 ZIP/磁盘、Panel 三个脚本与 10890 检查通过。20 个包内生成物经逐字节核验后分组提交 `fea89fbd`、`18cd5836`、`120b9384`，6 个不入包的脏文件保留。首组普通 git add 返回 exit1（dist ignore 提示）但实际7个已跟踪文件均已暂存；总控核验 index 后批准直接提交，后两组使用精确 tracked update，未 force。

试行 Release `v0.5.520` 已发布，`prerelease=true`、`draft=false`，远端 tag 指向 `7bf49ba84802df56821b098b440b289d3d3eb61e`；VSIX 与同名 SHA256 资产已上传，隔离下载的 SHA256 与已验证包一致，manifest 校验 exit0。实际 ReleaseClient 核实 0.5.482 可见权威 0.5.483、0.5.520 不降级，SFTP 0.2.120 不降至权威 0.2.118。

安装前为 0.5.519，唯一一次 `npm run install:latest` exit0，磁盘和 VS Code 扩展列表均为 `simple-local.simple-experiment` 0.5.520；安装日志 `%TEMP%/g004-520-install-20261123.log` 保留 Node DEP0169 警告。稳定 MCP shim 的 launcher/resolver 与安装包文件字节一致，包内 server 目标存在；未连接运行中的面板验证动态解析。用户本人执行 Developer: Reload Window 后才可进行界面验收。

## 520 重载后单项目只读验收

首次按专用根枚举发现记录时无 520；默认 520 是稿件窗口，未调用。用户在专用项目窗口重载后，匹配记录为 SimpleExperiment 0.5.520、PID 45080、startedAt `2026-11-23T05:41:49.812Z`、loopback 19769；真实 preflight、health 和 OpenAPI 核实同一版本、实例和单项目根。SimpleSFTP 0.2.120 同 PID、同项目已激活，独立 loopback capabilities/health 握手确认；因此本轮 MCP catalog 中的伴随插件能力读取未触发未知激活。

通过已安装稳定 launcher/resolver，真实 SDK stdio 握手及 tools/list 返回 137 项；本地只读 project_authorization、action_catalog、panel_diagnostics、project_status、state_value（低流量、onboarding、setup）和 project_state 均返回成功，两次 launcher 均 exit0/stderr 空。完整响应在 `%TEMP%/g004-520-live-mcp-20261123.json` 和 `%TEMP%/g004-520-live-mcp-state-20261123.json`；未调用 Worker 或跨项目方法。实际 167 action、五类 grant 无 workers 字段，offline_import、低流量 enabled/effective、5 Worker 配置中1启用、原 PLAN `experiments/plans/ui_u01_empty_515.yaml`、空任务选择、`experiments/results`、离线两条合成结果均读回；onboarding 仍 false，不能称丢失完成状态。检测预览的 synthetic/final.csv 未解析出标准记录，原信息保留，不冒充结果通过。

本人新控制许可前，面板 diagnostics 报 ready、运行/安装均 520、无 section failures，但 heartbeat 标记 document-hidden、render health unknown；这不是可见 UI 验收。现有 Computer Use 工具可枚举窗口，但其窗口读取流程和 silent-ui-screenshot 禁止仅为截图使用 Computer Use，且未找到项目现成非激活捕获入口，未切焦点、未截图或操作界面。真实 UI、Worker、远端及跨项目仍未测。

## 用户授权后的真实界面与识别

用户先授权只读快照，后明确允许直接控制电脑；总控激活专用 VS Code 窗口 87954600 并观察真实 520 面板，同根、原 PLAN、低流量开，Worker/GPU/tmux 显示未查询或未核实。计划搜索 `ui_u01_empty_515` 后仅一个匹配、批量选中0、当前 PLAN 不变，随后清空搜索。资源树导航 element 146 点击因坐标越窗失败，未成功操作；随后用滚动条回顶部。

总控核源码边界后仅点一次工作区识别，提示已发现5个 Plan。首次坐标点击未选中继续按钮；等待期间出现 stalled 提示，不能据此判定死锁。通知中心对原继续按钮 element 755 实际点击后出现本地工作区已识别、黄色横幅消失且识别按钮恢复，未再点最终可选通知或重跑识别。Escape 还退出辅助侧栏最大化，总控随后用 element 998 恢复原全宽布局。未改 adapter、PLAN、Worker 或授权。原截图内联，完整事件见总控 rollout `01a2040c-d282-7d92-9542-abcdc0689d37`：失败 `call_b6b1cc14073a4379a34eb71c1279d99a`、通知 `call_ce52cfc3cf994c67b99dbbc4a67536af`、继续 `call_6170ac73209349e7b29ca28a840b40bd`、布局恢复 `call_2ce6b8d367b4476cbaf1117eba34d4c9`；不另造截图文件。

同一 45080 实例经真实稳定 MCP 只读回 `projectOnboardingCompleted=true`、status 520/offline_import；panel ready，heartbeat documentHidden=false、render health unknown（probe pending）、section failures 空。operation_list 返回 total 0，不能单独证明锁释放。新增完整响应 `%TEMP%/g004-520-after-ui-recognition-20261123.json`，launcher exit0、stderr空；未再次识别或清锁。真实 Worker、SSH、Agent、GPU、tmux、训练、删除和跨项目仍未测。

最终记录压缩首稿计算10940触发Python assert、写入前退出，文件未更改；外层因随后命令显示exit0，不当作Python成功。扩大语义压缩后UTF8写回及diff检查通过。总控审原MCP响应的exit0/isError=false及同实例识别true，本地验收完成，render探针未知/非标准CSV/Worker与跨项目等受限如上，不重打包、重装或后台保活。

## 当前预览修复与探针调查

专用根原 `synthetic/final.csv` 是合法宽格式，两行含 AP/macro_f1/weighted_f1；原项目预览仅按文件名选 long preset，误报缺 metric/value、0 records。同一原字节用现有表头选择 wide preset 实际得到2 records。现预览选择时传已有文本及列映射，宽/长/JSON按现有选择契约处理；预览只把含指标的解析记录计作有效，避免只有维度的行误报成功，并允许首行无指标、后行有指标。未改原文件或底层解析结果。

源级局部调用链的宽/长/JSON、空指标及混合行回归最终6/6、exit0、827.5419ms；原日志 `%TEMP%/g004-preview-formats-complete-20261123.out.log`/`.err.log`。首次测试夹具 AST 搜索不到函数，5/6 exit1；修夹具后第二次发现仅维度行被误判成功，5/6 exit1；均保留 `%TEMP%/g004-preview-format-20261123.*.log`、`g004-preview-format-repair-20261123.*.log`。中间回归6/6见 `g004-preview-metrics-20261123.*.log`。原520包和实际Host仍为旧实现，未冒称已部署。

后补显式 metric/value 列映射、alias 及零值验证，原单文件 6/6 exit0、799.2334ms，日志 `%TEMP%/g004-preview-mapping-zero-20261123.*.log`。

旧母集11个 current_defect 按真实修复提交及原受控回归逐ID复核，新增 currentReview=fixed_scoped；原问题与失败保留，未审分支和真实Worker、Git hook等外部效果不冒通过。识别另有520实际窗口成功，详见 coverage 对应行。

## 当前探针及构建门禁

探针候选真实RAF完成后补同一 heartbeat ACK，hidden/generation保护保留；Host对probe-pending保留上次渲染序号和停滞计数。原完整文件11/13 exit1，真实ACK协议及经用户明确批准的offscreen旧夹具修正后13/13 exit0，日志 `%TEMP%/g004-render-full-current-20261123.*.log`；真实进度模块与同ID双ACK、计数及timer的Host文件6/6 exit0，日志 `%TEMP%/g004-render-host-progress-20261123.*.log`。原首失败 `%TEMP%/g004-render-probe-20261123.*.log` 保留；源修未构建或部署。

原 `npm run build` 实际包含全量测试域与禁止重跑的删除场景，因此未启动。总控审定按原任务增量证据机制支持build子集：原全部compile/fullCheck、身份、失败、产物与选择门禁不缩，assemble凭据仍仅package。当前脏树只读规划build 316、package 367、build无新增identity，按需0；这不是原520包361/6或构建通过。G004原pattern在新增子集、缺项、错entry及aggregate断言后1/1 exit0，原日志 `%TEMP%/g004-build-incremental-runner-20261123.*.log` 与 `%TEMP%/g004-build-incremental-aggregate-20261123.*.log`，runner两文件commit `6afb2ed0` 已推送。首只读planner因 `src/extension/legacy.ts` 依赖漂移拒绝；仍需逐项适用对账与总控审定调度，不能批改摘要或执行禁区。总控两次只读路径猜错/Windows glob错误未触产品。

旧执行会话已结束并归档；其60条direct记录的122个原事件哈希及session身份核实一致，仅更新coverage中精确rollout路径，原日志不移动或删除。新增7个真实同根520 MCP只读结果与plan_list合成局部证据见coverage；未扩大到其他参数、真实Worker或跨项目。全部单项目母集调查仍在进行。执行记录压缩前两稿分别11639、11331字符触发assert，均写入前退出，原文件未变。
