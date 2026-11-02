# SimpleExperiment 分批产品优化

基准：v0.5.448 / 917316aa311a9bed5da4e5a69e695d6f2c832af9。2026-11-02 用户授权依序实施，每批验证后继续。

## 当前约束

- 每项目单用户、单电脑；可能多 VS Code 窗口。多项目及不同用户可能共享服务器或账号，以用户目录和项目根区分身份。
- 服务状态、日志、缓存及锁优先归服务器项目目录；保留跨窗口必要单写保护，不以单用户为由取消。
- 2026-11-02 用户明确选择：GPU 采样保留账号级公共目录与唯一共享进程；其余 Agent、任务状态、日志和锁默认归项目目录。不得把共享 GPU 采样拆成每项目重复采样。
- 保留自定义布局。新入口替代旧入口，不保留重复旧入口；文件清理与删除授权仍独立，不自动删除旧文件。
- 不连接训练服务器，不部署 Agent，不重跑、传输或清理科研产物，不将试行转正。权威版保持 0.5.440 / SimpleSFTP 0.2.117。
- 普通 Windows 会话，无 PI_EXECUTION_LOCATION/Pi/Herdr 管理器证据。原目录已从干净 0.5.433 快进到刚核对的 origin/master；沿用本仓直接快进 push 规则。
- 每批最多 2–3 个相关问题、8 个源码/文档/测试文件，版本文件计入；生成物除外。测试串行；不增压测、不改超时或退役覆盖。
- mock、隔离渲染、包验证及真实服务器验收分别记录。现场项目均待授权环境核实，不用本机证据冒充。

## 批次顺序

| 批次 | 范围 | 状态 |
| --- | --- | --- |
| P0 | 成功回执停止自动删除；冻结项目与迁移保护 | passed |
| A1a | 默认导航前置实验/进度/产物；不重置自定义顺序 | passed |
| A1b | 首屏当前项目、PLAN、运行概况、阻断和主操作 | passed |
| A2 | PLAN 主线、准备上下文、批量范围；移除被替代旧 UI 入口 | passed |
| B1 | UI/API/CLI 本机意图、服务器接收、执行、完成、同步、观测含义 | passed |
| B2 | 等待原因、自动继续说明、原 job 恢复与中断审核 | passed |
| B3 | 精确停止与重载恢复，不因未知撤销完成 | passed |
| C1 | 精确 job 的产物、退出码、异常及日志跟随 | pending |
| C2 | 当前/全部 PLAN 范围；任务、完整性、同步、汇总分开 | pending |
| C3 | 最新 job 产物与用户范围交集、逐 Worker 同步反馈 | pending |
| D0 | 项目内服务状态与多窗口隔离核查，按证据修正共享路径 | pending |
| D1 | 零目标、禁用、未核实、离线；精确附着命令 | pending |
| D2 | 默认值、全局→服务器→逐卡继承及 Conda 含义 | pending |
| D3 | 保存范围、生效时间与草稿恢复 | pending |
| E1 | 主次/危险操作、错误、帮助、空态与刷新范围 | pending |
| E2 | label、键盘、焦点、窄窗口、长路径、缩放与主题 | pending |

## 已完成 P0

目标：提交成功不再授权永久删除项目内恢复回执。原 release 入口替换为 retain 核对，文件原字节保留；不增加自动回收或机器状态删除入口。
范围：PlanRunHost、成功提交接线、现有 projectStatePaths 回归及其子进程夹具；三处版本元数据与必要收包排除修正，共 8 个非生成文件。本计划单独文档批提交。
保护：现有迁移租约、冻结 root、损坏/异项目拒绝、取消围栏、failed/queued 恢复、原队列/日志/产物、多窗口隔离。
证据：原 releaseSettled 在成功后直接 fs.rm(绝对路径, force)，与当前删除约束冲突；不执行生产状态或科研产物删除来验证。
验证：先单文件 projectStatePaths.test.js（20 秒帽）；再受影响提交恢复/接线检查；build、真实生成 HTML 脚本；package 规定检查及 VSIX 身份/闭包/秘密排除。
交付：patch 递增，普通 fast-forward push、fetch 核对；仅 Prerelease/latest=false；中间批次不安装，全部批次结束后仅安装最终验证包一次并核对，之后不操作活动面板。无远端部署。
说明：回执属于受保护机器状态，计划中的“需要时回收”不实现为新的永久删除入口；旧文件原地保留。

## 执行记录

- P0：19 项定向回归通过。首轮 package 的 318 作业通过，但收包混入开发副本，主动停止精确 VSCE 子进程，overall=failed/exit=1，原日志 2026-11-02T08-19-49-844Z-9716-package/run.json 保留。
- 收包修正后 package 318 作业全部通过（maxObservedConcurrent=1、未运行=0、exit=0），749073ms；凭据 simple_cluster/reports/test-workflow/2026-11-02T08-39-14-977Z-50636-package/run.json。运行闭包 311 模块/2 入口、实际 VSIX 361 项零违规、生成 HTML 三段脚本通过。
- 源码 91e298646f3758c9b8d3f2dabb045c596474d833 已普通 push/fetch 核对。v0.5.449 为 Prerelease/latest=false，资产 2770608 字节，SHA256 4884bc1b8438f99d4cdd288259fabe0276d4c51f92e967caff6bc095ade6d159；真实远端下载字节一致。Release https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.449 。真实更新客户端经已有系统代理核实 Latest 仍为 0.5.440/0.2.117、无降级；初次直连 TLS ECONNRESET 原错误保留。本机未安装、无服务器操作。
- 当前风险：其它项目状态 helper 中原有释放/临时文件代码不在本批改动范围，不能声称整仓删除路径审计完成。
- 提交记录：计划文档 dfae747a5a98eb04f04473085b286f5f0cdcbcc0；P0 源码 91e298646f3758c9b8d3f2dabb045c596474d833。

## 当前批次 A1a

目标：默认顺序为实验、运行进度、产物、准备、GPU、TMUX、诊断、设置；已有自定义顺序、宽度、折叠、固定与详情组不被重置。
范围：前后端布局常量与归一化；已有 uiLayoutSectionLookup、workbenchResourceTree、noviceConfigAccess 套件；三处版本元数据。最多 8 个非生成文件。首屏独立为 A1b，避免超限。
证据：当前默认先显示准备/GPU/TMUX；前端显式把 manual 且 sync 位于末尾的布局重置为默认，违背用户保留自定义布局的要求。
验证：单文件目标检查串行；相关布局存储回归；build 与实际生成 HTML 脚本门禁；后续交付按原试行规则。无性能断言、无训练服务器。
边界：移除不参与当前 UI 的 overview 默认导航项；历史布局数据只作迁移输入，不保留重复功能入口，不删除旧文件。

A1a 进展：uiLayoutSectionLookup 3、noviceConfigAccess 4、workbenchResourceTree 9、projectUiLayoutState 2 项通过。novice 首次暴露已有旧文案断言（基准已为“当前项目配置”），已校正，未改生产文案。
A1a 首轮 build：268 作业中 267 通过，gpuMemoryBudget 的 WSL 子进程在原 10 秒期限超时，overall=failed/exit=1，原凭据 simple_cluster/reports/test-workflow/2026-11-02T09-00-07-108Z-79640-build/run.json 保留。外层 20 秒未触发；没有改期限或生产 GPU 实现。已有 WSL 就绪脚本通过（5001ms）后，同候选单文件 14 项通过，日志 simple_cluster/reports/product-optimization/a1-gpu-focused-20261102-171533/test.log。首轮失败没有改签通过。
A1a 隔离 Chrome：等待真实 webviewStateRendered 回执后，默认八区顺序、自定义 sync 置后、310/410 列宽均通过，renderError 为空；无真实 API。报告 simple_cluster/reports/product-optimization/a1-render-1793611116267.json。初次校验在回执前读取 DOM，修正校验等待后通过，未为此修改产品。
A1a 最终 package：0.5.450，318 作业全部通过，未运行 0，maxObservedConcurrent=1，exit=0，710193ms。凭据 simple_cluster/reports/test-workflow/2026-11-02T09-21-44-231Z-84416-package/run.json；VSIX 2770397 字节，SHA256 500a973dd280a94c359f80c72c032331d8f22996d715c5871efec83eb56543c6，内容门禁零违规。实际包身份为 universal/trial，权威版保持 0.5.440/0.2.117。首次额外身份脚本误用不存在的 simpleBuild 字段，改用实际 simpleExperimentRelease 后通过，未改产品字段。尚未安装；发布只允许 Prerelease/latest=false。

A1a 交付：源码 8c48ef3d3b57f5b2e71f4264763683d11fd09914 已 push/fetch 一致；https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.450 为 draft=false/prerelease=true，真实下载 SHA256 一致；真实更新客户端仍看到稳定 0.5.440/0.2.117，试行 450 不降级。未安装、无训练服务器操作。

## 当前批次 A1b

目标：首屏显示当前项目、明确选择的 PLAN、本机记录概况、阻断原因及安全下一步；默认焦点进入实验，保留保存的布局与导航选择。
范围：实际 PanelHtml.legacy 路径及定向首屏回归、三处版本元数据、本计划，最多 8 个非生成文件。
证据：当前顶栏只有图例和运维按钮；首次 activeResourceSection/lastWorkspaceResource 仍默认 sync。
边界：只读现有状态，不新增查询、科研分析、任务操作或 Agent 部署。运行按钮只由明确目标和现有门禁放行；有活动/失败/未知作业时进入对应进度，不自动重跑。概况明确为本机记录，不冒充本轮服务器观测。
验证：首屏状态分支单文件检查、原工作流回归、build、实际 HTML 脚本与隔离 DOM 渲染、既有 package 门禁。现场服务器验收仍待验证。

A1b 首轮 build：268 作业中 267 通过，exit=1，564918ms。凭据 simple_cluster/reports/test-workflow/2026-11-02T09-37-36-080Z-85572-build/run.json。gpuCollectorRealTmux 的 phase-c 看到新登记即跳出等待，首帧尚未发布时对 None 取 seq；实际失败为 TypeError（未触发超时）。本批增加最小夹具修正：原 8 秒截止时间内等待同一新 epoch 的首帧，保留 >=1、换代、单会话与精确窗口收尾断言，不改产品采集实现或 10/20 秒期限。共 7 个非生成文件。
A1b 夹具修正后原单文件 4 项通过，日志 simple_cluster/reports/product-optimization/a1b-collector-20261102-174745/test.log，原失败不改签。隔离浏览器六种状态与 420px 长路径通过，首次焦点检查发现同一状态刷新会丢失首屏按钮焦点，已改为复用相同 HTML、仅对同项目/PLAN/动作恢复焦点；不将焦点跨目标带入新的运行操作。初次 harness 的 DOMStringMap 序列化与预期降级错误判断已校正，未为此改产品。
A1b 最终 package：318 作业全部通过，未运行 0，maxObservedConcurrent=1，exit=0，707922ms；凭据 simple_cluster/reports/test-workflow/2026-11-02T09-49-35-573Z-91916-package/run.json。隔离 Chrome 六种状态、420px 长路径、同目标焦点刷新与三段实际 HTML 脚本通过，报告 simple_cluster/reports/product-optimization/a1b-render-1793613761200.json；真实 API 未连接。VSIX 0.5.451，2771998 字节，SHA256 249c7c654482d30ed1a519c68f0dc16c29fd0d4bc6d6c8790cb77c58e195e536，内容门禁零违规、universal/trial、权威版 0.5.440/0.2.117 不变。未安装/未部署。
A1b 源码 2ecadaf859f9ba873b9c9755a6418f16f48e9997 已 push/fetch 一致，https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.451 为预发布，真实下载字节/校验文件一致；实际更新客户端稳定版仍为 0.5.440/0.2.117，试行 451 不降级。未安装。

## 当前批次 A2

目标：PLAN 选择、校验、预演、当前/批量提交是实验区主线；分支运维和产物审核收至明确的次级折叠入口，移除被替代的原按钮。
范围：实际 legacy 面板及已有布局/流程测试、三处版本元数据、本计划，最多 8 个非生成文件。
保留：原命令/确认与精确目标绑定、用户详情组/布局和科研分析入口；只调整入口位置，不执行这些操作、不删除科研文件、不缩减审核页双确认。
验证：实际生成 HTML 的结构、按钮归属与唯一性，原 PLAN 通知/批量运行和自定义组回归；编译/build 链与实际脚本门禁、隔离页面、最终 package。未知现场行为继续单列。
A2 目标验证：duplicatePlanSubmissionGuard 10、projectQuickStartWorkflow 8、planNoticeLayout 5、uiLayoutSectionLookup 3、workbenchResourceTree 9 项通过；compile exit=0。实际 Chrome 验证主操作不混清理、两个次级详情默认折叠、完整命令保留，六种首屏状态/焦点/窄窗口及三段 HTML 脚本通过，报告 simple_cluster/reports/product-optimization/a2-render-1793614085604.json。只调整入口；旧 renderPlanRunActions 已替换为准备上下文，未结束任务只导向原进度；运行仍从当前 PLAN 主操作主动确认。全量 package pending。
A2 最终 package：318 作业全部通过，未运行 0，maxObservedConcurrent=1，exit=0，727057ms；凭据 simple_cluster/reports/test-workflow/2026-11-02T10-08-18-753Z-55876-package/run.json。实际生成 HTML 三段脚本通过；VSIX 0.5.452 为 universal/trial、2771863 字节，SHA256 fb6d4bfb5dbcccb033c0d626d8852ef5313a24d7d18180cabed029a13d608a3c，内容门禁零违规，权威版仍为 0.5.440/0.2.117。未安装、未部署、无科研产物操作。
A2 源码 3a27d12497b944f746576fe550386f100917665c 已 push/fetch 一致；https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.452 为 draft=false/prerelease=true，真实下载 SHA256 与精确文件名校验一致。真实更新客户端仍为稳定 0.5.440/0.2.117，试行 452 不降级；未安装。

## 当前批次 B1

目标：CLI 优先消费 tasks.list 已归并的精确协议 2 job 事实；已确证完成与本轮复查未知并存，日志观察不能覆盖它。当前状态、完成确证、同步以及历史来源分开表达。
范围：tasks.list 的身份/观测关联字段、CLI 消费与公开投影、现有 CLI/API 定向回归、三处版本元数据、本计划，最多 8 个非生成文件。等待原因界面独立 B2，不在本批改调度策略。
保护：不改变协议 2 的主动查询归并/完成持久化/精确停止；不新增后台查询，不自动重跑、清理或分析；保留无 API 的历史查看，但明确来源。跨 commandId、Worker、workflow 或输出的观察不能复用。
验证：先单文件复现 CLI 忽略 native jobLifecycle，再对身份错配、确证完成+复查失败、退出但未确证及新观察/历史隔离做必要回归；实际 CLI 隔离接口与完整打包链，不连接真实插件或服务器。

B1 定向证据：新增原生状态 CLI 用例先失败（旧输出没有 native job），修正后 8 项通过；API 既有 33 项通过。精简输出原先丢失 native_state，已保留精简元数据的空/未知字段。旧 active JSON 的冻结字段回归发现新来源字段不应加进历史行，已保留原冻结形状，只为新原生行扩充；原有 snapshot.runtime_source 继续表达历史来源。
B1 额外兼容检查：workerRunLifecycle 6/8，通过隔离 HEAD/v0.5.452 副本复现相同两个失败，均涉及夹具未声明 results.list（第二处因错误响应没有 result_ids）；不改生产 API 或退役测试。基线日志 simple_cluster/reports/product-optimization/b1-baseline-3783ca4a7552464aacc7ad40296559ad/test.log。此文件不在既有 package 规定清单，失败保留；在 C2 结果批次更新其能力声明和结果响应契约后再复验，不能宣称该额外套件已通过。
B1 编译曾在新增身份检查处报告 TS18048（可选 raw 的索引读取），已使用可选访问修正，失败凭据 2026-11-02T10-36-25-731Z-90252-compile 保留，随后 compile exit=0。冻结旧 active schema 的 6 项和原生状态的 8 项已通过；最终 package pending。文件范围为三处实现、一处现有测试、三处版本及本计划，共 8 个非生成文件。
B1 冷启动补查：当保存的完成确证存在，但本轮 Worker 首次返回无 capability 的错误包时，既有归并保留完成且可能没有 job.verificationQueryError；新增 queryState 不能仅据 job 错误字段判 observed。当前冻结候选检查完成后，须补实际 tasks.list 处理器回归，按本轮 Worker 回包标 unknown/not_queried，保留原完成/证据时间。此修正通过前不发布当前候选。
B1 修正前候选 package 318 项通过（exit=0、758248ms，2026-11-02T10-37-38-909Z-15616-package/run.json），但新增实际 tasks.list 处理器回归确实复现 observed/unknown 误判，故未发布。原包保留在 simple_cluster/reports/product-optimization/b1-before-cold-fix/，SHA256 90adeb61b762423246c3e4aaa8ccf54e19c8da17e7fb5b39a65d15ea1ee1e8e6。已据本轮 Worker 回包补 queryError；无 capability、部分查询/日志待核实不能判本轮 observed。完成事实及原时间保留，零目标为 not_queried，项目切换拒绝读取其他队列。修正后的完整候选需重新打包验证。

B1 第二候选 package 318 作业通过（exit=0、745691ms，2026-11-02T10-53-39-320Z-56560-package/run.json），尚未发布。复核补充原生 workflow 聚合：提交接收成功不能代表任务成功；按精确 workflow/任务索引统计确证、缺失及本轮未知，旧日志投影不覆盖它。停止意图同时绑定 commandId 和 Worker；完成须退出码 0、完整产物或原有有效完成确证。新增严格检查曾使仅存完成确证的冷启动用例失败，已保留其原完成事实和证据时间。10 项定向回归及旧 Commands11/12 各 6 项通过；最终冻结候选重新打包，前两次通过不代替最终验证。

B1 最终 package：318 作业全部通过，未运行 0，maxObservedConcurrent=1，exit=0，756074ms；凭据 simple_cluster/reports/test-workflow/2026-11-02T11-11-48-170Z-86944-package/run.json。VSIX 0.5.453 为 universal/trial、2774956 字节，SHA256 071ab1e2b37c125ebf7529bd9459fa705c73bbf5650b87ab214248ecdc3b53da，与真实 package receipt 相符；361 项内容门禁零违规。现场服务器验收仍待验证，未安装、未部署。下一批边界为等待解释、原 job 恢复和完成复查展示，不改变自动调度/停止协议。

B1 交付：源码 5e7e3f7d1ef89808e0de44be53546884cde7ddc8 已 push/fetch 一致，https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.453 为 draft=false/prerelease=true，真实远端下载及校验文件一致。真实更新客户端首次 TLS ECONNRESET，原错误保留，随后同配置核实稳定版仍为 0.5.440/0.2.117，试行 453 不降级，较旧稳定版本能看到更新。未安装、无远端操作。

## 当前批次 B2/B3

目标：本机待派发、接收待确认、服务器已接收分别说明等待原因和继续条件；失败指向原 job；已确认完成的复查未知可见，精确停止意图及重载保留。
证据：实际 legacy 行把 pending 一律称为空卡，协议 2 仍可能显示历史自动重试；完成行未消费 verificationQueryError，冷 Worker 无 capability 时该错误还未投影。原精确停止和完成持久化已存在，本批不重写。
范围：DistributedPlanQueue、实际 PanelHtml.legacy、verifiedCompletion 与 executionCompactOverview 两套定向回归、三处版本及本计划，共 8 个非生成文件。等待解释、完成复查、原任务恢复三个紧密相关问题合批；不新增启动、停止、清理或传输。
保留：原 commandId/Worker、取消围栏、明确非零退出/产物缺陷撤销完成、旧历史展示、用户布局及双确认。完成确证不是操作授权；原证据时间不可刷新。验证为单文件串行、既有停止回归、实际 HTML 三段脚本及隔离渲染、最终 package；训练服务器仍待现场验证。

B2/B3 定向验证：新增 cold/pending Worker 复查用例先失败，修正后 verifiedCompletion 10 项通过；面板新增状态/复查用例先失败，修正后 50 项通过。旧“等待本服务器空卡”文案断言已按新准入含义更新，自动选卡身份和刷新断言保留。localStopControl 3 项（含本机隔离真实 tmux）、jobTmuxLogNavigation 10 项、B1 API/CLI 10 项通过。compile、实际 HTML 3 段脚本通过。隔离 Chrome 四阶段、完成数和原确证时间，以及原六种首屏/窄窗口/焦点通过，报告 simple_cluster/reports/product-optimization/b23-render-1793619005343.json；首次 harness 读取尚未渲染的非活动区，改为导航后调用实际渲染入口，未为此改产品。冻结版本 0.5.454；最终 package pending。

B2/B3 首轮 package：317/318 作业通过，overall=failed/exit=1，758355ms，凭据 simple_cluster/reports/test-workflow/2026-11-02T11-30-37-317Z-46784-package/run.json。tmuxTaskLifecycle 的 command-3 在本机隔离 tmux 中已 dead，但 pane_dead_status 为空，夹具原生观察预算到期；非 Node 20 秒帽、非子进程 10 秒超时。与上一版本相比生成 Python 仅版本常量变化，没有改任务运行代码。原样单文件 3 项随后通过（12543ms），未改生产代码、夹具、断言或期限，不能据此声称根因已解决。原失败保留；既有打包器不接受 failed receipt 组装，因此同一未变实现重新走完整 package，未发布失败候选。

B2/B3 最终 package：318 作业通过，未运行 0，maxObservedConcurrent=1，exit=0，741753ms；凭据 simple_cluster/reports/test-workflow/2026-11-02T11-45-44-473Z-75912-package/run.json，原 tmux 参数作业本次通过（5469ms）。首败不改签，也不声称其环境现象已消失。VSIX 0.5.454 为 universal/trial、2775769 字节，SHA256 7683c1af82a8219591a2dd710a26b2f864fafcd9227d9c7e938180b728ac262b，与 package receipt 相符，361 项内容门禁零违规。2026-11-02 按用户要求重读实际 C:/Users/ZLK/.codex/AGENTS.md、项目 AGENTS、caveman/build-test-delivery 及交付/测试生命周期、安全路径文档；沿用本任务授权和既有流程，不新增代理/插件、限制或全仓审计。下一批仅处理精确日志读取反馈和跟随，未安装、未部署。

## 后续定向核查线索（尚未实施）

- A2：项目分支卡位于 PLAN 主操作前；清理与隔离审核在运行同一工具条。可收至同区的次级详情入口，保持命令身份与用户自定义详情组；移走时移除原按钮，避免复制旧入口。
- B1/B3：TaskLifecycle、WorkerProgressEvidence、VerifiedCompletion 已区分本轮执行/产物/日志观察、持久完成事实及查询错误，不能因 UI 优化重写协议或把旧确认时间当本轮观测；仍需核对 UI/API/CLI 投影及回归。正式协议 2 不走历史自动 retry。
- B1 新证据：tasks.list 已主动归并并返回 jobLifecycle，但 CLI loadRemoteExperiments 只读取 legacy schedulerStates/workerTasks，不消费 jobLifecycle，随后还会叠加窗口日志观察。需让精确 commandId+Worker+workflow 的协议 2 归并事实优先，并公开完成确证和本轮复查状态；无 API 时历史来源必须明确。当前 jobLifecycle 还缺 Plan/project/输出/时间等关联字段，需要最小补充而非另造查询链。
- B3 核查补充：storeWorkerTaskSnapshot 已对协议 2 调用 updateVerifiedCompletions 并安排既有持久化，API 主动查询也经过这条链；不能只看 tasks.list 的纯归并返回就误判它没有保存完成事实。精确停止/取消围栏与重载仍按原契约回归。
- B3 展示待修：UI job 行 blockText 只读 statusQueryError/blockReason，不读 verificationQueryError；已确证完成的复查失败应显示本轮未知且保留完成数。cold Worker 无 capability 的失败也应进入同一诊断通道，不能冒充本轮已观察。
- C1：tmuxCapture 的失败回包仍会覆盖文本并显示普通时间，易丢失上下文；跟随仅靠接近底部隐式判断，没有显式暂停。需绑定 Worker+精确窗口，分开缺失与读取失败，保留同目标旧文本及原时间。
- C2：resultPlanActions 标题是“当前 Plan”，两个主按钮实际都核实全部 Plan；parseResults 主按钮还是旧重建别名。应保留一个全范围更新入口，并将当前 PLAN 映射/文件动作清楚分开。
- D0：agentRuntimeDirs 默认 <父目录>/simple_agent；Agent tmux 默认名仅含前缀和 Worker，不含项目。默认 runtime 应转项目内，并用稳定项目身份分开 Agent 窗口；不迁移或清理旧目录，不改变用户显式目录。用户已选择保留 GPU Collector 的账号/Worker 共享唯一采样源（GpuCollector.ts、AgentLifecycle.ts），其余归项目；当前未改。
- D1：serverSetupReadiness 在 0 Worker 时 missing 为空导致 ready=true；占位 tmuxCmdAgent/Sch/Gpu 从未填充真实目标，仍可复制。应修正空目标语义，提供真实选定窗口的唯一附着入口。
- D2：operationEventMaxDelayMs 配置/后端默认 200，面板三处回退 1000；全局读取缺少与保存的 10000 上限一致的约束。Conda label 含“可选，必填”，configInput/configSelect 的 label 没有 for/id。
- D2/D3：Worker Conda 继承时表单显示全局值；saveWorkerConfigCore 用 effectiveWorkerCondaEnv 作缺值回退，会把继承固化成覆盖。需显式区分继承、系统 Python 与路径，不自动探测/安装科研依赖。
- D3：clearConfigDraftsForCommand 收到 completed 后整 scope 删除草稿，缺少对发出时草稿的快照核对；保存期间的新输入及无对应 pending item 的旧成功回包可能清掉新草稿。失败回包不清草稿的现有行为保留。
- E1 首屏计数返修线索：overviewTaskStats 目前只数 schedulerRowsForState 的兼容任务，没有读取 distributedPlans；协议 2 作业存在时首屏可能仍显示 0。须复用逻辑 PLAN 归并计数且说明记录来源，不能把当前原生 job 与旧任务投影重复累计；E1 实施并补定向回归。
