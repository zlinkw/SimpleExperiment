# 多项目创新分支：本机统一派发交付计划 r2（用户已明确并行）

## 授权和负责人
- （本段已被底部 r2“用户恢复子代理调度”覆盖，2026-10-25 修正为现行）：唯一Linux源码实现/返修与本地Git负责人=沙箱源负责人（本impl树）；原两位读者只读调查已完成；主控负责方案/high审核、宿主Windows整阶段验证、GitHub远端与最终整合，不并行编辑其源码。
- 已完成主线同步；原目录为本机保留开发分支。实现/受影响验证在独立副本，最终验收通过再ff同步本机同名保留分支并向GitHub master提PR；不直接推master。
- 用户要求避免多余工作：仅解决项目/分支入口、分支验证、统一管理和选优回祖先闭环。

## 当前获准范围（2026-10-25 用户确认本机统一队列并行）
1. 原面板增加可见的“项目与分支”入口，登记祖先项目与创新分支的实际目录/Git ref/commit，能打开对应项目；不新建通用工作流/权限平台。
2. 各分支代码/产物/任务归属独立；根映射只复用既有配置和ProjectRootMap，映射缺失/冲突须提示，不能静默共用祖先输出或自动修改科研环境。
3. 统一列出各分支计划、进度与来源。本机所有纳入管理的分支进入同一逻辑队列、同一派发决策入口；可在不同GPU/既有配额容许的资源上并行，不将整分支验证串行化。派发决策在任何远端await前保留本机已同意资源与稳定任务身份；未知接收不释放、不重派。复用已有项目PLAN/GPU/节点执行，不把静态PLAN校验等同科研验证完成。
4. 用户选择优秀分支，预览来源commit/目标祖先/验证证据并确认后发起对应科研仓PR；不得自动判断科学优劣或修改指标阈值。祖先只在合并确认后对干净目录ff更新；冲突、脏目录、身份变化停止，不reset/强推/丢弃修改。

## 不做
- 不重构单项目调度、GPU采集、Worker/Agent协议；不顺带建立机器级共享GPU预留账本。
- 不修改消费项目科研代码、Conda/依赖/数据/论文标准；不实际执行科研Plan、上传/部署/外部服务器写入。
- 不做自动选优、自动无确认合并、清理目录、删除分支/历史/备份。
- 用户已明确允许多分支并行；只统一本机队列/派发与必要本机占用记录，不新增Worker侧全局GPU账本/服务，不改变Worker协议。不能把多个各自抢GPU的旧调度循环包装成统一派发。外部用户/外部程序仍由现有Worker实时准入处理，不承诺本机插件控制域外的绝对互斥。

## 已知实现锚点与必要补齐
- legacy.ts 的工作区首folder绑定和单folder限制、WorkflowWorkspaceBinding保持项目隔离；不通过临时篡改全局workspace绕过。
- PlansSection/实际legacy资源树及消息白名单/路由接入可见入口，保持现有板块和单项目按钮。
- cli/LocalApiClient.ts: readLocalDiscovery/requestLocalJson/callLocalRpc/preflightPlugin可复用握手，但仅有固定发现槽；跨项目路由需要明确实例注册和对应工作区身份，不能猜端口/复用错误窗口。
- 结果来源复用projectId/planRevision/codeFingerprint/commit既有通道，新增分支归属只为当前需求，不新增科研合格标准。
- 修改前逐块读取实际函数/数据类型并细化准确改动范围，不从两份调查摘要直接批量重写legacy。

## 检查、交付和停止条件
- 开发：必要语法检查在Linux；产品编译/测试/组装只Windows。优先扩现有工作区绑定、计划提交、面板消息/白名单/脚本语法、项目根映射和结果归属测试，明确新增行为后再定准确文件清单。
- 原生夹具：两创新分支有独立提交/计划/输出，操作不能串项目；共用GPU的两个异步申请不得重复同意、不同GPU允许并行、RPC等待期间占位已存在、未知回执不重派/不释放；验证和未知状态真实；选优绑定被验SHA；PR目标/祖先更新正确；脏目录/冲突不覆盖；原单项目路径保留。
- 最终按当前权威npm脚本展开及身份/argv去重执行完整规定验收，不能复用旧候选成功跳测。完整日志/原生退出码；实际VSIX清单/运行闭包/版本/SHA/秘密检查不省。
- Windows全验、真实diff集中high审核后方可提PR。用户本机保留开发分支，PR未合前不安装候选；本任务只承诺提新PR，不把它冒充已合并/发行。
- 意外共享目录、未获准远端写入、分叉/冲突、验收失败或需要Worker侧新共享账本/协议改造即停相应块并说明，不扩大工作。

## 负责人和当前可立即实施块
- 用户最新恢复子代理调度。原两位阅读者证据已复用；仅一位新源码负责人在本独立worktree连续实施/返修，不开第二写入者。主控不并行编辑其源码/公共计划。
- 块A已就绪：新项目/分支模型、祖先关系、本机Git读/新worktree操作、主面板可见入口、按真实工作区身份区分本机API实例。禁止改全局workspaceRoot假装切换项目。
- 块B：本机统一决策入口。现有 tickDistributedQueueCore/allocateDurableAvailable/allocateAvailable 和 ServerQueueHost/ManualDispatchHost 须同域处理；重点确认首次保存commandId/worker/gpu的边界，复用现有本机队列/资源租约，而非另造Worker锁。进一步定向调查与A实现并行，B代码接入须获主控基于实际调用链的明确方案。
- 块C：真实验证来源、用户选优、创建科研仓PR和祖先ff更新。来源/目标/HEAD/干净状态均在确认后重核；不得在本任务调用真实科研仓push/merge或实际训练。
- 活动名额共4，源写者+只读调查+Native验证合计遵守上限；就绪阶段以report_stage给冻结输入/下一写入范围/验收交接，不等全开发结束。
- Runtime编译/产品测试/打包只在Windows/macOS；Linux限读取、编辑、轻量语法、单个源码负责人本地Git。候选最终Windows完整验收与high集中审核保留。
- 原开发目录本机分支feat-multi-project-branches-20261025仍在a9；本副本impl分支提交通过后由宿主在原目录仅ff整合同一提交，再正常push本机保留分支提新PR，未获本次合并批准不合master/发行/安装。

## 块B已批准方案（2026-10-25 GPT精读readers/backend-block-b.md后批准，原文要点照录）
读者片段已归档 readers/backend-block-b.md（77700324c3bdaa74a89a566abd25d8dc4bd110a1）与 readers/ui-block-c.md（7377df60c5f237ab74aa58821a974ef184b7756a），基本调查不重做；读者§4-5是建议而非已批准方案，其中“只抑制本窗口、其他窗口照常兜底”不批准（绕过统一同意）；只改现代allocator会漏手动/旧兼容/pinned重试。
1. 一个本机资源同意入口：A共享本机登记域内，祖先/创新分支队列仍各在自己project state目录（DPQ distributedQueuePath，不搬AppData、不混项目root）；新增窄统一准入模块/host适配器，供所有已登记管理项目的自动、旧兼容、ready-manual/serverQueue及pinned通道共用；未登记旧单项目行为保留；不同窗口可提出候选，但只有共同原子入口能同意新command；非UI聚合各自抢卡，不整分支串行。
2. 复用ResourceOperationLeaseManager共享全局资源租约：同一本机API登记目录下固定“统一派发”逻辑resource target（server=local，所有管理项目同一规范路径）+本项目队列file resource；短本地read→算→save临界区，内部禁RPC/探GPU/文件同步/用户确认；优先在withQueueWriteResource/saveDistributedQueue的持久化新start意图边界集成而非重写tick；ALS允许同manager/同window/子资源重入，跨窗口RPC不继承，严禁持锁再调他窗口save。
3. 临界区从登记快照读所有成员真实队列，只写自己项目队列；saveDistributedQueue内CAS/baseSignature/mutateLatest/beforeRename/stop epoch/generation保留；读他项目仅为占用，不借当前Provider load/save他root污染cache/globalRoot；薄纯读复用既有restore/路径身份保护；本轮新意图与盘上已占位不双计数（先确认盘上既有same command再算新请求）；registry登记/forget与准入同域串行或真CAS；缺失新空队列与损坏/身份不明区别处理，损坏成员不得当零占用。
4. 新start同意必须在远端await前把稳定project/plan/job/worker/GPU/command身份（可复用startIntent）提交自己原队列；save成功才send；配额不足留本地pending/ready，不生成会发送的假dispatching，不丢选定GPU/任务/用户意图，显示等待原因；allocator已暂改多job内存快照时准入拒绝要明确不POST并安全刷新重算/保留pending；sendDistributedJob防未来旁路：仅精确已持久同意身份可发送；同command重试不新消费槽，未核实接收不重派/不释放，已证not-sent/gpu_busy/terminal按现有证据释放；新本机同意最多作已有job intent附加身份/标志，不建第二GPU预留账本。
5. 配额=现有gpuJobsPerCard/card override/gpuMaxConcurrentCards，不改科学/调度参数本义；已同意未核实、starting/running及可由Worker自启的queued在管理域占其已同意本机槽，不得抄memoryCounts排除queued后把同一名额重复许给别分支；手动activeGpuReservations故意排除不得遗漏；管理模式手动/服务器队列选择目标仍留本地统一队列等配额，不得“忙卡可用”无限绕过；原未登记模式保持兼容；不同GPU或同GPU已有多槽明确允许并行；迁移前旧身份释放证据及新目标本机占位仍核；Worker既有已准入drain不改协议/不宣称控制域外用户。
6. 资源key不能天真只workerId：跨项目同物理服务器worker别名可能不同，先复用已配置server身份（withRemoteActionResource的host小写+SSH port，优先已有机器/GPU稳定ID映射），不把跨项目project worker根当不同物理卡；无法确定映射则该分支提示未就绪不猜、不探外服/新增服务；统一域用一份现有用户配额策略；登记管理时保存可见统一策略快照/管理来源并显示复用，不暗改各项目.vscode；缺正确信息先阻止相关派发并说明。
7. 自动/旧分配可继续用原allocateAvailable提候选，最终共同准入以跨项目已占位+待分配剩余槽为准；若只改save边界无法保证合规且保持原快照身份，先交具体冲突代码与窄替代，不自做Worker协议；各窗口遵守同一决策不留未受控兜底；UI同一逻辑待运行/进行中队列与来源分支可见；项目窗口没开/实例不匹配不假称可执行，提示打开对应分支；registry身份变化/损坏不静默兜底。
断言与阶段：在现有手动/队列/配额/lease适合suite扩断言；新多窗口统一域无home允许一个域测试文件；同GPU单槽两项目同时异步申请只一同意且未POST前已持久；不同GPU、多槽允许并行；同command重入不双记、未知占位、确证拒绝才释放；ready-manual/ServerQueue/旧allocator无旁路；不同别名同机仍冲突；策略/实例/root变化拒绝；真实两进程临时Git/registry隔离不写科研；预先确认helper/VM抽取闭包与final test-workflow对新test/project入口覆盖，不改固定总数。Linux不产品测试/编译；A frozen=e5bb5c30已交同qwen-host（只写自身dist/cache），原impl继续B，两边无source/output重叠；B就绪即report_stage，不等C。

## 块C已批准指导（2026-10-25，C获准在B稳定块就绪后实施；不再等待调查/用户确认，功能边界不变；原文要点照录）
- 顺序：优先完成并上报B原子同意块让Native早验，之后继续C，勿等待整功能完成才验证。基本证据已在 readers/ui-block-c.md，不重查、不自扩合格标准。
- C1 在当前“项目与分支”实际卡提供选择分支PLAN/提交验证/进度结果入口，经A目标实例+workspace handshake调用既有 workflow.plan/run 或对应精确已验证提交入口；准确参数从实际API正文取，不猜 workflow.plan 就是跑科学。选择集合非空、每个root绑定实例身份、worker root mapping/输出既有校验原样保留；未打开项目清楚提示打开，不假装执行。聚合状态显示分支来源、具体PLAN/任务、待运行/运行中/完成/未知及既有结果指标/详情链接；不新造图表平台/科研门槛/自动排行；旧单项目路径保留。
- C2 复用QueuedPlan.executionSource.digest+manifest、projectId/plan id/file/revision/codeFingerprint和hasVerifiedCompletion及FreshResults结果绑定。源码scope冻结点PlanRunHost 133-137先verifyLocalPlanSource；给相同提交身份追加branch/当时HEAD/dirty/时间的出处记录，不改Worker协议、completionIdentity签名或job生命周期。运行结果“完成”不是科研结论“通过”。对用户选择的非空PLAN证据逐项身份核对，未跑/未知/来源不符显示原因，静态validate不当运行成功；不凭磁盘raw status或旧结果表。已有身份绑定且未撤销的持久VerifiedCompletion按原契约可复用，不因离线或20/30秒观测TTL一刀切作废/强制重跑科研；当前来源确有新鲜失败/撤证必须反映。
- C3 选优由用户判断。预览候选当前精确HEAD、对应PLAN/证据、目标祖先/branch/remote、待合差异与风险；所选每PLAN现工作树依赖闭包必须匹配已验manifest，Git状态/HEAD实际重读。dirty运行→后来仅提交同字节不需重新训练：manifest等价可绑定当前已提交HEAD；branch名或Git元数据不是科学身份。若仅验到部分代码依赖范围，明确显示覆盖范围，数据/权重/仓外输入不在manifest内则不声称整仓/科学等价；不新增外部数据hash平台。合并预览需干净且来源内容不变，不替用户stage-all/commit全部科研文件、不修改ignore求绿。原plan“已有commit通道”描述不实：现结果没有sourceGitCommit，需要此窄provenance补齐。
- C4 新增最小科研GitHub PR服务/host adapter，复用只读Git探针与确认范式，不用overwriteFromGitHub(reset/clean)。目标repo必须从已登记祖先真实origin规范化得到，来源确属同仓关系/正确分支；preview绑定sourceSHA/base分支/remote/repo/root和validation selection；用户明确modal确认后写前重核；普通push精确分支→gh pr create精确repo/head/base；尽量复用已存在同source/base PR并核身份；不自动重放结果未知的push/create/merge。远端URL去凭据后才能进普通UI/API/PR body/日志；不自动建库/fork/新认证/装gh/强推；缺gh/auth检查明确报错不绕过。
- C5 合并：可提供打开PR供用户审核，以及明确“合并已审核PR”确认动作，原生 gh pr merge --merge --match-head-commit=<已验SHA>，遵守服务端review/check，不admin/强推/绕检查。完成后重新query该PR状态/实际merge SHA，不把API未知当成功。祖先更新按钮/后续明确确认只对已登记同root/同目标branch/干净目录执行fetch精确origin target→核包含该merge且本机HEAD是远端ancestor→merge --ff-only。dirty/分叉/checkout变分支/目标repo改变停止，不自动checkout其他分支/reset/覆盖；无确认不替用户更新科研仓。PR未合只能显示待审核不能推进祖先。祖先新HEAD显示“已更新；原验证来自候选SHA”，不把合并后新组合代码冒充再次验证过。
- C6 “GitHub远程归主控”指本次开发交付操作：本轮不能真的对科研repo push/建PR/merge，也不能调用宿主；产品功能代码在未来用户UI确认时于本机调用git/gh，不新增GPT模型审批。仅Windows临时仓+gh精确stub/隔离fixture测试这些功能；最终本插件开发PR仍由主控host_windows做，当前不合master/发行/安装。
- 测试：扩verifiedCompletion/currentSubmissionTruth/planCodeScope/freshResult套件及A域project/消息套件——选错root/instance/revision/fingerprint拒；dirty→同内容commit可复用；任一scope内容变不得声称当前HEAD已验；不同分支结果不串；PR repo/base/sourceSHA/确认后漂移、已存在/未知回执、dirty/diverged祖先不覆盖、仅真实merged才ff；保留非空选择/全部必要断言。仅原生执行；改到提取/VM helper要补完整closure，不凭新测/语法宣称旧夹具齐。总体最终Native全验/实际包/语义清单/high/新PR保留。

## 块A实施状态（沙箱负责人更新，指导原文未改）
- 块A源码+测试已在 impl 分支完成并提交（详见 evidence.md“块A实施记录”：文件/blob/断言/风险）：登记模型与本机存储、只读 Git 探针（清继承 GIT_*）、worktree 预览-digest-确认创建、面板 plans 卡内“项目与分支”可见区域、每实例发现记录与工作区路由及 projects.registry/projects.instances 窄接口。未新建资源树 section，未动调度/GPU/科研仓/GitHub 远端。
- 待主控：Windows 原生 compile+受影响测试（新 test/project/branchProjectRegistry.test.js、扩展的 test/api/localApi.test.js、面板白名单/内联脚本类既有套件）；失败原始证据回本负责人返修。块B实施仍等主控基于补查的明确指导；块C接口已具备（登记身份/活实例/准确根），未执行任何真实 PR/ff。
- 2026-10-25 进展：首轮 Native compile 因 BranchProjectStore assertSafeId 三条 TS2345 失败，已按批准机械返修（990dafb0）；final 覆盖缺口按批准补齐四个无 glob final 入口 extraFiles（85c08610）；Native 冻结树已核实无活动后 ff 至 85c08610（见 evidence 同日子段）。B 已获批准进入实现（上方案），C 获准在 B 稳定块就绪后实施（上指导）。
