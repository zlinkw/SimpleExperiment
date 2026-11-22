# G004 重要功能、按钮与MCP深查

## 当前目标 U04 重载后先验0.5.517单项目，再续延期

2026-11-22用户已确认重载，先核517实际运行身份和单项目功能，通过后处理延期。39项单项目修复已源审并试行交付，源/包/发行/安装证据见最终交付确认。有限逻辑300项，211有受限证据或缺陷、89延期，4跨项目问题保留，不冒全部通过；U01–U03的20项修复及有效证据复用。

优先级：先确保单项目正常，再扩双项目。复用适用旧证据，重点PLAN读/生成/保存/选择，结果读/解析/展示/导出，日志/按钮反馈，配置持久化/读回及MCP契约。跨项目、窗口或共享状态问题保留并延期，同根因有单项目实际影响则处理该部分。单项目验收前不新增双项目竞态，不扩授权撤销、令牌、Agent生命周期专项；既有必要安全/正确性契约保留。

平台拒绝边界：旧执行possible cybersecurity risk，具体触发点未披露；最近完成本地搜索、此前为内存授权替身，不能推断插件攻击。不重放、不换模型/聊天/通道规避、不调用Daybreak；只推进独立普通功能，若仍拒绝报告实际限制。完整记录见19043154。

U04受限全入口排查、三批修复与必要回归已完成，39项已源审并交付；4问题/89入口延期仍未通过。完整首稿见Git a7d2a727同文件，不跳过实际门禁或把重载声明当实机通过。

母集按动作/语义payload/条件去重，含默认/条件/动态/辅助/确认/恢复面板、VSCode及MCP；重复数据行不无限扩实例，不计不可达/非按钮。factory条件保留，不恢复PPT/Hub；producer/route/host/效果/延期见coverage。

coverage沿用g004U04RemainingInventory，核必要差异后复用旧证据，区分受限/缺陷/延期；保留首失败、消费者及验收，源审不冒实机通过。AI科研映射归消费项目，不恢复自动依赖/论文检查。

复用未受影响覆盖；补查支持输入/必要消费者的schema、参数、权限确认、身份、成功失败取消及0/空/false。单机最多两项目，不扩性能/并发或任意内部args突变；罕见支持输入不漏查，局部外部阻塞不停止独立工作。

本轮受限排查收包门槛已满足：无尚未分类的本地入口，外部/生命周期/清理/跨项目未测明确保留；限定结论非全部输入通过。后续按已审必要链处理，不扩大新功能、性能、安全专项或真实服务器范围。三批及内部组的分工/验证/Git门槛见下文。

总控独占计划/索引及最终审查，唯一Terra负责实现、小验收、execution/coverage及交付，当前身份和双接替事实见下文。三批源码已通过，交付租约以“最终源审与交付开放”最新裁决为准；两角色及背景硬门控不变，按全局AGENTS事件协调，不新增审查者。

保护与执行边界：禁止真实服务器/Worker/SSH/健康/准备/同步/任务及Agent部署，不改共享Worker或扩大AI授权。旧验收仓库只读，全部夹具、拒删文件、原稿及未保存文档/窗口、GPU7产物/tmux隧道受保护，不自动重载或抢输入。本人已确认Reload，现可在唯一专用项目按现行接口验UI，仍须实核运行版本；其余窗口不动。单一node/python检查，先单文件20秒，不全import/exec scheduler/agent，不改超时/覆盖求绿，不删夹具，不新增未经确认性能测试。J01宿主Git缺VALUE0/5及CLI默认API项目不符仍未解决，不清环境/改全局配置/重启原窗口求绿。

## U04 排查包审核

2026-11-21最终收包f72d0066：总控已审43项根因及必要消费者，单项目39、仅跨项目4；U04-20、33–36、40–44共10项撤回，原编号/失败/证据保留、不复用。U44为可信数据集的既定保护，不新增部分行映射。U45仅为人工映射写表失败后的同一映射配置恢复缺口，普通JSON先提交、表可重建属既定设计。未读取或修改真实结果、状态，实际损失未知。

有限母集300：界面279（受限204/延期75），独立VSCode命令21（受限7/延期14），共211/89，含缺陷并非全通过；unreviewed=0仅已分类。动态控件实例未知，291 markup仅定位、137 MCP为独立API目录。137契约、旧13工具适用证据、query15/15及队列/报告/GPU/TMUX补齐见coverage.g004U04RemainingInventory。初包5583aa5c退回、ac68854e后纠正12项分类，完整审核沿革见19043154；外部未测保留。

## U04 正式三批修复计划

全部39项单项目问题按下表恰好三批实施，同一Terra连续推进。跨项目02/05/06/07保留在本计划但延期，本轮不改、不新扩变体；单项目修复及必要验证完成后由总控再判断双项目阶段，不新增第四修复批凑数。每项触发、原证据及具体验收以coverage.newConfirmedIssues同编号为准；下列修法边界优先。

| 批次/状态 | 问题与完整范围 | 源码/必要消费者 | 小验收与退出条件 |
| --- | --- | --- | --- |
| B1 数据准确性与持久化，已交付 | 25/26选择保存及旧状态迁移；28/49/50 CSV和长宽表；32空指标；19/21合法特殊键；22中文命名；29/30/31指标排行；45人工映射恢复，共13项 | legacy持久化/映射宿主、Results.legacy、Metrics、FreshResults、ProjectResultTables、LatestResultExport、ResultLayout及其Python对应、CLI metric与受影响消费者 | 迁移失败及同进程重试均保留旧副本，成功才清旧键；CSV引号换行/逗号/转义及正常长宽表、首坏后好、case/model/tag身份不丢；null/空串/bool不转零且合法0保留；特殊键及中文可区分并读回；指标身份维度排除/后行列并集；同映射失败后可恢复配置且不同可信映射不可覆盖。13项定向通过、diff及必要调用方齐、scoped提交push/fetch后进入B2 |
| B2 PLAN及界面反馈，已交付 | 12目录取消；13/15/16/17 PLAN筛选/扫描/读取；23空产物入口；24/38保存回执及原文；27半秒配置；37审计失败；39/51空矩阵；46历史清除取消；47模板预览；48归档新鲜证据；52报告；53草稿，共17项 | legacy宿主、PanelHtml.legacy实际生成链、DraftPlans必要边界、CLI plan及相关配置/扫描消费者 | 取消不清草稿或报完成，真实错误保留；ENOENT与EACCES分开；扫描不静默截断且保留既有边界，必要时明确不完整而非冒全量；PLAN正文保留有意义空白，显式空seed/cases含跨行注释均0；10.5读写保持而其他整数项不变；归档本次刷新失败/未刷新不得沿用旧通过，保留合法离线/已确认任务契约；报告精确名称与草稿正常空/非空及读取失败；17项通过并Git同步后进入B3 |
| B3 MCP契约、身份及动作守卫，已交付 | 01/08既有同项目守卫；03资源失败；04空指标身份；09重分配状态；10输入契约；11输出身份；14日志级别；18精确实验身份，共9项 | McpHost/Invocation/ProjectGateway必要链、ToolCatalog/ToolResults/ProjectQueries、CLI resource/metric/experiment/artifact/log、legacy相关宿主 | 仅补原await后当前scope/config/grant核验，不重放授权撤销/Agent专项；重分配使用确认后新鲜源状态且保留index0；失败不可变空闲，合法0/空指标与缺结果可区分；公开字段与消费者一致、不静默忽略，不新增未支持参数功能；保留experiment_id并同步嵌套schema；精确ID优先、简称仅唯一，含冒号与Worker/artifact消费者；WARN/WARNING准确。9项通过、Git同步、39项总包完整后交总控最终源审 |

批内按2–3强相关问题/至多8源码测试文档文件组织内部组，每组有关验证和scoped Git同步；这是同三批的内部实现顺序，不另开逻辑批或会话。同文件集中补丁，涉及共享函数按实际受影响消费者组织有界回归，不为凑组重跑有效检查。B1先26的数据完整性，再解析/数值/命名，最后映射恢复；B2先读取/矩阵/原文再反馈，B3先普通MCP/身份再必要动作守卫。执行者自行记录组/批状态、真实提交、失败和未测；计划结构变更归总控，当前精确计划/索引diff准予唯一Git写者带入下个适用提交。批次失败先原范围自主返修，阻塞仅停相关项；新增问题或需要新能力/权限/架构则交总控决定，不自动扩修。

修法共用边界：优先复用既有CSV读取器、数值契约、错误/取消机制及存储队列，不造通用框架/新依赖/状态系统。U26失败后重试不能因内存已有值跳过持久化而清旧键；U21包含当前FreshResults消费者。U22保留已有安全ASCII路径/旧序列化路径读回，Python与TS一致，不迁移删除旧文件、不放过真实碰撞。U32仅修当前共享汇总/导出及必要链，不恢复退役高级UI。U45保持JSON优先与表重建设计，不新增整批回滚、日志或备份体系；可信数据集不可被不同映射覆盖。01/08不减安全授权/精确目标、任务重启等既有契约。禁止真实性能测试、真实外部操作及删除现场。

Terra负责所有定向小验收，先单文件20秒入口；旧合成复现应变为有意义回归，保留正常值/失败/取消/必要消费者。共享helper变化及时补旧AST/VM夹具闭包；原jobTmuxLogNavigation 12/13失败不能被补测3/3改写，若本轮改动影响其依赖，修夹具并定向验证，不削断言/覆盖/超时。每批完成后可直接进入下一批，不索取状态回执；全部三批源包齐才一次交总控：39项修法与结果、实际diff/提交、完整失败退出码、有效回归和89项外部未测边界。总控仅做新增契约/必要跨模块源审及独占缺口，不复跑小验收；通过后才开放集中package/试行发布/一次安装，后续仍待本人Reload，不自动实机或远端部署。

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

517真实MCP本地补证：result_parse/metric_leaderboard无需grant，Host22928实际调用成功；长表2结果保留逗号run key/DSC0、空HD95跳过；排行2组保留accuracy0/0.8、loss空/0.4及引号逗号。原final.csv默认长表返回[]不当通用失败。新合成文件保留；纠正旧笼统blocked。尚补离线文件选择→导入→显示正常链；results主动采集/导出仍未获真实授权，不冒通过。

## U54/U55 集中试行交付开放

A/B源提交及517离线导入缺口完成、无新阻断后，开放54+55必要运行交付，单项目仍非最终通过。先实核未用下一patch/tag，package/lock/runtime同步、write-agent-runtime，复用缓存，不独立build后再package。dry-run核当前选择/按需及组装要求；若现有最终profile仍强制同输入完整passed矩阵，批准本候选一次既有package、max-parallel1/cancel-stdin，按实际清单对账，不伪造组合或硬设数量。失败收完整结果后按实因裁决，不自动第二轮。新dist需mcpProject等受影响消费者及Panel模块/实际生成script VM门禁。按项目规范核VSIX身份/平台/闭包/同源/秘密/SHA，FF源/版本/generated后同字节发布既有GitHub试行prerelease/latest=false，实核tag/资产/下载/实际更新客户端，SFTP120现有包复用、不提Latest483。全部成功才install:latest一次，核磁盘/CLI后停UI待本人Reload，不自动授或部署Worker；随后新版实机核54/55再判断单项目门槛。冻结检查期间总控不写输入。

## 0.5.517 最终交付确认

总控核实际Git/回执/远端资产/隔离下载/本机安装后确认本轮39项单项目修复试行交付通过，非所有环境全通过。运行源码、同步版本及generated提交a7d2a7275c5d9ea455c2e369cdddaa8e33a198e2已FF推送，远端v0.5.517精确绑定；后续纯登记提交不改变这个包的源码身份。第二次package回执2026-11-21T15-08-06-325Z-28880-package/run.json实际exit0、341/341作业和13/13门禁通过，input=end=5443ffc1…3aba、实际作业并发峰值1、全部进程树确认结束、锁释放、按需0；首包337/341失败与四项补验/额外夹具失败均保留。jobTmuxLogNavigation另对新dist13/13，不冒在341矩阵内；Panel模块及3生成script VM有效，首VM命令转义失败已保留，不是生产语法失败。

[试行v0.5.517](https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.517)实际draft=false、prerelease=true、latest=false；普通Latest仍v0.5.483。VSIX simple-experiment-0.5.517.vsix为2986729字节，SHA256 `2fa2ecb3e0d890d47653ee8b7f5ffe29317c22d692659ae4cd8d34336a6989e5`；97字节同名sha精确绑定文件名。本轮377项ZIP、370项dist/bin/vendor与构建字节一致、秘密/配置/科研产物排除及Windows兼容身份核验复用执行者有效证据；universal包不冒win32专用。总控独占一致性检查核远端资产digest、实际隔离下载同SHA、版本/lock/runtime0.5.517、远端tag和已装磁盘版本/CLI入口，不复做上述内容检查。验证目录C:/Users/ZLK/AppData/Local/Temp/g004-release-0517-a7d2a727保留。实际更新客户端确认482可见权威483、517及SFTP120不降级，SFTP120资产可取得。

517交付时install:latest一次exit0、DEP0169 warning，磁盘517/SFTP120及稳定CLI入口有效，当时Host未知、待本人Reload；该历史不覆盖上述11-22实机状态。旧CLI默认项目不符exit2、J01宿主VALUE0/5缺失及传递环节未知未修；4跨项目/89入口延期，真实Worker/科研数据/安全专项未测，原稿/旧任务/现场保留。

## 0.5.516 历史交付确认

516完整身份/资产/源审见Git a7d2a727同计划及b7c0b42c执行登记。源码6e3e9421、试行非Latest；最终package回执2026-11-21T08-23-22-440Z-42280为341/341、13门禁exit0、输入一致、并发1、锁释放、按需0；Panel3脚本VM及377ZIP/326闭包/373同源通过。首包340/341 exit1、补测22/22、ZIP路径假缺及vsce ls超时原失败保留；精确字节/SHA与下载/安装事实不变。

516安装一次exit0、SFTP120，simpleex --version因默认其他项目API_WORKSPACE_MISMATCH exit2，未改绑定求绿；用户未确认重载，不能倒推新界面实机。当前安装已到517，历史包/副本均保留；旧任务/窗口/稿件未动，J01未恢复。实际ReleaseClient当时482见483、515/516及SFTP120不降级。
## U03 历史范围与复用

U03已完成配置状态、PLAN草稿、结果产物、MCP本机接口、按钮导航及本机分支功能族的连续查修，20项修复及相关证据见下文历史裁决；原详细范围表保存在Git f72d0066同文件。它是历史检查方向，不是U04未完成待办或数量门槛。当前只实施上述已审39项及必要调用方，不重开历史全功能深查，不继续分支/竞态专项，不恢复退役入口。AI指标/输出映射及科研规则仍由消费项目负责，插件只守本身公开支持契约；不添加科研依赖、统计/结论检查或原始指标本机同步。

## 角色、租约与执行规则

总控兼最终验收：《总控·SimpleExperiment G004 集中查修与交付》01a1fdb5-efe6-78c2-ae6c-861ed4028cdc/local，Sol/high/default，独占计划/README及最终审查。唯一执行：《执行·SimpleExperiment G004 集中查修与交付 接续》01a1ff08-4031-7410-a937-c2ba34e6730c/local，Terra/high/default，独占实现、UI/API/CLI小验收、execution/coverage、唯一检查及scoped Git。2026-11-22原执行01a1fdb5-ce28-7ba1-b9b5-3470a33e8d00自然触发接续（实核6次压缩、第五次后峰值300048、safe_handoff），无在途动作并正式释放；新执行资格match/continue，读齐背景后承接。旧turn完成后归档，不删除。此前主动双接替历史见19043154同文件；旧总控及首任执行均已释放归档。计数以caveman真实状态为准，不新建额外角色；局部进度记execution，必要消息遵循全局AGENTS。

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

总控对专用实例56788:2026-11-21T05:56:46.995Z先核live capabilities/root，仅projects.registry本机只读查询，verifiedAt=2026-11-21T06:55:31.752Z祖先/分支仍missing config value GIT_CONFIG_VALUE_0，排除旧卡片缓存。精确宿主PID56788环境块仅输出COUNT/存在/空值布尔：COUNT10、KEY_0..9存在，VALUE_0/5缺失，其余非空；工具环境对应两个值存在且为空。父Code进程60564无COUNT，由Explorer62344启动。直接故障已实证为宿主indexed配置不完整（Git规则 https://git-scm.com/docs/git-config），不是仓库损坏；具体哪一窗口启动/传递环节丢空值仍未知。Chromium环境构造会过滤empty仅为机制线索，不冒本机调用栈证明。没有展示或落盘配置值、清空Git变量、修改全局配置、注入运行时或重启受保护窗口；环境尚未恢复、真实卡片未复验。此诊断不计10个产品修复或第11个问题。

## 最终审查与统一交付门槛

U03最终源审结论：08d0e02d修复带冒号实验身份回读及空块式cases/experiments登记，实际diff及必要调用链通过。真实Scheduler索引生产函数独立受控提取验证身份；CLI真实加载/list/detail是另一条源码受控检查，不冒同进程端到端。首次两项0/2、exit1，修后目标5/5及完整actionLifecycle42/42、exit0证据复用，总控未重复执行。最长已知身份匹配复用一次加载，不逐冒号远端探测；无歧义旧简称、同名拒绝、精确Worker/路径及隐式case、null优先保留。两项为必要闭包返修，累计仍20。preview diff真实结构added/removed数组正确，先前怀疑排除。J01宿主Git环境未恢复及丢值环节未知，不计产品问题、不以此阻断独立交付；新包实机、服务器均未测。

原U03以累计20个独立修复收包，已完成，不作为U04数量要求。完整交包继续包含实际入口/问题数量、源码基线/diff、真实失败退出码、有效证据、全部未知/未测/阻塞及租约。总控仅审新增契约/跨模块必要关联和最终身份，不重复有效小验收；缺口回原Terra返修，最终明确通过前不做运行交付。原12项/28项通过不自动覆盖新修改。

后续交付继续按build-test-delivery及docs/release-delivery.md：package含build，按需/有效证据不隐式扩大，单进程、原覆盖/超时、真实生成script VM/10890禁硬编码及VSIX身份/平台/闭包/源码/秘密/SHA门禁保留；版本先核未用tag并同步package/lock/runtime，FF提交后才试行同字节发布。普通Latest仍483，不覆盖历史资产、不自动远端更新，不用mock代发行。

全部修改/验证/打包/发行完成，才显式install:latest一次；同版跳过、不force/降级，每目标版最多安装一次。核已装版本/simpleex后停止面板，待本人Reload Window再验新版本界面；不自动更新Worker。源码、生成包、远端试行Release、本机安装、运行重载及真实外部未测分别报告。用户最新目标尚在执行，不以派单、两处修复、对账完、一次检查或CUA子步骤完成结束整轮。

516历史特批：首package340/341 exit1仅旧日志断言，单文件22/22修正；执行器仅接受同输入完整passed receipt，不能组合覆盖，总控批准当时一次完整重跑。完整原失败/组装依据/真实结果见Git668c6d54同文件，不伪改receipt、不绕门禁、不扩通用runner或把特批当以后纯补测默认全跑。
