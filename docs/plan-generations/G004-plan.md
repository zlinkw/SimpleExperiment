# G004 重要功能、按钮与MCP深查

## 当前目标：统一完成单项目返修及CLI退役，仅保留UI/MCP

2026-11-22用户确认519已重载、未重配重授；要求复用已查证据，一次查清单项目全部按钮/功能/MCP，尤其配置和工作区识别保留、识别流程及资源冲突，不逐项停下来或发版，单项目正常后再处理延期项。本轮仍属G004验收返修，一个完整业务批次，内部按≤3强相关问题、≤8非生成源/测试/文档文件逐组验证和scoped FF提交；不是一个巨型提交，也不重开原已完成的39项三批。

最新源码/运行/519 tag基线6932321534f3b0c2df3b1983bfede2f88f7b868f，当前HEAD=origin/master=89498efff8d3c9ec1927ff22f87ec259f4c4428a。执行完整调查包已到，产品/build/dist/version未改，tracked dirty仅本计划、README、execution和coverage；无在途命令/测试/UI/Git。总控已定向审识别/租约/持久化/选择/结果解析/反馈/配置/路由/Git/CLI真实源码及证据边界，批准下列统一修复，不开放真实服务器或跨项目验证。原不改产品的调查期门槛由本节源审决定取代；最终源码包复审前不build/dist/递版/package/发行/安装。

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

## 历史证据和真实失败：保留引用、不重跑

U01/U02/U03原20修复（2/8/10）已交付516，非按钮分母。原U04确认43=39单项目于517修完+02/05/06/07跨项目延期4；撤回10项20、33–36、40–44不可复用。原39恰好B1/B2/B3=13/17/9，详细分组/提交/验收见Git895038f2同计划、f72d0066 execution及coverage.newConfirmedIssues；U44可信数据集人工映射排除为正确保护，U45仅人工映射配置恢复。U04-01/08保留源码与既证，不重放授权撤销/Agent专项；02清理UI拒绝后本地推进、05实验列表A/B、06元数据验证A/B、07后台bootstrap登记B仍延期。

54=417634df两公开选择转本地handler，42/43 exit1→43/43；55按本人最新项目一键授权/撤销、无Worker/权限勾选，bc0cc61c/c37827c8，45/45两轮，旧grant不自动扩权；旧窄修43/44→44/44为被取代历史。56=895038f2只读offlineResultPreview独立于归属/PLAN完成，8/8，坏行首7/8→8/8、特殊键/0及别名8/8。54–56已交付518，518实际本地选择/设置/离线导入2/2及恢复等有效；517 PLAN生成/保存/空矩阵/取消、结果拆表/日志按未变消费者复用，不全轮重演。详见execution及89498eff/eab27339/c37827c8历史同路径。

519持久化源f6c3339f共享队列失败可重试（首0/1→1/1）；eab27339关键项目读错不吞/保存前读/导入失败恢复（7/8→9/9，补9/9）；19234b6a null/cleared不复活旧值且有效项目优先（9/10→10/10，补10/10）；5a3ca8f6同profile规范根globalState完成/提示事实与false/reset防复活（0/2模块未实现→3/3，首次提示1/1、迁移10/10）。原workspaceState无根格式的首次单根迁移历史来源无法追溯，owner写前中断歧义保留；不跨profile搬授权/连接，不拿记忆冒当前Agent/PLAN健康。源码均源审通过并交付519，真实读/存位置和历史完整审阅见89498eff同计划及execution。

519 source/tag6932321534f3b0c2df3b1983bfede2f88f7b868f，Release https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.519 ，draft=false/prerelease=true/Latest仍483；VSIX2988831字节，SHA256 525e235fe7e380bf3684edf5b8bfd3dd7620badefd964dcdcd671b14c0216b33，远端digest及隔离C:/Users/ZLK/AppData/Local/Temp/g004-519-download-ff08下载同字节/精确sha。唯一package 2026-11-22T06-35-19-310Z-69208-package/run.json为341/341+13gates exit0，input=end02a04b0a7ed920361e852dea0e41d4740114b1cefbb1aabb8ab2c4bd71f5560f、并发1/树confirmed/锁释放/按需0；新dist模块+3真实生成scripts VM、326闭包/325panel/373同源/376内容策略、10890零命中通过。真实ReleaseClient首误断SFTP Latest120实际118而exit1，修临时断言后exit0：482见483可升级，519和SFTP120不降级；120试行资产可取。install:latest仅一次exit0含DEP0169，磁盘519/SFTP120、稳定入口已核。文档85bab6a6/89498eff不改运行tag，当前Host以本轮实机为准。

518 source/tag20ae86ed、VSIX2987002，SHA703d5ae27781921294ff5eeb0bb7355ec7db8581390b73549420a564045e5624；首package339/341 exit1，mcpProject历史引用夹具41/43→43/43、serverQuota缺依赖9/10→10/10，仅fixture。runner拒组合，特批第二次2026-11-22T03-36-44-479Z-33768-package/run.json为341/341+13gates exit0，input=end3cb70f7f…10745/并发1/锁释放。独立verify-vsix-runtime丢exit仍未知，批准实际ZIP等价325闭包/324panel/371同源通过，不冒原命令通过；git add提示忽略dist exit1但指定已跟踪文件均stage，未force。安装一次exit0，原日志/补验均execution，不是再次全跑通用许可。

517 source/tag a7d2a727、VSIX2986729/SHA2fa2ecb3e0d890d47653ee8b7f5ffe29317c22d692659ae4cd8d34336a6989e5；首package337/341 exit1、合作取消stdin closed失败，自然结算；四test-only补验MCP43/43/CLI19/19/取消13/13/Agent10/10，Agent首补9/10跨realm保留，特批第二次341/341+13gates exit0。U30首源修误滤显式metrics维度名，1da1ffce修平面过滤5/5；原日志导航12/13失败、独立VM3/3及其夹具首失败、旧dist13/13/517新dist13/13分别保留。516首340/341→22/22补验→特批341/341，vsce ls30秒ETIMEDOUT exit1未重跑/改时限、改actualZIP等价，首ZIP ./假缺失败保留。514错误60位sha资产保留，515实际Reload不倒推其它版。旧build并发中止exit1/BUILD_LOCK_UNSETTLED及夹具6/7→7/7、285/10gateexit0/并发1/6按需未跑、唯一旧owner删除精确许可已用完。完整旧失败/退出码/日志在10c0689e、b7c0b42c、f72d0066、c37827c8、eab27339、4bde7f49及89498eff同路径，原U01/U02计划4edd1da5；不删历史证据或重建tracker。

J01仍未修：旧Host GIT_CONFIG_COUNT10/KEY全有/VALUE0和5缺，工具空值存在，具体启动/传递环节未知；API/CLI默认绑定误项目exit2不重试冒绿。不sanitize环境、注入/改全局Git或重启稿件，不计本轮新缺陷或拖主目标。平台旧turn systemError cybersecurity risk精确触发未公开，不猜关键词/攻击、无Daybreak/扫描、不重放/换工具模型聊天绕限；自然接替与此无关。

## 唯一角色、资源及保护

总控《总控·SimpleExperiment G004 集中查修与交付》01a1fdb5-efe6-78c2-ae6c-861ed4028cdc/local，Sol/high，实际default仅记录，独占plan/README和最终审查。执行《执行·SimpleExperiment G004 集中查修与交付 接续》01a202d5-5126-7e32-954f-3761f4630e53/local，Terra/high，实际default仅记录；已实核match/continue、读原派单与现行资料并承接本轮完整源码修复及上述唯一租约。旧执行01a1ff08在10压缩/第五次后峰300409自然接续，已正式释放全部租约、无在途，旧turn completed；新执行已续做未提交T5并执行旧聊天归档，不删除。旧档位强制default导致暂停已由用户最新规则/统一脚本解除，双方model/effort match/continue，保留用户界面档位，不索文字确认或自动重置。自然接续只按caveman，旧执行01a1fdb5-ce28已合格交接归档，旧总控/更早角色亦归档；不新建审查者。按全局事件协调发送完整包/需决定阻塞/必要交班，消息默认无回执，不轮询/催局部进度；无独立待办总控合法结束本轮，执行有可做工作不能套用空闲。

禁止真实服务器/Worker/SSH/健康版本/准备同步/任务查询派发停止/清理/Agent部署，当前统一grant不是本轮实机外部测试授权；共享Worker配置/授权不改、不自动切模式/重载/新profile、不抢稿件或原VSCode输入。startup公开GitHub更新检查及自然发现注册是先前明确允许例外，不扩大Worker请求。仅专用合成根本地必要操作，真实GPU7所有任务日志产物、/root/autodl-tmp/zlk/MultiModal、原Agent tmux/隧道保护；MM final.md、Generic Untitled-1、Response to Reviewers.tex等未保存稿件不得reload/close/抢输入。D:/GitRepo/SimpleMcpAcceptance只读，cleanup_20261111.txt、所有新旧fixtures/temp/约60未跟踪旧VSIX摘要保留，不删搬清理或stage无关。

全局同一时间一个node/python检查，先目标单文件node --test --test-force-exit --test-timeout 20000，20秒不退停止不重试、不改生产求绿；Python只函数/import提取、不完整import/exec agent/scheduler、不长python-c，spawnSync≤10000/windowsHide/status0。正常失败可定位必要修法后按真实新输入验证，首失败/日志保留；工具等待不改测试期限。原删除双确认/安全根/直接父目录/./子项保护不弱化，不授权真实删除，若审删除逻辑先读safe-delete-paths。普通Windows原仓非Pi/自制容器，origin https://github.com/zlinkw/SimpleExperiment.git ，master追踪origin/master；禁止amend/reset/rebase/merge/force/改remote。全局UTF8/Pwsh7按最新AGENTS；plan上限18000/90%=16200，execution12000/90%=10800，集中语义压缩保留失败/未知及Git证据。当前全计划语义压缩替代早先调查期文案，旧完整已提交计划89498eff及执行/coverage原材料保留，不另建报告。

## 用户新范围：退役业务CLI，仅UI与MCP

本节优先于前文C4及后续交付对simpleex业务CLI入口的旧要求。用户明确CLI完全弃用，源码可删除；保留MCP连接必需的stdio启动器simpleex-mcp，解除其对业务CLI resolver的依赖，不能误删MCP。总控只读确认ProjectQueries直接导入src/cli的业务函数/ExecutionContext，Server与legacy依赖LocalApiClient，MCP launcher借simpleex resolver选CLI版本路径；当前MCP不是已独立替代实现，不能先删目录。用户指令授权必要移出共享业务/连接模块、退役公开业务CLI入口和更新实际构建/安装/收包/文档，不授权丢失已有MCP工具或更改结果身份、输出语义、授权/确认/实例绑定、真实远端效果。

原唯一执行者先一次核清精确依赖闭包、保留/迁移/纯CLI候选、构建与测试消费者及≤8文件内部组，形成具体原材料；不继续C4参数修复。源码与测试物理删除先不做，按safe-delete-paths/manual-cleanup-only形成精确绝对路径/类型/父目录/引用风险候选；当前广义源码可删没有唯一定位全部路径。需删除时在共享迁移和可审修改完成后一次交确认，不能直接rm src/cli或删测试/旧安装产物。旧CLI测试的业务断言迁到真实MCP消费者验证，不能以退役UI形式为由自动缩减仍适用正确性覆盖；纯CLI专属测试的退役具体列明、按测试生命周期裁决，不直接停跑求绿。

没有精确删除许可前可保留原源码待移除，不将其重新分发为运行入口；所有真实用户全局simpleex文件/旧安装目录保持原状，未来安装仅配置MCP连接必需入口，不借此清理用户系统文件。MCP启动参数属于连接协议，不提供人工业务CLI子命令。必要最小共用逻辑迁出后，公开bin/打包清单不再暴露业务CLI，不能只是换路径继续保留argv调度/终端渲染接口或让MCP启动依赖dist/cli.js。先交一次完整依赖与迁移方案，随后连续实施；13个已验源码组不因CLI退役盲目回滚。真实Worker、原稿、授权、共享配置、删除、单检查与Git边界不变；最终统一源审/集中交付仍未开放。
R519源修中间审核：A1–A6/B1–B4/C1–C3已分组提交（b4ccc6e3至8c8c874c，另4caddba6配置消费者），源码未构建发行。总控读实际diff，B1最后已持久化/postState后仍await仅供“打开实验准备”的完成通知，外层识别资源租约会继续被该可选通知Promise占用；这不是旧现场首操作已查实死锁，而是当前新流程可达的非必要等待。补真实bootstrap+租约+未决末尾通知的受控覆盖，完成通知改为不延迟本地操作结算，用户后续选择导航仍核原项目且错误可见；初始确认/选PLAN仍等待，不加锁超时/自动清理。其余组源审有效部分复用，最终MCP迁出消费者后再核完整包，不因本点重跑全部。
### CLI迁出方案源审通过：T1–T6连续实施，公开面与删除分开

执行只读依赖方案已核，原MCP是进程内结构化调用，不是子进程转CLI；静态闭包20文件包含LocalApiClient/ExecutionContext/WorkflowRun/api/data/errors/format/parse/runtime及11个commands模块，不能整体搬dispatcher或先删。总控核实际resolver、Server/ProjectQueries及收包脚本，批准最小迁出，保留当前137工具输入/输出、合法值、错误、项目隔离、实例握手、授权/确认、文件安全和真实Worker边界。结果ID保持不变，MCP不新增history或其它工具凑旧CLI功能。

| 迁移组 | 实施与检查 |
| --- | --- |
| T1 共用连接 | LocalApiClient及必要错误类型迁到src/api中立位置；Server、legacy、src/project/BranchPlanDispatch和真实连接测试同步，保留绑定/身份/无重试契约。 |
| T2 MCP启动 | 独立MCP resolver直接选已握手Host对应版本dist/mcp/server.cjs，不再借业务CLI文件；bin/simpleex-mcp及安装仅服务MCP，保留多安装/错窗/重载/缺入口/取消/真实退出码测试。 |
| T3 查询基础 | 将实际context/RPC/文件读取/错误/结构化输出移至src/mcp/query等已有领域下，保留AsyncLocalStorage隔离；内部emit可复用，不暴露stdout终端渲染、argv调度或无上下文业务CLI回退。 |
| T4 结果查询 | result/metric/compare必要业务及映射迁出，带上A4/A5修复；真实queryProject/ProjectGateway假RPC核长宽JSON、指标身份、0/空、原结果ID及错误。 |
| T5 实验查询 | experiment/log及runtime/WorkflowRun确实需要的业务子集迁出；原active/health/inspect/log身份、失败与隔离断言保留，不复制无MCP消费者的启动/dispatch入口。 |
| T6 其余查询 | artifact/server/resource/plan矩阵与生成及确需control/planCleanup子集，schema→网关→真实业务结果核对，原保护不变；只迁可达出口，不移整目录保旧CLI。 |
| T7 公开面 | T1–T6及替代覆盖完备后改bin/install/manifest/VSIX闭包/收包/必要指南，仅发布UI/MCP；编译/打包不得吃旧dist/cli残留。旧CLI专属测试拟退役逐test给原断言→替代/撤销依据与当前矩阵差异，审核前不删/skip/停跑、不降覆盖或超时。 |

原CLI文件在共享引用移完后列精确绝对路径/类型/直接父目录/风险；此前六个候选及其它文件都不自动删除。先完成非删除迁移和可审改动，最后依删除技能一次询精确批次；旧安装目录和全局用户shim不在范围，不删任何fixture/资产。无必要新依赖/编译器/通用框架。每组源/测试/文档≤8，必要时拆子组；先独立提交本轮plan/README/execution精确文档检查点再改产品，保持唯一写者FF同步。源修/迁移完整包后统一复审，build/dist/递版/package/安装仍未开放；不得以无原生hidden宿主为由冒称新UI实点通过。