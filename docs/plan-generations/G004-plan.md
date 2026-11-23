# G004 重要功能、按钮与MCP深查

## 当前目标与唯一执行边界

2026-11-22用户最新要求：复用已查证据，把剩余单项目界面、按钮、功能及MCP逻辑一次查清修完；先迁出MCP共用逻辑，再彻底退役业务CLI入口/专用代码。所有可独立完成的源码、必要消费者、测试和文档先做到可审，最后集中列出确需本人确认的精确删除、测试退役/替代及复验事项，再统一验收交付。不得因单项发现或普通测试失败停整批，不逐项发版；单项目正常后才处理跨项目延期。这是原G004一个完整业务批次，内部每组≤3强相关问题、≤8非生成源/测试/文档文件，验证后scoped FF提交，不把完整目标缩成一组或巨型提交。

0.5.520交付及上一阶段限定本地验收已完成，事实与限制见末节。2026-11-23本人最新要求继续查清render探针unknown、CSV预览未解析，确有问题修完，并继续未排查按钮、功能和MCP；复用有效证据，真实Worker与跨项目限制不变，完成后统一汇报。当前整项G004继续活动，不把上一阶段少量实点、目录137或package361项当全部功能调查结案。

本计划集中语义压缩于30a5d6e0后；完整此前计划可从Git 30a5d6e0同路径读取，原调查/修法/失败不被抹除。进一步原材料见59041060、89498eff同计划及下列现行证据；不另建tracker或重复报告。plan cap18000/90%=16200，execution cap12000/90%=10800；接近阈值整体压缩，保留未决与真实失败。

## 角色、租约与保护

总控兼最终审查《总控·SimpleExperiment G004 集中查修与交付 接续3》01a2040c-d282-7d92-9542-abcdc0689d37/local，Sol/high/default，resolved与实际turn已实核match/continue，独占本计划/README。唯一执行01a20584-8cbd-7383-8626-4997e9d2dacc/local，Terra/high/priority，资格实核后承接；本轮包、发行、安装已交完整包且释放scoped Git，无在途。上一阶段已交包释放全部租约。总控同步本次完整范围后，将产品/本地API-MCP-UI/必要测试、execution-coverage及scoped Git租约一次交原执行者；总控保留plan/README及最终独立审查，不并发操作目标实例。只保留两角色，不另建验收者；service_tier仅记录。旧总控01a1fdb5及旧执行01a203b9/01a204cc均按caveman自然阈值完整交班并归档不删除，真实峰值/资格/租约与基线详见Git 7bf49ba8同计划、6a2cf63c和execution；接替不重置任务/许可或有效证据。

总控无独立待办、仅等完整包/必要决定时按全局事件协调合法结束本轮，不能轮询/催进度；执行者仍有授权可做工作不得套用空闲。必要消息默认无回执。未知在途动作先核归属与结果，不重放。当前原仓是普通Windows工作区，非Pi/自制容器/项目管理器，不触发worktree PR。master追踪origin/master，origin=https://github.com/zlinkw/SimpleExperiment.git；逐组检查diff、UTF8、必要验证后精确stage，普通commit/push/fetch核HEAD一致。remote前进、认证/hooks/同步失败停相关Git升级，不amend/rebase/reset/merge/force/改remote，不stage日志、夹具、无关未跟踪资产。0aa6b27c push后fetch TLS unexpected EOF exit1，经总控精确一次恢复fetch exit0核一致，非通用重试许可。

禁止真实Worker/服务器/SSH/健康版本探测/准备同步/任务查询派发停止/清理/Agent部署，当前项目grant不是验收外部效果授权。共享Worker配置与本人授权不改，不自动切模式/reload/关闭/新开profile，不抢真实VSCode输入/键鼠/剪贴板。仅专用合成根本地必要操作；startup公开GitHub更新检查及自然发现注册是此前明确例外，不扩大Worker请求。保护GPU7全部任务日志产物、/root/autodl-tmp/zlk/MultiModal、原Agent tmux/隧道，MM final.md、Generic Untitled-1、Response to Reviewers.tex等未保存稿件。D:/GitRepo/SimpleMcpAcceptance只读；cleanup_20261111.txt、所有新旧fixtures/temp/约60未跟踪旧VSIX摘要全部保留，不删搬或暂存无关资产。

全局同时仅一个Node/Python测试进程，先单文件node --test --test-force-exit --test-timeout 20000；20秒未退停止、不自动重试/换文件绕过/加限时或改生产求绿。Python只提取函数及imports，不完整import/exec agent/scheduler、不长python-c；spawnSync≤10000/windowsHide/status0。正常未超时失败可按真实新修法定向验证，首失败原日志保留。Windows仅pwsh.exe7，显式UTF8读写与写后回读/diff--check。

## 519实机保留、识别与调查分母

专用根C:/Users/ZLK/AppData/Local/Temp/simpleex-normal-ui-g003-20261116-a7c39e2f。519当时Host PID29888、默认profile，经health/capabilities/status/state核身份；PID仅当时证据。用户未重配重授，518有基线的offline_import、低流量enabled/effective、5配置/1启用Worker、五类统一项目grant且无workers字段、PLAN experiments/plans/ui_u01_empty_515.yaml、空任务选择、resultCsvDir=experiments/results、原offline-fixture两行均读回。早先默认发现属于稿件窗，未请求该实例；用户打开正确窗后专用Host阻塞解除。原onboarding=false且当前仍false，合成根无experiments/simple_project.yaml，不能冒称true升级恢复；同根/profile true/false/reset只有限定src+Memento 3/3证据。

用户报告人工反复点击仍“未识别”，截图同时有独立PLAN输出门槛。本地识别流程只在代码分发写完成事实的可达缺口已修源码B1，不将其当升级丢true。四次bootstrapProject RESOURCE_CONFLICT证明其时首操作同PID/根持资源、心跳更新；operations空和08:39注册快照无条目均不证明首次流程已完成/死锁。实际withHostOperationLease/bootstrap配假租约对话的重复点击冲突、取消/异常/正常结束释放2/2及1/1，519资源租约14/14可复用。真实首次卡在哪个对话未观察，不重复点击/清锁/自动重载；末尾可选通知脱离外层lease已按用户特批原20秒复验3/3，不推断此前所有冲突皆同根因。

完整调查唯一入口coverage.g004U04RemainingInventory.g004Reload519LocalAudit，执行摘要G004-execution.md。300原有限逻辑ID处置206旧证条件复用、11当前问题关联、14跨项目未开、26本地部分/真实效果受限、17本轮本地/真实效果受限、1 Agent受限、25清理覆盖受限；不是通过数，11不是根因数。执行边界132本地或混合、79外部/安全/共享设置、14跨项目、75旧延期外部/清理/生命周期。89旧延期逐ID为14跨项目/27本地部分/22补验或复用/1 Agent/25清理。137 MCP另分33本地或混合/49本地网关加Worker受限/23清理Agent/32伴随SFTP下游，含问题，非通过。45命令=42贡献+3 legacy，实际action_catalog167；与300/137重叠不相加，动态物理按钮实例总数未知。源码定位/schema/目录/旧状态不冒实际执行，逐项producer、消费者、条件及证据引用保留，不能重置137或既有211有限结论。

已有真实本机合成history CLI list/show/metric/compare/experiment results/CSV export exit0，0/中文逗号/转义及history/current=false正确；合法精确ID含|经PowerShell→cmd在shim前被解释，exit255，同ID经Node成功。用户随后退役CLI，停止C4 ID编码/shell/EXE修复，该历史证据不冒MCP result_list/export真实成功。后者主动results.list会查启用Worker，未运行。选择按钮状态的一项假设性证据已撤回：selectExperiment在COMMANDS_WITHOUT_UI_STATUS，直接套withUiCommandStatus所得completed不是可达行为；真实公开invoke先于持久化结算返回是独立有效缺陷。

## R519修复与复用入口

A1流程状态、A2布局持久化顺序、A3 Git hook读错保护、A4指标语义、A5自动解析、A6历史错误、B1本地识别、B2选择持久化回执、B3刷新恢复、B4调试包、C1十四本地invoke路由、C2配置target及禁用Worker编辑、C3五Git命令Promise均已交520；C4 CLI修法由本人撤销。各最终机制、commit、首失败和精确适用范围完整见Git `6f14818d:docs/plan-generations/G004-plan.md`同节及现execution/coverage，不以局部测试替代真实Host/UI/Worker。此前selectExperiment套withUiCommandStatus的推断已撤回；真实公开invoke未等待选择持久化是独立成立缺陷。B1原3/3只合成验证，当前真实识别结果见末节。

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

## 交付及历史证据边界

520已完成规定build/包完整性、源同步、不可变试行tag与两资产、隔离下载、实际ReleaseClient及唯一安装；精确事实在末节，不为本轮UI/MCP验收重跑。后续只有新的实际源修才重新确定受影响检查及版本交付；不重写原receipt，不减少coverage/timeout/退休边界。权威Latest仍483/118，不提升、不降级SFTP120、不部署Worker。

历史U01–03修复20交516，非按钮数；U04原43为39单项目交517＋02/05/06/07跨项目4延期；撤回20/33–36/40–44共10项，U44/U45/54/55/56的首失败、配置授权及实点见895038f2和Git `6f14818d`同计划/coverage。519 source/tag6932321534f3b0c2df3b1983bfede2f88f7b868f；原341项/13门禁及唯一安装Reload、516–518首包及VM/WSL失败/退出未知、514坏SHA、并发中止与用尽的owner删除许可均保留该计划与execution/coverage引用，不借此重跑或扩权。原vsce ls超时以实际ZIP等价裁决，不称原命令通过；原独立runtime退出未知保留。旧无根workspaceState首次迁移来源和owner写前中断歧义仍未知，不跨profile搬权限/连接或冒当前就绪。

J01未修：Host GIT_CONFIG_COUNT10/KEY全有而VALUE0/5缺、传递环节未知，不sanitize/注入/改全局Git或重启稿件。旧CLI --version API_WORKSPACE_MISMATCH exit2不重放。平台旧cybersecurity risk触发未公开，无Daybreak/扫描/专项重放或换工具模型绕限。所有失败和未测不能被新局部成功覆盖。

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

唯一npm run install:latest exit0，TEMP/g004-520-install-20261123.log，安装前519/无520，安装后code与磁盘package.json均520，保留DEP0169 warning。simpleex-mcp.cmd→稳定launcher/resolver与已装bin字节相同，520 dist/mcp/server.cjs存在；未运行动态resolver连接旧Host，未使用退役simpleex查版本。安装当时停止面板操作、等待本人Reload，新UI当时未验；其后本人重载与当前UI结果见末节。真实Worker/SSH/Agent/tmux/GPU/训练/永久删除未验，未部署Agent；不能以包覆盖总数冒所有真实功能通过。

执行完整收包及原失败保存在现execution/coverage、cb44bd81等原Git历史；无新增报告。总控仅同步本计划/README与执行者补齐的实际交付记录；该文档提交不改变已发布不可变tag/VSIX，也不触发再build/package/安装。后续仅根据本人重载/真实反馈接续适用工作，不后台保活或自动重放。

## 重载后单项目验收阶段（派单历史，已完成）

基线f9d37425，已发布520及原凭据不改。唯一Terra先核实际发现/Host版本及上述专用根，发现其他稿件窗口不调用。读取匹配实例health/capabilities/OpenAPI后，以真实稳定MCP入口核握手、工具目录和经源码审定的本地只读工具；状态/授权/选择/配置持久化按519实机证据比较，不发送潜在Worker查询。真实界面沿silent-ui-screenshot，须证明不抢焦点的现有机制，不能用VM/静态HTML充当原生UI；没有能力先报具体缺口，不启动可见宿主或造截图框架。依现coverage逐项复用、补当前Host/UI缺口；不重跑完整测试或远端效果。执行完整交包包含真实输入、身份、证据、失败/受限与仍待验项后释放同实例租约，总控仅补必要最终缺口并统一交付。新真实问题在原授权内有界查修，不因局部阻塞停止其余可做项。

## 520实际界面最终核验

本人先许可只读窗口快照，后明确“也允许你直接控制电脑”，覆盖本阶段不激活/不输入限制；Worker/跨项目红线未变。总控重读silent-ui-screenshot与computer-use，使用支持的node_repl/@oai/sky，只选唯一专用窗口87954600，未控制稿件窗。初次只读快照因minimized被拒，后按新增授权还原并取得真实520原生图像/可访问树；没有新capture框架、静态替代、保存或删除截图文件。图像直接保留在原工具事件。

实点计划搜索ui_u01_empty_515：只显示一个匹配、批量已选0、当前PLAN不变；清除搜索恢复。隐藏导航element146点击报outside window bounds(-39,498)，未执行该导航，之后仅拖主列滚动条定位。真实面板显示本机任务0及GPU/tmux未查询/未核实、待同步/待检测和输出缺cases/experiments，未冒运行就绪或查询Worker。

B1真实流程只点识别一次。源码核确认同当前PLAN仅本机扫描/持久化，不触Worker/不改变选择触发结果查询。出现5个Plan确认通知；首坐标点击未选中“继续”，通知收进通知中心、流程仍等本人选择，期间真实出现stalled提示，保留不算死锁。总控从实际通知树选element755“继续”后立即显示“本地工作区已识别”，黄色未识别横幅消失、识别按钮恢复；末尾可选“打开实验准备”通知未点击即完成，验证通知不再占外层租约。没有生成adapter/PLAN或变更Worker/grant。Escape退出通知同时退出辅助侧栏最大化，随后按实际控件998恢复原全宽面板；未改编辑器文件。最终同一45080实例经稳定MCP实际读回projectOnboardingCompleted=true、status520/offline_import，launcher exit0/stderr空；panel ready、documentHidden=false、sectionFailures空，但render-health-probe-pending仍unknown，不冒探针通过。operation_list total0不单独证明锁释放；原完整响应TEMP/g004-520-after-ui-recognition-20261123.json。结合真实按钮恢复和最终通知未点击时的完成事实核本地识别，不重跑原合成3/3、不再次识别/清锁。

本次验收结论：专用520 Host、真实稳定MCP握手/137工具目录、经审定本地只读调用、配置授权保留及实际面板/计划筛选/本地识别均在上述范围通过。复用361既有覆盖，不称137工具或全部物理按钮都实点。synthetic/final.csv当前不符合标准指标列、预览未解析；render health探针未知均保留。真实Worker、SSH/Agent/GPU/tmux/训练/永久删除/跨项目及原受限功能未验，J01未修；不因本地验收提升Latest或再安装。本阶段无需本人再次重载。

## 当前连续阶段：两项根因与剩余功能闭环

基线419187fe。唯一Terra先复用真实520日志及当前源码，查render-health-probe-pending的创建/调度/执行/可见性/上报/Host接收链，区分合法暂态与长期不结算；查专用synthetic/final.csv原始字节、标准/宽表/自定义解析契约、当前选择与检测预览调用链，不能先将输入不合规或程序错误定论。用最小可验证反馈区分具体原因，确有缺陷则在原支持契约内修复并验证受影响消费者，不把unknown改成假ok或把坏输入静默变空成功。

同时从原300逻辑ID、137工具、167 invoke与45命令的现有索引逐项对账，复用已经有效的producer→consumer/参数/权限/错误/终态及定向证据；旧confirmed_defect与519字段须按已交修复更新适用状态。明确哪些是源码尚未审、条件证据缺失、仅真实外部效果未运行，不能把范围分类/schema存在/测试文件通过等同每项已审，也不能只做前两项就结束完整阶段。对仍未审单项目入口连续查必要调用链，补能安全执行的实际本地UI/MCP或有依据的受控消费者检查；外部受限入口仍可审本地路由，禁止执行真实Worker或跨项目效果。处置与证据只更新既有coverage行/字段和execution，不新建tracker/报告，不重复已成立检查。

每组≤3强相关问题/≤8非生成文件，保留首失败、原20秒期限和全部删除/共享配置边界；本人电脑控制授权持续限专用窗口及安全本地交互，不控制稿件窗。完成所有授权内可做调查/修复及必要回归后交完整包：逐母集当前已审/未审/受限的精确差异、两根因、源diff/消费者/日志/实际退出、剩余明确缺口。普通局部失败不停止整批；需新增权限只暂停相关效果并继续其余。源审后才决定必要编译/新版本集中试行交付，不能提前重装520或更改不可变包/tag。
