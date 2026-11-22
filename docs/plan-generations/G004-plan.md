# G004 重要功能、按钮与MCP深查

## 当前目标与最新决定

2026-11-22本人已重载并授权518，要求先确认单项目正常再处理延期；另明确要求版本更新/重载后配置与工作区识别持续保留，避免重复配置。当前518普通本地验收已交包，持久化源码已补两组，尚未最终验收或新版本交付。复用有效源/包/517证据，不重审整轮或重跑全集。

优先PLAN读/生成/保存/选择、结果读取/解析/显示/导出、反馈、持久化与MCP契约。跨项目02/05/06/07和89入口延期未开放；不得将其变体冒充单项目优先。仅支持输入/公开契约与必要消费者，不做全仓防御、性能、安全专项或退役入口恢复。

当前HEAD=origin/master=5a3ca8f60a9588ecae542d3526393025dd7f47c6，tracked原clean；安装/运行包仍518源码20ae86ed。本轮f6c3339f/eab27339/19234b6a/5a3ca8f6持久化源码及必要消费者已总控源审通过，未build/dist/递版/安装，现开放下述集中交付。原46确认=39修复已交付517、54–56已交付518、4跨项目延期；本轮新增持久化根因独立记录，不编造或复用编号。撤回10项20、33–36、40–44保留原证据。

## 518实机结论及持久化源审

实际Host76852、518、精确专用根、offline_import、低流量enabled/effective，本人统一grant五类且无workers字段。此为默认profile（配置5/启用1），非旧隔离profile22928/Worker0；不同profile的global/workspaceState差异不证明升级清空，也不否定用户其它项目的反馈。既有启用Worker不阻断已证纯本地链，但不许借验收外连、改共享服务器设置或自动授/撤。

54两个公开invoke选择实机成功，state及simple_cluster/ui/plan_selection.json、task_selection.json一致，恢复原PLAN及空任务选择。55实际MCP结果目录配置写/读/恢复、合成本地CSV解析/排行成功，0/空/引号逗号保留；不代表所有权限已调用。56公开offline真实文件选择后面板2/2、来源、中文/引号/空seed/AP0和未核实提示均可见，原offline-fixture已同入口恢复；导入时间正常更新，不冒字节级原状态。未主动制造旧query失败，该分支复用受控证据。导入前核断流、distributedPlans空及直接链无Worker请求。

517既有PLAN2×2、空cases0/seed0、保存正文、向导生成/取消、结果显示/分表/日志与当前未变链复用；新实测/API/旧证/受控/未测分开。result_list/result_export默认loadResults→results.list→ResultCollectionHost.update会查询启用Worker，当前真实链未测且仍禁；既有本地UI导出与受控消费者证据不冒实机远端通过。尚不能说单项目全部通过。

持久化真实保存位置：项目选择/布局/离线在项目simple_cluster/ui，项目设置在.vscode/settings.json；共享连接为当前profile globalState，旧授权/引导标记为该profile workspaceState，均非版本目录、PID或token。当前合成根缺experiments/simple_project.yaml且本profile旧完成标记false，不能自动标完成或通过实际识别向导造远端动作。

源审f6c3339f：共享连接迁移/保存失败令Promise队列永久拒绝，现原失败仍向原调用者报错，后续显式保存可重试，重构消费者读回不丢原旧值。真实源码+内存首0/1 exit1、修后1/1 exit0，日志execution；总控核精确diff及断言，修法通过，未改真实连接。

源审eab27339：PLAN/任务/离线/布局读取原吞损坏JSON/EACCES为不存在，可能旧迁移覆盖并清旧值；现仅ENOENT缺失，格式/读错可见，保存前校验现文件，bootstrap关键读取失败阻止迁移。离线导入/清除保存失败恢复同项目包、不清旧key、错误上传。原7/8 exit1，后9/9及格式/EACCES/ENOENT补验9/9 exit0，见execution。Promise.all任一关键读错即停止本轮迁移合理；导入已pause但失败不自动恢复在线符合不意外联网边界。19234b6a补齐null/cleared语义：仅迁移includeCleared区分明确清除和ENOENT，清旧键失败后重试不复活，已有项目值优先、读错保留旧值。真实消费者原9/10 exit1→10/10，补已有值后10/10，原读默认语义不变，总控源审通过。

工作区识别决定：现完成/提示标记只随workspaceState，同根以文件夹或.code-workspace打开可换memento；采用同profile、按规范项目根的现有globalState持久事实，版本变化与workspace容器变化不丢，迁移当前单根旧标记，保留旧入口/API。不得跨profile搬权限/连接，不从空合成项目或目录存在推定已识别。只在原成功识别/同步完成入口保存事实；历史接入事实不替代当前Agent身份、配置/PLAN可用性或健康。state.get/set/reset及面板/首次提示消费同源，显式false/reset不能被旧true复活，读取/保存失败可见且可重试。5a3ca8f6按此完成并源审通过：ProjectOnboardingState复用globalState及localPathKey，完成/提示各按根独立；reset空记录防旧true复活，旧workspace归属根记录阻止本窗口后来项目借值，显式写等待启动迁移。原旧格式无根，首次升级当前单根迁移的历史来源无法追溯，owner写前中断仍有旧格式歧义，不冒已核全历史；无授权/连接搬迁。真实源+合成Memento/API/提示/面板单文件首0/2 exit1（模块未实现）→最终3/3，首次提示1/1、迁移10/10均exit0，不重载用户窗口造证据。

## 入口母集与原三批

有限源码逻辑母集300：UI动作/语义payload279=204受限结论/75延期，独立VSCode命令21=7/14；合计211受限/89延期，含缺陷，不是全通过。动态控件实例总数未知；291markup仅逐位置定位、137为独立MCP工具目录，普通query子集15/15有范围证据或缺陷，不代表137全执行。42贡献命令+3 legacy额外并集45去重。完整逐项、别名/排除、消费者与延期见coverage.g004U04RemainingInventory；unreviewed0仅已分类。初包5583aa5c退回、ac68854e纠正12项分类、最终f72d0066；原完整审核见4bde7f49同计划/19043154。

原39单项目恰好三批已完成517，不追加第四批凑数；54–56及持久化属原B2/B3验收返修。详细表、原组提交、受控证据见Git895038f2同计划、f72d0066/execution和coverage.newConfirmedIssues。

| 原批 | 问题 | 已完成契约与保护 |
| --- | --- | --- |
| B1，13项 | 25/26、28/49/50、32、19/21、22、29/30/31、45 | 迁移成功才清旧且同进程重试；CSV引号/换行/逗号/转义、坏首行后好值、case/model/tag完整身份；null/空/bool不转0，合法0/中文/特殊键保留；指标并集和方向；人工映射可信归属后先存配置，普通JSON优先/表可重建。 |
| B2，17项 | 12、13/15/16/17、23、24/38、27、37、39/51、46、47、48、52、53 | 取消/读错/ENOENT/失败可见；既有预算内标不完整；PLAN显式空矩阵、跨行注释、seed0、空白和10.5保存；归档不拿旧查询冒新鲜；报告/草稿/审计/模板错误保留，合法离线与确认完成保护。 |
| B3，9项 | 01/08、03、04、09、10、11、14、18 | await后核项目/目标/适用授权；资源失败不冒可用、缺结果/空指标/0区分、schema参数一致、精确WARN；精确身份优先/唯一旧别名/冒号/Worker；重分配仍唯一精确排队，index0。01/08只源/语法与既证，不重放授权撤销/Agent专项。 |

原跨项目02清理UI拒绝后本地推进、05实验列表A/B、06验证元数据A/B、07后台bootstrap归属B，继续延期；已知无真实破坏不夸大实际后果。U44可信数据集人工映射排除属既定保护、撤回；U45仅映射写表失败后同映射配置恢复。未读取真实结果，实际损失未知。

## 54–56授权契约及交付

54 selectPlan/selectExperiment公开目录与invoke远端actionMap不一致，417634df改为原本地handler，授权/确认/远端路径不变；原42/43 exit1、修43/43。55用户明确裁决管理AI只有授权/撤销项目，不选Worker/操作范围；新grant含现有五类、无workers，旧细分grant保留原约束到本人重授；不自动扩旧权。bc0cc61c授权8文件、c37827c8设置6文件，worker_configure支持已配置disabled目标和enabled读回，实际执行仍只enabled，保存前重核项目/目标，不启动远端；45/45两轮exit0。旧窄修156f060b首43/44失败→44/44通过保留，被用户新裁决取代。

56原517导入/state正确而UI不显，895038f2增加只读offlineResultPreview，结果section/revision/signature跟踪；归属/版本未核，不改变PLAN完成/归档，离线仅不把旧sync报告冒本次，实时错误保留。坏行标行号保留好行，两直接compactor null-prototype保留__proto__/constructor/0；支持final_results/pending_review_records，显式results[]不回退。真实生成脚本VM+定向8/8，边界首7/8 exit1(null.experimentId)→8/8，别名8/8均保留。空PLAN合成显示不冒真实实验。

518源码/版本/generated20ae86ed32f0baa9106645decb60cf9a299f3518，tag v0.5.518精确绑定；[试行518](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.518) draft=false/prerelease=true/latest=false，VSIX2987002字节，SHA256 703d5ae27781921294ff5eeb0bb7355ec7db8581390b73549420a564045e5624，同名97字节sha精确文件名。本机/远端digest/隔离下载一致，下载目录C:/Users/ZLK/AppData/Local/Temp/g004-release-0518-download-ff08保留。Panel模块及2真实生成scripts VM、377ZIP策略、universal Windows兼容通过；独立verify-vsix-runtime输出/exit丢失仍未知，批准实际ZIP等价325闭包/324panel/371同源exit0，不冒原命令通过。真实ReleaseClient482见483、518/SFTP120不降级，SFTP120现有资产可取；Latest仍483。install:latest恰一次exit0含DEP0169，code列表/磁盘518和SFTP120、稳定simpleex/simpleex-mcp入口已核；最新Host状态以上段为准。纯文档cbd7a7e7不改tag源码。

518首package `2026-11-22T03-16-49-272Z-80576-package/run.json` exit1、339/341及10前置门禁、输入一致、并发1、锁释放、无post/VSIX。仅fixture两修：mcpProject历史grant误共用可变对象41/43→副本43/43，serverQuota缺真实mcpInvocation9/10→10/10；原断言/生产未改。最终runner禁only/reuse、拒failed/不同输入receipt，不能组合339+补验，总控精确特批第二package，不泛化纯补测全跑。第二回执 `2026-11-22T03-36-44-479Z-33768-package/run.json` exit0、341/341和13 gates、input=end=3cb70f7f…10745、并发1/全部树退出/锁释放/按需0。git add因忽略dist exit1但指定13已跟踪generated及8非生成均暂存，无force；原失败/日志均在execution。没有第三轮许可。

## 历史有效证据与失败定位

完整前版计划保留Git4bde7f49同路径，本次仅语义压缩；历史详细execution见eab27339、20ae86ed、c37827c8、b7c0b42c、10c0689e。U01/U02原计划4edd1da5，原20修复非按钮分母；U04原39/三批不沿用旧20修复凑数。coverage现有对象不重建。

517源/版本/generated/tag a7d2a7275c5d9ea455c2e369cdddaa8e33a198e2，试行非Latest；VSIX2986729、SHA2fa2ecb3e0d890d47653ee8b7f5ffe29317c22d692659ae4cd8d34336a6989e5。首回执2026-11-21T14-48-56-521Z-480-package为337/341 exit1，合作取消stdin closed失败后自然结算。四test-only补验MCP43/43、CLI19/19、取消13/13、Agent10/10；Agent首补9/10因VM跨realm，归一后通过，未扩专项。runner不能组合，总控批准一次第二package；2026-11-21T15-08-06-325Z-28880-package为341/341/13 gates exit0、input=end5443ffc1…3aba、并发1/锁释放/按需0。日志导航另对新dist13/13，不在矩阵；旧12/13 exit1、独立3/3/首次夹具失败和旧dist13/13均区别保留。U30初源审误滤显式metrics维度名，返修1da1ffce仅平面行过滤，5/5；真实脚本首VM命令转义SyntaxError exit1后改正exit0。377ZIP/370同源、3生成scripts VM及真实远端/下载/客户端、安装一次均通过；517隔离profile状态和真实场景以execution为准。

516源6e3e9421，2984671字节、SHAa19398b5542d382a3606984125f2549d3a0721a86d10b96ecef582fe8861212d；首包340/341 exit1，22/22补验后特批一次全包，2026-11-21T08-23-22-440Z-42280-package为341/341/13 gates exit0、同输入、并发1/锁释放/按需0。377ZIP/326闭包/373同源、3脚本VM有效，首次ZIP ./假缺失败纠正；vsce ls30秒ETIMEDOUT exit1未改限时/重试，采用实际ZIP等价验法。安装一次，用户未确认该版Reload；不倒推UI绿。simpleex --version exit2 API_WORKSPACE_MISMATCH默认他项目，未retarget/重试求绿。

514已装一次但资产sha错误60位缺f675，B03失败，旧资产保留；515源/tag5dda9cf2，最终341/341/13 gate exit0（2026-11-21T04-51-48-484Z-62512）、本人真实Reload515不倒推其它版。U01实际515共24场景与两修在coverage.g004ReloadedUiU01，首0/2→2/2、actionLifecycle11/11；U02八修/28项J–Q见g004U02Reconciliation，29/29和flow3/3，首缺失/夹具错误及原项目写入未知保留；U03十修含冒号/空块，42/42、5/5等分别范围，不冒同进程E2E。

原12项旧A0/3含缺vscode→3/3，排除无入口args突变后4/4；experimentPlatform14/15固定basename断言与PLAN声明冲突，test-only后15/15。原build默认并发2被中止exit1/BUILD_LOCK_UNSETTLED，唯一旧process-owner.json经本人精确授权已删除，许可已用完。windowScope夹具6/7→7/7，2026-11-21T04-18-18-128Z-69044-build为285任务/10 gate exit0、并发1/锁释放、6按需未跑。绝不恢复已移除内部args突变测试或额外structuredClone/isDeepStrictEqual防护。完整原失败/退出码/日志引用见上述历史，无删除授权。

J01仍未修：旧专用Host56788 registry报告missing GIT_CONFIG_VALUE_0；COUNT10、KEY全有、VALUE0/5缺，工具空值存在，父Code60564无COUNT。具体启动/传递丢值未知，Chromium仅线索；完整工具Git及cmd exit0，受控移除VALUE0 exit128。祖先git_ui_source_501与同父分支身份正确，真实卡片未复验；不清环境/注入/改全局Git/重启稿件、不拖本目标、不计U04新bug。详见Git c37827c8及4bde7f49同计划。

平台旧turn systemError cybersecurity risk，精确触发不公开，最近完成rg、此前内存替身，不猜关键词/攻击。无Daybreak、不扫描、不重放、不换工具/模型/聊天绕限；接替来自用户授权及自然阈值，与绕限无关。

## 角色、租约和保护

总控兼终审《总控·SimpleExperiment G004 集中查修与交付》01a1fdb5-efe6-78c2-ae6c-861ed4028cdc/local，Sol/high/default，独占plan/README。唯一Terra《执行·SimpleExperiment G004 集中查修与交付 接续》01a1ff08-4031-7410-a937-c2ba34e6730c/local，Terra/high/default，负责源码/小验收/execution/coverage/唯一检查/scoped Git；本次4bde7f49交包时无在途并回交租约，总控当前源审，下一必要派单重新明确开放。不得新增审查代理。旧执行01a1fdb5-ce28-7ba1-b9b5-3470a33e8d00实核6压缩/后5峰300048自然接替，已归档；旧总控与更早执行亦已完整交权归档，详情19043154。通用接续按caveman，事件驱动协调按全局AGENTS，不轮询空快照、不索仅确认回执；持有可做工作者连续执行，合法总控空闲不等任务完成。

唯一实机根 C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f。保留旧隔离profile C:/Users/ZLK/AppData/Local/Temp/g004-vscode-0517-acceptance-20261122-ff08及当前默认profile专用窗，不再新开/重载/安装；真实live身份每次复核，不用旧PID/token当活证据。允许原公开GitHub只读更新及自然发现注册；禁止真实服务器/Worker/SSH/健康版本/环境查询/准备/同步/任务派发查询停止清理/Agent部署或科研依赖安装。本人项目统一授权不等于本轮获准真实远端测试，授权/共享Worker配置只读，不自动改。普通本地项目偏好按精确原值可逆验收后恢复，合成新夹具保留。

保护原MM final.md、Generic Untitled-1、Response to Reviewers.tex等未保存稿件、原VSCode窗/输入、GPU7所有任务日志结果、/root/autodl-tmp/zlk/MultiModal、原Agent tmux和隧道。D:/GitRepo/SimpleMcpAcceptance只读；cleanup_20261111.txt、全部新旧fixtures/temp/约60旧未跟踪VSIX摘要保留，不删搬清理或stage无关。

全局一个node/python检查；先单文件node --test --test-force-exit --test-timeout 20000，20秒未退停、不重试或改生产求绿；Python只提函数/import，不完整import/exec agent/scheduler，不长python-c，spawnSync≤10000/windowsHide/status0。检查冻结包含总控文档。源测试不冒旧dist或新Host通过，Panel修改及集中交付仍需build内语法和实际生成script VM/10890零硬编码门禁。

普通Windows原仓，非Pi/自制容器。origin https://github.com/zlinkw/SimpleExperiment.git，master追踪origin/master；每验证组scoped commit普通FF push/fetch核一致，不amend/reset/rebase/merge/force、不改remote。remote前进/认证/hook/租约不明停对应动作升级。UTF8/Pwsh7遵守全局；计划cap18000/90%=16200、execution12000/90%=10800，各自写者集中语义压缩，保留失败/未知/范围与Git原证，不造新报告/归档或复制规则；coverage沿用现有对象，最近三代索引继续，退出日常窗口不删原文件。

## 后续完成与交付门槛

执行者按完整派单连续完成可做本地单项目项和持久化返修，完整交包后总控核diff/必要消费者/证据/未知；有效小验收不重复。最终源审前不开版本/build/dist/发行/安装；单项目最终通过后才开4跨项目有限受控链，89外部/删除/生命周期/平台受限不为清零扩权，不把局部提交或CUA完成当整轮终点。

交付按build-test-delivery及docs/release-delivery.md：先核未用patch/tag，同步package/lock/runtime；package含build，复用有效缓存/按需证据，不先全build再package，max-parallel1/cancel-stdin。现runner最终profile必须同输入passed矩阵且不支持组合；首次候选范围/失败后重跑须按当前实际差距明确裁决，旧特批不是通用许可，不伪receipt/改覆盖超时求绿。

通过后核实际VSIX身份/版本/Windows兼容/运行闭包/同源/秘密排除/README/SHA；FF提交源码/generated/version并核远端后，精确tag绑定，现有GitHub试行prerelease=true/latest=false，VSIX+精确文件名sha同字节，实际远端资产/tag/digest/隔离下载/真实更新客户端核验。权威SimpleExperiment483=0fd89fa8be6778daad8398d911cd028d713241e4、SFTP118=23cbf92918c7b63cf4674a4159c3f06120037e5d不提升，SFTP120复用不降级；不覆盖历史tag/资产、不自动部署Worker。

全部成功后install:latest显式一次，同版跳过、不force/降级，每目标版至多一次；核磁盘/稳定CLI后停止面板，待本人Reload再验新Host。源码/生成包/远端发行/本机安装/实际重载与真实外部未测分别报告；任何失败停对应交付且保留完整真实证据。

本轮集中交付裁决（持久化）：重新核必要反向引用与抽取/VM夹具闭包，已有源码测试有效不机械重跑；确需修旧fixture则保留原断言/日志，仅补真实受影响项。先核未用patch/tag再同步package/lock/runtime并write-agent-runtime稳定输入，dry-run读取当前矩阵/按需与保护恢复；既有runner因运行版本/共享源码变化要求完整同输入passed矩阵时，批准本候选首次package一次，max-parallel1/cancel-stdin，不先独立build。真实失败收完整结算，定向返修；如runner拒绝组合，交具体差距，不自动第二轮或伪receipt。通过后按下述项目原交付规则连续完成，无需再等普通放行：新dist真实消费者/Panel模块及生成scripts VM、10890零命中；实际VSIX身份/平台/README/内容策略/秘密排除/完整运行闭包和同源字节核验，直接沿518已批准实际ZIP等价方法覆盖本轮新增模块及当前完整入口（不硬设325/371旧数量，不重跑已无证据输出的vsce ls）。FFpush/fetch、tag绑定、既有GitHub同字节试行发行及真实远端/下载/更新客户端后一次安装；停止UI待本人Reload。源码通过不等构建/交付通过，新版Host实机仍待重载；原real Worker/4跨项目/89入口限制不变。plan/README精确审核dirty可随下一适用scoped提交，总控此后冻结输入。