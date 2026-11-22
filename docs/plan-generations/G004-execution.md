# G004 执行登记

519 候选包完成：本次唯一 package exit0，341/341、13/13 门禁通过，所有子树 confirmed、最大并行1、按需未跑0，输入与结束指纹均 `02a04b0a7ed920361e852dea0e41d4740114b1cefbb1aabb8ab2c4bd71f5560f`，锁已释放；原始日志 `C:/Users/ZLK/AppData/Local/Temp/g004-519-package-ff08.log`，回执 `simple_cluster/reports/test-workflow/2026-11-22T06-35-19-310Z-69208-package/run.json`。新 dist 的项目识别内存消费者、Panel 模块及实际生成的3段脚本 VM 均 exit0，src/dist 的 10890 零命中；实际 VSIX 325 项面板清单、326 项本地闭包和373项运行文件逐字节通过，376文件内容策略及 README 通过。VSIX 为 2,988,831 字节，SHA256 `525e235fe7e380bf3684edf5b8bfd3dd7620badefd964dcdcd671b14c0216b33`；正式发布、安装和重载后实机状态以随后实际结果为准。预检读取时一次误写面板测试路径 exit1，后按实际路径读取，不影响产品或测试。

519 交付前准备：实核远端无 `v0.5.519` tag，GitHub Release 查询 404/exit1（不存在）；package、lock 两处及 runtime 均同步 0.5.519，`write-agent-runtime` exit0。反向消费者预检发现 actionLifecycle 的 state API 抽取夹具缺新识别事实读取依赖，仅接入真实模块和本机假根，原定向断言 1/1 exit0，日志 `C:/Users/ZLK/AppData/Local/Temp/g004-persistence-state-fixture-ff08.log`。package dry-run exit0：341 作业均独占、旧候选20组均因 runner-or-manifest-change 恢复、按需0、max1；新项目识别单文件的3/3另按已记录定向证据保留。查询 lock 版本时 PowerShell `ConvertFrom-Json` 未加 `-AsHashTable` 对空键报错，后以 UTF8 原文核实；一次 `rg` 的 Windows 通配路径格式无效，均非产品失败。

项目识别记忆：当前 profile 的 globalState 按单一规范项目根保存引导完成与提示事实；启动时迁移当前单根旧 workspaceState，旧值保留并标记其归属根，目标已存在包括显式 reset 时不被旧值复活；本窗口切换项目后不借用原旧值。原成功入口及 state.get/list/set/reset、首次提示和面板共用该值，false/reset 抑制旧状态及派生完成；无根/多根不借第一目录保存，授权/连接不搬迁。显式写等待本窗口启动迁移结束，迁移失败不清旧值可重试；不同根/profile隔离。真实源码加合成 Memento/真实 API、提示及面板消费者，新增单文件首次 0/2 exit1（目标模块尚未实现），修后 3/3 exit0，补规范根、启动期间显式写及不同根隔离后最终 3/3 exit0；`firstRunSetupPrompt` 1/1、受影响 bootstrap/migration 10/10 exit0。日志 `C:/Users/ZLK/AppData/Local/Temp/g004-518-onboarding-before-ff08.log`、`g004-518-onboarding-isolation-ff08.log`、`g004-518-onboarding-prompt-final-ff08.log`、`g004-518-onboarding-bootstrap-final-ff08.log`（后三者同目录）。未修改真实工作区标记或重载，源码未构建安装。

项目明确清除状态修复：离线包/布局项目文件为 null 或 cleared 时，旧 workspace 残留值不会再次迁入；缺文件仍可迁移，已有有效项目值优先，坏 JSON/EACCES 保留旧值并报告，旧键清除失败后重试也不复活。真实读取及迁移方法配合内存存储首 9/10 exit1、修后 10/10 exit0，补已有值优先后 10/10 exit0；日志 `C:/Users/ZLK/AppData/Local/Temp/g004-518-cleared-before-ff08.log`、`C:/Users/ZLK/AppData/Local/Temp/g004-518-cleared-after-ff08.log`、`C:/Users/ZLK/AppData/Local/Temp/g004-518-cleared-final-ff08.log`。未清除真实数据，尚未构建或安装。

518 重载后实际单项目验收（当前部分通过，待总控复核）：live discovery/health/status 证明 Host PID 76852、版本 0.5.518、唯一专用根 `C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f`、offline_import、低流量 enabled/effective；本人统一项目 grant 已真实存在，5类权限、无 Worker 授权快照。此窗口属于默认 profile，当前配置5台/启用1台，不能当作旧零 Worker 隔离 profile；未执行服务器、健康、隧道、任务、Agent 或共享设置操作。原进口状态启动时已恢复，但不同 profile 不能作为升级清空配置的证据。

U54 两个公开 `invoke` 成功返回，selectPlan 选既有合成 PLAN 后恢复 `experiments/plans/ui_u01_empty_515.yaml`，selectExperiment 选/取消合成任务；实际 state 与 `simple_cluster/ui/plan_selection.json`、`task_selection.json` 读回一致。U55 真实 MCP `configuration_get/set` 将项目 `simpleExperiment.resultCsvDir` 临时设为 `experiments/results/synthetic`，state 与 `.vscode/settings.json` 读回后恢复 `experiments/results`；授权生效不代表已调用全部权限。`result_parse` 和 `metric_leaderboard` 经当前 live catalog、mcp.call 读取已有合成 CSV，分别返回两行/两组，保留 DSC=0、accuracy=0、带逗号标识和空值；没有连接 Worker。主动 results.list/result_export 会触发启用 Worker，依本轮边界未测；原本地 UI 导出及受控消费者旧证按原范围保留。

U56 先核实时流已断开、本机 distributedPlans 空，直接调用链的在线同步、可用性推送和结果重试均无本轮 Worker 请求；通过公开 `invoke offline` 打开实际文件选择框，选择新建并保留的合成包 `g004_0518_offline_preview_zero_ff08.json`，返回 exit0。实际面板显示 2/2、该文件来源、中文及引号、空 seed 和 AP=0，标明未核实且不作为完成证据；未制造旧主动查询错误，不能声称其错误分支已重新实测。随后同入口选择原 `offline-fixture.json` 恢复内容并显示 2/2，返回 exit0；重导使导入时间更新，不声称字节级原状态恢复。首次不可访问的离屏元素、文件框控件索引和一次坐标校验失败均未执行输入；经重新观察后完成。517 已有效的 PLAN 生成/取消、空矩阵/0、结果表和日志证据复用，不冒充本轮重测。

持久化身份核对：项目选择/离线包/布局在项目 `simple_cluster/ui`，项目结果目录在 `.vscode/settings.json`；共享连接在当前 VS Code profile 的 globalState，项目授权及引导标记在当前 profile 的 workspaceState，均非扩展安装目录或运行 PID/token。当前验收根实际没有 `experiments/simple_project.yaml`，且本 profile 引导完成标记为 false，故显示“项目配置待识别”；缺文件与换 profile 可解释本次画面，不能证明用户其他项目升级后未丢配置，也不能将其他 profile 数据复制或自动标为已识别。项目识别完成标记只在 workspaceState、已有 adapter 文件才参与本地识别；同根不同 workspace 载入与升级丢失的用户原现场尚未复现，应由总控审定其恢复方案。518 实机不含本轮源码持久化返修，单项目仍未最终通过，4跨项目与89延期未开放。

518 项目本地状态返修：PLAN/任务选择、离线包和布局读取原来把损坏或拒绝访问当作不存在，旧状态迁移可能覆盖原文件并清除旧值；现区分文件不存在与读取/格式错误，错误带路径上报并阻止迁移和覆盖，修复文件后可重试。离线导入/清除保存失败不清旧值，恢复当前包并传播错误。真实源码/内存存储单文件回归首轮 7/8 exit1，增加失败恢复后 9/9 exit0，补充格式及 EACCES/ENOENT 后 9/9 exit0；日志分别为 `C:/Users/ZLK/AppData/Local/Temp/g004-518-state-read-before-ff08.log`、`C:/Users/ZLK/AppData/Local/Temp/g004-518-state-read-after-ff08.log`、`C:/Users/ZLK/AppData/Local/Temp/g004-518-state-read-final-ff08.log`。未修改真实项目旧文件或执行真实恢复，修复尚未构建或安装。

518 持久化返修：共享连接迁移或保存失败后，原 Promise 队列一直保持拒绝，后续显式保存无法重试；现在前次失败仍向原调用者报告，下一次保存可重新写入，旧迁移值保留。真实源码的内存存储回归覆盖迁移失败及普通保存失败、重试与重新构造消费者读回；定向单文件首轮 0/1 exit1、修后 1/1 exit0，日志 `C:/Users/ZLK/AppData/Local/Temp/g004-518-shared-retry-before-ff08.log`、`C:/Users/ZLK/AppData/Local/Temp/g004-518-shared-retry-after-ff08.log`。先前嵌套 PowerShell 命令因变量被外层展开产生解析错误 exit1，未启动测试；未修改真实共享连接，修复尚未构建或安装。

0.5.518 最终交付：源码与生成物 `20ae86ed32f0baa9106645decb60cf9a299f3518` 已 FF 同步，远端 tag 同提交；[试行 Release](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.518) 为 prerelease，VSIX 2987002 字节、SHA256 `703d5ae27781921294ff5eeb0bb7355ec7db8581390b73549420a564045e5624`，隔离下载包与精确同名 sha 一致。真实更新客户端确认普通 Latest 仍为 0.5.483、518 与 SFTP 0.2.120 不降级。`npm run install:latest` 一次 exit0，带 DEP0169 warning；磁盘为 518/SFTP 0.2.120，稳定入口存在。此前待裁决及未发行状态已由本段取代，原失败保留。该段交付时尚待重载；其后实际 Host 与本人授权以顶部 518 验收段为准。

0.5.518 第二次 package exit0，341/341、13 gates、并发1、锁释放，receipt `simple_cluster/reports/test-workflow/2026-11-22T03-36-44-479Z-33768-package/run.json`；VSIX 2987002字节 SHA256 `703d5ae27781921294ff5eeb0bb7355ec7db8581390b73549420a564045e5624`。真实 Panel 模块及2个生成脚本 VM、实际 VSIX 内容策略验证均 exit0；运行闭包核验进程自然结束但工具丢失输出及退出码，状态未知。总控批准等价实际 ZIP 核验：325闭包、324面板文件均存在，371运行文件与构建输出逐字节摘要一致，身份/version/engine正确，exit0；原未知不覆盖。

518 精确 `git add` exit1 提示 dist 被忽略；回读状态确认指定13个已跟踪生成文件及8个非生成文件均实际暂存，未强制添加或触碰未跟踪项。

0.5.518 首次 package exit1：341 项中339通过、2失败，前10门禁通过，maxParallel/maxObserved=1、锁已释放，未进入 post/assemble；完整 `simple_cluster/reports/test-workflow/2026-11-22T03-16-49-272Z-80576-package/run.json`。mcpProject 41/43：旧授权夹具与当前 Worker 共用可变对象，无法模拟历史快照；改用副本后实际新 dist 43/43 exit0（`C:/Users/ZLK/AppData/Local/Temp/g004-518-mcp-project-after-ff08.log`）。serverQuotaPersistence 9/10：源码抽取夹具缺 `mcpInvocation`，接入真实模块后10/10 exit0（`C:/Users/ZLK/AppData/Local/Temp/g004-518-worker-quota-after-ff08.log`）。两项仅改测试夹具，首失败日志见该 run 的 job 日志；待总控裁决组装/重跑，未发行、安装或修改真实权限/Worker。

U54–U56 517实机及源修完整原始记录见 Git `eab27339:docs/plan-generations/G004-execution.md`：U54原517调用失败，源回归42/43→43/43；U55旧窄方案43/44→44/44，按本人新裁决替换后45/45两轮；U56原离线摘要不可见，预览8/8，坏行首次7/8 exit1、修后8/8，补别名8/8。517本地PLAN/向导/结果拆表/取消及MCP解析旧证、隔离profile启用0和全部日志均保留原记录；518当前重测以本登记顶部为准。`node scripts/test-workflow.js --help` exit1为不支持该选项；CLI默认绑定不符exit2未重放。
U04排查阶段基线HEAD及origin/master为b7c0b42c27227a8ec49d42d1f21346900a274ae4，开始时tracked clean；计划由总控独占。legacy、辅助页和MCP入口证据见coverage.g004U04RemainingInventory；旧静态脚本不能代表完整母集。factory实际输出缺四项门禁并回退legacy；恢复页VM消息5/5 exit0，未实际重载或写剪贴板。当时按钮总数及剩余未知，排查阶段未改产品、构建、安装或访问服务器；后续三批源码包见1ff64a81及下文。旧执行聊天已归档。

版本审核13/13、缓存及同步页4/4和3/3 exit0；U04-01首夹具失败、U04-02跨项目延期，完整细节见4a80c627及coverage；无真实删除。

本登记上限12000字符、90%时语义归并；原完整逐项记录保留于 Git 10c0689e:docs/plan-generations/G004-execution.md，U04中途记录另见4a80c627同路径，项目计划与代次索引为总控独占。执行范围为本人日常单机最多两个项目，不做多项目压力、无入口参数突变或新锁队列；保护真实Worker、训练、消费项目、共享配置、原窗口、未保存文档及全部夹具。源码、旧dist、已安装版本及远端效果分开记录。

既有G004、U01–U02细节及首次失败保留于 Git `10c0689e:docs/plan-generations/G004-execution.md`，U03及0.5.516记录保留于 `b7c0b42c:docs/plan-generations/G004-execution.md` 和 G004-plan；不把历史测试、修复数当当前按钮分母。原12项受控验证中，A组先0/3含缺VS Code夹具，修后原范围仍0/3、修逻辑后3/3、排除无入口内部参数突变后4/4；日志、空seed/cases及配置reset首次失败后修复。MCP43/43、experimentPlatform旧断言修正后15/15；build先被并发中止exit1，后夹具6/7失败、修后7/7，最终回执 `simple_cluster/reports/test-workflow/2026-11-21T04-18-18-128Z-69044-build/run.json` 为285任务/10门禁通过、并发1，6项按需未运行。唯一旧锁文件经本人精确授权删除，未扩大清理。

0.5.514/515安装、发行及实际失败见10c0689e与G004-plan，Latest仍0.5.483。

U01/U02/U03分别2/8/10项已修；U03末轮42/42 exit0。J01宿主缺GIT_CONFIG_VALUE_0/5且传递未知；simpleex --version绑定不符exit2。完整记录见b7c0b42c及计划。

0.5.516 package首轮340/341 exit1，断言修后22/22及341/341 exit0；安装一次、未获用户Reload确认，证据见计划及b7c0b42c。
U04逐项调查、原始退出码与受控证据保留于 Git f72d0066 的本登记及 coverage.g004U04RemainingInventory。确认43项：单项目39、跨项目02/05/06/07延期4；20、33–36、40–44撤回并保留编号与证据。安全拦截后未重放专项；没有真实Worker、任务、文件删除或窗口操作。

关键失败保留：日志导航目标文件12/13 exit1（夹具缺setNativeTitle），另行VM补测3/3 exit0（首次夹具缺nativeTitleMutationVersion exit1）；U04-03首次假错误类型不符exit1后修正；U04-10完整对象比较因时间戳不同exit1，业务字段比较exit0；CLI --version API_WORKSPACE_MISMATCH exit2。U04-51的yaml及js-yaml模块均缺失各exit1；其他夹具和整理脚本首次失败见原记录及coverage。原失败不被后续通过覆盖。
最终逻辑母集300项：界面279（限定结论204、延期75），独立VSCode命令21（限定结论7、延期14）；合计限定结论211、剩余89均延期。GPU两合成行合并/打散及假持久化、TMUX三种合成导航和all筛选、端点清单假编辑器正常/错误均exit0；真实Worker、剪贴板、网络未测。资源导航6精确/2回退exit0，首次探针语法错误exit1未写。13项旧工具证据适用边界及全部映射见coverage.logicalActionCensus，实际控件实例数未知。

B1/B2/B3 39项分组修复、各项受控结果和首失败详见 Git `c37827c8:docs/plan-generations/G004-execution.md`，不将受控结果扩称真实Worker通过；U04-30特殊键、日志导航首12/13及后13/13证据见 `eab27339` 同路径。4跨项目与89入口未开放。
0.5.517首轮package exit1，337/341作业通过、4失败，10前置门禁通过，输入与结束指纹一致，锁已释放；未执行post/assemble。完整日志及receipt见`simple_cluster/reports/test-workflow/2026-11-21T14-48-56-521Z-480-package/run.json`。合作取消因执行会话stdin已关闭失败，原runner自然结算。四处仅修现有测试断言/夹具：MCP 42/43→43/43，CLI 18/19→19/19，历史取消12/13→13/13，Agent夹具9/10→首补后9/10（VM跨realm对象原型比较差异）→标准库克隆归一后10/10；均保留真实退出码及业务断言。未改产品源码、依赖或运行配置；原337项证据与补测分别记录，runner不接受失败receipt或改变后的输入直接组装，待总控决定门禁。

总控授权后第二次package exit0，341/341、13门禁通过，实际并发1、按需0、锁释放，输入与结束指纹相同；receipt `simple_cluster/reports/test-workflow/2026-11-21T15-08-06-325Z-28880-package/run.json`。生成0.5.517 VSIX大小2986729、SHA256 `2fa2ecb3e0d890d47653ee8b7f5ffe29317c22d692659ae4cd8d34336a6989e5`；身份simple-local.simple-experiment，universal包由更新客户端识别为Windows兼容，engine ^1.100.0；ZIP中370项dist/bin/vendor与本机相同，禁止项路径检查无命中。Panel模块及3个生成脚本VM通过；首个VM命令转义错误exit1后修正exit0；业务src/dist搜索10890无命中（rg exit1）。日志导航不在本次package矩阵，另对新dist定向13/13 exit0；首轮12/13及旧dist补测保留。上述打包核验时发行安装尚未完成，最终状态如下。

0.5.517试行发行与安装完成，总控最终一致性核验通过：[试行Release](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.517) 为prerelease，远端tag绑定源码及生成物提交 `a7d2a7275c5d9ea455c2e369cdddaa8e33a198e2`，非最新权威版。隔离下载包2986729字节、SHA256与上列包及同名sha一致。实际更新客户端确认0.5.482可见0.5.483，0.5.517及SFTP 0.2.120均不降级；Latest仍0.5.483。`npm run install:latest` 一次exit0并输出DEP0169 warning；磁盘已装SimpleExperiment 0.5.517、SFTP 0.2.120，simpleex及simpleex-mcp稳定入口存在。用户尚未Reload，当前Extension Host版本未知；CLI默认绑定不符exit2及J01宿主环境缺项仍未解决，真实界面、Worker及外部效果未测。
