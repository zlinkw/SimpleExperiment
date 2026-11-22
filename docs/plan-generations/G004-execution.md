# G004 执行登记

519重载：专用根默认profile实测519 PID29888，离线、低流量、5配置/1启用、PLAN、任务选择、结果目录、离线包和授权保持；识别原值与现值均未完成。默认发现曾指向稿件且未调用；宽CSV无预设解析为空、指定预设改写AP及macro_f1，详见coverage。流程读错可能覆盖，合成存储原1/2 exit1，`C:/Users/ZLK/AppData/Local/Temp/g004-519-flow-real-workflow-ff08.log`，无真实损失。R519 A1仅读缺失为默认，其他读错阻止初始化及覆盖，进度保存失败提示此前操作可能已执行；合成存储11/11 exit0，日志同目录 `g004-r519-a1-project-state-ff08.log`。其他证据见coverage.g004U04RemainingInventory.g004Reload519LocalAudit。

布局并行清旧键可能丢值，内存存储首0/2 exit1，日志同上目录 `g004-519-layout-legacy-failure-ff08.log`，无真实损失证据。R519 A2改为成功保存且根匹配后清旧键；项目状态13/13、布局3/3、上下文20/20均exit0，日志同目录 `g004-r519-a2-project-state-ff08.log`、`g004-r519-a2-layout-ff08.log`、`g004-r519-a2-context-ff08.log`。拓扑确认/取消/写失败假对象3/3 exit0，未动真实设置或服务器。

519宽CSV的AP与AUPRC、macro/micro/weighted F1合并，两次各0/1 exit1，同目录 `g004-519-metric-identity-ff08.log`、`g004-519-metric-collision-ff08.log`。R519 A4保留语义及显式别名；宽/长CSV、JSON、预览、schema、分割、0/空值单文件最终6/6 exit0，同目录 `g004-r519-a4-metric-final-ff08.log`。选择及PLAN持久化证据见coverage，未写真实项目文件。

R519 A5按输入列选择默认长宽预设，JSON、显式预设和自定义预设保留；真实源码配合成数据的解析器/工厂/CLI单文件8/8，MCP目录消费者8/8，均exit0，日志同目录 `g004-r519-a5-parser-final-ff08.log`、`g004-r519-a5-mcp-ff08.log`，未调用真实Worker。

R519 A6历史结果两份索引、目录和文件的读错/坏JSON反馈路径及原因，缺失仍允许；内存fs联验读取消费者1/1 exit0，同目录 `g004-r519-a6-history-final-ff08.log`，未调用真实Worker。

R519 B2选择API等待持久化、失败可见并拒绝跨项目成功回执；PLAN已写入后的状态失败明确提示。真实入口配内存替身：动作46/46、迁移13/13、上下文20/20 exit0，日志同目录 `g004-r519-b2-actions-complete-ff08.log`、`g004-r519-b2-migration-ff08.log`、`g004-r519-b2-context-ff08.log`。动作首44/45 exit1因A5源码抽取夹具缺`selectResultPreset`，已补真实依赖，`g004-r519-b2-actions-first-ff08.log`。

用户反复识别未完成并提供截图；519同窗请求与识别租约冲突，不能认定锁死。本地识别原不记完成，假确认和PLAN首0/1 exit1，同目录 `g004-519-bootstrap-recognition-ff08.log`。R519 B1确认有效PLAN并保存单根识别、立即投影，准备独立、不探Worker。空任务/取消/读写错/缺根与多根2/2、快速流程9/9、上下文20/20、命令3/3、持久化3/3、投影6/6均exit0；日志同目录 `g004-r519-b1-` 前缀加 `recognition`、`quick-first`、`context`、`command`、`persistence`、`projection` 后接 `-ff08.log`。未重放点击、清锁或改真实标记。

519本机历史CLI合成列表、详情及CSV导出通过；精确ID经cmd传递失败。Git hook读拒绝及不完整标记可能损伤原脚本，原受控失败与invoke错路由见coverage；R519 A3仅缺失视为空，读错及标记不完整均保留原文件，源码配假fs及启动消费者3/3 exit0，日志同上目录 `g004-r519-a3-git-hook-ff08.log`。300/137/45/167母集重叠，不相加。

519发行：源码/tag `6932321534f3b0c2df3b1983bfede2f88f7b868f`，[试行Release](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.519)与隔离下载同SHA，Latest483。ReleaseClient首验误期待SFTP Latest120（实际118）exit1，修后exit0：482见483、519及已装SFTP120均不降级，120试行资产存在；同目录 `g004-519-client-after-ff08.log`。唯一install:latest exit0含DEP0169，磁盘/列表519、SFTP120及稳定入口已核，同目录 `g004-519-install-ff08.log`。重载后实机以顶部为准。

519唯一package exit0，341/341、13门禁、进程树结束、并行峰1、按需0及锁释放；输入=end `02a04b0a7ed920361e852dea0e41d4740114b1cefbb1aabb8ab2c4bd71f5560f`，日志同目录 `g004-519-package-ff08.log`，回执 `simple_cluster/reports/test-workflow/2026-11-22T06-35-19-310Z-69208-package/run.json`。新dist识别内存消费者、Panel和3段生成脚本VM exit0、10890零命中；VSIX面板325/闭包326/同源373项及376文件内容策略、README通过。包2,988,831字节，SHA256 `525e235fe7e380bf3684edf5b8bfd3dd7620badefd964dcdcd671b14c0216b33`；发行及实机状态以顶部为准。预检一次误写面板测试路径exit1，后按实际路径读取。

519 交付前准备：实核远端无 `v0.5.519` tag，GitHub Release 查询 404/exit1（不存在）；package、lock 两处及 runtime 均同步 0.5.519，`write-agent-runtime` exit0。反向消费者预检发现 actionLifecycle 的 state API 抽取夹具缺新识别事实读取依赖，仅接入真实模块和本机假根，原定向断言 1/1 exit0，日志 `C:/Users/ZLK/AppData/Local/Temp/g004-persistence-state-fixture-ff08.log`。package dry-run exit0：341 作业均独占、旧候选20组均因 runner-or-manifest-change 恢复、按需0、max1；新项目识别单文件的3/3另按已记录定向证据保留。查询 lock 版本时 PowerShell `ConvertFrom-Json` 未加 `-AsHashTable` 对空键报错，后以 UTF8 原文核实；一次 `rg` 的 Windows 通配路径格式无效，均非产品失败。

项目识别记忆：当前 profile 的 globalState 按单一规范项目根保存引导完成与提示事实；启动时迁移当前单根旧 workspaceState，旧值保留并标记其归属根，目标已存在包括显式 reset 时不被旧值复活；本窗口切换项目后不借用原旧值。原成功入口及 state.get/list/set/reset、首次提示和面板共用该值，false/reset 抑制旧状态及派生完成；无根/多根不借第一目录保存，授权/连接不搬迁。显式写等待本窗口启动迁移结束，迁移失败不清旧值可重试；不同根/profile隔离。真实源码加合成 Memento/真实 API、提示及面板消费者，新增单文件首次 0/2 exit1（目标模块尚未实现），修后 3/3 exit0，补规范根、启动期间显式写及不同根隔离后最终 3/3 exit0；`firstRunSetupPrompt` 1/1、受影响 bootstrap/migration 10/10 exit0。日志 `C:/Users/ZLK/AppData/Local/Temp/g004-518-onboarding-before-ff08.log`、`g004-518-onboarding-isolation-ff08.log`、`g004-518-onboarding-prompt-final-ff08.log`、`g004-518-onboarding-bootstrap-final-ff08.log`（后三者同目录）。未修改真实工作区标记或重载，源码未构建安装。

项目明确清除状态修复：离线包/布局项目文件为 null 或 cleared 时，旧 workspace 残留值不会再次迁入；缺文件仍可迁移，已有有效项目值优先，坏 JSON/EACCES 保留旧值并报告，旧键清除失败后重试也不复活。真实读取及迁移方法配合内存存储首 9/10 exit1、修后 10/10 exit0，补已有值优先后 10/10 exit0；日志 `C:/Users/ZLK/AppData/Local/Temp/g004-518-cleared-before-ff08.log`、`C:/Users/ZLK/AppData/Local/Temp/g004-518-cleared-after-ff08.log`、`C:/Users/ZLK/AppData/Local/Temp/g004-518-cleared-final-ff08.log`。未清除真实数据，尚未构建或安装。

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
