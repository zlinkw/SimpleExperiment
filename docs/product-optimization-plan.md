# SimpleExperiment 分批产品优化

基准：v0.5.448 / 917316aa311a9bed5da4e5a69e695d6f2c832af9。2026-11-02 用户授权依序实施，每批验证后继续。

## 当前约束

- 每项目单用户、单电脑；可能多 VS Code 窗口。多项目及不同用户可能共享服务器或账号，以用户目录和项目根区分身份。
- 服务状态、日志、缓存及锁优先归服务器项目目录；保留跨窗口必要单写保护，不以单用户为由取消。
- 2026-11-02 用户明确选择：GPU 采样保留账号级公共目录与唯一共享进程；其余 Agent、任务状态、日志和锁默认归项目目录。不得把共享 GPU 采样拆成每项目重复采样。
- 保留自定义布局。新入口替代旧入口，不保留重复旧入口；文件清理与删除授权仍独立，不自动删除旧文件。
- 不连接训练服务器，不部署 Agent，不重跑、传输或清理科研产物，不将试行转正。权威版保持 0.5.440 / SimpleSFTP 0.2.117。
- 用户要求当前交付不能残留旧错误前缀机制。前缀整改组的中间批次只做规定验证、打包及源码提交/push，收口后统一公开完整试行版本；中间 VSIX 不安装，不把源码已推送等同远端发行完成。
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
| C1 | 精确 job 的产物、退出码、异常及日志跟随 | passed |
| C2-base | CLI 结果夹具能力与主动查询响应契约 | passed |
| C2a | 结果主页面的当前/全部 PLAN 范围 | passed |
| C2b | 资源动作、兼容任务与生成下一步中的旧结果入口 | passed |
| C2c | 自定义固定项中的结果别名迁移，保留布局和位置 | passed |
| C3 | 最新 job 产物与用户范围交集、逐 Worker 同步反馈 | passed |
| D0a | 项目内 runtime 与辅助日志的同步/覆盖保护 | passed |
| PFX0 | 单一全局前缀来源、保存范围和每次打开提醒 | passed |
| PFX-test | 受影响夹具使用正式前缀字段，目录方法提取不绑定旧参数个数 | passed |
| PFX-test2 | 根绑定检查覆盖实际安装映射，不强制所有插件路径在项目外 | passed |
| PFX-test3 | 生命周期组合检查遵循生成目标和已支持窗口协议 | passed |
| PFX-test4 | 目录与会话组合夹具复用真实命名导出 | passed |
| PFX-test5 | TensorBoard 使用真实命名行为，不约束局部变量写法 | passed |
| PFX-test6 | 将注释匹配替换为原进程内的真实 TensorBoard 命名断言 | passed |
| PFX-test7 | 私有 tmux 夹具包含真实共用前缀函数依赖 | passed |
| PFX-test8 | 归一化组合检查不绑定 TensorBoard 格式函数的参数个数 | passed |
| PFX-test9 | 旧停止夹具使用真实取消确认契约，保留未确认停止意图 | passed |
| PFX-test10 | TensorBoard 名称检查归负责命名的 Agent，保留无硬编码约束 | passed |
| PFX-base | 前缀默认值与归一化收敛一处，提供实际目录命名 | passed |
| PFX1 / D0b | 默认 Agent 目录使用全局前缀并归项目，预览一致 | passed |
| PFX2a / D0c | Agent 窗口按规范项目身份隔离 | passed |
| PFX2b | 远端目录和前缀只读取全局传入值 | passed |
| PFX2c | 移除个人主终端猜测及错误启动兜底 | passed |
| PFX2d | 调度前缀归一化与真实原队列定位 | passed |
| PFX2e | 通用关窗不得按 Agent 会话名跳过精确窗口保护 | passed |
| PFX2f1 | TensorBoard runtime 使用全局前缀及精确项目服务身份 | passed |
| PFX2f2 | Host 传递唯一全局值，展示实际返回的服务目标 | passed |
| PFX3a | API 路径与策略预填移除品牌推断和旧 Hub 来源 | passed |
| PFX3b | Host 与实际 UI 路径校验移除固定目录名推断 | passed |
| PFX4 / D0d | 说明与受影响调用链收口，检查错误前缀机制无残留 | pending |
| D0b | 默认 Agent 目录归项目，实际值与草稿预览一致 | passed |
| D0c | Agent 服务窗口按项目身份隔离，共享 GPU 采样保留 | passed |
| D0d | 更新目录与服务说明，保留完整使用指南 | pending |
| D1-test | 日志/低流量夹具隔离附着命令组件边界 | passed |
| D1a | 移除占位附着命令，复制前主动核实精确 Worker/窗口 | pending |
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

B2/B3 交付：源码 a34419fe8518ef625926f1cf3871e24111861bc7 已 push/fetch 一致；https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.454 为 draft=false/prerelease=true，真实下载及精确文件名校验一致。真实更新客户端仍看到稳定 0.5.440/0.2.117，试行 454 不降级；未安装、无训练服务器操作。

## 当前批次 C1

目标：精确 Worker+窗口的读取失败保留同目标旧日志和原成功时间，不把失败或空日志写成成功；显式暂停/继续跟随及跳到最新，不触发额外读取、指标落盘或科研分析。
证据：实际 tmuxCapture 处理器即使 ok=false 仍用空 text 覆盖旧文本，并用失败回包时间作普通获取时间；captureTarget 仅记 window，未绑定 Worker。日志区域只有隐式接近底部跟随。原 job→真实窗口定位、退出码/产物/异常分栏已存在且 B2/B3 回归通过，保留。
范围：实际 PanelHtml.legacy、一处既有 jobTmuxLogNavigation 测试、三处版本及本计划；最多增加原请求需要的页面覆盖说明，合计不超过 8 个非生成文件。无新后端查询、超时、截断、缓存框架或传输。
验证：实际消息处理器的成功→失败/空文本、跨 Worker/窗口回复、跟随暂停位置；既有日志定位及低流量回归，实际生成 HTML 脚本、隔离渲染、最终 package。未找到窗口与读取失败沿用不同反馈；真实服务器日志和重载后的现场验收仍待验证。

C1 定向证据：补齐原消息夹具的 tmuxCaptureOrigin 后，真实处理器复现失败回包清空旧日志；修正后 jobTmuxLogNavigation 12 项、panelWebviewScriptHealth 9 项通过。暂停/继续/跳到最新只改滚动，不发送新读取；空文本与缺少源时间分别显示，不伪造新成功时间。compile 通过；实际 HTML 三段脚本和隔离 Chrome 的读取失败保留、原时间、暂停位置 50、跳到最新保持暂停、原六种首屏/窄窗口/焦点通过，报告 simple_cluster/reports/product-optimization/c1-render-1793621285019.json。新增原请求要求的 [页面覆盖表](product-ui-coverage.md)，分开源码/隔离和待现场验证；共 7 个非生成文件，冻结版本 0.5.455，最终 package pending。

C1 最终 package：318 作业通过，未运行 0，maxObservedConcurrent=1，exit=0，743608ms；凭据 simple_cluster/reports/test-workflow/2026-11-02T12-08-48-566Z-35976-package/run.json。实际生成 HTML 的三段脚本通过，VSIX 0.5.455 为 universal/trial、2776461 字节，SHA256 e81a79f16bf04bfcb56e86579ebb3d11edf4e4a2ac3d4cd730f20797e81700ed，与 receipt 相符，361 项内容门禁零违规。覆盖文档按 UTF-8 复读通过；未安装、无服务器操作。下一批只修结果操作范围及相应旧 CLI 夹具能力契约，不改结果归属规则或添加分析。

C1 交付：源码 7874ce8a25fde9c023688123ffb17af690b88a3e 已 push/fetch 一致；https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.455 为 draft=false/prerelease=true，真实下载及精确文件名校验一致。真实更新客户端仍为稳定 0.5.440/0.2.117，试行 455 不降级；未安装、无服务器操作。

## C2-base：CLI 结果夹具

范围仅为 workerRunLifecycle 的两处旧结果夹具与本计划；产品 CLI、结果收集实现及相关运行输入未改。补齐 results.list 能力及 active_query/current/summary.results 响应，原 Worker、PLAN、case、seed 错配拒绝断言全部保留。
验证：完整单文件 8 项通过，exit=0；日志 simple_cluster/reports/product-optimization/c2-target-1793622372390/workerRunLifecycle-fixed.log。复用 C1 0.5.455 的未改 CLI 编译输出与有效覆盖，不因夹具修复再次打包、递增运行版本或发布。首次补响应漏 current 标识的真实失败保留。该测试批单独提交；尚未完成的 C2a UI 和版本修改不纳入本批。

## 当前批次 C2a

目标：结果主页面更新入口明确作用于本项目全部 PLAN 和全部启用 Worker；PLAN 上下文与实际列名来源分别表达，项目列映射范围明确；移除主页面被替代的旧按钮，保留公开 API 与主动科研分析功能。
证据：当前 Plan 卡内两个按钮实际同走全项目收集；右侧资源动作还保留解析/刷新别名。B1 已在未改基线复现两项额外 CLI 结果夹具失败：未声明/响应真实 results.list，而非产品归属匹配失效。
范围：实际 legacy UI，resultActionWorkflow/resultDatasetHierarchy/remoteResultInspectionWorkflow 三处既有界面契约，三处版本及本计划，共 8 个非生成文件；CLI 夹具已独立为 C2-base，覆盖表在后续有文件余量的批次更新。只改可见范围和测试契约，不改结果过滤、安全校验、后端收集或分析策略，不创建原始指标本机副本。资源动作及兼容任务中的旧入口另作 C2b；全部批次完成前不安装。
验证：既有结果 UI/映射/动作回归、完整 CLI 结果归属套件（保留错 Worker/PLAN/case/seed 拒绝）、实际 HTML 和隔离页面范围，最终 package。现场收集/传输仍待验证，不把本机模拟接口当服务器验收。

C2a 定向验证：workerRunLifecycle 原先 6/8 的两个失败已修复为当前 results.list 能力、active_query/current 与完整 summary.results 响应；全套 8 项通过，错 Worker/PLAN/case/seed 的原拒绝断言保留。首次补响应漏 current 标识的失败也保留在 simple_cluster/reports/product-optimization/c2-target-1793622372390/workerRunLifecycle.log。resultActionWorkflow 的三条旧内部结构断言已替换为真实 update() 的同范围共享、完成后再次查询和既有实时声明夹具；原项目/连接绑定检查保留，freshResultHost 25 项（含取消、归属变化、旧查询不可发布）通过。resultActionWorkflow 1、resultDatasetHierarchy 10、resultMappingEditor 1、resultCommandPhaseRouting 3、resultNextActionWorkflow 3 项通过；原失败日志不覆盖。
C2a 主页面复用已有 syncPendingPlanArtifacts → syncPendingResultMetricsFromUi → 全项目收集，移除另一个要求“先选当前 PLAN”的重复同步别名，后端未改。生成下一步只导向现有总表或实验区；资源动作和兼容任务中的其余旧入口由 C2b 继续替换。实际 Chrome 证实总表内唯一全项目更新按钮、无单 PLAN 参数、范围帮助、项目映射生效范围及源文件、旧主页面按钮移除；首次 harness 未读取 data-tip，随后发现既有标题压缩隐藏第二句作用范围，已把映射范围前置。最终报告 simple_cluster/reports/product-optimization/c2-render-1793623225304.json，实际 HTML 三段脚本、原六种首屏/焦点/窄窗口通过。冻结 0.5.456，最终 package pending。

C2a 首轮 package：317/318 作业通过，overall=failed/exit=1，694480ms；凭据 simple_cluster/reports/test-workflow/2026-11-02T12-41-08-222Z-71872-package/run.json。唯一失败文件 remoteResultInspectionWorkflow 的两个旧 UI 断言仍要求“更新结果汇总”及已移除的当前 PLAN 同步按钮，保留真实失败；其余作业没有重签。按最新全局规则和交付技能，CLI 夹具单独按测试增量完成。C2a 的打包器 validateReceiptForAssemble 当前只接收 overall=passed、完整输入指纹及逐项计划一致的单一 package/check:full 记录，不能表达 failed 记录加定向补跑；不篡改记录或绕过门禁。后续先修正失败界面契约，再按项目明确要求的 build/package 路径完成运行版本交付。

C2-base 提交 a06b1ea2f5046841c6538ed5cd2dec823e5dba3c 已普通 push/fetch 一致；未重复编译、打包、安装或发布。C2a remoteResultInspectionWorkflow 完整 14 项补跑通过（exit=0），保留原公开别名的兼容、安全和无原始副本检查，只替换主界面范围断言；日志 simple_cluster/reports/product-optimization/c2-target-1793622372390/remoteResultInspectionWorkflow-fixed.log。当前项目 AGENTS 仍明确要求运行版本交付执行 npm run package，且现有组装门禁拒绝首轮 failed 记录，未获准更改该执行契约；因此最终运行版本沿用该既有入口，不恢复通用复用参数或新增收包旁路。实现和已通过隔离渲染未再变更。

C2a 最终 package：318 作业通过、未运行 0、maxObservedConcurrent=1、exit=0、729979ms；凭据 simple_cluster/reports/test-workflow/2026-11-02T12-54-02-759Z-32380-package/run.json，原失败不改签。实际 HTML 三段脚本及模块 vm.Script 通过。VSIX 0.5.456 为 universal/trial、2776430 字节，SHA256 6d6392fc40acc6b53bcde2b7d8e32c2792386702da6a6946b60325c275df4230，与 receipt 相符；361 项收包门禁零违规。共 8 个非生成文件；现场收集仍待验证，未安装或部署。下一批为剩余旧结果 UI 入口及零结果恢复上下文；不改科研分析或结果安全边界。

C2a 交付：源码 f50ca164058a07940dced20e21e8b726d8e69920 已普通 push/fetch 一致；https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.456 为 draft=false/prerelease=true，真实下载的包、字节数及精确文件名校验一致。普通更新客户端网络请求遇到 GitHub 公共配额 HTTP 403，延期至 2026-11-02T13:16:26Z；保留该真实非通过结果。随后通过现有 gh 登录凭据仅为 api.github.com 添加认证，实际 ReleaseClient 读取真实公开 Release 并通过解析：稳定仍为 0.5.440/0.2.117，试行不降级，旧稳定版本可更新；未使用 mock，未改产品认证或全局设置。报告 simple_cluster/reports/product-optimization/c2-target-1793622372390/actual-update-client.json。未安装、无训练服务器操作。

## 当前批次 C2b

目标：移除资源动作、兼容任务卡/批量/详情中把全项目更新伪装成单任务解析的旧入口；零结果恢复只导向真实作用范围，补齐可达缺失函数造成的页面错误。
范围：实际 legacy UI，resultActionWorkflow/resultNextActionWorkflow/duplicatePlanSubmissionGuard 三处既有测试，三处版本及本计划，共 8 个非生成文件。自定义固定项迁移独立 C2c，保留位置、布局和主动科研分析。不得新增后台读取、自动执行检查/分析或改变结果安全边界。
验证：先用实际隔离页面复现零结果路径，再定向验证恢复导航、原提交防重及结果动作；编译、生成 HTML 脚本、现有打包与试行交付。C2a 包和远端资产已核实后才开始本批。

C2b 定向证据：在实际生成页面直接调用 renderPlanPreparationContext 的零结果恢复分支，复现 ReferenceError: renderRuntimeContractRecoveryActions is not defined；单纯发送状态未触发该惰性分支，不把它记作失败复现。已改为消费现有阶段的 label/message，复用既有导航/显式命令渲染，不另建恢复框架。结果更新阶段只跳到项目总表；检查阶段保留精确 PLAN 的用户主动按钮，运行中只跳进度。资源动作合并为全项目更新，兼容任务卡/批量/详情只导向项目结果，不暗示仅解析选中 job。duplicatePlanSubmissionGuard 11、resultNextActionWorkflow 3、resultActionWorkflow 1、overviewProjectReadiness 4、taskActionLayout 1 项通过；前一夹具不再用空函数冒充恢复实现。compile exit=0；真实 Chrome 的未检查/检查中/完成/失败四种零结果恢复、任务卡/批量导航、资源动作及原六种首屏/焦点/窄窗口通过，报告 simple_cluster/reports/product-optimization/c2b-render-1793625170573.json；实际 HTML 三段脚本通过。冻结 0.5.457，最终 package pending。自定义保存项和相应能力映射留 C2c；覆盖表在后续余量批次更新。

C2b 最终 package：318 作业通过、未运行 0、maxObservedConcurrent=1、exit=0、705831ms；凭据 simple_cluster/reports/test-workflow/2026-11-02T13-14-00-857Z-20448-package/run.json。VSIX 0.5.457 为 universal/trial、2776748 字节，SHA256 d441a8aa6e238ece467b1ef2eda747128283e66bce83f468a3d4e4721511c842，与 receipt 相符；361 项内容门禁零违规，实际 HTML 三段及模块脚本通过。共 8 个非生成文件，未安装、无训练服务器操作。下一批仅迁移保存的自定义结果动作并明确其范围；原始指标仍不落本机，旧公开 API 保留。

C2b 交付：源码 7fcae50f81deaeccea439cc644503085292889d1 已普通 push/fetch 一致；https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.457 为 draft=false/prerelease=true，实际远端下载、字节数及精确文件名校验一致。本次实际 ReleaseClient 的普通公开请求通过：稳定版仍为 0.5.440/0.2.117，试行 457 不降级，旧稳定版本可更新；无需认证替换。未安装、未操作训练服务器。

## 当前批次 C2c

目标：已保存的 parseResults/refreshResults 自定义动作迁移到现有全项目更新入口，保留位置、分组、稳定 id 和用户自定名称；移除原单任务/批量参数，避免把全项目操作伪装成选中任务。
范围：实际 legacy UI、既有 uiActionNormalizationCache、三处版本、本计划和页面覆盖表，共 7 个非生成文件。原默认按钮名称改为明确全 PLAN；用户命名保留，帮助明确范围。公开旧 API 不移除，不重置自定义布局，不改变服务器结果收集协议。
验证：迁移、保存/重载归一化、自定义顺序/名称/列宽、无范围串借和当前按钮帮助；相关原有布局回归、真实生成 HTML、隔离页面及现有 package。实际新收集使用 ResultCollectionHost 的 resultCollection 与 SimpleSFTP 内存读取契约，不把旧 Agent parse-results 能力加成新门禁。无后台操作或科研分析。

C2c 定向证据：uiActionNormalizationCache 6、uiLayoutSectionLookup 3、projectUiLayoutState 2、workbenchResourceTree 9 项通过。新增行为核对原 id、位置、用户名称保留，旧默认名称改为全项目更新，旧 Worker/PLAN/job/batch 参数清空，重复归一化不再改变结果；保留原缓存断言及期限，不新增性能测试。实际隔离渲染先发现 featureCommandLabel 缺少新命令，且 COMMAND_HELP_TEXT 中重复短项覆盖完整范围，已在本批修正并补真实标签函数断言。compile 通过；最终实际 Chrome 的保存/再次载入、八区自定义顺序、310/410 列宽、自定名称、精确空 payload、全部 PLAN/Worker 帮助，以及 C2b 恢复/原六种首屏/焦点/窄窗口与三段脚本通过，报告 simple_cluster/reports/product-optimization/c2c-render-1793626354778.json。UTF-8 复读通过，冻结 0.5.458，共 7 个非生成文件；最终 package pending。

C2c 最终 package：318 作业通过、未运行 0、maxObservedConcurrent=1、exit=0、710321ms；凭据 simple_cluster/reports/test-workflow/2026-11-02T13-33-23-576Z-67996-package/run.json。VSIX 0.5.458 为 universal/trial、2776912 字节，SHA256 4a9b44d39b2f10fa9dff1f0578ea01ca2eda69367b6780d39b5578fa2e8818ac，与 receipt 相符；361 项内容门禁零违规，实际 HTML 三段及模块脚本通过。原服务器结果读取契约未改，自定义布局不重置。下一批只完善同步回执、范围及逐 Worker 反馈，不改变最新 job 归属或同步策略。

C2c 交付：源码 53ebbcabc6e70d3710fea3a63e3ddafcb348ae7d 已普通 push/fetch 一致；https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.458 为 draft=false/prerelease=true，真实下载、字节数及精确文件名校验一致。实际公开 ReleaseClient 确认稳定版仍为 0.5.440/0.2.117，试行不降级、旧稳定可更新。未安装、无远端部署。

## 当前批次 C3

目标：展示精确 job 同步记录的原时间、真实范围、错误及逐启用 Worker 确证；PLAN 同步展示明确来源、待同步与查询未知名单。完成事实、产物完整、同步、结果汇总仍分别表达。
证据：LatestJobArtifacts 已正确选择最新逻辑 job，并与用户勾选范围取交集；PlanArtifactSyncStatus 已按 command/目标/范围保护确证，保留原 checkedAt。现有 UI 只显示通用同步状态，隐藏逐台反馈和范围。partial 回执没有可靠逐台成功名单，不能从旧 workerIds 推断本轮部分成功。
范围：实际 legacy UI、既有 executionCompactOverview、三处版本、本计划与覆盖表，共 7 个非生成文件。保持现有最新来源、当前勾选、未勾选不补回及 SimpleSFTP 传输契约；不新增查询、传输、重跑、清理或科研分析，不保存原始指标副本。
验证：最新 job/交集/同步确证既有回归，逐 Worker 的确证、partial、excluded、目标变化、原时间和重绘，以及实际 HTML/隔离渲染与 package。真实服务器同步和文件结果仍待验证。

C3 定向证据：executionCompactOverview 51、latestJobArtifacts 3、planArtifactSyncStatus 16、completedJobLatestSync 32 项通过。最新 job、整个 work_dirs 默认及范围交集等既有实现未改；已有投影测试改用与回执一致的四台配置，而非默认两台夹具。同步失败/目标变化不借旧 workerIds 确认部分成功，原完成数保留；原 checkedAt、范围及错误完整展示，Worker 名称变化进入重绘键。按钮帮助压缩阶段的首轮断言失败保留，已增可见 job/PLAN 操作范围与全部目标，隔离验证显式走实际提示装饰后核实完整可访问帮助。最终真实 Chrome 的确证、partial、目标替换、禁用 Worker、长路径/420px、原时间/来源、完成数、精确 job 按钮及 C2c 自定义布局/重载、原首屏/焦点与三段脚本通过，报告 simple_cluster/reports/product-optimization/c3-render-1793627597625.json。compile 通过，UTF-8 复读通过，共 7 个非生成文件；冻结 0.5.459，最终 package pending。

C3 最终 package：318 作业全部通过、未运行 0、maxParallel=1、exit=0、726287ms；凭据 simple_cluster/reports/test-workflow/2026-11-02T13-54-24-591Z-9248-package/run.json。VSIX 0.5.459 为 universal/trial、2777697 字节，SHA256 c4e1905610d7adca94567e90d1269d26af9aaf954a8b54bdae6789b915e64235，与 receipt 相符；361 项内容门禁零违规，实际 HTML 三段及模块脚本通过。包身份及字节校验之后，汇总脚本因读取不存在的 maxObservedConcurrent 字段 exit=1；随后按实际 schema 读取记录 exit=0，未换包、未改测试或重跑打包。下一批先处理项目内默认 runtime 的现有保护映射，再改目录和服务命名；共享 GPU 采样不动。真实服务器验收仍待验证。

C3 交付：源码 5c75ad0dedabcf0cc8cf58135da00bb16c817181 已普通 push/fetch 一致；https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.459 为 draft=false/prerelease=true，真实远端下载、字节数及精确文件名校验一致。实际公开 ReleaseClient 确认稳定版仍为 0.5.440/0.2.117，试行不降级、旧稳定可更新。未安装、未部署、无训练服务器操作。

## 当前批次 D0a

目标：在改变默认目录前，把实际受管 runtime 目录和 Agent lifecycle 日志接入已有逐端点保护映射；不让科研同步或覆盖触碰辅助服务文件。
证据：targetRootGuard 已消费实际 installDir，但机器状态路径只包含 stateRoot/显式状态及共享 GPU 根；实际部署代码在 <installDir>/simple_cluster/runtime，AgentLifecycle 将日志写入 <installDir>/logs/agent-lifecycle.log。当前相对保护不能覆盖这两处。须通过真实 Host 映射与边界回归证明后修正，不执行真实传输或删除。
范围：既有 Host targetRootGuard、既有 projectRootMap 测试、三处版本及本计划，共 6 个非生成文件。只注册实际两个受管路径，保留显式安装根与代码根相同、或与科研目录混用的已有场景；不把整个安装根或整个项目改成机器状态。不改变默认目录、GPU 采样、调度或服务生命周期，不迁移/清理文件。
验证：先复现项目内 runtime 保护缺口，覆盖默认专用目录及显式同根/混合目录，科研 work_dirs 和 tmp/result 保持可同步；原端点/共享传输/状态写入边界回归、compile/package 及试行交付。目录与命名分开后续批次，确保每批最多 8 文件。

D0a 定向证据：projectRootMap 新增真实 Host 映射断言先以 13/14、exit=1 复现 /srv/project/simple_agent 内 runtime 未受保护；只加入现有 runtime 目录与实际 lifecycle 日志文件后 14/14 通过。同根和 work_dirs 混合安装均保留科学模型、tmp/result、普通日志和 runtimeX 近似名称。completedJobArtifactRootBinding 7 项通过，绑定、未知映射、切换取消及 verifyOnly 保留。实际科研代码上传使用精确 manifest；受管 Agent 部署走既有独立 uploadFiles 入口，不被项目传输保护误挡，未执行部署。compile 及实际 HTML 三段/模块脚本通过；UI 实现未变，复用 C3 实际渲染，不重做隔离页面。原失败日志 simple_cluster/reports/product-optimization/d0a-target-1793628822391/before.log 保留；冻结 0.5.460，共 6 个非生成文件，最终 package pending。

D0a 最终 package：318 作业全部通过、未运行 0、maxObservedConcurrent=1、exit=0、768448ms；凭据 simple_cluster/reports/test-workflow/2026-11-02T14-17-56-106Z-43196-package/run.json。VSIX 0.5.460 为 universal/trial、2777800 字节，SHA256 f350e59a31400f9f4ea714e23f6c1a6b2b9681de5dd2a63a36e65dbbcdef5c86，与 receipt 相符，361 项收包门禁零违规。只补实际两个受管路径，不改变整个安装根语义、默认位置、服务命名或共享 GPU 采样。下一批修改默认目录及明确的项目路径调用方、预览；未安装、未部署。

D0a 交付：9affe8948150ec72ad983e35b6bc70bdc182ff24 已普通 push/fetch 一致。GitHub API/GraphQL 请求出现 EOF，未重建或覆盖已有发布；按用户要求改网页。实际发布页 https://github.com/zlinkw/SimpleExperiment/releases/tag/v0.5.460 显示预发布和同一提交，网页下载的 VSIX 为 2777800 字节、SHA256 与上文一致，下载的精确文件名校验清单与本地逐字节一致。实际公开 ReleaseClient 已确认稳定版仍 0.5.440/0.2.117，试行不降级。未安装、无服务器操作。

## 前缀返修修订与当前批次 PFX0

用户追加：simple 是默认前缀，zlk 仅为一个用户曾使用的自定义值；前缀统一为全局变量。默认未改时每次打开插件提醒，解释作用和重要性，最终版本不能保留原错误机制。
原 D0b 未提交修改已完整保存为隔离 patch，暂停，不丢弃；按 PFX0→PFX-base→PFX1→PFX2→PFX3→PFX4 验证后继续原 D1–E2。前缀返修收口前不发布这组中间包、不安装。
PFX0 范围：保留现有唯一 application 配置键 tunnel.remoteTmuxSessionPrefix 及用户已有全局值，读取只取 globalValue，不再让旧项目快照、sessionPrefix 别名或工作区覆盖夺权。面板保存前缀写用户全局设置，Conda 仍属项目。默认 simple 的首次显示/隐藏后再次打开均提醒；不以持久“已提示”标记跳过。无项目也可设置；默认未改没有“不再提示”。
边界：本批先修来源、保存与提示，不宣称目录和运行时代码已收口；目录、服务、Python 和路径校验残留分后续有界批次。真实旧目录和窗口不自动迁移、改名、重启或清理；共享 GPU 采样保留账号公共唯一源。包品牌、历史格式读取和精确用户路径不能做 simple↔zlk 全局替换。
发现：Host 有多个 sessionPrefix 优先于正式设置的读取分支；loadSetupConfig 可让项目 savedDefaultsWin 盖过全局值；一次性项目提示保存“已提示”后永不再问。TmuxRemoteExecutor 固定 zlk1，Agent Python bootstrap 优先 zlk1，ApiWorkflow 将 simple 路径段映射成 zlk，RemoteRootPolicyPrefill 存在相反迁移猜测；均须后续按真实调用链修正，不能仅改文案。
验证：真实 Host 方法隔离检查跨项目/无项目全局读取、每次打开提醒、合法保存/非法值拒绝；原全局/配额/面板打开回归、实际 HTML/隔离渲染及规定 package。PFX0 最多 8 个非生成文件，现场服务器仍待验证。

PFX0 定向结果：publicRuntimeEnvironmentDefault 7、globalConfigPersistence 2、serverQuotaPersistence 4、workerRouting 3、configurationChangeWorkflow 1、autoConnectRealtimeOnPanelOpen 2 项通过。旧静态夹具把新增独立方法切进 applySetupDraft，首轮 1/2 失败；已改用真实 AST 方法边界并保留其他连接/Conda 不写全局的断言。配额回归随后 2/4 暴露完整 Worker 快照也含前缀，现仅显式前缀表单选项允许全局写入，普通项目保存强制使用当前全局值；新增真实行为检查防止旧值回写。原失败日志保留，未改期限或退役覆盖。
实际隔离页面先未打开设置导致目标缺失；打开后复现前缀 simple→alice 不重绘。compactSetupForSignature 漏字段，已补实际字段并新增行为检查。最终真实 Chrome 的默认提醒、全局范围说明、自定前缀刷新，以及 C3 同步/C2c 自定义布局/重载、原六种首屏/焦点/窄窗口均通过；报告 simple_cluster/reports/product-optimization/pfx0-render-1793631454880.json。实际 HTML 三段脚本通过，compile exit=0，UTF-8 复读通过。冻结 0.5.461，共 8 个非生成文件；最终 package pending。

PFX0 首轮 package：318 作业中 312 通过、6 失败，exit=1、700136ms；凭据 2026-11-02T14-58-36-039Z-19640-package/run.json，未发布新包。tmuxGpuSessionClose 未提供真实已载入 setupConfig；manualLaunchMessage 共用夹具故意让 sessionPrefix 覆盖正式字段，使 gpuMemoryScheduling/schedulerRuntimeUpdate/gpuQuotaScheduling/manualTmuxAdmission 四文件失败；workerPreparationPipeline 同样只提供旧别名。原目标、确认、窗口身份、配额、停止、非变异断言均保留，不改生产代码恢复退役读取。
插入 PFX-test 纯测试准备批：以上三个夹具改用正式已解析字段；另将两个真实目录方法夹具的起始标记改为方法名，避免绑定旧参数个数。共 5 个测试文件及本计划，无运行版本/包/安装变更。验证受影响的六文件和两目录根绑定文件后独立提交，PFX0 实现仍未提交，继续修正前缀与 Conda 签名关联后重验。

PFX-test 验证：八文件 77 项通过（13+9+2+11+1+8+7+26），所有原边界断言保留。首次 schedulerRuntimeUpdate 输出成功 JSON，但 WSL 子进程在原 10 秒内未退出，status=null/exit=1，原日志保留；既有 prepare-wsl-tests 确认就绪（2476ms）后，该文件 2 项在原期限内通过（主例 5074ms），其余依序通过。未据此宣称偶发根因已证，未改期限/性能断言/退役覆盖。PFX0 整批仍未通过，无 461 发布或安装；当前仅提交测试准备和记录。下一批边界仍为全局前缀来源、提醒、保存与 Conda 不受牵连。

PFX-test 提交 203645252da589baf7168fe84d01650040d0598c 已普通 push/fetch 一致。PFX0 继续：新增真实 Host 用例先以 7/8、exit=1 证明全局前缀变化会使项目 Conda 被全局 Conda 替换；旧签名包含前缀是原因。现只对 Conda 保存比较签名，并读取已存在的双字段旧签名中的 Conda 部分，不把前缀作为项目覆盖依据。原全局 Conda 变更的继承规则保留。publicRuntimeEnvironmentDefault 8、globalConfigPersistence 2、serverQuotaPersistence 4 项通过；其余已有效回归复用。默认 simple（包括空值归一化）每次打开提醒。既有 Xshell 和 tmux 两种归一化的差异在 PFX-base 统一，本批不宣称所有非法旧输入路径已收口。UI 未再改变，复用上文实际 Chrome 和三段脚本结果；冻结 0.5.461，完整 package 重新验证。

PFX0 最终验证：318 作业全部通过、未运行 0、maxObservedConcurrent=1、exit=0、718130ms；凭据 2026-11-02T15-15-27-600Z-46984-package/run.json。VSIX 0.5.461 为 universal/trial、2778832 字节，SHA256 9125757ea7aef2a63dd9cff21bc828fa44a6214d437496a0b4450481da73c1a1，与 receipt 一致；361 项内容门禁零违规，实际 HTML 三段及模块脚本通过。身份校验通过后读取误写的 gate-13 日志路径 exit=1；按真实 receipt 的 gate-12 路径复读 exit=0，未重打包或更改检查结果。共 8 个非生成文件。当前为前缀整改内部批次：远端发行未完成，待 PFX4 收口；未安装、无服务器操作。下一批只统一前缀常量/归一化与命名工具，不改目录、不触发迁移或服务操作。

## 当前批次 PFX-base

PFX0 源码 dfc9b870957eac522e36581e4add6ab27555fb91 已普通 push/fetch 一致。内部包 0.5.461 未发布、未安装；前缀整改组尚未交付完成。
目标：simple 默认值与前缀归一化只维护一处；设置、提醒和 tmux 读取相同实际值。目录名由同一前缀生成，供下一批项目内路径使用。
证据：Xshell 以整串合法性失败回退 simple，AgentTmuxPolicy 则小写、替换非法字符并限长；旧全局非法值可在面板与提醒得到不同前缀。两处默认也各自写死。
范围：纯 RemoteResourcePrefix 模块、既有 AgentTmuxPolicy/Xshell 默认与归一化、既有 agentTmuxPolicy 测试、三处版本、本计划，共 8 个非生成文件。沿用已公开的 tmux 归一化规则；设置保存仍按原正式正则拒绝非法输入。simple 仅为默认，zlk 与 alice 一样只是合法自定义输入，不做路径替换。
边界：本批不改变默认安装位置、项目命名或任何实际窗口，不迁移旧目录，不改变共享 GPU 身份。包内固定代码路径、扩展 ID 和历史证据不属于个人前缀默认。
验收：默认与有效前缀在 schema/设置/tmux 一致，任意自定义前缀可生成目录名；原全局提醒、Conda、启动命令和设置回归及规定 package。目录、Python 和错误迁移机制继续后续批次，不提前宣称无残留。预计本批 20–30 分钟；现场验证仍待授权。

PFX-base 定向结果：agentTmuxPolicy 3、publicRuntimeEnvironmentDefault 8、agentInstallDirIsolation 1、serverQuotaPersistence 4、configurationSettings 4 项通过。共享实现覆盖 simple 默认、zlk/alice 自定义、大小写、空值、非法字符及既有 32 位规则，设置与 tmux 计算一致；原明确输入保存校验未变。compile exit=0；实际 HTML 三段及模块脚本通过，UI 未改，复用 PFX0 隔离页面。冻结内部版本 0.5.462，共 8 个非生成文件；规定 package pending，不安装、不发布中间包。

PFX-base 最终验证：318 作业全部通过、未运行 0、maxObservedConcurrent=1、exit=0、699464ms；凭据 2026-11-02T15-32-12-506Z-91220-package/run.json。VSIX 0.5.462 为 universal/trial、2779309 字节，SHA256 55a5506bc1a50442c0fbda91cc50e197c212b92e6b1855a3e2a35661f2b6a58b，与 receipt 一致；362 项内容门禁零违规，新编译的共享前缀模块确实在包内，实际 HTML 三段/模块脚本通过。本批未触发目录或窗口变化。当前仅内部包，远端发行待整组收口、未安装。下一批把默认 Agent 目录放到项目内，使用全局前缀并保持显式路径，修正核实调用方和草稿预览；不迁移旧文件。

## 当前批次 PFX1 / D0b

PFX-base 源码 fa0fb7f61d99dd25b78a891ac88621d5fe4ae8f7 已普通 push/fetch 一致。0.5.462 仍为内部验证包。
目标：默认 <项目父目录>/<项目名>/<全局前缀>_agent；实际 runtime、状态与日志沿用安装根内布局。无本地项目或未确定目录时，不生成可用启动/部署目标。显式安装路径原样优先，不改名或迁移旧目录。
证据：旧默认在项目父目录内固定 simple_agent；两处版本核实会吞掉目录解析失败并猜回旧位置。草稿预览同样使用父目录/simple_agent，且无法区分用户明确填写的默认同名路径。
范围：既有 Host 目录/核实调用、实际 legacy UI 的已保存/草稿预览及重绘字段、agentInstallDirIsolation/projectRemoteDestinationClarity 两现有套件、三处版本和本计划，共 8 个非生成文件。目录名复用 PFX-base，已知完整 projectWorkDir 明确传入，不二次追加本地项目名。
保留：D0a runtime/日志与原机器状态保护；部署专用 SimpleSFTP uploadFiles、科研 work_dirs/tmp/result；共享 GPU 采样根与唯一源不变；所有真实迁移/写入仍须用户原操作和确认。本轮不操作服务器。项目服务 tmux 命名另批处理。
验收：默认/任意前缀、两个项目同父目录、显式路径、无项目、已知完整项目路径；核实不得猜路径或把未知当成功；草稿变更不改已保存值，显式默认同名路径也不随草稿移动。原版本核实、根绑定、设置缓存与实际生成 HTML/隔离页面、规定 package。预计 20–30 分钟，远端现场仍待验证。

PFX1 定向进展：agentInstallDirIsolation 5 项通过，包含真实版本核实方法的精确 URL 路径、显式路径及无目录零请求；projectRemoteDestinationClarity 首轮 3/4 失败，旧“登录后进入”label 在 fa0fb7f6 基准也不存在，现改为实际渲染的代码/runtime 完整路径断言，4 项通过。首次基准读取因 Node 默认 1MB maxBuffer 不足失败；改用 PowerShell UTF-8 读取后证实旧文案不在基准，不改变产品登录行为。agentRuntimeVerificationLatency 1、projectRootMap 14、completedJobArtifactRootBinding 7 项通过。
planSubmissionStateGuard 为 25/26：旧第一例强制 prefixes=0，但安装根移入项目后 runtime 和 lifecycle 日志必须被 D0a 保护。插入 PFX-test2 纯测试准备批，仅该已有套件和本计划；按实际安装根相对代码根的关系核对精确两个保护前缀，外部 Agent/GPU 状态仍不误入项目映射，全部原 GET/归属/取消/零写入断言保留。PFX1 源码与 UI 仍未提交，不能宣称本批已完成。
PFX-test2 验证：planSubmissionStateGuard 26 项、既有 agentSessionStateCache 2 项通过；外部安装仍要求零项目保护前缀，内部安装只接受精确 runtime/日志路径，未删断言、未改期限或生产根保护。纯测试/记录两文件独立提交，无新运行版本、打包或安装；PFX1 继续隔离页面和规定 package。

PFX-test2 提交 31be391fbaa2452b5a6ea8090eb49eaa870fd16b 已普通 push/fetch 一致。PFX1 定向检查合计 59 项通过（目录 5、预览 4、版本核实 1、根映射 14、产物绑定 7、提交根保护 26、会话缓存 2）。新增版本核实行为使用真实 Host 方法，记录精确请求路径；无目录发出零请求，不冒充真实网络。实际 Chrome 验证两个 Worker 的默认/显式同名目录、未保存父目录预览、保存值不变、仅显式意图变化时仍重绘，以及前缀提醒、C3/C2c 与原六种首屏/焦点/窄窗口；报告 simple_cluster/reports/product-optimization/pfx1-render-1793634842926.json。compile 及实际 HTML 三段脚本通过，UTF-8 复读通过。冻结内部版本 0.5.463，PFX1 共 8 个非生成文件，规定 package pending；不发布中间包、不安装。

PFX1 最终验证：318 作业全部通过、未运行 0、maxObservedConcurrent=1、exit=0、707238ms；凭据 2026-11-02T15-55-56-080Z-86432-package/run.json。VSIX 0.5.463 为 universal/trial、2779635 字节，SHA256 07cfaedf18227bb74459aa6781f0d93844ffa5d77d5963cae458a56df0f4e211，与 receipt 一致；362 项内容门禁零违规，实际 HTML 三段/模块脚本通过。无真实迁移或服务器操作，内部包未发布、未安装。下一批复用现有生命周期协议的显式窗口参数，以稳定项目身份区分 Agent 窗口；同项目多窗口复用，其他项目保持各自窗口和目录，共享 GPU 采样不变。SimpleSFTP 与 Agent 的公共 lifecycle Python 必须保持字节相同，不为改名擅自改动一侧协议。

## 当前批次 PFX2 / D0c

PFX-test4 提交 24ecbfbd02c374ba60f4ec1116fa25cfedcc3780 已普通 push/fetch 一致。本批复用原生命周期显式窗口协议和项目规范身份：会话按全局前缀与 Worker 分组，Agent 窗口按项目身份命名；同项目复用，不同目录即使同名项目也不串用。生命周期确认、启动、日志缺省目标和设置预览共用该目标；显式选定日志窗口不被覆盖。无项目拒绝生成猜测目标。公共 lifecycle Python、共享 GPU 采样与科研窗口不变。内部版本 0.5.464，共 8 个非生成文件；定向、真实隔离渲染、规定打包待验证，不发布中间包、不安装。

PFX1 源码 83805e8fb051061f10064d518ae4baf0efc9119b 已普通 push/fetch 一致，0.5.463 仅内部包。
目标：Agent 的精确窗口以既有稳定项目身份区分；同项目多窗口复用，同账号不同项目各自窗口，继续只关闭指定 windowId。目录已项目内隔离，共享 GPU 采样不变。
实现选择：沿用全局前缀+Worker 的 tmux 服务会话，将项目身份放到显式 tmuxWindow 参数。现有公共 lifecycle 已支持同会话不同窗口、精确查找/关闭；不改其与 SimpleSFTP 的逐字节共享 Python，不新增进程管理或升级配套协议。会话名保留现有上限，项目窗口只需 22 字符，避免最长合法前缀和 80 位 Worker ID 加会话后缀时超出现有传输上限。
先做 PFX-test3 纯测试准备：independentAgent 保留会话/端点/无 PID 等断言，窗口验证为已支持的 Agent 窗口格式并绑定实际项目；agentPreparationLifecycle 使用真实生成器比较 Host 的窗口目标，目标夹具补齐实际 projectWorkDir。共两测试和本计划，验证后独立提交，不改运行版本。项目唯一性由随后生成器的独立行为用例验证，不以组合夹具自比冒充。
后续实现边界：Host 的启动/生命周期审核/查询默认目标和状态投影、既有 AgentTmuxPolicy 项目窗口函数、实际 UI 目标展示、既有 agentTmuxPolicy 用例及版本/计划，最多 8 文件。不操作真实窗口、服务、服务器或科研环境；无项目不生成可执行目标。现场多项目与端口归属仍待验证。
PFX-test3 验证：independentAgent 4、agentPreparationLifecycle 10 项通过，原自定义登录/静默/动态端点/归属/迁移确认/精确生命周期断言保留。实际 shell 测试仅使用临时轻量输出器，无 Agent、GPU、服务器或 tmux 服务启动；API 组合检查为隔离边界。纯测试与计划三文件独立提交，无新运行版本或 VSIX。

PFX2 定向验证：policy 4、independentAgent 4、preparation 10、installDir 5、sessionCache 2、destination 4、lifecycle 2、jobLog 12、richLog 5，共 48 项通过；lifecycle 仅使用已隔离的本机测试 tmux，公共 Python 字节一致。真实 Chrome 报告 pfx2-render-1793636594667.json 核对同服务器不同项目窗口、只改变窗口字段也重绘、无项目不展示猜测窗口，以及之前目录草稿、显式目录、自定义布局、六种首屏、焦点和窄窗口；实际 HTML 三段脚本合法。首次测试命令将 preparation 文件目录写成 tunnel，文件不存在时立即退出 1；改为实际 features 路径后通过，未调整测试。compile exit=0，冻结 8 文件内部版本 0.5.464，开始规定 package。

PFX2a 最终验证：2026-11-02T16-23-32-774Z-55428-package/run.json，318 作业通过、未运行 0、maxObservedConcurrent=1、exit=0、712170ms。内部 universal/trial 0.5.464：2780001 字节，SHA256 739e43fa4fbaa224997b07ce453661fe6c023ede9703e3154b183848eb7b9eed；与实际包 receipt 一致，362 项内容门禁零违规，实际 HTML 三段及模块解析通过。无训练服务器操作，未发布/安装。后续拆成 PFX2b 远端来源/目录、PFX2c 旧主终端兜底、PFX2d 原队列定位，各批仍最多 8 非生成文件，不缩减公共协议和既有任务恢复保护。

## 当前批次 PFX2b

PFX2a 提交 44278bec9c939921d9a6ae4879ccb728bbcb8b4e 已普通 push/fetch 一致。旧 Agent 还读取远端项目 .vscode/settings.json 及多种任务字段覆盖前缀，Scheduler 的默认状态/日志路径固定 simple_agent，并有固定 simple GPU 名称。共用已存在前缀模块生成 Python 归一化函数；远端只使用插件传入环境的全局值；默认目录归实际项目、保留显式安装/状态目录及脚本实际来源。状态目录缓存包含前缀，日志不再跨到固定默认目录借旧数据。既有 policy 套件新增抽取真实函数的九组行为检查，不启动完整 runtime、服务器或科研命令，不新增性能断言。三实现、一测试、三版本、本计划，共 8 文件；内部 0.5.465，验证待完成，不发布/安装。

调用链新增发现：通用 kill-window 旧自关闭分支只比较 Agent 会话名，即可跳过窗口身份核实；项目共用会话后尤其不可保留。记录为后续 PFX2e，使用精确 Agent 生命周期入口，当前不扩大本批。

PFX-test5 纯测试修正：tensorboardAndFence 原静态断言要求局部变量必须叫 p，与前缀真实行为无关；收敛到共用归一化后该断言失败（3 通过/1 失败，完整日志 pfx2b-tensorboardAndFence.log）。移除该写法约束，保留六组真实函数返回值、长度、其他任务/日志断言和全部测试；不改生产代码来满足内部排版。完整套件 4 项通过，exit=0，日志 pfx-test5-tensorboard.log；测试与计划两文件独立提交。PFX2b policy 5、stateCache 2、availability 12 已通过，后两套保持原有性能/缓存断言。

PFX-test5 提交 56180af95d9b5cef88160bfd0bfb27ab311d5de9 已普通 push/fetch 一致。PFX-test6：Controls5 还有一项只匹配已移除注释中 TS normalizer 名称的静态断言失败（2 通过/1 失败，pfx2b-tensorboardControls5.log），改为在原 Python 子进程中验证真实 TensorBoard 归一化结果，保留原拓扑窗口断言。仅该测试和本计划先提交，policy 新行为测试与 PFX2b 生产修改留在原批；不增性能断言、进程或调整超时。新日志测试首次夹具 Worker 为 Python 空字典导致跳过，补齐 Worker 身份后 policy 5 项（含九组 runtime 与不跨旧目录取日志）通过；失败输入与 pfx-test6-policy.log 保留。

PFX-test6 最终 Controls5 3 项通过，exit=0，pfx-test6-tensorboard-final.log；原 Worker 命名、浏览器隧道、无固定服务器路径覆盖保留。仅测试和计划两文件独立提交；未生成或发布新包。

PFX-test6 提交 2ed62b16722c4eecf02101853040c31b077f0fc9 已普通 push/fetch 一致。PFX2b 定向检查合计 45 项通过：policy 5、stateCache 2、availability 12、AndFence 4、Controls2 4、publicDefault 8、lifecycle 2、gpuStartup 1、Controls1 4、Controls5 3。原性能/缓存/停止覆盖均未改。policy 真实抽取函数九组覆盖前缀、目录、显式路径、忽略旧项目字段，另覆盖本项目 live_output 成功和缺失时不借旧固定目录日志。沿用 PFX2a 未变 UI 渲染证据，生成 HTML 在规定检查中复核。冻结 8 文件内部 0.5.465，开始规定 package。

PFX2b 最终验证：2026-11-02T16-43-13-238Z-80072-package/run.json，318 作业通过、未运行 0、maxObservedConcurrent=1、exit=0、699573ms。内部 universal/trial 0.5.465：2778221 字节，SHA256 29c3f1c09a460b7aa64ae32fec732ef710a4993f940008e4de0b42806879cb40；与 receipt 一致，362 项内容门禁零违规，实际 HTML 三段及模块解析通过。无训练服务器操作，未发布/安装。

后续相关边界：TensorBoard 仍有旧 payload prefix 别名且服务仅按全局 prefix 命名，跨项目主动打开可能触及其他项目同名服务，列入 PFX2f 精确项目服务身份和端口占用可见反馈。Agent 与 TensorBoard 均保留用户配置的动态隧道/监听端口，不因目录隔离自动改端口；D1/D2 明示项目身份与配置，冲突需修改具体项目配置，不关闭其他项目服务。

PFX-test3 提交 ab8c417e4ad4066f4b467d03150863189fdb9a41 已普通 push/fetch 一致。PFX-test4 纯夹具准备：目录和会话缓存组合夹具加载真实 AgentTmuxPolicy 命名导出，再覆盖原有轻量启动替身，供项目窗口接口使用；不缩减原断言。目录 5、会话缓存 2 项通过，日志 pfx-test4-install.log / pfx-test4-cache.log；仅两测试与本计划独立提交，不改运行版本。

## 当前批次 PFX2c

PFX2b 提交 7709f0ae32c946c3ae7da612e8f07324edb6687d 已普通 push/fetch 一致。旧 Agent 在准备/发送失败时会向固定个人主终端键入建窗命令，再尝试后台 Popen 调度；导出的旧 TS 帮助器也缺省选择个人终端。这些属于可达错误前缀机制。移除猜测/后台分支，保留用户入口并要求精确目标；就绪或发送失败保留原因，停止本次启动，不自动补发。主终端围栏按目标结构识别，不列个人前缀；SSH helper 缺目标零调用、使用 argv，信号退出不返回成功。公共生命周期、协议 2 队列、用户配置端口、任务/产物和显式服务入口保留。

检查依据：gpuJobIdentity 原隔离 Python 进程增加就绪 false/异常及首条发送失败检查，保留环境、正式身份与遥测断言；AndFence 原套件增加 VM/子进程替身检查缺目标、主终端围栏、精确目标传递和无旧启动兜底。未启动真实 SSH、科研命令或服务器。两实现、两测试、三版本、本计划，共 8 文件；内部 0.5.466，定向/规定打包待验证，不发布/安装。

PFX2c compile 与 27 项定向检查通过（gpuIdentity 1、AndFence 5、Controls1 4、Controls2 4、lifecycle 2、tmuxLifecycle 3、publicDefault 8），原协议 2、静默启动、原任务身份与停止/队列保护均保留。临时 tmux 为本机私有隔离 socket，SSH 为 VM 替身，不冒充现场验收。相关两个实现中个人主终端、猜测建窗及后台 Popen 兜底零命中；diff 检查通过。冻结 8 文件内部 0.5.466，规定 package 待执行；前端未变，复用 PFX2a 隔离渲染并在最终包检查实际生成脚本。

PFX2c 最终验证：2026-11-02T17-00-40-400Z-30024-package/run.json，318 作业通过、未运行 0、maxObservedConcurrent=1、exit=0、705916ms。内部 universal/trial 0.5.466：2771923 字节，SHA256 f19199e176ff70d0f95749852e52d9c8c9907dd371842942bc8bbb650fefd1b2；与 receipt 一致，362 项内容门禁零违规，实际 HTML 三段及模块解析通过。无训练服务器操作、自动重跑、产物清理、发布或安装。下一批先补原私有 tmux 夹具的真实前缀依赖，再修改原队列定位，不修改当前已接收任务和窗口。

## 当前批次 PFX2d

PFX-test7 提交 035907400485c1695443318781d04158c119df27 已普通 push/fetch 一致。旧 locator 只查固定 simple 控制器，无法复用任意自定义 A→B 前缀变更前的原队列。现在只读本轮原生窗口，以既有项目/Worker 命名键筛选候选，再核实 endpoint 精确 root/Worker；复用唯一活动队列，无候选才使用全局前缀生成新名。未绑定活动窗口和多个活动控制器明确未知/冲突，不另建队列；死窗口仅按当前名或唯一候选走既有恢复。原有易失地址缓存及每次 RPC 归属校验保留，不读历史队列文件、不重放任务、不关闭窗口。

task_session_prefix 复用已有共用归一化。原 tmuxSchedulerPrefix 夹具新增自定义 A→B、保留原任务窗口、忽略其他项目队列、新作业携带当前前缀、多活动控制器拒绝；原 schedulerRuntimeUpdate 保留 simple→自定义与运行/排队窗口恢复检查，不减少覆盖。policy 九组真实 runtime 对照补 Scheduler 前缀。一个实现、两测试、三版本、本计划，共 7 文件；内部 0.5.467，compile/定向/规定 package 待验证，不发布/安装。

PFX2c 提交 02f0247bf2061ce5ea58c9653539745f66320724 已普通 push/fetch 一致。PFX-test7 先准备原私有 tmux 夹具：从已生成 runtime 抽取 task_* 的同时加入实际共用前缀函数及其默认常量，避免下一批引用进入函数闭包后缺少绑定；不导入完整 runtime，不替换命名行为。仅原夹具和本计划，真实受影响目标检查后独立提交，不改运行版本。

PFX-test7 验证：tmuxLifecycle 3、schedulerRuntimeUpdate 2、gpuMemoryAdmission 1、manualTmuxAdmission 1，共 7 项通过，均使用原私有 tmux/CPU 夹具、原超时和断言。未修改 task_* 函数字节；其余原生消费者由下一运行批次规定 package 覆盖，不伪记已执行。纯夹具与计划独立提交，不新增包。

PFX2d compile 与 14 项定向检查通过（tmuxLifecycle 3、schedulerUpdate 2、policy 5、gpuMemoryAdmission 1、manualAdmission 1、runtimeLogs 2）。扩展私有原生窗口验证已确认：自定义 A→B 不产生第二队列，原 command/window 身份保留；新作业使用传入的当前全局前缀；未绑定活动控制器、同键归属冲突和多活动队列分别拒绝，问题窗口退出后可重新查询原队列。原 simple→自定义及运行/排队恢复覆盖保留。无现场操作，不改既有性能断言、超时或覆盖；冻结 7 文件内部 0.5.467，开始规定 package。

PFX2d 最终验证：2026-11-02T17-20-31-841Z-25536-package/run.json，318 作业通过、未运行 0、maxObservedConcurrent=1、exit=0、711633ms。内部 universal/trial 0.5.467：2772260 字节，SHA256 8baa32de3a7828925743778ba6c57afbcd3daf630d62a639e7120b31388949a6；与 receipt 一致，362 项内容门禁零违规，实际 HTML 三段及模块解析通过。无训练服务器操作、自动重跑、产物清理、发布或安装。前缀收口也须包含 D1 中可复制的旧个人前缀占位命令，先修正该入口再公开完整试行，不把它留到收口之后。

## 当前批次 PFX2e

PFX2d 提交 e9d29fd30bee34592c293e335e958df1b754fb74 已普通 push/fetch 一致。通用 kill-window 旧路径按猜测的 Agent 会话名安排延迟关闭，既不核实 windowId，也不能区分同会话下其他项目窗口。移除该猜测和 Timer 快捷路径；通用接口始终拒绝 Agent 会话，明确指向现有 agents.lifecycle/服务器卡片精确控制。原 Agent 和新规范项目 Agent 窗口名在通用单窗/会话操作中均保护。普通任务仍按原 immutable windowId、pane 集与关闭后主动核实执行；不更改公共 lifecycle Python。

原三组夹具增补 confirm=true 仍拒绝、同会话兄弟项目拒绝、规范 Agent 窗口名在普通会话中受保护，并保留普通窗口关闭、编号重排、身份变化、HTTP 路由/授权和真实私有会话操作。一个实现、三夹具、三版本、本计划，共 8 文件；内部 0.5.468，compile/定向/规定 package 待验证，无服务器操作、发布或安装。

PFX2e compile 和 27 项定向检查通过（closeRuntime 1、closeHTTP 2、sessionActions 1、AgentLifecycle 2、HostWindowClose 7、preparation 10、Controls1 4）。原共享 lifecycle 字节一致，当前/兄弟项目 Agent 会话即使 confirm=true 也零子进程、零 Timer；普通会话中规范 Agent 窗口保持原位，原任务精确关闭与查询失败不重发覆盖保留。修改后的源错误码与指向同一精确入口，UTF-8 复读通过。冻结 8 文件内部 0.5.468，开始规定 package；UI 未变，沿用有效隔离渲染，最终包核实实际生成脚本。

PFX2e 最终验证：2026-11-02T17-37-37-693Z-6640-package/run.json，318 作业通过、未运行 0、maxObservedConcurrent=1、exit=0、698736ms。内部 universal/trial 0.5.468：2771965 字节，SHA256 5698f66e67b3a0f021d35ed243cc5666523b60520a020d56a7df38ec1cb1f4cb；与 receipt 一致，362 项内容门禁零违规，实际 HTML 三段及模块解析通过。无训练服务器操作、自动重跑、产物清理、发布或安装。

## 当前批次 PFX2f1

PFX-test8 提交 bf0800f901c71959511d4e949d000883df60968c 已普通 push/fetch 一致。旧 TB 名称仅有前缀、payload 旧别名能换目标，项目之间同名；窗口存在和端口监听也可能混同。使用必需绝对项目根、现有项目身份与全局前缀组成服务名；请求前缀和 Agent 当前全局值不一致时明确失败，旧 session_prefix 不再选择目标。窗口以原生 root/port 绑定证明归属；无绑定、异项目、歧义或读取失败不关闭。状态查询不创建服务日志目录；已有操作回执写入机制保留，不把查询称为完全零写入。

端口冲突不关闭其他服务、不改用户端口。显式启动使用前台 exec，并从 new-session 原子返回本次 windowId，绑定前再次核对该 ID；保留其他调用者的原返回语义。停止冻结首次核实窗口，防止读取间替换后重绑定；代理请求复核当前项目原生窗口和端口，不能把历史映射当现状。旧前缀单独 TB 会话保留，不自动迁移、重启或清理。

一个实现、三个既有测试（AndFence、Controls1、policy）、三版本、本计划，共 8 文件；内部 0.5.469。新增/扩展正确性断言不增压测、进程期限或科研环境检查。Host 仍待 PFX2f2 清除旧 UI 参数和展示猜测；两批完成前不发布/安装。

PFX2f1 定向共 32 项通过（Controls1 4、AndFence 5、policy 5、gpuIdentity 1、Controls5 3、lifecycle 2、Controls2 4、publicDefault 8）。既有进程内覆盖了真实生成函数的原子窗口返回与 exec env 顺序、不读取服务 PID、六类窗口归属/变化、死亡或缺失状态、端口占用/空闲/查询失败、别名拒绝、启动即退出、替换窗口不绑定，以及真实本机 HTTP 代理/鉴权。端口探测改为精确 127.0.0.1 TCP：其他 HTTP 状态不再被误当空闲，非拒绝连接的探测错误向上传递；原 2 秒接口期限不变，无新性能断言。

实际失败保留：compile 2026-11-02T18-03-53-682Z-78332 的 write-agent-runtime ftruncate 返回 UNKNOWN/exit=1，生成文件较预期多 248 字节；磁盘健康且空闲约 693GB、无并发测试进程，未证明具体占用方。未删除/替换文件或修改打包器；同命令复核 18-05-19-434Z-85700 成功，完整内容与对应源码生成值逐字一致。最终服务状态修改后 compile 18-08-07-394Z-87196 及 Controls1 再通过，失败日志均保留；不把早先失败算成功。冻结 8 文件内部 0.5.469，开始规定 package；UI 未变，复用有效渲染，最终包核实实际生成 HTML 脚本。

PFX2f1 最终验证：2026-11-02T18-09-22-156Z-87964-package/run.json，318 作业通过、未运行 0、maxObservedConcurrent=1、exit=0、708209ms。内部 universal/trial 0.5.469：2773407 字节，SHA256 9c7df4dfc59f7743c9cfb6f8836fd5bba9dbda0815b0a0c2e73c0e6c2c7e9432；与 receipt 一致，362 项内容门禁零违规，实际 HTML 三段及模块解析通过。无训练服务器操作、自动重跑、产物清理、发布或安装。

## 测试准备 PFX-test9

扩展定向检查时 Controls3 出现两项真实失败，完整日志 pfx2f2-tensorboardControls3.test.js.log 保留。其 fixture 成功 RPC 仅返回 ok，没有生产 task_stop 必需的 cancelled=true；故障 RPC 后还把精确窗口已关闭当作取消围栏已确认。task_stop 及其共享模块本批未修改，这套旧文件不在上一批 package 的实际 jobs 中，不能声称上一批 318 项覆盖过它。

仅修原夹具：正常回执返回显式 cancelled=true；控制器失败仍核实原精确窗关闭、无 PID/会话操作及无关窗口保留，并新增失败码、取消未确认、未退休和缓存未清除断言。保留原测试和期限，不弱化正常成功、归属变化与未知目标覆盖。Controls3 四项全部通过，exit=0，pfx-test9-controls3.log。夹具及本计划独立验证/提交，无新运行版本；PFX2f2 生产候选尚未提交，不把它作为本测试准备的实现依赖。

## 当前批次 PFX2f2

PFX-test9 提交 db270884d16ae0036ed1f57b94513c0934612a71 已普通 push/fetch 一致。Controls4 四项通过；Controls5 首次 1 失败/2 通过，日志 pfx2f2-tensorboardControls5.test.js.log 保留。该静态检查强制 Host 出现 _tb/tbSession，与移除 Host 名称猜测的当前目标冲突。PFX-test10 仅把这两项名称断言移到真实负责命名的 Agent，保留名称存在、相对启动脚本、动态 URL 和共用前缀行为全部约束；Agent 的实际项目隔离由原运行断言覆盖，不为通过断言在 Host 保留无用变量。仅既有测试及本计划独立提交，不依赖 PFX2f2 未提交实现，不增版本。

PFX2f1 提交 d122cb0216dc60a75434073ee7807f1e038b08e8 已普通 push/fetch 一致。Host 请求携带精确 projectDir/Worker 与唯一全局前缀，使用 /api/tensorboard/service；旧 Agent 不认识该路由时明确失败，不回退旧命名操作。新 Agent 对新旧 HTTP 入口都在服务操作与回执写入前核对请求项目和 Worker。沿用既有操作响应和请求预算，不增加版本相等门禁或自动部署；旧未知服务仍保留精确 TMUX 窗口人工入口。

删除无效 tensorboard.tmuxSession 设置入口，不改用户已保存 JSON；成功提示读取本轮真实服务名、窗口、端口及日志。失败查询显示未知和原错误，不伪装未运行；启动只轮询原 5×2 秒预算。Worker 显式空 Conda 保持系统 Python，继承值由既有配置提供；没有科研环境检查。保留非 TensorBoard save-result-policy 的原 Worker 传输。项目切换后不把新项目目标补进旧服务请求。

Host、Agent、实际 UI、既有 Controls1、三版本及本计划共 8 文件；内部 0.5.470。原 Python 进程扩展新旧 HTTP 入口的缺失/异项目/异 Worker 零写入拒绝，原 Node 套件替换静态名称猜测为真实 Host 方法执行，覆盖全局值、动态端点、返回事实、未知与旧 Agent 无回退。待 compile、定向、实际 HTML/隔离渲染及规定 package；无服务器操作、公开发行或安装。

PFX-test10：Controls5 三项通过，exit=0，pfx-test10-controls5.log；不重编译或重打未变化生产包，复用有效命名回归证据。

PFX2f2 定向覆盖合计 33 项通过（Controls1–5 为 4/4/4/4/3，AndFence 5、localProxy 1、publicDefault 8）；两套旧夹具的首次失败和独立修正凭据保留。PFX-test10 提交 a1d860c207d0e04244aefc425b0a151f39ca8070 已普通 push/fetch 一致。compile 2026-11-02T18-30-54-535Z-51928 通过；实际生成 HTML 三脚本解析及隔离 Chrome 六场景、420px 焦点/输入保护通过，报告 pfx2-render-1793644461120.json，无真实 API。冻结本批 8 文件与内部 0.5.470，开始规定 package；测试准备两个提交不改停止生产协议，也未把原不在 package jobs 内的文件冒称为旧全量覆盖。

PFX2f2 首轮 package 2026-11-02T18-34-40-012Z-45180：318 作业通过、未运行 0、exit=0、704403ms，仅为中间候选，未交付。只读传输调用链核对发现新路由尚未保留旧 actionPurpose 的语义：停止必须仍用 stop/emergency 通道，启动用 run_plan，状态用 manual_refresh。待该运行完全退出、锁释放后才修正 Host 与原 VM 断言，旧 Agent 404 同时提供主动准备当前项目 Agent 的恢复说明并保留原 HTTP 错误；不自动部署或重发。新增启动后查询失败仍未知、非 TB save-result-policy 仍走原 Worker 通道的同进程断言。生产输入变化后重新执行 compile、定向和规定 package，不把首轮凭据当最终候选通过。

最终修正后的 compile 2026-11-02T18-47-06-465Z-15108 通过；Controls1 四项和原 requestBudget 十二项通过（pfx2f2-final-*.log），累计必要定向覆盖 45 项，已有未变化运行证明复用。真实 HTML 源未再变化，复用 pfx2-render-1793644461120.json 的六场景/焦点证据，最终包仍核验实际脚本。冻结同一 8 文件内部 0.5.470，开始第二轮规定 package。

PFX2f2 最终验证：2026-11-02T18-47-46-029Z-43464-package/run.json，318 作业全部通过、未运行 0、maxObservedConcurrent=1、exit=0、702355ms。内部 universal/trial 0.5.470：2773768 字节，SHA256 c36c7eaa4b23f64faece88509b5427194bfd49d36c47fe4ed4a0689732f25085；实际字节与 receipt 一致，362 项内容门禁零违规，真实 HTML 三脚本及模块解析通过。全局前缀、请求项目/Worker、实际服务证据和 stop/emergency 通道均已覆盖；真实服务器及 Extension Host 验收仍未执行。无服务器操作、公开发行或安装；PFX3、D1 精确附着及 PFX4 收口前继续不发布中间包。

## 当前批次 PFX3a

PFX2f2 提交 b774b2038b416f4e12e141ac6fe30f32faabad14 已普通 push/fetch 一致。复现线索：API 将每个 simple 路径段替换成 zlk 推断“真实目录”，两者都明确允许时仍拒绝 simple；API/预填把 simple_agent、zlk_agent 目录名当作机器归属证据；预填从退役 Hub 顶层读根，并在 zlk 旁生成不存在来源的 simple 禁止项。

移除这些推断，只使用用户配置的字面路径与显式允许/禁止策略；预填只读 Worker 配置、既有服务器资料和 SSH 记录，不复活顶层 Hub。实际 runtime/状态映射保护由现有 ProjectRootMap 保留，不能用任意目录名代替。保留遍历、边界、显式禁止、既有 /root 预填限制和一次性标记；不提升预填版本、不改写已经保存的列表，不自动迁移或清理目录。合法显式 zlk 和 simple 路径均保留。

两个实现、两个原测试、三版本及本计划，共 8 文件，内部 0.5.471。原套件覆盖两种路径同时允许、互不推断、精确禁止和邻名不匹配、未知目录名、单独已配置数组不被覆写及无项目不预填；不增加进程/性能断言。Host 与 UI 旧文案/判定待 PFX3b，组内仍不发布或安装。待 compile、定向和规定 package；不连接服务器。

PFX3a compile 2026-11-02T19-02-26-701Z-29584 通过；54 项定向通过（prefill 3、localApi 33、policyUi 2、rootMap 14、现有 Host gate 2），日志 pfx3a-*.log。实际映射的状态树及祖先保护、异 Worker 同名产物、未知/越界映射拒绝均保留，不靠目录品牌判定归属。Host gate 当前仍按旧 UI 规则通过，明确由 PFX3b 改正，不当作 API/UI 已完全一致。UI 源未修改，复用有效隔离渲染；最终包核对实际 HTML。冻结本批 8 文件内部 0.5.471，开始规定 package，无公开发行或安装。

PFX3a 最终验证：2026-11-02T19-03-40-042Z-40844-package/run.json，318 作业通过、未运行 0、maxObservedConcurrent=1、exit=0、715202ms。内部 universal/trial 0.5.471：2773051 字节，SHA256 fd8e41106ecd045976a9154a37004106217763a582a034118ce74673c3026f99；实际字节与 receipt 一致，362 项内容门禁零违规，实际 HTML 三脚本及模块解析通过。无服务器操作、公开发行或安装；继续 PFX3b。

## 当前批次 PFX3b

PFX3a 提交 6b9b3c574bd8d42aa01c2f38220e7b3ea3c14467 已普通 push/fetch 一致。Host 和实际 PanelHtml.legacy 仍按 simple_agent/zlk_agent 字面段拒绝项目父目录，和刚修正的 API 不一致。移除名称猜测，保留空值、遍历与显式路径策略；UI 预览同步显示 .. 的真实问题。目录是否是受保护 runtime 继续取实际映射，不由前缀或目录名决定。

保留用户实际路径、显式 Agent 安装目录、未保存草稿预览、项目名重复提示及用户选择上一级的既有确认流程；不改路径解析的其他既有语义，不自动改根、同步、迁移或清理目录。两实现、两既有测试、三版本及本计划共 8 文件，内部 0.5.472。原 VM 进程扩展合法旧/新前缀名、策略与遍历断言，不约束局部变量写法、不增性能测试。待 compile、定向、实际 HTML 脚本/隔离渲染及规定 package；无服务器操作，组内不公开发行或安装。

PFX3b compile 2026-11-02T19-17-19-863Z-85440 通过；30 项定向通过（Host gate 2、目的地预览 4、rootMap 14、保存后续 2、globalDefault 8）。隔离 Chrome 六场景和 420px 焦点/输入保留通过，真实生成 HTML 三脚本解析通过；新增实际 DOM 的 simple_agent/zlk_agent 草稿路径均展开到当前项目及 alice_agent runtime，.. 草稿显示 error，报告 pfx3b-render-1793647110730.json。无真实 API、服务器或实际保存；冻结同一 8 文件内部 0.5.472，开始规定 package。

PFX3b 最终验证：2026-11-02T19-18-45-699Z-27968-package/run.json，318 作业通过、未运行 0、maxObservedConcurrent=1、exit=0、704712ms。内部 universal/trial 0.5.472：2772948 字节，SHA256 f08a86b70a12077a461ff25391f641ee561fbd057651539ff852a76784d9fe7a；实际字节与 receipt 一致，362 项内容门禁零违规，真实 HTML 三脚本及模块解析通过。实际映射保护和保存/准备/SFTP 的共享门禁保留，未修改或清理任何服务器目录。下一批为 D1 精确附着及前缀说明收口，继续不公开发行或安装中间包。

## 测试准备 D1-test

PFX3b 提交 d842300a58212933b4fbda89e842298be6993d77 已普通 push/fetch 一致。D1a 将从 capture 刷新同步更新独立的附着命令组件。现有三个手工最小 VM 只提取日志/低流量函数，不加载该组件；先显式注入独立组件边界，不改其列表、capture、失败保留、身份、低流量或超时断言。实际组件和 Host 复制行为由 D1a 原 tmuxWorkerAndRichLog 套件及实际 HTML 隔离渲染负责，不能以这个替身代替验收。

仅三个原测试和本计划，共 4 文件。生产实现及运行输入未变，复用 PFX3b 完整覆盖；只补跑三个受影响套件，无新运行版本、编译、打包、发行或安装。无服务器操作。

D1-test：38 项通过（jobLog 12、scriptHealth 9、otherSessions 17），exit=0，d1-test-*.log。所有原断言与期限保留，未将附着命令组件的替身算作实际复制验收。

## 后续定向核查线索（尚未实施）

PFX2e 提交 b257d66f1fbbab2be699fe7166f589c76defe8e3 已普通 push/fetch 一致。PFX-test8 纯测试准备：Controls5 的共用归一化断言直接验证已存在的真实 normalizer，保留原 Worker 拓扑、URL、脚本路径及全部测试；TB 命名格式继续由 AndFence 六组、policy 九组和 Controls1 实际服务检查负责。函数存在检查不再约束参数个数，供后续加入必需项目身份；不增加进程或降低行为覆盖。仅原测试和本计划独立验证/提交，无新运行版本。PFX2f 按 8 文件上限拆 runtime 与 Host 两批，不提交依赖未入库生产修改才能通过的测试。

PFX-test8：原 Controls5 完整套件 3 项通过，exit=0，pfx-test8-controls5.log。无产品实现/包变化，复用已通过 PFX2e 其他必要覆盖；本批只提交测试与计划。

- D0a–c 已验证：默认 runtime 归项目内全局前缀目录，Agent 窗口按项目身份分开，显式目录与共享 GPU 采样保留。D0d 仍需更新完整指南；未自动迁移、部署或清理旧资源。
- D1：serverSetupReadiness 在 0 Worker 时 missing 为空导致 ready=true；占位 tmuxCmdAgent/Sch/Gpu 从未填充真实目标，仍可复制。应修正空目标语义，提供真实选定窗口的唯一附着入口。
- D2：operationEventMaxDelayMs 配置/后端默认 200，面板三处回退 1000；全局读取缺少与保存的 10000 上限一致的约束。Conda label 含“可选，必填”，configInput/configSelect 的 label 没有 for/id。
- D2/D3：Worker Conda 继承时表单显示全局值；saveWorkerConfigCore 用 effectiveWorkerCondaEnv 作缺值回退，会把继承固化成覆盖。需显式区分继承、系统 Python 与路径，不自动探测/安装科研依赖。
- D2 端口配置范围：已有 tensorboard.port 目前 scope=application，同电脑多项目无法各自保存不同值。后续允许当前项目覆盖并保留原全局默认/显式值，清楚说明共享账号各项目服务需要独立端口；不自动换端口或停止其他项目。PFX2f 已保证端口占用明确失败、不借用其他服务，配置体验尚未完成。
- D3：clearConfigDraftsForCommand 收到 completed 后整 scope 删除草稿，缺少对发出时草稿的快照核对；保存期间的新输入及无对应 pending item 的旧成功回包可能清掉新草稿。失败回包不清草稿的现有行为保留。
- E1 首屏计数返修线索：overviewTaskStats 目前只数 schedulerRowsForState 的兼容任务，没有读取 distributedPlans；协议 2 作业存在时首屏可能仍显示 0。须复用逻辑 PLAN 归并计数且说明记录来源，不能把当前原生 job 与旧任务投影重复累计；E1 实施并补定向回归。
