# G004 重要功能、按钮与MCP深查

## 当前目标：统一完成单项目返修及CLI退役，仅保留UI/MCP

2026-11-22用户确认519已重载、未重配重授；要求复用已查证据，一次查清单项目全部按钮/功能/MCP，尤其配置和工作区识别保留、识别流程及资源冲突，不逐项停下来或发版，单项目正常后再处理延期项。本轮仍属G004验收返修，一个完整业务批次，内部按≤3强相关问题、≤8非生成源/测试/文档文件逐组验证和scoped FF提交；不是一个巨型提交，也不重开原已完成的39项三批。

519运行/tag基线6932321534f3b0c2df3b1983bfede2f88f7b868f；R519/T1–T7源码包源审对照59041060，后补依赖索引a202db2a已FF同步。尚无本轮build/dist/递版/package/发行/安装；B1生产和测试两文件为未验dirty候选，后续源审返修由唯一执行者继续。总控已定向审识别/租约/持久化/选择/结果解析/反馈/配置/路由/Git/CLI真实源码及证据边界，批准下列统一修复，不开放真实服务器或跨项目验证。原不改产品的调查期门槛由本节源审决定取代；最终源码包复审前不build/dist/递版/package/发行/安装。

## 519实机与完整调查的限定结论

专用根C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f，默认profile活Host519 PID29888，经health/capabilities/status/state核实。用户未重新配置授权，518有升级前基线的offline_import、低流量enabled/effective、5配置/1启用Worker、五类统一项目grant且无workers字段、原PLAN experiments/plans/ui_u01_empty_515.yaml、空任务选择、resultCsvDir=experiments/results、原offline-fixture两行均读回。先前默认发现519属于稿件窗，未调用该实例；早先无专用Host的阻塞已由用户打开正确窗口解决。PID仅当时证据，后续必须发现当前真实身份。

原引导完成事实false、519仍false，当前合成根一直无experiments/simple_project.yaml，不冒称true跨升级保留；同根/profile事实true/false/reset的消费者恢复沿用519真实源+内存Memento 3/3，不能当真实原true重载通过。用户反复识别仍未识别的报告及截图是本轮新缺陷证据，与false保留不矛盾，不让用户反复点击或先手工改标记求绿。

识别资源冲突：四次bootstrapProject RESOURCE_CONFLICT只证明其时同PID/根的首操作持有资源且心跳有更新，离线operations空集不等解锁；08:39注册快照无该条目也不能证明首次流程完成。真实withHostOperationLease及bootstrap方法+假租约/对话核独立重复点击冲突、取消/异常/正常结束释放，2/2及1/1 exit0；519 package实际ResourceOperationLease 14/14含独立冲突、嵌套重入、心跳/释放可复用。未观察真实首操作停在哪个对话，无死锁证据，不重放点击、不清锁、不重载、不改锁机制。明确提示/本地识别终点修复后再看用户发起流程的实际行为，不将当前未知冒已查实。

完整证据唯一入口为coverage.g004U04RemainingInventory.g004Reload519LocalAudit，执行摘要G004-execution.md。300原逻辑ID保留，互斥处置206旧证按条件复用、11入口关联当前问题、14仅跨项目未开、26本地部分证据/真实效果受限、17本轮本地证据/真实效果受限、1 Agent生命周期受限、25清理覆盖受限。它们不是通过数，11不是缺陷根因数；206含外部动作的旧限定结论。按执行边界132本地或混合、79外部/安全/共享设置受限、14跨项目、75旧延期中的外部/清理/生命周期；300是有限逻辑单位，动态控件实例总数未知。

89旧延期逐ID拆为14跨项目、27本地部分旧/新证、22本地补验/复用、1 Agent受限、25清理覆盖受限。137 MCP唯一名另分33本地或混合、49本地网关/真实Worker受限、23清理/Agent受限、32伴随SFTP下游受限；33也含缺陷，不是通过数。45命令=42贡献+3 legacy额外，当前action_catalog167名另有同源码invoke路由索引，均与300/137重叠不相加。目录、schema存在、源码定位或引用旧结论不代表真实执行；保留逐项producer/条件/消费者/旧证引用，最终修后按受影响入口更新，不重置旧137或211有效证据。

519纯本机history CLI已核稳定launcher不发现API/查Worker，专用根保留新合成CSV及导出CSV。真实list/show、metric list/show、compare、experiment results、CSV export均exit0，history/current=false、seed0/accuracy0、中文逗号/CSV引号正确；精确ID含竖线经PowerShell→simpleex.cmd失败exit255，同ID经同Node launcher成功、唯一实验名经cmd成功。新文件全部保留。MCP result_list/result_export等无history选项，主动results.list会查启用Worker，未测，不能用CLI替代其远端通过。

## 统一修复决定与内部组 R519

以下顺序连续执行，全部已在用户原完整修复授权内。每组≤3强相关问题、≤8非生成文件；表中路径为受影响区域而非无差别改文件许可。若必要消费者使文件数超限，在同业务批次内拆机械子组，记录依赖，不扩新业务。每组复用已有效证据，只新增/修正针对本组实际缺陷的必要正确性回归；不要为出报告重跑旧套件、增性能或新安全专项。源码抽取/VM必须接真实依赖，夹具首失败和产品首失败分别保留。

| 组 | 统一修改与验收终点 |
| --- | --- |
| A1 流程状态完整性 | legacy的readProjectFlowState区分ENOENT与坏JSON/真实读错，bootstrap关键读取不吞成默认；写入前按现有项目状态模式校验当前文件，失败保留原数据且显式修复后可重试。flow.update与实际持久化队列须联验，不只测孤立读函数；原正常旧格式/缺文件默认语义保留。apiAdvanceFlow捕获不能无提示，但其调用方若已完成真实准备，必须准确报告流程事实保存失败，不能诱使重放已完成远端操作。只用假存储/消费者，不造真实异常。 |
| A2 布局迁移顺序 | saveUiLayoutFromUi/resetUiLayoutFromUi先成功保存目标项目布局并核当前上下文，才清旧workspace布局/动作键；项目保存失败保留旧值、错误可见、后续显式保存可重试。全局布局正常保存及默认/明确清除语义不变，不以新文件写成功前的Promise.all清旧。 |
| A3 Git hook保留 | GitBackup.readHookFile仅ENOENT空，其余读错可见且安装/卸载/检查不写原hook；stripHookBlock在无法确认完整插件标记段时拒绝并保留未知尾部，正常完整标记仅改原插件段、保留用户逻辑。核自动安装入口如何呈现错误、写失败及显式重试。真实hook/remote不动，内存fs足够，不新增完整文件删除。 |
| A4 指标身份 | Results.legacy内置aliases及canonicalMetricName不得将AP与AUPRC、F1与macro/micro/weighted及其他不同统计语义合并/覆盖；保留合法同义拼写、split、0/空及显式用户metricAliases的既有有意映射。宽/长CSV及JSON实际消费者、相邻preview/CLI输出核身份和值；复用distributedProjectContract/metricAliasRebuild的既定语义，不能只改单个演示列或静默改排行/方向。用户显式映射和默认猜测区分，不新增科研指标审查。 |
| A5 默认解析选择 | 无preset的公开result_parse及本地预览/历史文件读取不能固定首个long导致合法宽表空成功；复用实际CSV读取器和现有长/宽/JSON支持，按可判定输入选择合适现有预设。显式preset/自定义预设及未知preset错误保留；不识别或不满足显式契约时给明确错误/现有warnings，不伪造行或静默空成功。修全部必要facade/factory/CLI/preview调用，合法空表与0仍有效，不用文件名猜测覆盖明确列契约。 |
| A6 历史读取错误 | CLI result历史目录/CSV/JSON读错、两个registry坏JSON/EACCES不能当缺失或空成功；ENOENT仍允许，明确错误或现有可表达的不完整反馈保留原因/路径。只改历史结果实际消费者，不能因共享readJsonFile问题无审核地改变artifact/plan等无关fallback；若必须改共享契约，逐受影响消费者核实并补必要回归。复用正常history实机证据，不查Worker。 |
| B1 本地识别及取消 | bootstrapProjectFromUi在本人于精确单根完成有效本地识别/PLAN选择及既有必要确认后，保存同根完成事实并立即投影已识别，正常结束本地识别阶段；后续输出/服务器/Agent/运行准备作为独立状态和用户选择保留，不能要求上传/启动/恢复在线才记本地完成。无根/多根/读取失败/取消/无有效选择不标成功；合法空任务PLAN不得仅因jobCount0判未识别。明确取消用现有cancelled契约，查看现有等导航不冒取消/成功。API state、首次提示、面板同源，false/reset可重新识别成功，不自动生成adapter。MCP project_bootstrap保留原确认后的集成准备能力和额外权限，说明其实际可能启动/准备而非冒纯本地；不擅自改变该公开流程为新local模式或处理U07跨项目竞态。 |
| B2 选择持久化回执 | selectPlan/selectExperiment和handleMessageCore/invoke及必要本地调用方真正等待保存，公开API成功回包只在持久化完成后返回；失败保留面板错误且反馈调用方，不丢Promise。两选择在COMMANDS_WITHOUT_UI_STATUS，原直接套withUiCommandStatus的selectExperiment按钮completed断言不可达，已撤回且原日志保留；不为此新增状态包装或修改正常面板交互。savePlan及同链向导/归档清选择/元数据刷新不静默吞选择保存失败；已成功保存PLAN文件要准确说明文件成功、选择未保存，不回滚/重复写文件来求一致。保留原选择投影/Watcher/合法0/取消及已有项目上下文保护，必要后台调用有可见失败处理。 |
| B3 刷新与恢复反馈 | manualGpu/Scheduler/TracesSnapshot、已保存restart/resumeStream/resumeNetwork条件动作的未执行/离线/失败反馈与实际一致；resumeNetwork分支必须等待异步清离线/恢复结果。ensureRealtimeConnected仍保留后台容错/lastError，但用户主动恢复失败要能向原UI动作返回失败。联验真实withUiCommandStatus/handler/方法，保留后台调用不产生未处理异常、真实错误及现有离线失败回滚；不自动重连、不增加轮询或重试。trace离线无提示合入同根因，不重复计问题。 |
| B4 调试包反馈 | downloadDebugBundle缺包、保存取消、下载/复制失败不能只记错误后completed；经现有状态包装器反馈准确，成功保持原安全暂存/归属/复制路径。只用假UI/文件/transport，不实际下载、清理或访问Worker。 |
| C1 公开invoke完整路由 | 14项本地handler而无远端actionMap：downloadDebugBundle/openAuditTail/publishGithub/syncGithub/overwriteGithub/uploadProjectToWorkers/distributeCodeToWorkers/deployLatestAgent/configureDownloadScope/configureCodeSyncIncludes/configureServerSyncScope/clearLegacyTasks/clearOperations/abortScheduler，须可到各自原本地消费者，不再误入未知远端map。保留API_EXECUTABLE allowlist、确认/权限、业务版本门禁、对应项目资源租约和withSafeTransferRetry；不能简单直调Core绕过原保护，远端map仍走原路径。54两选择及更新专门分支正确保留，Hub明确退役不恢复。14项源集合与替身转接逐项核，代表纯本地成功/错误/取消、危险未确认不进入、远端map仍透传；不实际Git/删除/Agent。 |
| C2 设置公开契约 | configuration_set/reset补齐受支持global范围及真实apiConfigUpdateTarget对应目标，显式global不因resource scope误落WorkspaceFolder；保留projectAdapterRules必须workspaceFolder及敏感键/已声明键限制，不写真实全局设置。worker_configure仅其workerId描述允许已配置disabled目标，其余执行工具仍仅enabled。configuration_get/list读VSCode原始配置是现有契约，不把它直接换成有效共享Worker配置；必要说明与state_value setupConfig/worker_configure返回的有效值区别，当前readback候选不计已确认数据丢失。MCP bootstrap说明实际已确认准备副作用也在本组对齐，无额外真实权限操作。 |
| C3 Git命令Promise | GitBackupSetup三个配置/状态命令及两个GitHub命令注册器返回原异步handler结果，调用者能等待并接收失败，既有用户提示/确认/目标不改。核未决Promise、拒绝/取消及正常转接，不真实Git备份或发布。 |
| C4 旧CLI参数问题停止修复 | 用户最新明确退役全部业务CLI，仅保留UI和MCP；本组不再做ID编码、shell兼容、新EXE或新CLI功能。首exit255与进入shim前已解析的证据保留为退役前事实，不改结果ID/底层科研记录。MCP启动器及当前共享消费者按下一节迁出依赖后保留。 |

表中明确缺陷按各根因处理，14个错路由/多个别名不冒14个独立问题；worker-config-readback仅语义待判不算失败。正常独立重复点击的租约冲突不作锁死修复；当前原首次操作未知及全部真实外部效果保留。每组将实际文件数、根因/入口、首失败、修后真实退出码和scoped提交写execution/coverage，维护一份母集；不用新报告、重复统计器或新编号覆盖已撤回项。

## 分组执行、复审与集中交付

现在开放原唯一Terra产品源码、必要测试/文档、UI/API/CLI本地受限验收、execution/coverage、唯一检查和scoped Git租约，plan/README仍总控。先将本次调查四文档及总控本轮精确计划/索引差异作为独立文档检查点scoped commit/普通FF push/fetch，保存完整原调查证据；再依表连续修全部组。每次提交前核差异、UTF8、相关必要单文件测试，≤8文件；不把生成日志/新旧夹具/未跟踪资产stage。每次成功提交普通push/fetch核HEAD=origin/master；remote前进、认证/hooks失败或租约不明停相关Git升级，不自行rebase/merge/force。

最终完整源码包一次交总控：全部组真实diff/提交、共享变更反向消费者、原测试抽取/VM依赖闭包、必要回归和真实失败、修后各入口状态及仍需真实外部/原生UI的精确边界。不以单文件通过代全交付，不每组索回执；普通发现/计划内返修写登记随全包。仅真正需当前决定的阻塞/重要数据风险升级，并继续其他可做项。产品源修后仍须最终集中build/package及真实生成script校验，本轮不先独立全build再重复package。

本轮先完成源码审核再开放递版/交付。沿build-test-delivery及docs/release-delivery.md：核未用patch/tag、同步package/lock/runtime、稳定输入、dry-run核当前按需矩阵；优先有效复用，runner不能组合时交实际差距裁决，不沿用旧重复全包特批。最终package内build、max-parallel1/cancel-stdin；失败收全部进程/日志/真实exit，锁释放才转下一动作，不伪receipt或改覆盖/超时求绿。Panel修改需编译模块语法及实际生成scripts VM/10890零硬编码门禁。通过后实际VSIX身份/版本/Windows兼容/运行闭包/同源/秘密/README/SHA，FF源同步后精确tag绑定、既有GitHub同字节prerelease=true/latest=false、远端资产/tag/digest/隔离下载/真实客户端；SFTP兼容包复用，不提升权威483/118，不降SFTP120。install:latest各目标版一次，同版跳过、不force/降级，核磁盘/稳定入口后停UI，待本人Reload再验新Host；真实部署仍未授权。

本轮必要真实UI必须遵循silent-ui-screenshot：整个测试宿主/交互/截图都不抢用户桌面焦点/键鼠/剪贴板；目前未证可用hidden/offscreen非激活原生宿主，不能用静态/假DOM冒真实点击，也不能因隔离profile或hidden console就新开可见Electron窗口。先沿用实际用户截图及旧有效实点证据；确需新能力给具体最小方案/限制，不擅加产品capture框架。截图留TEMP/CodexUiCaptures唯一ui-32hex.png，view_image后未获精确删除许可保留。原权限内本地API可用不等已做视觉验收。

## 历史证据和真实失败：按有效范围复用

完整历史压缩前见59041060本计划，执行摘要/原日志仍在现execution及Git 10c0689e、b7c0b42c、f72d0066、c37827c8、eab27339、4bde7f49、89498eff；U01/U02原计划4edd1da5。下述通过均限原输入/消费者，失败不被后续通过覆盖，不整轮重跑。

U01/U02/U03共20修复（2/8/10）交付516，非按钮分母。U04原43=39单项目517已修+02/05/06/07跨项目4延期；撤回20、33–36、40–44共10项。原39分组13/17/9见895038f2同计划/coverage；01/08不重放授权/Agent专项。U44人工映射排除正确，U45仅配置恢复。54选择417634df首42/43→43/43；55统一项目授权bc0cc61c/c37827c8 45/45两轮（早窄修43/44→44/44被取代，旧grant不扩）；56离线预览895038f2 8/8、坏行首7/8→8/8。54–56交518，实机选择/设置/离线导入恢复2/2及517 PLAN/结果/日志旧证沿未变链复用。

519持久化f6c3339f首0/1→1/1；eab27339读错/写前读/导入恢复7/8→9/9并补9/9；19234b6a清除不复活/项目优先9/10→10/10并补10/10；5a3ca8f6同profile规范根完成/提示false/reset，未实现0/2→3/3、提示1/1、迁移10/10。旧无根workspaceState首次迁移来源/owner写前中断歧义仍未知，不跨profile搬权限连接、不拿历史事实冒当前就绪。

519 source/tag6932321534f3b0c2df3b1983bfede2f88f7b868f，https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.519 为prerelease/draft=false/Latest仍483；包2988831字节/SHA525e235fe7e380bf3684edf5b8bfd3dd7620badefd964dcdcd671b14c0216b33，远端与隔离TEMP/g004-519-download-ff08下载一致。唯一package 2026-11-22T06-35-19-310Z-69208-package/run.json 341/341+13gates exit0、输入=结束/并发1/树confirmed/锁释放/按需0，新dist模块+3script VM、326/325/373/376闭包清单及10890零命中。客户端首误SFTP Latest120实际118 exit1，修临时预期后exit0；482见483，519/SFTP120不降级。install:latest一次exit0含DEP0169，磁盘519/SFTP120；文档不改tag，实机见顶部。

518首339/341 exit1，两fixture43/43与10/10，特批第二次341/341+13门禁；独立runtime核验丢exit未知，实际ZIP等价325/324/371通过；git add忽略dist exit1但已跟踪文件stage、未force。517首337/341 exit1、stdin closed取消失败自然结算；4定向43/43、19/19、13/13、10/10（Agent补首9/10跨realm）后特批341/341+13；U30修1da1ffce 5/5；日志原12/13、独立VM3/3及首夹具失败、旧/新dist13/13分别保留。516首340/341→22/22→特批341/341，vsce ls30秒ETIMEDOUT exit1不重跑，actualZIP等价且首./归一假缺保留。514坏60位sha资产、旧并发中止exit1/BUILD_LOCK_UNSETTLED、6/7→7/7、285/10gates/并发1/6按需未跑及用尽旧owner删除许可均保留原材料，不作通用豁免。

J01仍未修：Host GIT_CONFIG_COUNT10/KEY全有/VALUE0和5缺，传递环节未知；默认误项目API/CLI exit2不重试。不sanitize/注入/改全局Git/重启稿件。平台旧systemError cybersecurity risk触发未公开，无Daybreak/扫描/重放或换工具模型聊天绕限；自然接替无关。
## 唯一角色、资源及保护

总控《总控·SimpleExperiment G004 集中查修与交付》01a1fdb5-efe6-78c2-ae6c-861ed4028cdc/local，Sol/high，实际default仅记录，独占plan/README和最终审查。执行《执行·SimpleExperiment G004 集中查修与交付 接续》01a202d5-5126-7e32-954f-3761f4630e53/local，Terra/high，实际default仅记录；已实核match/continue、读原派单与现行资料并承接本轮完整源码修复及上述唯一租约。旧执行01a1ff08在10压缩/第五次后峰300409自然接续，已正式释放全部租约、无在途，旧turn completed；新执行已续做未提交T5并执行旧聊天归档，不删除。旧档位强制default导致暂停已由用户最新规则/统一脚本解除，双方model/effort match/continue，保留用户界面档位，不索文字确认或自动重置。自然接续只按caveman，旧执行01a1fdb5-ce28已合格交接归档，旧总控/更早角色亦归档；不新建审查者。按全局事件协调发送完整包/需决定阻塞/必要交班，消息默认无回执，不轮询/催局部进度；无独立待办总控合法结束本轮，执行有可做工作不能套用空闲。

禁止真实服务器/Worker/SSH/健康版本/准备同步/任务查询派发停止/清理/Agent部署，当前统一grant不是本轮实机外部测试授权；共享Worker配置/授权不改、不自动切模式/重载/新profile、不抢稿件或原VSCode输入。startup公开GitHub更新检查及自然发现注册是先前明确允许例外，不扩大Worker请求。仅专用合成根本地必要操作，真实GPU7所有任务日志产物、/root/autodl-tmp/zlk/MultiModal、原Agent tmux/隧道保护；MM final.md、Generic Untitled-1、Response to Reviewers.tex等未保存稿件不得reload/close/抢输入。D:/GitRepo/SimpleMcpAcceptance只读，cleanup_20261111.txt、所有新旧fixtures/temp/约60未跟踪旧VSIX摘要保留，不删搬清理或stage无关。

全局同一时间一个node/python检查，先目标单文件node --test --test-force-exit --test-timeout 20000，20秒不退停止不重试、不改生产求绿；Python只函数/import提取、不完整import/exec agent/scheduler、不长python-c，spawnSync≤10000/windowsHide/status0。正常失败可定位必要修法后按真实新输入验证，首失败/日志保留；工具等待不改测试期限。原删除双确认/安全根/直接父目录/./子项保护不弱化，不授权真实删除，若审删除逻辑先读safe-delete-paths。普通Windows原仓非Pi/自制容器，origin https://github.com/zlinkw/SimpleExperiment.git ，master追踪origin/master；禁止amend/reset/rebase/merge/force/改remote。全局UTF8/Pwsh7按最新AGENTS；plan上限18000/90%=16200，execution12000/90%=10800，集中语义压缩保留失败/未知及Git证据。当前全计划语义压缩替代早先调查期文案，旧完整已提交计划89498eff及执行/coverage原材料保留，不另建报告。

## 用户裁决与CLI迁出实施范围

用户明确业务CLI完全弃用、源码可删，只保留UI和MCP。此裁决取代C4参数修复及旧simpleex安装要求，不改结果ID，不造新EXE/业务子命令，不清用户全局shim或旧安装。MCP stdio是连接协议，保留并独立解析匹配Host的已装版本dist/mcp/server.cjs；原ProjectQueries为进程内结构化调用，非子进程CLI。中立查询/连接迁出保留原137工具输入输出、0/空、错误、实例握手/项目隔离、授权确认和文件安全。仅确实需要的共享子集迁src/api与src/mcp/query，不搬argv/终端渲染/无上下文CLI回退或全目录dispatcher。

T1连接：LocalApiClient/必要errors及Server、legacy、BranchPlanDispatch同步；T2独立resolver/MCP launcher/安装及身份、重载、pin、缺文件、取消、真实exit；T3 AsyncLocalStorage context/RPC/读取/结构化emit；T4结果/指标/比较含A4/A5及长宽JSON/身份/0空；T5实验/日志及必要runtime/WorkflowRun子集，保留active/health/inspect/log身份与失败；T6产物/服务器/资源/PLAN矩阵生成及确需control/cleanup；T7公开bin/install/构建/manifest/VSIX闭包/策略和指南仅UI/MCP，不能使用旧dist/cli残留。均≤8文件/组，源修完整包后总控统一复审才开放集中构建交付。

旧源码物理删除与测试退休分开：原tests业务断言迁真实MCP消费者而非同名假Host；保留旧文件/历史，未审清单不删/skip/停跑/放宽预算。原依赖20文件及其它候选必须在源、脚本、构建和测试闭包移净后给完整绝对路径/固定类型/父目录/风险；无精确确认不rm整目录、不先删后补、不删fixture/历史资产或全局已装文件。所有必要可审非删除工作先做完，最后一次询精确清理批次。公开面禁止分发CLI不等物理删除已经完成。

能力兼容裁决：自动选GPU、停止后派发、单PLAN/全部剩余配额派发仍支持，允许现有task_dispatch补原宿主参数及必要条件，不新增工具/调度器。旧四字段指定GPU调用兼容；automatic仅目标Worker且不伪造GPU；quota_remaining明确PLAN或all且不得混job/GPU；缺/坏indices不变job0；stopRunning只明确true，保留精确停止、审核、权限与租约。draft_list及候选预览可补原force刷新，草稿清理保留既有UI/invoke双确认，不新增破坏性工具。只真实Gateway/宿主+假端口，不实派发或自动确认。旧CLI参数/展示不全部搬成新工具，具体余项按下节。
## T阶段统一源审及剩余裁决（2026-11-22）

中立LocalApiClient仅改error导入，实例/版本/发现/无重发契约有效；独立MCP启动、bin/install及旧dist排除方向通过，编译/包未验。302旧CLI tests见coverage.g004CliRetirementIndex，目录外26项见g004ExternalCliReferences，逐断言区分迁覆/部分/外部未测/旧表面，名称或重复函数体不等通过。新MCP测试加四个显式交付profile；原glob本已发现。publicCliAliases按本人撤销CLI的新契约就地更新1/1，保留文件及覆盖；误Delete File后恢复同路径，Git为M，旧0d5cae56/失误保留。

必要返修：Support.optionalApi不得把实际Host普通Error/apiCode拒绝/取消经network默认映射吞空；仅真正未声明可选-32601保留缺失，联验真实Gateway及resource/experiment/server/artifact链。Artifacts本地ID/manifest/log读取核规范根和链接，不越界stat/hash；保留项目内相对/绝对、冒号身份、0字节和远端原契约，只合成根/假fs。新错误模块剔除无消费者CLI输出代码，不机械改名。

旧argv/终端退出/help、无Host history、doctor聚合和隐式PLAN默认不移植为新工具；GPU保留现观测+任务身份出口、不新造flatten。已装SFTP120 UI simpleSftp.createOrOpen与旧project.create同调createOrOpenProject（extension.js:190/4639），仅源证未创建。Agent allowlist/token隐藏只必要源链+假端口，不扩生命周期/撤权专项。旧4清理引擎的双确认/一次批次/unknown不重发/token/跨根漂移须覆盖；允许固定真实CleanupFileApi源码+内存最低传输的MCP消费者补测，禁止实际删除/移动/SSH/live发现，假Host不能代引擎。

ExperimentRunner另有evidenceTooling checkpoint受顶层导入影响、formalJobExecution旧runner防绕过项。独立checkpoint和正式PLAN/调度/产物/哈希保护继续；旧runner项形成现契约测试候选，不连带删安全断言。退休路径有界正反依赖对账包含源码/脚本/模板/manifest/helper/测试；全包给精确绝对路径、file类型、安全根/直接父目录/剩余引用和测试替代退役清单，一次确认前不删/skip。

B1可达通知等待与旧首操作未知分开：runOutsideResourceLease内异步末尾通知、原项目导航/错误可见的候选源方向接受但未验。原localWorkspaceRecognition夹具首失败后污染替身致后续20秒timeout exit1（g004-r519-b1-lease-before-ff08.log），finally候选未运行。不得重跑/改限时/换文件绕过；全包齐后提出该改后文件原20秒单次复验例外申请，不报passed。0aa6b27c push后fetch TLS exit1、总控单次恢复fetch exit0核远端一致，非测试重跑许可。

返修包404aa6cf/97607ab8复审：8249eb4d错误传播和c0465f0f/2551787c无消费者CLI代码移除方向通过；Artifacts尚需按sourceFiles.endpoint/Worker身份分流，不能把相对远端路径与同名本地文件混成一份或本机hash冒远端。允许必要合成碰撞回归，不查真实Worker。清理引擎验证现允许固定真实CleanupFileApi注入纯内存状态存储/fs效果（含Map化atomicWriteText、rename/remove），真实状态机/原4边界保留；所有未知真实fs效果拒绝，不实际改伴随源码、移动/删除文件或live发现，且不冒验了state-store原子持久化。旧bin/simpleex-mcp.cjs仍依赖旧CLI resolver，候选37漏它；只有当前独立mcp-launch及resolver必保留，旧借用包装无消费者则列精确待删。302测试下一包须逐项给拟保留迁覆/旧表面退休/等价替代退休/仍缺边界及原glob/矩阵具体改法，未应用前不删/skip。B1仍未准重跑。


8cd77604阶段包复审：9eff6177清理schema与observe缺省1及真实engine/内存store隔离方向通过，f7b476ba绑定实际0.2.120 engine/package输入；内存状态机通过不冒磁盘原子持久化/Worker/UI。源审时文件已有第5个token/type/cross-root用例，须按实际新输入补单文件而不拿旧4/4冒5/5。35056314给原无endpoint本地index成功夹具新增endpoint:local不可作为兼容通过；须恢复原输入，按本机index/runs manifest与远端历史真实producer区分位置，不以泛化history或本地碰巧存在猜来源。原本地成功、外部路径/链接拒绝、远端相对同名不hash本机须同时成立。
51项待审已按边界裁决：无Host history/CLI写文件与下载/终端compact/doctor/隐式默认/零握手/独立server文件与外部manifest/细粒度prepare旧便利不新造MCP；旧helper无消费者别名只列旧表面退休候选。当前MCP的准确内容/失败/身份/授权/回执和本地artifact manifest能力保留；固定catalog/Hub与promote不复活。只补当前业务方法前坏参拒绝、SFTP槽位/死默认alias绑定、现有server-to-server variants、实际路径/patch负责边界，禁为旧128条等CLI限制发明MCP门禁。真实后端效果仍未测，正确局部证据可复用，不反复把已裁决的CLI退出语义当业务缺口。下一包含46保留项/26外部混合项适用部分的未应用候选diff、精确退休及原glob/矩阵改法；其余就绪后总控一次提用户清单+B1原20秒例外，批准前不删/skip/减覆盖。

35c413e1位置裁决：hub_job_dir由Scheduler主机manifest生成，syncState归并/synced_at不证明插件本机副本；带Worker无endpoint旧索引不猜本地，不建来源框架/新持久化。内部Symbol保留已证本机无Worker索引及runs实际目录，native Worker库存不变。历史唯一位置未核且无有效远端元数据时须明确ARTIFACT_LOCATION_UNVERIFIED等业务错误，不能空成功冒确定无产物；已有元数据只限该来源。缺历史事实不要求伪造恢复全部本机副本，亦非全部兼容通过，不新查Worker或新history工具。
