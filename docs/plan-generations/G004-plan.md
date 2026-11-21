# G004 重要功能、按钮与MCP深查

## 当前目标 U04 全入口排查后分三批修复

2026-11-21用户最新要求：继续排查剩余所有按钮和MCP逻辑，全部排查完毕后制定完整修复计划，拆为3批逐步修复。本阶段继续G004，不新建代次，不以此前20个问题、28项对账、137条旧元数据或341个测试当完整入口分母。基线master=origin/master=9950c4af，0.5.516已试行发布并安装一次，用户尚未确认重载；原20项修复及42/42源测试、341/341与13门禁、发行/包身份等既有有效证据复用，不冒新源码已实机验证。

顺序为完整排查→完整三批修复计划→按三批实施和必要回归→统一交付。排查阶段仅当前源码/既有证据、受控渲染/调用与必要复现测试，不改产品、不build/写dist/递版/打包/安装/发行。所有入口逐项有结论、真实缺陷和必要闭包齐后，执行者一次交完整排查包；总控先核完整性及缺陷证据，再据实际依赖写正式三批计划并授权原唯一执行者连续实施，不需要用户重复说继续。不得先修两处再补剩余排查，不人为凑缺陷数或三批空提交。

入口全集必须来自当前实际代码：默认/可启用面板、辅助审核/授权/确认/恢复页面及菜单的实际按钮producer、data-command/事件postMessage、VSCode package贡献与实际命令注册、PROJECT_TOOLS及MCP/Host/API/CLI必要消费者。按逻辑动作和支持的参数变体去重，保留所有位置、显示条件及同命令不同payload语义；重复数据行实例不当无限入口，不把静态文本/遗留不可达代码算当前按钮。列明母集提取来源、去重规则、别名/条件/退役、真实总数和未覆盖项，核producer→route→host→最终效果闭包，不只数schema和字符串。显式factory opt-in路径按实际支持条件纳入，退役PPT/Hub只验证拒绝或不可达，不恢复。

复用docs/windows-entry-coverage.json当前历史对象，在独立g004U04RemainingInventory对象登记本轮入口和逐项状态/证据，不全量重排历史。将每项标为当前验证通过、有效既证复用、真实缺陷、明确外部未测/阻塞，说明证据基线及边界；每项都须完成必要源码链审查，查完源码不冒已实点/远端效果通过。新缺陷写可达触发、期望/实际、根因、受影响调用方、复现及修后通过标准；正确项保留，无实际依据的理论防御不入修复计划。结果与输出映射由AI通过真实MCP契约配置，不恢复手填必经或自动科研依赖/结论检查。

已覆盖项仅按当前改动是否影响其契约判断复用；剩余全部入口逐项核schema/参数传递、权限和确认、项目/对象/操作身份、成功/失败/取消终态与错误可见性、空值/零/false等支持输入和必要消费者。不扩为大并发/性能测试或内部args任意突变，个人单机最多两项目；不因问题罕见漏掉支持接口可达问题，也不因局部外部阻塞停止独立逻辑排查。

排查完成门槛：当前母集中的每项均有完整本机/受控逻辑结论或明确未测原因，历史有效证据与新证据对应，所有确认缺陷及相关消费者整理齐，无仍未检查的本地逻辑入口；总控可据此一次制定完整3批计划。三批按真实功能依赖和同文件集中修改组织，每项指定范围/保护区/负责人/验证/退出条件；批次是修复组织方式，不新开角色、会话或代次。用户要求3批不授权造新功能、修正确项、放宽测试或真实服务器动作。每批完成相关验证与scoped Git同步，最终集中构建/试行发行/安装按原交付规则，避免每小批重复打包安装。

总控独占G004计划/索引及最终审查，唯一Terra负责完整排查、复现、小验收、execution和本轮coverage。原Terra01a1e793-a4a0-7630-8157-24c920746d1a在本轮启动实核自然接替条件已到（10次压缩、第五次后300094、rotation_due），当前仅做完整同角色交班，不业务写入；接替者先核真实模型/强度/default/turn、完整背景和租约后，由总控派单。原两角色及共享背景一次读取硬门控不变，不新增并行审查者；新旧身份与释放事实由实际工具回执补入本段。消息与合法角色空闲遵循最新全局AGENTS事件规则。

保护与执行边界继续下文：不查任何真实服务器/Worker/SSH/健康/准备/同步/任务，不部署Agent、不改共享Worker或扩大AI授权；旧验收仓库只读，全部夹具和拒删文件保留；保护原稿/未保存文档/窗口、GPU7产物及tmux隧道，不自动重载或抢输入。新UI实机须本人先确认Reload Window，未确认时仅受控真实渲染脚本和host替身，明确实机未测。只一node/python测试进程，先单文件20秒入口，不全import/exec Python scheduler/agent，不改超时/覆盖求绿，不删除新旧临时夹具，不新增未经确认的性能测试。J01宿主Git缺VALUE0/5及CLI默认API项目不符保留为未解决事实，不清GIT变量/改全局配置/重启原窗口求绿。

## 0.5.516 最终交付确认

总控核真实回执、提交/远端tag、Release资产、下载副本及本机安装后确认统一交付通过。运行源码及版本/generated提交 `6e3e9421a6f2bb3bdc8af63e39fe6c5431ee4e72` 已FF推送；远端 `v0.5.516` 精确绑定该提交。package回执 `2026-11-21T08-23-22-440Z-42280-package/run.json` 为341/341作业、13/13门禁、exit0，输入起止相同、实际并发峰值1、日志齐、按需未运行0、锁released；42/42源码小验收复用。真实生成Panel的3段script VM通过，src/dist业务10890无匹配。原首轮package失败、补测及闭包路径规范化首次失败保留，不冒全程无失败。

[试行Release v0.5.516](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.516) 为draft=false、prerelease=true，普通Latest仍0.5.483。资产 `simple-experiment-0.5.516.vsix` 2,984,671字节，SHA256 `a19398b5542d382a3606984125f2549d3a0721a86d10b96ecef582fe8861212d`；97字节同名sha清单精确绑定文件名，本机包、远端digest及真实下载副本一致。实际ZIP政策377项，运行闭包326项存在、373项同源字节一致，秘密/缺失/说明违规0；旧独立verify:package-runtime超时未改写为通过。actual ReleaseClient核482可更新至权威483、515/516与SFTP120不降级。

install:latest仅运行一次、exit0；总控只读核实已装SimpleExperiment0.5.516、SimpleSFTP0.2.120及用户npm目录simpleex/simpleex-mcp入口。`simpleex --version`实际exit2，因默认本机API绑定其他项目报API_WORKSPACE_MISMATCH，未擅自改绑定，不冒CLI调用通过。未重载或操作安装后面板，当前Extension Host运行版本未知，新源码实机待本人Developer: Reload Window后验；未查服务器/Worker/SSH/健康/准备/同步/任务，未部署Agent，全部原窗口/稿件/夹具保留。J01宿主Git VALUE_0/5缺失未恢复、准确丢值环节未知；按钮总分母未建立，20是修复数。安装后重载是当前必要用户动作，不能把待UI验证或J01写成已解决。

## U03 连续查修范围

下表是连续深查的功能族及优先入口，不是固定检查分母或认定已有缺陷。先看当前源码、既有测试和真实支持契约，再从入口复现，确认后集中修复。同族正常输入、失败、取消、项目切换及必要消费者直接纳入；不同功能族发现的真实问题统一进execution，不能因暂未到20或一个局部阻塞停下其他可做项。检查广度不以表内项目数封顶。

| 组 | 重点功能与可达缺口 | 实现及验证范围 |
| --- | --- | --- |
| R 配置与状态 | configuration_list/get/set/reset、state_keys/value/set/reset的真实schema/host/读回；配置scope、JSON类型、取消/写失败、两项目正常切换后回执与摘要；AI指标/输出映射保留用户声明 | src/mcp、src/extension/McpHost、legacy.ts配置/状态及既有保存模块；受控store/VSCode，不改真实全局Worker、安全授权或消费项目。U02只读键/取消和G004原reset已有覆盖直接复用；重点补实际写链，不造内部args任意突变 |
| S PLAN与草稿 | PLAN构建/解析/摘要/矩阵/校验/草稿的真实支持输入是否一致；显式空列表、0、字符串标量、别名、具名/无名case、保存/打开/选择/归类回执；draft_reject、promotionPreview等尚未充分检查的真实入口 | PlanBuilder/DraftPlans/ApiWorkflow及host/CLI/对应UI；纯合成文本和受控FS，必要Scheduler函数只提取不完整import，不运行任务。先核支持承诺，不凭可构造YAML扩成新解析器或猜seed。U01空cases、U02草稿精确身份及flow证据复用 |
| T 结果与产物 | 收集/解析/结果摘要/列映射/目录与表格导航/拆表/比较导出之间的数据身份；合法零/负值、维度、特殊文本/路径、真实解析错误、空结果/旧结果、数据源切换及失败恢复；指标方向沿用户声明 | src/results、features/Results/Metrics、ResultCollectionHost、CLI结果/产物命令及必要host/UI。受控RPC/FS/合成文件；不真实查询Worker、不把原始指标写本机、不新增科研统计检查。补实际入口调用，不把已有200行/101项及515旧结果证据再刷一遍 |
| V MCP与本机接口 | ToolCatalog→Invocation/ProjectGateway→McpHost/查询共享CLI→ToolResults/SDK实际参数与输出；缺省/显式可选参数、精确ID、失败和取消、异步回执、只读与写权限、CLI项目绑定；SFTP桥接仅软件替身 | src/mcp、api、cli及必要extension模块；以当前源码验证，不把schema存在当实际调用通过。合理检查所有现存重要公开方法的未覆盖分支，含task/operation/日志/产物的输入路由；不真实连接、传输、派发、停止、清理或升级 |
| W 重要按钮与项目导航 | 当前PLAN、结果、任务/操作、报告日志、设置和资源树的真实按钮路由、禁用原因、参数身份、取消/失败终态、旧对象/项目切换后的动作；移除功能残留只查实际可见设置/入口 | 现有PanelHtml/PanelWebview/UI动作与host必要链；优先受控真实渲染脚本/方法，不伪造已安装515包含新源码。无对象的真实外部效果明示未测。Panel模板变更保留转义与最终build/实际脚本VM门禁 |
| X 本机分支项目 | worktree/祖先/分支精确身份、含codex/等合法嵌套分支名、选择/打开/失败反馈、实际读取与登记/创建预览调用链；Git环境缺值故障保持独立诊断 | src/project及host分支入口、现有project测试。旧验收仓库只读，Git写入只用可保留的独立合成夹具且按既有授权边界；不操作真实分支/PR，不改Git全局配置或清空GIT_*求绿。候选listWorktrees使用basename会丢嵌套分支前缀，须核真实消费者及复现后才计缺陷 |

以上源码/测试闭包允许原Terra按实际必要调用方处理；超出这些插件功能族、改变架构或增加新用户能力才升级总控修范围。优先影响实验整体流程的问题，再处理准确反馈和按钮一致性；不以20目标扩大到高并发、多租户、压力/性能测试、通用防御框架或无实际用途的清理。新增性能测试须另有用户明确需求；当前不新增。

每个内部组至多2–3强相关问题/8源码测试文档文件，generated dist不计。整份任务由同一Terra连续完成多个内部组，不每组交包/等待/构建；同一文件先汇总该阶段已知改动尽量一次补丁，不能逐处微改。execution维护真实问题清单（每项：入口、症状/契约、根因、修复、首次失败/验证、必要调用方及状态），明确U03新增数和未打包累计数；仅有怀疑或诊断不计已修复。

尚不足20时继续上述重要功能族的正常可达输入及尚未解决调用链，不以固定20/28个检查项对账完结束。若最终所有当前范围已穷尽仍不足，先给可核实的覆盖、实际数量、剩余可执行性和阻断，不制造缺陷或抢先构建，不自动停止在普通局部未知。部分阻塞只暂停相关入口。

## 角色、租约与执行规则

总控兼最终验收：《G004 总控接替与集中交付》01a1fd1a-0035-7722-afae-86870b5205c0/local，Sol/high/default，独占本计划、README索引及最终审查。旧总控01a1e412-ead7-7710-acd7-c475abb8b41a自然接替条件已实证，明确释放全部租约且无在途动作；新总控已读完整交班和原材料，模型/强度/default及实际turn实核match、continue，新chat压缩计数0。唯一执行者：《G003 Terra 接续执行》01a1e793-a4a0-7630-8157-24c920746d1a/local，Terra/high/default，已完成U03及闭包返修、统一交付，并将产品/测试、G004-execution.md、新coverage对象、唯一检查、scoped Git及发行安装租约交回总控；当前无在途动作，等待本人重载。不新建角色/子代理/审查者。接续只按caveman真实触发，不因阶段或按钮换聊天。必要消息与等待遵循当前全局AGENTS事件协调规则；普通局部进度仅记execution。

全局仅一个node/python检查进程，检查冻结含总控文档，不并写受检输入。先单目标 `node --test --test-force-exit --test-timeout 20000 <file>`，20秒未退停止、不重试或改生产超时求绿；Python只提被测函数及import，不全import/exec scheduler/agent，spawnSync≤10000、windowsHide、断言真实status0，禁止Node用python-c长脚本。无新删除许可，夹具保留；既有测试的清理边界另按规则，不能借测试清理用户数据。

源审与统一交付已通过；全部租约已由Terra交回总控，当前无在途动作。后续新界面验收以本人明确重载为前提。PanelHtml本次未改，集中交付仍保留Panel模块及真实生成脚本VM门禁；旧dist不得证明新源码通过。origin固定https://github.com/zlinkw/SimpleExperiment.git，master追踪origin/master；不amend/reset/rebase/merge/force。远端前进、凭据、hook、缺remote等阻断对应Git动作并如实升级，不擅换分支或remote。

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

唯一Terra连续完成U03真实查修及小验收，达到未打包累计至少20个独立已修问题且必要调用方/回归齐后，一次整包交总控：实际入口及问题清单/数量、源码基线/真实diff、失败及退出码、有效证据、全部未知/未测/阻塞、生成物差异与租约。总控仅审新增契约/跨模块必要关联和最终身份，不重复有效小验收；发现缺口详细回原Terra返修，未经最终明确通过不做运行交付。原12项/28项通过不自动覆盖新修改。

统一交付按build-test-delivery和docs/release-delivery.md。当前package profile已经包含compile及build所需测试/gates，授权直接一次 `npm run package -- --max-parallel 1 --cancel-stdin`，复用本轮有效定向证据，不先单独build再无依据重跑同一全量；不改选择、覆盖或超时。冻结前补受影响抽取夹具闭包，最终保留Panel模块及真实生成script VM、src/dist业务10890零命中、真实失败及按需未运行。先核实际远端版本/tag后选未用的新patch，同步package.json/package-lock/runtime，package只构建打包不安装。核实际VSIX身份/版本/平台/闭包/同源字节/秘密排除及精确SHA，普通提交FF push/fetch绑定确定版本后，既有GitHub更新源发布prerelease=true/latest=false的同字节VSIX和精确文件名sha；不能提升0.5.483权威、覆盖tag/历史资产或降级。真实Release身份/资产/下载指纹及更新客户端按原门禁验，不用mock代发行。

全部修改/验证/打包/发行完成，才显式install:latest一次；同版跳过、不force/降级，每目标版最多安装一次。核已装版本/simpleex后停止面板，待本人Reload Window再验新版本界面；不自动更新Worker。源码、生成包、远端试行Release、本机安装、运行重载及真实外部未测分别报告。用户最新目标尚在执行，不以派单、两处修复、对账完、一次检查或CUA子步骤完成结束整轮。

0.5.516统一交付续接裁决：首轮package回执 `2026-11-21T08-06-01-643Z-33540-package/run.json` 实际exit1、340/341通过，唯一失败为旧planOperationNoticeLifecycle断言与已审U01失败日志契约冲突；仅修该测试后单文件22/22、exit0，生产实现未变。已核现有validateReceiptForAssemble仅接受overall=passed、同inputFingerprint、同矩阵及全部逐项通过，首轮只有聚合输入摘要，不能安全证明测试差量组合。总控因此批准原完整package入口再执行一次，生成当前候选的真实可接纳回执，保留首轮失败和定向补测；不伪改回执、不绕过门禁、不为本次交付新增通用恢复框架或跨任务缓存，也不把此次工具限制变成以后仅补测试的默认全量重跑规则。后续仍按实际失败及影响范围判断。
