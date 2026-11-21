# G004 重要功能、按钮与MCP深查

## 当前目标 U04 排查已收包，按三批修复单项目问题

2026-11-21用户要求先排查、后制定恰好3批完整计划再实施。本阶段继续G004；排查收包基线master=origin/master=f72d0066530ccd94dcbc70f2e7574bc6ef5efee3，产品尚未改。有限逻辑入口300项，211项有受限证据或确认缺陷、89项按真实外部/清理/生命周期/跨项目边界延期；不是全部通过。0.5.516已试行发布并安装一次，用户尚未确认重载；原20项修复及有效回归/包/发行证据复用，不冒新源码已实机验证。

最新优先级裁决：先将单项目功能全部查清、修好并完成必要验证，再扩展双项目场景。当前总数、已查数、剩余数以单项目实际功能入口及支持参数变体为主，复用旧有效检查。优先完成PLAN读取/生成/保存/选择、结果读取/解析/展示/导出、日志与按钮状态/错误反馈、配置保存与正常状态读回及MCP参数/输出/路由对账。已发现的双项目切换、跨窗口或共享状态问题保留证据并独立列为低优先级延期项，不能抢占单项目功能修复；同一根因实际也影响单项目时按该实际影响处理。当前不再新增双项目竞态，亦不继续扩展授权撤销、令牌或Agent生命周期异步边界的专项复现；已发现问题及既有必要安全/正确性覆盖保留，不为提高优先级追加变体。

执行边界核查：唯一执行者原轮次因平台possible cybersecurity risk提示失败，工具未披露具体触发点。最近已完成动作是本地源码搜索；前序本项目授权状态测试采用内存替身，现有证据不能推断插件实施了攻击。受拦截阶段保留现场，不重放、不换模型/聊天/通道规避，不自动申请或启动Daybreak。只续接上述独立普通功能只读排查；若该范围也被拒，报告真实限制，不冒成功恢复。

顺序为完整单项目排查→完整三批修复计划（单项目问题优先）→按三批实施和必要回归，确认单项目正确→再扩双项目场景。原统一交付规范保留。排查阶段仅当前源码/既有证据、受控渲染/调用与必要复现测试，不改产品、不build/写dist/递版/打包/安装/发行。所有入口逐项有结论、真实缺陷和必要闭包齐后，执行者一次交完整排查包；总控先核完整性及缺陷证据，再据实际依赖写正式三批计划并授权原唯一执行者连续实施，不需要用户重复说继续。不得先修两处再补剩余排查，不人为凑缺陷数或三批空提交。

入口全集必须来自当前实际代码：默认/可启用面板、辅助审核/授权/确认/恢复页面及菜单的实际按钮producer、data-command/事件postMessage、VSCode package贡献与实际命令注册、PROJECT_TOOLS及MCP/Host/API/CLI必要消费者。按逻辑动作和支持的参数变体去重，保留所有位置、显示条件及同命令不同payload语义；重复数据行实例不当无限入口，不把静态文本/遗留不可达代码算当前按钮。列明母集提取来源、去重规则、别名/条件/退役、真实总数和未覆盖项，核producer→route→host→最终效果闭包，不只数schema和字符串。显式factory opt-in路径按实际支持条件纳入，退役PPT/Hub只验证拒绝或不可达，不恢复。

复用docs/windows-entry-coverage.json当前历史对象，在独立g004U04RemainingInventory对象登记本轮入口和逐项状态/证据，不全量重排历史。将每项标为当前验证通过、有效既证复用、真实缺陷、明确外部未测/阻塞，说明证据基线及边界；先映射以前有效逐项检查，相关实现和契约未变则直接计已查，仅核复用所需差异，不重跑或全面重读调用链。只对未覆盖、新增、原证据不足的边界或因具体代码变化失效的项补查；剩余数据此计算，源码结论不冒已实点/远端效果通过。新缺陷写可达触发、期望/实际、根因、受影响调用方、复现及修后通过标准；正确项保留，无实际依据的理论防御不入修复计划。结果与输出映射由AI通过真实MCP契约配置，不恢复手填必经或自动科研依赖/结论检查。

已覆盖项仅按当前改动是否影响其契约判断复用；剩余全部入口逐项核schema/参数传递、权限和确认、项目/对象/操作身份、成功/失败/取消终态与错误可见性、空值/零/false等支持输入和必要消费者。不扩为大并发/性能测试或内部args任意突变，个人单机最多两项目；不因问题罕见漏掉支持接口可达问题，也不因局部外部阻塞停止独立逻辑排查。

排查完成门槛：当前母集中的每项均有完整本机/受控逻辑结论或明确未测原因，历史有效证据与新证据对应，所有确认缺陷及相关消费者整理齐，无仍未检查的本地逻辑入口；总控可据此一次制定完整3批计划。三批按真实功能依赖和同文件集中修改组织，每项指定范围/保护区/负责人/验证/退出条件；批次是修复组织方式，不新开角色、会话或代次。用户要求3批不授权造新功能、修正确项、放宽测试或真实服务器动作。每批完成相关验证与scoped Git同步，最终集中构建/试行发行/安装按原交付规则，避免每小批重复打包安装。

总控独占G004计划/索引及最终审查，唯一Terra负责实现、小验收、execution和本轮coverage。用户主动双接替已完成，两角色实际模型/强度/default均match/continue、背景已核；旧角色明确释放租约且turn结束后已归档，不删除。现任身份见下文，原Terra01a1e793-a4a0-7630-8157-24c920746d1a此前自然接替及有效证据保留。当前只开放下述三批产品源码修复/定向验证/scoped Git，不开放build/写dist/递版/打包/发行/安装；最终源审通过后另给交付执行指令。两角色及背景硬门控不变，不新增审查者；协调遵循最新全局AGENTS事件规则。

保护与执行边界继续下文：不查任何真实服务器/Worker/SSH/健康/准备/同步/任务，不部署Agent、不改共享Worker或扩大AI授权；旧验收仓库只读，全部夹具和拒删文件保留；保护原稿/未保存文档/窗口、GPU7产物及tmux隧道，不自动重载或抢输入。新UI实机须本人先确认Reload Window，未确认时仅受控真实渲染脚本和host替身，明确实机未测。只一node/python测试进程，先单文件20秒入口，不全import/exec Python scheduler/agent，不改超时/覆盖求绿，不删除新旧临时夹具，不新增未经确认的性能测试。J01宿主Git缺VALUE0/5及CLI默认API项目不符保留为未解决事实，不清GIT变量/改全局配置/重启原窗口求绿。

## U04 排查包审核

2026-11-21最终收包f72d0066：总控已审43项根因及必要消费者，单项目39、仅跨项目4；U04-20、33–36、40–44共10项撤回，原编号/失败/证据保留、不复用。U44为可信数据集的既定保护，不新增部分行映射。U45仅为人工映射写表失败后的同一映射配置恢复缺口，普通JSON先提交、表可重建属既定设计。未读取或修改真实结果、状态，实际损失未知。

统一母集按动作+有意义payload+条件去重共300：界面279（限定结论204、延期75），独立且不与面板重复的VSCode命令21（限定结论7、延期14）；合计211/89。211含旧有效证据和缺陷，不是211全部通过；89仍计未完成，均有精确延期理由，不能把unreviewed=0当完成。实际动态控件实例数未知；291 markup仅定位关联，137 MCP为独立API目录而非按钮。137逐项证据与旧13工具现行契约适用性、普通query子集15/15、队列宿主两payload、报告精确路径及本地GPU/TMUX导航补齐见coverage.g004U04RemainingInventory；未测真实外部仍保留。初包5583aa5c因母集/消费者缺口退回，ac68854e后再纠正12项本地逻辑分类；最终符合本轮受限排查收包门槛，不宣称所有真实环境通过。

## U04 正式三批修复计划

全部39项单项目问题按下表恰好三批实施，同一Terra连续推进。跨项目02/05/06/07保留在本计划但延期，本轮不改、不新扩变体；单项目修复及必要验证完成后由总控再判断双项目阶段，不新增第四修复批凑数。每项触发、原证据及具体验收以coverage.newConfirmedIssues同编号为准；下列修法边界优先。

| 批次/状态 | 问题与完整范围 | 源码/必要消费者 | 小验收与退出条件 |
| --- | --- | --- | --- |
| B1 数据准确性与持久化，授权开始 | 25/26选择保存及旧状态迁移；28/49/50 CSV和长宽表；32空指标；19/21合法特殊键；22中文命名；29/30/31指标排行；45人工映射恢复，共13项 | legacy持久化/映射宿主、Results.legacy、Metrics、FreshResults、ProjectResultTables、LatestResultExport、ResultLayout及其Python对应、CLI metric与受影响消费者 | 迁移失败及同进程重试均保留旧副本，成功才清旧键；CSV引号换行/逗号/转义及正常长宽表、首坏后好、case/model/tag身份不丢；null/空串/bool不转零且合法0保留；特殊键及中文可区分并读回；指标身份维度排除/后行列并集；同映射失败后可恢复配置且不同可信映射不可覆盖。13项定向通过、diff及必要调用方齐、scoped提交push/fetch后进入B2 |
| B2 PLAN及界面反馈，依赖B1 | 12目录取消；13/15/16/17 PLAN筛选/扫描/读取；23空产物入口；24/38保存回执及原文；27半秒配置；37审计失败；39/51空矩阵；46历史清除取消；47模板预览；48归档新鲜证据；52报告；53草稿，共17项 | legacy宿主、PanelHtml.legacy实际生成链、DraftPlans必要边界、CLI plan及相关配置/扫描消费者 | 取消不清草稿或报完成，真实错误保留；ENOENT与EACCES分开；扫描不静默截断且保留既有边界，必要时明确不完整而非冒全量；PLAN正文保留有意义空白，显式空seed/cases含跨行注释均0；10.5读写保持而其他整数项不变；归档本次刷新失败/未刷新不得沿用旧通过，保留合法离线/已确认任务契约；报告精确名称与草稿正常空/非空及读取失败；17项通过并Git同步后进入B3 |
| B3 MCP契约、身份及动作守卫，依赖B2 | 01/08既有同项目守卫；03资源失败；04空指标身份；09重分配状态；10输入契约；11输出身份；14日志级别；18精确实验身份，共9项 | McpHost/Invocation/ProjectGateway必要链、ToolCatalog/ToolResults/ProjectQueries、CLI resource/metric/experiment/artifact/log、legacy相关宿主 | 仅补原await后当前scope/config/grant核验，不重放授权撤销/Agent专项；重分配使用确认后新鲜源状态且保留index0；失败不可变空闲，合法0/空指标与缺结果可区分；公开字段与消费者一致、不静默忽略，不新增未支持参数功能；保留experiment_id并同步嵌套schema；精确ID优先、简称仅唯一，含冒号与Worker/artifact消费者；WARN/WARNING准确。9项通过、Git同步、39项总包完整后交总控最终源审 |

批内按2–3强相关问题/至多8源码测试文档文件组织内部组，每组有关验证和scoped Git同步；这是同三批的内部实现顺序，不另开逻辑批或会话。同文件集中补丁，涉及共享函数按实际受影响消费者组织有界回归，不为凑组重跑有效检查。B1先26的数据完整性，再解析/数值/命名，最后映射恢复；B2先读取/矩阵/原文再反馈，B3先普通MCP/身份再必要动作守卫。执行者自行记录组/批状态、真实提交、失败和未测；计划结构变更归总控，当前精确计划/索引diff准予唯一Git写者带入下个适用提交。批次失败先原范围自主返修，阻塞仅停相关项；新增问题或需要新能力/权限/架构则交总控决定，不自动扩修。

修法共用边界：优先复用既有CSV读取器、数值契约、错误/取消机制及存储队列，不造通用框架/新依赖/状态系统。U26失败后重试不能因内存已有值跳过持久化而清旧键；U21包含当前FreshResults消费者。U22保留已有安全ASCII路径/旧序列化路径读回，Python与TS一致，不迁移删除旧文件、不放过真实碰撞。U32仅修当前共享汇总/导出及必要链，不恢复退役高级UI。U45保持JSON优先与表重建设计，不新增整批回滚、日志或备份体系；可信数据集不可被不同映射覆盖。01/08不减安全授权/精确目标、任务重启等既有契约。禁止真实性能测试、真实外部操作及删除现场。

Terra负责所有定向小验收，先单文件20秒入口；旧合成复现应变为有意义回归，保留正常值/失败/取消/必要消费者。共享helper变化及时补旧AST/VM夹具闭包；原jobTmuxLogNavigation 12/13失败不能被补测3/3改写，若本轮改动影响其依赖，修夹具并定向验证，不削断言/覆盖/超时。每批完成后可直接进入下一批，不索取状态回执；全部三批源包齐才一次交总控：39项修法与结果、实际diff/提交、完整失败退出码、有效回归和89项外部未测边界。总控仅做新增契约/必要跨模块源审及独占缺口，不复跑小验收；通过后才开放集中package/试行发布/一次安装，后续仍待本人Reload，不自动实机或远端部署。

## 0.5.516 最终交付确认

总控核真实回执、提交/远端tag、Release资产、下载副本及本机安装后确认统一交付通过。运行源码及版本/generated提交 `6e3e9421a6f2bb3bdc8af63e39fe6c5431ee4e72` 已FF推送；远端 `v0.5.516` 精确绑定该提交。package回执 `2026-11-21T08-23-22-440Z-42280-package/run.json` 为341/341作业、13/13门禁、exit0，输入起止相同、实际并发峰值1、日志齐、按需未运行0、锁released；42/42源码小验收复用。真实生成Panel的3段script VM通过，src/dist业务10890无匹配。原首轮package失败、补测及闭包路径规范化首次失败保留，不冒全程无失败。

[试行Release v0.5.516](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.516) 为draft=false、prerelease=true，普通Latest仍0.5.483。资产 `simple-experiment-0.5.516.vsix` 2,984,671字节，SHA256 `a19398b5542d382a3606984125f2549d3a0721a86d10b96ecef582fe8861212d`；97字节同名sha清单精确绑定文件名，本机包、远端digest及真实下载副本一致。实际ZIP政策377项，运行闭包326项存在、373项同源字节一致，秘密/缺失/说明违规0；旧独立verify:package-runtime超时未改写为通过。actual ReleaseClient核482可更新至权威483、515/516与SFTP120不降级。

install:latest仅运行一次、exit0；总控只读核实已装SimpleExperiment0.5.516、SimpleSFTP0.2.120及用户npm目录simpleex/simpleex-mcp入口。`simpleex --version`实际exit2，因默认本机API绑定其他项目报API_WORKSPACE_MISMATCH，未擅自改绑定，不冒CLI调用通过。未重载或操作安装后面板，当前Extension Host运行版本未知，新源码实机待本人Developer: Reload Window后验；未查服务器/Worker/SSH/健康/准备/同步/任务，未部署Agent，全部原窗口/稿件/夹具保留。J01宿主Git VALUE_0/5缺失未恢复、准确丢值环节未知；516交付当时按钮分母未建立，20是修复数，U04当前统计见开头。不能把待UI验证或J01写成已解决。

## U03 历史范围与复用

U03已完成配置状态、PLAN草稿、结果产物、MCP本机接口、按钮导航及本机分支功能族的连续查修，20项修复及相关证据见下文历史裁决；原详细范围表保存在Git f72d0066同文件。它是历史检查方向，不是U04未完成待办或数量门槛。当前只实施上述已审39项及必要调用方，不重开历史全功能深查，不继续分支/竞态专项，不恢复退役入口。AI指标/输出映射及科研规则仍由消费项目负责，插件只守本身公开支持契约；不添加科研依赖、统计/结论检查或原始指标本机同步。

## 角色、租约与执行规则

总控兼最终验收：《总控·SimpleExperiment G004 集中查修与交付》01a1fdb5-efe6-78c2-ae6c-861ed4028cdc/local，Sol/high/default，独占计划/README及最终审查。唯一执行者：《执行·SimpleExperiment G004 集中查修与交付》01a1fdb5-ce28-7ba1-b9b5-3470a33e8d00/local，Terra/high/default，独占产品实现、execution/coverage、唯一检查及scoped Git。旧总控01a1fd1a-0035-7722-afae-86870b5205c0、旧执行01a1fd50-2462-7d32-905f-886802dc5d5b释放全部租约、无在途动作、turn完成后已归档。双方模型match/continue已核，计数按caveman真实状态，不把接管时0永久作当前值。当前授权和43项状态见上文，不新建角色/子代理/审查者；局部进度仅记execution，必要消息遵循全局AGENTS。

全局仅一个node/python检查进程，检查冻结含总控文档，不并写受检输入。先单目标 `node --test --test-force-exit --test-timeout 20000 <file>`，20秒未退停止、不重试或改生产超时求绿；Python只提被测函数及import，不全import/exec scheduler/agent，spawnSync≤10000、windowsHide、断言真实status0，禁止Node用python-c长脚本。无新删除许可，夹具保留；既有测试的清理边界另按规则，不能借测试清理用户数据。

U03源审与统一交付已通过；U04当前租约按上述现任分工，不以旧交付收口撤销当前排查租约。后续新界面验收以本人明确重载为前提。PanelHtml本次未改，集中交付仍保留Panel模块及真实生成脚本VM门禁；旧dist不得证明新源码通过。origin固定https://github.com/zlinkw/SimpleExperiment.git，master追踪origin/master；不amend/reset/rebase/merge/force。远端前进、凭据、hook、缺remote等阻断对应Git动作并如实升级，不擅换分支或remote。

## 保护对象及实机边界

唯一专用根 C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f，保持offline_import、低流量开启及configuration-only真实授权；不扩sync/results/experiment/agents，不改共享Worker。仅本机/受控替身，禁止服务器SSH、健康/环境/隔离查询、连接准备、同步、真实任务查询/运行/停止/清理、Agent部署及科研依赖安装。先前只读远端目录批准不是本阶段服务器许可。

保护原MM final.md、Generic Untitled-1、Response to Reviewers.tex等未保存文档；不重载或关闭原窗口、不抢输入。原GPU7、旧任务/结果/日志、远端/root/autodl-tmp/zlk/MultiModal、原Agent精确tmux窗口及隧道均保护。旧验收仓库D:/GitRepo/SimpleMcpAcceptance、拒删cleanup_20261111.txt、全部新旧fixtures/暂存和约60个未跟踪VSIX摘要保留；不stage无关文件、不删除/搬移/自动清理。真实界面只在精确专用项目核身份后操作，不把旧安装界面当新修复通过。

计划上限18000字符、execution12000字符，90%时各自写者一次整体语义压缩，保留当前目标、独有契约、失败/未知/授权/证据，不另造归档或重复报告。coverage沿用docs/windows-entry-coverage.json，不全量重排/重建历史对象。最近三代索引继续；退出日常窗口不等于删除历史文件。

## 已有有效证据与历史裁决

完整原12项/U01/U02计划细节可从Git `4edd1da5:docs/plan-generations/G004-plan.md`恢复；逐项原证据在G004-execution.md及coverage对应对象，保留全部原失败。原G004起点6edbaa64，执行初始a509fc26，原12项为授权/同步、任务日志、异步回执、比较/导出、解析/排行榜、PLAN生成/矩阵、配置重置、重建表。原候选ab77c962实际diff及调用链已审，MCP43/43、experimentPlatform修后15/15等有效。原03远端since=0协议仅末尾最多256KiB，返回offset续读，不冒全文件；本机show完整、tail按lines。正常同项目确认、取消、两个项目隔离及Worker目标变化保留；用户已移除无真实入口的内部args突变测试/structuredClone和isDeepStrictEqual额外防护，不恢复。

原失败：A组旧范围首测0/3含夹具缺vscode，修后3/3并非修订后全项结论；旧experimentPlatform14/15，因固定basename断言与PLAN显式声明契约冲突，仅修测试后15/15。第一次build默认并发2被主动中止exit1；随后BUILD_LOCK_UNSETTLED。本人批准唯一旧process-owner.json精确删除，总控核身份/父目录/进程后完成，没有其他删除授权。后续build首轮windowScopeIsolation夹具缺新上下文方法导致6/7、exit1；补夹具后7/7。统一build `2026-11-21T04-18-18-128Z-69044-build/run.json` 285任务/10门禁通过exit0、起止输入相同、实际最大并发1、锁released，6按需文件未运行不冒通过；首次失败日志 `2026-11-21T04-07-52-212Z-67468-build/`及中止原始记录均保留。以后集中build/package显式max-parallel 1，不改默认、覆盖或超时求绿。

0.5.514试行曾安装一次，但上传sha清单误写60位缺f675，B03失败；实际包2,983,719字节，SHA256 e6f643db488daea13d985a0663c8b9be5011e8e6b24020e35d38c99d75f675a6，版本提交53107d12；历史Release/错误资产不覆盖。独立verify:package-runtime因vsce ls既定30秒ETIMEDOUT exit1，未重试/改时限；等价实际ZIP 377项/325模块、内容策略/README/身份/平台/同源字节核验被接受，失败保留。

修正版0.5.515仅版本及既有生成闭包，源码/tag 5dda9cf240ad6d87915a961d76be8efe2d64c09b，Release https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.515 ，prerelease=true/draft=false/latest=false。package回执 `2026-11-21T04-51-48-484Z-62512-package/run.json` 341任务/13门禁、按需未运行0、exit0、输入一致、实际并发1、锁released。包2,983,720字节，SHA256 8beb78d1663048e9481d386d26c4b25c9b96ed5f2b2f8194ed4bfca9390c76f3；两份97字节清单64位摘要/双空格/精确文件名及本机、真实远端下载包均匹配，验证副本simple_cluster/reports/g004-release-verify-0.5.515保留。普通Latest仍权威0.5.483，真实ReleaseClient确认旧482可更新、515不降级；SFTP安装仍0.2.120。simpleex稳定入口存在，先前version调用API_WORKSPACE_MISMATCH exit1不能当运行版本证明；515后来本人重载并由专用界面核实，513当时重载未知不能倒推。原记录提交4c9f420d，原最终收口f0bf04c5。

U01真实515界面24个本机场景（coverage g004ReloadedUiU01），发现并修复两项：正式/草稿显式cases[]不再计虚假任务；通用失败通知“查看日志”能见完整错误/命令/操作ID，已有PLAN/产物日志不重复。首测0/2 exit1，修后2/2及actionLifecycle11/11 exit0，源码内存转译及实际parser/通知链。提交0eacc46aa665926efb939da4c9b605503ab95734。真实2/101/1三表、映射、搜索/选择、空词条错误和精确文件打开证据复用；新增三个ui_u01_*_515.yaml仅本机合成且从未执行，保留所有文件，不把受控source修复冒已安装界面生效。

U02原28项按J–Q逐项对账（coverage g004U02Reconciliation），不是完整按钮分母。八项真实修复：flow保存错误传播、显式false/解除阻塞、切项目后不误返另一项目流程；draft_validate精确路径、review实际状态、刷新错误不沿用旧draft；归档PLAN参与筛选、MCP公开已有planId/limit/needsChoice及输出。初次测试均有真实exit1（缺少拒绝、true状态错误、路径undefined、状态误报、归档计数0、schema缺字段），另state夹具缺键修正；最终目标29/29 exit0。总控沿真实队列发现flow切项目回执，首测缺少拒绝exit1，修后3/3关联检查exit0，覆盖写成/写失败后切换及同项目成功/失败；原项目写入结果未知不误称成功/失败。源码45739e60/1e97d510/72b63c4f，记录2206a498，返修42149f307a259294b7ad0e6aaf7590c8dc8d10c5，总控收口4edd1da5；均普通push/fetch一致。部分旧断言依赖dist仅证明旧范围。

## Git环境未解决项 J01

旧验收祖先 D:/GitRepo/SimpleMcpAcceptance/acceptance_files/artifacts/git_ui_source_501 与分支同父下git_ui_source_501--codex-ui-acceptance-503，以当前源码只读身份探针分别master dirty、codex/ui-acceptance-503 clean且共同Git目录正确。完整工具环境直接Git及经cmd只读exit0；移除VALUE_0受控复现exit128。

总控对专用实例56788:2026-11-21T05:56:46.995Z先核live capabilities/root，仅projects.registry本机只读查询，verifiedAt=2026-11-21T06:55:31.752Z祖先/分支仍missing config value GIT_CONFIG_VALUE_0，排除旧卡片缓存。精确宿主PID56788环境块仅输出COUNT/存在/空值布尔：COUNT10、KEY_0..9存在，VALUE_0/5缺失，其余非空；工具环境对应两个值存在且为空。父Code进程60564无COUNT，由Explorer62344启动。直接故障已实证为宿主indexed配置不完整（Git规则 https://git-scm.com/docs/git-config），不是仓库损坏；具体哪一窗口启动/传递环节丢空值仍未知。Chromium环境构造会过滤empty仅为机制线索，不冒本机调用栈证明。没有展示或落盘配置值、清空Git变量、修改全局配置、注入运行时或重启受保护窗口；环境尚未恢复、真实卡片未复验。此诊断不计10个产品修复或第11个问题。

## 最终审查与统一交付门槛

U03最终源审结论：08d0e02d修复带冒号实验身份回读及空块式cases/experiments登记，实际diff及必要调用链通过。真实Scheduler索引生产函数独立受控提取验证身份；CLI真实加载/list/detail是另一条源码受控检查，不冒同进程端到端。首次两项0/2、exit1，修后目标5/5及完整actionLifecycle42/42、exit0证据复用，总控未重复执行。最长已知身份匹配复用一次加载，不逐冒号远端探测；无歧义旧简称、同名拒绝、精确Worker/路径及隐式case、null优先保留。两项为必要闭包返修，累计仍20。preview diff真实结构added/removed数组正确，先前怀疑排除。J01宿主Git环境未恢复及丢值环节未知，不计产品问题、不以此阻断独立交付；新包实机、服务器均未测。

原U03以累计20个独立修复收包，已完成，不作为U04数量要求。完整交包继续包含实际入口/问题数量、源码基线/diff、真实失败退出码、有效证据、全部未知/未测/阻塞及租约。总控仅审新增契约/跨模块必要关联和最终身份，不重复有效小验收；缺口回原Terra返修，最终明确通过前不做运行交付。原12项/28项通过不自动覆盖新修改。

统一交付按build-test-delivery和docs/release-delivery.md。当前package profile已经包含compile及build所需测试/gates，授权直接一次 `npm run package -- --max-parallel 1 --cancel-stdin`，复用本轮有效定向证据，不先单独build再无依据重跑同一全量；不改选择、覆盖或超时。冻结前补受影响抽取夹具闭包，最终保留Panel模块及真实生成script VM、src/dist业务10890零命中、真实失败及按需未运行。先核实际远端版本/tag后选未用的新patch，同步package.json/package-lock/runtime，package只构建打包不安装。核实际VSIX身份/版本/平台/闭包/同源字节/秘密排除及精确SHA，普通提交FF push/fetch绑定确定版本后，既有GitHub更新源发布prerelease=true/latest=false的同字节VSIX和精确文件名sha；不能提升0.5.483权威、覆盖tag/历史资产或降级。真实Release身份/资产/下载指纹及更新客户端按原门禁验，不用mock代发行。

全部修改/验证/打包/发行完成，才显式install:latest一次；同版跳过、不force/降级，每目标版最多安装一次。核已装版本/simpleex后停止面板，待本人Reload Window再验新版本界面；不自动更新Worker。源码、生成包、远端试行Release、本机安装、运行重载及真实外部未测分别报告。用户最新目标尚在执行，不以派单、两处修复、对账完、一次检查或CUA子步骤完成结束整轮。

0.5.516统一交付续接裁决：首轮package回执 `2026-11-21T08-06-01-643Z-33540-package/run.json` 实际exit1、340/341通过，唯一失败为旧planOperationNoticeLifecycle断言与已审U01失败日志契约冲突；仅修该测试后单文件22/22、exit0，生产实现未变。已核现有validateReceiptForAssemble仅接受overall=passed、同inputFingerprint、同矩阵及全部逐项通过，首轮只有聚合输入摘要，不能安全证明测试差量组合。总控因此批准原完整package入口再执行一次，生成当前候选的真实可接纳回执，保留首轮失败和定向补测；不伪改回执、不绕过门禁、不为本次交付新增通用恢复框架或跨任务缓存，也不把此次工具限制变成以后仅补测试的默认全量重跑规则。后续仍按实际失败及影响范围判断。
