# G004 重要功能、按钮与MCP深查

## 当前目标与唯一执行边界

2026-11-22用户最新要求：复用已查证据，把剩余单项目界面、按钮、功能及MCP逻辑一次查清修完；先迁出MCP共用逻辑，再彻底退役业务CLI入口/专用代码。所有可独立完成的源码、必要消费者、测试和文档先做到可审，最后集中列出确需本人确认的精确删除、测试退役/替代及复验事项，再统一验收交付。不得因单项发现或普通测试失败停整批，不逐项发版；单项目正常后才处理跨项目延期。这是原G004一个完整业务批次，内部每组≤3强相关问题、≤8非生成源/测试/文档文件，验证后scoped FF提交，不把完整目标缩成一组或巨型提交。

本轮0.5.520源码、最终增量package、试行发布及一次安装已完成，精确凭据见末节。2026-11-23本人已报告重载，明确继续新版本单项目界面与MCP验收、复用有效证据，真实Worker及跨项目限制不变，完成后统一汇报。当前只确认磁盘520，尚须实核重载后的Host/项目身份、稳定MCP入口及实际界面；不把本人重载报告等同新UI验收通过，不重复build/package/安装。

本计划集中语义压缩于30a5d6e0后；完整此前计划可从Git 30a5d6e0同路径读取，原调查/修法/失败不被抹除。进一步原材料见59041060、89498eff同计划及下列现行证据；不另建tracker或重复报告。plan cap18000/90%=16200，execution cap12000/90%=10800；接近阈值整体压缩，保留未决与真实失败。

## 角色、租约与保护

总控兼最终审查《总控·SimpleExperiment G004 集中查修与交付 接续3》01a2040c-d282-7d92-9542-abcdc0689d37/local，Sol/high/default，resolved与实际turn已实核match/continue，独占本计划/README。唯一执行01a20584-8cbd-7383-8626-4997e9d2dacc/local，Terra/high/priority，资格实核后承接；本轮包、发行、安装已交完整包且释放scoped Git，无在途。总控同步本次阶段边界后一次完整派单，释放API/MCP/UI/必要测试、execution/coverage及scoped Git给该执行者；总控不并发操作同一实例。只保留两角色，不另建验收者；service_tier仅记录。旧总控01a1fdb5及旧执行01a203b9/01a204cc均按caveman自然阈值完整交班并归档不删除，真实峰值/资格/租约与基线详见Git 7bf49ba8同计划、6a2cf63c和execution；接替不重置任务/许可或有效证据。

总控无独立待办、仅等完整包/必要决定时按全局事件协调合法结束本轮，不能轮询/催进度；执行者仍有授权可做工作不得套用空闲。必要消息默认无回执。未知在途动作先核归属与结果，不重放。当前原仓是普通Windows工作区，非Pi/自制容器/项目管理器，不触发worktree PR。master追踪origin/master，origin=https://github.com/zlinkw/SimpleExperiment.git；逐组检查diff、UTF8、必要验证后精确stage，普通commit/push/fetch核HEAD一致。remote前进、认证/hooks/同步失败停相关Git升级，不amend/rebase/reset/merge/force/改remote，不stage日志、夹具、无关未跟踪资产。0aa6b27c push后fetch TLS unexpected EOF exit1，经总控精确一次恢复fetch exit0核一致，非通用重试许可。

禁止真实Worker/服务器/SSH/健康版本探测/准备同步/任务查询派发停止/清理/Agent部署，当前项目grant不是验收外部效果授权。共享Worker配置与本人授权不改，不自动切模式/reload/关闭/新开profile，不抢真实VSCode输入/键鼠/剪贴板。仅专用合成根本地必要操作；startup公开GitHub更新检查及自然发现注册是此前明确例外，不扩大Worker请求。保护GPU7全部任务日志产物、/root/autodl-tmp/zlk/MultiModal、原Agent tmux/隧道，MM final.md、Generic Untitled-1、Response to Reviewers.tex等未保存稿件。D:/GitRepo/SimpleMcpAcceptance只读；cleanup_20261111.txt、所有新旧fixtures/temp/约60未跟踪旧VSIX摘要全部保留，不删搬或暂存无关资产。

全局同时仅一个Node/Python测试进程，先单文件node --test --test-force-exit --test-timeout 20000；20秒未退停止、不自动重试/换文件绕过/加限时或改生产求绿。Python只提取函数及imports，不完整import/exec agent/scheduler、不长python-c；spawnSync≤10000/windowsHide/status0。正常未超时失败可按真实新修法定向验证，首失败原日志保留。Windows仅pwsh.exe7，显式UTF8读写与写后回读/diff--check。

## 519实机保留、识别与调查分母

专用根C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f。519当时Host PID29888、默认profile，经health/capabilities/status/state核身份；PID仅当时证据。用户未重配重授，518有基线的offline_import、低流量enabled/effective、5配置/1启用Worker、五类统一项目grant且无workers字段、PLAN experiments/plans/ui_u01_empty_515.yaml、空任务选择、resultCsvDir=experiments/results、原offline-fixture两行均读回。早先默认发现属于稿件窗，未请求该实例；用户打开正确窗后专用Host阻塞解除。原onboarding=false且当前仍false，合成根无experiments/simple_project.yaml，不能冒称true升级恢复；同根/profile true/false/reset只有限定src+Memento 3/3证据。

用户报告人工反复点击仍“未识别”，截图同时有独立PLAN输出门槛。本地识别流程只在代码分发写完成事实的可达缺口已修源码B1，不将其当升级丢true。四次bootstrapProject RESOURCE_CONFLICT证明其时首操作同PID/根持资源、心跳更新；operations空和08:39注册快照无条目均不证明首次流程已完成/死锁。实际withHostOperationLease/bootstrap配假租约对话的重复点击冲突、取消/异常/正常结束释放2/2及1/1，519资源租约14/14可复用。真实首次卡在哪个对话未观察，不重复点击/清锁/自动重载；末尾可选通知脱离外层lease已按用户特批原20秒复验3/3，不推断此前所有冲突皆同根因。

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
|B1 本地识别|本人在精确单根完成有效本地扫描/PLAN及既有确认后保存完成事实，输出/服务器/Agent/运行准备另行保留；合法空PLAN有效，无根/多根/取消/失败不成功，不自动造adapter。c973e9f5基本识别已修；末尾通知脱离租约改动已按用户特批原20秒复验3/3，首失败/超时保留。MCP project_bootstrap集成准备及额外权限不改成新纯本地模式，不扩U07。|
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

## 已批准退役、删除与B1复验的边界

本节旧候选/待审批全文见Git c08b61af及cb44bd81同计划；用户先前已一次明确批准，当前事实以下文“当前收尾”及execution最新尾为准，不恢复旧等待。coverage.g004CliRetirementIndex逐302旧CLI用例、g004ExternalCliReferences最终27外部项、g004CliTestDisposition精确diff保留；按名称/函数重复不得冒业务等价。49旧CLI测试加resultHistoryReadErrors共50路径精确退役，原文件/fixtures/历史保留，glob继续自动发现其他新增文件。原冻结全部文件枚举方案被否决，不复活。

混合消费者保留Host/PLAN/实例/正式作业/checkpoint/归属等断言，13旧job改17当前MCP契约，原CLI便利和已撤销入口不造新功能。Agent旧SFTP专属--file/default-active/token外壳不恢复，公开enabled Worker/allowlist保留，真实后端秘密未测。publicCliAliases曾误Delete File后恢复原路径，Git为M，旧0d5cae56及失误保留；最终按新公开面更新1/1，不能冒整个生命周期已验。

39源码路径精确批准含仓内simpleex.cmd和旧借CLI的MCP包装，不含新launcher/resolver、旧dist、全局shim、安装目录、原测试或临时目录。删除准入与实际成功过程见“当前收尾”；产品删除仍保两页双确认/节点路径类型/根父及./直接子项。B1原首失败后夹具未恢复导致20秒timeout，TEMP/g004-r519-b1-lease-before-ff08.log保留；用户批准改后原文件原20秒唯一复验已3/3，未重放真实识别/清锁/Worker。末尾可选通知脱离外层租约，项目核对及失败记录/postState保留，识别/选择/确认仍等待。

## 集中交付门禁与历史复用

最终源码包应包含各组真实diff/提交、共享接口反向消费者、源提取/VM依赖、必要回归和全部首失败/退出码、受影响入口状态、外部/原生UI精确未测。完成授权内工作、审定上述具体候选后一次集中用户确认，再处理获批动作与验证；不能先问一个再补一个。源修完整且规定检查通过后才开放集中递版/交付。

按build-test-delivery与docs/release-delivery.md核未用patch/tag，同步package/lock/runtime，稳定输入后dry-run核当前矩阵/真实按需复用；runner无法组合旧有效证据时报实际缺口裁决，不沿用516–518全重跑特批。不伪造receipt/删失败或减覆盖求绿。一次集中package内build、max-parallel1/cancel-stdin，失败收完整日志/自然结算/真实exit及lock；Panel模块与实际生成scripts VM、10890业务零命中均必要。实际VSIX版本/Windows兼容/闭包/源字节/秘密/README/SHA通过后，scoped FF源码push/fetch、精确不可覆盖tag、既有GitHub同字节prerelease=true/latest=false；重读远端tag/asset/digest/隔离下载及真实ReleaseClient。权威483/118不变，SFTP120既有兼容包复用不降级。install:latest每目标版本仅一次、同版跳过、不force/降级，核磁盘/MCP稳定入口后停面板，待本人Reload才做新Host实机，不自动部署Worker。

必要真实界面遵循silent-ui-screenshot整个宿主/交互/截图不抢焦点；当前未证hidden/offscreen非激活原生操作能力，不能用假DOM/静态HTML冒实际UI，也不因隔离profile或hidden console就新开可见Electron。复用实际用户截图/旧有效实点；确有新UI缺口给最小方案和限制，不造产品capture框架。临时截图TEMP/CodexUiCaptures/ui-32hex.png，无精确删除许可保留。

历史有效证据索引：U01–03修复20交516，非按钮数；U04原43=39单项目交517＋02/05/06/07跨项目4延期，撤回20/33–36/40–44共10项。原39分组13/17/9、U44/U45/54/55/56的首失败/修正/配置授权及旧UI实点见895038f2、Git 7bf49ba8同计划与coverage；只按未变条件复用，不重放01/08授权/Agent专项，不把跨项目延期或旧CLI成功当新MCP/Worker通过。

519持久化/提示/迁移的首失败及改后证据完整见Git 7bf49ba8同计划、f6c3339f/eab27339/19234b6a/5a3ca8f6及coverage，不再逐轮列重复计数。旧无根workspaceState首次迁移来源和owner写前中断歧义仍未知，不跨profile搬权限连接、不拿历史事实冒当前就绪。

519原试行发行/唯一安装及本人Reload已完成，source/tag6932321534f3b0c2df3b1983bfede2f88f7b868f。其唯一341项/13门禁receipt、VSIX身份/SHA/下载、原VM/闭包/客户端误预期SFTP Latest120而实118的首exit1与修后exit0，完整见Git 7bf49ba8同计划及coverage。519旧包/资产/日志保留，不代本轮迁出新矩阵；219/284超20秒事实以本轮本人精确例外处理，不回写原记录。

516/517/518原首包失败、特批全包、独立VM/WSL失败及退出未知、514坏SHA/并发中止、用尽的owner精确删除许可等完整证据保留在Git 7bf49ba8同计划及现execution/coverage，不重跑求绿或扩为通用豁免。vsce ls30秒ETIMEDOUT原exit1以实际ZIP等价裁决、原独立runtime核验退出未知不能记原命令通过；首夹具及路径归一假缺均留原日志。更早原计划4edd1da5与执行10c0689e/b7c0b42c/f72d0066/c37827c8/eab27339/4bde7f49/89498eff可取回。

J01未修：Host GIT_CONFIG_COUNT10/KEY全有，VALUE0和5缺、传递环节未知；不sanitize/注入/改全局Git或重启稿件。旧CLI --version API_WORKSPACE_MISMATCH exit2不重放。平台旧systemError cybersecurity risk触发未公开，无Daybreak/扫描/重放或换工具模型聊天绕限，自然接替与绕限无关。所有原失败/未测/真实未知不能被新局部通过覆盖。
## 当前收尾：集中批准后连续实施

完整审批/39路径/迁移及失败过程见基线0ee444be、审核5886c9e2、Git 11c076f8/97d723e1/cb44bd81/7bf49ba8同计划和现execution/coverage。本人“同意1、2、3，按清单执行…复用有效证据…统一验收交付，不要再因局部问题停下整批任务”已实际执行，不恢复旧待审批，不扩删除/远端效果。

39普通tracked clean文件经全集预检与批准集合一致、根/祖先/直父无reparse，逐项直父cd及物理cwd/类型/内容身份后仅Remove-Item ./精确叶名、无Force，六组提交及97d723e1核39/39不存在；不含目录/旧dist/全局shim/测试/临时文件。首次call_887a6fcce30d45c4a9a7625697e86b55 CreateProcess blocked by policy未启进程，原失败保留；去掉只读Get-Item的Force、拆预检/delete-only/文档Git后成功，不断言唯一拒因，不换工具权限绕限。

49旧CLI文件302顶层测试、27外部引用、50精确退休路径、13旧job→17MCP及两helper均已实施，原文件/fixture/历史保留，其他glob/argv/caseGroups/20秒不缩。B1唯一特批3/3，消费者等原定向exit0记录见coverage；规划首0/1修后1/1是历史，最终289另见下。首tsc TS7.0.2 input-drift exit2/71emit及Gateway字典类型修正233f31d3保留；39删除后391输入/emit2/exit0。原两日志TEMP/g004-tsc-central-predelete-20261122-terra.log与g004-tsc-after-cli-removal-20261123-terra.log不覆盖。520稳定runtime/compile8 gates及最终package分别留原receipt；不以compile或源码修复冒新Host/UI或所有单项目功能通过。

## 当前决定：最终增量覆盖核验

2026-11-23用户明确批准现有打包器支持本任务逐项核对“仍有效旧结果＋本轮补验”，保留完整覆盖/原日志/失败阻断，不恢复通用测试缓存。已实现--g004-incremental，仅本仓package/max-parallel1，原schema2与普通入口不变；任务schema3区分原receipt继承、原direct实际输出和本轮fresh，核identity+argv、依赖/外部输入、日志与事件SHA、真实结算、当前工具链/输入/选择/产物及全部required gates。旧工具链/原工作树精确字节未知的条目仅经人工适用审定，不伪填为同工具链、精确旧字节或fresh。

cb44bd81的三缺口准备状态已由最终凭据取代，原记录保留该提交。历史031为0pass/1skip、165为5pass/1skip、37为40pass/1skip；340原34项只继承现存30项，4CLI项按批准退休。68原parity只证明Python核心及JS两拒绝边界；69外部py根/字节未知，仅本任务人工推断适用。7旧删锁job264/265/267/268/269/271/274只继承未改安全逻辑，不当前执行删除。

收尾时原三项缺口：旧job219 gpuCollectorFrame，原11/11、exit0/tree，但20857.309ms；旧job284 assemble逐项凭据，原passed/0/tree，但20119.841ms。两者均超过20秒，原记录完整保留。2026-11-23用户明确批准仅作为本任务历史功能覆盖，可据此登记人工继承；不重跑、不扩大未来20秒限制，不改原duration/退出码/tree状态。第三项job289为real-repo plan独立对账原精确pattern，已在最终package内按原20秒唯一fresh运行一次；未先直跑再登记或重复跑，运行冻结真实构建HEAD/selection并在assemble前复核。总控源审后已按本人授权登记两项例外并完成下列最终package/试行/安装，未减门禁。

packageContentPolicy尾部扫尾改保留fixture，原12/12；releaseAcceptance首exit1因jobs-only漏按需，保留首日志，修为jobs∪onDemand/精确50退休反向/非空不交叉后获准1/1。resultCandidateMetadataExclusion仅TemporaryDirectory→保留mkdtemp，原4/4，全部业务断言保留。真实dispose写自身stopped discovery并关闭server、不unlink，旧误判已纠正。完整acceptance额外真实临时删除未获准，未运行。

新mcpProjectOpsContract11/11、隔离windowScopeIsolation8/8均exit0；原事件/日志完整。工具包装兼容仅固定JSON字面量到相邻exec调用，不eval/动态JS，不伪造原事件。续接链固定初始session，原请求/响应SHA/顺序/最终exit0/完整日志都核。首G004扩展20.389s虽输出1/1/exit0仍作超时无效，用户精确特批修后原20秒1/1、7.513s；之后新真实静态包装兼容单次1/1、8661.6398ms，acf338a1，业务两文件未重跑。前39个test注册AST比仅G004 case变化；未改runner各旧pattern依赖审定重冻。ENOBUFS/只读引号错误、原规划/按需夹具失败、误跑及被覆盖独立日志均在execution/coverage保留；丢失mcpWorkerHistory独立log仅取原完整rollout，不伪恢复。

## 0.5.520最终交付事实

原package receipt为simple_cluster/reports/test-workflow/2026-11-23T02-45-43-277Z-10816-package/run.json，构建HEAD f66d36946ade4b911a75636d6f2fc1f28c65111b，schema3 overall passed/exit0；361 active=125历史+235direct+1fresh，6按需未跑，13 gates exit0/tree confirmed、并发1、锁释放；289原pattern1/1、wall4508ms。input=end 671cae51922efc87cbf36ae62c2303aae2584d4596b108b9e3a1ebc095191511；artifact db7fcf773c3322fee515630f1606df02325aebe2ea57f9e80ddaef697432666e；selection 937767f019d502935d1c2ee358f51c629a2c63a221c66bdf184e65035bd762a5永久绑定原构建HEAD，不改写为发布提交、未重组装/重测。

同一VSIX simple-experiment-0.5.520.vsix，2919747字节，SHA256 aaf19107996beae86674b16b6c25f110551e74fb70a6bd545c88d334c9b2cdba；publisher/name simple-local.simple-experiment，engine ^1.100.0/universal。实际ZIP359项、354运行路径与磁盘一致、308闭包齐全，manifest/秘密/README及Panel模块+3真实render scripts VM、10890零命中通过。20包内生成物逐字核ZIP/磁盘/index后fea89fbd/18cd5836/120b9384同步，发布HEAD 7bf49ba84802df56821b098b440b289d3d3eb61e；源码输入/整dist/包字节未改变，仅提交已有验证内容。6个不入包dirty（旧CLI三项/ResultParser/ResultsFactory/mcpServer）及所有旧资产保留。首git add exit1提示dist ignore但7个tracked已暂存，总控核精确index=包后沿用提交；后用精确tracked update，无force/改ignore。

https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.520 实际prerelease=true/draft=false/latest=false，远端git refs tag直接指向7bf49ba8；VSIX与UTF8同名sha两资产名称/大小/digest、隔离下载及manifest一致。实际ReleaseClient确认482可见483、520不降级、SFTP120不降118；权威Latest483/118实测不变。总控本机无local tag，首次git rev-parse v0.5.520^{}报unknown revision（组合命令后续只读使外层exit0），该查询不算通过；后真实GitHub refs API核tag commit，不创建本地tag或force。

唯一npm run install:latest exit0，TEMP/g004-520-install-20261123.log，安装前519/无520，安装后code与磁盘package.json均520，保留DEP0169 warning。simpleex-mcp.cmd→稳定launcher/resolver与已装bin字节相同，520 dist/mcp/server.cjs存在；未运行动态resolver连接旧Host，未使用退役simpleex查版本。安装后停止面板操作，用户须本人Developer: Reload Window。真实Worker/SSH/Agent/tmux/GPU/训练/永久删除、新UI均未验；未自动部署Agent。交付阶段完成，UI及原外部/跨项目延期保留，不能以本包覆盖总数冒所有真实功能通过。

执行完整收包及原失败保存在现execution/coverage、cb44bd81等原Git历史；无新增报告。总控仅同步本计划/README与执行者补齐的实际交付记录；该文档提交不改变已发布不可变tag/VSIX，也不触发再build/package/安装。后续仅根据本人重载/真实反馈接续适用工作，不后台保活或自动重放。

## 重载后单项目验收阶段

基线f9d37425，已发布520及原凭据不改。唯一Terra先核实际发现/Host版本及上述专用根，发现其他稿件窗口不调用。读取匹配实例health/capabilities/OpenAPI后，以真实稳定MCP入口核握手、工具目录和经源码审定的本地只读工具；状态/授权/选择/配置持久化按519实机证据比较，不发送潜在Worker查询。真实界面沿silent-ui-screenshot，须证明不抢焦点的现有机制，不能用VM/静态HTML充当原生UI；没有能力先报具体缺口，不启动可见宿主或造截图框架。依现coverage逐项复用、补当前Host/UI缺口；不重跑完整测试或远端效果。执行完整交包包含真实输入、身份、证据、失败/受限与仍待验项后释放同实例租约，总控仅补必要最终缺口并统一交付。新真实问题在原授权内有界查修，不因局部阻塞停止其余可做项。
