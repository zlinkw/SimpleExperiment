# G004 执行登记

519重载：专用根默认profile实测519 PID29888，离线、低流量、5配置/1启用、PLAN、任务选择、结果目录、离线包和授权保持；识别原值和现值均未完成。默认发现曾指向稿件且未调用；宽CSV及指标问题见coverage。流程读错可致覆盖，合成存储首1/2 exit1，TEMP日志 `g004-519-flow-real-workflow-ff08.log`，无真实损失。A1读错阻止初始化及覆盖、进度保存失败明确提示；11/11 exit0，`g004-r519-a1-project-state-ff08.log`。其他证据见coverage.g004U04RemainingInventory.g004Reload519LocalAudit。

布局并行清旧键可能丢值，首0/2 exit1，`g004-519-layout-legacy-failure-ff08.log`，无真实损失证据。A2成功保存后清旧键；状态13/13、布局3/3、上下文20/20 exit0，日志 `g004-r519-a2-project-state-ff08.log`、`g004-r519-a2-layout-ff08.log`、`g004-r519-a2-context-ff08.log`。拓扑假对象3/3 exit0，未动真实设置。

519指标语义合并，两次各0/1 exit1，`g004-519-metric-identity-ff08.log`、`g004-519-metric-collision-ff08.log`。A4保留语义及显式别名；CSV/JSON、预览、schema、0/空6/6 exit0，`g004-r519-a4-metric-final-ff08.log`。未写真实项目。

R519 A5按输入列选择默认长宽预设，保留显式和自定义预设；解析器/CLI及MCP目录各8/8 exit0，日志 `g004-r519-a5-parser-final-ff08.log`、`g004-r519-a5-mcp-ff08.log`，未调用Worker。

R519 A6历史结果读错/坏JSON反馈原因，缺失仍允许；内存fs联验1/1 exit0，同目录 `g004-r519-a6-history-final-ff08.log`，未调用Worker。

R519 B2选择等待保存并反馈跨项目/持久化失败；已写PLAN失败明确提示。假对象动作46/46、迁移13/13、上下文20/20 exit0，日志 `g004-r519-b2-actions-complete-ff08.log`、`g004-r519-b2-migration-ff08.log`、`g004-r519-b2-context-ff08.log`。首44/45 exit1因抽取夹具缺`selectResultPreset`，已补依赖，`g004-r519-b2-actions-first-ff08.log`。

R519 B3手动刷新/重连失败可见，后台容错保留。假对象4/4、低流量16/16、关闭决策14/14 exit0；日志 `g004-r519-b3-network-final-ff08.log`、`g004-r519-b3-traffic-ff08.log`、`g004-r519-b3-closure-ff08.log`。

R519 B4调试包缺失、取消和失败不冒成功；假UI/传输/文件1/1 exit0，`g004-r519-b4-debug-first-ff08.log`，无实际下载。

R519 C1修复14项API本地路由，保留确认、资源租约及业务门禁；真实入口配假handler 47/47 exit0，同目录 `g004-r519-c1-actions-first-ff08.log`，未执行远端动作。

R519 C2明确设置范围及准备副作用，global写入不误落项目；源码/目录48/48、真实set/reset配内存配置49/49 exit0，日志 `g004-r519-c2-actions-first-ff08.log`、`g004-r519-c2-consumers-ff08.log`，未改真实设置。

R519 C3五个Git命令返回Promise，假对象4/4 exit0；首3/4 exit1为测试误判注册顺序，日志 `g004-r519-c3-git-first-ff08.log`、`g004-r519-c3-git-final-ff08.log`，未动真实hook或发布。

R519 C4旧CLI参数曾在进入shim前被解释管道，exit255；对照exit0，TEMP夹具 `g004-c4-cmd-fixture-1a624cb400094bdca5c67bf46b5f57c9`。用户现退役业务CLI，不更改结果ID。

B1末尾通知租约返修先验：原方法未释放的断言失败；新增夹具未恢复通知替身致后续用例超时20秒、单文件exit1，已停止不重试，日志 `g004-r519-b1-lease-before-ff08.log`；非真实Host操作。

T1实例发现/RPC与错误类型移至中立API位置，Server/面板/分支调用接入；假回环1/1 exit0，首0/1 exit1因误以为旧unavailable是CliError，日志 `g004-r519-t1-client-first-ff08.log`、`g004-r519-t1-client-final-ff08.log`，未连接真实实例。

T2中立MCP版本解析器假对象1/1 exit0，`g004-r519-t2-resolver-missing-ff08.log`。新启动器/安装器仅写MCP入口，假进程及隔离目录2/2 exit0，首1/2 exit1因测试原位sort改了对照数组，日志 `g004-r519-t2-entry-first-ff08.log`、`g004-r519-t2-entry-final-ff08.log`；生产入口尚未切换。

T3查询上下文迁出并保留同一个AsyncLocalStorage；真实queryProject并发假RPC隔离1/1 exit0，`g004-r519-t3-context-first-ff08.log`，其余消费者待迁。

519识别未完成及同窗冲突不能认定锁死；原识别不记完成首0/1 exit1，`g004-519-bootstrap-recognition-ff08.log`。B1保存PLAN及识别事实；假对象2/2、快速9/9、上下文20/20、命令3/3、持久化3/3、投影6/6 exit0；日志 `g004-r519-b1-` 加 `recognition`、`quick-first`、`context`、`command`、`persistence`、`projection` 及 `-ff08.log`。未改真实标记。

519历史CLI合成查询通过、精确ID经cmd失败，详见coverage。A3 Git hook读错及标记不完整保留原文件，假fs及启动消费者3/3 exit0，`g004-r519-a3-git-hook-ff08.log`。300/137/45/167母集重叠，不相加。

519发行：源码/tag `6932321534f3b0c2df3b1983bfede2f88f7b868f`，[试行Release](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.519)与下载同SHA、Latest483。ReleaseClient首验误期待SFTP Latest120（实际118）exit1，修后exit0，`g004-519-client-after-ff08.log`。唯一安装exit0含DEP0169，`g004-519-install-ff08.log`。实机见顶部。

519唯一package exit0，341/341、13门禁、进程树结束、峰1、按需0及锁释放；输入=end `02a04b0a7ed920361e852dea0e41d4740114b1cefbb1aabb8ab2c4bd71f5560f`，日志 `g004-519-package-ff08.log`，回执 `simple_cluster/reports/test-workflow/2026-11-22T06-35-19-310Z-69208-package/run.json`。新dist识别/Panel/生成脚本VM通过、10890零命中；VSIX闭包326/同源373及内容策略通过。包2,988,831字节，SHA256 `525e235fe7e380bf3684edf5b8bfd3dd7620badefd964dcdcd671b14c0216b33`；完整原文及预检路径误写见Git `48062264:docs/plan-generations/G004-execution.md`。

519交付预检及工具误用见Git `48062264:docs/plan-generations/G004-execution.md`；dry-run exit0，341独占、按需0、max1。

项目识别记忆：globalState单根保存及隔离，API/面板同源。Memento首0/2 exit1、修后3/3，提示1/1、迁移10/10 exit0；日志 `g004-518-onboarding-before-ff08.log`、`g004-518-onboarding-isolation-ff08.log`、`g004-518-onboarding-prompt-final-ff08.log`、`g004-518-onboarding-bootstrap-final-ff08.log`。未改真实标记，原文见Git `48062264:docs/plan-generations/G004-execution.md`。

项目清除状态修复：null/cleared旧值不复活，坏JSON/EACCES报告。内存存储首9/10 exit1、修后及补验各10/10 exit0；TEMP日志 `g004-518-cleared-before-ff08.log`、`g004-518-cleared-after-ff08.log`、`g004-518-cleared-final-ff08.log`。未清真实数据；原文见Git `48062264:docs/plan-generations/G004-execution.md`。

518 重载后实际单项目验收（当前部分通过，待总控复核）：live discovery/health/status 证明 Host PID 76852、版本 0.5.518、唯一专用根 `C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f`、offline_import、低流量 enabled/effective；本人统一项目 grant 已真实存在，5类权限、无 Worker 授权快照。此窗口属于默认 profile，当前配置5台/启用1台，不能当作旧零 Worker 隔离 profile；未执行服务器、健康、隧道、任务、Agent 或共享设置操作。原进口状态启动时已恢复，但不同 profile 不能作为升级清空配置的证据。

U54 两个公开 `invoke` 成功返回，selectPlan 选既有合成 PLAN 后恢复 `experiments/plans/ui_u01_empty_515.yaml`，selectExperiment 选/取消合成任务；实际 state 与 `simple_cluster/ui/plan_selection.json`、`task_selection.json` 读回一致。U55 真实 MCP `configuration_get/set` 将项目 `simpleExperiment.resultCsvDir` 临时设为 `experiments/results/synthetic`，state 与 `.vscode/settings.json` 读回后恢复 `experiments/results`；授权生效不代表已调用全部权限。`result_parse` 和 `metric_leaderboard` 经当前 live catalog、mcp.call 读取已有合成 CSV，分别返回两行/两组，保留 DSC=0、accuracy=0、带逗号标识和空值；没有连接 Worker。主动 results.list/result_export 会触发启用 Worker，依本轮边界未测；原本地 UI 导出及受控消费者旧证按原范围保留。

U56 518实测离线合成包导入及恢复原包均exit0，面板显示2/2、来源、中文、引号、空seed及AP=0并标未核实；重导更新导入时间，旧主动查询错误未重演。导入前已核实时流断开及直接触发链不发Worker请求；首次离屏元素、文件框索引和坐标校验失败未输入。完整证据见 `89498eff:docs/plan-generations/G004-execution.md`，517原有效PLAN/结果/日志证据按原范围复用。

518时持久化身份及未识别状态原始调查见 `89498eff:docs/plan-generations/G004-execution.md`；其旧workspaceState引导标记描述只适用于当时运行源码，519已按规范项目根存入同profile globalState。不能借其他profile值或虚构已识别，518未含后续持久化源码修复；四跨项目与89旧延期范围未开放。

518 项目本地状态返修：PLAN/任务选择、离线包和布局读取原来把损坏或拒绝访问当作不存在，旧状态迁移可能覆盖原文件并清除旧值；现区分文件不存在与读取/格式错误，错误带路径上报并阻止迁移和覆盖，修复文件后可重试。离线导入/清除保存失败不清旧值，恢复当前包并传播错误。真实源码/内存存储单文件回归首轮 7/8 exit1，增加失败恢复后 9/9 exit0，补充格式及 EACCES/ENOENT 后 9/9 exit0；日志分别为 `C:/Users/ZLK/AppData/Local/Temp/g004-518-state-read-before-ff08.log`、`C:/Users/ZLK/AppData/Local/Temp/g004-518-state-read-after-ff08.log`、`C:/Users/ZLK/AppData/Local/Temp/g004-518-state-read-final-ff08.log`。未修改真实项目旧文件或执行真实恢复，修复尚未构建或安装。

518 持久化返修：共享连接迁移或保存失败后，原 Promise 队列一直保持拒绝，后续显式保存无法重试；现在前次失败仍向原调用者报告，下一次保存可重新写入，旧迁移值保留。真实源码的内存存储回归覆盖迁移失败及普通保存失败、重试与重新构造消费者读回；定向单文件首轮 0/1 exit1、修后 1/1 exit0，日志 `C:/Users/ZLK/AppData/Local/Temp/g004-518-shared-retry-before-ff08.log`、`C:/Users/ZLK/AppData/Local/Temp/g004-518-shared-retry-after-ff08.log`。先前嵌套 PowerShell 命令因变量被外层展开产生解析错误 exit1，未启动测试；未修改真实共享连接，修复尚未构建或安装。

0.5.518 最终交付：源码与生成物 `20ae86ed32f0baa9106645decb60cf9a299f3518` 已 FF 同步，远端 tag 同提交；[试行 Release](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.518) 为 prerelease，VSIX 2987002 字节、SHA256 `703d5ae27781921294ff5eeb0bb7355ec7db8581390b73549420a564045e5624`，隔离下载包与精确同名 sha 一致。真实更新客户端确认普通 Latest 仍为 0.5.483、518 与 SFTP 0.2.120 不降级。`npm run install:latest` 一次 exit0，带 DEP0169 warning；磁盘为 518/SFTP 0.2.120，稳定入口存在。此前待裁决及未发行状态已由本段取代，原失败保留。该段交付时尚待重载；其后实际 Host 与本人授权以顶部 518 验收段为准。

0.5.518 第二次 package exit0，341/341、13 gates、并发1、锁释放，receipt `simple_cluster/reports/test-workflow/2026-11-22T03-36-44-479Z-33768-package/run.json`；VSIX 2987002字节 SHA256 `703d5ae27781921294ff5eeb0bb7355ec7db8581390b73549420a564045e5624`。真实 Panel 模块及2个生成脚本 VM、实际 VSIX 内容策略验证均 exit0；运行闭包核验进程自然结束但工具丢失输出及退出码，状态未知。总控批准等价实际 ZIP 核验：325闭包、324面板文件均存在，371运行文件与构建输出逐字节摘要一致，身份/version/engine正确，exit0；原未知不覆盖。

518 精确 `git add` exit1 提示 dist 被忽略；回读状态确认指定13个已跟踪生成文件及8个非生成文件均实际暂存，未强制添加或触碰未跟踪项。

0.5.518首包339/341 exit1、前10门禁通过、并行峰1及锁释放，原回执 `simple_cluster/reports/test-workflow/2026-11-22T03-16-49-272Z-80576-package/run.json`。mcpProject 41/43因夹具共用对象，复制后43/43；serverQuota 9/10因夹具缺`mcpInvocation`，修后10/10，均exit0；补验日志同上临时目录 `g004-518-mcp-project-after-ff08.log`、`g004-518-worker-quota-after-ff08.log`。仅修夹具，后续发行状态见顶部，未动真实权限/Worker。

U54–U56 517实机及源修原始记录见 Git `eab27339:docs/plan-generations/G004-execution.md`：U54调用失败、42/43→43/43；U55旧方案43/44→44/44，新裁决45/45两轮；U56离线摘要不可见、预览8/8，坏行7/8 exit1→8/8，补别名8/8。517本地PLAN/向导/结果拆表/取消、MCP解析及隔离profile零Worker的日志均在原记录。`node scripts/test-workflow.js --help` exit1因不支持；CLI默认绑定不符exit2未重放。
U04排查基线HEAD=origin/master `b7c0b42c27227a8ec49d42d1f21346900a274ae4`、tracked clean；原材料在Git `48062264:docs/plan-generations/G004-execution.md` 和coverage。factory缺四项门禁回退legacy，恢复页VM 5/5 exit0；未重载、写剪贴板或访问服务器。旧静态脚本不能代表完整母集；后续源码见1ff64a81及下文，旧执行聊天已归档。

版本审核13/13、缓存及同步页4/4和3/3 exit0；U04-01夹具首失败、U04-02延期，见4a80c627及coverage；无真实删除。

本登记上限12000字符、90%时语义归并；原完整逐项记录保留于 Git 10c0689e:docs/plan-generations/G004-execution.md，U04中途记录另见4a80c627同路径，项目计划与代次索引为总控独占。执行范围为本人日常单机最多两个项目，不做多项目压力、无入口参数突变或新锁队列；保护真实Worker、训练、消费项目、共享配置、原窗口、未保存文档及全部夹具。源码、旧dist、已安装版本及远端效果分开记录。

既有G004/U01–U02原始细节及首失败在 Git `10c0689e:docs/plan-generations/G004-execution.md`，U03/516在 `b7c0b42c` 同文件及计划，历史数字不作当前按钮分母。A组首0/3含缺VS Code夹具，修夹具仍0/3、修逻辑3/3、限定实际入口4/4；空seed/cases和reset首失败后修复。MCP43/43、旧断言修后15/15；build首并发中止exit1、夹具6/7→7/7，最终回执 `simple_cluster/reports/test-workflow/2026-11-21T04-18-18-128Z-69044-build/run.json` 为285/285、10门禁、并发1、按需未跑6。唯一旧锁经本人精确授权删除。

0.5.514/515安装、发行及实际失败见10c0689e与G004-plan，Latest仍0.5.483。

U01/U02/U03分别2/8/10项已修；U03末轮42/42 exit0。J01宿主缺GIT_CONFIG_VALUE_0/5且传递未知；simpleex --version绑定不符exit2。完整记录见b7c0b42c及计划。

0.5.516 package首轮340/341 exit1，断言修后22/22及341/341 exit0；安装一次、未获用户Reload确认，证据见计划及b7c0b42c。
U04逐项调查、原始退出码与受控证据保留于 Git f72d0066 的本登记及 coverage.g004U04RemainingInventory。确认43项：单项目39、跨项目02/05/06/07延期4；20、33–36、40–44撤回并保留编号与证据。安全拦截后未重放专项；没有真实Worker、任务、文件删除或窗口操作。

关键失败保留：日志导航目标文件12/13 exit1（夹具缺setNativeTitle），另行VM补测3/3 exit0（首次夹具缺nativeTitleMutationVersion exit1）；U04-03首次假错误类型不符exit1后修正；U04-10完整对象比较因时间戳不同exit1，业务字段比较exit0；CLI --version API_WORKSPACE_MISMATCH exit2。U04-51的yaml及js-yaml模块均缺失各exit1；其他夹具和整理脚本首次失败见原记录及coverage。原失败不被后续通过覆盖。
最终逻辑母集300项：界面279（限定结论204、延期75），独立VSCode命令21（限定结论7、延期14）；合计限定结论211、剩余89均延期。GPU两合成行合并/打散及假持久化、TMUX三种合成导航和all筛选、端点清单假编辑器正常/错误均exit0；真实Worker、剪贴板、网络未测。资源导航6精确/2回退exit0，首次探针语法错误exit1未写。13项旧工具证据适用边界及全部映射见coverage.logicalActionCensus，实际控件实例数未知。

B1/B2/B3 39项分组修复、各项受控结果和首失败详见 Git `c37827c8:docs/plan-generations/G004-execution.md`，不将受控结果扩称真实Worker通过；U04-30特殊键、日志导航首12/13及后13/13证据见 `eab27339` 同路径。4跨项目与89入口未开放。
0.5.517历史完整交付与原日志见 Git `89498eff:docs/plan-generations/G004-execution.md`：首package 337/341 exit1、合作取消因stdin关闭失败，四处仅修测试后补验通过，Agent夹具额外首补失败；第二次341/341、13门禁通过。生成脚本VM首命令转义错误exit1后通过，日志导航首12/13后13/13；其余闭包/同源、远端下载及客户端证据和退出码保留原登记。[试行Release](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.517)绑定 `a7d2a7275c5d9ea455c2e369cdddaa8e33a198e2`，VSIX SHA256 `2fa2ecb3e0d890d47653ee8b7f5ffe29317c22d692659ae4cd8d34336a6989e5`；一次安装exit0含DEP0169，Latest仍483。旧时未重载状态以随后518实机记录为准；J01和CLI错绑仍未解决。
