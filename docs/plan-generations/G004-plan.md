# G004 重要功能、按钮与MCP深查

## 当前目标与唯一执行边界

2026-11-22用户最新要求：复用已查证据，把剩余单项目界面、按钮、功能及MCP逻辑一次查清修完；先迁出MCP共用逻辑，再彻底退役业务CLI入口/专用代码。所有可独立完成的源码、必要消费者、测试和文档先做到可审，最后集中列出确需本人确认的精确删除、测试退役/替代及复验事项，再统一验收交付。不得因单项发现或普通测试失败停整批，不逐项发版；单项目正常后才处理跨项目延期。这是原G004一个完整业务批次，内部每组≤3强相关问题、≤8非生成源/测试/文档文件，验证后scoped FF提交，不把完整目标缩成一组或巨型提交。

运行基线0.5.519，source/tag6932321534f3b0c2df3b1983bfede2f88f7b868f。R519及T1–T7已分组推进，产品源修完整包最终源审前不build/dist/递版/package/发行/安装。B1通知/租约生产与测试两文件仍是未验证dirty候选，不能算通过。当前必要回报仅完整阶段包、需当前决定的阻塞/数据风险和交班，普通进度/修正写既有execution/coverage，不逐条唤醒总控或索回执。

本计划集中语义压缩于30a5d6e0后；完整此前计划可从Git 30a5d6e0同路径读取，原调查/修法/失败不被抹除。进一步原材料见59041060、89498eff同计划及下列现行证据；不另建tracker或重复报告。plan cap18000/90%=16200，execution cap12000/90%=10800；接近阈值整体压缩，保留未决与真实失败。

## 角色、租约与保护

总控兼最终审查《总控·SimpleExperiment G004 集中查修与交付》01a1fdb5-efe6-78c2-ae6c-861ed4028cdc/local，Sol/high，独占本计划与README代次索引。唯一执行现为01a203b9-5495-7092-bca5-fd5610ca2308/local，Terra/high，本人实核resolved/实际turn均match/continue、读完整交班及最新源审裁决；原执行01a202d5在6次压缩/第五次后峰300035自然接续，正式释放全部租约且无在途动作。现执行承接产品/测试/execution/coverage、受限UI/API、唯一Node/Python检查及scoped Git，旧turn实际结束后由接替者核实归档不删除。service_tier只记录实际值，不作为模型/强度门槛，不重置用户界面档位。更早执行01a1ff08、01a1fdb5-ce28及旧总控均已合格交班归档。只保留这两角色，不新建审查者；自然接续仅按caveman实测条件，接替不扩大权限。

总控无独立待办、仅等完整包/必要决定时按全局事件协调合法结束本轮，不能轮询/催进度；执行者仍有授权可做工作不得套用空闲。必要消息默认无回执。未知在途动作先核归属与结果，不重放。当前原仓是普通Windows工作区，非Pi/自制容器/项目管理器，不触发worktree PR。master追踪origin/master，origin=https://github.com/zlinkw/SimpleExperiment.git；逐组检查diff、UTF8、必要验证后精确stage，普通commit/push/fetch核HEAD一致。remote前进、认证/hooks/同步失败停相关Git升级，不amend/rebase/reset/merge/force/改remote，不stage日志、夹具、无关未跟踪资产。0aa6b27c push后fetch TLS unexpected EOF exit1，经总控精确一次恢复fetch exit0核一致，非通用重试许可。

禁止真实Worker/服务器/SSH/健康版本探测/准备同步/任务查询派发停止/清理/Agent部署，当前项目grant不是验收外部效果授权。共享Worker配置与本人授权不改，不自动切模式/reload/关闭/新开profile，不抢真实VSCode输入/键鼠/剪贴板。仅专用合成根本地必要操作；startup公开GitHub更新检查及自然发现注册是此前明确例外，不扩大Worker请求。保护GPU7全部任务日志产物、/root/autodl-tmp/zlk/MultiModal、原Agent tmux/隧道，MM final.md、Generic Untitled-1、Response to Reviewers.tex等未保存稿件。D:/GitRepo/SimpleMcpAcceptance只读；cleanup_20261111.txt、所有新旧fixtures/temp/约60未跟踪旧VSIX摘要全部保留，不删搬或暂存无关资产。

全局同时仅一个Node/Python测试进程，先单文件node --test --test-force-exit --test-timeout 20000；20秒未退停止、不自动重试/换文件绕过/加限时或改生产求绿。Python只提取函数及imports，不完整import/exec agent/scheduler、不长python-c；spawnSync≤10000/windowsHide/status0。正常未超时失败可按真实新修法定向验证，首失败原日志保留。Windows仅pwsh.exe7，显式UTF8读写与写后回读/diff--check。

## 519实机保留、识别与调查分母

专用根C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f。519当时Host PID29888、默认profile，经health/capabilities/status/state核身份；PID仅当时证据。用户未重配重授，518有基线的offline_import、低流量enabled/effective、5配置/1启用Worker、五类统一项目grant且无workers字段、PLAN experiments/plans/ui_u01_empty_515.yaml、空任务选择、resultCsvDir=experiments/results、原offline-fixture两行均读回。早先默认发现属于稿件窗，未请求该实例；用户打开正确窗后专用Host阻塞解除。原onboarding=false且当前仍false，合成根无experiments/simple_project.yaml，不能冒称true升级恢复；同根/profile true/false/reset只有限定src+Memento 3/3证据。

用户报告人工反复点击仍“未识别”，截图同时有独立PLAN输出门槛。本地识别流程只在代码分发写完成事实的可达缺口已修源码B1，不将其当升级丢true。四次bootstrapProject RESOURCE_CONFLICT证明其时首操作同PID/根持资源、心跳更新；operations空和08:39注册快照无条目均不证明首次流程已完成/死锁。实际withHostOperationLease/bootstrap配假租约对话的重复点击冲突、取消/异常/正常结束释放2/2及1/1，519资源租约14/14可复用。真实首次卡在哪个对话未观察，不重复点击/清锁/自动重载；末尾可选通知持外层lease是另有源码及受控证据的B1待验修复，不推断此前所有冲突皆同根因。

完整调查唯一入口coverage.g004U04RemainingInventory.g004Reload519LocalAudit，执行摘要G004-execution.md。300原有限逻辑ID处置206旧证条件复用、11当前问题关联、14跨项目未开、26本地部分/真实效果受限、17本轮本地/真实效果受限、1 Agent受限、25清理覆盖受限；不是通过数，11不是根因数。执行边界132本地或混合、79外部/安全/共享设置、14跨项目、75旧延期外部/清理/生命周期。89旧延期逐ID为14跨项目/27本地部分/22补验或复用/1 Agent/25清理。137 MCP另分33本地或混合/49本地网关加Worker受限/23清理Agent/32伴随SFTP下游，含问题，非通过。45命令=42贡献+3 legacy，实际action_catalog167；与300/137重叠不相加，动态物理按钮实例总数未知。源码定位/schema/目录/旧状态不冒实际执行，逐项producer、消费者、条件及证据引用保留，不能重置137或既有211有限结论。

已有真实本机合成history CLI list/show/metric/compare/experiment results/CSV export exit0，0/中文逗号/转义及history/current=false正确；合法精确ID含|经PowerShell→cmd在shim前被解释，exit255，同ID经Node成功。用户随后退役CLI，停止C4 ID编码/shell/EXE修复，该历史证据不冒MCP result_list/export真实成功。后者主动results.list会查启用Worker，未运行。选择按钮状态的一项假设性证据已撤回：selectExperiment在COMMANDS_WITHOUT_UI_STATUS，直接套withUiCommandStatus所得completed不是可达行为；真实公开invoke先于持久化结算返回是独立有效缺陷。

## R519统一修复及有效证据

全部下列组已在用户原完整修复授权内，源修及各精确测试/提交见execution/coverage，完整旧逐组修法见30a5d6e0本计划。不能凭局部通过宣告全部单项目或新安装通过。

|组|最终机制与必要保留|
|---|---|
|A1 流程状态|flow_state仅ENOENT缺失，坏JSON/EACCES可见，写前读校验、失败保留并可重试；真实apiAdvanceFlow如远端已完成而事实保存失败准确提示，不诱使重放。b4ccc6e3，11/11。|
|A2 布局|save/reset先目标项目持久成功并核上下文，后清旧workspace布局/动作键；失败不清旧、可显式重试，全局布局/明确清除保留。0f5ece5c，13/13、3/3、20/20。|
|A3 Git hook|仅ENOENT空；其他读错不覆盖；未闭合插件标记拒绝并保留未知尾部，正常完整块保留用户逻辑。42609fd3，3/3内存fs，无真实hook。|
|A4 指标|默认不合并AP/AUPRC、F1与macro/micro/weighted等不同语义，保留合法同义、split、0/空与用户显式metricAliases有意映射；真实长宽/JSON消费者。50727e7a，6/6。|
|A5 默认解析|未传preset按当前长/宽/JSON内容契约选择，不固定首long空成功；显式/自定义预设及错误保留，合法空表/0有效，不按文件名猜。930cd685，8/8及8/8。|
|A6 历史错误|历史目录/文件、registry坏JSON/EACCES可见，ENOENT仍缺失；0f932734。业务CLI已弃用的无消费者读取不另造MCP history。|
|B1 本地识别|本人在精确单根完成有效本地扫描/PLAN及既有确认后保存完成事实，输出/服务器/Agent/运行准备另行保留；合法空PLAN有效，无根/多根/取消/失败不成功，不自动造adapter。c973e9f5基本识别已修；末尾通知持租约候选尚未验，见下节。MCP project_bootstrap集成准备及额外权限不改成新纯本地模式，不扩U07。|
|B2 持久化回执|公开两选择及必要调用方等保存后成功，失败传回；save/generate/archive文件已成功而选择失败须准确提示，不回滚重复写；后台有可见失败。51f0e689，46/46、13/13、20/20，首44/45夹具失败保留。不为已撤回面板completed点加包装。|
|B3 刷新恢复|用户GPU/Scheduler/trace刷新、restart/resumeStream/resumeNetwork等待真实结果，未执行/离线/失败不completed；后台原容错/lastError和导入失败回滚保留，不自动重连轮询。60b1e8a7，4/4、16/16、14/14。|
|B4 调试包|缺包/取消/失败不记completed，正常安全暂存/归属/复制保留。9d6a3916，1/1假端口。|
|C1 invoke|14原本地handler不误进远端map，保留allowlist、确认/权限、版本、资源租约、withSafeTransferRetry，远端map仍原路径；54两选择/更新特判、Hub退役不恢复。485e5c70，47/47。具体14动作原表在30a5d6e0，coverage保留逐项集合。|
|C2 设置|set/reset受支持global按真实target，不落错workspaceFolder，projectAdapterRules限workspaceFolder及敏感键限制保留；worker_configure描述可编辑已配置disabled目标，执行仍仅enabled。get/list原始VSCode契约不换成共享有效Worker值，未证差异不计丢配置；bootstrap说明真实副作用。65a09c01/4caddba6，48/48、49/49。|
|C3 Promise|Git三个配置/状态及两个GitHub命令返回原handler Promise，确认/错误不变。8c8c874c，4/4，首3/4夹具失败保留。|
|C4 停止|CLI已被本人撤销，不再修shell参数/编码结果ID，不恢复argv、终端输出或EXE。|

## MCP迁出、能力边界与源审决定

用户明确仅保留UI/MCP。ProjectQueries原为同进程结构化调用，不是MCP起CLI子进程；只迁实际共用业务/连接子集到src/api、src/mcp/query，保留AsyncLocalStorage root/RPC/emit、不用全局cwd/stdout回退，保持137工具输入输出、0/空、错误、握手/实例/项目/授权及文件安全。T1中立LocalApiClient及errors同步Server/legacy/BranchPlanDispatch；T2独立bin/mcp-launch.cjs与simpleex-mcp-resolver.cjs直接匹配Host已装版本dist/mcp/server.cjs；T3上下文/数据；T4结果指标比较；T5实验日志runtime必要子集；T6产物/服务器/资源/PLAN；T7 bin/install/manifest/VSIX政策和指南。新安装仅MCP连接shim，用户已装旧CLI文件不清理。旧bin/simpleex-mcp.cjs仍借旧CLI resolver，不能因MCP名字误保留；新独立launcher/resolver必保留。

本机CLI参数、help/退出码、无Host history/本地导出下载、doctor聚合、隐式PLAN默认、零握手、旧server文件/manifest及细粒度prepare便利不机械变新MCP工具。不新造GPU flatten视图；保留当前GPU原始观测和任务精确身份/0/错误。PLAN显式suite/base/seeds契约不改；plan_matrix仅结构预览，plan_validate/preflight完整同步及正式目录副作用不缩成CLI旧零写入。Hub/promote/任意command固定catalog不恢复。

保留旧实际能力：既有task_dispatch可补automatic（仅显式enabled Worker、不伪造GPU）、quota_remaining（明确PLAN或all，不混job/GPU）、stopRunning（仅明确true、精确原任务停止审核及租约），原四字段指定GPU兼容，job0有效，坏indices不变0。draft_list/candidates可force，清理保留既有UI/invoke双确认，不新增破坏性工具。已装SFTP120的simpleSftp.createOrOpen与project.create同调createOrOpenProject，仅源证未创建；不新工具替代旧CLI表面。

Support.optionalApi仅真正-32601未声明可选方法返回空，其余原Host拒绝/取消/网络错误保留；Gateway只为确实缺方法构造-32601。8249eb4d首7/8吞错、补后7/8 TypeError、最终8/8；context首14/16缺夹具依赖后16/16，WorkerLifecycle4/4、MCPproject43/43部分旧dist，适用范围各自保留。c0465f0f/2551787c无消费者CLI JSON renderer/常量/json标志移除方向通过。

Artifacts规范本机root/每级目录/manifest/链接，保留相对绝对、冒号ID、0字节；remote sourceFiles/Worker来源只返回该节点元数据，不以同名本机文件hash冒远端。8393c772外路径首16/17后17/17；35056314原本地成功夹具被加endpoint:local不能据此称兼容通过，已要求恢复。35c413e1恢复原输入首15/17后17/17，内部Symbol仅标已证无Worker本机index及实际runs目录。Scheduler的hub_job_dir与worker_id同时存在，syncState/synced_at/path存在不证明插件本机副本；无endpoint的带Worker旧index不猜本地、不造来源框架/新持久化。若唯一位置未知且无有效远端元数据，明确ARTIFACT_LOCATION_UNVERIFIED附原ID/声明路径，不能空成功冒确定不存在；已有元数据只限该来源，不承诺恢复全部历史本机副本、不查Worker。

清理验证允许固定已装SimpleSFTP0.2.120真实CleanupFileApi，经真实Gateway/McpHost、纯内存store/fs与假端口；Map化atomicWriteText/rename/remove可代effects，未知真实fs效果必须拒绝，无实际删除/移动/SSH/live发现、不改伴随源码。实际双确认/一次批次/unknown不重发/token/跨根/type用例由4扩至5须按真实输入验证，不用4/4冒5/5；不冒验state-store磁盘原子持久化。9eff6177 preview destination/archiveBatch及observe默认1、f7b476ba四profile和companion实际输入绑定方向通过。f075abb9实际publicServerRecord+Gateway/Host假端口仅证明合成凭据不回显，首缺capabilities0/1后1/1，package/engine/extension.js实际字节参与指纹；不是实际服务器配置/Agent后端全输出脱敏证明。fafa1738原valid-plan经真实parseLocalPlanText/PlanBuilder再Gateway list，11/11假刷新端口，字段包装差异不冒CLI完全等价。

## 待集中确认的退役、删除与B1复验

coverage.g004CliRetirementIndex逐302旧CLI用例，g004ExternalCliReferences目录外26项；名称/函数体重复不证明业务等价。最新分类会随精确证据修正，不用旧46/29/176/51当最终通过；保留迁移断言、旧表面、已迁等价重复、仍受限分别记录。已新增MCP测试纳build/check:full/package/smoke四显式profile，test/test:features/acceptance原glob本就发现；只读规划不等实际运行。

最终交包须给每项适用业务断言的真实消费者与有效证据，以及可直接审核应用的具体候选diff，不只写“待迁移”。混合文件保留Host/PLAN/实例生命周期/训练结果/正式作业/checkpoint/哈希等安全断言，不因目录名整体退休。ExperimentRunner的evidenceTooling录制用例与独立checkpoint已隔开；formalJobExecution旧Runner不能绕过PLAN，候选核当前PLAN准入、任意command拒绝及现Host链，不能连带删其他断言。publicCliAliases旧only-simpleex断言已据本人新公开面授权就地更新1/1，保留文件和覆盖；执行误Delete File后恢复同路径、Git为M、旧0d5cae56和失误保留，之后只原位更新。

旧测试/默认覆盖/超时在本人批准具体清单前不删、skip、减断言或移任务。原g004CliTestDisposition的冻结全部文件枚举glob方案本次否决：会失去未来新增测试自动发现。准备保留原glob/argv/caseGroups、仅针对获批完整旧CLI路径的最小精确规划排除候选及有界契约，直接sourceScript旧job亦精确对应；不另建通用退休系统，未批准不应用。纯导入机械迁移保留所有断言可准备，不以目录外3个import diff冒全部混合项就绪。Agent旧SFTP专用--file/default-active/agent-token预览/confirm外壳不恢复；当前MCP显式enabled Worker、allowlist与已证凭据边界保留，真实后端秘密未测如实写，不为消除分类重放生命周期/撤权专项或平台拦截。

物理删除须精确清单一次确认。coverage候选现39项均deletionReady=false，已补仓内D:/GitRepo/MCP/zlk-cluster-orchestrator/simpleex.cmd（tracked，真实正文直接node dist/cli.js %*，安全根/直接父均仓库根）。旧CLI入口、共享源码迁出后的专用模块/旧安装器/旧借用MCP包装等需正反依赖清零，包含源码/脚本/模板/tsconfig/manifest/sourceReader/helper/测试/矩阵；不得只grep当前生产进口。保留新MCP launcher/resolver，不删全局shim、已装扩展、原测试/fixtures/历史资产/旧dist。本人与用户最终看到的目标必须完整绝对路径、固定file类型、安全根/直接父/依赖风险；大范围“CLI可删”不是未列路径的精确批次确认。

删除只按manual-cleanup-only/safe-delete-paths：全批只读预检并拒绝dirty tracked/链接或reparse/类型或归属不符/越界/缺失/未清依赖；确认后每项直接父cd并核物理cwd，只Remove-Item -LiteralPath ./直接子名不Force，核目标确实不存在，异常停批。不能git rm或helper当执行器、不归档/移开、不删整目录、不自动删生成旧dist。项目产品删除逻辑仍保留精确路径两页确认、节点/安全根/直接父及./子项规则，受控测试不授权真实删除。

B1待验候选：src/extension/legacy.ts末尾通知放runOutsideResourceLease异步非等待，原项目核对、导航失败记录/actionError/postState可见；初始识别/选择/确认仍等待。test/features/localWorkspaceRecognition.test.js用真实bootstrap+外层lease，finally恢复假UI并结算通知。原首测试断言失败后夹具污染致后续20秒timeout exit1，日志TEMP/g004-r519-b1-lease-before-ff08.log；当前两个文件尚未验证/提交，不准自重跑/换文件/加时或用glob profile绕过。整包齐后一次向本人提出：对改后的原文件按原20秒预算唯一一次定向复验，不真实识别/清锁/Worker，原失败保留。用户“别因一项停整批”不自动豁免P0，其他可做项继续。

## 集中交付门禁与历史复用

最终源码包应包含各组真实diff/提交、共享接口反向消费者、源提取/VM依赖、必要回归和全部首失败/退出码、受影响入口状态、外部/原生UI精确未测。完成授权内工作、审定上述具体候选后一次集中用户确认，再处理获批动作与验证；不能先问一个再补一个。源修完整且规定检查通过后才开放集中递版/交付。

按build-test-delivery与docs/release-delivery.md核未用patch/tag，同步package/lock/runtime，稳定输入后dry-run核当前矩阵/真实按需复用；runner无法组合旧有效证据时报实际缺口裁决，不沿用516–518全重跑特批。不伪造receipt/删失败或减覆盖求绿。一次集中package内build、max-parallel1/cancel-stdin，失败收完整日志/自然结算/真实exit及lock；Panel模块与实际生成scripts VM、10890业务零命中均必要。实际VSIX版本/Windows兼容/闭包/源字节/秘密/README/SHA通过后，scoped FF源码push/fetch、精确不可覆盖tag、既有GitHub同字节prerelease=true/latest=false；重读远端tag/asset/digest/隔离下载及真实ReleaseClient。权威483/118不变，SFTP120既有兼容包复用不降级。install:latest每目标版本仅一次、同版跳过、不force/降级，核磁盘/MCP稳定入口后停面板，待本人Reload才做新Host实机，不自动部署Worker。

必要真实界面遵循silent-ui-screenshot整个宿主/交互/截图不抢焦点；当前未证hidden/offscreen非激活原生操作能力，不能用假DOM/静态HTML冒实际UI，也不因隔离profile或hidden console就新开可见Electron。复用实际用户截图/旧有效实点；确有新UI缺口给最小方案和限制，不造产品capture框架。临时截图TEMP/CodexUiCaptures/ui-32hex.png，无精确删除许可保留。

历史有效证据索引：U01/U02/U03的2+8+10=20修复交516，非按钮总数。U04原43=39单项目交517+02/05/06/07跨项目4延期；撤回20、33–36、40–44共10项，原39分组13/17/9见895038f2与coverage，01/08不重放授权/Agent专项。U44人工映射排除正确，U45仅配置恢复。54选择417634df首42/43后43/43；55统一授权bc0cc61c/c37827c8 45/45两轮、旧grant不扩；56离线预览895038f2首坏行7/8后8/8。518真实选择/设置/离线导入恢复两行、517 PLAN/结果/日志旧实点按未变条件复用。

519持久化f6c3339f首0/1后1/1；eab27339 7/8后9/9及9/9；19234b6a 9/10后10/10及10/10；5a3ca8f6未实现0/2后3/3、提示1/1、迁移10/10。旧无根workspaceState首次迁移来源和owner写前中断歧义仍未知，不跨profile搬权限连接，不拿历史事实冒当前就绪。

519已发布https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.519 ，source/tag6932321534f3b0c2df3b1983bfede2f88f7b868f，prerelease/draft=false/Latest483；VSIX2988831字节、SHA525e235fe7e380bf3684edf5b8bfd3dd7620badefd964dcdcd671b14c0216b33，远端与TEMP/g004-519-download-ff08下载一致。唯一package 2026-11-22T06-35-19-310Z-69208-package/run.json：341/341、13门禁exit0，输入=结束/并发1/树confirmed/锁释放/按需0，模块+3script VM、326/325/373/376闭包及10890零命中。客户端首误SFTP Latest120、实118 exit1，修临时预期后exit0；482见483，519/SFTP120不降级；安装一次exit0含DEP0169，用户已Reload。此旧receipt不代本轮迁出新矩阵。

518首339/341 exit1，两fixture43/43及10/10后特批341/341+13；独立runtime核验exit丢失未知，以实际ZIP等价325/324/371裁决，不冒原命令通过。517首337/341 exit1/stdin closed取消失败，四定向43/43、19/19、13/13、10/10（Agent补首9/10跨realm）后特批341/341+13。日志原12/13与独立VM3/3及首夹具失败、旧/新dist13/13分别保留。516首340/341→22/22→特批341/341；vsce ls30秒ETIMEDOUT exit1不重跑、actualZIP等价及首./归一假缺保留。514坏60位sha、旧并发中止/BUILD_LOCK_UNSETTLED、其它历史失败及用尽owner精确删除许可按原Git/日志保留，不作通用豁免。原U01/U02计划4edd1da5、执行10c0689e/b7c0b42c/f72d0066/c37827c8/eab27339/4bde7f49/89498eff可取回。

J01未修：Host GIT_CONFIG_COUNT10/KEY全有，VALUE0和5缺、传递环节未知；不sanitize/注入/改全局Git或重启稿件。旧CLI --version API_WORKSPACE_MISMATCH exit2不重放。平台旧systemError cybersecurity risk触发未公开，无Daybreak/扫描/重放或换工具模型聊天绕限，自然接替与绕限无关。所有原失败/未测/真实未知不能被新局部通过覆盖。
## 0ee444be完整候选包复审与一次集中确认

执行者01a203b9交齐本轮授权内可做工作，HEAD=origin/master/FETCH_HEAD=0ee444bef20581c3367cc0b20cd60b8872430a9d，已释放全部执行/检查/Git/受限UI租约且无在途。总控接回最终审查，不自动开启真实外部或跨项目。B1两文件仍dirty、未验证/提交；其余tracked clean，未构建/递版/发行/安装。

e4fd93ed的file_cleanup_preview显式managed_tmux、缺省不变/非法值拒绝，真实Gateway/Host假后端17/17；c9b2dd99现runtimeRow/pickExperiment别名与精确身份14/14；ca8d012b同值PLAN配置、INFO/ERROR和failed/OOM诊断18/18，均限定合成输入。源审通过其当前业务方向，旧函数observation与现row输出不同，不能据此称整个CLI接口等价。

当前49个test/cli文件302个顶层用例均有精确未应用候选diff，目录外补localApi:259为27项；61份联合git apply --check exit0只是补丁可应用，非行为通过。旧helper两份及目录外合并/导入候选在原文件处理；checkpoint、正式PLAN/实例/安全等适用断言保留。综合生命周期与stable entry三项原“保留迁移”按assertionMap拆分：当前结构化查询/身份/日志/配置/诊断/shim保护已有对应证据；无Host history、旧CLI自动绑定/默认目标/终端/exit/dry-run等专属行为作为退休申请，不冒称未迁差异已等价。真实Worker/主动结果/传输/Agent后端输出与原生UI未测边界保留。

矩阵五文件候选仅精确过滤49个旧CLI文件及resultHistoryReadErrors共50文件，保留glob未来发现、其他argv/caseGroups和20秒；13个旧cli-contract直接job改列17个现MCP契约，worker-mode移旧manualDispatch，移除已退役测试的旧分类并同步独立规划/磁盘对账。当前全部未应用，不能以候选已通过宣称默认覆盖已变或MCP全集已通过；获准后必须按实际变更定向验及规划核对，不强求保持旧341作业数。

总控只读预检39个精确file：当前全存在、均非dirty、根/直接父匹配、祖先及终项无reparse，问题0；不等删除授权或届时身份核验。用户一次确认范围为：①coverage.g004CliRemovalCandidates的39个完整绝对路径，测试/构建依赖迁清且最终预检后才删；②0ee444be基线的302旧CLI用例及27外部项中明确退休/替代/机械迁移的精确候选、上述矩阵与两helper变更，保留不相关断言/夹具/历史；③改后原localWorkspaceRecognition单文件原20秒预算唯一一次定向复验，保留原超时失败，不改时限/换文件/实机复现。任何未批准项不擅自从测试和门禁移除。确认后连续完成获准分组与必要验证，最终统一源码/构建/试行发行/一次安装交付；授权依然不含真实服务器或跨项目。
