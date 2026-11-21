# G004 重要功能、按钮与MCP深查

## 目标与当前状态

2026-11-20用户在G003核心排查及0.5.513试行交付后，要求继续排查较重要且尚未排查或解决的功能、按钮与MCP，并明确“至少10项一次性查清和完善后再构建和安装新版本”。本代固定12项，保留G003通过及真实未测边界。初始基线6edbaa64ff92a534a7b153382dede56e383cb8dc；0.5.513已安装、本人重载未知。

2026-11-21当前：原12项及0.5.515试行交付通过，已本人重载；随后U01两处、U02八处真实源码修复完成并通过适用定向检查，合计10处未进入新包。U02的28项逐项对账已完成；Git直接故障已定位为实际扩展宿主缺失indexed配置值，环境未恢复，准确丢失环节仍未知。统一构建、安装和新版本界面复验依用户要求暂缓，不将受控检查冒实机通过；真实Worker未测或更新。原候选ab77c96261b2b81a66e253c8308b2c3601bd74d8的实际diff及必要调用链已审，复用MCP43/43、experimentPlatform修后15/15和各项证据，不重复小验收。原统一build回执2026-11-21T04-18-18-128Z-69044-build/run.json为285任务/10门禁通过、exit0、起止输入相同、实际最大并发1、锁released；该阶段6按需文件未运行，不冒通过。原始失败、中止及本人批准精确旧锁删除保留execution。

集中交付发现0.5.514校验清单误写60位摘要，B03发行验收失败；原Release、错误清单及该版单次安装事实保留，未覆盖历史资产。必要修正版0.5.515仅递版本和既有生成闭包，源码/tag提交5dda9cf240ad6d87915a961d76be8efe2d64c09b。最终package回执2026-11-21T04-51-48-484Z-62512-package/run.json为341任务/13门禁全通过、exit0、按需未运行0、起止输入相同、实际最大并发1、锁released。实际ZIP身份/平台/内容策略、325模块闭包及同源字节验证通过；0.5.514独立verify:package-runtime因vsce ls既定30秒超时exit1，等价实际ZIP验证获总控接受，失败记录保留且未改时限。

总控B03实际重算本机包与已真实下载的两个远端资产：0.5.515包均2,983,720字节，SHA256为8beb78d1663048e9481d386d26c4b25c9b96ed5f2b2f8194ed4bfca9390c76f3；清单均97字节、64位摘要/双空格/精确文件名且与包相符。真实Release/tag绑定上述源码，prerelease=true、draft=false；普通Latest仍0.5.483，实际ReleaseClient确认旧版可更新、0.5.515不降级。VS Code已列出0.5.515、SimpleSFTP仍0.2.120，simpleex稳定入口存在；先前版本查询因API_WORKSPACE_MISMATCH拒绝exit1，不冒Extension Host已重载。执行及覆盖记录提交4c9f420d71bc3f96105741897acea364e896287e，最终状态另按本轮普通提交保存。仅本轮12项结论闭合，不代表全插件全部实机效果；单机最多两个项目和远端首读尾段边界保持，不开新批次，不改服务器/任务/消费项目。

只查真实支持的调用和输入。优先证明下表新增场景是否已由现有断言覆盖；有效证据直接复用，不能重复341检查或逐按钮刷数。每项记录入口、既有证据、新场景、实际结论和真实未测；正确则通过，不为凑12个修复制造改动。源码可疑处只是候选，不冒已复现。任务指标仍由AI据事实经MCP配置；不恢复手填必经、退役PPT/Hub或自动科研检查。

2026-11-20追加范围裁决：单台电脑最多两个项目，限定个人日常使用；不新增多项目/高并发矩阵、压测、锁队列或规模化架构。用户要求将超范围待修点移出并补新项：已定位approve替身任意修改内部args的断言及structuredClone/isDeepStrictEqual参数防护无真实入口依据，移出本轮并由原Terra撤回对应未提交改动；不删除整个文件或回滚其他改动。原03的正常确认/取消与两个项目切换归入01，新增03为MCP任务日志读取及游标续读，仍为12个独立功能检查。正常撤权、已选Worker目标变化及双项目隔离保留，不扩为理论竞态系统；既有历史测试不借此擅自退役。A组曾首次0/3（含夹具缺vscode），修后3/3只是旧范围阶段证据，移除超范围断言后按受影响目标核对，不能冒修订后全部通过。

计划预算18000字符，执行登记12000字符；到90%由各自写者整体语义归并，保留失败/授权/未知/原证据，不碎削或新建报告。原覆盖记录继续docs/windows-entry-coverage.json，本代仅追加独立G004对象，不重建旧记录。G001已交付，无活动/待决/在途交接，退出索引最近三代窗口；文件及原证据全部保留，不删除或搬移。

## 十二项检查与验收

| 项 | 真实入口及新增检查重点 | 通过标准 |
| --- | --- | --- |
| 01 AI授权及设置确认按钮 | manageAiAuthorization命令/卡片授权撤销及MCP设置确认，日常两个项目间切换、取消、空Worker和选中Worker变化 | 不把旧项目意图保存到新项目；取消零写，现有scope及选中对象准确；仅受控窗口与store，不假设内部args被任意突变 |
| 02 MCP同步授权 | ProjectGateway→McpHost的upload.files/upload.workspace/Worker互传；目录/manifest异步准备期间撤权或Worker身份变化 | 最终调用仍绑定原授权项目及精确源/目标；拒绝后零传输，不把旧确认用于新目标；正常同一目标可用 |
| 03 MCP任务日志读取 | log_read→live.output和experiment_log→CLI logShow/logTail/logRecordsForExperiment；精确Worker/runKey、since字节游标、用户指定lines、本机完整日志、远端尾段、空日志与真实错误 | 空响应不得回退其他任务缓存；原游标在空logs时仍可返回/发现/校验。显式日志查询不吞真实远端错误，本机show不无声截为200行，tail按用户行数；共享概览的既有可选读取契约不随之改坏。远端since=0仅首读末尾最多256 KiB，明确告知尾段及续读边界，不能声称全文件。单任务正常交互/受控RPC，不造高并发或自动轮询 |
| 04 异步MCP回执 | LONG_TOOLS→ProjectMcpOperations→operation_get及SDK结构化结果；嵌套原生操作、失败、返回未知、重载后结果不可用 | 请求收执与真实任务完成分清，原错误/结果不丢；不误报成功，不重复派发，不把已清记录复活或跨项目返回 |
| 05 结果比较方向 | MCP result_compare→CLI compareCommand；同名指标升降、RMSE等已知方向、无共同指标、同值、非数值 | 数值差与改善/退步含义正确；优先既有显式方向契约，不为未知任务推定主指标；保留缺行已有reason及精确ID歧义契约 |
| 06 精确结果导出 | MCP result_show/export与CLI resultExport；多维同行、特殊CSV字符、零/负值/小数及完整指标 | 同一精确ID的JSON/CSV与原值/维度对应，不串seed/PLAN、截断或本机落原始指标；已有200行完整查询证据复用 |
| 07 MCP文件解析 | result_parse及preset参数、项目内文件/链接归属、列映射/AP与AUPRC/macro与weighted、无效preset | 参数真正生效或明确错误，不因未知preset静默套错默认；合法项目内输入正常，结果维度和指标保持独立 |
| 08 指标排行榜 | metric_leaderboard→metricLeaderboard/buildLeaderboard；显式primary、低优指标、缺失值、跨run分组 | 用户已声明指标及支持的方向规则正确应用，缺失不冒零/冠军；与同输入解析结果一致，不新增科研统计/性能测试 |
| 09 MCP PLAN生成 | plan_build→planBuild/buildExperimentMatrix；显式seeds空值/重复/非整数格式的既有支持承诺、suite/base | 输入被准确表达或在负责边界报错，不无声改成默认seed或保存/运行；不自行选择实验seed数量 |
| 10 MCP PLAN矩阵 | plan_matrix→planMatrix/expandPlanMatrix；现有支持的case/seed/变量组合、过滤与稀疏项 | 预览计数和身份与实际支持PLAN展开契约一致；不将简化case×seed冒完整矩阵；纯本机合成，不派发 |
| 11 配置重置及读回 | configuration_reset/get→apiConfigReset；projectAdapterRules与普通项目/全局共享配置，取消/中途换项目、保存失败 | 合法scope保持，reset后get及面板摘要反映实际继承值；不得清另一项目/全局Worker设置或隐式改PLAN归类；真实store替身 |
| 12 重建结果表按钮 | rebuildProjectResultTablesFromUi→ResultCollectionHost/ProjectResultTables；当前与历史summary、已选PLAN/数据集、工作区变化及写入失败 | 按当前声明重建对应表，旧summary不冒实时，错误可见，目标及指标归属不串；仅新Temp合成文件，不覆盖用户表 |

01–02现有真实修复及超范围撤回先收口，03–06紧随，07–12连续完成；12项是不同用户行为/语义，不把同一测试的多个断言拆成12项。发现已有覆盖充分就引用通过，新增检查只补具体缺口。涉及清理的旧正常链仅复用，不设计/执行新删除逻辑。

## 唯一角色、文件与内部批次

总控兼最终验收仍为《项目总控与长期规划 · C方案接替》01a1e412-ead7-7710-acd7-c475abb8b41a/local，Sol/high/default，独占本计划、代次索引、最终结论；唯一Terra沿用《G003 Terra 接续执行》01a1e793-a4a0-7630-8157-24c920746d1a/local，Terra/high/default，负责整份实现、小验收、G004-execution.md、覆盖明细及scoped Git。不新建会话/子代理/审查者；接续仅按全局caveman真实触发。总控常态空闲，收到整份交包后独占大验收，不重复小验收。

每个内部批次至多2–3个强相关问题、8个源码/文档/测试文件，生成dist不计。下表是允许修改闭包，不要求所有文件均改；每次变更execution计入8文件。同一文件先汇总已知同阶段改动再一次写回；多个内部组连续工作，全部12项齐之前不为组间切换build/package/install。需要编译供定向检查时复用既有能力做必要增量，不用旧dist测试新源码，不改时限/覆盖求绿。

| 内部组 | 项 | 允许的源码/测试，另含execution；coverage集中最后记 |
| --- | --- | --- |
| A | 01–02 | src/mcp/ProjectGateway.ts、src/mcp/Invocation.ts、src/mcp/ProjectAuthorization.ts、src/extension/McpHost.ts、test/features/mcpProject.test.js、test/features/projectWorkspaceChangeIsolation.test.js |
| H | 03 | src/cli/commands/experiment.ts、src/cli/commands/log.ts、src/mcp/ToolCatalog.ts、src/mcp/ToolResults.ts、src/extension/legacy.ts、test/features/mcpProject.test.js、test/cli/simpleCli.test.js |
| B | 04 | src/mcp/ProjectOperations.ts、src/mcp/ToolResults.ts、src/mcp/Server.ts、test/features/mcpProject.test.js |
| C | 05–06 | src/cli/commands/compare.ts、src/cli/commands/metric.ts、src/cli/commands/result.ts、src/mcp/ProjectQueries.ts、test/cli/simpleCli.test.js、test/features/mcpProject.test.js |
| D | 07–08 | src/features/Metrics.ts、src/features/Results.legacy.ts、src/cli/commands/result.ts、src/cli/commands/metric.ts、src/mcp/ProjectQueries.ts、test/features/mcpProject.test.js、test/cli/simpleCli.test.js |
| E | 09–10 | src/cli/commands/plan.ts、src/features/PlanBuilder.legacy.ts、src/mcp/ProjectQueries.ts、src/mcp/ToolCatalog.ts、test/features/mcpProject.test.js、test/cli/simpleCli.test.js、test/experimentPlatform.test.js |
| F | 11 | src/features/ApiWorkflow.legacy.ts、src/extension/legacy.ts、test/features/mcpProject.test.js、test/features/projectWorkspaceChangeIsolation.test.js |
| G | 12 | src/extension/legacy.ts、src/extension/ResultCollectionHost.ts、src/results/ProjectResultTables.ts、test/features/projectResultTables.test.js、test/features/datasetResultCatalog.test.js、test/features/metricAliasRebuildWorkflow.test.js |

先读实际必要消费者。若真实修复需要未列文件/新公开接口或突破8文件，汇总同根因全部缺口一次升级总控修订，继续不依赖部分；不逐方法索计划，也不能擅扩同步/调度架构。真实新缺陷连同原失败保留，不因G003通过压掉，也不把偏好/假想未来变成必修。

03边界修订：真实共享函数recentLogsFor/logRecordsForExperiment位于experiment.ts，纳入H；ProjectQueries.ts仅沿现有参数路由读取，本组不修改。ToolResults.ts保留，用于空logs时顶层offset的实际输出契约，ToolCatalog.ts可准确说明远端尾段语义。现有Worker /api/live-output自since=0读取文件末尾最多256 KiB（src/clusterAgentRuntime.legacy.ts原实现）是当前真实协议边界，本轮不改Agent、不升级部署、不擅调上限；用当前响应可证明的信息披露范围，不编造总行数/完整标记，不自动追加无限请求。远端尾段/增量、显式tail和本机完整show分别验证；复用已完成的空日志修复1/1阶段证据，新增函数消费者按实际影响定向核验，不重复整仓检查。

统一回归裁定：experimentPlatform.test.js首次14/15、exit1，失败旧断言以2026-09固定basename排除expectedResults明确声明的classification_report.json及output.out；当前解析器未因本代更改该行为，现行精确声明契约及resultCandidateMetadataExclusion.test.js均支持任意项目相对合法结果路径。只更新该对象式声明测试的旧说明/标签及三条精确路径预期，保留命令信号、note不作为结果、元数据和越界拒绝覆盖，不恢复生产basename限制、不删测试。E组加此文件后连execution共8文件。先完整单文件按原20秒门禁重验；仅测试修正不重编，其他适用消费者证据复用。首次统一npm run build因默认maxParallel=2与本项目单测试进程P0冲突主动中止、exit1，前8编译/语法门禁和前9exclusive测试通过只记实际阶段；不是build通过。目标文件修正通过后，集中构建必须显式npm run build -- --max-parallel 1，不改执行器默认值、超时或覆盖以处理本次命令参数问题；原始失败与中止日志保留execution。

## 保护与检查

仅插件逻辑，本轮不查服务器健康/环境/隔离、不调用真实Worker写入/派发/停止/清理，不升级远端Agent，不改现有项目/任务/共享Worker配置/安全授权。专用Temp simpleex-normal-ui-g003-20261116-a7c39e2f及最小新合成夹具可沿用既有范围；未经本人明确授权不扩大真实MCP写权限，configuration-only授权不当作sync/results/experiment/agents。支持方法与受控VSCode/store/RPC替身验证可正常推进，不以实机权限不足阻塞软件检查。

原MM final.md、Generic Untitled-1未保存稿、GPU7及旧任务/产物/日志、原远端/root/autodl-tmp/zlk/MultiModal、精确Agent tmux窗口和旧隧道均保护。不重载原窗口、不抢用户输入；0.5.513重载未知不冒已生效。实际UI如确需只在独立源码宿主并核身份，不能用旧安装界面当新候选。所有旧文件、新测试暂存/fixtures/约60个VSIX摘要保留，不新删除、不自动清理；需要整文件删除另走精确安全规则。

全局一个node/python检查者，Terra独占检查/生成和受检输入冻结（含总控文档）。先单目标node --test --test-force-exit --test-timeout 20000，20秒未退停报不重试；Python只提被测函数，spawnSync≤10000、windowsHide并断言真实status0，不全import scheduler/agent。无性能用例/压力阈值，不调整既有超时、覆盖或退役。必要错误边界测试是受控软件场景，不向实际项目注入故障。原build-test-delivery适用，真实首次失败和原日志保留。

12项全部完成且已识别必修问题解决后统一目标消费者/显式npm run build -- --max-parallel 1、Panel模块及实际生成script VM、10890业务零命中；复用仍有效检查，不机械重复341或额外包后冒烟。仅测试/记录变化不打包或递运行版本。内部validated scope可普通commit/push/fetch，不因Git拆组重build；仅暂存本组已验证文件，不混runtime输出、秘密、无关摘要。origin仍https://github.com/zlinkw/SimpleExperiment.git、master追踪origin/master；不force/rebase/merge/amend，远端前进/凭据/hook阻断明确上报。

## 最终验收与集中交付

### 2026-11-21连续查修 U02（当前活动目标）

用户最新明确要求继续剩余重要按钮及MCP、查清分支卡本机Git报错，不能修两处就停；先集中完成能查能修的内容，尽量累计20个以上真实修改点后再统一构建安装，不检查服务器。此决定取代U01局部收口后的“无新任务派发”，不撤销其有效证据。起点master=origin/master=0eacc46aa665926efb939da4c9b605503ab95734，跟踪文件干净；515已重载，U01两项源码修复未进入已安装包。检查项、断言数和真实修改点分别计数，不能以重述同一根因或制造问题凑20。

沿用唯一Terra连续执行整份任务，不逐组交包或等待本人再次说继续。先对当前入口及既有证据作定向对账，以下正常支持的功能族逐一得出有依据的结论；已充分覆盖的场景复用，新缺口从实际入口和负责边界检查。新发现的同族必要调用链直接纳入本轮，不扩为全仓审计或并发加固。当前状态：28项已对账，27项在注明的本机/受控边界内查清，J01环境故障直接原因已实证但未恢复；逐项证据在coverage的g004U02Reconciliation，不能将28项当全插件按钮分母。

| 组 | 本轮重要剩余检查（编号仅为检查项） | 受影响区域与完成标准 |
| --- | --- | --- |
| J | 01分支卡Git报错来源；02祖先/分支身份读取；03分支选择与失败恢复；04registry/instances跨正常两个项目绑定 | src/project、分支卡调用方及现有project测试；对精确旧验收仓库只读复现。区分父进程完整配置与VS Code子进程缺项的来源，确认配置传递或调用代码实际原因。保留正常完整Git配置、hooks和授权，不清全GIT_*或改全局Git配置，不改旧分支/仓库，不把环境问题冒成产品缺陷 |
| K | 05project_state摘要/完整状态一致性；06action_catalog可用与拒绝原因；07configuration_list/get实际scope；08state_keys/value读写许可及取消 | src/mcp、src/extension/McpHost及实际状态/配置提供方；只读与写入口语义准确、禁用原因可见、只写声明允许的键，正常取消零写。真实授权不扩大，写入用受控store |
| L | 09flow_get/update状态读回；10draft_list/validate摘要；11draft_review/reject精确路径与状态；12草稿历史promotion入口的退役反馈 | 既有flow/draft实现、MCP路由和相关UI；只处理现存支持入口，拒绝不假成功，不恢复退役功能，不删除文件或把review当运行授权 |
| M | 13plan_list正式/归档区分；14plan_filter组合条件及当前选择；15本机PLAN保存/打开错误与恢复；16本机PLAN归类/选择的持久状态 | 既有PLAN、选择、归档及本机UI调用链；空/缺失/无名case按现有契约，筛选不误改选择或文件，归档记录不冒可执行对象。不得执行真实归档、恢复或清理现有对象；必要变更用隔离合成夹具 |
| N | 17operation_list过滤/offset/limit；18operation_get与原请求身份；19任务/产物精确详情及导航；20错误、取消及未知终态的按钮恢复 | MCP操作/查询、操作UI及实际host；复用G004原异步回执证据，仅补未覆盖的新语义。任务和产物数据为受控替身，不真实查询Worker；错误完整可见，不把未知变成功，不重派任务 |
| P | 21结果目录/映射读回；22结果源切换与拆表保留字段；23旧结果/空结果/失败时摘要；24本机表格打开/重建失败恢复 | 既有结果配置、ResultCollectionHost/ProjectResultTables及相关UI；AI/MCP配置保持唯一必经来源，表/选择/数据集身份一致，写失败保留旧表，不下载原始指标。复用已验真实三表与101项场景，只补具体缺口 |
| Q | 25MCP工具schema与真实host参数对齐；26SDK结构化成功/错误输出一致；27公开CLI/本机API选中项目与请求绑定；28离线按钮/MCP拒绝及本机可用操作 | ToolCatalog/ToolResults/Server/Invocation/ProjectGateway、CLI/本机API与必要调用方；逐族核对本轮真实入口，含可选参数、空值与错误，不把元数据当实际调用。正常最多两个项目；不设计内部args任意突变、高并发矩阵或新防御框架 |

检查广度服务于真实缺口，不要求28个入口全改。Terra先集中读取同一文件所需调用链，再批量修改；内部仍至多2–3强相关问题/8源码测试文档文件，连续完成多组后才统一交付，不每组build。允许上述功能族必要现有源码/测试闭包，单组超过8文件时分内部组，超出功能族才交总控修计划。测试使用当前源码的既有内存转译/函数提取或受控入口，不能用旧dist为新源码背书；全局一个检查进程，单文件20秒约束不变。PanelHtml若改，保留模板转义及最终build/实际脚本VM硬门禁，统一构建前不以已完成验证名义提交该组。

所有真实Worker、SSH、隧道准备、同步、运行/停止/清理、训练、Agent更新均不执行。专用测试根C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f保持offline_import/低流量及现有configuration-only授权；不得改共享Worker配置或扩大权限。保护原项目及未保存稿（含Response to Reviewers.tex），保留全部旧夹具、暂存和摘要文件，无新删除授权。总控独占plan/README/最终验收；Terra取得产品/测试/execution/本轮新coverage对象、唯一检查及scoped Git租约。受检输入冻结期间总控也不写文档。

终点是全部上述重要功能族及必要调用链完成查修和定向自验，记录实际修改点、正确项、真实失败/未知及尚需安装界面复验；尽量20项以上，若全部查尽仍不足则给真实数量及依据，不凑数，也不只做两处停止。完成整份源码小验收后一次工具交总控审查，最终批准集中生成/构建后才递版本、打包、试行发行及单次安装；不得提前build/tsc落dist/package/install。普通已验证源码组可按原规则scoped commit/push/fetch，未过必要门禁的组保持未提交并如实记录。真实界面新修复验收须待用户重载，源码/包/安装/运行版本分开记录。

U02最终源码审查：八个真实修改点为流程保存错误不吞、显式false/解除阻塞生效、切项目后旧请求不返回新项目流程；草稿验证带精确路径、审核返回实际状态、刷新失败不使用旧记录；归档PLAN进入筛选、MCP筛选schema公开现有planId/limit/needsChoice及输出。原两处U01另计，累计10处，不将28项检查或多个断言凑成20处修改。原29/29、exit0复用；总控沿实际持久化队列发现双项目回执缺口，唯一Terra首测缺少拒绝、exit1，修后3/3关联检查exit0，覆盖写成/写失败后切项目及同项目正常/失败。只需到原项目核查的未知写入不误称成功或失败。源码与测试共6文件闭包已审，无新队列/抽象/依赖；修复提交45739e60、1e97d510、72b63c4f、42149f30，记录2206a498，最后HEAD=origin/master=42149f307a259294b7ad0e6aaf7590c8dc8d10c5。总控接受本轮源码范围，不代表运行交付或新界面验收通过，不重复原341检查。

J01总控实证：专用实例56788:2026-11-21T05:56:46.995Z经live capabilities核项目后，仅projects.registry本机只读查询；verifiedAt=2026-11-21T06:55:31.752Z，祖先/分支仍报missing config value GIT_CONFIG_VALUE_0，排除旧卡片缓存。只读精确扩展宿主PID56788环境块，仅输出COUNT/键值存在和空值布尔：COUNT10，KEY_0..9存在，VALUE_0/5缺失；工具环境这两值均存在且为空，其他值存在非空。父Code进程60564无COUNT，由Explorer62344启动；完整工具环境下直接Git和经cmd的只读探针均exit0，不能归罪cmd或仓库损坏。Git要求COUNT声明的每组键值完整，缺项即报错（https://git-scm.com/docs/git-config）。Chromium构造环境会忽略空值，仅是机制线索，未实证本机哪一窗口启动/传递调用丢失；没有清空Git变量、改全局配置、注入运行时或重启受保护窗口。环境恢复和真实分支卡复验未完成，不作猜测性产品修补。

本轮源码查修已收尾，产品/测试/Git/唯一检查租约回总控。剩余为上述Git环境恢复，以及以后集中生成/构建、试行包和单次安装、用户重载后界面复验；没有执行新build/tsc落dist/package/递版本/发行/install，无服务器操作或删除。用户最新仅要求先集中汇报真实修改点和剩余问题，当前保持515安装态及旧dist，不提前交付。

### 2026-11-21重载后界面续验 U01（历史阶段）

用户已确认重载，明确打开相关专用测试项目继续剩余界面验收，不查服务器、不重复构建和安装；今后尽可能集中20个以上真实修改点再统一交付，不为凑数制造问题。当前源码及记录基线f0bf04c5b5724d55de2d6c7e3904ddf957dd2c66，0.5.515已安装一次。总控已打开C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f，真实面板/状态栏均显示0.5.515；保持offline_import和低流量开，其他用户窗口及未保存稿保护。已连续观察和操作24项本机入口/场景，完整限定结论集中记coverage的g004ReloadedUiU01；不把观察、预览、错误反馈或旧证据复用混作完整成功。远端查询、连接准备、同步、运行/停止/清理、共享Worker配置和授权变更均未执行。

U01集中发现两项确定功能缺陷，交原Terra一次处理：A为本机parseLocalPlanText对显式cases: []仍用Math.max(1,cases.length)，seeds [0,42]在列表/顶栏/当前卡均误报2任务，而Scheduler/MCP为0；检查DraftPlans同语义消费者并复用现有PLAN解析契约，保留无显式cases时既有支持。B为splitProjectResultTable空词条真实通知错误后，“查看日志”打开空的SimpleExperiment操作日志；withUiCommandStatus通用失败通知与postUiCommandStatus仅限定命令记日志脱节，须让该通知链接有本次完整错误和身份，不吞原因或重复已存在日志。两个内部组分别至多8文件；允许闭包为src/extension/legacy.ts、src/features/PlanBuilder.legacy.ts、src/features/DraftPlans.legacy.ts及各自必要现有测试和execution，若需其他源码先汇总具体依赖再修订。总控独占plan/README及本轮coverage新对象，Terra独占产品/测试/execution和经回交的Git；不启动新角色。仅定向源代码测试，允许现有内存转译/函数提取，不编译生成dist、不npm build/package、不安装、不递版本或发行；有必要但当前未执行的生成/完整检查明确留待之后统一批次，不能冒通过。原0.5.515交付结论只对已发布包有效，本轮源码修复不会自动在已安装界面生效。

分支卡还显示missing config value GIT_CONFIG_VALUE_0；宿主工具环境有完整GIT_CONFIG_COUNT/KEY/VALUE注入，而该真实VS Code子进程来源尚未核清。本轮只记本机环境受阻，不清空GIT_*、绕过配置或新加Git防御，不改原分支/仓库。界面实际2/101/1三表、映射、空词条错误、筛选/批选、正常2×2矩阵和精确文件打开均保留原对象及证据。新增3个ui_u01_*_515.yaml为明确不提交/执行的本机合成夹具，自动发现后任务数仍0；未创建远端输出。没有20个真实缺陷不造20个修改，本阶段不再构建或安装。

U01源码验收通过：正式与草稿元数据均使用既有parser提供的cases.length，显式空项计0、无显式cases的兼容单项计1；通用failed状态补本次完整message、clientActionId、command日志，已有PLAN/产物记录路径不重复。实际改2源码及1现有测试，未改PanelHtml、dist、版本、包或安装状态。首次定向0/2、exit1保留，修后2/2及完整actionLifecycle.test.js 11/11、exit0；测试使用当前源码内存转译、真实parsePlanSummary、实际状态通知调用链和受控日志/通知，非旧dist或修复后的实机界面。总控复核差异及规模/状态消费者，未发现额外必修；复用定向证据，不再重复检查。产品/测试/execution及Git租约已回总控，连本轮UI记录一起普通提交推送。U01本机续验及源修复已收口，剩余完整生成、集中包和新版本界面复验按用户明确延后，未计通过；后续批次尽量汇总20个以上真实修改点，无新任务派发。

Terra负责每项具体入口和消费者小验收；全部12项结论齐后真实工具交总控完整差异/源码基线/12项证据与失败未知、生成与检查身份及租约。总控B01只审新增场景覆盖与修法契约，B02只补MCP→host→共享结果/PLAN或同步目标的跨段新关联，B03核最终源码/生成/检查/交付一致性；不重做已有效小项。失败真实工具回原Terra返修，最终明确通过后才交付，不把静态搜索或137工具元数据当137工具调用通过。

集中运行交付原版本0.5.514；其校验清单缺陷已按历史资产不可覆盖规则用0.5.515修正，未增加功能范围。版本修正仅package.json、package-lock.json、src/runtime/RuntimeManifest.ts三处源版本及原生成闭包。显式npm run package只构建打包，按docs/release-delivery.md完整核实际包身份/版本/平台/闭包/内容/秘密、绑定确定包SHA；版本门禁不跳，vsce ls超时及等价实际ZIP核验按上文保留真实结论。保持0.5.483权威，不提升Latest；既有GitHub源仅prerelease=true/latest=false，同一确定包及sha资产、真实tag及下载内容均已核对。

全部修改、统一验证、包及发行完成后，按用户本次明确要求显式install:latest一次，不force/降级/同版重复；核已装版本/simpleex后停面板，待本人Reload Window。无远端部署。源码/发行/安装/重载四状态分别记录。全部交付实际完成，或全部剩余有真实精确阻断并交所需决定，才允许结束；内部组、一次检查、普通消息或CUA完成不代整批完成。总控收到完整接管并已开始的回执后可依分工空闲，不让可执行工作双方idle。
