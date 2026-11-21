# G004 重要功能、按钮与MCP深查

## 当前目标 U03

2026-11-21用户最新要求继续深查，不能仅对账20项，须尽可能扩大有效排查，至少找够20个真实问题并统一修改后再构建安装。当前待集中交付已有U01两处、U02八处，共10个经验证的真实修复；本阶段继续找出并修复至少10个新的独立问题，使本次未打包源码累计至少20处。检查数、测试断言、文件数、同根因的多个位置不计成问题数；Git环境诊断不计产品修复。正确项保留，不能造问题、放宽原语义或以重复断言凑数。达到20后仍完成已识别的必要调用方与回归，再统一交付。

U03起点master=origin/master=4edd1da5d057530654e603c3f3c3860799bd45b9，跟踪文件干净，515已安装且本人重载；U01/U02源码尚未进入安装包。原28项对账只是有效阶段证据，不是插件完整分母，不把对账完或再次修两处当本轮终点。用户此次明确要求连续实施及达标后集中构建安装，取代此前先汇报后停的临时终点。总控留在本任务跟进整包、审查及交付，不用派单回执结束本轮。

目标限定个人日常使用、单电脑最多两个项目；只查插件按钮、MCP/API/CLI及必要本机或受控调用链，不查服务器。任务指标与输出接入由AI据真实任务通过MCP配置，不恢复手填必经、PPT/Hub或自动科研依赖/结果结论检查。既有证据按当前改动是否影响判断复用，不机械重跑28项、137工具元数据或341任务。

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

总控兼最终验收：《项目总控与长期规划 · C方案接替》01a1e412-ead7-7710-acd7-c475abb8b41a/local，Sol/high/default，独占本计划、README索引及最终审查。唯一执行者：《G003 Terra 接续执行》01a1e793-a4a0-7630-8157-24c920746d1a/local，Terra/high/default，接回产品/测试、G004-execution.md、新coverage对象、唯一检查及scoped Git；不新建角色/子代理/审查者。接续只按caveman真实触发，不因阶段或按钮换聊天。普通局部进度仅记execution，必要交包/阻塞/最终结论真实工具传递；遵循用户最新“按实质变化汇报”，不因等待或时间经过发重复状态/估时。

全局仅一个node/python检查进程，检查冻结含总控文档，不并写受检输入。先单目标 `node --test --test-force-exit --test-timeout 20000 <file>`，20秒未退停止、不重试或改生产超时求绿；Python只提被测函数及import，不全import/exec scheduler/agent，spawnSync≤10000、windowsHide、断言真实status0，禁止Node用python-c长脚本。无新删除许可，夹具保留；既有测试的清理边界另按规则，不能借测试清理用户数据。

达标且所有已识别必修、定向小验收就绪前，禁止build/tsc写dist/package/递版本/安装/发行。允许既有源码内存转译/函数提取及受控入口；旧dist不得证明新源码通过。PanelHtml若改，最终build及真实生成脚本VM仍为提交该组必需门禁；集中构建前该组不冒验证成功或提交，其余已过源码组可scoped普通commit/push/fetch。origin固定https://github.com/zlinkw/SimpleExperiment.git，master追踪origin/master；不amend/reset/rebase/merge/force。远端前进、凭据、hook、缺remote等阻断对应Git动作并如实升级，不擅换分支或remote。

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

唯一Terra连续完成U03真实查修及小验收，达到未打包累计至少20个独立已修问题且必要调用方/回归齐后，一次整包交总控：实际入口及问题清单/数量、源码基线/真实diff、失败及退出码、有效证据、全部未知/未测/阻塞、生成物差异与租约。总控仅审新增契约/跨模块必要关联和最终身份，不重复有效小验收；发现缺口详细回原Terra返修，未经最终明确通过不做运行交付。原12项/28项通过不自动覆盖新修改。

达标及源审通过后按build-test-delivery和docs/release-delivery.md，统一最小必要消费者回归与 `npm run build -- --max-parallel 1 --cancel-stdin`、Panel模块及真实生成script VM、src/dist业务10890零命中；保留真实失败及按需未运行。同步package.json/package-lock/runtime递一补丁，显式package只构建打包、不安装。核实际VSIX身份/版本/平台/闭包/同源字节/秘密排除及精确SHA，普通提交FF push/fetch绑定确定版本后，既有GitHub更新源发布prerelease=true/latest=false的同字节VSIX和精确文件名sha；不能提升0.5.483权威、覆盖tag/历史资产或降级。真实Release身份/资产/下载指纹及更新客户端按原门禁验，不用mock代发行。

全部修改/验证/打包/发行完成，才显式install:latest一次；同版跳过、不force/降级，每目标版最多安装一次。核已装版本/simpleex后停止面板，待本人Reload Window再验新版本界面；不自动更新Worker。源码、生成包、远端试行Release、本机安装、运行重载及真实外部未测分别报告。用户最新目标尚在执行，不以派单、两处修复、对账完、一次检查或CUA子步骤完成结束整轮。
