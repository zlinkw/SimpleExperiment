# G004 重要功能、按钮与MCP深查

## 当前目标 U04 单项目验收返修已交付518，待本人重载续验

2026-11-22用户已确认重载，先核517实际运行身份和单项目功能，通过后处理延期。39项单项目修复已源审并试行交付，源/包/发行/安装证据见最终交付确认。有限逻辑300项，211有受限证据或缺陷、89延期，4跨项目问题保留，不冒全部通过；U01–U03的20项修复及有效证据复用。

优先级：先确保单项目正常，再扩双项目。复用适用旧证据，重点PLAN读/生成/保存/选择，结果读/解析/展示/导出，日志/按钮反馈，配置持久化/读回及MCP契约。跨项目、窗口或共享状态问题保留并延期，同根因有单项目实际影响则处理该部分。单项目验收前不新增双项目竞态，不扩授权撤销、令牌、Agent生命周期专项；既有必要安全/正确性契约保留。

平台拒绝边界：旧执行possible cybersecurity risk，具体触发点未披露；最近完成本地搜索、此前为内存授权替身，不能推断插件攻击。不重放、不换模型/聊天/通道规避、不调用Daybreak；只推进独立普通功能，若仍拒绝报告实际限制。完整记录见19043154。

U04受限全入口排查、三批修复与必要回归已完成，39项已源审并交付；4问题/89入口延期仍未通过。完整首稿见Git a7d2a727同文件，不跳过实际门禁或把重载声明当实机通过。

母集按动作/语义payload/条件去重，含默认/条件/动态/辅助/确认/恢复面板、VSCode及MCP；重复数据行不无限扩实例，不计不可达/非按钮。factory条件保留，不恢复PPT/Hub；producer/route/host/效果/延期见coverage。

coverage沿用g004U04RemainingInventory，核必要差异后复用旧证据，区分受限/缺陷/延期；保留首失败、消费者及验收，源审不冒实机通过。AI科研映射归消费项目，不恢复自动依赖/论文检查。

复用未受影响覆盖；补查支持输入/必要消费者的schema、参数、权限确认、身份、成功失败取消及0/空/false。单机最多两项目，不扩性能/并发或任意内部args突变；罕见支持输入不漏查，局部外部阻塞不停止独立工作。

本轮受限排查收包门槛已满足：无尚未分类的本地入口，外部/生命周期/清理/跨项目未测明确保留；限定结论非全部输入通过。后续按已审必要链处理，不扩大新功能、性能、安全专项或真实服务器范围。三批及内部组的分工/验证/Git门槛见下文。

总控独占计划/索引及最终审查，唯一Terra负责实现、小验收、execution/coverage及交付，当前身份和双接替事实见下文。三批源码已通过，交付租约以“最终源审与交付开放”最新裁决为准；两角色及背景硬门控不变，按全局AGENTS事件协调，不新增审查者。

保护/执行详下文“保护对象及实机边界”及全局AGENTS：真实服务器/Worker/SSH/健康/准备/同步/任务/部署仍禁，稿件/GPU7/tmux/隧道与全部夹具/拒删文件不动；仅精确隔离项目实机。单一node/python检查、受检输入冻结，不改超时/覆盖求绿；J01与默认CLI错绑定不作旁路修复。

## U04 排查包审核

2026-11-21最终收包f72d0066：总控已审43项根因及必要消费者，单项目39、仅跨项目4；U04-20、33–36、40–44共10项撤回，原编号/失败/证据保留、不复用。U44为可信数据集的既定保护，不新增部分行映射。U45仅为人工映射写表失败后的同一映射配置恢复缺口，普通JSON先提交、表可重建属既定设计。未读取或修改真实结果、状态，实际损失未知。

有限母集300：界面279（受限204/延期75），独立VSCode命令21（受限7/延期14），共211/89，含缺陷并非全通过；unreviewed=0仅已分类。动态控件实例未知，291 markup仅定位、137 MCP为独立API目录。137契约、旧13工具适用证据、query15/15及队列/报告/GPU/TMUX补齐见coverage.g004U04RemainingInventory。初包5583aa5c退回、ac68854e后纠正12项分类，完整审核沿革见19043154；外部未测保留。

## U04 正式三批修复计划

原39单项目按恰好三批完成并交付517，完整修法/消费者/内部组/验收表保存在Git 895038f2同计划，逐项证据在coverage.newConfirmedIssues与execution；本节压缩已完成历史，不撤销支持契约。原跨项目02/05/06/07仍延期，单项目最终通过后才开，不新增第四批凑数。

| 原批次 | 问题 | 已完成范围及继续保护 |
| --- | --- | --- |
| B1 数据与持久化，13项 | 25/26、28/49/50、32、19/21、22、29/30/31、45 | 选择失败可见；迁移目标写成才清旧键、同进程可重试；CSV引号换行/逗号/转义，首坏后好和case/model/tag身份不丢；null/空/bool不转0、合法0/特殊键/中文保留；指标列并集与方向正确；人工映射先存配置且不覆盖其他可信归属，JSON优先/可重建表设计保留。 |
| B2 PLAN与反馈，17项 | 12、13/15/16/17、23、24/38、27、37、39/51、46、47、48、52、53 | 取消不误成功，读错与ENOENT分开，既有扫描预算内明确不完整；PLAN空白/显式空seed/cases跨行注释及seed0正确；10.5持久化；审计/模板/报告/草稿错误可见；归档不沿用旧查询通过，合法离线/已确认任务保护。 |
| B3 API与身份，9项 | 01/08、03、04、09、10、11、14、18 | 等待后核项目/目标/适用授权；资源拒绝不冒可用、缺结果与空指标/0区分、公开输入输出一致、精确WARN；实验/日志/产物精确身份优先，唯一旧别名/冒号/Worker保留；重分配确认后精确来源仍排队，index0合法。01/08仅源审及既有受控证据，不重放授权撤销/Agent生命周期专项。 |

原三批小验收与FF提交均有效，失败和限制保留，源证据不冒真实Worker/UI通过。本轮54–56是上述B3/B2验收返修，现行范围/门禁以本计划新段为准。

### 三批源码最终源审与交付开放

首次源审1ff64a81时三批39项已交，未build/发行；总控核生产diff及必要消费者后退回两处：U30误滤JSON显式metrics合法同名指标，日志导航夹具缺setNativeTitle及状态闭包。原12/13失败、独立3/3、首次夹具失败及其他有效小验收保留，未改生产或覆盖/超时求绿，不新增批次或问题编号；精确返修diff见1da1ffce及execution。

返修1da1ffce01f106e60554e77f412237a29d2104e5=origin/master、tracked clean：总控直接核实际diff，U30仅在平面数据过滤维度，显式metrics保留合法同名/0及特殊自有键；5/5小验收适用。日志导航夹具加载真实helper及初始状态，旧516 dist原套件13/13 exit0；原12/13 exit1与独立补测保留，新生成脚本仍由集中package覆盖。39项单项目源码及必要消费者源审通过，01/08只语法/源审、不重放受拦截安全专项的限制保留；4项跨项目和89项外部入口仍延期，实机UI/Worker/真实数据未测，不称整个任务或真实环境全通过。

现开放唯一Terra连续执行集中交付：先核真实GitHub现有版本/tag选未用patch，同步package/lock/runtime，必要runtime生成预先稳定后按既有package入口一次运行（包含build，max-parallel 1、cancel-stdin，不先独立全量build）；真实输入/生成物/本轮规定检查/按需未运行及失败如实保留。通过后核VSIX实际身份、Windows平台、运行闭包、同源字节、秘密排除和SHA，FF提交push/fetch、tag精确绑定已核源码，既有更新源发布同字节prerelease=true/latest=false试行包及精确文件名sha；实际远端/下载/更新客户端核验后显式安装一次并核磁盘版本与CLI入口，立即停止面板等本人Reload。权威483/SFTP118不提升，SFTP120不降级，不自动部署Worker。各阶段失败停对应交付，不改覆盖/超时/日志、不伪改receipt、不覆盖tag/历史资产；仅补测试优先组合既证，runner不能表达时先交具体缺口决定，不默认整轮重跑。源审通过不等于package/发行/安装已完成，最终向总控交真实全包再结案。

0.5.517首次package预检：dry-run 341独占/按需0，20旧候选因scopeUnknown恢复；总控核package.json在选择器RUNNER_OWN_FILES，递版即全保护，且origin/master比较不能覆盖已逐组push的任务历史。旧516与39项源修复不同输入，批准本候选首次完整package，不改runner/选择/超时、不靠提交隐藏影响。仅补测试不默认全跑；组合能力不足须交具体裁决。

0.5.517首包实际exit1、337/341成功、4失败，10前置gates通过，input=end=10a55443…1357，原receipt和lock-release见execution引用；post/assemble未执行、无VSIX。stdin已关闭，合作取消失败，原runner自然结算，未强杀。四个现有测试精确修正后MCP43/43、CLI19/19、历史取消13/13、Agent夹具10/10，均exit0；Agent首补仍9/10 exit1，VM跨realm归一后通过，原业务断言及失败保留，未扩生命周期/授权撤销或真实服务。总控源审这些test-only diff及产品未变事实，原337有效但仅作既证，不能伪成整轮成功。

具体组装裁决：scripts/test-workflow.js的最终profile禁止only；validateReceiptForAssemble要求overall=passed、相同input/矩阵/产物及逐项日志，package:assemble明确拒绝failed或变化输入。当前不能表达组合覆盖；不伪改receipt、不绕过组装检查，也不为一次交付扩通用runner框架。为满足这个现有、明确绑定最终组装的门禁，总控批准四处已补验后的0.5.517候选再完整package一次；源码/工具链/依赖/运行配置不变，编译复用既有有效缓存，不先独立build。此为首包四项真实失败后的精确裁决，不是仅补测试通用全跑许可；再有失败须按具体新事实决定，不自动第三轮。所有失败、补测、第二轮真实结果分别报告。

## 0.5.517 重载后单项目验收

11-22本人已重载，先验517单项目。普通profile有真实Worker未开；临时--user-data-dir复用已装517，仅根 C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f。隔离Host22928实核517/offline_import/低流量/Worker0，仅该profile结论。grant=null且U55阻断亲授，当前不要求用户操作。允许公开GitHub只读/自然注册；禁真实Worker、再安装/升降级/远端写入、改稿件/真实profile/默认绑定，临时目录保留。Terra持执行/验收、execution/coverage、唯一检查/scoped Git，总控持计划/索引/终审。

本阶段依现行Simple Local API及Computer Use接口做真实单项目正常链：PLAN读取/生成/保存/选择与空矩阵，离线合成结果读取/解析/显示/表格导出，日志/错误/取消反馈，以及本项目配置保存和正常读回。先用已有合法夹具与有效源/包证据，只补517重载后真实界面/调用链缺口，不重刷39项源测试或341全集；每项明确实点、API/CLI、受控/既证、未测，不把接口元数据当业务通过。新增最小合成文件仅在专用根、保留不删除，既有文件不覆盖；必要可逆项目偏好先读原值再恢复，真实状态/稿件不动。

总控核单项目包的运行身份、场景与39修复对应、错误/取消/持久化及未测；新bug先交精确证据裁决，不自动递版/发行。通过后才开02/05/06/07有限本机/受控闭包，沿原B3组织内部组；89项仅补当前授权缺口，外部/删除/生命周期/平台拒绝保留，不为清零扩权。现不切项目造竞态、不重放授权撤销/Agent专项、不恢复退役入口。

单项目阶段已有PLAN选择/刷新空矩阵/保存原文、向导生成取消，配置保存读回恢复、合成结果显示与分表、错误和日志实机证据，未全通过。新增U04-54：catalog列selectPlan但invoke误入远端action映射而拒绝；原B3局部返修417634df已源审通过，两选择复用本地handler，持久化/错误/确认及远端路径保留；定向43/43 exit0，首42/43 exit1保留。源码FF已同步，未build/dist/递版/发行，517尚不含修复。results.list系主动采集，离线空Worker失败暂仅观察；首屏旧cases缓存刷新正确不称持久缺陷。

U04-55最新方案源审通过：单一授权/撤销当前workspace，无Worker/操作范围勾选，统一插件及服务器操作含设置；设置决定启用目标。新grant无Worker，旧细分/绑定grant保留旧约束待本人重授。配置可改disabled并读回enabled，执行仍限enabled，目标变更/路径/删除确认保留。src及真实Gateway/保存核心单文件两次45/45 exit0（后次补保存前目标核对）；旧窄修156f060b及其首43/44失败、44/44通过保留。按A授权8文件、B设置6文件语义hunk分组FF，先无已提交结论，不重写历史；未改真实授权/配置/服务器。

U55设置必要链：worker_configure现有schema缺enabled，workers.configure/Gateway只认启用集，导致AI不能启用已禁用的已配置Worker。沿原工具/保存函数补enabled和读回，配置目标可取全部已配置集，实际执行仍限启用集；未知目标拒绝，保存不启动远程。统一grant后正常设置修改不再单独弹Worker/范围授权；必要共享影响说明保留。仅假设置/假Worker回归，不改真实共享配置；每内部组≤3问题/8源测文档文件，受控源审后集中交付裁决。

517 MCP解析/排行实测成功：长表2结果保留逗号run key/DSC0，跳空HD95；排行2组accuracy0/0.8、loss空/0.4及引号逗号正确，夹具保留。原final.csv默认长表返回[]不称通用失败，results授权链未测。真实离线文件导入/持久包读回成功；匹配PLAN/revision的display-only新包state两行正确，UI却无导入行且仍显旧query失败，转56。已同UI恢复原包，空PLAN合成数据不冒真实实验。

U04-56完整源修895038f2已FF同步并源审确认：只读离线预览不改PLAN证据，坏行明确错误、合法特殊键与既有final/pending aliases保留，explicit results[]不回退。单文件8/8通过，原两轮8/8和边界首7/8 exit1(null.experimentId)及修后8/8分别保留。46确认=39已交付+54/55/56本包源修+4跨项目；撤回10/89延期不变。

56复审已核错误行号/好行保留、null-prototype指标/维度保留__proto__/constructor和0；仅两直接compactor，无新限额或全仓加固。生成script VM有效，结果section/signature跟踪与仅离线屏蔽旧report正确。新别名补验如有其他产品变化/实际失败必须再裁决，不弱化契约求绿。

## U54/U55/U56 集中试行交付有条件开放

A/B已FF同步bc0cc61c/c37827c8，54/55源审有效；56上述精确别名补验及FF后恢复三项集中交付，单项目仍待新包实机最终通过。先实核未用下一patch/tag，package/lock/runtime同步、write-agent-runtime，复用缓存，不独立build后再package。dry-run核当前选择/按需及组装要求；若现有最终profile仍强制同输入完整passed矩阵，批准本候选一次既有package、max-parallel1/cancel-stdin，按实际清单对账，不伪造组合或硬设数量。失败收完整结果后按实因裁决，不自动第二轮。新dist需mcpProject等受影响消费者及Panel模块/实际生成script VM门禁。按项目规范核VSIX身份/平台/闭包/同源/秘密/SHA，FF源/版本/generated后同字节发布既有GitHub试行prerelease/latest=false，实核tag/资产/下载/实际更新客户端，SFTP120现有包复用、不提Latest483。全部成功才install:latest一次，核磁盘/CLI后停UI待本人Reload，不自动授或部署Worker；随后新版实机核54/55再判断单项目门槛。冻结检查期间总控不写输入。

518首package 2026-11-22T03-16-49-272Z-80576 exit1：339/341、10前置gate通过、input=end=68ab3b42…ceecfe8，实际峰1、341树结束确认、锁释放，无post/VSIX。两项仅fixture修正：mcpProject旧grant误共享可变target引用41/43→复制后43/43；serverQuota缺mcpInvocation绑定9/10→真实模块后10/10，原断言/产品未改。首失败及补验日志在execution。组装器拒failed/输入变化，final禁only/reuse、check:full也带compile/matrix，不能组合339+补验；总控核具体门禁后特批本候选第二次package一次，复用518缓存/产物、不另build/递版、不改runner或伪receipt。再失败具体裁决，不自动第三轮；不作为纯补测通用全跑许可。

518最终交付总控一致性核验通过：源码/版本/generated提交20ae86ed32f0baa9106645decb60cf9a299f3518=origin/master，v0.5.518远端tag精确绑定；第二package 2026-11-22T03-36-44-479Z-33768-package/run.json为341/341、13门禁exit0、input=end=3cb70f7f…10745、并发1和锁释放。Panel模块及2生成script VM、377项ZIP内容策略通过；独立verify-vsix-runtime因工具丢stdout/exit仍未知，未重跑或冒通过，按批准等价验法实际ZIP的325运行闭包/324面板文件齐全、371运行文件与构建同源，exit0。试行Release https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.518 为draft=false/prerelease=true/latest=false，VSIX 2987002字节，SHA256 703d5ae27781921294ff5eeb0bb7355ec7db8581390b73549420a564045e5624；本机/远端digest/隔离实际下载和精确文件名sha一致。真实客户端482仍见483、518/SFTP120不降级；Latest实际仍483。install:latest恰一次exit0含DEP0169 warning，总控只读code列表确认518/SFTP120及稳定CLI入口存在；停止面板，需本人Reload目标隔离窗口，再本人点管理AI→授权当前项目（不选Worker/范围）。新版54/55/56运行交付通过，实机交互和授权链尚未通过；不自动授权、真实Worker/服务器仍禁，4跨项目/89入口延期不开放。首包339/341、fixture补验及git add忽略dist的exit1均保留execution。

## 0.5.517 最终交付确认

总控核实际Git/回执/远端资产/隔离下载/本机安装后确认本轮39项单项目修复试行交付通过，非所有环境全通过。运行源码、同步版本及generated提交a7d2a7275c5d9ea455c2e369cdddaa8e33a198e2已FF推送，远端v0.5.517精确绑定；后续纯登记提交不改变这个包的源码身份。第二次package回执2026-11-21T15-08-06-325Z-28880-package/run.json实际exit0、341/341作业和13/13门禁通过，input=end=5443ffc1…3aba、实际作业并发峰值1、全部进程树确认结束、锁释放、按需0；首包337/341失败与四项补验/额外夹具失败均保留。jobTmuxLogNavigation另对新dist13/13，不冒在341矩阵内；Panel模块及3生成script VM有效，首VM命令转义失败已保留，不是生产语法失败。

[试行v0.5.517](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.517)实际draft=false、prerelease=true、latest=false；普通Latest仍v0.5.483。VSIX simple-experiment-0.5.517.vsix为2986729字节，SHA256 `2fa2ecb3e0d890d47653ee8b7f5ffe29317c22d692659ae4cd8d34336a6989e5`；97字节同名sha精确绑定文件名。本轮377项ZIP、370项dist/bin/vendor与构建字节一致、秘密/配置/科研产物排除及Windows兼容身份核验复用执行者有效证据；universal包不冒win32专用。总控独占一致性检查核远端资产digest、实际隔离下载同SHA、版本/lock/runtime0.5.517、远端tag和已装磁盘版本/CLI入口，不复做上述内容检查。验证目录C:/Users/ZLK/AppData/Local/Temp/g004-release-0517-a7d2a727保留。实际更新客户端确认482可见权威483、517及SFTP120不降级，SFTP120资产可取得。

517交付时install:latest一次exit0、DEP0169 warning，磁盘517/SFTP120及稳定CLI入口有效，当时Host未知、待本人Reload；该历史不覆盖上述11-22实机状态。旧CLI默认项目不符exit2、J01宿主VALUE0/5缺失及传递环节未知未修；4跨项目/89入口延期，真实Worker/科研数据/安全专项未测，原稿/旧任务/现场保留。

## 0.5.516 历史交付确认

516完整身份/资产/源审见Git a7d2a727同计划及b7c0b42c执行登记。源码6e3e9421、试行非Latest；最终package回执2026-11-21T08-23-22-440Z-42280为341/341、13门禁exit0、输入一致、并发1、锁释放、按需0；Panel3脚本VM及377ZIP/326闭包/373同源通过。首包340/341 exit1、补测22/22、ZIP路径假缺及vsce ls超时原失败保留；精确字节/SHA与下载/安装事实不变。

516安装一次exit0、SFTP120，simpleex --version因默认其他项目API_WORKSPACE_MISMATCH exit2，未改绑定求绿；用户未确认重载，不能倒推新界面实机。当前安装已到517，历史包/副本均保留；旧任务/窗口/稿件未动，J01未恢复。实际ReleaseClient当时482见483、515/516及SFTP120不降级。
## U03 历史范围与复用

U03历史20修复已完成，范围/原表见Git f72d0066同计划及execution，非U04数量要求；不重开旧全功能/分支/竞态或退役入口。科研指标/映射归消费项目，不加依赖/统计/结论检查或原始指标本机同步。

## 角色、租约与执行规则

总控兼终审：《总控·SimpleExperiment G004 集中查修与交付》01a1fdb5-efe6-78c2-ae6c-861ed4028cdc/local，Sol/high/default，独占plan/README。唯一执行：《执行·SimpleExperiment G004 集中查修与交付 接续》01a1ff08-4031-7410-a937-c2ba34e6730c/local，Terra/high/default，持实现/UI/API/CLI、execution/coverage、唯一检查/scoped Git。11-22旧执行01a1fdb5-ce28-7ba1-b9b5-3470a33e8d00实核6压缩、峰300048自然safe_handoff，已释放归档无在途；新角色match/continue及背景核验通过。前双接替史见19043154，计数按caveman实核，不加角色，协调按全局AGENTS。

全局仅一个node/python检查进程，检查冻结含总控文档，不并写受检输入。先单目标 `node --test --test-force-exit --test-timeout 20000 <file>`，20秒未退停止、不重试或改生产超时求绿；Python只提被测函数及import，不全import/exec scheduler/agent，spawnSync≤10000、windowsHide、断言真实status0，禁止Node用python-c长脚本。无新删除许可，夹具保留；既有测试的清理边界另按规则，不能借测试清理用户数据。

U03源审与统一交付已通过；U04当前租约按上述现任分工，不以旧交付收口撤销当前排查租约。后续新界面验收以本人明确重载为前提。PanelHtml本次未改，集中交付仍保留Panel模块及真实生成脚本VM门禁；旧dist不得证明新源码通过。origin固定https://github.com/zlinkw/SimpleExperiment.git，master追踪origin/master；不amend/reset/rebase/merge/force。远端前进、凭据、hook、缺remote等阻断对应Git动作并如实升级，不擅换分支或remote。

## 保护对象及实机边界

唯一专用根 C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f，保持offline_import、低流量，实际grant尚空；产品授权按U55本人新裁决，不自动改真实授权/共享Worker。仅本机/受控替身，禁止真实服务器SSH、健康/环境/隔离查询、连接准备、同步、任务查询/运行/停止/清理、Agent部署或科研依赖安装。旧远端目录只读许可不扩本阶段。

保护原MM final.md、Generic Untitled-1、Response to Reviewers.tex等未保存文档；不重载或关闭原窗口、不抢输入。原GPU7、旧任务/结果/日志、远端/root/autodl-tmp/zlk/MultiModal、原Agent精确tmux窗口及隧道均保护。旧验收仓库D:/GitRepo/SimpleMcpAcceptance、拒删cleanup_20261111.txt、全部新旧fixtures/暂存和约60个未跟踪VSIX摘要保留；不stage无关文件、不删除/搬移/自动清理。真实界面只在精确专用项目核身份后操作，不把旧安装界面当新修复通过。

计划上限18000字符、execution12000字符，90%时各自写者一次整体语义压缩，保留当前目标、独有契约、失败/未知/授权/证据，不另造归档或重复报告。coverage沿用docs/windows-entry-coverage.json，不全量重排/重建历史对象。最近三代索引继续；退出日常窗口不等于删除历史文件。

## 已有有效证据与历史裁决

完整原12项/U01/U02计划细节可从Git `4edd1da5:docs/plan-generations/G004-plan.md`恢复；逐项原证据在G004-execution.md及coverage对应对象，保留全部原失败。原G004起点6edbaa64，执行初始a509fc26，原12项为授权/同步、任务日志、异步回执、比较/导出、解析/排行榜、PLAN生成/矩阵、配置重置、重建表。原候选ab77c962实际diff及调用链已审，MCP43/43、experimentPlatform修后15/15等有效。原03远端since=0协议仅末尾最多256KiB，返回offset续读，不冒全文件；本机show完整、tail按lines。正常同项目确认、取消、两个项目隔离及Worker目标变化保留；用户已移除无真实入口的内部args突变测试/structuredClone和isDeepStrictEqual额外防护，不恢复。

原失败：A组旧范围首测0/3含夹具缺vscode，修后3/3并非修订后全项结论；旧experimentPlatform14/15，因固定basename断言与PLAN显式声明契约冲突，仅修测试后15/15。第一次build默认并发2被主动中止exit1；随后BUILD_LOCK_UNSETTLED。本人批准唯一旧process-owner.json精确删除，总控核身份/父目录/进程后完成，没有其他删除授权。后续build首轮windowScopeIsolation夹具缺新上下文方法导致6/7、exit1；补夹具后7/7。统一build `2026-11-21T04-18-18-128Z-69044-build/run.json` 285任务/10门禁通过exit0、起止输入相同、实际最大并发1、锁released，6按需文件未运行不冒通过；首次失败日志 `2026-11-21T04-07-52-212Z-67468-build/`及中止原始记录均保留。以后集中build/package显式max-parallel 1，不改默认、覆盖或超时求绿。

514安装一次但sha错误60位缺f675，B03失败，历史资产保留；精确包/提交/完整SHA见668c6d54同文件。verify:package-runtime因vsce ls既定30秒ETIMEDOUT exit1，未重试/改限时；实际ZIP377项/325模块及内容/README/身份/平台/同源字节等价核验获准，原失败保留。

515源码/tag5dda9cf2，试行非Latest，package回执2026-11-21T04-51-48-484Z-62512为341/341、13门禁exit0、并发1、按需0、锁释放。包/远端/下载一致、验证目录保留，精确字节/完整SHA见668c6d54同文件。515本人实际重载过，不倒推513；旧CLI绑定失败exit1保留，记录4c9f420d/f0bf04c5。

U01真实515本机24场景见coverage.g004ReloadedUiU01；两修复为显式cases[]计数0及通用失败“查看日志”完整回执。首0/2 exit1，修后2/2及actionLifecycle11/11 exit0；提交0eacc46a。真实2/101/1表/映射/搜索/空项/文件打开证据及3个ui_u01_*夹具复用且未运行。完整契约/源身份见Git668c6d54同文件，受控修复不冒已装UI通过。

U02原28项J–Q见coverage.g004U02Reconciliation，非按钮分母。八修复为flow保存/false/项目回执、draft精确路径/状态/失败、归档筛选及MCP已有参数schema。首测真实exit1和state缺键夹具失败保留，修后目标29/29；flow真实队列首拒绝缺失exit1、修后3/3，原项目写入未知不冒成功失败。完整逐项触发、调用链、提交及旧dist限制见Git668c6d54同文件；4edd1da5已FF收口。

## Git环境未解决项 J01

旧验收祖先 D:/GitRepo/SimpleMcpAcceptance/acceptance_files/artifacts/git_ui_source_501 与分支同父下git_ui_source_501--codex-ui-acceptance-503，以当前源码只读身份探针分别master dirty、codex/ui-acceptance-503 clean且共同Git目录正确。完整工具环境直接Git及经cmd只读exit0；移除VALUE_0受控复现exit128。

J01专用Host56788经live root/capabilities后只读registry查询，2026-11-21T06:55:31.752Z仍missing GIT_CONFIG_VALUE_0。宿主环境COUNT10、KEY0..9有、VALUE0/5缺，其余非空；工具对应值存在且空，父Code60564无COUNT、来自Explorer62344。已实证宿主indexed Git配置不完整，具体启动/传递丢值环节未知，Chromium过滤仅线索。不输出值、不清环境/注入/改全局/重启保护窗；未恢复、真实卡片未复验、不计U04新bug，完整证据见Git c37827c8同文件。

## 最终审查与统一交付门槛

U03最终08d0e02d补冒号身份及空块cases/experiments，累计20；Scheduler函数提取与CLI加载两条受控证据不冒同进程E2E。首0/2 exit1、修后5/5及actionLifecycle42/42 exit0有效。旧唯一简称/歧义拒绝、精确Worker/路径、隐式case/null保留；preview结构正确，J01未恢复。完整身份/契约/失败见Git c37827c8同文件。

原U03以累计20个独立修复收包，已完成，不作为U04数量要求。完整交包继续包含实际入口/问题数量、源码基线/diff、真实失败退出码、有效证据、全部未知/未测/阻塞及租约。总控仅审新增契约/跨模块必要关联和最终身份，不重复有效小验收；缺口回原Terra返修，最终明确通过前不做运行交付。原12项/28项通过不自动覆盖新修改。

后续交付继续按build-test-delivery及docs/release-delivery.md：package含build，按需/有效证据不隐式扩大，单进程、原覆盖/超时、真实生成script VM/10890禁硬编码及VSIX身份/平台/闭包/源码/秘密/SHA门禁保留；版本先核未用tag并同步package/lock/runtime，FF提交后才试行同字节发布。普通Latest仍483，不覆盖历史资产、不自动远端更新，不用mock代发行。

全部修改/验证/打包/发行完成，才显式install:latest一次；同版跳过、不force/降级，每目标版最多安装一次。核已装版本/simpleex后停止面板，待本人Reload Window再验新版本界面；不自动更新Worker。源码、生成包、远端试行Release、本机安装、运行重载及真实外部未测分别报告。用户最新目标尚在执行，不以派单、两处修复、对账完、一次检查或CUA子步骤完成结束整轮。

516历史特批：首package340/341 exit1仅旧日志断言，单文件22/22修正；执行器仅接受同输入完整passed receipt，不能组合覆盖，总控批准当时一次完整重跑。完整原失败/组装依据/真实结果见Git668c6d54同文件，不伪改receipt、不绕门禁、不扩通用runner或把特批当以后纯补测默认全跑。
